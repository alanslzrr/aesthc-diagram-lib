import type { DiagramDocument, Result } from '../editor-core/types'
import { failure, success } from '../editor-core/data'
import { validateDocument } from '../editor-core/validation'
import { resolveDocument } from '../editor-core/scene'
import { renderSceneMarkup, escapeXml } from '../render'
import { createCanvasTextMeasurer, estimateTextWidth } from '../geometry/text'
import { edgesOf, nodesOf } from '../editor-core/model'
import { rasterizeSvg } from './raster'

export const CARD_WIDTH = 1200
export const CARD_HEIGHT = 630
/** Receipt carried by the query that produced the card. Stale or altered
 * receipts are rejected: a card never exports a highlight from another
 * revision, and canonical cards never carry highlights. */
export interface CardQueryReceipt {
  documentId: string
  revision: number
  nodeIds: string[]
  edgeIds: string[]
  label?: string
}
export interface CardSvgOptions {
  query?: CardQueryReceipt
  theme?: 'light' | 'dark'
  padding?: number
}
export interface CardArtifact {
  bytes: Uint8Array
  receipt: {
    documentId: string
    revision: number
    format: 'png'
    mimeType: 'image/png'
    bytes: number
    width: number
    height: number
    scope: 'document'
    canonical: boolean
    sourceIncluded: false
    verified: false
    diagnostics: []
  }
}
export interface ValidatedQuery {
  nodes: Set<string>
  edges: Set<string>
  label: string
}
export function validateCardQuery(
  document: DiagramDocument,
  query?: CardQueryReceipt,
): Result<ValidatedQuery | null> {
  if (!query) return success(null)
  if (query.documentId !== document.id || query.revision !== document.revision)
    return failure('query.stale')
  if (query.nodeIds.length === 0 && query.edgeIds.length === 0) return failure('query.invalid')
  const nodeIds = new Set(nodesOf(document.spec).map((node) => node.id))
  const edgeIds = new Set(edgesOf(document.spec).map((edge) => edge.id!))
  if (query.nodeIds.some((id) => !nodeIds.has(id))) return failure('reference.missing')
  if (query.edgeIds.some((id) => !edgeIds.has(id))) return failure('reference.missing')
  return success({
    nodes: new Set(query.nodeIds),
    edges: new Set(query.edgeIds),
    label: query.label ?? '',
  })
}
/** Full-diagram card at a fixed 1200x630 canvas. The whole graph is fitted;
 * the query receipt only marks exact node and edge ids (parallels included). */
export function cardSvg(
  input: DiagramDocument,
  options: CardSvgOptions = {},
): Result<{ svg: string; canonical: boolean }> {
  const checked = validateDocument(input)
  if (!checked.ok) return checked
  const document = checked.value
  const query = validateCardQuery(document, options.query)
  if (!query.ok) return query
  const theme = options.theme ?? document.presentation.theme.mode
  const palette = document.presentation.theme[theme]
  const resolved = resolveDocument(document, {
    quality: 'edit',
    requestId: 'card',
    measureText: createCanvasTextMeasurer() ?? estimateTextWidth,
  })
  if (!resolved.ok) return resolved
  const layout = resolved.value.layout
  const padding = options.padding ?? 40
  const scale = Math.min(
    (CARD_WIDTH - padding * 2) / layout.width,
    (CARD_HEIGHT - padding * 2) / layout.height,
  )
  const tx = (CARD_WIDTH - layout.width * scale) / 2
  const ty = (CARD_HEIGHT - layout.height * scale) / 2
  const markup = renderSceneMarkup(document, resolved.value, {
    instanceId: 'card',
    theme,
    highlight: query.value ? { nodes: query.value.nodes, edges: query.value.edges } : undefined,
  })
  const highlightStyle = query.value
    ? `<style>[data-query-highlight="true"]>rect,[data-query-highlight="true"]>circle{stroke:${palette.cobalt};stroke-width:2.5}[data-query-highlight="true"]>text{fill:${palette.cobalt}}[data-query-highlight="true"]>path{stroke:${palette.cobalt} !important;stroke-width:3}</style>`
    : ''
  const caption = query.value?.label
    ? `<text x="${padding}" y="${padding - 12}" font-family="Geist, sans-serif" font-size="16" fill="${palette.mutedForeground}">${escapeXml(query.value.label)}</text>`
    : ''
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeXml(document.spec.caption)}">` +
    `<title>${escapeXml(document.spec.caption)}</title>${highlightStyle}` +
    `<rect width="100%" height="100%" fill="${palette.background}"/>${caption}` +
    `<g transform="translate(${tx} ${ty}) scale(${scale})"><g transform="translate(${resolved.value.origin.x} ${resolved.value.origin.y})">${markup}</g></g>` +
    `</svg>`
  return success({ svg, canonical: !query.value })
}
/** Raster card at the fixed 1200x630 size. Rasterization failures keep their
 * precise code; no fallback renames one format as another. */
export async function exportCard(
  input: DiagramDocument,
  options: CardSvgOptions & { signal?: AbortSignal } = {},
): Promise<Result<CardArtifact>> {
  const svg = cardSvg(input, options)
  if (!svg.ok) return svg
  const bytes = await rasterizeSvg(
    svg.value.svg,
    'image/png',
    CARD_WIDTH,
    CARD_HEIGHT,
    options.signal,
  )
  if (!bytes.ok) return bytes
  return success({
    bytes: bytes.value,
    receipt: {
      documentId: input.id,
      revision: input.revision,
      format: 'png',
      mimeType: 'image/png',
      bytes: bytes.value.byteLength,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      scope: 'document',
      canonical: svg.value.canonical,
      sourceIncluded: false,
      verified: false,
      diagnostics: [],
    },
  })
}
