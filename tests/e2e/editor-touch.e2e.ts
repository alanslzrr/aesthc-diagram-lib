import { test, expect } from '@playwright/test'

test('two-finger pinch pans and zooms without committing node edits', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'CDP touch injection; other engines use pointer regression coverage',
  )
  await page.goto('/studio.html')
  const surface = page.getByRole('group', { name: /^Editable diagram/ })
  const box = await surface.boundingBox()
  if (!box) throw Error('surface missing')
  const before = await page.getByLabel('Zoom', { exact: true }).textContent()
  const node = page.getByRole('button', { name: 'Order API', exact: true })
  const x = await node.getAttribute('x')
  const cdp = await page.context().newCDPSession(page)
  const cy = box.y + box.height / 2,
    cx = box.x + box.width / 2
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: cx - 25, y: cy, id: 1 },
      { x: cx + 25, y: cy, id: 2 },
    ],
  })
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [
      { x: cx - 60, y: cy + 20, id: 1 },
      { x: cx + 60, y: cy + 20, id: 2 },
    ],
  })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect(page.getByLabel('Zoom', { exact: true })).not.toHaveText(before ?? '')
  expect(await node.getAttribute('x')).toBe(x)
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled()
  await expect(page.getByText('No pending changes', { exact: true })).toBeVisible()
  await cdp.detach()
})

test('ordinary wheel scrolls the page and modified wheel zooms only the canvas', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Wheel interaction')
  await page.goto('/studio.html')
  await page.evaluate(() => {
    document.body.style.paddingBottom = '1000px'
  })
  const canvas = page.getByRole('group', { name: /^Editable diagram/ })
  await canvas.hover()
  const before = await page.getByLabel('Zoom', { exact: true }).textContent()
  await page.mouse.wheel(0, 150)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  await expect(page.getByLabel('Zoom', { exact: true })).toHaveText(before ?? '')
  await page.evaluate(() => window.scrollTo(0, 0))
  await canvas.hover()
  await page.keyboard.down('Control')
  await page.mouse.wheel(0, -150)
  await page.keyboard.up('Control')
  await expect(page.getByLabel('Zoom', { exact: true })).not.toHaveText(before ?? '')
})

test('Space drag pans without moving nodes or creating undo entries', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Keyboard and mouse gesture')
  await page.goto('/studio.html')
  const canvas = page.getByRole('group', { name: /^Editable diagram/ })
  const node = page.getByRole('button', { name: 'Order API', exact: true })
  const box = await node.boundingBox()
  if (!box) throw Error('node missing')
  const x = await node.getAttribute('x')
  const transform = await canvas.locator(':scope > g').getAttribute('transform')
  await canvas.focus()
  await page.keyboard.down('Space')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 45, box.y + box.height / 2 + 20, { steps: 4 })
  await page.mouse.up()
  await page.keyboard.up('Space')
  expect(await canvas.locator(':scope > g').getAttribute('transform')).not.toBe(transform)
  expect(await node.getAttribute('x')).toBe(x)
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled()
})

test('long touch selects without dragging, opening callouts or committing edits', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'CDP touch injection; other engines use pointer regression coverage',
  )
  await page.goto('/studio.html')
  const node = page.getByRole('button', { name: 'Order API', exact: true })
  const before = await node.getAttribute('x')
  const box = await node.boundingBox()
  if (!box) throw Error('node missing')
  const cdp = await page.context().newCDPSession(page)
  const cx = box.x + box.width / 2,
    cy = box.y + box.height / 2
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: cx, y: cy, id: 1 }],
  })
  await page.waitForTimeout(700)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect(node).toHaveAttribute('aria-pressed', 'true')
  expect(await node.getAttribute('x')).toBe(before)
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled()
  await cdp.detach()
})
