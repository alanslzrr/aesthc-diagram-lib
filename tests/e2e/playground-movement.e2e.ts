import { test, expect } from '@playwright/test'

/** Capability-aware movement hints and the safe Convert to graph flow. */

test('the Playground states the movement model of every diagram type', async ({ page }) => {
  const hint = page.locator('.playground-movement')
  await page.goto('/playground.html?only=example-band')
  await expect(hint).toContainText('Band membership')
  await expect(hint.getByRole('button', { name: 'Convert to graph', exact: true })).toBeVisible()

  await page.goto('/playground.html?only=example-swimlane')
  await expect(hint).toContainText('Lane membership')

  await page.goto('/playground.html?only=example-sequence')
  await expect(hint).toContainText('Authored order')

  await page.goto('/playground.html?only=example-timeline')
  await expect(hint).toContainText('Authored order')

  await page.goto('/playground.html?only=example-flowchart')
  await expect(hint).toContainText('Free placement')
  await expect(hint.getByRole('button', { name: 'Convert to graph', exact: true })).toHaveCount(0)

  await page.goto('/playground.html?only=example-er')
  await expect(hint).toContainText('Free placement')
})

test('the product model is explicit: Playground edits, Studio is advanced, Viewer is read-only', async ({
  page,
}) => {
  await page.goto('/playground.html?only=example-band')
  const footer = page.locator('.playground-sidebar-footer')
  await expect(footer).toContainText('advanced tooling')
  await expect(footer).toContainText('read-only')
  await page.goto('/studio.html')
  await expect(page.locator('.studio-role')).toContainText('Playground')
  await expect(page.locator('.studio-role')).toContainText('read-only')
})

test('Convert to graph reviews losses and unlocks free placement only after confirmation', async ({
  page,
}) => {
  await page.goto('/playground.html?only=example-band')
  const hint = page.locator('.playground-movement')
  await hint.getByRole('button', { name: 'Convert to graph', exact: true }).click()
  const notice = hint.locator('[role="alert"]')
  await expect(notice).toContainText('will not transfer')
  await expect(notice.locator('code').first()).toBeVisible()
  await notice.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(notice).toBeHidden()
  await expect(hint).toContainText('Band membership')

  await hint.getByRole('button', { name: 'Convert to graph', exact: true }).click()
  await hint
    .locator('[role="alert"]')
    .getByRole('button', { name: 'Confirm conversion', exact: true })
    .click()
  await expect(hint).toContainText('Free placement')
  await expect(hint.getByText('Converted to a new graph document', { exact: false })).toBeVisible()
  // The replacement is a new history: the previous band edits are not undoable.
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled()
})

test('a document edit invalidates a prepared conversion instead of applying stale content', async ({
  page,
}) => {
  await page.goto('/playground.html?only=example-band')
  const hint = page.locator('.playground-movement')
  await hint.getByRole('button', { name: 'Convert to graph', exact: true }).click()
  await expect(hint.locator('[role="alert"]')).toContainText('will not transfer')
  await page.getByRole('button', { name: 'Ingress', exact: true }).click()
  await page.getByLabel('Label', { exact: true }).fill('Changed before conversion')
  await page.getByRole('button', { name: 'Apply label', exact: true }).click()
  await expect(hint.locator('[role="alert"]')).toBeHidden()
  await expect(
    hint.getByText('document changed after this conversion', { exact: false }),
  ).toBeVisible()
  await expect(hint).toContainText('Band membership')
  await expect(
    page.locator('.adl-editor-surface text[data-node-label]').filter({
      hasText: 'Changed before conversion',
    }),
  ).toHaveCount(1)
})
