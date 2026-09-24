import { test, expect } from '@playwright/test'

const hostilePayload = JSON.stringify({
  schemaVersion: 1,
  token: 'forged-token-1234',
  document: { format: 'aesthc-diagram', broken: '<script>window.__pwned=1</script>' },
})

test('T55.2 forged storage is quarantined without executing its payload', async ({ page }) => {
  await page.addInitScript((payload) => {
    localStorage.setItem('adl-document-v1:studio:studio-document', payload)
  }, hostilePayload)
  await page.goto('/studio.html')
  await expect(page.getByRole('button', { name: 'Order API', exact: true })).toBeVisible()
  const pwned = await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)
  expect(pwned).toBeUndefined()
  const logs: string[] = []
  page.on('console', (msg) => logs.push(msg.text()))
  await page.getByRole('button', { name: 'Load saved', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'corrupted copy' })).toBeVisible()
  expect(logs.join('\n')).not.toContain('forged-token-1234')
  expect(
    await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned),
  ).toBeUndefined()
  const confirmations: string[] = []
  page.on('dialog', async (dialog) => {
    confirmations.push(dialog.message())
    await dialog.accept()
  })
  await page.getByRole('button', { name: 'Discard corrupted copy', exact: true }).click()
  expect(confirmations.length).toBe(1)
  await expect(page.getByRole('alert').filter({ hasText: 'corrupted copy' })).toBeHidden()
  await page.getByRole('button', { name: 'Order API', exact: true }).click()
  await page.getByLabel('Label', { exact: true }).fill('Still mine')
  await page.getByRole('button', { name: 'Apply label', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Still mine', exact: true })).toBeVisible()
})

test('T55.2 hostile imports stay literal and dangerous schemes are rejected before layout', async ({
  page,
}) => {
  await page.goto('/studio.html')
  await page.getByText('Document JSON', { exact: true }).click()
  const json = page.getByRole('textbox', { name: 'Document JSON' })
  const doc = JSON.parse(await json.inputValue())
  doc.spec.nodes[0].label = '<img src=x onerror="window.__pwned=1">'
  doc.metadata.nodes = {
    client: {
      roles: [],
      tags: [],
      links: [{ label: 'Javascript', href: 'javascript:window.__pwned=1' }],
    },
  }
  await json.fill(JSON.stringify(doc))
  await page.getByRole('button', { name: 'Apply JSON' }).click()
  await expect(page.getByRole('alert')).toContainText('url.scheme')
  await expect(page.getByRole('button', { name: 'Order API', exact: true })).toBeVisible()
  expect(
    await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned),
  ).toBeUndefined()
  expect(await page.locator('svg img').count()).toBe(0)
  expect(await page.locator('[onerror]').count()).toBe(0)
  const dialogs: string[] = []
  page.on('dialog', async (dialog) => {
    dialogs.push(dialog.message())
    await dialog.dismiss()
  })
  const logs: string[] = []
  page.on('console', (msg) => logs.push(msg.text()))
  delete doc.metadata.nodes
  doc.metadata.nodes = {}
  await json.fill(JSON.stringify(doc))
  await page.getByRole('button', { name: 'Apply JSON' }).click()
  await expect(
    page.getByRole('button', { name: '<img src=x onerror="window.__pwned=1">', exact: true }),
  ).toBeVisible()
  expect(
    await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned),
  ).toBeUndefined()
  expect(await page.locator('svg img').count()).toBe(0)
  expect(dialogs).toEqual([])
  expect(logs.join('\n')).not.toContain('__pwned')
})
