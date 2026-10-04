import type { Action, NormalizedDocument } from "@agent-present/core";
import { layoutDocument, renderPlainText, stripAnsi, truncate, visibleWidth, type Depth } from "@agent-present/terminal";
import { piStyle, type PiThemeLike } from "./theme.js";

/** Minimal Pi TUI component contract (kept structural so the core stays host-agnostic). */
export interface Component {
  render(width: number): string[];
  handleInput?(data: string): void;
  invalidate(): void;
}

export interface ViewOptions {
  depth: Depth;
  hints?: string[];
  /** Columns reserved on the right (Pi draws tool rows flush with the terminal edge). */
  margin?: number;
}

/** Renders a presentation inline in the transcript. Cached per width. */
export class PresentView implements Component {
  private cache?: { width: number; lines: string[] };

  constructor(
    private doc: NormalizedDocument,
    private theme: PiThemeLike,
    private options: ViewOptions,
  ) {}

  update(doc: NormalizedDocument, options: ViewOptions): void {
    this.doc = doc;
    this.options = options;
    this.cache = undefined;
  }

  render(width: number): string[] {
    if (this.cache?.width === width) return this.cache.lines;
    const lines = [
      "",
      ...layoutDocument(this.doc, {
        width,
        depth: this.options.depth,
        style: piStyle(this.theme),
        hints: this.options.hints,
        margin: this.options.margin ?? 1,
      }).lines,
    ];
    this.cache = { width, lines };
    return lines;
  }

  invalidate(): void {
    this.cache = undefined;
  }
}

export type ExplorerResult = { action?: Action } | undefined;

const DEPTHS: Depth[] = ["glance", "scan", "explore"];

/**
 * Full-screen explorer for one presentation.
 *
 *   enter  cycle glance → scan → explore     d  details     e  evidence
 *   s      sources                           c  copy text   r  raw document
 *   1-9    run action                        ↑↓ / pgup pgdn / g G  scroll     q / esc  close
 */
export class Explorer implements Component {
  private depth: Depth = "scan";
  private raw = false;
  private scroll = 0;
  private status = "";
  private lastLines: string[] = [];
  private lastInner = 96;

  constructor(
    private readonly doc: NormalizedDocument,
    private readonly rawDocument: unknown,
    private readonly theme: PiThemeLike,
    private readonly viewport: () => number,
    private readonly requestRender: () => void,
    private readonly done: (result: ExplorerResult) => void,
    private readonly copy: (text: string) => Promise<void>,
  ) {}

  render(width: number): string[] {
    const style = piStyle(this.theme);
    const inner = Math.max(20, width - 4);
    this.lastInner = inner;
    let body: string[];
    if (this.raw) {
      body = JSON.stringify(this.rawDocument, null, 2)
        .split("\n")
        .map((l) => style.fg("muted", truncate(l, inner)));
    } else {
      body = layoutDocument(this.doc, { width: inner, depth: this.depth, style, margin: 0, actions: true }).lines;
    }
    this.lastLines = body;
    const height = Math.max(5, this.viewport() - 4);
    const maxScroll = Math.max(0, body.length - height);
    this.scroll = Math.min(this.scroll, maxScroll);
    const visible = body.slice(this.scroll, this.scroll + height);

    const border = (s: string) => this.theme.fg("borderMuted", s);
    const tabs = DEPTHS.map((d) => (d === this.depth && !this.raw ? style.bold(style.fg("accent", ` ${d.toUpperCase()} `)) : style.fg("dim", ` ${d} `))).join("");
    const rawTab = this.raw ? style.bold(style.fg("accent", " RAW ")) : style.fg("dim", " raw ");
    const title = ` ${style.bold("agent present")} ${tabs}${rawTab}`;
    const top = border("╭") + title + border("─".repeat(Math.max(0, width - 2 - visibleWidth(title)))) + border("╮");
    const lines = [top];
    for (const line of visible) lines.push(`${border("│")} ${padTo(line, inner)} ${border("│")}`);
    for (let i = visible.length; i < Math.min(height, body.length); i++) lines.push(`${border("│")} ${" ".repeat(inner)} ${border("│")}`);
    const pos = body.length > height ? style.fg("dim", ` ${this.scroll + 1}-${Math.min(body.length, this.scroll + height)}/${body.length} `) : "";
    const keys = "enter depth · d details · e evidence · s sources · c copy · r raw · 1-9 act · q close";
    const footerText = this.status ? style.fg("accent", ` ${this.status} `) : style.fg("dim", ` ${keys} `);
    const footer = truncate(footerText, Math.max(0, width - 2 - visibleWidth(pos)));
    lines.push(border("╰") + footer + border("─".repeat(Math.max(0, width - 2 - visibleWidth(footer) - visibleWidth(pos)))) + pos + border("╯"));
    return lines.map((l) => truncate(l, width));
  }

  /** Opens on the block an "expand" action points at. */
  reveal(blockId: string): void {
    const block = this.doc.blocks.find((b) => b.id === blockId);
    this.jumpTo((block?.title ?? (block?.type === "evidence" ? block.claim : "")).toUpperCase());
  }

  private jumpTo(heading: string, depth: Depth = "explore"): void {
    this.raw = false;
    this.depth = depth;
    const lines = layoutDocument(this.doc, { width: this.lastInner, depth, style: piStyle(this.theme), margin: 0 }).lines.map(stripAnsi);
    const index = lines.findIndex((l) => l.trim().toUpperCase().startsWith(heading));
    this.scroll = index >= 0 ? index : 0;
    this.status = index >= 0 ? "" : `no ${heading.toLowerCase()} in this presentation`;
  }

  handleInput(data: string): void {
    this.status = "";
    const page = Math.max(5, this.viewport() - 6);
    switch (data) {
      case "q":
      case "\x1b":
        this.done(undefined);
        return;
      case "\r":
      case "\n":
        this.raw = false;
        this.depth = DEPTHS[(DEPTHS.indexOf(this.depth) + 1) % DEPTHS.length];
        this.scroll = 0;
        break;
      case "d":
        this.jumpTo("DETAIL");
        break;
      case "e": {
        const block = this.doc.blocks.find((b) => b.type === "evidence");
        const heading = block?.title ?? (block?.type === "evidence" ? block.claim : "EVIDENCE");
        this.jumpTo(heading.toUpperCase());
        break;
      }
      case "s":
        this.jumpTo("SOURCES");
        break;
      case "r":
        this.raw = !this.raw;
        this.scroll = 0;
        break;
      case "c":
        void this.copy(renderPlainText(this.doc, { width: 100, depth: "explore" })).then(
          () => {
            this.status = "copied presentation as text";
            this.requestRender();
          },
          () => {
            this.status = "copy failed";
            this.requestRender();
          },
        );
        break;
      case "j":
      case "\x1b[B":
        this.scroll++;
        break;
      case "k":
      case "\x1b[A":
        this.scroll = Math.max(0, this.scroll - 1);
        break;
      case " ":
      case "\x1b[6~":
        this.scroll += page;
        break;
      case "\x1b[5~":
        this.scroll = Math.max(0, this.scroll - page);
        break;
      case "g":
        this.scroll = 0;
        break;
      case "G":
        this.scroll = Math.max(0, this.lastLines.length - page);
        break;
      default: {
        const n = Number.parseInt(data, 10);
        if (n >= 1 && n <= 9 && this.doc.actions[n - 1]) {
          const action = this.doc.actions[n - 1];
          if (action.intent === "expand" && action.target) {
            this.reveal(action.target);
          } else if (action.intent === "copy") {
            void this.copy(action.value ?? action.label).then(() => {
              this.status = `copied ${action.label.toLowerCase()}`;
              this.requestRender();
            });
          } else {
            this.done({ action });
            return;
          }
        }
      }
    }
    this.requestRender();
  }

  invalidate(): void {}
}

function padTo(line: string, width: number): string {
  const w = visibleWidth(line);
  if (w > width) return truncate(line, width);
  return line + " ".repeat(width - w);
}
