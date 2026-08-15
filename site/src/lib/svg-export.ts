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

// ── Font embedding ───────────────────────────────────────────────────────────
// An exported SVG opened outside this page (or rasterized through <img>)
// cannot reach webfonts, so downloads inline the latin Sora + Geist Mono
// faces as data: URIs. Fetched once per session.

let fontCssPromise: Promise<string> | null = null

function embeddedFontCss(): Promise<string> {
  if (!fontCssPromise) {
    fontCssPromise = (async () => {
      // The fonts are self-hosted (same origin), declared via @font-face in
      // the page stylesheets — read the rules the browser already parsed.
      const faces: Array<{ css: string; url: string }> = []
      for (const sheet of document.styleSheets) {
        let rules: CSSRuleList
        try {
          rules = sheet.cssRules
        } catch {
          continue
        }
        for (const rule of rules) {
          if (!(rule instanceof CSSFontFaceRule)) continue
          const family = rule.style.getPropertyValue('font-family')
          if (!/Sora|Geist Mono/.test(family)) continue
          const source = rule.style.getPropertyValue('src')
          const match = source.match(/url\("?([^")]+\.woff2)"?\)/)
          if (!match) continue
          faces.push({
            css: rule.cssText,
            url: new URL(match[1], sheet.href ?? window.location.href).href,
          })
        }
      }

      const embedded: string[] = []
      for (const face of faces) {
        const buffer = await (await fetch(face.url)).arrayBuffer()
        const bytes = new Uint8Array(buffer)
        let binary = ''
        for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i])
        embedded.push(
          face.css.replace(
            /url\("?[^")]+\.woff2"?\)/,
            `url(data:font/woff2;base64,${btoa(binary)})`,
          ),
        )
      }
      return embedded.join('\n')
    })().catch(() => '')
  }
  return fontCssPromise
}

/** Serialized markup with the page fonts inlined — fully standalone. */
export async function serializeDiagramSvgStandalone(svg: SVGSVGElement): Promise<string> {
  const markup = serializeDiagramSvg(svg)
  const fontCss = await embeddedFontCss()
  if (!fontCss) return markup
  return markup.replace(/(<svg[^>]*>)/, `$1<style>${fontCss}</style>`)
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export async function downloadDiagramSvg(svg: SVGSVGElement, filename: string): Promise<void> {
  const markup = await serializeDiagramSvgStandalone(svg)
  triggerDownload(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }), filename)
}

/** Rasterizes the standalone SVG through an offscreen canvas. */
export async function downloadDiagramPng(
  svg: SVGSVGElement,
  filename: string,
  scale = 2,
): Promise<void> {
  const markup = await serializeDiagramSvgStandalone(svg)
  const svgUrl = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('svg rasterization failed'))
      image.src = svgUrl
    })
    const viewBox = svg.viewBox.baseVal
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(viewBox.width * scale)
    canvas.height = Math.round(viewBox.height * scale)
    const context = canvas.getContext('2d')
    if (!context) return
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (png) triggerDownload(png, filename)
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(svgUrl), 4000)
  }
}
