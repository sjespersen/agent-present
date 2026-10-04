import { deriveSpeech, normalize, type NormalizedBlock, type NormalizedDocument } from "@agent-present/core";
import { renderBlock, verdictLines } from "./blocks.js";
import { bar, bigText, splitForBig } from "./charts.js";
import { mark, sectionTitle, type Depth, type RenderContext } from "./context.js";
import { ASCII, UNICODE } from "./glyphs.js";
import { renderMarkdown } from "./markdown.js";
import { ansiStyle, statusRole, type Style } from "./style.js";
import { columns, truncate, visibleWidth, wrap } from "./text.js";

export interface RenderOptions {
  /** Total columns available. */
  width: number;
  style?: Style;
  /** false = pure ASCII output. Default true. */
  unicode?: boolean;
  /** glance (default) → scan → explore */
  depth?: Depth;
  /** Host key hints for the footer, e.g. ["ctrl+o scan", "alt+e explore"]. */
  hints?: string[];
  /** Columns of left/right margin. Default 1. */
  margin?: number;
  /** Line budget for the glance depth. Default 44. */
  glanceLines?: number;
  /** Render the header rule. Default true. */
  header?: boolean;
  /** Render the actions row. Default true. */
  actions?: boolean;
}

export interface Layout {
  lines: string[];
  /** Blocks not shown at this depth. */
  hidden: NormalizedBlock[];
  doc: NormalizedDocument;
}

const GLANCE_MAX_BLOCKS = 5;
const PAIRABLE = new Set(["risk", "checklist", "hierarchy", "evidence", "verdict", "metric", "flow", "architecture", "timeline"]);

function isNormalized(input: unknown): input is NormalizedDocument {
  return (
    typeof input === "object" &&
    input !== null &&
    Array.isArray((input as NormalizedDocument).blocks) &&
    Array.isArray((input as NormalizedDocument).actions) &&
    (input as NormalizedDocument).blocks.every((b) => typeof b.id === "string" && typeof b.priority === "string")
  );
}

/** Renders a Present document to terminal lines. Every line fits `width`. */
export function renderDocument(input: unknown, options: RenderOptions): string[] {
  return layoutDocument(input, options).lines;
}

export function layoutDocument(input: unknown, options: RenderOptions): Layout {
  const doc = isNormalized(input) ? input : normalize(input);
  const margin = options.margin ?? 1;
  const width = Math.max(20, options.width);
  const inner = width - margin * 2;
  const ctx: RenderContext = {
    width: inner,
    style: options.style ?? ansiStyle(),
    glyphs: options.unicode === false ? ASCII : UNICODE,
    depth: options.depth ?? "glance",
  };
  const { style, glyphs: g } = ctx;
  const out: string[] = [];

  if (options.header !== false && (doc.title || doc.subtitle || doc.intent)) out.push(header(doc, ctx), "");

  if (doc.takeaway) {
    out.push(...hero(doc, ctx), "");
  }

  const { shown, hidden } = plan(doc, ctx, options.glanceLines ?? 44);
  out.push(...renderBlocks(shown, ctx));

  if (ctx.depth === "explore") out.push(...exploreExtras(doc, ctx));

  if (hidden.length && ctx.depth !== "explore") {
    if (out[out.length - 1] !== "") out.push("");
    const names = hidden.map((b) => (b.title ?? (b.type === "verdict" ? b.text : b.type)).toLowerCase());
    const more = `+ ${hidden.length} more ${g.dot} ${names.join(` ${g.dot} `)}`;
    out.push(style.fg("dim", truncate(more, inner, g.ellipsis)));
  }

  if (options.actions !== false && doc.actions.length) {
    if (out[out.length - 1] !== "") out.push("");
    out.push(...actionsRow(doc, ctx));
  }

  if (options.hints?.length) {
    if (out[out.length - 1] !== "") out.push("");
    out.push(style.fg("dim", truncate(options.hints.join(`  ${g.dot}  `), inner, g.ellipsis)));
  }

  while (out.length && out[out.length - 1] === "") out.pop();
  const pad = " ".repeat(margin);
  const lines = out.map((line) => {
    const fitted = visibleWidth(line) > inner ? truncate(line, inner, g.ellipsis) : line;
    return fitted ? pad + fitted : fitted;
  });
  return { lines, hidden, doc };
}

function header(doc: NormalizedDocument, ctx: RenderContext): string {
  const { style, glyphs: g, width } = ctx;
  const title = (doc.title ?? "").toUpperCase();
  const left = `${style.bold(style.fg("strong", title))}${doc.subtitle ? `  ${style.fg("muted", doc.subtitle)}` : ""}`;
  const right = doc.intent ? style.fg("dim", doc.intent.toUpperCase()) : "";
  const leftWidth = visibleWidth(left);
  const rightWidth = visibleWidth(right);
  const rule = width - leftWidth - rightWidth - (left ? 2 : 0) - (right ? 2 : 0);
  if (rule < 3) return truncate(left, width);
  return `${left}${left ? " " : ""}${style.fg("dim", g.heavy.repeat(rule))}${right ? ` ${right}` : ""}`;
}

function hero(doc: NormalizedDocument, ctx: RenderContext): string[] {
  const { style, glyphs: g, width } = ctx;
  const t = doc.takeaway!;
  const role = t.status ? statusRole(t.status) : "accent";

  if (t.value !== undefined && t.value !== "") {
    const { big, small } = splitForBig(t.value, t.unit);
    const glyphRows = g.unicode && big ? bigText(big) : undefined;
    if (glyphRows) {
      const numWidth = visibleWidth(glyphRows[0]);
      const unitText = small ? ` ${small}` : "";
      const leftWidth = numWidth + visibleWidth(unitText) + 4;
      const rightWidth = width - leftWidth;
      if (rightWidth >= 24) {
        const left = glyphRows.map((row, i) => style.bold(style.fg(role, row)) + (i === 2 && unitText ? style.fg(role, unitText) : ""));
        const glyph = t.status && t.status !== "neutral" && t.status !== "info" ? `${mark(ctx, t.status)} ` : "";
        const right: string[] = [];
        right.push(glyph + style.bold(style.fg(role, truncate(t.text.length <= 42 ? t.text.toUpperCase() : t.text, rightWidth - 2))));
        right.push(t.detail ? style.fg("muted", truncate(t.detail, rightWidth)) : "");
        const numeric = typeof t.value === "number" ? t.value : Number.NaN;
        if (t.unit === "%" && Number.isFinite(numeric)) {
          right.push(bar(numeric / 100, Math.min(44, rightWidth), g, style, role, "dim"));
        } else right.push("");
        return columns([left, right], [leftWidth, rightWidth], 0);
      }
    }
    // compact hero: value inline with the verdict
    const value = `${typeof t.value === "number" ? t.value : t.value}${t.unit === "%" ? "%" : t.unit ? ` ${t.unit}` : ""}`;
    return verdictLines(ctx, `${value}  ${t.text}`, t.status, { detail: t.detail });
  }
  return verdictLines(ctx, t.text, t.status, { detail: t.detail });
}

function plan(doc: NormalizedDocument, ctx: RenderContext, glanceLines: number): { shown: NormalizedBlock[]; hidden: NormalizedBlock[] } {
  const blocks = doc.blocks;
  if (ctx.depth === "explore") return { shown: blocks, hidden: [] };
  if (ctx.depth === "scan") {
    return { shown: blocks.filter((b) => b.priority !== "detail"), hidden: blocks.filter((b) => b.priority === "detail") };
  }
  const primary = blocks.filter((b) => b.priority === "primary");
  const candidates = (primary.length ? primary : blocks.filter((b) => b.priority !== "detail").slice(0, 3)).slice(0, GLANCE_MAX_BLOCKS);
  const shown: NormalizedBlock[] = [];
  let used = 0;
  for (const block of candidates) {
    const height = renderBlock(block, ctx).length + 1;
    if (shown.length && used + height > glanceLines) continue;
    shown.push(block);
    used += height;
  }
  return { shown, hidden: blocks.filter((b) => !shown.includes(b)) };
}

function renderBlocks(blocks: NormalizedBlock[], ctx: RenderContext): string[] {
  const out: string[] = [];
  const wide = ctx.width >= 120;
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const next = blocks[i + 1];
    if (out.length) out.push("");
    if (wide && next && PAIRABLE.has(block.type) && PAIRABLE.has(next.type)) {
      const gap = 6;
      const colWidth = Math.floor((ctx.width - gap) / 2);
      const half = { ...ctx, width: colWidth };
      const a = renderBlock(block, half);
      const b = renderBlock(next, half);
      out.push(...columns([a, b], [colWidth, colWidth], gap));
      i++;
      continue;
    }
    out.push(...renderBlock(block, ctx));
  }
  return out;
}

function exploreExtras(doc: NormalizedDocument, ctx: RenderContext): string[] {
  const { style, glyphs: g, width } = ctx;
  const out: string[] = [];
  const section = (title: string) => {
    out.push("", sectionTitle(ctx, title), style.fg("dim", g.h.repeat(Math.min(width, 46))));
  };
  if (doc.detail?.markdown || doc.detail?.sections?.length) {
    section("Detail");
    if (doc.detail.markdown) out.push(...renderMarkdown(doc.detail.markdown, ctx));
    for (const s of doc.detail.sections ?? []) {
      out.push("", style.bold(s.title), ...renderMarkdown(s.markdown, ctx));
    }
  }
  if (doc.evidence?.length) {
    section("Evidence");
    const labelWidth = Math.min(Math.max(...doc.evidence.map((e) => visibleWidth(e.label))) + 2, Math.floor(width / 2));
    for (const e of doc.evidence) {
      const glyph = e.supports === false ? style.fg("critical", g.status.critical) : style.fg("good", g.status.good);
      const value = e.value ? `${style.fg("dim", `${g.h}${g.arrowRight}`)} ${style.fg("text", e.value)}` : "";
      out.push(truncate(`${glyph} ${style.fg("muted", e.label.padEnd(labelWidth))}${value}`, width));
    }
  }
  if (doc.sources?.length) {
    section("Sources");
    for (const s of doc.sources) {
      out.push(truncate(`${style.fg("dim", g.arrowRight)} ${style.fg("text", s.label)}${s.ref ? `  ${style.fg("accent", s.ref)}` : ""}${s.location ? style.fg("dim", `:${s.location}`) : ""}`, width));
    }
  }
  const speech = deriveSpeech(doc);
  if (speech) {
    section("Spoken summary");
    out.push(...wrap(`“${speech}”`, width).map((l) => style.italic(style.fg("muted", l))));
  }
  return out;
}

function actionsRow(doc: NormalizedDocument, ctx: RenderContext): string[] {
  const { style, width } = ctx;
  const chips = doc.actions.map((a, i) => `${style.fg("dim", `[${i + 1}]`)} ${style.fg("accent", a.label.toLowerCase())}`);
  const lines: string[] = [];
  let row = "";
  for (const chip of chips) {
    const next = row ? `${row}    ${chip}` : chip;
    if (visibleWidth(next) > width && row) {
      lines.push(row);
      row = chip;
    } else row = next;
  }
  if (row) lines.push(row);
  return lines;
}

/** Plain text rendering — what "copy" puts on the clipboard. */
export function renderPlainText(input: unknown, options: Partial<RenderOptions> = {}): string {
  return renderDocument(input, {
    width: options.width ?? 100,
    depth: options.depth ?? "explore",
    unicode: options.unicode ?? true,
    style: { color: false, fg: (_r, t) => t, bold: (t) => t, italic: (t) => t },
    margin: 0,
    ...options,
  })
    .map((l) => l.replace(/\s+$/, ""))
    .join("\n");
}
