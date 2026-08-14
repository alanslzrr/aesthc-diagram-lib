// src/theme.ts
var CARD_W = 240;
var CARD_H_FULL = 88;
var CARD_H_SLIM = 64;
var BAND_X0 = 40;
var BAND_PITCH = 338;
var SLOT_PITCH = 132;
var CONTENT_TOP = 56;
var CANVAS_BOTTOM_PAD = 56;
var CANVAS_W = 1680;
var SIDE_LANE_GAP = 10;
var LANE_R = 6;
var CONTINUATION_LENGTH = 44;
var CONTINUATION_PORT_INSET = 16;
var CONTINUATION_LABEL_OFFSET = 16;
var CONTINUATION_LABEL_GAP = 8;
var LABEL_CHAR_WIDTH = 6.25;
var LABEL_HORIZONTAL_PADDING = 18;
var LABEL_EDGE_GAP = 8;
var FLOW_GAP_X = 96;
var FLOW_GAP_Y = 72;
var TIMELINE_EVENT_GAP = 180;
var TIMELINE_ALT_OFFSET = 96;
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

// src/layouts/band.ts
function canvasMetrics(diagram) {
  const perBand = diagram.bands.map(
    (_band, index) => diagram.nodes.filter((node) => node.band === index).length
  );
  const maxSlots = Math.max(1, ...perBand);
  const contentHeight = (maxSlots - 1) * SLOT_PITCH + CARD_H_FULL;
  return {
    height: CONTENT_TOP + contentHeight + CANVAS_BOTTOM_PAD,
    midline: CONTENT_TOP + contentHeight / 2
  };
}
function placeBandEdges(diagram, nodes) {
  const nodeById = {};
  for (const node of nodes) nodeById[node.id] = node;
  const edges = [];
  for (const edge of diagram.edges) {
    const from = nodeById[edge.from];
    const to = nodeById[edge.to];
    if (!from || !to) continue;
    const variant = edge.variant ?? "main";
    const labelWidth = edge.label ? labelPillWidth(edge.label) : 0;
    let d;
    let labelX;
    let labelY;
    let fromSide;
    let toSide;
    let startX;
    let startY;
    let endX;
    let endY;
    let routePoints;
    if (from.band === to.band) {
      const adjacent = Math.abs(from.slot - to.slot) === 1;
      if (adjacent) {
        const movingDown = to.cy > from.cy;
        fromSide = movingDown ? "bottom" : "top";
        toSide = movingDown ? "top" : "bottom";
        const ax = from.cx;
        const ay = connectY(from, fromSide);
        const bx = to.cx;
        const by = connectY(to, toSide);
        startX = ax;
        startY = ay;
        endX = bx;
        endY = by;
        const controlY = Math.abs(by - ay) * 0.5;
        d = movingDown ? `M ${ax} ${ay} C ${ax} ${ay + controlY}, ${bx} ${by - controlY}, ${bx} ${by}` : `M ${ax} ${ay} C ${ax} ${ay - controlY}, ${bx} ${by + controlY}, ${bx} ${by}`;
        labelX = (ax + bx) / 2;
        labelY = (ay + by) / 2;
      } else {
        const useRightLane = from.band >= diagram.bands.length / 2;
        fromSide = useRightLane ? "right" : "left";
        toSide = useRightLane ? "right" : "left";
        const ax = useRightLane ? from.x + from.w : from.x;
        const bx = useRightLane ? to.x + to.w : to.x;
        const laneX = useRightLane ? from.x + from.w + SIDE_LANE_GAP : from.x - SIDE_LANE_GAP;
        const fromY = connectY(from, fromSide);
        const toY = connectY(to, toSide);
        startX = ax;
        startY = fromY;
        endX = bx;
        endY = toY;
        d = roundedPolyline(
          [
            [ax, fromY],
            [laneX, fromY],
            [laneX, toY],
            [bx, toY]
          ],
          LANE_R
        );
        labelX = laneX;
        labelY = (fromY + toY) / 2;
      }
    } else if (edge.route) {
      const movingRight = to.x > from.x;
      fromSide = movingRight ? "right" : "left";
      toSide = movingRight ? "left" : "right";
      const ax = movingRight ? from.x + from.w : from.x;
      const ay = connectY(from, fromSide);
      const bx = movingRight ? to.x : to.x + to.w;
      const by = connectY(to, toSide);
      startX = ax;
      startY = ay;
      endX = bx;
      endY = by;
      const minBand = Math.min(from.band, to.band);
      const maxBand = Math.max(from.band, to.band);
      const obstacles = nodes.filter((node) => node.band > minBand && node.band < maxBand).sort((a, b) => movingRight ? a.x - b.x : b.x - a.x);
      if (obstacles.length === 0) {
        const controlX = (ax + bx) / 2;
        d = `M ${ax} ${ay} C ${controlX} ${ay}, ${controlX} ${by}, ${bx} ${by}`;
        labelX = (ax + bx) / 2;
        labelY = (ay + by) / 2;
      } else {
        const clearance = edge.route.clearance ?? SIDE_LANE_GAP;
        const first = obstacles[0];
        const last = obstacles[obstacles.length - 1];
        const entryX = movingRight ? first.x - clearance : first.x + first.w + clearance;
        const exitX = movingRight ? last.x + last.w + clearance : last.x - clearance;
        const laneY = edge.route.lane === "above" ? Math.min(...obstacles.map((node) => node.y)) - clearance : Math.max(...obstacles.map((node) => node.y + node.h)) + clearance;
        routePoints = [
          [ax, ay],
          [entryX, ay],
          [entryX, laneY],
          [exitX, laneY],
          [exitX, by],
          [bx, by]
        ];
        d = roundedPolyline(routePoints, LANE_R);
        labelX = (entryX + exitX) / 2;
        labelY = laneY;
      }
    } else {
      fromSide = "right";
      toSide = "left";
      const ax = from.x + from.w;
      const ay = connectY(from, fromSide);
      const bx = to.x;
      const by = connectY(to, toSide);
      startX = ax;
      startY = ay;
      endX = bx;
      endY = by;
      const controlX = (ax + bx) / 2;
      d = `M ${ax} ${ay} C ${controlX} ${ay}, ${controlX} ${by}, ${bx} ${by}`;
      labelX = (ax + bx) / 2;
      labelY = (ay + by) / 2;
    }
    if (edge.labelPlacement === "above-target") {
      labelX = to.cx;
      labelY = to.y - 17;
    } else if (edge.labelPlacement === "below-target") {
      labelX = to.cx;
      labelY = to.y + to.h + 17;
    } else if (edge.labelPlacement === "left-of-edge") {
      labelX -= labelWidth / 2 + LABEL_EDGE_GAP;
    } else if (edge.labelPlacement === "right-of-edge") {
      labelX += labelWidth / 2 + LABEL_EDGE_GAP;
    }
    edges.push({
      ...edge,
      id: edgeId(edge),
      variant,
      d,
      labelX,
      labelY,
      labelWidth,
      startX,
      startY,
      endX,
      endY,
      fromSide,
      toSide,
      routePoints
    });
  }
  return edges;
}
function placeBandDecisions(diagram, nodes) {
  const decisions = (diagram.decisions ?? []).map((decision) => ({ ...decision }));
  if (decisions.length === 0) return [];
  const nodeById = {};
  for (const node of nodes) nodeById[node.id] = node;
  const placed = [];
  for (const decision of decisions) {
    const source = nodeById[decision.source];
    if (!source) continue;
    const nextTarget = diagram.edges.filter((edge) => edge.from === decision.source).map((edge) => nodeById[edge.to]).filter((target) => Boolean(target) && target.band > source.band).sort((a, b) => a.band - b.band)[0];
    if (!nextTarget) continue;
    const availableWidth = nextTarget.x - (source.x + source.w);
    placed.push({
      ...decision,
      x: source.x + source.w + availableWidth / 2,
      y: source.cy,
      width: Math.min(labelPillWidth(decision.label), availableWidth)
    });
  }
  return placed;
}
function placeBandContinuations(diagram, nodes) {
  const continuations = (diagram.continuations ?? []).map((continuation) => ({ ...continuation }));
  if (continuations.length === 0) return [];
  const nodeById = {};
  for (const node of nodes) nodeById[node.id] = node;
  const placed = [];
  for (const continuation of continuations) {
    const from = nodeById[continuation.from];
    if (!from) continue;
    const variant = continuation.variant ?? "branch";
    const anchor = continuation.anchor ?? "center";
    const sourceX = continuation.side === "left" ? from.x : from.x + from.w;
    const sourceY = anchor === "upper" ? from.y + CONTINUATION_PORT_INSET : anchor === "lower" ? from.y + from.h - CONTINUATION_PORT_INSET : isMutedNode(from) ? from.y + from.h : from.cy;
    const endX = sourceX + (continuation.side === "left" ? -CONTINUATION_LENGTH : CONTINUATION_LENGTH);
    const endY = sourceY;
    const displayLabel = `${continuation.label} \xB7 ${continuation.destination}`;
    const labelWidth = labelPillWidth(displayLabel);
    const labelX = continuation.side === "left" ? sourceX - CONTINUATION_LABEL_GAP - labelWidth / 2 : sourceX + CONTINUATION_LABEL_GAP + labelWidth / 2;
    const labelY = continuation.labelPlacement === "above-source" ? sourceY - CONTINUATION_LABEL_OFFSET : sourceY + CONTINUATION_LABEL_OFFSET;
    placed.push({
      ...continuation,
      variant,
      displayLabel,
      d: `M ${sourceX} ${sourceY} L ${endX} ${endY}`,
      sourceX,
      sourceY,
      endX,
      endY,
      labelX,
      labelY,
      labelWidth
    });
  }
  return placed;
}
function layoutBand(spec, _locale) {
  const bands = spec.bands.map((band, index) => ({
    title: band.title,
    index,
    x: BAND_X0 + index * BAND_PITCH
  }));
  const { height, midline } = canvasMetrics(spec);
  const nodes = [];
  for (const band of bands) {
    const members = spec.nodes.filter((node) => node.band === band.index);
    members.forEach((node, slot) => {
      const h = nodeHeight(node);
      const cy = midline + (slot - (members.length - 1) / 2) * SLOT_PITCH + (node.nudge ?? 0);
      nodes.push({
        ...node,
        slot,
        w: CARD_W,
        h,
        x: band.x,
        y: cy - h / 2,
        cx: band.x + CARD_W / 2,
        cy
      });
    });
  }
  const nodeById = {};
  for (const node of nodes) nodeById[node.id] = node;
  const edges = placeBandEdges(spec, nodes);
  const decisions = placeBandDecisions(spec, nodes);
  const continuations = placeBandContinuations(spec, nodes);
  return {
    width: CANVAS_W,
    height,
    nodes,
    edges,
    decisions,
    continuations,
    nodeById
  };
}

// src/layouts/flowchart.ts
var MARGIN = 80;
var BOTTOM_PAD = 64;
function topologicalLevels(nodes, edges) {
  const indegree = /* @__PURE__ */ new Map();
  const out = /* @__PURE__ */ new Map();
  for (const node of nodes) {
    indegree.set(node.id, 0);
    out.set(node.id, []);
  }
  for (const edge of edges) {
    indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
    const targets = out.get(edge.from);
    if (targets) targets.push(edge.to);
    else out.set(edge.from, [edge.to]);
  }
  const level = /* @__PURE__ */ new Map();
  const queue = nodes.filter((node) => (indegree.get(node.id) ?? 0) === 0);
  let assigned = 0;
  while (queue.length > 0) {
    const current = queue.shift();
    const currentLevel = level.get(current.id) ?? 0;
    assigned += 1;
    for (const target of out.get(current.id) ?? []) {
      const next = indegree.get(target) ?? 0;
      indegree.set(target, next - 1);
      const existing = level.get(target);
      if (existing === void 0 || currentLevel + 1 > existing) {
        level.set(target, currentLevel + 1);
      }
      if (next - 1 === 0) queue.push({ id: target });
    }
  }
  if (assigned < nodes.length) {
    const seen = new Set(level.keys());
    let fallback = 0;
    for (const node of nodes) {
      if (!seen.has(node.id)) level.set(node.id, fallback++);
    }
  }
  return level;
}
function layoutFlowchart(spec) {
  const levelOf = spec.level !== void 0 ? new Map(spec.nodes.map((node) => [node.id, spec.level])) : topologicalLevels(spec.nodes, spec.edges);
  const direction = spec.direction ?? "top-down";
  const horizontal = direction === "left-right";
  const columns = /* @__PURE__ */ new Map();
  for (const node of spec.nodes) {
    const level = levelOf.get(node.id) ?? 0;
    const members = columns.get(level) ?? [];
    members.push({
      ...node,
      band: level,
      w: CARD_W,
      h: nodeHeight(node),
      x: 0,
      y: 0,
      cx: 0,
      cy: 0
    });
    columns.set(level, members);
  }
  const columnCount = Math.max(1, ...columns.keys()) + 1;
  const rowsPerColumn = (index) => columns.get(index)?.length ?? 0;
  const maxRow = Math.max(1, ...[...columns.keys()].map(rowsPerColumn));
  const mainSpan = columnCount * (CARD_W + FLOW_GAP_X);
  const crossSpan = maxRow * (CARD_W + FLOW_GAP_Y);
  const width = horizontal ? crossSpan + FLOW_GAP_X + MARGIN * 2 : Math.max(CANVAS_W, mainSpan + MARGIN * 2);
  const height = horizontal ? Math.max(CANVAS_W * 0.55, mainSpan + BOTTOM_PAD + CONTENT_TOP) : crossSpan + FLOW_GAP_Y + BOTTOM_PAD + CONTENT_TOP;
  const nodes = [];
  for (const [level, members] of columns) {
    members.forEach((node, index) => {
      const origin = horizontal ? level * (CARD_W + FLOW_GAP_Y) : level * (CARD_W + FLOW_GAP_X);
      const cross = horizontal ? index * (CARD_W + FLOW_GAP_X) : index * (CARD_W + FLOW_GAP_Y);
      const crossCentre = horizontal ? MARGIN + (crossSpan - CARD_W) / 2 : CONTENT_TOP + (crossSpan - CARD_W) / 2;
      const x = horizontal ? crossCentre + cross - CARD_W / 2 : MARGIN + origin;
      const y = horizontal ? MARGIN + origin - node.h / 2 : crossCentre + cross - node.h / 2;
      const cx = x + CARD_W / 2;
      const cy = y + node.h / 2;
      nodes.push({ ...node, x, y, cx, cy });
    });
  }
  const nodeById = {};
  for (const node of nodes) nodeById[node.id] = node;
  const edges = [];
  for (const edge of spec.edges) {
    const from = nodeById[edge.from];
    const to = nodeById[edge.to];
    if (!from || !to) continue;
    const variant = edge.variant ?? "main";
    const labelWidth = edge.label ? labelPillWidth(edge.label) : 0;
    let d;
    let startX;
    let startY;
    let endX;
    let endY;
    if ((levelOf.get(from.id) ?? 0) === (levelOf.get(to.id) ?? 0)) {
      const rightward = to.x > from.x;
      startX = rightward ? from.x + from.w : from.x;
      startY = from.cy;
      endX = rightward ? to.x : to.x + to.w;
      endY = to.cy;
      const lane = rightward ? Math.max(from.x + from.w, to.x) + FLOW_GAP_X / 2 : Math.min(from.x, to.x + to.w) - FLOW_GAP_X / 2;
      d = `M ${startX} ${startY} Q ${lane} ${startY}, ${lane} ${endY} T ${endX} ${endY}`;
    } else {
      const moving = to.x > from.x;
      if (horizontal) {
        startX = moving ? from.x + from.w : from.x;
        startY = from.cy;
        endX = moving ? to.x : to.x + to.w;
        endY = to.cy;
        const controlX = (startX + endX) / 2;
        d = `M ${startX} ${startY} C ${controlX} ${startY}, ${controlX} ${endY}, ${endX} ${endY}`;
      } else {
        const movingDown = to.y > from.y;
        startX = from.cx;
        startY = movingDown ? from.y + from.h : from.y;
        endX = to.cx;
        endY = movingDown ? to.y : to.y + to.h;
        const controlY = Math.abs(endY - startY) * 0.5;
        d = `M ${startX} ${startY} C ${startX} ${startY + controlY}, ${endX} ${endY - controlY}, ${endX} ${endY}`;
      }
    }
    edges.push({
      ...edge,
      id: edgeId(edge),
      variant,
      d,
      labelX: (startX + endX) / 2,
      labelY: (startY + endY) / 2,
      labelWidth,
      startX,
      startY,
      endX,
      endY,
      fromSide: horizontal ? endX > startX ? "right" : "left" : endY > startY ? "bottom" : "top",
      toSide: horizontal ? endX > startX ? "left" : "right" : endY > startY ? "top" : "bottom"
    });
  }
  return { width, height, nodes, edges, decisions: [], continuations: [], nodeById };
}

// src/layouts/sequence.ts
var PARTICIPANT_PITCH = 280;
var HEADER_W = 200;
var HEADER_H = 44;
var HEADER_TOP = 8;
var MESSAGE_TOP = 64;
var BOTTOM_PAD2 = 56;
var ACTIVATION_W = 8;
function layoutSequence(spec) {
  const count = Math.max(1, spec.participants.length);
  const pitch = Math.max(PARTICIPANT_PITCH, (CANVAS_W - 160) / count);
  const width = Math.max(CANVAS_W, count * pitch + 160);
  const y1 = MESSAGE_TOP + spec.messages.length * MESSAGE_PITCH;
  const height = y1 + BOTTOM_PAD2;
  const lifelines = [];
  const nodes = [];
  const nodeById = {};
  spec.participants.forEach((participant, index) => {
    const cx = 80 + pitch * index + pitch / 2;
    lifelines.push({
      id: participant.id,
      label: participant.label,
      kind: participant.kind,
      x: cx,
      y0: LIFELINE_TOP,
      y1
    });
    const header = {
      id: participant.id,
      label: participant.label,
      description: participant.kind ? `${participant.kind}: ${participant.label}` : participant.label,
      kind: participant.kind,
      band: 0,
      w: HEADER_W,
      h: HEADER_H,
      x: cx - HEADER_W / 2,
      y: HEADER_TOP,
      cx,
      cy: HEADER_TOP + HEADER_H / 2,
      shape: "card"
    };
    nodes.push(header);
    nodeById[header.id] = header;
  });
  const edges = [];
  spec.messages.forEach((message, index) => {
    const from = nodeById[message.from];
    const to = nodeById[message.to];
    if (!from || !to) return;
    const y = MESSAGE_TOP + index * MESSAGE_PITCH + MESSAGE_PITCH / 2;
    const startX = message.from === message.to ? from.cx + 40 : from.cx;
    const endX = message.from === message.to ? to.cx + 120 : to.cx;
    const variant = message.variant ?? "main";
    const labelWidth = message.label ? labelPillWidth(message.label) : 0;
    const labelX = (startX + endX) / 2;
    const labelY = y - 10;
    edges.push({
      ...message,
      id: edgeId(message),
      variant,
      d: message.from === message.to ? `M ${from.cx + 30} ${y} Q ${startX + 60} ${y - 18}, ${endX} ${y}` : `M ${startX} ${y} L ${endX} ${y}`,
      labelX,
      labelY,
      labelWidth,
      startX,
      startY: y,
      endX,
      endY: y,
      fromSide: message.from === message.to ? "right" : endX > startX ? "right" : "left",
      toSide: message.from === message.to ? "right" : endX > startX ? "left" : "right"
    });
    if (message.activation && to) {
      const bar = {
        id: `activation-${message.id}`,
        label: "",
        description: "",
        band: 0,
        w: ACTIVATION_W,
        h: MESSAGE_PITCH,
        x: to.cx - ACTIVATION_W / 2,
        y: y - MESSAGE_PITCH / 2 + 8,
        cx: to.cx,
        cy: y,
        shape: "bar",
        weight: variant === "branch" ? "secondary" : "primary"
      };
      nodes.push(bar);
      nodeById[bar.id] = bar;
    }
  });
  return { width, height, nodes, edges, decisions: [], continuations: [], lifelines, nodeById };
}

// src/layouts/state-machine.ts
var STATE_W = 220;
var RING_MARGIN = 200;
var TOP_PAD = 48;
var BOTTOM_PAD3 = 48;
function layoutStateMachine(spec) {
  const states = spec.states.map((state) => ({ ...state }));
  const n = Math.max(1, states.length);
  const width = Math.max(720, n * 240 + RING_MARGIN * 2);
  const height = Math.max(520, n * 200 + TOP_PAD + BOTTOM_PAD3);
  const cx = width / 2;
  const cy = height / 2 + 12;
  const radius = Math.min(width, height) / 2 - RING_MARGIN / 2;
  const nodes = [];
  const nodeById = {};
  states.forEach((state, index) => {
    const angle = index / n * Math.PI * 2 - Math.PI / 2;
    const h = nodeHeight(state);
    const w = state.sublabel ? CARD_W : STATE_W;
    const x = cx + Math.cos(angle) * radius - w / 2;
    const y = cy + Math.sin(angle) * radius - h / 2;
    const placed = {
      ...state,
      description: state.description ?? `${state.kind ? `${state.kind}: ` : ""}${state.label}`,
      band: 0,
      w,
      h,
      x,
      y,
      cx: x + w / 2,
      cy: y + h / 2,
      shape: "state"
    };
    nodes.push(placed);
    nodeById[placed.id] = placed;
  });
  const edges = [];
  for (const transition of spec.transitions) {
    const from = nodeById[transition.from];
    const to = nodeById[transition.to];
    if (!from || !to) continue;
    const variant = transition.variant ?? "main";
    const labelWidth = transition.label ? labelPillWidth(transition.label) : 0;
    if (transition.from === transition.to) {
      const startX = from.x + from.w * 0.35;
      const endX = from.x + from.w * 0.65;
      const loopY = from.y - 36;
      edges.push({
        ...transition,
        id: `${transition.from}::self::${from.id}`,
        variant,
        d: `M ${startX} ${from.y} C ${startX} ${loopY - 14}, ${endX} ${loopY - 14}, ${endX} ${from.y}`,
        labelX: from.cx,
        labelY: loopY - 24,
        labelWidth,
        startX,
        startY: from.y,
        endX,
        endY: from.y,
        fromSide: "top",
        toSide: "top"
      });
      continue;
    }
    const midX = (from.cx + to.cx) / 2;
    const midY = (from.cy + to.cy) / 2;
    const bulge = 28;
    edges.push({
      ...transition,
      id: edgeId(transition),
      variant,
      d: `M ${from.cx} ${from.cy} Q ${midX + bulge} ${midY - bulge}, ${to.cx} ${to.cy}`,
      labelX: midX,
      labelY: midY,
      labelWidth,
      startX: from.cx,
      startY: from.cy,
      endX: to.cx,
      endY: to.cy,
      fromSide: "right",
      toSide: "left"
    });
  }
  return { width, height, nodes, edges, decisions: [], continuations: [], nodeById };
}

// src/layouts/er.ts
var TABLE_W = 240;
var HEADER_H2 = 30;
var ROW_H = 22;
var GRID_GAP_X = 72;
var GRID_GAP_Y = 48;
var MARGIN2 = 80;
var BOTTOM_PAD4 = 56;
var COLS = 3;
var tableHeight = (fields) => HEADER_H2 + fields.length * ROW_H + 8;
function layoutEr(spec) {
  const cols = Math.min(COLS, Math.max(1, spec.entities.length));
  const rows = Math.ceil(spec.entities.length / cols);
  let width = CANVAS_W;
  const height = MARGIN2 + rows * (CARD_W + GRID_GAP_Y) + BOTTOM_PAD4;
  const xFor = (col) => MARGIN2 + col * (TABLE_W + GRID_GAP_X);
  const yFor = (row) => MARGIN2 + row * (CARD_W + GRID_GAP_Y);
  const lastCol = Math.min(cols - 1, spec.entities.length - 1);
  const rightEdge = xFor(lastCol) + TABLE_W;
  width = Math.max(width, rightEdge + MARGIN2);
  const nodes = [];
  const nodeById = {};
  spec.entities.forEach((entity, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const h = tableHeight(entity.fields);
    const x = xFor(col);
    const y = yFor(row);
    const placed = {
      id: entity.id,
      label: entity.label,
      description: entity.kind ? `${entity.kind}: ${entity.label}` : entity.label,
      kind: entity.kind,
      weight: entity.weight,
      fields: entity.fields,
      band: row,
      w: TABLE_W,
      h,
      x,
      y,
      cx: x + TABLE_W / 2,
      cy: y + h / 2,
      shape: "table"
    };
    nodes.push(placed);
    nodeById[placed.id] = placed;
  });
  const edges = [];
  for (const relation of spec.relations) {
    const from = nodeById[relation.from];
    const to = nodeById[relation.to];
    if (!from || !to) continue;
    const variant = relation.variant ?? "main";
    const labelWidth = relation.label ? labelPillWidth(relation.label) : 0;
    const startX = from.x + from.w;
    const startY = from.y + HEADER_H2;
    const endX = to.x;
    const endY = to.y + HEADER_H2;
    edges.push({
      ...relation,
      id: edgeId(relation),
      variant,
      d: `M ${startX} ${startY} L ${endX} ${endY}`,
      labelX: (startX + endX) / 2,
      labelY: (startY + endY) / 2,
      labelWidth,
      startX,
      startY,
      endX,
      endY,
      fromSide: "right",
      toSide: "left"
    });
  }
  return { width, height, nodes, edges, decisions: [], continuations: [], nodeById };
}

// src/layouts/timeline.ts
var MARGIN3 = 100;
var TOP_PAD2 = 64;
var BOTTOM_PAD5 = 72;
var EVENT_W = 240;
function layoutTimeline(spec) {
  const n = Math.max(1, spec.events.length);
  const width = Math.max(CANVAS_W, n * TIMELINE_EVENT_GAP + MARGIN3 * 2);
  const spineY = TOP_PAD2 + TIMELINE_ALT_OFFSET + 56;
  const height = spineY + TIMELINE_ALT_OFFSET + BOTTOM_PAD5 + 56;
  const nodes = [];
  const nodeById = {};
  spec.events.forEach((event, index) => {
    const above = index % 2 === 0;
    const x = MARGIN3 + TIMELINE_EVENT_GAP * index + TIMELINE_EVENT_GAP / 2;
    const labelY = above ? spineY - TIMELINE_ALT_OFFSET - 8 : spineY + TIMELINE_ALT_OFFSET + 8;
    const placed = {
      id: event.id,
      label: event.label,
      description: event.description,
      kind: event.kind,
      sublabel: event.sublabel,
      weight: event.weight ?? (event.variant === "branch" ? "secondary" : "primary"),
      band: 0,
      w: EVENT_W,
      h: 0,
      x: x - EVENT_W / 2,
      y: labelY,
      cx: x,
      cy: spineY,
      shape: "event",
      textAnchor: "middle",
      nudge: above ? -1 : 1
    };
    nodes.push(placed);
    nodeById[placed.id] = placed;
  });
  const edges = [];
  const spine = {
    id: "timeline-spine",
    from: "",
    to: "",
    variant: "main",
    dashed: true,
    d: `M ${MARGIN3} ${spineY} L ${width - MARGIN3} ${spineY}`,
    labelX: 0,
    labelY: 0,
    labelWidth: 0,
    startX: MARGIN3,
    startY: spineY,
    endX: width - MARGIN3,
    endY: spineY,
    fromSide: "left",
    toSide: "right"
  };
  edges.push(spine);
  return { width, height, nodes, edges, decisions: [], continuations: [], nodeById };
}

// src/layouts/swimlane.ts
var TOP_PAD3 = 56;
var BOTTOM_PAD6 = 56;
var NODE_GAP = 48;
function layoutSwimlane(spec) {
  const laneIds = spec.lanes.map((lane) => lane.id);
  const membersByLane = /* @__PURE__ */ new Map();
  for (const node of spec.nodes) {
    const members = membersByLane.get(node.lane) ?? [];
    members.push({
      ...node,
      band: 0,
      w: CARD_W,
      h: nodeHeight(node),
      x: 0,
      y: 0,
      cx: 0,
      cy: 0
    });
    membersByLane.set(node.lane, members);
  }
  const laneHeights = laneIds.map((id) => {
    const members = membersByLane.get(id) ?? [];
    const maxCardH = Math.max(0, ...members.map((member) => member.h));
    return Math.max(88, maxCardH + SWIMLANE_ROW_PAD);
  });
  let y = TOP_PAD3;
  const laneTop = /* @__PURE__ */ new Map();
  laneIds.forEach((id, index) => {
    laneTop.set(id, y);
    y += laneHeights[index];
  });
  const height = y + BOTTOM_PAD6;
  const containers = [];
  spec.lanes.forEach((lane, index) => {
    containers.push({
      id: lane.id,
      label: lane.label,
      kind: lane.kind,
      x: 0,
      y: laneTop.get(lane.id) ?? 0,
      w: CANVAS_W,
      h: laneHeights[index]
    });
  });
  const nodes = [];
  const nodeById = {};
  laneIds.forEach((laneId, laneIndex) => {
    const members = membersByLane.get(laneId) ?? [];
    const top = laneTop.get(laneId) ?? 0;
    const laneH = laneHeights[laneIds.indexOf(laneId)];
    let cursor = SWIMLANE_HEADER_W + SWIMLANE_PAD;
    members.forEach((member) => {
      const x = cursor;
      const cy = top + laneH / 2;
      const placed = {
        ...member,
        band: laneIndex,
        x,
        y: cy - member.h / 2,
        cx: x + member.w / 2,
        cy
      };
      nodes.push(placed);
      nodeById[placed.id] = placed;
      cursor += member.w + NODE_GAP;
    });
  });
  const edges = [];
  for (const edge of spec.edges) {
    const from = nodeById[edge.from];
    const to = nodeById[edge.to];
    if (!from || !to) continue;
    const variant = edge.variant ?? "main";
    const labelWidth = edge.label ? labelPillWidth(edge.label) : 0;
    const fromLane = from.y;
    const toLane = to.y;
    let d;
    let startX;
    let startY;
    let endX;
    let endY;
    if (fromLane === toLane) {
      startX = from.x + from.w;
      startY = from.cy;
      endX = to.x;
      endY = to.cy;
      d = `M ${startX} ${startY} C ${(startX + endX) / 2} ${startY}, ${(startX + endX) / 2} ${endY}, ${endX} ${endY}`;
    } else {
      const movingDown = to.y > from.y;
      const exitY = movingDown ? from.y + from.h : from.y;
      const entryY = movingDown ? to.y : to.y + to.h;
      startX = from.cx;
      startY = exitY;
      endX = to.cx;
      endY = entryY;
      d = `M ${startX} ${exitY} C ${startX} ${(exitY + entryY) / 2}, ${endX} ${(exitY + entryY) / 2}, ${endX} ${entryY}`;
    }
    edges.push({
      ...edge,
      id: edgeId(edge),
      variant,
      d,
      labelX: (startX + endX) / 2,
      labelY: (startY + endY) / 2,
      labelWidth,
      startX,
      startY,
      endX,
      endY,
      fromSide: endX > startX ? "right" : "left",
      toSide: endX > startX ? "left" : "right"
    });
  }
  return {
    width: CANVAS_W,
    height,
    nodes,
    edges,
    decisions: [],
    continuations: [],
    containers,
    nodeById
  };
}

// src/layouts/index.ts
function layoutByType(spec) {
  const type = "type" in spec ? spec.type : "band";
  switch (type) {
    case "band":
      return layoutBand(spec);
    case "flowchart":
      return layoutFlowchart(spec);
    case "sequence":
      return layoutSequence(spec);
    case "state-machine":
      return layoutStateMachine(spec);
    case "er":
      return layoutEr(spec);
    case "timeline":
      return layoutTimeline(spec);
    case "swimlane":
      return layoutSwimlane(spec);
    default:
      return layoutBand(spec);
  }
}
function layoutDiagram(spec) {
  return layoutByType(spec);
}
export {
  canvasMetrics,
  layoutBand,
  layoutByType,
  layoutDiagram,
  layoutEr,
  layoutFlowchart,
  layoutSequence,
  layoutStateMachine,
  layoutSwimlane,
  layoutTimeline
};
