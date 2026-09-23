import {
  layoutByType,
  layoutFlowchart
} from "./chunk-VUW7SRON.js";
import {
  createDocument
} from "./chunk-35B4QVKF.js";
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
} from "./chunk-4NII3VRT.js";
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
  return (text, role) => {
    const length = Array.from(text).length;
    if (!length) return 0;
    context.font = `${role.size}px ${role.family === "Geist Mono" ? '"Geist Mono", monospace' : "Geist, sans-serif"}`;
    return context.measureText(text).width + (length - 1) * (role.tracking ?? 0);
  };
}

// src/editor-core/scene.ts
function anchor(node, port) {
  return {
    x: port.side === "left" ? node.x : port.side === "right" ? node.x + node.w : node.x + node.w * port.offset,
    y: port.side === "top" ? node.y : port.side === "bottom" ? node.y + node.h : node.y + node.h * port.offset
  };
}
function resolveDocument(document2, context) {
  if (context.signal?.aborted) return failure("operation.aborted");
  const checked = validateDocument(document2);
  if (!checked.ok) return checked;
  const seed = getAdapter(document2.spec.type).seedLayout(document2.spec);
  if (!seed.ok) return seed;
  const layout = seed.value, diagnostics = [];
  if (!freeTypes.has(document2.spec.type))
    return success({
      layout,
      worldBounds: { x: 0, y: 0, width: layout.width, height: layout.height },
      origin: { x: 0, y: 0 },
      diagnostics
    });
  for (const node of layout.nodes) {
    const placement = document2.scene.nodes[node.id];
    if (placement)
      Object.assign(node, {
        x: placement.x,
        y: placement.y,
        w: placement.width,
        h: placement.height,
        cx: placement.x + placement.width / 2,
        cy: placement.y + placement.height / 2
      });
  }
  layout.nodes.sort(
    (a, b) => document2.scene.zOrder.indexOf(a.id) - document2.scene.zOrder.indexOf(b.id)
  );
  layout.nodeById = Object.fromEntries(layout.nodes.map((n) => [n.id, n]));
  const parallel = /* @__PURE__ */ new Map();
  layout.edges = edgesOf(document2.spec).map((edge) => {
    const from = layout.nodeById[edge.from], to = layout.nodeById[edge.to], route = document2.scene.routes[edge.id];
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
      const authored = document2.spec.edges.find((e) => e.id === edge.id);
      const sp = document2.spec.nodes.find((n) => n.id === edge.from)?.ports?.find((p) => p.id === authored.sourcePort);
      const tp = document2.spec.nodes.find((n) => n.id === edge.to)?.ports?.find((p) => p.id === authored.targetPort);
      if (sp) source = sp;
      if (tp) target = tp;
    }
    if (edge.from === edge.to && route?.mode !== "manual") {
      source = { side: "right", offset: 0.3 };
      target = { side: "right", offset: 0.7 };
    }
    const start = anchor(from, source), end = anchor(to, target);
    const key = JSON.stringify([edge.from, edge.to]), ordinal = parallel.get(key) ?? 0;
    parallel.set(key, ordinal + 1);
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
  const measure = (value, role) => (context.measureText ?? estimateTextWidth)(value, role);
  for (const n of layout.nodes) {
    points.push([n.x, n.y], [n.x + n.w, n.y + n.h]);
    const labelRole = { size: 14.5, family: "Geist", charFactor: 13 / 14.5 };
    const kindRole = { size: 11.25, family: "Geist Mono", charFactor: 10 / 11.25, tracking: 1.6 };
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
    const textRight = textLeft + textWidth;
    if (textLeft < n.x + 14 || textRight > n.x + n.w - 14) {
      points.push([textLeft, n.y], [textRight, n.y + n.h]);
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
  if (context.signal?.aborted) return failure("operation.aborted");
  return success(
    { layout, worldBounds: { x, y, width, height }, origin: { x: -x, y: -y }, diagnostics },
    diagnostics
  );
}

export {
  getAdapter,
  isNodeLocked,
  pruneReferences,
  applyCommand,
  createCanvasTextMeasurer,
  resolveDocument
};
