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
var textTop = (node) => node.y + 24;
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
  const gridWidth = BAND_X0 * 2 + (bands.length - 1) * BAND_PITCH + CARD_W;
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
export {
  canvasMetrics,
  layoutBand,
  textTop
};
