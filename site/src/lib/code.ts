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

/** Parses the TS-flavoured object literal the editor shows. */
export function parseSpecSource(source: string): unknown {
  const trimmed = source.trim().replace(/;$/, '')
  // The page only ever evaluates text the visitor typed into their own
  // browser — same trust model as the devtools console.
  return new Function(`'use strict'; return (${trimmed})`)()
}

export const specSource = (spec: unknown): string => printValue(spec, 0)

export function usageSnippet(key: string, type: string, spec: unknown): string {
  return `import { registerDiagram, getDiagram, diagramEdges, buildAdjacency } from '@aesthc/diagram-lib'
import { layoutDiagram } from '@aesthc/diagram-lib/layouts'
import { DiagramCanvas } from '@aesthc/diagram-lib/canvas'
import '@aesthc/diagram-lib/styles.css'

const spec = ${printValue(spec, 0)}

// Register once at module scope — pair it with your own 'es' variant.
registerDiagram('${key}', { diagram: { en: spec, es: spec } })

export function Diagram() {
  const diagram = getDiagram('${key}', 'en')
  const layout = layoutDiagram(diagram)

  return (
    <DiagramCanvas
      layout={layout}
      highlight={null}
      activeNodeId={null}
      focusedNodeId={null}
      selectedNodeId={null}
      onTooltipNodeChange={() => {}}
      onFocusNode={() => {}}
      onSelectNode={() => {}}
      onDismissNode={() => {}}
      instanceId="${key}"
      ariaLabel="${type} diagram"
      nodeVisuals={{}}
    />
  )
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
  const block = (tokens: ThemeTokens, nodeBorder: string): string =>
    [
      `  --background: ${tokens.background};`,
      `  --foreground: ${tokens.foreground};`,
      `  --card: ${tokens.card};`,
      `  --border: ${tokens.border};`,
      `  --muted-foreground: ${tokens.mutedForeground};`,
      `  --diagram-node-border: ${nodeBorder};`,
      `  --cobalt: ${tokens.cobalt};`,
      `  --branch: ${tokens.branch};`,
    ].join('\n')

  return `:root {\n${block(light, 'color-mix(in srgb, var(--foreground) 20%, var(--border))')}\n}\n\n[data-theme='dark'] {\n${block(dark, 'var(--border)')}\n}\n`
}
