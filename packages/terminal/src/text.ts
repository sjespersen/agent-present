const ANSI = /\x1b\[[0-9;?]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b_[^\x1b]*\x1b\\/g;

export function stripAnsi(text: string): string {
  return text.replace(ANSI, "");
}

function isWide(code: number): boolean {
  return (
    (code >= 0x1100 && code <= 0x115f) ||
    (code >= 0x2e80 && code <= 0x303e) ||
    (code >= 0x3041 && code <= 0x33ff) ||
    (code >= 0x3400 && code <= 0x4dbf) ||
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0xa000 && code <= 0xa4cf) ||
    (code >= 0xac00 && code <= 0xd7a3) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xfe30 && code <= 0xfe4f) ||
    (code >= 0xff00 && code <= 0xff60) ||
    (code >= 0xffe0 && code <= 0xffe6) ||
    (code >= 0x1f300 && code <= 0x1f64f) ||
    (code >= 0x1f900 && code <= 0x1f9ff) ||
    (code >= 0x20000 && code <= 0x3fffd)
  );
}

function charWidth(char: string): number {
  const code = char.codePointAt(0) ?? 0;
  if (code === 0) return 0;
  if (code < 32 || (code >= 0x7f && code < 0xa0)) return 0;
  if (code >= 0x300 && code <= 0x36f) return 0; // combining marks
  if (code === 0x200b || code === 0x200d || code === 0xfe0f) return 0;
  return isWide(code) ? 2 : 1;
}

/** Visible terminal columns, ignoring ANSI escape sequences. */
export function visibleWidth(text: string): number {
  let width = 0;
  for (const char of stripAnsi(text)) width += charWidth(char);
  return width;
}

/** Truncates to `width` columns, keeping ANSI sequences intact. */
export function truncate(text: string, width: number, ellipsis = "…"): string {
  if (width <= 0) return "";
  if (visibleWidth(text) <= width) return text;
  const ellipsisWidth = visibleWidth(ellipsis);
  const target = Math.max(0, width - ellipsisWidth);
  let out = "";
  let used = 0;
  let i = 0;
  let sawAnsi = false;
  while (i < text.length) {
    ANSI.lastIndex = i;
    const match = ANSI.exec(text);
    if (match && match.index === i) {
      out += match[0];
      sawAnsi = true;
      i += match[0].length;
      continue;
    }
    const char = String.fromCodePoint(text.codePointAt(i)!);
    const w = charWidth(char);
    if (used + w > target) break;
    out += char;
    used += w;
    i += char.length;
  }
  return out + (sawAnsi ? "\x1b[0m" : "") + (width >= ellipsisWidth ? ellipsis : "");
}

export function padEnd(text: string, width: number): string {
  const w = visibleWidth(text);
  return w >= width ? text : text + " ".repeat(width - w);
}

export function padStart(text: string, width: number): string {
  const w = visibleWidth(text);
  return w >= width ? text : " ".repeat(width - w) + text;
}

export function center(text: string, width: number): string {
  const w = visibleWidth(text);
  if (w >= width) return text;
  const left = Math.floor((width - w) / 2);
  return " ".repeat(left) + text + " ".repeat(width - w - left);
}

/** Fits text into exactly `width` columns (truncate or pad). */
export function fit(text: string, width: number): string {
  return padEnd(truncate(text, width), width);
}

/** Word-wraps plain (unstyled) text. Long words are hard-broken. */
export function wrap(text: string, width: number): string[] {
  if (width <= 0) return [];
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let line = "";
    for (let word of words) {
      while (visibleWidth(word) > width) {
        if (line) {
          lines.push(line);
          line = "";
        }
        lines.push(word.slice(0, width));
        word = word.slice(width);
      }
      if (!line) line = word;
      else if (visibleWidth(line) + 1 + visibleWidth(word) <= width) line += ` ${word}`;
      else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

/** Places styled segments side by side as columns. */
export function columns(blocks: string[][], widths: number[], gap = 2): string[] {
  const height = Math.max(0, ...blocks.map((b) => b.length));
  const out: string[] = [];
  for (let row = 0; row < height; row++) {
    const parts = blocks.map((b, i) => (i === blocks.length - 1 ? truncate(b[row] ?? "", widths[i]) : fit(b[row] ?? "", widths[i])));
    out.push(parts.join(" ".repeat(gap)).replace(/\s+$/, ""));
  }
  return out;
}

export function upper(text: string): string {
  return text.toUpperCase();
}
