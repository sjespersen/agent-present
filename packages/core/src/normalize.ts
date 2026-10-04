import {
  BLOCK_TYPES,
  PRESENT_VERSION,
  type Action,
  type Block,
  type BlockType,
  type CheckState,
  type ComparisonValue,
  type GraphEdge,
  type GraphNode,
  type HierarchyNode,
  type Level,
  type PresentDocument,
  type Priority,
  type Status,
  type UnknownBlock,
} from "./types.js";
import { isRecord } from "./validate.js";

export type NormalizedBlock = (Block | UnknownBlock) & { id: string; priority: Priority };

export interface NormalizedDocument extends Omit<PresentDocument, "blocks"> {
  present: string;
  blocks: NormalizedBlock[];
  actions: Action[];
}

const STATUS_ALIASES: Record<string, Status> = {
  good: "good", ok: "good", okay: "good", success: "good", pass: "good", passed: "good", passing: "good",
  healthy: "good", green: "good", positive: "good", done: "good", ready: "good", safe: "good",
  warning: "warning", warn: "warning", caution: "warning", degraded: "warning", yellow: "warning",
  amber: "warning", "at-risk": "warning", medium: "warning", moderate: "warning", flaky: "warning",
  critical: "critical", error: "critical", fail: "critical", failed: "critical", failing: "critical",
  danger: "critical", bad: "critical", red: "critical", blocker: "critical", blocked: "critical",
  severe: "critical", high: "critical", broken: "critical", negative: "critical",
  info: "info", information: "info", note: "info", blue: "info", running: "info",
  neutral: "neutral", none: "neutral", unknown: "neutral", default: "neutral", muted: "neutral", low: "neutral",
};

const LEVEL_ALIASES: Record<string, Level> = {
  low: "low", lo: "low", minor: "low", small: "low", unlikely: "low", rare: "low", l: "low",
  medium: "medium", med: "medium", mid: "medium", moderate: "medium", possible: "medium", m: "medium",
  high: "high", hi: "high", major: "high", critical: "high", severe: "high", likely: "high", large: "high", h: "high",
};

const CHECK_ALIASES: Record<string, CheckState> = {
  done: "done", ok: "done", pass: "done", passed: "done", complete: "done", completed: "done", success: "done",
  true: "done", yes: "done", "✓": "done", good: "done",
  failed: "failed", fail: "failed", error: "failed", blocked: "failed", "✕": "failed", false: "failed", critical: "failed",
  pending: "pending", todo: "pending", open: "pending", "not started": "pending", waiting: "pending", queued: "pending",
  skipped: "skipped", skip: "skipped", na: "skipped", "n/a": "skipped",
  warning: "warning", warn: "warning", flaky: "warning",
  running: "running", "in progress": "running", "in-progress": "running", in_progress: "running", active: "running", working: "running",
};

const TYPE_ALIASES: Record<string, BlockType> = {
  kpi: "metric", gauge: "metric", number: "metric", stat: "metric",
  kpis: "metrics", stats: "metrics", numbers: "metrics", scorecard: "metrics",
  steps: "flow", pipeline: "flow", process: "flow", sequence: "flow", causal: "flow", chain: "flow",
  graph: "architecture", diagram: "architecture", system: "architecture", dependencies: "architecture",
  tree: "hierarchy", outline: "hierarchy",
  list: "checklist", todo: "checklist", checks: "checklist", tasks: "checklist",
  bars: "distribution", bar: "distribution", breakdown: "distribution", proportions: "distribution", share: "distribution",
  chart: "trend", line: "trend", sparkline: "trend", series: "trend", "time-series": "trend",
  recommendation: "verdict", conclusion: "verdict", decision: "verdict", callout: "verdict", answer: "verdict",
  markdown: "text", paragraph: "text", note: "text", prose: "text",
  diff: "change", files: "change", changes: "change", diffstat: "change",
  events: "timeline", history: "timeline", chronology: "timeline",
  risks: "risk", matrix: "risk", "risk-matrix": "risk",
  claim: "evidence", proof: "evidence",
  compare: "comparison", tradeoffs: "comparison", "trade-offs": "comparison", versus: "comparison",
  status: "progress",
};

export function normalizeStatus(value: unknown): Status | undefined {
  if (typeof value !== "string") return undefined;
  return STATUS_ALIASES[value.trim().toLowerCase()];
}

export function normalizeLevel(value: unknown, fallback: Level = "medium"): Level {
  if (typeof value === "number") return value >= 0.66 || value >= 3 ? "high" : value >= 0.33 || value >= 2 ? "medium" : "low";
  if (typeof value !== "string") return fallback;
  return LEVEL_ALIASES[value.trim().toLowerCase()] ?? fallback;
}

export function normalizeCheckState(value: unknown): CheckState {
  if (typeof value === "boolean") return value ? "done" : "pending";
  if (typeof value !== "string") return "pending";
  return CHECK_ALIASES[value.trim().toLowerCase()] ?? "pending";
}

/** Parses "87%", "1,204", "32 tok/s", "-12ms" into a number + unit. Returns undefined for non-numbers. */
export function parseNumberish(value: unknown): { value: number; unit?: string } | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return { value };
  if (typeof value !== "string") return undefined;
  const match = value.trim().match(/^([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)\s*([a-zA-Z%/µ°]+(?:\/[a-zA-Z]+)?)?$/);
  if (!match) return undefined;
  const parsed = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(parsed)) return undefined;
  return match[2] ? { value: parsed, unit: match[2] } : { value: parsed };
}

function maybeJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!(trimmed.startsWith("[") || trimmed.startsWith("{"))) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function asArray(value: unknown): unknown[] {
  const parsed = maybeJson(value);
  return Array.isArray(parsed) ? parsed : [];
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return undefined;
}

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "node";
}

/**
 * Normalizes a possibly sloppy Present document into a canonical shape.
 *
 * The normalizer is deliberately lenient — agents are not perfect JSON authors.
 * It fixes common mistakes (stringified arrays, status synonyms, "87%" strings,
 * aliased block types) rather than rejecting the presentation.
 */
export function normalize(input: unknown): NormalizedDocument {
  const doc = isRecord(maybeJson(input)) ? (maybeJson(input) as Record<string, unknown>) : {};
  const rawBlocks = asArray(doc.blocks);

  const blocks = rawBlocks
    .map((raw, index) => normalizeBlock(raw, index))
    .filter((block): block is NormalizedBlock => block !== undefined);

  assignPriorities(blocks);
  dedupeIds(blocks);

  const out: NormalizedDocument = {
    present: asString(doc.present) ?? PRESENT_VERSION,
    blocks,
    actions: normalizeActions(doc.actions),
  };

  const title = asString(doc.title);
  if (title) out.title = title;
  const subtitle = asString(doc.subtitle);
  if (subtitle) out.subtitle = subtitle;
  if (typeof doc.intent === "string") out.intent = doc.intent as NormalizedDocument["intent"];

  const takeaway = maybeJson(doc.takeaway);
  if (typeof takeaway === "string" && takeaway.trim()) {
    out.takeaway = { text: takeaway.trim() };
  } else if (isRecord(takeaway) && asString(takeaway.text)) {
    out.takeaway = { text: asString(takeaway.text)!.trim() };
    const status = normalizeStatus(takeaway.status);
    if (status) out.takeaway.status = status;
    const detail = asString(takeaway.detail);
    if (detail) out.takeaway.detail = detail;
    if (takeaway.value !== undefined && takeaway.value !== null && takeaway.value !== "") {
      const parsed = parseNumberish(takeaway.value);
      out.takeaway.value = parsed ? parsed.value : asString(takeaway.value);
      const unit = asString(takeaway.unit) ?? parsed?.unit;
      if (unit) out.takeaway.unit = unit;
    }
  }

  const detail = maybeJson(doc.detail);
  if (typeof detail === "string" && detail.trim()) out.detail = { markdown: detail };
  else if (isRecord(detail)) {
    const markdown = asString(detail.markdown);
    const sections = asArray(detail.sections)
      .filter(isRecord)
      .map((s) => ({ title: asString(s.title) ?? "", markdown: asString(s.markdown) ?? "" }))
      .filter((s) => s.markdown);
    if (markdown || sections.length) out.detail = { ...(markdown ? { markdown } : {}), ...(sections.length ? { sections } : {}) };
  }

  const evidence = asArray(doc.evidence).filter(isRecord).filter((e) => asString(e.label));
  if (evidence.length) {
    out.evidence = evidence.map((e) => ({
      label: asString(e.label)!,
      ...(asString(e.value) ? { value: asString(e.value) } : {}),
      ...(typeof e.supports === "boolean" ? { supports: e.supports } : {}),
      ...(asString(e.source) ? { source: asString(e.source) } : {}),
    }));
  }
  const sources = normalizeSources(doc.sources);
  if (sources.length) out.sources = sources;

  const speech = maybeJson(doc.speech);
  if (isRecord(speech) && asString(speech.summary)) out.speech = { summary: asString(speech.summary)! };
  else if (typeof speech === "string" && speech.trim()) out.speech = { summary: speech };

  return out;
}

function normalizeSources(value: unknown) {
  return asArray(value)
    .map((s) => (typeof s === "string" ? { label: s } : s))
    .filter(isRecord)
    .filter((s) => asString(s.label) || asString(s.ref))
    .map((s) => ({
      label: asString(s.label) ?? asString(s.ref)!,
      ...(asString(s.ref) ? { ref: asString(s.ref) } : {}),
      ...(asString(s.location) ? { location: asString(s.location) } : {}),
    }));
}

function normalizeActions(value: unknown): Action[] {
  const intents = new Set(["agent", "expand", "copy", "open"]);
  return asArray(value)
    .filter(isRecord)
    .filter((a) => asString(a.label))
    .map((a, i) => {
      const label = asString(a.label)!;
      const prompt = asString(a.prompt);
      const target = asString(a.target);
      let intent = typeof a.intent === "string" && intents.has(a.intent) ? (a.intent as Action["intent"]) : undefined;
      if (!intent) intent = target && !prompt ? "expand" : "agent";
      const action: Action = { id: asString(a.id) ?? (slug(label) || `action-${i + 1}`), label, intent };
      if (prompt) action.prompt = prompt;
      else if (intent === "agent") action.prompt = label;
      if (target) action.target = target;
      const v = asString(a.value);
      if (v) action.value = v;
      return action;
    });
}

/** Blocks without an explicit priority: the first four are primary, the rest secondary. */
function assignPriorities(blocks: NormalizedBlock[]): void {
  blocks.forEach((block, i) => {
    if (block.priority) return;
    block.priority = i < 4 ? "primary" : "secondary";
  });
}

function dedupeIds(blocks: NormalizedBlock[]): void {
  const seen = new Set<string>();
  for (const block of blocks) {
    let id = block.id;
    let n = 2;
    while (seen.has(id)) id = `${block.id}-${n++}`;
    block.id = id;
    seen.add(id);
  }
}

function normalizeBase(raw: Record<string, unknown>, type: string, index: number) {
  const base: Record<string, unknown> = { type };
  const title = asString(raw.title);
  if (title) base.title = title;
  base.id = asString(raw.id) ?? (title ? slug(title) : `${type}-${index + 1}`);
  const priority = typeof raw.priority === "string" ? raw.priority.toLowerCase() : undefined;
  if (priority === "primary" || priority === "secondary" || priority === "detail") base.priority = priority;
  if (raw.emphasis === "strong" || raw.emphasis === "normal" || raw.emphasis === "subtle") base.emphasis = raw.emphasis;
  if (raw.density === "compact" || raw.density === "normal" || raw.density === "comfortable") base.density = raw.density;
  const sources = normalizeSources(raw.sources);
  if (sources.length) base.sources = sources;
  return base;
}

function resolveType(raw: Record<string, unknown>): BlockType | string | undefined {
  const t = asString(raw.type)?.trim().toLowerCase();
  if (!t) return undefined;
  if ((BLOCK_TYPES as readonly string[]).includes(t)) return t;
  return TYPE_ALIASES[t] ?? t;
}

function normalizeBlock(input: unknown, index: number): NormalizedBlock | undefined {
  const raw = maybeJson(input);
  if (typeof raw === "string") {
    return { type: "text", text: raw, id: `text-${index + 1}`, priority: undefined as unknown as Priority };
  }
  if (!isRecord(raw)) return undefined;
  const type = resolveType(raw);
  if (!type) return unknownBlock(raw, "untyped", index);

  const base = normalizeBase(raw, type, index);
  const detail = asString(raw.detail);
  const status = normalizeStatus(raw.status);
  const b = (extra: Record<string, unknown>) => ({ ...base, ...extra }) as unknown as NormalizedBlock;

  switch (type) {
    case "verdict": {
      const text = asString(raw.text) ?? asString(raw.verdict) ?? asString(raw.label) ?? asString(raw.title);
      if (!text) return unknownBlock(raw, type, index);
      return b({
        text,
        ...(status ? { status } : {}),
        ...(detail ? { detail } : {}),
        ...(asString(raw.next) ? { next: asString(raw.next) } : {}),
        ...(asString(raw.command) ? { command: asString(raw.command) } : {}),
      });
    }
    case "metric": {
      const label = asString(raw.label) ?? asString(raw.title) ?? asString(raw.name) ?? "";
      const parsed = parseNumberish(raw.value);
      const value = parsed ? parsed.value : asString(raw.value);
      if (value === undefined) return unknownBlock(raw, type, index);
      const unit = asString(raw.unit) ?? parsed?.unit;
      const extra: Record<string, unknown> = { label, value };
      if (unit) extra.unit = unit;
      for (const key of ["max", "min", "target"] as const) {
        const n = parseNumberish(raw[key]);
        if (n) extra[key] = n.value;
      }
      const trend = asArray(raw.trend).map((v) => parseNumberish(v)?.value).filter((v): v is number => v !== undefined);
      if (trend.length) extra.trend = trend;
      if (raw.delta !== undefined && raw.delta !== null && raw.delta !== "") extra.delta = typeof raw.delta === "number" ? raw.delta : asString(raw.delta);
      if (status) extra.status = status;
      const caption = asString(raw.caption);
      if (caption) extra.caption = caption;
      if (typeof raw.higherIsBetter === "boolean") extra.higherIsBetter = raw.higherIsBetter;
      if (detail) extra.detail = detail;
      if (base.title === label) delete (base as { title?: string }).title;
      return b(extra);
    }
    case "metrics": {
      const items = asArray(raw.items ?? raw.metrics)
        .filter(isRecord)
        .map((item) => {
          const parsed = parseNumberish(item.value);
          const value = parsed ? parsed.value : asString(item.value) ?? "–";
          const out: Record<string, unknown> = { label: asString(item.label) ?? asString(item.name) ?? "", value };
          const unit = asString(item.unit) ?? parsed?.unit;
          if (unit) out.unit = unit;
          const s = normalizeStatus(item.status);
          if (s) out.status = s;
          if (item.delta !== undefined && item.delta !== null && item.delta !== "") out.delta = typeof item.delta === "number" ? item.delta : asString(item.delta);
          if (asString(item.caption)) out.caption = asString(item.caption);
          const max = parseNumberish(item.max);
          if (max) out.max = max.value;
          return out;
        });
      if (!items.length) return unknownBlock(raw, type, index);
      return b({ items, ...(detail ? { detail } : {}) });
    }
    case "comparison":
      return normalizeComparison(raw, b, index, detail);
    case "flow":
    case "architecture": {
      const graph = normalizeGraph(raw, type === "flow");
      if (!graph.nodes.length) return unknownBlock(raw, type, index);
      const extra: Record<string, unknown> = { ...graph };
      if (type === "architecture") {
        const boundaries = asArray(raw.boundaries)
          .filter(isRecord)
          .filter((x) => asString(x.label))
          .map((x) => ({
            label: asString(x.label)!,
            note: asString(x.note) ?? asString(x.value) ?? "",
            ...(normalizeStatus(x.status) ? { status: normalizeStatus(x.status) } : {}),
          }));
        if (boundaries.length) extra.boundaries = boundaries;
        if (asString(raw.boundaryTitle)) extra.boundaryTitle = asString(raw.boundaryTitle);
      }
      if (detail) extra.detail = detail;
      return b(extra);
    }
    case "timeline": {
      const events = asArray(raw.events ?? raw.items)
        .filter(isRecord)
        .map((e) => ({
          at: asString(e.at) ?? asString(e.time) ?? asString(e.date) ?? "",
          label: asString(e.label) ?? asString(e.text) ?? asString(e.event) ?? "",
          ...(normalizeStatus(e.status) ? { status: normalizeStatus(e.status) } : {}),
          ...(asString(e.note) ? { note: asString(e.note) } : {}),
        }))
        .filter((e) => e.label || e.at);
      if (!events.length) return unknownBlock(raw, type, index);
      return b({ events, ...(detail ? { detail } : {}) });
    }
    case "trend": {
      let series = asArray(raw.series)
        .map((s) => (Array.isArray(s) ? { values: s } : s))
        .filter(isRecord)
        .map((s) => ({
          ...(asString(s.name) ? { name: asString(s.name) } : {}),
          values: asArray(s.values ?? s.data).map((v) => parseNumberish(v)?.value).filter((v): v is number => v !== undefined),
        }))
        .filter((s) => s.values.length > 0);
      if (!series.length) {
        const values = asArray(raw.values ?? raw.data).map((v) => parseNumberish(v)?.value).filter((v): v is number => v !== undefined);
        if (values.length) series = [{ values }];
      }
      if (!series.length) return unknownBlock(raw, type, index);
      const extra: Record<string, unknown> = { series };
      const label = asString(raw.label);
      if (label) extra.label = label;
      const xLabels = asArray(raw.xLabels ?? raw.labels).map(asString).filter((v): v is string => v !== undefined);
      if (xLabels.length) extra.xLabels = xLabels;
      if (asString(raw.unit)) extra.unit = asString(raw.unit);
      if (status) extra.status = status;
      const threshold = parseNumberish(raw.threshold);
      if (threshold) extra.threshold = threshold.value;
      if (asString(raw.annotation)) extra.annotation = asString(raw.annotation);
      if (detail) extra.detail = detail;
      return b(extra);
    }
    case "distribution": {
      const items = asArray(raw.items ?? raw.data)
        .filter(isRecord)
        .map((item) => ({
          label: asString(item.label) ?? asString(item.name) ?? "",
          value: parseNumberish(item.value)?.value ?? 0,
          ...(normalizeStatus(item.status) ? { status: normalizeStatus(item.status) } : {}),
        }));
      if (!items.length) return unknownBlock(raw, type, index);
      return b({
        items,
        ...(asString(raw.unit) ? { unit: asString(raw.unit) } : {}),
        ...(raw.whole === true || raw.stacked === true ? { whole: true } : {}),
        ...(detail ? { detail } : {}),
      });
    }
    case "risk": {
      const items = asArray(raw.items ?? raw.risks)
        .filter(isRecord)
        .map((item) => ({
          label: asString(item.label) ?? asString(item.name) ?? "",
          impact: normalizeLevel(item.impact ?? item.severity),
          likelihood: normalizeLevel(item.likelihood ?? item.probability),
          ...(normalizeStatus(item.status) ? { status: normalizeStatus(item.status) } : {}),
          ...(asString(item.note) ? { note: asString(item.note) } : {}),
        }));
      if (!items.length) return unknownBlock(raw, type, index);
      return b({ items, ...(detail ? { detail } : {}) });
    }
    case "hierarchy": {
      let root = normalizeHierarchyNode(raw.root);
      if (!root) {
        const children = asArray(raw.children ?? raw.nodes ?? raw.items).map(normalizeHierarchyNode).filter((n): n is HierarchyNode => !!n);
        if (children.length === 1) root = children[0];
        else if (children.length) root = { label: asString(raw.label) ?? (base.title as string | undefined) ?? "", children };
      }
      if (!root) return unknownBlock(raw, type, index);
      return b({ root, ...(detail ? { detail } : {}) });
    }
    case "checklist": {
      const items = asArray(raw.items)
        .map((item) => (typeof item === "string" ? { label: item, state: "pending" } : item))
        .filter(isRecord)
        .map((item) => ({
          label: asString(item.label) ?? asString(item.text) ?? "",
          state: normalizeCheckState(item.state ?? item.status ?? item.done),
          ...(asString(item.note) ? { note: asString(item.note) } : {}),
        }));
      if (!items.length) return unknownBlock(raw, type, index);
      return b({ items, ...(detail ? { detail } : {}) });
    }
    case "evidence": {
      const claim = asString(raw.claim) ?? asString(raw.text) ?? asString(raw.title);
      if (!claim) return unknownBlock(raw, type, index);
      const items = asArray(raw.items ?? raw.evidence)
        .map((item) => (typeof item === "string" ? { label: item } : item))
        .filter(isRecord)
        .filter((item) => asString(item.label))
        .map((item) => ({
          label: asString(item.label)!,
          ...(asString(item.value ?? item.at) ? { value: asString(item.value ?? item.at) } : {}),
          ...(typeof item.supports === "boolean" ? { supports: item.supports } : {}),
          ...(asString(item.source) ? { source: asString(item.source) } : {}),
        }));
      return b({
        claim,
        ...(raw.confidence !== undefined ? { confidence: normalizeLevel(raw.confidence) } : {}),
        items,
        ...(detail ? { detail } : {}),
      });
    }
    case "change": {
      const files = asArray(raw.files ?? raw.items)
        .filter(isRecord)
        .filter((f) => asString(f.path ?? f.file))
        .map((f) => ({
          path: asString(f.path ?? f.file)!,
          ...(parseNumberish(f.added ?? f.additions) ? { added: parseNumberish(f.added ?? f.additions)!.value } : {}),
          ...(parseNumberish(f.removed ?? f.deletions) ? { removed: parseNumberish(f.removed ?? f.deletions)!.value } : {}),
          ...(f.risk !== undefined ? { risk: normalizeLevel(f.risk) } : {}),
          ...(asString(f.note) ? { note: asString(f.note) } : {}),
        }));
      if (!files.length) return unknownBlock(raw, type, index);
      return b({ files, ...(detail ? { detail } : {}) });
    }
    case "progress": {
      const items = asArray(raw.items)
        .filter(isRecord)
        .map((item) => ({
          label: asString(item.label) ?? "",
          ...(parseNumberish(item.value) ? { value: parseNumberish(item.value)!.value } : {}),
          ...(parseNumberish(item.total) ? { total: parseNumberish(item.total)!.value } : {}),
          ...(item.state !== undefined || item.status !== undefined ? { state: normalizeCheckState(item.state ?? item.status) } : {}),
        }));
      if (!items.length) return unknownBlock(raw, type, index);
      const signal = isRecord(raw.signal) && asString(raw.signal.label)
        ? {
            label: asString(raw.signal.label)!,
            ...(asString(raw.signal.value) ? { value: asString(raw.signal.value) } : {}),
            ...(normalizeStatus(raw.signal.status) ? { status: normalizeStatus(raw.signal.status) } : {}),
          }
        : undefined;
      return b({ items, ...(signal ? { signal } : {}), ...(detail ? { detail } : {}) });
    }
    case "text": {
      const text = asString(raw.text) ?? asString(raw.markdown) ?? asString(raw.content);
      if (!text) return unknownBlock(raw, type, index);
      return b({ text, ...(detail ? { detail } : {}) });
    }
    default:
      return unknownBlock(raw, type, index);
  }
}

function normalizeComparison(
  raw: Record<string, unknown>,
  b: (extra: Record<string, unknown>) => NormalizedBlock,
  index: number,
  detail: string | undefined,
): NormalizedBlock | undefined {
  const options = asArray(raw.options ?? raw.alternatives)
    .map((o) => (typeof o === "string" ? { label: o } : o))
    .filter(isRecord)
    .filter((o) => asString(o.label ?? o.name))
    .map((o) => {
      const label = asString(o.label ?? o.name)!;
      return { id: asString(o.id) ?? slug(label), label, ...(asString(o.summary) ? { summary: asString(o.summary) } : {}) };
    });
  if (options.length < 1) return unknownBlock(raw, "comparison", index);

  const dimensions = asArray(raw.dimensions ?? raw.criteria)
    .filter(isRecord)
    .map((d) => {
      const rawValues = maybeJson(d.values);
      let values: ComparisonValue[];
      if (Array.isArray(rawValues)) values = rawValues as ComparisonValue[];
      else if (isRecord(rawValues)) {
        values = options.map((o) => (rawValues[o.id] ?? rawValues[o.label] ?? "") as ComparisonValue);
      } else values = [];
      const normalized = options.map((_, i) => normalizeComparisonValue(values[i]));
      return {
        label: asString(d.label) ?? asString(d.name) ?? "",
        values: normalized,
        ...(d.better === "lower" || d.lowerIsBetter === true ? { better: "lower" } : { better: "higher" }),
        ...(asString(d.unit) ? { unit: asString(d.unit) } : {}),
      };
    });

  const winnerRaw = asString(raw.winner ?? raw.recommended ?? raw.pick);
  const winner = winnerRaw
    ? options.find((o) => o.id === winnerRaw || o.label.toLowerCase() === winnerRaw.toLowerCase() || slug(winnerRaw) === o.id)?.id
    : undefined;

  return b({
    options,
    dimensions,
    ...(winner ? { winner } : {}),
    ...(asString(raw.rationale) ? { rationale: asString(raw.rationale) } : {}),
    ...(detail ? { detail } : {}),
  });
}

function normalizeComparisonValue(value: unknown): { value?: number; label?: string; note?: string } {
  if (value === undefined || value === null) return {};
  if (typeof value === "number") return { value };
  if (typeof value === "string") {
    const parsed = parseNumberish(value);
    return parsed ? { value: parsed.value, label: value } : { label: value };
  }
  if (isRecord(value)) {
    const parsed = parseNumberish(value.value);
    const out: { value?: number; label?: string; note?: string } = {};
    if (parsed) out.value = parsed.value;
    const label = asString(value.label) ?? (parsed ? undefined : asString(value.value));
    if (label) out.label = label;
    if (asString(value.note)) out.note = asString(value.note);
    return out;
  }
  return {};
}

function normalizeGraph(raw: Record<string, unknown>, sequentialDefault: boolean): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const kinds = new Set(["step", "service", "store", "actor", "external", "decision", "outcome"]);
  const rawNodes = asArray(raw.nodes ?? raw.steps ?? raw.components ?? raw.items);
  const nodes: GraphNode[] = [];
  const byLabel = new Map<string, string>();
  rawNodes.forEach((n, i) => {
    const item = typeof n === "string" ? { label: n } : n;
    if (!isRecord(item)) return;
    const label = asString(item.label) ?? asString(item.name) ?? asString(item.id);
    if (!label) return;
    const id = asString(item.id) ?? slug(label) ?? `n${i}`;
    const node: GraphNode = { id, label };
    const kind = asString(item.kind)?.toLowerCase();
    if (kind && kinds.has(kind)) node.kind = kind as GraphNode["kind"];
    const s = normalizeStatus(item.status);
    if (s) node.status = s;
    if (asString(item.note)) node.note = asString(item.note);
    nodes.push(node);
    byLabel.set(label.toLowerCase(), id);
  });

  const ids = new Set(nodes.map((n) => n.id));
  const resolve = (ref: unknown): string | undefined => {
    const s = asString(ref);
    if (!s) return undefined;
    if (ids.has(s)) return s;
    return byLabel.get(s.toLowerCase()) ?? (ids.has(slug(s)) ? slug(s) : undefined);
  };

  const rawEdges = raw.edges ?? raw.links ?? raw.connections;
  let edges: GraphEdge[] = asArray(rawEdges)
    .filter(isRecord)
    .map((e) => {
      const from = resolve(e.from ?? e.source);
      const to = resolve(e.to ?? e.target);
      if (!from || !to || from === to) return undefined;
      const edge: GraphEdge = { from, to };
      if (asString(e.label)) edge.label = asString(e.label);
      const s = normalizeStatus(e.status);
      if (s) edge.status = s;
      return edge;
    })
    .filter((e): e is GraphEdge => e !== undefined);

  if (rawEdges === undefined && sequentialDefault) {
    edges = nodes.slice(1).map((n, i) => ({ from: nodes[i].id, to: n.id }));
  }
  return { nodes, edges };
}

function normalizeHierarchyNode(value: unknown): HierarchyNode | undefined {
  if (typeof value === "string") return { label: value };
  if (!isRecord(value)) return undefined;
  const label = asString(value.label) ?? asString(value.name);
  if (label === undefined) return undefined;
  const node: HierarchyNode = { label };
  if (asString(value.note)) node.note = asString(value.note);
  const s = normalizeStatus(value.status);
  if (s) node.status = s;
  const children = asArray(value.children).map(normalizeHierarchyNode).filter((n): n is HierarchyNode => !!n);
  if (children.length) node.children = children;
  return node;
}

function unknownBlock(raw: Record<string, unknown>, originalType: string, index: number): NormalizedBlock {
  const fallback: string[] = [];
  const text = asString(raw.text) ?? asString(raw.label) ?? asString(raw.title);
  if (text) fallback.push(text);
  const nodes = asArray(raw.nodes);
  const edges = asArray(raw.edges);
  if (edges.length) {
    for (const e of edges.filter(isRecord)) fallback.push(`${asString(e.from) ?? "?"} -> ${asString(e.to) ?? "?"}`);
  } else if (nodes.length) {
    fallback.push(nodes.map((n) => (isRecord(n) ? asString(n.label) ?? asString(n.id) : asString(n))).filter(Boolean).join(" -> "));
  }
  for (const item of asArray(raw.items).slice(0, 8)) {
    if (typeof item === "string") fallback.push(`• ${item}`);
    else if (isRecord(item)) {
      const label = asString(item.label) ?? asString(item.name) ?? "";
      const value = asString(item.value);
      fallback.push(value !== undefined ? `• ${label}: ${value}` : `• ${label}`);
    }
  }
  const block: UnknownBlock & { id: string; priority: Priority } = {
    type: "unknown",
    originalType,
    fallback,
    id: asString(raw.id) ?? `${slug(originalType)}-${index + 1}`,
    priority: (raw.priority as Priority) ?? (undefined as unknown as Priority),
  };
  const title = asString(raw.title);
  if (title) block.title = title;
  return block;
}
