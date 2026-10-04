// Helpers to turn terminal output into HTML and PNG screenshots.
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { chromium, type Browser } from "playwright-core";

const BG = "#15171c";
const FG = "#d6d6d6";

const ANSI16: Record<number, string> = {
  30: "#3b3b3b", 31: "#e86464", 32: "#86c078", 33: "#e6b450", 34: "#7aa2f7", 35: "#c592ff", 36: "#7dc8be", 37: "#aaaaaa",
  90: "#646464", 91: "#ff7b7b", 92: "#a6e3a1", 93: "#f9e2af", 94: "#89b4fa", 95: "#f5c2e7", 96: "#94e2d5", 97: "#ececec",
};

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Browsers fall back to proportional fonts for symbols like ✕ and leave gaps
 * between rows of block characters. Terminals draw both on a strict grid, so
 * we pin every non-ASCII glyph to a one-cell box and draw block elements with CSS.
 */
const BLOCKS: Record<string, string> = {
  "█": "linear-gradient(currentColor,currentColor)",
  "▀": "linear-gradient(currentColor 50%,transparent 50%)",
  "▄": "linear-gradient(transparent 50%,currentColor 50%)",
  "▌": "linear-gradient(90deg,currentColor 50%,transparent 50%)",
  "▏": "linear-gradient(90deg,currentColor 12.5%,transparent 12.5%)",
  "▎": "linear-gradient(90deg,currentColor 25%,transparent 25%)",
  "▍": "linear-gradient(90deg,currentColor 37.5%,transparent 37.5%)",
  "▋": "linear-gradient(90deg,currentColor 62.5%,transparent 62.5%)",
  "▊": "linear-gradient(90deg,currentColor 75%,transparent 75%)",
  "▉": "linear-gradient(90deg,currentColor 87.5%,transparent 87.5%)",
};
const SHADES: Record<string, number> = { "░": 0.25, "▒": 0.5, "▓": 0.75 };

function gridText(s: string): string {
  let out = "";
  for (const ch of s) {
    if (ch.charCodeAt(0) < 128) {
      out += escapeHtml(ch);
    } else if (BLOCKS[ch]) {
      out += `<i class="b" style="background:${BLOCKS[ch]}"></i>`;
    } else if (SHADES[ch] !== undefined) {
      out += `<i class="b" style="background:currentColor;opacity:${SHADES[ch]}"></i>`;
    } else if (/[\u2500-\u257f]/.test(ch)) {
      out += `<i class="c x">${ch}</i>`;
    } else {
      out += `<i class="c">${escapeHtml(ch)}</i>`;
    }
  }
  return out;
}

/** Converts lines with SGR escape codes into HTML spans. */
export function ansiToHtml(lines: string[]): string {
  return lines
    .map((line) => {
      let out = "";
      let fg: string | undefined;
      let bold = false;
      let italic = false;
      let open = false;
      const parts = line.split(/(\x1b\[[0-9;]*m)/);
      for (const part of parts) {
        const m = part.match(/^\x1b\[([0-9;]*)m$/);
        if (m) {
          const codes = m[1].split(";").map(Number);
          for (let i = 0; i < codes.length; i++) {
            const c = codes[i];
            if (c === 0) {
              fg = undefined;
              bold = false;
              italic = false;
            } else if (c === 1) bold = true;
            else if (c === 22) bold = false;
            else if (c === 3) italic = true;
            else if (c === 23) italic = false;
            else if (c === 39) fg = undefined;
            else if (c === 38 && codes[i + 1] === 2) {
              fg = `rgb(${codes[i + 2]},${codes[i + 3]},${codes[i + 4]})`;
              i += 4;
            } else if (ANSI16[c]) fg = ANSI16[c];
          }
          continue;
        }
        if (!part) continue;
        const style = [fg ? `color:${fg}` : "", bold ? "font-weight:700" : "", italic ? "font-style:italic" : ""].filter(Boolean).join(";");
        out += style ? `<span style="${style}">${gridText(part)}</span>` : gridText(part);
        open = !!style;
      }
      void open;
      return out || " ";
    })
    .join("\n");
}

const PYTE_COLORS: Record<string, string> = {
  black: "#3b3b3b", red: "#e86464", green: "#86c078", brown: "#e6b450", yellow: "#e6b450", blue: "#7aa2f7", magenta: "#c592ff",
  cyan: "#7dc8be", white: "#d6d6d6", brightblack: "#646464", brightred: "#ff7b7b", brightgreen: "#a6e3a1", brightyellow: "#f9e2af",
  brightblue: "#89b4fa", brightmagenta: "#f5c2e7", brightcyan: "#94e2d5", brightwhite: "#ececec",
};

function pyteColor(c: string, fallback: string): string {
  if (!c || c === "default") return fallback;
  if (/^[0-9a-f]{6}$/i.test(c)) return `#${c}`;
  return PYTE_COLORS[c.toLowerCase()] ?? fallback;
}

/** Converts a pyte screen capture (from scripts/capture-pi.py) into HTML. */
export function cellsToHtml(capture: { cells: [string, string, string, boolean, boolean, boolean][][] }, fromRow = 0, toRow?: number): string {
  return capture.cells
    .slice(fromRow, toRow)
    .map((row) => {
      let out = "";
      let run = "";
      let runStyle = "";
      const flush = () => {
        if (!run) return;
        out += runStyle ? `<span style="${runStyle}">${gridText(run)}</span>` : gridText(run);
        run = "";
      };
      for (const [ch, fg, bg, bold, italic, reverse] of row) {
        let f = pyteColor(fg, FG);
        let b = pyteColor(bg, "");
        if (reverse) [f, b] = [b || BG, f];
        const style = [f !== FG ? `color:${f}` : "", b ? `background:${b}` : "", bold ? "font-weight:700" : "", italic ? "font-style:italic" : ""].filter(Boolean).join(";");
        if (style !== runStyle) {
          flush();
          runStyle = style;
        }
        run += ch || " ";
      }
      flush();
      return out.replace(/\s+$/, "") || " ";
    })
    .join("\n");
}

export function page(body: string, options: { title?: string; width?: number } = {}): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;background:transparent}
  .shot{display:inline-block;padding:28px}
  .win{background:${BG};border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.35),0 0 0 1px rgba(255,255,255,.06);overflow:hidden}
  .bar{height:34px;display:flex;align-items:center;gap:8px;padding:0 14px;color:#777;font:12px -apple-system,system-ui,sans-serif}
  .dot{width:12px;height:12px;border-radius:50%;background:#3a3d44}
  .title{margin-left:10px;letter-spacing:.02em}
  pre{margin:0;padding:6px 22px 24px;color:${FG};font-family:Menlo,"SF Mono",ui-monospace,monospace;font-size:14px;line-height:20px;font-variant-ligatures:none;white-space:pre}
  i{font-style:normal}
  .c{display:inline-block;width:1ch;height:20px;vertical-align:top;text-align:center;overflow:visible}
  .x{transform:scaleY(1.2);transform-origin:50% 55%}
  .b{display:inline-block;width:1ch;height:20px;vertical-align:top}
  .cols{display:flex;gap:28px;align-items:flex-start}
  .label{font:600 12px -apple-system,system-ui,sans-serif;letter-spacing:.14em;color:#8a8f98;margin:0 0 10px 4px}
  </style></head><body><div class="shot">${body}</div></body></html>`;
}

export function terminalWindow(html: string, title = ""): string {
  return `<div class="win"><div class="bar"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="title">${escapeHtml(title)}</span></div><pre>${html}</pre></div>`;
}

export function findChromium(): string | undefined {
  const candidates = [
    process.env.CHROMIUM_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/opt/pw-browsers/chromium",
    join(homedir(), "Library/Caches/ms-playwright/chromium-1208/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
    "/usr/bin/chromium",
    "/usr/bin/google-chrome",
  ];
  return candidates.find((c): c is string => !!c && existsSync(c));
}

export async function withBrowser<T>(fn: (browser: Browser) => Promise<T>): Promise<T> {
  const executablePath = findChromium();
  if (!executablePath) throw new Error("No Chromium found. Set CHROMIUM_PATH.");
  const browser = await chromium.launch({ executablePath });
  try {
    return await fn(browser);
  } finally {
    await browser.close();
  }
}

export async function screenshot(browser: Browser, html: string, path: string): Promise<void> {
  const p = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 2400, height: 1200 } });
  await p.setContent(html, { waitUntil: "load" });
  const el = await p.$(".shot");
  await el!.screenshot({ path, omitBackground: true });
  await p.close();
}
