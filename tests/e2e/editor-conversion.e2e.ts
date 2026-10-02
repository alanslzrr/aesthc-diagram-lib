import { test, expect } from '@playwright/test'

const bandSpec = {
  type: 'band',
  caption: 'Order intake',
  legend: { main: 'Request', branch: 'Reject' },
  bands: [{ title: 'Front' }, { title: 'Back' }],
  nodes: [
    { id: 'in', label: 'Inbox', description: '', band: 0 },
    { id: 'out', label: 'Dispatch', description: '', band: 1 },
  ],
  edges: [{ id: 'in-out', from: 'in', to: 'out' }],
}

// Explicit import: Apply JSON only edits the current document identity/type.
async function importSpec(page: import('@playwright/test').Page, spec: unknown) {
  await page.goto('/studio.html')
  await page.locator('input[type="file"]').setInputFiles({
    name: 'spec.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(spec)),
  })
  await page.getByRole('button', { name: 'Inbox', exact: true }).waitFor()
}

test('T53.2 cancel keeps the document, draft and saved copy untouched', async ({ page }) => {
  await importSpec(page, bandSpec)
  await page.getByRole('button', { name: 'Save locally', exact: true }).click()
  await expect(page.getByText('Saved on this device.', { exact: false })).toBeVisible()
  const convert = page.getByRole('button', { name: 'Convert to graph', exact: true })
  await expect(convert).toBeEnabled()
  await convert.click()
  const notice = page.getByRole('alert').filter({ hasText: 'will not transfer' })
  await expect(notice).toBeVisible()
  await notice.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(notice).toBeHidden()
  await expect(page.getByRole('button', { name: 'Inbox', exact: true })).toBeVisible()
  await page.getByText('Saved copies', { exact: true }).click()
  const savedCopies = page.locator('.studio-copies')
  await expect(savedCopies.getByText('Order intake', { exact: false })).toBeVisible()
})

test('T53.2 accepting opens a new graph document without overwriting the original', async ({
  page,
}) => {
  await importSpec(page, bandSpec)
  await page.getByRole('button', { name: 'Save locally', exact: true }).click()
  await expect(page.getByText('Saved on this device.', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Convert to graph', exact: true }).click()
  const notice = page.getByRole('alert').filter({ hasText: 'will not transfer' })
  await expect(notice).toBeVisible()
  await expect(notice.locator('code').first()).toBeVisible()
  await notice.getByRole('button', { name: 'Confirm conversion', exact: true }).click()
  await expect(page.getByText('Converted to a new graph document', { exact: false })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Inbox', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Save locally', exact: true }).click()
  await expect(page.getByText('Saved on this device.', { exact: false })).toBeVisible()
  await page.getByText('Saved copies', { exact: true }).click()
  const copies = page.locator('.studio-copies')
  await expect(copies.locator('li')).toHaveCount(2)
  await copies.getByRole('button', { name: 'Open', exact: true }).first().click()
  await expect(page.getByRole('button', { name: 'Inbox', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Dispatch', exact: true })).toBeVisible()
})

test('stale conversion confirmation keeps the intervening edit and history', async ({ page }) => {
  await importSpec(page, bandSpec)
  await page.getByRole('button', { name: 'Convert to graph', exact: true }).click()
  const notice = page.getByRole('alert').filter({ hasText: 'will not transfer' })
  await expect(notice).toBeVisible()
  // The notice is nonmodal: an inspector edit happens before confirmation.
  await page.getByRole('button', { name: 'Inbox', exact: true }).click()
  await page.getByLabel('Label', { exact: true }).fill('Changed label')
  await page.getByRole('button', { name: 'Apply label', exact: true }).click()
  await expect(notice).toBeHidden()
  await expect(
    page.getByText('The document changed after this conversion was prepared', { exact: false }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Changed label', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Inbox', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled()
})
