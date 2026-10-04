import type { RenderContext } from "./context.js";
import { truncate, wrap } from "./text.js";

/**
 * A deliberately small Markdown renderer for the Explore depth: headings,
 * paragraphs, lists, code fences and inline bold/code/links.
 */
export function renderMarkdown(markdown: string, ctx: RenderContext): string[] {
  const { width, style } = ctx;
  const out: string[] = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let paragraph: string[] = [];
  let inCode = false;

  const inline = (text: string) =>
    text
      .replace(/\*\*([^*]+)\*\*/g, (_, t) => style.bold(t))
      .replace(/`([^`]+)`/g, (_, t) => style.fg("accent", t))
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, url) => `${t} ${style.fg("dim", `(${url})`)}`);

  const flush = () => {
    if (!paragraph.length) return;
    for (const line of wrap(paragraph.join(" "), width)) out.push(inline(line));
    paragraph = [];
  };

  for (const raw of lines) {
    if (raw.trim().startsWith("```")) {
      flush();
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      out.push(truncate(style.fg("accent", `  ${raw}`), width));
      continue;
    }
    const heading = raw.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flush();
      if (out.length && out[out.length - 1] !== "") out.push("");
      const text = heading[2].replace(/\*\*/g, "");
      out.push(truncate(heading[1].length <= 2 ? style.bold(text.toUpperCase()) : style.bold(text), width));
      continue;
    }
    const item = raw.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
    if (item) {
      flush();
      const indent = Math.min(8, item[1].length);
      const bullet = /\d/.test(item[2]) ? item[2] : ctx.glyphs.bullet;
      const prefix = " ".repeat(indent) + bullet + " ";
      const wrapped = wrap(item[3], Math.max(10, width - prefix.length));
      wrapped.forEach((line, i) => out.push((i === 0 ? style.fg("muted", prefix) : " ".repeat(prefix.length)) + inline(line)));
      continue;
    }
    if (!raw.trim()) {
      flush();
      if (out.length && out[out.length - 1] !== "") out.push("");
      continue;
    }
    paragraph.push(raw.trim());
  }
  flush();
  while (out.length && out[out.length - 1] === "") out.pop();
  return out;
}
