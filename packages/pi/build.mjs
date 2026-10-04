// Bundles the extension (including @agent-present/core and /terminal) into one file.
// Pi provides its own packages at runtime, so those stay external.
import { build } from "esbuild";

await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.js",
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node20",
  external: ["@earendil-works/*", "typebox"],
  legalComments: "none",
  banner: { js: "// Agent Present for Pi — https://github.com/sjespersen/agent-present (MIT). Generated file; edit packages/pi/src." },
  logLevel: "warning",
});
console.log("built dist/index.js");
