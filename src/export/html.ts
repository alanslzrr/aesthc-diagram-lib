import {
  prepareExportFonts,
  type PortableFontOptions,
  type TypographyReceipt,
  type ExportFontContext,
} from './fonts'
import type { DiagramDocument, ResolveRendererRegistry, Result } from '../editor-core/types'
import { canonical, failure, success } from '../editor-core/data'
import { validateDocument } from '../editor-core/validation'
import { resolveDocument } from '../editor-core/scene'
import { edgesOf, nodesOf } from '../editor-core/model'
import { renderSvg, escapeXml } from '../render'
import { projectDocumentMetadata } from './metadata'
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
  /**
   * Portable metadata policy. `minimal` (default) removes undrawn private
   * notes, links/evidence and extensions; `all` keeps authored inspector
   * detail. Independent from `includeSource`, which always embeds the exact
   * canonical document.
   */
  metadata?: 'minimal' | 'all'
  /**
   * Trusted per-instance renderer registry. Custom nodes are frozen into
   * canonical SVG; without a renderer the artifact fails with
   * `renderer.unsupported` instead of shipping a placeholder.
   */
  registry?: ResolveRendererRegistry
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
    metadata: 'minimal' | 'all'
    /** Number of custom nodes frozen into the runtime payload. */
    frozenCustomNodes: number
    verified: false
    runtimeBytes: number
    fontBytes: number
    typography?: TypographyReceipt
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
/** Synchronous SHA-256 (base64) over the exact emitted runtime bytes. */
function sha256Base64(input: string): string {
  const bytes = new TextEncoder().encode(input)
  const h = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]
  const rotr = (value: number, bits: number) => (value >>> bits) | (value << (32 - bits))
  const padded = new Uint8Array(Math.ceil((bytes.length + 9) / 64) * 64)
  padded.set(bytes)
  padded[bytes.length] = 0x80
  const view = new DataView(padded.buffer)
  const bits = bytes.length * 8
  view.setUint32(padded.length - 8, Math.floor(bits / 0x100000000))
  view.setUint32(padded.length - 4, bits >>> 0)
  const w = new Uint32Array(64)
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let index = 0; index < 16; index++) w[index] = view.getUint32(offset + index * 4)
    for (let index = 16; index < 64; index++) {
      const s0 = rotr(w[index - 15], 7) ^ rotr(w[index - 15], 18) ^ (w[index - 15] >>> 3)
      const s1 = rotr(w[index - 2], 17) ^ rotr(w[index - 2], 19) ^ (w[index - 2] >>> 10)
      w[index] = (w[index - 16] + s0 + w[index - 7] + s1) >>> 0
    }
    let [a, b, c, d, e, f, g, hh] = h
    for (let index = 0; index < 64; index++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
      const ch = (e & f) ^ (~e & g)
      const temp1 = (hh + S1 + ch + k[index] + w[index]) >>> 0
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const temp2 = (S0 + maj) >>> 0
      hh = g
      g = f
      f = e
      e = (d + temp1) >>> 0
      d = c
      c = b
      b = a
      a = (temp1 + temp2) >>> 0
    }
    h[0] = (h[0] + a) >>> 0
    h[1] = (h[1] + b) >>> 0
    h[2] = (h[2] + c) >>> 0
    h[3] = (h[3] + d) >>> 0
    h[4] = (h[4] + e) >>> 0
    h[5] = (h[5] + f) >>> 0
    h[6] = (h[6] + g) >>> 0
    h[7] = (h[7] + hh) >>> 0
  }
  const out = new Uint8Array(32)
  const outView = new DataView(out.buffer)
  h.forEach((value, index) => outView.setUint32(index * 4, value))
  let binary = ''
  for (const byte of out) binary += String.fromCharCode(byte)
  return btoa(binary)
}
export function exportDocumentHtml(
  input: DiagramDocument,
  options: ExportHtmlOptions,
): Result<ExportHtmlArtifact> {
  return renderHtml(input, options)
}
function renderHtml(
  input: DiagramDocument,
  options: ExportHtmlOptions,
  context?: ExportFontContext,
): Result<ExportHtmlArtifact> {
  const checked = validateDocument(input)
  if (!checked.ok) return checked
  const document = checked.value
  const theme = options.theme ?? document.presentation.theme.mode
  const resolved = resolveDocument(document, {
    quality: 'edit',
    requestId: 'html',
    theme,
    measureText: context?.measureText ?? createCanvasTextMeasurer() ?? estimateTextWidth,
    renderers: options.registry,
  })
  if (!resolved.ok) return resolved
  const missingRenderer = resolved.diagnostics.find(
    (diagnostic) =>
      diagnostic.code === 'renderer.unsupported' ||
      diagnostic.code === 'renderer.invalid' ||
      diagnostic.code === 'renderer.measure' ||
      diagnostic.code === 'renderer.empty' ||
      diagnostic.code === 'renderer.failed',
  )
  if (missingRenderer) return { ok: false, diagnostics: resolved.diagnostics }
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
  // Custom renderer output is validated and frozen at export time. The runtime
  // payload references each frozen node so the standalone viewer can paint the
  // exact same SVG after boot without shipping executable renderer callbacks.
  const frozen: Record<string, { svg: string; width: number; height: number; typeKey: string }> = {}
  if (document.spec.type === 'graph')
    for (const node of document.spec.nodes) {
      if (!node.renderer) continue
      const placed = resolved.value.layout.nodeById[node.id]
      if (!placed?.customSvg) continue
      frozen[node.id] = {
        svg: placed.customSvg,
        width: placed.w,
        height: placed.h,
        typeKey: node.renderer.typeKey,
      }
    }
  // The runtime document follows the requested appearance and the portable
  // metadata policy; the optional source section keeps the exact canonical
  // original instead, so JS-on and JS-off never disagree about the theme.
  const metadataPolicy = options.metadata ?? 'minimal'
  const runtimeDocument =
    metadataPolicy === 'all'
      ? structuredClone(document)
      : projectDocumentMetadata(document, 'minimal')
  runtimeDocument.presentation.theme.mode = theme
  if (runtimeDocument.spec.type === 'graph')
    for (const node of runtimeDocument.spec.nodes)
      if (node.renderer && frozen[node.id])
        node.renderer = { typeKey: node.renderer.typeKey, data: { __adlFrozen: node.id } }
  const frozenSection =
    Object.keys(frozen).length > 0
      ? `<script type="application/json" id="aesthc-frozen">${embedJson(frozen)}</script>`
      : ''
  const sourceSection = options.includeSource
    ? `<script type="application/json" id="aesthc-source">${canonical(document).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e')}</script>`
    : ''
  const scriptHash = sha256Base64(options.runtime)
  const html = [
    '<!doctype html>',
    `<html lang="${escapeXml(locale)}">`,
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<meta name="color-scheme" content="light dark">',
    `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'sha256-${scriptHash}'; img-src data:; font-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'">`,
    `<title>${escapeXml(options.title ?? document.spec.caption)}</title>`,
    `<!-- ${escapeXml(fontNotices.join(' '))} -->`,
    `<style>${context ? context.css : fontCss(options.fonts)}${options.css}body{margin:0}main{padding:16px}.aesthc-static svg{display:block;max-width:none;height:auto}#aesthc-standalone{min-height:100vh}</style>`,
    '</head>',
    `<body data-font-measurement="${context?.typography.measurement ?? 'legacy'}">`,
    `<main id="aesthc-fallback" data-theme="${theme}">`,
    `<div class="aesthc-static">${svg}</div>`,
    entityList,
    '</main>',
    '<div id="aesthc-standalone" hidden></div>',
    `<script type="application/json" id="aesthc-document">${embedJson(runtimeDocument)}</script>`,
    frozenSection,
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
      metadata: metadataPolicy,
      frozenCustomNodes: Object.keys(frozen).length,
      verified: false,
      runtimeBytes: new TextEncoder().encode(options.runtime).byteLength,
      fontBytes: options.fonts.sans.byteLength + options.fonts.mono.byteLength,
    },
  })
}

/** Exact-font HTML preparation. The synchronous helper remains a legacy measurement path. */
export async function exportDocumentHtmlAsync(
  input: DiagramDocument,
  options: ExportHtmlOptions & PortableFontOptions,
): Promise<Result<ExportHtmlArtifact>> {
  const prepared = await prepareExportFonts({
    ...options,
    fontPolicy: options.fontPolicy ?? 'required',
  })
  if (!prepared.ok) return prepared
  try {
    const result = renderHtml(input, options, prepared.value)
    if (!result.ok) return result
    result.value.receipt.typography = prepared.value.typography
    return success(result.value, prepared.diagnostics)
  } finally {
    prepared.value.dispose()
  }
}
