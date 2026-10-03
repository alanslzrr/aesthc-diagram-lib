// One export pipeline for every host. This module never renders anything by
// itself: it prepares assets, calls the public `@aesthc/diagram-lib/export`
// APIs and reports an accurate receipt or the API's own diagnostics.
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  downloadArtifact,
  exportCard,
  exportDocument,
  exportDocumentHtml,
  exportStoryWebm,
  probeExportCapabilities,
  webmCapability,
} from '@aesthc/diagram-lib/export'
import { getAdapter } from '@aesthc/diagram-lib/editor-core'
import type { DiagramDocument, EntityRef } from '@aesthc/diagram-lib/editor-core'
import sansUrl from '@aesthc/diagram-lib/fonts/geist-sans.woff2?url'
import monoUrl from '@aesthc/diagram-lib/fonts/geist-mono.woff2?url'
// Build-time public assets consumed by the HTML artifact; the site build emits
// them once and the dialog fetches them only when HTML export is requested.
import viewerRuntimeUrl from '../../../dist/standalone/viewer.js?url'
import viewerCssUrl from '../../../dist/viewer.css?url'
import {
  choiceIssues,
  extensionFor,
  isCanonicalFormat,
  type ExportChoice,
  type ExportChoiceFormat,
  type ExportFacts,
  type ExportGateReason,
  type ExportScope,
} from './export-options'

export interface SharedCapabilities {
  png: boolean
  jpeg: boolean
  webp: boolean
  html: boolean
  webm: boolean
  webmMimeType: string | null
}
/** WebP only counts when the browser's encoder really produces a WebP blob;
 * `toDataURL`/`toBlob` output is inspected, never a declared mime type. */
async function verifyWebpEncoding(): Promise<boolean> {
  if (typeof document === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 2
    canvas.height = 2
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp'))
    const encoded = blob !== null && blob.type === 'image/webp'
    canvas.width = 0
    canvas.height = 0
    return encoded
  } catch {
    return false
  }
}
export async function probeSharedCapabilities(): Promise<SharedCapabilities> {
  const base = probeExportCapabilities()
  const webm = webmCapability()
  return {
    png: base.png,
    jpeg: base.jpeg,
    webp: base.webp && (await verifyWebpEncoding()),
    // The runtime and stylesheet ship with this site build; the capability is
    // the browser's ability to fetch and inline them at export time.
    html: typeof fetch === 'function' && typeof TextEncoder !== 'undefined',
    webm: webm.supported,
    webmMimeType: webm.mimeType,
  }
}
export function exportFacts(
  document: DiagramDocument,
  selection: readonly EntityRef[],
  capabilities: SharedCapabilities | null,
  reducedMotion: boolean,
): ExportFacts {
  return {
    raster: {
      png: capabilities?.png ?? false,
      jpeg: capabilities?.jpeg ?? false,
      webp: capabilities?.webp ?? false,
    },
    html: capabilities?.html ?? false,
    webm: capabilities?.webm ?? false,
    storySteps: document.story.length,
    nodeCount: getAdapter(document.spec.type).nodeIds(document.spec).length,
    selectionCount: selection.length,
    reducedMotion,
  }
}
async function fetchBytes(url: string, signal: AbortSignal): Promise<Uint8Array> {
  const response = await fetch(url, { signal })
  if (!response.ok) throw Error(`asset.${response.status}`)
  return new Uint8Array(await response.arrayBuffer())
}
async function fetchText(url: string, signal: AbortSignal): Promise<string> {
  const response = await fetch(url, { signal })
  if (!response.ok) throw Error(`asset.${response.status}`)
  return response.text()
}
function safeFilename(base: string, format: ExportChoiceFormat): string {
  const slug = base
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .slice(0, 80)
  return `${slug || 'diagram'}.${extensionFor(format)}`
}
export type ExportPhase = 'fonts' | 'rendering' | 'encoding'
export interface ExportReceipt {
  format: ExportChoiceFormat
  scope: ExportScope
  revision: number
  bytes: number
  width?: number
  height?: number
  canonical: boolean
  sourceIncluded: boolean
  warnings: string[]
}
export type ExportResult =
  { ok: true; receipt: ExportReceipt } | { ok: false; codes: ExportGateReason[] | string[] }
export interface ExportContext {
  document: DiagramDocument
  selection: readonly EntityRef[]
  signal: AbortSignal
  filenameBase: string
  reducedMotion?: boolean
  /**
   * Effective host appearance for every visual format. Canonical JSON keeps
   * the authored document; the global appearance toggle never touches it.
   */
  appearance?: 'light' | 'dark'
  onPhase?: (phase: ExportPhase) => void
}
function failure(codes: string[]): ExportResult {
  return { ok: false, codes }
}
/**
 * Runs exactly one export. Cancellation is cooperative: every public API call
 * receives the same signal, and an aborted request never reports success or
 * triggers a download.
 */
export async function performExport(
  choice: ExportChoice,
  context: ExportContext,
): Promise<ExportResult> {
  const { document, selection, signal, filenameBase, onPhase } = context
  const codes = choiceIssues(choice, selection.length)
  if (codes.length) return failure(codes)
  if (signal.aborted) return failure(['operation.aborted'])
  const filename = safeFilename(filenameBase, choice.format)
  const theme = context.appearance ?? document.presentation.theme.mode
  const scope: ExportScope = choice.scope
  if (isCanonicalFormat(choice.format)) {
    // Canonical JSON is text-only: fonts are never fetched or embedded.
    let fonts: { sans: Uint8Array; mono: Uint8Array } | undefined
    if (choice.format !== 'json') {
      onPhase?.('fonts')
      try {
        const [sans, mono] = await Promise.all([
          fetchBytes(sansUrl, signal),
          fetchBytes(monoUrl, signal),
        ])
        fonts = { sans, mono }
      } catch {
        if (signal.aborted) return failure(['operation.aborted'])
        if (choice.fontPolicy === 'required') return failure(['export.font-missing'])
      }
    }
    if (signal.aborted) return failure(['operation.aborted'])
    onPhase?.('rendering')
    const result = await exportDocument(document, {
      format: choice.format,
      scope:
        scope === 'selection'
          ? { type: 'selection', selection: [...selection] }
          : { type: 'document' },
      theme,
      quality: choice.quality,
      background: choice.background,
      scale: choice.scale,
      includeSource: choice.includeSource,
      metadata: choice.metadata,
      fonts,
      fontPolicy: choice.fontPolicy,
      signal,
    })
    if (!result.ok) return failure(result.diagnostics.map((diagnostic) => diagnostic.code))
    if (signal.aborted) return failure(['operation.aborted'])
    onPhase?.('encoding')
    const download = downloadArtifact(result.value, filename)
    if (!download.ok) return failure(download.diagnostics.map((diagnostic) => diagnostic.code))
    const receipt = result.value.receipt
    return {
      ok: true,
      receipt: {
        format: choice.format,
        scope,
        revision: receipt.revision,
        bytes: receipt.bytes,
        width: receipt.width,
        height: receipt.height,
        canonical: receipt.canonical,
        sourceIncluded: receipt.sourceIncluded,
        warnings: receipt.diagnostics
          .filter((diagnostic) => diagnostic.severity === 'warning')
          .map((diagnostic) => diagnostic.code),
      },
    }
  }
  if (choice.format === 'html') {
    onPhase?.('fonts')
    let fonts: { sans: Uint8Array; mono: Uint8Array }
    try {
      const [sans, mono] = await Promise.all([
        fetchBytes(sansUrl, signal),
        fetchBytes(monoUrl, signal),
      ])
      fonts = { sans, mono }
    } catch {
      return failure([signal.aborted ? 'operation.aborted' : 'export.font-missing'])
    }
    if (signal.aborted) return failure(['operation.aborted'])
    onPhase?.('rendering')
    let runtime: string, css: string
    try {
      ;[runtime, css] = await Promise.all([
        fetchText(viewerRuntimeUrl, signal),
        fetchText(viewerCssUrl, signal),
      ])
    } catch {
      return failure([signal.aborted ? 'operation.aborted' : 'html.runtime'])
    }
    if (signal.aborted) return failure(['operation.aborted'])
    const result = exportDocumentHtml(document, {
      runtime,
      css,
      fonts,
      theme,
      title: document.spec.caption,
      includeSource: choice.includeSource,
      metadata: choice.metadata,
    })
    if (!result.ok) return failure(result.diagnostics.map((diagnostic) => diagnostic.code))
    onPhase?.('encoding')
    downloadBlob(new Blob([result.value.html], { type: result.value.receipt.mimeType }), filename)
    return {
      ok: true,
      receipt: {
        format: choice.format,
        scope,
        revision: result.value.receipt.revision,
        bytes: result.value.receipt.bytes,
        canonical: result.value.receipt.canonical,
        sourceIncluded: result.value.receipt.sourceIncluded,
        warnings: [],
      },
    }
  }
  if (choice.format === 'card') {
    onPhase?.('rendering')
    const result = await exportCard(document, { theme, signal })
    if (!result.ok) return failure(result.diagnostics.map((diagnostic) => diagnostic.code))
    if (signal.aborted) return failure(['operation.aborted'])
    onPhase?.('encoding')
    const download = downloadArtifact(result.value, filename)
    if (!download.ok) return failure(download.diagnostics.map((diagnostic) => diagnostic.code))
    return {
      ok: true,
      receipt: {
        format: choice.format,
        scope: 'document',
        revision: result.value.receipt.revision,
        bytes: result.value.receipt.bytes,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        canonical: result.value.receipt.canonical,
        sourceIncluded: false,
        warnings: [],
      },
    }
  }
  onPhase?.('rendering')
  const result = await exportStoryWebm(document, {
    signal,
    reducedMotion: context.reducedMotion,
    theme,
  })
  if (!result.ok) return failure(result.diagnostics.map((diagnostic) => diagnostic.code))
  if (signal.aborted) return failure(['operation.aborted'])
  onPhase?.('encoding')
  const receipt = result.value.receipt
  downloadBlob(new Blob([result.value.bytes as BlobPart], { type: receipt.mimeType }), filename)
  return {
    ok: true,
    receipt: {
      format: choice.format,
      scope: 'document',
      revision: receipt.revision,
      bytes: receipt.bytes,
      width: receipt.width,
      height: receipt.height,
      canonical: false,
      sourceIncluded: false,
      warnings: [],
    },
  }
}
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
