import type { Glyphs } from "./glyphs.js";
import type { Role, Style } from "./style.js";
import { padStart, visibleWidth } from "./text.js";

/** A horizontal bar of `width` cells filled to `fraction` (0..1), with sub-cell precision. */
export function bar(
  fraction: number,
  width: number,
  g: Glyphs,
  style: Style,
  role: Role = "accent",
  emptyRole: Role = "dim",
  showEmpty = true,
): string {
  if (width <= 0) return "";
  const f = Math.max(0, Math.min(1, Number.isFinite(fraction) ? fraction : 0));
  const eighths = Math.round(f * width * 8);
  let full = Math.floor(eighths / 8);
  let partial = g.barPartials[eighths % 8] ?? "";
  if (!g.unicode && eighths % 8 >= 4) {
    full += 1;
    partial = "";
  }
  full = Math.min(full, width);
  const used = full + (partial ? 1 : 0);
  const filled = g.barFull.repeat(full) + partial;
  const rest = Math.max(0, width - used);
  if (!showEmpty) return style.fg(role, filled) + " ".repeat(rest);
  return style.fg(role, filled) + style.fg(emptyRole, g.barEmpty.repeat(rest));
}

export interface StackPart {
  value: number;
  role: Role;
}

/** Allocates `width` cells to parts proportionally (largest remainder, min 1 cell for non-zero parts). */
export function allocate(values: number[], width: number): number[] {
  const total = values.reduce((a, b) => a + Math.max(0, b), 0);
  if (total <= 0 || width <= 0) return values.map(() => 0);
  const exact = values.map((v) => (Math.max(0, v) / total) * width);
  const cells = exact.map((e, i) => (values[i] > 0 ? Math.max(1, Math.floor(e)) : 0));
  let used = cells.reduce((a, b) => a + b, 0);
  const order = exact.map((e, i) => ({ i, r: e - Math.floor(e) })).sort((a, b) => b.r - a.r);
  let k = 0;
  while (used < width && order.length) {
    cells[order[k % order.length].i]++;
    used++;
    k++;
  }
  while (used > width) {
    const biggest = cells.indexOf(Math.max(...cells));
    cells[biggest]--;
    used--;
  }
  return cells;
}

/** A stacked bar; each part uses a distinct fill so parts survive grayscale. */
export function stackedBar(parts: StackPart[], width: number, g: Glyphs, style: Style): string {
  const cells = allocate(
    parts.map((p) => p.value),
    width,
  );
  return parts.map((p, i) => style.fg(p.role, (g.stackFills[Math.min(i, g.stackFills.length - 1)] ?? g.barFull).repeat(cells[i]))).join("");
}

/** Resamples a series to `n` points by linear interpolation. */
export function resample(values: number[], n: number): number[] {
  if (n <= 0 || values.length === 0) return [];
  if (values.length === 1) return Array(n).fill(values[0]);
  if (n === 1) return [values[values.length - 1]];
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const pos = (i / (n - 1)) * (values.length - 1);
    const lo = Math.floor(pos);
    const hi = Math.min(values.length - 1, lo + 1);
    out.push(values[lo] + (values[hi] - values[lo]) * (pos - lo));
  }
  return out;
}

/** ▁▂▃▅▇ — `width` defaults to one glyph per value (resampled if longer). */
export function sparkline(values: number[], g: Glyphs, width?: number): string {
  if (!values.length) return "";
  const series = width && width !== values.length ? resample(values, width) : values;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  return series.map((v) => g.spark[Math.round(((v - min) / span) * (g.spark.length - 1))]).join("");
}

export interface LineChartOptions {
  height: number;
  width: number;
  role?: Role;
  threshold?: number;
  format?: (n: number) => string;
  xLabels?: string[];
}

/**
 * A rounded line chart in the style of asciichart:
 *
 *   680 ┤          ╭─╮
 *   300 ┤     ╭────╯ ╰─
 *   100 ┼─────╯
 */
export function lineChart(values: number[], options: LineChartOptions, g: Glyphs, style: Style): string[] {
  const role = options.role ?? "accent";
  const format = options.format ?? ((n: number) => formatNumber(n));
  const height = Math.max(2, options.height);
  const min = Math.min(...values, options.threshold ?? Infinity);
  const max = Math.max(...values, options.threshold ?? -Infinity);
  const span = max - min || 1;
  const labels = Array.from({ length: height }, (_, r) => format(max - (r / (height - 1)) * span));
  const labelWidth = Math.max(...labels.map(visibleWidth));
  const plotWidth = Math.max(4, options.width - labelWidth - 2);
  const series = resample(values, plotWidth);
  const rowOf = (v: number) => Math.round(((max - v) / span) * (height - 1));

  const grid: { ch: string; role: Role }[][] = Array.from({ length: height }, () =>
    Array.from({ length: plotWidth }, () => ({ ch: " ", role: "dim" as Role })),
  );

  if (options.threshold !== undefined) {
    const tr = rowOf(options.threshold);
    for (let x = 0; x < plotWidth; x++) grid[tr][x] = { ch: g.dotted, role: "warning" };
  }

  let prev = rowOf(series[0]);
  for (let x = 0; x < plotWidth; x++) {
    const cur = rowOf(series[x]);
    if (x === 0) {
      grid[cur][x] = { ch: g.chart.h, role };
      prev = cur;
      continue;
    }
    if (cur === prev) {
      grid[cur][x] = { ch: g.chart.h, role };
    } else if (cur < prev) {
      // going up (smaller row index)
      grid[prev][x] = { ch: g.chart.dr, role };
      for (let r = cur + 1; r < prev; r++) grid[r][x] = { ch: g.chart.v, role };
      grid[cur][x] = { ch: g.chart.ul, role };
    } else {
      grid[prev][x] = { ch: g.chart.ur, role };
      for (let r = prev + 1; r < cur; r++) grid[r][x] = { ch: g.chart.v, role };
      grid[cur][x] = { ch: g.chart.dl, role };
    }
    prev = cur;
  }

  const lines = grid.map((row, r) => {
    let line = "";
    let run = "";
    let runRole: Role | undefined;
    for (const cell of row) {
      const cr = cell.ch === " " ? undefined : cell.role;
      if (cr !== runRole) {
        line += runRole ? style.fg(runRole, run) : run;
        run = "";
        runRole = cr;
      }
      run += cell.ch;
    }
    line += runRole ? style.fg(runRole, run) : run;
    return `${style.fg("dim", padStart(labels[r], labelWidth))} ${style.fg("dim", g.chart.axis)}${line}`.replace(/\s+$/, "");
  });

  if (options.xLabels?.length) {
    const axis = `${" ".repeat(labelWidth)} ${g.chart.corner}${g.chart.h.repeat(plotWidth)}`;
    lines.push(style.fg("dim", axis));
    lines.push(style.fg("dim", spreadLabels(options.xLabels, plotWidth, labelWidth + 2)));
  }
  return lines;
}

/** Spreads labels evenly across `width` columns, starting at `offset`. */
export function spreadLabels(labels: string[], width: number, offset = 0): string {
  const cells = Array<string>(width + offset).fill(" ");
  const n = labels.length;
  labels.forEach((label, i) => {
    const pos = n === 1 ? 0 : Math.round((i / (n - 1)) * (width - 1));
    let start = offset + pos - (i === 0 ? 0 : i === n - 1 ? visibleWidth(label) - 1 : Math.floor(visibleWidth(label) / 2));
    start = Math.max(offset, Math.min(start, offset + width - visibleWidth(label)));
    for (let k = 0; k < label.length && start + k < cells.length; k++) cells[start + k] = label[k];
  });
  return cells.join("").replace(/\s+$/, "");
}

// ─── numbers ────────────────────────────────────────────────────────────────

export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${trim(n / 1e9)}B`;
  if (abs >= 1e6) return `${trim(n / 1e6)}M`;
  if (abs >= 1e4) return `${trim(n / 1e3)}k`;
  if (abs >= 100) return Math.round(n).toString();
  if (abs >= 10) return trim(n, 1);
  if (abs === 0) return "0";
  return trim(n, 2);
}

function trim(n: number, digits = 1): string {
  return Number(n.toFixed(digits)).toString();
}

export function formatValue(value: number | string, unit?: string): string {
  const v = typeof value === "number" ? formatNumber(value) : value;
  if (!unit) return v;
  return /^[%°]|^k$|^[kMB]$/.test(unit) || unit.startsWith("%") ? `${v}${unit}` : `${v} ${unit}`;
}

// ─── oversized numerals ─────────────────────────────────────────────────────

const FONT: Record<string, string[]> = {
  "0": ["###", "#.#", "#.#", "#.#", "###"],
  "1": [".#.", "##.", ".#.", ".#.", "###"],
  "2": ["###", "..#", "###", "#..", "###"],
  "3": ["###", "..#", ".##", "..#", "###"],
  "4": ["#.#", "#.#", "###", "..#", "..#"],
  "5": ["###", "#..", "###", "..#", "###"],
  "6": ["###", "#..", "###", "#.#", "###"],
  "7": ["###", "..#", "..#", "..#", "..#"],
  "8": ["###", "#.#", "###", "#.#", "###"],
  "9": ["###", "#.#", "###", "..#", "###"],
  "%": ["#.#", "..#", ".#.", "#..", "#.#"],
  ".": [".", ".", ".", ".", "#"],
  ",": [".", ".", ".", ".", "#"],
  "-": ["...", "...", "###", "...", "..."],
  "+": ["...", ".#.", "###", ".#.", "..."],
  ":": [".", "#", ".", "#", "."],
  "/": ["..#", "..#", ".#.", "#..", "#.."],
  " ": [".", ".", ".", ".", "."],
};

/** Renders text in a 3-row half-block numeral font. Returns undefined if a glyph is unsupported. */
export function bigText(text: string): string[] | undefined {
  const chars = [...text];
  if (!chars.length || chars.some((c) => !FONT[c])) return undefined;
  const rows = ["", "", ""];
  chars.forEach((c, i) => {
    const glyph = FONT[c];
    const w = glyph[0].length;
    for (let r = 0; r < 3; r++) {
      const top = glyph[r * 2] ?? ".".repeat(w);
      const bottom = glyph[r * 2 + 1] ?? ".".repeat(w);
      let out = "";
      for (let x = 0; x < w; x++) {
        const t = top[x] === "#";
        const b = bottom[x] === "#";
        out += t && b ? "█" : t ? "▀" : b ? "▄" : " ";
      }
      rows[r] += (i > 0 ? " " : "") + out;
    }
  });
  return rows;
}

/** Splits a value into the part the big font can draw and a small suffix ("1.2" + "M tok"). */
export function splitForBig(value: number | string, unit?: string): { big: string; small: string } {
  const formatted = typeof value === "number" ? formatNumber(value) : value;
  const match = formatted.match(/^([+\-]?[0-9.,:/]+)(.*)$/);
  if (!match) return { big: "", small: [formatted, unit].filter(Boolean).join(" ") };
  let big = match[1];
  let small = match[2];
  if (unit === "%" && !small) big += "%";
  else small = [small, unit].filter(Boolean).join(" ");
  return { big, small: small.trim() };
}
