import { test, expect, type Locator, type Page } from '@playwright/test'

// A01: the viewport grid is decorative background. It must paint below the
// confirmed geometry, so toggling it may only change empty canvas pixels, never
// the interior of an opaque card; this holds before a drag, during the gesture
// preview and after commit/undo, in both themes.

async function setTheme(page: Page, theme: 'light' | 'dark') {
  const current = await page.evaluate(() => document.documentElement.dataset.theme)
  if (current === theme) return
  await page.getByRole('button', { name: theme === 'dark' ? 'Dark' : 'Light' }).click()
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe(theme)
}

function interiorClip(box: { x: number; y: number; width: number; height: number }) {
  return {
    x: Math.round(box.x + box.width - 24),
    y: Math.round(box.y + box.height - 24),
    width: 12,
    height: 12,
  }
}

/** First empty spot along the surface midline that keeps a margin from nodes. */
async function emptyCanvasClip(page: Page, surface: Locator) {
  const box = (await surface.boundingBox())!
  const nodes = await page.locator('.adl-editor-surface [data-hit-node]').evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect()
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }
    }),
  )
  const y = box.y + box.height * 0.42
  const centre = box.x + box.width / 2
  let best: { x: number; y: number; width: number; height: number } | null = null
  for (let x = box.x + 16; x < box.x + box.width - 40; x += 4) {
    const free = nodes.every(
      (node) => x + 20 < node.left || x > node.right || y + 20 < node.top || y > node.bottom,
    )
    if (free && (best === null || Math.abs(x - centre) < Math.abs(best.x - centre)))
      best = { x: Math.round(x), y: Math.round(y), width: 20, height: 20 }
  }
  if (!best) return { x: Math.round(centre), y: Math.round(y), width: 20, height: 20 }
  return best
}

async function screenshot(
  page: Page,
  clip: { x: number; y: number; width: number; height: number },
) {
  return page.screenshot({ clip, animations: 'disabled' })
}

/** Toggle without Playwright scrolling the inspector into view. */
async function setGrid(page: Page, visible: boolean) {
  await page.getByLabel('Show grid').evaluate((element, next) => {
    const input = element as HTMLInputElement
    if (input.checked !== next) input.click()
  }, visible)
  await expect(page.locator('.adl-editor-surface [data-editor-grid]')).toHaveCount(visible ? 1 : 0)
}

/** Pixel diff with a small threshold so anti-aliasing is not a false positive. */
async function pixelDiff(page: Page, first: Buffer, second: Buffer) {
  return page.evaluate(
    async ({ a, b }) => {
      const load = (source: string) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image()
          image.onload = () => resolve(image)
          image.onerror = () => reject(new Error('image decode failed'))
          image.src = source
        })
      const [imageA, imageB] = await Promise.all([load(a), load(b)])
      const draw = (image: HTMLImageElement) => {
        const canvas = document.createElement('canvas')
        canvas.width = image.width
        canvas.height = image.height
        const context = canvas.getContext('2d')!
        context.drawImage(image, 0, 0)
        return context.getImageData(0, 0, canvas.width, canvas.height).data
      }
      const dataA = draw(imageA)
      const dataB = draw(imageB)
      let changed = 0
      for (let index = 0; index < dataA.length; index += 4) {
        const delta =
          Math.abs(dataA[index] - dataB[index]) +
          Math.abs(dataA[index + 1] - dataB[index + 1]) +
          Math.abs(dataA[index + 2] - dataB[index + 2])
        if (delta > 12) changed++
      }
      return { changed, total: dataA.length / 4 }
    },
    {
      a: `data:image/png;base64,${first.toString('base64')}`,
      b: `data:image/png;base64,${second.toString('base64')}`,
    },
  )
}

test('the grid layer paints below the confirmed geometry', async ({ page }) => {
  await page.goto('/playground.html?only=example-band')
  await expect(page.locator('.adl-editor-surface [data-hit-node]').first()).toBeVisible()
  const layers = await page.evaluate(() => {
    const surface = document.querySelector('.adl-editor-surface')!
    const [baseline, interactive] = [...surface.querySelectorAll(':scope > svg')]
    const grid = baseline?.querySelector('[data-editor-grid]')
    const geometry = baseline?.querySelector('[data-node-surface]')
    return {
      gridExists: Boolean(grid),
      geometryExists: Boolean(geometry),
      geometryFollowsGrid:
        Boolean(grid && geometry) &&
        (grid!.compareDocumentPosition(geometry!) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
      interactiveHasGrid: Boolean(interactive?.querySelector('[data-editor-grid]')),
      gridPosition: getComputedStyle(baseline!).position,
      zIndexes: [baseline, interactive].map((svg) => getComputedStyle(svg!).zIndex),
    }
  })
  expect(layers.gridExists, 'a grid layer must exist').toBe(true)
  expect(layers.geometryExists, 'confirmed geometry must exist').toBe(true)
  expect(layers.geometryFollowsGrid, 'geometry must follow the grid in paint order').toBe(true)
  expect(layers.interactiveHasGrid, 'the interactive layer must not paint the grid').toBe(false)
  expect(layers.gridPosition).toBe('absolute')
  expect(layers.zIndexes.every((value) => value === 'auto')).toBe(true)
})

test('toggling the grid never changes opaque card interiors', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Pixel-level card comparison is exercised on desktop projects')
  await page.goto('/playground.html?only=example-band')
  await expect(page.locator('.adl-editor-surface [data-node-surface]').first()).toBeVisible()
  const surface = page.locator('.adl-editor-surface')
  const surfaceRect = page.locator('.adl-editor-surface [data-node-surface]').first()

  for (const theme of ['light', 'dark'] as const) {
    await setTheme(page, theme)
    const inside = interiorClip((await surfaceRect.boundingBox())!)
    const outside = await emptyCanvasClip(page, surface)
    const gridInside = await screenshot(page, inside)
    const gridOutside = await screenshot(page, outside)
    await setGrid(page, false)
    expect(
      (await pixelDiff(page, await screenshot(page, inside), gridInside)).changed,
      `${theme}: card interior must be identical without the grid`,
    ).toBe(0)
    expect(
      (await pixelDiff(page, await screenshot(page, outside), gridOutside)).changed,
      `${theme}: empty canvas must change with the grid`,
    ).toBeGreaterThan(0)
    await setGrid(page, true)
  }

  // After a committed drag the same invariant holds for the moved card. The
  // grid toggles here add history after the drag, so this test checks pixels
  // only; the Undo contract lives in its own test without toggles.
  const firstHit = page.locator('.adl-editor-surface [data-hit-node]').first()
  const firstBox = (await firstHit.boundingBox())!
  await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(
    firstBox.x + firstBox.width / 2 + 96,
    firstBox.y + firstBox.height / 2 + 48,
    { steps: 8 },
  )
  await page.mouse.up()
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeEnabled()
  const inside = interiorClip((await surfaceRect.boundingBox())!)
  const on = await screenshot(page, inside)
  await setGrid(page, false)
  expect(
    (await pixelDiff(page, await screenshot(page, inside), on)).changed,
    'committed: moved card interior must be identical without the grid',
  ).toBe(0)
  await setGrid(page, true)
})

test('undo restores the dragged node and does not touch the grid state', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Pointer drag is exercised on desktop projects')
  await page.goto('/playground.html?only=example-flowchart')
  await expect(page.locator('.adl-editor-surface [data-hit-node]').first()).toBeVisible()
  const surface = page.locator('.adl-editor-surface')
  await surface.scrollIntoViewIfNeeded()
  const node = page.locator('.adl-editor-surface [data-hit-node]').first()
  const relative = async () => {
    const nodeBox = (await node.boundingBox())!
    const surfaceBox = (await surface.boundingBox())!
    return { x: nodeBox.x - surfaceBox.x, y: nodeBox.y - surfaceBox.y }
  }
  const gridCount = () => page.locator('.adl-editor-surface [data-editor-grid]').count()
  const undo = page.getByRole('button', { name: 'Undo', exact: true })
  const redo = page.getByRole('button', { name: 'Redo', exact: true })

  for (const theme of ['light', 'dark'] as const) {
    await setTheme(page, theme)
    expect(await gridCount(), `${theme}: grid starts visible`).toBe(1)
    const before = await relative()
    const box = (await node.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + 96, box.y + box.height / 2 + 48, { steps: 8 })
    await page.mouse.up()
    const moved = await relative()
    expect(
      Math.hypot(moved.x - before.x, moved.y - before.y),
      `${theme}: drag committed`,
    ).toBeGreaterThan(32)

    await undo.click()
    await expect
      .poll(async () => {
        const current = await relative()
        return Math.hypot(current.x - before.x, current.y - before.y)
      })
      .toBeLessThan(2)
    expect(await gridCount(), `${theme}: undo must not change the grid`).toBe(1)

    await redo.click()
    await expect
      .poll(async () => {
        const current = await relative()
        return Math.hypot(current.x - moved.x, current.y - moved.y)
      })
      .toBeLessThan(2)
    expect(await gridCount(), `${theme}: redo must not change the grid`).toBe(1)

    await undo.click()
    await expect
      .poll(async () => {
        const current = await relative()
        return Math.hypot(current.x - before.x, current.y - before.y)
      })
      .toBeLessThan(2)
  }
})

test('the gesture preview also ignores the grid on card interiors', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Pointer preview is exercised on desktop projects')
  await page.goto('/playground.html?only=example-band')
  await expect(page.locator('.adl-editor-surface [data-hit-node]').first()).toBeVisible()
  const hit = page.locator('.adl-editor-surface [data-hit-node]').first()
  const initialBox = (await hit.boundingBox())!
  const previewShot = async (withGrid: boolean) => {
    await setGrid(page, withGrid)
    const box = (await hit.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2 + 40, { steps: 6 })
    await page.waitForTimeout(80)
    // The dragged node is rendered by the delta pass in the interactive layer.
    const preview = page
      .locator('.adl-editor-surface > svg[role="group"] [data-node-surface]')
      .first()
    const clip = interiorClip((await preview.boundingBox())!)
    const shot = await screenshot(page, clip)
    await page.keyboard.press('Escape')
    await page.mouse.up()
    // Escape cancels the gesture: the node returns to its committed position.
    expect(
      Math.abs((await hit.boundingBox())!.x - (await initialBox).x),
      'canceled preview must roll back',
    ).toBeLessThan(2)
    return shot
  }
  const withGrid = await previewShot(true)
  const withoutGrid = await previewShot(false)
  expect(
    (await pixelDiff(page, withoutGrid, withGrid)).changed,
    'preview card interior must be identical without the grid',
  ).toBe(0)
})
