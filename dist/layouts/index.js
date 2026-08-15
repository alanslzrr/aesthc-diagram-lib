// src/theme.ts
var CARD_W = 240;
var CARD_H_FULL = 88;
var CARD_H_SLIM = 64;
var BAND_X0 = 40;
var BAND_PITCH = 338;
var SLOT_PITCH = 132;
var CONTENT_TOP = 56;
var CANVAS_BOTTOM_PAD = 56;
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
function splitBackEdges(nodes, edges) {
  const out = /* @__PURE__ */ new Map();
  for (const node of nodes) out.set(node.id, []);
  for (const edge of edges) out.get(edge.from)?.push(edge);
  const state = /* @__PURE__ */ new Map();
  const back = /* @__PURE__ */ new Set();
  const visit = (id) => {
    state.set(id, 1);
    for (const edge of out.get(id) ?? []) {
      const targetState = state.get(edge.to) ?? 0;
      if (targetState === 1) back.add(edge);
      else if (targetState === 0 && out.has(edge.to)) visit(edge.to);
    }
    state.set(id, 2);
  };
  for (const node of nodes) {
    if ((state.get(node.id) ?? 0) === 0) visit(node.id);
  }
  return {
    forward: edges.filter((edge) => !back.has(edge)),
    back: edges.filter((edge) => back.has(edge))
  };
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
  const gridWidth = BAND_X0 * 2 + Math.max(0, bands.length - 1) * BAND_PITCH + CARD_W;
  const continuationExtent = Math.max(
    0,
    ...continuations.map((continuation) => continuation.labelX + continuation.labelWidth / 2 + 24),
    ...continuations.map((continuation) => continuation.endX + 12)
  );
  const width = Math.max(gridWidth, continuationExtent);
  return {
    width,
    height,
    nodes,
    edges,
    decisions,
    continuations,
    nodeById
  };
}

// src/layouts/flowchart.ts
var MARGIN_X = 72;
var BOTTOM_PAD = 64;
var OUTER_LANE_GAP = 56;
var OUTER_LANE_STEP = 26;
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
  const { forward, back } = splitBackEdges(spec.nodes, spec.edges);
  const levelOf = spec.level !== void 0 ? new Map(spec.nodes.map((node) => [node.id, spec.level])) : topologicalLevels(spec.nodes, forward);
  const direction = spec.direction ?? "top-down";
  const horizontal = direction === "left-right";
  const levels = /* @__PURE__ */ new Map();
  for (const node of spec.nodes) {
    const level = levelOf.get(node.id) ?? 0;
    const members = levels.get(level) ?? [];
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
    levels.set(level, members);
  }
  const levelIndices = [...levels.keys()].sort((a, b) => a - b);
  const skipEdges = forward.filter(
    (edge) => Math.abs((levelOf.get(edge.to) ?? 0) - (levelOf.get(edge.from) ?? 0)) > 1
  );
  const nearLaneSpan = back.length > 0 ? OUTER_LANE_GAP + (back.length - 1) * OUTER_LANE_STEP : 0;
  const farLaneSpan = skipEdges.length > 0 ? OUTER_LANE_GAP + (skipEdges.length - 1) * OUTER_LANE_STEP : 0;
  const nodes = [];
  const nodeById = {};
  if (!horizontal) {
    const rowWidth = (members) => members.length * CARD_W + (members.length - 1) * FLOW_GAP_X;
    const contentW = Math.max(CARD_W, ...levelIndices.map((index) => rowWidth(levels.get(index) ?? [])));
    const originX = MARGIN_X + nearLaneSpan;
    const width2 = originX + contentW + farLaneSpan + MARGIN_X;
    let y = CONTENT_TOP;
    for (const index of levelIndices) {
      const members = levels.get(index) ?? [];
      const rowH = Math.max(...members.map((member) => member.h));
      const totalW = rowWidth(members);
      members.forEach((member, position) => {
        const x2 = originX + (contentW - totalW) / 2 + position * (CARD_W + FLOW_GAP_X);
        const cy = y + rowH / 2 + (member.nudge ?? 0);
        const placed = {
          ...member,
          x: x2,
          y: cy - member.h / 2,
          cx: x2 + CARD_W / 2,
          cy
        };
        nodes.push(placed);
        nodeById[placed.id] = placed;
      });
      y += rowH + FLOW_GAP_Y;
    }
    const height2 = y - FLOW_GAP_Y + BOTTOM_PAD;
    const edges2 = placeFlowEdges(spec, nodes, nodeById, levelOf, back, {
      horizontal: false,
      nearLaneX: originX - OUTER_LANE_GAP,
      farLaneX: originX + contentW + OUTER_LANE_GAP
    });
    return { width: width2, height: height2, nodes, edges: edges2, decisions: [], continuations: [], nodeById };
  }
  const columnHeight = (members) => members.reduce((sum, member) => sum + member.h, 0) + (members.length - 1) * FLOW_GAP_Y;
  const contentH = Math.max(
    CARD_W / 2,
    ...levelIndices.map((index) => columnHeight(levels.get(index) ?? []))
  );
  const originY = CONTENT_TOP + nearLaneSpan;
  const height = originY + contentH + farLaneSpan + BOTTOM_PAD;
  let x = MARGIN_X;
  for (const index of levelIndices) {
    const members = levels.get(index) ?? [];
    const totalH = columnHeight(members);
    let memberY = originY + (contentH - totalH) / 2;
    for (const member of members) {
      const cy = memberY + member.h / 2 + (member.nudge ?? 0);
      const placed = {
        ...member,
        x,
        y: cy - member.h / 2,
        cx: x + CARD_W / 2,
        cy
      };
      nodes.push(placed);
      nodeById[placed.id] = placed;
      memberY += member.h + FLOW_GAP_Y;
    }
    x += CARD_W + FLOW_GAP_X;
  }
  const width = x - FLOW_GAP_X + MARGIN_X;
  const edges = placeFlowEdges(spec, nodes, nodeById, levelOf, back, {
    horizontal: true,
    nearLaneX: originY - OUTER_LANE_GAP,
    farLaneX: originY + contentH + OUTER_LANE_GAP
  });
  return { width, height, nodes, edges, decisions: [], continuations: [], nodeById };
}
function placeFlowEdges(spec, nodes, nodeById, levelOf, back, lanes) {
  const backSet = new Set(back);
  const edges = [];
  let nearLaneUsed = 0;
  let farLaneUsed = 0;
  for (const edge of spec.edges) {
    const from = nodeById[edge.from];
    const to = nodeById[edge.to];
    if (!from || !to) continue;
    const variant = edge.variant ?? "main";
    const labelWidth = edge.label ? labelPillWidth(edge.label) : 0;
    const levelDelta = (levelOf.get(to.id) ?? 0) - (levelOf.get(from.id) ?? 0);
    const isBack = backSet.has(edge);
    let placed;
    if (isBack) {
      const laneOffset = nearLaneUsed++ * -26;
      placed = lanes.horizontal ? outerLaneHorizontal(from, to, lanes.nearLaneX + laneOffset, "near", nodes) : outerLaneVertical(from, to, lanes.nearLaneX + laneOffset, "near", nodes);
    } else if (Math.abs(levelDelta) > 1) {
      const laneOffset = farLaneUsed++ * 26;
      placed = lanes.horizontal ? outerLaneHorizontal(from, to, lanes.farLaneX + laneOffset, "far", nodes) : outerLaneVertical(from, to, lanes.farLaneX + laneOffset, "far", nodes);
    } else if (levelDelta === 0) {
      const rightward = to.cx > from.cx || !lanes.horizontal && to.cy > from.cy;
      if (lanes.horizontal) {
        const movingDown = to.cy > from.cy;
        const startY = movingDown ? from.y + from.h : from.y;
        const endY = movingDown ? to.y : to.y + to.h;
        const controlY = (startY + endY) / 2;
        placed = {
          d: `M ${from.cx} ${startY} C ${from.cx} ${controlY}, ${to.cx} ${controlY}, ${to.cx} ${endY}`,
          labelX: (from.cx + to.cx) / 2,
          labelY: (startY + endY) / 2,
          startX: from.cx,
          startY,
          endX: to.cx,
          endY,
          fromSide: movingDown ? "bottom" : "top",
          toSide: movingDown ? "top" : "bottom"
        };
      } else {
        const startX = rightward ? from.x + from.w : from.x;
        const endX = rightward ? to.x : to.x + to.w;
        const controlX = (startX + endX) / 2;
        placed = {
          d: `M ${startX} ${from.cy} C ${controlX} ${from.cy}, ${controlX} ${to.cy}, ${endX} ${to.cy}`,
          labelX: (startX + endX) / 2,
          labelY: (from.cy + to.cy) / 2,
          startX,
          startY: from.cy,
          endX,
          endY: to.cy,
          fromSide: rightward ? "right" : "left",
          toSide: rightward ? "left" : "right"
        };
      }
    } else if (lanes.horizontal) {
      const startX = from.x + from.w;
      const endX = to.x;
      const controlX = (startX + endX) / 2;
      placed = {
        d: `M ${startX} ${from.cy} C ${controlX} ${from.cy}, ${controlX} ${to.cy}, ${endX} ${to.cy}`,
        labelX: (startX + endX) / 2,
        labelY: (from.cy + to.cy) / 2,
        startX,
        startY: from.cy,
        endX,
        endY: to.cy,
        fromSide: "right",
        toSide: "left"
      };
    } else {
      const startY = from.y + from.h;
      const endY = to.y;
      const controlY = Math.abs(endY - startY) * 0.5;
      placed = {
        d: `M ${from.cx} ${startY} C ${from.cx} ${startY + controlY}, ${to.cx} ${endY - controlY}, ${to.cx} ${endY}`,
        labelX: (from.cx + to.cx) / 2,
        labelY: (startY + endY) / 2,
        startX: from.cx,
        startY,
        endX: to.cx,
        endY,
        fromSide: "bottom",
        toSide: "top"
      };
    }
    edges.push({
      ...edge,
      id: edgeId(edge),
      variant,
      labelWidth,
      arrowEnd: isBack || Math.abs(levelDelta) > 1 ? true : void 0,
      ...placed
    });
  }
  return edges;
}
var JOG = 28;
function rowBlocked(node, nodes, x1, x2) {
  const [lo, hi] = x1 < x2 ? [x1, x2] : [x2, x1];
  return nodes.some(
    (other) => other.id !== node.id && Math.abs(other.cy - node.cy) < (other.h + node.h) / 2 && other.x + other.w > lo && other.x < hi
  );
}
function columnBlocked(node, nodes, y1, y2) {
  const [lo, hi] = y1 < y2 ? [y1, y2] : [y2, y1];
  return nodes.some(
    (other) => other.id !== node.id && Math.abs(other.cx - node.cx) < (other.w + node.w) / 2 && other.y + other.h > lo && other.y < hi
  );
}
function outerLaneVertical(from, to, laneX, side, nodes) {
  const left = side === "near";
  const movingUp = to.cy < from.cy;
  const sideOf = left ? "left" : "right";
  const exitX = left ? from.x : from.x + from.w;
  const exitY = connectY(from, sideOf);
  let head;
  let fromSide = sideOf;
  if (rowBlocked(from, nodes, exitX, laneX)) {
    const jogY = movingUp ? from.y - JOG : from.y + from.h + JOG;
    head = [
      [from.cx, movingUp ? from.y : from.y + from.h],
      [from.cx, jogY],
      [laneX, jogY]
    ];
    fromSide = movingUp ? "top" : "bottom";
  } else {
    head = [
      [exitX, exitY],
      [laneX, exitY]
    ];
  }
  const entryX = left ? to.x : to.x + to.w;
  const entryY = connectY(to, sideOf);
  let tail;
  let toSide = sideOf;
  if (rowBlocked(to, nodes, laneX, entryX)) {
    const jogY = movingUp ? to.y + to.h + JOG : to.y - JOG;
    tail = [
      [laneX, jogY],
      [to.cx, jogY],
      [to.cx, movingUp ? to.y + to.h : to.y]
    ];
    toSide = movingUp ? "bottom" : "top";
  } else {
    tail = [
      [laneX, entryY],
      [entryX, entryY]
    ];
  }
  return laneShape(
    [...head, ...tail],
    fromSide,
    toSide,
    laneX,
    (head[head.length - 1][1] + tail[0][1]) / 2
  );
}
function outerLaneHorizontal(from, to, laneY, side, nodes) {
  const top = side === "near";
  const movingLeft = to.cx < from.cx;
  const sideOf = top ? "top" : "bottom";
  const exitY = top ? from.y : from.y + from.h;
  let head;
  let fromSide = sideOf;
  if (columnBlocked(from, nodes, exitY, laneY)) {
    const jogX = movingLeft ? from.x - JOG : from.x + from.w + JOG;
    head = [
      [movingLeft ? from.x : from.x + from.w, from.cy],
      [jogX, from.cy],
      [jogX, laneY]
    ];
    fromSide = movingLeft ? "left" : "right";
  } else {
    head = [
      [from.cx, exitY],
      [from.cx, laneY]
    ];
  }
  const entryY = top ? to.y : to.y + to.h;
  let tail;
  let toSide = sideOf;
  if (columnBlocked(to, nodes, laneY, entryY)) {
    const jogX = movingLeft ? to.x + to.w + JOG : to.x - JOG;
    tail = [
      [jogX, laneY],
      [jogX, to.cy],
      [movingLeft ? to.x + to.w : to.x, to.cy]
    ];
    toSide = movingLeft ? "right" : "left";
  } else {
    tail = [
      [to.cx, laneY],
      [to.cx, entryY]
    ];
  }
  return laneShape(
    [...head, ...tail],
    fromSide,
    toSide,
    (head[head.length - 1][0] + tail[0][0]) / 2,
    laneY
  );
}
function laneShape(points, fromSide, toSide, labelX, labelY) {
  const [startX, startY] = points[0];
  const [endX, endY] = points[points.length - 1];
  return {
    d: roundedPolyline(points, LANE_R),
    labelX,
    labelY,
    startX,
    startY,
    endX,
    endY,
    fromSide,
    toSide,
    routePoints: points
  };
}

// src/layouts/sequence.ts
var PARTICIPANT_PITCH = 300;
var HEADER_W = 200;
var HEADER_H = CARD_H_SLIM;
var HEADER_TOP = 8;
var MARGIN_X2 = 72;
var BOTTOM_PAD2 = 48;
var ACTIVATION_W = 8;
var END_TRIM = 5;
function layoutSequence(spec) {
  const count = Math.max(1, spec.participants.length);
  const selfLabelExtent = Math.max(
    0,
    ...spec.messages.filter((message) => message.from === message.to && message.label).map((message) => 104 + labelPillWidth(message.label) + 16)
  );
  const width = 2 * (MARGIN_X2 + HEADER_W / 2) + PARTICIPANT_PITCH * (count - 1) + Math.max(0, selfLabelExtent - (MARGIN_X2 + HEADER_W / 2));
  const headerBottom = HEADER_TOP + HEADER_H;
  const messageTop = headerBottom + 48;
  const y1 = messageTop + spec.messages.length * MESSAGE_PITCH;
  const height = y1 + BOTTOM_PAD2;
  const lifelines = [];
  const nodes = [];
  const nodeById = {};
  spec.participants.forEach((participant, index) => {
    const cx = MARGIN_X2 + HEADER_W / 2 + PARTICIPANT_PITCH * index;
    lifelines.push({
      id: participant.id,
      label: participant.label,
      kind: participant.kind,
      x: cx,
      y0: headerBottom,
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
  const messageY = (index) => messageTop + index * MESSAGE_PITCH + MESSAGE_PITCH / 2;
  const edges = [];
  spec.messages.forEach((message, index) => {
    const from = nodeById[message.from];
    const to = nodeById[message.to];
    if (!from || !to) return;
    const y = messageY(index);
    const variant = message.variant ?? "main";
    const labelWidth = message.label ? labelPillWidth(message.label) : 0;
    if (message.from === message.to) {
      const startX2 = from.cx + END_TRIM;
      const endX2 = from.cx + END_TRIM;
      edges.push({
        ...message,
        id: edgeId(message),
        variant,
        d: `M ${startX2} ${y - 10} C ${startX2 + 84} ${y - 12}, ${startX2 + 84} ${y + 12}, ${endX2} ${y + 10}`,
        labelX: from.cx + 104 + labelWidth / 2,
        labelY: y,
        labelWidth,
        startX: startX2,
        startY: y,
        endX: endX2,
        endY: y,
        fromSide: "right",
        toSide: "right",
        arrowEnd: true
      });
      return;
    }
    const rightward = to.cx > from.cx;
    const startX = from.cx + (rightward ? END_TRIM : -END_TRIM);
    const endX = to.cx - (rightward ? END_TRIM : -END_TRIM);
    edges.push({
      ...message,
      id: edgeId(message),
      variant,
      d: `M ${startX} ${y} L ${endX} ${y}`,
      labelX: (startX + endX) / 2,
      labelY: y - 14,
      labelWidth,
      startX,
      startY: y,
      endX,
      endY: y,
      fromSide: rightward ? "right" : "left",
      toSide: rightward ? "left" : "right",
      arrowEnd: true
    });
  });
  spec.messages.forEach((message, index) => {
    if (!message.activation) return;
    const receiver = nodeById[message.to];
    if (!receiver) return;
    const opensAt = messageY(index);
    const reply = spec.messages.findIndex(
      (candidate, candidateIndex) => candidateIndex > index && candidate.from === message.to
    );
    const closesAt = reply >= 0 ? messageY(reply) : opensAt + MESSAGE_PITCH * 0.72;
    const bar = {
      id: `activation-${message.id}`,
      label: "",
      description: "",
      band: 0,
      w: ACTIVATION_W,
      h: closesAt - opensAt + 8,
      x: receiver.cx - ACTIVATION_W / 2,
      y: opensAt - 4,
      cx: receiver.cx,
      cy: (opensAt + closesAt) / 2,
      shape: "bar",
      weight: (message.variant ?? "main") === "branch" ? "secondary" : "primary"
    };
    nodes.push(bar);
    nodeById[bar.id] = bar;
  });
  return { width, height, nodes, edges, decisions: [], continuations: [], lifelines, nodeById };
}

// src/layouts/state-machine.ts
var STATE_W = 220;
var MARGIN_X3 = 96;
var MARGIN_Y = 64;
var TRIM_GAP = 6;
function borderPoint(node, tx, ty) {
  const dx = tx - node.cx;
  const dy = ty - node.cy;
  if (dx === 0 && dy === 0) return [node.cx, node.cy];
  const scale = 1 / Math.max(Math.abs(dx) / (node.w / 2 + TRIM_GAP), Math.abs(dy) / (node.h / 2 + TRIM_GAP));
  return [node.cx + dx * scale, node.cy + dy * scale];
}
function layoutStateMachine(spec) {
  const states = spec.states.map((state) => ({ ...state }));
  const n = Math.max(1, states.length);
  const ringRadius = n * (STATE_W + 64) / (2 * Math.PI);
  const rx = Math.max(340, ringRadius * 1.7);
  const ry = Math.max(180, ringRadius * 0.88);
  const width = Math.round(2 * (rx + STATE_W / 2 + MARGIN_X3));
  const height = Math.round(2 * (ry + 44 + MARGIN_Y));
  const centreX = width / 2;
  const centreY = height / 2;
  const nodes = [];
  const nodeById = {};
  states.forEach((state, index) => {
    const angle = index / n * Math.PI * 2 - Math.PI / 2;
    const h = nodeHeight(state);
    const w = state.sublabel ? CARD_W : STATE_W;
    const x = centreX + Math.cos(angle) * rx - w / 2;
    const y = centreY + Math.sin(angle) * ry - h / 2;
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
  const angleOf = /* @__PURE__ */ new Map();
  states.forEach((state, index) => {
    angleOf.set(state.id, index / n * Math.PI * 2 - Math.PI / 2);
  });
  const ringStep = Math.PI * 2 / n;
  const edges = [];
  for (const transition of spec.transitions) {
    const from = nodeById[transition.from];
    const to = nodeById[transition.to];
    if (!from || !to) continue;
    const variant = transition.variant ?? "main";
    const labelWidth = transition.label ? labelPillWidth(transition.label) : 0;
    if (transition.from === transition.to) {
      const startX2 = from.x + from.w * 0.35;
      const endX2 = from.x + from.w * 0.65;
      const loopY = from.y - 36;
      edges.push({
        ...transition,
        id: edgeId(transition),
        variant,
        d: `M ${startX2} ${from.y} C ${startX2} ${loopY - 14}, ${endX2} ${loopY - 14}, ${endX2} ${from.y}`,
        labelX: from.cx,
        labelY: loopY - 24,
        labelWidth,
        startX: startX2,
        startY: from.y,
        endX: endX2,
        endY: from.y,
        fromSide: "top",
        toSide: "top",
        arrowEnd: true
      });
      continue;
    }
    const a = angleOf.get(from.id) ?? 0;
    const b = angleOf.get(to.id) ?? 0;
    let delta = Math.abs(b - a);
    if (delta > Math.PI) delta = Math.PI * 2 - delta;
    const isNeighbour = delta <= ringStep * 1.05;
    const midX = (from.cx + to.cx) / 2;
    const midY = (from.cy + to.cy) / 2;
    const outX = midX - centreX;
    const outY = midY - centreY;
    const outLen = Math.hypot(outX, outY) || 1;
    const bow = isNeighbour ? 72 : -Math.min(64, outLen * 0.22);
    const chordX = to.cx - from.cx;
    const chordY = to.cy - from.cy;
    const chordLen = Math.hypot(chordX, chordY) || 1;
    const sideOffset = isNeighbour ? 18 : 30;
    const controlX = midX + outX / outLen * bow + -chordY / chordLen * sideOffset;
    const controlY = midY + outY / outLen * bow + chordX / chordLen * sideOffset;
    const [startX, startY] = borderPoint(from, controlX, controlY);
    const [endX, endY] = borderPoint(to, controlX, controlY);
    const labelX = 0.25 * startX + 0.5 * controlX + 0.25 * endX;
    const labelY = 0.25 * startY + 0.5 * controlY + 0.25 * endY;
    edges.push({
      ...transition,
      id: edgeId(transition),
      variant,
      d: `M ${startX} ${startY} Q ${controlX} ${controlY}, ${endX} ${endY}`,
      labelX,
      labelY,
      labelWidth,
      startX,
      startY,
      endX,
      endY,
      fromSide: Math.abs(endX - startX) >= Math.abs(endY - startY) ? endX > startX ? "right" : "left" : endY > startY ? "bottom" : "top",
      toSide: Math.abs(endX - startX) >= Math.abs(endY - startY) ? endX > startX ? "left" : "right" : endY > startY ? "top" : "bottom",
      arrowEnd: true
    });
  }
  return { width, height, nodes, edges, decisions: [], continuations: [], nodeById };
}

// src/layouts/er.ts
var TABLE_W = 240;
var HEADER_H2 = 26;
var ROW_H = 22;
var FOOT_PAD = 10;
var GRID_GAP_X = 112;
var GRID_GAP_Y = 88;
var MARGIN_X4 = 72;
var MARGIN_TOP = 64;
var BOTTOM_PAD3 = 64;
var COLS = 3;
var tableHeight = (fields) => HEADER_H2 + fields.length * ROW_H + FOOT_PAD;
function layoutEr(spec) {
  const cols = Math.min(COLS, Math.max(1, spec.entities.length));
  const rows = Math.ceil(spec.entities.length / cols);
  const rowHeights = [];
  for (let row = 0; row < rows; row += 1) {
    const members = spec.entities.slice(row * cols, row * cols + cols);
    rowHeights.push(Math.max(...members.map((entity) => tableHeight(entity.fields))));
  }
  const rowTops = [];
  let cursorY = MARGIN_TOP;
  for (let row = 0; row < rows; row += 1) {
    rowTops.push(cursorY);
    cursorY += rowHeights[row] + GRID_GAP_Y;
  }
  const height = cursorY - GRID_GAP_Y + BOTTOM_PAD3;
  const usedCols = Math.min(cols, spec.entities.length);
  const width = MARGIN_X4 * 2 + usedCols * TABLE_W + (usedCols - 1) * GRID_GAP_X;
  const xFor = (col) => MARGIN_X4 + col * (TABLE_W + GRID_GAP_X);
  const nodes = [];
  const nodeById = {};
  const colOf = /* @__PURE__ */ new Map();
  const rowOf = /* @__PURE__ */ new Map();
  spec.entities.forEach((entity, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const h = tableHeight(entity.fields);
    const x = xFor(col);
    const y = rowTops[row];
    colOf.set(entity.id, col);
    rowOf.set(entity.id, row);
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
  const anchorY = (node) => node.y + HEADER_H2 / 2;
  const edges = [];
  for (const relation of spec.relations) {
    const from = nodeById[relation.from];
    const to = nodeById[relation.to];
    if (!from || !to) continue;
    const variant = relation.variant ?? "main";
    const labelWidth = relation.label ? labelPillWidth(relation.label) : 0;
    const fromCol = colOf.get(relation.from) ?? 0;
    const toCol = colOf.get(relation.to) ?? 0;
    const fromRow = rowOf.get(relation.from) ?? 0;
    const toRow = rowOf.get(relation.to) ?? 0;
    let d;
    let labelX;
    let labelY;
    let startX;
    let startY;
    let endX;
    let endY;
    let fromSide;
    let toSide;
    let routePoints;
    if (fromRow === toRow && Math.abs(fromCol - toCol) === 1) {
      const rightward = toCol > fromCol;
      startX = rightward ? from.x + from.w : from.x;
      endX = rightward ? to.x : to.x + to.w;
      startY = anchorY(from);
      endY = anchorY(to);
      const controlX = (startX + endX) / 2;
      d = `M ${startX} ${startY} C ${controlX} ${startY}, ${controlX} ${endY}, ${endX} ${endY}`;
      labelX = (startX + endX) / 2;
      labelY = (startY + endY) / 2;
      fromSide = rightward ? "right" : "left";
      toSide = rightward ? "left" : "right";
    } else if (fromRow === toRow) {
      const rightward = toCol > fromCol;
      startX = rightward ? from.x + from.w : from.x;
      endX = rightward ? to.x : to.x + to.w;
      startY = anchorY(from);
      endY = anchorY(to);
      const corridorY = rowTops[fromRow] + rowHeights[fromRow] + GRID_GAP_Y / 2;
      const gapA = rightward ? from.x + from.w + GRID_GAP_X / 2 : from.x - GRID_GAP_X / 2;
      const gapB = rightward ? to.x - GRID_GAP_X / 2 : to.x + to.w + GRID_GAP_X / 2;
      routePoints = [
        [startX, startY],
        [gapA, startY],
        [gapA, corridorY],
        [gapB, corridorY],
        [gapB, endY],
        [endX, endY]
      ];
      d = roundedPolyline(routePoints, LANE_R);
      labelX = (gapA + gapB) / 2;
      labelY = corridorY;
      fromSide = rightward ? "right" : "left";
      toSide = rightward ? "left" : "right";
    } else if (fromCol === toCol && Math.abs(fromRow - toRow) === 1) {
      const movingDown = toRow > fromRow;
      startX = from.cx;
      endX = to.cx;
      startY = movingDown ? from.y + from.h : from.y;
      endY = movingDown ? to.y : to.y + to.h;
      const controlY = Math.abs(endY - startY) * 0.5;
      d = movingDown ? `M ${startX} ${startY} C ${startX} ${startY + controlY}, ${endX} ${endY - controlY}, ${endX} ${endY}` : `M ${startX} ${startY} C ${startX} ${startY - controlY}, ${endX} ${endY + controlY}, ${endX} ${endY}`;
      labelX = (startX + endX) / 2;
      labelY = (startY + endY) / 2;
      fromSide = movingDown ? "bottom" : "top";
      toSide = movingDown ? "top" : "bottom";
    } else {
      const colDelta = toCol - fromCol;
      startY = anchorY(from);
      endY = anchorY(to);
      if (Math.abs(colDelta) <= 1) {
        const gapX = colDelta === 0 ? fromCol < usedCols - 1 ? xFor(fromCol) + TABLE_W + GRID_GAP_X / 2 : xFor(fromCol) - GRID_GAP_X / 2 : Math.max(xFor(fromCol), xFor(toCol)) - GRID_GAP_X / 2;
        startX = gapX > from.cx ? from.x + from.w : from.x;
        endX = gapX > to.cx ? to.x + to.w : to.x;
        routePoints = [
          [startX, startY],
          [gapX, startY],
          [gapX, endY],
          [endX, endY]
        ];
        labelX = gapX;
        labelY = (startY + endY) / 2;
      } else {
        const rightward = colDelta > 0;
        const gapA = rightward ? xFor(fromCol) + TABLE_W + GRID_GAP_X / 2 : xFor(fromCol) - GRID_GAP_X / 2;
        const gapB = rightward ? xFor(toCol) - GRID_GAP_X / 2 : xFor(toCol) + TABLE_W + GRID_GAP_X / 2;
        const corridorRow = Math.min(fromRow, toRow);
        const corridorY = rowTops[corridorRow] + rowHeights[corridorRow] + GRID_GAP_Y / 2;
        startX = rightward ? from.x + from.w : from.x;
        endX = rightward ? to.x : to.x + to.w;
        routePoints = [
          [startX, startY],
          [gapA, startY],
          [gapA, corridorY],
          [gapB, corridorY],
          [gapB, endY],
          [endX, endY]
        ];
        labelX = (gapA + gapB) / 2;
        labelY = corridorY;
      }
      d = roundedPolyline(routePoints, LANE_R);
      fromSide = startX > from.cx ? "right" : "left";
      toSide = endX > to.cx ? "right" : "left";
    }
    edges.push({
      ...relation,
      id: edgeId(relation),
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
  return { width, height, nodes, edges, decisions: [], continuations: [], nodeById };
}

// src/layouts/timeline.ts
var MARGIN_X5 = 96;
var TOP_PAD = 56;
var BOTTOM_PAD4 = 64;
var EVENT_W = 240;
var SPINE_OVERHANG = 72;
function layoutTimeline(spec) {
  const n = Math.max(1, spec.events.length);
  const edgePad = MARGIN_X5 + EVENT_W / 2;
  const width = edgePad * 2 + TIMELINE_EVENT_GAP * (n - 1);
  const spineY = TOP_PAD + TIMELINE_ALT_OFFSET + 40;
  const height = spineY + TIMELINE_ALT_OFFSET + 40 + BOTTOM_PAD4;
  const nodes = [];
  const nodeById = {};
  spec.events.forEach((event, index) => {
    const above = index % 2 === 0;
    const x = edgePad + TIMELINE_EVENT_GAP * index;
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
  const firstX = edgePad - SPINE_OVERHANG;
  const lastX = edgePad + TIMELINE_EVENT_GAP * (n - 1) + SPINE_OVERHANG;
  const edges = [];
  const spine = {
    id: "timeline-spine",
    from: "",
    to: "",
    variant: "main",
    dashed: true,
    d: `M ${firstX} ${spineY} L ${lastX} ${spineY}`,
    labelX: 0,
    labelY: 0,
    labelWidth: 0,
    startX: firstX,
    startY: spineY,
    endX: lastX,
    endY: spineY,
    fromSide: "left",
    toSide: "right",
    arrowEnd: true,
    strokeWidth: 1.1
  };
  edges.push(spine);
  return { width, height, nodes, edges, decisions: [], continuations: [], nodeById };
}

// src/layouts/swimlane.ts
var TOP_PAD2 = 56;
var BOTTOM_PAD5 = 56;
var NODE_GAP = 96;
var STACK_GAP = 24;
function layoutSwimlane(spec) {
  const laneIds = spec.lanes.map((lane) => lane.id);
  const { forward } = splitBackEdges(spec.nodes, spec.edges);
  const columnOf = topologicalLevels(spec.nodes, forward);
  const maxColumn = Math.max(0, ...columnOf.values());
  const xForColumn = (column) => SWIMLANE_HEADER_W + SWIMLANE_PAD + column * (CARD_W + NODE_GAP);
  const width = xForColumn(maxColumn) + CARD_W + SWIMLANE_PAD * 2;
  const byLane = /* @__PURE__ */ new Map();
  for (const node of spec.nodes) {
    const column = columnOf.get(node.id) ?? 0;
    const laneColumns = byLane.get(node.lane) ?? /* @__PURE__ */ new Map();
    const cell = laneColumns.get(column) ?? [];
    cell.push({
      ...node,
      band: 0,
      w: CARD_W,
      h: nodeHeight(node),
      x: 0,
      y: 0,
      cx: 0,
      cy: 0
    });
    laneColumns.set(column, cell);
    byLane.set(node.lane, laneColumns);
  }
  const laneHeights = laneIds.map((id) => {
    const laneColumns = byLane.get(id);
    if (!laneColumns) return 88;
    let tallest = 0;
    for (const cell of laneColumns.values()) {
      const stackH = cell.reduce((sum, member) => sum + member.h, 0) + (cell.length - 1) * STACK_GAP;
      tallest = Math.max(tallest, stackH);
    }
    return Math.max(88, tallest + SWIMLANE_ROW_PAD);
  });
  let cursorY = TOP_PAD2;
  const laneTop = /* @__PURE__ */ new Map();
  laneIds.forEach((id, index) => {
    laneTop.set(id, cursorY);
    cursorY += laneHeights[index];
  });
  const height = cursorY + BOTTOM_PAD5;
  const containers = [];
  spec.lanes.forEach((lane, index) => {
    containers.push({
      id: lane.id,
      label: lane.label,
      kind: lane.kind,
      x: 0,
      y: laneTop.get(lane.id) ?? 0,
      w: width,
      h: laneHeights[index]
    });
  });
  const nodes = [];
  const nodeById = {};
  laneIds.forEach((laneId, laneIndex) => {
    const laneColumns = byLane.get(laneId);
    if (!laneColumns) return;
    const top = laneTop.get(laneId) ?? 0;
    const laneH = laneHeights[laneIndex];
    for (const [column, cell] of laneColumns) {
      const x = xForColumn(column);
      const stackH = cell.reduce((sum, member) => sum + member.h, 0) + (cell.length - 1) * STACK_GAP;
      let memberY = top + (laneH - stackH) / 2;
      for (const member of cell) {
        const cy = memberY + member.h / 2 + (member.nudge ?? 0);
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
        memberY += member.h + STACK_GAP;
      }
    }
  });
  const edges = [];
  for (const edge of spec.edges) {
    const from = nodeById[edge.from];
    const to = nodeById[edge.to];
    if (!from || !to) continue;
    const variant = edge.variant ?? "main";
    const labelWidth = edge.label ? labelPillWidth(edge.label) : 0;
    const sameLane = from.band === to.band;
    const sameColumn = (columnOf.get(edge.from) ?? 0) === (columnOf.get(edge.to) ?? 0);
    const crossesLane = !sameLane;
    let d;
    let startX;
    let startY;
    let endX;
    let endY;
    let fromSide;
    let toSide;
    if (sameColumn && crossesLane) {
      const movingDown = to.cy > from.cy;
      startX = from.cx;
      startY = movingDown ? from.y + from.h : from.y;
      endX = to.cx;
      endY = movingDown ? to.y : to.y + to.h;
      const controlY = (startY + endY) / 2;
      d = `M ${startX} ${startY} C ${startX} ${controlY}, ${endX} ${controlY}, ${endX} ${endY}`;
      fromSide = movingDown ? "bottom" : "top";
      toSide = movingDown ? "top" : "bottom";
    } else {
      const rightward = to.cx > from.cx;
      startX = rightward ? from.x + from.w : from.x;
      startY = from.cy;
      endX = rightward ? to.x : to.x + to.w;
      endY = to.cy;
      const controlX = (startX + endX) / 2;
      d = `M ${startX} ${startY} C ${controlX} ${startY}, ${controlX} ${endY}, ${endX} ${endY}`;
      fromSide = rightward ? "right" : "left";
      toSide = rightward ? "left" : "right";
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
      fromSide,
      toSide,
      arrowEnd: crossesLane ? true : void 0
    });
  }
  return {
    width,
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
