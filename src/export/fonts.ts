import type { Diagnostic, Result } from '../editor-core/types'
import { failure, issue, success } from '../editor-core/data'
import {
  createCanvasTextMeasurer,
  createEmbeddedFontTextMeasurer,
  estimateTextWidth,
  type TextMeasurer,
} from '../geometry/text'
import { waitForExport } from './wait'
import { escapeXml } from '../render'
import fontNotices from '../assets/fonts/notices.json'

export interface PortableFontOptions {
  fonts?: { sans: Uint8Array; mono: Uint8Array }
  fontPolicy?: 'required' | 'fallback'
  signal?: AbortSignal
}
export interface TypographyReceipt {
  measurement: 'embedded' | 'fallback'
  embedded: boolean
}
export interface ExportFontContext {
  measureText: TextMeasurer
  css: string
  typography: TypographyReceipt
  diagnostics: Diagnostic[]
  dispose(): void
}
function base64(bytes: Uint8Array) {
  let raw = ''
  for (const byte of bytes) raw += String.fromCharCode(byte)
  return btoa(raw)
}
export function embeddedFontCss(fonts: NonNullable<PortableFontOptions['fonts']>): Result<string> {
  for (const bytes of [fonts.sans, fonts.mono])
    if (
      !(bytes instanceof Uint8Array) ||
      bytes.length > 512 * 1024 ||
      String.fromCharCode(...bytes.slice(0, 4)) !== 'wOF2'
    )
      return failure('export.font-invalid')
  return success(
    `/* ${escapeXml(fontNotices.join('\n'))} */@font-face{font-family:Geist;src:url(data:font/woff2;base64,${base64(fonts.sans)}) format("woff2")}@font-face{font-family:"Geist Mono";src:url(data:font/woff2;base64,${base64(fonts.mono)}) format("woff2")}`,
  )
}
/** Per-operation measurement uses isolated families; emitted artifacts use the same bytes. */
export async function prepareExportFonts(
  options: PortableFontOptions,
): Promise<Result<ExportFontContext>> {
  if (options.signal?.aborted) return failure('operation.aborted')
  if (options.fontPolicy !== undefined && !['required', 'fallback'].includes(options.fontPolicy))
    return failure('export.options')
  let css = ''
  if (options.fonts) {
    const validated = embeddedFontCss(options.fonts)
    if (!validated.ok) return validated
    css = validated.value
    const measurer = createEmbeddedFontTextMeasurer(options.fonts.sans, options.fonts.mono)
    if (measurer) {
      try {
        if (await waitForExport(measurer.ready(), options.signal))
          return success({
            measureText: measurer.measure,
            css,
            typography: { measurement: 'embedded', embedded: true },
            diagnostics: [],
            dispose: () => measurer.dispose(),
          })
      } catch (error) {
        measurer.dispose()
        return failure(
          error instanceof Error && error.message === 'operation.aborted'
            ? 'operation.aborted'
            : 'export.timeout',
        )
      }
      measurer.dispose()
    }
  }
  if ((options.fontPolicy ?? 'fallback') === 'required') return failure('export.font-missing')
  const diagnostics = [{ ...issue('export.font-fallback'), severity: 'warning' as const }]
  return success(
    {
      measureText: createCanvasTextMeasurer() ?? estimateTextWidth,
      css: '',
      typography: { measurement: 'fallback', embedded: false },
      diagnostics,
      dispose() {},
    },
    diagnostics,
  )
}
