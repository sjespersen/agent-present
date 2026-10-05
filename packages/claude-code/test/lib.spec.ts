import { describe, expect, it } from "vitest";
import { renderDocument, stripAnsi, visibleWidth } from "@agent-present/terminal";
import { DEMOS, check, draw, guidelines, markerStyle, parseReply, resultText, toSegments, withoutReserved } from "../src/lib.js";

const text = (line: { text: string }[]) => line.map((s) => s.text).join("");

describe("toSegments", () => {
  it("turns role markers back into styled runs", () => {
    const line = ` ${markerStyle.bold(markerStyle.fg("warning", "DON'T SHIP"))} ${markerStyle.fg("muted", "2 blockers")}`;
    expect(toSegments(line)).toEqual([
      { text: " " },
      { text: "DON'T SHIP", role: "warning", bold: true },
      { text: " " },
      { text: "2 blockers", role: "muted" },
    ]);
  });

  it("nests roles and restores the outer one", () => {
    const line = markerStyle.fg("accent", `a ${markerStyle.fg("critical", "b")} c`);
    expect(toSegments(line)).toEqual([
      { text: "a ", role: "accent" },
      { text: "b", role: "critical" },
      { text: " c", role: "accent" },
    ]);
  });

  it("merges neighbouring runs of one style and drops foreign escape codes", () => {
    expect(toSegments(`\x1b[38;2;1;2;3mx\x1b[39m${markerStyle.fg("dim", "y")}${markerStyle.fg("dim", "z")}`)).toEqual([
      { text: "x" },
      { text: "yz", role: "dim" },
    ]);
  });

  it("an empty line has no runs", () => {
    expect(toSegments("")).toEqual([]);
  });
});

describe("draw", () => {
  for (const [name, doc] of Object.entries(DEMOS)) {
    it(`${name}: same text as the terminal renderer, within width, at every depth`, () => {
      for (const width of [40, 80, 150]) {
        for (const depth of ["glance", "scan", "explore"] as const) {
          const lines = draw(doc, { width, depth });
          const reference = renderDocument(doc, { width, depth, margin: 1 }).map(stripAnsi);
          expect(lines.map(text)).toEqual(reference);
          for (const line of lines) expect(visibleWidth(text(line))).toBeLessThanOrEqual(width);
        }
      }
    });
  }

  it("colours meaning, not decoration", () => {
    const runs = draw(DEMOS["repo-review"], { width: 100 }).flat();
    expect(runs.some((s) => s.role === "warning" && s.bold)).toBe(true);
    expect(runs.some((s) => s.role === "critical")).toBe(true);
    expect(runs.some((s) => s.role === "good")).toBe(true);
  });
});

describe("check", () => {
  it("strips the host's keys and stamps the spec version", () => {
    const checked = check({ tool: "mcp__agent-present__present", tool_use_id: "t", agentId: "a", takeaway: { text: "Hi" }, blocks: [] });
    expect(checked.ok).toBe(true);
    if (checked.ok) expect(checked.raw).toEqual({ present: "0.1", takeaway: { text: "Hi" }, blocks: [] });
  });

  it("refuses a document with nothing to show", () => {
    const checked = check({ title: "x", blocks: [] });
    expect(checked.ok).toBe(false);
    if (!checked.ok) expect(checked.error).toContain("Nothing to present");
  });

  it("tells progress from a final answer", () => {
    const progress = check(DEMOS.progress);
    expect(progress.ok && progress.isProgress).toBe(true);
    if (progress.ok) expect(resultText(progress)).toContain("Keep working");
    const final = check(DEMOS["repo-review"]);
    if (final.ok) expect(resultText(final)).toContain("Do not repeat it in prose");
  });

  it("survives junk input", () => {
    for (const junk of [null, 3, "text", [], { blocks: "nope" }]) expect(() => check(junk)).not.toThrow();
    expect(withoutReserved(null)).toEqual({});
  });
});

describe("model text", () => {
  it("always mode adds its guideline", () => {
    expect(guidelines("auto")).not.toContain("ALWAYS");
    expect(guidelines("always")).toContain("ALWAYS");
  });

  it("parses fenced and chatty replies", () => {
    expect(parseReply('Here:\n```json\n{"blocks":[]}\n```')).toEqual({ present: "0.1", blocks: [] });
    expect(() => parseReply("no json")).toThrow();
    expect(() => parseReply("[1,2]")).toThrow();
  });
});
