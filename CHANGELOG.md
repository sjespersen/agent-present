# Changelog

## 0.1.0 — unreleased

First release: Present spec 0.1 and the Pi reference host.

- **Present spec 0.1** and its JSON Schema: 16 semantic primitives, takeaway, actions, detail, evidence, sources and speech.
- **@agent-present/core**: types, validator with precise paths, lenient normalizer, speech/outline helpers, prose metrics.
- **@agent-present/terminal**: responsive renderer (Glance / Scan / Explore), layered graph layout, charts, oversized numerals, ASCII and monochrome modes, `present-render` CLI.
- **Agent Present for Claude Code** (`packages/claude-code`): a function-hooks mod. It adds the `present` tool, draws presentations in the transcript in theme colours, and ends the turn after a final presentation (headless runs print it as plain text). It also adds a live progress band, an action band, an explorer pane, and the `/present` commands, including `/present last`. The repository is a Claude Code plugin marketplace: `claude plugin marketplace add sjespersen/agent-present`.
- **@agent-present/pi**: `present` tool with model guidance and turn termination, inline rendering, `ctrl+o` scan, `alt+e` explorer, `/present` commands, progress widget, `/present last` compatibility mode.
