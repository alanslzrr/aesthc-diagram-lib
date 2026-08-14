// src/theme.ts
var CARD_H_FULL = 88;
var CARD_H_SLIM = 64;
var LANE_R = 6;
var DIMMED_OPACITY = 0.22;
var LABEL_CHAR_WIDTH = 6.25;
var LABEL_HORIZONTAL_PADDING = 18;

// src/layout.ts
var edgeId = (edge) => `${edge.from}::${edge.to}`;
var labelPillWidth = (label) => label.length * LABEL_CHAR_WIDTH + LABEL_HORIZONTAL_PADDING;
var nodeHeight = (node) => node.sublabel ? CARD_H_FULL : CARD_H_SLIM;
var isMutedNode = (node) => node.weight === "muted";
var connectY = (node, side) => {
  if (isMutedNode(node)) return side === "top" ? node.y : node.y + node.h;
  if (side === "top") return node.y;
  if (side === "bottom") return node.y + node.h;
  return node.cy;
};
function roundedPolyline(pts, r = LANE_R) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i += 1) {
    const [px, py] = pts[i - 1];
    const [cx, cy] = pts[i];
    const [nx, ny] = pts[i + 1];
    const inLen = Math.hypot(cx - px, cy - py);
    const outLen = Math.hypot(nx - cx, ny - cy);
    if (inLen === 0 || outLen === 0) continue;
    const rr = Math.min(r, inLen / 2, outLen / 2);
    const t1x = cx + (px - cx) / inLen * rr;
    const t1y = cy + (py - cy) / inLen * rr;
    const t2x = cx + (nx - cx) / outLen * rr;
    const t2y = cy + (ny - cy) / outLen * rr;
    d += ` L ${t1x} ${t1y} Q ${cx} ${cy}, ${t2x} ${t2y}`;
  }
  const last = pts[pts.length - 1];
  d += ` L ${last[0]} ${last[1]}`;
  return d;
}
function buildAdjacency(edges) {
  const out = /* @__PURE__ */ new Map();
  const incoming = /* @__PURE__ */ new Map();
  for (const edge of edges) {
    const forward = out.get(edge.from);
    if (forward) forward.push(edge.to);
    else out.set(edge.from, [edge.to]);
    const backward = incoming.get(edge.to);
    if (backward) backward.push(edge.from);
    else incoming.set(edge.to, [edge.from]);
  }
  return { out, in: incoming };
}
function diagramEdges(spec) {
  if (!("type" in spec)) return spec.edges;
  switch (spec.type) {
    case "sequence":
      return spec.messages;
    case "state-machine":
      return spec.transitions;
    case "er":
      return spec.relations;
    case "timeline":
      return [];
    case "band":
    case "flowchart":
    case "swimlane":
      return spec.edges;
    default:
      return spec.edges;
  }
}
function connectedIds(nodeId, adjacency) {
  const nodes = /* @__PURE__ */ new Set([nodeId]);
  const edges = /* @__PURE__ */ new Set();
  const walk = (direction) => {
    const queue = [nodeId];
    const seen = /* @__PURE__ */ new Set([nodeId]);
    while (queue.length > 0) {
      const current = queue.shift();
      const neighbours = adjacency[direction].get(current) ?? [];
      for (const next of neighbours) {
        edges.add(direction === "out" ? `${current}::${next}` : `${next}::${current}`);
        nodes.add(next);
        if (seen.has(next)) continue;
        seen.add(next);
        queue.push(next);
      }
    }
  };
  walk("out");
  walk("in");
  return { nodes, edges };
}
function nodePorts(node, edges, continuations = []) {
  const pointForSide = (side) => {
    const y = connectY(node, side);
    if (side === "left") return { side, x: node.x, y };
    if (side === "right") return { side, x: node.x + node.w, y };
    return { side, x: node.cx, y };
  };
  const hits = /* @__PURE__ */ new Map();
  const record = (point, variant) => {
    const key = `${point.x}:${point.y}`;
    const existing = hits.get(key);
    if (!existing || existing.variant === "branch" && variant === "main") {
      hits.set(key, { ...point, variant });
    }
  };
  for (const edge of edges) {
    if (edge.from === node.id) record(pointForSide(edge.fromSide), edge.variant);
    if (edge.to === node.id) record(pointForSide(edge.toSide), edge.variant);
  }
  for (const continuation of continuations) {
    if (continuation.from !== node.id) continue;
    record(
      {
        side: continuation.side,
        x: continuation.sourceX,
        y: continuation.sourceY
      },
      continuation.variant
    );
  }
  return [...hits.values()];
}
export {
  DIMMED_OPACITY,
  buildAdjacency,
  connectY,
  connectedIds,
  diagramEdges,
  edgeId,
  isMutedNode,
  labelPillWidth,
  nodeHeight,
  nodePorts,
  roundedPolyline
};
