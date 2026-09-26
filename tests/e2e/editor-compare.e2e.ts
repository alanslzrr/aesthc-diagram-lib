import { readFileSync } from 'node:fs'
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

function fixture(overrides: {
  revision: number
  apiLabel?: string
  moveClient?: boolean
  renameWorker?: boolean
}) {
  const client = {
    id: 'client',
    label: 'Web client',
    description: 'Entry point.',
    kind: 'Application',
  }
  const api = {
    id: 'api',
    label: overrides.apiLabel ?? 'Order API',
    description: 'Records orders.',
    kind: 'Service',
  }
  const workerId = overrides.renameWorker ? 'worker-v2' : 'worker'
  const worker = {
    id: workerId,
    label: 'Email worker',
    description: 'Sends mail.',
    kind: 'Service',
  }
  const database = { id: 'database', label: 'Orders', description: 'Stores.', kind: 'Database' }
  const edges = [
    { id: 'request', from: 'client', to: 'api', label: 'HTTPS' },
    { id: 'persist', from: 'api', to: 'database', label: 'Write' },
    { id: 'notify', from: 'api', to: workerId, label: 'Queue' },
  ]
  return JSON.stringify({
    format: 'aesthc-diagram',
    schemaVersion: 1,
    id: 'compare-fixture',
    revision: overrides.revision,
    locale: 'en',
    spec: {
      type: 'graph',
      caption: 'Compare fixture',
      legend: { main: 'Main', branch: 'Branch' },
      nodes: [client, api, database, worker],
      edges,
    },
    scene: {
      mode: 'manual',
      nodes: {
        client: { x: overrides.moveClient ? 40 : 0, y: 120, width: 160, height: 64, locked: false },
        api: { x: 240, y: 120, width: 160, height: 64, locked: false },
        database: { x: 480, y: 120, width: 160, height: 64, locked: false },
        [workerId]: { x: 240, y: 280, width: 160, height: 64, locked: false },
      },
      routes: {},
      groups: [],
      zOrder: ['client', 'api', 'database', workerId],
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

async function importBase(page: import('@playwright/test').Page, json: string) {
  await page.setInputFiles('input[type="file"]', {
    name: 'base.json',
    mimeType: 'application/json',
    buffer: Buffer.from(json),
  })
  await page.getByRole('heading', { name: 'Compare fixture', exact: true }).waitFor()
}

async function importAfter(page: import('@playwright/test').Page, json: string) {
  const input = page.locator('input[type="file"]').nth(1)
  await input.setInputFiles({
    name: 'after.json',
    mimeType: 'application/json',
    buffer: Buffer.from(json),
  })
}

test('T49.2 before/delta/after navigation keeps exact IDs and exports a receipt', async ({
  page,
}) => {
  await page.goto('/viewer.html')
  await importBase(page, fixture({ revision: 0 }))
  await importAfter(
    page,
    fixture({ revision: 1, apiLabel: 'Order API v2', moveClient: true, renameWorker: true }),
  )
  const comparison = page.getByRole('region', { name: 'Comparison' })
  await expect(comparison).toBeVisible()
  // 1 semantic label change + 1 presentation-only move + rename = remove + add.
  await expect(comparison.getByRole('status')).toContainText(
    '1 added · 1 removed · 3 modified (1 presentation-only)',
  )
  const changes = comparison.getByRole('listbox', { name: 'Changes' })
  const options = changes.getByRole('option')
  await expect(options.filter({ hasText: 'removed · worker' })).toHaveCount(1)
  await expect(options.filter({ hasText: 'added · worker-v2' })).toHaveCount(1)
  await expect(options.filter({ hasText: 'modified · api' })).toHaveCount(1)
  await expect(options.filter({ hasText: 'modified · client' })).toHaveCount(1)
  // Keyboard navigation selects exact entities in the preview.
  await changes.focus()
  await page.keyboard.press('ArrowDown')
  const selected = await changes.getAttribute('aria-activedescendant')
  expect(selected).toBeTruthy()
  await expect(comparison.locator('[data-query-highlight="true"]')).toHaveCount(1)
  // Before/After toggle renders each side without mutating them.
  await comparison.getByLabel('Before', { exact: true }).check()
  await expect(comparison.locator('.adl-viewer-comparison-stage svg')).toBeVisible()
  await comparison.getByLabel('After', { exact: true }).check()
  // The comparison surface has no serious automated accessibility violations.
  const accessibility = await new AxeBuilder({ page }).analyze()
  expect(
    accessibility.violations.filter(
      (issue) => issue.impact === 'serious' || issue.impact === 'critical',
    ),
  ).toEqual([])
  // Export: real download with exact IDs and no merge-safety claim.
  const downloadPromise = page.waitForEvent('download')
  await comparison.getByRole('button', { name: 'Export comparison JSON' }).click()
  const download = await downloadPromise
  const receipt = JSON.parse(readFileSync((await download.path())!, 'utf8'))
  expect(receipt.mergeSafety).toBe(false)
  expect(receipt.nodes.find((entry: { id: string }) => entry.id === 'worker')).toMatchObject({
    status: 'removed',
  })
  expect(receipt.nodes.find((entry: { id: string }) => entry.id === 'worker-v2')).toMatchObject({
    status: 'added',
  })
  expect(
    receipt.nodes.find((entry: { id: string }) => entry.id === 'client').presentation.length,
  ).toBeGreaterThan(0)
})

test('T49.2 an incompatible document rejects without mutating the preview', async ({ page }) => {
  await page.goto('/viewer.html')
  await importBase(page, fixture({ revision: 0 }))
  await importAfter(
    page,
    JSON.stringify({
      format: 'aesthc-diagram',
      schemaVersion: 1,
      id: 'sequence-after',
      revision: 1,
      locale: 'en',
      spec: {
        type: 'sequence',
        caption: 'Sequence after',
        legend: { main: 'Main', branch: 'Branch' },
        participants: [
          { id: 'client', label: 'Client' },
          { id: 'server', label: 'Server' },
        ],
        messages: [{ id: 'm1', from: 'client', to: 'server' }],
      },
      scene: { mode: 'auto', nodes: {}, routes: {}, groups: [], zOrder: ['client', 'server'] },
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
    }),
  )
  const comparison = page.getByRole('region', { name: 'Comparison' })
  await expect(comparison.getByRole('alert')).toContainText('compare.incompatible')
  // The base viewer document is untouched and still visible.
  await expect(page.getByRole('heading', { name: 'Compare fixture' })).toBeVisible()
})
