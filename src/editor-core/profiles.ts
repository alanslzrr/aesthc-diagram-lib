import type { Diagnostic, DiagramDocument, DiagramGroup, Result } from './types'
import { issue, success } from './data'
import { validateDocument } from './validation'
import { edgesOf, nodesOf } from './model'

export type DeploymentRule =
  | 'profile.owner-missing'
  | 'profile.region-conflict'
  | 'profile.public-entity'
  | 'profile.crossing-missing'
export interface DeploymentProfileReport {
  enabled: boolean
  facts: {
    nodes: number
    regions: number
    crossRegionEdges: number
  }
  diagnostics: Diagnostic[]
}
/**
 * Opt-in, declarative deployment profile. Activation is authored
 * (`metadata.engineeringProfile === 'deployment-ownership'`); an explicit
 * `enabled:true` only opts in for pre-field hosts and can never disable an
 * authored policy. Rules read declared metadata only and never discover
 * infrastructure.
 */
export function validateDeploymentProfile(
  input: DiagramDocument,
  options: { enabled?: boolean } = {},
): Result<DeploymentProfileReport> {
  const checked = validateDocument(input)
  if (!checked.ok) return checked
  const document = checked.value
  const enabled =
    options.enabled === true || document.metadata.engineeringProfile === 'deployment-ownership'
  if (!enabled)
    return success({
      enabled: false,
      facts: { nodes: 0, regions: 0, crossRegionEdges: 0 },
      diagnostics: [],
    })
  const diagnostics: Diagnostic[] = []
  const groupById = new Map(document.scene.groups.map((group) => [group.id, group]))
  const ancestors = (nodeId: string): DiagramGroup[] => {
    const found: DiagramGroup[] = []
    const seen = new Set<string>()
    const queue = document.scene.groups.filter((group) => group.nodeIds.includes(nodeId))
    for (let index = 0; index < queue.length; index++) {
      const group = queue[index]
      if (seen.has(group.id)) continue
      seen.add(group.id)
      found.push(group)
      const parent = group.parentGroup ? groupById.get(group.parentGroup) : undefined
      if (parent && !seen.has(parent.id)) queue.push(parent)
    }
    return found
  }
  const regionIds = (nodeId: string) => {
    const regions = new Set<string>()
    for (const group of ancestors(nodeId)) if (group.kind === 'region') regions.add(group.id)
    return regions
  }
  const securityGroupIds = (nodeId: string) => {
    const groups = new Set<string>()
    for (const group of ancestors(nodeId)) if (group.kind === 'security-group') groups.add(group.id)
    return groups
  }
  const regions = new Set<string>()
  const nodeIds = nodesOf(document.spec).map((node) => node.id)
  for (const nodeId of nodeIds) {
    const metadata = document.metadata.nodes[nodeId]
    const roles = metadata?.roles ?? []
    const external = roles.includes('external')
    if (!external && !metadata?.owner?.trim())
      diagnostics.push({
        ...issue('profile.owner-missing'),
        subject: { kind: 'node', id: nodeId },
      })
    const nodeRegions = regionIds(nodeId)
    nodeRegions.forEach((region) => regions.add(region))
    if (nodeRegions.size !== 1)
      diagnostics.push({
        ...issue('profile.region-conflict'),
        subject: { kind: 'node', id: nodeId },
      })
    const privateEntity = roles.includes('database') || roles.includes('storage')
    if (privateEntity && metadata?.visibility !== 'private')
      diagnostics.push({
        ...issue('profile.public-entity'),
        subject: { kind: 'node', id: nodeId },
      })
    for (const groupId of securityGroupIds(nodeId)) {
      const group = groupById.get(groupId)
      if (!group) continue
      const groupRegions = new Set<string>()
      for (const id of group.nodeIds) regionIds(id).forEach((region) => groupRegions.add(region))
      if (groupRegions.size !== 1 || !nodeRegions.has([...groupRegions][0] ?? ''))
        diagnostics.push({
          ...issue('profile.region-conflict'),
          subject: { kind: 'group', id: groupId },
        })
    }
  }
  for (const group of document.scene.groups) {
    if (group.kind !== 'security-group') continue
    if (group.visibility !== 'private')
      diagnostics.push({
        ...issue('profile.public-entity'),
        subject: { kind: 'group', id: group.id },
        message: 'security-group must declare visibility:private',
      })
    const groupRegions = new Set<string>()
    let parent = group.parentGroup ? groupById.get(group.parentGroup) : undefined
    const seen = new Set<string>()
    while (parent && !seen.has(parent.id)) {
      seen.add(parent.id)
      if (parent.kind === 'region') groupRegions.add(parent.id)
      parent = parent.parentGroup ? groupById.get(parent.parentGroup) : undefined
    }
    if (groupRegions.size !== 1)
      diagnostics.push({
        ...issue('profile.region-conflict'),
        subject: { kind: 'group', id: group.id },
      })
  }
  const membership = (nodeId: string) =>
    [...regionIds(nodeId), ...securityGroupIds(nodeId)].sort().join('|')
  let crossRegionEdges = 0
  for (const edge of edgesOf(document.spec)) {
    // Region and security-group membership both create a deployment boundary;
    // a reordered membership string with the same sets is not a change.
    if (membership(edge.from) === membership(edge.to)) continue
    crossRegionEdges += 1
    if (!document.metadata.edges[edge.id!]?.crossing?.trim())
      diagnostics.push({
        ...issue('profile.crossing-missing'),
        subject: { kind: 'edge', id: edge.id! },
      })
  }
  // The same fact can be reached from a node and its group; report it once.
  const unique = new Map<string, Diagnostic>()
  for (const diagnostic of diagnostics) {
    const key = `${diagnostic.code}|${diagnostic.subject?.kind ?? ''}|${diagnostic.subject?.id ?? ''}|${diagnostic.path ?? ''}`
    if (!unique.has(key)) unique.set(key, diagnostic)
  }
  return success({
    enabled: true,
    facts: { nodes: nodeIds.length, regions: regions.size, crossRegionEdges },
    diagnostics: [...unique.values()],
  })
}
