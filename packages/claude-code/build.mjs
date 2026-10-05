// Bundles Agent Present (core + terminal renderer + model instructions + demos)
// into hooks/present.js: one dependency-free ES module the hooks module imports.
// A hooks module runs without Node, so the bundle targets a neutral platform.
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");

await build({
  entryPoints: [join(here, "src/lib.ts")],
  outfile: join(here, "hooks/present.js"),
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "es2022",
  alias: {
    "@agent-present/core": join(root, "packages/core/src/index.ts"),
    "@agent-present/terminal": join(root, "packages/terminal/src/index.ts"),
  },
  legalComments: "none",
  banner: { js: "// Agent Present for Claude Code — https://github.com/sjespersen/agent-present (MIT). Generated file; edit packages/claude-code/src." },
  logLevel: "warning",
});
console.log("built hooks/present.js");

// `node build.mjs --install <dir>` copies the finished plugin to <dir>/agent-present.
const flag = process.argv.indexOf("--install");
if (flag > 0) {
  const target = join(resolve(process.argv[flag + 1]), "agent-present");
  rmSync(join(target, "hooks"), { recursive: true, force: true });
  rmSync(join(target, "tests"), { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  for (const part of [".claude-plugin/plugin.json", "hooks", "types", "tests", "README.md", "LICENSE"]) {
    cpSync(join(here, part), join(target, part), { recursive: true });
  }
  console.log(`installed to ${target}`);
}
