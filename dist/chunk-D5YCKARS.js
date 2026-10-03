import {
  edgesOf,
  issue,
  nodesOf,
  success,
  validateDocument
} from "./chunk-TN5OC77A.js";

// src/editor-core/profiles.ts
function validateDeploymentProfile(input, options = {}) {
  const checked = validateDocument(input);
  if (!checked.ok) return checked;
  const document = checked.value;
  const enabled = options.enabled === true || document.metadata.engineeringProfile === "deployment-ownership";
  if (!enabled)
    return success({
      enabled: false,
      facts: { nodes: 0, regions: 0, crossRegionEdges: 0 },
      diagnostics: []
    });
  const diagnostics = [];
  const groupById = new Map(document.scene.groups.map((group) => [group.id, group]));
  const ancestors = (nodeId) => {
    const found = [];
    const seen = /* @__PURE__ */ new Set();
    const queue = document.scene.groups.filter((group) => group.nodeIds.includes(nodeId));
    for (let index = 0; index < queue.length; index++) {
      const group = queue[index];
      if (seen.has(group.id)) continue;
      seen.add(group.id);
      found.push(group);
      const parent = group.parentGroup ? groupById.get(group.parentGroup) : void 0;
      if (parent && !seen.has(parent.id)) queue.push(parent);
    }
    return found;
  };
  const regionIds = (nodeId) => {
    const regions2 = /* @__PURE__ */ new Set();
    for (const group of ancestors(nodeId)) if (group.kind === "region") regions2.add(group.id);
    return regions2;
  };
  const securityGroupIds = (nodeId) => {
    const groups = /* @__PURE__ */ new Set();
    for (const group of ancestors(nodeId)) if (group.kind === "security-group") groups.add(group.id);
    return groups;
  };
  const groupRegionIds = (group) => {
    const regions2 = /* @__PURE__ */ new Set();
    const seen = /* @__PURE__ */ new Set([group.id]);
    let parent = group.parentGroup ? groupById.get(group.parentGroup) : void 0;
    while (parent && !seen.has(parent.id)) {
      seen.add(parent.id);
      if (parent.kind === "region") regions2.add(parent.id);
      parent = parent.parentGroup ? groupById.get(parent.parentGroup) : void 0;
    }
    return regions2;
  };
  const regions = /* @__PURE__ */ new Set();
  const nodeIds = nodesOf(document.spec).map((node) => node.id);
  for (const nodeId of nodeIds) {
    const metadata = document.metadata.nodes[nodeId];
    const roles = metadata?.roles ?? [];
    const external = roles.includes("external");
    if (!external && !metadata?.owner?.trim())
      diagnostics.push({
        ...issue("profile.owner-missing"),
        subject: { kind: "node", id: nodeId }
      });
    const nodeRegions = regionIds(nodeId);
    nodeRegions.forEach((region) => regions.add(region));
    if (nodeRegions.size !== 1)
      diagnostics.push({
        ...issue("profile.region-conflict"),
        subject: { kind: "node", id: nodeId }
      });
    const privateEntity = roles.includes("database") || roles.includes("storage");
    if (privateEntity && metadata?.visibility !== "private")
      diagnostics.push({
        ...issue("profile.public-entity"),
        subject: { kind: "node", id: nodeId }
      });
    for (const groupId of securityGroupIds(nodeId)) {
      const group = groupById.get(groupId);
      if (!group) continue;
      const groupRegions = groupRegionIds(group);
      if (groupRegions.size !== 1 || !nodeRegions.has([...groupRegions][0] ?? ""))
        diagnostics.push({
          ...issue("profile.region-conflict"),
          subject: { kind: "group", id: groupId }
        });
    }
  }
  for (const group of document.scene.groups) {
    if (group.kind !== "security-group") continue;
    if (group.visibility !== "private")
      diagnostics.push({
        ...issue("profile.public-entity"),
        subject: { kind: "group", id: group.id },
        message: "security-group must declare visibility:private"
      });
    const groupRegions = groupRegionIds(group);
    if (groupRegions.size !== 1)
      diagnostics.push({
        ...issue("profile.region-conflict"),
        subject: { kind: "group", id: group.id }
      });
  }
  const membership = (nodeId) => [...regionIds(nodeId), ...securityGroupIds(nodeId)].sort().join("|");
  let crossRegionEdges = 0;
  for (const edge of edgesOf(document.spec)) {
    if (membership(edge.from) === membership(edge.to)) continue;
    crossRegionEdges += 1;
    if (!document.metadata.edges[edge.id]?.crossing?.trim())
      diagnostics.push({
        ...issue("profile.crossing-missing"),
        subject: { kind: "edge", id: edge.id }
      });
  }
  const unique = /* @__PURE__ */ new Map();
  for (const diagnostic of diagnostics) {
    const key = `${diagnostic.code}|${diagnostic.subject?.kind ?? ""}|${diagnostic.subject?.id ?? ""}|${diagnostic.path ?? ""}`;
    if (!unique.has(key)) unique.set(key, diagnostic);
  }
  return success({
    enabled: true,
    facts: { nodes: nodeIds.length, regions: regions.size, crossRegionEdges },
    diagnostics: [...unique.values()]
  });
}

export {
  validateDeploymentProfile
};
