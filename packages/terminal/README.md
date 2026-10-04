# @agent-present/terminal

The reference terminal renderer for the Present spec. It is responsive (it adapts layouts rather than truncating), has an ASCII mode, keeps meaning in monochrome, and guarantees no line exceeds the width you give it.

```ts
import { renderDocument, ansiStyle, plainStyle } from "@agent-present/terminal";

renderDocument(doc, { width: 100 });                                 // glance, truecolor
renderDocument(doc, { width: 60, depth: "scan" });                   // stacked layouts
renderDocument(doc, { width: 100, unicode: false, style: plainStyle() }); // ASCII, no colour
```

Bring your own colours by implementing `Style` (`fg(role, text)`, `bold`, `italic`). Roles are semantic: `good`, `warning`, `critical`, `accent`, `muted`…

## CLI

```bash
present-render doc.json [--depth glance|scan|explore] [--width 80] [--ascii] [--no-color] [--validate]
cat doc.json | present-render
```

Part of [Agent Present](../../README.md).
