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

export type ThemeMode = 'light' | 'dark'

/** Per-mode values shared by every surface: the live host stylesheet
 * (site/src/theme-tokens.css), the Theme Studio copy action and the documented
 * snippet in docs/guides/theming.md. Node/structure outlines stay strong and
 * secondary surfaces stay opaque in both modes; `transparent` is never a
 * secondary fill. Edge colors use the accent tokens, readable text uses the
 * ink tokens. */
export interface ThemeContract {
  muted: string
  borderSubtle: string
  borderStrong: string
  nodeBorder: string
  structure: string
  nodeFill: string
  secondaryFill: string
  containerFill: string
  gridOpacity: string
  mainTailOpacity: string
  branchTailOpacity: string
  cobaltInk: string
  branchInk: string
  ring: string
  code: string
}

export const THEME_CONTRACT: Record<ThemeMode, ThemeContract> = {
  light: {
    muted: '#f2f2f2',
    borderSubtle: 'color-mix(in srgb, var(--border) 42%, transparent)',
    borderStrong: 'color-mix(in srgb, var(--border) 88%, var(--foreground) 8%)',
    nodeBorder: 'color-mix(in srgb, var(--foreground) 42%, var(--border))',
    structure: 'color-mix(in srgb, var(--foreground) 42%, var(--border))',
    nodeFill: 'var(--card)',
    secondaryFill: 'color-mix(in srgb, var(--card) 55%, var(--background))',
    containerFill: 'color-mix(in srgb, var(--foreground) 2%, var(--background))',
    gridOpacity: '0.18',
    mainTailOpacity: '0.62',
    branchTailOpacity: '0.48',
    cobaltInk: '#0060df',
    branchInk: '#8a6425',
    ring: '#0070f3',
    code: '#dde5ee',
  },
  dark: {
    muted: '#141414',
    borderSubtle: 'color-mix(in srgb, var(--border) 62%, transparent)',
    borderStrong: 'color-mix(in srgb, var(--border) 80%, var(--foreground) 10%)',
    nodeBorder: 'color-mix(in srgb, var(--foreground) 34%, var(--border))',
    structure: 'color-mix(in srgb, var(--foreground) 34%, var(--border))',
    nodeFill: 'color-mix(in srgb, var(--foreground) 4%, var(--background))',
    secondaryFill: 'color-mix(in srgb, var(--foreground) 6%, var(--background))',
    containerFill: 'color-mix(in srgb, var(--foreground) 4%, var(--background))',
    gridOpacity: '0.12',
    mainTailOpacity: '0.24',
    branchTailOpacity: '0.12',
    cobaltInk: '#3291ff',
    branchInk: 'var(--branch)',
    ring: '#3291ff',
    code: '#121212',
  },
}

export const isHexColor = (value: string): boolean =>
  /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value)

interface ThemeSource {
  background: string
  foreground: string
  card: string
  mutedForeground: string
  border: string
  cobalt: string
  branch: string
}

const hostSource = (): ThemeSource => ({
  background: 'var(--palette-background)',
  foreground: 'var(--palette-foreground)',
  card: 'var(--palette-card)',
  mutedForeground: 'var(--palette-muted-foreground)',
  border: 'var(--palette-border)',
  cobalt: 'var(--palette-cobalt)',
  branch: 'var(--palette-branch)',
})

const tokenSource = (tokens: ThemeTokens): ThemeSource => {
  const color = (value: string): string => {
    if (!isHexColor(value)) throw new Error('Expected a complete hexadecimal color')
    return value
  }
  return {
    background: color(tokens.background),
    foreground: color(tokens.foreground),
    card: color(tokens.card),
    mutedForeground: color(tokens.mutedForeground),
    border: color(tokens.border),
    cobalt: color(tokens.cobalt),
    branch: color(tokens.branch),
  }
}

const declarations = (source: ThemeSource, mode: ThemeMode): string[] => {
  const contract = THEME_CONTRACT[mode]
  return [
    `  color-scheme: ${mode};`,
    `  --background: ${source.background};`,
    `  --foreground: ${source.foreground};`,
    `  --card: ${source.card};`,
    `  --muted: ${contract.muted};`,
    `  --muted-foreground: ${source.mutedForeground};`,
    `  --border: ${source.border};`,
    `  --border-subtle: ${contract.borderSubtle};`,
    `  --border-strong: ${contract.borderStrong};`,
    `  --diagram-node-border: ${contract.nodeBorder};`,
    `  --diagram-structure: ${contract.structure};`,
    `  --diagram-node-fill: ${contract.nodeFill};`,
    `  --diagram-secondary-fill: ${contract.secondaryFill};`,
    `  --diagram-container-fill: ${contract.containerFill};`,
    `  --diagram-grid-opacity: ${contract.gridOpacity};`,
    `  --diagram-main-tail-opacity: ${contract.mainTailOpacity};`,
    `  --diagram-branch-tail-opacity: ${contract.branchTailOpacity};`,
    `  --cobalt: ${source.cobalt};`,
    `  --cobalt-ink: ${contract.cobaltInk};`,
    `  --branch: ${source.branch};`,
    `  --branch-ink: ${contract.branchInk};`,
    `  --ring: ${contract.ring};`,
  ]
}

/** The copied/documented theme block: literal palette values plus the shared
 * contract declarations, scoped so the Theme Studio preview never overrides
 * the host root. */
export function themeCss(light: ThemeTokens, dark: ThemeTokens, scope = ':root'): string {
  const block = (tokens: ThemeTokens, mode: ThemeMode): string =>
    declarations(tokenSource(tokens), mode).join('\n')
  return `${scope} {\n${block(light, 'light')}\n}\n\n[data-theme='dark']${scope === ':root' ? '' : ` ${scope}`} {\n${block(dark, 'dark')}\n}\n`
}

export const THEME_SNIPPET_START = '<!-- theme-snippet:start -->'
export const THEME_SNIPPET_END = '<!-- theme-snippet:end -->'

/** The documented snippet, marker-delimited so `pnpm docs:generate` can keep
 * docs/guides/theming.md and the copied CSS byte-identical. */
export function themeSnippet(light: ThemeTokens, dark: ThemeTokens): string {
  return `${THEME_SNIPPET_START}\n\`\`\`css\n${themeCss(light, dark)}\`\`\`\n${THEME_SNIPPET_END}`
}

/** Live host stylesheet (site/src/theme-tokens.css) generated from the same
 * contract; palette values stay references to site/src/generated/palette.css. */
export function hostThemeCss(): string {
  const block = (mode: ThemeMode): string =>
    declarations(hostSource(), mode)
      .concat(
        `  --diagram-font-display: 'Geist', system-ui, sans-serif;`,
        `  --code: ${THEME_CONTRACT[mode].code};`,
      )
      .join('\n')
  return `/* Generated from site/src/lib/code.ts by pnpm docs:generate. */\n:root {\n${block('light')}\n}\n[data-theme='dark'] {\n${block('dark')}\n}\n`
}
