// Product-level export decisions shared by every host. Pure data only: the
// DOM-dependent probing and artifact pipeline live in `export-service.ts`.
import type { ExportFormat } from '@aesthc/diagram-lib/export'

export type ExportChoiceFormat = ExportFormat | 'html' | 'card' | 'webm'
export type ExportScope = 'document' | 'selection'
export interface ExportChoice {
  format: ExportChoiceFormat
  scope: ExportScope
  scale: number
  background: 'theme' | 'transparent'
  quality: 'edit' | 'publish'
  metadata: 'minimal' | 'all'
  /** Opt-in canonical JSON embedded next to the rendered artifact. */
  includeSource: boolean
  fontPolicy: 'required' | 'fallback'
}
export const DEFAULT_EXPORT_CHOICE: ExportChoice = {
  format: 'svg',
  scope: 'document',
  scale: 2,
  background: 'theme',
  quality: 'edit',
  metadata: 'minimal',
  includeSource: false,
  fontPolicy: 'required',
}
export const EXPORT_CHOICE_FORMATS: readonly ExportChoiceFormat[] = [
  'json',
  'svg',
  'png',
  'jpeg',
  'webp',
  'html',
  'card',
  'webm',
]
export type ExportGateReason =
  | 'raster.unavailable'
  | 'html.runtime'
  | 'card.empty'
  | 'webm.unavailable'
  | 'webm.empty'
  | 'webm.reduced-motion'
  | 'selection.empty'
  | 'selection.unsupported'
  | 'background.jpeg'
  | 'source.format'
export interface ExportGate {
  available: boolean
  reason?: ExportGateReason
}
/** Everything the gates need about the live document and the browser. */
export interface ExportFacts {
  raster: { png: boolean; jpeg: boolean; webp: boolean }
  html: boolean
  webm: boolean
  storySteps: number
  nodeCount: number
  selectionCount: number
  reducedMotion: boolean
}
const CANONICAL_FORMATS = new Set<ExportChoiceFormat>(['json', 'svg', 'png', 'jpeg', 'webp'])
const DOCUMENT_ONLY = new Set<ExportChoiceFormat>(['json', 'html', 'card', 'webm'])
export function isCanonicalFormat(format: ExportChoiceFormat): format is ExportFormat {
  return CANONICAL_FORMATS.has(format)
}
export function isDocumentOnly(format: ExportChoiceFormat): boolean {
  return DOCUMENT_ONLY.has(format)
}
/** Vector scaling is meaningful for SVG too: it changes the declared size. */
export function supportsScale(format: ExportChoiceFormat): boolean {
  return format === 'svg' || format === 'png' || format === 'jpeg' || format === 'webp'
}
export function supportsBackground(format: ExportChoiceFormat): boolean {
  return supportsScale(format)
}
export function supportsQuality(format: ExportChoiceFormat): boolean {
  return isCanonicalFormat(format)
}
/** `exportDocument` embeds the canonical JSON only for SVG; HTML has its own
 * script section. JSON always is the canonical document. */
export function supportsSource(format: ExportChoiceFormat): boolean {
  return format === 'svg' || format === 'html'
}
/** Portable metadata projection currently only exists in the HTML artifact. */
export function supportsMetadata(format: ExportChoiceFormat): boolean {
  return format === 'html'
}
/** The canonical pipeline accepts an explicit policy; HTML always embeds the
 * bundled faces and fails honestly when they cannot be fetched. */
export function supportsFontPolicy(format: ExportChoiceFormat): boolean {
  return format !== 'json'
}
export function formatGate(format: ExportChoiceFormat, facts: ExportFacts): ExportGate {
  switch (format) {
    case 'json':
    case 'svg':
      return { available: true }
    case 'png':
      return gates(facts.raster.png)
    case 'jpeg':
      return gates(facts.raster.jpeg)
    case 'webp':
      return gates(facts.raster.webp)
    case 'html':
      return gates(facts.html, 'html.runtime')
    case 'card':
      if (!facts.raster.png) return { available: false, reason: 'raster.unavailable' }
      return facts.nodeCount > 0 ? { available: true } : { available: false, reason: 'card.empty' }
    case 'webm':
      if (!facts.webm) return { available: false, reason: 'webm.unavailable' }
      if (facts.storySteps === 0) return { available: false, reason: 'webm.empty' }
      return facts.reducedMotion
        ? { available: false, reason: 'webm.reduced-motion' }
        : { available: true }
  }
}
function gates(available: boolean, reason: ExportGateReason = 'raster.unavailable'): ExportGate {
  return available ? { available: true } : { available: false, reason }
}
export function scopeGate(format: ExportChoiceFormat, facts: ExportFacts): ExportGate {
  if (isDocumentOnly(format)) return { available: false, reason: 'selection.unsupported' }
  return facts.selectionCount > 0
    ? { available: true }
    : { available: false, reason: 'selection.empty' }
}
/** Structural rules the UI must never silently work around. */
export function choiceIssues(choice: ExportChoice, selectionCount: number): ExportGateReason[] {
  const issues: ExportGateReason[] = []
  if (isDocumentOnly(choice.format) && choice.scope === 'selection')
    issues.push('selection.unsupported')
  else if (choice.scope === 'selection' && selectionCount === 0) issues.push('selection.empty')
  if (choice.format === 'jpeg' && choice.background === 'transparent')
    issues.push('background.jpeg')
  if (choice.includeSource && !supportsSource(choice.format)) issues.push('source.format')
  return issues
}
/** Keep dependent choices coherent when the format or document changes. */
export function normalizeChoice(choice: ExportChoice): ExportChoice {
  let next = choice
  if (isDocumentOnly(next.format) && next.scope === 'selection')
    next = { ...next, scope: 'document' }
  if (next.format === 'jpeg' && next.background === 'transparent')
    next = { ...next, background: 'theme' }
  if (!supportsSource(next.format)) next = { ...next, includeSource: false }
  if (!supportsScale(next.format) && next.scale !== 1) next = { ...next, scale: 1 }
  return next
}
export function extensionFor(format: ExportChoiceFormat): string {
  if (format === 'jpeg') return 'jpg'
  if (format === 'card') return 'png'
  return format
}
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
/** Resource feedback mirrors the encoder's own ceiling. */
export function dimensionWarning(width: number, height: number): boolean {
  return (
    width > 16384 ||
    height > 16384 ||
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width * height > 32_000_000
  )
}
