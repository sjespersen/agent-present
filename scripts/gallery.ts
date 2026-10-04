// Renders the canonical examples to PNG screenshots in gallery/.
//   npm run build && npm run gallery
import { readdirSync, readFileSync } from "node:fs";
import { renderDocument, ansiStyle, wrap } from "@agent-present/terminal";
import { ansiToHtml, page, screenshot, terminalWindow, withBrowser } from "./lib/screenshot.ts";

const root = new URL("../", import.meta.url);
const examples = readdirSync(new URL("examples/", root))
  .filter((f) => f.endsWith(".json"))
  .map((f) => ({ name: f.replace(/\.json$/, ""), doc: JSON.parse(readFileSync(new URL(`examples/${f}`, root), "utf8")) }));
const out = (name: string) => new URL(`gallery/${name}.png`, root).pathname;
const style = ansiStyle();

await withBrowser(async (browser) => {
  for (const { name, doc } of examples) {
    const lines = renderDocument(doc, { width: 100, style, hints: ["ctrl+o scan", "alt+e explore"] });
    await screenshot(browser, page(terminalWindow(ansiToHtml(lines), `present · ${name}`)), out(name));
    console.log(`gallery/${name}.png`);
  }

  const review = examples.find((e) => e.name === "repo-review")!.doc;
  const variants: [string, Parameters<typeof renderDocument>[1]][] = [
    ["repo-review-scan", { width: 100, depth: "scan", style }],
    ["repo-review-narrow", { width: 60, style }],
    ["repo-review-wide", { width: 150, depth: "scan", style }],
    ["repo-review-ascii", { width: 100, unicode: false, style }],
  ];
  for (const [name, options] of variants) {
    await screenshot(browser, page(terminalWindow(ansiToHtml(renderDocument(review, options)), `present · ${name.replace("repo-review-", "")}`)), out(name));
    console.log(`gallery/${name}.png`);
  }

  // before / after
  for (const name of ["repo-review", "architecture", "debugging"]) {
    const before = readFileSync(new URL(`examples/before/${name}.md`, root), "utf8").replace(/`/g, "");
    const beforeLines = before.split("\n").flatMap((p) => (p.trim() ? wrap(p, 70) : [""]));
    const doc = examples.find((e) => e.name === name)!.doc;
    const after = renderDocument(doc, { width: 86, style, actions: false });
    const body = `<div class="cols">
      <div><div class="label">BEFORE · ${before.split(/\s+/).length} WORDS</div>${terminalWindow(ansiToHtml(beforeLines.map((l) => `\x1b[38;2;170;170;170m${l}\x1b[39m`)), "agent")}</div>
      <div><div class="label">AFTER · AGENT PRESENT</div>${terminalWindow(ansiToHtml(after), "agent + present")}</div>
    </div>`;
    await screenshot(browser, page(body), out(`before-after-${name}`));
    console.log(`gallery/before-after-${name}.png`);
  }
});
