import type { DiagramDocument, Result } from '../editor-core/types'
import { canonical, failure, success } from '../editor-core/data'
import { validateDocument } from '../editor-core/validation'
import { resolveDocument } from '../editor-core/scene'
import { edgesOf, nodesOf } from '../editor-core/model'
import { renderSvg, escapeXml } from '../render'
import { createCanvasTextMeasurer, estimateTextWidth } from '../geometry/text'
import fontNotices from '../assets/fonts/notices.json'

export interface ExportHtmlOptions {
  /** Minified standalone viewer runtime (dist/standalone/viewer.js). */
  runtime: string
  /** Viewer stylesheet (dist/viewer.css). */
  css: string
  fonts: { sans: Uint8Array; mono: Uint8Array }
  theme?: 'light' | 'dark'
  title?: string
  /** Embed the canonical source JSON for round-trip recovery. */
  includeSource?: boolean
}
export interface ExportHtmlArtifact {
  html: string
  receipt: {
    documentId: string
    revision: number
    mimeType: 'text/html'
    bytes: number
    canonical: boolean
    sourceIncluded: boolean
    verified: false
    runtimeBytes: number
    fontBytes: number
  }
}
function base64(bytes: Uint8Array) {
  let raw = ''
  for (const byte of bytes) raw += String.fromCharCode(byte)
  return btoa(raw)
}
function fontCss(fonts: ExportHtmlOptions['fonts']) {
  return (
    `@font-face{font-family:Geist;src:url(data:font/woff2;base64,${base64(fonts.sans)}) format("woff2")}` +
    `@font-face{font-family:"Geist Mono";src:url(data:font/woff2;base64,${base64(fonts.mono)}) format("woff2")}`
  )
}
/** Embedded JSON never breaks out of its script element. `<` is escaped inside
 * the JSON string, so `</script>` and `<script>` stay data. */
function embedJson(value: unknown) {
  return JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e')
}
function minimalDocument(document: DiagramDocument): DiagramDocument {
  const reduced = structuredClone(document)
  for (const id of Object.keys(reduced.metadata.nodes)) delete reduced.metadata.nodes[id].notes
  delete reduced.metadata.engineeringProfile
  return reduced
}
export function exportDocumentHtml(
  input: DiagramDocument,
  options: ExportHtmlOptions,
): Result<ExportHtmlArtifact> {
  const checked = validateDocument(input)
  if (!checked.ok) return checked
  const document = checked.value
  const theme = options.theme ?? document.presentation.theme.mode
  const resolved = resolveDocument(document, {
    quality: 'edit',
    requestId: 'html',
    measureText: createCanvasTextMeasurer() ?? estimateTextWidth,
  })
  if (!resolved.ok) return resolved
  const svg = renderSvg(document, resolved.value, {
    instanceId: 'standalone',
    theme,
    background: 'theme',
  })
  const nodes = nodesOf(document.spec)
  const edges = edgesOf(document.spec)
  const nodeLabel = (id: string) => nodes.find((node) => node.id === id)?.label ?? id
  const locale = document.locale
  const text = (en: string, es: string) => (locale === 'es' ? es : en)
  const entityList = [
    `<h2>${escapeXml(text('Entities', 'Entidades'))}</h2>`,
    '<ul>',
    ...nodes.map((node) => {
      const description = (node as { description?: string }).description
      return `<li><strong>${escapeXml(node.label)}</strong> <code>${escapeXml(node.id)}</code>${
        node.kind ? ` — ${escapeXml(node.kind)}` : ''
      }${description ? `<p>${escapeXml(description)}</p>` : ''}</li>`
    }),
    '</ul>',
    `<h2>${escapeXml(text('Relations', 'Relaciones'))}</h2>`,
    '<ul>',
    ...edges.map(
      (edge) =>
        `<li><code>${escapeXml(edge.id ?? `${edge.from}→${edge.to}`)}</code>: ${escapeXml(
          nodeLabel(edge.from),
        )} → ${escapeXml(nodeLabel(edge.to))}${edge.label ? ` (${escapeXml(edge.label)})` : ''}</li>`,
    ),
    '</ul>',
  ].join('\n')
  const runtimeDocument = options.includeSource ? document : minimalDocument(document)
  const sourceSection = options.includeSource
    ? `<script type="application/json" id="aesthc-source">${canonical(document).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e')}</script>`
    : ''
  const html = [
    '<!doctype html>',
    `<html lang="${escapeXml(locale)}">`,
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<meta name="color-scheme" content="light dark">',
    "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'\">",
    `<title>${escapeXml(options.title ?? document.spec.caption)}</title>`,
    `<!-- ${escapeXml(fontNotices.join(' '))} -->`,
    `<style>${fontCss(options.fonts)}${options.css}body{margin:0}main{padding:16px}.aesthc-static svg{display:block;max-width:none;height:auto}#aesthc-standalone{min-height:100vh}</style>`,
    '</head>',
    '<body>',
    `<main id="aesthc-fallback" data-theme="${theme}">`,
    `<div class="aesthc-static">${svg}</div>`,
    entityList,
    '</main>',
    '<div id="aesthc-standalone" hidden></div>',
    `<script type="application/json" id="aesthc-document">${embedJson(runtimeDocument)}</script>`,
    sourceSection,
    `<script>${options.runtime}</script>`,
    '</body>',
    '</html>',
  ].join('\n')
  const bytes = new TextEncoder().encode(html).byteLength
  if (bytes > 8 * 1024 * 1024) return failure('export.bytes')
  return success({
    html,
    receipt: {
      documentId: document.id,
      revision: document.revision,
      mimeType: 'text/html',
      bytes,
      canonical: true,
      sourceIncluded: !!options.includeSource,
      verified: false,
      runtimeBytes: new TextEncoder().encode(options.runtime).byteLength,
      fontBytes: options.fonts.sans.byteLength + options.fonts.mono.byteLength,
    },
  })
}
