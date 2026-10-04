import type { CheckState, Status } from "@agent-present/core";

export interface Glyphs {
  unicode: boolean;
  h: string;
  v: string;
  heavy: string;
  dotted: string;
  arrowDown: string;
  arrowRight: string;
  arrowUp: string;
  arrowLeft: string;
  broken: string;
  barFull: string;
  barEmpty: string;
  /** Partial cells, index 0..7 = 0/8..7/8 */
  barPartials: string[];
  /** Segment fills for stacked bars, so parts stay distinguishable without colour. */
  stackFills: string[];
  spark: string[];
  accentBar: string;
  bullet: string;
  dot: string;
  ellipsis: string;
  status: Record<Status, string>;
  check: Record<CheckState, string>;
  risk: { critical: string; warning: string; neutral: string; empty: string };
  pick: string;
  best: string;
  tree: { branch: string; last: string; pipe: string; space: string };
  chart: { h: string; v: string; ul: string; ur: string; dl: string; dr: string; axis: string; tick: string; corner: string };
}

export const UNICODE: Glyphs = {
  unicode: true,
  h: "─",
  v: "│",
  heavy: "━",
  dotted: "┄",
  arrowDown: "▼",
  arrowRight: "►",
  arrowUp: "▲",
  arrowLeft: "◄",
  broken: "╳",
  barFull: "█",
  barEmpty: "░",
  barPartials: ["", "▏", "▎", "▍", "▌", "▋", "▊", "▉"],
  stackFills: ["█", "▓", "▒", "░"],
  spark: ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"],
  accentBar: "▌",
  bullet: "•",
  dot: "·",
  ellipsis: "…",
  status: { good: "✓", warning: "▲", critical: "✕", info: "●", neutral: "○" },
  check: { done: "✓", failed: "✕", pending: "○", skipped: "–", warning: "▲", running: "◐" },
  risk: { critical: "█", warning: "▲", neutral: "●", empty: "·" },
  pick: "▲",
  best: "●",
  tree: { branch: "├── ", last: "└── ", pipe: "│   ", space: "    " },
  chart: { h: "─", v: "│", ul: "╭", ur: "╮", dl: "╰", dr: "╯", axis: "┤", tick: "┼", corner: "└" },
};

export const ASCII: Glyphs = {
  unicode: false,
  h: "-",
  v: "|",
  heavy: "=",
  dotted: ".",
  arrowDown: "v",
  arrowRight: ">",
  arrowUp: "^",
  arrowLeft: "<",
  broken: "X",
  barFull: "#",
  barEmpty: "-",
  barPartials: ["", "", "", "", "", "", "", ""],
  stackFills: ["#", "=", "+", ":"],
  spark: ["_", ".", ",", "-", "~", "=", "*", "#"],
  accentBar: "|",
  bullet: "*",
  dot: ".",
  ellipsis: "...",
  status: { good: "+", warning: "!", critical: "x", info: "*", neutral: "o" },
  check: { done: "+", failed: "x", pending: "o", skipped: "-", warning: "!", running: "~" },
  risk: { critical: "#", warning: "^", neutral: "o", empty: "." },
  pick: "^",
  best: "*",
  tree: { branch: "|-- ", last: "`-- ", pipe: "|   ", space: "    " },
  chart: { h: "-", v: "|", ul: "+", ur: "+", dl: "+", dr: "+", axis: "|", tick: "+", corner: "+" },
};
