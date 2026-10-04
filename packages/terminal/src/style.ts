import type { Status } from "@agent-present/core";

/** Semantic colour roles. Renderers never pick raw colours. */
export type Role =
  | "text"
  | "strong"
  | "muted"
  | "dim"
  | "accent"
  | "good"
  | "warning"
  | "critical"
  | "info"
  | "neutral";

export interface Style {
  fg(role: Role, text: string): string;
  bold(text: string): string;
  italic(text: string): string;
  /** True when colour is available. Renderers must still encode meaning without it. */
  readonly color: boolean;
}

export function statusRole(status: Status | undefined): Role {
  switch (status) {
    case "good":
      return "good";
    case "warning":
      return "warning";
    case "critical":
      return "critical";
    case "info":
      return "info";
    default:
      return "neutral";
  }
}

type Rgb = [number, number, number];

/** A calm, editorial palette: one accent, three status hues, two greys. */
export const PALETTE: Record<Role, Rgb | null> = {
  text: null,
  strong: [236, 236, 236],
  muted: [150, 150, 150],
  dim: [100, 100, 100],
  accent: [125, 200, 190],
  good: [134, 192, 120],
  warning: [230, 180, 80],
  critical: [232, 100, 100],
  info: [122, 162, 247],
  neutral: [170, 170, 170],
};

const ANSI16: Record<Role, number | null> = {
  text: null,
  strong: 97,
  muted: 37,
  dim: 90,
  accent: 36,
  good: 32,
  warning: 33,
  critical: 31,
  info: 34,
  neutral: 37,
};

export interface AnsiStyleOptions {
  /** "truecolor" (default) or "ansi16" */
  depth?: "truecolor" | "ansi16";
  palette?: Partial<Record<Role, Rgb | null>>;
}

export function ansiStyle(options: AnsiStyleOptions = {}): Style {
  const palette = { ...PALETTE, ...options.palette };
  const depth = options.depth ?? "truecolor";
  return {
    color: true,
    fg(role, text) {
      if (!text) return text;
      if (depth === "ansi16") {
        const code = ANSI16[role];
        return code === null ? text : `\x1b[${code}m${text}\x1b[39m`;
      }
      const rgb = palette[role];
      return rgb ? `\x1b[38;2;${rgb[0]};${rgb[1]};${rgb[2]}m${text}\x1b[39m` : text;
    },
    bold: (text) => (text ? `\x1b[1m${text}\x1b[22m` : text),
    italic: (text) => (text ? `\x1b[3m${text}\x1b[23m` : text),
  };
}

/** Bold but no colour: what a grayscale screenshot or a no-colour terminal sees. */
export function monochromeStyle(): Style {
  return {
    color: false,
    fg: (_role, text) => text,
    bold: (text) => (text ? `\x1b[1m${text}\x1b[22m` : text),
    italic: (text) => text,
  };
}

/** No escape codes at all: plain text output. */
export function plainStyle(): Style {
  return { color: false, fg: (_role, text) => text, bold: (text) => text, italic: (text) => text };
}
