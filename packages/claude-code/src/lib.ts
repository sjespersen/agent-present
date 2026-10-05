/**
 * Everything the Claude Code mod needs from Agent Present, bundled into one
 * dependency-free ES module (`hooks/present.js`) that a hooks module can import.
 *
 * Hooks modules run without Node or a DOM, and draw with elements rather than
 * ANSI strings, so the terminal renderer is driven with a style that encodes
 * semantic roles as private SGR codes, and `toSegments` turns each line back
 * into styled runs the mod draws as nested `Text` elements.
 */
import {
  formatIssues,
  normalize,
  outline,
  presentToolSchema,
  validate,
  type Action,
  type NormalizedDocument,
} from "@agent-present/core";
import { layoutDocument, renderPlainText, stripAnsi, type Depth, type Role, type Style } from "@agent-present/terminal";
import { DEMOS } from "../../pi/src/demos.js";
import { ALWAYS_GUIDELINE, PROMPT_GUIDELINES, TOOL_DESCRIPTION, TRANSFORM_SYSTEM_PROMPT } from "../../pi/src/instructions.js";
import { extractJson } from "../../pi/src/transform.js";

export { DEMOS, normalize, outline, presentToolSchema, renderPlainText, validate };
export type { Action, Depth, NormalizedDocument, Role };

export const TOOL = "present";

// ─── model-facing text ─────────────────────────────────────────────────────

export const DESCRIPTION = TOOL_DESCRIPTION;

export function guidelines(mode: "auto" | "always"): string {
  const lines = [
    "# Agent Present",
    "",
    `The \`${TOOL}\` tool of the agent-present plugin renders a Present document as a native infographic in the user's terminal.`,
    "",
    ...PROMPT_GUIDELINES.map((g) => `- ${g}`),
  ];
  if (mode === "always") lines.push(`- ${ALWAYS_GUIDELINE}`);
  return lines.join("\n");
}

// ─── the present tool ─────────────────────────────────────────────────────

export type Checked =
  | { ok: true; raw: Record<string, unknown>; doc: NormalizedDocument; warnings: string[]; isProgress: boolean }
  | { ok: false; error: string };

/** Validates and normalizes a tool call's input. Lenient: only an empty document fails. */
export function check(input: unknown): Checked {
  const raw = { present: "0.1", ...withoutReserved(input) };
  let doc: NormalizedDocument;
  try {
    doc = normalize(raw);
  } catch (error) {
    return { ok: false, error: `Could not read the document: ${(error as Error).message}` };
  }
  const result = validate(raw);
  if (!doc.blocks.length && !doc.takeaway) {
    return { ok: false, error: `Nothing to present: give a takeaway or at least one block.\n${formatIssues(result.errors)}`.trim() };
  }
  const warnings = [...result.errors, ...result.warnings].map((i) => `${i.path || "(root)"}: ${i.message}`);
  return { ok: true, raw, doc, warnings, isProgress: doc.intent === "progress" };
}

/** What the model reads back after a successful call. */
export function resultText(checked: Extract<Checked, { ok: true }>): string {
  const text = checked.isProgress
    ? "Progress shown to the user. Keep working, then finish with a final present call."
    : `Presented to the user as a visual infographic. Do not repeat it in prose; end your turn or add at most one short sentence.\n\n${outline(checked.doc)}`;
  return checked.warnings.length ? `${text}\n\nRenderer notes:\n${checked.warnings.join("\n")}` : text;
}

/** Strips the keys the host adds to a tool call's input. */
export function withoutReserved(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const { tool: _t, tool_use_id: _id, agentId: _a, consent: _c, ...rest } = input as Record<string, unknown>;
  return rest;
}

// ─── drawing ──────────────────────────────────────────────────────────────

const ROLES: Role[] = ["text", "strong", "muted", "dim", "accent", "good", "warning", "critical", "info", "neutral"];
const ROLE_BASE = 200; // private 256-colour indices: 38;5;200 … 38;5;209

/** A style whose colours are role markers rather than real colours. */
export const markerStyle: Style = {
  color: true,
  fg: (role, text) => (text ? `\x1b[38;5;${ROLE_BASE + ROLES.indexOf(role)}m${text}\x1b[39m` : text),
  bold: (text) => (text ? `\x1b[1m${text}\x1b[22m` : text),
  italic: (text) => (text ? `\x1b[3m${text}\x1b[23m` : text),
};

export interface Segment {
  text: string;
  role?: Role;
  bold?: boolean;
  italic?: boolean;
}

/** Splits one rendered line into styled runs. Unknown escape codes are dropped. */
export function toSegments(line: string): Segment[] {
  const out: Segment[] = [];
  const roles: Role[] = [];
  let bold = 0;
  let italic = 0;
  const push = (text: string) => {
    if (!text) return;
    const seg: Segment = { text };
    const role = roles[roles.length - 1];
    if (role && role !== "text") seg.role = role;
    if (bold > 0) seg.bold = true;
    if (italic > 0) seg.italic = true;
    const prev = out[out.length - 1];
    if (prev && prev.role === seg.role && prev.bold === seg.bold && prev.italic === seg.italic) prev.text += text;
    else out.push(seg);
  };
  const re = /\x1b\[([0-9;]*)m/g;
  let at = 0;
  for (let m = re.exec(line); m; m = re.exec(line)) {
    push(stripAnsi(line.slice(at, m.index)));
    at = m.index + m[0].length;
    const code = m[1];
    if (code === "1") bold++;
    else if (code === "22") bold = Math.max(0, bold - 1);
    else if (code === "3") italic++;
    else if (code === "23") italic = Math.max(0, italic - 1);
    else if (code === "39") roles.pop();
    else if (code.startsWith("38;5;")) {
      const role = ROLES[Number(code.slice(5)) - ROLE_BASE];
      roles.push(role ?? "text");
    }
  }
  push(stripAnsi(line.slice(at)));
  return out;
}

export interface DrawOptions {
  width: number;
  depth?: Depth;
  hints?: string[];
  margin?: number;
  header?: boolean;
  actions?: boolean;
}

/** Lays a document out at `width` and returns each line as styled runs. */
export function draw(input: unknown, options: DrawOptions): Segment[][] {
  const { lines } = layoutDocument(input, {
    width: options.width,
    depth: options.depth ?? "glance",
    style: markerStyle,
    hints: options.hints,
    margin: options.margin ?? 1,
    header: options.header,
    actions: options.actions,
  });
  return lines.map(toSegments);
}

/** The raw document as dim JSON lines, for the explorer's raw view. */
export function rawLines(raw: unknown): string[] {
  return JSON.stringify(raw, null, 2).split("\n");
}

// ─── compatibility mode: /present last ────────────────────────────────────

export const TRANSFORM_SYSTEM = TRANSFORM_SYSTEM_PROMPT;

export function transformPrompt(answer: string): string {
  return `Convert this agent answer into a Present document:\n\n<answer>\n${answer}\n</answer>`;
}

export function repairPrompt(answer: string, raw: unknown, errors: string): string {
  return `${transformPrompt(answer)}\n\nYour previous document had schema errors:\n${errors}\n\nPrevious document:\n${JSON.stringify(raw)}\n\nReply with the corrected JSON object only.`;
}

/** Parses a model reply into a document; throws when there is no JSON object in it. */
export function parseReply(reply: string): Record<string, unknown> {
  const raw = extractJson(reply);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("model reply was not a JSON object");
  return { present: "0.1", ...(raw as Record<string, unknown>) };
}

export function schemaErrors(raw: unknown): string | undefined {
  const result = validate(raw);
  return result.valid ? undefined : formatIssues(result.errors);
}
