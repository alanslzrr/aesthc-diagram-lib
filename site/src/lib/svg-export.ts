// Standalone SVG export: clones the live canvas and inlines the computed
// presentation of every element, so the file opens with the page's exact
// palette anywhere — no Tailwind classes, no CSS variables required.

const PRESENTATION_ATTRS = [
  'fill',
  'fill-opacity',
  'stroke',
  'stroke-opacity',
  'stroke-width',
  'stroke-dasharray',
  'stroke-linecap',
  'stroke-linejoin',
  'opacity',
  'font-family',
  'font-size',
  'font-weight',
  'letter-spacing',
  'text-anchor',
] as const

/** Properties that only work from a style attribute (not presentation attrs). */
const STYLE_PROPS = ['text-transform', 'filter'] as const

export function serializeDiagramSvg(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement
  const sourceNodes = svg.querySelectorAll<SVGElement>('*')
  const cloneNodes = clone.querySelectorAll<SVGElement>('*')

  sourceNodes.forEach((source, index) => {
    const target = cloneNodes[index]
    if (!target) return
    if (source instanceof SVGDefsElement || source.closest('defs')) return
    const computed = window.getComputedStyle(source)

    // Theme-variant icons (adl-icon-light/dark) rely on display:none — keep
    // hidden branches hidden in the export.
    if (computed.display === 'none') {
      target.setAttribute('display', 'none')
      target.removeAttribute('class')
      return
    }

    for (const property of PRESENTATION_ATTRS) {
      const value = computed.getPropertyValue(property)
      if (!value || value === 'normal' || value === 'auto') continue
      if (value === 'none' && property !== 'fill' && property !== 'stroke') continue
      target.setAttribute(property, value)
    }

    const styleParts: string[] = []
    for (const property of STYLE_PROPS) {
      const value = computed.getPropertyValue(property)
      if (value && value !== 'none' && value !== 'normal') {
        styleParts.push(`${property}: ${value}`)
      }
    }
    if (styleParts.length > 0) target.setAttribute('style', styleParts.join('; '))
    else target.removeAttribute('style')

    target.removeAttribute('class')
  })

  // Resolve the CSS variables that defs (gradients, patterns, markers) use.
  const styles = window.getComputedStyle(svg)
  const resolveVars = (markup: string): string => {
    const resolveOne = (expression: string): string =>
      expression.replaceAll(
        /var\((--[\w-]+)\s*(?:,\s*([^()]*|[^()]*\([^()]*\)[^()]*))?\)/g,
        (match, name: string, fallback?: string) => {
          const value = styles.getPropertyValue(name).trim()
          if (value) return value
          if (fallback) return resolveOne(fallback.trim())
          return match
        },
      )
    // Two passes cover nested var() fallbacks.
    return resolveOne(resolveOne(markup))
  }

  clone.removeAttribute('class')
  clone.removeAttribute('style')
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  const viewBox = svg.viewBox.baseVal
  clone.setAttribute('width', String(viewBox.width))
  clone.setAttribute('height', String(viewBox.height))

  // Solid page background so the export reads on any surface.
  const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  background.setAttribute('width', String(viewBox.width))
  background.setAttribute('height', String(viewBox.height))
  background.setAttribute('fill', window.getComputedStyle(document.body).backgroundColor)
  clone.insertBefore(background, clone.firstChild)

  const markup = new XMLSerializer().serializeToString(clone)
  return `<?xml version="1.0" encoding="UTF-8"?>\n${resolveVars(markup)}`
}

export function downloadDiagramSvg(svg: SVGSVGElement, filename: string): void {
  const markup = serializeDiagramSvg(svg)
  const blob = new Blob([markup], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 4000)
}
