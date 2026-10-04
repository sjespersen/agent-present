/**
 * The Present spec 0.1 JSON Schema, authored as data so it can be used for runtime
 * validation, as LLM tool parameters, and emitted to specification/present.schema.json.
 */

export type JsonSchema = { [key: string]: unknown };

const str = (description?: string): JsonSchema => (description ? { type: "string", description } : { type: "string" });
const num = (description?: string): JsonSchema => (description ? { type: "number", description } : { type: "number" });
const bool = (description?: string): JsonSchema => (description ? { type: "boolean", description } : { type: "boolean" });
const numOrStr = (description?: string): JsonSchema => ({ type: ["number", "string"], ...(description ? { description } : {}) });
const en = (values: readonly string[], description?: string): JsonSchema => ({
  type: "string",
  enum: [...values],
  ...(description ? { description } : {}),
});
const arr = (items: JsonSchema, description?: string): JsonSchema => ({
  type: "array",
  items,
  ...(description ? { description } : {}),
});
const obj = (properties: Record<string, JsonSchema>, required: string[] = [], description?: string): JsonSchema => ({
  type: "object",
  properties,
  ...(required.length ? { required } : {}),
  ...(description ? { description } : {}),
});

export const STATUS_VALUES = ["good", "warning", "critical", "info", "neutral"] as const;
export const LEVEL_VALUES = ["low", "medium", "high"] as const;
export const CHECK_STATES = ["done", "failed", "pending", "skipped", "warning", "running"] as const;
export const INTENT_VALUES = [
  "decision",
  "assessment",
  "explanation",
  "comparison",
  "diagnosis",
  "plan",
  "status",
  "progress",
  "research",
  "summary",
] as const;

const status = en(STATUS_VALUES, "Semantic status: good | warning | critical | info | neutral");
const level = (description: string) => en(LEVEL_VALUES, description);

const source = obj({ label: str(), ref: str("Path, URL, command or ticket"), location: str("e.g. line range") }, ["label"]);
const evidenceItem = obj(
  { label: str(), value: str(), supports: bool("false for contradicting evidence"), source: str() },
  ["label"],
);

const base: Record<string, JsonSchema> = {
  id: str("Stable id, lets actions target this block"),
  title: str("Short section label, e.g. 'RISK MAP'"),
  priority: en(["primary", "secondary", "detail"], "primary = visible at a glance; secondary = on scan; detail = on explore"),
  emphasis: en(["strong", "normal", "subtle"]),
  density: en(["compact", "normal", "comfortable"]),
  detail: str("Long-form Markdown shown only when the user explores"),
  sources: arr(source),
};

const block = (type: string, description: string, properties: Record<string, JsonSchema>, required: string[]): JsonSchema => ({
  type: "object",
  description,
  properties: { type: { type: "string", enum: [type] }, ...base, ...properties },
  required: ["type", ...required],
});

const graphNode = obj(
  {
    id: str(),
    label: str(),
    kind: en(["step", "service", "store", "actor", "external", "decision", "outcome"], "actor/outcome render unboxed"),
    status,
    note: str("Small annotation under the node"),
  },
  ["id", "label"],
);
const graphEdge = obj(
  { from: str("Node id"), to: str("Node id"), label: str(), status: { ...status, description: "critical = broken link" } },
  ["from", "to"],
);
const comparisonValue: JsonSchema = {
  anyOf: [num(), str(), obj({ value: num(), label: str(), note: str() })],
};

export const blockSchemas: Record<string, JsonSchema> = {
  verdict: block(
    "verdict",
    "The answer: a conclusion, diagnosis, recommendation or decision.",
    {
      text: str("Short, decisive, e.g. \"DON'T SHIP YET\""),
      status,
      detail: str("One supporting line, e.g. '2 blockers'"),
      next: str("Recommended next step"),
      command: str("Command that performs the next step"),
    },
    ["text"],
  ),
  metric: block(
    "metric",
    "A single number made visually meaningful.",
    {
      label: str(),
      value: numOrStr(),
      unit: str("e.g. '%', 'ms', 'GB'"),
      max: num("Top of the scale; percentages default to 100"),
      min: num(),
      target: num(),
      trend: arr(num(), "Recent values, oldest first"),
      delta: numOrStr("Change vs previous"),
      status,
      caption: str("e.g. '93k / 128k'"),
      higherIsBetter: bool(),
    },
    ["label", "value"],
  ),
  metrics: block(
    "metrics",
    "A compact group of related measures.",
    {
      items: arr(
        obj(
          { label: str(), value: numOrStr(), unit: str(), status, delta: numOrStr(), caption: str(), max: num() },
          ["label", "value"],
        ),
      ),
    },
    ["items"],
  ),
  comparison: block(
    "comparison",
    "Explicit trade-offs between alternatives.",
    {
      options: arr(obj({ id: str(), label: str(), summary: str("Short 'best for' line") }, ["label"])),
      dimensions: arr(
        obj(
          {
            label: str(),
            values: {
              description: "One value per option in option order (or an object keyed by option id)",
              anyOf: [arr(comparisonValue), { type: "object", additionalProperties: comparisonValue }],
            },
            better: en(["higher", "lower"], "Which direction wins; default higher"),
            unit: str(),
          },
          ["label", "values"],
        ),
      ),
      winner: str("id or label of the recommended option"),
      rationale: str("One line explaining the pick"),
    },
    ["options", "dimensions"],
  ),
  flow: block(
    "flow",
    "A process, pipeline or causal chain (nodes + directed edges).",
    { nodes: arr(graphNode), edges: arr(graphEdge, "Omit to connect nodes in order") },
    ["nodes"],
  ),
  architecture: block(
    "architecture",
    "Systems and their dependencies, optionally with trust boundaries.",
    {
      nodes: arr(graphNode),
      edges: arr(graphEdge),
      boundaries: arr(obj({ label: str(), note: str(), status }, ["label", "note"])),
      boundaryTitle: str("e.g. 'TRUST BOUNDARY'"),
    },
    ["nodes"],
  ),
  timeline: block(
    "timeline",
    "Chronological events.",
    { events: arr(obj({ at: str("Time label, e.g. '09:14'"), label: str(), status, note: str() }, ["at", "label"])) },
    ["events"],
  ),
  trend: block(
    "trend",
    "A numeric sequence over time.",
    {
      label: str(),
      series: arr(obj({ name: str(), values: arr(num()) }, ["values"])),
      xLabels: arr(str()),
      unit: str(),
      status,
      threshold: num(),
      annotation: str(),
    },
    ["series"],
  ),
  distribution: block(
    "distribution",
    "Quantities compared; whole=true when they are parts of one total.",
    {
      items: arr(obj({ label: str(), value: num(), status }, ["label", "value"])),
      unit: str(),
      whole: bool("Items are parts of one whole (renders a stacked bar)"),
    },
    ["items"],
  ),
  risk: block(
    "risk",
    "Risks placed on an impact × likelihood matrix.",
    {
      items: arr(
        obj(
          { label: str(), impact: level("Impact"), likelihood: level("Likelihood"), status, note: str() },
          ["label", "impact", "likelihood"],
        ),
      ),
    },
    ["items"],
  ),
  hierarchy: block(
    "hierarchy",
    "A tree.",
    {
      root: {
        $ref: "#/$defs/hierarchyNode",
      },
    },
    ["root"],
  ),
  checklist: block(
    "checklist",
    "Items with a completion state.",
    { items: arr(obj({ label: str(), state: en(CHECK_STATES), note: str() }, ["label", "state"])) },
    ["items"],
  ),
  evidence: block(
    "evidence",
    "A claim and the observations that support it.",
    { claim: str(), confidence: level("Confidence"), items: arr(evidenceItem) },
    ["claim", "items"],
  ),
  change: block(
    "change",
    "Code change impact per file.",
    {
      files: arr(
        obj({ path: str(), added: num(), removed: num(), risk: level("Risk"), note: str() }, ["path"]),
      ),
    },
    ["files"],
  ),
  progress: block(
    "progress",
    "Work in progress.",
    {
      items: arr(obj({ label: str(), value: num(), total: num(), state: en(CHECK_STATES) }, ["label"])),
      signal: obj({ label: str(), value: str(), status }, ["label"]),
    },
    ["items"],
  ),
  text: block("text", "Short prose (≈240 chars). Long Markdown belongs in detail.", { text: str() }, ["text"]),
};

const hierarchyNode: JsonSchema = {
  type: "object",
  properties: {
    label: str(),
    note: str(),
    status,
    children: arr({ $ref: "#/$defs/hierarchyNode" }),
  },
  required: ["label"],
};

const action = obj(
  {
    id: str(),
    label: str(),
    intent: en(["agent", "expand", "copy", "open"], "agent = send prompt to the agent; expand = reveal target block"),
    prompt: str("For intent agent"),
    target: str("For intent expand: block id"),
    value: str("For intent copy/open"),
  },
  ["id", "label", "intent"],
);

const documentProperties: Record<string, JsonSchema> = {
  present: str("Present spec version, '0.1'"),
  title: str("Short title, e.g. 'Release readiness'"),
  subtitle: str("e.g. 'v2.8.0'"),
  intent: en(INTENT_VALUES),
  takeaway: obj(
    {
      text: str("The dominant message, e.g. 'Ready with two blockers'"),
      status,
      detail: str("One supporting line"),
      value: numOrStr("Optional headline number, rendered oversized"),
      unit: str(),
    },
    ["text"],
  ),
  blocks: arr({ anyOf: Object.values(blockSchemas) }, "Visual blocks, most important first (max ~5 at a glance)"),
  actions: arr(action),
  detail: obj({
    markdown: str("Long explanation, shown only on explore"),
    sections: arr(obj({ title: str(), markdown: str() }, ["title", "markdown"])),
  }),
  evidence: arr(evidenceItem),
  sources: arr(source),
  speech: obj({ summary: str("Spoken one-to-two sentence briefing") }, ["summary"]),
};

/** The canonical Present document schema. */
export const presentSchema: JsonSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://agent-present.dev/schema/present-0.1.json",
  title: "Present spec 0.1",
  description: "A semantic, renderer-independent description of how information should be presented to a human.",
  type: "object",
  properties: documentProperties,
  required: ["present", "blocks"],
  $defs: { hierarchyNode },
};

/**
 * The schema used for agent tool calls: same as the document, but `present`
 * is optional (the host fills it in) and `blocks` is required.
 */
export function presentToolSchema(): JsonSchema {
  const { present: _present, ...rest } = documentProperties;
  // Many providers reject $ref in tool schemas, so recursive nodes are inlined to a fixed depth.
  return inlineRefs({ type: "object", properties: rest, required: ["blocks"] }, 4) as JsonSchema;
}

function inlineRefs(node: unknown, depth: number): unknown {
  if (Array.isArray(node)) return node.map((n) => inlineRefs(n, depth));
  if (!node || typeof node !== "object") return node;
  const record = node as Record<string, unknown>;
  if (record.$ref === "#/$defs/hierarchyNode") {
    if (depth <= 0) return { type: "object", properties: { label: str(), note: str(), status }, required: ["label"] };
    return inlineRefs(hierarchyNode, depth - 1);
  }
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) out[key] = inlineRefs(value, depth);
  return out;
}
