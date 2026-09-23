import {
  edgesOf,
  failure,
  freezeData,
  nodesOf,
  success,
  validateDocument
} from "../chunk-4NII3VRT.js";
import "../chunk-UHROM3FO.js";

// src/graph/index.ts
function graphSnapshot(document, filter) {
  const checked = validateDocument(document);
  if (!checked.ok) throw new TypeError(checked.diagnostics.map((d) => d.code).join(", "));
  const nodes = nodesOf(document.spec).filter(
    (n) => !filter?.nodeRoles?.length || filter.nodeRoles.some((r) => document.metadata.nodes[n.id]?.roles.includes(r))
  ).map((n) => n.id);
  const ids = new Set(nodes);
  return freezeData({
    documentId: document.id,
    revision: document.revision,
    nodeIds: nodes,
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
export {
  findReach,
  findRoute,
  graphSnapshot
};
