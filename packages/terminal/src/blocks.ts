import {
  riskSeverity,
  statusRank,
  type ArchitectureBlock,
  type ChangeBlock,
  type ChecklistBlock,
  type ComparisonBlock,
  type DistributionBlock,
  type EvidenceBlock,
  type FlowBlock,
  type HierarchyBlock,
  type HierarchyNode,
  type Level,
  type MetricBlock,
  type MetricsBlock,
  type NormalizedBlock,
  type ProgressBlock,
  type RiskBlock,
  type Status,
  type TextBlock,
  type TimelineBlock,
  type TrendBlock,
  type UnknownBlock,
  type VerdictBlock,
} from "@agent-present/core";
import { Canvas } from "./canvas.js";
import { bar, formatNumber, formatValue, lineChart, resample, sparkline, stackedBar } from "./charts.js";
import { mark, sectionTitle, type RenderContext } from "./context.js";
import { renderGraph } from "./graph.js";
import { renderMarkdown } from "./markdown.js";
import { statusRole, type Role } from "./style.js";
import { center, columns, fit, padEnd, padStart, truncate, visibleWidth, wrap } from "./text.js";

/** Renders one block (with its section title) to lines no wider than ctx.width. */
export function renderBlock(block: NormalizedBlock, ctx: RenderContext): string[] {
  const body = renderBody(block, ctx);
  const lines: string[] = [];
  const titleRight = titleSummary(block, ctx);
  if (block.title) lines.push(sectionTitle(ctx, block.title, titleRight));
  lines.push(...body);
  if (ctx.depth === "explore") {
    if (block.detail && block.type !== "verdict") {
      lines.push("");
      lines.push(...renderMarkdown(block.detail, ctx).map((l) => ctx.style.fg("muted", l)));
    }
    if (block.sources?.length) {
      lines.push(...block.sources.map((s) => ctx.style.fg("dim", truncate(`${ctx.glyphs.arrowRight} ${s.label}${s.ref ? `  ${s.ref}` : ""}${s.location ? `:${s.location}` : ""}`, ctx.width))));
    }
  }
  return lines.map((l) => (visibleWidth(l) > ctx.width ? truncate(l, ctx.width, ctx.glyphs.ellipsis) : l));
}

function renderBody(block: NormalizedBlock, ctx: RenderContext): string[] {
  switch (block.type) {
    case "verdict":
      return verdict(block, ctx);
    case "metric":
      return metric(block, ctx);
    case "metrics":
      return metrics(block, ctx);
    case "comparison":
      return comparison(block, ctx);
    case "flow":
      return flow(block, ctx);
    case "architecture":
      return architecture(block, ctx);
    case "timeline":
      return timeline(block, ctx);
    case "trend":
      return trend(block, ctx);
    case "distribution":
      return distribution(block, ctx);
    case "risk":
      return risk(block, ctx);
    case "hierarchy":
      return hierarchy(block, ctx);
    case "checklist":
      return checklist(block, ctx);
    case "evidence":
      return evidence(block, ctx);
    case "change":
      return change(block, ctx);
    case "progress":
      return progress(block, ctx);
    case "text":
      return text(block, ctx);
    case "unknown":
      return unknown(block, ctx);
  }
}

function titleSummary(block: NormalizedBlock, ctx: RenderContext): string | undefined {
  const { style, glyphs: g } = ctx;
  if (block.type === "checklist") {
    const done = block.items.filter((i) => i.state === "done").length;
    const failed = block.items.filter((i) => i.state === "failed").length;
    const role: Role = failed ? "critical" : done === block.items.length ? "good" : "warning";
    return style.fg(role, `${done}/${block.items.length} ${g.check.done}`);
  }
  if (block.type === "change") {
    const added = block.files.reduce((a, f) => a + (f.added ?? 0), 0);
    const removed = block.files.reduce((a, f) => a + (f.removed ?? 0), 0);
    return `${style.fg("muted", `${block.files.length} files `)}${style.fg("good", `+${added}`)} ${style.fg("critical", `-${removed}`)}`;
  }
  return undefined;
}

// ─── verdict ─────────────────────────────────────────────────────────────────

function shout(text: string): string {
  return text.length <= 42 ? text.toUpperCase() : text;
}

/** Wraps text and clamps it to `max` lines, ending in an ellipsis when cut. */
export function clampWrap(text: string, width: number, max: number, ellipsis: string): string[] {
  const lines = wrap(text, width);
  if (lines.length <= max) return lines;
  const kept = lines.slice(0, max);
  kept[max - 1] = truncate(`${kept[max - 1]} ${lines[max]}`, width, ellipsis);
  if (!kept[max - 1].endsWith(ellipsis)) kept[max - 1] = truncate(kept[max - 1], width - 1, "") + ellipsis;
  return kept;
}

export function verdictLines(
  ctx: RenderContext,
  textValue: string,
  status: Status | undefined,
  rest: { detail?: string; next?: string; command?: string },
): string[] {
  const { style, glyphs: g, width } = ctx;
  const limit = (glance: number, scan: number) => (ctx.depth === "explore" ? Infinity : ctx.depth === "scan" ? scan : glance);
  const role = status ? statusRole(status) : "accent";
  const barGlyph = style.fg(role, g.accentBar);
  const glyph = status && status !== "neutral" && status !== "info" ? `${mark(ctx, status)} ` : "";
  const inner = width - 2 - (glyph ? 2 : 0);
  const lines: string[] = [];
  clampWrap(shout(textValue), inner, limit(2, 3), g.ellipsis).forEach((line, i) =>
    lines.push(`${barGlyph} ${i === 0 ? glyph : glyph ? "  " : ""}${style.bold(style.fg(role, line))}`),
  );
  if (rest.detail) for (const line of clampWrap(rest.detail, width - 2, limit(1, 2), g.ellipsis)) lines.push(`${barGlyph} ${style.fg("muted", line)}`);
  if (rest.next) {
    const nextLines = clampWrap(rest.next, width - 4, limit(2, 3), g.ellipsis);
    nextLines.forEach((line, i) => lines.push(`${barGlyph} ${i === 0 ? style.fg(role, g.arrowRight) : " "} ${style.fg("text", line)}`));
  }
  if (rest.command) lines.push(`${barGlyph} ${style.fg("accent", truncate(`$ ${rest.command}`, width - 2))}`);
  return lines;
}

function verdict(b: VerdictBlock, ctx: RenderContext): string[] {
  return verdictLines(ctx, b.text, b.status, b);
}

// ─── metric(s) ───────────────────────────────────────────────────────────────

function deltaRole(delta: number | string | undefined, higherIsBetter = true): Role {
  if (delta === undefined) return "muted";
  const n = typeof delta === "number" ? delta : Number.parseFloat(String(delta).replace(/[^0-9.+-]/g, ""));
  if (!Number.isFinite(n) || n === 0) return "muted";
  return n > 0 === higherIsBetter ? "good" : "critical";
}

function formatDelta(delta: number | string): string {
  if (typeof delta === "number") return `${delta > 0 ? "+" : ""}${formatNumber(delta)}`;
  return delta;
}

function metric(b: MetricBlock, ctx: RenderContext): string[] {
  const { style, glyphs: g, width } = ctx;
  const role: Role = b.status ? statusRole(b.status) : "strong";
  const valueText = formatValue(b.value, b.unit === "%" || !b.max ? b.unit : b.unit);
  const lines: string[] = [];
  const head = style.bold(style.fg("muted", b.label.toUpperCase()));
  const delta = b.delta !== undefined ? style.fg(deltaRole(b.delta, b.higherIsBetter), formatDelta(b.delta)) : "";
  lines.push(delta ? head + "  " + delta : head);

  let row = `${style.bold(style.fg(role, valueText))}${b.status && b.status !== "neutral" ? ` ${mark(ctx, b.status)}` : ""}`;
  const numeric = typeof b.value === "number";
  const scaleMax = b.max ?? (b.unit === "%" ? 100 : undefined);
  const spark = b.trend?.length ? sparkline(b.trend, g, Math.min(b.trend.length, 16)) : "";
  if (numeric && scaleMax !== undefined) {
    const frac = ((b.value as number) - (b.min ?? 0)) / (scaleMax - (b.min ?? 0) || 1);
    const pct = `${Math.round(frac * 100)}%`;
    const barWidth = Math.max(8, Math.min(40, width - visibleWidth(row) - visibleWidth(pct) - visibleWidth(spark) - 8));
    row += "  " + bar(frac, barWidth, g, style, b.status ? role : "accent") + "  " + style.fg("muted", b.unit === "%" ? "" : pct);
  }
  if (spark) row = row.replace(/\s+$/, "") + "  " + style.fg(b.status ? role : "accent", spark);
  lines.push(row.replace(/\s+$/, ""));
  if (b.caption) lines.push(style.fg("dim", b.caption));
  return lines;
}

function metrics(b: MetricsBlock, ctx: RenderContext): string[] {
  const { style, width } = ctx;
  const minCol = 14;
  const perRow = Math.max(1, Math.min(b.items.length, Math.floor((width + 2) / minCol)));
  const colWidth = Math.floor((width - (perRow - 1) * 2) / perRow);
  const out: string[] = [];
  for (let i = 0; i < b.items.length; i += perRow) {
    const chunk = b.items.slice(i, i + perRow);
    const cells = chunk.map((item) => {
      const role: Role = item.status ? statusRole(item.status) : "strong";
      const value = formatValue(item.value, item.unit);
      const glyph = item.status && item.status !== "neutral" ? ` ${mark(ctx, item.status)}` : "";
      const lines = [style.bold(style.fg(role, value)) + glyph, style.fg("muted", item.label.toUpperCase())];
      if (item.delta !== undefined) lines.push(style.fg(item.status ? statusRole(item.status) : deltaRole(item.delta), formatDelta(item.delta)));
      else if (item.caption) lines.push(style.fg("dim", item.caption));
      return lines;
    });
    if (out.length) out.push("");
    out.push(...columns(cells, chunk.map(() => colWidth), 2));
  }
  return out;
}

// ─── comparison ──────────────────────────────────────────────────────────────

interface CompValue {
  value?: number;
  label?: string;
  note?: string;
}

function comparison(b: ComparisonBlock, ctx: RenderContext): string[] {
  const { style, glyphs: g, width } = ctx;
  const n = b.options.length;
  const winnerIndex = b.options.findIndex((o) => o.id === b.winner);
  const dims = b.dimensions.map((d) => ({ ...d, values: d.values as CompValue[] }));
  const longestWord = Math.max(...dims.map((d) => Math.max(...d.label.split(/\s+/).map((w) => w.length))));
  const labelCol = Math.min(Math.max(14, Math.floor(width * 0.2)), Math.max(10, longestWord + 2, ...dims.map((d) => Math.ceil(d.label.length / 2) + 3)));
  const labelLines = (label: string) => clampWrap(label.toUpperCase(), labelCol - 2, 2, g.ellipsis);
  const colWidth = Math.floor((width - labelCol) / Math.max(1, n));
  const bestIndex = (d: (typeof dims)[number]) => {
    const nums = d.values.map((v) => v.value);
    if (nums.every((v) => v === undefined)) return -1;
    const pick = d.better === "lower" ? Math.min(...nums.filter((v): v is number => v !== undefined)) : Math.max(...nums.filter((v): v is number => v !== undefined));
    return nums.indexOf(pick);
  };
  const valueText = (v: CompValue, unit?: string) => v.label ?? (v.value !== undefined ? formatValue(v.value, unit) : "–");

  const lines: string[] = [];
  if (colWidth >= 13 && n <= 5) {
    const barWidth = colWidth - 3;
    const head = b.options.map((o, i) => {
      const label = truncate(o.label.toUpperCase(), colWidth - 2);
      return i === winnerIndex ? style.bold(style.fg("good", label)) : style.bold(style.fg("muted", label));
    });
    lines.push(" ".repeat(labelCol) + head.map((h) => padEnd(h, colWidth)).join("").replace(/\s+$/, ""));
    for (const d of dims) {
      const best = bestIndex(d);
      const numbers = d.values.map((v) => v.value ?? 0);
      const max = Math.max(...numbers.map(Math.abs), 0) || 1;
      const hasNumbers = d.values.some((v) => v.value !== undefined);
      const [label1, label2 = ""] = labelLines(d.label).map((l) => style.fg("muted", fit(l, labelCol)));
      const label = label1;
      if (hasNumbers) {
        const bars = d.values.map((v, i) =>
          padEnd(bar(Math.abs(v.value ?? 0) / max, barWidth, g, style, i === winnerIndex ? "accent" : "dim", "dim", false), colWidth),
        );
        lines.push((label + bars.join("")).replace(/\s+$/, ""));
        const values = d.values.map((v, i) => {
          const t = valueText(v, d.unit);
          const isBest = i === best;
          const txt = i === winnerIndex ? style.fg("strong", t) : style.fg("muted", t);
          return padEnd(txt + (isBest ? " " + style.fg("good", g.best) : ""), colWidth);
        });
        lines.push(((label2 || " ".repeat(labelCol)) + values.join("")).replace(/\s+$/, ""));
      } else {
        const values = d.values.map((v, i) => padEnd(i === winnerIndex ? style.fg("strong", truncate(valueText(v), colWidth - 2)) : style.fg("muted", truncate(valueText(v), colWidth - 2)), colWidth));
        lines.push((label + values.join("")).replace(/\s+$/, ""));
        if (label2) lines.push(label2.replace(/\s+$/, ""));
      }
    }
    if (b.options.some((o) => o.summary)) {
      const short = b.options.every((o) => (o.summary ?? "").length <= colWidth - 2);
      const wrapped = b.options.map((o) => clampWrap(short ? (o.summary ?? "").toUpperCase() : o.summary ?? "", colWidth - 2, 2, g.ellipsis));
      const rows = Math.max(...wrapped.map((w) => w.length));
      for (let r = 0; r < rows; r++) {
        const row = wrapped.map((w, i) => {
          const s = w[r] ?? "";
          return padEnd(i === winnerIndex ? style.bold(style.fg("good", s)) : style.fg("muted", s), colWidth);
        });
        lines.push((style.fg("muted", fit(r === 0 ? "BEST FOR" : "", labelCol)) + row.join("")).replace(/\s+$/, ""));
      }
    }
    if (winnerIndex >= 0) {
      const offset = labelCol + winnerIndex * colWidth;
      lines.push(" ".repeat(offset) + style.fg("good", g.pick));
      const pick = style.bold(style.fg("good", "PICK"));
      const rationale = b.rationale ? `  ${b.rationale}` : "";
      if (offset + 4 + visibleWidth(rationale) <= width) lines.push(" ".repeat(offset) + pick + style.fg("muted", rationale));
      else {
        lines.push(" ".repeat(offset) + pick);
        if (b.rationale) lines.push(...wrap(b.rationale, width).map((l) => style.fg("muted", l)));
      }
    }
    return lines;
  }

  // narrow: stack alternatives under each dimension
  const optWidth = Math.min(16, Math.max(...b.options.map((o) => o.label.length)) + 1);
  for (const d of dims) {
    const best = bestIndex(d);
    const max = Math.max(...d.values.map((v) => Math.abs(v.value ?? 0)), 0) || 1;
    lines.push(style.bold(style.fg("muted", d.label.toUpperCase())));
    d.values.forEach((v, i) => {
      const name = i === winnerIndex ? style.bold(style.fg("good", fit(b.options[i].label, optWidth))) : style.fg("text", fit(b.options[i].label, optWidth));
      const t = valueText(v, d.unit) + (i === best ? ` ${g.best}` : "");
      const barWidth = Math.max(4, width - optWidth - visibleWidth(t) - 5);
      const barText = v.value !== undefined ? bar(Math.abs(v.value) / max, barWidth, g, style, i === winnerIndex ? "accent" : "dim", "dim", false) : " ".repeat(barWidth);
      lines.push(`  ${name} ${barText} ${style.fg(i === best ? "good" : "muted", t)}`.replace(/\s+$/, ""));
    });
  }
  if (winnerIndex >= 0) {
    lines.push("");
    lines.push(`${style.fg("good", g.pick)} ${style.bold(style.fg("good", `PICK ${b.options[winnerIndex].label.toUpperCase()}`))}`);
    if (b.rationale) lines.push(...wrap(b.rationale, width).map((l) => style.fg("muted", l)));
  }
  return lines;
}

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─── graphs ──────────────────────────────────────────────────────────────────

function flow(b: FlowBlock, ctx: RenderContext): string[] {
  return renderGraph(b.nodes, b.edges ?? [], { width: ctx.width, glyphs: ctx.glyphs, style: ctx.style, compact: b.density === "compact" });
}

function architecture(b: ArchitectureBlock, ctx: RenderContext): string[] {
  const { style, glyphs: g, width } = ctx;
  const lines = renderGraph(b.nodes, b.edges ?? [], { width, glyphs: g, style, compact: b.density === "compact" });
  if (b.boundaries?.length) {
    lines.push("");
    lines.push(style.bold(style.fg("muted", (b.boundaryTitle ?? "Boundaries").toUpperCase())));
    lines.push(style.fg("dim", g.h.repeat(Math.min(width, 46))));
    const labelWidth = Math.min(18, Math.max(...b.boundaries.map((x) => x.label.length)) + 3);
    for (const x of b.boundaries) {
      const glyph = x.status ? `${mark(ctx, x.status)} ` : "";
      lines.push(truncate(`${style.fg("text", fit(x.label, labelWidth))}${glyph}${style.fg(x.status ? statusRole(x.status) : "muted", x.note)}`, width));
    }
  }
  return lines;
}

// ─── timeline ────────────────────────────────────────────────────────────────

function timeline(b: TimelineBlock, ctx: RenderContext): string[] {
  const { style, glyphs: g, width } = ctx;
  const events = b.events;
  const n = events.length;
  const maxLabel = Math.max(...events.map((e) => Math.max(visibleWidth(e.label), visibleWidth(e.at))));
  const eventGlyph = (s?: Status) => (s === "critical" || s === "warning" ? g.status[s] : g.unicode ? "●" : "o");

  if (n >= 2 && n <= 8 && n * (maxLabel + 3) <= width) {
    const span = Math.min(width, Math.max(n * (maxLabel + 6), 40));
    const xs = events.map((_, i) => Math.round((i / (n - 1)) * (span - 1)));
    const canvas = new Canvas(width, g.unicode);
    const place = (i: number, textValue: string) => {
      const w = visibleWidth(textValue);
      const x = i === 0 ? xs[i] : i === n - 1 ? xs[i] - w + 1 : xs[i] - Math.floor((w - 1) / 2);
      return Math.max(0, Math.min(width - w, x));
    };
    events.forEach((e, i) => canvas.text(place(i, e.at), 0, e.at, "muted"));
    canvas.hline(xs[0], xs[n - 1], 1, "dim");
    events.forEach((e, i) => {
      canvas.text(xs[i], 1, eventGlyph(e.status), e.status ? statusRole(e.status) : "accent", true);
      canvas.text(place(i, e.label), 2, e.label, e.status && e.status !== "good" ? statusRole(e.status) : "strong", Boolean(e.status && e.status !== "neutral"));
    });
    // notes hang below their event; stack them when they would collide
    let noteRow = 5;
    const used: { x1: number; x2: number; row: number }[] = [];
    for (let i = 0; i < n; i++) {
      const e = events[i];
      if (!e.note) continue;
      const w = visibleWidth(e.note);
      const x = Math.max(0, Math.min(width - w, xs[i] - Math.floor((w - 1) / 2)));
      let row = noteRow;
      while (used.some((u) => u.row === row && !(x > u.x2 + 1 || x + w < u.x1 - 1))) row++;
      used.push({ x1: x, x2: x + w - 1, row });
      const role = e.status ? statusRole(e.status) : "muted";
      canvas.text(xs[i], 3, g.arrowUp, role);
      for (let r = 4; r < row; r++) canvas.text(xs[i], r, g.v, "dim");
      canvas.text(x, row, e.note, role);
      noteRow = Math.max(noteRow, 5);
    }
    return canvas.toLines(style);
  }

  // vertical
  const atWidth = Math.max(...events.map((e) => visibleWidth(e.at)));
  const lines: string[] = [];
  events.forEach((e, i) => {
    const role = e.status ? statusRole(e.status) : "accent";
    const note = e.note ? style.fg("muted", `  ${e.note}`) : "";
    lines.push(truncate(`${style.fg("muted", padStart(e.at, atWidth))} ${style.fg(role, eventGlyph(e.status))} ${style.fg("strong", e.label)}${note}`, width));
    if (i < n - 1) lines.push(`${" ".repeat(atWidth)} ${style.fg("dim", g.v)}`);
  });
  return lines;
}

// ─── trend ───────────────────────────────────────────────────────────────────

function trend(b: TrendBlock, ctx: RenderContext): string[] {
  const { style, glyphs: g, width } = ctx;
  const [primary, ...others] = b.series;
  const values = primary.values;
  const first = values[0];
  const last = values[values.length - 1];
  const role: Role = b.status ? statusRole(b.status) : "accent";
  const unit = b.unit ?? "";
  const change = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0;
  const arrow = last > first ? g.arrowUp : last < first ? (g.unicode ? "▼" : "v") : "=";
  const summary = `${style.fg("muted", `${formatValue(first, unit)} ${g.arrowRight} `)}${style.bold(style.fg(role, formatValue(last, unit)))}  ${style.fg(role, `${arrow} ${change >= 0 ? "+" : ""}${Math.round(change)}%`)}`;
  const lines: string[] = [];
  const label = (b.label ?? primary.name ?? "").toUpperCase();

  if (b.density === "compact") {
    const spark = sparkline(values, g, Math.min(values.length * 2, 24));
    lines.push(truncate(`${style.fg("muted", label)}  ${style.fg(role, spark)}  ${summary}`, width));
    return lines;
  }

  lines.push(label && !b.title ? `${style.bold(style.fg("muted", label))}   ${summary}` : summary);
  const height = ctx.depth === "glance" ? 5 : 7;
  const chartWidth = Math.min(width, 84);
  const range = Math.max(...values, b.threshold ?? -Infinity) - Math.min(...values, b.threshold ?? Infinity);
  const step = range / (height - 1);
  const format = (n: number) => formatValue(step >= 5 ? Math.round(n) : Number(n.toFixed(step >= 0.5 ? 1 : 2)), unit);
  const chart = lineChart(values, { height, width: chartWidth, role, threshold: b.threshold, format, xLabels: b.xLabels }, g, style);
  lines.push(...chart);

  const notes: string[] = [];
  if (b.annotation) {
    // point the annotation where the series departs from its baseline
    const labelWidth = visibleWidth(chart[0]?.split(g.chart.axis)[0] ?? "") + 1;
    const plotWidth = Math.max(4, chartWidth - labelWidth - 1);
    const sampled = resample(values, plotWidth);
    const at = changePoint(sampled);
    const x = Math.min(width - 2, labelWidth + at);
    const text = `${g.arrowUp} ${b.annotation}`;
    const start = Math.max(0, Math.min(x, width - visibleWidth(text)));
    notes.push(" ".repeat(start) + style.fg(role, text));
  }
  if (b.threshold !== undefined) notes.push(style.fg("warning", `${g.dotted}${g.dotted} threshold ${formatValue(b.threshold, unit)}`));
  lines.push(...notes);
  for (const s of others) {
    const spark = sparkline(s.values, g, Math.min(s.values.length * 2, 24));
    lines.push(truncate(`${style.fg("muted", fit((s.name ?? "").toUpperCase(), 12))} ${style.fg("muted", spark)}  ${style.fg("text", formatValue(s.values[s.values.length - 1], unit))}`, width));
  }
  return lines;
}

/** First index that departs from the opening baseline by more than 10% of the range. */
export function changePoint(values: number[]): number {
  if (values.length < 3) return 0;
  const head = values.slice(0, Math.max(1, Math.floor(values.length / 5)));
  const baseline = head.reduce((a, b) => a + b, 0) / head.length;
  const range = Math.max(...values) - Math.min(...values) || 1;
  const i = values.findIndex((v) => Math.abs(v - baseline) > range * 0.1);
  return i < 0 ? 0 : i;
}

// ─── distribution ────────────────────────────────────────────────────────────

const NEUTRAL_RAMP: Role[] = ["accent", "muted", "dim", "dim"];

function distribution(b: DistributionBlock, ctx: RenderContext): string[] {
  const { style, glyphs: g, width } = ctx;
  const total = b.items.reduce((a, i) => a + Math.max(0, i.value), 0);
  const roleOf = (i: number) => (b.items[i].status ? statusRole(b.items[i].status) : NEUTRAL_RAMP[Math.min(i, NEUTRAL_RAMP.length - 1)]);
  const unit = b.unit ?? "";

  if (b.whole) {
    const parts = b.items.map((item, i) => `${style.bold(style.fg(roleOf(i), formatNumber(item.value) + unit.trim()))} ${style.fg("muted", item.label.toUpperCase())}`);
    const lines: string[] = [];
    let row = "";
    for (const part of parts) {
      const next = row ? `${row}${" ".repeat(5)}${part}` : part;
      if (visibleWidth(next) > width && row) {
        lines.push(row);
        row = part;
      } else row = next;
    }
    if (row) lines.push(row);
    const share = total ? `${Math.round((b.items[0].value / total) * 100)}%` : "";
    const barWidth = Math.max(10, Math.min(96, width - visibleWidth(share) - 2));
    lines.push(`${stackedBar(b.items.map((item, i) => ({ value: item.value, role: roleOf(i) })), barWidth, g, style)}  ${style.bold(style.fg(roleOf(0), share))}`);
    return lines;
  }

  const sumIsPercent = unit === "%" || (Math.abs(total - 100) < 0.5 && !unit);
  const labelWidth = Math.min(Math.max(...b.items.map((i) => visibleWidth(i.label))) + 2, Math.floor(width * 0.35));
  const valueTexts = b.items.map((i) => (sumIsPercent ? `${formatNumber(i.value)}%` : formatValue(i.value, unit.trim()) + (total && !unit ? "" : "")));
  const pctTexts = b.items.map((i) => (sumIsPercent || !total ? "" : `${Math.round((i.value / total) * 100)}%`));
  const valueWidth = Math.max(...valueTexts.map(visibleWidth));
  const pctWidth = Math.max(0, ...pctTexts.map(visibleWidth));
  const barWidth = Math.max(6, width - labelWidth - valueWidth - (pctWidth ? pctWidth + 2 : 0) - 3);
  const max = Math.max(...b.items.map((i) => i.value), 0) || 1;
  const leader = b.items.findIndex((i) => i.value === max);
  return b.items.map((item, i) => {
    const role = item.status ? statusRole(item.status) : i === leader ? "accent" : "muted";
    const filled = bar(item.value / max, barWidth, g, style, role, "dim", false);
    const pct = pctWidth ? "  " + style.fg("dim", padStart(pctTexts[i], pctWidth)) : "";
    return `${style.fg(i === leader ? "strong" : "text", fit(item.label, labelWidth))}${filled} ${style.bold(style.fg(i === leader ? "strong" : "muted", padStart(valueTexts[i], valueWidth)))}${pct}`;
  });
}

// ─── risk ────────────────────────────────────────────────────────────────────

const LEVELS: Level[] = ["low", "medium", "high"];
const LEVEL_SHORT: Record<Level, string> = { low: "LOW", medium: "MED", high: "HIGH" };

function risk(b: RiskBlock, ctx: RenderContext): string[] {
  const { style, glyphs: g, width } = ctx;
  const cell = 7;
  const rowLabel = 17;
  const severityOf = (item: RiskBlock["items"][number]) => item.status ?? riskSeverity(item.impact, item.likelihood);
  const glyphOf = (s: Status) => (s === "critical" ? g.risk.critical : s === "warning" ? g.risk.warning : g.risk.neutral);
  const lines: string[] = [];
  lines.push(
    style.fg("dim", padStart(`impact ${g.arrowRight}  `, rowLabel)) +
      LEVELS.map((l) => style.fg("muted", center(LEVEL_SHORT[l], cell))).join(""),
  );
  const rows: { grid: string; legend: string[] }[] = [];
  for (const likelihood of [...LEVELS].reverse()) {
    const prefix = likelihood === "high" ? "likelihood" : "";
    const label = style.fg("dim", padEnd(prefix, 11)) + style.fg("muted", padStart(LEVEL_SHORT[likelihood], 4)) + "  ";
    const cells = LEVELS.map((impact) => {
      const items = b.items.filter((i) => i.impact === impact && i.likelihood === likelihood);
      if (!items.length) return style.fg("dim", center(g.risk.empty, cell));
      const worst = items.reduce((a, i) => (statusRank(severityOf(i)) > statusRank(severityOf(a)) ? i : a));
      const s = severityOf(worst);
      return style.fg(statusRole(s), center(glyphOf(s), cell));
    }).join("");
    const legend = b.items
      .filter((i) => i.likelihood === likelihood)
      .sort((a, c) => LEVELS.indexOf(c.impact) - LEVELS.indexOf(a.impact))
      .map((i) => {
        const s = severityOf(i);
        return `${style.fg(statusRole(s), glyphOf(s))} ${style.fg(s === "critical" ? "strong" : "text", i.label)}`;
      });
    rows.push({ grid: label + cells, legend });
  }
  const gridWidth = rowLabel + cell * 3;
  const inline = rows.every((r) => gridWidth + 2 + visibleWidth(r.legend.join("   ")) <= width);
  if (inline) {
    for (const r of rows) lines.push(`${r.grid}  ${r.legend.join("   ")}`.replace(/\s+$/, ""));
    return lines;
  }
  // not enough room beside the grid: list the risks underneath, worst first
  for (const r of rows) lines.push(r.grid.replace(/\s+$/, ""));
  lines.push("");
  for (const r of rows) for (const item of r.legend) lines.push(truncate(`  ${item}`, width));
  return lines;
}

// ─── hierarchy ───────────────────────────────────────────────────────────────

function hierarchy(b: HierarchyBlock, ctx: RenderContext): string[] {
  const { style, glyphs: g, width } = ctx;
  const lines: string[] = [];
  const label = (node: HierarchyNode, root = false) => {
    const glyph = node.status ? `${mark(ctx, node.status)} ` : "";
    const role: Role = node.status === "critical" ? "critical" : node.status === "good" ? "good" : root ? "strong" : "text";
    const textValue = root || node.children?.length ? style.bold(style.fg(role, node.label)) : style.fg(role, node.label);
    return `${glyph}${textValue}${node.note ? style.fg("muted", `  ${node.note}`) : ""}`;
  };
  if (b.root.label) lines.push(truncate(label(b.root, true), width));
  const walk = (node: HierarchyNode, prefix: string) => {
    (node.children ?? []).forEach((child, i, arr) => {
      const lastChild = i === arr.length - 1;
      lines.push(truncate(style.fg("dim", prefix + (lastChild ? g.tree.last : g.tree.branch)) + label(child), width));
      walk(child, prefix + (lastChild ? g.tree.space : g.tree.pipe));
    });
  };
  walk(b.root, "");
  return lines;
}

// ─── checklist ───────────────────────────────────────────────────────────────

const CHECK_ROLE: Record<string, Role> = {
  done: "good",
  failed: "critical",
  pending: "dim",
  skipped: "dim",
  warning: "warning",
  running: "info",
};

function checklist(b: ChecklistBlock, ctx: RenderContext): string[] {
  const { style, glyphs: g, width } = ctx;
  const items = b.items.map((item) => {
    const role = CHECK_ROLE[item.state];
    const labelRole: Role = item.state === "failed" ? "strong" : item.state === "pending" || item.state === "skipped" ? "muted" : "text";
    return { glyph: style.fg(role, g.check[item.state]), label: item.label, labelRole, note: item.note, role };
  });
  const render = (colWidth: number) => {
    const labelWidth = Math.min(Math.max(...items.map((i) => visibleWidth(i.label))) + 2, colWidth - 4);
    return items.map((i) => truncate(`${i.glyph} ${style.fg(i.labelRole, i.note ? fit(i.label, labelWidth) : i.label)}${i.note ? style.fg(i.role === "dim" ? "muted" : i.role, i.note) : ""}`, colWidth));
  };
  if (items.length > 6 && width >= 72) {
    const colWidth = Math.floor((width - 4) / 2);
    const rendered = render(colWidth);
    const half = Math.ceil(rendered.length / 2);
    return columns([rendered.slice(0, half), rendered.slice(half)], [colWidth, colWidth], 4);
  }
  return render(width);
}

// ─── evidence ────────────────────────────────────────────────────────────────

function evidence(b: EvidenceBlock, ctx: RenderContext): string[] {
  const { style, glyphs: g, width } = ctx;
  const lines: string[] = [];
  const conf = b.confidence;
  const dots = conf ? (g.unicode ? "●".repeat(LEVELS.indexOf(conf) + 1) + "○".repeat(2 - LEVELS.indexOf(conf)) : `${LEVELS.indexOf(conf) + 1}/3`) : "";
  const confRole: Role = conf === "high" ? "good" : conf === "medium" ? "warning" : "critical";
  const confText = conf ? `${style.fg(confRole, dots)} ${style.fg("muted", `${conf.toUpperCase()} CONFIDENCE`)}` : "";
  const claimWidth = width - (conf ? visibleWidth(confText) + 3 : 0);
  const claim = wrap(b.claim, Math.max(20, claimWidth));
  claim.forEach((line, i) => {
    const textValue = style.bold(style.fg("strong", line));
    lines.push(i === 0 && conf ? padEnd(textValue, claimWidth) + "   " + confText : textValue);
  });
  if (!b.items.length) return lines;
  const labelWidth = Math.min(Math.max(...b.items.map((i) => visibleWidth(i.label))) + 2, Math.floor(width * 0.5));
  for (const item of b.items) {
    const contra = item.supports === false;
    const prefix = contra ? style.fg("critical", g.status.critical) : style.fg("dim", " ");
    const connector = style.fg(contra ? "critical" : "dim", `${g.h}${g.h}${g.arrowRight}`);
    const value = item.value ? ` ${style.bold(style.fg(contra ? "critical" : "text", item.value))}` : "";
    const src = item.source ? style.fg("dim", `  ${item.source}`) : "";
    lines.push(truncate(`  ${prefix}${style.fg("muted", fit(item.label, labelWidth))}${item.value ? connector : ""}${value}${src}`, width));
  }
  return lines;
}

// ─── change ──────────────────────────────────────────────────────────────────

const RISK_ROLE: Record<Level, Role> = { high: "critical", medium: "warning", low: "muted" };

function change(b: ChangeBlock, ctx: RenderContext): string[] {
  const { style, glyphs: g, width } = ctx;
  const statWidth = 14;
  const riskWidth = 5;
  const addW = Math.max(...b.files.map((f) => `+${f.added ?? 0}`.length));
  const remW = Math.max(...b.files.map((f) => `-${f.removed ?? 0}`.length));
  const pathWidth = Math.min(Math.max(...b.files.map((f) => visibleWidth(f.path))) + 2, Math.max(12, width - addW - remW - statWidth - riskWidth - 16));
  const churn = (f: (typeof b.files)[number]) => (f.added ?? 0) + (f.removed ?? 0);
  const maxChurn = Math.max(...b.files.map(churn), 1);
  const riskScore = (f: (typeof b.files)[number]) => (f.risk ? LEVELS.indexOf(f.risk) : -1) * 1e6 + churn(f);
  const centre = b.files.reduce((a, f) => (riskScore(f) > riskScore(a) ? f : a));
  return b.files.map((f) => {
    const cells = Math.max(1, Math.round((churn(f) / maxChurn) * statWidth));
    const addCells = churn(f) ? Math.round(((f.added ?? 0) / churn(f)) * cells) : 0;
    const stat = style.fg("good", g.barFull.repeat(addCells)) + style.fg("critical", (g.unicode ? "▒" : "-").repeat(cells - addCells));
    const riskText = f.risk ? style.fg(RISK_ROLE[f.risk], padEnd(f.risk === "medium" ? "MED" : f.risk.toUpperCase(), riskWidth)) : " ".repeat(riskWidth);
    const isCentre = f === centre && f.risk === "high";
    const tail = isCentre ? style.fg("critical", ` ${g.arrowLeft} risk centre`) : f.note ? style.fg("muted", ` ${f.note}`) : "";
    const path = isCentre ? style.bold(style.fg("strong", fit(f.path, pathWidth))) : style.fg("text", fit(f.path, pathWidth));
    return truncate(
      `${path}${style.fg("good", padStart(`+${f.added ?? 0}`, addW))} ${style.fg("critical", padStart(`-${f.removed ?? 0}`, remW))}  ${padEnd(stat, statWidth)}  ${riskText}${tail}`.replace(/\s+$/, ""),
      width,
    );
  });
}

// ─── progress ────────────────────────────────────────────────────────────────

function progress(b: ProgressBlock, ctx: RenderContext): string[] {
  const { style, glyphs: g, width } = ctx;
  const labelWidth = Math.max(...b.items.map((i) => visibleWidth(i.label))) + 3;
  const barWidth = Math.max(8, Math.min(32, width - labelWidth - 16));
  const lines = b.items.map((item) => {
    const done = item.state === "done";
    const frac = done ? 1 : item.total ? (item.value ?? 0) / item.total : item.value !== undefined && item.value <= 1 ? item.value : 0;
    const role: Role = item.state === "failed" ? "critical" : done ? "good" : "accent";
    const right = done
      ? style.fg("good", "complete")
      : item.total
        ? `${style.bold(style.fg("strong", padStart(formatNumber(item.value ?? 0), 4)))} ${style.fg("muted", `/ ${formatNumber(item.total)}`)}`
        : style.fg("muted", item.state ?? "");
    return `${style.fg("text", fit(item.label, labelWidth))}${bar(frac, barWidth, g, style, role)}  ${right}`;
  });
  if (b.signal) {
    const role = b.signal.status ? statusRole(b.signal.status) : "accent";
    lines.push("");
    lines.push(style.fg("muted", "current signal"));
    const label = style.bold(style.fg("strong", b.signal.label));
    const value = b.signal.value ? style.bold(style.fg(role, b.signal.value.toUpperCase())) : "";
    const run = Math.max(3, Math.min(16, width - visibleWidth(b.signal.label) - visibleWidth(b.signal.value ?? "") - 6));
    lines.push(truncate(`${label}  ${style.fg(role, g.h.repeat(run) + g.arrowRight)}  ${value}`, width));
  }
  return lines;
}

// ─── text ────────────────────────────────────────────────────────────────────

export const TEXT_GLANCE_CHARS = 240;

function text(b: TextBlock, ctx: RenderContext): string[] {
  const { style, glyphs: g, width } = ctx;
  let content = b.text.trim();
  const limit = ctx.depth === "explore" ? Infinity : TEXT_GLANCE_CHARS;
  let truncated = false;
  if (content.length > limit) {
    content = content.slice(0, limit).replace(/\s+\S*$/, "") + g.ellipsis;
    truncated = true;
  }
  let lines = renderMarkdown(content, ctx);
  if (ctx.depth === "glance" && lines.length > 3) {
    lines = lines.slice(0, 3);
    lines[2] = truncate(lines[2], width - 1) + (lines[2].endsWith(g.ellipsis) ? "" : g.ellipsis);
    truncated = true;
  }
  if (truncated) lines.push(style.fg("dim", `${g.arrowRight} more on explore`));
  return lines;
}

function unknown(b: UnknownBlock, ctx: RenderContext): string[] {
  const { style, width } = ctx;
  return [
    style.fg("dim", `[ unsupported visualization: ${b.originalType} ]`),
    ...b.fallback.flatMap((line) => wrap(line, width)).map((l) => style.fg("muted", l)),
  ];
}
