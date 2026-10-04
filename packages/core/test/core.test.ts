import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  deriveSpeech,
  normalize,
  outline,
  parseNumberish,
  presentSchema,
  presentToolSchema,
  proseStats,
  riskSeverity,
  validate,
} from "@agent-present/core";
import { loadExamples } from "./fixtures.js";

const examples = loadExamples();

describe("validate", () => {
  it("accepts the minimum document", () => {
    expect(validate({ present: "0.1", blocks: [] })).toMatchObject({ valid: true, errors: [] });
  });

  it.each(examples.map((e) => [e.name, e.doc]))("accepts example %s", (_name, doc) => {
    const result = validate(doc);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it("reports precise paths for invalid blocks", () => {
    const result = validate({
      present: "0.1",
      blocks: [{ type: "metric", label: "x" }, { type: "risk", items: [{ label: "a", impact: "huge", likelihood: "low" }] }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({ path: "blocks[0].value", message: "is required" });
    expect(result.errors.some((e) => e.path === "blocks[1].items[0].impact")).toBe(true);
  });

  it("rejects non-objects and missing blocks", () => {
    expect(validate("nope").valid).toBe(false);
    expect(validate({ present: "0.1" }).errors).toContainEqual({ path: "blocks", message: "must be an array" });
  });

  it("treats unknown block types as warnings (forwards compatibility)", () => {
    const result = validate({ present: "0.1", blocks: [{ type: "dependency-map", nodes: [] }] });
    expect(result.valid).toBe(true);
    expect(result.warnings[0].message).toMatch(/unknown block type "dependency-map"/);
  });

  it("warns when the glance budget is exceeded", () => {
    const blocks = Array.from({ length: 7 }, (_, i) => ({ type: "text", text: `t${i}` }));
    expect(validate({ present: "0.1", blocks }).warnings.some((w) => w.path === "blocks")).toBe(true);
  });
});

describe("schema", () => {
  it("is in sync with specification/present-ir.schema.json", () => {
    const file = JSON.parse(readFileSync(new URL("../../../specification/present-ir.schema.json", import.meta.url), "utf8"));
    expect(file).toEqual(presentSchema);
  });

  it("tool schema has no $ref (providers reject it) and does not require the version", () => {
    const tool = presentToolSchema();
    expect(JSON.stringify(tool)).not.toContain("$ref");
    expect(tool.required).toEqual(["blocks"]);
    expect((tool.properties as Record<string, unknown>).present).toBeUndefined();
  });
});

describe("normalize", () => {
  it("fills in version, ids and priorities", () => {
    const doc = normalize({ blocks: [{ type: "text", text: "a" }, { type: "text", text: "b" }, { type: "text", text: "c" }, { type: "text", text: "d" }, { type: "text", text: "e" }] });
    expect(doc.present).toBe("0.1");
    expect(doc.blocks.map((b) => b.priority)).toEqual(["primary", "primary", "primary", "primary", "secondary"]);
    expect(new Set(doc.blocks.map((b) => b.id)).size).toBe(5);
  });

  it("repairs sloppy agent output", () => {
    const doc = normalize({
      takeaway: "Ship it",
      blocks: JSON.stringify([
        { type: "kpi", label: "Coverage", value: "87%", status: "passing" },
        { type: "steps", steps: ["build", "test", "deploy"] },
        { type: "list", items: ["one", { label: "two", status: "ok" }] },
      ]),
    });
    expect(doc.takeaway).toEqual({ text: "Ship it" });
    const [metric, flow, checklist] = doc.blocks;
    expect(metric).toMatchObject({ type: "metric", value: 87, unit: "%", status: "good" });
    expect(flow).toMatchObject({ type: "flow", edges: [{ from: "build", to: "test" }, { from: "test", to: "deploy" }] });
    expect(checklist).toMatchObject({ type: "checklist", items: [{ label: "one", state: "pending" }, { label: "two", state: "done" }] });
  });

  it("aligns comparison values keyed by option id and resolves the winner by label", () => {
    const doc = normalize({
      blocks: [
        {
          type: "comparison",
          options: [{ id: "a", label: "Alpha" }, { label: "Beta" }],
          dimensions: [{ label: "Speed", values: { beta: 2, a: 1 } }],
          winner: "Beta",
        },
      ],
    });
    expect(doc.blocks[0]).toMatchObject({ winner: "beta", dimensions: [{ values: [{ value: 1 }, { value: 2 }], better: "higher" }] });
  });

  it("keeps unknown blocks with a textual fallback", () => {
    const doc = normalize({ blocks: [{ type: "dependency-map", edges: [{ from: "Auth", to: "API" }] }] });
    expect(doc.blocks[0]).toMatchObject({ type: "unknown", originalType: "dependency-map", fallback: ["Auth -> API"] });
  });

  it("drops edges that reference unknown nodes and resolves labels", () => {
    const doc = normalize({
      blocks: [{ type: "flow", nodes: [{ id: "a", label: "API" }, { id: "b", label: "DB" }], edges: [{ from: "API", to: "b" }, { from: "a", to: "zzz" }] }],
    });
    expect(doc.blocks[0]).toMatchObject({ edges: [{ from: "a", to: "b" }] });
  });

  it("parses number-ish strings", () => {
    expect(parseNumberish("87%")).toEqual({ value: 87, unit: "%" });
    expect(parseNumberish("1,204")).toEqual({ value: 1204 });
    expect(parseNumberish("32 tok/s")).toEqual({ value: 32, unit: "tok/s" });
    expect(parseNumberish("-12.5ms")).toEqual({ value: -12.5, unit: "ms" });
    expect(parseNumberish("HIGH")).toBeUndefined();
  });

  it("is idempotent", () => {
    for (const { doc } of examples) {
      const once = normalize(doc);
      expect(normalize(once)).toEqual(once);
    }
  });
});

describe("semantics", () => {
  it("scores risk on impact × likelihood", () => {
    expect(riskSeverity("high", "high")).toBe("critical");
    expect(riskSeverity("high", "medium")).toBe("warning");
    expect(riskSeverity("medium", "medium")).toBe("neutral");
  });

  it("derives speech that states the conclusion, not the diagram", () => {
    const doc = normalize({ takeaway: { text: "DON'T SHIP YET", detail: "2 blockers" }, blocks: [], actions: [{ id: "f", label: "Fix migration", intent: "agent" }] });
    expect(deriveSpeech(doc)).toBe("Don't ship yet. 2 blockers. I can fix migration.");
  });

  it("outlines a document for the model", () => {
    const text = outline(normalize(examples.find((e) => e.name === "repo-review")!.doc));
    expect(text).toContain("Takeaway [warning]: Don't ship yet — 2 blockers remain");
    expect(text).toContain("Auth→users migration(broken)");
  });

  it("measures prose, ignoring labels and graphics", () => {
    expect(proseStats("TESTS   418 PASS   11 FAIL\n█████░░ 96%").proseWords).toBe(0);
    const prose = proseStats("Based on my analysis of the repository there are several issues");
    expect(prose.proseWords).toBe(11);
    expect(prose.proseLines).toBe(1);
  });
});
