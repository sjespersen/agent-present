import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@agent-present/core": fileURLToPath(new URL("./packages/core/src/index.ts", import.meta.url)),
      "@agent-present/terminal": fileURLToPath(new URL("./packages/terminal/src/index.ts", import.meta.url)),
    },
  },
  test: {
    include: ["packages/*/test/**/*.test.ts"],
  },
});
