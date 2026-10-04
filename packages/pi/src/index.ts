/**
 * Agent Present for Pi — "Don't make me read."
 *
 * Registers a `present` tool the agent uses to answer with native visual
 * presentations, renders them inline in the transcript (Glance; Ctrl+O for
 * Scan), and offers a full-screen explorer, demos and a compatibility mode
 * that converts ordinary prose answers.
 */
import {
  formatIssues,
  normalize,
  outline,
  presentToolSchema,
  validate,
  type Action,
  type NormalizedDocument,
} from "@agent-present/core";
import {
  copyToClipboard,
  keyText,
  type ExtensionAPI,
  type ExtensionCommandContext,
  type ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { Container, Text } from "@earendil-works/pi-tui";
import { DEMOS } from "./demos.js";
import {
  ALWAYS_GUIDELINE,
  PROMPT_GUIDELINES,
  PROMPT_SNIPPET,
  TOOL_DESCRIPTION,
  TOOL_NAME,
} from "./instructions.js";
import { lastAssistantText, transformToPresent } from "./transform.js";
import { Explorer, PresentView, type ExplorerResult } from "./view.js";

export type PresentMode = "auto" | "always" | "off";

const MODE_ENTRY = "agent-present-mode";
const PRESENTATION_ENTRY = "agent-present";
const PROGRESS_WIDGET = "agent-present-progress";
const EXPLORE_SHORTCUT = "alt+e";

interface PresentDetails {
  document: unknown;
  warnings?: string[];
}

interface Presentation {
  raw: unknown;
  doc: NormalizedDocument;
}

function expandKey(): string {
  try {
    return keyText("app.tools.expand") || "ctrl+o";
  } catch {
    return "ctrl+o";
  }
}

function hints(expanded: boolean, doc: NormalizedDocument): string[] {
  const out = [`${expandKey()} ${expanded ? "glance" : "scan"}`, `${EXPLORE_SHORTCUT} explore`];
  if (doc.actions.length) out.push(`${EXPLORE_SHORTCUT} then 1-${Math.min(9, doc.actions.length)} to act`);
  return out;
}

export default function agentPresent(pi: ExtensionAPI): void {
  let mode: PresentMode = "auto";
  let last: Presentation | undefined;

  // ─── state ────────────────────────────────────────────────────────────────

  const applyMode = (next: PresentMode) => {
    mode = next;
    const active = pi.getActiveTools();
    const has = active.includes(TOOL_NAME);
    if (mode === "off" && has) pi.setActiveTools(active.filter((t) => t !== TOOL_NAME));
    if (mode !== "off" && !has) pi.setActiveTools([...active, TOOL_NAME]);
  };

  const restore = (ctx: ExtensionContext) => {
    mode = "auto";
    last = undefined;
    for (const entry of ctx.sessionManager.getBranch()) {
      if (entry.type === "custom" && entry.customType === MODE_ENTRY) {
        const m = (entry.data as { mode?: PresentMode } | undefined)?.mode;
        if (m === "auto" || m === "always" || m === "off") mode = m;
      }
      if (entry.type === "custom" && entry.customType === PRESENTATION_ENTRY) {
        const raw = (entry.data as PresentDetails | undefined)?.document;
        if (raw) last = { raw, doc: normalize(raw) };
      }
      if (entry.type === "message" && entry.message.role === "toolResult" && entry.message.toolName === TOOL_NAME) {
        const raw = (entry.message.details as PresentDetails | undefined)?.document;
        if (raw && !entry.message.isError) last = { raw, doc: normalize(raw) };
      }
    }
    applyMode(mode);
  };

  pi.on("session_start", (_event, ctx) => restore(ctx));

  pi.on("before_agent_start", (event) => {
    if (mode !== "always") return;
    const guidelines = event.systemPromptOptions.promptGuidelines;
    if (guidelines && !guidelines.includes(ALWAYS_GUIDELINE)) guidelines.push(ALWAYS_GUIDELINE);
  });

  pi.on("agent_end", (_event, ctx) => {
    if (ctx.hasUI) ctx.ui.setWidget(PROGRESS_WIDGET, undefined);
  });

  // ─── the present tool ─────────────────────────────────────────────────────

  pi.registerTool({
    name: TOOL_NAME,
    label: "Present",
    description: TOOL_DESCRIPTION,
    promptSnippet: PROMPT_SNIPPET,
    promptGuidelines: PROMPT_GUIDELINES,
    // Plain JSON Schema: Pi validates it directly, and it is the same schema the spec publishes.
    parameters: presentToolSchema() as never,
    renderShell: "self",

    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const raw = { present: "0.1", ...(params as Record<string, unknown>) };
      const result = validate(raw);
      const doc = normalize(raw);
      if (!doc.blocks.length && !doc.takeaway) {
        throw new Error(`Nothing to present: give a takeaway or at least one block.\n${formatIssues(result.errors)}`);
      }
      const warnings = [...result.errors, ...result.warnings].map((i) => `${i.path || "(root)"}: ${i.message}`);
      const progress = doc.intent === "progress";

      if (progress) {
        if (ctx.hasUI && ctx.mode === "tui") {
          ctx.ui.setWidget(PROGRESS_WIDGET, (_tui, theme) => new PresentView(doc, theme, { depth: "glance", margin: 1 }));
        }
      } else {
        last = { raw, doc };
        if (ctx.hasUI) ctx.ui.setWidget(PROGRESS_WIDGET, undefined);
      }

      const text = progress
        ? "Progress shown to the user. Keep working, then finish with a final present call."
        : `Presented to the user as a visual infographic. Do not repeat it in prose; end your turn or add at most one short sentence.\n\n${outline(doc)}`;
      return {
        content: [{ type: "text", text: warnings.length ? `${text}\n\nRenderer notes:\n${warnings.join("\n")}` : text }],
        details: { document: raw, warnings } satisfies PresentDetails,
        terminate: !progress,
      };
    },

    renderCall(args, theme, context) {
      // While arguments stream in, preview the presentation as it is being composed.
      if (!context.argsComplete) {
        try {
          const doc = normalize({ present: "0.1", ...(args as Record<string, unknown>) });
          if (doc.blocks.length || doc.takeaway) {
            const view = (context.lastComponent instanceof PresentView ? context.lastComponent : undefined) ?? new PresentView(doc, theme, { depth: "glance" });
            view.update(doc, { depth: "glance", hints: ["composing…"] });
            return view;
          }
        } catch {
          // fall through to the placeholder
        }
        return new Text(theme.fg("dim", " ◌ composing presentation…"), 0, 0);
      }
      return new Container();
    },

    renderResult(result, { expanded, isPartial }, theme, context) {
      if (isPartial) return new Text(theme.fg("dim", " ◌ presenting…"), 0, 0);
      if (context.isError) {
        const message = result.content.find((c) => c.type === "text");
        return new Text(theme.fg("error", ` present failed: ${message && "text" in message ? message.text.split("\n")[0] : "invalid document"}`), 0, 0);
      }
      const details = result.details as PresentDetails | undefined;
      if (!details?.document) return new Container();
      const doc = normalize(details.document);
      if (doc.intent === "progress") {
        return new Text(theme.fg("dim", ` ◐ ${doc.title ?? "progress"} updated`), 0, 0);
      }
      const options = { depth: expanded ? ("scan" as const) : ("glance" as const), hints: hints(expanded, doc) };
      const view = context.lastComponent instanceof PresentView ? context.lastComponent : new PresentView(doc, theme, options);
      view.update(doc, options);
      return view;
    },
  });

  // Presentations created by /present demo and /present last are TUI-only entries.
  pi.registerEntryRenderer<PresentDetails>(PRESENTATION_ENTRY, (entry, { expanded }, theme) => {
    if (!entry.data?.document) return undefined;
    const doc = normalize(entry.data.document);
    return new PresentView(doc, theme, { depth: expanded ? "scan" : "glance", hints: hints(expanded, doc) });
  });

  const showPresentation = (raw: unknown) => {
    const doc = normalize(raw);
    last = { raw, doc };
    pi.appendEntry(PRESENTATION_ENTRY, { document: raw } satisfies PresentDetails);
  };

  // ─── explorer & actions ───────────────────────────────────────────────────

  const runAction = async (action: Action, ctx: ExtensionContext) => {
    if (action.intent === "expand") {
      await openExplorer(ctx, { target: action.target });
    } else if (action.intent === "agent") {
      const prompt = action.prompt ?? action.label;
      if (ctx.isIdle()) pi.sendUserMessage(prompt);
      else pi.sendUserMessage(prompt, { deliverAs: "followUp" });
    } else if (action.intent === "open" && action.value) {
      const opener = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
      await pi.exec(opener, [action.value]);
    } else if (action.intent === "copy") {
      await copyToClipboard(action.value ?? action.label);
      if (ctx.hasUI) ctx.ui.notify(`Copied ${action.label}`, "info");
    }
  };

  const openExplorer = async (ctx: ExtensionContext, start: { raw?: boolean; target?: string } = {}) => {
    if (!last) {
      if (ctx.hasUI) ctx.ui.notify("No presentation yet. Try /present demo", "warning");
      return;
    }
    if (ctx.mode !== "tui") {
      if (ctx.hasUI) ctx.ui.notify("The explorer needs the interactive TUI", "warning");
      return;
    }
    const current = last;
    const result = await ctx.ui.custom<ExplorerResult>(
      (tui, theme, _keybindings, done) => {
        const explorer = new Explorer(
          current.doc,
          current.raw,
          theme,
          () => Math.floor(tui.terminal.rows * 0.9),
          () => tui.requestRender(),
          done,
          (text) => copyToClipboard(text),
        );
        if (start.raw) explorer.handleInput("r");
        if (start.target) explorer.reveal(start.target);
        return explorer;
      },
      { overlay: true, overlayOptions: { width: "92%", maxHeight: "92%", anchor: "center" } },
    );
    if (result?.action) await runAction(result.action, ctx);
  };

  pi.registerShortcut(EXPLORE_SHORTCUT, {
    description: "Explore the last Agent Present presentation",
    handler: async (ctx) => openExplorer(ctx),
  });

  // ─── commands ─────────────────────────────────────────────────────────────

  const SUBCOMMANDS: { value: string; description: string }[] = [
    { value: "auto", description: "Agent presents when the answer has structure (default)" },
    { value: "on", description: "Same as auto" },
    { value: "always", description: "Agent presents every substantive answer" },
    { value: "off", description: "Disable the present tool" },
    { value: "last", description: "Convert the last plain-text answer into a presentation" },
    { value: "demo", description: "Show a showcase presentation" },
    { value: "view", description: "Explore the last presentation" },
    { value: "raw", description: "Show the raw Present document of the last presentation" },
    { value: "act", description: "Run an action of the last presentation: /present act 1" },
  ];

  const setMode = (next: PresentMode, ctx: ExtensionCommandContext) => {
    applyMode(next);
    pi.appendEntry(MODE_ENTRY, { mode: next });
    const message =
      next === "off"
        ? "Agent Present off — the agent answers in plain text"
        : next === "always"
          ? "Agent Present: always — every substantive answer becomes a presentation"
          : "Agent Present: auto — the agent presents when structure helps";
    if (ctx.hasUI) ctx.ui.notify(message, "info");
  };

  const presentLast = async (ctx: ExtensionCommandContext) => {
    await ctx.waitForIdle();
    const answer = lastAssistantText(ctx.sessionManager.getBranch());
    if (!answer) {
      if (ctx.hasUI) ctx.ui.notify("No assistant answer to present yet", "warning");
      return;
    }
    const model = ctx.model;
    if (!model) {
      if (ctx.hasUI) ctx.ui.notify("No model selected", "error");
      return;
    }
    if (ctx.hasUI) {
      ctx.ui.notify("Presenting the last answer…", "info");
      ctx.ui.setWorkingMessage?.("composing presentation…");
    }
    try {
      const { raw } = await transformToPresent(answer, async (systemPrompt, user) => {
        const reply = await ctx.modelRegistry.complete(model, {
          systemPrompt,
          messages: [{ role: "user", content: [{ type: "text", text: user }], timestamp: Date.now() }],
        });
        if (reply.stopReason === "error") throw new Error(reply.errorMessage ?? "model call failed");
        return reply.content
          .filter((c): c is { type: "text"; text: string } => c.type === "text")
          .map((c) => c.text)
          .join("\n");
      });
      showPresentation(raw);
    } catch (error) {
      if (ctx.hasUI) ctx.ui.notify(`Could not present the last answer: ${(error as Error).message}`, "error");
    } finally {
      if (ctx.hasUI) ctx.ui.setWorkingMessage?.();
    }
  };

  pi.registerCommand("present", {
    description: "Agent Present: on | off | auto | always | last | demo | view | raw | act",
    getArgumentCompletions: (prefix) => {
      const [sub, rest] = prefix.split(/\s+/, 2);
      if (sub === "demo" && rest !== undefined) {
        return ["all", ...Object.keys(DEMOS)].filter((d) => d.startsWith(rest)).map((d) => ({ value: `demo ${d}`, label: d }));
      }
      const items = SUBCOMMANDS.filter((s) => s.value.startsWith(prefix.trim())).map((s) => ({ value: s.value, label: s.value, description: s.description }));
      return items.length ? items : null;
    },
    handler: async (args, ctx) => {
      const [sub = "", ...rest] = args.trim().split(/\s+/).filter(Boolean);
      switch (sub) {
        case "":
        case "status": {
          const tool = pi.getActiveTools().includes(TOOL_NAME) ? "active" : "inactive";
          if (ctx.hasUI) ctx.ui.notify(`Agent Present: ${mode} (tool ${tool}). ${EXPLORE_SHORTCUT} explores the last presentation.`, "info");
          return;
        }
        case "on":
        case "auto":
          return setMode("auto", ctx);
        case "always":
          return setMode("always", ctx);
        case "off":
          return setMode("off", ctx);
        case "last":
          return presentLast(ctx);
        case "view":
        case "explore":
          return openExplorer(ctx);
        case "raw":
          return openExplorer(ctx, { raw: true });
        case "act": {
          const n = Number.parseInt(rest[0] ?? "", 10);
          const action = last?.doc.actions.find((a, i) => a.id === rest[0] || i === n - 1);
          if (!action) {
            if (ctx.hasUI) ctx.ui.notify("No such action on the last presentation", "warning");
            return;
          }
          return runAction(action, ctx);
        }
        case "demo": {
          let name: string | undefined = rest[0];
          if (!name && ctx.hasUI) {
            name = await ctx.ui.select("Agent Present demo", ["all", ...Object.keys(DEMOS)]);
            if (!name) return;
          }
          const names = name === "all" || !name ? Object.keys(DEMOS) : [name];
          for (const n of names) {
            if (!DEMOS[n]) {
              if (ctx.hasUI) ctx.ui.notify(`Unknown demo "${n}". Try: ${Object.keys(DEMOS).join(", ")}`, "warning");
              return;
            }
            showPresentation(DEMOS[n]);
          }
          return;
        }
        default:
          if (ctx.hasUI) ctx.ui.notify(`Unknown subcommand "${sub}". Try /present demo`, "warning");
      }
    },
  });
}
