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
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.toBlob
    HTMLCanvasElement.prototype.toBlob = function (
      callback: BlobCallback,
      type?: string,
      quality?: number,
    ) {
      return type === 'image/webp'
        ? original.call(this, callback, 'image/png', quality)
        : original.call(this, callback, type, quality)
    }
  })
  await page.goto('/studio.html')
  await page.getByLabel('Export format').selectOption('webp')
  await page.getByRole('button', { name: 'Download', exact: true }).click()
  await expect(page.getByText('export.mime', { exact: true })).toBeVisible()
  await expect(page.getByText('Exported revision', { exact: false })).toHaveCount(0)
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
