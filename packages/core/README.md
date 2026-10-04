# @agent-present/core

Present IR 0.1 for TypeScript: types, the JSON Schema, a validator, a lenient normalizer and semantic helpers. Zero dependencies, no rendering.

```ts
import { validate, normalize, deriveSpeech, outline, presentToolSchema } from "@agent-present/core";

validate(doc);            // { valid, errors: [{ path, message }], warnings }
normalize(doc);           // canonical document: ids, priorities, repaired statuses/numbers, unknown blocks → fallbacks
deriveSpeech(normalize(doc)); // "Don't ship yet. 2 blockers remain. I can fix migration."
presentToolSchema();      // JSON Schema for an agent tool call (no $ref, version optional)
```

See the [specification](../../specification/README.md). Part of [Agent Present](../../README.md).
