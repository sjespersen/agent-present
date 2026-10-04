// Agent Present for Pi — https://github.com/sjespersen/agent-present (MIT). Generated file; edit packages/pi/src.

// ../core/src/types.ts
var PRESENT_VERSION = "0.1";
var BLOCK_TYPES = [
  "verdict",
  "metric",
  "metrics",
  "comparison",
  "flow",
  "architecture",
  "timeline",
  "trend",
  "distribution",
  "risk",
  "hierarchy",
  "checklist",
  "evidence",
  "change",
  "progress",
  "text"
];

// ../core/src/schema.ts
var str = (description) => description ? { type: "string", description } : { type: "string" };
var num = (description) => description ? { type: "number", description } : { type: "number" };
var bool = (description) => description ? { type: "boolean", description } : { type: "boolean" };
var numOrStr = (description) => ({ type: ["number", "string"], ...description ? { description } : {} });
var en = (values, description) => ({
  type: "string",
  enum: [...values],
  ...description ? { description } : {}
});
var arr = (items, description) => ({
  type: "array",
  items,
  ...description ? { description } : {}
});
var obj = (properties, required = [], description) => ({
  type: "object",
  properties,
  ...required.length ? { required } : {},
  ...description ? { description } : {}
});
var STATUS_VALUES = ["good", "warning", "critical", "info", "neutral"];
var LEVEL_VALUES = ["low", "medium", "high"];
var CHECK_STATES = ["done", "failed", "pending", "skipped", "warning", "running"];
var INTENT_VALUES = [
  "decision",
  "assessment",
  "explanation",
  "comparison",
  "diagnosis",
  "plan",
  "status",
  "progress",
  "research",
  "summary"
];
var status = en(STATUS_VALUES, "Semantic status: good | warning | critical | info | neutral");
var level = (description) => en(LEVEL_VALUES, description);
var source = obj({ label: str(), ref: str("Path, URL, command or ticket"), location: str("e.g. line range") }, ["label"]);
var evidenceItem = obj(
  { label: str(), value: str(), supports: bool("false for contradicting evidence"), source: str() },
  ["label"]
);
var base = {
  id: str("Stable id, lets actions target this block"),
  title: str("Short section label, e.g. 'RISK MAP'"),
  priority: en(["primary", "secondary", "detail"], "primary = visible at a glance; secondary = on scan; detail = on explore"),
  emphasis: en(["strong", "normal", "subtle"]),
  density: en(["compact", "normal", "comfortable"]),
  detail: str("Long-form Markdown shown only when the user explores"),
  sources: arr(source)
};
var block = (type, description, properties, required) => ({
  type: "object",
  description,
  properties: { type: { type: "string", enum: [type] }, ...base, ...properties },
  required: ["type", ...required]
});
var graphNode = obj(
  {
    id: str(),
    label: str(),
    kind: en(["step", "service", "store", "actor", "external", "decision", "outcome"], "actor/outcome render unboxed"),
    status,
    note: str("Small annotation under the node")
  },
  ["id", "label"]
);
var graphEdge = obj(
  { from: str("Node id"), to: str("Node id"), label: str(), status: { ...status, description: "critical = broken link" } },
  ["from", "to"]
);
var comparisonValue = {
  anyOf: [num(), str(), obj({ value: num(), label: str(), note: str() })]
};
var blockSchemas = {
  verdict: block(
    "verdict",
    "The answer: a conclusion, diagnosis, recommendation or decision.",
    {
      text: str(`Short, decisive, e.g. "DON'T SHIP YET"`),
      status,
      detail: str("One supporting line, e.g. '2 blockers'"),
      next: str("Recommended next step"),
      command: str("Command that performs the next step")
    },
    ["text"]
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
      higherIsBetter: bool()
    },
    ["label", "value"]
  ),
  metrics: block(
    "metrics",
    "A compact group of related measures.",
    {
      items: arr(
        obj(
          { label: str(), value: numOrStr(), unit: str(), status, delta: numOrStr(), caption: str(), max: num() },
          ["label", "value"]
        )
      )
    },
    ["items"]
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
              anyOf: [arr(comparisonValue), { type: "object", additionalProperties: comparisonValue }]
            },
            better: en(["higher", "lower"], "Which direction wins; default higher"),
            unit: str()
          },
          ["label", "values"]
        )
      ),
      winner: str("id or label of the recommended option"),
      rationale: str("One line explaining the pick")
    },
    ["options", "dimensions"]
  ),
  flow: block(
    "flow",
    "A process, pipeline or causal chain (nodes + directed edges).",
    { nodes: arr(graphNode), edges: arr(graphEdge, "Omit to connect nodes in order") },
    ["nodes"]
  ),
  architecture: block(
    "architecture",
    "Systems and their dependencies, optionally with trust boundaries.",
    {
      nodes: arr(graphNode),
      edges: arr(graphEdge),
      boundaries: arr(obj({ label: str(), note: str(), status }, ["label", "note"])),
      boundaryTitle: str("e.g. 'TRUST BOUNDARY'")
    },
    ["nodes"]
  ),
  timeline: block(
    "timeline",
    "Chronological events.",
    { events: arr(obj({ at: str("Time label, e.g. '09:14'"), label: str(), status, note: str() }, ["at", "label"])) },
    ["events"]
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
      annotation: str()
    },
    ["series"]
  ),
  distribution: block(
    "distribution",
    "Quantities compared; whole=true when they are parts of one total.",
    {
      items: arr(obj({ label: str(), value: num(), status }, ["label", "value"])),
      unit: str(),
      whole: bool("Items are parts of one whole (renders a stacked bar)")
    },
    ["items"]
  ),
  risk: block(
    "risk",
    "Risks placed on an impact \xD7 likelihood matrix.",
    {
      items: arr(
        obj(
          { label: str(), impact: level("Impact"), likelihood: level("Likelihood"), status, note: str() },
          ["label", "impact", "likelihood"]
        )
      )
    },
    ["items"]
  ),
  hierarchy: block(
    "hierarchy",
    "A tree.",
    {
      root: {
        $ref: "#/$defs/hierarchyNode"
      }
    },
    ["root"]
  ),
  checklist: block(
    "checklist",
    "Items with a completion state.",
    { items: arr(obj({ label: str(), state: en(CHECK_STATES), note: str() }, ["label", "state"])) },
    ["items"]
  ),
  evidence: block(
    "evidence",
    "A claim and the observations that support it.",
    { claim: str(), confidence: level("Confidence"), items: arr(evidenceItem) },
    ["claim", "items"]
  ),
  change: block(
    "change",
    "Code change impact per file.",
    {
      files: arr(
        obj({ path: str(), added: num(), removed: num(), risk: level("Risk"), note: str() }, ["path"])
      )
    },
    ["files"]
  ),
  progress: block(
    "progress",
    "Work in progress.",
    {
      items: arr(obj({ label: str(), value: num(), total: num(), state: en(CHECK_STATES) }, ["label"])),
      signal: obj({ label: str(), value: str(), status }, ["label"])
    },
    ["items"]
  ),
  text: block("text", "Short prose (\u2248240 chars). Long Markdown belongs in detail.", { text: str() }, ["text"])
};
var hierarchyNode = {
  type: "object",
  properties: {
    label: str(),
    note: str(),
    status,
    children: arr({ $ref: "#/$defs/hierarchyNode" })
  },
  required: ["label"]
};
var action = obj(
  {
    id: str(),
    label: str(),
    intent: en(["agent", "expand", "copy", "open"], "agent = send prompt to the agent; expand = reveal target block"),
    prompt: str("For intent agent"),
    target: str("For intent expand: block id"),
    value: str("For intent copy/open")
  },
  ["id", "label", "intent"]
);
var documentProperties = {
  present: str("Present IR version, '0.1'"),
  title: str("Short title, e.g. 'Release readiness'"),
  subtitle: str("e.g. 'v2.8.0'"),
  intent: en(INTENT_VALUES),
  takeaway: obj(
    {
      text: str("The dominant message, e.g. 'Ready with two blockers'"),
      status,
      detail: str("One supporting line"),
      value: numOrStr("Optional headline number, rendered oversized"),
      unit: str()
    },
    ["text"]
  ),
  blocks: arr({ anyOf: Object.values(blockSchemas) }, "Visual blocks, most important first (max ~5 at a glance)"),
  actions: arr(action),
  detail: obj({
    markdown: str("Long explanation, shown only on explore"),
    sections: arr(obj({ title: str(), markdown: str() }, ["title", "markdown"]))
  }),
  evidence: arr(evidenceItem),
  sources: arr(source),
  speech: obj({ summary: str("Spoken one-to-two sentence briefing") }, ["summary"])
};
var presentSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://agent-present.dev/schema/present-ir-0.1.json",
  title: "Present IR 0.1",
  description: "A semantic, renderer-independent description of how information should be presented to a human.",
  type: "object",
  properties: documentProperties,
  required: ["present", "blocks"],
  $defs: { hierarchyNode }
};
function presentToolSchema() {
  const { present: _present, ...rest } = documentProperties;
  return inlineRefs({ type: "object", properties: rest, required: ["blocks"] }, 4);
}
function inlineRefs(node, depth) {
  if (Array.isArray(node)) return node.map((n) => inlineRefs(n, depth));
  if (!node || typeof node !== "object") return node;
  const record = node;
  if (record.$ref === "#/$defs/hierarchyNode") {
    if (depth <= 0) return { type: "object", properties: { label: str(), note: str(), status }, required: ["label"] };
    return inlineRefs(hierarchyNode, depth - 1);
  }
  const out = {};
  for (const [key, value] of Object.entries(record)) out[key] = inlineRefs(value, depth);
  return out;
}

// ../core/src/validate.ts
function validate(input) {
  const errors = [];
  const warnings = [];
  if (!isRecord(input)) {
    return { valid: false, errors: [{ path: "", message: "document must be an object" }], warnings };
  }
  const { blocks, ...rest } = input;
  const docSchema = presentSchema;
  const { blocks: _blocksSchema, ...otherProps } = docSchema.properties;
  check({ type: "object", properties: otherProps, required: ["present"] }, rest, "", errors);
  if (typeof input.present === "string" && !input.present.startsWith("0.")) {
    warnings.push({ path: "present", message: `unsupported major version ${input.present}; rendering best-effort` });
  }
  if (!Array.isArray(blocks)) {
    errors.push({ path: "blocks", message: "must be an array" });
  } else {
    blocks.forEach((block2, i) => {
      const path = `blocks[${i}]`;
      if (!isRecord(block2)) {
        errors.push({ path, message: "must be an object" });
        return;
      }
      if (typeof block2.type !== "string") {
        errors.push({ path: `${path}.type`, message: "is required" });
        return;
      }
      const schema = blockSchemas[block2.type];
      if (!schema) {
        warnings.push({ path: `${path}.type`, message: `unknown block type "${block2.type}" will degrade to a text fallback` });
        return;
      }
      check(schema, block2, path, errors);
    });
    const glance = blocks.filter((b) => !isRecord(b) || b.priority !== "secondary" && b.priority !== "detail").length;
    if (glance > 5) {
      warnings.push({ path: "blocks", message: `${glance} glance blocks exceed the budget of 5; mark extras priority "secondary" or they will collapse` });
    }
  }
  return { valid: errors.length === 0, errors, warnings };
}
function formatIssues(issues) {
  return issues.map((issue) => `- ${issue.path || "(root)"}: ${issue.message}`).join("\n");
}
function check(schema, value, path, errors) {
  if (typeof schema.$ref === "string") {
    const name = schema.$ref.replace("#/$defs/", "");
    const defs = presentSchema.$defs ?? {};
    const target = defs[name];
    if (target) check(target, value, path, errors);
    return;
  }
  if (Array.isArray(schema.anyOf)) {
    const branches = schema.anyOf;
    for (const branch of branches) {
      const branchErrors = [];
      check(branch, value, path, branchErrors);
      if (branchErrors.length === 0) return;
    }
    errors.push({ path, message: "does not match any allowed shape" });
    return;
  }
  if (schema.type !== void 0) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((type) => matchesType(value, type))) {
      errors.push({ path, message: `must be ${types.join(" or ")}` });
      return;
    }
  }
  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    errors.push({ path, message: `must be one of ${schema.enum.map((v) => JSON.stringify(v)).join(", ")}` });
    return;
  }
  if (schema.const !== void 0 && value !== schema.const) {
    errors.push({ path, message: `must be ${JSON.stringify(schema.const)}` });
    return;
  }
  if (isRecord(value)) {
    const properties = schema.properties ?? {};
    for (const key of schema.required ?? []) {
      if (value[key] === void 0 || value[key] === null) errors.push({ path: join(path, key), message: "is required" });
    }
    for (const [key, child] of Object.entries(value)) {
      if (child === void 0 || child === null) continue;
      if (properties[key]) check(properties[key], child, join(path, key), errors);
      else if (isRecord(schema.additionalProperties)) check(schema.additionalProperties, child, join(path, key), errors);
    }
  }
  if (Array.isArray(value) && isRecord(schema.items)) {
    value.forEach((item, i) => check(schema.items, item, `${path}[${i}]`, errors));
  }
}
function matchesType(value, type) {
  switch (type) {
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "integer":
      return typeof value === "number" && Number.isInteger(value);
    case "boolean":
      return typeof value === "boolean";
    case "array":
      return Array.isArray(value);
    case "object":
      return isRecord(value);
    case "null":
      return value === null;
    default:
      return true;
  }
}
function join(path, key) {
  return path ? `${path}.${key}` : key;
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ../core/src/normalize.ts
var STATUS_ALIASES = {
  good: "good",
  ok: "good",
  okay: "good",
  success: "good",
  pass: "good",
  passed: "good",
  passing: "good",
  healthy: "good",
  green: "good",
  positive: "good",
  done: "good",
  ready: "good",
  safe: "good",
  warning: "warning",
  warn: "warning",
  caution: "warning",
  degraded: "warning",
  yellow: "warning",
  amber: "warning",
  "at-risk": "warning",
  medium: "warning",
  moderate: "warning",
  flaky: "warning",
  critical: "critical",
  error: "critical",
  fail: "critical",
  failed: "critical",
  failing: "critical",
  danger: "critical",
  bad: "critical",
  red: "critical",
  blocker: "critical",
  blocked: "critical",
  severe: "critical",
  high: "critical",
  broken: "critical",
  negative: "critical",
  info: "info",
  information: "info",
  note: "info",
  blue: "info",
  running: "info",
  neutral: "neutral",
  none: "neutral",
  unknown: "neutral",
  default: "neutral",
  muted: "neutral",
  low: "neutral"
};
var LEVEL_ALIASES = {
  low: "low",
  lo: "low",
  minor: "low",
  small: "low",
  unlikely: "low",
  rare: "low",
  l: "low",
  medium: "medium",
  med: "medium",
  mid: "medium",
  moderate: "medium",
  possible: "medium",
  m: "medium",
  high: "high",
  hi: "high",
  major: "high",
  critical: "high",
  severe: "high",
  likely: "high",
  large: "high",
  h: "high"
};
var CHECK_ALIASES = {
  done: "done",
  ok: "done",
  pass: "done",
  passed: "done",
  complete: "done",
  completed: "done",
  success: "done",
  true: "done",
  yes: "done",
  "\u2713": "done",
  good: "done",
  failed: "failed",
  fail: "failed",
  error: "failed",
  blocked: "failed",
  "\u2715": "failed",
  false: "failed",
  critical: "failed",
  pending: "pending",
  todo: "pending",
  open: "pending",
  "not started": "pending",
  waiting: "pending",
  queued: "pending",
  skipped: "skipped",
  skip: "skipped",
  na: "skipped",
  "n/a": "skipped",
  warning: "warning",
  warn: "warning",
  flaky: "warning",
  running: "running",
  "in progress": "running",
  "in-progress": "running",
  in_progress: "running",
  active: "running",
  working: "running"
};
var TYPE_ALIASES = {
  kpi: "metric",
  gauge: "metric",
  number: "metric",
  stat: "metric",
  kpis: "metrics",
  stats: "metrics",
  numbers: "metrics",
  scorecard: "metrics",
  steps: "flow",
  pipeline: "flow",
  process: "flow",
  sequence: "flow",
  causal: "flow",
  chain: "flow",
  graph: "architecture",
  diagram: "architecture",
  system: "architecture",
  dependencies: "architecture",
  tree: "hierarchy",
  outline: "hierarchy",
  list: "checklist",
  todo: "checklist",
  checks: "checklist",
  tasks: "checklist",
  bars: "distribution",
  bar: "distribution",
  breakdown: "distribution",
  proportions: "distribution",
  share: "distribution",
  chart: "trend",
  line: "trend",
  sparkline: "trend",
  series: "trend",
  "time-series": "trend",
  recommendation: "verdict",
  conclusion: "verdict",
  decision: "verdict",
  callout: "verdict",
  answer: "verdict",
  markdown: "text",
  paragraph: "text",
  note: "text",
  prose: "text",
  diff: "change",
  files: "change",
  changes: "change",
  diffstat: "change",
  events: "timeline",
  history: "timeline",
  chronology: "timeline",
  risks: "risk",
  matrix: "risk",
  "risk-matrix": "risk",
  claim: "evidence",
  proof: "evidence",
  compare: "comparison",
  tradeoffs: "comparison",
  "trade-offs": "comparison",
  versus: "comparison",
  status: "progress"
};
function normalizeStatus(value) {
  if (typeof value !== "string") return void 0;
  return STATUS_ALIASES[value.trim().toLowerCase()];
}
function normalizeLevel(value, fallback = "medium") {
  if (typeof value === "number") return value >= 0.66 || value >= 3 ? "high" : value >= 0.33 || value >= 2 ? "medium" : "low";
  if (typeof value !== "string") return fallback;
  return LEVEL_ALIASES[value.trim().toLowerCase()] ?? fallback;
}
function normalizeCheckState(value) {
  if (typeof value === "boolean") return value ? "done" : "pending";
  if (typeof value !== "string") return "pending";
  return CHECK_ALIASES[value.trim().toLowerCase()] ?? "pending";
}
function parseNumberish(value) {
  if (typeof value === "number" && Number.isFinite(value)) return { value };
  if (typeof value !== "string") return void 0;
  const match = value.trim().match(/^([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)\s*([a-zA-Z%/µ°]+(?:\/[a-zA-Z]+)?)?$/);
  if (!match) return void 0;
  const parsed = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(parsed)) return void 0;
  return match[2] ? { value: parsed, unit: match[2] } : { value: parsed };
}
function maybeJson(value) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!(trimmed.startsWith("[") || trimmed.startsWith("{"))) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}
function asArray(value) {
  const parsed = maybeJson(value);
  return Array.isArray(parsed) ? parsed : [];
}
function asString(value) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return void 0;
}
function slug(text2) {
  return text2.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "node";
}
function normalize(input) {
  const doc = isRecord(maybeJson(input)) ? maybeJson(input) : {};
  const rawBlocks = asArray(doc.blocks);
  const blocks = rawBlocks.map((raw, index) => normalizeBlock(raw, index)).filter((block2) => block2 !== void 0);
  assignPriorities(blocks);
  dedupeIds(blocks);
  const out = {
    present: asString(doc.present) ?? PRESENT_VERSION,
    blocks,
    actions: normalizeActions(doc.actions)
  };
  const title = asString(doc.title);
  if (title) out.title = title;
  const subtitle = asString(doc.subtitle);
  if (subtitle) out.subtitle = subtitle;
  if (typeof doc.intent === "string") out.intent = doc.intent;
  const takeaway = maybeJson(doc.takeaway);
  if (typeof takeaway === "string" && takeaway.trim()) {
    out.takeaway = { text: takeaway.trim() };
  } else if (isRecord(takeaway) && asString(takeaway.text)) {
    out.takeaway = { text: asString(takeaway.text).trim() };
    const status2 = normalizeStatus(takeaway.status);
    if (status2) out.takeaway.status = status2;
    const detail2 = asString(takeaway.detail);
    if (detail2) out.takeaway.detail = detail2;
    if (takeaway.value !== void 0 && takeaway.value !== null && takeaway.value !== "") {
      const parsed = parseNumberish(takeaway.value);
      out.takeaway.value = parsed ? parsed.value : asString(takeaway.value);
      const unit = asString(takeaway.unit) ?? parsed?.unit;
      if (unit) out.takeaway.unit = unit;
    }
  }
  const detail = maybeJson(doc.detail);
  if (typeof detail === "string" && detail.trim()) out.detail = { markdown: detail };
  else if (isRecord(detail)) {
    const markdown = asString(detail.markdown);
    const sections = asArray(detail.sections).filter(isRecord).map((s) => ({ title: asString(s.title) ?? "", markdown: asString(s.markdown) ?? "" })).filter((s) => s.markdown);
    if (markdown || sections.length) out.detail = { ...markdown ? { markdown } : {}, ...sections.length ? { sections } : {} };
  }
  const evidence2 = asArray(doc.evidence).filter(isRecord).filter((e) => asString(e.label));
  if (evidence2.length) {
    out.evidence = evidence2.map((e) => ({
      label: asString(e.label),
      ...asString(e.value) ? { value: asString(e.value) } : {},
      ...typeof e.supports === "boolean" ? { supports: e.supports } : {},
      ...asString(e.source) ? { source: asString(e.source) } : {}
    }));
  }
  const sources = normalizeSources(doc.sources);
  if (sources.length) out.sources = sources;
  const speech = maybeJson(doc.speech);
  if (isRecord(speech) && asString(speech.summary)) out.speech = { summary: asString(speech.summary) };
  else if (typeof speech === "string" && speech.trim()) out.speech = { summary: speech };
  return out;
}
function normalizeSources(value) {
  return asArray(value).map((s) => typeof s === "string" ? { label: s } : s).filter(isRecord).filter((s) => asString(s.label) || asString(s.ref)).map((s) => ({
    label: asString(s.label) ?? asString(s.ref),
    ...asString(s.ref) ? { ref: asString(s.ref) } : {},
    ...asString(s.location) ? { location: asString(s.location) } : {}
  }));
}
function normalizeActions(value) {
  const intents = /* @__PURE__ */ new Set(["agent", "expand", "copy", "open"]);
  return asArray(value).filter(isRecord).filter((a) => asString(a.label)).map((a, i) => {
    const label = asString(a.label);
    const prompt = asString(a.prompt);
    const target = asString(a.target);
    let intent = typeof a.intent === "string" && intents.has(a.intent) ? a.intent : void 0;
    if (!intent) intent = target && !prompt ? "expand" : "agent";
    const action2 = { id: asString(a.id) ?? (slug(label) || `action-${i + 1}`), label, intent };
    if (prompt) action2.prompt = prompt;
    else if (intent === "agent") action2.prompt = label;
    if (target) action2.target = target;
    const v = asString(a.value);
    if (v) action2.value = v;
    return action2;
  });
}
function assignPriorities(blocks) {
  blocks.forEach((block2, i) => {
    if (block2.priority) return;
    block2.priority = i < 4 ? "primary" : "secondary";
  });
}
function dedupeIds(blocks) {
  const seen = /* @__PURE__ */ new Set();
  for (const block2 of blocks) {
    let id = block2.id;
    let n = 2;
    while (seen.has(id)) id = `${block2.id}-${n++}`;
    block2.id = id;
    seen.add(id);
  }
}
function normalizeBase(raw, type, index) {
  const base2 = { type };
  const title = asString(raw.title);
  if (title) base2.title = title;
  base2.id = asString(raw.id) ?? (title ? slug(title) : `${type}-${index + 1}`);
  const priority = typeof raw.priority === "string" ? raw.priority.toLowerCase() : void 0;
  if (priority === "primary" || priority === "secondary" || priority === "detail") base2.priority = priority;
  if (raw.emphasis === "strong" || raw.emphasis === "normal" || raw.emphasis === "subtle") base2.emphasis = raw.emphasis;
  if (raw.density === "compact" || raw.density === "normal" || raw.density === "comfortable") base2.density = raw.density;
  const sources = normalizeSources(raw.sources);
  if (sources.length) base2.sources = sources;
  return base2;
}
function resolveType(raw) {
  const t = asString(raw.type)?.trim().toLowerCase();
  if (!t) return void 0;
  if (BLOCK_TYPES.includes(t)) return t;
  return TYPE_ALIASES[t] ?? t;
}
function normalizeBlock(input, index) {
  const raw = maybeJson(input);
  if (typeof raw === "string") {
    return { type: "text", text: raw, id: `text-${index + 1}`, priority: void 0 };
  }
  if (!isRecord(raw)) return void 0;
  const type = resolveType(raw);
  if (!type) return unknownBlock(raw, "untyped", index);
  const base2 = normalizeBase(raw, type, index);
  const detail = asString(raw.detail);
  const status2 = normalizeStatus(raw.status);
  const b = (extra) => ({ ...base2, ...extra });
  switch (type) {
    case "verdict": {
      const text2 = asString(raw.text) ?? asString(raw.verdict) ?? asString(raw.label) ?? asString(raw.title);
      if (!text2) return unknownBlock(raw, type, index);
      return b({
        text: text2,
        ...status2 ? { status: status2 } : {},
        ...detail ? { detail } : {},
        ...asString(raw.next) ? { next: asString(raw.next) } : {},
        ...asString(raw.command) ? { command: asString(raw.command) } : {}
      });
    }
    case "metric": {
      const label = asString(raw.label) ?? asString(raw.title) ?? asString(raw.name) ?? "";
      const parsed = parseNumberish(raw.value);
      const value = parsed ? parsed.value : asString(raw.value);
      if (value === void 0) return unknownBlock(raw, type, index);
      const unit = asString(raw.unit) ?? parsed?.unit;
      const extra = { label, value };
      if (unit) extra.unit = unit;
      for (const key of ["max", "min", "target"]) {
        const n = parseNumberish(raw[key]);
        if (n) extra[key] = n.value;
      }
      const trend2 = asArray(raw.trend).map((v) => parseNumberish(v)?.value).filter((v) => v !== void 0);
      if (trend2.length) extra.trend = trend2;
      if (raw.delta !== void 0 && raw.delta !== null && raw.delta !== "") extra.delta = typeof raw.delta === "number" ? raw.delta : asString(raw.delta);
      if (status2) extra.status = status2;
      const caption = asString(raw.caption);
      if (caption) extra.caption = caption;
      if (typeof raw.higherIsBetter === "boolean") extra.higherIsBetter = raw.higherIsBetter;
      if (detail) extra.detail = detail;
      if (base2.title === label) delete base2.title;
      return b(extra);
    }
    case "metrics": {
      const items = asArray(raw.items ?? raw.metrics).filter(isRecord).map((item) => {
        const parsed = parseNumberish(item.value);
        const value = parsed ? parsed.value : asString(item.value) ?? "\u2013";
        const out = { label: asString(item.label) ?? asString(item.name) ?? "", value };
        const unit = asString(item.unit) ?? parsed?.unit;
        if (unit) out.unit = unit;
        const s = normalizeStatus(item.status);
        if (s) out.status = s;
        if (item.delta !== void 0 && item.delta !== null && item.delta !== "") out.delta = typeof item.delta === "number" ? item.delta : asString(item.delta);
        if (asString(item.caption)) out.caption = asString(item.caption);
        const max = parseNumberish(item.max);
        if (max) out.max = max.value;
        return out;
      });
      if (!items.length) return unknownBlock(raw, type, index);
      return b({ items, ...detail ? { detail } : {} });
    }
    case "comparison":
      return normalizeComparison(raw, b, index, detail);
    case "flow":
    case "architecture": {
      const graph = normalizeGraph(raw, type === "flow");
      if (!graph.nodes.length) return unknownBlock(raw, type, index);
      const extra = { ...graph };
      if (type === "architecture") {
        const boundaries = asArray(raw.boundaries).filter(isRecord).filter((x) => asString(x.label)).map((x) => ({
          label: asString(x.label),
          note: asString(x.note) ?? asString(x.value) ?? "",
          ...normalizeStatus(x.status) ? { status: normalizeStatus(x.status) } : {}
        }));
        if (boundaries.length) extra.boundaries = boundaries;
        if (asString(raw.boundaryTitle)) extra.boundaryTitle = asString(raw.boundaryTitle);
      }
      if (detail) extra.detail = detail;
      return b(extra);
    }
    case "timeline": {
      const events = asArray(raw.events ?? raw.items).filter(isRecord).map((e) => ({
        at: asString(e.at) ?? asString(e.time) ?? asString(e.date) ?? "",
        label: asString(e.label) ?? asString(e.text) ?? asString(e.event) ?? "",
        ...normalizeStatus(e.status) ? { status: normalizeStatus(e.status) } : {},
        ...asString(e.note) ? { note: asString(e.note) } : {}
      })).filter((e) => e.label || e.at);
      if (!events.length) return unknownBlock(raw, type, index);
      return b({ events, ...detail ? { detail } : {} });
    }
    case "trend": {
      let series = asArray(raw.series).map((s) => Array.isArray(s) ? { values: s } : s).filter(isRecord).map((s) => ({
        ...asString(s.name) ? { name: asString(s.name) } : {},
        values: asArray(s.values ?? s.data).map((v) => parseNumberish(v)?.value).filter((v) => v !== void 0)
      })).filter((s) => s.values.length > 0);
      if (!series.length) {
        const values = asArray(raw.values ?? raw.data).map((v) => parseNumberish(v)?.value).filter((v) => v !== void 0);
        if (values.length) series = [{ values }];
      }
      if (!series.length) return unknownBlock(raw, type, index);
      const extra = { series };
      const label = asString(raw.label);
      if (label) extra.label = label;
      const xLabels = asArray(raw.xLabels ?? raw.labels).map(asString).filter((v) => v !== void 0);
      if (xLabels.length) extra.xLabels = xLabels;
      if (asString(raw.unit)) extra.unit = asString(raw.unit);
      if (status2) extra.status = status2;
      const threshold = parseNumberish(raw.threshold);
      if (threshold) extra.threshold = threshold.value;
      if (asString(raw.annotation)) extra.annotation = asString(raw.annotation);
      if (detail) extra.detail = detail;
      return b(extra);
    }
    case "distribution": {
      const items = asArray(raw.items ?? raw.data).filter(isRecord).map((item) => ({
        label: asString(item.label) ?? asString(item.name) ?? "",
        value: parseNumberish(item.value)?.value ?? 0,
        ...normalizeStatus(item.status) ? { status: normalizeStatus(item.status) } : {}
      }));
      if (!items.length) return unknownBlock(raw, type, index);
      return b({
        items,
        ...asString(raw.unit) ? { unit: asString(raw.unit) } : {},
        ...raw.whole === true || raw.stacked === true ? { whole: true } : {},
        ...detail ? { detail } : {}
      });
    }
    case "risk": {
      const items = asArray(raw.items ?? raw.risks).filter(isRecord).map((item) => ({
        label: asString(item.label) ?? asString(item.name) ?? "",
        impact: normalizeLevel(item.impact ?? item.severity),
        likelihood: normalizeLevel(item.likelihood ?? item.probability),
        ...normalizeStatus(item.status) ? { status: normalizeStatus(item.status) } : {},
        ...asString(item.note) ? { note: asString(item.note) } : {}
      }));
      if (!items.length) return unknownBlock(raw, type, index);
      return b({ items, ...detail ? { detail } : {} });
    }
    case "hierarchy": {
      let root = normalizeHierarchyNode(raw.root);
      if (!root) {
        const children = asArray(raw.children ?? raw.nodes ?? raw.items).map(normalizeHierarchyNode).filter((n) => !!n);
        if (children.length === 1) root = children[0];
        else if (children.length) root = { label: asString(raw.label) ?? base2.title ?? "", children };
      }
      if (!root) return unknownBlock(raw, type, index);
      return b({ root, ...detail ? { detail } : {} });
    }
    case "checklist": {
      const items = asArray(raw.items).map((item) => typeof item === "string" ? { label: item, state: "pending" } : item).filter(isRecord).map((item) => ({
        label: asString(item.label) ?? asString(item.text) ?? "",
        state: normalizeCheckState(item.state ?? item.status ?? item.done),
        ...asString(item.note) ? { note: asString(item.note) } : {}
      }));
      if (!items.length) return unknownBlock(raw, type, index);
      return b({ items, ...detail ? { detail } : {} });
    }
    case "evidence": {
      const claim = asString(raw.claim) ?? asString(raw.text) ?? asString(raw.title);
      if (!claim) return unknownBlock(raw, type, index);
      const items = asArray(raw.items ?? raw.evidence).map((item) => typeof item === "string" ? { label: item } : item).filter(isRecord).filter((item) => asString(item.label)).map((item) => ({
        label: asString(item.label),
        ...asString(item.value ?? item.at) ? { value: asString(item.value ?? item.at) } : {},
        ...typeof item.supports === "boolean" ? { supports: item.supports } : {},
        ...asString(item.source) ? { source: asString(item.source) } : {}
      }));
      return b({
        claim,
        ...raw.confidence !== void 0 ? { confidence: normalizeLevel(raw.confidence) } : {},
        items,
        ...detail ? { detail } : {}
      });
    }
    case "change": {
      const files = asArray(raw.files ?? raw.items).filter(isRecord).filter((f) => asString(f.path ?? f.file)).map((f) => ({
        path: asString(f.path ?? f.file),
        ...parseNumberish(f.added ?? f.additions) ? { added: parseNumberish(f.added ?? f.additions).value } : {},
        ...parseNumberish(f.removed ?? f.deletions) ? { removed: parseNumberish(f.removed ?? f.deletions).value } : {},
        ...f.risk !== void 0 ? { risk: normalizeLevel(f.risk) } : {},
        ...asString(f.note) ? { note: asString(f.note) } : {}
      }));
      if (!files.length) return unknownBlock(raw, type, index);
      return b({ files, ...detail ? { detail } : {} });
    }
    case "progress": {
      const items = asArray(raw.items).filter(isRecord).map((item) => ({
        label: asString(item.label) ?? "",
        ...parseNumberish(item.value) ? { value: parseNumberish(item.value).value } : {},
        ...parseNumberish(item.total) ? { total: parseNumberish(item.total).value } : {},
        ...item.state !== void 0 || item.status !== void 0 ? { state: normalizeCheckState(item.state ?? item.status) } : {}
      }));
      if (!items.length) return unknownBlock(raw, type, index);
      const signal = isRecord(raw.signal) && asString(raw.signal.label) ? {
        label: asString(raw.signal.label),
        ...asString(raw.signal.value) ? { value: asString(raw.signal.value) } : {},
        ...normalizeStatus(raw.signal.status) ? { status: normalizeStatus(raw.signal.status) } : {}
      } : void 0;
      return b({ items, ...signal ? { signal } : {}, ...detail ? { detail } : {} });
    }
    case "text": {
      const text2 = asString(raw.text) ?? asString(raw.markdown) ?? asString(raw.content);
      if (!text2) return unknownBlock(raw, type, index);
      return b({ text: text2, ...detail ? { detail } : {} });
    }
    default:
      return unknownBlock(raw, type, index);
  }
}
function normalizeComparison(raw, b, index, detail) {
  const options = asArray(raw.options ?? raw.alternatives).map((o) => typeof o === "string" ? { label: o } : o).filter(isRecord).filter((o) => asString(o.label ?? o.name)).map((o) => {
    const label = asString(o.label ?? o.name);
    return { id: asString(o.id) ?? slug(label), label, ...asString(o.summary) ? { summary: asString(o.summary) } : {} };
  });
  if (options.length < 1) return unknownBlock(raw, "comparison", index);
  const dimensions = asArray(raw.dimensions ?? raw.criteria).filter(isRecord).map((d) => {
    const rawValues = maybeJson(d.values);
    let values;
    if (Array.isArray(rawValues)) values = rawValues;
    else if (isRecord(rawValues)) {
      values = options.map((o) => rawValues[o.id] ?? rawValues[o.label] ?? "");
    } else values = [];
    const normalized = options.map((_, i) => normalizeComparisonValue(values[i]));
    return {
      label: asString(d.label) ?? asString(d.name) ?? "",
      values: normalized,
      ...d.better === "lower" || d.lowerIsBetter === true ? { better: "lower" } : { better: "higher" },
      ...asString(d.unit) ? { unit: asString(d.unit) } : {}
    };
  });
  const winnerRaw = asString(raw.winner ?? raw.recommended ?? raw.pick);
  const winner = winnerRaw ? options.find((o) => o.id === winnerRaw || o.label.toLowerCase() === winnerRaw.toLowerCase() || slug(winnerRaw) === o.id)?.id : void 0;
  return b({
    options,
    dimensions,
    ...winner ? { winner } : {},
    ...asString(raw.rationale) ? { rationale: asString(raw.rationale) } : {},
    ...detail ? { detail } : {}
  });
}
function normalizeComparisonValue(value) {
  if (value === void 0 || value === null) return {};
  if (typeof value === "number") return { value };
  if (typeof value === "string") {
    const parsed = parseNumberish(value);
    return parsed ? { value: parsed.value, label: value } : { label: value };
  }
  if (isRecord(value)) {
    const parsed = parseNumberish(value.value);
    const out = {};
    if (parsed) out.value = parsed.value;
    const label = asString(value.label) ?? (parsed ? void 0 : asString(value.value));
    if (label) out.label = label;
    if (asString(value.note)) out.note = asString(value.note);
    return out;
  }
  return {};
}
function normalizeGraph(raw, sequentialDefault) {
  const kinds = /* @__PURE__ */ new Set(["step", "service", "store", "actor", "external", "decision", "outcome"]);
  const rawNodes = asArray(raw.nodes ?? raw.steps ?? raw.components ?? raw.items);
  const nodes = [];
  const byLabel = /* @__PURE__ */ new Map();
  rawNodes.forEach((n, i) => {
    const item = typeof n === "string" ? { label: n } : n;
    if (!isRecord(item)) return;
    const label = asString(item.label) ?? asString(item.name) ?? asString(item.id);
    if (!label) return;
    const id = asString(item.id) ?? slug(label) ?? `n${i}`;
    const node = { id, label };
    const kind = asString(item.kind)?.toLowerCase();
    if (kind && kinds.has(kind)) node.kind = kind;
    const s = normalizeStatus(item.status);
    if (s) node.status = s;
    if (asString(item.note)) node.note = asString(item.note);
    nodes.push(node);
    byLabel.set(label.toLowerCase(), id);
  });
  const ids = new Set(nodes.map((n) => n.id));
  const resolve = (ref) => {
    const s = asString(ref);
    if (!s) return void 0;
    if (ids.has(s)) return s;
    return byLabel.get(s.toLowerCase()) ?? (ids.has(slug(s)) ? slug(s) : void 0);
  };
  const rawEdges = raw.edges ?? raw.links ?? raw.connections;
  let edges = asArray(rawEdges).filter(isRecord).map((e) => {
    const from = resolve(e.from ?? e.source);
    const to = resolve(e.to ?? e.target);
    if (!from || !to || from === to) return void 0;
    const edge = { from, to };
    if (asString(e.label)) edge.label = asString(e.label);
    const s = normalizeStatus(e.status);
    if (s) edge.status = s;
    return edge;
  }).filter((e) => e !== void 0);
  if (rawEdges === void 0 && sequentialDefault) {
    edges = nodes.slice(1).map((n, i) => ({ from: nodes[i].id, to: n.id }));
  }
  return { nodes, edges };
}
function normalizeHierarchyNode(value) {
  if (typeof value === "string") return { label: value };
  if (!isRecord(value)) return void 0;
  const label = asString(value.label) ?? asString(value.name);
  if (label === void 0) return void 0;
  const node = { label };
  if (asString(value.note)) node.note = asString(value.note);
  const s = normalizeStatus(value.status);
  if (s) node.status = s;
  const children = asArray(value.children).map(normalizeHierarchyNode).filter((n) => !!n);
  if (children.length) node.children = children;
  return node;
}
function unknownBlock(raw, originalType, index) {
  const fallback = [];
  const text2 = asString(raw.text) ?? asString(raw.label) ?? asString(raw.title);
  if (text2) fallback.push(text2);
  const nodes = asArray(raw.nodes);
  const edges = asArray(raw.edges);
  if (edges.length) {
    for (const e of edges.filter(isRecord)) fallback.push(`${asString(e.from) ?? "?"} -> ${asString(e.to) ?? "?"}`);
  } else if (nodes.length) {
    fallback.push(nodes.map((n) => isRecord(n) ? asString(n.label) ?? asString(n.id) : asString(n)).filter(Boolean).join(" -> "));
  }
  for (const item of asArray(raw.items).slice(0, 8)) {
    if (typeof item === "string") fallback.push(`\u2022 ${item}`);
    else if (isRecord(item)) {
      const label = asString(item.label) ?? asString(item.name) ?? "";
      const value = asString(item.value);
      fallback.push(value !== void 0 ? `\u2022 ${label}: ${value}` : `\u2022 ${label}`);
    }
  }
  const block2 = {
    type: "unknown",
    originalType,
    fallback,
    id: asString(raw.id) ?? `${slug(originalType)}-${index + 1}`,
    priority: raw.priority ?? void 0
  };
  const title = asString(raw.title);
  if (title) block2.title = title;
  return block2;
}

// ../core/src/semantics.ts
var STATUS_RANK = { critical: 4, warning: 3, info: 2, neutral: 1, good: 0 };
function statusRank(status2) {
  return status2 ? STATUS_RANK[status2] : 1;
}
var LEVEL_SCORE = { low: 1, medium: 2, high: 3 };
function riskScore(impact, likelihood) {
  return LEVEL_SCORE[impact] * LEVEL_SCORE[likelihood];
}
function riskSeverity(impact, likelihood) {
  const score = riskScore(impact, likelihood);
  return score >= 9 ? "critical" : score >= 6 ? "warning" : "neutral";
}
function deriveSpeech(doc) {
  if (doc.speech?.summary) return doc.speech.summary;
  const parts = [];
  if (doc.takeaway) {
    parts.push(sentence(doc.takeaway.text));
    if (doc.takeaway.detail) parts.push(sentence(doc.takeaway.detail));
  }
  const verdict2 = doc.blocks.find((b) => b.type === "verdict");
  if (verdict2 && verdict2.type === "verdict") {
    if (!doc.takeaway) parts.push(sentence(verdict2.text));
    if (verdict2.next) parts.push(sentence(verdict2.next));
  }
  if (!parts.length && doc.title) parts.push(sentence(doc.title));
  const agentActions = doc.actions.filter((a) => a.intent === "agent").map((a) => a.label.toLowerCase());
  if (agentActions.length) parts.push(`I can ${joinOr(agentActions)}.`);
  return parts.join(" ");
}
function sentence(text2) {
  const t = text2.trim();
  if (!t) return t;
  const cased = t === t.toUpperCase() && /[A-Z]/.test(t) ? t.charAt(0) + t.slice(1).toLowerCase() : t;
  return /[.!?]$/.test(cased) ? cased : `${cased}.`;
}
function joinOr(items) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} or ${items[items.length - 1]}`;
}
function describeBlock(block2) {
  const title = block2.title ? `${block2.title}: ` : "";
  switch (block2.type) {
    case "verdict":
      return `${title}verdict "${block2.text}"${block2.detail ? ` (${block2.detail})` : ""}${block2.next ? `; next: ${block2.next}` : ""}`;
    case "metric":
      return `${title}${block2.label} = ${block2.value}${block2.unit ?? ""}${block2.max !== void 0 ? ` / ${block2.max}` : ""}`;
    case "metrics":
      return `${title}${block2.items.map((i) => `${i.label} ${i.value}${i.unit ?? ""}`).join(", ")}`;
    case "comparison": {
      const winner = block2.options.find((o) => o.id === block2.winner);
      return `${title}comparison of ${block2.options.map((o) => o.label).join(" vs ")} on ${block2.dimensions.length} dimensions${winner ? `; pick ${winner.label}` : ""}`;
    }
    case "flow":
    case "architecture": {
      const label = new Map(block2.nodes.map((n) => [n.id, n.label]));
      const edges = (block2.edges ?? []).map((e) => `${label.get(e.from)}\u2192${label.get(e.to)}${e.status === "critical" ? "(broken)" : ""}`);
      return `${title}${block2.type} ${edges.length ? edges.join(", ") : block2.nodes.map((n) => n.label).join(", ")}`;
    }
    case "timeline":
      return `${title}timeline ${block2.events.map((e) => `${e.at} ${e.label}`).join(" \u2192 ")}`;
    case "trend": {
      const values = block2.series[0]?.values ?? [];
      return `${title}trend ${block2.label ?? ""} from ${values[0]} to ${values[values.length - 1]}${block2.unit ?? ""}`;
    }
    case "distribution":
      return `${title}${block2.items.map((i) => `${i.label} ${i.value}${block2.unit ?? ""}`).join(", ")}`;
    case "risk":
      return `${title}risks ${block2.items.map((i) => `${i.label} (impact ${i.impact}, likelihood ${i.likelihood})`).join(", ")}`;
    case "hierarchy":
      return `${title}tree rooted at ${block2.root.label}`;
    case "checklist":
      return `${title}${block2.items.map((i) => `${i.state === "done" ? "\u2713" : i.state === "failed" ? "\u2715" : "\u25CB"} ${i.label}`).join(", ")}`;
    case "evidence":
      return `${title}claim "${block2.claim}" (${block2.confidence ?? "unrated"} confidence, ${block2.items.length} observations)`;
    case "change":
      return `${title}${block2.files.length} files changed`;
    case "progress":
      return `${title}progress ${block2.items.map((i) => `${i.label} ${i.value ?? ""}${i.total ? `/${i.total}` : ""}`).join(", ")}`;
    case "text":
      return `${title}${block2.text.slice(0, 120)}`;
    case "unknown":
      return `${title}unsupported ${block2.originalType}`;
  }
}
function outline(doc) {
  const lines = [];
  if (doc.title) lines.push(`Title: ${doc.title}${doc.subtitle ? ` (${doc.subtitle})` : ""}`);
  if (doc.takeaway) lines.push(`Takeaway [${doc.takeaway.status ?? "neutral"}]: ${doc.takeaway.text}${doc.takeaway.detail ? ` \u2014 ${doc.takeaway.detail}` : ""}`);
  for (const block2 of doc.blocks) lines.push(`- ${describeBlock(block2)}`);
  if (doc.actions.length) lines.push(`Actions: ${doc.actions.map((a) => a.label).join(", ")}`);
  return lines.join("\n");
}

// src/index.ts
import {
  copyToClipboard,
  keyText
} from "@earendil-works/pi-coding-agent";
import { Container, Text } from "@earendil-works/pi-tui";

// ../../examples/architecture.json
var architecture_default = {
  present: "0.1",
  title: "Authentication",
  intent: "explanation",
  takeaway: { status: "warning", text: "Sessions live 30 days with no rotation", detail: "Everything else follows best practice" },
  blocks: [
    {
      type: "architecture",
      id: "auth-flow",
      nodes: [
        { id: "browser", label: "browser", kind: "actor" },
        { id: "api", label: "API" },
        { id: "password", label: "password" },
        { id: "oauth", label: "OAuth" },
        { id: "session", label: "Session", status: "warning", note: "30d, no rotation" },
        { id: "user", label: "USER", kind: "outcome" }
      ],
      edges: [
        { from: "browser", to: "api", label: "POST /login" },
        { from: "api", to: "password" },
        { from: "api", to: "oauth" },
        { from: "password", to: "session" },
        { from: "oauth", to: "session" },
        { from: "session", to: "user", label: "signed cookie" }
      ],
      boundaryTitle: "Trust boundary",
      boundaries: [
        { label: "browser", note: "untrusted", status: "critical" },
        { label: "cookie", note: "signed (HMAC-SHA256)", status: "good" },
        { label: "session DB", note: "trusted", status: "good" },
        { label: "OAuth token", note: "never reaches browser", status: "good" }
      ]
    },
    {
      type: "verdict",
      title: "Main risk",
      text: "Session lifetime is 30 days with no rotation",
      status: "warning",
      next: "Rotate session id on privilege change; cap lifetime at 7 days"
    }
  ],
  actions: [
    { id: "rotate", label: "Add session rotation", intent: "agent", prompt: "Implement session id rotation on login and privilege change, and cap session lifetime at 7 days." }
  ],
  sources: [
    { label: "login route", ref: "src/routes/login.ts" },
    { label: "session store", ref: "src/auth/session-store.ts" },
    { label: "oauth callback", ref: "src/auth/oauth.ts" }
  ],
  detail: {
    markdown: "`POST /login` hits the API, which delegates to either the password verifier (argon2id) or the OAuth callback handler. Both produce a `Session` row and the API answers with a signed, `HttpOnly`, `SameSite=Lax` cookie. OAuth access tokens stay server-side. The weak point is lifetime: sessions are valid for 30 days and the id is never rotated, so a stolen cookie stays valid for a month."
  }
};

// ../../examples/comparison.json
var comparison_default = {
  present: "0.1",
  title: "Local LLM box",
  intent: "comparison",
  takeaway: { status: "good", text: "Pick Strix Halo", detail: "Big models matter more than raw speed for this workload" },
  blocks: [
    {
      type: "comparison",
      id: "hardware",
      options: [
        { id: "strix", label: "Strix Halo", summary: "big models" },
        { id: "rtx", label: "RTX 5090", summary: "raw speed" },
        { id: "mac", label: "Mac Studio", summary: "quiet desk" }
      ],
      dimensions: [
        { label: "Memory", unit: "GB", values: [128, 32, 96] },
        { label: "Speed", unit: "tok/s", values: [32, 81, 41] },
        { label: "Power", unit: "W", better: "lower", values: [120, 575, 270] },
        { label: "Price", unit: "\u20AC", better: "lower", values: [2100, 3400, 4600] },
        { label: "Noise", values: [{ value: 2, label: "quiet" }, { value: 5, label: "loud" }, { value: 1, label: "silent" }], better: "lower" }
      ],
      winner: "strix",
      rationale: "Only option that fits a 70B model at 4-bit with room for context"
    }
  ],
  actions: [
    { id: "build", label: "Draft a parts list", intent: "agent", prompt: "Draft a parts list and total price for a Strix Halo build with 128 GB." }
  ]
};

// ../../examples/debugging.json
var debugging_default = {
  present: "0.1",
  title: "Why the app is slower",
  intent: "diagnosis",
  takeaway: { status: "critical", text: "N+1 query in order history", detail: "Introduced in a3f9c1, grows with order count", value: 680, unit: "ms" },
  blocks: [
    {
      type: "trend",
      id: "latency",
      title: "p95 latency",
      label: "p95",
      unit: "ms",
      series: [{ values: [102, 98, 110, 105, 112, 180, 240, 310, 330, 420, 510, 520, 600, 680] }],
      xLabels: ["09", "10", "11", "12"],
      threshold: 300,
      status: "critical",
      annotation: "deploy a3f9c1"
    },
    {
      type: "flow",
      id: "cause",
      title: "Causal chain",
      nodes: [
        { id: "deploy", label: "deploy a3f9c1" },
        { id: "loop", label: "orders.map(load)", status: "warning" },
        { id: "queries", label: "1 query / order", status: "critical" },
        { id: "pool", label: "pool exhausted", status: "critical" }
      ]
    },
    {
      type: "metrics",
      id: "key-metrics",
      items: [
        { label: "p95", value: 680, unit: "ms", status: "critical", delta: "+566%" },
        { label: "queries/req", value: 214, status: "critical", delta: "+212" },
        { label: "db pool", value: 100, unit: "%", status: "critical" },
        { label: "error rate", value: 0.4, unit: "%", status: "good" }
      ]
    },
    {
      type: "verdict",
      title: "Next",
      text: "Batch the order lookups",
      status: "info",
      next: "Replace per-order load() with a single WHERE id IN (\u2026) query",
      command: "src/orders/history.ts:42"
    }
  ],
  actions: [
    { id: "fix", label: "Fix the N+1", intent: "agent", prompt: "Replace the per-order load() in src/orders/history.ts with a batched query and add a regression test that asserts the query count." }
  ],
  evidence: [
    { label: "first slow request", value: "10:02, 4 min after deploy" },
    { label: "query log", value: "214 SELECTs for a 213-order account" },
    { label: "revert on staging", value: "p95 back to 104 ms" }
  ],
  sources: [
    { label: "commit", ref: "a3f9c1" },
    { label: "history loader", ref: "src/orders/history.ts", location: "38-57" }
  ]
};

// ../../examples/progress.json
var progress_default = {
  present: "0.1",
  title: "Analyzing repository",
  intent: "progress",
  blocks: [
    {
      type: "progress",
      items: [
        { label: "files", value: 64, total: 81, state: "running" },
        { label: "tests", state: "done" },
        { label: "deps", value: 34, total: 61, state: "running" }
      ],
      signal: { label: "auth migration", value: "high risk", status: "critical" }
    }
  ]
};

// ../../examples/repo-review.json
var repo_review_default = {
  present: "0.1",
  title: "Release",
  subtitle: "v2.8.0",
  intent: "decision",
  takeaway: {
    status: "warning",
    text: "Don't ship yet",
    detail: "2 blockers remain",
    value: 87,
    unit: "%"
  },
  blocks: [
    {
      type: "distribution",
      id: "tests",
      title: "Tests",
      whole: true,
      items: [
        { label: "pass", value: 418, status: "good" },
        { label: "fail", value: 11, status: "critical" },
        { label: "flaky", value: 6, status: "warning" }
      ]
    },
    {
      type: "risk",
      id: "risk-map",
      title: "Risk map",
      items: [
        { label: "auth migration", impact: "high", likelihood: "high" },
        { label: "payment retry", impact: "high", likelihood: "medium" },
        { label: "flaky e2e", impact: "medium", likelihood: "medium" },
        { label: "docs drift", impact: "medium", likelihood: "low" }
      ]
    },
    {
      type: "flow",
      id: "blocking-path",
      title: "Blocking path",
      nodes: [
        { id: "api", label: "API" },
        { id: "auth", label: "Auth" },
        { id: "mig", label: "users migration", status: "critical", note: "column missing" }
      ],
      edges: [
        { from: "api", to: "auth" },
        { from: "auth", to: "mig", status: "critical" }
      ]
    },
    {
      type: "verdict",
      text: "Fix this first",
      status: "critical",
      next: "Apply migration 182 before tagging",
      command: "pnpm db:migrate"
    },
    {
      type: "trend",
      id: "retry-queue",
      title: "Payment retry queue",
      label: "queue depth",
      priority: "secondary",
      series: [{ values: [12, 14, 13, 18, 25, 41, 66, 98, 140, 188] }],
      xLabels: ["09:00", "10:00", "11:00", "12:00"],
      status: "warning"
    },
    {
      type: "change",
      id: "change-impact",
      title: "Change impact",
      priority: "secondary",
      files: [
        { path: "src/auth/session.ts", added: 42, removed: 17, risk: "high" },
        { path: "src/db/schema.ts", added: 11, removed: 2, risk: "high" },
        { path: "src/web/login.tsx", added: 18, removed: 8, risk: "medium" },
        { path: "tests/auth.test.ts", added: 63, removed: 0, risk: "low" }
      ]
    },
    {
      type: "evidence",
      id: "migration-evidence",
      priority: "detail",
      title: "Why the migration",
      claim: "Auth failures began after migration 182.",
      confidence: "high",
      items: [
        { label: "migration deployed", value: "09:16" },
        { label: "failures begin", value: "09:16" },
        { label: "rollback", value: "09:21" },
        { label: "failures disappear", value: "09:21" }
      ]
    }
  ],
  actions: [
    { id: "fix", label: "Fix migration", intent: "agent", prompt: "Fix the users migration problem identified in the release review, then re-run the test suite." },
    { id: "explain", label: "Explain", intent: "expand", target: "migration-evidence" },
    { id: "flaky", label: "Quarantine flaky tests", intent: "agent", prompt: "List the 6 flaky tests and propose a quarantine plan." }
  ],
  detail: {
    markdown: "## Release review \u2014 v2.8.0\n\nThe release is **87% ready**. 418 of 435 tests pass; 11 fail and 6 are flaky.\n\n### Blocker 1 \u2014 users migration (critical)\nMigration `182_add_users_v4_columns` was generated but never applied in staging. `Auth.createSession` reads `users.last_login_ip`, which does not exist yet, so every login after 09:16 failed until rollback.\n\n### Blocker 2 \u2014 payment retry queue (high)\nThe retry worker re-enqueues on every 409 from the PSP. Queue depth grew from 12 to 188 in four hours.\n\n### Recommendation\nRun `pnpm db:migrate`, re-run `pnpm test`, then fix the retry back-off before tagging."
  },
  sources: [
    { label: "migration", ref: "db/migrations/182_add_users_v4_columns.sql" },
    { label: "session reader", ref: "src/auth/session.ts", location: "88-121" },
    { label: "test run", ref: "pnpm test --reporter=json" }
  ],
  speech: { summary: "The release is almost ready, but two issues remain. The database migration is the only critical blocker." }
};

// ../../examples/research.json
var research_default = {
  present: "0.1",
  title: "Vector DB for 50M docs",
  intent: "research",
  takeaway: { status: "good", text: "Postgres + pgvector is enough", detail: "Revisit at ~200M vectors" },
  blocks: [
    {
      type: "distribution",
      id: "evidence-weight",
      title: "Where the evidence points",
      unit: " sources",
      items: [
        { label: "pgvector suffices", value: 9, status: "good" },
        { label: "dedicated DB needed", value: 4, status: "warning" },
        { label: "inconclusive", value: 2 }
      ]
    },
    {
      type: "metrics",
      items: [
        { label: "recall@10", value: 0.97, status: "good" },
        { label: "p99 query", value: 38, unit: "ms", status: "good" },
        { label: "index build", value: 6.5, unit: "h", status: "warning" },
        { label: "infra cost", value: "+0", unit: "\u20AC", status: "good" }
      ]
    },
    {
      type: "hierarchy",
      title: "Options considered",
      root: {
        label: "vector search",
        children: [
          { label: "in Postgres", children: [{ label: "pgvector HNSW", status: "good", note: "pick" }, { label: "pgvecto.rs", note: "less mature" }] },
          { label: "dedicated", children: [{ label: "Qdrant", note: "best perf" }, { label: "Milvus", note: "ops heavy", status: "warning" }] },
          { label: "managed", children: [{ label: "Pinecone", note: "cost at 50M", status: "critical" }] }
        ]
      }
    },
    {
      type: "checklist",
      title: "Fit for us",
      items: [
        { label: "< 50 ms p99", state: "done" },
        { label: "no new infra", state: "done" },
        { label: "transactional with app data", state: "done" },
        { label: "index build under 2h", state: "failed", note: "6.5h" },
        { label: "tested at 200M", state: "pending" }
      ]
    }
  ],
  sources: [
    { label: "pgvector 0.8 benchmarks", ref: "https://github.com/pgvector/pgvector" },
    { label: "ANN-benchmarks", ref: "https://ann-benchmarks.com" },
    { label: "Qdrant benchmarks", ref: "https://qdrant.tech/benchmarks/" }
  ]
};

// ../../examples/timeline.json
var timeline_default = {
  present: "0.1",
  title: "Incident 2291",
  subtitle: "auth outage",
  intent: "summary",
  takeaway: { status: "good", text: "Resolved in 7 minutes", detail: "Root cause: migration 182 not applied" },
  blocks: [
    {
      type: "timeline",
      events: [
        { at: "09:14", label: "deploy" },
        { at: "09:16", label: "errors", status: "critical", note: "auth failures begin" },
        { at: "09:18", label: "rollback", status: "warning" },
        { at: "09:21", label: "stable", status: "good" }
      ]
    },
    {
      type: "metric",
      label: "Context used",
      value: 93,
      unit: "k",
      max: 128,
      caption: "93k / 128k tokens",
      status: "warning",
      trend: [12, 20, 31, 44, 52, 60, 71, 80, 93]
    },
    {
      type: "evidence",
      claim: "Auth failures began after migration 182.",
      confidence: "high",
      items: [
        { label: "migration deployed", value: "09:16" },
        { label: "failures begin", value: "09:16" },
        { label: "rollback", value: "09:21" },
        { label: "failures disappear", value: "09:21" }
      ]
    }
  ]
};

// src/demos.ts
var DEMOS = {
  "repo-review": repo_review_default,
  architecture: architecture_default,
  comparison: comparison_default,
  debugging: debugging_default,
  research: research_default,
  timeline: timeline_default,
  progress: progress_default
};

// src/instructions.ts
var TOOL_NAME = "present";
var TOOL_DESCRIPTION = `Present a result to the user as a native visual presentation (Present IR) instead of prose. The presentation IS your answer: it is rendered in the user's terminal as an infographic. Do not repeat its content in text afterwards.

Describe MEANING, not layout \u2014 the renderer decides widths, colours and borders.

Document: { title, subtitle?, intent, takeaway, blocks, actions?, detail?, evidence?, sources? }
- takeaway {text, status, detail?, value?, unit?}: the single dominant message \u2014 what happened, is it good or bad, what to do. text: 2-6 words ("Don't ship yet"). detail: one short line (\u2264 80 chars). value = optional headline number (rendered oversized).
- status everywhere: good | warning | critical | info | neutral. Put a status on anything that is good or bad.
- intent: decision | assessment | explanation | comparison | diagnosis | plan | status | progress | research | summary.

blocks \u2014 most important first; at most 5 are visible at a glance. Mark the rest priority "secondary" (shown on scan) or "detail" (shown on explore).
- verdict {text, status, detail?, next?, command?} \u2014 a conclusion, diagnosis or recommendation. text \u2264 8 words; detail and next one short line each.
- metric {label, value, unit?, max?, target?, trend?: number[], delta?, status?, caption?} \u2014 one number made meaningful.
- metrics {items: [{label, value, unit?, status?, delta?}]} \u2014 2-6 related numbers.
- comparison {options: [{id, label, summary?}], dimensions: [{label, values: [one per option, numbers preferred], unit?, better?: "higher"|"lower"}], winner?, rationale?} \u2014 trade-offs. Labels 1-3 words; summary \u2264 4 words ("big models").
- flow {nodes: [{id, label, status?, note?, kind?}], edges?: [{from, to, label?, status?}]} \u2014 process, pipeline or causal chain. Edge status "critical" draws a broken link. Omit edges to connect nodes in order.
- architecture {nodes, edges, boundaries?: [{label, note, status?}], boundaryTitle?} \u2014 systems and dependencies. kind "actor"/"outcome" renders unboxed (e.g. browser, user).
- timeline {events: [{at, label, status?, note?}]} \u2014 chronology.
- trend {label, series: [{values: number[]}], xLabels?, unit?, threshold?, annotation?, status?} \u2014 change over time.
- distribution {items: [{label, value, status?}], unit?, whole?} \u2014 quantities; whole: true when they are parts of one total (e.g. pass/fail/flaky).
- risk {items: [{label, impact, likelihood}]} \u2014 low | medium | high each.
- hierarchy {root: {label, note?, status?, children: [...]}} \u2014 a tree.
- checklist {items: [{label, state: done|failed|pending|skipped|warning|running, note?}]}.
- evidence {claim, confidence?, items: [{label, value?, supports?}]} \u2014 a claim and what supports it.
- change {files: [{path, added?, removed?, risk?}]} \u2014 code change impact.
- progress {items: [{label, value?, total?, state?}], signal?: {label, value?, status?}} \u2014 work in progress; use with intent "progress" (does not end your turn).
- text {text} \u2014 at most ~240 characters. Long explanations belong in detail.markdown.
Every block may also have: id, title (short section label, e.g. "Risk map"), priority, detail (Markdown shown on explore), sources.
Labels are labels, not sentences. Anything longer than a line belongs in detail.

- actions: [{id, label, intent: "agent", prompt}] \u2014 next steps the user can trigger with one key, or {intent: "expand", target: blockId}.
- detail: {markdown} \u2014 the long-form explanation, hidden until the user explores.
- evidence: [{label, value}] and sources: [{label, ref, location?}] \u2014 supporting material for explore.`;
var PROMPT_SNIPPET = "Present structured results visually (verdicts, metrics, comparisons, flows, risks, trends) instead of long prose";
var PROMPT_GUIDELINES = [
  "Use the present tool when your answer has structure \u2014 comparisons, analysis, plans, architecture, repository reviews, debugging findings, test results, research synthesis, status, decisions, performance, categorised lists or numbers. Show the structure instead of describing it: if five sentences describe relationships, present a flow with five nodes.",
  "A present call is the answer. Never repeat or summarise its content in prose afterwards; the user already sees it. Detailed explanation belongs in present's detail.markdown, behind progressive disclosure.",
  "For trivial questions (a single command, a one-line fact, yes/no) answer in plain text \u2014 do not call present.",
  "When calling present, lead with one dominant takeaway, use visual primitives for supporting facts, keep labels short, give numbers as numbers, and add a status to everything that is good or bad. Do not restate the takeaway in a verdict block, and do not invent data you did not observe.",
  'Call present with intent "progress" to show interim status during long work; finish with a final present call.'
];
var ALWAYS_GUIDELINE = "Agent Present is in ALWAYS mode: deliver every substantive answer through the present tool. Plain text is only for trivial replies.";
var TRANSFORM_SYSTEM_PROMPT = `You convert an AI agent's prose answer into a Present IR document so a human can understand it in ten seconds.

Rules:
- Preserve the facts. Never invent numbers, files, names or conclusions that are not in the answer.
- Compress. Find the single dominant message (takeaway) and show supporting structure with visual blocks.
- Prefer visual primitives over text blocks. Text blocks are at most ~240 characters.
- Put the original long explanation, lightly edited, into detail.markdown so nothing is lost.
- Output ONLY one JSON object (no Markdown fences, no commentary). It must have "present": "0.1" and "blocks".

${TOOL_DESCRIPTION}`;

// src/transform.ts
function extractJson(reply) {
  const fenced = reply.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : reply;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("model reply contained no JSON object");
  return JSON.parse(candidate.slice(start, end + 1));
}
async function transformToPresent(answer, complete) {
  const user = `Convert this agent answer into Present IR:

<answer>
${answer}
</answer>`;
  let reply = await complete(TRANSFORM_SYSTEM_PROMPT, user);
  let raw;
  try {
    raw = extractJson(reply);
  } catch (error) {
    reply = await complete(TRANSFORM_SYSTEM_PROMPT, `${user}

Your previous reply was not valid JSON (${error.message}). Reply with only the JSON object.`);
    raw = extractJson(reply);
  }
  raw = withVersion(raw);
  const result = validate(raw);
  if (!result.valid) {
    const repaired = await complete(
      TRANSFORM_SYSTEM_PROMPT,
      `${user}

Your previous document had schema errors:
${formatIssues(result.errors)}

Previous document:
${JSON.stringify(raw)}

Reply with the corrected JSON object only.`
    );
    try {
      const candidate = withVersion(extractJson(repaired));
      if (validate(candidate).errors.length < result.errors.length) raw = candidate;
    } catch {
    }
  }
  const doc = normalize(raw);
  if (!doc.blocks.length && !doc.takeaway) throw new Error("the model did not produce a presentable document");
  return { raw, doc };
}
function withVersion(raw) {
  if (raw && typeof raw === "object" && !Array.isArray(raw) && !("present" in raw)) return { present: "0.1", ...raw };
  return raw;
}
function lastAssistantText(entries) {
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (entry.type !== "message" || entry.message?.role !== "assistant") continue;
    const content = entry.message.content;
    const text2 = typeof content === "string" ? content : Array.isArray(content) ? content.filter((c) => !!c && typeof c === "object" && c.type === "text").map((c) => c.text).join("\n") : "";
    if (text2.trim()) return text2.trim();
  }
  return void 0;
}

// ../terminal/src/text.ts
var ANSI = /\x1b\[[0-9;?]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b_[^\x1b]*\x1b\\/g;
function stripAnsi(text2) {
  return text2.replace(ANSI, "");
}
function isWide(code) {
  return code >= 4352 && code <= 4447 || code >= 11904 && code <= 12350 || code >= 12353 && code <= 13311 || code >= 13312 && code <= 19903 || code >= 19968 && code <= 40959 || code >= 40960 && code <= 42191 || code >= 44032 && code <= 55203 || code >= 63744 && code <= 64255 || code >= 65072 && code <= 65103 || code >= 65280 && code <= 65376 || code >= 65504 && code <= 65510 || code >= 127744 && code <= 128591 || code >= 129280 && code <= 129535 || code >= 131072 && code <= 262141;
}
function charWidth(char) {
  const code = char.codePointAt(0) ?? 0;
  if (code === 0) return 0;
  if (code < 32 || code >= 127 && code < 160) return 0;
  if (code >= 768 && code <= 879) return 0;
  if (code === 8203 || code === 8205 || code === 65039) return 0;
  return isWide(code) ? 2 : 1;
}
function visibleWidth(text2) {
  let width = 0;
  for (const char of stripAnsi(text2)) width += charWidth(char);
  return width;
}
function truncate(text2, width, ellipsis = "\u2026") {
  if (width <= 0) return "";
  if (visibleWidth(text2) <= width) return text2;
  const ellipsisWidth = visibleWidth(ellipsis);
  const target = Math.max(0, width - ellipsisWidth);
  let out = "";
  let used = 0;
  let i = 0;
  let sawAnsi = false;
  while (i < text2.length) {
    ANSI.lastIndex = i;
    const match = ANSI.exec(text2);
    if (match && match.index === i) {
      out += match[0];
      sawAnsi = true;
      i += match[0].length;
      continue;
    }
    const char = String.fromCodePoint(text2.codePointAt(i));
    const w = charWidth(char);
    if (used + w > target) break;
    out += char;
    used += w;
    i += char.length;
  }
  return out + (sawAnsi ? "\x1B[0m" : "") + (width >= ellipsisWidth ? ellipsis : "");
}
function padEnd(text2, width) {
  const w = visibleWidth(text2);
  return w >= width ? text2 : text2 + " ".repeat(width - w);
}
function padStart(text2, width) {
  const w = visibleWidth(text2);
  return w >= width ? text2 : " ".repeat(width - w) + text2;
}
function center(text2, width) {
  const w = visibleWidth(text2);
  if (w >= width) return text2;
  const left = Math.floor((width - w) / 2);
  return " ".repeat(left) + text2 + " ".repeat(width - w - left);
}
function fit(text2, width) {
  return padEnd(truncate(text2, width), width);
}
function wrap(text2, width) {
  if (width <= 0) return [];
  const lines = [];
  for (const paragraph of text2.split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let line = "";
    for (let word of words) {
      while (visibleWidth(word) > width) {
        if (line) {
          lines.push(line);
          line = "";
        }
        lines.push(word.slice(0, width));
        word = word.slice(width);
      }
      if (!line) line = word;
      else if (visibleWidth(line) + 1 + visibleWidth(word) <= width) line += ` ${word}`;
      else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}
function columns(blocks, widths, gap = 2) {
  const height = Math.max(0, ...blocks.map((b) => b.length));
  const out = [];
  for (let row = 0; row < height; row++) {
    const parts = blocks.map((b, i) => i === blocks.length - 1 ? truncate(b[row] ?? "", widths[i]) : fit(b[row] ?? "", widths[i]));
    out.push(parts.join(" ".repeat(gap)).replace(/\s+$/, ""));
  }
  return out;
}

// ../terminal/src/style.ts
function statusRole(status2) {
  switch (status2) {
    case "good":
      return "good";
    case "warning":
      return "warning";
    case "critical":
      return "critical";
    case "info":
      return "info";
    default:
      return "neutral";
  }
}
var PALETTE = {
  text: null,
  strong: [236, 236, 236],
  muted: [150, 150, 150],
  dim: [100, 100, 100],
  accent: [125, 200, 190],
  good: [134, 192, 120],
  warning: [230, 180, 80],
  critical: [232, 100, 100],
  info: [122, 162, 247],
  neutral: [170, 170, 170]
};
var ANSI16 = {
  text: null,
  strong: 97,
  muted: 37,
  dim: 90,
  accent: 36,
  good: 32,
  warning: 33,
  critical: 31,
  info: 34,
  neutral: 37
};
function ansiStyle(options = {}) {
  const palette = { ...PALETTE, ...options.palette };
  const depth = options.depth ?? "truecolor";
  return {
    color: true,
    fg(role, text2) {
      if (!text2) return text2;
      if (depth === "ansi16") {
        const code = ANSI16[role];
        return code === null ? text2 : `\x1B[${code}m${text2}\x1B[39m`;
      }
      const rgb = palette[role];
      return rgb ? `\x1B[38;2;${rgb[0]};${rgb[1]};${rgb[2]}m${text2}\x1B[39m` : text2;
    },
    bold: (text2) => text2 ? `\x1B[1m${text2}\x1B[22m` : text2,
    italic: (text2) => text2 ? `\x1B[3m${text2}\x1B[23m` : text2
  };
}

// ../terminal/src/glyphs.ts
var UNICODE = {
  unicode: true,
  h: "\u2500",
  v: "\u2502",
  heavy: "\u2501",
  dotted: "\u2504",
  arrowDown: "\u25BC",
  arrowRight: "\u25BA",
  arrowUp: "\u25B2",
  arrowLeft: "\u25C4",
  broken: "\u2573",
  barFull: "\u2588",
  barEmpty: "\u2591",
  barPartials: ["", "\u258F", "\u258E", "\u258D", "\u258C", "\u258B", "\u258A", "\u2589"],
  stackFills: ["\u2588", "\u2593", "\u2592", "\u2591"],
  spark: ["\u2581", "\u2582", "\u2583", "\u2584", "\u2585", "\u2586", "\u2587", "\u2588"],
  accentBar: "\u258C",
  bullet: "\u2022",
  dot: "\xB7",
  ellipsis: "\u2026",
  status: { good: "\u2713", warning: "\u25B2", critical: "\u2715", info: "\u25CF", neutral: "\u25CB" },
  check: { done: "\u2713", failed: "\u2715", pending: "\u25CB", skipped: "\u2013", warning: "\u25B2", running: "\u25D0" },
  risk: { critical: "\u2588", warning: "\u25B2", neutral: "\u25CF", empty: "\xB7" },
  pick: "\u25B2",
  best: "\u25CF",
  tree: { branch: "\u251C\u2500\u2500 ", last: "\u2514\u2500\u2500 ", pipe: "\u2502   ", space: "    " },
  chart: { h: "\u2500", v: "\u2502", ul: "\u256D", ur: "\u256E", dl: "\u2570", dr: "\u256F", axis: "\u2524", tick: "\u253C", corner: "\u2514" }
};
var ASCII = {
  unicode: false,
  h: "-",
  v: "|",
  heavy: "=",
  dotted: ".",
  arrowDown: "v",
  arrowRight: ">",
  arrowUp: "^",
  arrowLeft: "<",
  broken: "X",
  barFull: "#",
  barEmpty: "-",
  barPartials: ["", "", "", "", "", "", "", ""],
  stackFills: ["#", "=", "+", ":"],
  spark: ["_", ".", ",", "-", "~", "=", "*", "#"],
  accentBar: "|",
  bullet: "*",
  dot: ".",
  ellipsis: "...",
  status: { good: "+", warning: "!", critical: "x", info: "*", neutral: "o" },
  check: { done: "+", failed: "x", pending: "o", skipped: "-", warning: "!", running: "~" },
  risk: { critical: "#", warning: "^", neutral: "o", empty: "." },
  pick: "^",
  best: "*",
  tree: { branch: "|-- ", last: "`-- ", pipe: "|   ", space: "    " },
  chart: { h: "-", v: "|", ul: "+", ur: "+", dl: "+", dr: "+", axis: "|", tick: "+", corner: "+" }
};

// ../terminal/src/canvas.ts
var UP = 1;
var RIGHT = 2;
var DOWN = 4;
var LEFT = 8;
var UNICODE_JUNCTIONS = {
  [UP]: "\u2502",
  [DOWN]: "\u2502",
  [UP | DOWN]: "\u2502",
  [LEFT]: "\u2500",
  [RIGHT]: "\u2500",
  [LEFT | RIGHT]: "\u2500",
  [RIGHT | DOWN]: "\u250C",
  [LEFT | DOWN]: "\u2510",
  [UP | RIGHT]: "\u2514",
  [UP | LEFT]: "\u2518",
  [UP | RIGHT | DOWN]: "\u251C",
  [UP | LEFT | DOWN]: "\u2524",
  [LEFT | RIGHT | DOWN]: "\u252C",
  [UP | LEFT | RIGHT]: "\u2534",
  [UP | RIGHT | DOWN | LEFT]: "\u253C"
};
function asciiJunction(mask) {
  if (mask & (LEFT | RIGHT) && mask & (UP | DOWN)) return "+";
  if (mask & (LEFT | RIGHT)) return "-";
  return "|";
}
var Canvas = class {
  constructor(width, unicode = true) {
    this.width = width;
    this.unicode = unicode;
  }
  width;
  unicode;
  rows = [];
  get height() {
    return this.rows.length;
  }
  row(y) {
    while (this.rows.length <= y) this.rows.push(Array.from({ length: this.width }, () => ({ ch: " " })));
    return this.rows[y];
  }
  /** Writes text starting at (x, y). Characters outside the canvas are clipped. */
  text(x, y, text2, role, bold) {
    if (y < 0) return;
    const row = this.row(y);
    let cx = x;
    for (const ch of text2) {
      if (cx >= 0 && cx < this.width) row[cx] = { ch, role, bold };
      cx += visibleWidth(ch) || 1;
    }
  }
  /** Draws a line segment piece at (x, y) with the given direction mask, merging junctions. */
  line(x, y, mask, role) {
    if (x < 0 || x >= this.width || y < 0) return;
    const row = this.row(y);
    const existing = row[x];
    const merged = (existing.mask ?? 0) | mask;
    const ch = this.unicode ? UNICODE_JUNCTIONS[merged] ?? "\u253C" : asciiJunction(merged);
    row[x] = { ch, role: existing.mask ? existing.role ?? role : role, mask: merged };
  }
  hline(x1, x2, y, role) {
    const [a, b] = x1 <= x2 ? [x1, x2] : [x2, x1];
    for (let x = a; x <= b; x++) {
      let mask = 0;
      if (x > a) mask |= LEFT;
      if (x < b) mask |= RIGHT;
      if (a === b) mask = LEFT | RIGHT;
      this.line(x, y, mask, role);
    }
  }
  vline(x, y1, y2, role) {
    const [a, b] = y1 <= y2 ? [y1, y2] : [y2, y1];
    for (let y = a; y <= b; y++) {
      let mask = 0;
      if (y > a) mask |= UP;
      if (y < b) mask |= DOWN;
      if (a === b) mask = UP | DOWN;
      this.line(x, y, mask, role);
    }
  }
  /** Box with corners at (x, y) and (x + w - 1, y + h - 1). */
  box(x, y, w, h, role) {
    this.hline(x, x + w - 1, y, role);
    this.hline(x, x + w - 1, y + h - 1, role);
    this.vline(x, y, y + h - 1, role);
    this.vline(x + w - 1, y, y + h - 1, role);
  }
  /** Marks a cell as having a connection in `mask` direction (e.g. a ┬ on a box edge). */
  connect(x, y, mask, role) {
    this.line(x, y, mask, role);
  }
  isEmpty(x, y) {
    if (y >= this.rows.length) return true;
    const cell = this.rows[y]?.[x];
    return !cell || cell.ch === " ";
  }
  /** Is the horizontal range [x1, x2] on row y free? */
  isFree(x1, x2, y) {
    for (let x = x1; x <= x2; x++) if (x < 0 || x >= this.width || !this.isEmpty(x, y)) return false;
    return true;
  }
  toLines(style) {
    return this.rows.map((row) => {
      let out = "";
      let run = "";
      let runRole;
      let runBold;
      const flush = () => {
        if (!run) return;
        let s = runRole ? style.fg(runRole, run) : run;
        if (runBold) s = style.bold(s);
        out += s;
        run = "";
      };
      for (const cell of row) {
        const role = cell.ch === " " ? void 0 : cell.role;
        const bold = cell.ch === " " ? void 0 : cell.bold;
        if (role !== runRole || bold !== runBold) {
          flush();
          runRole = role;
          runBold = bold;
        }
        run += cell.ch;
      }
      flush();
      return out.replace(/\s+$/, "");
    });
  }
};

// ../terminal/src/charts.ts
function bar(fraction, width, g, style, role = "accent", emptyRole = "dim", showEmpty = true) {
  if (width <= 0) return "";
  const f = Math.max(0, Math.min(1, Number.isFinite(fraction) ? fraction : 0));
  const eighths = Math.round(f * width * 8);
  let full = Math.floor(eighths / 8);
  let partial = g.barPartials[eighths % 8] ?? "";
  if (!g.unicode && eighths % 8 >= 4) {
    full += 1;
    partial = "";
  }
  full = Math.min(full, width);
  const used = full + (partial ? 1 : 0);
  const filled = g.barFull.repeat(full) + partial;
  const rest = Math.max(0, width - used);
  if (!showEmpty) return style.fg(role, filled) + " ".repeat(rest);
  return style.fg(role, filled) + style.fg(emptyRole, g.barEmpty.repeat(rest));
}
function allocate(values, width) {
  const total = values.reduce((a, b) => a + Math.max(0, b), 0);
  if (total <= 0 || width <= 0) return values.map(() => 0);
  const exact = values.map((v) => Math.max(0, v) / total * width);
  const cells = exact.map((e, i) => values[i] > 0 ? Math.max(1, Math.floor(e)) : 0);
  let used = cells.reduce((a, b) => a + b, 0);
  const order = exact.map((e, i) => ({ i, r: e - Math.floor(e) })).sort((a, b) => b.r - a.r);
  let k = 0;
  while (used < width && order.length) {
    cells[order[k % order.length].i]++;
    used++;
    k++;
  }
  while (used > width) {
    const biggest = cells.indexOf(Math.max(...cells));
    cells[biggest]--;
    used--;
  }
  return cells;
}
function stackedBar(parts, width, g, style) {
  const cells = allocate(
    parts.map((p) => p.value),
    width
  );
  return parts.map((p, i) => style.fg(p.role, (g.stackFills[Math.min(i, g.stackFills.length - 1)] ?? g.barFull).repeat(cells[i]))).join("");
}
function resample(values, n) {
  if (n <= 0 || values.length === 0) return [];
  if (values.length === 1) return Array(n).fill(values[0]);
  if (n === 1) return [values[values.length - 1]];
  const out = [];
  for (let i = 0; i < n; i++) {
    const pos = i / (n - 1) * (values.length - 1);
    const lo = Math.floor(pos);
    const hi = Math.min(values.length - 1, lo + 1);
    out.push(values[lo] + (values[hi] - values[lo]) * (pos - lo));
  }
  return out;
}
function sparkline(values, g, width) {
  if (!values.length) return "";
  const series = width && width !== values.length ? resample(values, width) : values;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  return series.map((v) => g.spark[Math.round((v - min) / span * (g.spark.length - 1))]).join("");
}
function lineChart(values, options, g, style) {
  const role = options.role ?? "accent";
  const format = options.format ?? ((n) => formatNumber(n));
  const height = Math.max(2, options.height);
  const min = Math.min(...values, options.threshold ?? Infinity);
  const max = Math.max(...values, options.threshold ?? -Infinity);
  const span = max - min || 1;
  const labels = Array.from({ length: height }, (_, r) => format(max - r / (height - 1) * span));
  const labelWidth = Math.max(...labels.map(visibleWidth));
  const plotWidth = Math.max(4, options.width - labelWidth - 2);
  const series = resample(values, plotWidth);
  const rowOf = (v) => Math.round((max - v) / span * (height - 1));
  const grid = Array.from(
    { length: height },
    () => Array.from({ length: plotWidth }, () => ({ ch: " ", role: "dim" }))
  );
  if (options.threshold !== void 0) {
    const tr = rowOf(options.threshold);
    for (let x = 0; x < plotWidth; x++) grid[tr][x] = { ch: g.dotted, role: "warning" };
  }
  let prev = rowOf(series[0]);
  for (let x = 0; x < plotWidth; x++) {
    const cur = rowOf(series[x]);
    if (x === 0) {
      grid[cur][x] = { ch: g.chart.h, role };
      prev = cur;
      continue;
    }
    if (cur === prev) {
      grid[cur][x] = { ch: g.chart.h, role };
    } else if (cur < prev) {
      grid[prev][x] = { ch: g.chart.dr, role };
      for (let r = cur + 1; r < prev; r++) grid[r][x] = { ch: g.chart.v, role };
      grid[cur][x] = { ch: g.chart.ul, role };
    } else {
      grid[prev][x] = { ch: g.chart.ur, role };
      for (let r = prev + 1; r < cur; r++) grid[r][x] = { ch: g.chart.v, role };
      grid[cur][x] = { ch: g.chart.dl, role };
    }
    prev = cur;
  }
  const lines = grid.map((row, r) => {
    let line = "";
    let run = "";
    let runRole;
    for (const cell of row) {
      const cr = cell.ch === " " ? void 0 : cell.role;
      if (cr !== runRole) {
        line += runRole ? style.fg(runRole, run) : run;
        run = "";
        runRole = cr;
      }
      run += cell.ch;
    }
    line += runRole ? style.fg(runRole, run) : run;
    return `${style.fg("dim", padStart(labels[r], labelWidth))} ${style.fg("dim", g.chart.axis)}${line}`.replace(/\s+$/, "");
  });
  if (options.xLabels?.length) {
    const axis = `${" ".repeat(labelWidth)} ${g.chart.corner}${g.chart.h.repeat(plotWidth)}`;
    lines.push(style.fg("dim", axis));
    lines.push(style.fg("dim", spreadLabels(options.xLabels, plotWidth, labelWidth + 2)));
  }
  return lines;
}
function spreadLabels(labels, width, offset = 0) {
  const cells = Array(width + offset).fill(" ");
  const n = labels.length;
  labels.forEach((label, i) => {
    const pos = n === 1 ? 0 : Math.round(i / (n - 1) * (width - 1));
    let start = offset + pos - (i === 0 ? 0 : i === n - 1 ? visibleWidth(label) - 1 : Math.floor(visibleWidth(label) / 2));
    start = Math.max(offset, Math.min(start, offset + width - visibleWidth(label)));
    for (let k = 0; k < label.length && start + k < cells.length; k++) cells[start + k] = label[k];
  });
  return cells.join("").replace(/\s+$/, "");
}
function formatNumber(n) {
  if (!Number.isFinite(n)) return String(n);
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${trim(n / 1e9)}B`;
  if (abs >= 1e6) return `${trim(n / 1e6)}M`;
  if (abs >= 1e4) return `${trim(n / 1e3)}k`;
  if (abs >= 100) return Math.round(n).toString();
  if (abs >= 10) return trim(n, 1);
  if (abs === 0) return "0";
  return trim(n, 2);
}
function trim(n, digits = 1) {
  return Number(n.toFixed(digits)).toString();
}
function formatValue(value, unit) {
  const v = typeof value === "number" ? formatNumber(value) : value;
  if (!unit) return v;
  return /^[%°]|^k$|^[kMB]$/.test(unit) || unit.startsWith("%") ? `${v}${unit}` : `${v} ${unit}`;
}
var FONT = {
  "0": ["###", "#.#", "#.#", "#.#", "###"],
  "1": [".#.", "##.", ".#.", ".#.", "###"],
  "2": ["###", "..#", "###", "#..", "###"],
  "3": ["###", "..#", ".##", "..#", "###"],
  "4": ["#.#", "#.#", "###", "..#", "..#"],
  "5": ["###", "#..", "###", "..#", "###"],
  "6": ["###", "#..", "###", "#.#", "###"],
  "7": ["###", "..#", "..#", "..#", "..#"],
  "8": ["###", "#.#", "###", "#.#", "###"],
  "9": ["###", "#.#", "###", "..#", "###"],
  "%": ["##.#", "##.#", "..#.", ".#..", "#.##", "#.##"],
  ".": [".", ".", ".", ".", "#"],
  ",": [".", ".", ".", ".", "#"],
  "-": ["...", "...", "###", "...", "..."],
  "+": ["...", ".#.", "###", ".#.", "..."],
  ":": [".", "#", ".", "#", "."],
  "/": ["..#", "..#", ".#.", "#..", "#.."],
  " ": [".", ".", ".", ".", "."]
};
function bigText(text2) {
  const chars = [...text2];
  if (!chars.length || chars.some((c) => !FONT[c])) return void 0;
  const rows = ["", "", ""];
  chars.forEach((c, i) => {
    const glyph = FONT[c];
    const w = glyph[0].length;
    for (let r = 0; r < 3; r++) {
      const top = glyph[r * 2] ?? ".".repeat(w);
      const bottom = glyph[r * 2 + 1] ?? ".".repeat(w);
      let out = "";
      for (let x = 0; x < w; x++) {
        const t = top[x] === "#";
        const b = bottom[x] === "#";
        out += t && b ? "\u2588" : t ? "\u2580" : b ? "\u2584" : " ";
      }
      rows[r] += (i > 0 ? " " : "") + out;
    }
  });
  return rows;
}
function splitForBig(value, unit) {
  const formatted = typeof value === "number" ? formatNumber(value) : value;
  const match = formatted.match(/^([+\-]?[0-9.,:/]+)(.*)$/);
  if (!match) return { big: "", small: [formatted, unit].filter(Boolean).join(" ") };
  let big = match[1];
  let small = match[2];
  if (unit === "%" && !small) big += "%";
  else small = [small, unit].filter(Boolean).join(" ");
  return { big, small: small.trim() };
}

// ../terminal/src/graph.ts
var MIN_GAP = 3;
function renderGraph(nodes, edges, options) {
  const { width, glyphs: g, style } = options;
  if (!nodes.length) return [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const valid = edges.filter((e) => byId.has(e.from) && byId.has(e.to) && e.from !== e.to);
  const { forward, back } = splitBackEdges(nodes, valid);
  const chain = asChain(nodes, forward);
  let lines;
  if (chain && back.length === 0) {
    if (!options.compact) lines = renderChainBoxes(chain, forward, options);
    if (!lines) lines = renderChainInline(chain, forward, options);
  }
  if (!lines && !(options.compact && chain)) lines = renderLayered(nodes, forward, options);
  if (!lines) lines = renderEdgeList(nodes, forward, options);
  if (back.length) {
    for (const e of back) {
      const from = byId.get(e.from).label;
      const to = byId.get(e.to).label;
      const loop = g.unicode ? "\u21BA" : "<-";
      lines.push(truncate(style.fg("muted", `${loop} ${from} ${g.h}${g.arrowRight} ${to}${e.label ? `  ${e.label}` : ""}`), width));
    }
  }
  return lines;
}
function splitBackEdges(nodes, edges) {
  const out = /* @__PURE__ */ new Map();
  for (const e of edges) out.set(e.from, [...out.get(e.from) ?? [], e]);
  const state = /* @__PURE__ */ new Map();
  const back = /* @__PURE__ */ new Set();
  const visit = (id) => {
    state.set(id, 1);
    for (const e of out.get(id) ?? []) {
      const s = state.get(e.to);
      if (s === 1) back.add(e);
      else if (!s) visit(e.to);
    }
    state.set(id, 2);
  };
  const incoming = new Set(edges.map((e) => e.to));
  for (const n of nodes) if (!incoming.has(n.id) && !state.get(n.id)) visit(n.id);
  for (const n of nodes) if (!state.get(n.id)) visit(n.id);
  return { forward: edges.filter((e) => !back.has(e)), back: edges.filter((e) => back.has(e)) };
}
function asChain(nodes, edges) {
  if (nodes.length < 2 || edges.length !== nodes.length - 1) return void 0;
  const inDeg = /* @__PURE__ */ new Map();
  const next = /* @__PURE__ */ new Map();
  for (const e of edges) {
    if (next.has(e.from)) return void 0;
    next.set(e.from, e.to);
    inDeg.set(e.to, (inDeg.get(e.to) ?? 0) + 1);
  }
  if ([...inDeg.values()].some((d) => d > 1)) return void 0;
  const start = nodes.find((n) => !inDeg.has(n.id));
  if (!start) return void 0;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const order = [];
  let cur = start.id;
  while (cur && order.length <= nodes.length) {
    order.push(byId.get(cur));
    cur = next.get(cur);
  }
  return order.length === nodes.length ? order : void 0;
}
function isBoxed(node) {
  return node.kind !== "actor" && node.kind !== "outcome";
}
function nodeLabel(node, g, max) {
  const mark2 = node.status === "critical" || node.status === "warning" ? `${g.status[node.status]} ` : "";
  return truncate(mark2 + node.label, max, g.ellipsis);
}
function borderRole(node) {
  if (!node?.status || node.status === "neutral") return "muted";
  return statusRole(node.status);
}
function labelRole(node) {
  if (node?.status === "critical") return "critical";
  if (node?.status === "warning") return "warning";
  if (node?.kind === "actor") return "muted";
  return "strong";
}
function edgeRole(edge) {
  if (edge.status === "critical") return "critical";
  if (edge.status === "warning") return "warning";
  return "dim";
}
function chainGapWidth(edge) {
  return Math.max(edge?.status === "critical" ? 9 : 7, (edge?.label ? visibleWidth(edge.label) : 0) + 4);
}
function renderChainBoxes(chain, edges, options) {
  const { width, glyphs: g, style } = options;
  const edgeTo = new Map(edges.map((e) => [e.to, e]));
  const labelMax = 28;
  const labels = chain.map((n) => nodeLabel(n, g, labelMax));
  const widths = chain.map((n, i) => isBoxed(n) ? visibleWidth(labels[i]) + 4 : visibleWidth(labels[i]));
  const gaps = chain.slice(1).map((n) => chainGapWidth(edgeTo.get(n.id)));
  const noteOverhang = chain.map((n, i) => Math.max(0, ((n.note ? visibleWidth(n.note) : 0) - widths[i]) / 2));
  const total = widths.reduce((a, b) => a + b, 0) + gaps.reduce((a, b) => a + b, 0);
  const pad = Math.ceil(Math.max(noteOverhang[0] ?? 0, noteOverhang[chain.length - 1] ?? 0));
  if (total + pad * 2 > width || chain.length > 6) return void 0;
  const hasNotes = chain.some((n) => n.note);
  const hasLabels = chain.some((n) => edgeTo.get(n.id)?.label);
  const top = hasLabels ? 1 : 0;
  const canvas = new Canvas(width, g.unicode);
  let x = pad;
  chain.forEach((node, i) => {
    if (i > 0) {
      const edge = edgeTo.get(node.id);
      const gap = gaps[i - 1];
      const role = edgeRole(edge);
      const y = top + 1;
      const run = gap - 3;
      for (let k = 0; k < run; k++) canvas.text(x + 1 + k, y, g.h, role);
      canvas.text(x + 1 + run, y, g.arrowRight, role);
      if (edge.status === "critical") canvas.text(x + 1 + Math.floor(run / 2), y, g.broken, "critical", true);
      if (edge.label) canvas.text(x + Math.floor((gap - visibleWidth(edge.label)) / 2), top, edge.label, "muted");
      x += gap;
    }
    const w = widths[i];
    if (isBoxed(node)) {
      canvas.box(x, top, w, 3, borderRole(node));
      canvas.text(x + 2, top + 1, labels[i], labelRole(node), true);
    } else {
      canvas.text(x, top + 1, labels[i], labelRole(node), node.kind === "outcome");
    }
    if (node.note) {
      const nx = Math.max(0, Math.min(width - visibleWidth(node.note), x + Math.floor((w - visibleWidth(node.note)) / 2)));
      canvas.text(nx, top + 3, node.note, node.status === "critical" ? "critical" : "muted");
    }
    x += w;
  });
  void hasNotes;
  return canvas.toLines(style);
}
function renderChainInline(chain, edges, options) {
  const { width, glyphs: g, style } = options;
  const edgeTo = new Map(edges.map((e) => [e.to, e]));
  const parts = [];
  let plain = "";
  chain.forEach((node, i) => {
    if (i > 0) {
      const edge = edgeTo.get(node.id);
      const role = edgeRole(edge);
      const conn = edge.status === "critical" ? `${g.h}${g.h}${g.broken}${g.h}${g.h}${g.arrowRight}` : `${g.h}${g.h}${g.arrowRight}`;
      const label = edge.label ? ` ${edge.label} ` : " ";
      parts.push(style.fg("muted", label.length > 1 ? label : " ") + style.fg(role, conn) + " ");
      plain += label + conn + " ";
    }
    const text2 = nodeLabel(node, g, 40);
    parts.push(style.bold(style.fg(labelRole(node), text2)));
    plain += text2;
  });
  const lines = [];
  if (visibleWidth(plain) <= width) lines.push(parts.join(""));
  else return void 0;
  const notes = chain.filter((n) => n.note).map((n) => `${n.label}: ${n.note}`);
  for (const note of notes) lines.push(truncate(style.fg("muted", `  ${note}`), width));
  return lines;
}
function renderLayered(nodes, edges, options) {
  const { width, glyphs: g, style } = options;
  const labelMax = Math.max(8, Math.min(30, Math.floor(width / 3)));
  const preds = /* @__PURE__ */ new Map();
  const succs = /* @__PURE__ */ new Map();
  for (const n of nodes) {
    preds.set(n.id, []);
    succs.set(n.id, []);
  }
  for (const e of edges) {
    preds.get(e.to).push(e.from);
    succs.get(e.from).push(e.to);
  }
  const layerOf = /* @__PURE__ */ new Map();
  const visiting = /* @__PURE__ */ new Set();
  const depth = (id) => {
    if (layerOf.has(id)) return layerOf.get(id);
    if (visiting.has(id)) return 0;
    visiting.add(id);
    const p = preds.get(id);
    const d = p.length ? Math.max(...p.map(depth)) + 1 : 0;
    layerOf.set(id, d);
    return d;
  };
  nodes.forEach((n) => depth(n.id));
  const lnodes = /* @__PURE__ */ new Map();
  nodes.forEach((n, i) => {
    const label = nodeLabel(n, g, labelMax);
    const boxed = isBoxed(n);
    const w = boxed ? visibleWidth(label) + 4 : visibleWidth(label);
    const ln = {
      id: n.id,
      label,
      node: n,
      dummy: false,
      boxed,
      layer: layerOf.get(n.id),
      order: i,
      w,
      h: boxed ? 3 : 1,
      left: 0,
      right: 0,
      cx: 0,
      y: 0
    };
    if (n.note) {
      if (succs.get(n.id).length) ln.noteRight = truncate(n.note, labelMax, g.ellipsis);
      else ln.noteBelow = truncate(n.note, labelMax + 6, g.ellipsis);
    }
    const half = Math.floor((w - 1) / 2);
    ln.left = half;
    ln.right = w - 1 - half;
    if (ln.noteBelow) {
      const nh = Math.floor((visibleWidth(ln.noteBelow) - 1) / 2);
      ln.left = Math.max(ln.left, nh);
      ln.right = Math.max(ln.right, visibleWidth(ln.noteBelow) - 1 - nh);
    }
    if (ln.noteRight) ln.right += 2 + visibleWidth(ln.noteRight);
    lnodes.set(n.id, ln);
  });
  const segments = [];
  let dummyCount = 0;
  for (const e of edges) {
    const from = lnodes.get(e.from);
    const to = lnodes.get(e.to);
    let prev = from;
    for (let l = from.layer + 1; l < to.layer; l++) {
      const d = {
        id: `__d${dummyCount++}`,
        label: "",
        dummy: true,
        boxed: false,
        layer: l,
        order: from.order + 0.5,
        w: 1,
        h: 1,
        left: 0,
        right: 0,
        cx: 0,
        y: 0
      };
      lnodes.set(d.id, d);
      segments.push({ from: prev, to: d, edge: e, last: false, first: prev === from });
      prev = d;
    }
    segments.push({ from: prev, to, edge: e, last: true, first: prev === from });
  }
  const layerCount = Math.max(...[...lnodes.values()].map((n) => n.layer)) + 1;
  const layers = Array.from({ length: layerCount }, () => []);
  for (const n of lnodes.values()) layers[n.layer].push(n);
  layers.forEach((layer) => layer.sort((a, b) => a.order - b.order));
  const segPreds = /* @__PURE__ */ new Map();
  const segSuccs = /* @__PURE__ */ new Map();
  for (const s of segments) {
    segPreds.set(s.to.id, [...segPreds.get(s.to.id) ?? [], s.from]);
    segSuccs.set(s.from.id, [...segSuccs.get(s.from.id) ?? [], s.to]);
  }
  const position = () => {
    const pos = /* @__PURE__ */ new Map();
    layers.forEach((layer) => layer.forEach((n, i) => pos.set(n.id, i)));
    return pos;
  };
  for (let iter = 0; iter < 4; iter++) {
    for (const [range, neighbours] of [
      [Array.from({ length: layerCount - 1 }, (_, i) => i + 1), segPreds],
      [Array.from({ length: layerCount - 1 }, (_, i) => layerCount - 2 - i), segSuccs]
    ]) {
      for (const l of range) {
        const pos = position();
        const bary = /* @__PURE__ */ new Map();
        layers[l].forEach((n, i) => {
          const ns = neighbours.get(n.id) ?? [];
          bary.set(n.id, ns.length ? ns.reduce((a, m) => a + pos.get(m.id), 0) / ns.length : i);
        });
        layers[l].sort((a, b) => bary.get(a.id) - bary.get(b.id) || a.order - b.order);
      }
    }
  }
  const spacing = (a, b) => a.right + b.left + 1 + (a.dummy || b.dummy ? 2 : MIN_GAP);
  for (const layer of layers) {
    let x = 0;
    layer.forEach((n, i) => {
      x = i === 0 ? n.left : x + spacing(layer[i - 1], n);
      n.cx = x;
    });
  }
  for (let iter = 0; iter < 6; iter++) {
    const down = iter % 2 === 0;
    const order = down ? layers.slice(1) : layers.slice(0, -1).reverse();
    for (const layer of order) {
      const desired = layer.map((n) => {
        const ns = (down ? segPreds : segSuccs).get(n.id) ?? [];
        return ns.length ? ns.reduce((a, m) => a + m.cx, 0) / ns.length : n.cx;
      });
      placeLayer(layer, desired, spacing);
    }
  }
  for (const layer of layers.slice(1)) {
    const desired = layer.map((n) => {
      const ns = segPreds.get(n.id) ?? [];
      return ns.length ? ns.reduce((a, m) => a + m.cx, 0) / ns.length : n.cx;
    });
    placeLayer(layer, desired, spacing);
  }
  const all = [...lnodes.values()];
  const minX = Math.min(...all.map((n) => n.cx - n.left));
  const maxX = Math.max(...all.map((n) => n.cx + n.right));
  const span = maxX - minX + 1;
  if (span > width) return void 0;
  const shift = -minX + Math.floor((width - span) / 2);
  for (const n of all) n.cx += shift;
  const layerHeight = layers.map((layer) => {
    const real = layer.filter((n) => !n.dummy);
    if (!real.length) return 1;
    return Math.max(...real.map((n) => n.h + (n.noteBelow ? 1 : 0)));
  });
  const canvas = new Canvas(width, g.unicode);
  let y = 0;
  const layerTop = [];
  const gapPlans = [];
  for (let l = 0; l < layerCount; l++) {
    layerTop[l] = y;
    for (const n of layers[l]) n.y = y;
    y += layerHeight[l];
    if (l < layerCount - 1) {
      const plan2 = planGap(segments.filter((s) => s.from.layer === l));
      plan2.top = y;
      gapPlans.push(plan2);
      y += plan2.height;
    }
  }
  for (const n of all) {
    const bottom = layerTop[n.layer] + layerHeight[n.layer] - 1;
    if (n.dummy) {
      canvas.vline(n.cx, n.y, bottom, dummyRole(n, segments));
      continue;
    }
    const x0 = n.cx - Math.floor((n.w - 1) / 2);
    const hasOut = (segSuccs.get(n.id) ?? []).length > 0;
    if (n.boxed) {
      canvas.box(x0, n.y, n.w, 3, borderRole(n.node));
      canvas.text(x0 + Math.floor((n.w - visibleWidth(n.label)) / 2), n.y + 1, n.label, labelRole(n.node), true);
      if (hasOut) canvas.connect(n.cx, n.y + 2, DOWN, borderRole(n.node));
      if (n.noteRight) canvas.text(x0 + n.w + 2, n.y + 1, n.noteRight, n.node?.status === "critical" ? "critical" : "muted");
      if (n.noteBelow) {
        const nw = visibleWidth(n.noteBelow);
        canvas.text(n.cx - Math.floor((nw - 1) / 2), n.y + 3, n.noteBelow, n.node?.status === "critical" ? "critical" : "muted");
      }
      if (hasOut && bottom > n.y + 2) canvas.vline(n.cx, n.y + 2, bottom, "dim");
    } else {
      canvas.text(x0, n.y, n.label, labelRole(n.node), n.node?.kind === "outcome");
      if (n.noteRight) canvas.text(x0 + n.w + 2, n.y, n.noteRight, "muted");
      if (n.noteBelow) {
        const nw = visibleWidth(n.noteBelow);
        canvas.text(n.cx - Math.floor((nw - 1) / 2), n.y + 1, n.noteBelow, "muted");
      }
      if (hasOut && bottom > n.y) canvas.vline(n.cx, n.y + 1, bottom, "dim");
    }
  }
  for (const plan2 of gapPlans) drawGap(canvas, plan2, g);
  return canvas.toLines(style);
}
function dummyRole(n, segments) {
  const seg = segments.find((s) => s.to === n || s.from === n);
  return seg ? edgeRole(seg.edge) : "dim";
}
function placeLayer(layer, desired, spacing) {
  if (!layer.length) return;
  const clusters = [];
  for (let i = 0; i < layer.length; i++) {
    let cluster = { start: i, end: i, offsets: [0], pos: desired[i] };
    while (clusters.length) {
      const prev = clusters[clusters.length - 1];
      const prevEndPos = prev.pos + prev.offsets[prev.offsets.length - 1];
      const minStart = prevEndPos + spacing(layer[prev.end], layer[cluster.start]);
      if (cluster.pos >= minStart) break;
      const gapOffset = prev.offsets[prev.offsets.length - 1] + spacing(layer[prev.end], layer[cluster.start]);
      const offsets = [...prev.offsets, ...cluster.offsets.map((o) => o + gapOffset)];
      const start = prev.start;
      const end = cluster.end;
      let sum = 0;
      for (let k = start; k <= end; k++) sum += desired[k] - offsets[k - start];
      cluster = { start, end, offsets, pos: sum / (end - start + 1) };
      clusters.pop();
    }
    clusters.push(cluster);
  }
  for (const c of clusters) {
    for (let k = c.start; k <= c.end; k++) layer[k].cx = Math.round(c.pos + c.offsets[k - c.start]);
  }
  for (let k = 1; k < layer.length; k++) {
    const min = layer[k - 1].cx + spacing(layer[k - 1], layer[k]);
    if (layer[k].cx < min) layer[k].cx = min;
  }
}
function planGap(segments) {
  const straight = [];
  const rest = [];
  for (const s of segments) {
    const onlyIn = segments.filter((o) => o.to === s.to).length === 1;
    const onlyOut = segments.filter((o) => o.from === s.from).length === 1;
    if (s.from.cx === s.to.cx && onlyIn && onlyOut) straight.push(s);
    else rest.push(s);
  }
  const parent = /* @__PURE__ */ new Map();
  const find = (x) => {
    while (parent.get(x) !== x) x = parent.get(x);
    return x;
  };
  for (const s of rest) {
    for (const id of [`s:${s.from.id}`, `t:${s.to.id}`]) if (!parent.has(id)) parent.set(id, id);
    parent.set(find(`s:${s.from.id}`), find(`t:${s.to.id}`));
  }
  const groups = /* @__PURE__ */ new Map();
  for (const s of rest) {
    const root = find(`s:${s.from.id}`);
    groups.set(root, [...groups.get(root) ?? [], s]);
  }
  const components = [...groups.values()].map((segs) => {
    const xs = segs.flatMap((s) => [s.from.cx, s.to.cx]);
    return { segments: segs, min: Math.min(...xs), max: Math.max(...xs), row: 0 };
  });
  components.sort((a, b) => a.min - b.min);
  const rowEnds = [];
  for (const c of components) {
    let row = rowEnds.findIndex((end) => end < c.min - 1);
    if (row === -1) {
      row = rowEnds.length;
      rowEnds.push(c.max);
    } else rowEnds[row] = c.max;
    c.row = row;
  }
  const straightLabels = straight.some((s) => s.first && s.edge.label || s.last && s.edge.status === "critical");
  const busLabels = rest.some((s) => s.last && (s.edge.label || s.edge.status === "critical"));
  let r = 1;
  let labelRow;
  if (straightLabels) {
    labelRow = r;
    r += 2;
  }
  const busStart = r;
  r += rowEnds.length;
  let preArrowRow;
  if (busLabels) {
    preArrowRow = r;
    r += 1;
  }
  const arrowRow = r;
  return { top: 0, height: arrowRow + 1, straight, components, labelRow, preArrowRow, arrowRow, busStart };
}
function drawGap(canvas, plan2, g) {
  const top = plan2.top;
  const arrowY = top + plan2.arrowRow;
  for (const s of plan2.straight) {
    const role = edgeRole(s.edge);
    const x = s.from.cx;
    canvas.vline(x, top, arrowY - 1, role);
    if (plan2.labelRow !== void 0) {
      const ly = top + plan2.labelRow;
      const broken = s.last && s.edge.status === "critical";
      const label = s.first ? s.edge.label : void 0;
      if (broken) {
        canvas.text(x, ly, g.broken, "critical", true);
        if (label) canvas.text(x + 2, ly, label, "critical");
      } else if (label) {
        const lw = visibleWidth(label);
        canvas.text(x - Math.floor((lw - 1) / 2), ly, label, "muted");
      }
    }
    if (s.last) canvas.text(x, arrowY, g.arrowDown, role);
    else canvas.vline(x, arrowY, arrowY, role);
  }
  for (const c of plan2.components) {
    const busY = top + plan2.busStart + c.row;
    const role = c.segments.some((s) => s.edge.status === "critical") ? "critical" : "dim";
    canvas.hline(c.min, c.max, busY, role);
    const sources = /* @__PURE__ */ new Map();
    const targets = /* @__PURE__ */ new Map();
    for (const s of c.segments) {
      sources.set(s.from.cx, s);
      targets.set(s.to.cx, s);
    }
    for (const [x] of sources) {
      for (let yy = top; yy < busY; yy++) canvas.line(x, yy, UP | DOWN, role);
      canvas.line(x, busY, UP, role);
    }
    for (const [x, s] of targets) {
      const r = edgeRole(s.edge);
      canvas.line(x, busY, DOWN, r);
      for (let yy = busY + 1; yy < arrowY; yy++) canvas.line(x, yy, UP | DOWN, r);
      if (plan2.preArrowRow !== void 0 && s.last) {
        const py = top + plan2.preArrowRow;
        if (s.edge.status === "critical") canvas.text(x, py, g.broken, "critical", true);
        if (s.edge.label) {
          const lw = visibleWidth(s.edge.label);
          const right = x + 2;
          if (canvas.isFree(right, right + lw, py)) canvas.text(right, py, s.edge.label, "muted");
          else if (canvas.isFree(x - 2 - lw, x - 2, py)) canvas.text(x - 1 - lw, py, s.edge.label, "muted");
        }
      }
      if (s.last) canvas.text(x, arrowY, g.arrowDown, r);
      else canvas.vline(x, arrowY, arrowY, r);
    }
  }
}
function renderEdgeList(nodes, edges, options) {
  const { width, glyphs: g, style } = options;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const lines = [];
  const shown = /* @__PURE__ */ new Set();
  for (const n of nodes) {
    const out = edges.filter((e) => e.from === n.id);
    const isTarget = edges.some((e) => e.to === n.id);
    if (!out.length && isTarget) continue;
    lines.push(truncate(style.bold(style.fg(labelRole(n), nodeLabel(n, g, width))), width));
    shown.add(n.id);
    out.forEach((e, i) => {
      const target = byId.get(e.to);
      const branch = i === out.length - 1 ? g.tree.last.trimEnd() : g.tree.branch.trimEnd();
      const conn = e.status === "critical" ? `${g.broken}${g.arrowRight}` : g.arrowRight;
      const note = target.note ? style.fg("muted", `  ${target.note}`) : "";
      const label = e.label ? style.fg("muted", ` ${e.label}`) : "";
      lines.push(
        truncate(
          ` ${style.fg("dim", branch)}${style.fg(edgeRole(e), conn)} ${style.fg(labelRole(target), nodeLabel(target, g, width))}${label}${note}`,
          width
        )
      );
    });
  }
  return lines;
}

// ../terminal/src/markdown.ts
function renderMarkdown(markdown, ctx) {
  const { width, style } = ctx;
  const out = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let paragraph = [];
  let inCode = false;
  const inline = (text2) => text2.replace(/\*\*([^*]+)\*\*/g, (_, t) => style.bold(t)).replace(/`([^`]+)`/g, (_, t) => style.fg("accent", t)).replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, url) => `${t} ${style.fg("dim", `(${url})`)}`);
  const flush = () => {
    if (!paragraph.length) return;
    for (const line of wrap(paragraph.join(" "), width)) out.push(inline(line));
    paragraph = [];
  };
  for (const raw of lines) {
    if (raw.trim().startsWith("```")) {
      flush();
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      out.push(truncate(style.fg("accent", `  ${raw}`), width));
      continue;
    }
    const heading = raw.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flush();
      if (out.length && out[out.length - 1] !== "") out.push("");
      const text2 = heading[2].replace(/\*\*/g, "");
      out.push(truncate(heading[1].length <= 2 ? style.bold(text2.toUpperCase()) : style.bold(text2), width));
      continue;
    }
    const item = raw.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
    if (item) {
      flush();
      const indent = Math.min(8, item[1].length);
      const bullet = /\d/.test(item[2]) ? item[2] : ctx.glyphs.bullet;
      const prefix = " ".repeat(indent) + bullet + " ";
      const wrapped = wrap(item[3], Math.max(10, width - prefix.length));
      wrapped.forEach((line, i) => out.push((i === 0 ? style.fg("muted", prefix) : " ".repeat(prefix.length)) + inline(line)));
      continue;
    }
    if (!raw.trim()) {
      flush();
      if (out.length && out[out.length - 1] !== "") out.push("");
      continue;
    }
    paragraph.push(raw.trim());
  }
  flush();
  while (out.length && out[out.length - 1] === "") out.pop();
  return out;
}

// ../terminal/src/context.ts
function sectionTitle(ctx, title, right) {
  const label = ctx.style.bold(ctx.style.fg("muted", title.toUpperCase()));
  if (!right) return label;
  const gap = Math.max(2, ctx.width - title.length - visibleLen(right));
  return label + " ".repeat(gap) + right;
}
function visibleLen(s) {
  return s.replace(/\x1b\[[0-9;]*m/g, "").length;
}
function mark(ctx, status2) {
  if (!status2) return "";
  return ctx.style.fg(statusRole(status2), ctx.glyphs.status[status2]);
}

// ../terminal/src/blocks.ts
function renderBlock(block2, ctx) {
  const body = renderBody(block2, ctx);
  const lines = [];
  const titleRight = titleSummary(block2, ctx);
  if (block2.title) lines.push(sectionTitle(ctx, block2.title, titleRight));
  lines.push(...body);
  if (ctx.depth === "explore") {
    if (block2.detail && block2.type !== "verdict") {
      lines.push("");
      lines.push(...renderMarkdown(block2.detail, ctx).map((l) => ctx.style.fg("muted", l)));
    }
    if (block2.sources?.length) {
      lines.push(...block2.sources.map((s) => ctx.style.fg("dim", truncate(`${ctx.glyphs.arrowRight} ${s.label}${s.ref ? `  ${s.ref}` : ""}${s.location ? `:${s.location}` : ""}`, ctx.width))));
    }
  }
  return lines.map((l) => visibleWidth(l) > ctx.width ? truncate(l, ctx.width, ctx.glyphs.ellipsis) : l);
}
function renderBody(block2, ctx) {
  switch (block2.type) {
    case "verdict":
      return verdict(block2, ctx);
    case "metric":
      return metric(block2, ctx);
    case "metrics":
      return metrics(block2, ctx);
    case "comparison":
      return comparison(block2, ctx);
    case "flow":
      return flow(block2, ctx);
    case "architecture":
      return architecture(block2, ctx);
    case "timeline":
      return timeline(block2, ctx);
    case "trend":
      return trend(block2, ctx);
    case "distribution":
      return distribution(block2, ctx);
    case "risk":
      return risk(block2, ctx);
    case "hierarchy":
      return hierarchy(block2, ctx);
    case "checklist":
      return checklist(block2, ctx);
    case "evidence":
      return evidence(block2, ctx);
    case "change":
      return change(block2, ctx);
    case "progress":
      return progress(block2, ctx);
    case "text":
      return text(block2, ctx);
    case "unknown":
      return unknown(block2, ctx);
  }
}
function titleSummary(block2, ctx) {
  const { style, glyphs: g } = ctx;
  if (block2.type === "checklist") {
    const done = block2.items.filter((i) => i.state === "done").length;
    const failed = block2.items.filter((i) => i.state === "failed").length;
    const role = failed ? "critical" : done === block2.items.length ? "good" : "warning";
    return style.fg(role, `${done}/${block2.items.length} ${g.check.done}`);
  }
  if (block2.type === "change") {
    const added = block2.files.reduce((a, f) => a + (f.added ?? 0), 0);
    const removed = block2.files.reduce((a, f) => a + (f.removed ?? 0), 0);
    return `${style.fg("muted", `${block2.files.length} files `)}${style.fg("good", `+${added}`)} ${style.fg("critical", `-${removed}`)}`;
  }
  return void 0;
}
function shout(text2) {
  return text2.length <= 42 ? text2.toUpperCase() : text2;
}
function clampWrap(text2, width, max, ellipsis) {
  const lines = wrap(text2, width);
  if (lines.length <= max) return lines;
  const kept = lines.slice(0, max);
  kept[max - 1] = truncate(`${kept[max - 1]} ${lines[max]}`, width, ellipsis);
  if (!kept[max - 1].endsWith(ellipsis)) kept[max - 1] = truncate(kept[max - 1], width - 1, "") + ellipsis;
  return kept;
}
function verdictLines(ctx, textValue, status2, rest) {
  const { style, glyphs: g, width } = ctx;
  const limit = (glance, scan) => ctx.depth === "explore" ? Infinity : ctx.depth === "scan" ? scan : glance;
  const role = status2 ? statusRole(status2) : "accent";
  const barGlyph = style.fg(role, g.accentBar);
  const glyph = status2 && status2 !== "neutral" && status2 !== "info" ? `${mark(ctx, status2)} ` : "";
  const inner = width - 2 - (glyph ? 2 : 0);
  const lines = [];
  clampWrap(shout(textValue), inner, limit(2, 3), g.ellipsis).forEach(
    (line, i) => lines.push(`${barGlyph} ${i === 0 ? glyph : glyph ? "  " : ""}${style.bold(style.fg(role, line))}`)
  );
  if (rest.detail) for (const line of clampWrap(rest.detail, width - 2, limit(1, 2), g.ellipsis)) lines.push(`${barGlyph} ${style.fg("muted", line)}`);
  if (rest.next) {
    const nextLines = clampWrap(rest.next, width - 4, limit(2, 3), g.ellipsis);
    nextLines.forEach((line, i) => lines.push(`${barGlyph} ${i === 0 ? style.fg(role, g.arrowRight) : " "} ${style.fg("text", line)}`));
  }
  if (rest.command) lines.push(`${barGlyph} ${style.fg("accent", truncate(`$ ${rest.command}`, width - 2))}`);
  return lines;
}
function verdict(b, ctx) {
  return verdictLines(ctx, b.text, b.status, b);
}
function deltaRole(delta, higherIsBetter = true) {
  if (delta === void 0) return "muted";
  const n = typeof delta === "number" ? delta : Number.parseFloat(String(delta).replace(/[^0-9.+-]/g, ""));
  if (!Number.isFinite(n) || n === 0) return "muted";
  return n > 0 === higherIsBetter ? "good" : "critical";
}
function formatDelta(delta) {
  if (typeof delta === "number") return `${delta > 0 ? "+" : ""}${formatNumber(delta)}`;
  return delta;
}
function metric(b, ctx) {
  const { style, glyphs: g, width } = ctx;
  const role = b.status ? statusRole(b.status) : "strong";
  const valueText = formatValue(b.value, b.unit === "%" || !b.max ? b.unit : b.unit);
  const lines = [];
  const head = style.bold(style.fg("muted", b.label.toUpperCase()));
  const delta = b.delta !== void 0 ? style.fg(deltaRole(b.delta, b.higherIsBetter), formatDelta(b.delta)) : "";
  lines.push(delta ? head + "  " + delta : head);
  let row = `${style.bold(style.fg(role, valueText))}${b.status && b.status !== "neutral" ? ` ${mark(ctx, b.status)}` : ""}`;
  const numeric = typeof b.value === "number";
  const scaleMax = b.max ?? (b.unit === "%" ? 100 : void 0);
  const spark = b.trend?.length ? sparkline(b.trend, g, Math.min(b.trend.length, 16)) : "";
  if (numeric && scaleMax !== void 0) {
    const frac = (b.value - (b.min ?? 0)) / (scaleMax - (b.min ?? 0) || 1);
    const pct = `${Math.round(frac * 100)}%`;
    const barWidth = Math.max(8, Math.min(40, width - visibleWidth(row) - visibleWidth(pct) - visibleWidth(spark) - 8));
    row += "  " + bar(frac, barWidth, g, style, b.status ? role : "accent") + "  " + style.fg("muted", b.unit === "%" ? "" : pct);
  }
  if (spark) row = row.replace(/\s+$/, "") + "  " + style.fg(b.status ? role : "accent", spark);
  lines.push(row.replace(/\s+$/, ""));
  if (b.caption) lines.push(style.fg("dim", b.caption));
  return lines;
}
function metrics(b, ctx) {
  const { style, width } = ctx;
  const minCol = 14;
  const perRow = Math.max(1, Math.min(b.items.length, Math.floor((width + 2) / minCol)));
  const colWidth = Math.floor((width - (perRow - 1) * 2) / perRow);
  const out = [];
  for (let i = 0; i < b.items.length; i += perRow) {
    const chunk = b.items.slice(i, i + perRow);
    const cells = chunk.map((item) => {
      const role = item.status ? statusRole(item.status) : "strong";
      const value = formatValue(item.value, item.unit);
      const glyph = item.status && item.status !== "neutral" ? ` ${mark(ctx, item.status)}` : "";
      const lines = [style.bold(style.fg(role, value)) + glyph, style.fg("muted", item.label.toUpperCase())];
      if (item.delta !== void 0) lines.push(style.fg(item.status ? statusRole(item.status) : deltaRole(item.delta), formatDelta(item.delta)));
      else if (item.caption) lines.push(style.fg("dim", item.caption));
      return lines;
    });
    if (out.length) out.push("");
    out.push(...columns(cells, chunk.map(() => colWidth), 2));
  }
  return out;
}
function comparison(b, ctx) {
  const { style, glyphs: g, width } = ctx;
  const n = b.options.length;
  const winnerIndex = b.options.findIndex((o) => o.id === b.winner);
  const dims = b.dimensions.map((d) => ({ ...d, values: d.values }));
  const longestWord = Math.max(...dims.map((d) => Math.max(...d.label.split(/\s+/).map((w) => w.length))));
  const labelCol = Math.min(Math.max(14, Math.floor(width * 0.2)), Math.max(10, longestWord + 2, ...dims.map((d) => Math.ceil(d.label.length / 2) + 3)));
  const labelLines = (label) => clampWrap(label.toUpperCase(), labelCol - 2, 2, g.ellipsis);
  const colWidth = Math.floor((width - labelCol) / Math.max(1, n));
  const bestIndex = (d) => {
    const nums = d.values.map((v) => v.value);
    if (nums.every((v) => v === void 0)) return -1;
    const pick = d.better === "lower" ? Math.min(...nums.filter((v) => v !== void 0)) : Math.max(...nums.filter((v) => v !== void 0));
    return nums.indexOf(pick);
  };
  const valueText = (v, unit) => v.label ?? (v.value !== void 0 ? formatValue(v.value, unit) : "\u2013");
  const lines = [];
  if (colWidth >= 13 && n <= 5) {
    const barWidth = colWidth - 3;
    const head = b.options.map((o, i) => {
      const label = truncate(o.label.toUpperCase(), colWidth - 2);
      return i === winnerIndex ? style.bold(style.fg("good", label)) : style.bold(style.fg("muted", label));
    });
    lines.push(" ".repeat(labelCol) + head.map((h) => padEnd(h, colWidth)).join("").replace(/\s+$/, ""));
    for (const d of dims) {
      const best = bestIndex(d);
      const numbers = d.values.map((v) => v.value ?? 0);
      const max = Math.max(...numbers.map(Math.abs), 0) || 1;
      const hasNumbers = d.values.some((v) => v.value !== void 0);
      const [label1, label2 = ""] = labelLines(d.label).map((l) => style.fg("muted", fit(l, labelCol)));
      const label = label1;
      if (hasNumbers) {
        const bars = d.values.map(
          (v, i) => padEnd(bar(Math.abs(v.value ?? 0) / max, barWidth, g, style, i === winnerIndex ? "accent" : "dim", "dim", false), colWidth)
        );
        lines.push((label + bars.join("")).replace(/\s+$/, ""));
        const values = d.values.map((v, i) => {
          const t = valueText(v, d.unit);
          const isBest = i === best;
          const txt = i === winnerIndex ? style.fg("strong", t) : style.fg("muted", t);
          return padEnd(txt + (isBest ? " " + style.fg("good", g.best) : ""), colWidth);
        });
        lines.push(((label2 || " ".repeat(labelCol)) + values.join("")).replace(/\s+$/, ""));
      } else {
        const values = d.values.map((v, i) => padEnd(i === winnerIndex ? style.fg("strong", truncate(valueText(v), colWidth - 2)) : style.fg("muted", truncate(valueText(v), colWidth - 2)), colWidth));
        lines.push((label + values.join("")).replace(/\s+$/, ""));
        if (label2) lines.push(label2.replace(/\s+$/, ""));
      }
    }
    if (b.options.some((o) => o.summary)) {
      const short = b.options.every((o) => (o.summary ?? "").length <= colWidth - 2);
      const wrapped = b.options.map((o) => clampWrap(short ? (o.summary ?? "").toUpperCase() : o.summary ?? "", colWidth - 2, 2, g.ellipsis));
      const rows = Math.max(...wrapped.map((w) => w.length));
      for (let r = 0; r < rows; r++) {
        const row = wrapped.map((w, i) => {
          const s = w[r] ?? "";
          return padEnd(i === winnerIndex ? style.bold(style.fg("good", s)) : style.fg("muted", s), colWidth);
        });
        lines.push((style.fg("muted", fit(r === 0 ? "BEST FOR" : "", labelCol)) + row.join("")).replace(/\s+$/, ""));
      }
    }
    if (winnerIndex >= 0) {
      const offset = labelCol + winnerIndex * colWidth;
      lines.push(" ".repeat(offset) + style.fg("good", g.pick));
      const pick = style.bold(style.fg("good", "PICK"));
      const rationale = b.rationale ? `  ${b.rationale}` : "";
      if (offset + 4 + visibleWidth(rationale) <= width) lines.push(" ".repeat(offset) + pick + style.fg("muted", rationale));
      else {
        lines.push(" ".repeat(offset) + pick);
        if (b.rationale) lines.push(...wrap(b.rationale, width).map((l) => style.fg("muted", l)));
      }
    }
    return lines;
  }
  const optWidth = Math.min(16, Math.max(...b.options.map((o) => o.label.length)) + 1);
  for (const d of dims) {
    const best = bestIndex(d);
    const max = Math.max(...d.values.map((v) => Math.abs(v.value ?? 0)), 0) || 1;
    lines.push(style.bold(style.fg("muted", d.label.toUpperCase())));
    d.values.forEach((v, i) => {
      const name = i === winnerIndex ? style.bold(style.fg("good", fit(b.options[i].label, optWidth))) : style.fg("text", fit(b.options[i].label, optWidth));
      const t = valueText(v, d.unit) + (i === best ? ` ${g.best}` : "");
      const barWidth = Math.max(4, width - optWidth - visibleWidth(t) - 5);
      const barText = v.value !== void 0 ? bar(Math.abs(v.value) / max, barWidth, g, style, i === winnerIndex ? "accent" : "dim", "dim", false) : " ".repeat(barWidth);
      lines.push(`  ${name} ${barText} ${style.fg(i === best ? "good" : "muted", t)}`.replace(/\s+$/, ""));
    });
  }
  if (winnerIndex >= 0) {
    lines.push("");
    lines.push(`${style.fg("good", g.pick)} ${style.bold(style.fg("good", `PICK ${b.options[winnerIndex].label.toUpperCase()}`))}`);
    if (b.rationale) lines.push(...wrap(b.rationale, width).map((l) => style.fg("muted", l)));
  }
  return lines;
}
function flow(b, ctx) {
  return renderGraph(b.nodes, b.edges ?? [], { width: ctx.width, glyphs: ctx.glyphs, style: ctx.style, compact: b.density === "compact" });
}
function architecture(b, ctx) {
  const { style, glyphs: g, width } = ctx;
  const lines = renderGraph(b.nodes, b.edges ?? [], { width, glyphs: g, style, compact: b.density === "compact" });
  if (b.boundaries?.length) {
    lines.push("");
    lines.push(style.bold(style.fg("muted", (b.boundaryTitle ?? "Boundaries").toUpperCase())));
    lines.push(style.fg("dim", g.h.repeat(Math.min(width, 46))));
    const labelWidth = Math.min(18, Math.max(...b.boundaries.map((x) => x.label.length)) + 3);
    for (const x of b.boundaries) {
      const glyph = x.status ? `${mark(ctx, x.status)} ` : "";
      lines.push(truncate(`${style.fg("text", fit(x.label, labelWidth))}${glyph}${style.fg(x.status ? statusRole(x.status) : "muted", x.note)}`, width));
    }
  }
  return lines;
}
function timeline(b, ctx) {
  const { style, glyphs: g, width } = ctx;
  const events = b.events;
  const n = events.length;
  const maxLabel = Math.max(...events.map((e) => Math.max(visibleWidth(e.label), visibleWidth(e.at))));
  const eventGlyph = (s) => s === "critical" || s === "warning" ? g.status[s] : g.unicode ? "\u25CF" : "o";
  if (n >= 2 && n <= 8 && n * (maxLabel + 3) <= width) {
    const span = Math.min(width, Math.max(n * (maxLabel + 6), 40));
    const xs = events.map((_, i) => Math.round(i / (n - 1) * (span - 1)));
    const canvas = new Canvas(width, g.unicode);
    const place = (i, textValue) => {
      const w = visibleWidth(textValue);
      const x = i === 0 ? xs[i] : i === n - 1 ? xs[i] - w + 1 : xs[i] - Math.floor((w - 1) / 2);
      return Math.max(0, Math.min(width - w, x));
    };
    events.forEach((e, i) => canvas.text(place(i, e.at), 0, e.at, "muted"));
    canvas.hline(xs[0], xs[n - 1], 1, "dim");
    events.forEach((e, i) => {
      canvas.text(xs[i], 1, eventGlyph(e.status), e.status ? statusRole(e.status) : "accent", true);
      canvas.text(place(i, e.label), 2, e.label, e.status && e.status !== "good" ? statusRole(e.status) : "strong", Boolean(e.status && e.status !== "neutral"));
    });
    let noteRow = 5;
    const used = [];
    for (let i = 0; i < n; i++) {
      const e = events[i];
      if (!e.note) continue;
      const w = visibleWidth(e.note);
      const x = Math.max(0, Math.min(width - w, xs[i] - Math.floor((w - 1) / 2)));
      let row = noteRow;
      while (used.some((u) => u.row === row && !(x > u.x2 + 1 || x + w < u.x1 - 1))) row++;
      used.push({ x1: x, x2: x + w - 1, row });
      const role = e.status ? statusRole(e.status) : "muted";
      canvas.text(xs[i], 3, g.arrowUp, role);
      for (let r = 4; r < row; r++) canvas.text(xs[i], r, g.v, "dim");
      canvas.text(x, row, e.note, role);
      noteRow = Math.max(noteRow, 5);
    }
    return canvas.toLines(style);
  }
  const atWidth = Math.max(...events.map((e) => visibleWidth(e.at)));
  const lines = [];
  events.forEach((e, i) => {
    const role = e.status ? statusRole(e.status) : "accent";
    const note = e.note ? style.fg("muted", `  ${e.note}`) : "";
    lines.push(truncate(`${style.fg("muted", padStart(e.at, atWidth))} ${style.fg(role, eventGlyph(e.status))} ${style.fg("strong", e.label)}${note}`, width));
    if (i < n - 1) lines.push(`${" ".repeat(atWidth)} ${style.fg("dim", g.v)}`);
  });
  return lines;
}
function trend(b, ctx) {
  const { style, glyphs: g, width } = ctx;
  const [primary, ...others] = b.series;
  const values = primary.values;
  const first = values[0];
  const last = values[values.length - 1];
  const role = b.status ? statusRole(b.status) : "accent";
  const unit = b.unit ?? "";
  const change2 = first !== 0 ? (last - first) / Math.abs(first) * 100 : 0;
  const arrow = last > first ? g.arrowUp : last < first ? g.unicode ? "\u25BC" : "v" : "=";
  const summary = `${style.fg("muted", `${formatValue(first, unit)} ${g.arrowRight} `)}${style.bold(style.fg(role, formatValue(last, unit)))}  ${style.fg(role, `${arrow} ${change2 >= 0 ? "+" : ""}${Math.round(change2)}%`)}`;
  const lines = [];
  const label = (b.label ?? primary.name ?? "").toUpperCase();
  if (b.density === "compact") {
    const spark = sparkline(values, g, Math.min(values.length * 2, 24));
    lines.push(truncate(`${style.fg("muted", label)}  ${style.fg(role, spark)}  ${summary}`, width));
    return lines;
  }
  lines.push(label && !b.title ? `${style.bold(style.fg("muted", label))}   ${summary}` : summary);
  const height = ctx.depth === "glance" ? 5 : 7;
  const chartWidth = Math.min(width, 84);
  const range = Math.max(...values, b.threshold ?? -Infinity) - Math.min(...values, b.threshold ?? Infinity);
  const step = range / (height - 1);
  const format = (n) => formatValue(step >= 5 ? Math.round(n) : Number(n.toFixed(step >= 0.5 ? 1 : 2)), unit);
  const chart = lineChart(values, { height, width: chartWidth, role, threshold: b.threshold, format, xLabels: b.xLabels }, g, style);
  lines.push(...chart);
  const notes = [];
  if (b.annotation) {
    const labelWidth = visibleWidth(chart[0]?.split(g.chart.axis)[0] ?? "") + 1;
    const plotWidth = Math.max(4, chartWidth - labelWidth - 1);
    const sampled = resample(values, plotWidth);
    const at = changePoint(sampled);
    const x = Math.min(width - 2, labelWidth + at);
    const text2 = `${g.arrowUp} ${b.annotation}`;
    const start = Math.max(0, Math.min(x, width - visibleWidth(text2)));
    notes.push(" ".repeat(start) + style.fg(role, text2));
  }
  if (b.threshold !== void 0) notes.push(style.fg("warning", `${g.dotted}${g.dotted} threshold ${formatValue(b.threshold, unit)}`));
  lines.push(...notes);
  for (const s of others) {
    const spark = sparkline(s.values, g, Math.min(s.values.length * 2, 24));
    lines.push(truncate(`${style.fg("muted", fit((s.name ?? "").toUpperCase(), 12))} ${style.fg("muted", spark)}  ${style.fg("text", formatValue(s.values[s.values.length - 1], unit))}`, width));
  }
  return lines;
}
function changePoint(values) {
  if (values.length < 3) return 0;
  const head = values.slice(0, Math.max(1, Math.floor(values.length / 5)));
  const baseline = head.reduce((a, b) => a + b, 0) / head.length;
  const range = Math.max(...values) - Math.min(...values) || 1;
  const i = values.findIndex((v) => Math.abs(v - baseline) > range * 0.1);
  return i < 0 ? 0 : i;
}
var NEUTRAL_RAMP = ["accent", "muted", "dim", "dim"];
function distribution(b, ctx) {
  const { style, glyphs: g, width } = ctx;
  const total = b.items.reduce((a, i) => a + Math.max(0, i.value), 0);
  const roleOf = (i) => b.items[i].status ? statusRole(b.items[i].status) : NEUTRAL_RAMP[Math.min(i, NEUTRAL_RAMP.length - 1)];
  const unit = b.unit ?? "";
  if (b.whole) {
    const parts = b.items.map((item, i) => `${style.bold(style.fg(roleOf(i), formatNumber(item.value) + unit.trim()))} ${style.fg("muted", item.label.toUpperCase())}`);
    const lines = [];
    let row = "";
    for (const part of parts) {
      const next = row ? `${row}${" ".repeat(5)}${part}` : part;
      if (visibleWidth(next) > width && row) {
        lines.push(row);
        row = part;
      } else row = next;
    }
    if (row) lines.push(row);
    const share = total ? `${Math.round(b.items[0].value / total * 100)}%` : "";
    const barWidth2 = Math.max(10, Math.min(96, width - visibleWidth(share) - 2));
    lines.push(`${stackedBar(b.items.map((item, i) => ({ value: item.value, role: roleOf(i) })), barWidth2, g, style)}  ${style.bold(style.fg(roleOf(0), share))}`);
    return lines;
  }
  const sumIsPercent = unit === "%" || Math.abs(total - 100) < 0.5 && !unit;
  const labelWidth = Math.min(Math.max(...b.items.map((i) => visibleWidth(i.label))) + 2, Math.floor(width * 0.35));
  const valueTexts = b.items.map((i) => sumIsPercent ? `${formatNumber(i.value)}%` : formatValue(i.value, unit.trim()) + (total && !unit ? "" : ""));
  const pctTexts = b.items.map((i) => sumIsPercent || !total ? "" : `${Math.round(i.value / total * 100)}%`);
  const valueWidth = Math.max(...valueTexts.map(visibleWidth));
  const pctWidth = Math.max(0, ...pctTexts.map(visibleWidth));
  const barWidth = Math.max(6, width - labelWidth - valueWidth - (pctWidth ? pctWidth + 2 : 0) - 3);
  const max = Math.max(...b.items.map((i) => i.value), 0) || 1;
  const leader = b.items.findIndex((i) => i.value === max);
  return b.items.map((item, i) => {
    const role = item.status ? statusRole(item.status) : i === leader ? "accent" : "muted";
    const filled = bar(item.value / max, barWidth, g, style, role, "dim", false);
    const pct = pctWidth ? "  " + style.fg("dim", padStart(pctTexts[i], pctWidth)) : "";
    return `${style.fg(i === leader ? "strong" : "text", fit(item.label, labelWidth))}${filled} ${style.bold(style.fg(i === leader ? "strong" : "muted", padStart(valueTexts[i], valueWidth)))}${pct}`;
  });
}
var LEVELS = ["low", "medium", "high"];
var LEVEL_SHORT = { low: "LOW", medium: "MED", high: "HIGH" };
function risk(b, ctx) {
  const { style, glyphs: g, width } = ctx;
  const cell = 7;
  const rowLabel = 17;
  const severityOf = (item) => item.status ?? riskSeverity(item.impact, item.likelihood);
  const glyphOf = (s) => s === "critical" ? g.risk.critical : s === "warning" ? g.risk.warning : g.risk.neutral;
  const lines = [];
  lines.push(
    style.fg("dim", padStart(`impact ${g.arrowRight}  `, rowLabel)) + LEVELS.map((l) => style.fg("muted", center(LEVEL_SHORT[l], cell))).join("")
  );
  const rows = [];
  for (const likelihood of [...LEVELS].reverse()) {
    const prefix = likelihood === "high" ? "likelihood" : "";
    const label = style.fg("dim", padEnd(prefix, 11)) + style.fg("muted", padStart(LEVEL_SHORT[likelihood], 4)) + "  ";
    const cells = LEVELS.map((impact) => {
      const items = b.items.filter((i) => i.impact === impact && i.likelihood === likelihood);
      if (!items.length) return style.fg("dim", center(g.risk.empty, cell));
      const worst = items.reduce((a, i) => statusRank(severityOf(i)) > statusRank(severityOf(a)) ? i : a);
      const s = severityOf(worst);
      return style.fg(statusRole(s), center(glyphOf(s), cell));
    }).join("");
    const legend = b.items.filter((i) => i.likelihood === likelihood).sort((a, c) => LEVELS.indexOf(c.impact) - LEVELS.indexOf(a.impact)).map((i) => {
      const s = severityOf(i);
      return `${style.fg(statusRole(s), glyphOf(s))} ${style.fg(s === "critical" ? "strong" : "text", i.label)}`;
    });
    rows.push({ grid: label + cells, legend });
  }
  const gridWidth = rowLabel + cell * 3;
  const inline = rows.every((r) => gridWidth + 2 + visibleWidth(r.legend.join("   ")) <= width);
  if (inline) {
    for (const r of rows) lines.push(`${r.grid}  ${r.legend.join("   ")}`.replace(/\s+$/, ""));
    return lines;
  }
  for (const r of rows) lines.push(r.grid.replace(/\s+$/, ""));
  lines.push("");
  for (const r of rows) for (const item of r.legend) lines.push(truncate(`  ${item}`, width));
  return lines;
}
function hierarchy(b, ctx) {
  const { style, glyphs: g, width } = ctx;
  const lines = [];
  const label = (node, root = false) => {
    const glyph = node.status ? `${mark(ctx, node.status)} ` : "";
    const role = node.status === "critical" ? "critical" : node.status === "good" ? "good" : root ? "strong" : "text";
    const textValue = root || node.children?.length ? style.bold(style.fg(role, node.label)) : style.fg(role, node.label);
    return `${glyph}${textValue}${node.note ? style.fg("muted", `  ${node.note}`) : ""}`;
  };
  if (b.root.label) lines.push(truncate(label(b.root, true), width));
  const walk = (node, prefix) => {
    (node.children ?? []).forEach((child, i, arr2) => {
      const lastChild = i === arr2.length - 1;
      lines.push(truncate(style.fg("dim", prefix + (lastChild ? g.tree.last : g.tree.branch)) + label(child), width));
      walk(child, prefix + (lastChild ? g.tree.space : g.tree.pipe));
    });
  };
  walk(b.root, "");
  return lines;
}
var CHECK_ROLE = {
  done: "good",
  failed: "critical",
  pending: "dim",
  skipped: "dim",
  warning: "warning",
  running: "info"
};
function checklist(b, ctx) {
  const { style, glyphs: g, width } = ctx;
  const items = b.items.map((item) => {
    const role = CHECK_ROLE[item.state];
    const labelRole2 = item.state === "failed" ? "strong" : item.state === "pending" || item.state === "skipped" ? "muted" : "text";
    return { glyph: style.fg(role, g.check[item.state]), label: item.label, labelRole: labelRole2, note: item.note, role };
  });
  const render = (colWidth) => {
    const labelWidth = Math.min(Math.max(...items.map((i) => visibleWidth(i.label))) + 2, colWidth - 4);
    return items.map((i) => truncate(`${i.glyph} ${style.fg(i.labelRole, i.note ? fit(i.label, labelWidth) : i.label)}${i.note ? style.fg(i.role === "dim" ? "muted" : i.role, i.note) : ""}`, colWidth));
  };
  if (items.length > 6 && width >= 72) {
    const colWidth = Math.floor((width - 4) / 2);
    const rendered = render(colWidth);
    const half = Math.ceil(rendered.length / 2);
    return columns([rendered.slice(0, half), rendered.slice(half)], [colWidth, colWidth], 4);
  }
  return render(width);
}
function evidence(b, ctx) {
  const { style, glyphs: g, width } = ctx;
  const lines = [];
  const conf = b.confidence;
  const dots = conf ? g.unicode ? "\u25CF".repeat(LEVELS.indexOf(conf) + 1) + "\u25CB".repeat(2 - LEVELS.indexOf(conf)) : `${LEVELS.indexOf(conf) + 1}/3` : "";
  const confRole = conf === "high" ? "good" : conf === "medium" ? "warning" : "critical";
  const confText = conf ? `${style.fg(confRole, dots)} ${style.fg("muted", `${conf.toUpperCase()} CONFIDENCE`)}` : "";
  const claimWidth = width - (conf ? visibleWidth(confText) + 3 : 0);
  const claim = wrap(b.claim, Math.max(20, claimWidth));
  claim.forEach((line, i) => {
    const textValue = style.bold(style.fg("strong", line));
    lines.push(i === 0 && conf ? padEnd(textValue, claimWidth) + "   " + confText : textValue);
  });
  if (!b.items.length) return lines;
  const labelWidth = Math.min(Math.max(...b.items.map((i) => visibleWidth(i.label))) + 2, Math.floor(width * 0.5));
  for (const item of b.items) {
    const contra = item.supports === false;
    const prefix = contra ? style.fg("critical", g.status.critical) : style.fg("dim", " ");
    const connector = style.fg(contra ? "critical" : "dim", `${g.h}${g.h}${g.arrowRight}`);
    const value = item.value ? ` ${style.bold(style.fg(contra ? "critical" : "text", item.value))}` : "";
    const src = item.source ? style.fg("dim", `  ${item.source}`) : "";
    lines.push(truncate(`  ${prefix}${style.fg("muted", fit(item.label, labelWidth))}${item.value ? connector : ""}${value}${src}`, width));
  }
  return lines;
}
var RISK_ROLE = { high: "critical", medium: "warning", low: "muted" };
function change(b, ctx) {
  const { style, glyphs: g, width } = ctx;
  const statWidth = 14;
  const riskWidth = 5;
  const addW = Math.max(...b.files.map((f) => `+${f.added ?? 0}`.length));
  const remW = Math.max(...b.files.map((f) => `-${f.removed ?? 0}`.length));
  const pathWidth = Math.min(Math.max(...b.files.map((f) => visibleWidth(f.path))) + 2, Math.max(12, width - addW - remW - statWidth - riskWidth - 16));
  const churn = (f) => (f.added ?? 0) + (f.removed ?? 0);
  const maxChurn = Math.max(...b.files.map(churn), 1);
  const riskScore2 = (f) => (f.risk ? LEVELS.indexOf(f.risk) : -1) * 1e6 + churn(f);
  const centre = b.files.reduce((a, f) => riskScore2(f) > riskScore2(a) ? f : a);
  return b.files.map((f) => {
    const cells = Math.max(1, Math.round(churn(f) / maxChurn * statWidth));
    const addCells = churn(f) ? Math.round((f.added ?? 0) / churn(f) * cells) : 0;
    const stat = style.fg("good", g.barFull.repeat(addCells)) + style.fg("critical", (g.unicode ? "\u2592" : "-").repeat(cells - addCells));
    const riskText = f.risk ? style.fg(RISK_ROLE[f.risk], padEnd(f.risk === "medium" ? "MED" : f.risk.toUpperCase(), riskWidth)) : " ".repeat(riskWidth);
    const isCentre = f === centre && f.risk === "high";
    const tail = isCentre ? style.fg("critical", ` ${g.arrowLeft} risk centre`) : f.note ? style.fg("muted", ` ${f.note}`) : "";
    const path = isCentre ? style.bold(style.fg("strong", fit(f.path, pathWidth))) : style.fg("text", fit(f.path, pathWidth));
    return truncate(
      `${path}${style.fg("good", padStart(`+${f.added ?? 0}`, addW))} ${style.fg("critical", padStart(`-${f.removed ?? 0}`, remW))}  ${padEnd(stat, statWidth)}  ${riskText}${tail}`.replace(/\s+$/, ""),
      width
    );
  });
}
function progress(b, ctx) {
  const { style, glyphs: g, width } = ctx;
  const labelWidth = Math.max(...b.items.map((i) => visibleWidth(i.label))) + 3;
  const barWidth = Math.max(8, Math.min(32, width - labelWidth - 16));
  const lines = b.items.map((item) => {
    const done = item.state === "done";
    const frac = done ? 1 : item.total ? (item.value ?? 0) / item.total : item.value !== void 0 && item.value <= 1 ? item.value : 0;
    const role = item.state === "failed" ? "critical" : done ? "good" : "accent";
    const right = done ? style.fg("good", "complete") : item.total ? `${style.bold(style.fg("strong", padStart(formatNumber(item.value ?? 0), 4)))} ${style.fg("muted", `/ ${formatNumber(item.total)}`)}` : style.fg("muted", item.state ?? "");
    return `${style.fg("text", fit(item.label, labelWidth))}${bar(frac, barWidth, g, style, role)}  ${right}`;
  });
  if (b.signal) {
    const role = b.signal.status ? statusRole(b.signal.status) : "accent";
    lines.push("");
    lines.push(style.fg("muted", "current signal"));
    const label = style.bold(style.fg("strong", b.signal.label));
    const value = b.signal.value ? style.bold(style.fg(role, b.signal.value.toUpperCase())) : "";
    const run = Math.max(3, Math.min(16, width - visibleWidth(b.signal.label) - visibleWidth(b.signal.value ?? "") - 6));
    lines.push(truncate(`${label}  ${style.fg(role, g.h.repeat(run) + g.arrowRight)}  ${value}`, width));
  }
  return lines;
}
var TEXT_GLANCE_CHARS = 240;
function text(b, ctx) {
  const { style, glyphs: g, width } = ctx;
  let content = b.text.trim();
  const limit = ctx.depth === "explore" ? Infinity : TEXT_GLANCE_CHARS;
  let truncated = false;
  if (content.length > limit) {
    content = content.slice(0, limit).replace(/\s+\S*$/, "") + g.ellipsis;
    truncated = true;
  }
  let lines = renderMarkdown(content, ctx);
  if (ctx.depth === "glance" && lines.length > 3) {
    lines = lines.slice(0, 3);
    lines[2] = truncate(lines[2], width - 1) + (lines[2].endsWith(g.ellipsis) ? "" : g.ellipsis);
    truncated = true;
  }
  if (truncated) lines.push(style.fg("dim", `${g.arrowRight} more on explore`));
  return lines;
}
function unknown(b, ctx) {
  const { style, width } = ctx;
  return [
    style.fg("dim", `[ unsupported visualization: ${b.originalType} ]`),
    ...b.fallback.flatMap((line) => wrap(line, width)).map((l) => style.fg("muted", l))
  ];
}

// ../terminal/src/document.ts
var GLANCE_MAX_BLOCKS = 5;
var PAIRABLE = /* @__PURE__ */ new Set(["risk", "checklist", "hierarchy", "evidence", "verdict", "metric", "flow", "architecture", "timeline"]);
function isNormalized(input) {
  return typeof input === "object" && input !== null && Array.isArray(input.blocks) && Array.isArray(input.actions) && input.blocks.every((b) => typeof b.id === "string" && typeof b.priority === "string");
}
function renderDocument(input, options) {
  return layoutDocument(input, options).lines;
}
function layoutDocument(input, options) {
  const doc = isNormalized(input) ? input : normalize(input);
  const margin = options.margin ?? 1;
  const width = Math.max(20, options.width);
  const inner = width - margin * 2;
  const ctx = {
    width: inner,
    style: options.style ?? ansiStyle(),
    glyphs: options.unicode === false ? ASCII : UNICODE,
    depth: options.depth ?? "glance"
  };
  const { style, glyphs: g } = ctx;
  const out = [];
  if (options.header !== false && (doc.title || doc.subtitle || doc.intent)) out.push(header(doc, ctx), "");
  if (doc.takeaway) {
    out.push(...hero(doc, ctx), "");
  }
  const { shown, hidden } = plan(doc, ctx, options.glanceLines ?? 44);
  out.push(...renderBlocks(shown, ctx));
  if (ctx.depth === "explore") out.push(...exploreExtras(doc, ctx));
  if (hidden.length && ctx.depth !== "explore") {
    if (out[out.length - 1] !== "") out.push("");
    const names = hidden.map((b) => (b.title ?? (b.type === "verdict" ? b.text : b.type)).toLowerCase());
    const more = `+ ${hidden.length} more ${g.dot} ${names.join(` ${g.dot} `)}`;
    out.push(style.fg("dim", truncate(more, inner, g.ellipsis)));
  }
  if (options.actions !== false && doc.actions.length) {
    if (out[out.length - 1] !== "") out.push("");
    out.push(...actionsRow(doc, ctx));
  }
  if (options.hints?.length) {
    if (out[out.length - 1] !== "") out.push("");
    out.push(style.fg("dim", truncate(options.hints.join(`  ${g.dot}  `), inner, g.ellipsis)));
  }
  while (out.length && out[out.length - 1] === "") out.pop();
  const pad = " ".repeat(margin);
  const lines = out.map((line) => {
    const fitted = visibleWidth(line) > inner ? truncate(line, inner, g.ellipsis) : line;
    return fitted ? pad + fitted : fitted;
  });
  return { lines, hidden, doc };
}
function header(doc, ctx) {
  const { style, glyphs: g, width } = ctx;
  const title = (doc.title ?? "").toUpperCase();
  const left = `${style.bold(style.fg("strong", title))}${doc.subtitle ? `  ${style.fg("muted", doc.subtitle)}` : ""}`;
  const right = doc.intent ? style.fg("dim", doc.intent.toUpperCase()) : "";
  const leftWidth = visibleWidth(left);
  const rightWidth = visibleWidth(right);
  const rule = width - leftWidth - rightWidth - (left ? 2 : 0) - (right ? 2 : 0);
  if (rule < 3) return truncate(left, width);
  return `${left}${left ? " " : ""}${style.fg("dim", g.heavy.repeat(rule))}${right ? ` ${right}` : ""}`;
}
function hero(doc, ctx) {
  const { style, glyphs: g, width } = ctx;
  const t = doc.takeaway;
  const role = t.status ? statusRole(t.status) : "accent";
  if (t.value !== void 0 && t.value !== "") {
    const { big, small } = splitForBig(t.value, t.unit);
    const glyphRows = g.unicode && big ? bigText(big) : void 0;
    if (glyphRows) {
      const numWidth = visibleWidth(glyphRows[0]);
      const unitText = small ? ` ${small}` : "";
      const leftWidth = numWidth + visibleWidth(unitText) + 4;
      const rightWidth = width - leftWidth;
      if (rightWidth >= 24) {
        const left = glyphRows.map((row, i) => style.bold(style.fg(role, row)) + (i === 2 && unitText ? style.fg(role, unitText) : ""));
        const glyph = t.status && t.status !== "neutral" && t.status !== "info" ? `${mark(ctx, t.status)} ` : "";
        const right = [];
        right.push(glyph + style.bold(style.fg(role, truncate(t.text.length <= 42 ? t.text.toUpperCase() : t.text, rightWidth - 2))));
        right.push(t.detail ? style.fg("muted", truncate(t.detail, rightWidth, g.ellipsis)) : "");
        const numeric = typeof t.value === "number" ? t.value : Number.NaN;
        if (t.unit === "%" && Number.isFinite(numeric)) {
          right.push(bar(numeric / 100, Math.min(44, rightWidth), g, style, role, "dim"));
        } else right.push("");
        return columns([left, right], [leftWidth, rightWidth], 0);
      }
    }
    const value = `${typeof t.value === "number" ? t.value : t.value}${t.unit === "%" ? "%" : t.unit ? ` ${t.unit}` : ""}`;
    return verdictLines(ctx, `${value}  ${t.text}`, t.status, { detail: t.detail });
  }
  return verdictLines(ctx, t.text, t.status, { detail: t.detail });
}
function plan(doc, ctx, glanceLines) {
  const blocks = doc.blocks;
  if (ctx.depth === "explore") return { shown: blocks, hidden: [] };
  if (ctx.depth === "scan") {
    return { shown: blocks.filter((b) => b.priority !== "detail"), hidden: blocks.filter((b) => b.priority === "detail") };
  }
  const primary = blocks.filter((b) => b.priority === "primary");
  const candidates = (primary.length ? primary : blocks.filter((b) => b.priority !== "detail").slice(0, 3)).slice(0, GLANCE_MAX_BLOCKS);
  const shown = [];
  let used = 0;
  for (const block2 of candidates) {
    const height = renderBlock(block2, ctx).length + 1;
    if (shown.length && used + height > glanceLines) continue;
    shown.push(block2);
    used += height;
  }
  return { shown, hidden: blocks.filter((b) => !shown.includes(b)) };
}
function renderBlocks(blocks, ctx) {
  const out = [];
  const wide = ctx.width >= 120;
  for (let i = 0; i < blocks.length; i++) {
    const block2 = blocks[i];
    const next = blocks[i + 1];
    if (out.length) out.push("");
    if (wide && next && PAIRABLE.has(block2.type) && PAIRABLE.has(next.type)) {
      const gap = 6;
      const colWidth = Math.floor((ctx.width - gap) / 2);
      const half = { ...ctx, width: colWidth };
      const a = renderBlock(block2, half);
      const b = renderBlock(next, half);
      out.push(...columns([a, b], [colWidth, colWidth], gap));
      i++;
      continue;
    }
    out.push(...renderBlock(block2, ctx));
  }
  return out;
}
function exploreExtras(doc, ctx) {
  const { style, glyphs: g, width } = ctx;
  const out = [];
  const section = (title) => {
    out.push("", sectionTitle(ctx, title), style.fg("dim", g.h.repeat(Math.min(width, 46))));
  };
  if (doc.detail?.markdown || doc.detail?.sections?.length) {
    section("Detail");
    if (doc.detail.markdown) out.push(...renderMarkdown(doc.detail.markdown, ctx));
    for (const s of doc.detail.sections ?? []) {
      out.push("", style.bold(s.title), ...renderMarkdown(s.markdown, ctx));
    }
  }
  if (doc.evidence?.length) {
    section("Evidence");
    const labelWidth = Math.min(Math.max(...doc.evidence.map((e) => visibleWidth(e.label))) + 2, Math.floor(width / 2));
    for (const e of doc.evidence) {
      const glyph = e.supports === false ? style.fg("critical", g.status.critical) : style.fg("good", g.status.good);
      const value = e.value ? `${style.fg("dim", `${g.h}${g.arrowRight}`)} ${style.fg("text", e.value)}` : "";
      out.push(truncate(`${glyph} ${style.fg("muted", e.label.padEnd(labelWidth))}${value}`, width));
    }
  }
  if (doc.sources?.length) {
    section("Sources");
    for (const s of doc.sources) {
      out.push(truncate(`${style.fg("dim", g.arrowRight)} ${style.fg("text", s.label)}${s.ref ? `  ${style.fg("accent", s.ref)}` : ""}${s.location ? style.fg("dim", `:${s.location}`) : ""}`, width));
    }
  }
  const speech = deriveSpeech(doc);
  if (speech) {
    section("Spoken summary");
    out.push(...wrap(`\u201C${speech}\u201D`, width).map((l) => style.italic(style.fg("muted", l))));
  }
  return out;
}
function actionsRow(doc, ctx) {
  const { style, width } = ctx;
  const chips = doc.actions.map((a, i) => `${style.fg("dim", `[${i + 1}]`)} ${style.fg("accent", a.label.toLowerCase())}`);
  const lines = [];
  let row = "";
  for (const chip of chips) {
    const next = row ? `${row}    ${chip}` : chip;
    if (visibleWidth(next) > width && row) {
      lines.push(row);
      row = chip;
    } else row = next;
  }
  if (row) lines.push(row);
  return lines;
}
function renderPlainText(input, options = {}) {
  return renderDocument(input, {
    width: options.width ?? 100,
    depth: options.depth ?? "explore",
    unicode: options.unicode ?? true,
    style: { color: false, fg: (_r, t) => t, bold: (t) => t, italic: (t) => t },
    margin: 0,
    ...options
  }).map((l) => l.replace(/\s+$/, "")).join("\n");
}

// src/theme.ts
var ROLE_TO_PI = {
  text: "text",
  strong: "text",
  muted: "muted",
  dim: "dim",
  accent: "accent",
  good: "success",
  warning: "warning",
  critical: "error",
  info: "mdLink",
  neutral: "muted"
};
function piStyle(theme) {
  return {
    color: true,
    fg: (role, text2) => text2 ? theme.fg(ROLE_TO_PI[role], text2) : text2,
    bold: (text2) => text2 ? theme.bold(text2) : text2,
    italic: (text2) => text2 && theme.italic ? theme.italic(text2) : text2
  };
}

// src/view.ts
var PresentView = class {
  constructor(doc, theme, options) {
    this.doc = doc;
    this.theme = theme;
    this.options = options;
  }
  doc;
  theme;
  options;
  cache;
  update(doc, options) {
    this.doc = doc;
    this.options = options;
    this.cache = void 0;
  }
  render(width) {
    if (this.cache?.width === width) return this.cache.lines;
    const lines = [
      "",
      ...layoutDocument(this.doc, {
        width,
        depth: this.options.depth,
        style: piStyle(this.theme),
        hints: this.options.hints,
        margin: this.options.margin ?? 1
      }).lines
    ];
    this.cache = { width, lines };
    return lines;
  }
  invalidate() {
    this.cache = void 0;
  }
};
var DEPTHS = ["glance", "scan", "explore"];
var Explorer = class {
  constructor(doc, rawDocument, theme, viewport, requestRender, done, copy) {
    this.doc = doc;
    this.rawDocument = rawDocument;
    this.theme = theme;
    this.viewport = viewport;
    this.requestRender = requestRender;
    this.done = done;
    this.copy = copy;
  }
  doc;
  rawDocument;
  theme;
  viewport;
  requestRender;
  done;
  copy;
  depth = "scan";
  raw = false;
  scroll = 0;
  status = "";
  lastLines = [];
  lastInner = 96;
  render(width) {
    const style = piStyle(this.theme);
    const inner = Math.max(20, width - 4);
    this.lastInner = inner;
    let body;
    if (this.raw) {
      body = JSON.stringify(this.rawDocument, null, 2).split("\n").map((l) => style.fg("muted", truncate(l, inner)));
    } else {
      body = layoutDocument(this.doc, { width: inner, depth: this.depth, style, margin: 0, actions: true }).lines;
    }
    this.lastLines = body;
    const height = Math.max(5, this.viewport() - 4);
    const maxScroll = Math.max(0, body.length - height);
    this.scroll = Math.min(this.scroll, maxScroll);
    const visible = body.slice(this.scroll, this.scroll + height);
    const border = (s) => this.theme.fg("borderMuted", s);
    const tabs = DEPTHS.map((d) => d === this.depth && !this.raw ? style.bold(style.fg("accent", ` ${d.toUpperCase()} `)) : style.fg("dim", ` ${d} `)).join("");
    const rawTab = this.raw ? style.bold(style.fg("accent", " RAW ")) : style.fg("dim", " raw ");
    const title = ` ${style.bold("agent present")} ${tabs}${rawTab}`;
    const top = border("\u256D") + title + border("\u2500".repeat(Math.max(0, width - 2 - visibleWidth(title)))) + border("\u256E");
    const lines = [top];
    for (const line of visible) lines.push(`${border("\u2502")} ${padTo(line, inner)} ${border("\u2502")}`);
    for (let i = visible.length; i < Math.min(height, body.length); i++) lines.push(`${border("\u2502")} ${" ".repeat(inner)} ${border("\u2502")}`);
    const pos = body.length > height ? style.fg("dim", ` ${this.scroll + 1}-${Math.min(body.length, this.scroll + height)}/${body.length} `) : "";
    const keys = "enter depth \xB7 d details \xB7 e evidence \xB7 s sources \xB7 c copy \xB7 r raw \xB7 1-9 act \xB7 q close";
    const footerText = this.status ? style.fg("accent", ` ${this.status} `) : style.fg("dim", ` ${keys} `);
    const footer = truncate(footerText, Math.max(0, width - 2 - visibleWidth(pos)));
    lines.push(border("\u2570") + footer + border("\u2500".repeat(Math.max(0, width - 2 - visibleWidth(footer) - visibleWidth(pos)))) + pos + border("\u256F"));
    return lines.map((l) => truncate(l, width));
  }
  jumpTo(heading, depth = "explore") {
    this.raw = false;
    this.depth = depth;
    const lines = layoutDocument(this.doc, { width: this.lastInner, depth, style: piStyle(this.theme), margin: 0 }).lines.map(stripAnsi);
    const index = lines.findIndex((l) => l.trim().toUpperCase().startsWith(heading));
    this.scroll = index >= 0 ? index : 0;
    this.status = index >= 0 ? "" : `no ${heading.toLowerCase()} in this presentation`;
  }
  handleInput(data) {
    this.status = "";
    const page = Math.max(5, this.viewport() - 6);
    switch (data) {
      case "q":
      case "\x1B":
        this.done(void 0);
        return;
      case "\r":
      case "\n":
        this.raw = false;
        this.depth = DEPTHS[(DEPTHS.indexOf(this.depth) + 1) % DEPTHS.length];
        this.scroll = 0;
        break;
      case "d":
        this.jumpTo("DETAIL");
        break;
      case "e": {
        const block2 = this.doc.blocks.find((b) => b.type === "evidence");
        const heading = block2?.title ?? (block2?.type === "evidence" ? block2.claim : "EVIDENCE");
        this.jumpTo(heading.toUpperCase());
        break;
      }
      case "s":
        this.jumpTo("SOURCES");
        break;
      case "r":
        this.raw = !this.raw;
        this.scroll = 0;
        break;
      case "c":
        void this.copy(renderPlainText(this.doc, { width: 100, depth: "explore" })).then(
          () => {
            this.status = "copied presentation as text";
            this.requestRender();
          },
          () => {
            this.status = "copy failed";
            this.requestRender();
          }
        );
        break;
      case "j":
      case "\x1B[B":
        this.scroll++;
        break;
      case "k":
      case "\x1B[A":
        this.scroll = Math.max(0, this.scroll - 1);
        break;
      case " ":
      case "\x1B[6~":
        this.scroll += page;
        break;
      case "\x1B[5~":
        this.scroll = Math.max(0, this.scroll - page);
        break;
      case "g":
        this.scroll = 0;
        break;
      case "G":
        this.scroll = Math.max(0, this.lastLines.length - page);
        break;
      default: {
        const n = Number.parseInt(data, 10);
        if (n >= 1 && n <= 9 && this.doc.actions[n - 1]) {
          const action2 = this.doc.actions[n - 1];
          if (action2.intent === "expand" && action2.target) {
            const block2 = this.doc.blocks.find((b) => b.id === action2.target);
            this.jumpTo((block2?.title ?? (block2?.type === "evidence" ? block2.claim : "")).toUpperCase());
          } else if (action2.intent === "copy") {
            void this.copy(action2.value ?? action2.label).then(() => {
              this.status = `copied ${action2.label.toLowerCase()}`;
              this.requestRender();
            });
          } else {
            this.done({ action: action2 });
            return;
          }
        }
      }
    }
    this.requestRender();
  }
  invalidate() {
  }
};
function padTo(line, width) {
  const w = visibleWidth(line);
  if (w > width) return truncate(line, width);
  return line + " ".repeat(width - w);
}

// src/index.ts
var MODE_ENTRY = "agent-present-mode";
var PRESENTATION_ENTRY = "agent-present";
var PROGRESS_WIDGET = "agent-present-progress";
var EXPLORE_SHORTCUT = "alt+e";
function expandKey() {
  try {
    return keyText("app.tools.expand") || "ctrl+o";
  } catch {
    return "ctrl+o";
  }
}
function hints(expanded, doc) {
  const out = [`${expandKey()} ${expanded ? "glance" : "scan"}`, `${EXPLORE_SHORTCUT} explore`];
  if (doc.actions.length) out.push(`${EXPLORE_SHORTCUT} then 1-${Math.min(9, doc.actions.length)} to act`);
  return out;
}
function agentPresent(pi) {
  let mode = "auto";
  let last;
  const applyMode = (next) => {
    mode = next;
    const active = pi.getActiveTools();
    const has = active.includes(TOOL_NAME);
    if (mode === "off" && has) pi.setActiveTools(active.filter((t) => t !== TOOL_NAME));
    if (mode !== "off" && !has) pi.setActiveTools([...active, TOOL_NAME]);
  };
  const restore = (ctx) => {
    mode = "auto";
    last = void 0;
    for (const entry of ctx.sessionManager.getBranch()) {
      if (entry.type === "custom" && entry.customType === MODE_ENTRY) {
        const m = entry.data?.mode;
        if (m === "auto" || m === "always" || m === "off") mode = m;
      }
      if (entry.type === "custom" && entry.customType === PRESENTATION_ENTRY) {
        const raw = entry.data?.document;
        if (raw) last = { raw, doc: normalize(raw) };
      }
      if (entry.type === "message" && entry.message.role === "toolResult" && entry.message.toolName === TOOL_NAME) {
        const raw = entry.message.details?.document;
        if (raw && !entry.message.isError) last = { raw, doc: normalize(raw) };
      }
    }
    applyMode(mode);
  };
  pi.on("session_start", (_event, ctx) => restore(ctx));
  pi.on("before_agent_start", (event) => {
    if (mode !== "always") return;
    const guidelines = event.systemPromptOptions.promptGuidelines;
    if (guidelines && !guidelines.includes(ALWAYS_GUIDELINE)) guidelines.push(ALWAYS_GUIDELINE);
  });
  pi.on("agent_end", (_event, ctx) => {
    if (ctx.hasUI) ctx.ui.setWidget(PROGRESS_WIDGET, void 0);
  });
  pi.registerTool({
    name: TOOL_NAME,
    label: "Present",
    description: TOOL_DESCRIPTION,
    promptSnippet: PROMPT_SNIPPET,
    promptGuidelines: PROMPT_GUIDELINES,
    // Plain JSON Schema: Pi validates it directly, and it is the same schema the spec publishes.
    parameters: presentToolSchema(),
    renderShell: "self",
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const raw = { present: "0.1", ...params };
      const result = validate(raw);
      const doc = normalize(raw);
      if (!doc.blocks.length && !doc.takeaway) {
        throw new Error(`Nothing to present: give a takeaway or at least one block.
${formatIssues(result.errors)}`);
      }
      const warnings = [...result.errors, ...result.warnings].map((i) => `${i.path || "(root)"}: ${i.message}`);
      const progress2 = doc.intent === "progress";
      if (progress2) {
        if (ctx.hasUI && ctx.mode === "tui") {
          ctx.ui.setWidget(PROGRESS_WIDGET, (_tui, theme) => new PresentView(doc, theme, { depth: "glance", margin: 1 }));
        }
      } else {
        last = { raw, doc };
        if (ctx.hasUI) ctx.ui.setWidget(PROGRESS_WIDGET, void 0);
      }
      const text2 = progress2 ? "Progress shown to the user. Keep working, then finish with a final present call." : `Presented to the user as a visual infographic. Do not repeat it in prose; end your turn or add at most one short sentence.

${outline(doc)}`;
      return {
        content: [{ type: "text", text: warnings.length ? `${text2}

Renderer notes:
${warnings.join("\n")}` : text2 }],
        details: { document: raw, warnings },
        terminate: !progress2
      };
    },
    renderCall(args, theme, context) {
      if (!context.argsComplete) {
        try {
          const doc = normalize({ present: "0.1", ...args });
          if (doc.blocks.length || doc.takeaway) {
            const view = (context.lastComponent instanceof PresentView ? context.lastComponent : void 0) ?? new PresentView(doc, theme, { depth: "glance" });
            view.update(doc, { depth: "glance", hints: ["composing\u2026"] });
            return view;
          }
        } catch {
        }
        return new Text(theme.fg("dim", " \u25CC composing presentation\u2026"), 0, 0);
      }
      return new Container();
    },
    renderResult(result, { expanded, isPartial }, theme, context) {
      if (isPartial) return new Text(theme.fg("dim", " \u25CC presenting\u2026"), 0, 0);
      if (context.isError) {
        const message = result.content.find((c) => c.type === "text");
        return new Text(theme.fg("error", ` present failed: ${message && "text" in message ? message.text.split("\n")[0] : "invalid document"}`), 0, 0);
      }
      const details = result.details;
      if (!details?.document) return new Container();
      const doc = normalize(details.document);
      if (doc.intent === "progress") {
        return new Text(theme.fg("dim", ` \u25D0 ${doc.title ?? "progress"} updated`), 0, 0);
      }
      const options = { depth: expanded ? "scan" : "glance", hints: hints(expanded, doc) };
      const view = context.lastComponent instanceof PresentView ? context.lastComponent : new PresentView(doc, theme, options);
      view.update(doc, options);
      return view;
    }
  });
  pi.registerEntryRenderer(PRESENTATION_ENTRY, (entry, { expanded }, theme) => {
    if (!entry.data?.document) return void 0;
    const doc = normalize(entry.data.document);
    return new PresentView(doc, theme, { depth: expanded ? "scan" : "glance", hints: hints(expanded, doc) });
  });
  const showPresentation = (raw) => {
    const doc = normalize(raw);
    last = { raw, doc };
    pi.appendEntry(PRESENTATION_ENTRY, { document: raw });
  };
  const runAction = async (action2, ctx) => {
    if (action2.intent === "agent") {
      const prompt = action2.prompt ?? action2.label;
      if (ctx.isIdle()) pi.sendUserMessage(prompt);
      else pi.sendUserMessage(prompt, { deliverAs: "followUp" });
    } else if (action2.intent === "open" && action2.value) {
      const opener = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
      await pi.exec(opener, [action2.value]);
    } else if (action2.intent === "copy") {
      await copyToClipboard(action2.value ?? action2.label);
      if (ctx.hasUI) ctx.ui.notify(`Copied ${action2.label}`, "info");
    }
  };
  const openExplorer = async (ctx, startRaw = false) => {
    if (!last) {
      if (ctx.hasUI) ctx.ui.notify("No presentation yet. Try /present demo", "warning");
      return;
    }
    if (ctx.mode !== "tui") {
      if (ctx.hasUI) ctx.ui.notify("The explorer needs the interactive TUI", "warning");
      return;
    }
    const current = last;
    const result = await ctx.ui.custom(
      (tui, theme, _keybindings, done) => {
        const explorer = new Explorer(
          current.doc,
          current.raw,
          theme,
          () => Math.floor(tui.terminal.rows * 0.9),
          () => tui.requestRender(),
          done,
          (text2) => copyToClipboard(text2)
        );
        if (startRaw) explorer.handleInput("r");
        return explorer;
      },
      { overlay: true, overlayOptions: { width: "92%", maxHeight: "92%", anchor: "center" } }
    );
    if (result?.action) await runAction(result.action, ctx);
  };
  pi.registerShortcut(EXPLORE_SHORTCUT, {
    description: "Explore the last Agent Present presentation",
    handler: async (ctx) => openExplorer(ctx)
  });
  const SUBCOMMANDS = [
    { value: "auto", description: "Agent presents when the answer has structure (default)" },
    { value: "on", description: "Same as auto" },
    { value: "always", description: "Agent presents every substantive answer" },
    { value: "off", description: "Disable the present tool" },
    { value: "last", description: "Convert the last plain-text answer into a presentation" },
    { value: "demo", description: "Show a showcase presentation" },
    { value: "view", description: "Explore the last presentation" },
    { value: "raw", description: "Show the raw Present IR of the last presentation" },
    { value: "act", description: "Run an action of the last presentation: /present act 1" }
  ];
  const setMode = (next, ctx) => {
    applyMode(next);
    pi.appendEntry(MODE_ENTRY, { mode: next });
    const message = next === "off" ? "Agent Present off \u2014 the agent answers in plain text" : next === "always" ? "Agent Present: always \u2014 every substantive answer becomes a presentation" : "Agent Present: auto \u2014 the agent presents when structure helps";
    if (ctx.hasUI) ctx.ui.notify(message, "info");
  };
  const presentLast = async (ctx) => {
    await ctx.waitForIdle();
    const answer = lastAssistantText(ctx.sessionManager.getBranch());
    if (!answer) {
      if (ctx.hasUI) ctx.ui.notify("No assistant answer to present yet", "warning");
      return;
    }
    const model = ctx.model;
    if (!model) {
      if (ctx.hasUI) ctx.ui.notify("No model selected", "error");
      return;
    }
    if (ctx.hasUI) {
      ctx.ui.notify("Presenting the last answer\u2026", "info");
      ctx.ui.setWorkingMessage?.("composing presentation\u2026");
    }
    try {
      const { raw } = await transformToPresent(answer, async (systemPrompt, user) => {
        const reply = await ctx.modelRegistry.complete(model, {
          systemPrompt,
          messages: [{ role: "user", content: [{ type: "text", text: user }], timestamp: Date.now() }]
        });
        if (reply.stopReason === "error") throw new Error(reply.errorMessage ?? "model call failed");
        return reply.content.filter((c) => c.type === "text").map((c) => c.text).join("\n");
      });
      showPresentation(raw);
    } catch (error) {
      if (ctx.hasUI) ctx.ui.notify(`Could not present the last answer: ${error.message}`, "error");
    } finally {
      if (ctx.hasUI) ctx.ui.setWorkingMessage?.();
    }
  };
  pi.registerCommand("present", {
    description: "Agent Present: on | off | auto | always | last | demo | view | raw | act",
    getArgumentCompletions: (prefix) => {
      const [sub, rest] = prefix.split(/\s+/, 2);
      if (sub === "demo" && rest !== void 0) {
        return ["all", ...Object.keys(DEMOS)].filter((d) => d.startsWith(rest)).map((d) => ({ value: `demo ${d}`, label: d }));
      }
      const items = SUBCOMMANDS.filter((s) => s.value.startsWith(prefix.trim())).map((s) => ({ value: s.value, label: s.value, description: s.description }));
      return items.length ? items : null;
    },
    handler: async (args, ctx) => {
      const [sub = "", ...rest] = args.trim().split(/\s+/).filter(Boolean);
      switch (sub) {
        case "":
        case "status": {
          const tool = pi.getActiveTools().includes(TOOL_NAME) ? "active" : "inactive";
          if (ctx.hasUI) ctx.ui.notify(`Agent Present: ${mode} (tool ${tool}). ${EXPLORE_SHORTCUT} explores the last presentation.`, "info");
          return;
        }
        case "on":
        case "auto":
          return setMode("auto", ctx);
        case "always":
          return setMode("always", ctx);
        case "off":
          return setMode("off", ctx);
        case "last":
          return presentLast(ctx);
        case "view":
        case "explore":
          return openExplorer(ctx);
        case "raw":
          return openExplorer(ctx, true);
        case "act": {
          const n = Number.parseInt(rest[0] ?? "", 10);
          const action2 = last?.doc.actions.find((a, i) => a.id === rest[0] || i === n - 1);
          if (!action2) {
            if (ctx.hasUI) ctx.ui.notify("No such action on the last presentation", "warning");
            return;
          }
          return runAction(action2, ctx);
        }
        case "demo": {
          let name = rest[0];
          if (!name && ctx.hasUI) {
            name = await ctx.ui.select("Agent Present demo", ["all", ...Object.keys(DEMOS)]);
            if (!name) return;
          }
          const names = name === "all" || !name ? Object.keys(DEMOS) : [name];
          for (const n of names) {
            if (!DEMOS[n]) {
              if (ctx.hasUI) ctx.ui.notify(`Unknown demo "${n}". Try: ${Object.keys(DEMOS).join(", ")}`, "warning");
              return;
            }
            showPresentation(DEMOS[n]);
          }
          return;
        }
        default:
          if (ctx.hasUI) ctx.ui.notify(`Unknown subcommand "${sub}". Try /present demo`, "warning");
      }
    }
  });
}
export {
  agentPresent as default
};
