import type { GraphEdge, GraphNode } from "@agent-present/core";
import { Canvas, DOWN, UP } from "./canvas.js";
import type { Glyphs } from "./glyphs.js";
import { statusRole, type Role, type Style } from "./style.js";
import { truncate, visibleWidth } from "./text.js";

export interface GraphOptions {
  width: number;
  glyphs: Glyphs;
  style: Style;
  /** Prefer a single inline line (no boxes). */
  compact?: boolean;
}

interface LNode {
  id: string;
  label: string;
  node?: GraphNode;
  dummy: boolean;
  boxed: boolean;
  layer: number;
  order: number;
  /** box (or text) width */
  w: number;
  h: number;
  /** extents of the footprint around the centre column */
  left: number;
  right: number;
  cx: number;
  y: number;
  noteBelow?: string;
  noteRight?: string;
}

interface Segment {
  from: LNode;
  to: LNode;
  edge: GraphEdge;
  /** last segment of a (possibly dummy-split) edge carries the arrow */
  last: boolean;
  first: boolean;
}

const MIN_GAP = 3;

/**
 * Renders a directed graph with box-drawing characters.
 *
 * Simple chains go left-to-right when they fit; everything else uses a layered
 * (Sugiyama-style) top-down layout with orthogonal bus routing. When even that
 * does not fit, it degrades to an indented edge list — never a broken diagram.
 */
export function renderGraph(nodes: GraphNode[], edges: GraphEdge[], options: GraphOptions): string[] {
  const { width, glyphs: g, style } = options;
  if (!nodes.length) return [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const valid = edges.filter((e) => byId.has(e.from) && byId.has(e.to) && e.from !== e.to);
  const { forward, back } = splitBackEdges(nodes, valid);

  const chain = asChain(nodes, forward);
  let lines: string[] | undefined;
  if (chain && back.length === 0) {
    if (!options.compact) lines = renderChainBoxes(chain, forward, options);
    if (!lines) lines = renderChainInline(chain, forward, options);
  }
  if (!lines && !(options.compact && chain)) lines = renderLayered(nodes, forward, options);
  if (!lines) lines = renderEdgeList(nodes, forward, options);

  if (back.length) {
    for (const e of back) {
      const from = byId.get(e.from)!.label;
      const to = byId.get(e.to)!.label;
      const loop = g.unicode ? "↺" : "<-";
      lines.push(truncate(style.fg("muted", `${loop} ${from} ${g.h}${g.arrowRight} ${to}${e.label ? `  ${e.label}` : ""}`), width));
    }
  }
  return lines;
}

// ─── structure ───────────────────────────────────────────────────────────────

function splitBackEdges(nodes: GraphNode[], edges: GraphEdge[]): { forward: GraphEdge[]; back: GraphEdge[] } {
  const out = new Map<string, GraphEdge[]>();
  for (const e of edges) out.set(e.from, [...(out.get(e.from) ?? []), e]);
  const state = new Map<string, 1 | 2>();
  const back = new Set<GraphEdge>();
  const visit = (id: string) => {
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

function asChain(nodes: GraphNode[], edges: GraphEdge[]): GraphNode[] | undefined {
  if (nodes.length < 2 || edges.length !== nodes.length - 1) return undefined;
  const inDeg = new Map<string, number>();
  const next = new Map<string, string>();
  for (const e of edges) {
    if (next.has(e.from)) return undefined;
    next.set(e.from, e.to);
    inDeg.set(e.to, (inDeg.get(e.to) ?? 0) + 1);
  }
  if ([...inDeg.values()].some((d) => d > 1)) return undefined;
  const start = nodes.find((n) => !inDeg.has(n.id));
  if (!start) return undefined;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const order: GraphNode[] = [];
  let cur: string | undefined = start.id;
  while (cur && order.length <= nodes.length) {
    order.push(byId.get(cur)!);
    cur = next.get(cur);
  }
  return order.length === nodes.length ? order : undefined;
}

function isBoxed(node: GraphNode): boolean {
  return node.kind !== "actor" && node.kind !== "outcome";
}

function nodeLabel(node: GraphNode, g: Glyphs, max: number): string {
  const mark = node.status === "critical" || node.status === "warning" ? `${g.status[node.status]} ` : "";
  return truncate(mark + node.label, max, g.ellipsis);
}

function borderRole(node: GraphNode | undefined): Role {
  if (!node?.status || node.status === "neutral") return "muted";
  return statusRole(node.status);
}

function labelRole(node: GraphNode | undefined): Role {
  if (node?.status === "critical") return "critical";
  if (node?.status === "warning") return "warning";
  if (node?.kind === "actor") return "muted";
  return "strong";
}

function edgeRole(edge: GraphEdge): Role {
  if (edge.status === "critical") return "critical";
  if (edge.status === "warning") return "warning";
  return "dim";
}

// ─── left-to-right chain ─────────────────────────────────────────────────────

function chainGapWidth(edge: GraphEdge | undefined): number {
  return Math.max(edge?.status === "critical" ? 9 : 7, (edge?.label ? visibleWidth(edge.label) : 0) + 4);
}

function renderChainBoxes(chain: GraphNode[], edges: GraphEdge[], options: GraphOptions): string[] | undefined {
  const { width, glyphs: g, style } = options;
  const edgeTo = new Map(edges.map((e) => [e.to, e]));
  const labelMax = 28;
  const labels = chain.map((n) => nodeLabel(n, g, labelMax));
  const widths = chain.map((n, i) => (isBoxed(n) ? visibleWidth(labels[i]) + 4 : visibleWidth(labels[i])));
  const gaps = chain.slice(1).map((n) => chainGapWidth(edgeTo.get(n.id)));
  // notes can overhang their box; keep a little extra room
  const noteOverhang = chain.map((n, i) => Math.max(0, ((n.note ? visibleWidth(n.note) : 0) - widths[i]) / 2));
  const total = widths.reduce((a, b) => a + b, 0) + gaps.reduce((a, b) => a + b, 0);
  const pad = Math.ceil(Math.max(noteOverhang[0] ?? 0, noteOverhang[chain.length - 1] ?? 0));
  if (total + pad * 2 > width || chain.length > 6) return undefined;

  const hasNotes = chain.some((n) => n.note);
  const hasLabels = chain.some((n) => edgeTo.get(n.id)?.label);
  const top = hasLabels ? 1 : 0;
  const canvas = new Canvas(width, g.unicode);
  let x = pad;
  chain.forEach((node, i) => {
    if (i > 0) {
      const edge = edgeTo.get(node.id)!;
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

function renderChainInline(chain: GraphNode[], edges: GraphEdge[], options: GraphOptions): string[] | undefined {
  const { width, glyphs: g, style } = options;
  const edgeTo = new Map(edges.map((e) => [e.to, e]));
  const parts: string[] = [];
  let plain = "";
  chain.forEach((node, i) => {
    if (i > 0) {
      const edge = edgeTo.get(node.id)!;
      const role = edgeRole(edge);
      const conn =
        edge.status === "critical"
          ? `${g.h}${g.h}${g.broken}${g.h}${g.h}${g.arrowRight}`
          : `${g.h}${g.h}${g.arrowRight}`;
      const label = edge.label ? ` ${edge.label} ` : " ";
      parts.push(style.fg("muted", label.length > 1 ? label : " ") + style.fg(role, conn) + " ");
      plain += label + conn + " ";
    }
    const text = nodeLabel(node, g, 40);
    parts.push(style.bold(style.fg(labelRole(node), text)));
    plain += text;
  });
  const lines: string[] = [];
  if (visibleWidth(plain) <= width) lines.push(parts.join(""));
  else return undefined;
  const notes = chain.filter((n) => n.note).map((n) => `${n.label}: ${n.note}`);
  for (const note of notes) lines.push(truncate(style.fg("muted", `  ${note}`), width));
  return lines;
}

// ─── layered layout ──────────────────────────────────────────────────────────

function renderLayered(nodes: GraphNode[], edges: GraphEdge[], options: GraphOptions): string[] | undefined {
  const { width, glyphs: g, style } = options;
  const labelMax = Math.max(8, Math.min(30, Math.floor(width / 3)));

  // 1. layers by longest path
  const preds = new Map<string, string[]>();
  const succs = new Map<string, string[]>();
  for (const n of nodes) {
    preds.set(n.id, []);
    succs.set(n.id, []);
  }
  for (const e of edges) {
    preds.get(e.to)!.push(e.from);
    succs.get(e.from)!.push(e.to);
  }
  const layerOf = new Map<string, number>();
  const visiting = new Set<string>();
  const depth = (id: string): number => {
    if (layerOf.has(id)) return layerOf.get(id)!;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    const p = preds.get(id)!;
    const d = p.length ? Math.max(...p.map(depth)) + 1 : 0;
    layerOf.set(id, d);
    return d;
  };
  nodes.forEach((n) => depth(n.id));

  // 2. layout nodes, with dummies for long edges
  const lnodes = new Map<string, LNode>();
  nodes.forEach((n, i) => {
    const label = nodeLabel(n, g, labelMax);
    const boxed = isBoxed(n);
    const w = boxed ? oddUp(visibleWidth(label) + 4) : visibleWidth(label);
    const ln: LNode = {
      id: n.id,
      label,
      node: n,
      dummy: false,
      boxed,
      layer: layerOf.get(n.id)!,
      order: i,
      w,
      h: boxed ? 3 : 1,
      left: 0,
      right: 0,
      cx: 0,
      y: 0,
    };
    if (n.note) {
      if (succs.get(n.id)!.length) ln.noteRight = truncate(n.note, labelMax, g.ellipsis);
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

  const segments: Segment[] = [];
  let dummyCount = 0;
  for (const e of edges) {
    const from = lnodes.get(e.from)!;
    const to = lnodes.get(e.to)!;
    let prev = from;
    for (let l = from.layer + 1; l < to.layer; l++) {
      const d: LNode = {
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
        y: 0,
      };
      lnodes.set(d.id, d);
      segments.push({ from: prev, to: d, edge: e, last: false, first: prev === from });
      prev = d;
    }
    segments.push({ from: prev, to, edge: e, last: true, first: prev === from });
  }

  const layerCount = Math.max(...[...lnodes.values()].map((n) => n.layer)) + 1;
  const layers: LNode[][] = Array.from({ length: layerCount }, () => []);
  for (const n of lnodes.values()) layers[n.layer].push(n);
  layers.forEach((layer) => layer.sort((a, b) => a.order - b.order));

  // 3. crossing reduction: barycenter sweeps
  const segPreds = new Map<string, LNode[]>();
  const segSuccs = new Map<string, LNode[]>();
  for (const s of segments) {
    segPreds.set(s.to.id, [...(segPreds.get(s.to.id) ?? []), s.from]);
    segSuccs.set(s.from.id, [...(segSuccs.get(s.from.id) ?? []), s.to]);
  }
  const position = () => {
    const pos = new Map<string, number>();
    layers.forEach((layer) => layer.forEach((n, i) => pos.set(n.id, i)));
    return pos;
  };
  for (let iter = 0; iter < 4; iter++) {
    for (const [range, neighbours] of [
      [Array.from({ length: layerCount - 1 }, (_, i) => i + 1), segPreds],
      [Array.from({ length: layerCount - 1 }, (_, i) => layerCount - 2 - i), segSuccs],
    ] as const) {
      for (const l of range) {
        const pos = position();
        const bary = new Map<string, number>();
        layers[l].forEach((n, i) => {
          const ns = neighbours.get(n.id) ?? [];
          bary.set(n.id, ns.length ? ns.reduce((a, m) => a + pos.get(m.id)!, 0) / ns.length : i);
        });
        layers[l].sort((a, b) => bary.get(a.id)! - bary.get(b.id)! || a.order - b.order);
      }
    }
  }

  // 4. horizontal placement: pack, then iteratively pull towards neighbours
  const spacing = (a: LNode, b: LNode) => a.right + b.left + 1 + (a.dummy || b.dummy ? 2 : MIN_GAP);
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
  // final down pass so children sit under parents
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
  if (span > width) return undefined;
  const shift = -minX + Math.floor((width - span) / 2);
  for (const n of all) n.cx += shift;

  // 5. vertical layout + routing
  const layerHeight = layers.map((layer) => {
    const real = layer.filter((n) => !n.dummy);
    if (!real.length) return 1;
    return Math.max(...real.map((n) => n.h + (n.noteBelow ? 1 : 0)));
  });

  const canvas = new Canvas(width, g.unicode);
  let y = 0;
  const layerTop: number[] = [];
  const gapPlans: GapPlan[] = [];
  for (let l = 0; l < layerCount; l++) {
    layerTop[l] = y;
    for (const n of layers[l]) n.y = y;
    y += layerHeight[l];
    if (l < layerCount - 1) {
      const plan = planGap(segments.filter((s) => s.from.layer === l));
      plan.top = y;
      gapPlans.push(plan);
      y += plan.height;
    }
  }

  // draw nodes
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

  for (const plan of gapPlans) drawGap(canvas, plan, g);
  return canvas.toLines(style);
}

function dummyRole(n: LNode, segments: Segment[]): Role {
  const seg = segments.find((s) => s.to === n || s.from === n);
  return seg ? edgeRole(seg.edge) : "dim";
}

function oddUp(n: number): number {
  return n % 2 === 0 ? n + 1 : n;
}

/**
 * Places nodes in order as close to `desired` centres as possible while
 * respecting minimum spacing (isotonic regression over clusters).
 */
function placeLayer(layer: LNode[], desired: number[], spacing: (a: LNode, b: LNode) => number): void {
  if (!layer.length) return;
  // offsets of each node relative to the first node of its cluster
  type Cluster = { start: number; end: number; offsets: number[]; pos: number };
  const clusters: Cluster[] = [];
  for (let i = 0; i < layer.length; i++) {
    let cluster: Cluster = { start: i, end: i, offsets: [0], pos: desired[i] };
    while (clusters.length) {
      const prev = clusters[clusters.length - 1];
      const prevEndPos = prev.pos + prev.offsets[prev.offsets.length - 1];
      const minStart = prevEndPos + spacing(layer[prev.end], layer[cluster.start]);
      if (cluster.pos >= minStart) break;
      // merge
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
  // rounding can collapse spacing; repair left-to-right
  for (let k = 1; k < layer.length; k++) {
    const min = layer[k - 1].cx + spacing(layer[k - 1], layer[k]);
    if (layer[k].cx < min) layer[k].cx = min;
  }
}

// ─── gap routing ─────────────────────────────────────────────────────────────

interface GapPlan {
  top: number;
  height: number;
  straight: Segment[];
  components: { segments: Segment[]; min: number; max: number; row: number }[];
  labelRow?: number;
  preArrowRow?: number;
  arrowRow: number;
  busStart: number;
}

function planGap(segments: Segment[]): GapPlan {
  const straight: Segment[] = [];
  const rest: Segment[] = [];
  for (const s of segments) {
    const onlyIn = segments.filter((o) => o.to === s.to).length === 1;
    const onlyOut = segments.filter((o) => o.from === s.from).length === 1;
    if (s.from.cx === s.to.cx && onlyIn && onlyOut) straight.push(s);
    else rest.push(s);
  }

  // connected components by shared endpoint
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    while (parent.get(x) !== x) x = parent.get(x)!;
    return x;
  };
  for (const s of rest) {
    for (const id of [`s:${s.from.id}`, `t:${s.to.id}`]) if (!parent.has(id)) parent.set(id, id);
    parent.set(find(`s:${s.from.id}`), find(`t:${s.to.id}`));
  }
  // targets fed by several sources and sources feeding several targets share a bus
  const groups = new Map<string, Segment[]>();
  for (const s of rest) {
    const root = find(`s:${s.from.id}`);
    groups.set(root, [...(groups.get(root) ?? []), s]);
  }
  const components = [...groups.values()].map((segs) => {
    const xs = segs.flatMap((s) => [s.from.cx, s.to.cx]);
    return { segments: segs, min: Math.min(...xs), max: Math.max(...xs), row: 0 };
  });
  // interval colouring for bus rows
  components.sort((a, b) => a.min - b.min);
  const rowEnds: number[] = [];
  for (const c of components) {
    let row = rowEnds.findIndex((end) => end < c.min - 1);
    if (row === -1) {
      row = rowEnds.length;
      rowEnds.push(c.max);
    } else rowEnds[row] = c.max;
    c.row = row;
  }

  const straightLabels = straight.some((s) => (s.first && s.edge.label) || (s.last && s.edge.status === "critical"));
  const busLabels = rest.some((s) => s.last && (s.edge.label || s.edge.status === "critical"));
  let r = 1; // row 0 is the stub row under the sources
  let labelRow: number | undefined;
  if (straightLabels) {
    labelRow = r;
    r += 2;
  }
  const busStart = r;
  r += rowEnds.length;
  let preArrowRow: number | undefined;
  if (busLabels) {
    preArrowRow = r;
    r += 1;
  }
  const arrowRow = r;
  return { top: 0, height: arrowRow + 1, straight, components, labelRow, preArrowRow, arrowRow, busStart };
}

function drawGap(canvas: Canvas, plan: GapPlan, g: Glyphs): void {
  const top = plan.top;
  const arrowY = top + plan.arrowRow;

  for (const s of plan.straight) {
    const role = edgeRole(s.edge);
    const x = s.from.cx;
    canvas.vline(x, top, arrowY - 1, role);
    if (plan.labelRow !== undefined) {
      const ly = top + plan.labelRow;
      const broken = s.last && s.edge.status === "critical";
      const label = s.first ? s.edge.label : undefined;
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

  for (const c of plan.components) {
    const busY = top + plan.busStart + c.row;
    const role: Role = c.segments.some((s) => s.edge.status === "critical") ? "critical" : "dim";
    canvas.hline(c.min, c.max, busY, role);
    const sources = new Map<number, Segment>();
    const targets = new Map<number, Segment>();
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
      if (plan.preArrowRow !== undefined && s.last) {
        const py = top + plan.preArrowRow;
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

// ─── fallback ────────────────────────────────────────────────────────────────

function renderEdgeList(nodes: GraphNode[], edges: GraphEdge[], options: GraphOptions): string[] {
  const { width, glyphs: g, style } = options;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const lines: string[] = [];
  const shown = new Set<string>();
  for (const n of nodes) {
    const out = edges.filter((e) => e.from === n.id);
    const isTarget = edges.some((e) => e.to === n.id);
    if (!out.length && isTarget) continue;
    lines.push(truncate(style.bold(style.fg(labelRole(n), nodeLabel(n, g, width))), width));
    shown.add(n.id);
    out.forEach((e, i) => {
      const target = byId.get(e.to)!;
      const branch = i === out.length - 1 ? g.tree.last.trimEnd() : g.tree.branch.trimEnd();
      const conn = e.status === "critical" ? `${g.broken}${g.arrowRight}` : g.arrowRight;
      const note = target.note ? style.fg("muted", `  ${target.note}`) : "";
      const label = e.label ? style.fg("muted", ` ${e.label}`) : "";
      lines.push(
        truncate(
          ` ${style.fg("dim", branch)}${style.fg(edgeRole(e), conn)} ${style.fg(labelRole(target), nodeLabel(target, g, width))}${label}${note}`,
          width,
        ),
      );
    });
  }
  return lines;
}
