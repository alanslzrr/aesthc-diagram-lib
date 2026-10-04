import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

test('read-only Viewer opens the shared export dialog without an editor store', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('adl-theme', 'dark'))
  await page.goto('/viewer.html')
  await expect(page.locator('.adl-viewer')).toHaveAttribute('data-theme', 'dark')
  await expect(
    page.locator('.viewer-actions').getByRole('button', { name: 'Export', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Export', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Export document' })
  await expect(dialog).toBeVisible()
  await expect(page.locator('.adl-editor')).toHaveCount(0)
  await expect(dialog.locator('[data-export-scope="selection"]')).toBeDisabled()
  await dialog.getByLabel('Export format').selectOption('json')
  const pending = page.waitForEvent('download')
  await dialog.getByRole('button', { name: 'Download', exact: true }).click()
  const path = await (await pending).path()
  expect(path).not.toBeNull()
  const doc = JSON.parse(readFileSync(path!, 'utf8'))
  expect(doc.id).toBe('viewer-document')
  expect(doc.revision).toBe(0)
  expect(doc.presentation.theme.mode).toBe('light')
  await dialog.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Export', exact: true })).toBeFocused()
})

test('Viewer publish routes into the shared dialog with publish policy selected', async ({
  page,
}) => {
  await page.goto('/viewer.html')
  await page.getByRole('button', { name: 'Publish export', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Export document' })).toBeVisible()
  await expect(page.getByLabel('Export quality', { exact: true })).toHaveValue('publish')
})

test('shared Viewer dialog has styled controls without loading editor CSS', async ({ page }) => {
  await page.goto('/viewer.html')
  await page.getByRole('button', { name: 'Export', exact: true }).click()
  const dialog = page.getByRole('dialog')
  const styles = await dialog.evaluate((element) => {
    const select = element.querySelector('select')!
    const control = getComputedStyle(select),
      frame = getComputedStyle(element)
    return {
      radius: control.borderRadius,
      appearance: control.appearance,
      padding: frame.padding,
      border: frame.borderTopWidth,
    }
  })
  expect(styles.appearance).toBe('none')
  expect(parseFloat(styles.radius)).toBeGreaterThanOrEqual(4)
  expect(styles.padding).toBe('24px')
  expect(styles.border).toBe('1px')
})
