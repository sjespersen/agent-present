# Present IR 0.1

**Status:** draft · **Schema:** [`present-ir.schema.json`](present-ir.schema.json) · **Primitives:** [index](primitives/INDEX.md)

Present IR is a declarative, JSON-serializable description of **how information should be communicated to a human**. It describes the *meaning* of a presentation — a verdict, a comparison, a causal chain, a risk — and leaves layout to renderers.

```
AG-UI       "How does the agent talk to the frontend?"
A2UI        "Which UI components should the frontend render?"
PRESENT IR  "How should this INFORMATION be communicated to a human?"
```

Present IR is not a transport and not a component catalogue. A Present document can travel over AG-UI, MCP or a plain tool call, and could be compiled into A2UI components. It sits one level higher: information semantics.

## Design rules

1. **Meaning before layout.** A document says `{"type": "comparison", "winner": "strix"}`, never `{"width": 42, "border": "rounded"}`. Renderers own widths, colours, borders and arrangement.
2. **Glance → Scan → Explore.** Every document has three depths. The *glance* (5–10 seconds) answers: what happened, is it good or bad, what matters most, do I need to act? *Scan* (~30 s) adds supporting visuals. *Explore* holds prose, evidence, sources and raw data.
3. **Prose is the fallback.** If five sentences describe relationships that five nodes and four edges could show, the document should contain the graph.
4. **One dominant message.** `takeaway` carries it. Avoid card soup.
5. **Monochrome first.** Status is always conveyed by glyph or position as well as colour.
6. **Forwards compatible.** Unknown block types must degrade to a readable textual fallback, never a renderer failure.

## Document

```json
{
  "present": "0.1",
  "title": "Release readiness",
  "subtitle": "v2.8.0",
  "intent": "decision",
  "takeaway": { "status": "warning", "text": "Ready with two blockers", "detail": "migration not applied", "value": 87, "unit": "%" },
  "blocks": [],
  "actions": [],
  "detail": { "markdown": "…" },
  "evidence": [],
  "sources": [],
  "speech": { "summary": "…" }
}
```

The minimum valid document is `{"present": "0.1", "blocks": []}`.

| field | meaning |
|---|---|
| `present` | Version string. Renderers accept any `0.x` and render best-effort. |
| `title`, `subtitle` | Short identification, e.g. `Release` / `v2.8.0`. |
| `intent` | `decision · assessment · explanation · comparison · diagnosis · plan · status · progress · research · summary`. `progress` marks interim work that hosts may show temporarily. |
| `takeaway` | The single dominant message. `value`/`unit` is an optional headline number renderers may draw oversized. |
| `blocks` | Visual primitives, most important first. |
| `actions` | Next steps the user can trigger (see below). |
| `detail` | Long-form Markdown (`markdown` and/or `sections`). Shown only on explore. |
| `evidence`, `sources` | Supporting material for explore. |
| `speech` | An optional spoken briefing. When absent, renderers derive one: *speak the conclusion, show the structure.* |

### Status

Everything that is good or bad carries a `status`: `good · warning · critical · info · neutral`. Renderers map status to colour **and** a glyph (✓ ▲ ✕ ● ○ in the reference renderer).

## Blocks

Every block has a `type` and may carry these common fields:

| field | meaning |
|---|---|
| `id` | Stable id; actions can target it. |
| `title` | Short section label, e.g. `Risk map`. |
| `priority` | `primary` (glance) · `secondary` (scan) · `detail` (explore). Default: the first four blocks are primary. |
| `emphasis` | `strong · normal · subtle` — a semantic hint, not a style. |
| `density` | `compact · normal · comfortable` — e.g. a compact flow may render inline. |
| `detail` | Markdown shown on explore. |
| `sources` | `[{label, ref, location}]`. |

The v0.1 vocabulary is deliberately small:

| primitive | use for |
|---|---|
| [`verdict`](primitives/verdict.md) | conclusions, diagnoses, recommendations, decisions |
| [`metric`](primitives/metric.md) | one number made meaningful (scale, trend, delta) |
| [`metrics`](primitives/metrics.md) | 2–6 related measures |
| [`comparison`](primitives/comparison.md) | explicit trade-offs with a pick |
| [`flow`](primitives/flow.md) | processes, pipelines, causal chains |
| [`architecture`](primitives/architecture.md) | systems, dependencies, trust boundaries |
| [`timeline`](primitives/timeline.md) | chronology |
| [`trend`](primitives/trend.md) | change over time |
| [`distribution`](primitives/distribution.md) | quantities; parts of a whole |
| [`risk`](primitives/risk.md) | impact × likelihood |
| [`hierarchy`](primitives/hierarchy.md) | trees |
| [`checklist`](primitives/checklist.md) | completion state |
| [`evidence`](primitives/evidence.md) | a claim and what supports it |
| [`change`](primitives/change.md) | code change impact |
| [`progress`](primitives/progress.md) | work in progress |
| [`text`](primitives/text.md) | constrained prose (≈240 characters) |

Each primitive page lists its fields and shows the reference terminal rendering in Unicode and ASCII. Minimal documents for every primitive live in [`examples/`](examples/).

## Actions

```json
{ "id": "fix", "label": "Fix migration", "intent": "agent", "prompt": "Fix the migration problem identified above." }
{ "id": "why", "label": "Explain", "intent": "expand", "target": "migration-evidence" }
```

| intent | effect |
|---|---|
| `agent` | Send `prompt` back to the agent. Closes the loop between presentation and agency. |
| `expand` | Reveal the block with id `target`. |
| `copy` | Copy `value`. |
| `open` | Open `value` (a URL or path). |

Terminal: `[1] fix migration  [2] explain`. Web: buttons. Voice: *"I can fix the migration or explain the problem."*

## Information budget

Renderers should actively fight overload at the glance depth:

- at most one dominant takeaway and five visible blocks;
- roughly twelve lines of text excluding graphics, at most three sentences of prose;
- no paragraph longer than three lines; `text` collapses after ≈240 characters;
- no prose that repeats what a visual already encodes.

Blocks beyond the budget collapse into a one-line "+ N more" summary that names them.

## Graceful degradation

Documents must not require colour, Unicode beyond a declared level, interactivity, special fonts or graphics protocols. The reference renderer has a pure ASCII mode (`[####----] 50%`). Unknown block types render as:

```
[ unsupported visualization: dependency-map ]
Auth -> API
API -> Database
```

## Validation and normalization

`@agent-present/core` validates against this schema and normalizes leniently: status synonyms (`ok`, `fail`, `warn`…), number strings (`"87%"`), stringified arrays, aliased block types (`kpi`, `steps`, `tree`…), comparison values keyed by option id, and flows without edges. Agents are imperfect JSON authors; a renderer should repair what it can and degrade what it cannot.

## Versioning

0.x evolves quickly. Documents declare `"present": "0.1"`; renderers accept any `0.x`, warn on other majors, and always prefer rendering something over failing.
