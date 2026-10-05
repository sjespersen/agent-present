# Agent Present for Claude Code

**Don't make me read.** A Claude Code mod that lets Claude answer with native terminal infographics (verdicts, comparisons, flows, risks, trends) instead of walls of Markdown.

It is the [Pi extension](../pi) ported to Claude Code's function hooks, using the same Present spec and terminal renderer.

## Install

```bash
claude plugin marketplace add sjespersen/agent-present
claude plugin install agent-present@agent-present
```

Or load the plugin folder for one session:

```bash
npm install && npm run build -w @agent-present/claude-code
claude --plugin-dir packages/claude-code
```

## What it does

- **A `present` tool** (`mcp__agent-present__present`). When an answer has structure, Claude calls it with a Present document. The presentation is drawn in place of the tool's row in the transcript, and the tool's result row is hidden.
- **No duplicate answers.** A final presentation ends the turn: the next model request is never sent, so Claude cannot follow the graphic with the same content again in prose. The model also gets the document's outline back, so it knows what you saw.
- **Live progress.** A call with `intent: "progress"` doesn't end the turn. It shows a live status band above the prompt, which clears when the turn ends.
- **Actions.** After a presentation, a band above the prompt offers its actions: send a prompt to Claude, copy a value, open a link, or open the explorer. Press `ctrl+x tab` to focus the band, then a digit to run an action.
- **Explorer.** `/present view` opens a pane with the last presentation. It switches between glance, scan and explore depths and the raw JSON (`g` `s` `x` `r`), copies the presentation as text (`c`), and runs actions (`1`–`9`).

## Commands

| command | |
|---|---|
| `/present` | Shows the current mode and usage. |
| `/present auto` (or `on`) | Claude presents when structure helps. This is the default. |
| `/present always` | Every substantive answer becomes a presentation. |
| `/present off` | Hides the tool behind ToolSearch and refuses calls to it, so Claude answers in plain text. |
| `/present last` | **Compatibility mode:** converts the previous prose answer into a presentation with one model call. |
| `/present demo [name\|all]` | Shows a showcase without spending any tokens: `repo-review`, `architecture`, `comparison`, `debugging`, `research`, `timeline`, `progress`. |
| `/present view` · `/present raw` | Opens the explorer, on the raw document for `raw`. |
| `/present act <n\|id>` | Runs action *n* of the last presentation. |

The mode is kept for the session.

## Development

```bash
npm run build -w @agent-present/claude-code           # bundle core + renderer into hooks/present.js
claude plugin validate packages/claude-code            # what the engine will load
claude plugin test packages/claude-code                # hook tests against the engine (tests/)
npx vitest --run packages/claude-code                  # bundle unit tests (test/)
node packages/claude-code/build.mjs --install <dir>    # copy the built mod to <dir>/agent-present
```

`src/lib.ts` is the bundle's entry point. Hooks modules run without Node and draw elements, not ANSI strings, so `lib.ts` drives the terminal renderer with a style that encodes semantic roles as private escape codes. `toSegments` then turns each line back into styled runs. `hooks/register.tsx` draws those runs as nested `Text` elements and colours them with theme keys (`success`, `warning`, `error`, …), so presentations follow your Claude Code theme.
