import { exportCardSvg, exportDocumentHtmlAsync, exportStoryWebm, type PortableFontOptions } from '@aesthc/diagram-lib/export'
import type { DiagramDocument } from '@aesthc/diagram-lib/editor-core'

/** Supply bundled/local bytes; no exporter fetches a remote font implicitly. */
export async function portableArtifacts(document: DiagramDocument, fonts: NonNullable<PortableFontOptions['fonts']>, runtime: string, css: string, signal: AbortSignal) {
  const options = { fonts, fontPolicy: 'required' as const, signal }
  const svg = await exportCardSvg(document, options)
  const html = await exportDocumentHtmlAsync(document, { ...options, runtime, css })
  // Recording is capability-gated and reduced motion must be forwarded by the host.
  const motion = await exportStoryWebm(document, { ...options, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches })
  return { svg, html, motion }
}
