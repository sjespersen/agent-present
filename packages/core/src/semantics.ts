import type { NormalizedBlock, NormalizedDocument } from "./normalize.js";
import type { Level, Status } from "./types.js";

const STATUS_RANK: Record<Status, number> = { critical: 4, warning: 3, info: 2, neutral: 1, good: 0 };

/** Higher = more severe. Useful for picking the dominant status. */
export function statusRank(status: Status | undefined): number {
  return status ? STATUS_RANK[status] : 1;
}

export function worstStatus(statuses: (Status | undefined)[]): Status | undefined {
  let worst: Status | undefined;
  for (const s of statuses) if (s && (!worst || statusRank(s) > statusRank(worst))) worst = s;
  return worst;
}

const LEVEL_SCORE: Record<Level, number> = { low: 1, medium: 2, high: 3 };

/** Impact × likelihood, 1..9. */
export function riskScore(impact: Level, likelihood: Level): number {
  return LEVEL_SCORE[impact] * LEVEL_SCORE[likelihood];
}

export function riskSeverity(impact: Level, likelihood: Level): Status {
  const score = riskScore(impact, likelihood);
  return score >= 9 ? "critical" : score >= 6 ? "warning" : "neutral";
}

/**
 * Derives a spoken briefing. Rule: speak the conclusion, show the structure.
 * Voice should never read the diagram out loud.
 */
export function deriveSpeech(doc: NormalizedDocument): string {
  if (doc.speech?.summary) return doc.speech.summary;
  const parts: string[] = [];
  if (doc.takeaway) {
    parts.push(sentence(doc.takeaway.text));
    if (doc.takeaway.detail) parts.push(sentence(doc.takeaway.detail));
  }
  const verdict = doc.blocks.find((b) => b.type === "verdict");
  if (verdict && verdict.type === "verdict") {
    if (!doc.takeaway) parts.push(sentence(verdict.text));
    if (verdict.next) parts.push(sentence(verdict.next));
  }
  if (!parts.length && doc.title) parts.push(sentence(doc.title));
  const agentActions = doc.actions.filter((a) => a.intent === "agent").map((a) => a.label.toLowerCase());
  if (agentActions.length) parts.push(`I can ${joinOr(agentActions)}.`);
  return parts.join(" ");
}

function sentence(text: string): string {
  const t = text.trim();
  if (!t) return t;
  const cased = t === t.toUpperCase() && /[A-Z]/.test(t) ? t.charAt(0) + t.slice(1).toLowerCase() : t;
  return /[.!?]$/.test(cased) ? cased : `${cased}.`;
}

function joinOr(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} or ${items[items.length - 1]}`;
}

/** One-line description of a block, for model context and accessibility. */
export function describeBlock(block: NormalizedBlock): string {
  const title = block.title ? `${block.title}: ` : "";
  switch (block.type) {
    case "verdict":
      return `${title}verdict "${block.text}"${block.detail ? ` (${block.detail})` : ""}${block.next ? `; next: ${block.next}` : ""}`;
    case "metric":
      return `${title}${block.label} = ${block.value}${block.unit ?? ""}${block.max !== undefined ? ` / ${block.max}` : ""}`;
    case "metrics":
      return `${title}${block.items.map((i) => `${i.label} ${i.value}${i.unit ?? ""}`).join(", ")}`;
    case "comparison": {
      const winner = block.options.find((o) => o.id === block.winner);
      return `${title}comparison of ${block.options.map((o) => o.label).join(" vs ")} on ${block.dimensions.length} dimensions${winner ? `; pick ${winner.label}` : ""}`;
    }
    case "flow":
    case "architecture": {
      const label = new Map(block.nodes.map((n) => [n.id, n.label]));
      const edges = (block.edges ?? []).map((e) => `${label.get(e.from)}→${label.get(e.to)}${e.status === "critical" ? "(broken)" : ""}`);
      return `${title}${block.type} ${edges.length ? edges.join(", ") : block.nodes.map((n) => n.label).join(", ")}`;
    }
    case "timeline":
      return `${title}timeline ${block.events.map((e) => `${e.at} ${e.label}`).join(" → ")}`;
    case "trend": {
      const values = block.series[0]?.values ?? [];
      return `${title}trend ${block.label ?? ""} from ${values[0]} to ${values[values.length - 1]}${block.unit ?? ""}`;
    }
    case "distribution":
      return `${title}${block.items.map((i) => `${i.label} ${i.value}${block.unit ?? ""}`).join(", ")}`;
    case "risk":
      return `${title}risks ${block.items.map((i) => `${i.label} (impact ${i.impact}, likelihood ${i.likelihood})`).join(", ")}`;
    case "hierarchy":
      return `${title}tree rooted at ${block.root.label}`;
    case "checklist":
      return `${title}${block.items.map((i) => `${i.state === "done" ? "✓" : i.state === "failed" ? "✕" : "○"} ${i.label}`).join(", ")}`;
    case "evidence":
      return `${title}claim "${block.claim}" (${block.confidence ?? "unrated"} confidence, ${block.items.length} observations)`;
    case "change":
      return `${title}${block.files.length} files changed`;
    case "progress":
      return `${title}progress ${block.items.map((i) => `${i.label} ${i.value ?? ""}${i.total ? `/${i.total}` : ""}`).join(", ")}`;
    case "text":
      return `${title}${block.text.slice(0, 120)}`;
    case "unknown":
      return `${title}unsupported ${block.originalType}`;
  }
}

/**
 * A compact textual outline of what was presented. Hosts return this to the
 * model so it knows what the user saw, without re-reading the whole IR.
 */
export function outline(doc: NormalizedDocument): string {
  const lines: string[] = [];
  if (doc.title) lines.push(`Title: ${doc.title}${doc.subtitle ? ` (${doc.subtitle})` : ""}`);
  if (doc.takeaway) lines.push(`Takeaway [${doc.takeaway.status ?? "neutral"}]: ${doc.takeaway.text}${doc.takeaway.detail ? ` — ${doc.takeaway.detail}` : ""}`);
  for (const block of doc.blocks) lines.push(`- ${describeBlock(block)}`);
  if (doc.actions.length) lines.push(`Actions: ${doc.actions.map((a) => a.label).join(", ")}`);
  return lines.join("\n");
}

const GRAPHIC = /[─-▟■-◿←-⇿✓✕✗•·…]/g;

export interface ProseStats {
  /** Words that are part of sentences (≥ 4 consecutive words on a line). */
  proseWords: number;
  /** All alphabetic words. */
  words: number;
  /** Lines containing sentence-like prose. */
  proseLines: number;
  /** Characters of sentence-like prose. */
  proseChars: number;
}

/**
 * Measures how much *reading* a rendered presentation demands. A line counts as
 * prose when it contains a run of four or more words — labels, numbers and
 * graphics do not count. This turns "Don't make me read" into a testable number.
 */
export function proseStats(text: string): ProseStats {
  let proseWords = 0;
  let words = 0;
  let proseLines = 0;
  let proseChars = 0;
  for (const rawLine of text.split("\n")) {
    const line = rawLine.replace(/\x1b\[[0-9;]*m/g, "").replace(GRAPHIC, " ");
    const runs = line.split(/\s{2,}|[│|]/).map((r) => r.trim()).filter(Boolean);
    let lineHasProse = false;
    for (const run of runs) {
      const w = run.split(/\s+/).filter((t) => /[a-zA-Z]{2,}/.test(t));
      words += w.length;
      if (w.length >= 4) {
        proseWords += w.length;
        proseChars += run.length;
        lineHasProse = true;
      }
    }
    if (lineHasProse) proseLines++;
  }
  return { proseWords, words, proseLines, proseChars };
}
