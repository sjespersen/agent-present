import { blockSchemas, presentSchema, type JsonSchema } from "./schema.js";

export interface ValidationIssue {
  /** JSON-pointer-ish path, e.g. "blocks[2].items[0].value" */
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  /** Non-fatal issues: unknown block types, unsupported version, information-budget hints. */
  warnings: ValidationIssue[];
}

/**
 * Validates a Present IR document against the 0.1 schema.
 *
 * Unknown block types are warnings, not errors: Present prefers forwards
 * compatibility over strict renderer failure.
 */
export function validate(input: unknown): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (!isRecord(input)) {
    return { valid: false, errors: [{ path: "", message: "document must be an object" }], warnings };
  }

  const { blocks, ...rest } = input;
  const docSchema = presentSchema as { properties: Record<string, JsonSchema>; required: string[] };
  const { blocks: _blocksSchema, ...otherProps } = docSchema.properties;
  check({ type: "object", properties: otherProps, required: ["present"] }, rest, "", errors);

  if (typeof input.present === "string" && !input.present.startsWith("0.")) {
    warnings.push({ path: "present", message: `unsupported major version ${input.present}; rendering best-effort` });
  }

  if (!Array.isArray(blocks)) {
    errors.push({ path: "blocks", message: "must be an array" });
  } else {
    blocks.forEach((block, i) => {
      const path = `blocks[${i}]`;
      if (!isRecord(block)) {
        errors.push({ path, message: "must be an object" });
        return;
      }
      if (typeof block.type !== "string") {
        errors.push({ path: `${path}.type`, message: "is required" });
        return;
      }
      const schema = blockSchemas[block.type];
      if (!schema) {
        warnings.push({ path: `${path}.type`, message: `unknown block type "${block.type}" will degrade to a text fallback` });
        return;
      }
      check(schema, block, path, errors);
    });
    const glance = blocks.filter((b) => !isRecord(b) || (b.priority !== "secondary" && b.priority !== "detail")).length;
    if (glance > 5) {
      warnings.push({ path: "blocks", message: `${glance} glance blocks exceed the budget of 5; mark extras priority "secondary" or they will collapse` });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/** Throws with a readable message when the document is invalid. */
export function assertValid(input: unknown): void {
  const result = validate(input);
  if (!result.valid) throw new Error(formatIssues(result.errors));
}

export function formatIssues(issues: ValidationIssue[]): string {
  return issues.map((issue) => `- ${issue.path || "(root)"}: ${issue.message}`).join("\n");
}

// ─── a small JSON-schema subset validator ────────────────────────────────────

function check(schema: JsonSchema, value: unknown, path: string, errors: ValidationIssue[]): void {
  if (typeof schema.$ref === "string") {
    const name = schema.$ref.replace("#/$defs/", "");
    const defs = (presentSchema.$defs ?? {}) as Record<string, JsonSchema>;
    const target = defs[name];
    if (target) check(target, value, path, errors);
    return;
  }

  if (Array.isArray(schema.anyOf)) {
    const branches = schema.anyOf as JsonSchema[];
    for (const branch of branches) {
      const branchErrors: ValidationIssue[] = [];
      check(branch, value, path, branchErrors);
      if (branchErrors.length === 0) return;
    }
    errors.push({ path, message: "does not match any allowed shape" });
    return;
  }

  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? (schema.type as string[]) : [schema.type as string];
    if (!types.some((type) => matchesType(value, type))) {
      errors.push({ path, message: `must be ${types.join(" or ")}` });
      return;
    }
  }

  if (Array.isArray(schema.enum) && !(schema.enum as unknown[]).includes(value)) {
    errors.push({ path, message: `must be one of ${(schema.enum as unknown[]).map((v) => JSON.stringify(v)).join(", ")}` });
    return;
  }

  if (schema.const !== undefined && value !== schema.const) {
    errors.push({ path, message: `must be ${JSON.stringify(schema.const)}` });
    return;
  }

  if (isRecord(value)) {
    const properties = (schema.properties ?? {}) as Record<string, JsonSchema>;
    for (const key of (schema.required ?? []) as string[]) {
      if (value[key] === undefined || value[key] === null) errors.push({ path: join(path, key), message: "is required" });
    }
    for (const [key, child] of Object.entries(value)) {
      if (child === undefined || child === null) continue;
      if (properties[key]) check(properties[key], child, join(path, key), errors);
      else if (isRecord(schema.additionalProperties)) check(schema.additionalProperties as JsonSchema, child, join(path, key), errors);
    }
  }

  if (Array.isArray(value) && isRecord(schema.items)) {
    value.forEach((item, i) => check(schema.items as JsonSchema, item, `${path}[${i}]`, errors));
  }
}

function matchesType(value: unknown, type: string): boolean {
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

function join(path: string, key: string): string {
  return path ? `${path}.${key}` : key;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
