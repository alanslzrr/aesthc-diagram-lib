import type { DiagramDocument } from '../editor-core/types'
import type { EntityRef } from '../editor-core/types'
import type { GraphSnapshot } from '../graph'
import { relationsOf } from '../graph'

export interface InspectorProps {
  document: DiagramDocument
  graph: GraphSnapshot
  entity: EntityRef | null
  onSelect: (entity: EntityRef) => void
  t: (en: string, es: string) => string
}
const safeScheme = /^(https?:|mailto:)/i
function safeLinks(links?: Array<{ label: string; href: string }>) {
  return (links ?? []).filter((link) => safeScheme.test(link.href) && !/["<>]/.test(link.href))
}
/** Read-only semantic inspector: description, properties, safe links and the
 * exact incoming/outgoing relations, each identified by its own edge ID. */
export function Inspector({ document, graph, entity, onSelect, t }: InspectorProps) {
  if (!entity)
    return (
      <div className="adl-viewer-inspector adl-viewer-inspector-empty">
        {t('Select an entity to inspect.', 'Selecciona una entidad para inspeccionarla.')}
      </div>
    )
  const labelOf = (id: string) => graph.nodes.find((node) => node.id === id)?.label ?? id
  if (entity.kind === 'edge') {
    const edge = graph.edges.find((candidate) => candidate.id === entity.id)
    if (!edge)
      return (
        <div className="adl-viewer-inspector">
          <p role="status">
            {t(
              'This relation is no longer in the document.',
              'Esta relación ya no está en el documento.',
            )}
          </p>
        </div>
      )
    const metadata = document.metadata.edges[edge.id]
    const links = safeLinks(metadata?.links)
    return (
      <div className="adl-viewer-inspector">
        <h3>
          <span className="adl-viewer-mono">{edge.id}</span>
        </h3>
        <p>
          {labelOf(edge.from)} <span aria-hidden="true">→</span> {labelOf(edge.to)}
        </p>
        {edge.label ? (
          <p className="adl-viewer-muted">
            {t('Label:', 'Etiqueta:')} {edge.label}
          </p>
        ) : null}
        {edge.variant ? <p className="adl-viewer-muted">{edge.variant}</p> : null}
        {links.length > 0 && (
          <ul className="adl-viewer-links">
            {links.map((link) => (
              <li key={link.href}>
                <a href={link.href} target="_blank" rel="noreferrer">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }
  const node = graph.nodes.find((candidate) => candidate.id === entity.id)
  if (!node)
    return (
      <div className="adl-viewer-inspector">
        <p role="status">
          {t(
            'This entity is no longer in the document.',
            'Esta entidad ya no está en el documento.',
          )}
        </p>
      </div>
    )
  const metadata = document.metadata.nodes[node.id]
  const links = safeLinks(metadata?.links)
  const relations = relationsOf(graph, node.id)
  const incoming = relations.ok ? relations.value.incoming : []
  const outgoing = relations.ok ? relations.value.outgoing : []
  return (
    <div className="adl-viewer-inspector">
      <h3>{node.label}</h3>
      <p className="adl-viewer-mono adl-viewer-id">{node.id}</p>
      {node.kind ? <p className="adl-viewer-kind">{node.kind}</p> : null}
      {node.description ? <p>{node.description}</p> : null}
      {metadata?.roles?.length ? (
        <p className="adl-viewer-muted">
          {t('Roles:', 'Roles:')} {metadata.roles.join(', ')}
        </p>
      ) : null}
      {links.length > 0 && (
        <ul className="adl-viewer-links">
          {links.map((link) => (
            <li key={link.href}>
              <a href={link.href} target="_blank" rel="noreferrer">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      )}
      <h4>{t('Incoming', 'Entrantes')}</h4>
      {incoming.length === 0 ? (
        <p className="adl-viewer-muted">{t('None.', 'Ninguna.')}</p>
      ) : (
        <ul className="adl-viewer-relations">
          {incoming.map((relation) => (
            <li key={relation.edgeId}>
              <button type="button" onClick={() => onSelect({ kind: 'edge', id: relation.edgeId })}>
                <span>{labelOf(relation.from)}</span>
                <span className="adl-viewer-mono">{relation.edgeId}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <h4>{t('Outgoing', 'Salientes')}</h4>
      {outgoing.length === 0 ? (
        <p className="adl-viewer-muted">{t('None.', 'Ninguna.')}</p>
      ) : (
        <ul className="adl-viewer-relations">
          {outgoing.map((relation) => (
            <li key={relation.edgeId}>
              <button type="button" onClick={() => onSelect({ kind: 'edge', id: relation.edgeId })}>
                <span>{labelOf(relation.to)}</span>
                <span className="adl-viewer-mono">{relation.edgeId}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
