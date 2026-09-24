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

async function importSpec(page: import('@playwright/test').Page, spec: unknown) {
  await page.goto('/studio.html')
  await page.getByText('Document JSON', { exact: true }).click()
  const json = page.getByRole('textbox', { name: 'Document JSON' })
  await json.fill(JSON.stringify(spec))
  await page.getByRole('button', { name: 'Apply JSON' }).click()
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
  const savedCopies = page.locator('details.studio-copies')
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
  const copies = page.locator('details.studio-copies')
  await expect(copies.locator('li')).toHaveCount(2)
  await copies.getByRole('button', { name: 'Open', exact: true }).first().click()
  await expect(page.getByRole('button', { name: 'Inbox', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Dispatch', exact: true })).toBeVisible()
})
