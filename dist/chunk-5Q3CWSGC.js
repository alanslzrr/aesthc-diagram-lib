import {
  createEditorStore
} from "./chunk-3T2LMA7P.js";
import {
  isNodeLocked,
  resolveDocument
} from "./chunk-AVTVKBIV.js";
import {
  createDocument
} from "./chunk-3MHLUDWC.js";
import {
  edgesOf,
  failure,
  issue,
  nodesOf,
  success,
  validateDocument
} from "./chunk-6NELNSRC.js";

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
    return result.sort((a, b) => a - b);
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
  const segmentClear = (ax, ay, bx, by) => {
    const minX = Math.min(ax, bx), maxX = Math.max(ax, bx), minY = Math.min(ay, by), maxY = Math.max(ay, by);
    for (const obstacle of obstacles) {
      if (maxX < obstacle.x || minX > obstacle.x + obstacle.w) continue;
      if (maxY < obstacle.y || minY > obstacle.y + obstacle.h) continue;
      return false;
    }
    return true;
  };
  const goalKey = key(goalIndex[0], goalIndex[1]);
  const startKey = key(startIndex[0], startIndex[1]);
  const g = /* @__PURE__ */ new Map([[startKey, 0]]);
  const came = /* @__PURE__ */ new Map();
  const open = /* @__PURE__ */ new Map([[startKey, 0]]);
  const closed = /* @__PURE__ */ new Set();
  const previousDirection = /* @__PURE__ */ new Map();
  const neighborsOf = (x, y) => {
    const result = [];
    const connects = (nx, ny) => reachable(nx, ny) && segmentClear(axisX[x], axisY[y], axisX[nx], axisY[ny]);
    if (x + 1 < axisX.length && connects(x + 1, y)) result.push([x + 1, y, "h"]);
    if (x - 1 >= 0 && connects(x - 1, y)) result.push([x - 1, y, "h"]);
    if (y + 1 < axisY.length && connects(x, y + 1)) result.push([x, y + 1, "v"]);
    if (y - 1 >= 0 && connects(x, y - 1)) result.push([x, y - 1, "v"]);
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
  if (document.revision !== options.expectedRevision) return failure("revision.stale");
  if (result.baseRevision !== document.revision) return failure("revision.stale");
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
  for (const id of result.scene.zOrder ?? [])
    if (!known.has(id)) return failure("reference.missing");
  const next = structuredClone(current);
  next.scene = {
    ...next.scene,
    mode: "manual",
    nodes: { ...next.scene.nodes, ...structuredClone(placed) },
    zOrder: result.scene.zOrder ?? next.scene.zOrder
  };
  const validated = validateDocument(next);
  if (!validated.ok) return validated;
  return success(validated.value);
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

// src/editor-core/renderers.ts
function createRendererRegistry() {
  const renderers = /* @__PURE__ */ new Map();
  return {
    register(renderer) {
      if (!renderer.typeKey || typeof renderer.validate !== "function")
        return failure("renderer.invalid");
      if (renderers.has(renderer.typeKey)) return failure("renderer.duplicate");
      renderers.set(renderer.typeKey, renderer);
      return success(void 0);
    },
    resolve(typeKey) {
      return renderers.get(typeKey);
    },
    typeKeys() {
      return [...renderers.keys()];
    }
  };
}
function validateCustomPayload(registry, payload) {
  if (!payload || typeof payload !== "object") return failure("renderer.invalid");
  const candidate = payload;
  if (typeof candidate.typeKey !== "string" || !candidate.typeKey)
    return failure("renderer.invalid");
  const renderer = registry.resolve(candidate.typeKey);
  if (!renderer) return failure("renderer.unsupported");
  const checked = renderer.validate(candidate.data);
  if (!checked.ok) return checked;
  return success({ renderer, data: checked.value });
}
function renderCustomNode(registry, payload, context) {
  const validated = validateCustomPayload(registry, payload);
  if (!validated.ok) return validated;
  const size = validated.value.renderer.measure(validated.value.data, {
    fontSize: context.fontSize
  });
  if (!Number.isFinite(size.width) || !Number.isFinite(size.height) || size.width <= 0 || size.height <= 0)
    return failure("renderer.measure");
  const svg = validated.value.renderer.renderSvg(validated.value.data, context);
  if (typeof svg !== "string" || !svg.trim()) return failure("renderer.empty");
  return success({
    svg,
    width: size.width,
    height: size.height,
    typeKey: validated.value.renderer.typeKey
  });
}

// src/editor-core/providers.ts
function createLayoutProviderRegistry() {
  const providers = /* @__PURE__ */ new Map();
  return {
    register(provider) {
      if (!provider.id || typeof provider.run !== "function") return failure("provider.invalid");
      if (providers.has(provider.id)) return failure("provider.duplicate");
      providers.set(provider.id, provider);
      return success(void 0);
    },
    get(id) {
      return providers.get(id);
    },
    ids() {
      return [...providers.keys()];
    }
  };
}
async function runRegisteredLayout(document, registry, providerId, options) {
  const provider = registry.get(providerId);
  if (!provider) return failure("provider.unknown");
  const requestId = options.requestId ?? `${providerId}:${document.revision}`;
  const controller = new AbortController();
  options.signal?.addEventListener("abort", () => controller.abort(), { once: true });
  let scene;
  try {
    scene = await provider.run({
      document,
      requestId,
      signal: controller.signal
    });
  } catch (error) {
    return success({
      status: "rejected",
      document,
      diagnostics: [
        error instanceof Error && error.message === "operation.aborted" ? "operation.aborted" : "provider.failed"
      ]
    });
  }
  if (options.signal?.aborted) return failure("operation.aborted");
  const currentRevision = options.latestRevision?.() ?? document.revision;
  if (currentRevision !== options.expectedRevision)
    return success({ status: "rejected", document, diagnostics: ["revision.stale"] });
  if (requestId !== options.latestRequestId())
    return success({ status: "rejected", document, diagnostics: ["provider.stale"] });
  const applied = applyLayoutResult(
    document,
    { requestId, baseRevision: options.expectedRevision, scene },
    { expectedRevision: options.expectedRevision }
  );
  if (!applied.ok)
    return success({
      status: "rejected",
      document,
      diagnostics: applied.diagnostics.map((diagnostic) => diagnostic.code)
    });
  return success({ status: "applied", document: applied.value, diagnostics: [] });
}

// src/editor-core/evidence.ts
var commitPattern = /^[0-9a-f]{7,64}$/i;
function referenceOf(entry) {
  if (!entry || typeof entry !== "object") return failure("evidence.invalid");
  const candidate = entry;
  if (typeof candidate.id !== "string" || !candidate.id) return failure("evidence.invalid");
  if (typeof candidate.repository !== "string") return failure("evidence.invalid");
  try {
    const url = new URL(candidate.repository);
    if (url.protocol !== "https:" || url.username || url.password) throw Error();
  } catch {
    return failure("url.scheme");
  }
  if (typeof candidate.path !== "string" || !candidate.path || candidate.path.startsWith("/") || candidate.path.includes("\\") || candidate.path.split("/").some((segment) => segment === ".." || segment === "."))
    return failure("evidence.path");
  if (typeof candidate.commit !== "string" || !commitPattern.test(candidate.commit))
    return failure("evidence.commit");
  if (!Number.isSafeInteger(candidate.startLine) || !Number.isSafeInteger(candidate.endLine) || (candidate.startLine ?? 0) < 1 || (candidate.endLine ?? 0) < (candidate.startLine ?? 0))
    return failure("evidence.range");
  if (candidate.blobSha !== void 0 && !/^[0-9a-f]{40,64}$/i.test(candidate.blobSha))
    return failure("evidence.commit");
  return success({
    id: candidate.id,
    repository: candidate.repository,
    commit: candidate.commit,
    path: candidate.path,
    startLine: candidate.startLine,
    endLine: candidate.endLine,
    ...candidate.blobSha ? { blobSha: candidate.blobSha } : {}
  });
}
function declaredEvidence(document) {
  const checked = validateDocument(document);
  if (!checked.ok) return checked;
  const entries = [];
  for (const metadata of Object.values(checked.value.metadata.nodes))
    for (const evidence of metadata.evidence ?? []) {
      const parsed = referenceOf(evidence);
      if (!parsed.ok) return parsed;
      entries.push(parsed.value);
    }
  for (const metadata of Object.values(checked.value.metadata.edges))
    for (const evidence of metadata.evidence ?? []) {
      const parsed = referenceOf(evidence);
      if (!parsed.ok) return parsed;
      entries.push(parsed.value);
    }
  return success(entries);
}
async function verifyEvidence(document, verifier) {
  const declared = declaredEvidence(document);
  if (!declared.ok) return declared;
  const receipts = [];
  for (const entry of declared.value) {
    let status = "unavailable";
    let detail;
    try {
      const outcome = await verifier.verify({
        repository: entry.repository,
        commit: entry.commit,
        path: entry.path,
        ...entry.blobSha ? { blobSha: entry.blobSha } : {}
      });
      status = outcome === "match" ? "verified" : outcome === "mismatch" ? "mismatch" : "unavailable";
      if (outcome !== "match") detail = `verifier:${outcome}`;
    } catch {
      status = "unavailable";
      detail = "verifier:error";
    }
    receipts.push({ id: entry.id, status, declared: entry, ...detail ? { detail } : {} });
  }
  return success(receipts);
}
function evidenceDiagnostics(document) {
  const declared = declaredEvidence(document);
  if (!declared.ok) return declared;
  return success([]);
}

// src/editor-core/profiles.ts
function validateDeploymentProfile(input, options = {}) {
  const checked = validateDocument(input);
  if (!checked.ok) return checked;
  const document = checked.value;
  const enabled = options.enabled === true;
  if (!enabled)
    return success({
      enabled: false,
      facts: { nodes: 0, regions: 0, crossRegionEdges: 0 },
      diagnostics: []
    });
  const diagnostics = [];
  const regions = /* @__PURE__ */ new Set();
  const regionOf = (nodeId) => {
    const declared = (document.metadata.nodes[nodeId]?.tags ?? []).filter((tag) => tag.startsWith("region:")).map((tag) => tag.slice("region:".length)).filter(Boolean);
    for (const region of declared) regions.add(region);
    return declared;
  };
  const nodeIds = nodesOf(document.spec).map((node) => node.id);
  for (const nodeId of nodeIds) {
    const metadata = document.metadata.nodes[nodeId];
    if (!metadata?.owner)
      diagnostics.push({
        ...issue("profile.owner-missing"),
        subject: { kind: "node", id: nodeId }
      });
    if (metadata?.visibility === "public")
      diagnostics.push({
        ...issue("profile.public-entity"),
        subject: { kind: "node", id: nodeId }
      });
    if (regionOf(nodeId).length > 1)
      diagnostics.push({
        ...issue("profile.region-conflict"),
        subject: { kind: "node", id: nodeId }
      });
  }
  let crossRegionEdges = 0;
  for (const edge of edgesOf(document.spec)) {
    const fromRegion = regionOf(edge.from)[0];
    const toRegion = regionOf(edge.to)[0];
    if (!fromRegion || !toRegion || fromRegion === toRegion) continue;
    crossRegionEdges += 1;
    if (!document.metadata.edges[edge.id]?.crossing)
      diagnostics.push({
        ...issue("profile.crossing-missing"),
        subject: { kind: "edge", id: edge.id }
      });
  }
  return success({
    enabled: true,
    facts: {
      nodes: nodeIds.length,
      regions: regions.size,
      crossRegionEdges
    },
    diagnostics
  });
}

export {
  convertToGraph,
  applyTransaction,
  routeOrthogonal,
  applyLayoutResult,
  runLayoutProvider,
  createLayoutProvider,
  createRendererRegistry,
  validateCustomPayload,
  renderCustomNode,
  createLayoutProviderRegistry,
  runRegisteredLayout,
  declaredEvidence,
  verifyEvidence,
  evidenceDiagnostics,
  validateDeploymentProfile
};
