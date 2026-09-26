import type { DiagramDocument, EntityRef } from '../editor-core/types'
import type { DeploymentProfileReport } from '../editor-core'

export interface EvidenceProps {
  document: DiagramDocument
  entity: EntityRef | null
  profile: DeploymentProfileReport | null
  onSelect: (entity: EntityRef) => void
  t: (en: string, es: string) => string
}
/** Read-only evidence and deployment-profile panel. Declared evidence is never
 * presented as verified, and profile diagnostics navigate to their exact
 * subject by ID. */
export function Evidence({ document, entity, profile, onSelect, t }: EvidenceProps) {
  const entries = entity
    ? entity.kind === 'node'
      ? (document.metadata.nodes[entity.id]?.evidence ?? [])
      : (document.metadata.edges[entity.id]?.evidence ?? [])
    : []
  return (
    <div className="adl-viewer-evidence">
      <h4>{t('Evidence', 'Evidencia')}</h4>
      {!entity ? (
        <p className="adl-viewer-muted">{t('Select an entity.', 'Selecciona una entidad.')}</p>
      ) : entries.length === 0 ? (
        <p className="adl-viewer-muted">{t('No declared evidence.', 'Sin evidencia declarada.')}</p>
      ) : (
        <ul className="adl-viewer-evidence-list">
          {entries.map((entry) => (
            <li key={entry.id}>
              <span className="adl-viewer-mono">{entry.id}</span>{' '}
              <span className="adl-viewer-muted">
                {entry.repository.replace(/^https:\/\//, '')} · {entry.path}:{entry.startLine}-
                {entry.endLine}
              </span>{' '}
              <span className="adl-viewer-evidence-status">{t('declared', 'declarada')}</span>
            </li>
          ))}
        </ul>
      )}
      {profile?.enabled && (
        <>
          <h4>{t('Deployment profile', 'Perfil de despliegue')}</h4>
          <p className="adl-viewer-muted">
            {t(
              `${profile.facts.nodes} nodes · ${profile.facts.regions} regions · ${profile.facts.crossRegionEdges} cross-region edges`,
              `${profile.facts.nodes} nodos · ${profile.facts.regions} regiones · ${profile.facts.crossRegionEdges} relaciones entre regiones`,
            )}
          </p>
          {profile.diagnostics.length === 0 ? (
            <p className="adl-viewer-muted" role="status">
              {t('No profile issues.', 'Sin incidencias del perfil.')}
            </p>
          ) : (
            <ul className="adl-viewer-profile-diagnostics" role="list">
              {profile.diagnostics.map((diagnostic, index) => (
                <li key={`${diagnostic.code}-${diagnostic.subject?.id ?? index}`}>
                  <button
                    type="button"
                    onClick={() =>
                      diagnostic.subject &&
                      onSelect({ kind: diagnostic.subject.kind, id: diagnostic.subject.id })
                    }
                  >
                    <span className="adl-viewer-mono">{diagnostic.code}</span>{' '}
                    {diagnostic.subject
                      ? `${diagnostic.subject.kind}:${diagnostic.subject.id}`
                      : ''}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
