import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { proseStats } from "@agent-present/core";
import {
  ansiStyle,
  layoutDocument,
  monochromeStyle,
  plainStyle,
  renderDocument,
  renderPlainText,
  stripAnsi,
  visibleWidth,
} from "@agent-present/terminal";
import { loadExamples } from "../../core/test/fixtures.js";

const examples = loadExamples();
const WIDTHS = [40, 60, 80, 100, 120, 160];
const DEPTHS = ["glance", "scan", "explore"] as const;

describe("every example renders within the available width", () => {
  for (const { name, doc } of examples) {
    it(name, () => {
      for (const width of WIDTHS) {
        for (const depth of DEPTHS) {
          for (const unicode of [true, false]) {
            const lines = renderDocument(doc, { width, depth, unicode, style: ansiStyle(), hints: ["ctrl+o scan", "alt+e explore"] });
            expect(lines.length).toBeGreaterThan(0);
            for (const line of lines) {
              expect(visibleWidth(line), `${name} @${width} ${depth} unicode=${unicode}: "${stripAnsi(line)}"`).toBeLessThanOrEqual(width);
              expect(stripAnsi(line)).not.toMatch(/undefined|NaN|\[object Object\]/);
            }
          }
        }
      }
    });
  }
});

describe("graceful degradation", () => {
  it("ASCII mode emits only ASCII", () => {
    for (const { doc } of examples) {
      const text = renderDocument(doc, { width: 100, depth: "explore", unicode: false, style: plainStyle() }).join("\n");
      // the spoken summary uses typographic quotes from the source; everything we draw must be ASCII
      const drawn = text.replace(/[“”’—–…€µ]/g, "");
      expect(drawn).toMatch(/^[\x20-\x7e\n]*$/);
    }
  });

  it("monochrome output keeps meaning through glyphs", () => {
    const doc = examples.find((e) => e.name === "repo-review")!.doc;
    const text = stripAnsi(renderDocument(doc, { width: 100, style: monochromeStyle() }).join("\n"));
    expect(text).toContain("▲ DON'T SHIP YET"); // warning glyph, not just yellow
    expect(text).toContain("✕ users migration"); // critical node
    expect(text).toContain("╳"); // broken link
    expect(text).toContain("█ auth migration"); // risk severity glyph
  });

  it("plain style contains no escape codes", () => {
    const text = renderDocument(examples[0].doc, { width: 100, style: plainStyle() }).join("\n");
    expect(text).not.toContain("\x1b");
  });

  it("unknown block types degrade to a readable fallback", () => {
    const text = renderPlainText({ present: "0.2", blocks: [{ type: "dependency-map", edges: [{ from: "Auth", to: "API" }, { from: "API", to: "Database" }] }] });
    expect(text).toContain("[ unsupported visualization: dependency-map ]");
    expect(text).toContain("Auth -> API");
    expect(text).toContain("API -> Database");
  });

  it("renders an empty document without throwing", () => {
    expect(renderDocument({ present: "0.1", blocks: [] }, { width: 80 })).toEqual([]);
    expect(renderDocument(null, { width: 80 })).toEqual([]);
  });
});

describe("progressive disclosure", () => {
  const doc = examples.find((e) => e.name === "repo-review")!.doc;

  it("glance shows at most five blocks and names what it hid", () => {
    const layout = layoutDocument(doc, { width: 100, style: plainStyle() });
    expect(layout.doc.blocks.length - layout.hidden.length).toBeLessThanOrEqual(5);
    expect(layout.lines.join("\n")).toContain("+ 3 more · payment retry queue · change impact · why the migration");
  });

  it("scan reveals secondary blocks, explore reveals detail, evidence, sources and speech", () => {
    const scan = renderPlainText(doc, { depth: "scan" });
    expect(scan).toContain("PAYMENT RETRY QUEUE");
    expect(scan).not.toContain("DETAIL");
    const explore = renderPlainText(doc, { depth: "explore" });
    expect(explore).toContain("WHY THE MIGRATION");
    expect(explore).toContain("DETAIL");
    expect(explore).toContain("SOURCES");
    expect(explore).toContain("db/migrations/182_add_users_v4_columns.sql");
    expect(explore).toContain("SPOKEN SUMMARY");
  });

  it("clamps over-long verdict and takeaway text instead of printing paragraphs", () => {
    // seen in a live run: the model put a paragraph into verdict.detail
    const detail = "Use tenant_id plus composite indexes. ".repeat(8);
    const doc = { takeaway: { text: "Choose PostgreSQL", detail }, blocks: [{ type: "verdict", text: "Use PostgreSQL", detail, next: detail }] };
    const glance = renderPlainText(doc, { width: 80, depth: "glance" });
    expect(glance.split("\n").length).toBeLessThanOrEqual(10);
    expect(glance).toContain("…");
    expect(renderPlainText(doc, { width: 80, depth: "explore" }).split("\n").length).toBeGreaterThan(10);
  });

  it("long text collapses at a glance", () => {
    const long = "word ".repeat(120);
    const glance = renderPlainText({ blocks: [{ type: "text", text: long }] }, { depth: "glance" });
    expect(glance).toContain("more on explore");
    expect(glance.split("\n").length).toBeLessThanOrEqual(4);
    const explore = renderPlainText({ blocks: [{ type: "text", text: long }] }, { depth: "explore" });
    expect(explore).not.toContain("more on explore");
  });
});

describe("don't make me read", () => {
  it.each(examples.map((e) => [e.name, e.doc]))("%s stays inside the glance information budget", (_name, doc) => {
    const lines = renderDocument(doc, { width: 100, style: plainStyle() });
    const stats = proseStats(lines.join("\n"));
    expect(stats.proseLines).toBeLessThanOrEqual(6);
    expect(stats.proseWords).toBeLessThanOrEqual(40);
    expect(lines.length).toBeLessThanOrEqual(50);
  });

  it.each(["repo-review", "architecture", "debugging", "comparison"])("%s removes at least 60%% of the prose of a conventional answer", (name) => {
    const before = readFileSync(new URL(`../../../examples/before/${name}.md`, import.meta.url), "utf8");
    const doc = examples.find((e) => e.name === name)!.doc;
    const after = renderDocument(doc, { width: 100, style: plainStyle() }).join("\n");
    const b = proseStats(before).proseChars;
    const a = proseStats(after).proseChars;
    expect(1 - a / b).toBeGreaterThanOrEqual(0.6);
  });
});

describe("golden renders", () => {
  for (const { name, doc } of examples) {
    it(name, async () => {
      const text = renderPlainText(doc, { width: 100, depth: "glance" });
      await expect(`${text}\n`).toMatchFileSnapshot(`../../../gallery/text/${name}.txt`);
    });
  }
});
