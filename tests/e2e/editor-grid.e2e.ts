import { test, expect, type Page } from '@playwright/test'

// UI-04: the editable surface owns one viewport-continuous grid. It covers
// every corner at any pan/zoom/document size, follows the camera phase, and
// disappears completely when the document turns the grid off.

/** Screen-pixel shift of the dot pattern between two fixed clips. */
async function dotShift(
  page: Page,
  first: Buffer,
  second: Buffer,
  spacing: number,
  expected: { x: number; y: number },
) {
  return page.evaluate(
    async ({ a, b, spacing, expected }) => {
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
        return {
          data: context.getImageData(0, 0, canvas.width, canvas.height).data,
          width: canvas.width,
          height: canvas.height,
        }
      }
      const source = draw(imageA)
      const target = draw(imageB)
      let best = { sx: 0, sy: 0, cost: Number.POSITIVE_INFINITY }
      for (let sx = -12; sx <= 12; sx++)
        for (let sy = -12; sy <= 12; sy++) {
          let sum = 0
          let count = 0
          for (let y = 0; y < source.height; y++)
            for (let x = 0; x < source.width; x++) {
              const bx = x + sx
              const by = y + sy
              if (bx < 0 || by < 0 || bx >= source.width || by >= source.height) continue
              const indexA = (y * source.width + x) * 4
              const indexB = (by * target.width + bx) * 4
              sum +=
                Math.abs(source.data[indexA] - target.data[indexB]) +
                Math.abs(source.data[indexA + 1] - target.data[indexB + 1]) +
                Math.abs(source.data[indexA + 2] - target.data[indexB + 2])
              count++
            }
          const cost = count ? sum / count : Number.POSITIVE_INFINITY
          if (cost < best.cost) best = { sx, sy, cost }
        }
      // The dot lattice is periodic: reconcile the best shift with the
      // expected motion modulo the projected spacing.
      const candidates = [-1, 0, 1].flatMap((k) => [
        { x: best.sx + k * spacing, y: best.sy, k },
        { x: best.sx, y: best.sy + k * spacing, k },
      ])
      const closest = candidates.reduce((current, candidate) =>
        Math.hypot(candidate.x - expected.x, candidate.y - expected.y) <
        Math.hypot(current.x - expected.x, current.y - expected.y)
          ? candidate
          : current,
      )
      return { ...best, matched: closest }
    },
    {
      a: `data:image/png;base64,${first.toString('base64')}`,
      b: `data:image/png;base64,${second.toString('base64')}`,
      spacing,
      expected,
    },
  )
}

/** First empty canvas spot near the middle, with dots and no geometry. */
async function emptyCanvasClip(page: Page) {
  const surface = page.locator('.adl-editor-surface')
  const box = (await surface.boundingBox())!
  const nodes = await page.locator('.adl-editor-surface [data-hit-node]').evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect()
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }
    }),
  )
  const centre = box.x + box.width / 2
  let best: { x: number; y: number; width: number; height: number } | null = null
  for (const fraction of [0.12, 0.42, 0.75, 0.88]) {
    const y = box.y + box.height * fraction
    for (let x = box.x + 24; x < box.x + box.width - 64; x += 4) {
      const free = nodes.every(
        (node) => x + 40 < node.left || x > node.right || y + 40 < node.top || y > node.bottom,
      )
      if (free && (best === null || Math.abs(x - centre) < Math.abs(best.x - centre)))
        best = { x: Math.round(x), y: Math.round(y), width: 40, height: 40 }
    }
  }
  if (!best) throw new Error('no empty canvas region found')
  return best
}

async function gridInfo(page: Page) {
  return page.evaluate(() => {
    const surface = document.querySelector('.adl-editor-surface')
    const grid = surface?.querySelector('[data-editor-grid]')
    const surfaceRect = surface?.getBoundingClientRect()
    const gridRect = grid?.getBoundingClientRect()
    const pattern = grid
      ? (grid
          .closest('svg')
          ?.querySelector(`pattern[id="${grid.getAttribute('fill')?.slice(5, -1)}"]`) ?? null)
      : null
    return {
      count: surface?.querySelectorAll('[data-editor-grid]').length ?? 0,
      // A scene grid would paint a rect that references the document pattern.
      sceneGrids: surface?.querySelectorAll('rect[fill^="url(#grid-"]').length ?? 0,
      offset: pattern?.getAttribute('patternTransform') ?? null,
      spacing: pattern?.getAttribute('width') ?? null,
      viewport: (() => {
        const group = surface?.querySelector('svg[role="group"] > g[transform]')
        return group?.getAttribute('transform') ?? null
      })(),
      cover:
        gridRect && surfaceRect
          ? {
              left: Math.round(gridRect.left - surfaceRect.left),
              top: Math.round(gridRect.top - surfaceRect.top),
              right: Math.round(surfaceRect.right - gridRect.right),
              bottom: Math.round(surfaceRect.bottom - gridRect.bottom),
            }
          : null,
    }
  })
}

test('grid covers the viewport in every corner and reacts to pan and resize', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Pointer pan is covered on desktop projects')
  await page.goto('/playground.html?only=example-timeline')
  await expect(page.locator('.adl-editor-surface [data-hit-node]').first()).toBeVisible()

  const initial = await gridInfo(page)
  expect(initial.count).toBe(1)
  // Only the editor grid exists; the scene grid stays out of the editable view.
  expect(initial.sceneGrids).toBe(0)
  for (const edge of ['left', 'top', 'right', 'bottom'] as const)
    expect(Math.abs(initial.cover![edge]), `grid must cover the ${edge} edge`).toBeLessThanOrEqual(
      1,
    )
  // Extreme zoom-out reduces visual density without changing document snap.
  const zoom = Number(/([\d.]+)\)$/.exec(initial.viewport ?? '')?.[1] ?? '1')
  const renderedSpacing = Number(initial.spacing ?? '0')
  expect(renderedSpacing * zoom).toBeGreaterThanOrEqual(12)

  // The pattern lives in world space inside the camera group, so it must not
  // carry a second phase transform.
  expect(initial.offset).toBeNull()
  const surface = page.locator('.adl-editor-surface')
  await surface.scrollIntoViewIfNeeded()
  const scrollBefore = await page.evaluate(() => window.scrollY)
  const clip = await emptyCanvasClip(page)
  const surfaceBefore = (await surface.boundingBox())!
  const firstClip = await page.screenshot({ clip, animations: 'disabled' })
  const node = page.locator('.adl-editor-surface [data-hit-node]').first()
  const nodeBefore = (await node.boundingBox())!
  const drag = { x: 5, y: 3 }
  await page.getByRole('button', { name: 'Pan', exact: true }).click()
  await page.mouse.move(surfaceBefore.x + 12, surfaceBefore.y + 12)
  await page.mouse.down()
  await page.mouse.move(surfaceBefore.x + 12 + drag.x, surfaceBefore.y + 12 + drag.y, { steps: 3 })
  await page.mouse.up()
  expect(await page.evaluate(() => window.scrollY), 'the pan must not scroll the page').toBe(
    scrollBefore,
  )
  const nodeAfter = (await node.boundingBox())!
  const moved = { x: nodeAfter.x - nodeBefore.x, y: nodeAfter.y - nodeBefore.y }
  expect(Math.hypot(moved.x - drag.x, moved.y - drag.y)).toBeLessThan(1)
  const secondClip = await page.screenshot({ clip, animations: 'disabled' })
  const projectedSpacing = Number(initial.spacing ?? '16') * zoom
  const shift = await dotShift(page, firstClip, secondClip, projectedSpacing, moved)
  expect(
    Math.hypot(shift.matched.x - moved.x, shift.matched.y - moved.y),
    `dots moved (${shift.matched.x}, ${shift.matched.y}), geometry moved (${moved.x}, ${moved.y})`,
  ).toBeLessThanOrEqual(1.5)
  const panned = await gridInfo(page)
  expect(panned.offset).toBeNull()
  for (const edge of ['left', 'top', 'right', 'bottom'] as const)
    expect(
      Math.abs(panned.cover![edge]),
      `grid must cover the ${edge} edge after pan`,
    ).toBeLessThanOrEqual(1)

  await page.setViewportSize({ width: 900, height: 640 })
  await expect
    .poll(async () => {
      const resized = await gridInfo(page)
      return Math.max(...Object.values(resized.cover ?? { gap: 999 }).map(Math.abs))
    })
    .toBeLessThanOrEqual(1)
})

test('Show grid removes the single grid layer everywhere', async ({ page }) => {
  await page.goto('/playground.html?only=example-timeline')
  await expect(page.locator('.adl-editor-surface [data-hit-node]').first()).toBeVisible()
  expect((await gridInfo(page)).count).toBe(1)
  await page.getByLabel('Show grid', { exact: true }).uncheck()
  await expect.poll(async () => (await gridInfo(page)).count).toBe(0)
  await page.getByLabel('Show grid', { exact: true }).check()
  await expect.poll(async () => (await gridInfo(page)).count).toBe(1)
})
