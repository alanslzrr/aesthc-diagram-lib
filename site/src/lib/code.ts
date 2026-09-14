// Code generation for the "view code" windows: a TypeScript-flavoured
// object printer (unquoted identifier keys, single quotes) whose output is
// also what the spec editor parses back, plus snippet builders.

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/

const quote = (value: string): string =>
  `'${value
    .replaceAll('\\', '\\\\')
    .replaceAll("'", "\\'")
    .replaceAll('\n', '\\n')
    .replaceAll('\r', '\\r')
    .replaceAll('\t', '\\t')}'`

export function printValue(value: unknown, indent = 0): string {
  const pad = '  '.repeat(indent)
  const childPad = '  '.repeat(indent + 1)

  if (value === null) return 'null'
  if (typeof value === 'string') return quote(value)
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    const simple =
      value.every((item) => typeof item !== 'object' || item === null) &&
      value.reduce((len, item) => len + String(item).length, 0) < 48
    if (simple) return `[${value.map((item) => printValue(item, 0)).join(', ')}]`
    return `[\n${value.map((item) => `${childPad}${printValue(item, indent + 1)},`).join('\n')}\n${pad}]`
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([, item]) => item !== undefined,
    )
    if (entries.length === 0) return '{}'
    const inline = entries
      .map(([key, item]) => `${IDENTIFIER.test(key) ? key : quote(key)}: ${printValue(item, 0)}`)
      .join(', ')
    if (inline.length + pad.length <= 72 && !inline.includes('\n')) return `{ ${inline} }`
    return `{\n${entries
      .map(
        ([key, item]) =>
          `${childPad}${IDENTIFIER.test(key) ? key : quote(key)}: ${printValue(item, indent + 1)},`,
      )
      .join('\n')}\n${pad}}`
  }
  return String(value)
}

/** Strict data parsing: never evaluate editor text as JavaScript. */
export function parseSpecSource(source: string): unknown {
  if (source.length > 262144) throw new Error('Spec exceeds the 256 KiB editor limit')
  return JSON.parse(source)
}

export const specSource = (spec: unknown): string => JSON.stringify(spec, null, 2)

export function usageSnippet(_key: string, _type: string, spec: unknown): string {
  return `import { useId, useMemo, useState } from 'react'
import { buildAdjacency, connectedIds, diagramEdges, type DiagramSpec } from '@aesthc/diagram-lib'
import { layoutDiagram } from '@aesthc/diagram-lib/layouts'
import { DiagramCanvas } from '@aesthc/diagram-lib/canvas'
import '@aesthc/diagram-lib/styles.css'

const spec = ${JSON.stringify(spec, null, 2)} satisfies DiagramSpec

export function Diagram() {
  const instanceId = useId()
  const [hovered, setHovered] = useState<string | null>(null)
  const [focused, setFocused] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const layout = useMemo(() => layoutDiagram(spec), [])
  const adjacency = useMemo(() => buildAdjacency(diagramEdges(spec)), [])
  const active = hovered ?? focused ?? selected
  const highlight = active ? connectedIds(active, adjacency) : null
  return <DiagramCanvas layout={layout} highlight={highlight}
    activeNodeId={active} focusedNodeId={focused} selectedNodeId={selected}
    onTooltipNodeChange={(id, open) => setHovered(open ? id : null)}
    onFocusNode={setFocused} onSelectNode={(id) => setSelected(selected === id ? null : id)}
    onDismissNode={() => { setHovered(null); setSelected(null) }}
    instanceId={instanceId} ariaLabel={spec.caption} nodeVisuals={{}} />
}
`
}

export interface ThemeTokens {
  background: string
  foreground: string
  card: string
  border: string
  mutedForeground: string
  cobalt: string
  branch: string
}

export function themeCss(light: ThemeTokens, dark: ThemeTokens): string {
  // The node-border formula is per-theme by design: light themes mix extra
  // foreground into the outline for contrast, dark themes use the border.
  const color = (value: string): string =>
    /^#[0-9a-f]{3,8}$/i.test(value) && [4, 5, 7, 9].includes(value.length) ? value : 'currentColor'
  const block = (tokens: ThemeTokens, nodeBorder: string, lightMode = false): string =>
    [
      `  --background: ${color(tokens.background)};`,
      `  --foreground: ${color(tokens.foreground)};`,
      `  --card: ${color(tokens.card)};`,
      `  --border: ${color(tokens.border)};`,
      `  --muted-foreground: ${color(tokens.mutedForeground)};`,
      `  --diagram-node-border: ${nodeBorder};`,
      `  --diagram-node-fill: ${lightMode ? 'var(--card)' : 'color-mix(in srgb, var(--foreground) 4%, var(--background))'};`,
      `  --diagram-secondary-fill: ${lightMode ? 'color-mix(in srgb, var(--card) 38%, var(--background))' : 'transparent'};`,
      `  --diagram-grid-opacity: ${lightMode ? '0.18' : '0.12'};`,
      `  --diagram-main-tail-opacity: ${lightMode ? '0.62' : '0.24'};`,
      `  --diagram-branch-tail-opacity: ${lightMode ? '0.48' : '0.12'};`,
      `  --cobalt: ${color(tokens.cobalt)};`,
      `  --branch: ${color(tokens.branch)};`,
    ].join('\n')

  return `:root {\n${block(light, 'color-mix(in srgb, var(--foreground) 20%, var(--border))', true)}\n}\n\n[data-theme='dark'] {\n${block(dark, 'var(--border)')}\n}\n`
}
