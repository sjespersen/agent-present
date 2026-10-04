import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

export const EXAMPLES_DIR = fileURLToPath(new URL("../../../examples/", import.meta.url));

export function loadExamples(): { name: string; doc: Record<string, unknown> }[] {
  return readdirSync(EXAMPLES_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => ({ name: f.replace(/\.json$/, ""), doc: JSON.parse(readFileSync(join(EXAMPLES_DIR, f), "utf8")) }));
}
