import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

async function expectNoSeriousAXEViolations(page: import('@playwright/test').Page) {
  const result = await new AxeBuilder({ page }).analyze()
  expect(
    result.violations.filter((issue) => issue.impact === 'serious' || issue.impact === 'critical'),
  ).toEqual([])
}

test('T44.1 the full editing workflow runs with the keyboard alone', async ({ page }) => {
  await page.goto('/studio.html')
  await page.getByText('Diagram outline', { exact: true }).click()
  const outline = page.getByRole('region', { name: 'Diagram outline', exact: true })
  const order = outline.getByRole('button', { name: 'Select node: Order API', exact: true })
  await order.focus()
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Add node', exact: true }).focus()
  await page.keyboard.press('Enter')
  const label = page.getByLabel('Label', { exact: true })
  await label.focus()
  await label.fill('Keyboard node')
  await page.getByRole('button', { name: 'Apply label', exact: true }).focus()
  await page.keyboard.press('Enter')
  const node = page.getByRole('button', { name: 'Keyboard node', exact: true })
  await expect(node).toBeVisible()
  await node.focus()
  const before = await node.getAttribute('x')
  await page.keyboard.press('ArrowRight')
  expect(await node.getAttribute('x')).not.toBe(before)
  await expect(page.getByRole('status', { name: 'Unsaved changes' })).toBeVisible()
  const handle = page.getByRole('button', { name: 'Connect: Keyboard node', exact: true })
  await handle.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByText('Press Enter on a target node', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Order API', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByText('Existing connections', { exact: false })).toBeVisible()
  await node.focus()
  await page.keyboard.press('Delete')
  await expect(page.getByRole('button', { name: 'Keyboard node', exact: true })).toHaveCount(0)
  await page.getByRole('group', { name: /^Editable diagram/ }).focus()
  await page.keyboard.press('ControlOrMeta+z')
  await expect(page.getByRole('button', { name: 'Keyboard node', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Save locally', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByText('Saved on this device.', { exact: false })).toBeVisible()
  const format = page.getByLabel('Export format')
  await format.focus()
  await page.keyboard.press('ArrowDown')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download', exact: true }).focus()
  await page.keyboard.press('Enter')
  await downloadPromise
  await expect(page.getByText('Exported revision', { exact: false })).toBeVisible()
})

test('T44.2 editor shortcuts do not hijack keys while focus is outside the canvas', async ({
  page,
}) => {
  await page.goto('/studio.html')
  const url = page.url()
  const node = page.getByRole('button', { name: 'Order API', exact: true })
  await node.click()
  // WebKit turns Backspace on a non-editable target into history navigation,
  // so the destructive-shortcut probe is an editable, test-owned host control
  // outside the diagram: browser-native editing consumes Delete/Backspace.
  await page.evaluate(() => {
    const input = document.createElement('input')
    input.type = 'text'
    input.value = 'probe'
    input.setAttribute('aria-label', 'External shortcut probe')
    document.body.appendChild(input)
  })
  const probe = page.getByLabel('External shortcut probe')
  await probe.focus()
  await expect(probe).toBeFocused()
  // Record what the page did with each shortcut once the event bubbled: the
  // editor must leave the browser-native copy/save behavior alone off-canvas.
  await page.evaluate(() => {
    const log: { key: string; prevented: boolean }[] = []
    ;(window as unknown as { shortcutLog: typeof log }).shortcutLog = log
    document.addEventListener('keydown', (event) =>
      log.push({ key: event.key, prevented: event.defaultPrevented }),
    )
  })
  for (const key of ['Delete', 'Backspace', 'ControlOrMeta+c', 'ControlOrMeta+s']) {
    await page.keyboard.press(key)
  }
  expect(await probe.inputValue(), 'Backspace edited only the host input').toBe('prob')
  expect(page.url(), 'shortcuts outside the canvas must not navigate').toBe(url)
  await expect(probe).toBeFocused()
  await expect(node).toBeVisible()
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled()
  await expect(page.getByRole('status', { name: 'No pending changes' })).toBeVisible()
  const log = await page.evaluate(
    () => (window as unknown as { shortcutLog: { key: string; prevented: boolean }[] }).shortcutLog,
  )
  expect(
    log.filter((entry) => entry.prevented),
    'the editor must not hijack off-canvas keys',
  ).toEqual([])
  // Independent focus check for the language select: it keeps focus while the
  // same permitted browser shortcuts arrive, without pressing Backspace.
  const language = page.getByLabel('Language')
  await language.focus()
  await expect(language).toBeFocused()
  await page.keyboard.press('ControlOrMeta+c')
  await page.keyboard.press('ControlOrMeta+s')
  await expect(language).toBeFocused()
  expect(page.url()).toBe(url)
  await expect(node).toBeVisible()
})

test('T44.2 the editor stays operable and unclipped at 200% page zoom', async ({ page }) => {
  await page.goto('/studio.html')
  // The audit's failure was measured at 390px; project profiles vary (Pixel 7
  // is 412px), so pin the width instead of trusting the device.
  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate(() => {
    ;(document.body.style as unknown as Record<string, string>).zoom = '200%'
  })
  await test.info().attach('zoom-layout', {
    body: JSON.stringify(
      await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        elements: [
          ...document.querySelectorAll(
            '.studio-header, .studio-actions, .adl-editor-toolbar, .adl-editor-body, .adl-editor-inspector',
          ),
        ].map((element) => ({
          className: element.className,
          width: element.getBoundingClientRect().width,
          right: element.getBoundingClientRect().right,
          scrollWidth: element.scrollWidth,
        })),
      })),
    ),
    contentType: 'application/json',
  })
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2))
    .toBe(true)
  // The page must not be unclipped by hiding the overflow: groups have to sit
  // inside the toolbar box and the toolbar itself must not scroll sideways.
  const toolbar = page.locator('.adl-editor-toolbar')
  const toolbarBounds = await toolbar.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    return {
      right: bounds.right,
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
      groups: [...element.querySelectorAll('.adl-editor-group')].map((group) =>
        group.getBoundingClientRect(),
      ),
    }
  })
  for (const group of toolbarBounds.groups) {
    expect(group.right).toBeLessThanOrEqual(toolbarBounds.right + 1)
    expect(group.left).toBeGreaterThanOrEqual(-1)
  }
  expect(toolbarBounds.scrollWidth).toBeLessThanOrEqual(toolbarBounds.clientWidth + 1)
  await test.info().attach('zoomed-studio-reflow', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
  await page.getByLabel('Export quality', { exact: true }).scrollIntoViewIfNeeded()
  expect(
    await page.getByLabel('Export quality', { exact: true }).evaluate((element) => {
      const box = element.getBoundingClientRect()
      return element === document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
    }),
    'a sticky header must not cover the focused export control at 200% zoom',
  ).toBe(true)
  await test.info().attach('zoomed-export-options', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
  const node = page.getByRole('button', { name: 'Order API', exact: true })
  const box = await node.boundingBox()
  expect(box).toBeTruthy()
  if (box) expect(box.y + box.height).toBeGreaterThan(0)
  const surface = page.getByRole('group', { name: /^Editable diagram/ })
  const surfaceBox = await surface.boundingBox()
  expect(surfaceBox).toBeTruthy()
  if (surfaceBox) expect(surfaceBox.width).toBeGreaterThan(200)
})

test('T44.3 viewer, lenses, collapse, story and M3 controls have no serious axe violations', async ({
  page,
}) => {
  await page.goto('/viewer.html')
  await expect(page.getByRole('heading', { name: 'Semantic viewer' })).toBeVisible()
  await expectNoSeriousAXEViolations(page)
  await page.getByLabel('Collapse group').selectOption('platform')
  await page.getByLabel('Role lens').selectOption('backend')
  const origin = page.getByRole('combobox', { name: 'Origin node' })
  await origin.fill('api')
  await expect(page.getByRole('listbox', { name: 'Origin node' })).toBeVisible()
  await expectNoSeriousAXEViolations(page)
  await page.keyboard.press('Enter')
  const destination = page.getByRole('combobox', { name: 'Destination node' })
  await destination.fill('database')
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Show route', exact: true }).click()
  await expect(page.getByText('Route', { exact: false }).first()).toBeVisible()
  await page
    .getByRole('group', { name: 'Story' })
    .getByRole('button', { name: 'Next', exact: true })
    .click()
  await page.getByLabel('Show deployment profile').check()
  await expect(page.locator('.adl-viewer-evidence')).toBeVisible()
  await expectNoSeriousAXEViolations(page)
})
