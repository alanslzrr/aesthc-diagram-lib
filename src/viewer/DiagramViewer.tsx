import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { DiagramDocument, EntityRef, Locale, Viewport } from '../editor-core/types'
import { resolveDocument } from '../editor-core/scene'
import { findReach, findRoute, graphSnapshot } from '../graph'
import { renderSvg } from '../render'
import { downloadArtifact, exportCard } from '../export'
import type { ExportArtifact } from '../export'
import { Finder } from './Finder'
import { Inspector } from './Inspector'
import { Minimap } from './Minimap'
import { Presentation } from './Presentation'
import { StoryPlayback, createMotionOwnerGuard } from './motion'
import { lensFacets, lensMatches, resolveView } from './views'
import type { ViewerLens } from './views'
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
const ZOOM_MIN = 0.1
const ZOOM_MAX = 4

/** Read-only semantic viewer: finder, inspector, exact route/reach highlight,
 * receipt-bound export, lenses, minimap, finite story and presentation.
 * Never mutates the document or the store. */
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
  const [camera, setCamera] = useState<Viewport>({ x: 0, y: 0, zoom: 1 })
  const [viewSize, setViewSize] = useState({ width: 960, height: 420 })
  const canvasHost = useRef<HTMLDivElement>(null)
  const collapseSelect = useRef<HTMLSelectElement>(null)
  const presentTrigger = useRef<HTMLButtonElement>(null)
  const [lens, setLens] = useState<ViewerLens>({})
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [storyIndex, setStoryIndex] = useState(-1)
  const [storyPlaying, setStoryPlaying] = useState(false)
  const [storyFocus, setStoryFocus] = useState<{ nodes: Set<string>; edges: Set<string> } | null>(
    null,
  )
  const [reducedMotion, setReducedMotion] = useState(
    () =>
      typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const stale = isQueryStale(query, document)
  const queryHighlightSet = stale || !query ? undefined : queryHighlight(query)
  const highlight = storyFocus ?? queryHighlightSet
  const lensSet = useMemo(() => {
    if (!lens.nodeRoles?.length && !lens.tags?.length) return undefined
    const dim = new Set<string>()
    for (const node of graph.nodes) if (!lensMatches(document, node.id, lens)) dim.add(node.id)
    return dim.size ? dim : undefined
  }, [document, graph, lens])
  // Collapse: viewer state bound to original edge IDs through proxy overlays.
  const collapse = useMemo(() => {
    if (collapsed.size === 0 || !scene.ok) return null
    const members = new Set<string>()
    const queue = [...collapsed]
    for (let i = 0; i < queue.length; i++) {
      const group = document.scene.groups.find((g) => g.id === queue[i])
      group?.nodeIds.forEach((id) => members.add(id))
      document.scene.groups
        .filter((g) => g.parentGroup === queue[i])
        .forEach((g) => queue.push(g.id))
    }
    const rects = new Map<string, { x: number; y: number; w: number; h: number }>()
    for (const container of scene.value.layout.containers ?? [])
      if (collapsed.has(container.id)) rects.set(container.id, container)
    const proxies = graph.edges
      .filter((edge) => members.has(edge.from) !== members.has(edge.to))
      .map((edge) => {
        const outsideId = members.has(edge.from) ? edge.to : edge.from
        const insideId = members.has(edge.from) ? edge.from : edge.to
        const group = [...rects.entries()].find(([, rect]) => {
          const inside = scene.value.layout.nodeById[insideId]
          return (
            inside &&
            inside.x >= rect.x &&
            inside.y >= rect.y &&
            inside.x <= rect.x + rect.w &&
            inside.y <= rect.y + rect.h
          )
        })
        const outside = scene.value.layout.nodeById[outsideId]
        if (!outside || !group) return null
        const rect = group[1]
        const cx = rect.x + rect.w / 2
        const cy = rect.y + rect.h / 2
        const angle = Math.atan2(outside.y - cy, outside.x - cx)
        const edgePoint = {
          x: cx + (Math.cos(angle) * rect.w) / 2,
          y: cy + (Math.sin(angle) * rect.h) / 2,
        }
        return { edge, outside, edgePoint, label: `${group[0]}·${edge.id}` }
      })
      .filter((proxy): proxy is NonNullable<typeof proxy> => proxy !== null)
    return { members, proxies, rects }
  }, [collapsed, document, graph, scene])
  const exclude = useMemo(() => {
    if (!collapse) return undefined
    const internalEdges = new Set<string>()
    for (const edge of graph.edges)
      if (collapse.members.has(edge.from) && collapse.members.has(edge.to))
        internalEdges.add(edge.id)
    return { nodes: collapse.members, edges: internalEdges }
  }, [collapse, graph])
  const svg = useMemo(
    () =>
      scene.ok
        ? renderSvg(document, scene.value, {
            instanceId: 'viewer',
            theme: document.presentation.theme.mode,
            highlight,
            dim: lensSet,
            exclude,
          })
        : '',
    [document, scene, highlight, lensSet, exclude],
  )
  const relationsEnabled = graph.edges.length > 0
  const summary = querySummary(query, graph, t)
  const edgeIds = queryEdgeIds(query)
  const facets = useMemo(() => lensFacets(document), [document])
  const story = document.story

  // Camera: fit on document change, measure the canvas, resize handling.
  const fit = useMemo(
    () => () => {
      if (!scene.ok) return
      const layout = scene.value.layout
      const width = canvasHost.current?.clientWidth ?? viewSize.width
      const height = canvasHost.current?.clientHeight ?? viewSize.height
      const zoom = Math.min(width / layout.width, height / layout.height, 1)
      setCamera({
        x: layout.width / 2,
        y: layout.height / 2,
        zoom: Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom)),
      })
    },
    [scene],
  )
  useEffect(() => {
    const host = canvasHost.current
    if (!host) return
    const measure = () => {
      const rect = host.getBoundingClientRect()
      if (rect.width > 0) setViewSize({ width: rect.width, height: rect.height })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(host)
    fit()
    return () => observer.disconnect()
  }, [fit, document.id, document.revision])

  // Single motion owner: story playback owns the camera; queries release it.
  const owner = useRef(createMotionOwnerGuard())
  const playback = useRef<StoryPlayback | null>(null)
  useEffect(() => {
    playback.current?.dispose()
    playback.current = null
    setStoryIndex(-1)
    setStoryPlaying(false)
    setStoryFocus(null)
    if (story.length === 0) return
    playback.current = new StoryPlayback(story, {
      onStep: (index) => {
        const step = story[index]
        if (!step) return
        const view = resolveView(document, step.viewId)
        if (!view.ok) return
        setStoryIndex(index)
        setStoryFocus({ nodes: view.value.focusNodes, edges: view.value.focusEdges })
        if (view.value.view.camera) setCamera(view.value.view.camera)
      },
      onEnd: () => {
        setStoryPlaying(false)
        setStoryIndex(-1)
        setStoryFocus(null)
        owner.current.release('story')
      },
      onStop: () => {
        setStoryPlaying(false)
        setStoryIndex(-1)
        setStoryFocus(null)
        owner.current.release('story')
      },
    })
    return () => playback.current?.dispose()
  }, [document, story])
  function stopStory() {
    playback.current?.stop()
    setStoryPlaying(false)
    setStoryFocus(null)
  }
  function playStory() {
    if (!playback.current || reducedMotion) return
    if (!owner.current.claim('story')) {
      stopStory()
      return
    }
    setQuery(null)
    setStoryPlaying(true)
    playback.current.play()
  }
  // Stop conditions: Escape, hidden tab, print and manual interaction.
  useEffect(() => {
    if (!storyPlaying) return
    const stop = () => stopStory()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') stop()
    }
    const onVisibility = () => {
      if (window.document.hidden) stop()
    }
    window.document.addEventListener('keydown', onKey)
    window.document.addEventListener('visibilitychange', onVisibility)
    window.document.addEventListener('beforeprint', stop)
    canvasHost.current?.addEventListener('pointerdown', stop, { once: true })
    return () => {
      window.document.removeEventListener('keydown', onKey)
      window.document.removeEventListener('visibilitychange', onVisibility)
      window.document.removeEventListener('beforeprint', stop)
    }
  }, [storyPlaying])
  useEffect(() => {
    if (typeof matchMedia === 'undefined') return
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => {
      setReducedMotion(media.matches)
      if (media.matches) stopStory()
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  function runRoute() {
    if (!origin || !destination) return
    stopStory()
    const route = findRoute(graph, origin, destination)
    if (!route.ok) return
    setQuery({ kind: 'route', origin, destination, result: route.value })
  }
  function runReach() {
    if (!origin) return
    stopStory()
    const reach = findReach(graph, origin, direction)
    if (!reach.ok) return
    setQuery({ kind: 'reach', origin, direction, result: reach.value })
  }
  function clearQuery() {
    stopStory()
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
  async function exportCardPng() {
    if (!query || stale || !scene.ok) return
    const artifact = await exportCard(document, {
      query: {
        documentId: document.id,
        revision: document.revision,
        nodeIds: [...query.result.nodeIds],
        edgeIds: [...query.result.edgeIds],
        label: summary ?? '',
      },
    })
    if (!artifact.ok) return
    downloadArtifact(artifact.value, 'card.png')
  }
  function zoomBy(factor: number) {
    setCamera((current) => ({
      ...current,
      zoom: Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, current.zoom * factor)),
    }))
  }
  function panTo(event: ReactPointerEvent<HTMLDivElement>) {
    const host = canvasHost.current
    if (!host || !scene.ok) return
    const rect = host.getBoundingClientRect()
    const dx = event.clientX - rect.left - rect.width / 2
    const dy = event.clientY - rect.top - rect.height / 2
    setCamera((current) => ({
      x: current.x - dx / current.zoom,
      y: current.y - dy / current.zoom,
      zoom: current.zoom,
    }))
  }
  const viewWorldSize = {
    width: viewSize.width / camera.zoom,
    height: viewSize.height / camera.zoom,
  }
  const proxyMarkup = useMemo(() => {
    if (!collapse || !scene.ok) return ''
    const theme = document.presentation.theme[document.presentation.theme.mode]
    return collapse.proxies
      .map(
        (proxy) =>
          `<g class="adl-viewer-proxy" data-proxy-edge-id="${proxy.edge.id}">` +
          `<line x1="${proxy.outside.x + proxy.outside.w / 2}" y1="${proxy.outside.y + proxy.outside.h / 2}" x2="${proxy.edgePoint.x}" y2="${proxy.edgePoint.y}" stroke="${theme.border}" stroke-dasharray="3 4"/>` +
          `<rect x="${proxy.edgePoint.x - 18}" y="${proxy.edgePoint.y - 9}" width="36" height="18" rx="9" fill="${theme.card}" stroke="${theme.cobalt}"/>` +
          `<text x="${proxy.edgePoint.x}" y="${proxy.edgePoint.y + 3.5}" text-anchor="middle" font-family="Geist Mono, monospace" font-size="9" fill="${theme.cobalt}">${proxy.edge.id}</text>` +
          `</g>`,
      )
      .join('')
  }, [collapse, document, scene])
  const overlayMarkup = useMemo(() => {
    if (!proxyMarkup) return ''
    return (
      `<svg class="adl-viewer-proxy-layer" viewBox="0 0 ${scene.ok ? scene.value.layout.width : 1} ${scene.ok ? scene.value.layout.height : 1}" ` +
      `aria-hidden="true">${proxyMarkup}</svg>`
    )
  }, [proxyMarkup, scene])

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
      {facets.roles.length > 0 || facets.tags.length > 0 ? (
        <div className="adl-viewer-lensbar">
          <label>
            {t('Roles', 'Roles')}
            <select
              aria-label={t('Role lens', 'Lente de roles')}
              value={lens.nodeRoles?.[0] ?? ''}
              onChange={(event) =>
                setLens((current) => ({
                  ...current,
                  nodeRoles: event.target.value ? [event.target.value] : undefined,
                }))
              }
            >
              <option value="">{t('All', 'Todos')}</option>
              {facets.roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('Tags', 'Etiquetas')}
            <select
              aria-label={t('Tag lens', 'Lente de etiquetas')}
              value={lens.tags?.[0] ?? ''}
              onChange={(event) =>
                setLens((current) => ({
                  ...current,
                  tags: event.target.value ? [event.target.value] : undefined,
                }))
              }
            >
              <option value="">{t('All', 'Todos')}</option>
              {facets.tags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </label>
          {document.scene.groups.length > 0 && (
            <label>
              {t('Collapse', 'Colapsar')}
              <select
                aria-label={t('Collapse group', 'Colapsar grupo')}
                defaultValue=""
                ref={collapseSelect}
                onChange={(event) => {
                  const id = event.target.value
                  if (id) {
                    setCollapsed((current) => new Set(current).add(id))
                    if (collapseSelect.current) collapseSelect.current.value = ''
                  }
                }}
              >
                <option value="">{t('None', 'Ninguno')}</option>
                {document.scene.groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {collapsed.size > 0 && (
            <button type="button" onClick={() => setCollapsed(new Set())}>
              {t('Expand all', 'Expandir todo')}
            </button>
          )}
        </div>
      ) : null}
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
      <Presentation
        label={t('Exit presentation', 'Salir de presentación')}
        onExit={() => presentTrigger.current?.focus()}
        trigger={(activate) => (
          <button ref={presentTrigger} type="button" onClick={activate}>
            {t('Present', 'Presentar')}
          </button>
        )}
      >
        <div
          ref={canvasHost}
          className="adl-viewer-canvas"
          role="img"
          aria-label={document.spec.caption}
          onPointerDown={(event) => {
            if (event.target !== event.currentTarget) return
            ;(event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId)
          }}
          onPointerMove={(event) => {
            if (event.buttons !== 1 || event.target !== event.currentTarget) return
            panTo(event)
          }}
        >
          {scene.ok ? (
            <div
              className="adl-viewer-stage"
              style={{
                width: scene.value.layout.width,
                height: scene.value.layout.height,
                transform: `translate(${camera.x - viewWorldSize.width / 2}px, ${camera.y - viewWorldSize.height / 2}px) scale(${camera.zoom})`,
                transformOrigin: '0 0',
              }}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ) : (
            <p className="adl-viewer-note" role="alert">
              {scene.diagnostics.map((diagnostic) => diagnostic.code).join(', ')}
            </p>
          )}
          {scene.ok && collapse && (
            <div
              className="adl-viewer-overlay"
              dangerouslySetInnerHTML={{ __html: overlayMarkup }}
            />
          )}
        </div>
        <div className="adl-viewer-camera">
          <button type="button" onClick={() => zoomBy(1.25)} aria-label={t('Zoom in', 'Acercar')}>
            +
          </button>
          <button
            type="button"
            onClick={() => zoomBy(1 / 1.25)}
            aria-label={t('Zoom out', 'Alejar')}
          >
            −
          </button>
          <button type="button" onClick={fit}>
            {t('Fit', 'Ajustar')}
          </button>
          <span className="adl-viewer-muted" role="status" aria-label={t('Zoom', 'Zoom')}>
            {Math.round(camera.zoom * 100)}%
          </span>
        </div>
      </Presentation>
      {story.length > 0 && (
        <div className="adl-viewer-story" role="group" aria-label={t('Story', 'Historia')}>
          {storyPlaying ? (
            <button type="button" onClick={() => playback.current?.pause()}>
              {t('Pause', 'Pausar')}
            </button>
          ) : (
            <button
              type="button"
              onClick={playStory}
              disabled={reducedMotion}
              title={
                reducedMotion
                  ? t(
                      'Reduced motion: use Next and Previous for static navigation.',
                      'Movimiento reducido: usa Siguiente y Anterior para la navegación estática.',
                    )
                  : undefined
              }
            >
              {t('Play', 'Reproducir')}
            </button>
          )}
          <button type="button" onClick={() => playback.current?.prev()}>
            {t('Previous', 'Anterior')}
          </button>
          <button type="button" onClick={() => playback.current?.next()}>
            {t('Next', 'Siguiente')}
          </button>
          <button type="button" onClick={stopStory}>
            {t('Stop', 'Detener')}
          </button>
          <span role="status">
            {storyIndex >= 0 ? `${storyIndex + 1}/${story.length}` : t('Stopped', 'Detenido')}
          </span>
          {reducedMotion && (
            <span className="adl-viewer-muted">
              {t('Reduced motion: static navigation.', 'Movimiento reducido: navegación estática.')}
            </span>
          )}
        </div>
      )}
      {scene.ok && (
        <Minimap
          svg={svg}
          layoutWidth={scene.value.layout.width}
          layoutHeight={scene.value.layout.height}
          camera={camera}
          viewWorldSize={viewWorldSize}
          onNavigate={(center) => setCamera((current) => ({ ...current, ...center }))}
        />
      )}
      {(summary || query || storyIndex >= 0) && (
        <div className="adl-viewer-querybar">
          <p role="status">
            {storyIndex >= 0 && !query
              ? t(`Story step ${storyIndex + 1}.`, `Paso ${storyIndex + 1} de la historia.`)
              : (summary ?? '')}
          </p>
          {edgeIds.length > 0 && !storyFocus && (
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
            disabled={!query || stale || !scene.ok || !!storyFocus}
            aria-describedby={stale ? 'adl-viewer-stale' : undefined}
          >
            {t('Export query SVG', 'Exportar SVG de la consulta')}
          </button>
          <button
            type="button"
            onClick={() => void exportCardPng()}
            disabled={!query || stale || !scene.ok || !!storyFocus}
          >
            {t('Export card PNG', 'Exportar card PNG')}
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
