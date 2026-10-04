import type { DiagramDocument, EntityMetadata } from '../editor-core/types'

/**
 * Allowlisted metadata projection shared by portable artifacts. `minimal`
 * keeps the declared semantics a viewer needs (roles, tags, ownership,
 * visibility, crossing, visuals, engineering profile, views and story) and
 * removes undrawn private data (notes, links, evidence) plus unknown
 * extensions. `all` keeps the authored inspector detail intact.
 */
export function projectDocumentMetadata(
  document: DiagramDocument,
  policy: 'minimal' | 'all' = 'minimal',
): DiagramDocument {
  const reduced = structuredClone(document)
  if (policy === 'all') return reduced
  const project = (entity: EntityMetadata): EntityMetadata => {
    const next: EntityMetadata = { roles: [...entity.roles], tags: [...entity.tags] }
    if (entity.owner !== undefined) next.owner = entity.owner
    if (entity.visibility !== undefined) next.visibility = entity.visibility
    if (entity.crossing !== undefined) next.crossing = entity.crossing
    return next
  }
  for (const [id, entity] of Object.entries(reduced.metadata.nodes))
    reduced.metadata.nodes[id] = project(entity)
  for (const [id, entity] of Object.entries(reduced.metadata.edges))
    reduced.metadata.edges[id] = project(entity)
  reduced.extensions = {}
  return reduced
}
