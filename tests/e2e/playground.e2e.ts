import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
const types = ['band', 'flowchart', 'sequence', 'state-machine', 'er', 'timeline', 'swimlane']

test('seven types render with unique SVG IDs in both themes', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  if (process.env.VISUAL_REGRESSION === '1')
    await page.addStyleTag({
      content: 'header.fixed, .skip-link { visibility: hidden !important; }',
    })
  for (const theme of ['light', 'dark']) {
    await page.evaluate((theme) => {
      document.documentElement.dataset.theme = theme
    }, theme)
    for (const type of types) {
      const panel = page.locator(`[data-diagram-panel="example-${type}"]`)
      await expect(panel.locator('svg[role="group"]')).toBeVisible()
      const ids = await panel
        .locator('svg [id]')
        .evaluateAll((nodes) => nodes.map((node) => node.id))
      expect(new Set(ids).size).toBe(ids.length)
      if (process.env.VISUAL_REGRESSION === '1')
        await expect(panel).toHaveScreenshot(`${type}-${theme}.png`, {
          animations: 'disabled',
          maxDiffPixelRatio: 0.001,
          threshold: 0.05,
        })
    }
  }
  expect(errors).toEqual([])
})

test('invalid JSON retains the last valid preview and draft across tabs', async ({ page }) => {
  await page.goto('/?only=example-flowchart')
  const panel = page.locator('[data-diagram-panel]')
  await panel.getByRole('button', { name: 'Code', exact: true }).click()
  const editor = panel.getByRole('textbox')
  const valid = await editor.inputValue()
  const invalid = JSON.parse(valid)
  invalid.legend = null
  await editor.fill(JSON.stringify(invalid))
  await expect(editor).toHaveAttribute('aria-invalid', 'true')
  await panel.getByRole('button', { name: 'Preview', exact: true }).click()
  await expect(panel.locator('svg[role="group"]')).toBeVisible()
  await panel.getByRole('button', { name: 'Code', exact: true }).click()
  await expect(editor).toHaveValue(JSON.stringify(invalid))
  await editor.fill(valid)
  await expect(editor).toHaveAttribute('aria-invalid', 'false')
})

test('share roundtrip restores spec and locale', async ({ page }) => {
  await page.goto('/?only=example-flowchart')
  await page.getByRole('button', { name: 'EN', exact: true }).click()
  const panel = page.locator('[data-diagram-panel]')
  await panel.getByRole('button', { name: 'Compartir', exact: true }).click()
  await expect(page).toHaveURL(/#s=[zj]/)
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'es')
  await expect(panel.locator('svg[role="group"]')).toBeVisible()
})

test('keyboard selection and JSON/SVG/PNG downloads work', async ({ page }) => {
  await page.goto('/?only=example-flowchart')
  const panel = page.locator('[data-diagram-panel]')
  const node = panel.locator('[data-node-id][role="button"]').first()
  await node.focus()
  await page.keyboard.press('Enter')
  await expect(node).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('Escape')
  for (const name of ['↓ JSON', '↓ SVG', '↓ PNG']) {
    const download = page.waitForEvent('download')
    await panel.getByRole('button', { name, exact: true }).click()
    const file = await download
    expect(await file.failure()).toBeNull()
    expect(await file.path()).toBeTruthy()
  }
})

test('static docs and agent entrypoint work without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto('http://127.0.0.1:4173/agents/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('coding agent')
  await page.getByRole('main').getByRole('link', { name: 'Getting started', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Getting started')
  expect((await page.request.get('http://127.0.0.1:4173/llms.txt')).status()).toBe(200)
  await context.close()
})

test('core page has no serious or critical accessibility violations', async ({ page }) => {
  await page.goto('/?only=example-flowchart')
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  expect(
    result.violations.filter((issue) => issue.impact === 'critical' || issue.impact === 'serious'),
  ).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
