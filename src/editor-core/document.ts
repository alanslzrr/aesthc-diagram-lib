import { identifyEdges } from '../layout'
import { validateLocalizedDiagram } from '../validation'
import type { DiagramSpec } from '../types'
import type {
  DiagramDocument,
  EditorSpec,
  ImportOptions,
  ImportReceipt,
  Result,
  Presentation,
} from './types'
import { canonical, failure, inspectData, limitsWith, success } from './data'
import { edgesOf, edgeCollection, nodesOf } from './model'
import { validateDocument, validateEditorSpec } from './validation'

export function defaultPresentation(): Presentation {
  return {
    theme: {
      mode: 'light',
      light: {
        background: '#e9eef4',
        foreground: '#202b38',
        card: '#f9fbfd',
        border: '#aebdcd',
        mutedForeground: '#536273',
        cobalt: '#087cbd',
        branch: '#a66b21',
      },
      dark: {
        background: '#070707',
        foreground: '#f2f2ee',
        card: '#101010',
        border: '#242424',
        mutedForeground: '#a8a8a1',
        cobalt: '#14a8ff',
        branch: '#d6a55e',
      },
    },
    grid: { visible: true, snap: true, size: 16 },
    padding: 32,
    legend: 'visible',
    edgeStyle: 'orthogonal',
    textScale: 1,
  }
}
export function createDocument(
  input: EditorSpec,
  options: Pick<ImportOptions, 'id' | 'locale'> & Pick<ImportOptions, 'limits'>,
): Result<DiagramDocument> {
  const checked = validateEditorSpec(input, options.limits)
  if (!checked.ok) return checked
  const spec = structuredClone(checked.value)
  if (spec.type !== 'timeline')
    Object.assign(spec, { [edgeCollection(spec)]: identifyEdges(edgesOf(spec)) })
  const document: DiagramDocument = {
    format: 'aesthc-diagram',
    schemaVersion: 1,
    id: options.id,
    revision: 0,
    locale: options.locale,
    spec,
    scene: {
      mode: 'auto',
      nodes: {},
      routes: {},
      groups: [],
      zOrder: nodesOf(spec).map((n) => n.id),
    },
    presentation: defaultPresentation(),
    metadata: { nodes: {}, edges: {}, visuals: {} },
    views: [],
    story: [],
    extensions: {},
  }
  return validateDocument(document, options.limits)
}
export function importDocument(input: unknown, options: ImportOptions): Result<ImportReceipt> {
  const limits = limitsWith(options.limits)
  if (typeof input === 'string') {
    if (new TextEncoder().encode(input).length > limits.maxBytes) return failure('limit.bytes')
    try {
      input = JSON.parse(input)
    } catch {
      return failure('data.json')
    }
  }
  const unsafe = inspectData(input, limits)
  if (unsafe.length) return { ok: false, diagnostics: unsafe }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return failure('data.type')
  const record = input as Record<string, unknown>
  if ('format' in record || 'schemaVersion' in record) {
    const result = validateDocument(record, limits)
    return result.ok
      ? success({
          document: structuredClone(result.value),
          source: 'document-v1',
          materializedEdgeIds: [],
        })
      : result
  }
  let source: ImportReceipt['source'] = 'spec'
  let omittedLocale: ImportReceipt['omittedLocale']
  if ('en' in record || 'es' in record) {
    if (Object.keys(record).some((key) => key !== 'en' && key !== 'es'))
      return failure('schema.additionalProperties')
    const localized = validateLocalizedDiagram(record)
    if (!localized.success)
      return failure('locale.invalid', '/', localized.issues.map((i) => i.message).join('; '))
    input = localized.data[options.locale]
    source = 'localized'
    omittedLocale = options.locale === 'en' ? 'es' : 'en'
  } else if (!('type' in record)) {
    if (!options.allowLegacyBand) return failure('legacy.disabled')
    input = { ...record, type: 'band' }
    source = 'legacy-band'
  }
  const created = createDocument(input as EditorSpec, options)
  if (!created.ok) return created
  const originalEdges = edgesOf(input as EditorSpec)
  const materializedEdgeIds = edgesOf(created.value.spec).flatMap((edge, index) =>
    originalEdges[index].id === undefined ? [{ index, id: edge.id! }] : [],
  )
  return success({
    document: created.value,
    source,
    materializedEdgeIds,
    ...(omittedLocale ? { omittedLocale } : {}),
  })
}
export function serializeDocument(document: DiagramDocument): string {
  const result = validateDocument(document)
  if (!result.ok) throw new TypeError(result.diagnostics.map((d) => d.code).join(', '))
  return canonical(result.value)
}
/** Revision is a concurrency token, not authored content or the dirty-state baseline. */
export function canonicalizeContent(document: DiagramDocument): string {
  return canonical({ ...document, revision: 0 })
}
export interface LegacySpecExport {
  spec: DiagramSpec
  losses: Array<{ path: string; reason: string }>
}
function nonEmptyScene(document: DiagramDocument): Array<{ path: string; reason: string }> {
  const scene = document.scene,
    losses: Array<{ path: string; reason: string }> = []
  if (scene.mode !== 'auto')
    losses.push({ path: '/scene/mode', reason: 'legacy spec has no scene mode' })
  if (Object.keys(scene.nodes).length)
    losses.push({
      path: '/scene/nodes',
      reason: 'authored positions are not part of a legacy spec',
    })
  if (Object.keys(scene.routes).length)
    losses.push({ path: '/scene/routes', reason: 'manual routes are not part of a legacy spec' })
  if (scene.groups.length)
    losses.push({ path: '/scene/groups', reason: 'groups are not part of a legacy spec' })
  return losses
}
/**
 * The legacy DiagramSpec export keeps explicit edge identities but cannot carry
 * scene geometry, presentation, metadata, views, story or extensions. The receipt
 * lists exactly the non-default content a legacy consumer would lose; the input
 * document is never mutated. Graph documents have no legacy spec shape; use the
 * reverse `convertToGraph` when bridging in the other direction.
 */
export function exportLegacySpec(document: DiagramDocument): Result<LegacySpecExport> {
  const checked = validateDocument(document)
  if (!checked.ok) return checked
  if (checked.value.spec.type === 'graph')
    return failure(
      'conversion.unsupported',
      '/spec',
      'graph has no legacy spec export; convert explicitly instead',
    )
  const losses: Array<{ path: string; reason: string }> = []
  for (const loss of nonEmptyScene(checked.value)) losses.push(loss)
  if (JSON.stringify(checked.value.presentation) !== JSON.stringify(defaultPresentation()))
    losses.push({
      path: '/presentation',
      reason: 'theme, grid and text scale are not part of a legacy spec',
    })
  if (
    Object.keys(checked.value.metadata.nodes).length ||
    Object.keys(checked.value.metadata.edges).length ||
    Object.keys(checked.value.metadata.visuals).length
  )
    losses.push({
      path: '/metadata',
      reason: 'node, edge and visual metadata are not part of a legacy spec',
    })
  if (checked.value.views.length)
    losses.push({ path: '/views', reason: 'named views are not part of a legacy spec' })
  if (checked.value.story.length)
    losses.push({ path: '/story', reason: 'story steps are not part of a legacy spec' })
  if (Object.keys(checked.value.extensions).length)
    losses.push({ path: '/extensions', reason: 'extensions are not part of a legacy spec' })
  if (checked.value.revision !== 0)
    losses.push({ path: '/revision', reason: 'the legacy export does not carry a revision token' })
  losses.push({ path: '/locale', reason: 'the legacy export is not localized' })
  return success({ spec: structuredClone(checked.value.spec) as DiagramSpec, losses })
}
