import type { Role, Style } from "./style.js";
import { visibleWidth } from "./text.js";

interface Cell {
  ch: string;
  role?: Role;
  bold?: boolean;
  /** Line mask for junction merging: up=1 right=2 down=4 left=8 */
  mask?: number;
}

export const UP = 1;
export const RIGHT = 2;
export const DOWN = 4;
export const LEFT = 8;

const UNICODE_JUNCTIONS: Record<number, string> = {
  [UP]: "│",
  [DOWN]: "│",
  [UP | DOWN]: "│",
  [LEFT]: "─",
  [RIGHT]: "─",
  [LEFT | RIGHT]: "─",
  [RIGHT | DOWN]: "┌",
  [LEFT | DOWN]: "┐",
  [UP | RIGHT]: "└",
  [UP | LEFT]: "┘",
  [UP | RIGHT | DOWN]: "├",
  [UP | LEFT | DOWN]: "┤",
  [LEFT | RIGHT | DOWN]: "┬",
  [UP | LEFT | RIGHT]: "┴",
  [UP | RIGHT | DOWN | LEFT]: "┼",
};

function asciiJunction(mask: number): string {
  if ((mask & (LEFT | RIGHT)) && (mask & (UP | DOWN))) return "+";
  if (mask & (LEFT | RIGHT)) return "-";
  return "|";
}

/**
 * A fixed-width character grid with per-cell styling and box-junction merging.
 * Used for diagrams where layout is spatial rather than line-by-line.
 */
export class Canvas {
  private rows: Cell[][] = [];

  constructor(
    readonly width: number,
    private readonly unicode = true,
  ) {}

  get height(): number {
    return this.rows.length;
  }

  private row(y: number): Cell[] {
    while (this.rows.length <= y) this.rows.push(Array.from({ length: this.width }, () => ({ ch: " " })));
    return this.rows[y];
  }

  /** Writes text starting at (x, y). Characters outside the canvas are clipped. */
  text(x: number, y: number, text: string, role?: Role, bold?: boolean): void {
    if (y < 0) return;
    const row = this.row(y);
    let cx = x;
    for (const ch of text) {
      if (cx >= 0 && cx < this.width) row[cx] = { ch, role, bold };
      cx += visibleWidth(ch) || 1;
    }
  }

  /** Draws a line segment piece at (x, y) with the given direction mask, merging junctions. */
  line(x: number, y: number, mask: number, role?: Role): void {
    if (x < 0 || x >= this.width || y < 0) return;
    const row = this.row(y);
    const existing = row[x];
    const merged = (existing.mask ?? 0) | mask;
    const ch = this.unicode ? UNICODE_JUNCTIONS[merged] ?? "┼" : asciiJunction(merged);
    row[x] = { ch, role: existing.mask ? existing.role ?? role : role, mask: merged };
  }

  hline(x1: number, x2: number, y: number, role?: Role): void {
    const [a, b] = x1 <= x2 ? [x1, x2] : [x2, x1];
    for (let x = a; x <= b; x++) {
      let mask = 0;
      if (x > a) mask |= LEFT;
      if (x < b) mask |= RIGHT;
      if (a === b) mask = LEFT | RIGHT;
      this.line(x, y, mask, role);
    }
  }

  vline(x: number, y1: number, y2: number, role?: Role): void {
    const [a, b] = y1 <= y2 ? [y1, y2] : [y2, y1];
    for (let y = a; y <= b; y++) {
      let mask = 0;
      if (y > a) mask |= UP;
      if (y < b) mask |= DOWN;
      if (a === b) mask = UP | DOWN;
      this.line(x, y, mask, role);
    }
  }

  /** Box with corners at (x, y) and (x + w - 1, y + h - 1). */
  box(x: number, y: number, w: number, h: number, role?: Role): void {
    this.hline(x, x + w - 1, y, role);
    this.hline(x, x + w - 1, y + h - 1, role);
    this.vline(x, y, y + h - 1, role);
    this.vline(x + w - 1, y, y + h - 1, role);
  }

  /** Marks a cell as having a connection in `mask` direction (e.g. a ┬ on a box edge). */
  connect(x: number, y: number, mask: number, role?: Role): void {
    this.line(x, y, mask, role);
  }

  isEmpty(x: number, y: number): boolean {
    if (y >= this.rows.length) return true;
    const cell = this.rows[y]?.[x];
    return !cell || cell.ch === " ";
  }

  /** Is the horizontal range [x1, x2] on row y free? */
  isFree(x1: number, x2: number, y: number): boolean {
    for (let x = x1; x <= x2; x++) if (x < 0 || x >= this.width || !this.isEmpty(x, y)) return false;
    return true;
  }

  toLines(style: Style): string[] {
    return this.rows.map((row) => {
      let out = "";
      let run = "";
      let runRole: Role | undefined;
      let runBold: boolean | undefined;
      const flush = () => {
        if (!run) return;
        let s = runRole ? style.fg(runRole, run) : run;
        if (runBold) s = style.bold(s);
        out += s;
        run = "";
      };
      for (const cell of row) {
        const role = cell.ch === " " ? undefined : cell.role;
        const bold = cell.ch === " " ? undefined : cell.bold;
        if (role !== runRole || bold !== runBold) {
          flush();
          runRole = role;
          runBold = bold;
        }
        run += cell.ch;
      }
      flush();
      return out.replace(/\s+$/, "");
    });
  }
}
