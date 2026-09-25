import { getExportCapabilities } from './index'
import type { ExportFormat } from './index'

export interface ProbedExportCapabilities {
  png: boolean
  jpeg: boolean
  webp: boolean
  html: boolean
  clipboardText: boolean
  clipboardPng: boolean
  print: boolean
  webmMimeType: string | null
}
/**
 * Real capability probe: WebP is verified by encoding, not by assuming the
 * browser honors the request; unsupported formats are reported so callers can
 * disable them instead of renaming a PNG or silently changing the background.
 */
export function probeExportCapabilities(): ProbedExportCapabilities {
  const base = getExportCapabilities()
  let webp = false
  if (typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 2
      canvas.height = 2
      webp = canvas.toDataURL('image/webp').startsWith('data:image/webp')
      canvas.width = 0
      canvas.height = 0
    } catch {
      webp = false
    }
  }
  return {
    png: base.png,
    jpeg: base.jpeg,
    webp,
    html: base.html,
    clipboardText: base.clipboardText,
    clipboardPng: base.clipboardPng,
    print: base.print,
    webmMimeType: base.webmMimeType,
  }
}
export function supportedFormats(capabilities: ProbedExportCapabilities): ExportFormat[] {
  return [
    'json',
    'svg',
    ...(capabilities.png ? (['png'] as const) : []),
    ...(capabilities.jpeg ? (['jpeg'] as const) : []),
    ...(capabilities.webp ? (['webp'] as const) : []),
  ]
}
