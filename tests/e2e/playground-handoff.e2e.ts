import { test, expect } from '@playwright/test'

async function renameNode(page: import('@playwright/test').Page, from: string, to: string) {
  await page.getByRole('button', { name: from, exact: true }).click()
  await page.getByLabel('Label', { exact: true }).fill(to)
  await page.getByRole('button', { name: 'Apply label', exact: true }).click()
  await expect(page.getByRole('button', { name: to, exact: true })).toBeVisible()
}

test('Full studio opens the current Playground document', async ({ page }) => {
  await page.goto('/playground.html?only=example-flowchart')
  await expect(page.locator('.adl-editor-surface [data-hit-node]').first()).toBeVisible()
  await renameNode(page, 'Merge to main', 'Handoff label')
  await page.getByRole('link', { name: /Full studio/ }).click()
  await expect(page.getByRole('heading', { name: 'Diagram Studio' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Handoff label', exact: true })).toBeVisible()
  await expect(page.getByText('Opened the current Playground document.')).toBeVisible()
})

test('local recovery restores an unsaved playground session after reload', async ({ page }) => {
  await page.goto('/playground.html?only=example-band')
  await renameNode(page, 'Ingress', 'Recovered label')
  await page.waitForTimeout(500)
  page.on('dialog', (dialog) => void dialog.accept())
  await page.reload()
  await expect(page.getByRole('button', { name: 'Recovered label', exact: true })).toBeVisible()
  await expect(page.getByText('Recovered unsaved work from this device.')).toBeVisible()
  // Reset example is the explicit discard path.
  await page.getByRole('button', { name: 'Reset example', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Ingress', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Ingress', exact: true })).toBeVisible()
})

test('internal navigation warns before dropping unsaved work', async ({ page }) => {
  await page.goto('/playground.html?only=example-band')
  await renameNode(page, 'Ingress', 'Guarded label')
  let prompted = ''
  page.once('dialog', async (dialog) => {
    prompted = dialog.message()
    await dialog.dismiss()
  })
  await page.getByRole('link', { name: 'Docs', exact: true }).click()
  await expect.poll(() => prompted).toContain('unsaved changes')
  await expect(page).toHaveURL(/playground\.html/)
  await expect(page.getByRole('button', { name: 'Guarded label', exact: true })).toBeVisible()
})

test('an unapplied JSON draft offers Apply, Discard or Cancel before leaving', async ({ page }) => {
  await page.goto('/playground.html?only=example-band')
  await page.getByRole('tab', { name: 'JSON', exact: true }).click()
  const editor = page.getByRole('textbox', { name: 'Document JSON' })
  await editor.fill((await editor.inputValue()).replace('Ingress', 'Draft label'))
  await page.getByRole('link', { name: /Full studio/ }).click()
  const notice = page.locator('.playground-message[role="alert"]')
  await expect(notice).toContainText('unapplied draft')
  await notice.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(editor).toHaveValue(/Draft label/)
  await expect(page).toHaveURL(/playground\.html/)

  // Invalid text keeps the buffer and the decision available.
  await editor.fill('{ invalid json')
  await page.getByRole('link', { name: /Full studio/ }).click()
  await expect(notice).toContainText('unapplied draft')
  await notice.getByRole('button', { name: 'Apply draft', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'data.json' })).toBeVisible()
  await expect(notice).toContainText('unapplied draft')
  await notice.getByRole('button', { name: 'Discard draft', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Diagram Studio' })).toBeVisible()
})

test('Reset protects an unapplied draft and only clears recovery after success', async ({
  page,
}) => {
  await page.goto('/playground.html?only=example-band')
  await page.getByRole('tab', { name: 'JSON', exact: true }).click()
  const editor = page.getByRole('textbox', { name: 'Document JSON' })
  await editor.fill('{"audit-unapplied":')
  const notice = page.locator('.playground-message[role="alert"]')
  await page.getByRole('button', { name: 'Reset example', exact: true }).click()
  await expect(notice).toContainText('Reset discards the unapplied JSON draft')
  await notice.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(editor).toHaveValue('{"audit-unapplied":')
  // Invalid Apply keeps both the buffer and the decision available.
  await page.getByRole('button', { name: 'Reset example', exact: true }).click()
  await notice.getByRole('button', { name: 'Apply draft', exact: true }).click()
  await expect(notice).toContainText('Reset discards the unapplied JSON draft')
  await expect(editor).toHaveValue('{"audit-unapplied":')
  // Discard proceeds, resets the example and restores the original node.
  await notice.getByRole('button', { name: 'Discard draft', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Ingress', exact: true })).toBeVisible()
})

test('recovered edits stay dirty and are protected from Reset', async ({ page }) => {
  await page.goto('/playground.html?only=example-band')
  await renameNode(page, 'Ingress', 'Recovered dirty')
  await page.waitForTimeout(500)
  page.on('dialog', (dialog) => void dialog.accept())
  await page.reload()
  await expect(page.getByRole('button', { name: 'Recovered dirty', exact: true })).toBeVisible()
  await expect(page.getByRole('status', { name: 'Unsaved changes' })).toBeVisible()
  page.removeAllListeners('dialog')
  let prompted = ''
  page.once('dialog', async (dialog) => {
    prompted = dialog.message()
    await dialog.dismiss()
  })
  await page.getByRole('button', { name: 'Reset example', exact: true }).click()
  await expect.poll(() => prompted).toContain('Discard changes')
  await expect(page.getByRole('button', { name: 'Recovered dirty', exact: true })).toBeVisible()
})
