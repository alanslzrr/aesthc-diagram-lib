import type { DiagramDocument, ResolvedScene } from '../editor-core/types'
import { nodeGeometry, tableFieldGeometry } from '../geometry/node'
import { renderNodeIcon } from './icons'
import { semanticIconLicense, brandIconNotices } from '../brand-icons/semantic-data'
import { DOT_R, NODE_ICON_SIZE } from '../theme'
/** Only this encoder writes authored strings into SVG/XML. */
export const escapeXml = (text: string) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
export interface RenderOptions {
  theme?: 'light' | 'dark'
  background?: 'theme' | 'transparent'
  instanceId: string
  fontCss?: string
}
export function renderSceneMarkup(
  document: DiagramDocument,
  scene: ResolvedScene,
  options: RenderOptions,
): string {
  const p = document.presentation.theme[options.theme ?? document.presentation.theme.mode],
    l = scene.layout
  const id = Array.from(options.instanceId, (c) => c.codePointAt(0)!.toString(16)).join('-') || '0'
  const color = (variant?: string) => (variant === 'branch' ? p.branch : p.cobalt)
  const text = (
    x: number,
    y: number,
    value: string,
    size = 13,
    fill = p.foreground,
    anchor = 'start',
    family = 'Geist',
  ) =>
    `<text x="${x}" y="${y}" font-family="${family}, sans-serif" font-size="${size * document.presentation.textScale}" fill="${fill}" text-anchor="${anchor}">${escapeXml(value)}</text>`
  let out = `<defs><marker id="arrow-${id}" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M1 1L7 4L1 7" fill="none" stroke="context-stroke"/></marker><pattern id="grid-${id}" width="${document.presentation.grid.size}" height="${document.presentation.grid.size}" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.7" fill="${p.border}"/></pattern></defs>`
  if (document.presentation.grid.visible)
    out += `<rect x="${scene.worldBounds.x}" y="${scene.worldBounds.y}" width="${scene.worldBounds.width}" height="${scene.worldBounds.height}" fill="url(#grid-${id})"/>`
  for (const c of l.containers ?? [])
    out += `<g><rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="4" fill="${p.background}" stroke="${p.border}"/>${text(c.x + 12, c.y + 20, c.label, 12, p.mutedForeground)}</g>`
  for (const line of l.lifelines ?? [])
    out += `<path d="M${line.x} ${line.y0}V${line.y1}" fill="none" stroke="${p.border}" stroke-dasharray="4 4"/>`
  for (const e of l.edges) {
    out += `<g data-edge-id="${escapeXml(e.id)}"><path d="${escapeXml(e.d)}" fill="none" stroke="${color(e.variant)}" stroke-width="${e.strokeWidth ?? 1.5}"${e.dashed ? ' stroke-dasharray="5 4"' : ''}${e.arrowEnd ? ` marker-end="url(#arrow-${id})"` : ''}/>`
    if (e.label)
      out += `<rect x="${e.labelX - e.labelWidth / 2}" y="${e.labelY - 12}" width="${e.labelWidth}" height="22" rx="4" fill="${p.card}" stroke="${p.border}"/>${text(e.labelX, e.labelY + 3, e.label, 11, p.foreground, 'middle', 'Geist Mono')}`
    out += '</g>'
  }
  for (const c of l.continuations)
    out += `<path d="${escapeXml(c.d)}" fill="none" stroke="${color(c.variant)}"/>${text(c.labelX, c.labelY, c.displayLabel, 11, p.mutedForeground, 'middle')}`
  for (const d of l.decisions)
    out += text(d.x + d.width / 2, d.y + 14, d.label, 11, p.mutedForeground, 'middle')

  for (const n of l.nodes) {
    const visual = document.metadata.visuals[n.id]
    const g = nodeGeometry(n, !!visual)
    out += `<g data-node-id="${escapeXml(n.id)}"><title>${escapeXml(n.label)}</title><desc>${escapeXml(n.description ?? '')}</desc>`
    if (n.shape === 'bar') {
      out += `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="2" fill="${color(n.weight === 'primary' ? 'main' : 'branch')}" fill-opacity=".22" stroke="${p.border}"/></g>`
      continue
    }
    if (n.shape === 'event') {
      const stroke = color(n.weight === 'primary' ? 'main' : 'branch')
      out += `<line x1="${n.cx}" y1="${n.cy}" x2="${n.cx}" y2="${g.connectorEnd}" stroke="${stroke}" stroke-dasharray="2 4"/><circle cx="${n.cx}" cy="${n.cy}" r="${DOT_R}" fill="${p.background}" stroke="${stroke}"/><circle cx="${n.cx}" cy="${n.cy}" r="${DOT_R / 2.6}" fill="${stroke}"/>`
      if (n.kind) out += text(n.cx, n.y - 24, n.kind, 10, p.mutedForeground, 'middle', 'Geist Mono')
      out += `<text data-node-label="true" x="${n.cx}" y="${n.y}" text-anchor="middle" font-family="Geist, sans-serif" font-size="${13.5 * document.presentation.textScale}" fill="${p.foreground}">${escapeXml(n.label)}</text>`
      if (n.sublabel)
        out += text(n.cx, n.y + 18, n.sublabel, 10.5, p.mutedForeground, 'middle', 'Geist Mono')
      out += '</g>'
      continue
    }
    if (n.weight === 'muted' && n.shape !== 'table')
      out += `<line x1="${n.x}" y1="${n.y + n.h}" x2="${n.x + n.w}" y2="${n.y + n.h}" stroke="${p.border}"/>`
    else
      out += `<rect data-node-surface="true" x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="${g.radius}" fill="${p.card}" stroke="${p.border}"/>`
    if (visual) {
      const nodeId = Array.from(n.id, (c) => c.codePointAt(0)!.toString(16)).join('-')
      out += renderNodeIcon(
        visual,
        `icon-${id}-${nodeId}`,
        n.x + 15,
        n.cy - NODE_ICON_SIZE / 2,
        NODE_ICON_SIZE,
        options.theme ?? document.presentation.theme.mode,
        p.foreground,
      )
    }
    if (n.shape === 'table') {
      out += text(n.x + 14, n.y + 17.5, n.label, 13)
      for (const [index, field] of (n.fields ?? []).entries()) {
        const f = tableFieldGeometry(n, index, field.key)
        out += `<line x1="${n.x}" y1="${f.lineY}" x2="${n.x + n.w}" y2="${f.lineY}" stroke="${p.border}" stroke-width=".75"/>`
        if (field.key === 'pk' || field.key === 'fk')
          out += text(
            n.x + 14,
            f.baseline,
            field.key,
            8.5,
            color(field.key === 'pk' ? 'main' : 'branch'),
            'start',
            'Geist Mono',
          )
        out += `<text data-field-name="${escapeXml(field.name)}" x="${f.nameX}" y="${f.baseline}" font-family="Geist Mono, monospace" font-size="${11 * document.presentation.textScale}" fill="${p.foreground}">${escapeXml(field.name)}</text>`
        const annotation = [field.type, field.key === 'unique' ? 'unique' : null]
          .filter(Boolean)
          .join(' · ')
        if (annotation)
          out += `<text data-field-annotation="${escapeXml(field.name)}" x="${f.annotationX}" y="${f.baseline}" text-anchor="end" font-family="Geist Mono, monospace" font-size="${10 * document.presentation.textScale}" fill="${p.mutedForeground}">${escapeXml(annotation)}</text>`
      }
      out += '</g>'
      continue
    }
    if (n.shape === 'state' && n.initial)
      out += `<rect x="${n.x + 4}" y="${n.y + 4}" width="${n.w - 8}" height="${n.h - 8}" rx="${g.radius - 4}" fill="none" stroke="${p.border}"/>`
    if (n.shape === 'state' && n.final)
      out += `<circle cx="${g.final.x}" cy="${g.final.y}" r="6.5" fill="none" stroke="${p.foreground}"/><circle cx="${g.final.x}" cy="${g.final.y}" r="2.6" fill="${p.foreground}"/>`
    if (n.kind)
      out += text(g.textX, n.y + 24, n.kind, 11.25, p.mutedForeground, 'start', 'Geist Mono')
    out += `<text data-node-label="true" x="${g.labelX}" y="${g.labelY}"${g.centeredLabel ? ' text-anchor="middle" dominant-baseline="central"' : ''} font-family="Geist, sans-serif" font-size="${14.5 * document.presentation.textScale}" fill="${p.foreground}">${escapeXml(n.label)}</text>`
    if (n.sublabel)
      out += text(g.textX, n.y + 70, n.sublabel, 11.25, p.mutedForeground, 'start', 'Geist Mono')
    out += '</g>'
  }
  if (Object.values(document.metadata.visuals).some((v) => v.source === 'phosphor'))
    out += `<metadata>${escapeXml(semanticIconLicense)}</metadata>`
  if (Object.values(document.metadata.visuals).some((v) => v.source !== 'phosphor'))
    out += `<metadata>${escapeXml(brandIconNotices)}</metadata>`
  return out
}
export function renderSvg(
  document: DiagramDocument,
  scene: ResolvedScene,
  options: RenderOptions,
): string {
  const p = document.presentation.theme[options.theme ?? document.presentation.theme.mode]
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${scene.layout.width}" height="${scene.layout.height}" viewBox="0 0 ${scene.layout.width} ${scene.layout.height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeXml(document.spec.caption)}"><title>${escapeXml(document.spec.caption)}</title>${options.fontCss ? `<style>${options.fontCss}</style>` : ''}${options.background === 'transparent' ? '' : `<rect width="100%" height="100%" fill="${p.background}"/>`}<g transform="translate(${scene.origin.x} ${scene.origin.y})">${renderSceneMarkup(document, scene, options)}</g></svg>`
}
