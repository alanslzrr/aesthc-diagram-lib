import { useMemo, useState } from 'react'
import type { DiagramDocument, EntityRef } from '../editor-core/types'
import { resolveDocument } from '../editor-core/scene'
import { findReach, findRoute, graphSnapshot } from '../graph'
import type { Locale } from '../editor-core/types'
import { renderSvg } from '../render'
import { downloadArtifact } from '../export'
import type { ExportArtifact } from '../export'
import { Finder } from './Finder'
import { Inspector } from './Inspector'
import {
  exportQuerySvg,
  isQueryStale,
  queryEdgeIds,
  queryHighlight,
  querySummary,
  type ViewerQueryState,
} from './query'

export interface DiagramViewerProps {
  document: DiagramDocument
  locale?: Locale
  className?: string
}
/** Read-only semantic viewer: finder, inspector, exact route/reach highlight
 * and receipt-bound export. Never mutates the document or the store. */
export function DiagramViewer({ document, locale = 'en', className }: DiagramViewerProps) {
  const t = (en: string, es: string) => (locale === 'es' ? es : en)
  const graph = useMemo(() => graphSnapshot(document), [document])
  const scene = useMemo(
    () =>
      resolveDocument(document, { quality: 'edit', requestId: 'viewer', skipDiagnostics: true }),
    [document],
  )
  const [selection, setSelection] = useState<EntityRef | null>(null)
  const [origin, setOrigin] = useState<string | null>(null)
  const [destination, setDestination] = useState<string | null>(null)
  const [direction, setDirection] = useState<'upstream' | 'downstream'>('downstream')
  const [query, setQuery] = useState<ViewerQueryState | null>(null)
  const stale = isQueryStale(query, document)
  const highlight = stale || !query ? undefined : queryHighlight(query)
  const svg = useMemo(
    () =>
      scene.ok
        ? renderSvg(document, scene.value, {
            instanceId: 'viewer',
            theme: document.presentation.theme.mode,
            highlight,
          })
        : '',
    [document, scene, highlight],
  )
  const relationsEnabled = graph.edges.length > 0
  const summary = querySummary(query, graph, t)
  const edgeIds = queryEdgeIds(query)
  function runRoute() {
    if (!origin || !destination) return
    const route = findRoute(graph, origin, destination)
    if (!route.ok) return
    setQuery({ kind: 'route', origin, destination, result: route.value })
  }
  function runReach() {
    if (!origin) return
    const reach = findReach(graph, origin, direction)
    if (!reach.ok) return
    setQuery({ kind: 'reach', origin, direction, result: reach.value })
  }
  function clearQuery() {
    setQuery(null)
    setOrigin(null)
    setDestination(null)
    setSelection(null)
  }
  function exportQuery() {
    if (!query || stale || !scene.ok) return
    const artifact: ExportArtifact = {
      bytes: new TextEncoder().encode(
        exportQuerySvg(document, scene.value, query, {
          theme: document.presentation.theme.mode,
        }),
      ),
      receipt: {
        documentId: document.id,
        revision: document.revision,
        format: 'svg',
        mimeType: 'image/svg+xml',
        bytes: 0,
        scope: 'document',
        canonical: false,
        sourceIncluded: false,
        verified: false,
        diagnostics: [],
      },
    }
    artifact.receipt.bytes = artifact.bytes.byteLength
    downloadArtifact(artifact, 'query.svg')
  }
  return (
    <section
      className={`adl-viewer${className ? ` ${className}` : ''}`}
      data-theme={document.presentation.theme.mode}
      aria-label={t('Semantic viewer', 'Visor semántico')}
    >
      <header className="adl-viewer-header">
        <div>
          <h2>{document.spec.caption || t('Untitled diagram', 'Diagrama sin título')}</h2>
          <p className="adl-viewer-muted">
            {t('Revision', 'Revisión')} {document.revision}
          </p>
        </div>
        <div className="adl-viewer-controls">
          <Finder
            graph={graph}
            label={t('Origin node', 'Nodo de origen')}
            placeholder={t('Origin…', 'Origen…')}
            disabled={!relationsEnabled}
            onSelect={(id) => {
              setOrigin(id)
              setSelection({ kind: 'node', id })
            }}
          />
          {origin && <span className="adl-viewer-origin">✓ {origin}</span>}
          {query?.kind !== 'reach' && (
            <Finder
              graph={graph}
              label={t('Destination node', 'Nodo de destino')}
              placeholder={t('Destination…', 'Destino…')}
              disabled={!relationsEnabled}
              onSelect={(id) => {
                setDestination(id)
                setSelection({ kind: 'node', id })
              }}
            />
          )}
          {destination && <span className="adl-viewer-origin">✓ {destination}</span>}
          <label className="adl-viewer-direction">
            {t('Direction', 'Dirección')}
            <select
              aria-label={t('Direction', 'Dirección')}
              value={direction}
              onChange={(event) => setDirection(event.target.value as 'upstream' | 'downstream')}
            >
              <option value="downstream">{t('Downstream', 'Descendente')}</option>
              <option value="upstream">{t('Upstream', 'Ascendente')}</option>
            </select>
          </label>
          <button
            type="button"
            onClick={runRoute}
            disabled={!relationsEnabled || !origin || !destination}
          >
            {t('Show route', 'Mostrar ruta')}
          </button>
          <button type="button" onClick={runReach} disabled={!relationsEnabled || !origin}>
            {t('Show reach', 'Mostrar alcance')}
          </button>
          <button type="button" onClick={clearQuery}>
            {t('Clear', 'Limpiar')}
          </button>
        </div>
      </header>
      {!relationsEnabled && (
        <p className="adl-viewer-note">
          {t(
            'This diagram has no relations; route and reach are unavailable.',
            'Este diagrama no tiene relaciones; la ruta y el alcance no están disponibles.',
          )}
        </p>
      )}
      {stale && query && (
        <p className="adl-viewer-note" role="status">
          {t(
            'The document changed. The previous route, highlight and export were invalidated.',
            'El documento cambió. La ruta anterior, el resaltado y la exportación quedaron invalidados.',
          )}
        </p>
      )}
      {scene.ok ? (
        <div
          className="adl-viewer-canvas"
          role="img"
          aria-label={document.spec.caption}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <p className="adl-viewer-note" role="alert">
          {scene.diagnostics.map((diagnostic) => diagnostic.code).join(', ')}
        </p>
      )}
      {(summary || query) && (
        <div className="adl-viewer-querybar">
          <p role="status">{summary ?? ''}</p>
          {edgeIds.length > 0 && (
            <ul className="adl-viewer-edgeids" aria-label={t('Relation IDs', 'IDs de relaciones')}>
              {edgeIds.map((edgeId) => (
                <li key={edgeId}>
                  <button
                    type="button"
                    className="adl-viewer-mono"
                    onClick={() => setSelection({ kind: 'edge', id: edgeId })}
                  >
                    {edgeId}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={exportQuery}
            disabled={!query || stale || !scene.ok}
            aria-describedby={stale ? 'adl-viewer-stale' : undefined}
          >
            {t('Export query SVG', 'Exportar SVG de la consulta')}
          </button>
          <span id="adl-viewer-stale" hidden>
            {t('Export requires a current query.', 'La exportación requiere una consulta vigente.')}
          </span>
        </div>
      )}
      <Inspector
        document={document}
        graph={graph}
        entity={selection}
        onSelect={setSelection}
        t={t}
      />
    </section>
  )
}
