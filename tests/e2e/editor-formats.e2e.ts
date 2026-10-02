import { test, expect } from '@playwright/test'
import { exportDocument } from '../../dist/export/index.js'
import { createDocument } from '../../dist/editor-core/index.js'

test('T42.1 a browser without real WebP disables the format instead of renaming a PNG', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.toDataURL
    HTMLCanvasElement.prototype.toDataURL = function (type?: string) {
      return type === 'image/webp' ? original.call(this, 'image/png') : original.call(this, type)
    }
  })
  await page.goto('/studio.html')
  await expect(page.locator('option[value="webp"]')).toHaveAttribute('disabled', '')
  await expect(page.locator('option[value="png"]')).not.toHaveAttribute('disabled', '')
  await expect(page.locator('option[value="jpeg"]')).not.toHaveAttribute('disabled', '')
})

test('T42.1 a WebP encode that returns PNG fails with export.mime and downloads nothing', async ({
  page,
}) => {
  // WebKit cannot encode WebP at all, so its honest probe disables the format
  // before the sabotage could run. Reproduce the environment this contract
  // protects against — a probe that claims WebP while the encoder yields
  // another MIME — on every engine, then verify the runtime check rejects it.
  await page.addInitScript(() => {
    const nativeToDataURL = HTMLCanvasElement.prototype.toDataURL
    const nativeToBlob = HTMLCanvasElement.prototype.toBlob
    const state = window as unknown as { __webpEncodeLies: boolean }
    state.__webpEncodeLies = false
    HTMLCanvasElement.prototype.toDataURL = function (type?: string) {
      const value = nativeToDataURL.call(this, type)
      return type === 'image/webp'
        ? value.replace(/^data:image\/[a-z]+/, 'data:image/webp')
        : value
    }
    HTMLCanvasElement.prototype.toBlob = function (
      callback: BlobCallback,
      type?: string,
      quality?: number,
    ) {
      if (type === 'image/webp' && !state.__webpEncodeLies) {
        callback(new Blob(['webp-probe'], { type: 'image/webp' }))
        return
      }
      if (type === 'image/webp') {
        return nativeToBlob.call(this, callback, 'image/png', quality)
      }
      return nativeToBlob.call(this, callback, type, quality)
    }
  })
  await page.goto('/studio.html')
  // The mount-time capability probe must have accepted WebP before the encode
  // is sabotaged, so the export pipeline still verifies the produced blob.
  const webp = page.locator('option[value="webp"]')
  await expect(webp).toHaveAttribute('data-export-gate', 'ok')
  await page.evaluate(() => {
    ;(window as unknown as { __webpEncodeLies: boolean }).__webpEncodeLies = true
  })
  await page.getByLabel('Export format').selectOption('webp')
  let downloaded = false
  page.once('download', () => {
    downloaded = true
  })
  await page.getByRole('button', { name: 'Download', exact: true }).click()
  await expect(page.locator('[data-export-error]')).toContainText('export.mime')
  await expect(page.locator('[data-export-receipt]')).toHaveCount(0)
  await page.waitForTimeout(300)
  expect(downloaded).toBe(false)
})

test('T42.1 JPEG never silently changes a transparent background', async () => {
  const made = createDocument(
    {
      type: 'graph',
      caption: 'Formats fixture',
      legend: { main: 'Main', branch: 'Branch' },
      nodes: [{ id: 'a', label: 'A', description: '' }],
      edges: [],
    },
    { id: 'formats-fixture', locale: 'en' },
  )
  if (!made.ok) throw Error(JSON.stringify(made.diagnostics))
  const result = await exportDocument(made.value, {
    format: 'jpeg',
    scope: { type: 'document' },
    theme: 'light',
    quality: 'edit',
    background: 'transparent',
    scale: 1,
    includeSource: false,
    metadata: 'minimal',
    fontPolicy: 'fallback',
  })
  expect(result.ok).toBe(false)
  expect(result.diagnostics.some((d) => d.code === 'export.alpha')).toBe(true)
})
