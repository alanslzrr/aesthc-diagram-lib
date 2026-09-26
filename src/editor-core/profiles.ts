import type { Diagnostic, DiagramDocument, Result } from './types'
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
/** Opt-in, declarative deployment profile. When disabled (the default) no rule
 * is imposed and no infrastructure is inspected; when enabled, failures are
 * reported by exact fact, never discovered from the environment. */
export function validateDeploymentProfile(
  input: DiagramDocument,
  options: { enabled?: boolean } = {},
): Result<DeploymentProfileReport> {
  const checked = validateDocument(input)
  if (!checked.ok) return checked
  const document = checked.value
  const enabled = options.enabled === true
  if (!enabled)
    return success({
      enabled: false,
      facts: { nodes: 0, regions: 0, crossRegionEdges: 0 },
      diagnostics: [],
    })
  const diagnostics: Diagnostic[] = []
  const regions = new Set<string>()
  const regionOf = (nodeId: string) => {
    const declared = (document.metadata.nodes[nodeId]?.tags ?? [])
      .filter((tag) => tag.startsWith('region:'))
      .map((tag) => tag.slice('region:'.length))
      .filter(Boolean)
    for (const region of declared) regions.add(region)
    return declared
  }
  const nodeIds = nodesOf(document.spec).map((node) => node.id)
  for (const nodeId of nodeIds) {
    const metadata = document.metadata.nodes[nodeId]
    if (!metadata?.owner)
      diagnostics.push({
        ...issue('profile.owner-missing'),
        subject: { kind: 'node', id: nodeId },
      })
    if (metadata?.visibility === 'public')
      diagnostics.push({
        ...issue('profile.public-entity'),
        subject: { kind: 'node', id: nodeId },
      })
    if (regionOf(nodeId).length > 1)
      diagnostics.push({
        ...issue('profile.region-conflict'),
        subject: { kind: 'node', id: nodeId },
      })
  }
  let crossRegionEdges = 0
  for (const edge of edgesOf(document.spec)) {
    const fromRegion = regionOf(edge.from)[0]
    const toRegion = regionOf(edge.to)[0]
    if (!fromRegion || !toRegion || fromRegion === toRegion) continue
    crossRegionEdges += 1
    if (!document.metadata.edges[edge.id!]?.crossing)
      diagnostics.push({
        ...issue('profile.crossing-missing'),
        subject: { kind: 'edge', id: edge.id! },
      })
  }
  return success({
    enabled: true,
    facts: {
      nodes: nodeIds.length,
      regions: regions.size,
      crossRegionEdges,
    },
    diagnostics,
  })
}
