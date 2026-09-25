import { randomBytes } from 'node:crypto'
import { test, expect } from '@playwright/test'

function documentJson(descriptions: string[]) {
  const nodes = descriptions.map((description, i) => ({
    id: `n${i}`,
    label: `Node ${i}`,
    description,
  }))
  return JSON.stringify({
    format: 'aesthc-diagram',
    schemaVersion: 1,
    id: 'share-fixture',
    revision: 0,
    locale: 'en',
    spec: {
      type: 'graph',
      caption: 'Share fixture',
      legend: { main: 'Main', branch: 'Branch' },
      nodes,
      edges: descriptions.slice(0, -1).map((_, i) => ({
        id: `e${i}`,
        from: `n${i}`,
        to: `n${i + 1}`,
      })),
    },
    scene: { mode: 'auto', nodes: {}, routes: {}, groups: [], zOrder: nodes.map((n) => n.id) },
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

async function importDocument(page: import('@playwright/test').Page, json: string) {
  await page.getByText('Document JSON', { exact: true }).click()
  await page.getByRole('textbox', { name: 'Document JSON' }).fill(json)
  await page.getByRole('button', { name: 'Apply JSON' }).click()
}

test('T40.2 an oversized share link offers a local JSON download and never announces success', async ({
  page,
}) => {
  await page.goto('/studio.html')
  // High-entropy descriptions keep the compressed link above the URL limit.
  await importDocument(
    page,
    documentJson(Array.from({ length: 1000 }, () => randomBytes(48).toString('hex'))),
  )
  await expect(page.getByRole('button', { name: 'Node 0', exact: true })).toBeVisible()
  const requests: string[] = []
  page.on('request', (request) => requests.push(request.url()))
  await page.getByRole('button', { name: 'Share link', exact: true }).click()
  await expect(
    page.getByText('The share link exceeds the URL limit. Download JSON instead.'),
  ).toBeVisible()
  await expect(page.getByText('Share link copied.')).toHaveCount(0)
  expect(requests.filter((url) => !url.startsWith('http://127.0.0.1'))).toEqual([])
})

test('T40.2 a denied clipboard falls back to the JSON download message without a false success', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error('denied')) },
    })
  })
  await page.goto('/studio.html')
  await page.getByRole('button', { name: 'Share link', exact: true }).click()
  await expect(page.getByText('The clipboard was denied. Download JSON instead.')).toBeVisible()
  await expect(page.getByText('Share link copied.')).toHaveCount(0)
})
