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
 * Results are cached per (size, family, tracking, text) so repeated scene
 * resolutions during drag gestures do not re-measure every label; the cache is
 * bounded and dropped wholesale when full, never evicting stale widths that
 * could silently change geometry.
 */
export function createCanvasTextMeasurer(): TextMeasurer | undefined {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function')
    return undefined
  const context = document.createElement('canvas').getContext('2d')
  if (!context) return undefined
  const cache = new Map<string, number>()
  const CACHE_LIMIT = 20000
  return (text, role) => {
    const length = Array.from(text).length
    if (!length) return 0
    const key = `${role.size}|${role.family}|${role.tracking ?? 0}|${text}`
    const cached = cache.get(key)
    if (cached !== undefined) return cached
    context.font = `${role.size}px ${
      role.family === 'Geist Mono' ? '"Geist Mono", monospace' : 'Geist, sans-serif'
    }`
    const width = context.measureText(text).width + (length - 1) * (role.tracking ?? 0)
    if (cache.size >= CACHE_LIMIT) cache.clear()
    cache.set(key, width)
    return width
  }
}

function toDataUrl(bytes: Uint8Array): string {
  let raw = ''
  for (const byte of bytes) raw += String.fromCharCode(byte)
  return `data:font/woff2;base64,${btoa(raw)}`
}

export interface FontMeasurer {
  measure: TextMeasurer
  /** True only when the embedded faces actually loaded for measurement. */
  ready(): Promise<boolean>
  /** Remove the scoped @font-face declarations. */
  dispose(): void
}

/**
 * Measures with the exact font bytes that will be embedded in the artifact,
 * registered through a scoped @font-face with per-export family names so the
 * host document and concurrent exports cannot interfere. Returns `undefined`
 * outside a DOM. `ready()` resolves true only when both faces are usable;
 * callers decide how to treat a failed load according to their font policy.
 */
export function createEmbeddedFontTextMeasurer(
  sans: Uint8Array,
  mono: Uint8Array,
): FontMeasurer | undefined {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function')
    return undefined
  const nonce = Math.random().toString(36).slice(2, 10)
  const sansFamily = `adl-export-${nonce}-sans`,
    monoFamily = `adl-export-${nonce}-mono`
  const style = document.createElement('style')
  style.textContent = `@font-face{font-family:"${sansFamily}";src:url(${toDataUrl(sans)}) format("woff2")}@font-face{font-family:"${monoFamily}";src:url(${toDataUrl(mono)}) format("woff2")}`
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
              role.family === 'Geist Mono' ? `"${monoFamily}"` : `"${sansFamily}"`
            }`
            return context.measureText(text).width + (length - 1) * (role.tracking ?? 0)
          },
    async ready() {
      if (disposed || typeof document === 'undefined' || !document.fonts) return false
      const loaded = (family: string) =>
        document.fonts.load(`16px "${family}"`).then(
          () => true,
          () => false,
        )
      const [sansOk, monoOk] = await Promise.all([loaded(sansFamily), loaded(monoFamily)])
      return sansOk && monoOk
    },
    dispose() {
      disposed = true
      style.remove()
    },
  }
}
