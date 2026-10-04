import { describe, expect, it } from "vitest";
import {
  allocate,
  ASCII,
  bar,
  bigText,
  Canvas,
  formatNumber,
  plainStyle,
  renderGraph,
  renderPlainText,
  sparkline,
  splitForBig,
  stripAnsi,
  truncate,
  UNICODE,
  visibleWidth,
  wrap,
} from "@agent-present/terminal";

const style = plainStyle();
const graph = (nodes: string[], edges: [string, string, string?][], width = 80) =>
  renderGraph(
    nodes.map((n) => ({ id: n, label: n })),
    edges.map(([from, to, status]) => ({ from, to, ...(status ? { status: status as "critical" } : {}) })),
    { width, glyphs: UNICODE, style },
  ).join("\n");

describe("text", () => {
  it("measures and truncates without counting escape codes", () => {
    const s = "\x1b[31mhello\x1b[39m world";
    expect(visibleWidth(s)).toBe(11);
    const t = truncate(s, 7);
    expect(visibleWidth(t)).toBe(7);
    expect(stripAnsi(t)).toBe("hello …");
  });

  it("counts wide characters as two columns", () => {
    expect(visibleWidth("漢字")).toBe(4);
  });

  it("wraps words and hard-breaks long ones", () => {
    expect(wrap("the quick brown fox", 9)).toEqual(["the quick", "brown fox"]);
    expect(wrap("abcdefghij", 4)).toEqual(["abcd", "efgh", "ij"]);
  });
});

describe("charts", () => {
  it("draws bars with sub-cell precision and ASCII fallback", () => {
    expect(bar(0.5, 10, UNICODE, style)).toBe("█████░░░░░");
    expect(bar(0.55, 10, UNICODE, style)).toBe("█████▌░░░░");
    expect(bar(0.55, 10, ASCII, style)).toBe("######----");
    expect(bar(2, 4, UNICODE, style)).toBe("████");
  });

  it("allocates stacked cells exactly, keeping small parts visible", () => {
    const cells = allocate([418, 11, 6], 40);
    expect(cells.reduce((a, b) => a + b, 0)).toBe(40);
    expect(cells[2]).toBeGreaterThanOrEqual(1);
  });

  it("draws sparklines from min to max", () => {
    expect(sparkline([0, 7], UNICODE)).toBe("▁█");
    expect(sparkline([1, 2, 3, 4], UNICODE, 8)).toHaveLength(8);
  });

  it("renders oversized numerals", () => {
    expect(bigText("87%")).toEqual(["█▀█ ▀▀█ ▀ █", "█▀█   █ ▄▀ ", "▀▀▀   ▀ ▀ ▀"]);
    expect(bigText("8x")).toBeUndefined();
    expect(splitForBig(87, "%")).toEqual({ big: "87%", small: "" });
    expect(splitForBig(680, "ms")).toEqual({ big: "680", small: "ms" });
    expect(splitForBig(1_250_000, "tokens")).toEqual({ big: "1.3", small: "M tokens" });
  });

  it("formats numbers compactly", () => {
    expect(formatNumber(128_000)).toBe("128k");
    expect(formatNumber(0.974)).toBe("0.97");
    expect(formatNumber(41.25)).toBe("41.3");
  });
});

describe("canvas", () => {
  it("merges box junctions", () => {
    const c = new Canvas(5);
    c.hline(0, 4, 1);
    c.vline(2, 0, 2);
    expect(c.toLines(style)).toEqual(["  │", "──┼──", "  │"]);
  });
});

describe("graph layout", () => {
  it("lays simple chains out left to right with a broken link", () => {
    const out = graph(["API", "Auth", "DB"], [["API", "Auth"], ["Auth", "DB", "critical"]]);
    expect(out.split("\n")).toHaveLength(3);
    expect(out).toContain("│ API │ ────► │ Auth │ ───╳──► │ DB │");
  });

  it("routes fan-out and fan-in through a shared bus", () => {
    const out = graph(["api", "password", "oauth", "session"], [["api", "password"], ["api", "oauth"], ["password", "session"], ["oauth", "session"]]);
    expect(out).toMatch(/┌─+┴─+┐/);
    expect(out).toMatch(/└─+┬─+┘/);
  });

  it("keeps long edges with dummy routing", () => {
    const out = graph(["a", "b", "c"], [["a", "b"], ["b", "c"], ["a", "c"]]);
    expect(out).toContain("┌───┐");
    // b→c and the long a→c edge merge into one arrow at c
    expect(out.match(/▼/g)?.length).toBe(2);
    expect(out.split("\n").filter((l) => l.includes("│ b │"))[0]).toMatch(/│\s+│ b │/);
  });

  it("lists back edges of cycles instead of drawing a mess", () => {
    const out = graph(["a", "b", "c"], [["a", "b"], ["b", "c"], ["c", "a"]]);
    expect(out).toContain("↺ c ─► a");
  });

  it("falls back to an edge list when the diagram cannot fit", () => {
    const nodes = ["alpha-service", "beta-service", "gamma-service", "delta-service", "epsilon-service"];
    const out = graph(nodes, nodes.slice(1).map((n) => ["alpha-service", n] as [string, string]), 30);
    expect(out).toContain("alpha-service");
    expect(out).toContain("└──► epsilon-service");
    for (const line of out.split("\n")) expect(visibleWidth(line)).toBeLessThanOrEqual(30);
  });
});

describe("primitives", () => {
  it("comparison stacks alternatives when narrow and marks the pick", () => {
    const doc = {
      blocks: [
        {
          type: "comparison",
          options: [{ label: "A" }, { label: "B" }, { label: "C" }, { label: "D" }],
          dimensions: [{ label: "Speed", values: [1, 4, 2, 3] }],
          winner: "B",
          rationale: "fastest",
        },
      ],
    };
    const narrow = renderPlainText(doc, { width: 40 });
    expect(narrow).toContain("PICK B");
    const wide = renderPlainText(doc, { width: 100 });
    expect(wide).toMatch(/A\s+B\s+C\s+D/);
  });

  it("risk matrix places items by impact and likelihood", () => {
    const text = renderPlainText({ blocks: [{ type: "risk", items: [{ label: "outage", impact: "high", likelihood: "high" }] }] }, { width: 80 });
    const row = text.split("\n").find((l) => l.includes("HIGH") && l.includes("outage"))!;
    expect(row).toMatch(/·\s+·\s+█\s+█ outage/);
  });

  it("checklist summarises completion in its title", () => {
    const text = renderPlainText({ blocks: [{ type: "checklist", title: "Release", items: [{ label: "tests", state: "done" }, { label: "migration", state: "failed" }] }] }, { width: 60 });
    expect(text).toMatch(/RELEASE\s+1\/2 ✓/);
    expect(text).toContain("✕ migration");
  });

  it("timeline goes vertical when it cannot fit horizontally", () => {
    const events = Array.from({ length: 6 }, (_, i) => ({ at: `0${i}:00`, label: `event number ${i}` }));
    const text = renderPlainText({ blocks: [{ type: "timeline", events }] }, { width: 40 });
    expect(text).toContain("00:00 ● event number 0");
  });
});
