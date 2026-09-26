import type { DiagramDocument, ResolvedScene } from '../editor-core/types'
import type { GraphSnapshot, ReachResult, RouteResult } from '../graph'
import { renderSvg } from '../render'
import { canonical } from '../editor-core/data'

export interface ViewerQueryState {
  kind: 'route' | 'reach'
  origin: string
  destination?: string
  direction?: 'upstream' | 'downstream'
  result: RouteResult | ReachResult
}
export function queryReceipt(query: ViewerQueryState) {
  return {
    documentId: query.result.documentId,
    revision: query.result.revision,
    ...(query.result.filter ? { filter: query.result.filter } : {}),
  }
}
/** A receipt is bound to the document identity; any change invalidates it. */
export function isQueryStale(query: ViewerQueryState | null, document: DiagramDocument): boolean {
  if (!query) return false
  return query.result.documentId !== document.id || query.result.revision !== document.revision
}
export function queryHighlight(query: ViewerQueryState | null) {
  if (!query) return undefined
  return {
    nodes: new Set(query.result.nodeIds),
    edges: new Set(query.result.edgeIds),
  }
}
export function queryEdgeIds(query: ViewerQueryState | null): string[] {
  if (!query) return []
  return [...query.result.edgeIds]
}
/** Fixed 2048x2048-independent style for the exported SVG: exact IDs only. */
export function highlightStyle(accent: string): string {
  return (
    `<style>[data-query-highlight="true"]>rect,[data-query-highlight="true"]>circle{stroke:${accent};stroke-width:2.5}` +
    `[data-query-highlight="true"]>text{fill:${accent}}` +
    `[data-query-highlight="true"]>path{stroke:${accent} !important;stroke-width:3}</style>`
  )
}
export interface ExportQuerySvgOptions {
  theme: 'light' | 'dark'
  includeSource?: boolean
}
export function exportQuerySvg(
  document: DiagramDocument,
  scene: ResolvedScene,
  query: ViewerQueryState,
  options: ExportQuerySvgOptions,
): string {
  const accent = document.presentation.theme[options.theme].cobalt
  let svg = renderSvg(document, scene, {
    instanceId: 'viewer-export',
    theme: options.theme,
    background: 'theme',
    highlight: queryHighlight(query),
  })
  svg = svg.replace(/<\/svg>$/, `${highlightStyle(accent)}</svg>`)
  if (options.includeSource) {
    const data = canonical(document)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
    svg = svg.replace(/<\/svg>$/, `<metadata id="aesthc-source">${data}</metadata></svg>`)
  }
  return svg
}
export function querySummary(
  query: ViewerQueryState | null,
  graph: GraphSnapshot,
  t: (en: string, es: string) => string,
): string | null {
  if (!query) return null
  const labelOf = (id: string) => graph.nodes.find((node) => node.id === id)?.label ?? id
  if (query.kind === 'route') {
    const result = query.result as RouteResult
    if (result.status === 'unreachable')
      return t(
        `No route from ${labelOf(query.origin)} to ${labelOf(query.destination ?? '')}.`,
        `Sin ruta de ${labelOf(query.origin)} a ${labelOf(query.destination ?? '')}.`,
      )
    return t(
      `Route ${labelOf(query.origin)} → ${labelOf(query.destination ?? '')}: ${result.nodeIds.length} nodes, ${result.edgeIds.length} edges.`,
      `Ruta ${labelOf(query.origin)} → ${labelOf(query.destination ?? '')}: ${result.nodeIds.length} nodos, ${result.edgeIds.length} relaciones.`,
    )
  }
  const result = query.result as ReachResult
  const truncated = result.truncated ? t(' truncated.', ', truncado.') : '.'
  return t(
    `Reach from ${labelOf(query.origin)} ${result.direction}: ${result.nodeIds.length} nodes, ${result.edgeIds.length} edges${truncated}`,
    `Alcance desde ${labelOf(query.origin)} ${result.direction === 'upstream' ? 'ascendente' : 'descendente'}: ${result.nodeIds.length} nodos, ${result.edgeIds.length} relaciones${truncated}`,
  )
}
