/**
 * Model-facing instructions. These are the "presentation grammar" an agent
 * learns: when to present, what each primitive means, and — just as important —
 * when *not* to write prose.
 */

export const TOOL_NAME = "present";

export const TOOL_DESCRIPTION = `Present a result to the user as a native visual presentation (Present IR) instead of prose. The presentation IS your answer: it is rendered in the user's terminal as an infographic. Do not repeat its content in text afterwards.

Describe MEANING, not layout — the renderer decides widths, colours and borders.

Document: { title, subtitle?, intent, takeaway, blocks, actions?, detail?, evidence?, sources? }
- takeaway {text, status, detail?, value?, unit?}: the single dominant message — what happened, is it good or bad, what to do. text: 2-6 words ("Don't ship yet"). detail: one short line (≤ 80 chars). value = optional headline number (rendered oversized).
- status everywhere: good | warning | critical | info | neutral. Put a status on anything that is good or bad.
- intent: decision | assessment | explanation | comparison | diagnosis | plan | status | progress | research | summary.

blocks — most important first; at most 5 are visible at a glance. Mark the rest priority "secondary" (shown on scan) or "detail" (shown on explore).
- verdict {text, status, detail?, next?, command?} — a conclusion, diagnosis or recommendation. text ≤ 8 words; detail and next one short line each.
- metric {label, value, unit?, max?, target?, trend?: number[], delta?, status?, caption?} — one number made meaningful.
- metrics {items: [{label, value, unit?, status?, delta?}]} — 2-6 related numbers.
- comparison {options: [{id, label, summary?}], dimensions: [{label, values: [one per option, numbers preferred], unit?, better?: "higher"|"lower"}], winner?, rationale?} — trade-offs. Labels 1-3 words; summary ≤ 4 words ("big models").
- flow {nodes: [{id, label, status?, note?, kind?}], edges?: [{from, to, label?, status?}]} — process, pipeline or causal chain. Edge status "critical" draws a broken link. Omit edges to connect nodes in order.
- architecture {nodes, edges, boundaries?: [{label, note, status?}], boundaryTitle?} — systems and dependencies. kind "actor"/"outcome" renders unboxed (e.g. browser, user).
- timeline {events: [{at, label, status?, note?}]} — chronology.
- trend {label, series: [{values: number[]}], xLabels?, unit?, threshold?, annotation?, status?} — change over time.
- distribution {items: [{label, value, status?}], unit?, whole?} — quantities; whole: true when they are parts of one total (e.g. pass/fail/flaky).
- risk {items: [{label, impact, likelihood}]} — low | medium | high each.
- hierarchy {root: {label, note?, status?, children: [...]}} — a tree.
- checklist {items: [{label, state: done|failed|pending|skipped|warning|running, note?}]}.
- evidence {claim, confidence?, items: [{label, value?, supports?}]} — a claim and what supports it.
- change {files: [{path, added?, removed?, risk?}]} — code change impact.
- progress {items: [{label, value?, total?, state?}], signal?: {label, value?, status?}} — work in progress; use with intent "progress" (does not end your turn).
- text {text} — at most ~240 characters. Long explanations belong in detail.markdown.
Every block may also have: id, title (short section label, e.g. "Risk map"), priority, detail (Markdown shown on explore), sources.
Labels are labels, not sentences. Anything longer than a line belongs in detail.

- actions: [{id, label, intent: "agent", prompt}] — next steps the user can trigger with one key, or {intent: "expand", target: blockId}.
- detail: {markdown} — the long-form explanation, hidden until the user explores.
- evidence: [{label, value}] and sources: [{label, ref, location?}] — supporting material for explore.`;

export const PROMPT_SNIPPET =
  "Present structured results visually (verdicts, metrics, comparisons, flows, risks, trends) instead of long prose";

export const PROMPT_GUIDELINES = [
  "Use the present tool when your answer has structure — comparisons, analysis, plans, architecture, repository reviews, debugging findings, test results, research synthesis, status, decisions, performance, categorised lists or numbers. Show the structure instead of describing it: if five sentences describe relationships, present a flow with five nodes.",
  "A present call is the answer. Never repeat or summarise its content in prose afterwards; the user already sees it. Detailed explanation belongs in present's detail.markdown, behind progressive disclosure.",
  "For trivial questions (a single command, a one-line fact, yes/no) answer in plain text — do not call present.",
  "When calling present, lead with one dominant takeaway, use visual primitives for supporting facts, keep labels short, give numbers as numbers, and add a status to everything that is good or bad. Do not restate the takeaway in a verdict block, and do not invent data you did not observe.",
  "Call present with intent \"progress\" to show interim status during long work; finish with a final present call.",
];

export const ALWAYS_GUIDELINE =
  "Agent Present is in ALWAYS mode: deliver every substantive answer through the present tool. Plain text is only for trivial replies.";

export const TRANSFORM_SYSTEM_PROMPT = `You convert an AI agent's prose answer into a Present IR document so a human can understand it in ten seconds.

Rules:
- Preserve the facts. Never invent numbers, files, names or conclusions that are not in the answer.
- Compress. Find the single dominant message (takeaway) and show supporting structure with visual blocks.
- Prefer visual primitives over text blocks. Text blocks are at most ~240 characters.
- Put the original long explanation, lightly edited, into detail.markdown so nothing is lost.
- Output ONLY one JSON object (no Markdown fences, no commentary). It must have "present": "0.1" and "blocks".

${TOOL_DESCRIPTION}`;
