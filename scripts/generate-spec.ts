// Generates specification/primitives/*.md and specification/examples/*.json.
// Each page shows the minimal JSON for a primitive and its real terminal rendering.
import { mkdirSync, writeFileSync } from "node:fs";
import { blockSchemas } from "@agent-present/core";
import { renderPlainText } from "@agent-present/terminal";

const spec = new URL("../specification/", import.meta.url);
mkdirSync(new URL("primitives/", spec), { recursive: true });
mkdirSync(new URL("examples/", spec), { recursive: true });

const EXAMPLES: Record<string, { use: string; block: Record<string, unknown> }> = {
  verdict: { use: "Conclusions, diagnoses, recommendations and decisions.", block: { type: "verdict", text: "Don't ship yet", status: "critical", detail: "2 blockers", next: "Fix the migration first", command: "pnpm db:migrate" } },
  metric: { use: "One number made visually meaningful: value, scale, trend, delta.", block: { type: "metric", label: "Context used", value: 93, unit: "k", max: 128, status: "warning", caption: "93k / 128k tokens", trend: [12, 31, 52, 71, 93] } },
  metrics: { use: "A compact group of 2–6 related measures — instead of a row of boxes.", block: { type: "metrics", items: [{ label: "files", value: 81 }, { label: "tests", value: 435 }, { label: "coverage", value: 87, unit: "%", status: "good" }, { label: "risk", value: "HIGH", status: "critical" }] } },
  comparison: { use: "Explicit trade-offs between alternatives, with a recommended pick.", block: { type: "comparison", options: [{ id: "strix", label: "Strix Halo", summary: "big models" }, { id: "rtx", label: "RTX 5090", summary: "speed" }], dimensions: [{ label: "Memory", unit: "GB", values: [128, 32] }, { label: "Speed", unit: "tok/s", values: [32, 81] }, { label: "Power", unit: "W", better: "lower", values: [120, 575] }], winner: "strix", rationale: "Fits 70B models" } },
  flow: { use: "Processes, pipelines and causal chains. `status: critical` on an edge draws a broken link.", block: { type: "flow", nodes: [{ id: "api", label: "API" }, { id: "auth", label: "Auth" }, { id: "policy", label: "Policy" }, { id: "allow", label: "ALLOW", kind: "outcome" }, { id: "deny", label: "DENY", kind: "outcome", status: "critical" }], edges: [{ from: "api", to: "auth" }, { from: "auth", to: "policy" }, { from: "policy", to: "allow" }, { from: "policy", to: "deny" }] } },
  architecture: { use: "Systems and dependencies, optionally with trust boundaries.", block: { type: "architecture", nodes: [{ id: "user", label: "user", kind: "actor" }, { id: "web", label: "Web app" }, { id: "auth", label: "Auth" }, { id: "orders", label: "Orders" }, { id: "bus", label: "Event bus" }], edges: [{ from: "user", to: "web" }, { from: "web", to: "auth" }, { from: "web", to: "orders" }, { from: "auth", to: "bus" }, { from: "orders", to: "bus" }], boundaries: [{ label: "user", note: "untrusted", status: "critical" }, { label: "event bus", note: "internal only", status: "good" }] } },
  timeline: { use: "Chronology, laid out spatially. Notes hang below their event.", block: { type: "timeline", events: [{ at: "09:14", label: "deploy" }, { at: "09:16", label: "errors", status: "critical", note: "auth failures begin" }, { at: "09:18", label: "rollback", status: "warning" }, { at: "09:21", label: "stable", status: "good" }] } },
  trend: { use: "A sequence and how it changes; threshold and annotation are placed on the chart.", block: { type: "trend", label: "p95 latency", unit: "ms", series: [{ values: [100, 104, 98, 180, 300, 420, 610, 680] }], xLabels: ["09", "10", "11", "12"], threshold: 300, annotation: "deploy", status: "critical" } },
  distribution: { use: "Comparing quantities. `whole: true` renders parts of one total as a stacked bar.", block: { type: "distribution", title: "Token usage", items: [{ label: "Code analysis", value: 43 }, { label: "Tool output", value: 22 }, { label: "Reasoning", value: 18 }, { label: "Conversation", value: 17 }], unit: "%" } },
  risk: { use: "Risks on an impact × likelihood matrix; severity is derived, not declared.", block: { type: "risk", items: [{ label: "release blocker", impact: "high", likelihood: "high" }, { label: "payment retries", impact: "high", likelihood: "medium" }, { label: "minor issues", impact: "medium", likelihood: "low" }] } },
  hierarchy: { use: "Trees: ownership, taxonomies, module structure.", block: { type: "hierarchy", root: { label: "Platform", children: [{ label: "Identity", children: [{ label: "Authentication" }, { label: "Authorization" }] }, { label: "Commerce", children: [{ label: "Cart" }, { label: "Checkout", status: "warning", note: "flaky" }] }] } } },
  checklist: { use: "Items with a completion state; the title shows the tally.", block: { type: "checklist", title: "Release", items: [{ label: "tests", state: "done" }, { label: "lint", state: "done" }, { label: "migration", state: "failed", note: "not applied" }, { label: "smoke test", state: "pending" }] } },
  evidence: { use: "A claim, its confidence, and the observations that support (or contradict) it.", block: { type: "evidence", claim: "Auth failures began after migration 182.", confidence: "high", items: [{ label: "migration deployed", value: "09:16" }, { label: "failures begin", value: "09:16" }, { label: "rollback", value: "09:21" }] } },
  change: { use: "Code change impact: churn per file and risk, with the risk centre marked.", block: { type: "change", files: [{ path: "src/auth/session.ts", added: 42, removed: 17, risk: "high" }, { path: "src/web/login.tsx", added: 18, removed: 8, risk: "medium" }, { path: "tests/auth.test.ts", added: 63, risk: "low" }] } },
  progress: { use: "Work in progress. With intent `progress` hosts show it temporarily and replace it with the final result.", block: { type: "progress", items: [{ label: "files", value: 64, total: 81 }, { label: "tests", state: "done" }], signal: { label: "auth migration", value: "high risk", status: "critical" } } },
  text: { use: "Prose, intentionally constrained: ~240 characters at a glance; longer text collapses.", block: { type: "text", text: "Text remains available, but it has to earn its place. Long Markdown belongs in `detail`, behind progressive disclosure." } },
};

const index: string[] = [];
for (const [type, { use, block }] of Object.entries(EXAMPLES)) {
  const doc = { present: "0.1", blocks: [block] };
  writeFileSync(new URL(`examples/${type}.json`, spec), `${JSON.stringify(doc, null, 2)}\n`);
  const schema = blockSchemas[type] as { properties: Record<string, { description?: string }>; required: string[] };
  const fields = Object.entries(schema.properties)
    .filter(([k]) => !["type", "id", "title", "priority", "emphasis", "density", "sources"].includes(k) || k === "detail")
    .map(([k, v]) => `| \`${k}\` | ${schema.required.includes(k) ? "yes" : ""} | ${(v.description ?? "").replace(/\|/g, "\\|")} |`);
  const unicode = renderPlainText(doc, { width: 80, depth: "glance" });
  const ascii = renderPlainText(doc, { width: 80, depth: "glance", unicode: false });
  writeFileSync(
    new URL(`primitives/${type}.md`, spec),
    `# \`${type}\`\n\n${use}\n\n## Fields\n\n| field | required | notes |\n|---|---|---|\n${fields.join("\n")}\n\nCommon fields on every block: \`id\`, \`title\`, \`priority\`, \`emphasis\`, \`density\`, \`detail\`, \`sources\`.\n\n## Example\n\n\`\`\`json\n${JSON.stringify(block, null, 2)}\n\`\`\`\n\n## Terminal rendering (80 columns)\n\n\`\`\`text\n${unicode}\n\`\`\`\n\n<details><summary>ASCII fallback</summary>\n\n\`\`\`text\n${ascii}\n\`\`\`\n\n</details>\n`,
  );
  index.push(`| [\`${type}\`](primitives/${type}.md) | ${use} |`);
}
writeFileSync(new URL("primitives/INDEX.md", spec), `| primitive | use for |\n|---|---|\n${index.join("\n")}\n`);
console.log(`wrote ${index.length} primitive pages`);
