import { test, expect } from '@playwright/test'

async function setCaption(page: import('@playwright/test').Page, caption: string) {
  await page.getByText('Document JSON', { exact: true }).click()
  const editor = page.getByRole('textbox', { name: 'Document JSON', exact: true })
  const document = JSON.parse(await editor.inputValue()) as { spec: { caption: string } }
  document.spec.caption = caption
  await editor.fill(JSON.stringify(document))
  await page.getByRole('button', { name: 'Apply JSON', exact: true }).click()
  await page.getByText('Document JSON', { exact: true }).click()
}

test('save as activates the copy for local saves and autosave', async ({ page }) => {
  await page.goto('/studio.html')
  await page.getByRole('checkbox', { name: 'Autosave', exact: true }).check()
  await setCaption(page, 'Original record')
  await page.getByRole('button', { name: 'Order API', exact: true }).click()
  await page.getByLabel('Label', { exact: true }).fill('Original label')
  await page.getByRole('button', { name: 'Apply label', exact: true }).click()
  await expect(page.getByText('Saved on this device.', { exact: false })).toBeVisible()

  page.once('dialog', (dialog) => void dialog.accept('audit-copy'))
  await page.getByRole('button', { name: 'Save as…', exact: true }).click()
  await expect(page.getByText('Saved a copy as audit-copy.', { exact: false })).toBeVisible()
  await expect(page.getByRole('status', { name: 'No pending changes' })).toBeVisible()

  // The activated copy now owns autosave: the next edit writes to its key.
  await setCaption(page, 'Copy record')
  await page.getByRole('button', { name: 'Original label', exact: true }).click()
  await page.getByLabel('Label', { exact: true }).fill('Copy label')
  await page.getByRole('button', { name: 'Apply label', exact: true }).click()
  // Autosave confirms the copy's key by returning to a clean snapshot.
  await expect(page.getByRole('status', { name: 'No pending changes' })).toBeVisible()

  await page.reload()
  await page.getByText('Saved copies', { exact: true }).click()
  const rows = page.locator('.studio-copies li')
  await expect(rows).toHaveCount(2)
  await rows.filter({ hasText: 'Original record' }).getByRole('button', { name: 'Open' }).click()
  await expect(page.getByRole('button', { name: 'Original label', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Copy label', exact: true })).toHaveCount(0)
  await rows.filter({ hasText: 'Copy record' }).getByRole('button', { name: 'Open' }).click()
  await expect(page.getByRole('button', { name: 'Copy label', exact: true })).toBeVisible()
})

test('save as refuses to silently overwrite an existing named copy', async ({ page }) => {
  await page.goto('/studio.html')
  const dialogs: string[] = []
  page.on('dialog', (dialog) => {
    dialogs.push(dialog.message())
    if (dialog.type() === 'prompt') void dialog.accept('dup')
    else if (dialog.type() === 'beforeunload') void dialog.accept()
    else void dialog.dismiss()
  })
  await page.getByRole('button', { name: 'Save as…', exact: true }).click()
  await expect(page.getByText('Saved a copy as dup.', { exact: false })).toBeVisible()

  // Edit after the copy exists, then try to save over it and decline.
  await page.getByRole('button', { name: 'Order API', exact: true }).click()
  await page.getByLabel('Label', { exact: true }).fill('Changed after copy')
  await page.getByRole('button', { name: 'Apply label', exact: true }).click()
  await page.getByRole('button', { name: 'Save as…', exact: true }).click()
  await expect.poll(() => dialogs.length).toBeGreaterThanOrEqual(3)
  expect(dialogs.at(-1)).toContain('already exists')

  await page.reload()
  await page.getByText('Saved copies', { exact: true }).click()
  await page
    .locator('.studio-copies li')
    .first()
    .getByRole('button', { name: 'Open', exact: true })
    .click()
  await expect(page.getByRole('button', { name: 'Order API', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Changed after copy', exact: true })).toHaveCount(0)
})
