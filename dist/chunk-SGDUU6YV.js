import {
  applyCommand,
  getAdapter,
  pruneReferences,
  resolveDocument
} from "./chunk-FTHHFRVE.js";
import {
  canonicalizeContent,
  importDocument
} from "./chunk-3MHLUDWC.js";
import {
  edgesOf,
  failure,
  freeTypes,
  freezeData,
  inspectData,
  issue,
  limitsWith,
  nodesOf,
  pointer,
  success,
  validId,
  validateDocument,
  validateEditorSpec,
  validateSceneOnly
} from "./chunk-6NELNSRC.js";

// src/editor-core/store.ts
function validateCommandDeltas(commands, limits) {
  const issues = [];
  const inRange = (value, min, max) => typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
  const finite2 = (value, path) => {
    if (typeof value !== "number" || !Number.isFinite(value))
      issues.push({ ...issue("data.finite", path) });
  };
  const finitePoint = (point, path) => {
    finite2(point.x, `${path}/x`);
    finite2(point.y, `${path}/y`);
    if (!inRange(point.x, -1e5, 1e5) || !inRange(point.y, -1e5, 1e5))
      issues.push({ ...issue("layout.range", path) });
  };
  for (const command of commands) {
    switch (command.type) {
      case "nodes.move":
        for (const [id, point] of Object.entries(command.positions))
          finitePoint(point, `/scene/nodes/${pointer(id)}`);
        break;
      case "node.resize":
        finite2(command.size.width, `/scene/nodes/${pointer(command.id)}/width`);
        finite2(command.size.height, `/scene/nodes/${pointer(command.id)}/height`);
        if (!inRange(command.size.width, 96, 4096) || !inRange(command.size.height, 48, 4096))
          issues.push({ ...issue("layout.range", `/scene/nodes/${pointer(command.id)}`) });
        break;
      case "route.set":
        if (command.route.mode === "auto") break;
        if (command.route.points.length > limits.maxRoutePoints)
          issues.push({ ...issue("limit.route-points", `/scene/routes/${pointer(command.id)}`) });
        for (const point of command.route.points) finitePoint(point, "/scene/routes");
        if (command.route.label) finitePoint(command.route.label, "/scene/routes");
        finite2(command.route.source.offset, "/scene/routes");
        finite2(command.route.target.offset, "/scene/routes");
        break;
      case "scene.set":
        for (const [id, placement] of Object.entries(command.scene.nodes)) {
          const path = `/scene/nodes/${pointer(id)}`;
          finite2(placement.x, `${path}/x`);
          finite2(placement.y, `${path}/y`);
          finite2(placement.width, `${path}/width`);
          finite2(placement.height, `${path}/height`);
          if (!inRange(placement.x, -1e5, 1e5) || !inRange(placement.y, -1e5, 1e5) || !inRange(placement.width, 96, 4096) || !inRange(placement.height, 48, 4096))
            issues.push({ ...issue("layout.range", path) });
        }
        for (const [edgeId, route] of Object.entries(command.scene.routes)) {
          if (route.mode !== "manual") continue;
          for (const point of route.points) finitePoint(point, `/scene/routes/${pointer(edgeId)}`);
        }
        break;
      case "spec.replace": {
        const checked = validateEditorSpec(command.spec, limits);
        if (!checked.ok) return [...issues, ...checked.diagnostics];
        break;
      }
      default:
        break;
    }
  }
  return issues;
}
var contentCache = /* @__PURE__ */ new WeakMap();
var bytesCache = /* @__PURE__ */ new WeakMap();
function contentOf(document) {
  let value = contentCache.get(document);
  if (value === void 0) {
    value = canonicalizeContent(document);
    contentCache.set(document, value);
  }
  return value;
}
function bytesOf(document) {
  let value = bytesCache.get(document);
  if (value === void 0) {
    value = new TextEncoder().encode(contentOf(document)).length;
    bytesCache.set(document, value);
  }
  return value;
}
var SCENE_ONLY = /* @__PURE__ */ new Set([
  "scene.set",
  "nodes.move",
  "node.resize",
  "nodes.set-lock",
  "route.set",
  "group.upsert"
]);
var SCENE_STRUCTURE = /* @__PURE__ */ new Set([
  "scene.set",
  "route.set",
  "group.upsert"
]);
var isSceneOnly = (commands) => commands.length > 0 && commands.every((command) => SCENE_ONLY.has(command.type));
function cloneSceneForCommands(scene, commands) {
  const ids = /* @__PURE__ */ new Set();
  for (const command of commands) {
    if (command.type === "nodes.move") Object.keys(command.positions).forEach((id) => ids.add(id));
    else if (command.type === "node.resize") ids.add(command.id);
    else if (command.type === "nodes.set-lock") command.ids.forEach((id) => ids.add(id));
    else return structuredClone(scene);
  }
  const nodes = { ...scene.nodes };
  for (const id of ids) if (nodes[id]) nodes[id] = { ...nodes[id] };
  return { ...scene, nodes };
}
function commandsMatchScene(scene, commands) {
  for (const command of commands) {
    switch (command.type) {
      case "nodes.move":
        for (const [id, point] of Object.entries(command.positions)) {
          const placement = scene.nodes[id];
          if (!placement || placement.x !== point.x || placement.y !== point.y) return false;
        }
        break;
      case "node.resize": {
        const placement = scene.nodes[command.id];
        if (!placement || placement.width !== command.size.width || placement.height !== command.size.height)
          return false;
        break;
      }
      case "nodes.set-lock":
        for (const id of command.ids) {
          const placement = scene.nodes[id];
          if (!placement || placement.locked !== command.locked) return false;
        }
        break;
      case "route.set":
        if (JSON.stringify(scene.routes[command.id]) !== JSON.stringify(command.route)) return false;
        break;
      case "scene.set":
        if (!sceneEquals(scene, command.scene)) return false;
        break;
      case "group.upsert":
        if (JSON.stringify(scene.groups.find((g) => g.id === command.group.id)) !== JSON.stringify(command.group))
          return false;
        break;
      case "group.remove":
        if (scene.groups.some((g) => g.id === command.id)) return false;
        break;
    }
  }
  return true;
}
function sceneEquals(a, b) {
  if (a.mode !== b.mode || a.zOrder.length !== b.zOrder.length) return false;
  for (let i = 0; i < a.zOrder.length; i++) if (a.zOrder[i] !== b.zOrder[i]) return false;
  const aNodes = Object.keys(a.nodes), bNodes = Object.keys(b.nodes);
  if (aNodes.length !== bNodes.length) return false;
  for (const id of aNodes) {
    const pa = a.nodes[id], pb = b.nodes[id];
    if (!pb || pa.x !== pb.x || pa.y !== pb.y || pa.width !== pb.width || pa.height !== pb.height || pa.locked !== pb.locked)
      return false;
  }
  if (Object.keys(a.routes).length !== Object.keys(b.routes).length) return false;
  for (const [id, route] of Object.entries(a.routes)) {
    const other = b.routes[id];
    if (!other || JSON.stringify(route) !== JSON.stringify(other)) return false;
  }
  if (a.groups.length !== b.groups.length) return false;
  for (let i = 0; i < a.groups.length; i++) {
    if (JSON.stringify(a.groups[i]) !== JSON.stringify(b.groups[i])) return false;
  }
  return true;
}
var sceneBytesCache = /* @__PURE__ */ new WeakMap();
function sceneBytes(scene) {
  let value = sceneBytesCache.get(scene);
  if (value === void 0) {
    value = new TextEncoder().encode(JSON.stringify(scene)).length;
    sceneBytesCache.set(scene, value);
  }
  return value;
}
function invalidationsFor(before, after, commands) {
  const set = /* @__PURE__ */ new Set();
  for (const command of commands) {
    switch (command.type) {
      case "scene.set":
      case "nodes.move":
      case "node.resize":
      case "nodes.set-lock":
      case "route.set":
      case "group.upsert":
      case "group.remove":
        set.add("layout");
        break;
      case "spec.replace":
        set.add("layout");
        break;
      case "presentation.set":
        set.add("style");
        set.add("layout");
        break;
      case "document.replace-content":
        set.add("layout");
        set.add("graph");
        set.add("style");
        set.add("views");
        break;
    }
  }
  const topology = (() => {
    const beforeNodes = new Set(nodesOf(before.spec).map((n) => n.id)), afterNodes = new Set(nodesOf(after.spec).map((n) => n.id));
    if (beforeNodes.size !== afterNodes.size) return true;
    for (const id of beforeNodes) if (!afterNodes.has(id)) return true;
    const beforeEdges = new Map(edgesOf(before.spec).map((e) => [e.id, e])), afterEdges = new Map(edgesOf(after.spec).map((e) => [e.id, e]));
    if (beforeEdges.size !== afterEdges.size) return true;
    for (const [id, edge] of beforeEdges) {
      const next = afterEdges.get(id);
      if (!next || next.from !== edge.from || next.to !== edge.to) return true;
    }
    return false;
  })();
  if (topology) set.add("graph");
  if (!commands.length) {
    set.add("graph");
    set.add("style");
    set.add("views");
    set.add("layout");
  }
  return [...set];
}
function affectedFor(before, after, commands) {
  const affected = [];
  for (const command of commands) {
    switch (command.type) {
      case "nodes.move":
        for (const id of Object.keys(command.positions)) affected.push({ kind: "node", id });
        break;
      case "node.resize":
        affected.push({ kind: "node", id: command.id });
        break;
      case "nodes.set-lock":
        for (const id of command.ids) affected.push({ kind: "node", id });
        break;
      case "route.set":
        affected.push({ kind: "edge", id: command.id });
        break;
      case "group.upsert":
        affected.push({ kind: "group", id: command.group.id });
        break;
      case "group.remove":
        affected.push({ kind: "group", id: command.id });
        break;
    }
  }
  if (affected.length) return affected;
  const signature = (node) => `${node.id}|${JSON.stringify(node)}`;
  const nodesBefore = new Map(nodesOf(before.spec).map((n) => [n.id, n])), nodesAfter = new Map(nodesOf(after.spec).map((n) => [n.id, n]));
  for (const [id, node] of nodesAfter) {
    const previous = nodesBefore.get(id);
    if (!previous || signature(previous) !== signature(node)) affected.push({ kind: "node", id });
  }
  for (const id of nodesBefore.keys()) if (!nodesAfter.has(id)) affected.push({ kind: "node", id });
  const edgeId = (edge) => edge.id ?? `${edge.from}->${edge.to}`;
  const edgesBefore = new Map(edgesOf(before.spec).map((e) => [edgeId(e), e])), edgesAfter = new Map(edgesOf(after.spec).map((e) => [edgeId(e), e]));
  const edgeKey = (edge) => `${edge.from}->${edge.to}|${edge.label ?? ""}|${edge.variant ?? ""}`;
  for (const [id, edge] of edgesAfter) {
    const previous = edgesBefore.get(id);
    if (!previous || edgeKey(previous) !== edgeKey(edge)) affected.push({ kind: "edge", id });
  }
  for (const id of edgesBefore.keys()) if (!edgesAfter.has(id)) affected.push({ kind: "edge", id });
  if (!affected.length) for (const id of nodesAfter.keys()) affected.push({ kind: "node", id });
  return affected;
}
function createEditorStore(options) {
  const limits = limitsWith(options.limits);
  const checked = validateDocument(options.document, limits);
  if (!checked.ok) throw new TypeError(checked.diagnostics.map((d) => d.code).join(", "));
  const permissions = { ...options.permissions };
  const historyLimits = { ...options.history ?? { maxEntries: 100, maxBytes: 8 * 1024 * 1024 } };
  if (![historyLimits.maxEntries, historyLimits.maxBytes].every(
    (n) => Number.isSafeInteger(n) && n >= 0
  ))
    throw new RangeError("Invalid history limits");
  const listeners = /* @__PURE__ */ new Set(), commits = /* @__PURE__ */ new Set();
  let past = [], future = [], pastSizes = [], futureSizes = [];
  let saved = canonicalizeContent(checked.value), savedScene = structuredClone(checked.value.scene), currentBytes = new TextEncoder().encode(canonicalizeContent(checked.value)).length, nonSceneDirty = false, disposed = false;
  let gesture;
  let snapshot = freezeData({
    document: structuredClone(checked.value),
    selection: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    tool: "select",
    dirty: false,
    canUndo: false,
    canRedo: false,
    diagnostics: [],
    draft: { kind: "none" }
  });
  const rejected = (code) => ({
    status: "rejected",
    document: snapshot.document,
    diagnostics: [issue(code)]
  });
  const noop = () => ({
    status: "noop",
    document: snapshot.document,
    diagnostics: []
  });
  function notify(patch) {
    if (disposed) return;
    snapshot = freezeData({ ...snapshot, ...patch });
    for (const listener of [...listeners]) listener();
  }
  function trim() {
    let pastBytes = pastSizes.reduce((sum, size) => sum + size, 0), futureBytes = futureSizes.reduce((sum, size) => sum + size, 0);
    while (past.length + future.length > historyLimits.maxEntries || 2 * (pastBytes + futureBytes) > historyLimits.maxBytes) {
      if (past.length) {
        past.shift();
        pastBytes -= pastSizes.shift();
      } else if (future.length) {
        future.shift();
        futureBytes -= futureSizes.shift();
      } else break;
    }
  }
  function candidate(transaction, skipValidation = false) {
    if (disposed) return failure("store.disposed");
    if (!permissions.edit) return failure("permission.edit");
    if (!skipValidation) {
      const unsafe = inspectData(transaction, { ...limits, maxBytes: limits.maxBytes * 2 });
      if (unsafe.length) return { ok: false, diagnostics: unsafe };
    }
    if (!validId(transaction.id)) return failure("id.invalid");
    if (transaction.expectedRevision !== snapshot.document.revision)
      return failure("revision.stale");
    const sceneOnly = isSceneOnly(transaction.commands);
    if (skipValidation || sceneOnly) {
      const deltaIssues = validateCommandDeltas(transaction.commands, limits);
      if (deltaIssues.length) return { ok: false, diagnostics: deltaIssues.slice(0, 100) };
    }
    let doc = sceneOnly ? {
      ...snapshot.document,
      scene: cloneSceneForCommands(snapshot.document.scene, transaction.commands)
    } : structuredClone(snapshot.document);
    for (const command of transaction.commands) {
      const result = applyCommand(doc, command);
      if (!result.ok) return result;
      doc = result.value;
    }
    if (sceneOnly) {
      if (transaction.commands.some((command) => SCENE_STRUCTURE.has(command.type)))
        return validateSceneOnly(doc, limits);
      return validateSceneOnly(doc, limits);
    }
    if (skipValidation) return success(doc);
    return validateDocument(doc, limits);
  }
  function publish(doc, commands) {
    if (snapshot.document.revision >= Number.MAX_SAFE_INTEGER) return rejected("revision.overflow");
    const before = snapshot.document;
    doc = { ...doc, revision: before.revision + 1 };
    const sceneOnly = isSceneOnly(commands);
    currentBytes = sceneOnly ? currentBytes + sceneBytes(doc.scene) - sceneBytes(before.scene) : bytesOf(doc);
    const nodeIds = new Set(nodesOf(doc.spec).map((n) => n.id)), edgeIds = new Set(edgesOf(doc.spec).map((e) => e.id)), groupIds = new Set(doc.scene.groups.map((g) => g.id));
    const selection = snapshot.selection.filter(
      (ref) => (ref.kind === "node" ? nodeIds : ref.kind === "edge" ? edgeIds : groupIds).has(ref.id)
    );
    const changes = {
      affected: affectedFor(before, doc, commands),
      invalidates: invalidationsFor(before, doc, commands)
    };
    if (!sceneOnly) nonSceneDirty = canonicalizeContent({ ...doc, scene: savedScene }) !== saved;
    gesture = void 0;
    trim();
    notify({
      document: doc,
      selection,
      dirty: sceneOnly ? nonSceneDirty || !sceneEquals(doc.scene, savedScene) : contentOf(doc) !== saved,
      canUndo: past.length > 0,
      canRedo: future.length > 0,
      diagnostics: [],
      draft: snapshot.draft.kind === "text" ? snapshot.draft : { kind: "none" }
    });
    const result = {
      status: "committed",
      document: snapshot.document,
      diagnostics: [],
      changes
    };
    for (const listener of [...commits]) listener(result);
    return result;
  }
  const store = {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      if (!disposed) listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    onCommit(listener) {
      if (!disposed) commits.add(listener);
      return () => {
        commits.delete(listener);
      };
    },
    dispatch(transaction) {
      const result = candidate(transaction);
      if (!result.ok)
        return { status: "rejected", document: snapshot.document, diagnostics: result.diagnostics };
      const sceneOnly = isSceneOnly(transaction.commands);
      const unchanged = sceneOnly ? commandsMatchScene(snapshot.document.scene, transaction.commands) : contentOf(result.value) === contentOf(snapshot.document);
      if (unchanged) return noop();
      if (snapshot.document.revision >= Number.MAX_SAFE_INTEGER)
        return rejected("revision.overflow");
      const entryBytes = sceneOnly ? 2 * currentBytes + sceneBytes(result.value.scene) - sceneBytes(snapshot.document.scene) : bytesOf(snapshot.document) + bytesOf(result.value);
      if (entryBytes > historyLimits.maxBytes) return rejected("history.capacity");
      pastSizes.push(currentBytes);
      past.push(snapshot.document);
      future = [];
      futureSizes = [];
      return publish(result.value, transaction.commands);
    },
    beginGesture(transaction) {
      if (snapshot.draft.kind !== "none") return failure("draft.active");
      const result = candidate({ ...transaction, commands: [] });
      if (!result.ok) return result;
      gesture = { transaction: structuredClone(transaction), commands: [] };
      notify({
        draft: { kind: "gesture", preview: snapshot.document, transactionId: transaction.id }
      });
      return success(void 0);
    },
    previewGesture(commands, options2) {
      if (!gesture) return failure("gesture.missing");
      const result = candidate({ ...gesture.transaction, commands }, options2?.skipValidation);
      if (!result.ok) return result;
      gesture.commands = structuredClone(commands);
      notify({
        draft: { kind: "gesture", preview: result.value, transactionId: gesture.transaction.id }
      });
      return success(void 0);
    },
    commitGesture() {
      if (!gesture) return rejected("gesture.missing");
      const transaction = { ...gesture.transaction, commands: gesture.commands };
      gesture = void 0;
      notify({ draft: { kind: "none" } });
      return store.dispatch(transaction);
    },
    cancelGesture() {
      gesture = void 0;
      if (snapshot.draft.kind === "gesture") notify({ draft: { kind: "none" } });
    },
    setTextDraft(text) {
      if (disposed) return;
      store.cancelGesture();
      const result = importDocument(text, {
        id: snapshot.document.id,
        locale: snapshot.document.locale,
        limits
      });
      notify({
        draft: {
          kind: "text",
          text,
          baseRevision: snapshot.draft.kind === "text" ? snapshot.draft.baseRevision : snapshot.document.revision,
          diagnostics: result.diagnostics
        }
      });
    },
    commitTextDraft() {
      if (snapshot.draft.kind !== "text") return rejected("draft.missing");
      const draft = snapshot.draft;
      if (draft.baseRevision !== snapshot.document.revision) return rejected("revision.stale");
      const result = importDocument(draft.text, {
        id: snapshot.document.id,
        locale: snapshot.document.locale,
        limits
      });
      if (!result.ok)
        return { status: "rejected", document: snapshot.document, diagnostics: result.diagnostics };
      const commit = store.dispatch({
        id: options.idFactory?.("transaction") ?? "text-draft",
        label: "Apply text draft",
        expectedRevision: draft.baseRevision,
        commands: [{ type: "document.replace-content", document: result.value.document }]
      });
      if (commit.status !== "rejected") notify({ draft: { kind: "none" } });
      return commit;
    },
    cancelTextDraft() {
      if (snapshot.draft.kind === "text") notify({ draft: { kind: "none" } });
    },
    undo() {
      if (disposed || !permissions.edit)
        return rejected(disposed ? "store.disposed" : "permission.edit");
      if (!past.length) return noop();
      if (snapshot.document.revision >= Number.MAX_SAFE_INTEGER)
        return rejected("revision.overflow");
      const doc = structuredClone(past.pop());
      pastSizes.pop();
      futureSizes.push(currentBytes);
      future.push(snapshot.document);
      return publish(doc, []);
    },
    redo() {
      if (disposed || !permissions.edit)
        return rejected(disposed ? "store.disposed" : "permission.edit");
      if (!future.length) return noop();
      if (snapshot.document.revision >= Number.MAX_SAFE_INTEGER)
        return rejected("revision.overflow");
      const doc = structuredClone(future.pop());
      futureSizes.pop();
      pastSizes.push(currentBytes);
      past.push(snapshot.document);
      return publish(doc, []);
    },
    setSelection(selection) {
      const nodes = new Set(nodesOf(snapshot.document.spec).map((n) => n.id)), edges = new Set(edgesOf(snapshot.document.spec).map((e) => e.id)), groups = new Set(snapshot.document.scene.groups.map((g) => g.id));
      const seen = /* @__PURE__ */ new Set();
      notify({
        selection: selection.filter((ref) => {
          const key = JSON.stringify(ref);
          if (seen.has(key) || !(ref.kind === "node" ? nodes : ref.kind === "edge" ? edges : groups).has(ref.id))
            return false;
          seen.add(key);
          return true;
        }).map((ref) => ({ ...ref }))
      });
    },
    setViewport(viewport) {
      if ([viewport.x, viewport.y, viewport.zoom].every(Number.isFinite) && viewport.zoom >= 0.1 && viewport.zoom <= 4)
        notify({ viewport: { ...viewport } });
    },
    setTool(tool) {
      if (["select", "hand", "connect"].includes(tool)) notify({ tool });
    },
    setPermissions(next) {
      Object.assign(permissions, next);
      notify({});
    },
    replaceDocument(document, replaceOptions) {
      if (disposed || !permissions.edit)
        return rejected(disposed ? "store.disposed" : "permission.edit");
      if (replaceOptions.expectedRevision !== snapshot.document.revision)
        return rejected("revision.stale");
      const result = validateDocument(document, limits);
      if (!result.ok)
        return { status: "rejected", document: snapshot.document, diagnostics: result.diagnostics };
      if (snapshot.document.revision >= Number.MAX_SAFE_INTEGER)
        return rejected("revision.overflow");
      past = [];
      future = [];
      pastSizes = [];
      futureSizes = [];
      gesture = void 0;
      saved = canonicalizeContent(result.value);
      savedScene = structuredClone(result.value.scene);
      notify({ draft: { kind: "none" }, selection: [] });
      return publish(structuredClone(result.value), []);
    },
    markSaved(document) {
      if (!permissions.save || disposed) return;
      const result = validateDocument(document, limits);
      if (result.ok && document.id === snapshot.document.id) {
        saved = canonicalizeContent(result.value);
        savedScene = structuredClone(result.value.scene);
        nonSceneDirty = canonicalizeContent({ ...snapshot.document, scene: savedScene }) !== saved;
        notify({ dirty: canonicalizeContent(snapshot.document) !== saved });
      }
    },
    dispose() {
      disposed = true;
      listeners.clear();
      commits.clear();
      past = [];
      future = [];
      pastSizes = [];
      futureSizes = [];
      gesture = void 0;
    }
  };
  return store;
}

// src/editor-core/viewport.ts
function finite(...values) {
  if (!values.every(Number.isFinite)) throw new RangeError("Coordinates must be finite");
}
function valid(viewport) {
  finite(viewport.x, viewport.y, viewport.zoom);
  if (viewport.zoom <= 0) throw new RangeError("Zoom must be positive");
}
function screenToWorld(point, viewport) {
  valid(viewport);
  finite(point.x, point.y);
  return { x: (point.x - viewport.x) / viewport.zoom, y: (point.y - viewport.y) / viewport.zoom };
}
function worldToScreen(point, viewport) {
  valid(viewport);
  finite(point.x, point.y);
  return { x: point.x * viewport.zoom + viewport.x, y: point.y * viewport.zoom + viewport.y };
}
function zoomAt(point, nextZoom, viewport) {
  finite(nextZoom);
  const world = screenToWorld(point, viewport), zoom = Math.max(0.1, Math.min(4, nextZoom));
  return { x: point.x - world.x * zoom, y: point.y - world.y * zoom, zoom };
}
function fitViewport(bounds, size, padding) {
  finite(bounds.x, bounds.y, bounds.width, bounds.height, size.width, size.height, padding);
  if (bounds.width < 0 || bounds.height < 0 || size.width <= 0 || size.height <= 0 || padding < 0)
    throw new RangeError("Invalid fit bounds");
  const zoom = Math.max(
    0.1,
    Math.min(
      1,
      Math.max(1, size.width - padding * 2) / Math.max(1, bounds.width),
      Math.max(1, size.height - padding * 2) / Math.max(1, bounds.height)
    )
  );
  return {
    x: size.width / 2 - (bounds.x + bounds.width / 2) * zoom,
    y: size.height / 2 - (bounds.y + bounds.height / 2) * zoom,
    zoom
  };
}

// src/validation/fragment-structural.js
var fragment_structural_default = validate10;
var schema101 = { "type": "object", "properties": { "kind": { "type": "string", "enum": ["node", "edge", "group"] }, "id": { "type": "string" } }, "required": ["kind", "id"], "additionalProperties": false };
var schema13 = { "type": "object", "properties": { "format": { "type": "string", "const": "aesthc-diagram" }, "schemaVersion": { "type": "number", "const": 1 }, "id": { "type": "string" }, "revision": { "type": "number" }, "locale": { "$ref": "#/definitions/Locale" }, "spec": { "$ref": "#/definitions/EditorSpec" }, "scene": { "$ref": "#/definitions/DiagramScene" }, "presentation": { "$ref": "#/definitions/Presentation" }, "metadata": { "$ref": "#/definitions/DocumentMetadata" }, "views": { "type": "array", "items": { "$ref": "#/definitions/NamedView" } }, "story": { "type": "array", "items": { "$ref": "#/definitions/StoryStep" } }, "extensions": { "type": "object", "additionalProperties": { "$ref": "#/definitions/JsonValue" } } }, "required": ["format", "schemaVersion", "id", "revision", "locale", "spec", "scene", "presentation", "metadata", "views", "story", "extensions"], "additionalProperties": false };
var schema14 = { "type": "string", "enum": ["en", "es"] };
var func2 = Object.prototype.hasOwnProperty;
var schema19 = { "type": "object", "properties": { "id": { "type": "string" }, "label": { "type": "string" }, "description": { "type": "string", "description": "Localized explanation shown on hover/focus and available to assistive technology." }, "kind": { "type": "string", "description": "Mono micro-label above the title, e.g. 'Trigger', 'Engine', 'Gate'." }, "sublabel": { "type": "string" }, "weight": { "$ref": "#/definitions/NodeWeight" }, "nudge": { "type": "number", "description": "Vertical fine-tune in viewBox units, applied after the layout centres the node." }, "shape": { "$ref": "#/definitions/DiagramNodeShape", "description": "Draw this node as something other than a hairline card." }, "textAnchor": { "$ref": "#/definitions/DiagramNodeTextAnchor", "description": "Label alignment for `event` shapes (timeline)." }, "fields": { "type": "array", "items": { "$ref": "#/definitions/TableField" }, "description": "ER table rows (only meaningful for `shape: 'table'`)." }, "initial": { "type": "boolean", "description": "State-machine: draw a double outline (initial state)." }, "final": { "type": "boolean", "description": "State-machine: draw a hollow centre (final state)." }, "band": { "type": "number" } }, "required": ["band", "description", "id", "label"], "additionalProperties": false, "description": "Band-layout nodes additionally declare which column they belong to." };
var schema20 = { "type": "string", "enum": ["primary", "secondary", "muted"], "description": "Visual weight of a node card." };
var schema21 = { "type": "string", "enum": ["card", "state", "table", "event", "terminal", "bar"], "description": "How a node is drawn: hairline card (default), state pill, ER table, timeline event, terminal, activation bar." };
var schema22 = { "type": "string", "enum": ["start", "end", "middle"], "description": "For `event` shapes, where the label sits relative to the dot." };
var schema23 = { "type": "object", "properties": { "name": { "type": "string" }, "type": { "type": "string", "description": "Optional column type, e.g. `uuid`, `varchar(64)`." }, "key": { "type": "string", "enum": ["pk", "fk", "unique"], "description": "Row badge: primary key / foreign key / unique." } }, "required": ["name"], "additionalProperties": false, "description": "A single row in an ER table node." };
function validate16(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.band === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "band" }, message: "must have required property 'band'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.description === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "description" }, message: "must have required property 'description'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.id === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "id" }, message: "must have required property 'id'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data.label === void 0) {
      const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "label" }, message: "must have required property 'label'" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!func2.call(schema19.properties, key0)) {
        const err4 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.id !== void 0) {
      if (typeof data.id !== "string") {
        const err5 = { instancePath: instancePath + "/id", schemaPath: "#/properties/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.label !== void 0) {
      if (typeof data.label !== "string") {
        const err6 = { instancePath: instancePath + "/label", schemaPath: "#/properties/label/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.description !== void 0) {
      if (typeof data.description !== "string") {
        const err7 = { instancePath: instancePath + "/description", schemaPath: "#/properties/description/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
    if (data.kind !== void 0) {
      if (typeof data.kind !== "string") {
        const err8 = { instancePath: instancePath + "/kind", schemaPath: "#/properties/kind/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
    if (data.sublabel !== void 0) {
      if (typeof data.sublabel !== "string") {
        const err9 = { instancePath: instancePath + "/sublabel", schemaPath: "#/properties/sublabel/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err9];
        } else {
          vErrors.push(err9);
        }
        errors++;
      }
    }
    if (data.weight !== void 0) {
      let data5 = data.weight;
      if (typeof data5 !== "string") {
        const err10 = { instancePath: instancePath + "/weight", schemaPath: "#/definitions/NodeWeight/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
      if (!(data5 === "primary" || data5 === "secondary" || data5 === "muted")) {
        const err11 = { instancePath: instancePath + "/weight", schemaPath: "#/definitions/NodeWeight/enum", keyword: "enum", params: { allowedValues: schema20.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err11];
        } else {
          vErrors.push(err11);
        }
        errors++;
      }
    }
    if (data.nudge !== void 0) {
      if (!(typeof data.nudge == "number")) {
        const err12 = { instancePath: instancePath + "/nudge", schemaPath: "#/properties/nudge/type", keyword: "type", params: { type: "number" }, message: "must be number" };
        if (vErrors === null) {
          vErrors = [err12];
        } else {
          vErrors.push(err12);
        }
        errors++;
      }
    }
    if (data.shape !== void 0) {
      let data7 = data.shape;
      if (typeof data7 !== "string") {
        const err13 = { instancePath: instancePath + "/shape", schemaPath: "#/definitions/DiagramNodeShape/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err13];
        } else {
          vErrors.push(err13);
        }
        errors++;
      }
      if (!(data7 === "card" || data7 === "state" || data7 === "table" || data7 === "event" || data7 === "terminal" || data7 === "bar")) {
        const err14 = { instancePath: instancePath + "/shape", schemaPath: "#/definitions/DiagramNodeShape/enum", keyword: "enum", params: { allowedValues: schema21.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err14];
        } else {
          vErrors.push(err14);
        }
        errors++;
      }
    }
    if (data.textAnchor !== void 0) {
      let data8 = data.textAnchor;
      if (typeof data8 !== "string") {
        const err15 = { instancePath: instancePath + "/textAnchor", schemaPath: "#/definitions/DiagramNodeTextAnchor/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err15];
        } else {
          vErrors.push(err15);
        }
        errors++;
      }
      if (!(data8 === "start" || data8 === "end" || data8 === "middle")) {
        const err16 = { instancePath: instancePath + "/textAnchor", schemaPath: "#/definitions/DiagramNodeTextAnchor/enum", keyword: "enum", params: { allowedValues: schema22.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err16];
        } else {
          vErrors.push(err16);
        }
        errors++;
      }
    }
    if (data.fields !== void 0) {
      let data9 = data.fields;
      if (Array.isArray(data9)) {
        const len0 = data9.length;
        for (let i0 = 0; i0 < len0; i0++) {
          let data10 = data9[i0];
          if (data10 && typeof data10 == "object" && !Array.isArray(data10)) {
            if (data10.name === void 0) {
              const err17 = { instancePath: instancePath + "/fields/" + i0, schemaPath: "#/definitions/TableField/required", keyword: "required", params: { missingProperty: "name" }, message: "must have required property 'name'" };
              if (vErrors === null) {
                vErrors = [err17];
              } else {
                vErrors.push(err17);
              }
              errors++;
            }
            for (const key1 in data10) {
              if (!(key1 === "name" || key1 === "type" || key1 === "key")) {
                const err18 = { instancePath: instancePath + "/fields/" + i0, schemaPath: "#/definitions/TableField/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err18];
                } else {
                  vErrors.push(err18);
                }
                errors++;
              }
            }
            if (data10.name !== void 0) {
              if (typeof data10.name !== "string") {
                const err19 = { instancePath: instancePath + "/fields/" + i0 + "/name", schemaPath: "#/definitions/TableField/properties/name/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err19];
                } else {
                  vErrors.push(err19);
                }
                errors++;
              }
            }
            if (data10.type !== void 0) {
              if (typeof data10.type !== "string") {
                const err20 = { instancePath: instancePath + "/fields/" + i0 + "/type", schemaPath: "#/definitions/TableField/properties/type/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err20];
                } else {
                  vErrors.push(err20);
                }
                errors++;
              }
            }
            if (data10.key !== void 0) {
              let data13 = data10.key;
              if (typeof data13 !== "string") {
                const err21 = { instancePath: instancePath + "/fields/" + i0 + "/key", schemaPath: "#/definitions/TableField/properties/key/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err21];
                } else {
                  vErrors.push(err21);
                }
                errors++;
              }
              if (!(data13 === "pk" || data13 === "fk" || data13 === "unique")) {
                const err22 = { instancePath: instancePath + "/fields/" + i0 + "/key", schemaPath: "#/definitions/TableField/properties/key/enum", keyword: "enum", params: { allowedValues: schema23.properties.key.enum }, message: "must be equal to one of the allowed values" };
                if (vErrors === null) {
                  vErrors = [err22];
                } else {
                  vErrors.push(err22);
                }
                errors++;
              }
            }
          } else {
            const err23 = { instancePath: instancePath + "/fields/" + i0, schemaPath: "#/definitions/TableField/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err23];
            } else {
              vErrors.push(err23);
            }
            errors++;
          }
        }
      } else {
        const err24 = { instancePath: instancePath + "/fields", schemaPath: "#/properties/fields/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err24];
        } else {
          vErrors.push(err24);
        }
        errors++;
      }
    }
    if (data.initial !== void 0) {
      if (typeof data.initial !== "boolean") {
        const err25 = { instancePath: instancePath + "/initial", schemaPath: "#/properties/initial/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
        if (vErrors === null) {
          vErrors = [err25];
        } else {
          vErrors.push(err25);
        }
        errors++;
      }
    }
    if (data.final !== void 0) {
      if (typeof data.final !== "boolean") {
        const err26 = { instancePath: instancePath + "/final", schemaPath: "#/properties/final/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
        if (vErrors === null) {
          vErrors = [err26];
        } else {
          vErrors.push(err26);
        }
        errors++;
      }
    }
    if (data.band !== void 0) {
      if (!(typeof data.band == "number")) {
        const err27 = { instancePath: instancePath + "/band", schemaPath: "#/properties/band/type", keyword: "type", params: { type: "number" }, message: "must be number" };
        if (vErrors === null) {
          vErrors = [err27];
        } else {
          vErrors.push(err27);
        }
        errors++;
      }
    }
  } else {
    const err28 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err28];
    } else {
      vErrors.push(err28);
    }
    errors++;
  }
  validate16.errors = vErrors;
  return errors === 0;
}
var schema25 = { "type": "string", "enum": ["main", "branch"], "description": "Edge flavour: cobalt main path vs amber branch path." };
var schema26 = { "type": "string", "enum": ["above-target", "below-target", "left-of-edge", "right-of-edge"] };
var schema27 = { "type": "string", "enum": ["above", "below"] };
function validate18(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.from === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "from" }, message: "must have required property 'from'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.to === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "to" }, message: "must have required property 'to'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "id" || key0 === "from" || key0 === "to" || key0 === "label" || key0 === "variant" || key0 === "dashed" || key0 === "labelPlacement" || key0 === "route")) {
        const err2 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
    if (data.id !== void 0) {
      if (typeof data.id !== "string") {
        const err3 = { instancePath: instancePath + "/id", schemaPath: "#/properties/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.from !== void 0) {
      if (typeof data.from !== "string") {
        const err4 = { instancePath: instancePath + "/from", schemaPath: "#/properties/from/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.to !== void 0) {
      if (typeof data.to !== "string") {
        const err5 = { instancePath: instancePath + "/to", schemaPath: "#/properties/to/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.label !== void 0) {
      if (typeof data.label !== "string") {
        const err6 = { instancePath: instancePath + "/label", schemaPath: "#/properties/label/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.variant !== void 0) {
      let data4 = data.variant;
      if (typeof data4 !== "string") {
        const err7 = { instancePath: instancePath + "/variant", schemaPath: "#/definitions/EdgeVariant/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
      if (!(data4 === "main" || data4 === "branch")) {
        const err8 = { instancePath: instancePath + "/variant", schemaPath: "#/definitions/EdgeVariant/enum", keyword: "enum", params: { allowedValues: schema25.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
    if (data.dashed !== void 0) {
      if (typeof data.dashed !== "boolean") {
        const err9 = { instancePath: instancePath + "/dashed", schemaPath: "#/properties/dashed/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
        if (vErrors === null) {
          vErrors = [err9];
        } else {
          vErrors.push(err9);
        }
        errors++;
      }
    }
    if (data.labelPlacement !== void 0) {
      let data6 = data.labelPlacement;
      if (typeof data6 !== "string") {
        const err10 = { instancePath: instancePath + "/labelPlacement", schemaPath: "#/definitions/EdgeLabelPlacement/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
      if (!(data6 === "above-target" || data6 === "below-target" || data6 === "left-of-edge" || data6 === "right-of-edge")) {
        const err11 = { instancePath: instancePath + "/labelPlacement", schemaPath: "#/definitions/EdgeLabelPlacement/enum", keyword: "enum", params: { allowedValues: schema26.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err11];
        } else {
          vErrors.push(err11);
        }
        errors++;
      }
    }
    if (data.route !== void 0) {
      let data7 = data.route;
      if (data7 && typeof data7 == "object" && !Array.isArray(data7)) {
        if (data7.lane === void 0) {
          const err12 = { instancePath: instancePath + "/route", schemaPath: "#/properties/route/required", keyword: "required", params: { missingProperty: "lane" }, message: "must have required property 'lane'" };
          if (vErrors === null) {
            vErrors = [err12];
          } else {
            vErrors.push(err12);
          }
          errors++;
        }
        for (const key1 in data7) {
          if (!(key1 === "lane" || key1 === "clearance")) {
            const err13 = { instancePath: instancePath + "/route", schemaPath: "#/properties/route/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err13];
            } else {
              vErrors.push(err13);
            }
            errors++;
          }
        }
        if (data7.lane !== void 0) {
          let data8 = data7.lane;
          if (typeof data8 !== "string") {
            const err14 = { instancePath: instancePath + "/route/lane", schemaPath: "#/definitions/EdgeLane/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err14];
            } else {
              vErrors.push(err14);
            }
            errors++;
          }
          if (!(data8 === "above" || data8 === "below")) {
            const err15 = { instancePath: instancePath + "/route/lane", schemaPath: "#/definitions/EdgeLane/enum", keyword: "enum", params: { allowedValues: schema27.enum }, message: "must be equal to one of the allowed values" };
            if (vErrors === null) {
              vErrors = [err15];
            } else {
              vErrors.push(err15);
            }
            errors++;
          }
        }
        if (data7.clearance !== void 0) {
          if (!(typeof data7.clearance == "number")) {
            const err16 = { instancePath: instancePath + "/route/clearance", schemaPath: "#/properties/route/properties/clearance/type", keyword: "type", params: { type: "number" }, message: "must be number" };
            if (vErrors === null) {
              vErrors = [err16];
            } else {
              vErrors.push(err16);
            }
            errors++;
          }
        }
      } else {
        const err17 = { instancePath: instancePath + "/route", schemaPath: "#/properties/route/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err17];
        } else {
          vErrors.push(err17);
        }
        errors++;
      }
    }
  } else {
    const err18 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err18];
    } else {
      vErrors.push(err18);
    }
    errors++;
  }
  validate18.errors = vErrors;
  return errors === 0;
}
var schema29 = { "type": "object", "properties": { "id": { "type": "string" }, "from": { "type": "string" }, "label": { "type": "string" }, "destination": { "type": "string" }, "side": { "$ref": "#/definitions/ContinuationSide" }, "anchor": { "$ref": "#/definitions/ContinuationAnchor" }, "labelPlacement": { "type": "string", "enum": ["above-source", "below-source"] }, "variant": { "$ref": "#/definitions/EdgeVariant" }, "ariaLabel": { "type": "string", "description": "Spoken text when the compact visible label needs clearer return semantics." } }, "required": ["id", "from", "label", "destination", "side", "labelPlacement"], "additionalProperties": false, "description": "A source-only, off-canvas continuation. It preserves return/feedback semantics without adding a long relation to the graph or enclosing the diagram in a rail." };
var schema30 = { "type": "string", "enum": ["left", "right"] };
var schema31 = { "type": "string", "enum": ["upper", "center", "lower"] };
function validate20(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.id === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "id" }, message: "must have required property 'id'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.from === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "from" }, message: "must have required property 'from'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.label === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "label" }, message: "must have required property 'label'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data.destination === void 0) {
      const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "destination" }, message: "must have required property 'destination'" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    if (data.side === void 0) {
      const err4 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "side" }, message: "must have required property 'side'" };
      if (vErrors === null) {
        vErrors = [err4];
      } else {
        vErrors.push(err4);
      }
      errors++;
    }
    if (data.labelPlacement === void 0) {
      const err5 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "labelPlacement" }, message: "must have required property 'labelPlacement'" };
      if (vErrors === null) {
        vErrors = [err5];
      } else {
        vErrors.push(err5);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!func2.call(schema29.properties, key0)) {
        const err6 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.id !== void 0) {
      if (typeof data.id !== "string") {
        const err7 = { instancePath: instancePath + "/id", schemaPath: "#/properties/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
    if (data.from !== void 0) {
      if (typeof data.from !== "string") {
        const err8 = { instancePath: instancePath + "/from", schemaPath: "#/properties/from/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
    if (data.label !== void 0) {
      if (typeof data.label !== "string") {
        const err9 = { instancePath: instancePath + "/label", schemaPath: "#/properties/label/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err9];
        } else {
          vErrors.push(err9);
        }
        errors++;
      }
    }
    if (data.destination !== void 0) {
      if (typeof data.destination !== "string") {
        const err10 = { instancePath: instancePath + "/destination", schemaPath: "#/properties/destination/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
    }
    if (data.side !== void 0) {
      let data4 = data.side;
      if (typeof data4 !== "string") {
        const err11 = { instancePath: instancePath + "/side", schemaPath: "#/definitions/ContinuationSide/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err11];
        } else {
          vErrors.push(err11);
        }
        errors++;
      }
      if (!(data4 === "left" || data4 === "right")) {
        const err12 = { instancePath: instancePath + "/side", schemaPath: "#/definitions/ContinuationSide/enum", keyword: "enum", params: { allowedValues: schema30.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err12];
        } else {
          vErrors.push(err12);
        }
        errors++;
      }
    }
    if (data.anchor !== void 0) {
      let data5 = data.anchor;
      if (typeof data5 !== "string") {
        const err13 = { instancePath: instancePath + "/anchor", schemaPath: "#/definitions/ContinuationAnchor/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err13];
        } else {
          vErrors.push(err13);
        }
        errors++;
      }
      if (!(data5 === "upper" || data5 === "center" || data5 === "lower")) {
        const err14 = { instancePath: instancePath + "/anchor", schemaPath: "#/definitions/ContinuationAnchor/enum", keyword: "enum", params: { allowedValues: schema31.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err14];
        } else {
          vErrors.push(err14);
        }
        errors++;
      }
    }
    if (data.labelPlacement !== void 0) {
      let data6 = data.labelPlacement;
      if (typeof data6 !== "string") {
        const err15 = { instancePath: instancePath + "/labelPlacement", schemaPath: "#/properties/labelPlacement/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err15];
        } else {
          vErrors.push(err15);
        }
        errors++;
      }
      if (!(data6 === "above-source" || data6 === "below-source")) {
        const err16 = { instancePath: instancePath + "/labelPlacement", schemaPath: "#/properties/labelPlacement/enum", keyword: "enum", params: { allowedValues: schema29.properties.labelPlacement.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err16];
        } else {
          vErrors.push(err16);
        }
        errors++;
      }
    }
    if (data.variant !== void 0) {
      let data7 = data.variant;
      if (typeof data7 !== "string") {
        const err17 = { instancePath: instancePath + "/variant", schemaPath: "#/definitions/EdgeVariant/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err17];
        } else {
          vErrors.push(err17);
        }
        errors++;
      }
      if (!(data7 === "main" || data7 === "branch")) {
        const err18 = { instancePath: instancePath + "/variant", schemaPath: "#/definitions/EdgeVariant/enum", keyword: "enum", params: { allowedValues: schema25.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err18];
        } else {
          vErrors.push(err18);
        }
        errors++;
      }
    }
    if (data.ariaLabel !== void 0) {
      if (typeof data.ariaLabel !== "string") {
        const err19 = { instancePath: instancePath + "/ariaLabel", schemaPath: "#/properties/ariaLabel/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err19];
        } else {
          vErrors.push(err19);
        }
        errors++;
      }
    }
  } else {
    const err20 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err20];
    } else {
      vErrors.push(err20);
    }
    errors++;
  }
  validate20.errors = vErrors;
  return errors === 0;
}
function validate15(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.type === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "type" }, message: "must have required property 'type'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.caption === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "caption" }, message: "must have required property 'caption'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.legend === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "legend" }, message: "must have required property 'legend'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data.bands === void 0) {
      const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "bands" }, message: "must have required property 'bands'" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    if (data.nodes === void 0) {
      const err4 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "nodes" }, message: "must have required property 'nodes'" };
      if (vErrors === null) {
        vErrors = [err4];
      } else {
        vErrors.push(err4);
      }
      errors++;
    }
    if (data.edges === void 0) {
      const err5 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "edges" }, message: "must have required property 'edges'" };
      if (vErrors === null) {
        vErrors = [err5];
      } else {
        vErrors.push(err5);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "type" || key0 === "caption" || key0 === "legend" || key0 === "bands" || key0 === "nodes" || key0 === "edges" || key0 === "decisions" || key0 === "continuations")) {
        const err6 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.type !== void 0) {
      let data0 = data.type;
      if (typeof data0 !== "string") {
        const err7 = { instancePath: instancePath + "/type", schemaPath: "#/properties/type/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
      if ("band" !== data0) {
        const err8 = { instancePath: instancePath + "/type", schemaPath: "#/properties/type/const", keyword: "const", params: { allowedValue: "band" }, message: "must be equal to constant" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
    if (data.caption !== void 0) {
      if (typeof data.caption !== "string") {
        const err9 = { instancePath: instancePath + "/caption", schemaPath: "#/properties/caption/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err9];
        } else {
          vErrors.push(err9);
        }
        errors++;
      }
    }
    if (data.legend !== void 0) {
      let data2 = data.legend;
      if (data2 && typeof data2 == "object" && !Array.isArray(data2)) {
        if (data2.main === void 0) {
          const err10 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/required", keyword: "required", params: { missingProperty: "main" }, message: "must have required property 'main'" };
          if (vErrors === null) {
            vErrors = [err10];
          } else {
            vErrors.push(err10);
          }
          errors++;
        }
        if (data2.branch === void 0) {
          const err11 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/required", keyword: "required", params: { missingProperty: "branch" }, message: "must have required property 'branch'" };
          if (vErrors === null) {
            vErrors = [err11];
          } else {
            vErrors.push(err11);
          }
          errors++;
        }
        for (const key1 in data2) {
          if (!(key1 === "main" || key1 === "branch")) {
            const err12 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err12];
            } else {
              vErrors.push(err12);
            }
            errors++;
          }
        }
        if (data2.main !== void 0) {
          if (typeof data2.main !== "string") {
            const err13 = { instancePath: instancePath + "/legend/main", schemaPath: "#/properties/legend/properties/main/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err13];
            } else {
              vErrors.push(err13);
            }
            errors++;
          }
        }
        if (data2.branch !== void 0) {
          if (typeof data2.branch !== "string") {
            const err14 = { instancePath: instancePath + "/legend/branch", schemaPath: "#/properties/legend/properties/branch/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err14];
            } else {
              vErrors.push(err14);
            }
            errors++;
          }
        }
      } else {
        const err15 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err15];
        } else {
          vErrors.push(err15);
        }
        errors++;
      }
    }
    if (data.bands !== void 0) {
      let data5 = data.bands;
      if (Array.isArray(data5)) {
        const len0 = data5.length;
        for (let i0 = 0; i0 < len0; i0++) {
          let data6 = data5[i0];
          if (data6 && typeof data6 == "object" && !Array.isArray(data6)) {
            if (data6.title === void 0) {
              const err16 = { instancePath: instancePath + "/bands/" + i0, schemaPath: "#/definitions/DiagramBand/required", keyword: "required", params: { missingProperty: "title" }, message: "must have required property 'title'" };
              if (vErrors === null) {
                vErrors = [err16];
              } else {
                vErrors.push(err16);
              }
              errors++;
            }
            for (const key2 in data6) {
              if (!(key2 === "title")) {
                const err17 = { instancePath: instancePath + "/bands/" + i0, schemaPath: "#/definitions/DiagramBand/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key2 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err17];
                } else {
                  vErrors.push(err17);
                }
                errors++;
              }
            }
            if (data6.title !== void 0) {
              if (typeof data6.title !== "string") {
                const err18 = { instancePath: instancePath + "/bands/" + i0 + "/title", schemaPath: "#/definitions/DiagramBand/properties/title/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err18];
                } else {
                  vErrors.push(err18);
                }
                errors++;
              }
            }
          } else {
            const err19 = { instancePath: instancePath + "/bands/" + i0, schemaPath: "#/definitions/DiagramBand/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err19];
            } else {
              vErrors.push(err19);
            }
            errors++;
          }
        }
      } else {
        const err20 = { instancePath: instancePath + "/bands", schemaPath: "#/properties/bands/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err20];
        } else {
          vErrors.push(err20);
        }
        errors++;
      }
    }
    if (data.nodes !== void 0) {
      let data8 = data.nodes;
      if (Array.isArray(data8)) {
        const len1 = data8.length;
        for (let i1 = 0; i1 < len1; i1++) {
          if (!validate16(data8[i1], { instancePath: instancePath + "/nodes/" + i1, parentData: data8, parentDataProperty: i1, rootData })) {
            vErrors = vErrors === null ? validate16.errors : vErrors.concat(validate16.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err21 = { instancePath: instancePath + "/nodes", schemaPath: "#/properties/nodes/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err21];
        } else {
          vErrors.push(err21);
        }
        errors++;
      }
    }
    if (data.edges !== void 0) {
      let data10 = data.edges;
      if (Array.isArray(data10)) {
        const len2 = data10.length;
        for (let i2 = 0; i2 < len2; i2++) {
          if (!validate18(data10[i2], { instancePath: instancePath + "/edges/" + i2, parentData: data10, parentDataProperty: i2, rootData })) {
            vErrors = vErrors === null ? validate18.errors : vErrors.concat(validate18.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err22 = { instancePath: instancePath + "/edges", schemaPath: "#/properties/edges/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err22];
        } else {
          vErrors.push(err22);
        }
        errors++;
      }
    }
    if (data.decisions !== void 0) {
      let data12 = data.decisions;
      if (Array.isArray(data12)) {
        const len3 = data12.length;
        for (let i3 = 0; i3 < len3; i3++) {
          let data13 = data12[i3];
          if (data13 && typeof data13 == "object" && !Array.isArray(data13)) {
            if (data13.id === void 0) {
              const err23 = { instancePath: instancePath + "/decisions/" + i3, schemaPath: "#/definitions/DiagramDecision/required", keyword: "required", params: { missingProperty: "id" }, message: "must have required property 'id'" };
              if (vErrors === null) {
                vErrors = [err23];
              } else {
                vErrors.push(err23);
              }
              errors++;
            }
            if (data13.source === void 0) {
              const err24 = { instancePath: instancePath + "/decisions/" + i3, schemaPath: "#/definitions/DiagramDecision/required", keyword: "required", params: { missingProperty: "source" }, message: "must have required property 'source'" };
              if (vErrors === null) {
                vErrors = [err24];
              } else {
                vErrors.push(err24);
              }
              errors++;
            }
            if (data13.label === void 0) {
              const err25 = { instancePath: instancePath + "/decisions/" + i3, schemaPath: "#/definitions/DiagramDecision/required", keyword: "required", params: { missingProperty: "label" }, message: "must have required property 'label'" };
              if (vErrors === null) {
                vErrors = [err25];
              } else {
                vErrors.push(err25);
              }
              errors++;
            }
            for (const key3 in data13) {
              if (!(key3 === "id" || key3 === "source" || key3 === "label")) {
                const err26 = { instancePath: instancePath + "/decisions/" + i3, schemaPath: "#/definitions/DiagramDecision/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key3 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err26];
                } else {
                  vErrors.push(err26);
                }
                errors++;
              }
            }
            if (data13.id !== void 0) {
              if (typeof data13.id !== "string") {
                const err27 = { instancePath: instancePath + "/decisions/" + i3 + "/id", schemaPath: "#/definitions/DiagramDecision/properties/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err27];
                } else {
                  vErrors.push(err27);
                }
                errors++;
              }
            }
            if (data13.source !== void 0) {
              if (typeof data13.source !== "string") {
                const err28 = { instancePath: instancePath + "/decisions/" + i3 + "/source", schemaPath: "#/definitions/DiagramDecision/properties/source/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err28];
                } else {
                  vErrors.push(err28);
                }
                errors++;
              }
            }
            if (data13.label !== void 0) {
              if (typeof data13.label !== "string") {
                const err29 = { instancePath: instancePath + "/decisions/" + i3 + "/label", schemaPath: "#/definitions/DiagramDecision/properties/label/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err29];
                } else {
                  vErrors.push(err29);
                }
                errors++;
              }
            }
          } else {
            const err30 = { instancePath: instancePath + "/decisions/" + i3, schemaPath: "#/definitions/DiagramDecision/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err30];
            } else {
              vErrors.push(err30);
            }
            errors++;
          }
        }
      } else {
        const err31 = { instancePath: instancePath + "/decisions", schemaPath: "#/properties/decisions/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err31];
        } else {
          vErrors.push(err31);
        }
        errors++;
      }
    }
    if (data.continuations !== void 0) {
      let data17 = data.continuations;
      if (Array.isArray(data17)) {
        const len4 = data17.length;
        for (let i4 = 0; i4 < len4; i4++) {
          if (!validate20(data17[i4], { instancePath: instancePath + "/continuations/" + i4, parentData: data17, parentDataProperty: i4, rootData })) {
            vErrors = vErrors === null ? validate20.errors : vErrors.concat(validate20.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err32 = { instancePath: instancePath + "/continuations", schemaPath: "#/properties/continuations/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err32];
        } else {
          vErrors.push(err32);
        }
        errors++;
      }
    }
  } else {
    const err33 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err33];
    } else {
      vErrors.push(err33);
    }
    errors++;
  }
  validate15.errors = vErrors;
  return errors === 0;
}
var schema33 = { "type": "object", "properties": { "type": { "type": "string", "const": "flowchart" }, "caption": { "type": "string" }, "legend": { "type": "object", "properties": { "main": { "type": "string" }, "branch": { "type": "string" } }, "required": ["main", "branch"], "additionalProperties": false }, "nodes": { "type": "array", "items": { "$ref": "#/definitions/DiagramNode" } }, "edges": { "type": "array", "items": { "$ref": "#/definitions/DiagramEdge" } }, "level": { "type": "number", "description": "Global level override for every node; omit for automatic topological levels." }, "direction": { "type": "string", "enum": ["top-down", "left-right"], "description": "Main flow direction." } }, "required": ["type", "caption", "legend", "nodes", "edges"], "additionalProperties": false };
var schema34 = { "type": "object", "properties": { "id": { "type": "string" }, "label": { "type": "string" }, "description": { "type": "string", "description": "Localized explanation shown on hover/focus and available to assistive technology." }, "kind": { "type": "string", "description": "Mono micro-label above the title, e.g. 'Trigger', 'Engine', 'Gate'." }, "sublabel": { "type": "string" }, "weight": { "$ref": "#/definitions/NodeWeight" }, "nudge": { "type": "number", "description": "Vertical fine-tune in viewBox units, applied after the layout centres the node." }, "shape": { "$ref": "#/definitions/DiagramNodeShape", "description": "Draw this node as something other than a hairline card." }, "textAnchor": { "$ref": "#/definitions/DiagramNodeTextAnchor", "description": "Label alignment for `event` shapes (timeline)." }, "fields": { "type": "array", "items": { "$ref": "#/definitions/TableField" }, "description": "ER table rows (only meaningful for `shape: 'table'`)." }, "initial": { "type": "boolean", "description": "State-machine: draw a double outline (initial state)." }, "final": { "type": "boolean", "description": "State-machine: draw a hollow centre (final state)." } }, "required": ["id", "label", "description"], "additionalProperties": false };
function validate24(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.id === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "id" }, message: "must have required property 'id'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.label === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "label" }, message: "must have required property 'label'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.description === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "description" }, message: "must have required property 'description'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!func2.call(schema34.properties, key0)) {
        const err3 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.id !== void 0) {
      if (typeof data.id !== "string") {
        const err4 = { instancePath: instancePath + "/id", schemaPath: "#/properties/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.label !== void 0) {
      if (typeof data.label !== "string") {
        const err5 = { instancePath: instancePath + "/label", schemaPath: "#/properties/label/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.description !== void 0) {
      if (typeof data.description !== "string") {
        const err6 = { instancePath: instancePath + "/description", schemaPath: "#/properties/description/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.kind !== void 0) {
      if (typeof data.kind !== "string") {
        const err7 = { instancePath: instancePath + "/kind", schemaPath: "#/properties/kind/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
    if (data.sublabel !== void 0) {
      if (typeof data.sublabel !== "string") {
        const err8 = { instancePath: instancePath + "/sublabel", schemaPath: "#/properties/sublabel/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
    if (data.weight !== void 0) {
      let data5 = data.weight;
      if (typeof data5 !== "string") {
        const err9 = { instancePath: instancePath + "/weight", schemaPath: "#/definitions/NodeWeight/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err9];
        } else {
          vErrors.push(err9);
        }
        errors++;
      }
      if (!(data5 === "primary" || data5 === "secondary" || data5 === "muted")) {
        const err10 = { instancePath: instancePath + "/weight", schemaPath: "#/definitions/NodeWeight/enum", keyword: "enum", params: { allowedValues: schema20.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
    }
    if (data.nudge !== void 0) {
      if (!(typeof data.nudge == "number")) {
        const err11 = { instancePath: instancePath + "/nudge", schemaPath: "#/properties/nudge/type", keyword: "type", params: { type: "number" }, message: "must be number" };
        if (vErrors === null) {
          vErrors = [err11];
        } else {
          vErrors.push(err11);
        }
        errors++;
      }
    }
    if (data.shape !== void 0) {
      let data7 = data.shape;
      if (typeof data7 !== "string") {
        const err12 = { instancePath: instancePath + "/shape", schemaPath: "#/definitions/DiagramNodeShape/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err12];
        } else {
          vErrors.push(err12);
        }
        errors++;
      }
      if (!(data7 === "card" || data7 === "state" || data7 === "table" || data7 === "event" || data7 === "terminal" || data7 === "bar")) {
        const err13 = { instancePath: instancePath + "/shape", schemaPath: "#/definitions/DiagramNodeShape/enum", keyword: "enum", params: { allowedValues: schema21.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err13];
        } else {
          vErrors.push(err13);
        }
        errors++;
      }
    }
    if (data.textAnchor !== void 0) {
      let data8 = data.textAnchor;
      if (typeof data8 !== "string") {
        const err14 = { instancePath: instancePath + "/textAnchor", schemaPath: "#/definitions/DiagramNodeTextAnchor/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err14];
        } else {
          vErrors.push(err14);
        }
        errors++;
      }
      if (!(data8 === "start" || data8 === "end" || data8 === "middle")) {
        const err15 = { instancePath: instancePath + "/textAnchor", schemaPath: "#/definitions/DiagramNodeTextAnchor/enum", keyword: "enum", params: { allowedValues: schema22.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err15];
        } else {
          vErrors.push(err15);
        }
        errors++;
      }
    }
    if (data.fields !== void 0) {
      let data9 = data.fields;
      if (Array.isArray(data9)) {
        const len0 = data9.length;
        for (let i0 = 0; i0 < len0; i0++) {
          let data10 = data9[i0];
          if (data10 && typeof data10 == "object" && !Array.isArray(data10)) {
            if (data10.name === void 0) {
              const err16 = { instancePath: instancePath + "/fields/" + i0, schemaPath: "#/definitions/TableField/required", keyword: "required", params: { missingProperty: "name" }, message: "must have required property 'name'" };
              if (vErrors === null) {
                vErrors = [err16];
              } else {
                vErrors.push(err16);
              }
              errors++;
            }
            for (const key1 in data10) {
              if (!(key1 === "name" || key1 === "type" || key1 === "key")) {
                const err17 = { instancePath: instancePath + "/fields/" + i0, schemaPath: "#/definitions/TableField/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err17];
                } else {
                  vErrors.push(err17);
                }
                errors++;
              }
            }
            if (data10.name !== void 0) {
              if (typeof data10.name !== "string") {
                const err18 = { instancePath: instancePath + "/fields/" + i0 + "/name", schemaPath: "#/definitions/TableField/properties/name/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err18];
                } else {
                  vErrors.push(err18);
                }
                errors++;
              }
            }
            if (data10.type !== void 0) {
              if (typeof data10.type !== "string") {
                const err19 = { instancePath: instancePath + "/fields/" + i0 + "/type", schemaPath: "#/definitions/TableField/properties/type/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err19];
                } else {
                  vErrors.push(err19);
                }
                errors++;
              }
            }
            if (data10.key !== void 0) {
              let data13 = data10.key;
              if (typeof data13 !== "string") {
                const err20 = { instancePath: instancePath + "/fields/" + i0 + "/key", schemaPath: "#/definitions/TableField/properties/key/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err20];
                } else {
                  vErrors.push(err20);
                }
                errors++;
              }
              if (!(data13 === "pk" || data13 === "fk" || data13 === "unique")) {
                const err21 = { instancePath: instancePath + "/fields/" + i0 + "/key", schemaPath: "#/definitions/TableField/properties/key/enum", keyword: "enum", params: { allowedValues: schema23.properties.key.enum }, message: "must be equal to one of the allowed values" };
                if (vErrors === null) {
                  vErrors = [err21];
                } else {
                  vErrors.push(err21);
                }
                errors++;
              }
            }
          } else {
            const err22 = { instancePath: instancePath + "/fields/" + i0, schemaPath: "#/definitions/TableField/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err22];
            } else {
              vErrors.push(err22);
            }
            errors++;
          }
        }
      } else {
        const err23 = { instancePath: instancePath + "/fields", schemaPath: "#/properties/fields/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err23];
        } else {
          vErrors.push(err23);
        }
        errors++;
      }
    }
    if (data.initial !== void 0) {
      if (typeof data.initial !== "boolean") {
        const err24 = { instancePath: instancePath + "/initial", schemaPath: "#/properties/initial/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
        if (vErrors === null) {
          vErrors = [err24];
        } else {
          vErrors.push(err24);
        }
        errors++;
      }
    }
    if (data.final !== void 0) {
      if (typeof data.final !== "boolean") {
        const err25 = { instancePath: instancePath + "/final", schemaPath: "#/properties/final/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
        if (vErrors === null) {
          vErrors = [err25];
        } else {
          vErrors.push(err25);
        }
        errors++;
      }
    }
  } else {
    const err26 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err26];
    } else {
      vErrors.push(err26);
    }
    errors++;
  }
  validate24.errors = vErrors;
  return errors === 0;
}
function validate23(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.type === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "type" }, message: "must have required property 'type'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.caption === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "caption" }, message: "must have required property 'caption'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.legend === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "legend" }, message: "must have required property 'legend'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data.nodes === void 0) {
      const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "nodes" }, message: "must have required property 'nodes'" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    if (data.edges === void 0) {
      const err4 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "edges" }, message: "must have required property 'edges'" };
      if (vErrors === null) {
        vErrors = [err4];
      } else {
        vErrors.push(err4);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "type" || key0 === "caption" || key0 === "legend" || key0 === "nodes" || key0 === "edges" || key0 === "level" || key0 === "direction")) {
        const err5 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.type !== void 0) {
      let data0 = data.type;
      if (typeof data0 !== "string") {
        const err6 = { instancePath: instancePath + "/type", schemaPath: "#/properties/type/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
      if ("flowchart" !== data0) {
        const err7 = { instancePath: instancePath + "/type", schemaPath: "#/properties/type/const", keyword: "const", params: { allowedValue: "flowchart" }, message: "must be equal to constant" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
    if (data.caption !== void 0) {
      if (typeof data.caption !== "string") {
        const err8 = { instancePath: instancePath + "/caption", schemaPath: "#/properties/caption/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
    if (data.legend !== void 0) {
      let data2 = data.legend;
      if (data2 && typeof data2 == "object" && !Array.isArray(data2)) {
        if (data2.main === void 0) {
          const err9 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/required", keyword: "required", params: { missingProperty: "main" }, message: "must have required property 'main'" };
          if (vErrors === null) {
            vErrors = [err9];
          } else {
            vErrors.push(err9);
          }
          errors++;
        }
        if (data2.branch === void 0) {
          const err10 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/required", keyword: "required", params: { missingProperty: "branch" }, message: "must have required property 'branch'" };
          if (vErrors === null) {
            vErrors = [err10];
          } else {
            vErrors.push(err10);
          }
          errors++;
        }
        for (const key1 in data2) {
          if (!(key1 === "main" || key1 === "branch")) {
            const err11 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err11];
            } else {
              vErrors.push(err11);
            }
            errors++;
          }
        }
        if (data2.main !== void 0) {
          if (typeof data2.main !== "string") {
            const err12 = { instancePath: instancePath + "/legend/main", schemaPath: "#/properties/legend/properties/main/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err12];
            } else {
              vErrors.push(err12);
            }
            errors++;
          }
        }
        if (data2.branch !== void 0) {
          if (typeof data2.branch !== "string") {
            const err13 = { instancePath: instancePath + "/legend/branch", schemaPath: "#/properties/legend/properties/branch/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err13];
            } else {
              vErrors.push(err13);
            }
            errors++;
          }
        }
      } else {
        const err14 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err14];
        } else {
          vErrors.push(err14);
        }
        errors++;
      }
    }
    if (data.nodes !== void 0) {
      let data5 = data.nodes;
      if (Array.isArray(data5)) {
        const len0 = data5.length;
        for (let i0 = 0; i0 < len0; i0++) {
          if (!validate24(data5[i0], { instancePath: instancePath + "/nodes/" + i0, parentData: data5, parentDataProperty: i0, rootData })) {
            vErrors = vErrors === null ? validate24.errors : vErrors.concat(validate24.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err15 = { instancePath: instancePath + "/nodes", schemaPath: "#/properties/nodes/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err15];
        } else {
          vErrors.push(err15);
        }
        errors++;
      }
    }
    if (data.edges !== void 0) {
      let data7 = data.edges;
      if (Array.isArray(data7)) {
        const len1 = data7.length;
        for (let i1 = 0; i1 < len1; i1++) {
          if (!validate18(data7[i1], { instancePath: instancePath + "/edges/" + i1, parentData: data7, parentDataProperty: i1, rootData })) {
            vErrors = vErrors === null ? validate18.errors : vErrors.concat(validate18.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err16 = { instancePath: instancePath + "/edges", schemaPath: "#/properties/edges/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err16];
        } else {
          vErrors.push(err16);
        }
        errors++;
      }
    }
    if (data.level !== void 0) {
      if (!(typeof data.level == "number")) {
        const err17 = { instancePath: instancePath + "/level", schemaPath: "#/properties/level/type", keyword: "type", params: { type: "number" }, message: "must be number" };
        if (vErrors === null) {
          vErrors = [err17];
        } else {
          vErrors.push(err17);
        }
        errors++;
      }
    }
    if (data.direction !== void 0) {
      let data10 = data.direction;
      if (typeof data10 !== "string") {
        const err18 = { instancePath: instancePath + "/direction", schemaPath: "#/properties/direction/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err18];
        } else {
          vErrors.push(err18);
        }
        errors++;
      }
      if (!(data10 === "top-down" || data10 === "left-right")) {
        const err19 = { instancePath: instancePath + "/direction", schemaPath: "#/properties/direction/enum", keyword: "enum", params: { allowedValues: schema33.properties.direction.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err19];
        } else {
          vErrors.push(err19);
        }
        errors++;
      }
    }
  } else {
    const err20 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err20];
    } else {
      vErrors.push(err20);
    }
    errors++;
  }
  validate23.errors = vErrors;
  return errors === 0;
}
function validate29(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.id === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "id" }, message: "must have required property 'id'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.from === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "from" }, message: "must have required property 'from'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.to === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "to" }, message: "must have required property 'to'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "id" || key0 === "from" || key0 === "to" || key0 === "label" || key0 === "variant" || key0 === "dashed" || key0 === "activation")) {
        const err3 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.id !== void 0) {
      if (typeof data.id !== "string") {
        const err4 = { instancePath: instancePath + "/id", schemaPath: "#/properties/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.from !== void 0) {
      if (typeof data.from !== "string") {
        const err5 = { instancePath: instancePath + "/from", schemaPath: "#/properties/from/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.to !== void 0) {
      if (typeof data.to !== "string") {
        const err6 = { instancePath: instancePath + "/to", schemaPath: "#/properties/to/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.label !== void 0) {
      if (typeof data.label !== "string") {
        const err7 = { instancePath: instancePath + "/label", schemaPath: "#/properties/label/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
    if (data.variant !== void 0) {
      let data4 = data.variant;
      if (typeof data4 !== "string") {
        const err8 = { instancePath: instancePath + "/variant", schemaPath: "#/definitions/EdgeVariant/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
      if (!(data4 === "main" || data4 === "branch")) {
        const err9 = { instancePath: instancePath + "/variant", schemaPath: "#/definitions/EdgeVariant/enum", keyword: "enum", params: { allowedValues: schema25.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err9];
        } else {
          vErrors.push(err9);
        }
        errors++;
      }
    }
    if (data.dashed !== void 0) {
      if (typeof data.dashed !== "boolean") {
        const err10 = { instancePath: instancePath + "/dashed", schemaPath: "#/properties/dashed/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
    }
    if (data.activation !== void 0) {
      if (typeof data.activation !== "boolean") {
        const err11 = { instancePath: instancePath + "/activation", schemaPath: "#/properties/activation/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
        if (vErrors === null) {
          vErrors = [err11];
        } else {
          vErrors.push(err11);
        }
        errors++;
      }
    }
  } else {
    const err12 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err12];
    } else {
      vErrors.push(err12);
    }
    errors++;
  }
  validate29.errors = vErrors;
  return errors === 0;
}
function validate28(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.type === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "type" }, message: "must have required property 'type'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.caption === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "caption" }, message: "must have required property 'caption'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.legend === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "legend" }, message: "must have required property 'legend'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data.participants === void 0) {
      const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "participants" }, message: "must have required property 'participants'" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    if (data.messages === void 0) {
      const err4 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "messages" }, message: "must have required property 'messages'" };
      if (vErrors === null) {
        vErrors = [err4];
      } else {
        vErrors.push(err4);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "type" || key0 === "caption" || key0 === "legend" || key0 === "participants" || key0 === "messages")) {
        const err5 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.type !== void 0) {
      let data0 = data.type;
      if (typeof data0 !== "string") {
        const err6 = { instancePath: instancePath + "/type", schemaPath: "#/properties/type/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
      if ("sequence" !== data0) {
        const err7 = { instancePath: instancePath + "/type", schemaPath: "#/properties/type/const", keyword: "const", params: { allowedValue: "sequence" }, message: "must be equal to constant" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
    if (data.caption !== void 0) {
      if (typeof data.caption !== "string") {
        const err8 = { instancePath: instancePath + "/caption", schemaPath: "#/properties/caption/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
    if (data.legend !== void 0) {
      let data2 = data.legend;
      if (data2 && typeof data2 == "object" && !Array.isArray(data2)) {
        if (data2.main === void 0) {
          const err9 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/required", keyword: "required", params: { missingProperty: "main" }, message: "must have required property 'main'" };
          if (vErrors === null) {
            vErrors = [err9];
          } else {
            vErrors.push(err9);
          }
          errors++;
        }
        if (data2.branch === void 0) {
          const err10 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/required", keyword: "required", params: { missingProperty: "branch" }, message: "must have required property 'branch'" };
          if (vErrors === null) {
            vErrors = [err10];
          } else {
            vErrors.push(err10);
          }
          errors++;
        }
        for (const key1 in data2) {
          if (!(key1 === "main" || key1 === "branch")) {
            const err11 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err11];
            } else {
              vErrors.push(err11);
            }
            errors++;
          }
        }
        if (data2.main !== void 0) {
          if (typeof data2.main !== "string") {
            const err12 = { instancePath: instancePath + "/legend/main", schemaPath: "#/properties/legend/properties/main/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err12];
            } else {
              vErrors.push(err12);
            }
            errors++;
          }
        }
        if (data2.branch !== void 0) {
          if (typeof data2.branch !== "string") {
            const err13 = { instancePath: instancePath + "/legend/branch", schemaPath: "#/properties/legend/properties/branch/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err13];
            } else {
              vErrors.push(err13);
            }
            errors++;
          }
        }
      } else {
        const err14 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err14];
        } else {
          vErrors.push(err14);
        }
        errors++;
      }
    }
    if (data.participants !== void 0) {
      let data5 = data.participants;
      if (Array.isArray(data5)) {
        const len0 = data5.length;
        for (let i0 = 0; i0 < len0; i0++) {
          let data6 = data5[i0];
          if (data6 && typeof data6 == "object" && !Array.isArray(data6)) {
            if (data6.id === void 0) {
              const err15 = { instancePath: instancePath + "/participants/" + i0, schemaPath: "#/definitions/SequenceParticipant/required", keyword: "required", params: { missingProperty: "id" }, message: "must have required property 'id'" };
              if (vErrors === null) {
                vErrors = [err15];
              } else {
                vErrors.push(err15);
              }
              errors++;
            }
            if (data6.label === void 0) {
              const err16 = { instancePath: instancePath + "/participants/" + i0, schemaPath: "#/definitions/SequenceParticipant/required", keyword: "required", params: { missingProperty: "label" }, message: "must have required property 'label'" };
              if (vErrors === null) {
                vErrors = [err16];
              } else {
                vErrors.push(err16);
              }
              errors++;
            }
            for (const key2 in data6) {
              if (!(key2 === "id" || key2 === "label" || key2 === "kind")) {
                const err17 = { instancePath: instancePath + "/participants/" + i0, schemaPath: "#/definitions/SequenceParticipant/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key2 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err17];
                } else {
                  vErrors.push(err17);
                }
                errors++;
              }
            }
            if (data6.id !== void 0) {
              if (typeof data6.id !== "string") {
                const err18 = { instancePath: instancePath + "/participants/" + i0 + "/id", schemaPath: "#/definitions/SequenceParticipant/properties/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err18];
                } else {
                  vErrors.push(err18);
                }
                errors++;
              }
            }
            if (data6.label !== void 0) {
              if (typeof data6.label !== "string") {
                const err19 = { instancePath: instancePath + "/participants/" + i0 + "/label", schemaPath: "#/definitions/SequenceParticipant/properties/label/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err19];
                } else {
                  vErrors.push(err19);
                }
                errors++;
              }
            }
            if (data6.kind !== void 0) {
              if (typeof data6.kind !== "string") {
                const err20 = { instancePath: instancePath + "/participants/" + i0 + "/kind", schemaPath: "#/definitions/SequenceParticipant/properties/kind/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err20];
                } else {
                  vErrors.push(err20);
                }
                errors++;
              }
            }
          } else {
            const err21 = { instancePath: instancePath + "/participants/" + i0, schemaPath: "#/definitions/SequenceParticipant/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err21];
            } else {
              vErrors.push(err21);
            }
            errors++;
          }
        }
      } else {
        const err22 = { instancePath: instancePath + "/participants", schemaPath: "#/properties/participants/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err22];
        } else {
          vErrors.push(err22);
        }
        errors++;
      }
    }
    if (data.messages !== void 0) {
      let data10 = data.messages;
      if (Array.isArray(data10)) {
        const len1 = data10.length;
        for (let i1 = 0; i1 < len1; i1++) {
          if (!validate29(data10[i1], { instancePath: instancePath + "/messages/" + i1, parentData: data10, parentDataProperty: i1, rootData })) {
            vErrors = vErrors === null ? validate29.errors : vErrors.concat(validate29.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err23 = { instancePath: instancePath + "/messages", schemaPath: "#/properties/messages/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err23];
        } else {
          vErrors.push(err23);
        }
        errors++;
      }
    }
  } else {
    const err24 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err24];
    } else {
      vErrors.push(err24);
    }
    errors++;
  }
  validate28.errors = vErrors;
  return errors === 0;
}
function validate33(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.id === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "id" }, message: "must have required property 'id'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.label === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "label" }, message: "must have required property 'label'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "id" || key0 === "label" || key0 === "kind" || key0 === "sublabel" || key0 === "weight" || key0 === "description" || key0 === "initial" || key0 === "final")) {
        const err2 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
    if (data.id !== void 0) {
      if (typeof data.id !== "string") {
        const err3 = { instancePath: instancePath + "/id", schemaPath: "#/properties/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.label !== void 0) {
      if (typeof data.label !== "string") {
        const err4 = { instancePath: instancePath + "/label", schemaPath: "#/properties/label/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.kind !== void 0) {
      if (typeof data.kind !== "string") {
        const err5 = { instancePath: instancePath + "/kind", schemaPath: "#/properties/kind/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.sublabel !== void 0) {
      if (typeof data.sublabel !== "string") {
        const err6 = { instancePath: instancePath + "/sublabel", schemaPath: "#/properties/sublabel/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.weight !== void 0) {
      let data4 = data.weight;
      if (typeof data4 !== "string") {
        const err7 = { instancePath: instancePath + "/weight", schemaPath: "#/definitions/NodeWeight/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
      if (!(data4 === "primary" || data4 === "secondary" || data4 === "muted")) {
        const err8 = { instancePath: instancePath + "/weight", schemaPath: "#/definitions/NodeWeight/enum", keyword: "enum", params: { allowedValues: schema20.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
    if (data.description !== void 0) {
      if (typeof data.description !== "string") {
        const err9 = { instancePath: instancePath + "/description", schemaPath: "#/properties/description/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err9];
        } else {
          vErrors.push(err9);
        }
        errors++;
      }
    }
    if (data.initial !== void 0) {
      if (typeof data.initial !== "boolean") {
        const err10 = { instancePath: instancePath + "/initial", schemaPath: "#/properties/initial/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
    }
    if (data.final !== void 0) {
      if (typeof data.final !== "boolean") {
        const err11 = { instancePath: instancePath + "/final", schemaPath: "#/properties/final/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
        if (vErrors === null) {
          vErrors = [err11];
        } else {
          vErrors.push(err11);
        }
        errors++;
      }
    }
  } else {
    const err12 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err12];
    } else {
      vErrors.push(err12);
    }
    errors++;
  }
  validate33.errors = vErrors;
  return errors === 0;
}
function validate35(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.from === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "from" }, message: "must have required property 'from'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.to === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "to" }, message: "must have required property 'to'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "id" || key0 === "from" || key0 === "to" || key0 === "label" || key0 === "variant" || key0 === "dashed")) {
        const err2 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
    if (data.id !== void 0) {
      if (typeof data.id !== "string") {
        const err3 = { instancePath: instancePath + "/id", schemaPath: "#/properties/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.from !== void 0) {
      if (typeof data.from !== "string") {
        const err4 = { instancePath: instancePath + "/from", schemaPath: "#/properties/from/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.to !== void 0) {
      if (typeof data.to !== "string") {
        const err5 = { instancePath: instancePath + "/to", schemaPath: "#/properties/to/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.label !== void 0) {
      if (typeof data.label !== "string") {
        const err6 = { instancePath: instancePath + "/label", schemaPath: "#/properties/label/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.variant !== void 0) {
      let data4 = data.variant;
      if (typeof data4 !== "string") {
        const err7 = { instancePath: instancePath + "/variant", schemaPath: "#/definitions/EdgeVariant/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
      if (!(data4 === "main" || data4 === "branch")) {
        const err8 = { instancePath: instancePath + "/variant", schemaPath: "#/definitions/EdgeVariant/enum", keyword: "enum", params: { allowedValues: schema25.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
    if (data.dashed !== void 0) {
      if (typeof data.dashed !== "boolean") {
        const err9 = { instancePath: instancePath + "/dashed", schemaPath: "#/properties/dashed/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
        if (vErrors === null) {
          vErrors = [err9];
        } else {
          vErrors.push(err9);
        }
        errors++;
      }
    }
  } else {
    const err10 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err10];
    } else {
      vErrors.push(err10);
    }
    errors++;
  }
  validate35.errors = vErrors;
  return errors === 0;
}
function validate32(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.type === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "type" }, message: "must have required property 'type'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.caption === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "caption" }, message: "must have required property 'caption'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.legend === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "legend" }, message: "must have required property 'legend'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data.states === void 0) {
      const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "states" }, message: "must have required property 'states'" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    if (data.transitions === void 0) {
      const err4 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "transitions" }, message: "must have required property 'transitions'" };
      if (vErrors === null) {
        vErrors = [err4];
      } else {
        vErrors.push(err4);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "type" || key0 === "caption" || key0 === "legend" || key0 === "states" || key0 === "transitions")) {
        const err5 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.type !== void 0) {
      let data0 = data.type;
      if (typeof data0 !== "string") {
        const err6 = { instancePath: instancePath + "/type", schemaPath: "#/properties/type/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
      if ("state-machine" !== data0) {
        const err7 = { instancePath: instancePath + "/type", schemaPath: "#/properties/type/const", keyword: "const", params: { allowedValue: "state-machine" }, message: "must be equal to constant" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
    if (data.caption !== void 0) {
      if (typeof data.caption !== "string") {
        const err8 = { instancePath: instancePath + "/caption", schemaPath: "#/properties/caption/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
    if (data.legend !== void 0) {
      let data2 = data.legend;
      if (data2 && typeof data2 == "object" && !Array.isArray(data2)) {
        if (data2.main === void 0) {
          const err9 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/required", keyword: "required", params: { missingProperty: "main" }, message: "must have required property 'main'" };
          if (vErrors === null) {
            vErrors = [err9];
          } else {
            vErrors.push(err9);
          }
          errors++;
        }
        if (data2.branch === void 0) {
          const err10 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/required", keyword: "required", params: { missingProperty: "branch" }, message: "must have required property 'branch'" };
          if (vErrors === null) {
            vErrors = [err10];
          } else {
            vErrors.push(err10);
          }
          errors++;
        }
        for (const key1 in data2) {
          if (!(key1 === "main" || key1 === "branch")) {
            const err11 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err11];
            } else {
              vErrors.push(err11);
            }
            errors++;
          }
        }
        if (data2.main !== void 0) {
          if (typeof data2.main !== "string") {
            const err12 = { instancePath: instancePath + "/legend/main", schemaPath: "#/properties/legend/properties/main/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err12];
            } else {
              vErrors.push(err12);
            }
            errors++;
          }
        }
        if (data2.branch !== void 0) {
          if (typeof data2.branch !== "string") {
            const err13 = { instancePath: instancePath + "/legend/branch", schemaPath: "#/properties/legend/properties/branch/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err13];
            } else {
              vErrors.push(err13);
            }
            errors++;
          }
        }
      } else {
        const err14 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err14];
        } else {
          vErrors.push(err14);
        }
        errors++;
      }
    }
    if (data.states !== void 0) {
      let data5 = data.states;
      if (Array.isArray(data5)) {
        const len0 = data5.length;
        for (let i0 = 0; i0 < len0; i0++) {
          if (!validate33(data5[i0], { instancePath: instancePath + "/states/" + i0, parentData: data5, parentDataProperty: i0, rootData })) {
            vErrors = vErrors === null ? validate33.errors : vErrors.concat(validate33.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err15 = { instancePath: instancePath + "/states", schemaPath: "#/properties/states/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err15];
        } else {
          vErrors.push(err15);
        }
        errors++;
      }
    }
    if (data.transitions !== void 0) {
      let data7 = data.transitions;
      if (Array.isArray(data7)) {
        const len1 = data7.length;
        for (let i1 = 0; i1 < len1; i1++) {
          if (!validate35(data7[i1], { instancePath: instancePath + "/transitions/" + i1, parentData: data7, parentDataProperty: i1, rootData })) {
            vErrors = vErrors === null ? validate35.errors : vErrors.concat(validate35.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err16 = { instancePath: instancePath + "/transitions", schemaPath: "#/properties/transitions/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err16];
        } else {
          vErrors.push(err16);
        }
        errors++;
      }
    }
  } else {
    const err17 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err17];
    } else {
      vErrors.push(err17);
    }
    errors++;
  }
  validate32.errors = vErrors;
  return errors === 0;
}
function validate39(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.id === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "id" }, message: "must have required property 'id'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.label === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "label" }, message: "must have required property 'label'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.fields === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "fields" }, message: "must have required property 'fields'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "id" || key0 === "label" || key0 === "kind" || key0 === "weight" || key0 === "fields")) {
        const err3 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.id !== void 0) {
      if (typeof data.id !== "string") {
        const err4 = { instancePath: instancePath + "/id", schemaPath: "#/properties/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.label !== void 0) {
      if (typeof data.label !== "string") {
        const err5 = { instancePath: instancePath + "/label", schemaPath: "#/properties/label/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.kind !== void 0) {
      if (typeof data.kind !== "string") {
        const err6 = { instancePath: instancePath + "/kind", schemaPath: "#/properties/kind/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.weight !== void 0) {
      let data3 = data.weight;
      if (typeof data3 !== "string") {
        const err7 = { instancePath: instancePath + "/weight", schemaPath: "#/definitions/NodeWeight/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
      if (!(data3 === "primary" || data3 === "secondary" || data3 === "muted")) {
        const err8 = { instancePath: instancePath + "/weight", schemaPath: "#/definitions/NodeWeight/enum", keyword: "enum", params: { allowedValues: schema20.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
    if (data.fields !== void 0) {
      let data4 = data.fields;
      if (Array.isArray(data4)) {
        const len0 = data4.length;
        for (let i0 = 0; i0 < len0; i0++) {
          let data5 = data4[i0];
          if (data5 && typeof data5 == "object" && !Array.isArray(data5)) {
            if (data5.name === void 0) {
              const err9 = { instancePath: instancePath + "/fields/" + i0, schemaPath: "#/definitions/TableField/required", keyword: "required", params: { missingProperty: "name" }, message: "must have required property 'name'" };
              if (vErrors === null) {
                vErrors = [err9];
              } else {
                vErrors.push(err9);
              }
              errors++;
            }
            for (const key1 in data5) {
              if (!(key1 === "name" || key1 === "type" || key1 === "key")) {
                const err10 = { instancePath: instancePath + "/fields/" + i0, schemaPath: "#/definitions/TableField/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err10];
                } else {
                  vErrors.push(err10);
                }
                errors++;
              }
            }
            if (data5.name !== void 0) {
              if (typeof data5.name !== "string") {
                const err11 = { instancePath: instancePath + "/fields/" + i0 + "/name", schemaPath: "#/definitions/TableField/properties/name/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err11];
                } else {
                  vErrors.push(err11);
                }
                errors++;
              }
            }
            if (data5.type !== void 0) {
              if (typeof data5.type !== "string") {
                const err12 = { instancePath: instancePath + "/fields/" + i0 + "/type", schemaPath: "#/definitions/TableField/properties/type/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err12];
                } else {
                  vErrors.push(err12);
                }
                errors++;
              }
            }
            if (data5.key !== void 0) {
              let data8 = data5.key;
              if (typeof data8 !== "string") {
                const err13 = { instancePath: instancePath + "/fields/" + i0 + "/key", schemaPath: "#/definitions/TableField/properties/key/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err13];
                } else {
                  vErrors.push(err13);
                }
                errors++;
              }
              if (!(data8 === "pk" || data8 === "fk" || data8 === "unique")) {
                const err14 = { instancePath: instancePath + "/fields/" + i0 + "/key", schemaPath: "#/definitions/TableField/properties/key/enum", keyword: "enum", params: { allowedValues: schema23.properties.key.enum }, message: "must be equal to one of the allowed values" };
                if (vErrors === null) {
                  vErrors = [err14];
                } else {
                  vErrors.push(err14);
                }
                errors++;
              }
            }
          } else {
            const err15 = { instancePath: instancePath + "/fields/" + i0, schemaPath: "#/definitions/TableField/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err15];
            } else {
              vErrors.push(err15);
            }
            errors++;
          }
        }
      } else {
        const err16 = { instancePath: instancePath + "/fields", schemaPath: "#/properties/fields/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err16];
        } else {
          vErrors.push(err16);
        }
        errors++;
      }
    }
  } else {
    const err17 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err17];
    } else {
      vErrors.push(err17);
    }
    errors++;
  }
  validate39.errors = vErrors;
  return errors === 0;
}
function validate41(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.from === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "from" }, message: "must have required property 'from'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.to === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "to" }, message: "must have required property 'to'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "id" || key0 === "from" || key0 === "to" || key0 === "label" || key0 === "variant" || key0 === "dashed")) {
        const err2 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
    if (data.id !== void 0) {
      if (typeof data.id !== "string") {
        const err3 = { instancePath: instancePath + "/id", schemaPath: "#/properties/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.from !== void 0) {
      if (typeof data.from !== "string") {
        const err4 = { instancePath: instancePath + "/from", schemaPath: "#/properties/from/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.to !== void 0) {
      if (typeof data.to !== "string") {
        const err5 = { instancePath: instancePath + "/to", schemaPath: "#/properties/to/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.label !== void 0) {
      if (typeof data.label !== "string") {
        const err6 = { instancePath: instancePath + "/label", schemaPath: "#/properties/label/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.variant !== void 0) {
      let data4 = data.variant;
      if (typeof data4 !== "string") {
        const err7 = { instancePath: instancePath + "/variant", schemaPath: "#/definitions/EdgeVariant/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
      if (!(data4 === "main" || data4 === "branch")) {
        const err8 = { instancePath: instancePath + "/variant", schemaPath: "#/definitions/EdgeVariant/enum", keyword: "enum", params: { allowedValues: schema25.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
    if (data.dashed !== void 0) {
      if (typeof data.dashed !== "boolean") {
        const err9 = { instancePath: instancePath + "/dashed", schemaPath: "#/properties/dashed/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
        if (vErrors === null) {
          vErrors = [err9];
        } else {
          vErrors.push(err9);
        }
        errors++;
      }
    }
  } else {
    const err10 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err10];
    } else {
      vErrors.push(err10);
    }
    errors++;
  }
  validate41.errors = vErrors;
  return errors === 0;
}
function validate38(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.type === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "type" }, message: "must have required property 'type'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.caption === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "caption" }, message: "must have required property 'caption'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.legend === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "legend" }, message: "must have required property 'legend'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data.entities === void 0) {
      const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "entities" }, message: "must have required property 'entities'" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    if (data.relations === void 0) {
      const err4 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "relations" }, message: "must have required property 'relations'" };
      if (vErrors === null) {
        vErrors = [err4];
      } else {
        vErrors.push(err4);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "type" || key0 === "caption" || key0 === "legend" || key0 === "entities" || key0 === "relations")) {
        const err5 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.type !== void 0) {
      let data0 = data.type;
      if (typeof data0 !== "string") {
        const err6 = { instancePath: instancePath + "/type", schemaPath: "#/properties/type/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
      if ("er" !== data0) {
        const err7 = { instancePath: instancePath + "/type", schemaPath: "#/properties/type/const", keyword: "const", params: { allowedValue: "er" }, message: "must be equal to constant" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
    if (data.caption !== void 0) {
      if (typeof data.caption !== "string") {
        const err8 = { instancePath: instancePath + "/caption", schemaPath: "#/properties/caption/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
    if (data.legend !== void 0) {
      let data2 = data.legend;
      if (data2 && typeof data2 == "object" && !Array.isArray(data2)) {
        if (data2.main === void 0) {
          const err9 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/required", keyword: "required", params: { missingProperty: "main" }, message: "must have required property 'main'" };
          if (vErrors === null) {
            vErrors = [err9];
          } else {
            vErrors.push(err9);
          }
          errors++;
        }
        if (data2.branch === void 0) {
          const err10 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/required", keyword: "required", params: { missingProperty: "branch" }, message: "must have required property 'branch'" };
          if (vErrors === null) {
            vErrors = [err10];
          } else {
            vErrors.push(err10);
          }
          errors++;
        }
        for (const key1 in data2) {
          if (!(key1 === "main" || key1 === "branch")) {
            const err11 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err11];
            } else {
              vErrors.push(err11);
            }
            errors++;
          }
        }
        if (data2.main !== void 0) {
          if (typeof data2.main !== "string") {
            const err12 = { instancePath: instancePath + "/legend/main", schemaPath: "#/properties/legend/properties/main/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err12];
            } else {
              vErrors.push(err12);
            }
            errors++;
          }
        }
        if (data2.branch !== void 0) {
          if (typeof data2.branch !== "string") {
            const err13 = { instancePath: instancePath + "/legend/branch", schemaPath: "#/properties/legend/properties/branch/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err13];
            } else {
              vErrors.push(err13);
            }
            errors++;
          }
        }
      } else {
        const err14 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err14];
        } else {
          vErrors.push(err14);
        }
        errors++;
      }
    }
    if (data.entities !== void 0) {
      let data5 = data.entities;
      if (Array.isArray(data5)) {
        const len0 = data5.length;
        for (let i0 = 0; i0 < len0; i0++) {
          if (!validate39(data5[i0], { instancePath: instancePath + "/entities/" + i0, parentData: data5, parentDataProperty: i0, rootData })) {
            vErrors = vErrors === null ? validate39.errors : vErrors.concat(validate39.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err15 = { instancePath: instancePath + "/entities", schemaPath: "#/properties/entities/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err15];
        } else {
          vErrors.push(err15);
        }
        errors++;
      }
    }
    if (data.relations !== void 0) {
      let data7 = data.relations;
      if (Array.isArray(data7)) {
        const len1 = data7.length;
        for (let i1 = 0; i1 < len1; i1++) {
          if (!validate41(data7[i1], { instancePath: instancePath + "/relations/" + i1, parentData: data7, parentDataProperty: i1, rootData })) {
            vErrors = vErrors === null ? validate41.errors : vErrors.concat(validate41.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err16 = { instancePath: instancePath + "/relations", schemaPath: "#/properties/relations/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err16];
        } else {
          vErrors.push(err16);
        }
        errors++;
      }
    }
  } else {
    const err17 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err17];
    } else {
      vErrors.push(err17);
    }
    errors++;
  }
  validate38.errors = vErrors;
  return errors === 0;
}
function validate45(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.id === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "id" }, message: "must have required property 'id'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.label === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "label" }, message: "must have required property 'label'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.description === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "description" }, message: "must have required property 'description'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "id" || key0 === "label" || key0 === "kind" || key0 === "sublabel" || key0 === "description" || key0 === "variant" || key0 === "weight")) {
        const err3 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.id !== void 0) {
      if (typeof data.id !== "string") {
        const err4 = { instancePath: instancePath + "/id", schemaPath: "#/properties/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.label !== void 0) {
      if (typeof data.label !== "string") {
        const err5 = { instancePath: instancePath + "/label", schemaPath: "#/properties/label/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.kind !== void 0) {
      if (typeof data.kind !== "string") {
        const err6 = { instancePath: instancePath + "/kind", schemaPath: "#/properties/kind/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.sublabel !== void 0) {
      if (typeof data.sublabel !== "string") {
        const err7 = { instancePath: instancePath + "/sublabel", schemaPath: "#/properties/sublabel/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
    if (data.description !== void 0) {
      if (typeof data.description !== "string") {
        const err8 = { instancePath: instancePath + "/description", schemaPath: "#/properties/description/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
    if (data.variant !== void 0) {
      let data5 = data.variant;
      if (typeof data5 !== "string") {
        const err9 = { instancePath: instancePath + "/variant", schemaPath: "#/definitions/EdgeVariant/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err9];
        } else {
          vErrors.push(err9);
        }
        errors++;
      }
      if (!(data5 === "main" || data5 === "branch")) {
        const err10 = { instancePath: instancePath + "/variant", schemaPath: "#/definitions/EdgeVariant/enum", keyword: "enum", params: { allowedValues: schema25.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
    }
    if (data.weight !== void 0) {
      let data6 = data.weight;
      if (typeof data6 !== "string") {
        const err11 = { instancePath: instancePath + "/weight", schemaPath: "#/definitions/NodeWeight/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err11];
        } else {
          vErrors.push(err11);
        }
        errors++;
      }
      if (!(data6 === "primary" || data6 === "secondary" || data6 === "muted")) {
        const err12 = { instancePath: instancePath + "/weight", schemaPath: "#/definitions/NodeWeight/enum", keyword: "enum", params: { allowedValues: schema20.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err12];
        } else {
          vErrors.push(err12);
        }
        errors++;
      }
    }
  } else {
    const err13 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err13];
    } else {
      vErrors.push(err13);
    }
    errors++;
  }
  validate45.errors = vErrors;
  return errors === 0;
}
function validate44(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.type === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "type" }, message: "must have required property 'type'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.caption === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "caption" }, message: "must have required property 'caption'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.legend === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "legend" }, message: "must have required property 'legend'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data.events === void 0) {
      const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "events" }, message: "must have required property 'events'" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "type" || key0 === "caption" || key0 === "legend" || key0 === "events")) {
        const err4 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.type !== void 0) {
      let data0 = data.type;
      if (typeof data0 !== "string") {
        const err5 = { instancePath: instancePath + "/type", schemaPath: "#/properties/type/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
      if ("timeline" !== data0) {
        const err6 = { instancePath: instancePath + "/type", schemaPath: "#/properties/type/const", keyword: "const", params: { allowedValue: "timeline" }, message: "must be equal to constant" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.caption !== void 0) {
      if (typeof data.caption !== "string") {
        const err7 = { instancePath: instancePath + "/caption", schemaPath: "#/properties/caption/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
    if (data.legend !== void 0) {
      let data2 = data.legend;
      if (data2 && typeof data2 == "object" && !Array.isArray(data2)) {
        if (data2.main === void 0) {
          const err8 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/required", keyword: "required", params: { missingProperty: "main" }, message: "must have required property 'main'" };
          if (vErrors === null) {
            vErrors = [err8];
          } else {
            vErrors.push(err8);
          }
          errors++;
        }
        if (data2.branch === void 0) {
          const err9 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/required", keyword: "required", params: { missingProperty: "branch" }, message: "must have required property 'branch'" };
          if (vErrors === null) {
            vErrors = [err9];
          } else {
            vErrors.push(err9);
          }
          errors++;
        }
        for (const key1 in data2) {
          if (!(key1 === "main" || key1 === "branch")) {
            const err10 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err10];
            } else {
              vErrors.push(err10);
            }
            errors++;
          }
        }
        if (data2.main !== void 0) {
          if (typeof data2.main !== "string") {
            const err11 = { instancePath: instancePath + "/legend/main", schemaPath: "#/properties/legend/properties/main/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err11];
            } else {
              vErrors.push(err11);
            }
            errors++;
          }
        }
        if (data2.branch !== void 0) {
          if (typeof data2.branch !== "string") {
            const err12 = { instancePath: instancePath + "/legend/branch", schemaPath: "#/properties/legend/properties/branch/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err12];
            } else {
              vErrors.push(err12);
            }
            errors++;
          }
        }
      } else {
        const err13 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err13];
        } else {
          vErrors.push(err13);
        }
        errors++;
      }
    }
    if (data.events !== void 0) {
      let data5 = data.events;
      if (Array.isArray(data5)) {
        const len0 = data5.length;
        for (let i0 = 0; i0 < len0; i0++) {
          if (!validate45(data5[i0], { instancePath: instancePath + "/events/" + i0, parentData: data5, parentDataProperty: i0, rootData })) {
            vErrors = vErrors === null ? validate45.errors : vErrors.concat(validate45.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err14 = { instancePath: instancePath + "/events", schemaPath: "#/properties/events/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err14];
        } else {
          vErrors.push(err14);
        }
        errors++;
      }
    }
  } else {
    const err15 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err15];
    } else {
      vErrors.push(err15);
    }
    errors++;
  }
  validate44.errors = vErrors;
  return errors === 0;
}
var schema58 = { "type": "object", "properties": { "type": { "type": "string", "const": "swimlane" }, "caption": { "type": "string" }, "legend": { "type": "object", "properties": { "main": { "type": "string" }, "branch": { "type": "string" } }, "required": ["main", "branch"], "additionalProperties": false }, "lanes": { "type": "array", "items": { "$ref": "#/definitions/SwimlaneLane" } }, "nodes": { "type": "array", "items": { "type": "object", "additionalProperties": false, "properties": { "lane": { "type": "string" }, "id": { "type": "string" }, "label": { "type": "string" }, "description": { "type": "string", "description": "Localized explanation shown on hover/focus and available to assistive technology." }, "kind": { "type": "string", "description": "Mono micro-label above the title, e.g. 'Trigger', 'Engine', 'Gate'." }, "sublabel": { "type": "string" }, "weight": { "$ref": "#/definitions/NodeWeight" }, "nudge": { "type": "number", "description": "Vertical fine-tune in viewBox units, applied after the layout centres the node." }, "shape": { "$ref": "#/definitions/DiagramNodeShape", "description": "Draw this node as something other than a hairline card." }, "textAnchor": { "$ref": "#/definitions/DiagramNodeTextAnchor", "description": "Label alignment for `event` shapes (timeline)." }, "fields": { "type": "array", "items": { "$ref": "#/definitions/TableField" }, "description": "ER table rows (only meaningful for `shape: 'table'`)." }, "initial": { "type": "boolean", "description": "State-machine: draw a double outline (initial state)." }, "final": { "type": "boolean", "description": "State-machine: draw a hollow centre (final state)." } }, "required": ["description", "id", "label", "lane"] } }, "edges": { "type": "array", "items": { "$ref": "#/definitions/DiagramEdge" } } }, "required": ["type", "caption", "legend", "lanes", "nodes", "edges"], "additionalProperties": false };
function validate48(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.type === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "type" }, message: "must have required property 'type'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.caption === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "caption" }, message: "must have required property 'caption'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.legend === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "legend" }, message: "must have required property 'legend'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data.lanes === void 0) {
      const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "lanes" }, message: "must have required property 'lanes'" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    if (data.nodes === void 0) {
      const err4 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "nodes" }, message: "must have required property 'nodes'" };
      if (vErrors === null) {
        vErrors = [err4];
      } else {
        vErrors.push(err4);
      }
      errors++;
    }
    if (data.edges === void 0) {
      const err5 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "edges" }, message: "must have required property 'edges'" };
      if (vErrors === null) {
        vErrors = [err5];
      } else {
        vErrors.push(err5);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "type" || key0 === "caption" || key0 === "legend" || key0 === "lanes" || key0 === "nodes" || key0 === "edges")) {
        const err6 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.type !== void 0) {
      let data0 = data.type;
      if (typeof data0 !== "string") {
        const err7 = { instancePath: instancePath + "/type", schemaPath: "#/properties/type/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
      if ("swimlane" !== data0) {
        const err8 = { instancePath: instancePath + "/type", schemaPath: "#/properties/type/const", keyword: "const", params: { allowedValue: "swimlane" }, message: "must be equal to constant" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
    if (data.caption !== void 0) {
      if (typeof data.caption !== "string") {
        const err9 = { instancePath: instancePath + "/caption", schemaPath: "#/properties/caption/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err9];
        } else {
          vErrors.push(err9);
        }
        errors++;
      }
    }
    if (data.legend !== void 0) {
      let data2 = data.legend;
      if (data2 && typeof data2 == "object" && !Array.isArray(data2)) {
        if (data2.main === void 0) {
          const err10 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/required", keyword: "required", params: { missingProperty: "main" }, message: "must have required property 'main'" };
          if (vErrors === null) {
            vErrors = [err10];
          } else {
            vErrors.push(err10);
          }
          errors++;
        }
        if (data2.branch === void 0) {
          const err11 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/required", keyword: "required", params: { missingProperty: "branch" }, message: "must have required property 'branch'" };
          if (vErrors === null) {
            vErrors = [err11];
          } else {
            vErrors.push(err11);
          }
          errors++;
        }
        for (const key1 in data2) {
          if (!(key1 === "main" || key1 === "branch")) {
            const err12 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err12];
            } else {
              vErrors.push(err12);
            }
            errors++;
          }
        }
        if (data2.main !== void 0) {
          if (typeof data2.main !== "string") {
            const err13 = { instancePath: instancePath + "/legend/main", schemaPath: "#/properties/legend/properties/main/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err13];
            } else {
              vErrors.push(err13);
            }
            errors++;
          }
        }
        if (data2.branch !== void 0) {
          if (typeof data2.branch !== "string") {
            const err14 = { instancePath: instancePath + "/legend/branch", schemaPath: "#/properties/legend/properties/branch/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err14];
            } else {
              vErrors.push(err14);
            }
            errors++;
          }
        }
      } else {
        const err15 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err15];
        } else {
          vErrors.push(err15);
        }
        errors++;
      }
    }
    if (data.lanes !== void 0) {
      let data5 = data.lanes;
      if (Array.isArray(data5)) {
        const len0 = data5.length;
        for (let i0 = 0; i0 < len0; i0++) {
          let data6 = data5[i0];
          if (data6 && typeof data6 == "object" && !Array.isArray(data6)) {
            if (data6.id === void 0) {
              const err16 = { instancePath: instancePath + "/lanes/" + i0, schemaPath: "#/definitions/SwimlaneLane/required", keyword: "required", params: { missingProperty: "id" }, message: "must have required property 'id'" };
              if (vErrors === null) {
                vErrors = [err16];
              } else {
                vErrors.push(err16);
              }
              errors++;
            }
            if (data6.label === void 0) {
              const err17 = { instancePath: instancePath + "/lanes/" + i0, schemaPath: "#/definitions/SwimlaneLane/required", keyword: "required", params: { missingProperty: "label" }, message: "must have required property 'label'" };
              if (vErrors === null) {
                vErrors = [err17];
              } else {
                vErrors.push(err17);
              }
              errors++;
            }
            for (const key2 in data6) {
              if (!(key2 === "id" || key2 === "label" || key2 === "kind")) {
                const err18 = { instancePath: instancePath + "/lanes/" + i0, schemaPath: "#/definitions/SwimlaneLane/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key2 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err18];
                } else {
                  vErrors.push(err18);
                }
                errors++;
              }
            }
            if (data6.id !== void 0) {
              if (typeof data6.id !== "string") {
                const err19 = { instancePath: instancePath + "/lanes/" + i0 + "/id", schemaPath: "#/definitions/SwimlaneLane/properties/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err19];
                } else {
                  vErrors.push(err19);
                }
                errors++;
              }
            }
            if (data6.label !== void 0) {
              if (typeof data6.label !== "string") {
                const err20 = { instancePath: instancePath + "/lanes/" + i0 + "/label", schemaPath: "#/definitions/SwimlaneLane/properties/label/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err20];
                } else {
                  vErrors.push(err20);
                }
                errors++;
              }
            }
            if (data6.kind !== void 0) {
              if (typeof data6.kind !== "string") {
                const err21 = { instancePath: instancePath + "/lanes/" + i0 + "/kind", schemaPath: "#/definitions/SwimlaneLane/properties/kind/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err21];
                } else {
                  vErrors.push(err21);
                }
                errors++;
              }
            }
          } else {
            const err22 = { instancePath: instancePath + "/lanes/" + i0, schemaPath: "#/definitions/SwimlaneLane/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err22];
            } else {
              vErrors.push(err22);
            }
            errors++;
          }
        }
      } else {
        const err23 = { instancePath: instancePath + "/lanes", schemaPath: "#/properties/lanes/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err23];
        } else {
          vErrors.push(err23);
        }
        errors++;
      }
    }
    if (data.nodes !== void 0) {
      let data10 = data.nodes;
      if (Array.isArray(data10)) {
        const len1 = data10.length;
        for (let i1 = 0; i1 < len1; i1++) {
          let data11 = data10[i1];
          if (data11 && typeof data11 == "object" && !Array.isArray(data11)) {
            if (data11.description === void 0) {
              const err24 = { instancePath: instancePath + "/nodes/" + i1, schemaPath: "#/properties/nodes/items/required", keyword: "required", params: { missingProperty: "description" }, message: "must have required property 'description'" };
              if (vErrors === null) {
                vErrors = [err24];
              } else {
                vErrors.push(err24);
              }
              errors++;
            }
            if (data11.id === void 0) {
              const err25 = { instancePath: instancePath + "/nodes/" + i1, schemaPath: "#/properties/nodes/items/required", keyword: "required", params: { missingProperty: "id" }, message: "must have required property 'id'" };
              if (vErrors === null) {
                vErrors = [err25];
              } else {
                vErrors.push(err25);
              }
              errors++;
            }
            if (data11.label === void 0) {
              const err26 = { instancePath: instancePath + "/nodes/" + i1, schemaPath: "#/properties/nodes/items/required", keyword: "required", params: { missingProperty: "label" }, message: "must have required property 'label'" };
              if (vErrors === null) {
                vErrors = [err26];
              } else {
                vErrors.push(err26);
              }
              errors++;
            }
            if (data11.lane === void 0) {
              const err27 = { instancePath: instancePath + "/nodes/" + i1, schemaPath: "#/properties/nodes/items/required", keyword: "required", params: { missingProperty: "lane" }, message: "must have required property 'lane'" };
              if (vErrors === null) {
                vErrors = [err27];
              } else {
                vErrors.push(err27);
              }
              errors++;
            }
            for (const key3 in data11) {
              if (!func2.call(schema58.properties.nodes.items.properties, key3)) {
                const err28 = { instancePath: instancePath + "/nodes/" + i1, schemaPath: "#/properties/nodes/items/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key3 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err28];
                } else {
                  vErrors.push(err28);
                }
                errors++;
              }
            }
            if (data11.lane !== void 0) {
              if (typeof data11.lane !== "string") {
                const err29 = { instancePath: instancePath + "/nodes/" + i1 + "/lane", schemaPath: "#/properties/nodes/items/properties/lane/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err29];
                } else {
                  vErrors.push(err29);
                }
                errors++;
              }
            }
            if (data11.id !== void 0) {
              if (typeof data11.id !== "string") {
                const err30 = { instancePath: instancePath + "/nodes/" + i1 + "/id", schemaPath: "#/properties/nodes/items/properties/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err30];
                } else {
                  vErrors.push(err30);
                }
                errors++;
              }
            }
            if (data11.label !== void 0) {
              if (typeof data11.label !== "string") {
                const err31 = { instancePath: instancePath + "/nodes/" + i1 + "/label", schemaPath: "#/properties/nodes/items/properties/label/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err31];
                } else {
                  vErrors.push(err31);
                }
                errors++;
              }
            }
            if (data11.description !== void 0) {
              if (typeof data11.description !== "string") {
                const err32 = { instancePath: instancePath + "/nodes/" + i1 + "/description", schemaPath: "#/properties/nodes/items/properties/description/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err32];
                } else {
                  vErrors.push(err32);
                }
                errors++;
              }
            }
            if (data11.kind !== void 0) {
              if (typeof data11.kind !== "string") {
                const err33 = { instancePath: instancePath + "/nodes/" + i1 + "/kind", schemaPath: "#/properties/nodes/items/properties/kind/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err33];
                } else {
                  vErrors.push(err33);
                }
                errors++;
              }
            }
            if (data11.sublabel !== void 0) {
              if (typeof data11.sublabel !== "string") {
                const err34 = { instancePath: instancePath + "/nodes/" + i1 + "/sublabel", schemaPath: "#/properties/nodes/items/properties/sublabel/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err34];
                } else {
                  vErrors.push(err34);
                }
                errors++;
              }
            }
            if (data11.weight !== void 0) {
              let data18 = data11.weight;
              if (typeof data18 !== "string") {
                const err35 = { instancePath: instancePath + "/nodes/" + i1 + "/weight", schemaPath: "#/definitions/NodeWeight/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err35];
                } else {
                  vErrors.push(err35);
                }
                errors++;
              }
              if (!(data18 === "primary" || data18 === "secondary" || data18 === "muted")) {
                const err36 = { instancePath: instancePath + "/nodes/" + i1 + "/weight", schemaPath: "#/definitions/NodeWeight/enum", keyword: "enum", params: { allowedValues: schema20.enum }, message: "must be equal to one of the allowed values" };
                if (vErrors === null) {
                  vErrors = [err36];
                } else {
                  vErrors.push(err36);
                }
                errors++;
              }
            }
            if (data11.nudge !== void 0) {
              if (!(typeof data11.nudge == "number")) {
                const err37 = { instancePath: instancePath + "/nodes/" + i1 + "/nudge", schemaPath: "#/properties/nodes/items/properties/nudge/type", keyword: "type", params: { type: "number" }, message: "must be number" };
                if (vErrors === null) {
                  vErrors = [err37];
                } else {
                  vErrors.push(err37);
                }
                errors++;
              }
            }
            if (data11.shape !== void 0) {
              let data20 = data11.shape;
              if (typeof data20 !== "string") {
                const err38 = { instancePath: instancePath + "/nodes/" + i1 + "/shape", schemaPath: "#/definitions/DiagramNodeShape/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err38];
                } else {
                  vErrors.push(err38);
                }
                errors++;
              }
              if (!(data20 === "card" || data20 === "state" || data20 === "table" || data20 === "event" || data20 === "terminal" || data20 === "bar")) {
                const err39 = { instancePath: instancePath + "/nodes/" + i1 + "/shape", schemaPath: "#/definitions/DiagramNodeShape/enum", keyword: "enum", params: { allowedValues: schema21.enum }, message: "must be equal to one of the allowed values" };
                if (vErrors === null) {
                  vErrors = [err39];
                } else {
                  vErrors.push(err39);
                }
                errors++;
              }
            }
            if (data11.textAnchor !== void 0) {
              let data21 = data11.textAnchor;
              if (typeof data21 !== "string") {
                const err40 = { instancePath: instancePath + "/nodes/" + i1 + "/textAnchor", schemaPath: "#/definitions/DiagramNodeTextAnchor/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err40];
                } else {
                  vErrors.push(err40);
                }
                errors++;
              }
              if (!(data21 === "start" || data21 === "end" || data21 === "middle")) {
                const err41 = { instancePath: instancePath + "/nodes/" + i1 + "/textAnchor", schemaPath: "#/definitions/DiagramNodeTextAnchor/enum", keyword: "enum", params: { allowedValues: schema22.enum }, message: "must be equal to one of the allowed values" };
                if (vErrors === null) {
                  vErrors = [err41];
                } else {
                  vErrors.push(err41);
                }
                errors++;
              }
            }
            if (data11.fields !== void 0) {
              let data22 = data11.fields;
              if (Array.isArray(data22)) {
                const len2 = data22.length;
                for (let i2 = 0; i2 < len2; i2++) {
                  let data23 = data22[i2];
                  if (data23 && typeof data23 == "object" && !Array.isArray(data23)) {
                    if (data23.name === void 0) {
                      const err42 = { instancePath: instancePath + "/nodes/" + i1 + "/fields/" + i2, schemaPath: "#/definitions/TableField/required", keyword: "required", params: { missingProperty: "name" }, message: "must have required property 'name'" };
                      if (vErrors === null) {
                        vErrors = [err42];
                      } else {
                        vErrors.push(err42);
                      }
                      errors++;
                    }
                    for (const key4 in data23) {
                      if (!(key4 === "name" || key4 === "type" || key4 === "key")) {
                        const err43 = { instancePath: instancePath + "/nodes/" + i1 + "/fields/" + i2, schemaPath: "#/definitions/TableField/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key4 }, message: "must NOT have additional properties" };
                        if (vErrors === null) {
                          vErrors = [err43];
                        } else {
                          vErrors.push(err43);
                        }
                        errors++;
                      }
                    }
                    if (data23.name !== void 0) {
                      if (typeof data23.name !== "string") {
                        const err44 = { instancePath: instancePath + "/nodes/" + i1 + "/fields/" + i2 + "/name", schemaPath: "#/definitions/TableField/properties/name/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                        if (vErrors === null) {
                          vErrors = [err44];
                        } else {
                          vErrors.push(err44);
                        }
                        errors++;
                      }
                    }
                    if (data23.type !== void 0) {
                      if (typeof data23.type !== "string") {
                        const err45 = { instancePath: instancePath + "/nodes/" + i1 + "/fields/" + i2 + "/type", schemaPath: "#/definitions/TableField/properties/type/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                        if (vErrors === null) {
                          vErrors = [err45];
                        } else {
                          vErrors.push(err45);
                        }
                        errors++;
                      }
                    }
                    if (data23.key !== void 0) {
                      let data26 = data23.key;
                      if (typeof data26 !== "string") {
                        const err46 = { instancePath: instancePath + "/nodes/" + i1 + "/fields/" + i2 + "/key", schemaPath: "#/definitions/TableField/properties/key/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                        if (vErrors === null) {
                          vErrors = [err46];
                        } else {
                          vErrors.push(err46);
                        }
                        errors++;
                      }
                      if (!(data26 === "pk" || data26 === "fk" || data26 === "unique")) {
                        const err47 = { instancePath: instancePath + "/nodes/" + i1 + "/fields/" + i2 + "/key", schemaPath: "#/definitions/TableField/properties/key/enum", keyword: "enum", params: { allowedValues: schema23.properties.key.enum }, message: "must be equal to one of the allowed values" };
                        if (vErrors === null) {
                          vErrors = [err47];
                        } else {
                          vErrors.push(err47);
                        }
                        errors++;
                      }
                    }
                  } else {
                    const err48 = { instancePath: instancePath + "/nodes/" + i1 + "/fields/" + i2, schemaPath: "#/definitions/TableField/type", keyword: "type", params: { type: "object" }, message: "must be object" };
                    if (vErrors === null) {
                      vErrors = [err48];
                    } else {
                      vErrors.push(err48);
                    }
                    errors++;
                  }
                }
              } else {
                const err49 = { instancePath: instancePath + "/nodes/" + i1 + "/fields", schemaPath: "#/properties/nodes/items/properties/fields/type", keyword: "type", params: { type: "array" }, message: "must be array" };
                if (vErrors === null) {
                  vErrors = [err49];
                } else {
                  vErrors.push(err49);
                }
                errors++;
              }
            }
            if (data11.initial !== void 0) {
              if (typeof data11.initial !== "boolean") {
                const err50 = { instancePath: instancePath + "/nodes/" + i1 + "/initial", schemaPath: "#/properties/nodes/items/properties/initial/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
                if (vErrors === null) {
                  vErrors = [err50];
                } else {
                  vErrors.push(err50);
                }
                errors++;
              }
            }
            if (data11.final !== void 0) {
              if (typeof data11.final !== "boolean") {
                const err51 = { instancePath: instancePath + "/nodes/" + i1 + "/final", schemaPath: "#/properties/nodes/items/properties/final/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
                if (vErrors === null) {
                  vErrors = [err51];
                } else {
                  vErrors.push(err51);
                }
                errors++;
              }
            }
          } else {
            const err52 = { instancePath: instancePath + "/nodes/" + i1, schemaPath: "#/properties/nodes/items/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err52];
            } else {
              vErrors.push(err52);
            }
            errors++;
          }
        }
      } else {
        const err53 = { instancePath: instancePath + "/nodes", schemaPath: "#/properties/nodes/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err53];
        } else {
          vErrors.push(err53);
        }
        errors++;
      }
    }
    if (data.edges !== void 0) {
      let data29 = data.edges;
      if (Array.isArray(data29)) {
        const len3 = data29.length;
        for (let i3 = 0; i3 < len3; i3++) {
          if (!validate18(data29[i3], { instancePath: instancePath + "/edges/" + i3, parentData: data29, parentDataProperty: i3, rootData })) {
            vErrors = vErrors === null ? validate18.errors : vErrors.concat(validate18.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err54 = { instancePath: instancePath + "/edges", schemaPath: "#/properties/edges/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err54];
        } else {
          vErrors.push(err54);
        }
        errors++;
      }
    }
  } else {
    const err55 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err55];
    } else {
      vErrors.push(err55);
    }
    errors++;
  }
  validate48.errors = vErrors;
  return errors === 0;
}
function validate14(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  const _errs0 = errors;
  let valid0 = false;
  const _errs1 = errors;
  if (!validate15(data, { instancePath, parentData, parentDataProperty, rootData })) {
    vErrors = vErrors === null ? validate15.errors : vErrors.concat(validate15.errors);
    errors = vErrors.length;
  }
  var _valid0 = _errs1 === errors;
  valid0 = valid0 || _valid0;
  if (!valid0) {
    const _errs2 = errors;
    if (!validate23(data, { instancePath, parentData, parentDataProperty, rootData })) {
      vErrors = vErrors === null ? validate23.errors : vErrors.concat(validate23.errors);
      errors = vErrors.length;
    }
    var _valid0 = _errs2 === errors;
    valid0 = valid0 || _valid0;
    if (!valid0) {
      const _errs3 = errors;
      if (!validate28(data, { instancePath, parentData, parentDataProperty, rootData })) {
        vErrors = vErrors === null ? validate28.errors : vErrors.concat(validate28.errors);
        errors = vErrors.length;
      }
      var _valid0 = _errs3 === errors;
      valid0 = valid0 || _valid0;
      if (!valid0) {
        const _errs4 = errors;
        if (!validate32(data, { instancePath, parentData, parentDataProperty, rootData })) {
          vErrors = vErrors === null ? validate32.errors : vErrors.concat(validate32.errors);
          errors = vErrors.length;
        }
        var _valid0 = _errs4 === errors;
        valid0 = valid0 || _valid0;
        if (!valid0) {
          const _errs5 = errors;
          if (!validate38(data, { instancePath, parentData, parentDataProperty, rootData })) {
            vErrors = vErrors === null ? validate38.errors : vErrors.concat(validate38.errors);
            errors = vErrors.length;
          }
          var _valid0 = _errs5 === errors;
          valid0 = valid0 || _valid0;
          if (!valid0) {
            const _errs6 = errors;
            if (!validate44(data, { instancePath, parentData, parentDataProperty, rootData })) {
              vErrors = vErrors === null ? validate44.errors : vErrors.concat(validate44.errors);
              errors = vErrors.length;
            }
            var _valid0 = _errs6 === errors;
            valid0 = valid0 || _valid0;
            if (!valid0) {
              const _errs7 = errors;
              if (!validate48(data, { instancePath, parentData, parentDataProperty, rootData })) {
                vErrors = vErrors === null ? validate48.errors : vErrors.concat(validate48.errors);
                errors = vErrors.length;
              }
              var _valid0 = _errs7 === errors;
              valid0 = valid0 || _valid0;
            }
          }
        }
      }
    }
  }
  if (!valid0) {
    const err0 = { instancePath, schemaPath: "#/anyOf", keyword: "anyOf", params: {}, message: "must match a schema in anyOf" };
    if (vErrors === null) {
      vErrors = [err0];
    } else {
      vErrors.push(err0);
    }
    errors++;
  } else {
    errors = _errs0;
    if (vErrors !== null) {
      if (_errs0) {
        vErrors.length = _errs0;
      } else {
        vErrors = null;
      }
    }
  }
  validate14.errors = vErrors;
  return errors === 0;
}
var schema64 = { "type": "object", "properties": { "type": { "type": "string", "const": "graph" }, "profile": { "type": "string", "enum": ["architecture", "data-flow"] }, "caption": { "type": "string" }, "legend": { "type": "object", "properties": { "main": { "type": "string" }, "branch": { "type": "string" } }, "required": ["main", "branch"], "additionalProperties": false }, "nodes": { "type": "array", "items": { "$ref": "#/definitions/GraphNode" } }, "edges": { "type": "array", "items": { "$ref": "#/definitions/GraphEdge" } } }, "required": ["type", "caption", "legend", "nodes", "edges"], "additionalProperties": false };
var schema65 = { "type": "object", "properties": { "id": { "type": "string" }, "label": { "type": "string" }, "description": { "type": "string", "description": "Localized explanation shown on hover/focus and available to assistive technology." }, "kind": { "type": "string", "description": "Mono micro-label above the title, e.g. 'Trigger', 'Engine', 'Gate'." }, "sublabel": { "type": "string" }, "weight": { "$ref": "#/definitions/NodeWeight" }, "nudge": { "type": "number", "description": "Vertical fine-tune in viewBox units, applied after the layout centres the node." }, "shape": { "$ref": "#/definitions/DiagramNodeShape", "description": "Draw this node as something other than a hairline card." }, "textAnchor": { "$ref": "#/definitions/DiagramNodeTextAnchor", "description": "Label alignment for `event` shapes (timeline)." }, "fields": { "type": "array", "items": { "$ref": "#/definitions/TableField" }, "description": "ER table rows (only meaningful for `shape: 'table'`)." }, "initial": { "type": "boolean", "description": "State-machine: draw a double outline (initial state)." }, "final": { "type": "boolean", "description": "State-machine: draw a hollow centre (final state)." }, "ports": { "type": "array", "items": { "$ref": "#/definitions/GraphPort" } }, "renderer": { "type": "object", "properties": { "typeKey": { "type": "string" }, "data": { "type": "object", "additionalProperties": { "$ref": "#/definitions/JsonValue" } } }, "required": ["typeKey", "data"], "additionalProperties": false } }, "additionalProperties": false, "required": ["description", "id", "label"] };
var schema70 = { "type": "object", "properties": { "id": { "type": "string" }, "side": { "$ref": "#/definitions/PortSide" }, "offset": { "type": "number" }, "direction": { "type": "string", "enum": ["in", "out", "both"] }, "capacity": { "type": "number" }, "label": { "type": "string" } }, "required": ["id", "side", "offset", "direction"], "additionalProperties": false };
var schema71 = { "type": "string", "enum": ["left", "right", "top", "bottom"] };
function validate54(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.id === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "id" }, message: "must have required property 'id'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.side === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "side" }, message: "must have required property 'side'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.offset === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "offset" }, message: "must have required property 'offset'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data.direction === void 0) {
      const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "direction" }, message: "must have required property 'direction'" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "id" || key0 === "side" || key0 === "offset" || key0 === "direction" || key0 === "capacity" || key0 === "label")) {
        const err4 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.id !== void 0) {
      if (typeof data.id !== "string") {
        const err5 = { instancePath: instancePath + "/id", schemaPath: "#/properties/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.side !== void 0) {
      let data1 = data.side;
      if (typeof data1 !== "string") {
        const err6 = { instancePath: instancePath + "/side", schemaPath: "#/definitions/PortSide/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
      if (!(data1 === "left" || data1 === "right" || data1 === "top" || data1 === "bottom")) {
        const err7 = { instancePath: instancePath + "/side", schemaPath: "#/definitions/PortSide/enum", keyword: "enum", params: { allowedValues: schema71.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
    if (data.offset !== void 0) {
      if (!(typeof data.offset == "number")) {
        const err8 = { instancePath: instancePath + "/offset", schemaPath: "#/properties/offset/type", keyword: "type", params: { type: "number" }, message: "must be number" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
    if (data.direction !== void 0) {
      let data3 = data.direction;
      if (typeof data3 !== "string") {
        const err9 = { instancePath: instancePath + "/direction", schemaPath: "#/properties/direction/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err9];
        } else {
          vErrors.push(err9);
        }
        errors++;
      }
      if (!(data3 === "in" || data3 === "out" || data3 === "both")) {
        const err10 = { instancePath: instancePath + "/direction", schemaPath: "#/properties/direction/enum", keyword: "enum", params: { allowedValues: schema70.properties.direction.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
    }
    if (data.capacity !== void 0) {
      if (!(typeof data.capacity == "number")) {
        const err11 = { instancePath: instancePath + "/capacity", schemaPath: "#/properties/capacity/type", keyword: "type", params: { type: "number" }, message: "must be number" };
        if (vErrors === null) {
          vErrors = [err11];
        } else {
          vErrors.push(err11);
        }
        errors++;
      }
    }
    if (data.label !== void 0) {
      if (typeof data.label !== "string") {
        const err12 = { instancePath: instancePath + "/label", schemaPath: "#/properties/label/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err12];
        } else {
          vErrors.push(err12);
        }
        errors++;
      }
    }
  } else {
    const err13 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err13];
    } else {
      vErrors.push(err13);
    }
    errors++;
  }
  validate54.errors = vErrors;
  return errors === 0;
}
var wrapper0 = { validate: validate56 };
function validate56(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  const _errs0 = errors;
  let valid0 = false;
  const _errs1 = errors;
  if (data !== null) {
    const err0 = { instancePath, schemaPath: "#/anyOf/0/type", keyword: "type", params: { type: "null" }, message: "must be null" };
    if (vErrors === null) {
      vErrors = [err0];
    } else {
      vErrors.push(err0);
    }
    errors++;
  }
  var _valid0 = _errs1 === errors;
  valid0 = valid0 || _valid0;
  if (!valid0) {
    const _errs3 = errors;
    if (typeof data !== "boolean") {
      const err1 = { instancePath, schemaPath: "#/anyOf/1/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    var _valid0 = _errs3 === errors;
    valid0 = valid0 || _valid0;
    if (!valid0) {
      const _errs5 = errors;
      if (!(typeof data == "number")) {
        const err2 = { instancePath, schemaPath: "#/anyOf/2/type", keyword: "type", params: { type: "number" }, message: "must be number" };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
      var _valid0 = _errs5 === errors;
      valid0 = valid0 || _valid0;
      if (!valid0) {
        const _errs7 = errors;
        if (typeof data !== "string") {
          const err3 = { instancePath, schemaPath: "#/anyOf/3/type", keyword: "type", params: { type: "string" }, message: "must be string" };
          if (vErrors === null) {
            vErrors = [err3];
          } else {
            vErrors.push(err3);
          }
          errors++;
        }
        var _valid0 = _errs7 === errors;
        valid0 = valid0 || _valid0;
        if (!valid0) {
          const _errs9 = errors;
          if (Array.isArray(data)) {
            const len0 = data.length;
            for (let i0 = 0; i0 < len0; i0++) {
              if (!wrapper0.validate(data[i0], { instancePath: instancePath + "/" + i0, parentData: data, parentDataProperty: i0, rootData })) {
                vErrors = vErrors === null ? wrapper0.validate.errors : vErrors.concat(wrapper0.validate.errors);
                errors = vErrors.length;
              }
            }
          } else {
            const err4 = { instancePath, schemaPath: "#/anyOf/4/type", keyword: "type", params: { type: "array" }, message: "must be array" };
            if (vErrors === null) {
              vErrors = [err4];
            } else {
              vErrors.push(err4);
            }
            errors++;
          }
          var _valid0 = _errs9 === errors;
          valid0 = valid0 || _valid0;
          if (!valid0) {
            const _errs12 = errors;
            if (data && typeof data == "object" && !Array.isArray(data)) {
              for (const key0 in data) {
                if (!wrapper0.validate(data[key0], { instancePath: instancePath + "/" + key0.replace(/~/g, "~0").replace(/\//g, "~1"), parentData: data, parentDataProperty: key0, rootData })) {
                  vErrors = vErrors === null ? wrapper0.validate.errors : vErrors.concat(wrapper0.validate.errors);
                  errors = vErrors.length;
                }
              }
            } else {
              const err5 = { instancePath, schemaPath: "#/anyOf/5/type", keyword: "type", params: { type: "object" }, message: "must be object" };
              if (vErrors === null) {
                vErrors = [err5];
              } else {
                vErrors.push(err5);
              }
              errors++;
            }
            var _valid0 = _errs12 === errors;
            valid0 = valid0 || _valid0;
          }
        }
      }
    }
  }
  if (!valid0) {
    const err6 = { instancePath, schemaPath: "#/anyOf", keyword: "anyOf", params: {}, message: "must match a schema in anyOf" };
    if (vErrors === null) {
      vErrors = [err6];
    } else {
      vErrors.push(err6);
    }
    errors++;
  } else {
    errors = _errs0;
    if (vErrors !== null) {
      if (_errs0) {
        vErrors.length = _errs0;
      } else {
        vErrors = null;
      }
    }
  }
  validate56.errors = vErrors;
  return errors === 0;
}
function validate53(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.description === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "description" }, message: "must have required property 'description'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.id === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "id" }, message: "must have required property 'id'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.label === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "label" }, message: "must have required property 'label'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!func2.call(schema65.properties, key0)) {
        const err3 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.id !== void 0) {
      if (typeof data.id !== "string") {
        const err4 = { instancePath: instancePath + "/id", schemaPath: "#/properties/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.label !== void 0) {
      if (typeof data.label !== "string") {
        const err5 = { instancePath: instancePath + "/label", schemaPath: "#/properties/label/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.description !== void 0) {
      if (typeof data.description !== "string") {
        const err6 = { instancePath: instancePath + "/description", schemaPath: "#/properties/description/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.kind !== void 0) {
      if (typeof data.kind !== "string") {
        const err7 = { instancePath: instancePath + "/kind", schemaPath: "#/properties/kind/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
    if (data.sublabel !== void 0) {
      if (typeof data.sublabel !== "string") {
        const err8 = { instancePath: instancePath + "/sublabel", schemaPath: "#/properties/sublabel/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
    if (data.weight !== void 0) {
      let data5 = data.weight;
      if (typeof data5 !== "string") {
        const err9 = { instancePath: instancePath + "/weight", schemaPath: "#/definitions/NodeWeight/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err9];
        } else {
          vErrors.push(err9);
        }
        errors++;
      }
      if (!(data5 === "primary" || data5 === "secondary" || data5 === "muted")) {
        const err10 = { instancePath: instancePath + "/weight", schemaPath: "#/definitions/NodeWeight/enum", keyword: "enum", params: { allowedValues: schema20.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
    }
    if (data.nudge !== void 0) {
      if (!(typeof data.nudge == "number")) {
        const err11 = { instancePath: instancePath + "/nudge", schemaPath: "#/properties/nudge/type", keyword: "type", params: { type: "number" }, message: "must be number" };
        if (vErrors === null) {
          vErrors = [err11];
        } else {
          vErrors.push(err11);
        }
        errors++;
      }
    }
    if (data.shape !== void 0) {
      let data7 = data.shape;
      if (typeof data7 !== "string") {
        const err12 = { instancePath: instancePath + "/shape", schemaPath: "#/definitions/DiagramNodeShape/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err12];
        } else {
          vErrors.push(err12);
        }
        errors++;
      }
      if (!(data7 === "card" || data7 === "state" || data7 === "table" || data7 === "event" || data7 === "terminal" || data7 === "bar")) {
        const err13 = { instancePath: instancePath + "/shape", schemaPath: "#/definitions/DiagramNodeShape/enum", keyword: "enum", params: { allowedValues: schema21.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err13];
        } else {
          vErrors.push(err13);
        }
        errors++;
      }
    }
    if (data.textAnchor !== void 0) {
      let data8 = data.textAnchor;
      if (typeof data8 !== "string") {
        const err14 = { instancePath: instancePath + "/textAnchor", schemaPath: "#/definitions/DiagramNodeTextAnchor/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err14];
        } else {
          vErrors.push(err14);
        }
        errors++;
      }
      if (!(data8 === "start" || data8 === "end" || data8 === "middle")) {
        const err15 = { instancePath: instancePath + "/textAnchor", schemaPath: "#/definitions/DiagramNodeTextAnchor/enum", keyword: "enum", params: { allowedValues: schema22.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err15];
        } else {
          vErrors.push(err15);
        }
        errors++;
      }
    }
    if (data.fields !== void 0) {
      let data9 = data.fields;
      if (Array.isArray(data9)) {
        const len0 = data9.length;
        for (let i0 = 0; i0 < len0; i0++) {
          let data10 = data9[i0];
          if (data10 && typeof data10 == "object" && !Array.isArray(data10)) {
            if (data10.name === void 0) {
              const err16 = { instancePath: instancePath + "/fields/" + i0, schemaPath: "#/definitions/TableField/required", keyword: "required", params: { missingProperty: "name" }, message: "must have required property 'name'" };
              if (vErrors === null) {
                vErrors = [err16];
              } else {
                vErrors.push(err16);
              }
              errors++;
            }
            for (const key1 in data10) {
              if (!(key1 === "name" || key1 === "type" || key1 === "key")) {
                const err17 = { instancePath: instancePath + "/fields/" + i0, schemaPath: "#/definitions/TableField/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err17];
                } else {
                  vErrors.push(err17);
                }
                errors++;
              }
            }
            if (data10.name !== void 0) {
              if (typeof data10.name !== "string") {
                const err18 = { instancePath: instancePath + "/fields/" + i0 + "/name", schemaPath: "#/definitions/TableField/properties/name/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err18];
                } else {
                  vErrors.push(err18);
                }
                errors++;
              }
            }
            if (data10.type !== void 0) {
              if (typeof data10.type !== "string") {
                const err19 = { instancePath: instancePath + "/fields/" + i0 + "/type", schemaPath: "#/definitions/TableField/properties/type/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err19];
                } else {
                  vErrors.push(err19);
                }
                errors++;
              }
            }
            if (data10.key !== void 0) {
              let data13 = data10.key;
              if (typeof data13 !== "string") {
                const err20 = { instancePath: instancePath + "/fields/" + i0 + "/key", schemaPath: "#/definitions/TableField/properties/key/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err20];
                } else {
                  vErrors.push(err20);
                }
                errors++;
              }
              if (!(data13 === "pk" || data13 === "fk" || data13 === "unique")) {
                const err21 = { instancePath: instancePath + "/fields/" + i0 + "/key", schemaPath: "#/definitions/TableField/properties/key/enum", keyword: "enum", params: { allowedValues: schema23.properties.key.enum }, message: "must be equal to one of the allowed values" };
                if (vErrors === null) {
                  vErrors = [err21];
                } else {
                  vErrors.push(err21);
                }
                errors++;
              }
            }
          } else {
            const err22 = { instancePath: instancePath + "/fields/" + i0, schemaPath: "#/definitions/TableField/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err22];
            } else {
              vErrors.push(err22);
            }
            errors++;
          }
        }
      } else {
        const err23 = { instancePath: instancePath + "/fields", schemaPath: "#/properties/fields/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err23];
        } else {
          vErrors.push(err23);
        }
        errors++;
      }
    }
    if (data.initial !== void 0) {
      if (typeof data.initial !== "boolean") {
        const err24 = { instancePath: instancePath + "/initial", schemaPath: "#/properties/initial/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
        if (vErrors === null) {
          vErrors = [err24];
        } else {
          vErrors.push(err24);
        }
        errors++;
      }
    }
    if (data.final !== void 0) {
      if (typeof data.final !== "boolean") {
        const err25 = { instancePath: instancePath + "/final", schemaPath: "#/properties/final/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
        if (vErrors === null) {
          vErrors = [err25];
        } else {
          vErrors.push(err25);
        }
        errors++;
      }
    }
    if (data.ports !== void 0) {
      let data16 = data.ports;
      if (Array.isArray(data16)) {
        const len1 = data16.length;
        for (let i1 = 0; i1 < len1; i1++) {
          if (!validate54(data16[i1], { instancePath: instancePath + "/ports/" + i1, parentData: data16, parentDataProperty: i1, rootData })) {
            vErrors = vErrors === null ? validate54.errors : vErrors.concat(validate54.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err26 = { instancePath: instancePath + "/ports", schemaPath: "#/properties/ports/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err26];
        } else {
          vErrors.push(err26);
        }
        errors++;
      }
    }
    if (data.renderer !== void 0) {
      let data18 = data.renderer;
      if (data18 && typeof data18 == "object" && !Array.isArray(data18)) {
        if (data18.typeKey === void 0) {
          const err27 = { instancePath: instancePath + "/renderer", schemaPath: "#/properties/renderer/required", keyword: "required", params: { missingProperty: "typeKey" }, message: "must have required property 'typeKey'" };
          if (vErrors === null) {
            vErrors = [err27];
          } else {
            vErrors.push(err27);
          }
          errors++;
        }
        if (data18.data === void 0) {
          const err28 = { instancePath: instancePath + "/renderer", schemaPath: "#/properties/renderer/required", keyword: "required", params: { missingProperty: "data" }, message: "must have required property 'data'" };
          if (vErrors === null) {
            vErrors = [err28];
          } else {
            vErrors.push(err28);
          }
          errors++;
        }
        for (const key2 in data18) {
          if (!(key2 === "typeKey" || key2 === "data")) {
            const err29 = { instancePath: instancePath + "/renderer", schemaPath: "#/properties/renderer/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key2 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err29];
            } else {
              vErrors.push(err29);
            }
            errors++;
          }
        }
        if (data18.typeKey !== void 0) {
          if (typeof data18.typeKey !== "string") {
            const err30 = { instancePath: instancePath + "/renderer/typeKey", schemaPath: "#/properties/renderer/properties/typeKey/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err30];
            } else {
              vErrors.push(err30);
            }
            errors++;
          }
        }
        if (data18.data !== void 0) {
          let data20 = data18.data;
          if (data20 && typeof data20 == "object" && !Array.isArray(data20)) {
            for (const key3 in data20) {
              if (!validate56(data20[key3], { instancePath: instancePath + "/renderer/data/" + key3.replace(/~/g, "~0").replace(/\//g, "~1"), parentData: data20, parentDataProperty: key3, rootData })) {
                vErrors = vErrors === null ? validate56.errors : vErrors.concat(validate56.errors);
                errors = vErrors.length;
              }
            }
          } else {
            const err31 = { instancePath: instancePath + "/renderer/data", schemaPath: "#/properties/renderer/properties/data/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err31];
            } else {
              vErrors.push(err31);
            }
            errors++;
          }
        }
      } else {
        const err32 = { instancePath: instancePath + "/renderer", schemaPath: "#/properties/renderer/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err32];
        } else {
          vErrors.push(err32);
        }
        errors++;
      }
    }
  } else {
    const err33 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err33];
    } else {
      vErrors.push(err33);
    }
    errors++;
  }
  validate53.errors = vErrors;
  return errors === 0;
}
var schema73 = { "type": "object", "properties": { "id": { "type": "string", "description": "Stable identity for parallel relations; recommended when editing/reordering." }, "from": { "type": "string" }, "to": { "type": "string" }, "label": { "type": "string" }, "variant": { "$ref": "#/definitions/EdgeVariant" }, "dashed": { "type": "boolean" }, "labelPlacement": { "$ref": "#/definitions/EdgeLabelPlacement", "description": "Move a pill into an authored whitespace slot without changing its edge." }, "route": { "type": "object", "properties": { "lane": { "$ref": "#/definitions/EdgeLane" }, "clearance": { "type": "number" } }, "required": ["lane"], "additionalProperties": false, "description": "Route a cross-band edge around every intervening band on an outer lane." }, "sourcePort": { "type": "string" }, "targetPort": { "type": "string" } }, "additionalProperties": false, "required": ["from", "to"] };
function validate59(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.from === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "from" }, message: "must have required property 'from'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.to === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "to" }, message: "must have required property 'to'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!func2.call(schema73.properties, key0)) {
        const err2 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
    if (data.id !== void 0) {
      if (typeof data.id !== "string") {
        const err3 = { instancePath: instancePath + "/id", schemaPath: "#/properties/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.from !== void 0) {
      if (typeof data.from !== "string") {
        const err4 = { instancePath: instancePath + "/from", schemaPath: "#/properties/from/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.to !== void 0) {
      if (typeof data.to !== "string") {
        const err5 = { instancePath: instancePath + "/to", schemaPath: "#/properties/to/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.label !== void 0) {
      if (typeof data.label !== "string") {
        const err6 = { instancePath: instancePath + "/label", schemaPath: "#/properties/label/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.variant !== void 0) {
      let data4 = data.variant;
      if (typeof data4 !== "string") {
        const err7 = { instancePath: instancePath + "/variant", schemaPath: "#/definitions/EdgeVariant/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
      if (!(data4 === "main" || data4 === "branch")) {
        const err8 = { instancePath: instancePath + "/variant", schemaPath: "#/definitions/EdgeVariant/enum", keyword: "enum", params: { allowedValues: schema25.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
    if (data.dashed !== void 0) {
      if (typeof data.dashed !== "boolean") {
        const err9 = { instancePath: instancePath + "/dashed", schemaPath: "#/properties/dashed/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
        if (vErrors === null) {
          vErrors = [err9];
        } else {
          vErrors.push(err9);
        }
        errors++;
      }
    }
    if (data.labelPlacement !== void 0) {
      let data6 = data.labelPlacement;
      if (typeof data6 !== "string") {
        const err10 = { instancePath: instancePath + "/labelPlacement", schemaPath: "#/definitions/EdgeLabelPlacement/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
      if (!(data6 === "above-target" || data6 === "below-target" || data6 === "left-of-edge" || data6 === "right-of-edge")) {
        const err11 = { instancePath: instancePath + "/labelPlacement", schemaPath: "#/definitions/EdgeLabelPlacement/enum", keyword: "enum", params: { allowedValues: schema26.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err11];
        } else {
          vErrors.push(err11);
        }
        errors++;
      }
    }
    if (data.route !== void 0) {
      let data7 = data.route;
      if (data7 && typeof data7 == "object" && !Array.isArray(data7)) {
        if (data7.lane === void 0) {
          const err12 = { instancePath: instancePath + "/route", schemaPath: "#/properties/route/required", keyword: "required", params: { missingProperty: "lane" }, message: "must have required property 'lane'" };
          if (vErrors === null) {
            vErrors = [err12];
          } else {
            vErrors.push(err12);
          }
          errors++;
        }
        for (const key1 in data7) {
          if (!(key1 === "lane" || key1 === "clearance")) {
            const err13 = { instancePath: instancePath + "/route", schemaPath: "#/properties/route/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err13];
            } else {
              vErrors.push(err13);
            }
            errors++;
          }
        }
        if (data7.lane !== void 0) {
          let data8 = data7.lane;
          if (typeof data8 !== "string") {
            const err14 = { instancePath: instancePath + "/route/lane", schemaPath: "#/definitions/EdgeLane/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err14];
            } else {
              vErrors.push(err14);
            }
            errors++;
          }
          if (!(data8 === "above" || data8 === "below")) {
            const err15 = { instancePath: instancePath + "/route/lane", schemaPath: "#/definitions/EdgeLane/enum", keyword: "enum", params: { allowedValues: schema27.enum }, message: "must be equal to one of the allowed values" };
            if (vErrors === null) {
              vErrors = [err15];
            } else {
              vErrors.push(err15);
            }
            errors++;
          }
        }
        if (data7.clearance !== void 0) {
          if (!(typeof data7.clearance == "number")) {
            const err16 = { instancePath: instancePath + "/route/clearance", schemaPath: "#/properties/route/properties/clearance/type", keyword: "type", params: { type: "number" }, message: "must be number" };
            if (vErrors === null) {
              vErrors = [err16];
            } else {
              vErrors.push(err16);
            }
            errors++;
          }
        }
      } else {
        const err17 = { instancePath: instancePath + "/route", schemaPath: "#/properties/route/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err17];
        } else {
          vErrors.push(err17);
        }
        errors++;
      }
    }
    if (data.sourcePort !== void 0) {
      if (typeof data.sourcePort !== "string") {
        const err18 = { instancePath: instancePath + "/sourcePort", schemaPath: "#/properties/sourcePort/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err18];
        } else {
          vErrors.push(err18);
        }
        errors++;
      }
    }
    if (data.targetPort !== void 0) {
      if (typeof data.targetPort !== "string") {
        const err19 = { instancePath: instancePath + "/targetPort", schemaPath: "#/properties/targetPort/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err19];
        } else {
          vErrors.push(err19);
        }
        errors++;
      }
    }
  } else {
    const err20 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err20];
    } else {
      vErrors.push(err20);
    }
    errors++;
  }
  validate59.errors = vErrors;
  return errors === 0;
}
function validate52(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.type === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "type" }, message: "must have required property 'type'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.caption === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "caption" }, message: "must have required property 'caption'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.legend === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "legend" }, message: "must have required property 'legend'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data.nodes === void 0) {
      const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "nodes" }, message: "must have required property 'nodes'" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    if (data.edges === void 0) {
      const err4 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "edges" }, message: "must have required property 'edges'" };
      if (vErrors === null) {
        vErrors = [err4];
      } else {
        vErrors.push(err4);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "type" || key0 === "profile" || key0 === "caption" || key0 === "legend" || key0 === "nodes" || key0 === "edges")) {
        const err5 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.type !== void 0) {
      let data0 = data.type;
      if (typeof data0 !== "string") {
        const err6 = { instancePath: instancePath + "/type", schemaPath: "#/properties/type/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
      if ("graph" !== data0) {
        const err7 = { instancePath: instancePath + "/type", schemaPath: "#/properties/type/const", keyword: "const", params: { allowedValue: "graph" }, message: "must be equal to constant" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
    if (data.profile !== void 0) {
      let data1 = data.profile;
      if (typeof data1 !== "string") {
        const err8 = { instancePath: instancePath + "/profile", schemaPath: "#/properties/profile/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
      if (!(data1 === "architecture" || data1 === "data-flow")) {
        const err9 = { instancePath: instancePath + "/profile", schemaPath: "#/properties/profile/enum", keyword: "enum", params: { allowedValues: schema64.properties.profile.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err9];
        } else {
          vErrors.push(err9);
        }
        errors++;
      }
    }
    if (data.caption !== void 0) {
      if (typeof data.caption !== "string") {
        const err10 = { instancePath: instancePath + "/caption", schemaPath: "#/properties/caption/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
    }
    if (data.legend !== void 0) {
      let data3 = data.legend;
      if (data3 && typeof data3 == "object" && !Array.isArray(data3)) {
        if (data3.main === void 0) {
          const err11 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/required", keyword: "required", params: { missingProperty: "main" }, message: "must have required property 'main'" };
          if (vErrors === null) {
            vErrors = [err11];
          } else {
            vErrors.push(err11);
          }
          errors++;
        }
        if (data3.branch === void 0) {
          const err12 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/required", keyword: "required", params: { missingProperty: "branch" }, message: "must have required property 'branch'" };
          if (vErrors === null) {
            vErrors = [err12];
          } else {
            vErrors.push(err12);
          }
          errors++;
        }
        for (const key1 in data3) {
          if (!(key1 === "main" || key1 === "branch")) {
            const err13 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err13];
            } else {
              vErrors.push(err13);
            }
            errors++;
          }
        }
        if (data3.main !== void 0) {
          if (typeof data3.main !== "string") {
            const err14 = { instancePath: instancePath + "/legend/main", schemaPath: "#/properties/legend/properties/main/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err14];
            } else {
              vErrors.push(err14);
            }
            errors++;
          }
        }
        if (data3.branch !== void 0) {
          if (typeof data3.branch !== "string") {
            const err15 = { instancePath: instancePath + "/legend/branch", schemaPath: "#/properties/legend/properties/branch/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err15];
            } else {
              vErrors.push(err15);
            }
            errors++;
          }
        }
      } else {
        const err16 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err16];
        } else {
          vErrors.push(err16);
        }
        errors++;
      }
    }
    if (data.nodes !== void 0) {
      let data6 = data.nodes;
      if (Array.isArray(data6)) {
        const len0 = data6.length;
        for (let i0 = 0; i0 < len0; i0++) {
          if (!validate53(data6[i0], { instancePath: instancePath + "/nodes/" + i0, parentData: data6, parentDataProperty: i0, rootData })) {
            vErrors = vErrors === null ? validate53.errors : vErrors.concat(validate53.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err17 = { instancePath: instancePath + "/nodes", schemaPath: "#/properties/nodes/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err17];
        } else {
          vErrors.push(err17);
        }
        errors++;
      }
    }
    if (data.edges !== void 0) {
      let data8 = data.edges;
      if (Array.isArray(data8)) {
        const len1 = data8.length;
        for (let i1 = 0; i1 < len1; i1++) {
          if (!validate59(data8[i1], { instancePath: instancePath + "/edges/" + i1, parentData: data8, parentDataProperty: i1, rootData })) {
            vErrors = vErrors === null ? validate59.errors : vErrors.concat(validate59.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err18 = { instancePath: instancePath + "/edges", schemaPath: "#/properties/edges/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err18];
        } else {
          vErrors.push(err18);
        }
        errors++;
      }
    }
  } else {
    const err19 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err19];
    } else {
      vErrors.push(err19);
    }
    errors++;
  }
  validate52.errors = vErrors;
  return errors === 0;
}
function validate13(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  const _errs0 = errors;
  let valid0 = false;
  const _errs1 = errors;
  if (!validate14(data, { instancePath, parentData, parentDataProperty, rootData })) {
    vErrors = vErrors === null ? validate14.errors : vErrors.concat(validate14.errors);
    errors = vErrors.length;
  }
  var _valid0 = _errs1 === errors;
  valid0 = valid0 || _valid0;
  if (!valid0) {
    const _errs2 = errors;
    if (!validate52(data, { instancePath, parentData, parentDataProperty, rootData })) {
      vErrors = vErrors === null ? validate52.errors : vErrors.concat(validate52.errors);
      errors = vErrors.length;
    }
    var _valid0 = _errs2 === errors;
    valid0 = valid0 || _valid0;
  }
  if (!valid0) {
    const err0 = { instancePath, schemaPath: "#/anyOf", keyword: "anyOf", params: {}, message: "must match a schema in anyOf" };
    if (vErrors === null) {
      vErrors = [err0];
    } else {
      vErrors.push(err0);
    }
    errors++;
  } else {
    errors = _errs0;
    if (vErrors !== null) {
      if (_errs0) {
        vErrors.length = _errs0;
      } else {
        vErrors = null;
      }
    }
  }
  validate13.errors = vErrors;
  return errors === 0;
}
var schema77 = { "type": "object", "properties": { "mode": { "type": "string", "enum": ["auto", "manual", "hybrid"] }, "nodes": { "type": "object", "additionalProperties": { "$ref": "#/definitions/NodePlacement" } }, "routes": { "type": "object", "additionalProperties": { "$ref": "#/definitions/RoutePlacement" } }, "groups": { "type": "array", "items": { "$ref": "#/definitions/DiagramGroup" } }, "zOrder": { "type": "array", "items": { "type": "string" } } }, "required": ["mode", "nodes", "routes", "groups", "zOrder"], "additionalProperties": false };
var schema84 = { "type": "object", "properties": { "id": { "type": "string" }, "label": { "type": "string" }, "kind": { "type": "string", "enum": ["visual", "system", "region", "security-group"] }, "nodeIds": { "type": "array", "items": { "type": "string" } }, "parentGroup": { "type": "string" }, "locked": { "type": "boolean" } }, "required": ["id", "label", "kind", "nodeIds", "locked"], "additionalProperties": false };
function validate65(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.side === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "side" }, message: "must have required property 'side'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.offset === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "offset" }, message: "must have required property 'offset'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "side" || key0 === "offset")) {
        const err2 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
    if (data.side !== void 0) {
      let data0 = data.side;
      if (typeof data0 !== "string") {
        const err3 = { instancePath: instancePath + "/side", schemaPath: "#/definitions/PortSide/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
      if (!(data0 === "left" || data0 === "right" || data0 === "top" || data0 === "bottom")) {
        const err4 = { instancePath: instancePath + "/side", schemaPath: "#/definitions/PortSide/enum", keyword: "enum", params: { allowedValues: schema71.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.offset !== void 0) {
      if (!(typeof data.offset == "number")) {
        const err5 = { instancePath: instancePath + "/offset", schemaPath: "#/properties/offset/type", keyword: "type", params: { type: "number" }, message: "must be number" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
  } else {
    const err6 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err6];
    } else {
      vErrors.push(err6);
    }
    errors++;
  }
  validate65.errors = vErrors;
  return errors === 0;
}
function validate64(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  const _errs0 = errors;
  let valid0 = false;
  const _errs1 = errors;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.mode === void 0) {
      const err0 = { instancePath, schemaPath: "#/anyOf/0/required", keyword: "required", params: { missingProperty: "mode" }, message: "must have required property 'mode'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "mode")) {
        const err1 = { instancePath, schemaPath: "#/anyOf/0/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err1];
        } else {
          vErrors.push(err1);
        }
        errors++;
      }
    }
    if (data.mode !== void 0) {
      let data0 = data.mode;
      if (typeof data0 !== "string") {
        const err2 = { instancePath: instancePath + "/mode", schemaPath: "#/anyOf/0/properties/mode/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
      if ("auto" !== data0) {
        const err3 = { instancePath: instancePath + "/mode", schemaPath: "#/anyOf/0/properties/mode/const", keyword: "const", params: { allowedValue: "auto" }, message: "must be equal to constant" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
  } else {
    const err4 = { instancePath, schemaPath: "#/anyOf/0/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err4];
    } else {
      vErrors.push(err4);
    }
    errors++;
  }
  var _valid0 = _errs1 === errors;
  valid0 = valid0 || _valid0;
  if (!valid0) {
    const _errs6 = errors;
    if (data && typeof data == "object" && !Array.isArray(data)) {
      if (data.mode === void 0) {
        const err5 = { instancePath, schemaPath: "#/anyOf/1/required", keyword: "required", params: { missingProperty: "mode" }, message: "must have required property 'mode'" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
      if (data.source === void 0) {
        const err6 = { instancePath, schemaPath: "#/anyOf/1/required", keyword: "required", params: { missingProperty: "source" }, message: "must have required property 'source'" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
      if (data.target === void 0) {
        const err7 = { instancePath, schemaPath: "#/anyOf/1/required", keyword: "required", params: { missingProperty: "target" }, message: "must have required property 'target'" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
      if (data.points === void 0) {
        const err8 = { instancePath, schemaPath: "#/anyOf/1/required", keyword: "required", params: { missingProperty: "points" }, message: "must have required property 'points'" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
      for (const key1 in data) {
        if (!(key1 === "mode" || key1 === "source" || key1 === "target" || key1 === "points" || key1 === "label")) {
          const err9 = { instancePath, schemaPath: "#/anyOf/1/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
          if (vErrors === null) {
            vErrors = [err9];
          } else {
            vErrors.push(err9);
          }
          errors++;
        }
      }
      if (data.mode !== void 0) {
        let data1 = data.mode;
        if (typeof data1 !== "string") {
          const err10 = { instancePath: instancePath + "/mode", schemaPath: "#/anyOf/1/properties/mode/type", keyword: "type", params: { type: "string" }, message: "must be string" };
          if (vErrors === null) {
            vErrors = [err10];
          } else {
            vErrors.push(err10);
          }
          errors++;
        }
        if ("manual" !== data1) {
          const err11 = { instancePath: instancePath + "/mode", schemaPath: "#/anyOf/1/properties/mode/const", keyword: "const", params: { allowedValue: "manual" }, message: "must be equal to constant" };
          if (vErrors === null) {
            vErrors = [err11];
          } else {
            vErrors.push(err11);
          }
          errors++;
        }
      }
      if (data.source !== void 0) {
        if (!validate65(data.source, { instancePath: instancePath + "/source", parentData: data, parentDataProperty: "source", rootData })) {
          vErrors = vErrors === null ? validate65.errors : vErrors.concat(validate65.errors);
          errors = vErrors.length;
        }
      }
      if (data.target !== void 0) {
        if (!validate65(data.target, { instancePath: instancePath + "/target", parentData: data, parentDataProperty: "target", rootData })) {
          vErrors = vErrors === null ? validate65.errors : vErrors.concat(validate65.errors);
          errors = vErrors.length;
        }
      }
      if (data.points !== void 0) {
        let data4 = data.points;
        if (Array.isArray(data4)) {
          const len0 = data4.length;
          for (let i0 = 0; i0 < len0; i0++) {
            let data5 = data4[i0];
            if (data5 && typeof data5 == "object" && !Array.isArray(data5)) {
              if (data5.x === void 0) {
                const err12 = { instancePath: instancePath + "/points/" + i0, schemaPath: "#/definitions/Point/required", keyword: "required", params: { missingProperty: "x" }, message: "must have required property 'x'" };
                if (vErrors === null) {
                  vErrors = [err12];
                } else {
                  vErrors.push(err12);
                }
                errors++;
              }
              if (data5.y === void 0) {
                const err13 = { instancePath: instancePath + "/points/" + i0, schemaPath: "#/definitions/Point/required", keyword: "required", params: { missingProperty: "y" }, message: "must have required property 'y'" };
                if (vErrors === null) {
                  vErrors = [err13];
                } else {
                  vErrors.push(err13);
                }
                errors++;
              }
              for (const key2 in data5) {
                if (!(key2 === "x" || key2 === "y")) {
                  const err14 = { instancePath: instancePath + "/points/" + i0, schemaPath: "#/definitions/Point/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key2 }, message: "must NOT have additional properties" };
                  if (vErrors === null) {
                    vErrors = [err14];
                  } else {
                    vErrors.push(err14);
                  }
                  errors++;
                }
              }
              if (data5.x !== void 0) {
                if (!(typeof data5.x == "number")) {
                  const err15 = { instancePath: instancePath + "/points/" + i0 + "/x", schemaPath: "#/definitions/Point/properties/x/type", keyword: "type", params: { type: "number" }, message: "must be number" };
                  if (vErrors === null) {
                    vErrors = [err15];
                  } else {
                    vErrors.push(err15);
                  }
                  errors++;
                }
              }
              if (data5.y !== void 0) {
                if (!(typeof data5.y == "number")) {
                  const err16 = { instancePath: instancePath + "/points/" + i0 + "/y", schemaPath: "#/definitions/Point/properties/y/type", keyword: "type", params: { type: "number" }, message: "must be number" };
                  if (vErrors === null) {
                    vErrors = [err16];
                  } else {
                    vErrors.push(err16);
                  }
                  errors++;
                }
              }
            } else {
              const err17 = { instancePath: instancePath + "/points/" + i0, schemaPath: "#/definitions/Point/type", keyword: "type", params: { type: "object" }, message: "must be object" };
              if (vErrors === null) {
                vErrors = [err17];
              } else {
                vErrors.push(err17);
              }
              errors++;
            }
          }
        } else {
          const err18 = { instancePath: instancePath + "/points", schemaPath: "#/anyOf/1/properties/points/type", keyword: "type", params: { type: "array" }, message: "must be array" };
          if (vErrors === null) {
            vErrors = [err18];
          } else {
            vErrors.push(err18);
          }
          errors++;
        }
      }
      if (data.label !== void 0) {
        let data8 = data.label;
        if (data8 && typeof data8 == "object" && !Array.isArray(data8)) {
          if (data8.x === void 0) {
            const err19 = { instancePath: instancePath + "/label", schemaPath: "#/definitions/Point/required", keyword: "required", params: { missingProperty: "x" }, message: "must have required property 'x'" };
            if (vErrors === null) {
              vErrors = [err19];
            } else {
              vErrors.push(err19);
            }
            errors++;
          }
          if (data8.y === void 0) {
            const err20 = { instancePath: instancePath + "/label", schemaPath: "#/definitions/Point/required", keyword: "required", params: { missingProperty: "y" }, message: "must have required property 'y'" };
            if (vErrors === null) {
              vErrors = [err20];
            } else {
              vErrors.push(err20);
            }
            errors++;
          }
          for (const key3 in data8) {
            if (!(key3 === "x" || key3 === "y")) {
              const err21 = { instancePath: instancePath + "/label", schemaPath: "#/definitions/Point/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key3 }, message: "must NOT have additional properties" };
              if (vErrors === null) {
                vErrors = [err21];
              } else {
                vErrors.push(err21);
              }
              errors++;
            }
          }
          if (data8.x !== void 0) {
            if (!(typeof data8.x == "number")) {
              const err22 = { instancePath: instancePath + "/label/x", schemaPath: "#/definitions/Point/properties/x/type", keyword: "type", params: { type: "number" }, message: "must be number" };
              if (vErrors === null) {
                vErrors = [err22];
              } else {
                vErrors.push(err22);
              }
              errors++;
            }
          }
          if (data8.y !== void 0) {
            if (!(typeof data8.y == "number")) {
              const err23 = { instancePath: instancePath + "/label/y", schemaPath: "#/definitions/Point/properties/y/type", keyword: "type", params: { type: "number" }, message: "must be number" };
              if (vErrors === null) {
                vErrors = [err23];
              } else {
                vErrors.push(err23);
              }
              errors++;
            }
          }
        } else {
          const err24 = { instancePath: instancePath + "/label", schemaPath: "#/definitions/Point/type", keyword: "type", params: { type: "object" }, message: "must be object" };
          if (vErrors === null) {
            vErrors = [err24];
          } else {
            vErrors.push(err24);
          }
          errors++;
        }
      }
    } else {
      const err25 = { instancePath, schemaPath: "#/anyOf/1/type", keyword: "type", params: { type: "object" }, message: "must be object" };
      if (vErrors === null) {
        vErrors = [err25];
      } else {
        vErrors.push(err25);
      }
      errors++;
    }
    var _valid0 = _errs6 === errors;
    valid0 = valid0 || _valid0;
  }
  if (!valid0) {
    const err26 = { instancePath, schemaPath: "#/anyOf", keyword: "anyOf", params: {}, message: "must match a schema in anyOf" };
    if (vErrors === null) {
      vErrors = [err26];
    } else {
      vErrors.push(err26);
    }
    errors++;
  } else {
    errors = _errs0;
    if (vErrors !== null) {
      if (_errs0) {
        vErrors.length = _errs0;
      } else {
        vErrors = null;
      }
    }
  }
  validate64.errors = vErrors;
  return errors === 0;
}
function validate63(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.mode === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "mode" }, message: "must have required property 'mode'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.nodes === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "nodes" }, message: "must have required property 'nodes'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.routes === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "routes" }, message: "must have required property 'routes'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data.groups === void 0) {
      const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "groups" }, message: "must have required property 'groups'" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    if (data.zOrder === void 0) {
      const err4 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "zOrder" }, message: "must have required property 'zOrder'" };
      if (vErrors === null) {
        vErrors = [err4];
      } else {
        vErrors.push(err4);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "mode" || key0 === "nodes" || key0 === "routes" || key0 === "groups" || key0 === "zOrder")) {
        const err5 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.mode !== void 0) {
      let data0 = data.mode;
      if (typeof data0 !== "string") {
        const err6 = { instancePath: instancePath + "/mode", schemaPath: "#/properties/mode/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
      if (!(data0 === "auto" || data0 === "manual" || data0 === "hybrid")) {
        const err7 = { instancePath: instancePath + "/mode", schemaPath: "#/properties/mode/enum", keyword: "enum", params: { allowedValues: schema77.properties.mode.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
    if (data.nodes !== void 0) {
      let data1 = data.nodes;
      if (data1 && typeof data1 == "object" && !Array.isArray(data1)) {
        for (const key1 in data1) {
          let data2 = data1[key1];
          if (data2 && typeof data2 == "object" && !Array.isArray(data2)) {
            if (data2.height === void 0) {
              const err8 = { instancePath: instancePath + "/nodes/" + key1.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/definitions/NodePlacement/required", keyword: "required", params: { missingProperty: "height" }, message: "must have required property 'height'" };
              if (vErrors === null) {
                vErrors = [err8];
              } else {
                vErrors.push(err8);
              }
              errors++;
            }
            if (data2.locked === void 0) {
              const err9 = { instancePath: instancePath + "/nodes/" + key1.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/definitions/NodePlacement/required", keyword: "required", params: { missingProperty: "locked" }, message: "must have required property 'locked'" };
              if (vErrors === null) {
                vErrors = [err9];
              } else {
                vErrors.push(err9);
              }
              errors++;
            }
            if (data2.width === void 0) {
              const err10 = { instancePath: instancePath + "/nodes/" + key1.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/definitions/NodePlacement/required", keyword: "required", params: { missingProperty: "width" }, message: "must have required property 'width'" };
              if (vErrors === null) {
                vErrors = [err10];
              } else {
                vErrors.push(err10);
              }
              errors++;
            }
            if (data2.x === void 0) {
              const err11 = { instancePath: instancePath + "/nodes/" + key1.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/definitions/NodePlacement/required", keyword: "required", params: { missingProperty: "x" }, message: "must have required property 'x'" };
              if (vErrors === null) {
                vErrors = [err11];
              } else {
                vErrors.push(err11);
              }
              errors++;
            }
            if (data2.y === void 0) {
              const err12 = { instancePath: instancePath + "/nodes/" + key1.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/definitions/NodePlacement/required", keyword: "required", params: { missingProperty: "y" }, message: "must have required property 'y'" };
              if (vErrors === null) {
                vErrors = [err12];
              } else {
                vErrors.push(err12);
              }
              errors++;
            }
            for (const key2 in data2) {
              if (!(key2 === "width" || key2 === "height" || key2 === "x" || key2 === "y" || key2 === "locked")) {
                const err13 = { instancePath: instancePath + "/nodes/" + key1.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/definitions/NodePlacement/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key2 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err13];
                } else {
                  vErrors.push(err13);
                }
                errors++;
              }
            }
            if (data2.width !== void 0) {
              if (!(typeof data2.width == "number")) {
                const err14 = { instancePath: instancePath + "/nodes/" + key1.replace(/~/g, "~0").replace(/\//g, "~1") + "/width", schemaPath: "#/definitions/NodePlacement/properties/width/type", keyword: "type", params: { type: "number" }, message: "must be number" };
                if (vErrors === null) {
                  vErrors = [err14];
                } else {
                  vErrors.push(err14);
                }
                errors++;
              }
            }
            if (data2.height !== void 0) {
              if (!(typeof data2.height == "number")) {
                const err15 = { instancePath: instancePath + "/nodes/" + key1.replace(/~/g, "~0").replace(/\//g, "~1") + "/height", schemaPath: "#/definitions/NodePlacement/properties/height/type", keyword: "type", params: { type: "number" }, message: "must be number" };
                if (vErrors === null) {
                  vErrors = [err15];
                } else {
                  vErrors.push(err15);
                }
                errors++;
              }
            }
            if (data2.x !== void 0) {
              if (!(typeof data2.x == "number")) {
                const err16 = { instancePath: instancePath + "/nodes/" + key1.replace(/~/g, "~0").replace(/\//g, "~1") + "/x", schemaPath: "#/definitions/NodePlacement/properties/x/type", keyword: "type", params: { type: "number" }, message: "must be number" };
                if (vErrors === null) {
                  vErrors = [err16];
                } else {
                  vErrors.push(err16);
                }
                errors++;
              }
            }
            if (data2.y !== void 0) {
              if (!(typeof data2.y == "number")) {
                const err17 = { instancePath: instancePath + "/nodes/" + key1.replace(/~/g, "~0").replace(/\//g, "~1") + "/y", schemaPath: "#/definitions/NodePlacement/properties/y/type", keyword: "type", params: { type: "number" }, message: "must be number" };
                if (vErrors === null) {
                  vErrors = [err17];
                } else {
                  vErrors.push(err17);
                }
                errors++;
              }
            }
            if (data2.locked !== void 0) {
              if (typeof data2.locked !== "boolean") {
                const err18 = { instancePath: instancePath + "/nodes/" + key1.replace(/~/g, "~0").replace(/\//g, "~1") + "/locked", schemaPath: "#/definitions/NodePlacement/properties/locked/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
                if (vErrors === null) {
                  vErrors = [err18];
                } else {
                  vErrors.push(err18);
                }
                errors++;
              }
            }
          } else {
            const err19 = { instancePath: instancePath + "/nodes/" + key1.replace(/~/g, "~0").replace(/\//g, "~1"), schemaPath: "#/definitions/NodePlacement/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err19];
            } else {
              vErrors.push(err19);
            }
            errors++;
          }
        }
      } else {
        const err20 = { instancePath: instancePath + "/nodes", schemaPath: "#/properties/nodes/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err20];
        } else {
          vErrors.push(err20);
        }
        errors++;
      }
    }
    if (data.routes !== void 0) {
      let data8 = data.routes;
      if (data8 && typeof data8 == "object" && !Array.isArray(data8)) {
        for (const key3 in data8) {
          if (!validate64(data8[key3], { instancePath: instancePath + "/routes/" + key3.replace(/~/g, "~0").replace(/\//g, "~1"), parentData: data8, parentDataProperty: key3, rootData })) {
            vErrors = vErrors === null ? validate64.errors : vErrors.concat(validate64.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err21 = { instancePath: instancePath + "/routes", schemaPath: "#/properties/routes/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err21];
        } else {
          vErrors.push(err21);
        }
        errors++;
      }
    }
    if (data.groups !== void 0) {
      let data10 = data.groups;
      if (Array.isArray(data10)) {
        const len0 = data10.length;
        for (let i0 = 0; i0 < len0; i0++) {
          let data11 = data10[i0];
          if (data11 && typeof data11 == "object" && !Array.isArray(data11)) {
            if (data11.id === void 0) {
              const err22 = { instancePath: instancePath + "/groups/" + i0, schemaPath: "#/definitions/DiagramGroup/required", keyword: "required", params: { missingProperty: "id" }, message: "must have required property 'id'" };
              if (vErrors === null) {
                vErrors = [err22];
              } else {
                vErrors.push(err22);
              }
              errors++;
            }
            if (data11.label === void 0) {
              const err23 = { instancePath: instancePath + "/groups/" + i0, schemaPath: "#/definitions/DiagramGroup/required", keyword: "required", params: { missingProperty: "label" }, message: "must have required property 'label'" };
              if (vErrors === null) {
                vErrors = [err23];
              } else {
                vErrors.push(err23);
              }
              errors++;
            }
            if (data11.kind === void 0) {
              const err24 = { instancePath: instancePath + "/groups/" + i0, schemaPath: "#/definitions/DiagramGroup/required", keyword: "required", params: { missingProperty: "kind" }, message: "must have required property 'kind'" };
              if (vErrors === null) {
                vErrors = [err24];
              } else {
                vErrors.push(err24);
              }
              errors++;
            }
            if (data11.nodeIds === void 0) {
              const err25 = { instancePath: instancePath + "/groups/" + i0, schemaPath: "#/definitions/DiagramGroup/required", keyword: "required", params: { missingProperty: "nodeIds" }, message: "must have required property 'nodeIds'" };
              if (vErrors === null) {
                vErrors = [err25];
              } else {
                vErrors.push(err25);
              }
              errors++;
            }
            if (data11.locked === void 0) {
              const err26 = { instancePath: instancePath + "/groups/" + i0, schemaPath: "#/definitions/DiagramGroup/required", keyword: "required", params: { missingProperty: "locked" }, message: "must have required property 'locked'" };
              if (vErrors === null) {
                vErrors = [err26];
              } else {
                vErrors.push(err26);
              }
              errors++;
            }
            for (const key4 in data11) {
              if (!(key4 === "id" || key4 === "label" || key4 === "kind" || key4 === "nodeIds" || key4 === "parentGroup" || key4 === "locked")) {
                const err27 = { instancePath: instancePath + "/groups/" + i0, schemaPath: "#/definitions/DiagramGroup/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key4 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err27];
                } else {
                  vErrors.push(err27);
                }
                errors++;
              }
            }
            if (data11.id !== void 0) {
              if (typeof data11.id !== "string") {
                const err28 = { instancePath: instancePath + "/groups/" + i0 + "/id", schemaPath: "#/definitions/DiagramGroup/properties/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err28];
                } else {
                  vErrors.push(err28);
                }
                errors++;
              }
            }
            if (data11.label !== void 0) {
              if (typeof data11.label !== "string") {
                const err29 = { instancePath: instancePath + "/groups/" + i0 + "/label", schemaPath: "#/definitions/DiagramGroup/properties/label/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err29];
                } else {
                  vErrors.push(err29);
                }
                errors++;
              }
            }
            if (data11.kind !== void 0) {
              let data14 = data11.kind;
              if (typeof data14 !== "string") {
                const err30 = { instancePath: instancePath + "/groups/" + i0 + "/kind", schemaPath: "#/definitions/DiagramGroup/properties/kind/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err30];
                } else {
                  vErrors.push(err30);
                }
                errors++;
              }
              if (!(data14 === "visual" || data14 === "system" || data14 === "region" || data14 === "security-group")) {
                const err31 = { instancePath: instancePath + "/groups/" + i0 + "/kind", schemaPath: "#/definitions/DiagramGroup/properties/kind/enum", keyword: "enum", params: { allowedValues: schema84.properties.kind.enum }, message: "must be equal to one of the allowed values" };
                if (vErrors === null) {
                  vErrors = [err31];
                } else {
                  vErrors.push(err31);
                }
                errors++;
              }
            }
            if (data11.nodeIds !== void 0) {
              let data15 = data11.nodeIds;
              if (Array.isArray(data15)) {
                const len1 = data15.length;
                for (let i1 = 0; i1 < len1; i1++) {
                  if (typeof data15[i1] !== "string") {
                    const err32 = { instancePath: instancePath + "/groups/" + i0 + "/nodeIds/" + i1, schemaPath: "#/definitions/DiagramGroup/properties/nodeIds/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                    if (vErrors === null) {
                      vErrors = [err32];
                    } else {
                      vErrors.push(err32);
                    }
                    errors++;
                  }
                }
              } else {
                const err33 = { instancePath: instancePath + "/groups/" + i0 + "/nodeIds", schemaPath: "#/definitions/DiagramGroup/properties/nodeIds/type", keyword: "type", params: { type: "array" }, message: "must be array" };
                if (vErrors === null) {
                  vErrors = [err33];
                } else {
                  vErrors.push(err33);
                }
                errors++;
              }
            }
            if (data11.parentGroup !== void 0) {
              if (typeof data11.parentGroup !== "string") {
                const err34 = { instancePath: instancePath + "/groups/" + i0 + "/parentGroup", schemaPath: "#/definitions/DiagramGroup/properties/parentGroup/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err34];
                } else {
                  vErrors.push(err34);
                }
                errors++;
              }
            }
            if (data11.locked !== void 0) {
              if (typeof data11.locked !== "boolean") {
                const err35 = { instancePath: instancePath + "/groups/" + i0 + "/locked", schemaPath: "#/definitions/DiagramGroup/properties/locked/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
                if (vErrors === null) {
                  vErrors = [err35];
                } else {
                  vErrors.push(err35);
                }
                errors++;
              }
            }
          } else {
            const err36 = { instancePath: instancePath + "/groups/" + i0, schemaPath: "#/definitions/DiagramGroup/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err36];
            } else {
              vErrors.push(err36);
            }
            errors++;
          }
        }
      } else {
        const err37 = { instancePath: instancePath + "/groups", schemaPath: "#/properties/groups/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err37];
        } else {
          vErrors.push(err37);
        }
        errors++;
      }
    }
    if (data.zOrder !== void 0) {
      let data19 = data.zOrder;
      if (Array.isArray(data19)) {
        const len2 = data19.length;
        for (let i2 = 0; i2 < len2; i2++) {
          if (typeof data19[i2] !== "string") {
            const err38 = { instancePath: instancePath + "/zOrder/" + i2, schemaPath: "#/properties/zOrder/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err38];
            } else {
              vErrors.push(err38);
            }
            errors++;
          }
        }
      } else {
        const err39 = { instancePath: instancePath + "/zOrder", schemaPath: "#/properties/zOrder/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err39];
        } else {
          vErrors.push(err39);
        }
        errors++;
      }
    }
  } else {
    const err40 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err40];
    } else {
      vErrors.push(err40);
    }
    errors++;
  }
  validate63.errors = vErrors;
  return errors === 0;
}
var schema85 = { "type": "object", "properties": { "theme": { "type": "object", "properties": { "mode": { "type": "string", "enum": ["light", "dark"] }, "light": { "$ref": "#/definitions/Palette" }, "dark": { "$ref": "#/definitions/Palette" } }, "required": ["mode", "light", "dark"], "additionalProperties": false }, "grid": { "type": "object", "properties": { "visible": { "type": "boolean" }, "snap": { "type": "boolean" }, "size": { "type": "number" } }, "required": ["visible", "snap", "size"], "additionalProperties": false }, "padding": { "type": "number" }, "legend": { "type": "string", "enum": ["visible", "hidden"] }, "edgeStyle": { "type": "string", "enum": ["orthogonal", "straight"] }, "textScale": { "type": "number" } }, "required": ["theme", "grid", "padding", "legend", "edgeStyle", "textScale"], "additionalProperties": false };
function validate70(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.theme === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "theme" }, message: "must have required property 'theme'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.grid === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "grid" }, message: "must have required property 'grid'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.padding === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "padding" }, message: "must have required property 'padding'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data.legend === void 0) {
      const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "legend" }, message: "must have required property 'legend'" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    if (data.edgeStyle === void 0) {
      const err4 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "edgeStyle" }, message: "must have required property 'edgeStyle'" };
      if (vErrors === null) {
        vErrors = [err4];
      } else {
        vErrors.push(err4);
      }
      errors++;
    }
    if (data.textScale === void 0) {
      const err5 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "textScale" }, message: "must have required property 'textScale'" };
      if (vErrors === null) {
        vErrors = [err5];
      } else {
        vErrors.push(err5);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "theme" || key0 === "grid" || key0 === "padding" || key0 === "legend" || key0 === "edgeStyle" || key0 === "textScale")) {
        const err6 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.theme !== void 0) {
      let data0 = data.theme;
      if (data0 && typeof data0 == "object" && !Array.isArray(data0)) {
        if (data0.mode === void 0) {
          const err7 = { instancePath: instancePath + "/theme", schemaPath: "#/properties/theme/required", keyword: "required", params: { missingProperty: "mode" }, message: "must have required property 'mode'" };
          if (vErrors === null) {
            vErrors = [err7];
          } else {
            vErrors.push(err7);
          }
          errors++;
        }
        if (data0.light === void 0) {
          const err8 = { instancePath: instancePath + "/theme", schemaPath: "#/properties/theme/required", keyword: "required", params: { missingProperty: "light" }, message: "must have required property 'light'" };
          if (vErrors === null) {
            vErrors = [err8];
          } else {
            vErrors.push(err8);
          }
          errors++;
        }
        if (data0.dark === void 0) {
          const err9 = { instancePath: instancePath + "/theme", schemaPath: "#/properties/theme/required", keyword: "required", params: { missingProperty: "dark" }, message: "must have required property 'dark'" };
          if (vErrors === null) {
            vErrors = [err9];
          } else {
            vErrors.push(err9);
          }
          errors++;
        }
        for (const key1 in data0) {
          if (!(key1 === "mode" || key1 === "light" || key1 === "dark")) {
            const err10 = { instancePath: instancePath + "/theme", schemaPath: "#/properties/theme/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err10];
            } else {
              vErrors.push(err10);
            }
            errors++;
          }
        }
        if (data0.mode !== void 0) {
          let data1 = data0.mode;
          if (typeof data1 !== "string") {
            const err11 = { instancePath: instancePath + "/theme/mode", schemaPath: "#/properties/theme/properties/mode/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err11];
            } else {
              vErrors.push(err11);
            }
            errors++;
          }
          if (!(data1 === "light" || data1 === "dark")) {
            const err12 = { instancePath: instancePath + "/theme/mode", schemaPath: "#/properties/theme/properties/mode/enum", keyword: "enum", params: { allowedValues: schema85.properties.theme.properties.mode.enum }, message: "must be equal to one of the allowed values" };
            if (vErrors === null) {
              vErrors = [err12];
            } else {
              vErrors.push(err12);
            }
            errors++;
          }
        }
        if (data0.light !== void 0) {
          let data2 = data0.light;
          if (data2 && typeof data2 == "object" && !Array.isArray(data2)) {
            if (data2.background === void 0) {
              const err13 = { instancePath: instancePath + "/theme/light", schemaPath: "#/definitions/Palette/required", keyword: "required", params: { missingProperty: "background" }, message: "must have required property 'background'" };
              if (vErrors === null) {
                vErrors = [err13];
              } else {
                vErrors.push(err13);
              }
              errors++;
            }
            if (data2.foreground === void 0) {
              const err14 = { instancePath: instancePath + "/theme/light", schemaPath: "#/definitions/Palette/required", keyword: "required", params: { missingProperty: "foreground" }, message: "must have required property 'foreground'" };
              if (vErrors === null) {
                vErrors = [err14];
              } else {
                vErrors.push(err14);
              }
              errors++;
            }
            if (data2.card === void 0) {
              const err15 = { instancePath: instancePath + "/theme/light", schemaPath: "#/definitions/Palette/required", keyword: "required", params: { missingProperty: "card" }, message: "must have required property 'card'" };
              if (vErrors === null) {
                vErrors = [err15];
              } else {
                vErrors.push(err15);
              }
              errors++;
            }
            if (data2.border === void 0) {
              const err16 = { instancePath: instancePath + "/theme/light", schemaPath: "#/definitions/Palette/required", keyword: "required", params: { missingProperty: "border" }, message: "must have required property 'border'" };
              if (vErrors === null) {
                vErrors = [err16];
              } else {
                vErrors.push(err16);
              }
              errors++;
            }
            if (data2.mutedForeground === void 0) {
              const err17 = { instancePath: instancePath + "/theme/light", schemaPath: "#/definitions/Palette/required", keyword: "required", params: { missingProperty: "mutedForeground" }, message: "must have required property 'mutedForeground'" };
              if (vErrors === null) {
                vErrors = [err17];
              } else {
                vErrors.push(err17);
              }
              errors++;
            }
            if (data2.cobalt === void 0) {
              const err18 = { instancePath: instancePath + "/theme/light", schemaPath: "#/definitions/Palette/required", keyword: "required", params: { missingProperty: "cobalt" }, message: "must have required property 'cobalt'" };
              if (vErrors === null) {
                vErrors = [err18];
              } else {
                vErrors.push(err18);
              }
              errors++;
            }
            if (data2.branch === void 0) {
              const err19 = { instancePath: instancePath + "/theme/light", schemaPath: "#/definitions/Palette/required", keyword: "required", params: { missingProperty: "branch" }, message: "must have required property 'branch'" };
              if (vErrors === null) {
                vErrors = [err19];
              } else {
                vErrors.push(err19);
              }
              errors++;
            }
            for (const key2 in data2) {
              if (!(key2 === "background" || key2 === "foreground" || key2 === "card" || key2 === "border" || key2 === "mutedForeground" || key2 === "cobalt" || key2 === "branch")) {
                const err20 = { instancePath: instancePath + "/theme/light", schemaPath: "#/definitions/Palette/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key2 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err20];
                } else {
                  vErrors.push(err20);
                }
                errors++;
              }
            }
            if (data2.background !== void 0) {
              if (typeof data2.background !== "string") {
                const err21 = { instancePath: instancePath + "/theme/light/background", schemaPath: "#/definitions/Palette/properties/background/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err21];
                } else {
                  vErrors.push(err21);
                }
                errors++;
              }
            }
            if (data2.foreground !== void 0) {
              if (typeof data2.foreground !== "string") {
                const err22 = { instancePath: instancePath + "/theme/light/foreground", schemaPath: "#/definitions/Palette/properties/foreground/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err22];
                } else {
                  vErrors.push(err22);
                }
                errors++;
              }
            }
            if (data2.card !== void 0) {
              if (typeof data2.card !== "string") {
                const err23 = { instancePath: instancePath + "/theme/light/card", schemaPath: "#/definitions/Palette/properties/card/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err23];
                } else {
                  vErrors.push(err23);
                }
                errors++;
              }
            }
            if (data2.border !== void 0) {
              if (typeof data2.border !== "string") {
                const err24 = { instancePath: instancePath + "/theme/light/border", schemaPath: "#/definitions/Palette/properties/border/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err24];
                } else {
                  vErrors.push(err24);
                }
                errors++;
              }
            }
            if (data2.mutedForeground !== void 0) {
              if (typeof data2.mutedForeground !== "string") {
                const err25 = { instancePath: instancePath + "/theme/light/mutedForeground", schemaPath: "#/definitions/Palette/properties/mutedForeground/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err25];
                } else {
                  vErrors.push(err25);
                }
                errors++;
              }
            }
            if (data2.cobalt !== void 0) {
              if (typeof data2.cobalt !== "string") {
                const err26 = { instancePath: instancePath + "/theme/light/cobalt", schemaPath: "#/definitions/Palette/properties/cobalt/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err26];
                } else {
                  vErrors.push(err26);
                }
                errors++;
              }
            }
            if (data2.branch !== void 0) {
              if (typeof data2.branch !== "string") {
                const err27 = { instancePath: instancePath + "/theme/light/branch", schemaPath: "#/definitions/Palette/properties/branch/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err27];
                } else {
                  vErrors.push(err27);
                }
                errors++;
              }
            }
          } else {
            const err28 = { instancePath: instancePath + "/theme/light", schemaPath: "#/definitions/Palette/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err28];
            } else {
              vErrors.push(err28);
            }
            errors++;
          }
        }
        if (data0.dark !== void 0) {
          let data10 = data0.dark;
          if (data10 && typeof data10 == "object" && !Array.isArray(data10)) {
            if (data10.background === void 0) {
              const err29 = { instancePath: instancePath + "/theme/dark", schemaPath: "#/definitions/Palette/required", keyword: "required", params: { missingProperty: "background" }, message: "must have required property 'background'" };
              if (vErrors === null) {
                vErrors = [err29];
              } else {
                vErrors.push(err29);
              }
              errors++;
            }
            if (data10.foreground === void 0) {
              const err30 = { instancePath: instancePath + "/theme/dark", schemaPath: "#/definitions/Palette/required", keyword: "required", params: { missingProperty: "foreground" }, message: "must have required property 'foreground'" };
              if (vErrors === null) {
                vErrors = [err30];
              } else {
                vErrors.push(err30);
              }
              errors++;
            }
            if (data10.card === void 0) {
              const err31 = { instancePath: instancePath + "/theme/dark", schemaPath: "#/definitions/Palette/required", keyword: "required", params: { missingProperty: "card" }, message: "must have required property 'card'" };
              if (vErrors === null) {
                vErrors = [err31];
              } else {
                vErrors.push(err31);
              }
              errors++;
            }
            if (data10.border === void 0) {
              const err32 = { instancePath: instancePath + "/theme/dark", schemaPath: "#/definitions/Palette/required", keyword: "required", params: { missingProperty: "border" }, message: "must have required property 'border'" };
              if (vErrors === null) {
                vErrors = [err32];
              } else {
                vErrors.push(err32);
              }
              errors++;
            }
            if (data10.mutedForeground === void 0) {
              const err33 = { instancePath: instancePath + "/theme/dark", schemaPath: "#/definitions/Palette/required", keyword: "required", params: { missingProperty: "mutedForeground" }, message: "must have required property 'mutedForeground'" };
              if (vErrors === null) {
                vErrors = [err33];
              } else {
                vErrors.push(err33);
              }
              errors++;
            }
            if (data10.cobalt === void 0) {
              const err34 = { instancePath: instancePath + "/theme/dark", schemaPath: "#/definitions/Palette/required", keyword: "required", params: { missingProperty: "cobalt" }, message: "must have required property 'cobalt'" };
              if (vErrors === null) {
                vErrors = [err34];
              } else {
                vErrors.push(err34);
              }
              errors++;
            }
            if (data10.branch === void 0) {
              const err35 = { instancePath: instancePath + "/theme/dark", schemaPath: "#/definitions/Palette/required", keyword: "required", params: { missingProperty: "branch" }, message: "must have required property 'branch'" };
              if (vErrors === null) {
                vErrors = [err35];
              } else {
                vErrors.push(err35);
              }
              errors++;
            }
            for (const key3 in data10) {
              if (!(key3 === "background" || key3 === "foreground" || key3 === "card" || key3 === "border" || key3 === "mutedForeground" || key3 === "cobalt" || key3 === "branch")) {
                const err36 = { instancePath: instancePath + "/theme/dark", schemaPath: "#/definitions/Palette/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key3 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err36];
                } else {
                  vErrors.push(err36);
                }
                errors++;
              }
            }
            if (data10.background !== void 0) {
              if (typeof data10.background !== "string") {
                const err37 = { instancePath: instancePath + "/theme/dark/background", schemaPath: "#/definitions/Palette/properties/background/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err37];
                } else {
                  vErrors.push(err37);
                }
                errors++;
              }
            }
            if (data10.foreground !== void 0) {
              if (typeof data10.foreground !== "string") {
                const err38 = { instancePath: instancePath + "/theme/dark/foreground", schemaPath: "#/definitions/Palette/properties/foreground/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err38];
                } else {
                  vErrors.push(err38);
                }
                errors++;
              }
            }
            if (data10.card !== void 0) {
              if (typeof data10.card !== "string") {
                const err39 = { instancePath: instancePath + "/theme/dark/card", schemaPath: "#/definitions/Palette/properties/card/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err39];
                } else {
                  vErrors.push(err39);
                }
                errors++;
              }
            }
            if (data10.border !== void 0) {
              if (typeof data10.border !== "string") {
                const err40 = { instancePath: instancePath + "/theme/dark/border", schemaPath: "#/definitions/Palette/properties/border/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err40];
                } else {
                  vErrors.push(err40);
                }
                errors++;
              }
            }
            if (data10.mutedForeground !== void 0) {
              if (typeof data10.mutedForeground !== "string") {
                const err41 = { instancePath: instancePath + "/theme/dark/mutedForeground", schemaPath: "#/definitions/Palette/properties/mutedForeground/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err41];
                } else {
                  vErrors.push(err41);
                }
                errors++;
              }
            }
            if (data10.cobalt !== void 0) {
              if (typeof data10.cobalt !== "string") {
                const err42 = { instancePath: instancePath + "/theme/dark/cobalt", schemaPath: "#/definitions/Palette/properties/cobalt/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err42];
                } else {
                  vErrors.push(err42);
                }
                errors++;
              }
            }
            if (data10.branch !== void 0) {
              if (typeof data10.branch !== "string") {
                const err43 = { instancePath: instancePath + "/theme/dark/branch", schemaPath: "#/definitions/Palette/properties/branch/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err43];
                } else {
                  vErrors.push(err43);
                }
                errors++;
              }
            }
          } else {
            const err44 = { instancePath: instancePath + "/theme/dark", schemaPath: "#/definitions/Palette/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err44];
            } else {
              vErrors.push(err44);
            }
            errors++;
          }
        }
      } else {
        const err45 = { instancePath: instancePath + "/theme", schemaPath: "#/properties/theme/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err45];
        } else {
          vErrors.push(err45);
        }
        errors++;
      }
    }
    if (data.grid !== void 0) {
      let data18 = data.grid;
      if (data18 && typeof data18 == "object" && !Array.isArray(data18)) {
        if (data18.visible === void 0) {
          const err46 = { instancePath: instancePath + "/grid", schemaPath: "#/properties/grid/required", keyword: "required", params: { missingProperty: "visible" }, message: "must have required property 'visible'" };
          if (vErrors === null) {
            vErrors = [err46];
          } else {
            vErrors.push(err46);
          }
          errors++;
        }
        if (data18.snap === void 0) {
          const err47 = { instancePath: instancePath + "/grid", schemaPath: "#/properties/grid/required", keyword: "required", params: { missingProperty: "snap" }, message: "must have required property 'snap'" };
          if (vErrors === null) {
            vErrors = [err47];
          } else {
            vErrors.push(err47);
          }
          errors++;
        }
        if (data18.size === void 0) {
          const err48 = { instancePath: instancePath + "/grid", schemaPath: "#/properties/grid/required", keyword: "required", params: { missingProperty: "size" }, message: "must have required property 'size'" };
          if (vErrors === null) {
            vErrors = [err48];
          } else {
            vErrors.push(err48);
          }
          errors++;
        }
        for (const key4 in data18) {
          if (!(key4 === "visible" || key4 === "snap" || key4 === "size")) {
            const err49 = { instancePath: instancePath + "/grid", schemaPath: "#/properties/grid/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key4 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err49];
            } else {
              vErrors.push(err49);
            }
            errors++;
          }
        }
        if (data18.visible !== void 0) {
          if (typeof data18.visible !== "boolean") {
            const err50 = { instancePath: instancePath + "/grid/visible", schemaPath: "#/properties/grid/properties/visible/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
            if (vErrors === null) {
              vErrors = [err50];
            } else {
              vErrors.push(err50);
            }
            errors++;
          }
        }
        if (data18.snap !== void 0) {
          if (typeof data18.snap !== "boolean") {
            const err51 = { instancePath: instancePath + "/grid/snap", schemaPath: "#/properties/grid/properties/snap/type", keyword: "type", params: { type: "boolean" }, message: "must be boolean" };
            if (vErrors === null) {
              vErrors = [err51];
            } else {
              vErrors.push(err51);
            }
            errors++;
          }
        }
        if (data18.size !== void 0) {
          if (!(typeof data18.size == "number")) {
            const err52 = { instancePath: instancePath + "/grid/size", schemaPath: "#/properties/grid/properties/size/type", keyword: "type", params: { type: "number" }, message: "must be number" };
            if (vErrors === null) {
              vErrors = [err52];
            } else {
              vErrors.push(err52);
            }
            errors++;
          }
        }
      } else {
        const err53 = { instancePath: instancePath + "/grid", schemaPath: "#/properties/grid/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err53];
        } else {
          vErrors.push(err53);
        }
        errors++;
      }
    }
    if (data.padding !== void 0) {
      if (!(typeof data.padding == "number")) {
        const err54 = { instancePath: instancePath + "/padding", schemaPath: "#/properties/padding/type", keyword: "type", params: { type: "number" }, message: "must be number" };
        if (vErrors === null) {
          vErrors = [err54];
        } else {
          vErrors.push(err54);
        }
        errors++;
      }
    }
    if (data.legend !== void 0) {
      let data23 = data.legend;
      if (typeof data23 !== "string") {
        const err55 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err55];
        } else {
          vErrors.push(err55);
        }
        errors++;
      }
      if (!(data23 === "visible" || data23 === "hidden")) {
        const err56 = { instancePath: instancePath + "/legend", schemaPath: "#/properties/legend/enum", keyword: "enum", params: { allowedValues: schema85.properties.legend.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err56];
        } else {
          vErrors.push(err56);
        }
        errors++;
      }
    }
    if (data.edgeStyle !== void 0) {
      let data24 = data.edgeStyle;
      if (typeof data24 !== "string") {
        const err57 = { instancePath: instancePath + "/edgeStyle", schemaPath: "#/properties/edgeStyle/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err57];
        } else {
          vErrors.push(err57);
        }
        errors++;
      }
      if (!(data24 === "orthogonal" || data24 === "straight")) {
        const err58 = { instancePath: instancePath + "/edgeStyle", schemaPath: "#/properties/edgeStyle/enum", keyword: "enum", params: { allowedValues: schema85.properties.edgeStyle.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err58];
        } else {
          vErrors.push(err58);
        }
        errors++;
      }
    }
    if (data.textScale !== void 0) {
      if (!(typeof data.textScale == "number")) {
        const err59 = { instancePath: instancePath + "/textScale", schemaPath: "#/properties/textScale/type", keyword: "type", params: { type: "number" }, message: "must be number" };
        if (vErrors === null) {
          vErrors = [err59];
        } else {
          vErrors.push(err59);
        }
        errors++;
      }
    }
  } else {
    const err60 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err60];
    } else {
      vErrors.push(err60);
    }
    errors++;
  }
  validate70.errors = vErrors;
  return errors === 0;
}
var schema89 = { "type": "object", "properties": { "roles": { "type": "array", "items": { "type": "string" } }, "tags": { "type": "array", "items": { "type": "string" } }, "notes": { "type": "string" }, "links": { "type": "array", "items": { "$ref": "#/definitions/DiagramLink" } }, "evidence": { "type": "array", "items": { "$ref": "#/definitions/SourceEvidence" } }, "owner": { "type": "string" }, "visibility": { "type": "string", "enum": ["public", "private"] }, "crossing": { "type": "string" } }, "required": ["roles", "tags"], "additionalProperties": false };
function validate73(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.roles === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "roles" }, message: "must have required property 'roles'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.tags === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "tags" }, message: "must have required property 'tags'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "roles" || key0 === "tags" || key0 === "notes" || key0 === "links" || key0 === "evidence" || key0 === "owner" || key0 === "visibility" || key0 === "crossing")) {
        const err2 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
    if (data.roles !== void 0) {
      let data0 = data.roles;
      if (Array.isArray(data0)) {
        const len0 = data0.length;
        for (let i0 = 0; i0 < len0; i0++) {
          if (typeof data0[i0] !== "string") {
            const err3 = { instancePath: instancePath + "/roles/" + i0, schemaPath: "#/properties/roles/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err3];
            } else {
              vErrors.push(err3);
            }
            errors++;
          }
        }
      } else {
        const err4 = { instancePath: instancePath + "/roles", schemaPath: "#/properties/roles/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.tags !== void 0) {
      let data2 = data.tags;
      if (Array.isArray(data2)) {
        const len1 = data2.length;
        for (let i1 = 0; i1 < len1; i1++) {
          if (typeof data2[i1] !== "string") {
            const err5 = { instancePath: instancePath + "/tags/" + i1, schemaPath: "#/properties/tags/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err5];
            } else {
              vErrors.push(err5);
            }
            errors++;
          }
        }
      } else {
        const err6 = { instancePath: instancePath + "/tags", schemaPath: "#/properties/tags/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.notes !== void 0) {
      if (typeof data.notes !== "string") {
        const err7 = { instancePath: instancePath + "/notes", schemaPath: "#/properties/notes/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
    if (data.links !== void 0) {
      let data5 = data.links;
      if (Array.isArray(data5)) {
        const len2 = data5.length;
        for (let i2 = 0; i2 < len2; i2++) {
          let data6 = data5[i2];
          if (data6 && typeof data6 == "object" && !Array.isArray(data6)) {
            if (data6.label === void 0) {
              const err8 = { instancePath: instancePath + "/links/" + i2, schemaPath: "#/definitions/DiagramLink/required", keyword: "required", params: { missingProperty: "label" }, message: "must have required property 'label'" };
              if (vErrors === null) {
                vErrors = [err8];
              } else {
                vErrors.push(err8);
              }
              errors++;
            }
            if (data6.href === void 0) {
              const err9 = { instancePath: instancePath + "/links/" + i2, schemaPath: "#/definitions/DiagramLink/required", keyword: "required", params: { missingProperty: "href" }, message: "must have required property 'href'" };
              if (vErrors === null) {
                vErrors = [err9];
              } else {
                vErrors.push(err9);
              }
              errors++;
            }
            for (const key1 in data6) {
              if (!(key1 === "label" || key1 === "href")) {
                const err10 = { instancePath: instancePath + "/links/" + i2, schemaPath: "#/definitions/DiagramLink/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err10];
                } else {
                  vErrors.push(err10);
                }
                errors++;
              }
            }
            if (data6.label !== void 0) {
              if (typeof data6.label !== "string") {
                const err11 = { instancePath: instancePath + "/links/" + i2 + "/label", schemaPath: "#/definitions/DiagramLink/properties/label/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err11];
                } else {
                  vErrors.push(err11);
                }
                errors++;
              }
            }
            if (data6.href !== void 0) {
              if (typeof data6.href !== "string") {
                const err12 = { instancePath: instancePath + "/links/" + i2 + "/href", schemaPath: "#/definitions/DiagramLink/properties/href/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err12];
                } else {
                  vErrors.push(err12);
                }
                errors++;
              }
            }
          } else {
            const err13 = { instancePath: instancePath + "/links/" + i2, schemaPath: "#/definitions/DiagramLink/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err13];
            } else {
              vErrors.push(err13);
            }
            errors++;
          }
        }
      } else {
        const err14 = { instancePath: instancePath + "/links", schemaPath: "#/properties/links/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err14];
        } else {
          vErrors.push(err14);
        }
        errors++;
      }
    }
    if (data.evidence !== void 0) {
      let data9 = data.evidence;
      if (Array.isArray(data9)) {
        const len3 = data9.length;
        for (let i3 = 0; i3 < len3; i3++) {
          let data10 = data9[i3];
          if (data10 && typeof data10 == "object" && !Array.isArray(data10)) {
            if (data10.id === void 0) {
              const err15 = { instancePath: instancePath + "/evidence/" + i3, schemaPath: "#/definitions/SourceEvidence/required", keyword: "required", params: { missingProperty: "id" }, message: "must have required property 'id'" };
              if (vErrors === null) {
                vErrors = [err15];
              } else {
                vErrors.push(err15);
              }
              errors++;
            }
            if (data10.repository === void 0) {
              const err16 = { instancePath: instancePath + "/evidence/" + i3, schemaPath: "#/definitions/SourceEvidence/required", keyword: "required", params: { missingProperty: "repository" }, message: "must have required property 'repository'" };
              if (vErrors === null) {
                vErrors = [err16];
              } else {
                vErrors.push(err16);
              }
              errors++;
            }
            if (data10.commit === void 0) {
              const err17 = { instancePath: instancePath + "/evidence/" + i3, schemaPath: "#/definitions/SourceEvidence/required", keyword: "required", params: { missingProperty: "commit" }, message: "must have required property 'commit'" };
              if (vErrors === null) {
                vErrors = [err17];
              } else {
                vErrors.push(err17);
              }
              errors++;
            }
            if (data10.path === void 0) {
              const err18 = { instancePath: instancePath + "/evidence/" + i3, schemaPath: "#/definitions/SourceEvidence/required", keyword: "required", params: { missingProperty: "path" }, message: "must have required property 'path'" };
              if (vErrors === null) {
                vErrors = [err18];
              } else {
                vErrors.push(err18);
              }
              errors++;
            }
            if (data10.startLine === void 0) {
              const err19 = { instancePath: instancePath + "/evidence/" + i3, schemaPath: "#/definitions/SourceEvidence/required", keyword: "required", params: { missingProperty: "startLine" }, message: "must have required property 'startLine'" };
              if (vErrors === null) {
                vErrors = [err19];
              } else {
                vErrors.push(err19);
              }
              errors++;
            }
            if (data10.endLine === void 0) {
              const err20 = { instancePath: instancePath + "/evidence/" + i3, schemaPath: "#/definitions/SourceEvidence/required", keyword: "required", params: { missingProperty: "endLine" }, message: "must have required property 'endLine'" };
              if (vErrors === null) {
                vErrors = [err20];
              } else {
                vErrors.push(err20);
              }
              errors++;
            }
            for (const key2 in data10) {
              if (!(key2 === "id" || key2 === "repository" || key2 === "commit" || key2 === "path" || key2 === "startLine" || key2 === "endLine" || key2 === "blobSha")) {
                const err21 = { instancePath: instancePath + "/evidence/" + i3, schemaPath: "#/definitions/SourceEvidence/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key2 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err21];
                } else {
                  vErrors.push(err21);
                }
                errors++;
              }
            }
            if (data10.id !== void 0) {
              if (typeof data10.id !== "string") {
                const err22 = { instancePath: instancePath + "/evidence/" + i3 + "/id", schemaPath: "#/definitions/SourceEvidence/properties/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err22];
                } else {
                  vErrors.push(err22);
                }
                errors++;
              }
            }
            if (data10.repository !== void 0) {
              if (typeof data10.repository !== "string") {
                const err23 = { instancePath: instancePath + "/evidence/" + i3 + "/repository", schemaPath: "#/definitions/SourceEvidence/properties/repository/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err23];
                } else {
                  vErrors.push(err23);
                }
                errors++;
              }
            }
            if (data10.commit !== void 0) {
              if (typeof data10.commit !== "string") {
                const err24 = { instancePath: instancePath + "/evidence/" + i3 + "/commit", schemaPath: "#/definitions/SourceEvidence/properties/commit/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err24];
                } else {
                  vErrors.push(err24);
                }
                errors++;
              }
            }
            if (data10.path !== void 0) {
              if (typeof data10.path !== "string") {
                const err25 = { instancePath: instancePath + "/evidence/" + i3 + "/path", schemaPath: "#/definitions/SourceEvidence/properties/path/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err25];
                } else {
                  vErrors.push(err25);
                }
                errors++;
              }
            }
            if (data10.startLine !== void 0) {
              if (!(typeof data10.startLine == "number")) {
                const err26 = { instancePath: instancePath + "/evidence/" + i3 + "/startLine", schemaPath: "#/definitions/SourceEvidence/properties/startLine/type", keyword: "type", params: { type: "number" }, message: "must be number" };
                if (vErrors === null) {
                  vErrors = [err26];
                } else {
                  vErrors.push(err26);
                }
                errors++;
              }
            }
            if (data10.endLine !== void 0) {
              if (!(typeof data10.endLine == "number")) {
                const err27 = { instancePath: instancePath + "/evidence/" + i3 + "/endLine", schemaPath: "#/definitions/SourceEvidence/properties/endLine/type", keyword: "type", params: { type: "number" }, message: "must be number" };
                if (vErrors === null) {
                  vErrors = [err27];
                } else {
                  vErrors.push(err27);
                }
                errors++;
              }
            }
            if (data10.blobSha !== void 0) {
              if (typeof data10.blobSha !== "string") {
                const err28 = { instancePath: instancePath + "/evidence/" + i3 + "/blobSha", schemaPath: "#/definitions/SourceEvidence/properties/blobSha/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err28];
                } else {
                  vErrors.push(err28);
                }
                errors++;
              }
            }
          } else {
            const err29 = { instancePath: instancePath + "/evidence/" + i3, schemaPath: "#/definitions/SourceEvidence/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err29];
            } else {
              vErrors.push(err29);
            }
            errors++;
          }
        }
      } else {
        const err30 = { instancePath: instancePath + "/evidence", schemaPath: "#/properties/evidence/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err30];
        } else {
          vErrors.push(err30);
        }
        errors++;
      }
    }
    if (data.owner !== void 0) {
      if (typeof data.owner !== "string") {
        const err31 = { instancePath: instancePath + "/owner", schemaPath: "#/properties/owner/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err31];
        } else {
          vErrors.push(err31);
        }
        errors++;
      }
    }
    if (data.visibility !== void 0) {
      let data19 = data.visibility;
      if (typeof data19 !== "string") {
        const err32 = { instancePath: instancePath + "/visibility", schemaPath: "#/properties/visibility/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err32];
        } else {
          vErrors.push(err32);
        }
        errors++;
      }
      if (!(data19 === "public" || data19 === "private")) {
        const err33 = { instancePath: instancePath + "/visibility", schemaPath: "#/properties/visibility/enum", keyword: "enum", params: { allowedValues: schema89.properties.visibility.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err33];
        } else {
          vErrors.push(err33);
        }
        errors++;
      }
    }
    if (data.crossing !== void 0) {
      if (typeof data.crossing !== "string") {
        const err34 = { instancePath: instancePath + "/crossing", schemaPath: "#/properties/crossing/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err34];
        } else {
          vErrors.push(err34);
        }
        errors++;
      }
    }
  } else {
    const err35 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err35];
    } else {
      vErrors.push(err35);
    }
    errors++;
  }
  validate73.errors = vErrors;
  return errors === 0;
}
var schema94 = { "type": "string", "enum": ["express", "google-cloud", "mcp", "nextjs", "openai", "openrouter", "pdf", "postgresql"] };
var schema96 = { "type": "string", "enum": ["arrows-split", "brackets-curly", "folder-lock", "gauge", "graph", "handshake", "list-checks", "list-magnifying-glass", "monitor", "receipt", "rocket-launch", "scales", "seal-check", "user-check", "user-focus", "warning"] };
function validate77(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  const _errs0 = errors;
  let valid0 = false;
  const _errs1 = errors;
  if (typeof data !== "string") {
    const err0 = { instancePath, schemaPath: "#/definitions/SvglNodeIconKey/type", keyword: "type", params: { type: "string" }, message: "must be string" };
    if (vErrors === null) {
      vErrors = [err0];
    } else {
      vErrors.push(err0);
    }
    errors++;
  }
  if (!(data === "express" || data === "google-cloud" || data === "mcp" || data === "nextjs" || data === "openai" || data === "openrouter" || data === "pdf" || data === "postgresql")) {
    const err1 = { instancePath, schemaPath: "#/definitions/SvglNodeIconKey/enum", keyword: "enum", params: { allowedValues: schema94.enum }, message: "must be equal to one of the allowed values" };
    if (vErrors === null) {
      vErrors = [err1];
    } else {
      vErrors.push(err1);
    }
    errors++;
  }
  var _valid0 = _errs1 === errors;
  valid0 = valid0 || _valid0;
  if (!valid0) {
    const _errs4 = errors;
    if (typeof data !== "string") {
      const err2 = { instancePath, schemaPath: "#/anyOf/1/type", keyword: "type", params: { type: "string" }, message: "must be string" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if ("azure" !== data) {
      const err3 = { instancePath, schemaPath: "#/anyOf/1/const", keyword: "const", params: { allowedValue: "azure" }, message: "must be equal to constant" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    var _valid0 = _errs4 === errors;
    valid0 = valid0 || _valid0;
  }
  if (!valid0) {
    const err4 = { instancePath, schemaPath: "#/anyOf", keyword: "anyOf", params: {}, message: "must match a schema in anyOf" };
    if (vErrors === null) {
      vErrors = [err4];
    } else {
      vErrors.push(err4);
    }
    errors++;
  } else {
    errors = _errs0;
    if (vErrors !== null) {
      if (_errs0) {
        vErrors.length = _errs0;
      } else {
        vErrors = null;
      }
    }
  }
  validate77.errors = vErrors;
  return errors === 0;
}
function validate76(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  const _errs0 = errors;
  let valid0 = false;
  const _errs1 = errors;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.source === void 0) {
      const err0 = { instancePath, schemaPath: "#/anyOf/0/required", keyword: "required", params: { missingProperty: "source" }, message: "must have required property 'source'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.key === void 0) {
      const err1 = { instancePath, schemaPath: "#/anyOf/0/required", keyword: "required", params: { missingProperty: "key" }, message: "must have required property 'key'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "source" || key0 === "key")) {
        const err2 = { instancePath, schemaPath: "#/anyOf/0/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err2];
        } else {
          vErrors.push(err2);
        }
        errors++;
      }
    }
    if (data.source !== void 0) {
      let data0 = data.source;
      if (typeof data0 !== "string") {
        const err3 = { instancePath: instancePath + "/source", schemaPath: "#/anyOf/0/properties/source/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
      if ("thesvg" !== data0) {
        const err4 = { instancePath: instancePath + "/source", schemaPath: "#/anyOf/0/properties/source/const", keyword: "const", params: { allowedValue: "thesvg" }, message: "must be equal to constant" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.key !== void 0) {
      if (!validate77(data.key, { instancePath: instancePath + "/key", parentData: data, parentDataProperty: "key", rootData })) {
        vErrors = vErrors === null ? validate77.errors : vErrors.concat(validate77.errors);
        errors = vErrors.length;
      }
    }
  } else {
    const err5 = { instancePath, schemaPath: "#/anyOf/0/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err5];
    } else {
      vErrors.push(err5);
    }
    errors++;
  }
  var _valid0 = _errs1 === errors;
  valid0 = valid0 || _valid0;
  if (!valid0) {
    const _errs7 = errors;
    if (data && typeof data == "object" && !Array.isArray(data)) {
      if (data.source === void 0) {
        const err6 = { instancePath, schemaPath: "#/anyOf/1/required", keyword: "required", params: { missingProperty: "source" }, message: "must have required property 'source'" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
      if (data.key === void 0) {
        const err7 = { instancePath, schemaPath: "#/anyOf/1/required", keyword: "required", params: { missingProperty: "key" }, message: "must have required property 'key'" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
      for (const key1 in data) {
        if (!(key1 === "source" || key1 === "key")) {
          const err8 = { instancePath, schemaPath: "#/anyOf/1/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
          if (vErrors === null) {
            vErrors = [err8];
          } else {
            vErrors.push(err8);
          }
          errors++;
        }
      }
      if (data.source !== void 0) {
        let data2 = data.source;
        if (typeof data2 !== "string") {
          const err9 = { instancePath: instancePath + "/source", schemaPath: "#/anyOf/1/properties/source/type", keyword: "type", params: { type: "string" }, message: "must be string" };
          if (vErrors === null) {
            vErrors = [err9];
          } else {
            vErrors.push(err9);
          }
          errors++;
        }
        if ("svgl" !== data2) {
          const err10 = { instancePath: instancePath + "/source", schemaPath: "#/anyOf/1/properties/source/const", keyword: "const", params: { allowedValue: "svgl" }, message: "must be equal to constant" };
          if (vErrors === null) {
            vErrors = [err10];
          } else {
            vErrors.push(err10);
          }
          errors++;
        }
      }
      if (data.key !== void 0) {
        let data3 = data.key;
        if (typeof data3 !== "string") {
          const err11 = { instancePath: instancePath + "/key", schemaPath: "#/definitions/SvglNodeIconKey/type", keyword: "type", params: { type: "string" }, message: "must be string" };
          if (vErrors === null) {
            vErrors = [err11];
          } else {
            vErrors.push(err11);
          }
          errors++;
        }
        if (!(data3 === "express" || data3 === "google-cloud" || data3 === "mcp" || data3 === "nextjs" || data3 === "openai" || data3 === "openrouter" || data3 === "pdf" || data3 === "postgresql")) {
          const err12 = { instancePath: instancePath + "/key", schemaPath: "#/definitions/SvglNodeIconKey/enum", keyword: "enum", params: { allowedValues: schema94.enum }, message: "must be equal to one of the allowed values" };
          if (vErrors === null) {
            vErrors = [err12];
          } else {
            vErrors.push(err12);
          }
          errors++;
        }
      }
    } else {
      const err13 = { instancePath, schemaPath: "#/anyOf/1/type", keyword: "type", params: { type: "object" }, message: "must be object" };
      if (vErrors === null) {
        vErrors = [err13];
      } else {
        vErrors.push(err13);
      }
      errors++;
    }
    var _valid0 = _errs7 === errors;
    valid0 = valid0 || _valid0;
    if (!valid0) {
      const _errs15 = errors;
      if (data && typeof data == "object" && !Array.isArray(data)) {
        if (data.source === void 0) {
          const err14 = { instancePath, schemaPath: "#/anyOf/2/required", keyword: "required", params: { missingProperty: "source" }, message: "must have required property 'source'" };
          if (vErrors === null) {
            vErrors = [err14];
          } else {
            vErrors.push(err14);
          }
          errors++;
        }
        if (data.key === void 0) {
          const err15 = { instancePath, schemaPath: "#/anyOf/2/required", keyword: "required", params: { missingProperty: "key" }, message: "must have required property 'key'" };
          if (vErrors === null) {
            vErrors = [err15];
          } else {
            vErrors.push(err15);
          }
          errors++;
        }
        for (const key2 in data) {
          if (!(key2 === "source" || key2 === "key")) {
            const err16 = { instancePath, schemaPath: "#/anyOf/2/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key2 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err16];
            } else {
              vErrors.push(err16);
            }
            errors++;
          }
        }
        if (data.source !== void 0) {
          let data4 = data.source;
          if (typeof data4 !== "string") {
            const err17 = { instancePath: instancePath + "/source", schemaPath: "#/anyOf/2/properties/source/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err17];
            } else {
              vErrors.push(err17);
            }
            errors++;
          }
          if ("phosphor" !== data4) {
            const err18 = { instancePath: instancePath + "/source", schemaPath: "#/anyOf/2/properties/source/const", keyword: "const", params: { allowedValue: "phosphor" }, message: "must be equal to constant" };
            if (vErrors === null) {
              vErrors = [err18];
            } else {
              vErrors.push(err18);
            }
            errors++;
          }
        }
        if (data.key !== void 0) {
          let data5 = data.key;
          if (typeof data5 !== "string") {
            const err19 = { instancePath: instancePath + "/key", schemaPath: "#/definitions/SemanticNodeIconKey/type", keyword: "type", params: { type: "string" }, message: "must be string" };
            if (vErrors === null) {
              vErrors = [err19];
            } else {
              vErrors.push(err19);
            }
            errors++;
          }
          if (!(data5 === "arrows-split" || data5 === "brackets-curly" || data5 === "folder-lock" || data5 === "gauge" || data5 === "graph" || data5 === "handshake" || data5 === "list-checks" || data5 === "list-magnifying-glass" || data5 === "monitor" || data5 === "receipt" || data5 === "rocket-launch" || data5 === "scales" || data5 === "seal-check" || data5 === "user-check" || data5 === "user-focus" || data5 === "warning")) {
            const err20 = { instancePath: instancePath + "/key", schemaPath: "#/definitions/SemanticNodeIconKey/enum", keyword: "enum", params: { allowedValues: schema96.enum }, message: "must be equal to one of the allowed values" };
            if (vErrors === null) {
              vErrors = [err20];
            } else {
              vErrors.push(err20);
            }
            errors++;
          }
        }
      } else {
        const err21 = { instancePath, schemaPath: "#/anyOf/2/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err21];
        } else {
          vErrors.push(err21);
        }
        errors++;
      }
      var _valid0 = _errs15 === errors;
      valid0 = valid0 || _valid0;
    }
  }
  if (!valid0) {
    const err22 = { instancePath, schemaPath: "#/anyOf", keyword: "anyOf", params: {}, message: "must match a schema in anyOf" };
    if (vErrors === null) {
      vErrors = [err22];
    } else {
      vErrors.push(err22);
    }
    errors++;
  } else {
    errors = _errs0;
    if (vErrors !== null) {
      if (_errs0) {
        vErrors.length = _errs0;
      } else {
        vErrors = null;
      }
    }
  }
  validate76.errors = vErrors;
  return errors === 0;
}
function validate72(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.nodes === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "nodes" }, message: "must have required property 'nodes'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.edges === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "edges" }, message: "must have required property 'edges'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.visuals === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "visuals" }, message: "must have required property 'visuals'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "nodes" || key0 === "edges" || key0 === "visuals" || key0 === "engineeringProfile")) {
        const err3 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.nodes !== void 0) {
      let data0 = data.nodes;
      if (data0 && typeof data0 == "object" && !Array.isArray(data0)) {
        for (const key1 in data0) {
          if (!validate73(data0[key1], { instancePath: instancePath + "/nodes/" + key1.replace(/~/g, "~0").replace(/\//g, "~1"), parentData: data0, parentDataProperty: key1, rootData })) {
            vErrors = vErrors === null ? validate73.errors : vErrors.concat(validate73.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err4 = { instancePath: instancePath + "/nodes", schemaPath: "#/properties/nodes/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.edges !== void 0) {
      let data2 = data.edges;
      if (data2 && typeof data2 == "object" && !Array.isArray(data2)) {
        for (const key2 in data2) {
          if (!validate73(data2[key2], { instancePath: instancePath + "/edges/" + key2.replace(/~/g, "~0").replace(/\//g, "~1"), parentData: data2, parentDataProperty: key2, rootData })) {
            vErrors = vErrors === null ? validate73.errors : vErrors.concat(validate73.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err5 = { instancePath: instancePath + "/edges", schemaPath: "#/properties/edges/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.visuals !== void 0) {
      let data4 = data.visuals;
      if (data4 && typeof data4 == "object" && !Array.isArray(data4)) {
        for (const key3 in data4) {
          if (!validate76(data4[key3], { instancePath: instancePath + "/visuals/" + key3.replace(/~/g, "~0").replace(/\//g, "~1"), parentData: data4, parentDataProperty: key3, rootData })) {
            vErrors = vErrors === null ? validate76.errors : vErrors.concat(validate76.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err6 = { instancePath: instancePath + "/visuals", schemaPath: "#/properties/visuals/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.engineeringProfile !== void 0) {
      let data6 = data.engineeringProfile;
      if (typeof data6 !== "string") {
        const err7 = { instancePath: instancePath + "/engineeringProfile", schemaPath: "#/properties/engineeringProfile/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
      if ("deployment-ownership" !== data6) {
        const err8 = { instancePath: instancePath + "/engineeringProfile", schemaPath: "#/properties/engineeringProfile/const", keyword: "const", params: { allowedValue: "deployment-ownership" }, message: "must be equal to constant" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
    }
  } else {
    const err9 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err9];
    } else {
      vErrors.push(err9);
    }
    errors++;
  }
  validate72.errors = vErrors;
  return errors === 0;
}
function validate81(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.id === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "id" }, message: "must have required property 'id'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.label === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "label" }, message: "must have required property 'label'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.focus === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "focus" }, message: "must have required property 'focus'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "id" || key0 === "label" || key0 === "note" || key0 === "focus" || key0 === "camera")) {
        const err3 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err3];
        } else {
          vErrors.push(err3);
        }
        errors++;
      }
    }
    if (data.id !== void 0) {
      if (typeof data.id !== "string") {
        const err4 = { instancePath: instancePath + "/id", schemaPath: "#/properties/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err4];
        } else {
          vErrors.push(err4);
        }
        errors++;
      }
    }
    if (data.label !== void 0) {
      if (typeof data.label !== "string") {
        const err5 = { instancePath: instancePath + "/label", schemaPath: "#/properties/label/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.note !== void 0) {
      if (typeof data.note !== "string") {
        const err6 = { instancePath: instancePath + "/note", schemaPath: "#/properties/note/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
    }
    if (data.focus !== void 0) {
      let data3 = data.focus;
      if (data3 && typeof data3 == "object" && !Array.isArray(data3)) {
        if (data3.nodeIds === void 0) {
          const err7 = { instancePath: instancePath + "/focus", schemaPath: "#/definitions/FocusSet/required", keyword: "required", params: { missingProperty: "nodeIds" }, message: "must have required property 'nodeIds'" };
          if (vErrors === null) {
            vErrors = [err7];
          } else {
            vErrors.push(err7);
          }
          errors++;
        }
        if (data3.edgeIds === void 0) {
          const err8 = { instancePath: instancePath + "/focus", schemaPath: "#/definitions/FocusSet/required", keyword: "required", params: { missingProperty: "edgeIds" }, message: "must have required property 'edgeIds'" };
          if (vErrors === null) {
            vErrors = [err8];
          } else {
            vErrors.push(err8);
          }
          errors++;
        }
        for (const key1 in data3) {
          if (!(key1 === "nodeIds" || key1 === "edgeIds")) {
            const err9 = { instancePath: instancePath + "/focus", schemaPath: "#/definitions/FocusSet/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err9];
            } else {
              vErrors.push(err9);
            }
            errors++;
          }
        }
        if (data3.nodeIds !== void 0) {
          let data4 = data3.nodeIds;
          if (Array.isArray(data4)) {
            const len0 = data4.length;
            for (let i0 = 0; i0 < len0; i0++) {
              if (typeof data4[i0] !== "string") {
                const err10 = { instancePath: instancePath + "/focus/nodeIds/" + i0, schemaPath: "#/definitions/FocusSet/properties/nodeIds/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err10];
                } else {
                  vErrors.push(err10);
                }
                errors++;
              }
            }
          } else {
            const err11 = { instancePath: instancePath + "/focus/nodeIds", schemaPath: "#/definitions/FocusSet/properties/nodeIds/type", keyword: "type", params: { type: "array" }, message: "must be array" };
            if (vErrors === null) {
              vErrors = [err11];
            } else {
              vErrors.push(err11);
            }
            errors++;
          }
        }
        if (data3.edgeIds !== void 0) {
          let data6 = data3.edgeIds;
          if (Array.isArray(data6)) {
            const len1 = data6.length;
            for (let i1 = 0; i1 < len1; i1++) {
              if (typeof data6[i1] !== "string") {
                const err12 = { instancePath: instancePath + "/focus/edgeIds/" + i1, schemaPath: "#/definitions/FocusSet/properties/edgeIds/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err12];
                } else {
                  vErrors.push(err12);
                }
                errors++;
              }
            }
          } else {
            const err13 = { instancePath: instancePath + "/focus/edgeIds", schemaPath: "#/definitions/FocusSet/properties/edgeIds/type", keyword: "type", params: { type: "array" }, message: "must be array" };
            if (vErrors === null) {
              vErrors = [err13];
            } else {
              vErrors.push(err13);
            }
            errors++;
          }
        }
      } else {
        const err14 = { instancePath: instancePath + "/focus", schemaPath: "#/definitions/FocusSet/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err14];
        } else {
          vErrors.push(err14);
        }
        errors++;
      }
    }
    if (data.camera !== void 0) {
      let data8 = data.camera;
      if (data8 && typeof data8 == "object" && !Array.isArray(data8)) {
        if (data8.x === void 0) {
          const err15 = { instancePath: instancePath + "/camera", schemaPath: "#/definitions/Viewport/required", keyword: "required", params: { missingProperty: "x" }, message: "must have required property 'x'" };
          if (vErrors === null) {
            vErrors = [err15];
          } else {
            vErrors.push(err15);
          }
          errors++;
        }
        if (data8.y === void 0) {
          const err16 = { instancePath: instancePath + "/camera", schemaPath: "#/definitions/Viewport/required", keyword: "required", params: { missingProperty: "y" }, message: "must have required property 'y'" };
          if (vErrors === null) {
            vErrors = [err16];
          } else {
            vErrors.push(err16);
          }
          errors++;
        }
        if (data8.zoom === void 0) {
          const err17 = { instancePath: instancePath + "/camera", schemaPath: "#/definitions/Viewport/required", keyword: "required", params: { missingProperty: "zoom" }, message: "must have required property 'zoom'" };
          if (vErrors === null) {
            vErrors = [err17];
          } else {
            vErrors.push(err17);
          }
          errors++;
        }
        for (const key2 in data8) {
          if (!(key2 === "x" || key2 === "y" || key2 === "zoom")) {
            const err18 = { instancePath: instancePath + "/camera", schemaPath: "#/definitions/Viewport/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key2 }, message: "must NOT have additional properties" };
            if (vErrors === null) {
              vErrors = [err18];
            } else {
              vErrors.push(err18);
            }
            errors++;
          }
        }
        if (data8.x !== void 0) {
          if (!(typeof data8.x == "number")) {
            const err19 = { instancePath: instancePath + "/camera/x", schemaPath: "#/definitions/Viewport/properties/x/type", keyword: "type", params: { type: "number" }, message: "must be number" };
            if (vErrors === null) {
              vErrors = [err19];
            } else {
              vErrors.push(err19);
            }
            errors++;
          }
        }
        if (data8.y !== void 0) {
          if (!(typeof data8.y == "number")) {
            const err20 = { instancePath: instancePath + "/camera/y", schemaPath: "#/definitions/Viewport/properties/y/type", keyword: "type", params: { type: "number" }, message: "must be number" };
            if (vErrors === null) {
              vErrors = [err20];
            } else {
              vErrors.push(err20);
            }
            errors++;
          }
        }
        if (data8.zoom !== void 0) {
          if (!(typeof data8.zoom == "number")) {
            const err21 = { instancePath: instancePath + "/camera/zoom", schemaPath: "#/definitions/Viewport/properties/zoom/type", keyword: "type", params: { type: "number" }, message: "must be number" };
            if (vErrors === null) {
              vErrors = [err21];
            } else {
              vErrors.push(err21);
            }
            errors++;
          }
        }
      } else {
        const err22 = { instancePath: instancePath + "/camera", schemaPath: "#/definitions/Viewport/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err22];
        } else {
          vErrors.push(err22);
        }
        errors++;
      }
    }
  } else {
    const err23 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err23];
    } else {
      vErrors.push(err23);
    }
    errors++;
  }
  validate81.errors = vErrors;
  return errors === 0;
}
function validate12(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.format === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "format" }, message: "must have required property 'format'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.schemaVersion === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "schemaVersion" }, message: "must have required property 'schemaVersion'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.id === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "id" }, message: "must have required property 'id'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data.revision === void 0) {
      const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "revision" }, message: "must have required property 'revision'" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    if (data.locale === void 0) {
      const err4 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "locale" }, message: "must have required property 'locale'" };
      if (vErrors === null) {
        vErrors = [err4];
      } else {
        vErrors.push(err4);
      }
      errors++;
    }
    if (data.spec === void 0) {
      const err5 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "spec" }, message: "must have required property 'spec'" };
      if (vErrors === null) {
        vErrors = [err5];
      } else {
        vErrors.push(err5);
      }
      errors++;
    }
    if (data.scene === void 0) {
      const err6 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "scene" }, message: "must have required property 'scene'" };
      if (vErrors === null) {
        vErrors = [err6];
      } else {
        vErrors.push(err6);
      }
      errors++;
    }
    if (data.presentation === void 0) {
      const err7 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "presentation" }, message: "must have required property 'presentation'" };
      if (vErrors === null) {
        vErrors = [err7];
      } else {
        vErrors.push(err7);
      }
      errors++;
    }
    if (data.metadata === void 0) {
      const err8 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "metadata" }, message: "must have required property 'metadata'" };
      if (vErrors === null) {
        vErrors = [err8];
      } else {
        vErrors.push(err8);
      }
      errors++;
    }
    if (data.views === void 0) {
      const err9 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "views" }, message: "must have required property 'views'" };
      if (vErrors === null) {
        vErrors = [err9];
      } else {
        vErrors.push(err9);
      }
      errors++;
    }
    if (data.story === void 0) {
      const err10 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "story" }, message: "must have required property 'story'" };
      if (vErrors === null) {
        vErrors = [err10];
      } else {
        vErrors.push(err10);
      }
      errors++;
    }
    if (data.extensions === void 0) {
      const err11 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "extensions" }, message: "must have required property 'extensions'" };
      if (vErrors === null) {
        vErrors = [err11];
      } else {
        vErrors.push(err11);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!func2.call(schema13.properties, key0)) {
        const err12 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err12];
        } else {
          vErrors.push(err12);
        }
        errors++;
      }
    }
    if (data.format !== void 0) {
      let data0 = data.format;
      if (typeof data0 !== "string") {
        const err13 = { instancePath: instancePath + "/format", schemaPath: "#/properties/format/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err13];
        } else {
          vErrors.push(err13);
        }
        errors++;
      }
      if ("aesthc-diagram" !== data0) {
        const err14 = { instancePath: instancePath + "/format", schemaPath: "#/properties/format/const", keyword: "const", params: { allowedValue: "aesthc-diagram" }, message: "must be equal to constant" };
        if (vErrors === null) {
          vErrors = [err14];
        } else {
          vErrors.push(err14);
        }
        errors++;
      }
    }
    if (data.schemaVersion !== void 0) {
      let data1 = data.schemaVersion;
      if (!(typeof data1 == "number")) {
        const err15 = { instancePath: instancePath + "/schemaVersion", schemaPath: "#/properties/schemaVersion/type", keyword: "type", params: { type: "number" }, message: "must be number" };
        if (vErrors === null) {
          vErrors = [err15];
        } else {
          vErrors.push(err15);
        }
        errors++;
      }
      if (1 !== data1) {
        const err16 = { instancePath: instancePath + "/schemaVersion", schemaPath: "#/properties/schemaVersion/const", keyword: "const", params: { allowedValue: 1 }, message: "must be equal to constant" };
        if (vErrors === null) {
          vErrors = [err16];
        } else {
          vErrors.push(err16);
        }
        errors++;
      }
    }
    if (data.id !== void 0) {
      if (typeof data.id !== "string") {
        const err17 = { instancePath: instancePath + "/id", schemaPath: "#/properties/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err17];
        } else {
          vErrors.push(err17);
        }
        errors++;
      }
    }
    if (data.revision !== void 0) {
      if (!(typeof data.revision == "number")) {
        const err18 = { instancePath: instancePath + "/revision", schemaPath: "#/properties/revision/type", keyword: "type", params: { type: "number" }, message: "must be number" };
        if (vErrors === null) {
          vErrors = [err18];
        } else {
          vErrors.push(err18);
        }
        errors++;
      }
    }
    if (data.locale !== void 0) {
      let data4 = data.locale;
      if (typeof data4 !== "string") {
        const err19 = { instancePath: instancePath + "/locale", schemaPath: "#/definitions/Locale/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err19];
        } else {
          vErrors.push(err19);
        }
        errors++;
      }
      if (!(data4 === "en" || data4 === "es")) {
        const err20 = { instancePath: instancePath + "/locale", schemaPath: "#/definitions/Locale/enum", keyword: "enum", params: { allowedValues: schema14.enum }, message: "must be equal to one of the allowed values" };
        if (vErrors === null) {
          vErrors = [err20];
        } else {
          vErrors.push(err20);
        }
        errors++;
      }
    }
    if (data.spec !== void 0) {
      if (!validate13(data.spec, { instancePath: instancePath + "/spec", parentData: data, parentDataProperty: "spec", rootData })) {
        vErrors = vErrors === null ? validate13.errors : vErrors.concat(validate13.errors);
        errors = vErrors.length;
      }
    }
    if (data.scene !== void 0) {
      if (!validate63(data.scene, { instancePath: instancePath + "/scene", parentData: data, parentDataProperty: "scene", rootData })) {
        vErrors = vErrors === null ? validate63.errors : vErrors.concat(validate63.errors);
        errors = vErrors.length;
      }
    }
    if (data.presentation !== void 0) {
      if (!validate70(data.presentation, { instancePath: instancePath + "/presentation", parentData: data, parentDataProperty: "presentation", rootData })) {
        vErrors = vErrors === null ? validate70.errors : vErrors.concat(validate70.errors);
        errors = vErrors.length;
      }
    }
    if (data.metadata !== void 0) {
      if (!validate72(data.metadata, { instancePath: instancePath + "/metadata", parentData: data, parentDataProperty: "metadata", rootData })) {
        vErrors = vErrors === null ? validate72.errors : vErrors.concat(validate72.errors);
        errors = vErrors.length;
      }
    }
    if (data.views !== void 0) {
      let data9 = data.views;
      if (Array.isArray(data9)) {
        const len0 = data9.length;
        for (let i0 = 0; i0 < len0; i0++) {
          if (!validate81(data9[i0], { instancePath: instancePath + "/views/" + i0, parentData: data9, parentDataProperty: i0, rootData })) {
            vErrors = vErrors === null ? validate81.errors : vErrors.concat(validate81.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err21 = { instancePath: instancePath + "/views", schemaPath: "#/properties/views/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err21];
        } else {
          vErrors.push(err21);
        }
        errors++;
      }
    }
    if (data.story !== void 0) {
      let data11 = data.story;
      if (Array.isArray(data11)) {
        const len1 = data11.length;
        for (let i1 = 0; i1 < len1; i1++) {
          let data12 = data11[i1];
          if (data12 && typeof data12 == "object" && !Array.isArray(data12)) {
            if (data12.id === void 0) {
              const err22 = { instancePath: instancePath + "/story/" + i1, schemaPath: "#/definitions/StoryStep/required", keyword: "required", params: { missingProperty: "id" }, message: "must have required property 'id'" };
              if (vErrors === null) {
                vErrors = [err22];
              } else {
                vErrors.push(err22);
              }
              errors++;
            }
            if (data12.viewId === void 0) {
              const err23 = { instancePath: instancePath + "/story/" + i1, schemaPath: "#/definitions/StoryStep/required", keyword: "required", params: { missingProperty: "viewId" }, message: "must have required property 'viewId'" };
              if (vErrors === null) {
                vErrors = [err23];
              } else {
                vErrors.push(err23);
              }
              errors++;
            }
            if (data12.durationMs === void 0) {
              const err24 = { instancePath: instancePath + "/story/" + i1, schemaPath: "#/definitions/StoryStep/required", keyword: "required", params: { missingProperty: "durationMs" }, message: "must have required property 'durationMs'" };
              if (vErrors === null) {
                vErrors = [err24];
              } else {
                vErrors.push(err24);
              }
              errors++;
            }
            for (const key1 in data12) {
              if (!(key1 === "id" || key1 === "viewId" || key1 === "durationMs" || key1 === "routeEdgeIds")) {
                const err25 = { instancePath: instancePath + "/story/" + i1, schemaPath: "#/definitions/StoryStep/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err25];
                } else {
                  vErrors.push(err25);
                }
                errors++;
              }
            }
            if (data12.id !== void 0) {
              if (typeof data12.id !== "string") {
                const err26 = { instancePath: instancePath + "/story/" + i1 + "/id", schemaPath: "#/definitions/StoryStep/properties/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err26];
                } else {
                  vErrors.push(err26);
                }
                errors++;
              }
            }
            if (data12.viewId !== void 0) {
              if (typeof data12.viewId !== "string") {
                const err27 = { instancePath: instancePath + "/story/" + i1 + "/viewId", schemaPath: "#/definitions/StoryStep/properties/viewId/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err27];
                } else {
                  vErrors.push(err27);
                }
                errors++;
              }
            }
            if (data12.durationMs !== void 0) {
              if (!(typeof data12.durationMs == "number")) {
                const err28 = { instancePath: instancePath + "/story/" + i1 + "/durationMs", schemaPath: "#/definitions/StoryStep/properties/durationMs/type", keyword: "type", params: { type: "number" }, message: "must be number" };
                if (vErrors === null) {
                  vErrors = [err28];
                } else {
                  vErrors.push(err28);
                }
                errors++;
              }
            }
            if (data12.routeEdgeIds !== void 0) {
              let data16 = data12.routeEdgeIds;
              if (Array.isArray(data16)) {
                const len2 = data16.length;
                for (let i2 = 0; i2 < len2; i2++) {
                  if (typeof data16[i2] !== "string") {
                    const err29 = { instancePath: instancePath + "/story/" + i1 + "/routeEdgeIds/" + i2, schemaPath: "#/definitions/StoryStep/properties/routeEdgeIds/items/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                    if (vErrors === null) {
                      vErrors = [err29];
                    } else {
                      vErrors.push(err29);
                    }
                    errors++;
                  }
                }
              } else {
                const err30 = { instancePath: instancePath + "/story/" + i1 + "/routeEdgeIds", schemaPath: "#/definitions/StoryStep/properties/routeEdgeIds/type", keyword: "type", params: { type: "array" }, message: "must be array" };
                if (vErrors === null) {
                  vErrors = [err30];
                } else {
                  vErrors.push(err30);
                }
                errors++;
              }
            }
          } else {
            const err31 = { instancePath: instancePath + "/story/" + i1, schemaPath: "#/definitions/StoryStep/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err31];
            } else {
              vErrors.push(err31);
            }
            errors++;
          }
        }
      } else {
        const err32 = { instancePath: instancePath + "/story", schemaPath: "#/properties/story/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err32];
        } else {
          vErrors.push(err32);
        }
        errors++;
      }
    }
    if (data.extensions !== void 0) {
      let data18 = data.extensions;
      if (data18 && typeof data18 == "object" && !Array.isArray(data18)) {
        for (const key2 in data18) {
          if (!validate56(data18[key2], { instancePath: instancePath + "/extensions/" + key2.replace(/~/g, "~0").replace(/\//g, "~1"), parentData: data18, parentDataProperty: key2, rootData })) {
            vErrors = vErrors === null ? validate56.errors : vErrors.concat(validate56.errors);
            errors = vErrors.length;
          }
        }
      } else {
        const err33 = { instancePath: instancePath + "/extensions", schemaPath: "#/properties/extensions/type", keyword: "type", params: { type: "object" }, message: "must be object" };
        if (vErrors === null) {
          vErrors = [err33];
        } else {
          vErrors.push(err33);
        }
        errors++;
      }
    }
  } else {
    const err34 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err34];
    } else {
      vErrors.push(err34);
    }
    errors++;
  }
  validate12.errors = vErrors;
  return errors === 0;
}
function validate11(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (data && typeof data == "object" && !Array.isArray(data)) {
    if (data.format === void 0) {
      const err0 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "format" }, message: "must have required property 'format'" };
      if (vErrors === null) {
        vErrors = [err0];
      } else {
        vErrors.push(err0);
      }
      errors++;
    }
    if (data.schemaVersion === void 0) {
      const err1 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "schemaVersion" }, message: "must have required property 'schemaVersion'" };
      if (vErrors === null) {
        vErrors = [err1];
      } else {
        vErrors.push(err1);
      }
      errors++;
    }
    if (data.sourceDocumentId === void 0) {
      const err2 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "sourceDocumentId" }, message: "must have required property 'sourceDocumentId'" };
      if (vErrors === null) {
        vErrors = [err2];
      } else {
        vErrors.push(err2);
      }
      errors++;
    }
    if (data.document === void 0) {
      const err3 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "document" }, message: "must have required property 'document'" };
      if (vErrors === null) {
        vErrors = [err3];
      } else {
        vErrors.push(err3);
      }
      errors++;
    }
    if (data.selection === void 0) {
      const err4 = { instancePath, schemaPath: "#/required", keyword: "required", params: { missingProperty: "selection" }, message: "must have required property 'selection'" };
      if (vErrors === null) {
        vErrors = [err4];
      } else {
        vErrors.push(err4);
      }
      errors++;
    }
    for (const key0 in data) {
      if (!(key0 === "format" || key0 === "schemaVersion" || key0 === "sourceDocumentId" || key0 === "document" || key0 === "selection")) {
        const err5 = { instancePath, schemaPath: "#/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key0 }, message: "must NOT have additional properties" };
        if (vErrors === null) {
          vErrors = [err5];
        } else {
          vErrors.push(err5);
        }
        errors++;
      }
    }
    if (data.format !== void 0) {
      let data0 = data.format;
      if (typeof data0 !== "string") {
        const err6 = { instancePath: instancePath + "/format", schemaPath: "#/properties/format/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err6];
        } else {
          vErrors.push(err6);
        }
        errors++;
      }
      if ("aesthc-diagram-fragment" !== data0) {
        const err7 = { instancePath: instancePath + "/format", schemaPath: "#/properties/format/const", keyword: "const", params: { allowedValue: "aesthc-diagram-fragment" }, message: "must be equal to constant" };
        if (vErrors === null) {
          vErrors = [err7];
        } else {
          vErrors.push(err7);
        }
        errors++;
      }
    }
    if (data.schemaVersion !== void 0) {
      let data1 = data.schemaVersion;
      if (!(typeof data1 == "number")) {
        const err8 = { instancePath: instancePath + "/schemaVersion", schemaPath: "#/properties/schemaVersion/type", keyword: "type", params: { type: "number" }, message: "must be number" };
        if (vErrors === null) {
          vErrors = [err8];
        } else {
          vErrors.push(err8);
        }
        errors++;
      }
      if (1 !== data1) {
        const err9 = { instancePath: instancePath + "/schemaVersion", schemaPath: "#/properties/schemaVersion/const", keyword: "const", params: { allowedValue: 1 }, message: "must be equal to constant" };
        if (vErrors === null) {
          vErrors = [err9];
        } else {
          vErrors.push(err9);
        }
        errors++;
      }
    }
    if (data.sourceDocumentId !== void 0) {
      if (typeof data.sourceDocumentId !== "string") {
        const err10 = { instancePath: instancePath + "/sourceDocumentId", schemaPath: "#/properties/sourceDocumentId/type", keyword: "type", params: { type: "string" }, message: "must be string" };
        if (vErrors === null) {
          vErrors = [err10];
        } else {
          vErrors.push(err10);
        }
        errors++;
      }
    }
    if (data.document !== void 0) {
      if (!validate12(data.document, { instancePath: instancePath + "/document", parentData: data, parentDataProperty: "document", rootData })) {
        vErrors = vErrors === null ? validate12.errors : vErrors.concat(validate12.errors);
        errors = vErrors.length;
      }
    }
    if (data.selection !== void 0) {
      let data4 = data.selection;
      if (Array.isArray(data4)) {
        const len0 = data4.length;
        for (let i0 = 0; i0 < len0; i0++) {
          let data5 = data4[i0];
          if (data5 && typeof data5 == "object" && !Array.isArray(data5)) {
            if (data5.kind === void 0) {
              const err11 = { instancePath: instancePath + "/selection/" + i0, schemaPath: "#/definitions/EntityRef/required", keyword: "required", params: { missingProperty: "kind" }, message: "must have required property 'kind'" };
              if (vErrors === null) {
                vErrors = [err11];
              } else {
                vErrors.push(err11);
              }
              errors++;
            }
            if (data5.id === void 0) {
              const err12 = { instancePath: instancePath + "/selection/" + i0, schemaPath: "#/definitions/EntityRef/required", keyword: "required", params: { missingProperty: "id" }, message: "must have required property 'id'" };
              if (vErrors === null) {
                vErrors = [err12];
              } else {
                vErrors.push(err12);
              }
              errors++;
            }
            for (const key1 in data5) {
              if (!(key1 === "kind" || key1 === "id")) {
                const err13 = { instancePath: instancePath + "/selection/" + i0, schemaPath: "#/definitions/EntityRef/additionalProperties", keyword: "additionalProperties", params: { additionalProperty: key1 }, message: "must NOT have additional properties" };
                if (vErrors === null) {
                  vErrors = [err13];
                } else {
                  vErrors.push(err13);
                }
                errors++;
              }
            }
            if (data5.kind !== void 0) {
              let data6 = data5.kind;
              if (typeof data6 !== "string") {
                const err14 = { instancePath: instancePath + "/selection/" + i0 + "/kind", schemaPath: "#/definitions/EntityRef/properties/kind/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err14];
                } else {
                  vErrors.push(err14);
                }
                errors++;
              }
              if (!(data6 === "node" || data6 === "edge" || data6 === "group")) {
                const err15 = { instancePath: instancePath + "/selection/" + i0 + "/kind", schemaPath: "#/definitions/EntityRef/properties/kind/enum", keyword: "enum", params: { allowedValues: schema101.properties.kind.enum }, message: "must be equal to one of the allowed values" };
                if (vErrors === null) {
                  vErrors = [err15];
                } else {
                  vErrors.push(err15);
                }
                errors++;
              }
            }
            if (data5.id !== void 0) {
              if (typeof data5.id !== "string") {
                const err16 = { instancePath: instancePath + "/selection/" + i0 + "/id", schemaPath: "#/definitions/EntityRef/properties/id/type", keyword: "type", params: { type: "string" }, message: "must be string" };
                if (vErrors === null) {
                  vErrors = [err16];
                } else {
                  vErrors.push(err16);
                }
                errors++;
              }
            }
          } else {
            const err17 = { instancePath: instancePath + "/selection/" + i0, schemaPath: "#/definitions/EntityRef/type", keyword: "type", params: { type: "object" }, message: "must be object" };
            if (vErrors === null) {
              vErrors = [err17];
            } else {
              vErrors.push(err17);
            }
            errors++;
          }
        }
      } else {
        const err18 = { instancePath: instancePath + "/selection", schemaPath: "#/properties/selection/type", keyword: "type", params: { type: "array" }, message: "must be array" };
        if (vErrors === null) {
          vErrors = [err18];
        } else {
          vErrors.push(err18);
        }
        errors++;
      }
    }
  } else {
    const err19 = { instancePath, schemaPath: "#/type", keyword: "type", params: { type: "object" }, message: "must be object" };
    if (vErrors === null) {
      vErrors = [err19];
    } else {
      vErrors.push(err19);
    }
    errors++;
  }
  validate11.errors = vErrors;
  return errors === 0;
}
function validate10(data, { instancePath = "", parentData, parentDataProperty, rootData = data } = {}) {
  let vErrors = null;
  let errors = 0;
  if (!validate11(data, { instancePath, parentData, parentDataProperty, rootData })) {
    vErrors = vErrors === null ? validate11.errors : vErrors.concat(validate11.errors);
    errors = vErrors.length;
  }
  validate10.errors = vErrors;
  return errors === 0;
}

// src/editor-core/clipboard.ts
function createFragment(document, selection) {
  const checked = validateDocument(document);
  if (!checked.ok) return checked;
  const doc = structuredClone(document), ids = new Set(selection.filter((r) => r.kind === "node").map((r) => r.id));
  const groups = /* @__PURE__ */ new Set();
  for (const ref of selection) {
    if (ref.kind === "edge") {
      const e = edgesOf(doc.spec).find((e2) => e2.id === ref.id);
      if (!e) return failure("reference.missing");
      ids.add(e.from);
      ids.add(e.to);
    }
    if (ref.kind === "group") {
      if (!doc.scene.groups.some((g) => g.id === ref.id)) return failure("reference.missing");
      const queue = [ref.id];
      for (let i = 0; i < queue.length; i++) {
        groups.add(queue[i]);
        doc.scene.groups.find((g) => g.id === queue[i])?.nodeIds.forEach((id) => ids.add(id));
        doc.scene.groups.filter((g) => g.parentGroup === queue[i]).forEach((g) => queue.push(g.id));
      }
    }
  }
  if (!ids.size) return failure("clipboard.empty");
  if ([...ids].some((id) => !nodesOf(doc.spec).some((n) => n.id === id)))
    return failure("reference.missing");
  const removed = getAdapter(doc.spec.type).removeNodes(
    doc.spec,
    nodesOf(doc.spec).filter((n) => !ids.has(n.id)).map((n) => n.id)
  );
  if (!removed.ok) return removed;
  doc.spec = removed.value;
  pruneReferences(doc);
  doc.scene.groups = doc.scene.groups.filter((g) => groups.has(g.id));
  doc.scene.groups.forEach((g) => {
    if (g.parentGroup && !groups.has(g.parentGroup)) delete g.parentGroup;
  });
  doc.views = [];
  doc.story = [];
  doc.extensions = {};
  return success({
    format: "aesthc-diagram-fragment",
    schemaVersion: 1,
    sourceDocumentId: document.id,
    document: doc,
    selection: [...ids].map((id) => ({ kind: "node", id }))
  });
}
function pasteFragment(document, input, options) {
  const checked = validateDocument(document);
  if (!checked.ok) return checked;
  const unsafe = inspectData(input, limitsWith());
  if (unsafe.length) return { ok: false, diagnostics: unsafe };
  if (!fragment_structural_default(input)) return failure("clipboard.invalid");
  const fragment = input, validated = validateDocument(fragment.document);
  if (!validated.ok) return validated;
  if (document.spec.type !== fragment.document.spec.type) return failure("clipboard.type");
  if (!Number.isFinite(options.offset.x) || !Number.isFinite(options.offset.y))
    return failure("layout.range");
  const free = freeTypes.has(document.spec.type);
  const doc = structuredClone(document), adapter = getAdapter(doc.spec.type), source = fragment.document;
  const scene = free ? resolveDocument(source, { quality: "edit", requestId: "paste" }) : null;
  if (free && !scene.ok) return scene;
  const nodeIds = /* @__PURE__ */ new Map(), groupIds = /* @__PURE__ */ new Map();
  const used = /* @__PURE__ */ new Set([
    ...nodesOf(doc.spec).map((n) => n.id),
    ...edgesOf(doc.spec).map((e) => e.id),
    ...doc.scene.groups.map((g) => g.id)
  ]);
  function allocate(kind) {
    for (let attempt = 0; attempt < 32; attempt++) {
      const id = options.idFactory(kind);
      if (!validId(id) || used.has(id)) continue;
      used.add(id);
      return id;
    }
  }
  const targetBands = doc.spec.type === "band" ? doc.spec.bands.length : 0;
  const sourceLanes = source.spec.type === "swimlane" ? source.spec.lanes : [];
  const targetLanes = doc.spec.type === "swimlane" ? doc.spec.lanes : [];
  const laneMatch = (sourceLaneId, sourceLabel) => {
    if (options.structured?.lane) return options.structured.lane(sourceLaneId, sourceLabel);
    if (!targetLanes.length) return void 0;
    const byLabel = targetLanes.find((lane) => lane.label === sourceLabel);
    if (byLabel) return byLabel.id;
    const sourceIndex = sourceLanes.findIndex((lane) => lane.id === sourceLaneId);
    if (sourceIndex >= 0 && sourceIndex < targetLanes.length) return targetLanes[sourceIndex].id;
    return void 0;
  };
  for (const node of nodesOf(source.spec)) {
    const id = allocate("node");
    if (!id) return failure("id.collision");
    nodeIds.set(node.id, id);
    const copy = structuredClone(node);
    copy.id = id;
    if (doc.spec.type === "band") {
      const band = node;
      copy.band = options.structured?.band?.(band.band) ?? Math.min(band.band, Math.max(0, targetBands - 1));
    }
    if (doc.spec.type === "swimlane") {
      const laneId = node.lane;
      const sourceLane = sourceLanes.find((lane) => lane.id === laneId);
      const mapped = laneMatch(laneId, sourceLane?.label ?? "");
      if (!mapped) return failure("lane.missing");
      copy.lane = mapped;
    }
    const inserted = adapter.insertNode(doc.spec, {
      diagramType: doc.spec.type,
      node: copy
    });
    if (!inserted.ok) return inserted;
    doc.spec = inserted.value;
    if (free) {
      const placement = scene.value.layout.nodeById[node.id];
      doc.scene.nodes[id] = {
        x: placement.x + options.offset.x,
        y: placement.y + options.offset.y,
        width: placement.w,
        height: placement.h,
        locked: false
      };
    }
    doc.scene.zOrder.push(id);
    if (source.metadata.nodes[node.id])
      doc.metadata.nodes[id] = structuredClone(source.metadata.nodes[node.id]);
    if (source.metadata.visuals[node.id])
      doc.metadata.visuals[id] = structuredClone(source.metadata.visuals[node.id]);
  }
  for (const edge of edgesOf(source.spec)) {
    const id = allocate("edge");
    if (!id) return failure("id.collision");
    const inserted = adapter.insertRelation(doc.spec, {
      diagramType: doc.spec.type,
      relation: {
        ...structuredClone(edge),
        id,
        from: nodeIds.get(edge.from),
        to: nodeIds.get(edge.to)
      }
    });
    if (!inserted.ok) return inserted;
    doc.spec = inserted.value;
    if (source.metadata.edges[edge.id])
      doc.metadata.edges[id] = structuredClone(source.metadata.edges[edge.id]);
    const route = source.scene.routes[edge.id];
    if (route && free) {
      const copy = structuredClone(route);
      if (copy.mode === "manual") {
        copy.points = copy.points.map((p) => ({
          x: p.x + options.offset.x,
          y: p.y + options.offset.y
        }));
        if (copy.label) {
          copy.label.x += options.offset.x;
          copy.label.y += options.offset.y;
        }
      }
      doc.scene.routes[id] = copy;
    }
  }
  for (const group of source.scene.groups) {
    const id = allocate("group");
    if (!id) return failure("id.collision");
    groupIds.set(group.id, id);
  }
  if (free)
    for (const group of source.scene.groups)
      doc.scene.groups.push({
        ...structuredClone(group),
        id: groupIds.get(group.id),
        nodeIds: group.nodeIds.map((id) => nodeIds.get(id)),
        ...group.parentGroup ? { parentGroup: groupIds.get(group.parentGroup) } : {},
        locked: false
      });
  if (free) doc.scene.mode = "hybrid";
  return validateDocument(doc);
}

export {
  createEditorStore,
  screenToWorld,
  worldToScreen,
  zoomAt,
  fitViewport,
  createFragment,
  pasteFragment
};
