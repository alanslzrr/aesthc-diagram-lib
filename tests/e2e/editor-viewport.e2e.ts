import { test, expect } from '@playwright/test'

async function dragNodeBy(page: import('@playwright/test').Page, dx: number, dy: number) {
  const node = page.getByRole('button', { name: 'Order API', exact: true })
  await node.scrollIntoViewIfNeeded()
  const box = await node.boundingBox()
  if (!box) throw Error('node absent')
  const x = await node.getAttribute('x')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + dx, box.y + box.height / 2 + dy, { steps: 6 })
  await page.mouse.up()
  const next = await node.getAttribute('x')
  return { x: Number(x), next: Number(next) }
}

test.describe('viewport math under transforms', () => {
  test.describe('retina DPR 2', () => {
    test.use({ deviceScaleFactor: 2 })
    test('T07.2 a screen drag applies the world delta once without double transformation', async ({
      page,
      isMobile,
    }) => {
      test.skip(isMobile, 'Mouse transform math; touch drag covered separately')
      await page.goto('/studio.html')
      const { x, next } = await dragNodeBy(page, 192, 96)
      expect(next - x).toBeGreaterThanOrEqual(191)
      expect(next - x).toBeLessThanOrEqual(193)
    })
  })
  test('T07.2 CSS-scaled canvas with letterbox maps screen deltas through the CTM', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'Mouse transform math; touch drag covered separately')
    await page.goto('/studio.html')
    await page.evaluate(() => {
      const body = document.querySelector('.adl-editor-body') as HTMLElement | null
      if (!body) return
      body.style.transform = 'scale(0.5)'
      body.style.transformOrigin = 'top left'
      const spacer = document.createElement('div')
      spacer.style.height = '240px'
      body.parentElement?.insertBefore(spacer, body)
    })
    const { x, next } = await dragNodeBy(page, 96, 48)
    expect(next - x).toBeGreaterThanOrEqual(191)
    expect(next - x).toBeLessThanOrEqual(193)
  })
})

test('T08.1 the middle mouse button pans the camera without touching the document', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Mouse-specific pan')
  await page.goto('/studio.html')
  const node = page.getByRole('button', { name: 'Order API', exact: true })
  await node.scrollIntoViewIfNeeded()
  const box = await node.boundingBox()
  if (!box) throw Error('node absent')
  const before = await node.getAttribute('x')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down({ button: 'middle' })
  await page.mouse.move(box.x + box.width / 2 + 150, box.y + box.height / 2 + 80, { steps: 5 })
  await page.mouse.up({ button: 'middle' })
  expect(await node.getAttribute('x')).toBe(before)
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled()
  await expect(page.getByText('No pending changes', { exact: true })).toBeVisible()
})

test('T09.1 a node id equal to an edge id stays a distinct selectable entity', async ({ page }) => {
  await page.goto('/studio.html')
  await page.getByText('Document JSON', { exact: true }).click()
  const json = page.getByRole('textbox', { name: 'Document JSON' })
  const doc = JSON.parse(await json.inputValue())
  doc.spec.nodes.push({ id: 'shared', label: 'Shared', kind: 'Service', description: '' })
  doc.spec.edges.push({ id: 'shared', from: 'client', to: 'api', label: 'Shared' })
  doc.scene.nodes.shared = { x: 900, y: 500, width: 140, height: 56, locked: false }
  doc.scene.zOrder.push('shared')
  await json.fill(JSON.stringify(doc))
  await page.getByRole('button', { name: 'Apply JSON' }).click()
  await page.getByText('Diagram outline', { exact: true }).click()
  const outline = page.getByRole('region', { name: 'Diagram outline', exact: true })
  const nodeButton = outline.getByRole('button', { name: 'Select node: Shared', exact: true })
  await expect(nodeButton).toBeVisible()
  await nodeButton.click()
  await expect(page.getByRole('button', { name: /^Resize Shared/ }).first()).toBeVisible()
  const edgeButton = outline.getByRole('button', {
    name: /Select connection: .*Shared/,
  })
  await expect(edgeButton).toBeVisible()
  await edgeButton.click()
  await expect(page.getByRole('button', { name: /^Resize Shared/ })).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeEnabled()
})

test('the gesture baseline refreshes after content changes between drags', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Mouse-specific drag')
  await page.goto('/studio.html')
  const api = page.getByRole('button', { name: 'Order API', exact: true })
  const box = await api.boundingBox()
  if (!box) throw Error('node absent')
  const staticNode = await page
    .locator('[data-node-id]')
    .filter({ hasText: 'Email worker' })
    .elementHandle()
  if (!staticNode) throw Error('static geometry absent')
  const drag = async (steps: number) => {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + steps, box.y + box.height / 2, { steps: 4 })
    expect(await staticNode.evaluate((node) => node.isConnected)).toBe(true)
    await page.mouse.up()
  }
  await drag(80)
  const worker = page.getByRole('button', { name: 'Email worker', exact: true })
  await worker.click()
  await page.getByLabel('Label', { exact: true }).fill('Renamed worker')
  await page.getByRole('button', { name: 'Apply label', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Renamed worker', exact: true })).toBeVisible()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2, { steps: 4 })
  await expect(page.locator('svg text').filter({ hasText: 'Renamed worker' }).first()).toBeVisible()
  await page.mouse.up()
  await expect(page.getByRole('button', { name: 'Renamed worker', exact: true })).toBeVisible()
})
