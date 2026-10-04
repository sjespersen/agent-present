// Emits specification/present.schema.json from the schema authored in @agent-present/core.
import { writeFileSync } from "node:fs";
import { presentSchema } from "@agent-present/core";

const target = new URL("../specification/present.schema.json", import.meta.url);
writeFileSync(target, `${JSON.stringify(presentSchema, null, 2)}\n`);
console.log(`wrote ${target.pathname}`);
