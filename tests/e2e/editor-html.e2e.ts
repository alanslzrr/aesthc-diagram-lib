import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createDocument } from '../../dist/editor-core/index.js'
import type { DiagramDocument } from '../../dist/editor-core/index.js'
import { exportDocumentHtml } from '../../dist/export/index.js'
import { createRendererRegistry } from '../../dist/editor-core/index.js'

function offlineDocument(): DiagramDocument {
  const made = createDocument(
    {
      type: 'graph',
      caption: 'Offline platform',
      legend: { main: 'Request', branch: 'Async' },
      nodes: [
        { id: 'client', label: 'Web client', kind: 'Application', description: 'Entry point.' },
        { id: 'api', label: 'Order API', kind: 'Service', description: 'Records orders.' },
        { id: 'database', label: 'Orders', kind: 'Database', description: 'Stores orders.' },
        { id: 'worker', label: 'Email worker', kind: 'Service', description: 'Sends mail.' },
      ],
      edges: [
        { id: 'request', from: 'client', to: 'api', label: 'HTTPS' },
        { id: 'persist', from: 'api', to: 'database', label: 'Write' },
        { id: 'notify', from: 'api', to: 'worker', label: 'Queue', variant: 'branch' },
      ],
    },
    { id: 'offline-document', locale: 'en' },
  )
  if (!made.ok) throw Error(JSON.stringify(made.diagnostics))
  const document = made.value
  document.metadata.nodes = { api: { roles: ['backend'], tags: ['core'], links: [] } }
  document.views = [
    { id: 'v-api', label: 'API', focus: { nodeIds: ['api'], edgeIds: [] } },
    { id: 'v-db', label: 'Database', focus: { nodeIds: ['database'], edgeIds: ['persist'] } },
  ]
  document.story = [
    { id: 'st1', viewId: 'v-api', durationMs: 800 },
    { id: 'st2', viewId: 'v-db', durationMs: 800 },
  ]
  return document
}

function buildArtifact(
  document: DiagramDocument,
  options: {
    includeSource?: boolean
    metadata?: 'minimal' | 'all'
    theme?: 'light' | 'dark'
    registry?: ReturnType<typeof createRendererRegistry>
  } = {},
) {
  const runtime = readFileSync('dist/standalone/viewer.js', 'utf8')
  const css = readFileSync('dist/viewer.css', 'utf8')
  const fonts = {
    sans: new Uint8Array(readFileSync('dist/fonts/geist-sans.woff2')),
    mono: new Uint8Array(readFileSync('dist/fonts/geist-mono.woff2')),
  }
  const result = exportDocumentHtml(document, {
    runtime,
    css,
    fonts,
    includeSource: options.includeSource,
    metadata: options.metadata,
    theme: options.theme,
    registry: options.registry,
  })
  if (!result.ok) throw Error(JSON.stringify(result.diagnostics))
  const directory = mkdtempSync(join(tmpdir(), 'adl-html-'))
  const file = join(directory, 'diagram.html')
  writeFileSync(file, result.value.html)
  return { file, html: result.value.html, receipt: result.value.receipt, fonts }
}

/** Extract the embedded runtime payload separately from the optional source. */
function runtimePayload(html: string): string {
  const match = /<script type="application\/json" id="aesthc-document">([\s\S]*?)<\/script>/.exec(
    html,
  )
  if (!match) throw Error('missing runtime payload')
  return match[1]
}
function sourcePayload(html: string): string | null {
  const match = /<script type="application\/json" id="aesthc-source">([\s\S]*?)<\/script>/.exec(
    html,
  )
  return match ? match[1] : null
}

test('T38.1 the artifact works from file:// with zero network and zero storage', async ({
  page,
  browser,
}) => {
  const artifact = buildArtifact(offlineDocument())
  const requests: string[] = []
  page.on('request', (request) => requests.push(request.url()))
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`file://${artifact.file}`)
  const viewer = page.locator('.adl-viewer')
  await expect(viewer).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Offline platform' })).toBeVisible()
  // Fonts travel inside the artifact and are active for measurement/rendering.
  await page.waitForFunction(() => document.fonts.status === 'loaded')
  expect(await page.evaluate(() => document.fonts.check('16px Geist'))).toBe(true)
  // Search, route and manual story navigation work offline.
  await page.getByLabel('Origin node').fill('client')
  await page.keyboard.press('Enter')
  await page.getByLabel('Destination node').fill('worker')
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Show route', exact: true }).click()
  await expect(page.getByText('Route Web client → Email worker', { exact: false })).toBeVisible()
  const story = page.getByRole('group', { name: 'Story' })
  await story.getByRole('button', { name: 'Next' }).click()
  await expect(story.getByText('1/2', { exact: true })).toBeVisible()
  await story.getByRole('button', { name: 'Next' }).click()
  await expect(story.getByText('2/2', { exact: true })).toBeVisible()
  // The self-contained artifact has no serious automated accessibility violations.
  const accessibility = await new AxeBuilder({ page }).analyze()
  expect(
    accessibility.violations.filter(
      (issue) => issue.impact === 'serious' || issue.impact === 'critical',
    ),
  ).toEqual([])
  // Theme comes from the document.
  await expect(viewer).toHaveAttribute('data-theme', 'light')
  // No network, no storage, no page errors.
  const resources = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .map((entry) => entry.name)
      .filter(
        (name) =>
          !name.startsWith('data:') && !name.startsWith('file:') && !name.startsWith('blob:'),
      ),
  )
  expect(resources).toEqual([])
  expect(requests.filter((url) => !url.startsWith('file://') && !url.startsWith('data:'))).toEqual(
    [],
  )
  expect(
    await page.evaluate(() => {
      try {
        return localStorage.length
      } catch {
        return 0
      }
    }),
  ).toBe(0)
  expect(errors).toEqual([])
  expect(artifact.receipt.bytes).toBeLessThanOrEqual(8 * 1024 * 1024)
  expect(artifact.receipt.sourceIncluded).toBe(false)
  expect(artifact.html).not.toContain('<script type="application/json" id="aesthc-source">')
  // A second context with JS disabled keeps the static fallback readable.
  const context = await browser.newContext({ javaScriptEnabled: false })
  const staticPage = await context.newPage()
  await staticPage.goto(`file://${artifact.file}`)
  await expect(staticPage.locator('#aesthc-fallback')).toBeVisible()
  await expect(staticPage.locator('.aesthc-static svg')).toBeVisible()
  await expect(
    staticPage.locator('#aesthc-fallback strong').filter({ hasText: 'Web client' }),
  ).toBeVisible()
  await expect(staticPage.getByRole('heading', { name: 'Entities' })).toBeVisible()
  await expect(staticPage.getByRole('heading', { name: 'Relations' })).toBeVisible()
  await context.close()
})

test('T38.2 malicious labels stay data and the source JSON only travels explicitly', async ({
  page,
  browser,
}) => {
  const made = createDocument(
    {
      type: 'graph',
      caption: 'Hostile artifact',
      legend: { main: 'Main', branch: 'Branch' },
      nodes: [
        {
          id: 'evil',
          label: '</script><script>window.__pwned=1</script>Alert',
          kind: 'Service',
          description: '<img src=x onerror="window.__pwned2=1">',
        },
      ],
      edges: [],
    },
    { id: 'hostile-document', locale: 'en' },
  )
  if (!made.ok) throw Error(JSON.stringify(made.diagnostics))
  const artifact = buildArtifact(made.value)
  expect(artifact.html).not.toMatch(/<\/script><script>window\.__pwned/)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`file://${artifact.file}`)
  await expect(page.getByRole('heading', { name: 'Hostile artifact' })).toBeVisible()
  expect(
    await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned),
  ).toBeUndefined()
  expect(
    await page.evaluate(() => (window as unknown as { __pwned2?: number }).__pwned2),
  ).toBeUndefined()
  await expect(page.locator('.adl-viewer-stage text[data-node-label="true"]')).toContainText(
    'Alert',
  )
  expect(errors).toEqual([])
  // No-JS rendering keeps the literal escaped text visible.
  const context = await browser.newContext({ javaScriptEnabled: false })
  const staticPage = await context.newPage()
  await staticPage.goto(`file://${artifact.file}`)
  await expect(
    staticPage.locator('#aesthc-fallback strong').filter({ hasText: 'Alert' }),
  ).toBeVisible()
  await context.close()
  // includeSource is the only way the canonical JSON is embedded.
  const withSource = buildArtifact(made.value, { includeSource: true })
  expect(withSource.html).toContain('id="aesthc-source"')
  expect(withSource.receipt.sourceIncluded).toBe(true)
  const sourceContext = await browser.newContext()
  const sourcePage = await sourceContext.newPage()
  await sourcePage.goto(`file://${withSource.file}`)
  const source = await sourcePage.evaluate(
    () => document.getElementById('aesthc-source')?.textContent ?? '',
  )
  expect(JSON.parse(source)).toMatchObject({ format: 'aesthc-diagram', id: 'hostile-document' })
  await sourceContext.close()
})

test('portable metadata is allowlisted and independent from source inclusion', async () => {
  const document = offlineDocument()
  document.metadata.nodes.api = {
    roles: ['backend'],
    tags: ['core'],
    notes: 'PRIVATE_NODE_NOTE',
    links: [{ label: 'private', href: 'https://example.com/private' }],
    evidence: [
      {
        id: 'e1',
        repository: 'https://github.com/example/repo',
        commit: 'a'.repeat(40),
        path: 'src/index.ts',
        startLine: 1,
        endLine: 2,
      },
    ],
  }
  document.metadata.edges.request = {
    roles: [],
    tags: [],
    notes: 'PRIVATE_EDGE_NOTE',
    links: [{ label: 'private', href: 'https://example.com/edge' }],
  }
  document.extensions = { 'com.example.audit': { secret: 'PRIVATE_EXTENSION' } }
  const minimal = buildArtifact(document)
  expect(minimal.receipt.metadata).toBe('minimal')
  const runtime = runtimePayload(minimal.html)
  for (const sentinel of [
    'PRIVATE_NODE_NOTE',
    'PRIVATE_EDGE_NOTE',
    'PRIVATE_EXTENSION',
    'https://example.com/private',
    'https://example.com/edge',
  ])
    expect(runtime).not.toContain(sentinel)
  // Displayed semantics survive the projection.
  expect(JSON.parse(runtime.replaceAll('\\u003c', '<'))).toMatchObject({
    metadata: { nodes: { api: { roles: ['backend'], tags: ['core'] } } },
  })
  const all = buildArtifact(document, { metadata: 'all' })
  expect(all.receipt.metadata).toBe('all')
  expect(runtimePayload(all.html)).toContain('PRIVATE_EDGE_NOTE')
  expect(runtimePayload(all.html)).toContain('PRIVATE_EXTENSION')
  // Minimal runtime plus exact canonical source: the source is the only place
  // private data travels, and source=false removes it again.
  const withSource = buildArtifact(document, { includeSource: true })
  expect(runtimePayload(withSource.html)).not.toContain('PRIVATE_EDGE_NOTE')
  expect(sourcePayload(withSource.html)).toContain('PRIVATE_EDGE_NOTE')
  expect(sourcePayload(buildArtifact(document).html)).toBeNull()
})

test('the CSP only allows the exact runtime hash and blocks added inline scripts', async ({
  page,
}) => {
  const artifact = buildArtifact(offlineDocument())
  expect(artifact.html).toMatch(/script-src 'sha256-[A-Za-z0-9+/=]+'/)
  expect(artifact.html).not.toContain("script-src 'unsafe-inline'")
  await page.goto(`file://${artifact.file}`)
  await expect(page.locator('.adl-viewer')).toBeVisible()
  await page.evaluate(() => {
    const script = document.createElement('script')
    script.textContent = 'window.__cspExtra = 1'
    document.body.appendChild(script)
  })
  expect(
    await page.evaluate(() => (window as unknown as { __cspExtra?: number }).__cspExtra),
  ).toBeUndefined()
})

test('the export theme override reaches the hydrated standalone runtime', async ({ page }) => {
  const artifact = buildArtifact(offlineDocument(), { theme: 'dark' })
  expect(artifact.html).toContain('data-theme="dark"')
  await page.goto(`file://${artifact.file}`)
  await expect(page.locator('.adl-viewer')).toHaveAttribute('data-theme', 'dark')
})

test('custom node rendering survives standalone boot without executable renderer code', async ({
  page,
  browser,
}) => {
  const made = createDocument(
    {
      type: 'graph',
      caption: 'Frozen badge',
      legend: { main: 'Main', branch: 'Branch' },
      nodes: [
        { id: 'plain', label: 'Plain', description: '' },
        {
          id: 'custom',
          label: 'Custom',
          description: '',
          renderer: { typeKey: 'frozen-badge', data: { label: 'Ready' } },
        },
      ],
      edges: [{ id: 'e', from: 'plain', to: 'custom' }],
    },
    { id: 'frozen-document', locale: 'en' },
  )
  if (!made.ok) throw Error(JSON.stringify(made.diagnostics))
  const registry = createRendererRegistry()
  const registered = registry.register({
    typeKey: 'frozen-badge',
    validate: (data) => ({ ok: true, diagnostics: [], value: data }),
    measure: () => ({ width: 220, height: 90 }),
    renderSvg: (_data, context) =>
      `<g data-custom-renderer="frozen-badge"><rect x="${context.x}" y="${context.y}" width="220" height="90" fill="#16a34a"/><text x="${context.x + 110}" y="${context.y + 50}" text-anchor="middle" fill="#ffffff">Ready</text></g>`,
  })
  expect(registered.ok).toBe(true)
  const artifact = buildArtifact(made.value, { registry })
  expect(artifact.receipt.frozenCustomNodes).toBe(1)
  await page.goto(`file://${artifact.file}`)
  await expect(page.locator('.adl-viewer')).toBeVisible()
  await expect(
    page.locator('.adl-viewer-stage [data-custom-renderer="frozen-badge"]'),
  ).toBeVisible()
  await expect(page.locator('[data-renderer-missing]')).toHaveCount(0)
  // JavaScript off keeps the same frozen rendering in the static fallback.
  const context = await browser.newContext({ javaScriptEnabled: false })
  const staticPage = await context.newPage()
  await staticPage.goto(`file://${artifact.file}`)
  await expect(
    staticPage.locator('#aesthc-fallback [data-custom-renderer="frozen-badge"]'),
  ).toBeVisible()
  await context.close()
})
