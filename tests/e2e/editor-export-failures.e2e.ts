import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

async function exportNow(page: import('@playwright/test').Page, format: string) {
  await page.getByLabel('Export format').selectOption(format)
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download', exact: true }).click()
  const download = await downloadPromise
  const path = await download.path()
  if (!path) throw Error('download without path')
  return readFile(path, 'utf8')
}
const status = (page: import('@playwright/test').Page) => page.locator('.studio-message')

test('T28.2 exported SVG reparses as well-formed XML with resolvable ids and no handlers', async ({
  page,
}) => {
  await page.goto('/studio.html')
  const svg = await exportNow(page, 'SVG')
  const parsed = await page.evaluate((markup: string) => {
    const doc = new DOMParser().parseFromString(markup, 'image/svg+xml')
    const error = doc.querySelector('parsererror')
    const svg = doc.documentElement
    const ids = [...doc.querySelectorAll('[id]')].map((el) => el.getAttribute('id'))
    const handlers = [...doc.querySelectorAll('*')].filter((el) =>
      [...el.attributes].some((a) => a.name.startsWith('on')),
    )
    return {
      hasError: !!error,
      width: Number(svg.getAttribute('width')),
      height: Number(svg.getAttribute('height')),
      foreignObjects: doc.querySelectorAll('foreignObject').length,
      handlers: handlers.length,
      uniqueIds: new Set(ids).size,
    }
  }, svg)
  expect(parsed.hasError).toBe(false)
  expect(parsed.foreignObjects).toBe(0)
  expect(parsed.handlers).toBe(0)
  expect(parsed.width).toBeGreaterThan(0)
  expect(parsed.height).toBeGreaterThan(0)
  expect(parsed.uniqueIds).toBeGreaterThan(0)
})

test('T29.2 raster image failures report precise codes and a retry succeeds', async ({ page }) => {
  await page.addInitScript(() => {
    const original = window.Image
    ;(window as unknown as { __originalImage: unknown }).__originalImage = original
    class BrokenImage {
      onload: ((ev: Event) => unknown) | null = null
      onerror: ((ev: Event) => unknown) | null = null
      set src(_value: string) {
        setTimeout(() => this.onerror?.(new Event('error')), 0)
      }
    }
    ;(window as unknown as { Image: unknown }).Image = BrokenImage
  })
  await page.goto('/studio.html')
  await page.getByLabel('Export format').selectOption('PNG')
  await page.getByRole('button', { name: 'Download', exact: true }).click()
  await expect(status(page)).toContainText('export.image')
  await expect(page.getByText('No pending changes', { exact: true })).toBeVisible()
  await page.evaluate(() => {
    ;(window as unknown as { Image: unknown }).Image = (
      window as unknown as { __originalImage: unknown }
    ).__originalImage as typeof Image
  })
  const retryPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download', exact: true }).click()
  const retry = await retryPromise
  expect(await retry.path()).toBeTruthy()
  await expect(status(page)).toContainText('Exported revision')
})

test('T29.2 a null canvas blob fails encoding without reporting success', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.toBlob = function (callback: (blob: Blob | null) => void) {
      callback(null)
    }
  })
  await page.goto('/studio.html')
  await page.getByLabel('Export format').selectOption('PNG')
  await page.getByRole('button', { name: 'Download', exact: true }).click()
  await expect(status(page)).toContainText('export.encode')
  await expect(page.getByText('No pending changes', { exact: true })).toBeVisible()
})

test('T39.2 exports keep notes, links and extensions out of the SVG and JSON carries source', async ({
  page,
}) => {
  await page.goto('/studio.html')
  await page.getByText('Document JSON', { exact: true }).click()
  const saved = await page.getByRole('textbox', { name: 'Document JSON' }).inputValue()
  const doc = JSON.parse(saved)
  doc.metadata.nodes = {
    client: {
      roles: [],
      tags: [],
      notes: 'PRIVATE SECRET',
      links: [{ label: 'Dash', href: 'https://dash.invalid' }],
    },
  }
  doc.extensions = { 'com.example': { deployment: 'private' } }
  await page.getByRole('textbox', { name: 'Document JSON' }).fill(JSON.stringify(doc))
  await page.getByRole('button', { name: 'Apply JSON' }).click()
  const svg = await exportNow(page, 'SVG')
  const parsed = await page.evaluate((markup: string) => {
    const parsedDoc = new DOMParser().parseFromString(markup, 'image/svg+xml')
    return {
      text: parsedDoc.documentElement.textContent ?? '',
      links: parsedDoc.querySelectorAll('a').length,
      extensions: parsedDoc.documentElement.textContent?.includes('com.example') ?? false,
    }
  }, svg)
  expect(parsed.text).not.toContain('PRIVATE SECRET')
  expect(parsed.text).not.toContain('com.example')
  expect(parsed.links).toBe(0)
  const json = await exportNow(page, 'JSON')
  const decoded = JSON.parse(json)
  expect(decoded.metadata.nodes.client.notes).toBe('PRIVATE SECRET')
})
