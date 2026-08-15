// Standalone SVG export: clones the live canvas and inlines the computed
// presentation of every element, so the file opens with the page's exact
// palette anywhere — no Tailwind classes, no CSS variables required.

const PRESENTATION_PROPS = [
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
  'text-transform',
  'display',
] as const

export function serializeDiagramSvg(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement
  const sourceNodes = svg.querySelectorAll<SVGElement>('*')
  const cloneNodes = clone.querySelectorAll<SVGElement>('*')

  sourceNodes.forEach((source, index) => {
    const target = cloneNodes[index]
    if (!target) return
    if (source instanceof SVGDefsElement || source.closest('defs')) return
    const computed = window.getComputedStyle(source)
    for (const property of PRESENTATION_PROPS) {
      const value = computed.getPropertyValue(property)
      if (!value || value === 'none' || value === 'normal' || value === 'auto') {
        if (property === 'fill' || property === 'stroke') {
          if (value === 'none') target.setAttribute(property, 'none')
        }
        continue
      }
      target.setAttribute(property, value)
    }
    target.removeAttribute('class')
  })

  // Resolve the CSS variables that defs (gradients, patterns, markers) use.
  const styles = window.getComputedStyle(svg)
  const resolveVars = (markup: string): string =>
    markup.replaceAll(/var\((--[a-z-]+)(?:,\s*var\((--[a-z-]+)\))?\)/g, (match, name, fallbackName) => {
      const value =
        styles.getPropertyValue(name).trim() ||
        (fallbackName ? styles.getPropertyValue(fallbackName).trim() : '')
      return value || match
    })

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

  return `<?xml version="1.0" encoding="UTF-8"?>\n${resolveVars(clone.outerHTML)}`
}

export function downloadDiagramSvg(svg: SVGSVGElement, filename: string): void {
  const markup = serializeDiagramSvg(svg)
  const blob = new Blob([markup], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
