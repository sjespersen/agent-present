/**
 * Present spec 0.1 — TypeScript types.
 *
 * The Present spec describes the *meaning* of a presentation (a verdict, a comparison,
 * a flow, a risk) and leaves layout to renderers. Nothing in here is a width,
 * a colour or a border style.
 */

export const PRESENT_VERSION = "0.1" as const;

/** Semantic status. Renderers map these to colour *and* to a glyph, never colour alone. */
export type Status = "good" | "warning" | "critical" | "info" | "neutral";

/** Information priority, used by renderers to plan the Glance / Scan / Explore depths. */
export type Priority = "primary" | "secondary" | "detail";

export type Emphasis = "strong" | "normal" | "subtle";
export type Density = "compact" | "normal" | "comfortable";
export type Level = "low" | "medium" | "high";

export type Intent =
  | "decision"
  | "assessment"
  | "explanation"
  | "comparison"
  | "diagnosis"
  | "plan"
  | "status"
  | "progress"
  | "research"
  | "summary";

export interface Source {
  label: string;
  /** File path, URL, command, ticket… */
  ref?: string;
  /** e.g. a line range "120-148" */
  location?: string;
}

export interface EvidenceItem {
  label: string;
  value?: string;
  /** false = contradicting evidence */
  supports?: boolean;
  source?: string;
}

/** Fields shared by every block. All optional. */
export interface BlockBase {
  /** Stable id so actions can target the block. */
  id?: string;
  /** Short section label, e.g. "RISK MAP". */
  title?: string;
  priority?: Priority;
  emphasis?: Emphasis;
  density?: Density;
  /** Long-form Markdown, only shown when the user explores. */
  detail?: string;
  sources?: Source[];
}

// ─── primitives ──────────────────────────────────────────────────────────────

/** The answer. Conclusions, diagnoses, recommendations, decisions. */
export interface VerdictBlock extends BlockBase {
  type: "verdict";
  text: string;
  status?: Status;
  /** One short supporting line, e.g. "2 blockers". */
  detail?: string;
  /** Recommended next step, e.g. "Fix the migration first". */
  next?: string;
  /** A command that performs the next step, e.g. "pnpm db:migrate". */
  command?: string;
}

/** A number made visually meaningful. */
export interface MetricBlock extends BlockBase {
  type: "metric";
  label: string;
  value: number | string;
  unit?: string;
  /** Upper bound of the scale (e.g. 128 for "93k / 128k"). Percentages default to 100. */
  max?: number;
  min?: number;
  /** Desired value. */
  target?: number;
  /** Recent values, oldest first, rendered as a sparkline. */
  trend?: number[];
  /** Change vs. previous, e.g. -12 or "+3.1%". */
  delta?: number | string;
  status?: Status;
  /** Small annotation, e.g. "93k / 128k". */
  caption?: string;
  /** Whether bigger is better (affects delta colouring). Default true. */
  higherIsBetter?: boolean;
}

export interface MetricItem {
  label: string;
  value: number | string;
  unit?: string;
  status?: Status;
  delta?: number | string;
  caption?: string;
  max?: number;
}

/** A compact group of related measures. */
export interface MetricsBlock extends BlockBase {
  type: "metrics";
  items: MetricItem[];
}

export interface ComparisonOption {
  id?: string;
  label: string;
  /** Short "best for" summary. */
  summary?: string;
}

export type ComparisonValue = number | string | { value?: number; label?: string; note?: string };

export interface ComparisonDimension {
  label: string;
  /** One value per option, in option order — or keyed by option id. */
  values: ComparisonValue[] | Record<string, ComparisonValue>;
  /** Which direction wins. Default "higher". */
  better?: "higher" | "lower";
  unit?: string;
}

/** Explicit trade-offs between alternatives. */
export interface ComparisonBlock extends BlockBase {
  type: "comparison";
  options: ComparisonOption[];
  dimensions: ComparisonDimension[];
  /** id or label of the recommended option. */
  winner?: string;
  /** One line explaining the pick. */
  rationale?: string;
}

export type NodeKind = "step" | "service" | "store" | "actor" | "external" | "decision" | "outcome";

export interface GraphNode {
  id: string;
  label: string;
  kind?: NodeKind;
  status?: Status;
  /** Small annotation below the node. */
  note?: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  label?: string;
  /** "critical" draws a broken link (╳). */
  status?: Status;
}

/** Processes, pipelines and causal chains. */
export interface FlowBlock extends BlockBase {
  type: "flow";
  nodes: GraphNode[];
  edges?: GraphEdge[];
}

export interface Boundary {
  label: string;
  /** e.g. "untrusted", "signed", "never reaches browser" */
  note: string;
  status?: Status;
}

/** Systems and dependencies. */
export interface ArchitectureBlock extends BlockBase {
  type: "architecture";
  nodes: GraphNode[];
  edges?: GraphEdge[];
  /** Trust or ownership boundaries, rendered as a legend. */
  boundaries?: Boundary[];
  boundaryTitle?: string;
}

export interface TimelineEvent {
  at: string;
  label: string;
  status?: Status;
  note?: string;
}

/** Chronology, laid out spatially. */
export interface TimelineBlock extends BlockBase {
  type: "timeline";
  events: TimelineEvent[];
}

export interface Series {
  name?: string;
  values: number[];
}

/** A sequence and how it changes. */
export interface TrendBlock extends BlockBase {
  type: "trend";
  label?: string;
  series: Series[];
  /** Labels for the x axis (sparse labels are fine). */
  xLabels?: string[];
  unit?: string;
  status?: Status;
  /** Optional threshold line. */
  threshold?: number;
  annotation?: string;
}

export interface DistributionItem {
  label: string;
  value: number;
  status?: Status;
}

/** Comparing quantities. `whole: true` means the items are parts of one whole. */
export interface DistributionBlock extends BlockBase {
  type: "distribution";
  items: DistributionItem[];
  unit?: string;
  whole?: boolean;
}

export interface RiskItem {
  label: string;
  impact: Level;
  likelihood: Level;
  status?: Status;
  note?: string;
}

/** Importance × probability. */
export interface RiskBlock extends BlockBase {
  type: "risk";
  items: RiskItem[];
}

export interface HierarchyNode {
  label: string;
  note?: string;
  status?: Status;
  children?: HierarchyNode[];
}

export interface HierarchyBlock extends BlockBase {
  type: "hierarchy";
  root: HierarchyNode;
}

export type CheckState = "done" | "failed" | "pending" | "skipped" | "warning" | "running";

export interface ChecklistItem {
  label: string;
  state: CheckState;
  note?: string;
}

export interface ChecklistBlock extends BlockBase {
  type: "checklist";
  items: ChecklistItem[];
}

/** A claim and the material that supports it. */
export interface EvidenceBlock extends BlockBase {
  type: "evidence";
  claim: string;
  confidence?: Level;
  items: EvidenceItem[];
}

export interface FileChange {
  path: string;
  added?: number;
  removed?: number;
  risk?: Level;
  note?: string;
}

/** Code / repository change impact. */
export interface ChangeBlock extends BlockBase {
  type: "change";
  files: FileChange[];
}

export interface ProgressItem {
  label: string;
  value?: number;
  total?: number;
  state?: CheckState;
}

/** Work in progress. */
export interface ProgressBlock extends BlockBase {
  type: "progress";
  items: ProgressItem[];
  /** The most important signal so far. */
  signal?: { label: string; value?: string; status?: Status };
}

/** Prose, intentionally constrained (~240 characters before collapsing). */
export interface TextBlock extends BlockBase {
  type: "text";
  text: string;
}

export type Block =
  | VerdictBlock
  | MetricBlock
  | MetricsBlock
  | ComparisonBlock
  | FlowBlock
  | ArchitectureBlock
  | TimelineBlock
  | TrendBlock
  | DistributionBlock
  | RiskBlock
  | HierarchyBlock
  | ChecklistBlock
  | EvidenceBlock
  | ChangeBlock
  | ProgressBlock
  | TextBlock;

export type BlockType = Block["type"];

export const BLOCK_TYPES: readonly BlockType[] = [
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
  "text",
] as const;

/** A block type this renderer does not know. Kept so it can degrade gracefully. */
export interface UnknownBlock extends BlockBase {
  type: "unknown";
  originalType: string;
  /** Best-effort textual rendering of the original block. */
  fallback: string[];
}

export type ActionIntent = "agent" | "expand" | "copy" | "open";

export interface Action {
  id: string;
  label: string;
  intent: ActionIntent;
  /** For intent "agent": the prompt to send. */
  prompt?: string;
  /** For intent "expand": the block id to reveal. */
  target?: string;
  /** For intent "copy" / "open": the text or URL. */
  value?: string;
}

export interface Takeaway {
  text: string;
  status?: Status;
  /** One supporting line, e.g. "2 blockers remain". */
  detail?: string;
  /** Headline number, rendered oversized, e.g. 87. */
  value?: number | string;
  unit?: string;
}

export interface DetailSection {
  title: string;
  markdown: string;
}

export interface PresentDocument {
  present: string;
  title?: string;
  /** e.g. "v2.8.0" */
  subtitle?: string;
  intent?: Intent;
  takeaway?: Takeaway;
  blocks: Block[];
  actions?: Action[];
  detail?: { markdown?: string; sections?: DetailSection[] };
  evidence?: EvidenceItem[];
  sources?: Source[];
  speech?: { summary: string };
}
