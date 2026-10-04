import { formatIssues, normalize, validate, type NormalizedDocument } from "@agent-present/core";
import { TRANSFORM_SYSTEM_PROMPT } from "./instructions.js";

export type Complete = (system: string, user: string) => Promise<string>;

/** Extracts the first JSON object from a model reply (tolerates fences and chatter). */
export function extractJson(reply: string): unknown {
  const fenced = reply.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : reply;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("model reply contained no JSON object");
  return JSON.parse(candidate.slice(start, end + 1));
}

/**
 * Compatibility mode: turns an ordinary prose answer into Present IR with one
 * model call (plus one repair attempt if the result does not validate).
 */
export async function transformToPresent(answer: string, complete: Complete): Promise<{ raw: unknown; doc: NormalizedDocument }> {
  const user = `Convert this agent answer into Present IR:\n\n<answer>\n${answer}\n</answer>`;
  let reply = await complete(TRANSFORM_SYSTEM_PROMPT, user);
  let raw: unknown;
  try {
    raw = extractJson(reply);
  } catch (error) {
    reply = await complete(TRANSFORM_SYSTEM_PROMPT, `${user}\n\nYour previous reply was not valid JSON (${(error as Error).message}). Reply with only the JSON object.`);
    raw = extractJson(reply);
  }
  raw = withVersion(raw);
  const result = validate(raw);
  if (!result.valid) {
    const repaired = await complete(
      TRANSFORM_SYSTEM_PROMPT,
      `${user}\n\nYour previous document had schema errors:\n${formatIssues(result.errors)}\n\nPrevious document:\n${JSON.stringify(raw)}\n\nReply with the corrected JSON object only.`,
    );
    try {
      const candidate = withVersion(extractJson(repaired));
      if (validate(candidate).errors.length < result.errors.length) raw = candidate;
    } catch {
      // keep the first attempt; the normalizer is lenient
    }
  }
  const doc = normalize(raw);
  if (!doc.blocks.length && !doc.takeaway) throw new Error("the model did not produce a presentable document");
  return { raw, doc };
}

function withVersion(raw: unknown): unknown {
  if (raw && typeof raw === "object" && !Array.isArray(raw) && !("present" in raw)) return { present: "0.1", ...raw };
  return raw;
}

interface SessionEntryLike {
  type: string;
  message?: { role?: string; content?: unknown };
}

/** Text of the most recent assistant message that has any. */
export function lastAssistantText(entries: SessionEntryLike[]): string | undefined {
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (entry.type !== "message" || entry.message?.role !== "assistant") continue;
    const content = entry.message.content;
    const text =
      typeof content === "string"
        ? content
        : Array.isArray(content)
          ? content
              .filter((c): c is { type: string; text: string } => !!c && typeof c === "object" && (c as { type?: string }).type === "text")
              .map((c) => c.text)
              .join("\n")
          : "";
    if (text.trim()) return text.trim();
  }
  return undefined;
}
