import {
  layoutByType,
  layoutFlowchart
} from "./chunk-VUW7SRON.js";
import {
  createDocument
} from "./chunk-3MHLUDWC.js";
import {
  identifyEdges,
  labelPillWidth,
  roundedPolyline
} from "./chunk-QVERY2JP.js";
import {
  DEFAULT_LIMITS,
  edgeCollection,
  edgesOf,
  failure,
  freeTypes,
  freezeData,
  inspectData,
  issue,
  nodeCollection,
  nodesOf,
  success,
  validateDocument,
  validateEditorSpec
} from "./chunk-6NELNSRC.js";
import {
  nodeGeometry
} from "./chunk-YKPE23VO.js";

// src/editor-core/adapters.ts
var capabilities = {
  graph: ["move-free", "resize", "connect", "ports", "waypoints", "groups"],
  flowchart: ["move-free", "resize", "connect", "waypoints", "groups"],
  "state-machine": ["move-free", "resize", "connect", "waypoints", "groups"],
  er: ["move-free", "resize", "connect", "waypoints", "groups", "edit-fields"],
  sequence: ["connect", "reorder-participants", "reorder-messages"],
  timeline: ["reorder-events"],
  band: ["connect", "reassign-band"],
  swimlane: ["connect", "reassign-lane", "reorder-lanes"]
};
function remove(spec, ids) {
  const removed = new Set(ids);
  Object.assign(spec, { [nodeCollection(spec)]: nodesOf(spec).filter((n) => !removed.has(n.id)) });
  if (spec.type !== "timeline")
    Object.assign(spec, {
      [edgeCollection(spec)]: edgesOf(spec).filter(
        (e) => !removed.has(e.from) && !removed.has(e.to)
      )
    });
  if (spec.type === "band") {
    if (spec.decisions) spec.decisions = spec.decisions.filter((d) => !removed.has(d.source));
    if (spec.continuations)
      spec.continuations = spec.continuations.filter((c) => !removed.has(c.from));
  }
  return spec;
}
function getAdapter(type) {
  if (!capabilities[type]) throw new TypeError("Unknown diagram type");
  const guard = (spec) => spec.type === type;
  const edit = (spec, action) => {
    if (!guard(spec)) return failure("adapter.type");
    const checked = validateEditorSpec(spec);
    if (!checked.ok) return checked;
    const draft = structuredClone(spec);
    action(draft);
    return validateEditorSpec(draft);
  };
  return freezeData({
    type,
    capabilities: [...capabilities[type]],
    nodeIds: (spec) => nodesOf(spec).map((n) => n.id),
    edges: (spec) => identifyEdges(edgesOf(spec)),
    insertNode(spec, input, index) {
      if (input.diagramType !== type) return failure("adapter.type");
      if (index !== void 0 && (!Number.isInteger(index) || index < 0 || index > nodesOf(spec).length))
        return failure("index.invalid");
      return edit(spec, (draft) => {
        nodesOf(draft).splice(index ?? nodesOf(draft).length, 0, structuredClone(input.node));
      });
    },
    replaceNode(spec, input) {
      if (input.diagramType !== type) return failure("adapter.type");
      const index = nodesOf(spec).findIndex((n) => n.id === input.node.id);
      if (index < 0) return failure("reference.missing");
      return edit(spec, (draft) => {
        nodesOf(draft)[index] = structuredClone(input.node);
      });
    },
    removeNodes(spec, ids) {
      if (ids.some((id) => !nodesOf(spec).some((n) => n.id === id)))
        return failure("reference.missing");
      return edit(spec, (draft) => {
        remove(draft, ids);
      });
    },
    insertRelation(spec, input, index) {
      if (type === "timeline" || input.diagramType !== type) return failure("adapter.type");
      if (index !== void 0 && (!Number.isInteger(index) || index < 0 || index > edgesOf(spec).length))
        return failure("index.invalid");
      return edit(spec, (draft) => {
        edgesOf(draft).splice(index ?? edgesOf(draft).length, 0, structuredClone(input.relation));
      });
    },
    replaceRelation(spec, input) {
      if (type === "timeline" || input.diagramType !== type) return failure("adapter.type");
      const index = edgesOf(spec).findIndex((e) => e.id === input.relation.id);
      if (index < 0) return failure("reference.missing");
      return edit(spec, (draft) => {
        edgesOf(draft)[index] = structuredClone(input.relation);
      });
    },
    removeRelations(spec, ids) {
      if (type === "timeline") return failure("capability.unsupported");
      if (ids.some((id) => !edgesOf(spec).some((e) => e.id === id)))
        return failure("reference.missing");
      return edit(spec, (draft) => {
        Object.assign(draft, {
          [edgeCollection(draft)]: edgesOf(draft).filter((e) => !ids.includes(e.id))
        });
      });
    },
    reorder(spec, collection, ids) {
      if (![
        nodeCollection(spec),
        edgeCollection(spec),
        ...type === "swimlane" ? ["lanes"] : []
      ].includes(collection))
        return failure("capability.unsupported");
      const values = spec[collection];
      if (!Array.isArray(values) || ids.length !== values.length || new Set(ids).size !== ids.length || ids.some((id) => !values.some((v) => v.id === id)))
        return failure("reorder.permutation");
      return edit(spec, (draft) => {
        Object.assign(draft, {
          [collection]: ids.map((id) => structuredClone(values.find((v) => v.id === id)))
        });
      });
    },
    seedLayout(spec) {
      const checked = validateEditorSpec(spec);
      if (!checked.ok) return checked;
      if (!guard(spec)) return failure("adapter.type");
      return success(
        spec.type === "graph" ? layoutFlowchart({
          type: "flowchart",
          caption: spec.caption,
          legend: spec.legend,
          nodes: spec.nodes,
          edges: spec.edges
        }) : layoutByType(spec)
      );
    },
    editStructure(spec, operation) {
      if (!guard(spec)) return failure("adapter.type");
      if (operation.type === "bands.replace" && type === "band" || operation.type === "lanes.replace" && type === "swimlane") {
        const checked = validateEditorSpec(spec);
        if (!checked.ok) return checked;
        const diagnostics = inspectData(operation, DEFAULT_LIMITS);
        if (diagnostics.length) return { ok: false, diagnostics };
        const known = new Set(nodesOf(spec).map((node) => node.id));
        const assigned = new Set(Object.keys(operation.assignments));
        const removed = new Set(operation.removeNodeIds);
        if (removed.size !== operation.removeNodeIds.length)
          return failure("structure.mapping.duplicate", "/removeNodeIds");
        if ([...assigned, ...removed].some((id) => !known.has(id)))
          return failure("reference.missing", "/assignments");
        if ([...assigned].some((id) => removed.has(id)))
          return failure("structure.mapping.overlap", "/assignments");
        if ([...known].some((id) => !assigned.has(id) && !removed.has(id)))
          return failure("structure.mapping.incomplete", "/assignments");
      }
      if (operation.type === "bands.replace" && type === "band")
        return edit(spec, (draft) => {
          if (draft.type !== "band") return;
          remove(draft, operation.removeNodeIds);
          draft.bands = structuredClone(operation.bands);
          draft.nodes.forEach((n) => {
            if (n.id in operation.assignments) n.band = operation.assignments[n.id];
          });
        });
      if (operation.type === "lanes.replace" && type === "swimlane")
        return edit(spec, (draft) => {
          if (draft.type !== "swimlane") return;
          remove(draft, operation.removeNodeIds);
          draft.lanes = structuredClone(operation.lanes);
          draft.nodes.forEach((n) => {
            if (n.id in operation.assignments) n.lane = operation.assignments[n.id];
          });
        });
      if (operation.type === "band-annotations.replace" && type === "band")
        return edit(spec, (draft) => {
          if (draft.type === "band") {
            draft.decisions = structuredClone(operation.decisions);
            draft.continuations = structuredClone(operation.continuations);
          }
        });
      return failure("capability.unsupported");
    }
  });
}

// src/editor-core/commands.ts
function isNodeLocked(doc, id) {
  if (doc.scene.nodes[id]?.locked) return true;
  const groups = new Map(doc.scene.groups.map((g) => [g.id, g]));
  let group = doc.scene.groups.find((g) => g.nodeIds.includes(id));
  while (group) {
    if (group.locked) return true;
    group = group.parentGroup ? groups.get(group.parentGroup) : void 0;
  }
  return false;
}
function pruneReferences(doc) {
  const nodes = new Set(nodesOf(doc.spec).map((n) => n.id)), edges = new Set(edgesOf(doc.spec).map((e) => e.id));
  for (const key of Object.keys(doc.scene.nodes)) if (!nodes.has(key)) delete doc.scene.nodes[key];
  for (const key of Object.keys(doc.scene.routes)) if (!edges.has(key)) delete doc.scene.routes[key];
  for (const collection of [doc.metadata.nodes, doc.metadata.visuals])
    for (const key of Object.keys(collection)) if (!nodes.has(key)) delete collection[key];
  for (const key of Object.keys(doc.metadata.edges))
    if (!edges.has(key)) delete doc.metadata.edges[key];
  doc.scene.zOrder = [
    ...doc.scene.zOrder.filter((id) => nodes.has(id)),
    ...[...nodes].filter((id) => !doc.scene.zOrder.includes(id))
  ];
  doc.scene.groups.forEach((g) => {
    g.nodeIds = g.nodeIds.filter((id) => nodes.has(id));
  });
  doc.views.forEach((v) => {
    v.focus.nodeIds = v.focus.nodeIds.filter((id) => nodes.has(id));
    v.focus.edgeIds = v.focus.edgeIds.filter((id) => edges.has(id));
  });
  doc.views = doc.views.filter((v) => v.focus.nodeIds.length || v.focus.edgeIds.length);
  doc.story = doc.story.filter(
    (s) => doc.views.some((v) => v.id === s.viewId) && (s.routeEdgeIds ?? []).every((id) => edges.has(id))
  );
}
function applyCommand(doc, command) {
  switch (command.type) {
    case "document.replace-content": {
      const result = validateDocument(command.document);
      return result.ok ? success({ ...structuredClone(result.value), id: doc.id, revision: doc.revision }) : result;
    }
    case "spec.replace": {
      const result = createDocument(command.spec, { id: doc.id, locale: doc.locale });
      if (!result.ok) return result;
      const next = nodesOf(result.value.spec), previous = nodesOf(doc.spec);
      for (const id of /* @__PURE__ */ new Set([...next.map((n) => n.id), ...previous.map((n) => n.id)])) {
        if (!isNodeLocked(doc, id)) continue;
        const before = previous.find((n) => n.id === id), after = next.find((n) => n.id === id);
        if (!after) return failure("entity.locked", `/spec/${id}`, "locked node cannot be removed");
        if (before && after && JSON.stringify(before) !== JSON.stringify(after))
          return failure("entity.locked", `/spec/${id}`);
      }
      doc.spec = result.value.spec;
      if (command.references === "prune-references") pruneReferences(doc);
      else {
        const ids = nodesOf(doc.spec).map((n) => n.id);
        doc.scene.zOrder = [
          ...doc.scene.zOrder,
          ...ids.filter((id) => !doc.scene.zOrder.includes(id))
        ];
      }
      break;
    }
    case "nodes.move":
      if (!freeTypes.has(doc.spec.type)) return failure("capability.unsupported");
      for (const [id, point] of Object.entries(command.positions)) {
        const placement = doc.scene.nodes[id];
        if (!placement) return failure("placement.missing");
        if (isNodeLocked(doc, id)) return failure("entity.locked");
        Object.assign(placement, point);
      }
      break;
    case "nodes.set-lock":
      for (const id of command.ids) {
        if (!doc.scene.nodes[id]) return failure("placement.missing");
        doc.scene.nodes[id].locked = command.locked;
      }
      break;
    case "node.resize":
      if (!freeTypes.has(doc.spec.type)) return failure("capability.unsupported");
      if (!doc.scene.nodes[command.id]) return failure("placement.missing");
      if (isNodeLocked(doc, command.id)) return failure("entity.locked");
      Object.assign(doc.scene.nodes[command.id], command.size);
      break;
    case "route.set":
      if (!freeTypes.has(doc.spec.type)) return failure("capability.unsupported");
      if (!edgesOf(doc.spec).some((e) => e.id === command.id)) return failure("reference.missing");
      doc.scene.routes[command.id] = structuredClone(command.route);
      break;
    case "group.upsert": {
      const index = doc.scene.groups.findIndex((g) => g.id === command.group.id);
      if (index < 0) doc.scene.groups.push(structuredClone(command.group));
      else doc.scene.groups[index] = structuredClone(command.group);
      break;
    }
    case "group.remove": {
      const group = doc.scene.groups.find((g) => g.id === command.id);
      if (!group) return failure("reference.missing");
      if (command.members === "delete") {
        const groupIds = /* @__PURE__ */ new Set([group.id]), queue = [group.id], nodeIds = new Set(group.nodeIds);
        for (let i = 0; i < queue.length; i++) {
          for (const child of doc.scene.groups.filter((g) => g.parentGroup === queue[i])) {
            if (child.locked) return failure("entity.locked");
            groupIds.add(child.id);
            queue.push(child.id);
            child.nodeIds.forEach((id) => nodeIds.add(id));
          }
        }
        if (group.locked || [...nodeIds].some((id) => isNodeLocked(doc, id)))
          return failure("entity.locked");
        const removed = getAdapter(doc.spec.type).removeNodes(doc.spec, [...nodeIds]);
        if (!removed.ok) return removed;
        doc.spec = removed.value;
        doc.scene.groups = doc.scene.groups.filter((g) => !groupIds.has(g.id));
        pruneReferences(doc);
        break;
      }
      const keptMembers = new Set(group.nodeIds);
      for (const child of doc.scene.groups.filter((g) => g.parentGroup === command.id))
        child.nodeIds.forEach((id) => keptMembers.add(id));
      if (group.locked || [...keptMembers].some((id) => isNodeLocked(doc, id)))
        return failure("entity.locked");
      doc.scene.groups = doc.scene.groups.filter((g) => g.id !== command.id);
      doc.scene.groups.forEach((g) => {
        if (g.parentGroup === command.id) {
          if (group.parentGroup) g.parentGroup = group.parentGroup;
          else delete g.parentGroup;
        }
      });
      break;
    }
    case "presentation.set":
      doc.presentation = structuredClone(command.presentation);
      break;
    case "metadata.set":
      doc.metadata = structuredClone(command.metadata);
      break;
    case "views.set":
      doc.views = structuredClone(command.views);
      doc.story = structuredClone(command.story);
      break;
    case "scene.set":
      doc.scene = structuredClone(command.scene);
      break;
  }
  return success(doc);
}

// src/geometry/text.ts
var estimateTextWidth = (text, role) => {
  const length = Array.from(text).length;
  if (!length) return 0;
  return length * role.size * role.charFactor + (length - 1) * (role.tracking ?? 0);
};
function createCanvasTextMeasurer() {
  if (typeof document === "undefined" || typeof document.createElement !== "function")
    return void 0;
  const context = document.createElement("canvas").getContext("2d");
  if (!context) return void 0;
  const cache = /* @__PURE__ */ new Map();
  const CACHE_LIMIT = 2e4;
  return (text, role) => {
    const length = Array.from(text).length;
    if (!length) return 0;
    const key = `${role.size}|${role.family}|${role.tracking ?? 0}|${text}`;
    const cached = cache.get(key);
    if (cached !== void 0) return cached;
    context.font = `${role.size}px ${role.family === "Geist Mono" ? '"Geist Mono", monospace' : "Geist, sans-serif"}`;
    const width = context.measureText(text).width + (length - 1) * (role.tracking ?? 0);
    if (cache.size >= CACHE_LIMIT) cache.clear();
    cache.set(key, width);
    return width;
  };
}
function toDataUrl(bytes) {
  let raw = "";
  for (const byte of bytes) raw += String.fromCharCode(byte);
  return `data:font/woff2;base64,${btoa(raw)}`;
}
function createEmbeddedFontTextMeasurer(sans, mono) {
  if (typeof document === "undefined" || typeof document.createElement !== "function")
    return void 0;
  const nonce = Math.random().toString(36).slice(2, 10);
  const sansFamily = `adl-export-${nonce}-sans`, monoFamily = `adl-export-${nonce}-mono`;
  const style = document.createElement("style");
  style.textContent = `@font-face{font-family:"${sansFamily}";src:url(${toDataUrl(sans)}) format("woff2")}@font-face{font-family:"${monoFamily}";src:url(${toDataUrl(mono)}) format("woff2")}`;
  document.head.appendChild(style);
  const context = document.createElement("canvas").getContext("2d");
  let disposed = false;
  return {
    measure: context === null ? estimateTextWidth : (text, role) => {
      if (disposed) return estimateTextWidth(text, role);
      const length = Array.from(text).length;
      if (!length) return 0;
      context.font = `${role.size}px ${role.family === "Geist Mono" ? `"${monoFamily}"` : `"${sansFamily}"`}`;
      return context.measureText(text).width + (length - 1) * (role.tracking ?? 0);
    },
    async ready() {
      if (disposed || typeof document === "undefined" || !document.fonts) return false;
      const loaded = (family) => document.fonts.load(`16px "${family}"`).then(
        () => true,
        () => false
      );
      const [sansOk, monoOk] = await Promise.all([loaded(sansFamily), loaded(monoFamily)]);
      return sansOk && monoOk;
    },
    dispose() {
      disposed = true;
      style.remove();
    }
  };
}

// src/editor-core/scene.ts
function anchor(node, port) {
  return {
    x: port.side === "left" ? node.x : port.side === "right" ? node.x + node.w : node.x + node.w * port.offset,
    y: port.side === "top" ? node.y : port.side === "bottom" ? node.y + node.h : node.y + node.h * port.offset
  };
}
function anchorPoint(rect, port) {
  return {
    x: port.side === "left" ? rect.x : port.side === "right" ? rect.x + rect.width : rect.x + rect.width * port.offset,
    y: port.side === "top" ? rect.y : port.side === "bottom" ? rect.y + rect.height : rect.y + rect.height * port.offset
  };
}
function anchorFromPoint(point, rect) {
  const clamp = (value) => Math.max(0, Math.min(1, value));
  const candidates = [
    {
      side: "top",
      offset: clamp((point.x - rect.x) / rect.width),
      distance: Math.abs(point.y - rect.y)
    },
    {
      side: "bottom",
      offset: clamp((point.x - rect.x) / rect.width),
      distance: Math.abs(point.y - (rect.y + rect.height))
    },
    {
      side: "left",
      offset: clamp((point.y - rect.y) / rect.height),
      distance: Math.abs(point.x - rect.x)
    },
    {
      side: "right",
      offset: clamp((point.y - rect.y) / rect.height),
      distance: Math.abs(point.x - (rect.x + rect.width))
    }
  ];
  candidates.sort((a, b) => a.distance - b.distance);
  return { side: candidates[0].side, offset: candidates[0].offset };
}
function nodeTextExtent(n, document2, context) {
  const measure = (value, role) => (context.measureText ?? estimateTextWidth)(value, role);
  const labelRole = { size: 14.5, family: "Geist", charFactor: 13 / 14.5 };
  const kindRole = {
    size: 11.25,
    family: "Geist Mono",
    charFactor: 10 / 11.25,
    tracking: 1.6
  };
  const sublabelRole = { size: 11.25, family: "Geist Mono", charFactor: 11 / 11.25 };
  const fieldRole = { size: 11, family: "Geist Mono", charFactor: 1 };
  const fieldAnnotationRole = { size: 10, family: "Geist Mono", charFactor: 1 };
  const textWidth = Math.max(
    measure(n.label, labelRole),
    measure((n.kind ?? "").toUpperCase(), kindRole),
    measure(n.sublabel ?? "", sublabelRole),
    ...(n.fields ?? []).map((f) => {
      const annotation = [f.type, f.key === "unique" ? "unique" : null].filter(Boolean).join(" \xB7 ");
      return measure(f.name, fieldRole) + (annotation ? measure(` ${annotation}`, fieldAnnotationRole) : 0);
    })
  ) * document2.presentation.textScale;
  const geometry = nodeGeometry(n, !!document2.metadata.visuals[n.id]);
  const textLeft = n.shape === "table" ? n.x + 14 : geometry.centeredLabel ? n.cx - textWidth / 2 : geometry.textX;
  return { width: textWidth, left: textLeft, right: textLeft + textWidth };
}
function pushTextOverflow(layout, document2, context, diagnostics) {
  for (const n of layout.nodes) {
    const extent = nodeTextExtent(n, document2, context);
    if (extent.left < n.x + 14 || extent.right > n.x + n.w - 14)
      diagnostics.push({
        ...issue("quality.text-overflow", "/spec"),
        severity: "warning",
        subject: { kind: "node", id: n.id },
        supportedFixes: ["resize", "shorten-text-manually"]
      });
  }
}
var seedLayouts = /* @__PURE__ */ new WeakMap();
function createPreviewResolver() {
  let previous;
  return (document2, context) => {
    const immutable = Object.isFrozen(document2) && Object.isFrozen(document2.scene);
    const reusable = immutable && previous && context.skipDiagnostics && previous.context.skipDiagnostics && document2.spec === previous.document.spec && document2.presentation === previous.document.presentation && document2.metadata === previous.document.metadata && context.measureText === previous.context.measureText && context.quality === previous.context.quality ? previous : void 0;
    const extents = reusable?.extents ?? /* @__PURE__ */ new WeakMap();
    const result = resolveScene(document2, context, reusable, extents);
    previous = immutable && result.ok ? { document: document2, context, scene: result.value, extents } : void 0;
    return result;
  };
}
function resolveDocument(document2, context) {
  return resolveScene(document2, context);
}
function resolveScene(document2, context, previous, extents) {
  if (context.signal?.aborted) return failure("operation.aborted");
  const checked = context.skipValidation ? success(document2) : validateDocument(document2);
  if (!checked.ok) return checked;
  let template = Object.isFrozen(document2.spec) ? seedLayouts.get(document2.spec) : void 0;
  if (!template) {
    const seed = getAdapter(document2.spec.type).seedLayout(document2.spec);
    if (!seed.ok) return seed;
    template = seed.value;
    if (Object.isFrozen(document2.spec)) seedLayouts.set(document2.spec, template);
  }
  const layout = {
    ...template,
    nodes: template.nodes.map(
      (node) => previous && previous.document.scene.nodes[node.id] === document2.scene.nodes[node.id] ? previous.scene.layout.nodeById[node.id] : { ...node }
    )
  }, diagnostics = [];
  if (!freeTypes.has(document2.spec.type)) {
    if (!context.skipDiagnostics) pushTextOverflow(layout, document2, context, diagnostics);
    return success(
      {
        layout,
        worldBounds: { x: 0, y: 0, width: layout.width, height: layout.height },
        origin: { x: 0, y: 0 },
        diagnostics
      },
      diagnostics
    );
  }
  for (const node of layout.nodes) {
    const placement = document2.scene.nodes[node.id];
    if (placement && node !== previous?.scene.layout.nodeById[node.id])
      Object.assign(node, {
        x: placement.x,
        y: placement.y,
        w: placement.width,
        h: placement.height,
        cx: placement.x + placement.width / 2,
        cy: placement.y + placement.height / 2
      });
  }
  const zOrder = new Map(document2.scene.zOrder.map((id, index) => [id, index]));
  layout.nodes.sort((a, b) => (zOrder.get(a.id) ?? -1) - (zOrder.get(b.id) ?? -1));
  layout.nodeById = Object.fromEntries(layout.nodes.map((n) => [n.id, n]));
  const graphNodes = document2.spec.type === "graph" ? new Map(document2.spec.nodes.map((node) => [node.id, node])) : void 0;
  const graphEdges = document2.spec.type === "graph" ? new Map(document2.spec.edges.map((edge) => [edge.id, edge])) : void 0;
  const previousEdges = new Map(previous?.scene.layout.edges.map((edge) => [edge.id, edge]));
  const parallel = /* @__PURE__ */ new Map();
  layout.edges = edgesOf(document2.spec).map((edge) => {
    const from = layout.nodeById[edge.from], to = layout.nodeById[edge.to], route = document2.scene.routes[edge.id];
    const key = JSON.stringify([edge.from, edge.to]), ordinal = parallel.get(key) ?? 0;
    parallel.set(key, ordinal + 1);
    if (previous && from === previous.scene.layout.nodeById[edge.from] && to === previous.scene.layout.nodeById[edge.to] && route === previous.document.scene.routes[edge.id]) {
      const cached = previousEdges.get(edge.id);
      if (cached) return cached;
    }
    const horizontal = Math.abs(to.cx - from.cx) >= Math.abs(to.cy - from.cy);
    let source = {
      side: horizontal ? to.cx >= from.cx ? "right" : "left" : to.cy >= from.cy ? "bottom" : "top",
      offset: 0.5
    };
    let target = {
      side: horizontal ? to.cx >= from.cx ? "left" : "right" : to.cy >= from.cy ? "top" : "bottom",
      offset: 0.5
    };
    if (route?.mode === "manual") {
      source = route.source;
      target = route.target;
    } else if (document2.spec.type === "graph") {
      const authored = graphEdges.get(edge.id);
      const sp = graphNodes.get(edge.from)?.ports?.find((p) => p.id === authored.sourcePort);
      const tp = graphNodes.get(edge.to)?.ports?.find((p) => p.id === authored.targetPort);
      if (sp) source = sp;
      if (tp) target = tp;
    }
    if (edge.from === edge.to && route?.mode !== "manual") {
      source = { side: "right", offset: 0.3 };
      target = { side: "right", offset: 0.7 };
    }
    const start = anchor(from, source), end = anchor(to, target);
    const offset = ordinal * 20;
    let points2;
    if (route?.mode === "manual")
      points2 = [
        [start.x, start.y],
        ...route.points.map((p) => [p.x, p.y]),
        [end.x, end.y]
      ];
    else if (edge.from === edge.to)
      points2 = [
        [start.x, start.y],
        [start.x + 48 + offset, start.y],
        [end.x + 48 + offset, end.y],
        [end.x, end.y]
      ];
    else if (document2.presentation.edgeStyle === "straight" && !ordinal)
      points2 = [
        [start.x, start.y],
        [end.x, end.y]
      ];
    else if (source.side === "left" || source.side === "right") {
      const mid = (start.x + end.x) / 2 + offset;
      points2 = [
        [start.x, start.y],
        [mid, start.y],
        [mid, end.y],
        [end.x, end.y]
      ];
    } else {
      const mid = (start.y + end.y) / 2 + offset;
      points2 = [
        [start.x, start.y],
        [start.x, mid],
        [end.x, mid],
        [end.x, end.y]
      ];
    }
    const midIndex = Math.floor((points2.length - 1) / 2);
    const middle = [
      (points2[midIndex][0] + points2[midIndex + 1][0]) / 2,
      (points2[midIndex][1] + points2[midIndex + 1][1]) / 2
    ];
    return {
      ...edge,
      id: edge.id,
      variant: edge.variant ?? "main",
      d: roundedPolyline(points2, 6),
      routePoints: points2,
      labelX: route?.mode === "manual" && route.label ? route.label.x : middle[0],
      labelY: route?.mode === "manual" && route.label ? route.label.y : middle[1] - 12,
      labelWidth: labelPillWidth(edge.label ?? ""),
      startX: start.x,
      startY: start.y,
      endX: end.x,
      endY: end.y,
      fromSide: source.side,
      toSide: target.side,
      arrowEnd: true
    };
  });
  const descendantNodes = (id) => {
    const ids = /* @__PURE__ */ new Set(), pending = [id];
    for (let i = 0; i < pending.length; i++) {
      const g = document2.scene.groups.find((g2) => g2.id === pending[i]);
      g?.nodeIds.forEach((n) => ids.add(n));
      document2.scene.groups.filter((g2) => g2.parentGroup === pending[i]).forEach((g2) => pending.push(g2.id));
    }
    return [...ids].map((id2) => layout.nodeById[id2]);
  };
  layout.containers = document2.scene.groups.flatMap((g) => {
    const nodes = descendantNodes(g.id);
    if (!nodes.length) return [];
    const x2 = Math.min(...nodes.map((n) => n.x)) - 16, y2 = Math.min(...nodes.map((n) => n.y)) - 36;
    return [
      {
        id: g.id,
        label: g.label,
        kind: g.kind,
        x: x2,
        y: y2,
        w: Math.max(...nodes.map((n) => n.x + n.w)) - x2 + 16,
        h: Math.max(...nodes.map((n) => n.y + n.h)) - y2 + 16
      }
    ];
  });
  const points = [];
  for (const n of layout.nodes) {
    points.push([n.x, n.y], [n.x + n.w, n.y + n.h]);
    const extent = extents?.get(n) ?? nodeTextExtent(n, document2, context);
    extents?.set(n, extent);
    if (extent.left < n.x + 14 || extent.right > n.x + n.w - 14) {
      points.push([extent.left, n.y], [extent.right, n.y + n.h]);
      if (!context.skipDiagnostics)
        diagnostics.push({
          ...issue("quality.text-overflow", "/spec"),
          severity: "warning",
          subject: { kind: "node", id: n.id },
          supportedFixes: ["resize", "shorten-text-manually"]
        });
    }
  }
  for (const e of layout.edges) {
    points.push(...e.routePoints ?? [], [e.startX - 8, e.startY - 8], [e.endX + 8, e.endY + 8]);
    if (e.label || document2.scene.routes[e.id]?.mode === "manual")
      points.push(
        [e.labelX - e.labelWidth / 2, e.labelY - 12],
        [e.labelX + e.labelWidth / 2, e.labelY + 12]
      );
  }
  for (const c of layout.containers) points.push([c.x, c.y], [c.x + c.w, c.y + c.h]);
  if (!points.length) points.push([0, 0], [160, 96]);
  const padding = document2.presentation.padding + 8;
  const x = points.reduce((bound, p) => Math.min(bound, p[0]), Infinity) - padding, y = points.reduce((bound, p) => Math.min(bound, p[1]), Infinity) - padding;
  const width = points.reduce((bound, p) => Math.max(bound, p[0]), -Infinity) - x + padding, height = points.reduce((bound, p) => Math.max(bound, p[1]), -Infinity) - y + padding;
  layout.width = width;
  layout.height = height;
  if (!context.skipDiagnostics) {
    for (let i = 0; i < layout.nodes.length; i++) {
      const a = layout.nodes[i];
      for (let j = i + 1; j < layout.nodes.length; j++) {
        const b = layout.nodes[j];
        if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y)
          diagnostics.push({
            ...issue("quality.node-overlap", "/scene/nodes"),
            severity: "warning",
            subject: { kind: "node", id: a.id },
            supportedFixes: ["move"]
          });
      }
    }
    const rects = new Map(
      layout.nodes.map((n) => [n.id, { x: n.x, y: n.y, width: n.w, height: n.h }])
    );
    const overlaps = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
    const cross = (ax, ay, bx, by, cx, cy) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    const segmentIntersects = (x1, y1, x2, y2, r) => {
      const inside = x1 >= r.x && x1 <= r.x + r.width && y1 >= r.y && y1 <= r.y + r.height;
      if (inside) return true;
      const corners = [
        [r.x, r.y],
        [r.x + r.width, r.y],
        [r.x + r.width, r.y + r.height],
        [r.x, r.y + r.height]
      ];
      for (let i = 0; i < 4; i++) {
        const [x3, y3] = corners[i], [x4, y4] = corners[(i + 1) % 4];
        const d1 = cross(x3, y3, x4, y4, x1, y1), d2 = cross(x3, y3, x4, y4, x2, y2), d3 = cross(x1, y1, x2, y2, x3, y3), d4 = cross(x1, y1, x2, y2, x4, y4);
        if ((d1 > 0 && d2 < 0 || d1 < 0 && d2 > 0) && (d3 > 0 && d4 < 0 || d3 < 0 && d4 > 0))
          return true;
      }
      return false;
    };
    for (const e of layout.edges) {
      const from = rects.get(e.from), to = rects.get(e.to);
      const points2 = e.routePoints ?? [];
      for (let i = 1; i < points2.length && from && to; i++) {
        const [x1, y1] = points2[i - 1], [x2, y2] = points2[i];
        for (const [id, rect] of rects) {
          if (id === e.from || id === e.to) continue;
          if (segmentIntersects(x1, y1, x2, y2, rect)) {
            diagnostics.push({
              ...issue("quality.edge-through-node", "/scene/routes"),
              severity: "warning",
              subject: { kind: "edge", id: e.id },
              supportedFixes: ["move", "set-waypoints"]
            });
            break;
          }
        }
      }
      if (from && to) {
        const eps = 2;
        const touches = (p, r) => p.x >= r.x - eps && p.x <= r.x + r.width + eps && p.y >= r.y - eps && p.y <= r.y + r.height + eps && (Math.abs(p.x - r.x) <= eps || Math.abs(p.x - (r.x + r.width)) <= eps || Math.abs(p.y - r.y) <= eps || Math.abs(p.y - (r.y + r.height)) <= eps);
        if (!touches({ x: e.startX, y: e.startY }, from) || !touches({ x: e.endX, y: e.endY }, to))
          diagnostics.push({
            ...issue("quality.edge-endpoint", "/scene/routes"),
            severity: "warning",
            subject: { kind: "edge", id: e.id },
            supportedFixes: ["set-waypoints"]
          });
      }
    }
    const extents2 = new Map(
      layout.nodes.map((n) => [n.id, nodeTextExtent(n, document2, context)])
    );
    for (const [id, extent] of extents2) {
      const a = rects.get(id);
      if (!a) continue;
      const labelRect = {
        x: extent.left,
        y: a.y,
        width: extent.right - extent.left,
        height: a.height
      };
      for (const [other, b] of rects) {
        if (other === id || !a) continue;
        if (overlaps(labelRect, b)) {
          diagnostics.push({
            ...issue("quality.label-collision", "/spec"),
            severity: "warning",
            subject: { kind: "node", id },
            supportedFixes: ["resize", "move"]
          });
          break;
        }
      }
    }
  }
  if (context.signal?.aborted) return failure("operation.aborted");
  return success(
    { layout, worldBounds: { x, y, width, height }, origin: { x: -x, y: -y }, diagnostics },
    diagnostics
  );
}
function relayoutScene(document2) {
  const checked = validateDocument(document2);
  if (!checked.ok) return checked;
  const scene = checked.value.scene;
  if (!freeTypes.has(checked.value.spec.type)) return success(structuredClone(scene));
  const seed = getAdapter(checked.value.spec.type).seedLayout(checked.value.spec);
  if (!seed.ok) return seed;
  const nodes = {};
  for (const node of seed.value.nodes) {
    const placement = scene.nodes[node.id];
    nodes[node.id] = isNodeLocked(checked.value, node.id) ? placement ? { ...placement } : { x: node.x, y: node.y, width: node.w, height: node.h, locked: false } : { x: node.x, y: node.y, width: node.w, height: node.h, locked: placement?.locked ?? false };
  }
  return success({
    mode: "manual",
    nodes,
    routes: structuredClone(scene.routes),
    groups: structuredClone(scene.groups),
    zOrder: [...scene.zOrder]
  });
}

export {
  getAdapter,
  isNodeLocked,
  pruneReferences,
  applyCommand,
  estimateTextWidth,
  createCanvasTextMeasurer,
  createEmbeddedFontTextMeasurer,
  anchorPoint,
  anchorFromPoint,
  createPreviewResolver,
  resolveDocument,
  relayoutScene
};
