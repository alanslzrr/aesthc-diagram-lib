import {
  createEditorStore,
  createFragment,
  fitViewport,
  pasteFragment,
  screenToWorld,
  worldToScreen,
  zoomAt
} from "../chunk-6SRL6DX7.js";
import {
  getAdapter,
  isNodeLocked,
  relayoutScene,
  resolveDocument
} from "../chunk-EAOYH4UI.js";
import "../chunk-VUW7SRON.js";
import "../chunk-P7FW66WE.js";
import {
  canonicalizeContent,
  createDocument,
  defaultPresentation,
  exportLegacySpec,
  importDocument,
  serializeDocument
} from "../chunk-3MHLUDWC.js";
import "../chunk-QVERY2JP.js";
import {
  DEFAULT_LIMITS,
  edgesOf,
  failure,
  nodesOf,
  success,
  validateDocument,
  validateEditorSpec
} from "../chunk-6NELNSRC.js";
import "../chunk-UHROM3FO.js";
import "../chunk-YKPE23VO.js";
import "../chunk-TVEV5XLW.js";

// src/editor-core/conversion.ts
function convertToGraph(document, options) {
  const checked = validateDocument(document);
  if (!checked.ok) return checked;
  if (options.id === document.id) return failure("conversion.identity");
  const resolved = resolveDocument(document, { quality: "edit", requestId: "convert" });
  if (!resolved.ok) return resolved;
  const spec = {
    type: "graph",
    caption: document.spec.caption,
    legend: structuredClone(document.spec.legend),
    nodes: nodesOf(document.spec).map((n) => {
      const placed = resolved.value.layout.nodeById[n.id];
      return {
        id: n.id,
        label: n.label,
        description: "description" in n ? n.description ?? "" : "",
        ...n.kind ? { kind: n.kind } : {},
        ..."sublabel" in n && n.sublabel ? { sublabel: n.sublabel } : {},
        ..."fields" in n ? { fields: structuredClone(n.fields), shape: "table" } : {},
        ...placed.initial ? { initial: true } : {},
        ...placed.final ? { final: true } : {}
      };
    }),
    edges: edgesOf(document.spec).map((e) => ({
      id: e.id,
      from: e.from,
      to: e.to,
      ...e.label ? { label: e.label } : {},
      ...e.variant ? { variant: e.variant } : {},
      ...e.dashed ? { dashed: true } : {}
    }))
  };
  const created = createDocument(spec, { id: options.id, locale: document.locale });
  if (!created.ok) return created;
  const doc = created.value, losses = [];
  doc.scene.mode = "manual";
  doc.scene.nodes = Object.fromEntries(
    resolved.value.layout.nodes.map((n) => [
      n.id,
      { x: n.x, y: n.y, width: Math.max(96, n.w), height: Math.max(48, n.h), locked: false }
    ])
  );
  doc.presentation = structuredClone(document.presentation);
  doc.metadata = structuredClone(document.metadata);
  if (document.spec.type !== "graph")
    losses.push({
      path: "/spec/type",
      reason: "Type-specific ordering, membership and layout semantics become explicit graph geometry."
    });
  if (document.spec.type === "sequence")
    losses.push({
      path: "/spec/messages",
      reason: "Message order, lifelines and activations are not sequence semantics in a graph."
    });
  if (document.spec.type === "band")
    losses.push({
      path: "/spec/bands",
      reason: "Bands, decisions and continuations are not converted to graph entities."
    });
  if (document.spec.type === "swimlane")
    losses.push({
      path: "/spec/lanes",
      reason: "Lane membership is not converted to graph containment."
    });
  if (document.spec.type === "timeline")
    losses.push({
      path: "/spec/events",
      reason: "Authored time order is not inferred as directed edges."
    });
  if (document.spec.type === "graph" && document.spec.nodes.some((n) => n.ports || n.renderer))
    return failure("conversion.already-graph");
  if (document.scene.groups.length || Object.keys(document.scene.routes).length)
    losses.push({
      path: "/scene",
      reason: "Manual routing, locks and group containment are not carried into the new graph."
    });
  if (document.views.length || document.story.length)
    losses.push({
      path: "/views",
      reason: "Views and story steps are not copied into a newly identified document."
    });
  if (Object.keys(document.extensions).length)
    losses.push({
      path: "/extensions",
      reason: "Extension data is not implicitly reinterpreted for a different diagram type."
    });
  const valid = validateDocument(doc);
  return valid.ok ? success({ document: doc, sourceDocumentId: document.id, losses }) : valid;
}

// src/editor-core/transaction.ts
function applyTransaction(document, transaction, permissions) {
  const store = createEditorStore({ document, permissions });
  try {
    return store.dispatch(transaction);
  } finally {
    store.dispose();
  }
}

// src/editor-core/router.ts
function routeOrthogonal(request) {
  const clearance = request.clearance ?? 12;
  const maxBends = request.maxBends ?? 24;
  const maxStates = request.maxStates ?? 2e4;
  const stub = request.stub ?? 16;
  const grow = (o) => ({
    x: o.x - clearance,
    y: o.y - clearance,
    w: o.w + clearance * 2,
    h: o.h + clearance * 2
  });
  const obstacles = request.obstacles.map(grow);
  const stubbed = (point, side) => {
    if (side === "left") return { x: point.x - stub, y: point.y };
    if (side === "right") return { x: point.x + stub, y: point.y };
    if (side === "top") return { x: point.x, y: point.y - stub };
    if (side === "bottom") return { x: point.x, y: point.y + stub };
    return { ...point };
  };
  const start = stubbed(request.from, request.fromSide);
  const goal = stubbed(request.to, request.toSide);
  const inside = (x, y) => obstacles.some((o) => x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h);
  if (inside(start.x, start.y) || inside(goal.x, goal.y)) return failure("router.budget");
  const xs = [.../* @__PURE__ */ new Set([start.x, goal.x, ...obstacles.flatMap((o) => [o.x, o.x + o.w])])].sort(
    (a, b) => a - b
  );
  const ys = [.../* @__PURE__ */ new Set([start.y, goal.y, ...obstacles.flatMap((o) => [o.y, o.y + o.h])])].sort(
    (a, b) => a - b
  );
  const margin = clearance * 2 + stub;
  const withMidpoints = (values) => {
    const result = [];
    for (let i = 0; i < values.length; i++) {
      result.push(values[i]);
      if (i + 1 < values.length && values[i + 1] > values[i])
        result.push((values[i] + values[i + 1]) / 2);
    }
    result.push(values[0] - margin, values[values.length - 1] + margin);
    return result;
  };
  const axisX = withMidpoints(xs);
  const axisY = withMidpoints(ys);
  const xi = new Map(axisX.map((value, index) => [value, index]));
  const yi = new Map(axisY.map((value, index) => [value, index]));
  const startIndex = [xi.get(start.x), yi.get(start.y)];
  const goalIndex = [xi.get(goal.x), yi.get(goal.y)];
  const key = (x, y) => x * axisY.length + y;
  const node = (index) => [
    Math.floor(index / axisY.length),
    index % axisY.length
  ];
  const reachable = (x, y) => !inside(axisX[x], axisY[y]);
  const goalKey = key(goalIndex[0], goalIndex[1]);
  const startKey = key(startIndex[0], startIndex[1]);
  const g = /* @__PURE__ */ new Map([[startKey, 0]]);
  const came = /* @__PURE__ */ new Map();
  const open = /* @__PURE__ */ new Map([[startKey, 0]]);
  const closed = /* @__PURE__ */ new Set();
  const previousDirection = /* @__PURE__ */ new Map();
  const neighborsOf = (x, y) => {
    const result = [];
    if (x + 1 < axisX.length && reachable(x + 1, y)) result.push([x + 1, y, "h"]);
    if (x - 1 >= 0 && reachable(x - 1, y)) result.push([x - 1, y, "h"]);
    if (y + 1 < axisY.length && reachable(x, y + 1)) result.push([x, y + 1, "v"]);
    if (y - 1 >= 0 && reachable(x, y - 1)) result.push([x, y - 1, "v"]);
    return result;
  };
  const heuristic = (x, y) => Math.abs(axisX[x] - axisX[goalIndex[0]]) + Math.abs(axisY[y] - axisY[goalIndex[1]]);
  let states = 0;
  let settled = startKey;
  while (open.size > 0 && states < maxStates) {
    const current = [...open.entries()].sort((a, b) => a[1] - b[1] || a[0] - b[0])[0];
    const [currentKey] = current;
    open.delete(currentKey);
    closed.add(currentKey);
    states += 1;
    if (currentKey === goalKey) {
      settled = currentKey;
      break;
    }
    const [cx, cy] = node(currentKey);
    for (const [nx, ny, direction] of neighborsOf(cx, cy)) {
      const neighbor = key(nx, ny);
      if (closed.has(neighbor)) continue;
      const step = Math.abs(axisX[nx] - axisX[cx]) + Math.abs(axisY[ny] - axisY[cy]);
      const previous = previousDirection.get(currentKey);
      const bendCost = previous !== void 0 && previous !== direction ? 96 : 0;
      const tentative = g.get(currentKey) + step + bendCost;
      const existing = open.get(neighbor);
      if (existing === void 0 || tentative < g.get(neighbor)) {
        g.set(neighbor, tentative);
        open.set(neighbor, tentative + heuristic(nx, ny));
        came.set(neighbor, [currentKey, direction]);
        previousDirection.set(neighbor, direction);
      }
    }
  }
  if (settled !== goalKey) {
    const impossible = closed.size > 0 && open.size === 0;
    return failure(impossible ? "router.impossible" : "router.budget");
  }
  const points = [];
  let cursor = goalKey;
  const directions = [];
  while (cursor !== startKey) {
    const [previous, direction] = came.get(cursor);
    const [px, py] = node(cursor);
    points.push([axisX[px], axisY[py]]);
    directions.push(direction);
    cursor = previous;
  }
  const [sx, sy] = node(startKey);
  points.push([axisX[sx], axisY[sy]]);
  points.reverse();
  directions.reverse();
  let bends = 0;
  for (let i = 1; i < directions.length; i++) if (directions[i] !== directions[i - 1]) bends += 1;
  if (bends > maxBends) return failure("router.bends");
  return success({ points, bends, states, clearance });
}

// src/editor-core/layout-provider.ts
function applyLayoutResult(document, result, options) {
  if (result.baseRevision !== options.expectedRevision) return failure("revision.stale");
  const checked = validateDocument(document);
  if (!checked.ok) return checked;
  const current = checked.value;
  const placed = result.scene.nodes;
  const known = new Set(
    current.spec.type === "graph" ? current.spec.nodes.map((n) => n.id) : current.scene.zOrder
  );
  for (const id of Object.keys(placed)) {
    if (!known.has(id)) return failure("reference.missing");
    if (isNodeLocked(current, id)) return failure("entity.locked");
  }
  const next = structuredClone(current);
  next.scene = {
    ...next.scene,
    mode: "manual",
    nodes: { ...next.scene.nodes, ...structuredClone(placed) },
    zOrder: result.scene.zOrder ?? next.scene.zOrder
  };
  return success(next);
}
async function runLayoutProvider(document, provider, options) {
  const result = await provider.run();
  if (provider.requestId !== options.latestRequestId()) return;
  if (result.requestId !== provider.requestId) return;
  const applied = applyLayoutResult(document, result, {
    expectedRevision: options.expectedRevision
  });
  if (applied.ok) options.onResult(applied.value);
  else options.onError(applied.diagnostics.map((d) => d.code).join(", "));
}
function createLayoutProvider(requestId, baseRevision, work) {
  let aborted = false;
  return {
    requestId,
    baseRevision,
    async run() {
      const scene = await work({
        get aborted() {
          return aborted;
        }
      });
      if (aborted) throw new Error("operation.aborted");
      return { requestId, baseRevision, scene };
    },
    cancel() {
      aborted = true;
    }
  };
}
export {
  DEFAULT_LIMITS,
  applyLayoutResult,
  applyTransaction,
  canonicalizeContent,
  convertToGraph,
  createDocument,
  createEditorStore,
  createFragment,
  createLayoutProvider,
  defaultPresentation,
  exportLegacySpec,
  fitViewport,
  getAdapter,
  importDocument,
  pasteFragment,
  relayoutScene,
  resolveDocument,
  routeOrthogonal,
  runLayoutProvider,
  screenToWorld,
  serializeDocument,
  validateDocument,
  validateEditorSpec,
  worldToScreen,
  zoomAt
};
