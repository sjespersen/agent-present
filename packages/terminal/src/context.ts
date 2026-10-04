import type { Status } from "@agent-present/core";
import type { Glyphs } from "./glyphs.js";
import { statusRole, type Style } from "./style.js";

export type Depth = "glance" | "scan" | "explore";

export interface RenderContext {
  width: number;
  style: Style;
  glyphs: Glyphs;
  depth: Depth;
}

/** Small uppercase section label — the only "heading" style blocks use. */
export function sectionTitle(ctx: RenderContext, title: string, right?: string): string {
  const label = ctx.style.bold(ctx.style.fg("muted", title.toUpperCase()));
  if (!right) return label;
  const gap = Math.max(2, ctx.width - title.length - visibleLen(right));
  return label + " ".repeat(gap) + right;
}

function visibleLen(s: string): number {
  return s.replace(/\x1b\[[0-9;]*m/g, "").length;
}

/** A status glyph in its colour. Meaning never depends on the colour alone. */
export function mark(ctx: RenderContext, status: Status | undefined): string {
  if (!status) return "";
  return ctx.style.fg(statusRole(status), ctx.glyphs.status[status]);
}
