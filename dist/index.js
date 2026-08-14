// src/theme.ts
var CARD_W = 240;
var CARD_H_FULL = 88;
var CARD_H_SLIM = 64;
var CARD_R = 10;
var CARD_TEXT_X = 50;
var CARD_PADDING_RIGHT = 14;
var BAND_X0 = 40;
var BAND_PITCH = 338;
var SLOT_PITCH = 132;
var CONTENT_TOP = 56;
var CANVAS_BOTTOM_PAD = 56;
var CANVAS_W = 1680;
var CANVAS_MIN_WIDTH = 1360;
var NODE_ICON_SIZE = 22;
var EDGE_STROKE_WIDTH = 0.9;
var SIDE_LANE_GAP = 10;
var LANE_R = 6;
var DIMMED_OPACITY = 0.22;
var CONTINUATION_LENGTH = 44;
var CONTINUATION_PORT_INSET = 16;
var CONTINUATION_LABEL_OFFSET = 16;
var CONTINUATION_LABEL_GAP = 8;
var LABEL_CHAR_WIDTH = 6.25;
var LABEL_HORIZONTAL_PADDING = 18;
var LABEL_EDGE_GAP = 8;
var PILL_H = 20;
var PILL_R = 10;
var DECISION_PILL_H = 24;
var DECISION_PILL_R = 12;
var FLOW_GAP_X = 96;
var FLOW_GAP_Y = 72;
var TIMELINE_EVENT_GAP = 180;
var TIMELINE_ALT_OFFSET = 96;
var DOT_R = 6;
var LIFELINE_TOP = 48;
var MESSAGE_PITCH = 56;
var SWIMLANE_HEADER_W = 140;
var SWIMLANE_PAD = 24;
var SWIMLANE_ROW_PAD = 64;

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

// src/registry.ts
var registry = /* @__PURE__ */ new Map();
function registerDiagram(key, registration) {
  const visuals = registration.visuals ?? {};
  registry.set(key, { diagram: registration.diagram, visuals });
}
function getDiagramEntry(key) {
  return registry.get(key);
}
function hasDiagram(key) {
  return registry.has(key);
}
function getDiagram(key, locale) {
  const entry = registry.get(key);
  if (!entry) throw new Error(`Unknown diagram key: ${key}`);
  return entry.diagram[locale.startsWith("es") ? "es" : "en"];
}
function getDiagramVisuals(key) {
  return registry.get(key)?.visuals ?? {};
}
function getDiagramKeys() {
  return [...registry.keys()];
}
function registerDiagrams(entries) {
  for (const [key, registration] of Object.entries(entries)) {
    registerDiagram(key, registration);
  }
}
export {
  BAND_PITCH,
  BAND_X0,
  CANVAS_BOTTOM_PAD,
  CANVAS_MIN_WIDTH,
  CANVAS_W,
  CARD_H_FULL,
  CARD_H_SLIM,
  CARD_PADDING_RIGHT,
  CARD_R,
  CARD_TEXT_X,
  CARD_W,
  CONTENT_TOP,
  CONTINUATION_LABEL_GAP,
  CONTINUATION_LABEL_OFFSET,
  CONTINUATION_LENGTH,
  CONTINUATION_PORT_INSET,
  DECISION_PILL_H,
  DECISION_PILL_R,
  DIMMED_OPACITY,
  DOT_R,
  EDGE_STROKE_WIDTH,
  FLOW_GAP_X,
  FLOW_GAP_Y,
  LABEL_CHAR_WIDTH,
  LABEL_EDGE_GAP,
  LABEL_HORIZONTAL_PADDING,
  LANE_R,
  LIFELINE_TOP,
  MESSAGE_PITCH,
  NODE_ICON_SIZE,
  PILL_H,
  PILL_R,
  SIDE_LANE_GAP,
  SLOT_PITCH,
  SWIMLANE_HEADER_W,
  SWIMLANE_PAD,
  SWIMLANE_ROW_PAD,
  TIMELINE_ALT_OFFSET,
  TIMELINE_EVENT_GAP,
  buildAdjacency,
  connectY,
  connectedIds,
  diagramEdges,
  edgeId,
  getDiagram,
  getDiagramEntry,
  getDiagramKeys,
  getDiagramVisuals,
  hasDiagram,
  isMutedNode,
  labelPillWidth,
  nodeHeight,
  nodePorts,
  registerDiagram,
  registerDiagrams,
  roundedPolyline
};
