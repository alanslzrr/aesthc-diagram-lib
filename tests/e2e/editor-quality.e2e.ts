import { test, expect } from '@playwright/test'

function longLabelDocument(labels: string[]) {
  return JSON.stringify({
    format: 'aesthc-diagram',
    schemaVersion: 1,
    id: 'quality-fixture',
    revision: 0,
    locale: 'en',
    spec: {
      type: 'graph',
      caption: 'Quality fixture',
      legend: { main: 'Main', branch: 'Branch' },
      nodes: labels.map((label, i) => ({
        id: `n${i}`,
        label,
        description: '',
        kind: i % 2 ? 'Service' : 'Application',
      })),
      edges: labels.slice(0, -1).map((_, i) => ({
        id: `e${i}`,
        from: `n${i}`,
        to: `n${i + 1}`,
      })),
    },
    scene: {
      mode: 'manual',
      nodes: Object.fromEntries(
        labels.map((_, i) => [
          `n${i}`,
          { x: i * 480, y: 100, width: 420, height: 72, locked: false },
        ]),
      ),
      routes: {},
      groups: [],
      zOrder: labels.map((_, i) => `n${i}`),
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

test('T36.2 publish export measures long labels with embedded fonts without clipping', async ({
  page,
}) => {
  await page.goto('/studio.html')
  await page.getByText('Document JSON', { exact: true }).click()
  const json = page.getByRole('textbox', { name: 'Document JSON' })
  await json.fill(
    longLabelDocument([
      'Kafka event gateway consumption pipeline',
      'Mensaje de confirmación de pedido en cola',
      'Postgres replica read endpoint',
      'Servicio de notificación asíncrona',
      'API gateway authentication middleware',
    ]),
  )
  await page.getByRole('button', { name: 'Apply JSON' }).click()
  await expect(page.getByRole('button', { name: /Kafka event gateway/ })).toBeVisible()
  await page.getByLabel('Export quality').selectOption('publish')
  await page.getByLabel('Export format').selectOption('svg')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download', exact: true }).click()
  await downloadPromise
  await expect(
    page.getByText('Exported revision', { exact: false }).filter({ hasNotText: 'quality.' }),
  ).toBeVisible()
  await expect(page.getByText(/quality\./)).toHaveCount(0)
})

test('T36.2 missing font metrics surface an actionable error and never a false success', async ({
  page,
}) => {
  await page.goto('/studio.html')
  // Fonts are served with invalid bytes: the export fails with a precise code
  // and no artifact is produced.
  await page.route('**/*.woff2', (route) =>
    route.fulfill({ status: 200, contentType: 'font/woff2', body: 'not-a-font' }),
  )
  await page.getByText('Document JSON', { exact: true }).click()
  const json = page.getByRole('textbox', { name: 'Document JSON' })
  await json.fill(longLabelDocument(['A', 'B']))
  await page.getByRole('button', { name: 'Apply JSON' }).click()
  await expect(page.getByRole('button', { name: 'A', exact: true })).toBeVisible()
  await page.getByLabel('Export quality').selectOption('publish')
  await page.getByRole('button', { name: 'Download', exact: true }).click()
  await expect(page.getByText('export.font-invalid', { exact: true })).toBeVisible()
  await expect(page.getByText('Exported revision', { exact: false })).toHaveCount(0)
})
