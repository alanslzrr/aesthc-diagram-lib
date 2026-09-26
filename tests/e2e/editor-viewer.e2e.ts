import { test, expect } from '@playwright/test'

function viewerDocument(revision: number, extraEdge = false) {
  const nodes = [
    { id: 'a', label: 'Café', description: 'Accented entry.', kind: 'Service' },
    { id: 'b', label: 'café', description: 'Lowercase twin.', kind: 'Database' },
    { id: 'c', label: 'Gateway', description: 'Middle hop.', kind: 'Cafe' },
    { id: 'd', label: 'Café Store', description: 'Terminal.', kind: 'Service' },
  ]
  const edges = [
    { id: 'ac-1', from: 'a', to: 'c', label: 'first' },
    { id: 'ac-2', from: 'a', to: 'c', label: 'parallel' },
    { id: 'cd', from: 'c', to: 'd' },
    ...(extraEdge ? [{ id: 'new-edge', from: 'd', to: 'b' }] : []),
  ]
  return JSON.stringify({
    format: 'aesthc-diagram',
    schemaVersion: 1,
    id: 'viewer-fixture',
    revision,
    locale: 'en',
    spec: {
      type: 'graph',
      caption: 'Semantic fixture',
      legend: { main: 'Main', branch: 'Branch' },
      nodes,
      edges,
    },
    scene: {
      mode: 'manual',
      nodes: Object.fromEntries(
        nodes.map((n, i) => [n.id, { x: i * 220, y: 120, width: 160, height: 60, locked: false }]),
      ),
      routes: {},
      groups: [],
      zOrder: nodes.map((n) => n.id),
    },
    presentation: {
      theme: {
        mode: 'light',
        light: {
          background: '#e9eef4',
          foreground: '#202b38',
          card: '#f9fbfd',
          border: '#aebdcd',
          mutedForeground: '#536273',
          cobalt: '#087cbd',
          branch: '#a66b21',
        },
        dark: {
          background: '#070707',
          foreground: '#f2f2ee',
          card: '#101010',
          border: '#242424',
          mutedForeground: '#a8a8a1',
          cobalt: '#14a8ff',
          branch: '#d6a55e',
        },
      },
      grid: { visible: true, snap: true, size: 16 },
      padding: 32,
      legend: 'visible',
      edgeStyle: 'orthogonal',
      textScale: 1,
    },
    metadata: { nodes: {}, edges: {}, visuals: {} },
    views: [],
    story: [],
    extensions: {},
  })
}

async function importJson(page: import('@playwright/test').Page, revision: number) {
  await page.setInputFiles('input[type="file"]', {
    name: 'fixture.json',
    mimeType: 'application/json',
    buffer: Buffer.from(viewerDocument(revision)),
  })
  await page.getByRole('heading', { name: 'Semantic fixture', exact: true }).waitFor()
}

test('T32.1 finder orders results deterministically and announces zero results', async ({
  page,
}) => {
  await page.goto('/viewer.html')
  await importJson(page, 0)
  const origin = page.getByRole('combobox', { name: 'Origin node' })
  const options = page.getByRole('listbox', { name: 'Origin node' }).getByRole('option')
  await origin.fill('café')
  await expect(options).toHaveCount(3)
  // Authored order, not alphabetical: Café, café, Café Store; the "Cafe" kind never matches.
  await expect(options.nth(0)).toContainText('Café')
  await expect(options.nth(0)).toContainText('a · Service')
  await expect(options.nth(1)).toContainText('b · Database')
  await expect(options.nth(2)).toContainText('Café Store')
  // Unicode case-insensitive, original text preserved.
  await origin.fill('CAFÉ')
  await expect(options).toHaveCount(3)
  // Exact ID wins.
  await origin.fill('d')
  await expect(options.first()).toContainText('d · Service')
  // Zero results are announced.
  await origin.fill('zzz')
  await expect(page.getByRole('status').filter({ hasText: 'No matches' })).toBeVisible()
  // Escape clears the query and keeps focus on the trigger.
  await page.keyboard.press('Escape')
  await expect(options).toHaveCount(0)
  await expect(origin).toBeFocused()
})

test('T32.1 parallel relations keep their exact IDs in the inspector', async ({ page }) => {
  await page.goto('/viewer.html')
  await importJson(page, 0)
  const origin = page.getByRole('combobox', { name: 'Origin node' })
  await origin.fill('café')
  await page.keyboard.press('Enter')
  await expect(page.getByText('✓ a', { exact: true })).toBeVisible()
  const inspector = page.locator('.adl-viewer-inspector')
  await expect(inspector).toContainText('Café')
  const outgoing = inspector.getByRole('list').getByRole('button')
  await expect(outgoing).toHaveCount(2)
  await expect(outgoing.nth(0)).toContainText('ac-1')
  await expect(outgoing.nth(1)).toContainText('ac-2')
  await outgoing.nth(1).click()
  await expect(inspector.getByText('ac-2', { exact: true })).toBeVisible()
  await expect(inspector).toContainText('Gateway')
})

test('T32.2 a stale query invalidates highlight and export when the document changes', async ({
  page,
}) => {
  await page.goto('/viewer.html')
  await importJson(page, 0)
  const origin = page.getByRole('combobox', { name: 'Origin node' })
  await origin.fill('café')
  await page.keyboard.press('Enter')
  const destination = page.getByRole('combobox', { name: 'Destination node' })
  await destination.fill('store')
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Show route', exact: true }).click()
  await expect(page.getByText('Route Café → Café Store', { exact: false })).toBeVisible()
  await expect(page.getByRole('button', { name: 'ac-1', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'cd', exact: true })).toBeVisible()
  await expect(page.locator('.adl-viewer-stage [data-query-highlight="true"]')).toHaveCount(5)
  const exportButton = page.getByRole('button', { name: 'Export query SVG', exact: true })
  await expect(exportButton).toBeEnabled()
  // The document changes (revision bump + a new relation): the receipt is stale.
  await importJson(page, 2)
  await expect(page.getByText('The document changed.', { exact: false })).toBeVisible()
  await expect(page.locator('.adl-viewer-stage [data-query-highlight="true"]')).toHaveCount(0)
  await expect(exportButton).toBeDisabled()
})
