import { test, expect } from '@playwright/test'
async function editor(page: import('@playwright/test').Page) {
  await page
    .locator('#example-flowchart')
    .getByRole('button', { name: 'Code', exact: true })
    .click()
  return page.getByRole('textbox', { name: 'example-flowchart — spec', exact: true })
}
test('opt-in raw draft recovery is explicit and validates before applying', async ({ page }) => {
  page.on('dialog', (dialog) => dialog.accept())
  await page.goto('/?only=example-flowchart')
  const input = await editor(page)
  await page.getByRole('checkbox', { name: 'Save drafts in this browser' }).check()
  await input.fill('{ broken')
  await expect(input).toHaveAttribute('aria-invalid', 'true')
  await expect(input).toHaveAttribute('aria-describedby', 'example-flowchart-en-editor-error')
  await page.reload()
  await editor(page)
  await expect(page.getByRole('button', { name: 'Restore draft', exact: true })).toBeVisible()
  await expect(
    page.getByRole('textbox', { name: 'example-flowchart — spec', exact: true }),
  ).not.toHaveValue('{ broken')
  await page.getByRole('button', { name: 'Restore draft', exact: true }).click()
  const recovered = page.getByRole('textbox', { name: 'example-flowchart — spec', exact: true })
  await expect(recovered).toHaveValue('{ broken')
  await expect(recovered).toHaveAttribute('aria-invalid', 'true')
  await page.getByRole('button', { name: 'Clear and reset', exact: true }).click()
  await expect(recovered).toHaveAttribute('aria-invalid', 'false')
  expect(
    await page.evaluate(() => localStorage.getItem('adl-draft-v1:example-flowchart:en')),
  ).toBeNull()
})
test('raw invalid edits survive locale round trips without persistence', async ({ page }) => {
  await page.goto('/?only=example-flowchart')
  const input = await editor(page)
  await input.fill('{ raw invalid draft')
  await expect(input).toHaveAttribute('aria-invalid', 'true')
  await page.getByRole('button', { name: 'EN', exact: true }).click()
  expect(
    await page.evaluate(() => {
      const event = new Event('beforeunload', { cancelable: true })
      window.dispatchEvent(event)
      return event.defaultPrevented
    }),
  ).toBe(true)
  await page
    .locator('#example-flowchart')
    .getByRole('button', { name: 'Código', exact: true })
    .click()
  await page.getByRole('button', { name: 'ES', exact: true }).click()
  await editor(page)
  await expect(
    page.getByRole('textbox', { name: 'example-flowchart — spec', exact: true }),
  ).toHaveValue('{ raw invalid draft')
})
test('blocked draft storage shows a warning and oversized counts retain preview', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('Blocked')
      },
    })
  })
  await page.goto('/?only=example-flowchart')
  const input = await editor(page)
  await page.getByRole('checkbox', { name: 'Save drafts in this browser' }).check()
  await expect(page.getByText('Draft could not be saved.', { exact: false })).toBeVisible()
  const spec = JSON.parse(await input.inputValue())
  spec.nodes = Array.from({ length: 1001 }, (_, i) => ({ ...spec.nodes[0], id: `n${i}` }))
  spec.edges = []
  await input.fill(JSON.stringify(spec))
  await expect(input).toHaveAttribute('aria-invalid', 'true')
  await expect(page.locator('#example-flowchart-en-editor-error')).toContainText('limit exceeded')
})

test('a shared locale opens without overwriting a saved local draft', async ({ page }) => {
  const { encodeShareHash } = await import('../../site/src/lib/share')
  const { minimalSpecs } = await import('../../examples/specs')
  const spec = { ...minimalSpecs.flowchart, caption: 'Shared caption' }
  const hash = await encodeShareHash('example-flowchart', spec, 'es')
  await page.addInitScript(() => {
    localStorage.setItem('adl-locale', 'en')
    localStorage.setItem('adl-draft-enabled:example-flowchart', 'true')
    localStorage.setItem(
      'adl-draft-v1:example-flowchart:es',
      JSON.stringify({
        version: 1,
        text: '{ private local draft',
        savedAt: new Date().toISOString(),
      }),
    )
  })
  await page.goto(`/?only=example-flowchart#${hash}`)
  await expect(page.locator('html')).toHaveAttribute('lang', 'es')
  await expect(page.locator('#example-flowchart')).toContainText('Shared caption')
  await page
    .locator('#example-flowchart')
    .getByRole('button', { name: 'Código', exact: true })
    .click()
  await expect(page.getByRole('button', { name: 'Restaurar borrador', exact: true })).toBeVisible()
  expect(
    JSON.parse(
      (await page.evaluate(() => localStorage.getItem('adl-draft-v1:example-flowchart:es')))!,
    ).text,
  ).toBe('{ private local draft')
})
