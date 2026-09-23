import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFile } from 'node:fs/promises'

test('Studio edits, undoes, validates drafts and restores a saved document', async ({ page }) => {
  await page.goto('/studio.html')
  await expect(page.getByRole('heading', { name: 'Diagram Studio' })).toBeVisible()
  await page.getByRole('button', { name: 'Order API', exact: true }).click()
  await page.getByLabel('Label', { exact: true }).fill('Orders service')
  await page.getByRole('button', { name: 'Apply label' }).click()
  await expect(page.getByRole('button', { name: 'Orders service', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Order API', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Redo', exact: true }).click()
  await page.getByRole('button', { name: 'Save locally' }).click()
  await expect(page.getByText('Saved on this device.', { exact: false })).toBeVisible()
  await page.getByText('Document JSON', { exact: true }).click()
  const json = page.getByRole('textbox', { name: 'Document JSON' })
  const saved = await json.inputValue()
  await json.fill('{"invalid":')
  await page.getByRole('button', { name: 'Apply JSON' }).click()
  await expect(page.getByRole('button', { name: 'Orders service', exact: true })).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('data.json')
  await page.getByRole('button', { name: 'Discard draft' }).click()
  expect(await json.inputValue()).toBe(saved)
  await page.reload()
  await page.getByRole('button', { name: 'Load saved' }).click()
  await expect(page.getByRole('button', { name: 'Orders service', exact: true })).toBeVisible()
})
test('Studio pointer drag is one transaction and keyboard movement is undoable', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Mouse-specific drag; mobile controls covered separately')
  await page.goto('/studio.html')
  const node = page.getByRole('button', { name: 'Order API', exact: true })
  const before = await node.getAttribute('x'),
    box = await node.boundingBox()
  if (!box) throw Error('node absent')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2 + 40, { steps: 5 })
  await page.mouse.up()
  expect(await node.getAttribute('x')).not.toBe(before)
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  expect(await node.getAttribute('x')).toBe(before)
  await node.focus()
  await page.keyboard.press('ArrowRight')
  expect(await node.getAttribute('x')).not.toBe(before)
  await page.keyboard.press('ControlOrMeta+z')
  expect(await node.getAttribute('x')).toBe(before)
})
test('Studio exports fresh SVG, PNG and JSON, supports both themes and Spanish', async ({
  page,
}) => {
  await page.goto('/studio.html')
  await page.getByLabel('Theme', { exact: true }).selectOption('dark')
  for (const format of ['svg', 'png', 'json']) {
    await page.getByLabel('Export format').selectOption(format)
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download', exact: true }).click()
    const download = await downloadPromise,
      path = await download.path()
    if (!path) throw Error('missing download')
    const bytes = await readFile(path)
    expect(bytes.length).toBeGreaterThan(100)
    if (format === 'svg') {
      const svg = bytes.toString('utf8')
      expect(svg).toContain('data:font/woff2;base64,')
      expect(svg).not.toContain('data-hit-node')
      expect(
        await page.evaluate(
          (text) =>
            new DOMParser().parseFromString(text, 'image/svg+xml').querySelector('parsererror') ===
            null,
          svg,
        ),
      ).toBe(true)
    }
    if (format === 'png')
      expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
    if (format === 'json') expect(JSON.parse(bytes.toString('utf8')).schemaVersion).toBe(1)
  }
  await page.getByLabel('Language', { exact: true }).selectOption('es')
  await expect(page.getByRole('button', { name: 'Guardar localmente' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Añadir nodo' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
})

test('Studio creates, resizes, connects, duplicates and groups nodes', async ({ page }) => {
  await page.goto('/studio.html')
  await page.getByRole('button', { name: 'Add node', exact: true }).click()
  await page.getByLabel('Label', { exact: true }).fill('Audit service')
  await page.getByRole('button', { name: 'Apply label' }).click()
  await page.getByRole('spinbutton', { name: 'Node width', exact: true }).fill('320')
  await page.getByRole('button', { name: 'Apply geometry' }).click()
  await expect(page.getByRole('button', { name: 'Audit service', exact: true })).toHaveAttribute(
    'width',
    '320',
  )
  await page.getByLabel('Connection source', { exact: true }).selectOption('api')
  const targetId = await page
    .getByRole('button', { name: 'Audit service', exact: true })
    .getAttribute('data-hit-node')
  if (!targetId) throw Error('missing created id')
  await page.getByLabel('Connection target', { exact: true }).selectOption(targetId)
  await page.getByLabel('Connection label', { exact: true }).fill('Audit event')
  await page.getByRole('button', { name: 'Connect', exact: true }).click()
  await expect(page.locator('svg [data-edge-id]').filter({ hasText: 'Audit event' })).toHaveCount(1)
  await page.getByRole('button', { name: 'Duplicate', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Audit service', exact: true })).toHaveCount(2)
  await page.getByRole('button', { name: 'Order API', exact: true }).click({ modifiers: ['Shift'] })
  await page.getByRole('button', { name: 'Group', exact: true }).click()
  await page.getByText('Document JSON', { exact: true }).click()
  const document = JSON.parse(
    await page.getByRole('textbox', { name: 'Document JSON' }).inputValue(),
  )
  expect(document.scene.groups).toHaveLength(1)
  expect(document.scene.groups[0].nodeIds).toHaveLength(2)
})

test('Studio visual evidence has loaded fonts, bounded controls and no horizontal overflow', async ({
  page,
}, info) => {
  await page.goto('/studio.html')
  await page.evaluate(() => document.fonts.ready)
  expect(await page.evaluate(() => document.fonts.check('13px Geist'))).toBe(true)
  await page.screenshot({ path: info.outputPath('studio-light-en.png'), fullPage: true })
  await page.getByLabel('Theme', { exact: true }).selectOption('dark')
  await page.getByLabel('Language', { exact: true }).selectOption('es')
  await page.screenshot({ path: info.outputPath('studio-dark-es.png'), fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  const button = await page.getByRole('button', { name: 'Guardar localmente' }).boundingBox()
  expect(button?.height).toBeGreaterThanOrEqual(info.project.name.includes('mobile') ? 44 : 36)
})

test('Studio has no serious automated accessibility violations in either theme', async ({
  page,
}) => {
  await page.goto('/studio.html')
  for (const theme of ['light', 'dark']) {
    await page.getByLabel('Theme', { exact: true }).selectOption(theme)
    const result = await new AxeBuilder({ page }).analyze()
    expect(
      result.violations.filter(
        (issue) => issue.impact === 'critical' || issue.impact === 'serious',
      ),
    ).toEqual([])
  }
})

test('Studio marquee selects across zoom, cancels without edits and supports additive selection', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Mouse rectangle selection')
  await page.goto('/studio.html')
  const canvas = page.getByRole('group', { name: /^Editable diagram/ })
  const nodes = canvas.locator('[data-hit-node]')
  const first = nodes.first()
  await first.click()
  await page.getByRole('button', { name: 'Zoom out', exact: true }).click()
  const bounds = await canvas.boundingBox()
  if (!bounds) throw Error('missing canvas')
  const start = { x: bounds.x + 3, y: bounds.y + 3 }
  const end = { x: bounds.x + bounds.width - 3, y: bounds.y + bounds.height - 3 }
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(end.x, end.y, { steps: 5 })
  await expect(canvas.locator('[data-marquee]')).toBeVisible()
  await page.keyboard.press('Escape')
  await page.mouse.up()
  await expect(canvas.locator('[data-marquee]')).toHaveCount(0)
  await expect(first).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.down('Shift')
  await page.mouse.move(end.x, end.y)
  await page.mouse.down()
  await page.mouse.move(start.x, start.y, { steps: 5 })
  await page.mouse.up()
  await page.keyboard.up('Shift')
  await expect(canvas.locator('[data-hit-node][aria-pressed="true"]')).toHaveCount(
    await nodes.count(),
  )
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled()
  await expect(page.getByText('No pending changes', { exact: true })).toBeVisible()
})

test('Studio selects timeline labels and excludes sequence activation bars from focus targets', async ({
  page,
}) => {
  const fixtures = JSON.parse(await readFile('tests/fixtures/editor/legacy-specs.json', 'utf8'))
  await page.goto('/studio.html')
  for (const type of ['timeline', 'sequence']) {
    await page.locator('input[type=file]').setInputFiles({
      name: `${type}.json`,
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(fixtures[type])),
    })
    const sourceNodes = fixtures[type][type === 'timeline' ? 'events' : 'participants']
    const targets = page.locator('[data-hit-node]')
    await expect(targets).toHaveCount(sourceNodes.length)
    for (const node of sourceNodes) {
      const target = page.locator(`[data-hit-node="${node.id}"]`)
      expect(Number(await target.getAttribute('height'))).toBeGreaterThan(0)
      await target.click()
      await expect(target).toHaveAttribute('aria-pressed', 'true')
      await expect(page.getByLabel('Label', { exact: true })).toHaveValue(node.label)
    }
  }
})

test('Studio resize handle previews, cancels, commits once and supports keyboard undo', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Mouse resize gesture; inspector resizing is also tested on mobile')
  await page.goto('/studio.html')
  const node = page.getByRole('button', { name: 'Order API', exact: true })
  await node.click()
  const before = await node.getAttribute('width')
  const handle = page.getByRole('button', { name: 'Resize Order API', exact: true })
  const box = await handle.boundingBox()
  if (!box) throw Error('missing resize handle')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 70, box.y + box.height / 2 + 30, { steps: 5 })
  expect(await node.getAttribute('width')).not.toBe(before)
  await page.keyboard.press('Escape')
  await page.mouse.up()
  expect(await node.getAttribute('width')).toBe(before)
  await node.click()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 70, box.y + box.height / 2 + 30, { steps: 5 })
  await page.mouse.up()
  expect(await node.getAttribute('width')).not.toBe(before)
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  expect(await node.getAttribute('width')).toBe(before)
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled()
  await handle.focus()
  await page.keyboard.press('ArrowRight')
  expect(Number(await node.getAttribute('width'))).toBe(Number(before) + 1)
  await page.keyboard.press('ControlOrMeta+z')
  expect(await node.getAttribute('width')).toBe(before)
})

test('Studio outline selects nodes and relationships by keyboard without editing content', async ({
  page,
}) => {
  await page.goto('/studio.html')
  await page.getByText('Diagram outline', { exact: true }).click()
  const outline = page.getByRole('region', { name: 'Diagram outline', exact: true })
  const node = outline.getByRole('button', { name: 'Select node: Order API', exact: true })
  await node.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Order API', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.getByLabel('Label', { exact: true })).toHaveValue('Order API')
  const edge = outline.getByRole('button', { name: /^Select connection:/ }).first()
  await edge.focus()
  await page.keyboard.press('Space')
  await expect(edge).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled()
})

test('Studio system clipboard validates fragments and handles denied access without edits', async ({
  page,
}) => {
  await page.addInitScript(() => {
    let text = ''
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          text = value
        },
        readText: async () => text,
      },
    })
  })
  await page.goto('/studio.html')
  await page.getByRole('button', { name: 'Order API', exact: true }).click()
  await page.getByRole('button', { name: 'Copy to clipboard', exact: true }).click()
  await page.getByRole('button', { name: 'Paste from clipboard', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Order API', exact: true })).toHaveCount(2)
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Order API', exact: true })).toHaveCount(1)
  await page.evaluate(() => navigator.clipboard.writeText('{"not":"a fragment"}'))
  await page.getByRole('button', { name: 'Paste from clipboard', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('clipboard.invalid')
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        readText: async () => {
          throw new DOMException('Denied', 'NotAllowedError')
        },
      },
    }),
  )
  await page.getByRole('button', { name: 'Paste from clipboard', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('clipboard.denied')
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Order API', exact: true }).click()
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        readText: () =>
          new Promise<string>((resolve) => {
            ;(window as unknown as { finishClipboard: (text: string) => void }).finishClipboard =
              resolve
          }),
      },
    })
  })
  await page.getByRole('button', { name: 'Paste from clipboard', exact: true }).click()
  await page.getByLabel('Label', { exact: true }).fill('Newer revision')
  await page.getByRole('button', { name: 'Apply label', exact: true }).click()
  await page.evaluate(() =>
    (window as unknown as { finishClipboard: (text: string) => void }).finishClipboard('{}'),
  )
  await expect(page.getByRole('alert')).toContainText('revision.stale')
  await expect(page.getByRole('button', { name: 'Newer revision', exact: true })).toHaveCount(1)
})

test('Studio exports local semantic and brand icons as self-contained SVG and raster', async ({
  page,
}) => {
  const document = JSON.parse(await readFile('tests/fixtures/editor/graph-document.json', 'utf8'))
  document.metadata.visuals = {
    a: { source: 'phosphor', key: 'graph' },
    b: { source: 'thesvg', key: 'google-cloud' },
  }
  await page.goto('/studio.html')
  await page.locator('input[type=file]').setInputFiles({
    name: 'icons.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(document)),
  })
  await expect(page.locator('[data-node-icon="graph"]')).toHaveCount(1)
  await expect(page.locator('[data-node-icon="google-cloud"]')).toHaveCount(1)
  for (const format of ['svg', 'png']) {
    await page.getByLabel('Export format').selectOption(format)
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download', exact: true }).click()
    const download = await downloadPromise,
      path = await download.path()
    if (!path) throw Error('download missing')
    const bytes = await readFile(path)
    if (format === 'svg') {
      const text = bytes.toString('utf8')
      expect(text).toContain('data-node-icon="graph"')
      expect(text).toContain('TheSVG asset notices')
      expect(
        await page.evaluate(
          (text) =>
            new DOMParser().parseFromString(text, 'image/svg+xml').querySelector('parsererror') ===
            null,
          text,
        ),
      ).toBe(true)
    } else expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
  }
})

test('Studio aligns a selection in one undoable transaction', async ({ page }) => {
  await page.goto('/studio.html')
  const api = page.getByRole('button', { name: 'Order API', exact: true })
  const orders = page.getByRole('button', { name: 'Orders', exact: true })
  const before = await api.getAttribute('x')
  await api.click()
  await orders.click({ modifiers: ['Shift'] })
  await page.getByLabel('Arrangement', { exact: true }).selectOption('left')
  await page.getByRole('button', { name: 'Arrange selection', exact: true }).click()
  expect(await api.getAttribute('x')).toBe(await orders.getAttribute('x'))
  expect(await api.getAttribute('x')).not.toBe(before)
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  expect(await api.getAttribute('x')).toBe(before)
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled()
})

test('Studio exposes eight resize directions with anchored keyboard edits', async ({ page }) => {
  await page.goto('/studio.html')
  const node = page.getByRole('button', { name: 'Order API', exact: true })
  await node.click()
  // Query the selected entity rather than depending on the example's authored ID.
  const allHandles = page.locator('[data-resize-node]')
  await expect(allHandles).toHaveCount(8)
  const x = Number(await node.getAttribute('x'))
  const y = Number(await node.getAttribute('y'))
  const width = Number(await node.getAttribute('width'))
  const height = Number(await node.getAttribute('height'))
  const northwest = page.locator('[data-resize-direction="nw"]')
  await northwest.focus()
  await page.keyboard.press('Shift+ArrowRight')
  expect(Number(await node.getAttribute('x'))).toBe(x + 16)
  expect(Number(await node.getAttribute('width'))).toBe(width - 16)
  expect(Number(await node.getAttribute('y'))).toBe(y)
  expect(Number(await node.getAttribute('height'))).toBe(height)
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  expect(Number(await node.getAttribute('x'))).toBe(x)
  expect(Number(await node.getAttribute('width'))).toBe(width)
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled()
})

test('Studio northwest resize anchors at zoom and locked nodes hide handles', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Desktop pointer drag; keyboard directions covered on mobile')
  await page.goto('/studio.html')
  const node = page.getByRole('button', { name: 'Order API', exact: true })
  await node.click()
  await page.getByRole('button', { name: 'Zoom out', exact: true }).click()
  const before = {
    x: Number(await node.getAttribute('x')),
    y: Number(await node.getAttribute('y')),
    width: Number(await node.getAttribute('width')),
    height: Number(await node.getAttribute('height')),
  }
  const handle = page.locator('[data-resize-direction="nw"]')
  const box = await handle.boundingBox()
  if (!box) throw Error('missing northwest handle')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 12, box.y + box.height / 2 + 8, { steps: 4 })
  expect(Number(await node.getAttribute('x'))).toBeGreaterThan(before.x)
  expect(Number(await node.getAttribute('x')) + Number(await node.getAttribute('width'))).toBe(
    before.x + before.width,
  )
  expect(Number(await node.getAttribute('y')) + Number(await node.getAttribute('height'))).toBe(
    before.y + before.height,
  )
  await page.keyboard.press('Escape')
  await page.mouse.up()
  expect(Number(await node.getAttribute('x'))).toBe(before.x)
  expect(Number(await node.getAttribute('width'))).toBe(before.width)
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled()
  await node.click()
  await page.getByRole('button', { name: 'Lock', exact: true }).click()
  await expect(page.locator('[data-resize-node]')).toHaveCount(0)
})
