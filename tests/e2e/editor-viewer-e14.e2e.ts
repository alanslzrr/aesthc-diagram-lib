import { test, expect } from '@playwright/test'

test('T33.1 lens dims by roles without touching topology, collapse keeps original edge IDs', async ({
  page,
}) => {
  await page.goto('/viewer.html')
  await expect(page.getByRole('heading', { name: 'Order platform' })).toBeVisible()
  // Lens by role: only backend nodes stay fully visible; the document itself is untouched.
  await page.getByLabel('Role lens').selectOption('backend')
  await expect(page.locator('.adl-viewer-stage [data-lens-dim="true"]')).toHaveCount(1)
  await expect(page.locator('.adl-viewer-stage [data-node-id="client"]')).toHaveAttribute(
    'data-lens-dim',
    'true',
  )
  await page.getByLabel('Role lens').selectOption('')
  await expect(page.locator('.adl-viewer-stage [data-lens-dim="true"]')).toHaveCount(0)
  // Collapse the platform group: members disappear and a proxy keeps the original edge ID.
  await page.getByLabel('Collapse group').selectOption({ label: 'Platform' })
  await expect(page.locator('.adl-viewer-stage [data-node-id="api"]')).toHaveCount(0)
  await expect(page.locator('.adl-viewer-stage [data-node-id="database"]')).toHaveCount(0)
  const proxy = page.locator('[data-proxy-edge-id]')
  await expect(proxy).toHaveCount(2)
  const ids = await proxy.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute('data-proxy-edge-id')),
  )
  expect(ids.sort()).toEqual(['notify', 'request'])
  await page.getByRole('button', { name: 'Expand all' }).click()
  await expect(page.locator('.adl-viewer-stage [data-node-id="api"]')).toBeVisible()
  // Topology intact: the route through the collapsed members still exists.
  await page.getByLabel('Origin node').fill('client')
  await page.keyboard.press('Enter')
  await page.getByLabel('Destination node').fill('worker')
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Show route', exact: true }).click()
  await expect(page.getByText('Route Web client → Email worker', { exact: false })).toBeVisible()
})

test('T34.2 story playback is finite, manual and stops on Escape, hidden tab and reduced motion', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/viewer.html')
  const story = page.getByRole('group', { name: 'Story' })
  // Never auto-starts.
  await expect(story.getByText('Stopped', { exact: true })).toBeVisible()
  await expect(story.getByRole('button', { name: 'Next' })).toBeEnabled()
  await story.getByRole('button', { name: 'Play' }).click()
  await expect(story.getByText('1/3', { exact: true })).toBeVisible()
  // Manual Next/Previous work during playback.
  await story.getByRole('button', { name: 'Next' }).click()
  await expect(story.getByText('2/3', { exact: true })).toBeVisible()
  // Escape stops the playback.
  await page.keyboard.press('Escape')
  await expect(story.getByText('Stopped', { exact: true })).toBeVisible()
  // Hidden tab stops it.
  await story.getByRole('button', { name: 'Play' }).click()
  await expect(story.getByText('1/3', { exact: true })).toBeVisible()
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { get: () => true, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(story.getByText('Stopped', { exact: true })).toBeVisible()
  // Playback reaches the end (finite) and clears the owner.
  await story.getByRole('button', { name: 'Play' }).click()
  await expect(story.getByText('1/3', { exact: true })).toBeVisible()
  await page.waitForTimeout(3200)
  await expect(story.getByText('Stopped', { exact: true })).toBeVisible()
  // A query owns the motion afterwards: playing a route stops any story state.
  await page.getByLabel('Origin node').fill('client')
  await page.keyboard.press('Enter')
  await page.getByLabel('Destination node').fill('worker')
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Show route', exact: true }).click()
  await expect(page.getByText('Route Web client → Email worker', { exact: false })).toBeVisible()
})

test('T34.2 reduced motion shows static steps with working Next/Previous and disables Play', async ({
  page,
}) => {
  // The global config already reduces motion; be explicit about the mode.
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/viewer.html')
  const story = page.getByRole('group', { name: 'Story' })
  await expect(story.getByRole('button', { name: 'Play' })).toBeDisabled()
  await expect(story.getByText('Reduced motion', { exact: false })).toBeVisible()
  // Static navigation from the stopped state: Next shows 1/3, then 2/3.
  await story.getByRole('button', { name: 'Next' }).click()
  await expect(story.getByText('1/3', { exact: true })).toBeVisible()
  await story.getByRole('button', { name: 'Next' }).click()
  await expect(story.getByText('2/3', { exact: true })).toBeVisible()
  await story.getByRole('button', { name: 'Previous' }).click()
  await expect(story.getByText('1/3', { exact: true })).toBeVisible()
})

test('T35.1 presentation falls back when fullscreen is denied and restores focus on exit', async ({
  page,
}) => {
  await page.goto('/viewer.html')
  await page.evaluate(() => {
    Object.defineProperty(document, 'fullscreenEnabled', { get: () => false, configurable: true })
  })
  const present = page.getByRole('button', { name: 'Present', exact: true })
  await present.click()
  await expect(page.locator('.adl-viewer-presentation-active')).toBeVisible()
  const exit = page.getByRole('button', { name: 'Exit presentation', exact: true })
  await exit.focus()
  await page.keyboard.press('Escape')
  await expect(page.locator('.adl-viewer-presentation-active')).toHaveCount(0)
  await expect(present).toBeFocused()
})
