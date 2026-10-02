import { test, expect, type Page } from '@playwright/test'

// UI-02 / UI-03: one global theme authority in the playground. The effective
// appearance follows the host switch for every layout and for imported
// documents, while the serialized document stays untouched (no revision, no
// undo entry, no dirty state) and no second theme control exists.

const LIGHT = { card: '#fafafa', background: '#ffffff', foreground: '#0a0a0a' }
const DARK = { card: '#0a0a0a', background: '#000000', foreground: '#ededed' }
const TYPES = [
  'example-band',
  'example-flowchart',
  'example-sequence',
  'example-state-machine',
  'example-er',
  'example-timeline',
  'example-swimlane',
] as const

async function setHostTheme(page: Page, target: 'light' | 'dark') {
  const current = await page.evaluate(() => document.documentElement.dataset.theme)
  if (current === target) return
  const label = target === 'dark' ? 'Dark' : 'Light'
  await page.getByRole('button', { name: label, exact: true }).click()
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe(target)
}

async function surfaces(page: Page) {
  return page.evaluate(() => {
    const surface = document.querySelector('.adl-editor-surface')
    const fills = (selector: string) =>
      [...(surface?.querySelectorAll(selector) ?? [])].map((node) => node.getAttribute('fill'))
    const textFills = [
      ...(surface?.querySelectorAll('text[data-node-label], text[data-field-name]') ?? []),
    ].map((node) => node.getAttribute('fill'))
    return {
      nodes: fills('[data-node-surface="true"]'),
      containers: fills('[data-container-id] rect'),
      labels: fills('[data-edge-label] rect'),
      decisions: fills('[data-decision-id] rect'),
      text: textFills,
    }
  })
}

function expectDark(page: Page, theme: typeof LIGHT | typeof DARK) {
  return surfaces(page).then((result) => {
    for (const fill of result.nodes) expect(fill).toBe(theme.card)
    for (const fill of [...result.containers, ...result.labels, ...result.decisions])
      expect(fill).toBe(theme.background)
    if (result.text.length) expect(result.text).toContain(theme.foreground)
    if (theme === DARK && result.nodes.length)
      expect(result.nodes.every((fill) => fill !== '#fafafa' && fill !== '#ffffff')).toBe(true)
  })
}

for (const key of TYPES) {
  test(`global theme reaches every ${key} surface`, async ({ page }) => {
    await page.goto(`/playground.html?only=${key}`)
    await expect(page.locator('.adl-editor-surface [data-hit-node]').first()).toBeVisible()
    await setHostTheme(page, 'light')
    await expectDark(page, LIGHT)
    await setHostTheme(page, 'dark')
    await expectDark(page, DARK)
    await setHostTheme(page, 'light')
    await expectDark(page, LIGHT)
  })
}

test('theme switch is not a document edit and never exposes a second control', async ({ page }) => {
  await page.goto('/playground.html?only=example-er')
  await expect(page.locator('.adl-editor-surface [data-hit-node]').first()).toBeVisible()
  await setHostTheme(page, 'light')
  await expect(page.locator('.adl-editor-inspector select[aria-label="Theme"]')).toHaveCount(0)
  await expect(page.locator('.adl-editor-inspector select[aria-label="Tema"]')).toHaveCount(0)

  await page.getByRole('tab', { name: 'JSON', exact: true }).click()
  const editor = page.getByRole('textbox', { name: 'Document JSON', exact: true })
  const before = await editor.inputValue()
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled()

  await setHostTheme(page, 'dark')
  await expectDark(page, DARK)
  expect(await editor.inputValue()).toBe(before)
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled()
  await expect(page.locator('.playground-editor[data-dirty]')).toHaveCount(0)
})

test('an imported light document renders dark under the dark host without rewriting JSON', async ({
  page,
}) => {
  await page.goto('/playground.html?only=example-band')
  await expect(page.locator('.adl-editor-surface [data-hit-node]').first()).toBeVisible()
  await setHostTheme(page, 'light')
  const spec = JSON.parse(await (await page.request.get('/examples/band.json')).text())
  page.once('dialog', (dialog) => dialog.accept())
  await page.locator('input[type="file"]').setInputFiles({
    name: 'band-light.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(spec)),
  })
  await expect(page.locator('.adl-editor-surface [data-hit-node]').first()).toBeVisible()

  await setHostTheme(page, 'dark')
  await expectDark(page, DARK)

  await page.getByRole('tab', { name: 'JSON', exact: true }).click()
  const text = await page.getByRole('textbox', { name: 'Document JSON', exact: true }).inputValue()
  expect(text).toContain('"mode":"light"')
})
