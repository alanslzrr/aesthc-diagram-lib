import { readFileSync } from 'node:fs'
import { test, expect, type Page } from '@playwright/test'

/** One current-document export workflow shared by the Playground and Studio. */

async function openExport(page: Page) {
  await page.goto('/playground.html?only=example-band')
  await page.getByRole('button', { name: 'Export', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Export document' })).toBeVisible()
}

async function downloadFrom(page: Page, format: string): Promise<Buffer> {
  const select = page.getByLabel('Export format')
  await select.selectOption(format)
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download', exact: true }).click()
  const download = await pending
  expect(await download.failure()).toBeNull()
  const path = await download.path()
  if (!path) throw Error('download missing')
  return readFileSync(path)
}

test('Playground exports fresh JSON, SVG and PNG from the current document', async ({ page }) => {
  await openExport(page)
  const json = await downloadFrom(page, 'json')
  expect(JSON.parse(json.toString('utf8')).schemaVersion).toBe(1)
  const svg = await downloadFrom(page, 'svg')
  const svgText = svg.toString('utf8')
  expect(svgText).toContain('<svg')
  // Bundled fonts are mandatory by default, so the vector artifact is standalone.
  expect(svgText).toContain('data:font/woff2;base64,')
  const png = await downloadFrom(page, 'png')
  expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
  await expect(page.locator('[data-export-receipt]')).toContainText('revision')
})

test('selection scope is disabled without a selection and never falls back to the document', async ({
  page,
}) => {
  await openExport(page)
  const selectionRadio = page.locator('[data-export-scope="selection"]')
  await expect(selectionRadio).toBeDisabled()
  await expect(page.locator('[data-export-reason="selection.empty"]')).toBeVisible()
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  const hit = page.locator('.adl-editor-surface [data-hit-node]').first()
  await hit.click()
  const id = await hit.getAttribute('data-hit-node')
  await page.getByRole('button', { name: 'Export', exact: true }).click()
  await expect(selectionRadio).toBeEnabled()
  await selectionRadio.check()
  const svg = await downloadFrom(page, 'svg')
  const text = svg.toString('utf8')
  expect(text).toContain(`data-node-id="${id}"`)
  expect((text.match(/data-node-id="/g) ?? []).length).toBe(1)
  // JSON is document-only: switching formats resets the scope explicitly.
  await page.getByLabel('Export format').selectOption('json')
  await expect(page.getByRole('radio', { name: 'Document', exact: true })).toBeChecked()
})

test('raster formats are gated by an actual encoder probe, never by a declared mime type', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const originalData = HTMLCanvasElement.prototype.toDataURL
    HTMLCanvasElement.prototype.toDataURL = function (
      this: HTMLCanvasElement,
      type?: string,
      ...rest: number[]
    ) {
      return originalData.call(this, type === 'image/webp' ? 'image/png' : type, ...rest)
    }
    const originalBlob = HTMLCanvasElement.prototype.toBlob
    HTMLCanvasElement.prototype.toBlob = function (
      this: HTMLCanvasElement,
      callback: BlobCallback,
      type?: string,
      ...rest: number[]
    ) {
      return originalBlob.call(this, callback, type === 'image/webp' ? 'image/png' : type, ...rest)
    }
  })
  await page.goto('/playground.html?only=example-band')
  await page.getByRole('button', { name: 'Export', exact: true }).click()
  const format = page.getByLabel('Export format')
  const webp = format.locator('option[value="webp"]')
  await expect(webp).toHaveJSProperty('disabled', true)
  await expect(webp).toHaveAttribute('data-export-gate', 'raster.unavailable')
  await expect(
    page.locator('[data-export-reason="raster.unavailable"]').filter({ hasText: 'WebP' }),
  ).toBeVisible()
  await expect(format.locator('option[value="png"]')).toHaveJSProperty('disabled', false)
  // WebM additionally requires authored story steps.
  const webm = format.locator('option[value="webm"]')
  await expect(webm).toHaveJSProperty('disabled', true)
  await expect(webm).toHaveAttribute('data-export-gate', 'webm.empty')
})

test('JPEG cannot be transparent and the dialog says so instead of changing the request', async ({
  page,
}) => {
  await openExport(page)
  const format = page.getByLabel('Export format')
  await format.selectOption('jpeg')
  const transparent = page.locator('option[value="transparent"]')
  await expect(transparent).toHaveJSProperty('disabled', true)
  await expect(
    page.locator('[data-export-reason="background.jpeg"]').filter({ hasText: 'JPEG' }),
  ).toBeVisible()
  await format.selectOption('png')
  await expect(transparent).toHaveJSProperty('disabled', false)
})

test('source inclusion is opt-in, disclosed and leaves JSON as the canonical document', async ({
  page,
}) => {
  await openExport(page)
  await page.getByLabel('Export format').selectOption('svg')
  const source = page.getByRole('checkbox', { name: 'Include source JSON', exact: true })
  await expect(page.locator('[data-export-disclosure="source"]')).toContainText(
    'canonical document JSON',
  )
  await source.check()
  const svg = await downloadFrom(page, 'svg')
  expect(svg.toString('utf8')).toContain('id="aesthc-source"')
  // JSON is lossless by definition: the checkbox disappears and never becomes "minimal".
  await page.getByLabel('Export format').selectOption('json')
  await expect(source).toHaveCount(0)
  await expect(page.locator('[data-export-disclosure="canonical"]')).toContainText(
    'lossless canonical',
  )
})

test('an in-flight export reports progress and cancellations keep the last valid state', async ({
  page,
}) => {
  await page.route('**/*.woff2', async (route) => {
    // Page font-faces load as `font`; only the export service uses fetch().
    if (route.request().resourceType() !== 'fetch') {
      await route.continue()
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 1200))
    await route.continue()
  })
  await openExport(page)
  await page.getByLabel('Export format').selectOption('svg')
  let downloaded = false
  page.once('download', () => {
    downloaded = true
  })
  await page.getByRole('button', { name: 'Download', exact: true }).click()
  await expect(page.locator('[data-export-phase="fonts"]')).toBeVisible()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.locator('[data-export-error]')).toContainText('canceled')
  await page.waitForTimeout(1400)
  expect(downloaded).toBe(false)
  // A failed or canceled request never poisons the next one.
  await expect(page.getByRole('button', { name: 'Download', exact: true })).toBeEnabled()
  await page.unroute('**/*.woff2')
  const svg = await downloadFrom(page, 'svg')
  expect(svg.toString('utf8')).toContain('<svg')
})

test('the card export keeps its declared 1200x630 surface', async ({ page }) => {
  await openExport(page)
  await page.getByLabel('Export format').selectOption('card')
  await expect(page.locator('[data-export-dimensions]')).toContainText('1200')
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download', exact: true }).click()
  const download = await pending
  const path = await download.path()
  if (!path) throw Error('download missing')
  const base64 = readFileSync(path).toString('base64')
  const size = await page.evaluate(async (data) => {
    const blob = await (await fetch(`data:image/png;base64,${data}`)).blob()
    const bitmap = await createImageBitmap(blob)
    const result = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return result
  }, base64)
  expect(size).toEqual({ width: 1200, height: 630 })
})

test('HTML export reuses the public standalone runtime instead of a parallel renderer', async ({
  page,
}) => {
  await openExport(page)
  const format = page.getByLabel('Export format')
  await expect(format.locator('option[value="html"]')).toBeEnabled()
  await format.selectOption('html')
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download', exact: true }).click()
  const download = await pending
  const path = await download.path()
  if (!path) throw Error('download missing')
  const html = readFileSync(path, 'utf8')
  expect(html).toContain('<!doctype html>')
  expect(html).toContain('id="aesthc-document"')
  expect(html).toContain('Content-Security-Policy')
})
