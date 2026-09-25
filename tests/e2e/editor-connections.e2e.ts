import { test, expect } from '@playwright/test'

const connections = (page: import('@playwright/test').Page) =>
  page.getByText('Existing connections', { exact: false })

async function count(page: import('@playwright/test').Page) {
  const text = await connections(page).textContent()
  const match = text?.match(/\((\d+)\)/)
  return match ? Number(match[1]) : -1
}

test('drag from the connect handle to a target creates one undoable relation', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Mouse-specific pointer drag; mobile covered separately')
  await page.goto('/studio.html')
  await page.getByRole('button', { name: 'Web client', exact: true }).click()
  const handle = page.getByRole('button', { name: 'Connect: Web client', exact: true })
  await expect(handle).toBeVisible()
  const handleBox = await handle.boundingBox()
  const targetBox = await page.getByRole('button', { name: 'Orders', exact: true }).boundingBox()
  if (!handleBox || !targetBox) throw Error('handle or target absent')
  expect(await count(page)).toBe(3)
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, {
    steps: 10,
  })
  await page.mouse.up()
  expect(await count(page)).toBe(4)
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  expect(await count(page)).toBe(3)
})

test('dropping the connect drag on empty canvas cancels without changes', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Mouse-specific pointer drag')
  await page.goto('/studio.html')
  await page.getByRole('button', { name: 'Web client', exact: true }).click()
  const handle = page.getByRole('button', { name: 'Connect: Web client', exact: true })
  await expect(handle).toBeVisible()
  const handleBox = await handle.boundingBox()
  const surface = await page.getByRole('group', { name: /^Editable diagram/ }).boundingBox()
  if (!handleBox || !surface) throw Error('handle or surface absent')
  expect(await count(page)).toBe(3)
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(surface.x + surface.width - 12, surface.y + surface.height - 12, {
    steps: 8,
  })
  await page.mouse.up()
  expect(await count(page)).toBe(3)
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled()
})

test('keyboard connect mode links the focused target and Escape cancels', async ({ page }) => {
  await page.goto('/studio.html')
  await page.getByRole('button', { name: 'Web client', exact: true }).click()
  const handle = page.getByRole('button', { name: 'Connect: Web client', exact: true })
  await expect(handle).toBeVisible()
  await handle.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByText('Press Enter on a target node', { exact: false })).toBeVisible()
  const target = page.getByRole('button', { name: 'Orders', exact: true })
  await target.focus()
  await page.keyboard.press('Enter')
  expect(await count(page)).toBe(4)
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  expect(await count(page)).toBe(3)
  await page.getByRole('button', { name: 'Web client', exact: true }).click()
  const handleAgain = page.getByRole('button', { name: 'Connect: Web client', exact: true })
  await expect(handleAgain).toBeVisible()
  await handleAgain.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByText('Press Enter on a target node', { exact: false })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByText('Press Enter on a target node', { exact: false })).toBeHidden()
  expect(await count(page)).toBe(3)
})
