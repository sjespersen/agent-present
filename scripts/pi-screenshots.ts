// Turns captures from scripts/capture-pi.py into PNGs for the gallery.
//   node --experimental-strip-types scripts/pi-screenshots.ts <capture-dir> <name>:<from-text>[:<to-text>] ...
// Rows are cropped from the first row containing <from-text> to the row before <to-text> (or the end).
import { readFileSync } from "node:fs";
import { cellsToHtml, page, screenshot, terminalWindow, withBrowser } from "./lib/screenshot.ts";

const [dir, ...specs] = process.argv.slice(2);
await withBrowser(async (browser) => {
  for (const spec of specs) {
    const [name, from = "", to] = spec.split(":");
    const capture = JSON.parse(readFileSync(`${dir}/${name}.json`, "utf8"));
    const rows: string[] = capture.cells.map((r: [string][]) => r.map((c) => c[0]).join(""));
    const start = Math.max(0, rows.findIndex((r) => from && r.includes(from)));
    const endIndex = to ? rows.findIndex((r, i) => i > start && r.includes(to)) : -1;
    const end = endIndex > 0 ? endIndex : rows.length;
    const out = new URL(`../gallery/pi-${name}.png`, import.meta.url).pathname;
    await screenshot(browser, page(terminalWindow(cellsToHtml(capture, start, end), "pi")), out);
    console.log(`gallery/pi-${name}.png`);
  }
});
