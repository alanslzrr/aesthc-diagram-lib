/** Font roles shared by scene bounds and quality diagnostics. */
export interface TextRole {
  size: number
  family: 'Geist' | 'Geist Mono'
  tracking?: number
  /** Character-width fraction of the font size used by the conservative fallback. */
  charFactor: number
}

export type TextMeasurer = (text: string, role: TextRole) => number

/**
 * Conservative fallback used when no DOM measurer is available. It never
 * under-reports the authored extent, so bounds and overflow warnings stay
 * honest without a font shaping engine.
 */
export const estimateTextWidth: TextMeasurer = (text, role) => {
  const length = Array.from(text).length
  if (!length) return 0
  return length * role.size * role.charFactor + (length - 1) * (role.tracking ?? 0)
}

/**
 * Real typographic measurement through an offscreen canvas. Returns `undefined`
 * outside a DOM so callers keep the conservative fallback instead of guessing.
 * Widths are only exact once the Geist families are loaded; before that the
 * browser substitutes a fallback face and the result stays a lower bound.
 */
export function createCanvasTextMeasurer(): TextMeasurer | undefined {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function')
    return undefined
  const context = document.createElement('canvas').getContext('2d')
  if (!context) return undefined
  return (text, role) => {
    const length = Array.from(text).length
    if (!length) return 0
    context.font = `${role.size}px ${
      role.family === 'Geist Mono' ? '"Geist Mono", monospace' : 'Geist, sans-serif'
    }`
    return context.measureText(text).width + (length - 1) * (role.tracking ?? 0)
  }
}

function toDataUrl(bytes: Uint8Array): string {
  let raw = ''
  for (const byte of bytes) raw += String.fromCharCode(byte)
  return `data:font/woff2;base64,${btoa(raw)}`
}

export interface FontMeasurer {
  measure: TextMeasurer
  /** Wait until the embedded faces are ready for canvas measurement. */
  ready(): Promise<void>
  /** Remove the scoped @font-face declarations. */
  dispose(): void
}

/**
 * Measures with the exact font bytes that will be embedded in the artifact,
 * registered through a scoped @font-face so the DOM document is not altered
 * permanently. Returns `undefined` outside a DOM. Without this, canvas
 * measurement would use whatever host font happens to be loaded, which may
 * differ from the embedded bytes.
 */
export function createEmbeddedFontTextMeasurer(
  sans: Uint8Array,
  mono: Uint8Array,
): FontMeasurer | undefined {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function')
    return undefined
  const style = document.createElement('style')
  style.textContent = `@font-face{font-family:"Geist";src:url(${toDataUrl(sans)}) format("woff2")}@font-face{font-family:"Geist Mono";src:url(${toDataUrl(mono)}) format("woff2")}`
  document.head.appendChild(style)
  const context = document.createElement('canvas').getContext('2d')
  let disposed = false
  return {
    measure:
      context === null
        ? estimateTextWidth
        : (text, role) => {
            if (disposed) return estimateTextWidth(text, role)
            const length = Array.from(text).length
            if (!length) return 0
            context.font = `${role.size}px ${
              role.family === 'Geist Mono' ? '"Geist Mono", monospace' : 'Geist, sans-serif'
            }`
            return context.measureText(text).width + (length - 1) * (role.tracking ?? 0)
          },
    async ready() {
      if (disposed || typeof document === 'undefined' || !document.fonts) return
      await Promise.allSettled([
        document.fonts.load('16px "Geist"'),
        document.fonts.load('16px "Geist Mono"'),
      ])
    },
    dispose() {
      disposed = true
      style.remove()
    },
  }
}
