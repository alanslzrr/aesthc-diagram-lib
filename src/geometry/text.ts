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
