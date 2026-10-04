import { test, expect } from '@playwright/test'

test('direct playground entry loads shared styles and the editor workspace', async ({ page }) => {
  await page.goto('/playground.html?only=example-band')
  await expect(page.getByRole('heading', { level: 1, name: 'Band' })).toBeVisible()
  await expect(page.locator('.adl-editor-surface svg[role="group"]').first()).toBeVisible()
  await expect(page.locator('.adl-editor-surface [data-node-id]').first()).toBeVisible()
  const surface = await page.locator('.adl-editor-surface').boundingBox()
  const nodeBox = await page.locator('.adl-editor-surface [data-node-id]').first().boundingBox()
  expect(surface).not.toBeNull()
  expect(nodeBox).not.toBeNull()
  expect(nodeBox!.y).toBeGreaterThanOrEqual(surface!.y - 40)
  expect(nodeBox!.y + nodeBox!.height).toBeLessThanOrEqual(surface!.y + surface!.height + 4)
  // Shared footer utilities: without the shared stylesheet these compute
  // `nowrap` and no gap.
  const utilities = await page
    .locator('.playground-footer > span')
    .last()
    .evaluate((element) => {
      const style = getComputedStyle(element)
      return { wrap: style.flexWrap, gap: style.gap, align: style.alignItems }
    })
  expect(utilities).toEqual({ wrap: 'wrap', gap: '20px', align: 'center' })
  const control = await page
    .locator('.playground-workspace-actions button')
    .first()
    .evaluate((element) => {
      const style = getComputedStyle(element)
      return { height: style.height, radius: style.borderRadius, border: style.borderTopWidth }
    })
  expect(control.radius).toBe('6px')
  expect(control.border).toBe('1px')
  expect(Number.parseFloat(control.height)).toBeGreaterThanOrEqual(36)
  expect(Number.parseFloat(control.height)).toBeLessThanOrEqual(38)
})

test('playground edits the document, undoes and keeps drafts per type', async ({ page }) => {
  await page.goto('/playground.html?only=example-band')
  const node = page.locator('.adl-editor-surface [data-node-id]').first()
  await expect(node).toBeVisible()
  const hitTarget = page
    .locator('.adl-editor-surface')
    .getByRole('button', { name: 'Ingress', exact: true })
  await hitTarget.click()
  const label = page.getByLabel('Label', { exact: true })
  await expect(label).toBeVisible()
  await label.fill('Ingress edited')
  await page.getByRole('button', { name: 'Apply label', exact: true }).click()
  const editedLabel = page
    .locator('.adl-editor-surface text[data-node-label]')
    .filter({ hasText: 'Ingress edited' })
  await expect(editedLabel).toHaveCount(1)
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(editedLabel).toHaveCount(0)

  await label.fill('Kept draft')
  await page.getByRole('button', { name: 'Apply label', exact: true }).click()
  const menu = page.locator('.playground-menu-trigger')
  if (await menu.isVisible()) await menu.click()
  await page.locator('.playground-sidebar a[href="?only=example-flowchart"]').click()
  await expect(page.getByRole('heading', { level: 1, name: 'Flowchart' })).toBeVisible()
  if (await menu.isVisible()) await menu.click()
  await page.locator('.playground-sidebar a[href="?only=example-band"]').click()
  await expect(
    page.locator('.adl-editor-surface text[data-node-label]').filter({ hasText: 'Kept draft' }),
  ).toHaveCount(1)
  // Session restore keeps dirty state and history, not only the document.
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeEnabled()
  let resetPrompt = ''
  page.once('dialog', async (dialog) => {
    resetPrompt = dialog.message()
    await dialog.dismiss()
  })
  await page.getByRole('button', { name: 'Reset example', exact: true }).click()
  await expect.poll(() => resetPrompt).toContain('Discard changes and reset')
  await expect(
    page.locator('.adl-editor-surface text[data-node-label]').filter({ hasText: 'Kept draft' }),
  ).toHaveCount(1)
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Reset example', exact: true }).click()
  await expect(
    page.locator('.adl-editor-surface text[data-node-label]').filter({ hasText: 'Kept draft' }),
  ).toHaveCount(0)
})

test('a deferred import cannot land on a different example', async ({ page }) => {
  await page.addInitScript(() => {
    const original = File.prototype.text
    File.prototype.text = function () {
      return new Promise((resolve) => {
        setTimeout(() => resolve(original.call(this)), 900)
      })
    }
  })
  await page.goto('/playground.html?only=example-band')
  await expect(page.locator('.adl-editor-surface svg[role="group"]').first()).toBeVisible()
  const spec = JSON.parse(await (await page.request.get('/examples/band.json')).text()) as {
    nodes: { id: string; label: string }[]
  }
  const target = spec.nodes[0]
  target.label = 'Deferred import'
  await page.locator('input[type="file"]').setInputFiles({
    name: 'band.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(spec)),
  })
  // Switch example while the file is still being read.
  const menu = page.locator('.playground-menu-trigger')
  if (await menu.isVisible()) await menu.click()
  await page.locator('.playground-sidebar a[href="?only=example-flowchart"]').click()
  await expect(page.getByRole('heading', { level: 1, name: 'Flowchart' })).toBeVisible()
  await expect(page.getByText('Canceled: the example changed', { exact: false })).toBeVisible()
  if (await menu.isVisible()) await menu.click()
  await page.locator('.playground-sidebar a[href="?only=example-band"]').click()
  await expect(
    page
      .locator('.adl-editor-surface text[data-node-label]')
      .filter({ hasText: 'Deferred import' }),
  ).toHaveCount(0)
})

test('import confirms the history reset and reports the applied result', async ({ page }) => {
  await page.goto('/playground.html?only=example-band')
  const spec = JSON.parse(await (await page.request.get('/examples/band.json')).text()) as {
    nodes: { id: string; label: string }[]
  }
  spec.nodes[0].label = 'Confirmed import'
  let importPrompt = ''
  page.once('dialog', async (dialog) => {
    importPrompt = dialog.message()
    await dialog.accept()
  })
  await page.locator('input[type="file"]').setInputFiles({
    name: 'band.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(spec)),
  })
  await expect.poll(() => importPrompt).toContain('History resets')
  await expect(
    page
      .locator('.adl-editor-surface text[data-node-label]')
      .filter({ hasText: 'Confirmed import' }),
  ).toHaveCount(1)
  await expect(page.getByText('History reset', { exact: false })).toBeVisible()
})

test('invalid JSON keeps the last valid canvas and shows diagnostics', async ({ page }) => {
  await page.goto('/playground.html?only=example-band')
  const nodes = page.locator('.adl-editor-surface [data-node-id]')
  await expect(nodes.first()).toBeVisible()
  const count = await nodes.count()
  await page.getByRole('tab', { name: 'JSON', exact: true }).click()
  const editor = page.getByRole('textbox', { name: 'Document JSON', exact: true })
  await editor.fill('{ invalid json')
  await page.getByRole('button', { name: 'Apply JSON', exact: true }).click()
  await expect(page.locator('.adl-editor-json [role="alert"]')).toBeVisible()
  await expect(nodes).toHaveCount(count)
})

test('camera zoom and pan survive example switching and Fit still works', async ({
  page,
  isMobile,
}) => {
  await page.goto('/playground.html?only=example-band')
  const zoom = page.getByRole('status', { name: 'Zoom' })
  await expect(zoom).toBeAttached()
  // The scene group transform encodes the camera (x, y, zoom).
  const camera = () =>
    page.locator('.adl-editor-surface svg > g[transform]').first().getAttribute('transform')
  const fitted = await camera()
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
  const zoomed = await camera()
  expect(zoomed).not.toBe(fitted)

  if (!isMobile) {
    await page.getByRole('button', { name: 'Pan', exact: true }).click()
    const surface = page.locator('.adl-editor-surface')
    const box = (await surface.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2 + 24, { steps: 4 })
    await page.mouse.up()
    await expect.poll(camera).not.toBe(zoomed)
  }
  const panned = await camera()

  const menu = page.locator('.playground-menu-trigger')
  if (await menu.isVisible()) await menu.click()
  await page.locator('.playground-sidebar a[href="?only=example-flowchart"]').click()
  await expect(page.getByRole('heading', { level: 1, name: 'Flowchart' })).toBeVisible()
  if (await menu.isVisible()) await menu.click()
  await page.locator('.playground-sidebar a[href="?only=example-band"]').click()

  // Restoring the session keeps the exact camera, not only the document.
  await expect.poll(camera).toBe(panned)
  await page.getByRole('button', { name: 'Fit diagram', exact: true }).click()
  await expect.poll(camera).not.toBe(panned)
})

test('keyboard selects a node in the editor and Escape clears it', async ({ page }) => {
  await page.goto('/playground.html?only=example-band')
  const hit = page.locator('.adl-editor-surface [data-hit-node]').first()
  await expect(hit).toBeAttached()
  await hit.focus()
  await page.keyboard.press('Enter')
  await expect(hit).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('Escape')
  await expect(hit).toHaveAttribute('aria-pressed', 'false')
})

test('panel tabs normalize across example types and navigate by keyboard', async ({ page }) => {
  await page.goto('/playground.html?only=example-band')
  await expect(page.locator('.adl-editor-surface [data-hit-node]').first()).toBeVisible()
  const connections = page.getByRole('tab', { name: /^Connections/ })
  const panel = page.getByRole('tabpanel')
  await connections.click()
  await expect(connections).toHaveAttribute('aria-selected', 'true')
  await expect(panel.getByText('Existing connections', { exact: false })).toBeVisible()
  // Ids are instance-scoped, never the static shared `adl-editor-tab-*` shape.
  const tabIds = await page
    .locator('[id^="adl-editor-tab"]')
    .evaluateAll((elements) => elements.map((element) => element.id))
  expect(new Set(tabIds).size).toBe(tabIds.length)
  expect(tabIds.some((id) => /^adl-editor-tab-[a-zA-Z0-9_-]+-outline$/.test(id))).toBe(true)
  // Roving focus stays inside this editor's tablist.
  await connections.focus()
  await page.keyboard.press('ArrowLeft')
  await expect(page.getByRole('tab', { name: 'JSON', exact: true })).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(connections).toBeFocused()
  await expect(connections).toHaveAttribute('aria-selected', 'true')
  // Switching to a timeline removes the panel; the active tab must normalize
  // instead of leaving an empty tabpanel behind.
  const menu = page.locator('.playground-menu-trigger')
  if (await menu.isVisible()) await menu.click()
  await page.locator('.playground-sidebar a[href="?only=example-timeline"]').click()
  await expect(page.getByRole('heading', { level: 1, name: 'Timeline' })).toBeVisible()
  await expect(page.getByRole('tab', { name: /^Connections/ })).toHaveCount(0)
  await expect(page.getByRole('tab', { name: 'Outline', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(panel.getByRole('heading', { name: 'Diagram outline' })).toBeVisible()
  // Coming back restores Connections without reviving the stale selection.
  if (await menu.isVisible()) await menu.click()
  await page.locator('.playground-sidebar a[href="?only=example-band"]').click()
  await expect(page.getByRole('heading', { level: 1, name: 'Band' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Outline', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(page.getByRole('tab', { name: /^Connections/ })).toHaveCount(1)
})
