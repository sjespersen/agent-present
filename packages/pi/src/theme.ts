import type { Role, Style } from "@agent-present/terminal";

/** The subset of Pi's Theme the renderer needs. */
export interface PiThemeLike {
  fg(color: string, text: string): string;
  bold(text: string): string;
  italic?(text: string): string;
}

const ROLE_TO_PI: Record<Role, string> = {
  text: "text",
  strong: "text",
  muted: "muted",
  dim: "dim",
  accent: "accent",
  good: "success",
  warning: "warning",
  critical: "error",
  info: "mdLink",
  neutral: "muted",
};

/** Adapts Pi's active theme so presentations follow the user's colours. */
export function piStyle(theme: PiThemeLike): Style {
  return {
    color: true,
    fg: (role, text) => (text ? theme.fg(ROLE_TO_PI[role], text) : text),
    bold: (text) => (text ? theme.bold(text) : text),
    italic: (text) => (text && theme.italic ? theme.italic(text) : text),
  };
}
