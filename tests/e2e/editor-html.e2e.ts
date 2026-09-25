import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test, expect } from '@playwright/test'
import { createDocument } from '../../dist/editor-core/index.js'
import type { DiagramDocument } from '../../dist/editor-core/index.js'
import { exportDocumentHtml } from '../../dist/export/index.js'

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

function buildArtifact(document: DiagramDocument, options: { includeSource?: boolean } = {}) {
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
  })
  if (!result.ok) throw Error(JSON.stringify(result.diagnostics))
  const directory = mkdtempSync(join(tmpdir(), 'adl-html-'))
  const file = join(directory, 'diagram.html')
  writeFileSync(file, result.value.html)
  return { file, html: result.value.html, receipt: result.value.receipt, fonts }
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
