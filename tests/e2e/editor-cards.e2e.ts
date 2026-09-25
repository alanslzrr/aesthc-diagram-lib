import { readFileSync } from 'node:fs'
import { test, expect } from '@playwright/test'
import { cardSvg } from '../../dist/export/index.js'
import { createDocument } from '../../dist/editor-core/index.js'

function cyclicFixture() {
  const made = createDocument(
    {
      type: 'graph',
      caption: 'Cyclic platform',
      legend: { main: 'Main', branch: 'Branch' },
      nodes: [
        { id: 'a', label: 'Alpha', description: '' },
        { id: 'b', label: 'Beta', description: '' },
        { id: 'c', label: 'Gamma', description: '' },
        { id: 'd', label: 'Delta', description: '' },
      ],
      edges: [
        { id: 'ab-1', from: 'a', to: 'b', label: 'first' },
        { id: 'ab-2', from: 'a', to: 'b', label: 'parallel' },
        { id: 'bc', from: 'b', to: 'c' },
        { id: 'ca', from: 'c', to: 'a' },
      ],
    },
    { id: 'card-fixture', locale: 'en' },
  )
  if (!made.ok) throw Error(JSON.stringify(made.diagnostics))
  return made.value
}

async function decodePng(page: import('@playwright/test').Page, path: string) {
  const base64 = readFileSync(path).toString('base64')
  return page.evaluate(async (data) => {
    const blob = await (await fetch(`data:image/png;base64,${data}`)).blob()
    const bitmap = await createImageBitmap(blob)
    const result = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return result
  }, base64)
}

test('T41.1 route and reach cards decode at 1200x630 with an exact non-canonical receipt', async ({
  page,
}) => {
  await page.goto('/viewer.html')
  // Load the cyclic fixture with an explicit parallel relation.
  const fixture = cyclicFixture()
  await page.setInputFiles('input[type="file"]', {
    name: 'card-fixture.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(fixture)),
  })
  await expect(page.getByRole('heading', { name: 'Cyclic platform' })).toBeVisible()
  // Route with the parallel edge.
  await page.getByLabel('Origin node').fill('alpha')
  await page.keyboard.press('Enter')
  await page.getByLabel('Destination node').fill('gamma')
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Show route', exact: true }).click()
  await expect(page.getByText('Route Alpha → Gamma', { exact: false })).toBeVisible()
  const routeDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export card PNG', exact: true }).click()
  const routeCard = await routeDownload
  const routeDims = await decodePng(page, (await routeCard.path())!)
  expect(routeDims).toEqual({ width: 1200, height: 630 })
  // Reach stays finite over the cycle and its card decodes at the fixed size.
  await page.getByLabel('Origin node').fill('gamma')
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Show reach', exact: true }).click()
  await expect(page.getByText('Reach from Gamma downstream', { exact: false })).toBeVisible()
  const reachDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export card PNG', exact: true }).click()
  const reachCard = await reachDownload
  const reachDims = await decodePng(page, (await reachCard.path())!)
  expect(reachDims).toEqual({ width: 1200, height: 630 })
})

test('T41.1 the card SVG fits the whole graph, marks exact parallel ids and reports canonical=false', () => {
  const document = cyclicFixture()
  const query = cardSvg(document, {
    query: {
      documentId: document.id,
      revision: document.revision,
      nodeIds: ['a', 'b', 'c'],
      edgeIds: ['ab-1', 'bc', 'ca'],
      label: 'Route Alpha → Gamma',
    },
  })
  if (!query.ok) throw Error(JSON.stringify(query.diagnostics))
  expect(query.value.canonical).toBe(false)
  const markup = query.value.svg.replace(/<style>[\s\S]*?<\/style>/g, '')
  // Whole graph: every node is part of the card, highlighted or not.
  for (const id of ['a', 'b', 'c', 'd']) expect(markup).toContain(`data-node-id="${id}"`)
  expect(markup).toContain('data-edge-id="ab-1" data-query-highlight="true"')
  expect(markup).not.toContain('data-edge-id="ab-2" data-query-highlight="true"')
  const canonical = cardSvg(document)
  if (!canonical.ok) throw Error(JSON.stringify(canonical.diagnostics))
  expect(canonical.value.canonical).toBe(true)
  expect(canonical.value.svg).not.toContain('data-query-highlight')
})
