import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFile } from 'node:fs/promises'

test('light surfaces and diagram detail survive theme switches and SVG export', async ({
  page,
}) => {
  await page.goto('/?only=example-band')
  const panel = page.locator('[data-diagram-panel]')
  const canvas = panel.locator('svg[role="group"]')
  await expect(canvas).toBeVisible()
  const detail = () =>
    canvas.evaluate((svg) => {
      const styles = getComputedStyle(svg)
      const grid = svg.querySelector('rect[mask]')!
      const card = svg.querySelector('g[data-node-id] rect')!
      return {
        background: styles.getPropertyValue('--background').trim(),
        grid: getComputedStyle(grid).opacity,
        fill: getComputedStyle(card).fill,
        tail: styles.getPropertyValue('--diagram-main-tail-opacity').trim(),
      }
    })
  const light = await detail()
  expect(light.background).toBe('#e9eef4')
  expect(light.fill).toBe('rgb(249, 251, 253)')
  expect(light.grid).toBe('0.18')
  expect(light.tail).toBe('0.62')

  await page.getByRole('button', { name: 'Light', exact: true }).click()
  await expect.poll(detail).toMatchObject({ background: '#070707', grid: '0.12', tail: '0.24' })
  await page.getByRole('button', { name: 'Dark', exact: true }).click()
  await expect.poll(detail).toEqual(light)

  const pending = page.waitForEvent('download')
  await panel.getByRole('button', { name: '↓ SVG', exact: true }).click()
  const download = await pending
  const markup = await readFile((await download.path())!, 'utf8')
  expect(markup).toContain('stop-opacity="0.62"')
  expect(markup).not.toContain('var(--diagram-')
  expect(markup).toContain('rgb(249, 251, 253)')
})

for (const theme of ['light', 'dark']) {
  test(`${theme} band text and controls retain accessible contrast`, async ({ page }) => {
    await page.goto('/?only=example-band')
    await page.addStyleTag({
      content: '* { transition: none !important; animation: none !important; }',
    })
    await page.evaluate((theme) => {
      document.documentElement.dataset.theme = theme
    }, theme)
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    expect(
      result.violations.filter(
        (issue) => issue.impact === 'serious' || issue.impact === 'critical',
      ),
    ).toEqual([])
  })
}
