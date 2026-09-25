import {
  edgesOf,
  failure,
  freezeData,
  nodesOf,
  success,
  validateDocument
} from "./chunk-6NELNSRC.js";

// src/graph/compare.ts
function diffValues(before, after, prefix) {
  if (JSON.stringify(before) === JSON.stringify(after)) return [];
  if (before === null || after === null || typeof before !== "object" || typeof after !== "object" || Array.isArray(before) || Array.isArray(after))
    return [{ path: prefix, before, after }];
  const keys = /* @__PURE__ */ new Set([...Object.keys(before), ...Object.keys(after)]);
  const changes = [];
  for (const key of keys) {
    const left = before[key];
    const right = after[key];
    changes.push(...diffValues(left, right, `${prefix}/${key}`));
  }
  return changes;
}
function orderOf(ids) {
  return ids.join("\0");
}
function reorderOf(collection, beforeIds, afterIds) {
  const beforeSet = new Set(beforeIds), afterSet = new Set(afterIds);
  const kept = beforeIds.filter((id) => afterSet.has(id));
  const keptAfter = afterIds.filter((id) => beforeSet.has(id));
  if (kept.length < 2 || orderOf(kept) === orderOf(keptAfter)) return [];
  return [{ collection, before: kept, after: keptAfter }];
}
function compareDocuments(beforeInput, afterInput) {
  const beforeChecked = validateDocument(beforeInput);
  if (!beforeChecked.ok) return beforeChecked;
  const afterChecked = validateDocument(afterInput);
  if (!afterChecked.ok) return afterChecked;
  const before = beforeChecked.value, after = afterChecked.value;
  if (before.spec.type !== after.spec.type) return failure("compare.incompatible");
  const beforeNodes = new Map(nodesOf(before.spec).map((node) => [node.id, node]));
  const afterNodes = new Map(nodesOf(after.spec).map((node) => [node.id, node]));
  const beforeEdges = new Map(edgesOf(before.spec).map((edge) => [edge.id, edge]));
  const afterEdges = new Map(edgesOf(after.spec).map((edge) => [edge.id, edge]));
  const nodes = [];
  const edges = [];
  function delta(kind, id, beforeEntity, afterEntity, beforePlacement, afterPlacement) {
    if (beforeEntity === void 0)
      return { kind, id, status: "added", semantic: [], presentation: [] };
    if (afterEntity === void 0)
      return { kind, id, status: "removed", semantic: [], presentation: [] };
    const semantic = diffValues(beforeEntity, afterEntity, "").map((change) => change.path);
    const presentation2 = diffValues(beforePlacement, afterPlacement, "").map(
      (change) => change.path
    );
    if (semantic.length === 0 && presentation2.length === 0) return null;
    return { kind, id, status: "modified", semantic, presentation: presentation2 };
  }
  for (const id of /* @__PURE__ */ new Set([...beforeNodes.keys(), ...afterNodes.keys()])) {
    const entry = delta(
      "node",
      id,
      beforeNodes.get(id),
      afterNodes.get(id),
      before.scene.nodes[id],
      after.scene.nodes[id]
    );
    if (entry) nodes.push(entry);
  }
  for (const id of /* @__PURE__ */ new Set([...beforeEdges.keys(), ...afterEdges.keys()])) {
    const entry = delta(
      "edge",
      id,
      beforeEdges.get(id),
      afterEdges.get(id),
      before.scene.routes[id],
      after.scene.routes[id]
    );
    if (entry) edges.push(entry);
  }
  const presentation = diffValues(
    {
      presentation: before.presentation,
      mode: before.scene.mode,
      zOrder: before.scene.zOrder
    },
    {
      presentation: after.presentation,
      mode: after.scene.mode,
      zOrder: after.scene.zOrder
    },
    ""
  );
  const reorder = [
    ...reorderOf(
      "nodes",
      nodesOf(before.spec).map((node) => node.id),
      nodesOf(after.spec).map((node) => node.id)
    ),
    ...reorderOf(
      "edges",
      edgesOf(before.spec).map((edge) => edge.id),
      edgesOf(after.spec).map((edge) => edge.id)
    )
  ];
  const counts = {
    added: [...nodes, ...edges].filter((entry) => entry.status === "added").length,
    removed: [...nodes, ...edges].filter((entry) => entry.status === "removed").length,
    modified: [...nodes, ...edges].filter((entry) => entry.status === "modified").length,
    presentationOnly: [...nodes, ...edges].filter(
      (entry) => entry.status === "modified" && entry.semantic.length === 0
    ).length,
    reorder: reorder.length
  };
  return success({
    before: { documentId: before.id, revision: before.revision },
    after: { documentId: after.id, revision: after.revision },
    type: before.spec.type,
    nodes,
    edges,
    reorder,
    presentation,
    counts,
    mergeSafety: false
  });
}

// src/graph/index.ts
function graphSnapshot(document, filter) {
  const checked = validateDocument(document);
  if (!checked.ok) throw new TypeError(checked.diagnostics.map((d) => d.code).join(", "));
  const nodes = nodesOf(document.spec).filter(
    (n) => !filter?.nodeRoles?.length || filter.nodeRoles.some((r) => document.metadata.nodes[n.id]?.roles.includes(r))
  ).map((n) => n.id);
  const ids = new Set(nodes);
  const info = nodesOf(document.spec).filter((n) => ids.has(n.id));
  return freezeData({
    documentId: document.id,
    revision: document.revision,
    nodeIds: nodes,
    nodes: info.map((n) => ({
      id: n.id,
      label: n.label ?? "",
      ...n.kind ? { kind: n.kind } : {},
      ...n.description ? { description: n.description } : {}
    })),
    edges: edgesOf(document.spec).filter(
      (e) => ids.has(e.from) && ids.has(e.to) && (!filter?.variants?.length || filter.variants.includes(e.variant ?? "main"))
    ).map((e) => ({ ...e, id: e.id })),
    ...filter ? { filter: structuredClone(filter) } : {}
  });
}
function identity(graph) {
  return {
    documentId: graph.documentId,
    revision: graph.revision,
    ...graph.filter ? { filter: structuredClone(graph.filter) } : {}
  };
}
function findRoute(graph, from, to) {
  if (!graph.nodeIds.includes(from) || !graph.nodeIds.includes(to))
    return failure("graph.unknown-node");
  const queue = [from], seen = new Set(queue), parents = /* @__PURE__ */ new Map();
  for (let i = 0; i < queue.length; i++) {
    const node = queue[i];
    if (node === to) {
      const nodeIds = [to], edgeIds = [];
      let current = to;
      while (current !== from) {
        const parent = parents.get(current);
        edgeIds.push(parent.edge);
        nodeIds.push(parent.node);
        current = parent.node;
      }
      return success({
        ...identity(graph),
        status: "found",
        nodeIds: nodeIds.reverse(),
        edgeIds: edgeIds.reverse()
      });
    }
    for (const edge of graph.edges)
      if (edge.from === node && !seen.has(edge.to)) {
        seen.add(edge.to);
        parents.set(edge.to, { node, edge: edge.id });
        queue.push(edge.to);
      }
  }
  return success({ ...identity(graph), status: "unreachable", nodeIds: [], edgeIds: [] });
}
function findReach(graph, origin, direction, maxHops = Number.MAX_SAFE_INTEGER) {
  if (!graph.nodeIds.includes(origin)) return failure("graph.unknown-node");
  if (!Number.isSafeInteger(maxHops) || maxHops < 0 || !["upstream", "downstream"].includes(direction))
    return failure("query.invalid");
  const nodeIds = [origin], edgeIds = [], depth = /* @__PURE__ */ Object.create(null), seenEdges = /* @__PURE__ */ new Set();
  depth[origin] = 0;
  let truncated = false;
  for (let i = 0; i < nodeIds.length; i++) {
    const node = nodeIds[i];
    for (const edge of graph.edges) {
      if ((direction === "downstream" ? edge.from : edge.to) !== node) continue;
      const next = direction === "downstream" ? edge.to : edge.from;
      if (depth[node] >= maxHops) {
        if (depth[next] === void 0) truncated = true;
        continue;
      }
      if (!seenEdges.has(edge.id)) {
        seenEdges.add(edge.id);
        edgeIds.push(edge.id);
      }
      if (depth[next] === void 0) {
        depth[next] = depth[node] + 1;
        nodeIds.push(next);
      }
    }
  }
  return success({ ...identity(graph), origin, direction, nodeIds, edgeIds, depth, truncated });
}
function searchNodes(graph, query, limit = 20) {
  const needle = query.toLocaleLowerCase();
  if (!needle) return [];
  const matched = [];
  const rank = {
    "exact-id": [],
    "label-prefix": [],
    "label-substring": [],
    "kind-prefix": [],
    "kind-substring": []
  };
  for (const node of graph.nodes) {
    if (node.id.toLocaleLowerCase() === needle)
      rank["exact-id"].push({ ...node, match: "exact-id" });
    else if (node.label.toLocaleLowerCase().startsWith(needle))
      rank["label-prefix"].push({ ...node, match: "label-prefix" });
    else if (node.label.toLocaleLowerCase().includes(needle))
      rank["label-substring"].push({ ...node, match: "label-substring" });
    else if (node.kind?.toLocaleLowerCase().startsWith(needle))
      rank["kind-prefix"].push({ ...node, match: "kind-prefix" });
    else if (node.kind?.toLocaleLowerCase().includes(needle))
      rank["kind-substring"].push({ ...node, match: "kind-substring" });
  }
  for (const key of Object.keys(rank))
    for (const entry of rank[key]) {
      matched.push(entry);
      if (matched.length >= limit) return matched;
    }
  return matched;
}
function relationsOf(graph, nodeId) {
  if (!graph.nodeIds.includes(nodeId)) return failure("graph.unknown-node");
  const incoming = [], outgoing = [];
  for (const edge of graph.edges) {
    if (edge.to === nodeId) incoming.push({ edgeId: edge.id, from: edge.from });
    if (edge.from === nodeId) outgoing.push({ edgeId: edge.id, to: edge.to });
  }
  return success({ incoming, outgoing });
}

export {
  compareDocuments,
  graphSnapshot,
  findRoute,
  findReach,
  searchNodes,
  relationsOf
};
