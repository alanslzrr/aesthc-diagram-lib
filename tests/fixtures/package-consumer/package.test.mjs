import assert from 'node:assert/strict'
import { readFileSync, realpathSync, statSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import * as core from '@aesthc/diagram-lib'
import * as registry from '@aesthc/diagram-lib/registry'
import { EXAMPLE_DIAGRAMS, registerExampleDiagrams } from '@aesthc/diagram-lib/examples'

const packageRoot = fileURLToPath(new URL('./node_modules/@aesthc/diagram-lib/', import.meta.url))
const manifest = JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf8'))
const example = Object.values(EXAMPLE_DIAGRAMS)[0]

test('imports resolve inside the installed tarball, not the source workspace', () => {
  const installed = realpathSync(packageRoot)
  const entry = realpathSync(fileURLToPath(import.meta.resolve('@aesthc/diagram-lib')))
  assert.ok(installed.startsWith(realpathSync(resolve('node_modules')) + sep))
  assert.ok(entry.startsWith(installed + sep))
  assert.equal(entry, resolve(installed, 'dist/index.js'))
})

test('root and registry expose the same registry implementation', () => {
  for (const name of Object.keys(registry)) {
    assert.equal(core[name], registry[name], `${name} must not be bundled twice`)
  }
})

test('examples registered from their entrypoint are visible through root and registry', () => {
  registerExampleDiagrams()
  for (const [key, registration] of Object.entries(EXAMPLE_DIAGRAMS)) {
    for (const reader of [core, registry]) {
      assert.equal(reader.hasDiagram(key), true, `${key} must be visible across entrypoints`)
      assert.equal(reader.getDiagram(key, 'en'), registration.diagram.en)
      assert.equal(reader.getDiagram(key, 'es-MX'), registration.diagram.es)
      assert.deepEqual(reader.getDiagramVisuals(key), registration.visuals ?? {})
      assert.ok(reader.getDiagramKeys().includes(key))
    }
  }
})

test('registration and replacement work in both directions across entrypoints', () => {
  core.registerDiagram('consumer-root', example)
  assert.equal(registry.getDiagram('consumer-root', 'en'), example.diagram.en)

  registry.registerDiagram('consumer-subpath', example)
  assert.equal(core.getDiagram('consumer-subpath', 'es'), example.diagram.es)

  const replacement = {
    ...example,
    diagram: {
      en: { ...example.diagram.en, caption: 'Replacement caption' },
      es: example.diagram.es,
    },
  }
  registry.registerDiagrams({ 'consumer-root': replacement })
  assert.equal(core.getDiagram('consumer-root', 'en').caption, 'Replacement caption')
  assert.equal(core.getDiagramEntry('consumer-root'), registry.getDiagramEntry('consumer-root'))
})

test('showcase renders a diagram registered by the consumer through the root entrypoint', async () => {
  const key = 'consumer-showcase'
  core.registerDiagram(key, example)
  const { DiagramShowcase } = await import('@aesthc/diagram-lib/showcase')
  const html = renderToStaticMarkup(
    createElement(DiagramShowcase, {
      entries: [{ key, title: 'Consumer diagram', description: 'Registered outside showcase' }],
    }),
  )
  assert.ok(html.includes('data-diagram-panel'))
  assert.ok(html.includes(example.diagram.en.caption))
})

test('every declared runtime and type export is present in the tarball', async () => {
  for (const [subpath, conditions] of Object.entries(manifest.exports)) {
    const targets = typeof conditions === 'string' ? [conditions] : Object.values(conditions)
    for (const target of targets) {
      const file = statSync(resolve(packageRoot, target))
      assert.ok(file.isFile(), `${subpath}: ${target}`)
      // A types-only entrypoint may intentionally emit an empty runtime module.
      if (target.endsWith('.d.ts') || target.endsWith('.css')) {
        assert.ok(file.size > 0, `${subpath}: ${target} must not be empty`)
      }
    }
    const specifier = subpath === '.' ? manifest.name : `${manifest.name}/${subpath.slice(2)}`
    if (subpath === './styles.css') {
      const css = readFileSync(fileURLToPath(import.meta.resolve(specifier)), 'utf8')
      assert.match(css, /@layer diagram-lib/)
    } else {
      await import(specifier)
    }
  }
})

test('interactive public entrypoints retain their client directives', () => {
  for (const entry of ['canvas', 'showcase']) {
    const code = readFileSync(
      fileURLToPath(import.meta.resolve(`${manifest.name}/${entry}`)),
      'utf8',
    )
    assert.match(code, /^['"]use client['"]/)
  }
})

test('package CSS resolves bundled Geist assets and preserves host font tokens', () => {
  const css = readFileSync(resolve(packageRoot, 'dist/styles.css'), 'utf8')
  for (const name of ['geist-sans.woff2', 'geist-mono.woff2']) {
    assert.ok(css.includes(`fonts/${name}`))
    const bytes = readFileSync(resolve(packageRoot, 'dist/fonts', name))
    assert.equal(bytes.subarray(0, 4).toString(), 'wOF2')
    assert.ok(bytes.length > 1000)
  }
  for (const token of ['--diagram-font-sans', '--diagram-font-display', '--diagram-font-mono'])
    assert.ok(css.includes(token))
  assert.ok(!css.includes('fonts.googleapis.com'))
})

test('selected brand entrypoint and cloud examples render from the installed tarball', async () => {
  const { BrandIcon } = await import('@aesthc/diagram-lib/icons')
  const { CLOUD_ARCHITECTURE_SPEC, CLOUD_ARCHITECTURE_VISUALS } =
    await import('@aesthc/diagram-lib/examples')
  const { DiagramCanvas } = await import('@aesthc/diagram-lib/canvas')
  const { layoutDiagram } = await import('@aesthc/diagram-lib/layouts')
  const html = renderToStaticMarkup(createElement(BrandIcon, { name: 'yarn' }))
  assert.ok(html.includes('#2c8ebb'))
  assert.ok(!html.includes('<style'))
  const canvas = renderToStaticMarkup(
    createElement(DiagramCanvas, {
      layout: layoutDiagram(CLOUD_ARCHITECTURE_SPEC),
      highlight: null,
      activeNodeId: null,
      instanceId: 'consumer-cloud',
      ariaLabel: CLOUD_ARCHITECTURE_SPEC.caption,
      nodeVisuals: CLOUD_ARCHITECTURE_VISUALS,
      onTooltipNodeChange() {},
      onFocusNode() {},
      onSelectNode() {},
      onDismissNode() {},
    }),
  )
  assert.ok(canvas.includes('Google Cloud'))
  assert.ok(canvas.includes('Microsoft Azure'))
  assert.ok(canvas.includes('fill="#'))
})

test('installed architecture examples render localized service flows through public exports', async () => {
  const { ARCHITECTURE_EXAMPLES } = await import('@aesthc/diagram-lib/examples')
  const { layoutDiagram } = await import('@aesthc/diagram-lib/layouts')
  const { DiagramCanvas } = await import('@aesthc/diagram-lib/canvas')
  const { validateDiagramSpec } = await import('@aesthc/diagram-lib/validation')
  assert.deepEqual(Object.keys(ARCHITECTURE_EXAMPLES), ['documents', 'orders', 'delivery'])
  for (const [key, example] of Object.entries(ARCHITECTURE_EXAMPLES)) {
    for (const locale of ['en', 'es']) {
      const spec = example.diagram[locale]
      assert.equal(validateDiagramSpec(spec).success, true)
      const markup = renderToStaticMarkup(
        createElement(DiagramCanvas, {
          layout: layoutDiagram(spec),
          highlight: null,
          activeNodeId: null,
          instanceId: `consumer-${key}-${locale}`,
          ariaLabel: spec.caption,
          nodeVisuals: example.visuals,
          onTooltipNodeChange() {},
          onFocusNode() {},
          onSelectNode() {},
          onDismissNode() {},
        }),
      )
      assert.ok(markup.includes(spec.nodes[0].label))
      assert.ok(markup.includes(spec.nodes[0].sublabel))
      assert.ok(example.sources.length > 0)
    }
  }
})
