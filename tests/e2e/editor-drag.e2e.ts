import { test, expect, type Locator, type Page } from '@playwright/test'

// One authored node per layout. Free layouts move the rectangle; structured
// layouts must keep their semantics (band, lane, order) instead of faking a
// graph conversion. Every gesture persists and undoes as a single entry.
const CASES = [
  { key: 'example-flowchart', node: 'build', dx: 96, dy: 48 },
  { key: 'example-er', node: 'categories', dx: 88, dy: 64 },
  { key: 'example-state-machine', node: 'payment', dx: 72, dy: 56 },
  { key: 'example-band', node: 'validate', dx: 230, dy: 0 },
  { key: 'example-swimlane', node: 'triage', dx: 0, dy: 150 },
  { key: 'example-sequence', node: 'api', dx: 170, dy: 0 },
  { key: 'example-timeline', node: 'beta', dx: 150, dy: 0 },
] as const

function nodeGroup(page: Page, id: string): Locator {
  // The authored markup lives in the aria-hidden baseline overlay; the
  // interactive hit rect on the main surface tracks the same geometry.
  return page.locator(`.adl-editor-surface > svg[role="group"] [data-hit-node="${id}"]`).first()
}

test.beforeEach(async ({ page, isMobile }) => {
  if (!isMobile) await page.setViewportSize({ width: 1280, height: 1000 })
})

async function dragFromTo(page: Page, from: { x: number; y: number }, dx: number, dy: number) {
  const viewport = page.viewportSize()!
  expect(from.y + dy, 'drag destination must stay in the visible viewport').toBeLessThan(
    viewport.height,
  )
  expect(from.x + dx).toBeLessThan(viewport.width)
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + dx, from.y + dy, { steps: 10 })
  await page.mouse.up()
}

/** Screen center relative to the surface, so page scroll cannot skew a delta. */
async function center(locator: Locator, page: Page) {
  const box = await locator.boundingBox()
  const surface = await page.locator('.adl-editor-surface').boundingBox()
  expect(box, 'node must be visible before dragging').not.toBeNull()
  expect(surface).not.toBeNull()
  return {
    x: box!.x - surface!.x + box!.width / 2,
    y: box!.y - surface!.y + box!.height / 2,
    absolute: { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 },
  }
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

for (const item of CASES) {
  test(`drag moves ${item.key} and persists with one undo entry`, async ({ page, isMobile }) => {
    test.skip(isMobile, 'Pointer drag is covered on desktop projects')
    await page.goto(`/playground.html?only=${item.key}`)
    const node = nodeGroup(page, item.node)
    await expect(node).toBeVisible()
    const before = await center(node, page)
    const undo = page.getByRole('button', { name: 'Undo', exact: true })
    await expect(undo).toBeDisabled()

    await dragFromTo(page, before.absolute, item.dx, item.dy)
    await expect(undo).toBeEnabled()

    const after = await center(node, page)
    expect(distance(after, before), `${item.key} must visibly change position`).toBeGreaterThan(32)

    await undo.click()
    await expect.poll(async () => distance(await center(node, page), before)).toBeLessThan(8)

    await page.getByRole('button', { name: 'Redo', exact: true }).click()
    await expect.poll(async () => distance(await center(node, page), after)).toBeLessThan(8)
  })
}

test('dragging an imported graph node persists its scene position', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Pointer drag is covered on desktop projects')
  await page.goto('/playground.html?only=example-band')
  await expect(page.locator('.adl-editor-surface [data-node-id]').first()).toBeVisible()
  const graph = {
    type: 'graph',
    caption: 'Drag graph',
    legend: { main: 'Main', branch: 'Branch' },
    nodes: [
      { id: 'left', label: 'Left', description: '' },
      { id: 'right', label: 'Right', description: '' },
    ],
    edges: [{ id: 'e1', from: 'left', to: 'right' }],
  }
  page.once('dialog', (dialog) => dialog.accept())
  await page.locator('input[type="file"]').setInputFiles({
    name: 'graph.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(graph)),
  })
  const node = nodeGroup(page, 'left')
  await expect(node).toBeVisible()
  const before = await center(node, page)
  await dragFromTo(page, before.absolute, 110, 70)
  const after = await center(node, page)
  expect(distance(after, before)).toBeGreaterThan(32)
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect.poll(async () => distance(await center(node, page), before)).toBeLessThan(8)
})

test('drag previews and commits updated connections', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Pointer drag is covered on desktop projects')
  await page.goto('/playground.html?only=example-flowchart')
  const node = nodeGroup(page, 'build')
  await expect(node).toBeVisible()
  const edge = page.locator('.adl-editor-surface [data-edge-id] path').first()
  const before = await edge.getAttribute('d')
  await dragFromTo(page, (await center(node, page)).absolute, 96, 48)
  await expect.poll(async () => edge.getAttribute('d')).not.toBe(before)
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect.poll(async () => edge.getAttribute('d')).toBe(before)
})

test('a locked node refuses to move', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Pointer drag is covered on desktop projects')
  await page.goto('/playground.html?only=example-flowchart')
  const node = nodeGroup(page, 'build')
  await expect(node).toBeVisible()
  await node.click()
  await page.getByRole('button', { name: 'Lock', exact: true }).click()
  const locked = await center(node, page)
  await dragFromTo(page, locked.absolute, 96, 48)
  expect(distance(await center(node, page), locked)).toBeLessThan(2)
})

test('a canceled drag rolls back with no history entry', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Pointer drag is covered on desktop projects')
  await page.goto('/playground.html?only=example-flowchart')
  const node = nodeGroup(page, 'build')
  await expect(node).toBeVisible()
  const undo = page.getByRole('button', { name: 'Undo', exact: true })
  await expect(undo).toBeDisabled()
  const before = await center(node, page)
  const surface = page.locator('.adl-editor-surface')
  const box = (await surface.boundingBox())!
  // Engines assign different mouse pointer IDs. Cancel the pointer that
  // actually started this gesture, not Chromium's conventional ID 1.
  await surface.evaluate((element) => {
    element.addEventListener(
      'pointerdown',
      (event) => {
        element.setAttribute('data-test-pointer-id', String((event as PointerEvent).pointerId))
      },
      { once: true },
    )
  })
  await page.mouse.move(before.absolute.x, before.absolute.y)
  await page.mouse.down()
  await page.mouse.move(before.absolute.x + 80, before.absolute.y + 40, { steps: 6 })
  const pointerId = Number(await surface.getAttribute('data-test-pointer-id'))
  expect(Number.isFinite(pointerId)).toBe(true)
  await page.locator('.adl-editor-surface > svg[role="group"]').dispatchEvent('pointercancel', {
    pointerId,
    pointerType: 'mouse',
    clientX: box.x + 10,
    clientY: box.y + 10,
    bubbles: true,
  })
  await page.mouse.up()
  await expect(undo).toBeDisabled()
  expect(distance(await center(node, page), before)).toBeLessThan(2)
})

test('Pan mode drags the camera and leaves the document untouched', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Pointer drag is covered on desktop projects')
  await page.goto('/playground.html?only=example-flowchart')
  const node = nodeGroup(page, 'build')
  await expect(node).toBeVisible()
  const undo = page.getByRole('button', { name: 'Undo', exact: true })
  await expect(undo).toBeDisabled()
  await page.getByRole('button', { name: 'Pan', exact: true }).click()
  const surface = page.locator('.adl-editor-surface')
  const box = (await surface.boundingBox())!
  await dragFromTo(page, { x: box.x + box.width / 2, y: box.y + box.height / 2 }, 60, 40)
  await expect(undo).toBeDisabled()
})
