import type { Diagnostic, DiagramDocument, EntityRef, Result } from '../editor-core/types'
import { canonical, failure, issue, success } from '../editor-core/data'
import { validateDocument } from '../editor-core/validation'
import { serializeDocument } from '../editor-core/document'
import { getAdapter } from '../editor-core/adapters'
import { pruneReferences } from '../editor-core/commands'
import { resolveDocument } from '../editor-core/scene'
import { renderSvg, escapeXml } from '../render'
import { createCanvasTextMeasurer, createEmbeddedFontTextMeasurer } from '../geometry/text'
import { rasterizeSvg } from './raster'
import fontNotices from '../assets/fonts/notices.json'

export type ExportFormat = 'json' | 'svg' | 'png' | 'jpeg' | 'webp'
export interface ExportOptions {
  format: ExportFormat
  scope: { type: 'document' } | { type: 'selection'; selection: EntityRef[] }
  theme: 'light' | 'dark'
  quality: 'edit' | 'publish'
  background: 'theme' | 'transparent'
  scale: number
  includeSource: boolean
  metadata: 'minimal' | 'all'
  signal?: AbortSignal
  fonts?: { sans: Uint8Array; mono: Uint8Array }
  fontPolicy?: 'required' | 'fallback'
  /** Trusted custom node renderers for documents declaring `renderer` payloads. */
  renderers?: import('../editor-core/types').ResolveRendererRegistry
}
export interface ExportArtifact {
  bytes: Uint8Array
  receipt: {
    documentId: string
    revision: number
    format: ExportFormat
    mimeType: string
    bytes: number
    width?: number
    height?: number
    scope: 'document' | 'selection'
    canonical: boolean
    sourceIncluded: boolean
    verified: boolean
    diagnostics: Diagnostic[]
  }
}
function base64(bytes: Uint8Array) {
  let raw = ''
  for (const byte of bytes) raw += String.fromCharCode(byte)
  return btoa(raw)
}
function fontCss(fonts: NonNullable<ExportOptions['fonts']>): Result<string> {
  for (const bytes of [fonts.sans, fonts.mono])
    if (bytes.length > 512 * 1024 || String.fromCharCode(...bytes.slice(0, 4)) !== 'wOF2')
      return failure('export.font-invalid')
  return success(
    `/* ${escapeXml(fontNotices.join('\n'))} */@font-face{font-family:Geist;src:url(data:font/woff2;base64,${base64(fonts.sans)}) format("woff2")}@font-face{font-family:"Geist Mono";src:url(data:font/woff2;base64,${base64(fonts.mono)}) format("woff2")}`,
  )
}
export async function exportDocument(
  input: DiagramDocument,
  options: ExportOptions,
): Promise<Result<ExportArtifact>> {
  if (options.signal?.aborted) return failure('operation.aborted')
  const checked = validateDocument(input)
  if (!checked.ok) return checked
  const original = structuredClone(checked.value),
    doc = structuredClone(original),
    diagnostics: Diagnostic[] = []
  if (!['json', 'svg', 'png', 'jpeg', 'webp'].includes(options.format))
    return failure('export.format')
  if (
    !['light', 'dark'].includes(options.theme) ||
    !['theme', 'transparent'].includes(options.background) ||
    !['edit', 'publish'].includes(options.quality) ||
    !['minimal', 'all'].includes(options.metadata)
  )
    return failure('export.options')
  if (!Number.isFinite(options.scale) || options.scale <= 0 || options.scale > 8)
    return failure('export.scale')
  if (options.includeSource && !['json', 'svg'].includes(options.format))
    return failure('export.source-format')
  if (options.format === 'jpeg' && options.background === 'transparent')
    return failure('export.alpha')
  if (options.scope.type === 'selection') {
    if (options.format === 'json') return failure('export.scope')
    const selected = new Set(
      options.scope.selection.filter((r) => r.kind === 'node').map((r) => r.id),
    )
    const adapter = getAdapter(doc.spec.type)
    for (const ref of options.scope.selection) {
      if (ref.kind === 'edge') {
        const edge = adapter.edges(doc.spec).find((e) => e.id === ref.id)
        if (!edge) return failure('reference.missing')
        selected.add(edge.from)
        selected.add(edge.to)
      }
      if (ref.kind === 'group') {
        const queue = [ref.id]
        if (!doc.scene.groups.some((g) => g.id === ref.id)) return failure('reference.missing')
        for (let i = 0; i < queue.length; i++) {
          doc.scene.groups.find((g) => g.id === queue[i])?.nodeIds.forEach((id) => selected.add(id))
          doc.scene.groups
            .filter((g) => g.parentGroup === queue[i])
            .forEach((g) => queue.push(g.id))
        }
      }
    }
    const ids = adapter.nodeIds(doc.spec)
    if ([...selected].some((id) => !ids.includes(id))) return failure('reference.missing')
    if (!selected.size) return failure('export.empty-selection')
    const removed = adapter.removeNodes(
      doc.spec,
      ids.filter((id) => !selected.has(id)),
    )
    if (!removed.ok) return removed
    doc.spec = removed.value
    pruneReferences(doc)
  }
  let bytes: Uint8Array, mimeType: string, width: number | undefined, height: number | undefined
  if (options.format === 'json') {
    bytes = new TextEncoder().encode(serializeDocument(doc))
    mimeType = 'application/json'
  } else {
    let fonts = ''
    let measurer: ReturnType<typeof createEmbeddedFontTextMeasurer> | undefined
    if (options.fonts) {
      const result = fontCss(options.fonts)
      if (!result.ok) return result
      fonts = result.value
      measurer = createEmbeddedFontTextMeasurer(options.fonts.sans, options.fonts.mono)
      if (measurer) {
        const embeddedReady = await measurer.ready()
        if (!embeddedReady) {
          measurer.dispose()
          measurer = undefined
          if (options.fontPolicy === 'required') return failure('export.font-missing')
          diagnostics.push({ ...issue('export.font-fallback'), severity: 'warning' })
        }
      }
    } else if (options.fontPolicy === 'fallback')
      diagnostics.push({ ...issue('export.font-fallback'), severity: 'warning' })
    else return failure('export.font-missing')
    const resolved = resolveDocument(doc, {
      quality: options.quality,
      requestId: 'export',
      signal: options.signal,
      measureText: measurer?.measure ?? createCanvasTextMeasurer(),
      renderers: options.renderers,
    })
    measurer?.dispose()
    if (!resolved.ok) return resolved
    diagnostics.push(...resolved.diagnostics)
    if (options.quality === 'publish') {
      const missingRenderer = diagnostics.find(
        (d) =>
          d.code === 'renderer.unsupported' ||
          d.code === 'renderer.invalid' ||
          d.code === 'renderer.measure',
      )
      if (missingRenderer) return failure(missingRenderer.code)
      if (diagnostics.some((d) => d.code.startsWith('quality.'))) return failure('export.quality')
    }
    width = Math.ceil(resolved.value.layout.width * options.scale)
    height = Math.ceil(resolved.value.layout.height * options.scale)
    if (
      !Number.isSafeInteger(width) ||
      !Number.isSafeInteger(height) ||
      width > 16384 ||
      height > 16384 ||
      width * height > 32_000_000
    )
      return failure('export.pixels')
    let svg = renderSvg(doc, resolved.value, {
      instanceId: 'export',
      theme: options.theme,
      background: options.background,
      fontCss: fonts,
    })
    if (options.includeSource) {
      const data = canonical(original)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
      svg = svg.replace(/<\/svg>$/, `<metadata id="aesthc-source">${data}</metadata></svg>`)
    }
    mimeType = options.format === 'svg' ? 'image/svg+xml' : `image/${options.format}`
    if (options.format === 'svg') {
      svg = svg.replace(
        `width="${resolved.value.layout.width}" height="${resolved.value.layout.height}"`,
        `width="${width}" height="${height}"`,
      )
      bytes = new TextEncoder().encode(svg)
    } else {
      const result = await rasterizeSvg(svg, mimeType, width, height, options.signal)
      if (!result.ok) return result
      bytes = result.value
    }
  }
  if (options.signal?.aborted) return failure('operation.aborted')
  return success(
    {
      bytes,
      receipt: {
        documentId: original.id,
        revision: original.revision,
        format: options.format,
        mimeType,
        bytes: bytes.byteLength,
        ...(width === undefined ? {} : { width, height }),
        scope: options.scope.type,
        canonical: options.scope.type === 'document',
        sourceIncluded: options.format === 'json' || options.includeSource,
        verified: false,
        diagnostics,
      },
    },
    diagnostics,
  )
}
export function getExportCapabilities() {
  const browser = typeof window !== 'undefined'
  return {
    svg: true,
    png: browser,
    jpeg: browser,
    webp: browser,
    html: false,
    clipboardText: browser && !!navigator.clipboard?.writeText,
    clipboardPng: browser && typeof ClipboardItem !== 'undefined' && !!navigator.clipboard?.write,
    print: browser,
    webmMimeType: null,
  }
}
export function downloadArtifact(artifact: ExportArtifact, filename: string): Result<void> {
  if (typeof document === 'undefined') return failure('export.environment')
  if (!filename || /[\/\\\x00-\x1f]/.test(filename)) return failure('export.filename')
  const url = URL.createObjectURL(
    new Blob([new Uint8Array(artifact.bytes)], { type: artifact.receipt.mimeType }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return success(undefined)
}
export async function copyArtifact(artifact: ExportArtifact): Promise<Result<void>> {
  if (typeof navigator === 'undefined' || !navigator.clipboard)
    return failure('clipboard.unavailable')
  try {
    if (artifact.receipt.mimeType === 'image/png' && typeof ClipboardItem !== 'undefined')
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': new Blob([new Uint8Array(artifact.bytes)], { type: 'image/png' }),
        }),
      ])
    else if (['application/json', 'image/svg+xml'].includes(artifact.receipt.mimeType))
      await navigator.clipboard.writeText(new TextDecoder().decode(artifact.bytes))
    else return failure('clipboard.format')
    return success(undefined)
  } catch {
    return failure('clipboard.denied')
  }
}
export { exportDocumentHtml } from './html'
export type { ExportHtmlArtifact, ExportHtmlOptions } from './html'
export { CARD_HEIGHT, CARD_WIDTH, cardSvg, exportCard, validateCardQuery } from './cards'
export type { CardArtifact, CardQueryReceipt, CardSvgOptions, ValidatedQuery } from './cards'
export { probeExportCapabilities, supportedFormats } from './capabilities'
export type { ProbedExportCapabilities } from './capabilities'
export { exportStoryWebm, webmCapability } from './motion'
export type { MotionArtifact, MotionOptions } from './motion'
