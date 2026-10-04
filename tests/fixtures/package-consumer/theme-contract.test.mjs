// Pastes the copied Theme Studio CSS into an isolated tarball consumer and
// measures both themes across all seven diagram types. The documented snippet
// must be the copied CSS; node/secondary surfaces must stay opaque; structure
// and ink must keep contrast. Runs without a browser by resolving the CSS
// variables the canvas references.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { EXAMPLE_DIAGRAMS } from '@aesthc/diagram-lib/examples'
import { layoutDiagram } from '@aesthc/diagram-lib/layouts'
import { DiagramCanvas } from '@aesthc/diagram-lib/canvas'

const packageRoot = fileURLToPath(new URL('./node_modules/@aesthc/diagram-lib/', import.meta.url))
const copiedCss = readFileSync(resolve('theme-copy.css'), 'utf8')
const theming = readFileSync(resolve(packageRoot, 'docs/guides/theming.md'), 'utf8')

function declarations(css) {
  const themes = { light: new Map(), dark: new Map() }
  let current = themes.light
  for (const raw of css.split('\n')) {
    const line = raw.trim()
    if (line === '[data-theme="dark"] {' || line === "[data-theme='dark'] {") {
      current = themes.dark
      continue
    }
    if (line === ':root {') {
      current = themes.light
      continue
    }
    const match = /^(--[a-z-]+):\s*(.+);$/.exec(line)
    if (match) current.set(match[1], match[2])
  }
  return themes
}

function hexToRgba(hex) {
  let value = hex.slice(1)
  if (value.length === 3 || value.length === 4)
    value = value
      .split('')
      .map((part) => part + part)
      .join('')
  if (value.length === 6) value += 'ff'
  const int = Number.parseInt(value, 16)
  return {
    r: (int >>> 24) & 0xff,
    g: (int >>> 16) & 0xff,
    b: (int >>> 8) & 0xff,
    a: (int & 0xff) / 255,
  }
}

function resolveColor(value, variables, seen = new Set()) {
  const trimmed = value.trim()
  if (trimmed === 'transparent') return { r: 0, g: 0, b: 0, a: 0 }
  if (/^#[0-9a-f]{3,8}$/i.test(trimmed)) return hexToRgba(trimmed)
  const variable = /^var\((--[a-z-]+)(?:,\s*(.+))?\)$/.exec(trimmed)
  if (variable) {
    if (seen.has(variable[1])) throw new Error(`Circular theme token ${variable[1]}`)
    seen.add(variable[1])
    const next = variables.get(variable[1]) ?? variable[2]
    if (next === undefined) throw new Error(`Unresolved theme token ${variable[1]}`)
    return resolveColor(next, variables, seen)
  }
  const mix = /^color-mix\(in srgb,\s*(.+?)\s+(\d+(?:\.\d+)?)%,\s*(.+)\)$/.exec(trimmed)
  if (mix) {
    const first = resolveColor(mix[1], variables, seen)
    const second = resolveColor(mix[3], variables, seen)
    const weight = Number(mix[2]) / 100
    return {
      r: first.r * weight + second.r * (1 - weight),
      g: first.g * weight + second.g * (1 - weight),
      b: first.b * weight + second.b * (1 - weight),
      a: first.a * weight + second.a * (1 - weight),
    }
  }
  throw new Error(`Unsupported theme value: ${value}`)
}

function luminance(color) {
  const channel = (value) => {
    const scaled = value / 255
    return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b)
}

function contrast(first, second) {
  const a = luminance(first)
  const b = luminance(second)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

const themes = declarations(copiedCss)

test('the documented snippet is byte-identical to the copied CSS', () => {
  const start = theming.indexOf('<!-- theme-snippet:start -->')
  const end = theming.indexOf('<!-- theme-snippet:end -->')
  assert.ok(start >= 0 && end > start, 'theming guide must keep its snippet markers')
  const block = theming.slice(start, end)
  const fenced = /```css\n([\s\S]*?)```/.exec(block)
  assert.ok(fenced, 'theming guide must fence the CSS snippet')
  assert.equal(fenced[1], copiedCss)
})

test('both themes keep opaque surfaces, strong structure and readable ink', () => {
  for (const [theme, variables] of Object.entries(themes)) {
    const read = (token) => resolveColor(`var(${token})`, variables)
    const background = read('--background')
    const nodeFill = read('--diagram-node-fill')
    const secondary = read('--diagram-secondary-fill')
    const structure = read('--diagram-structure')
    const nodeBorder = read('--diagram-node-border')

    assert.ok(!/--diagram-secondary-fill:\s*transparent/.test(copiedCss), theme)
    for (const [name, surface] of [
      ['node fill', nodeFill],
      ['secondary fill', secondary],
      ['container fill', read('--diagram-container-fill')],
    ])
      assert.equal(surface.a, 1, `${theme} ${name} must be opaque`)
    assert.ok(
      contrast(structure, background) >= 3,
      `${theme} structure ${contrast(structure, background).toFixed(2)}:1 against background`,
    )
    assert.ok(
      contrast(nodeBorder, background) >= 3,
      `${theme} node border ${contrast(nodeBorder, background).toFixed(2)}:1 against background`,
    )
    assert.ok(
      contrast(secondary, background) >= 1.02,
      `${theme} secondary fill must stay visible on the background`,
    )
    for (const ink of ['--cobalt-ink', '--branch-ink'])
      assert.ok(
        contrast(read(ink), background) >= 4.5,
        `${theme} ${ink} ${contrast(read(ink), background).toFixed(2)}:1 against background`,
      )
  }
})

test('all seven diagram types render geometry that consumes the copied tokens', () => {
  const keys = Object.keys(EXAMPLE_DIAGRAMS)
  assert.equal(keys.length, 7)
  const surfaces = []
  let secondarySeen = false
  for (const key of keys) {
    const type = EXAMPLE_DIAGRAMS[key].diagram.en.type
    const layout = layoutDiagram(EXAMPLE_DIAGRAMS[key].diagram.en)
    const markup = renderToStaticMarkup(
      createElement(DiagramCanvas, {
        layout,
        highlight: null,
        activeNodeId: null,
        focusedNodeId: null,
        selectedNodeId: null,
        onTooltipNodeChange: () => {},
        onFocusNode: () => {},
        onSelectNode: () => {},
        onDismissNode: () => {},
        instanceId: `theme-${key}`,
        ariaLabel: key,
        nodeVisuals: {},
      }),
    )
    assert.ok(markup.includes('var(--'), `${key} must consume host variables`)
    // Timeline events are dots on the spine, not card surfaces; every card
    // layout must still resolve its outline and fill through the contract.
    if (type !== 'timeline') {
      const rect = /<rect[^>]*data-node-surface="true"[^>]*>/.exec(markup)?.[0]
      assert.ok(rect, `${key} must render a node surface`)
      const fill = /fill="([^"]+)"/.exec(rect)?.[1]
      const stroke = /stroke="([^"]+)"/.exec(rect)?.[1]
      assert.ok(fill?.startsWith('var(--diagram-'), `${key} must fill from the contract`)
      assert.ok(stroke?.startsWith('var(--diagram-'), `${key} must outline from the contract`)
      surfaces.push({ key, fill, stroke })
      secondarySeen ||= markup.includes('var(--diagram-secondary-fill')
    }
  }
  assert.ok(secondarySeen, 'at least one diagram type must render a secondary surface')
  for (const [theme, variables] of Object.entries(themes)) {
    const background = resolveColor('var(--background)', variables)
    for (const { key, fill, stroke } of surfaces) {
      const fillColor = resolveColor(fill, variables)
      const strokeColor = resolveColor(stroke, variables)
      assert.equal(fillColor.a, 1, `${theme} ${key} node fill must be opaque`)
      assert.ok(
        contrast(strokeColor, background) >= 3,
        `${theme} ${key} outline ${contrast(strokeColor, background).toFixed(2)}:1 against background`,
      )
    }
  }
})
