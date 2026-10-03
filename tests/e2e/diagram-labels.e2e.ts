import { readFile } from 'node:fs/promises'
import { test, expect, type Page } from '@playwright/test'

// Connection and continuation labels must stay inside their pills. The pill is
// centered on the label coordinate, so the text needs `text-anchor="middle"`.
// The matrix covers both examples, both locales and three zoom levels, and the
// shared renderer's exported SVG (Chromium/Firefox; see the skip note).

const EXAMPLES = ['example-sequence', 'example-band'] as const
const LOCALES = ['en', 'es'] as const
const ZOOMS = [50, 100, 200] as const

interface LabelBounds {
  id: string | null
  anchor: string
  left: number
  right: number
  top: number
  bottom: number
  screenLeft: number
  screenRight: number
}

async function labelBounds(page: Page, root: string): Promise<LabelBounds[]> {
  return page.evaluate((selector) => {
    const container = document.querySelector(selector)
    if (!container) throw new Error(`missing root ${selector}`)
    return [...container.querySelectorAll('[data-edge-label], [data-continuation-label]')].map(
      (group) => {
        const rect = group.querySelector('rect') as SVGGraphicsElement
        const text = group.querySelector('text') as SVGGraphicsElement
        const pill = rect.getBBox()
        const bounds = text.getBBox()
        const screenPill = rect.getBoundingClientRect()
        const screenText = text.getBoundingClientRect()
        return {
          id:
            group.getAttribute('data-edge-label') ?? group.getAttribute('data-continuation-label'),
          anchor: getComputedStyle(text).textAnchor,
          left: bounds.x - pill.x,
          right: pill.x + pill.width - (bounds.x + bounds.width),
          top: bounds.y - pill.y,
          bottom: pill.y + pill.height - (bounds.y + bounds.height),
          screenLeft: screenText.left - screenPill.left,
          screenRight: screenPill.right - screenText.right,
        }
      },
    )
  }, root)
}

async function expectInside(page: Page, root: string, padding: number, context: string) {
  const labels = await labelBounds(page, root)
  expect(labels.length, `${context}: labels must exist`).toBeGreaterThan(0)
  for (const label of labels) {
    expect(label.anchor, `${context}: ${label.id} must be centered`).toBe('middle')
    expect(label.left, `${context}: ${label.id} left padding`).toBeGreaterThanOrEqual(padding)
    expect(label.right, `${context}: ${label.id} right padding`).toBeGreaterThanOrEqual(padding)
    expect(label.top, `${context}: ${label.id} top padding`).toBeGreaterThanOrEqual(-0.5)
    expect(label.bottom, `${context}: ${label.id} bottom padding`).toBeGreaterThanOrEqual(-0.5)
    expect(label.screenLeft, `${context}: ${label.id} on screen`).toBeGreaterThanOrEqual(-0.5)
    expect(label.screenRight, `${context}: ${label.id} on screen`).toBeGreaterThanOrEqual(-0.5)
  }
}

/** Click the structural camera controls until the toolbar reports the target. */
async function zoomTo(page: Page, target: number) {
  const zoom = page.getByRole('status', { name: 'Zoom' })
  const camera = page.locator('.adl-editor-toolbar .adl-editor-group').nth(2)
  const zoomOut = camera.locator('button').nth(0)
  const zoomIn = camera.locator('button').nth(1)
  const tolerance = Math.max(2, target * 0.05)
  let current = Number.parseInt((await zoom.textContent()) ?? '0', 10)
  for (let step = 0; step < 12 && Math.abs(current - target) > tolerance; step++) {
    await (current < target ? zoomIn : zoomOut).click()
    current = Number.parseInt((await zoom.textContent()) ?? '0', 10)
  }
  expect(
    Math.abs(current - target),
    `zoom to ${target}% (reached ${current}%)`,
  ).toBeLessThanOrEqual(tolerance)
  return current
}

for (const example of EXAMPLES) {
  for (const locale of LOCALES) {
    for (const zoom of ZOOMS) {
      test(`${example} ${locale.toUpperCase()} keeps labels inside pills at ~${zoom}%`, async ({
        page,
        isMobile,
      }) => {
        test.skip(isMobile, 'Zoom controls are exercised on desktop projects')
        await page.addInitScript((value) => localStorage.setItem('adl-locale', value), locale)
        await page.goto(`/playground.html?only=${example}`)
        await expect(page.locator('.adl-editor-surface [data-hit-node]').first()).toBeVisible()
        // Pills are measured with the loaded Geist metrics; wait so the
        // resolved widths are final before measuring at each zoom.
        await page.evaluate(() => document.fonts.ready)
        expect(await page.evaluate(() => document.fonts.check('11.25px "Geist Mono"'))).toBe(true)
        const achieved = await zoomTo(page, zoom)
        await expectInside(page, '.adl-editor-surface', 1, `${example} ${locale} @${achieved}%`)
      })
    }
  }
}

test('delayed Geist loading still yields pill padding once the fonts arrive', async ({ page }) => {
  await page.route('**/*.woff2', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1200))
    await route.continue()
  })
  await page.goto('/playground.html?only=example-band')
  await expect(page.locator('.adl-editor-surface [data-hit-node]').first()).toBeVisible()
  const pillWidth = () =>
    page.evaluate(() => {
      const group = document.querySelector(
        '[data-edge-label="retry-ingress"], [data-continuation-label="retry-ingress"]',
      )
      const rect = group?.querySelector('rect')
      return rect ? Number(rect.getAttribute('width')) : 0
    })
  expect(await pillWidth()).toBeGreaterThan(0)
  await page.evaluate(() => document.fonts.load('11.25px Geist'))
  await page.evaluate(() => document.fonts.load('11.25px "Geist Mono"'))
  await page.evaluate(() => document.fonts.ready)
  expect(await page.evaluate(() => document.fonts.check('11.25px "Geist Mono"'))).toBe(true)
  // The scene re-resolves with real metrics once the faces are usable, so the
  // continuation pill keeps the agreed padding floor instead of cached
  // fallback widths.
  const retry = (await labelBounds(page, '.adl-editor-surface')).find(
    (label) => label.id === 'retry-ingress',
  )
  expect(retry, 'retry-ingress label').toBeTruthy()
  expect(retry!.left).toBeGreaterThanOrEqual(1)
  expect(retry!.right).toBeGreaterThanOrEqual(1)
})

test('the exported SVG centers labels and keeps them inside the pill', async ({
  page,
  browserName,
}) => {
  // WebKit headless does not emit download events for the panel export in this
  // environment (the same limitation affects the other export specs there).
  // Firefox and Chromium run this test; Firefox is not executable here.
  test.skip(browserName === 'webkit', 'Panel downloads are not observable on WebKit here')
  await page.goto('/?only=example-sequence')
  const panel = page.locator('[data-diagram-panel="example-sequence"]')
  await expect(panel.locator('svg[role="group"]')).toBeVisible()
  await panel.locator('.export-trigger').click()
  const pending = page.waitForEvent('download')
  await panel.getByRole('menuitem', { name: 'Download SVG', exact: true }).click()
  const download = await pending
  const markup = await readFile((await download.path())!, 'utf8')

  const groups = [...markup.matchAll(/data-edge-label="[^"]+"[^>]*>(.*?)<\/g>/g)]
  expect(groups.length).toBeGreaterThan(0)
  for (const [, body] of groups) {
    expect(body).toContain('text-anchor="middle"')
    const rect = /<rect x="([\d.-]+)"[^>]*width="([\d.-]+)"/.exec(body)
    const text = /<text x="([\d.-]+)"[^>]*text-anchor="middle"/.exec(body)
    expect(rect, 'pill rect must be present').not.toBeNull()
    expect(text, 'centered text must be present').not.toBeNull()
    const centre = Number(rect![1]) + Number(rect![2]) / 2
    expect(Math.abs(Number(text![1]) - centre)).toBeLessThanOrEqual(0.5)
  }

  // Render the exported artifact and measure the actual text bounds.
  const renderer = await page.context().newPage()
  await renderer.setContent(markup)
  await renderer.evaluate(() => document.fonts.ready)
  await expectInside(renderer, 'svg', -0.5, 'exported SVG')
  await renderer.close()
})

test('the longest shipped lane label fits its header with loaded fonts', async ({ page }) => {
  await page.goto('/playground.html?only=example-swimlane')
  await page.evaluate(() => document.fonts.ready)
  expect(await page.evaluate(() => document.fonts.check('11.25px "Geist Mono"'))).toBe(true)
  const measured = await page.evaluate(() => {
    const container = document.querySelector('[data-container-id="eng"]')
    const label = [...(container?.querySelectorAll('text') ?? [])].find(
      (element) => element.textContent?.trim() === 'ENGINEERING',
    )
    const header = container?.querySelector('rect')
    if (!container || !label || !header) return null
    const bounds = label.getBBox()
    return {
      family: getComputedStyle(label).fontFamily,
      size: Number.parseFloat(getComputedStyle(label).fontSize),
      start: Number(label.getAttribute('x')) - Number(header.getAttribute('x')),
      width: bounds.width,
    }
  })
  expect(measured, 'ENGINEERING lane label must render').not.toBeNull()
  expect(measured!.family).toContain('Geist Mono')
  expect(measured!.size).toBeCloseTo(11.25, 2)
  // Guards the same inequality as `layout-geometry.unit.spec.ts`, but with the
  // real glyph advance instead of the recorded constant: label starts at
  // x=18 and must keep an 8px gutter inside SWIMLANE_HEADER_W (118). The
  // lower bound is only a rendering sanity check; glyph width is host-font
  // dependent and must not be asserted with a platform-specific constant.
  expect(measured!.width, 'rendered ENGINEERING width').toBeGreaterThan(0)
  expect(measured!.start + measured!.width + 8).toBeLessThanOrEqual(118)
})
