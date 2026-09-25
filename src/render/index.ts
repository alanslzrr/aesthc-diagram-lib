import type { DiagramDocument, ResolvedScene } from '../editor-core/types'
import { nodeGeometry, tableFieldGeometry } from '../geometry/node'
import { renderNodeIcon } from './icons'
import { semanticIconLicense, brandIconNotices } from '../brand-icons/semantic-data'
import {
  CARD_R,
  DECISION_PILL_H,
  DECISION_PILL_R,
  DOT_R,
  EDGE_STROKE_WIDTH,
  LANE_R,
  NODE_ICON_SIZE,
  PILL_H,
  PILL_R,
} from '../theme'
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
  /**
   * Render only these entity ids (gesture delta pass). Static chrome (defs,
   * grid, containers, lifelines, decisions, notices) is skipped so the string
   * stays small; the caller keeps it inside the same SVG as the baseline.
   */
  only?: { nodes?: ReadonlySet<string>; edges?: ReadonlySet<string> }
  /**
   * Render everything except these entity ids (gesture baseline pass). Used to
   * keep the baseline free of the entities the delta pass redraws.
   */
  exclude?: { nodes?: ReadonlySet<string>; edges?: ReadonlySet<string> }
  /**
   * Mark exact entity ids for semantic highlighting (viewer routes, reach,
   * cards). Parallel edges keep their own IDs and are marked individually.
   * Rendering stays headless; styling is applied by CSS or an inline style.
   */
  highlight?: { nodes?: ReadonlySet<string>; edges?: ReadonlySet<string> }
}
export function renderSceneMarkup(
  document: DiagramDocument,
  scene: ResolvedScene,
  options: RenderOptions,
): string {
  const p = document.presentation.theme[options.theme ?? document.presentation.theme.mode],
    l = scene.layout
  const id = Array.from(options.instanceId, (c) => c.codePointAt(0)!.toString(16)).join('-') || '0'
  const delta = !!options.only
  const includeNode = (nodeId: string) =>
    (!options.only?.nodes || options.only.nodes.has(nodeId)) && !options.exclude?.nodes?.has(nodeId)
  const includeEdge = (edgeId: string) =>
    (!options.only?.edges || options.only.edges.has(edgeId)) && !options.exclude?.edges?.has(edgeId)
  const highlightNode = (nodeId: string) => options.highlight?.nodes?.has(nodeId) ?? false
  const highlightEdge = (edgeId: string) => options.highlight?.edges?.has(edgeId) ?? false
  const marked = (active: boolean) => (active ? ' data-query-highlight="true"' : '')
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
  const monoLabel = (
    x: number,
    y: number,
    value: string,
    size: number,
    fill: string,
    spacing = 0,
  ) =>
    `<text x="${x}" y="${y}"${spacing ? ` letter-spacing="${spacing}"` : ''} font-family="Geist Mono, monospace" font-size="${size * document.presentation.textScale}" fill="${fill}">${escapeXml(value)}</text>`
  let out = delta
    ? ''
    : `<defs><marker id="arrow-${id}" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M1 1L7 4L1 7" fill="none" stroke="context-stroke" stroke-linecap="round" stroke-linejoin="round"/></marker><pattern id="grid-${id}" width="${document.presentation.grid.size}" height="${document.presentation.grid.size}" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="${p.foreground}" fill-opacity="0.12"/></pattern></defs>`
  if (!delta && document.presentation.grid.visible)
    out += `<rect x="${scene.worldBounds.x}" y="${scene.worldBounds.y}" width="${scene.worldBounds.width}" height="${scene.worldBounds.height}" fill="url(#grid-${id})"/>`
  if (!delta)
    for (const c of l.containers ?? [])
      out += `<g><rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="${LANE_R}" fill="${p.background}" stroke="${p.border}"/>${monoLabel(c.x + 18, c.y + 26, (c.label ?? '').toUpperCase(), 11.25, p.mutedForeground, 1.6)}${c.kind ? monoLabel(c.x + 18, c.y + 44, c.kind, 10, p.mutedForeground) : ''}</g>`
  if (!delta)
    for (const line of l.lifelines ?? [])
      out += `<path d="M${line.x} ${line.y0}V${line.y1}" fill="none" stroke="${p.border}" stroke-dasharray="2 6"/>`
  for (const e of l.edges)
    if (includeEdge(e.id))
      out += `<g data-edge-id="${escapeXml(e.id)}"${marked(highlightEdge(e.id))}><path d="${escapeXml(e.d)}" fill="none" stroke="${color(e.variant)}" stroke-width="${e.strokeWidth ?? EDGE_STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round"${e.dashed ? ' stroke-dasharray="2 7"' : ''}${e.arrowEnd ? ` marker-end="url(#arrow-${id})"` : ''}/></g>`
  if (!delta)
    for (const c of l.continuations)
      out += `<path d="${escapeXml(c.d)}" fill="none" stroke="${color(c.variant)}" stroke-width="${EDGE_STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#arrow-${id})"/>`

  for (const n of l.nodes) {
    if (!includeNode(n.id)) continue
    const visual = document.metadata.visuals[n.id]
    const g = nodeGeometry(n, !!visual)
    out += `<g data-node-id="${escapeXml(n.id)}"${marked(highlightNode(n.id))}><title>${escapeXml(n.label)}</title><desc>${escapeXml(n.description ?? '')}</desc>`
    if (n.shape === 'bar') {
      out += `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="2" fill="${color(n.weight === 'primary' ? 'main' : 'branch')}" fill-opacity=".22" stroke="${p.border}"/></g>`
      continue
    }
    if (n.shape === 'event') {
      const stroke = color(n.weight === 'primary' ? 'main' : 'branch')
      out += `<line x1="${n.cx}" y1="${n.cy}" x2="${n.cx}" y2="${g.connectorEnd}" stroke="${stroke}" stroke-dasharray="2 4"/><circle cx="${n.cx}" cy="${n.cy}" r="${DOT_R}" fill="${p.background}" stroke="${stroke}"/><circle cx="${n.cx}" cy="${n.cy}" r="${DOT_R / 2.6}" fill="${stroke}"/>`
      if (n.kind) out += monoLabel(n.cx, n.y - 24, n.kind.toUpperCase(), 10, p.mutedForeground, 1.4)
      out += `<text data-node-label="true" x="${n.cx}" y="${n.y}" text-anchor="middle" font-family="Geist, sans-serif" font-size="${13.5 * document.presentation.textScale}" fill="${p.foreground}">${escapeXml(n.label)}</text>`
      if (n.sublabel) out += monoLabel(n.cx, n.y + 18, n.sublabel, 10.5, p.mutedForeground)
      out += '</g>'
      continue
    }
    if (n.weight === 'muted' && n.shape !== 'table')
      out += `<line x1="${n.x}" y1="${n.y + n.h}" x2="${n.x + n.w}" y2="${n.y + n.h}" stroke="${p.border}" stroke-width="1"/>`
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
      out += `<path d="M ${n.x} ${n.y + 26} L ${n.x} ${n.y + CARD_R} Q ${n.x} ${n.y} ${n.x + CARD_R} ${n.y} L ${n.x + n.w - CARD_R} ${n.y} Q ${n.x + n.w} ${n.y} ${n.x + n.w} ${n.y + CARD_R} L ${n.x + n.w} ${n.y + 26} Z" fill="${p.foreground}" fill-opacity="0.06"/>`
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
      out += `<circle cx="${g.final.x}" cy="${g.final.y}" r="6.5" fill="none" stroke="${p.foreground}" stroke-opacity="0.55"/><circle cx="${g.final.x}" cy="${g.final.y}" r="2.6" fill="${p.foreground}" fill-opacity="0.7"/>`
    if (n.kind)
      out += monoLabel(g.textX, n.y + 24, n.kind.toUpperCase(), 11.25, p.mutedForeground, 1.6)
    out += `<text data-node-label="true" x="${g.labelX}" y="${g.labelY}"${g.centeredLabel ? ' text-anchor="middle" dominant-baseline="central"' : ''} font-family="Geist, sans-serif" font-size="${14.5 * document.presentation.textScale}" fill="${p.foreground}">${escapeXml(n.label)}</text>`
    if (n.sublabel) out += monoLabel(g.textX, n.y + 70, n.sublabel, 11.25, p.mutedForeground)
    out += '</g>'
  }
  if (!delta)
    for (const d of l.decisions)
      out += `<g><rect x="${d.x - d.width / 2}" y="${d.y - DECISION_PILL_H / 2}" width="${d.width}" height="${DECISION_PILL_H}" rx="${DECISION_PILL_R}" fill="${p.background}" stroke="${p.border}"/>${text(d.x, d.y + 4.5, d.label, 12.25, p.foreground, 'middle')}</g>`
  for (const e of l.edges)
    if (e.label && includeEdge(e.id))
      out += `<g data-edge-label="${escapeXml(e.id)}"><rect x="${e.labelX - e.labelWidth / 2}" y="${e.labelY - PILL_H / 2}" width="${e.labelWidth}" height="${PILL_H}" rx="${PILL_R}" fill="${p.background}" stroke="${p.border}"/>${monoLabel(e.labelX, e.labelY + 4, e.label, 11.25, p.foreground)}</g>`
  if (!delta)
    for (const c of l.continuations)
      out += `<g data-continuation-label="${escapeXml(c.id)}"><rect x="${c.labelX - c.labelWidth / 2}" y="${c.labelY - PILL_H / 2}" width="${c.labelWidth}" height="${PILL_H}" rx="${PILL_R}" fill="${p.background}" stroke="${p.border}"/>${monoLabel(c.labelX, c.labelY + 4, c.displayLabel, 11.25, p.foreground)}</g>`
  if (!delta)
    if (Object.values(document.metadata.visuals).some((v) => v.source === 'phosphor'))
      out += `<metadata>${escapeXml(semanticIconLicense)}</metadata>`
  if (!delta)
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
