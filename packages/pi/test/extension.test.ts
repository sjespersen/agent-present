import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { stripAnsi, visibleWidth } from "@agent-present/terminal";
import agentPresent from "../src/index.js";
import { ALWAYS_GUIDELINE } from "../src/instructions.js";
import { extractJson, lastAssistantText, transformToPresent } from "../src/transform.js";

const repoReview = JSON.parse(readFileSync(new URL("../../../examples/repo-review.json", import.meta.url), "utf8"));
const theme = { fg: (_c: string, t: string) => t, bold: (t: string) => t, italic: (t: string) => t };

type Handler = (event: any, ctx: any) => any;

function fakePi() {
  const tools = new Map<string, any>();
  const commands = new Map<string, any>();
  const shortcuts = new Map<string, any>();
  const entryRenderers = new Map<string, any>();
  const handlers = new Map<string, Handler[]>();
  const entries: { customType: string; data: any }[] = [];
  const userMessages: { text: string; options?: any }[] = [];
  let active = ["read", "bash"];
  const pi = {
    registerTool: (t: any) => {
      tools.set(t.name, t);
      if (!active.includes(t.name)) active.push(t.name);
    },
    registerCommand: (name: string, c: any) => commands.set(name, c),
    registerShortcut: (key: string, s: any) => shortcuts.set(key, s),
    registerEntryRenderer: (type: string, r: any) => entryRenderers.set(type, r),
    on: (event: string, h: Handler) => handlers.set(event, [...(handlers.get(event) ?? []), h]),
    getActiveTools: () => [...active],
    setActiveTools: (names: string[]) => {
      active = [...names];
    },
    appendEntry: (customType: string, data: any) => entries.push({ customType, data }),
    sendUserMessage: (text: string, options?: any) => userMessages.push({ text, options }),
    exec: vi.fn(),
  };
  const notifications: string[] = [];
  const widgets = new Map<string, unknown>();
  const branch: any[] = [];
  const ctx = {
    hasUI: true,
    mode: "tui",
    isIdle: () => true,
    waitForIdle: async () => {},
    sessionManager: { getBranch: () => branch },
    model: { id: "test-model" },
    modelRegistry: { complete: vi.fn() },
    ui: {
      notify: (m: string) => notifications.push(m),
      setWidget: (k: string, v: unknown) => (v === undefined ? widgets.delete(k) : widgets.set(k, v)),
      setWorkingMessage: () => {},
      select: vi.fn(),
      custom: vi.fn(),
    },
  };
  const emit = async (event: string, payload: any = {}) => {
    for (const h of handlers.get(event) ?? []) await h(payload, ctx);
  };
  agentPresent(pi as any);
  return { pi, ctx, tools, commands, shortcuts, entryRenderers, entries, userMessages, notifications, widgets, branch, emit, active: () => active };
}

describe("registration", () => {
  it("registers the present tool, command, shortcut and entry renderer", () => {
    const f = fakePi();
    const tool = f.tools.get("present");
    expect(tool).toBeDefined();
    expect(tool.renderShell).toBe("self");
    expect(tool.parameters.required).toEqual(["blocks"]);
    expect(tool.promptGuidelines.every((g: string) => g.includes("present"))).toBe(true);
    expect(tool.description).toContain("The presentation IS your answer");
    expect(f.commands.has("present")).toBe(true);
    expect(f.shortcuts.has("alt+e")).toBe(true);
    expect(f.entryRenderers.has("agent-present")).toBe(true);
  });
});

describe("present tool", () => {
  it("returns a terminating result with an outline for the model", async () => {
    const f = fakePi();
    const { present: _v, ...params } = repoReview;
    const result = await f.tools.get("present").execute("call-1", params, undefined, undefined, f.ctx);
    expect(result.terminate).toBe(true);
    expect(result.details.document.present).toBe("0.1");
    expect(result.content[0].text).toContain("Do not repeat it in prose");
    expect(result.content[0].text).toContain("Takeaway [warning]: Don't ship yet");
  });

  it("keeps working on progress presentations and shows them in a widget", async () => {
    const f = fakePi();
    const result = await f.tools
      .get("present")
      .execute("call-2", { intent: "progress", blocks: [{ type: "progress", items: [{ label: "files", value: 3, total: 9 }] }] }, undefined, undefined, f.ctx);
    expect(result.terminate).toBe(false);
    expect(f.widgets.has("agent-present-progress")).toBe(true);
    await f.emit("agent_end");
    expect(f.widgets.has("agent-present-progress")).toBe(false);
  });

  it("rejects documents with nothing to present", async () => {
    const f = fakePi();
    await expect(f.tools.get("present").execute("call-3", { blocks: [] }, undefined, undefined, f.ctx)).rejects.toThrow(/Nothing to present/);
  });

  it("passes renderer notes back when the document is sloppy", async () => {
    const f = fakePi();
    const result = await f.tools.get("present").execute("call-4", { takeaway: { text: "ok" }, blocks: [{ type: "sparkle" }] }, undefined, undefined, f.ctx);
    expect(result.content[0].text).toContain('unknown block type "sparkle"');
  });

  it("renders results inline: glance collapsed, scan expanded, never wider than the terminal", async () => {
    const f = fakePi();
    const tool = f.tools.get("present");
    const result = { content: [{ type: "text", text: "" }], details: { document: repoReview } };
    for (const width of [60, 100, 140]) {
      const glance = tool.renderResult(result, { expanded: false, isPartial: false }, theme, { isError: false }).render(width);
      for (const line of glance) expect(visibleWidth(line)).toBeLessThanOrEqual(width);
      expect(glance.join("\n")).toContain("DON'T SHIP YET");
      expect(glance.join("\n")).not.toContain("PAYMENT RETRY QUEUE");
      const scan = tool.renderResult(result, { expanded: true, isPartial: false }, theme, { isError: false }).render(width);
      expect(scan.join("\n")).toContain("PAYMENT RETRY QUEUE");
    }
  });

  it("previews the presentation while arguments stream in", () => {
    const f = fakePi();
    const tool = f.tools.get("present");
    const partial = tool.renderCall({ title: "Release", takeaway: { text: "Don't ship" }, blocks: [] }, theme, { argsComplete: false });
    expect(stripAnsi(partial.render(80).join("\n"))).toContain("DON'T SHIP");
    const empty = tool.renderCall({}, theme, { argsComplete: false });
    expect(empty.render(80).join("\n")).toContain("composing presentation");
    const done = tool.renderCall(repoReview, theme, { argsComplete: true });
    expect(done.render(80)).toEqual([]);
  });
});

describe("/present command", () => {
  it("switches modes and persists them", async () => {
    const f = fakePi();
    const cmd = f.commands.get("present");
    await cmd.handler("off", f.ctx);
    expect(f.active()).not.toContain("present");
    expect(f.entries.at(-1)).toEqual({ customType: "agent-present-mode", data: { mode: "off" } });
    await cmd.handler("on", f.ctx);
    expect(f.active()).toContain("present");
    await cmd.handler("always", f.ctx);
    const event = { systemPromptOptions: { promptGuidelines: [] as string[] } };
    await f.emit("before_agent_start", event);
    expect(event.systemPromptOptions.promptGuidelines).toContain(ALWAYS_GUIDELINE);
  });

  it("restores mode and the last presentation on session start", async () => {
    const f = fakePi();
    f.branch.push({ type: "custom", customType: "agent-present-mode", data: { mode: "off" } });
    f.branch.push({ type: "message", message: { role: "toolResult", toolName: "present", details: { document: repoReview } } });
    await f.emit("session_start");
    expect(f.active()).not.toContain("present");
    await f.commands.get("present").handler("act 1", f.ctx);
    expect(f.userMessages[0].text).toContain("Fix the users migration");
  });

  it("/present act on an expand action opens the explorer at the target block", async () => {
    const f = fakePi();
    await f.commands.get("present").handler("demo repo-review", f.ctx);
    let rendered = "";
    f.ctx.ui.custom.mockImplementation(async (factory: any) => {
      const tui = { terminal: { rows: 40 }, requestRender: () => {} };
      const explorer = factory(tui, { ...theme, fg: (_c: string, t: string) => t }, {}, () => {});
      rendered = stripAnsi(explorer.render(110).join("\n"));
      return undefined;
    });
    await f.commands.get("present").handler("act explain", f.ctx);
    expect(f.ctx.ui.custom).toHaveBeenCalledTimes(1);
    expect(rendered).toContain("EXPLORE");
    expect(rendered).toContain("WHY THE MIGRATION");
    expect(f.userMessages).toHaveLength(0);
  });

  it("shows demos as TUI-only entries", async () => {
    const f = fakePi();
    await f.commands.get("present").handler("demo comparison", f.ctx);
    expect(f.entries.at(-1)?.customType).toBe("agent-present");
    const view = f.entryRenderers.get("agent-present")(f.entries.at(-1), { expanded: false }, theme);
    expect(stripAnsi(view.render(100).join("\n"))).toContain("PICK STRIX HALO");
    await f.commands.get("present").handler("demo nope", f.ctx);
    expect(f.notifications.at(-1)).toContain('Unknown demo "nope"');
  });

  it("offers completions", () => {
    const f = fakePi();
    const complete = f.commands.get("present").getArgumentCompletions;
    expect(complete("al").map((i: any) => i.value)).toEqual(["always"]);
    expect(complete("demo re").map((i: any) => i.value)).toEqual(["demo repo-review", "demo research"]);
  });

  it("/present last converts the previous prose answer with one model call", async () => {
    const f = fakePi();
    f.branch.push({ type: "message", message: { role: "assistant", content: [{ type: "text", text: "The build is green: 120 tests pass." }] } });
    f.ctx.modelRegistry.complete.mockResolvedValue({
      stopReason: "stop",
      content: [{ type: "text", text: '```json\n{"takeaway":{"text":"Build green","status":"good"},"blocks":[{"type":"metric","label":"tests","value":120}]}\n```' }],
    });
    await f.commands.get("present").handler("last", f.ctx);
    expect(f.ctx.modelRegistry.complete).toHaveBeenCalledTimes(1);
    expect(f.entries.at(-1)?.data.document.takeaway.text).toBe("Build green");
  });
});

describe("compatibility transform", () => {
  it("extracts JSON from fenced or chatty replies", () => {
    expect(extractJson('Sure!\n```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson('here: {"b":2} done')).toEqual({ b: 2 });
    expect(() => extractJson("no json")).toThrow();
  });

  it("asks the model to repair schema errors once", async () => {
    const replies = ['{"blocks":[{"type":"metric","label":"x"}]}', '{"blocks":[{"type":"metric","label":"x","value":3}]}'];
    const complete = vi.fn(async () => replies.shift()!);
    const { doc } = await transformToPresent("x is 3", complete);
    expect(complete).toHaveBeenCalledTimes(2);
    expect(doc.blocks[0]).toMatchObject({ type: "metric", value: 3 });
  });

  it("finds the last assistant text, skipping tool-only messages", () => {
    const text = lastAssistantText([
      { type: "message", message: { role: "assistant", content: [{ type: "text", text: "first" }] } },
      { type: "message", message: { role: "assistant", content: [{ type: "toolCall" }] } },
    ]);
    expect(text).toBe("first");
  });
});
