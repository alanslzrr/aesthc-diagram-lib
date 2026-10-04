import { expect, test } from '@playwright/test'
import { createDocument } from '../../dist/editor-core/index.js'

test('manual graph commits preserve untouched SVG identity and repaint undo and redo', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Desktop pointer transaction; touch has separate gesture coverage')
  const made = createDocument(
    {
      type: 'graph',
      caption: 'Incremental baseline',
      legend: { main: 'Main', branch: 'Branch' },
      nodes: [
        { id: 'left', label: 'Left', description: '' },
        { id: 'right', label: 'Right', description: '' },
      ],
      edges: [{ id: 'link', from: 'left', to: 'right', label: 'Link' }],
    },
    { id: 'incremental', locale: 'en' },
  )
  if (!made.ok) throw Error('Invalid fixture')
  made.value.scene.mode = 'manual'
  made.value.scene.nodes = {
    left: { x: 0, y: 0, width: 180, height: 80, locked: false },
    right: { x: 360, y: 0, width: 180, height: 80, locked: false },
  }
  await page.goto('/playground.html?only=example-band')
  page.once('dialog', (dialog) => dialog.accept())
  await page.locator('input[type="file"]').setInputFiles({
    name: 'incremental.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(made.value)),
  })
  const surface = page.locator('.adl-editor-surface')
  const baseline = surface.locator('svg[aria-hidden="true"]').first()
  const right = baseline.locator('[data-node-id="right"]')
  await expect(right).toBeVisible()
  const original = await right.elementHandle()
  const left = baseline.locator('[data-node-id="left"]')
  const before = await left.innerHTML()
  const hit = surface.locator('[data-hit-node="left"]').first()
  const box = await hit.boundingBox()
  if (!box) throw Error('Missing hit target')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 64, box.y + box.height / 2 + 48, { steps: 8 })
  await page.mouse.up()
  await expect.poll(() => left.innerHTML()).not.toBe(before)
  const moved = await left.innerHTML()
  expect(await right.evaluate((node, previous) => node === previous, original)).toBe(true)
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect.poll(() => left.innerHTML()).toBe(before)
  // Undo restores an independent history document; full canonical fallback is valid.
  await page.getByRole('button', { name: 'Redo', exact: true }).click()
  await expect.poll(() => left.innerHTML()).toBe(moved)
})
