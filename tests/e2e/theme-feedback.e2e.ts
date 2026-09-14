import { test, expect } from '@playwright/test'

for (const locale of ['en', 'es']) {
  test(`invalid theme edits preserve readable host and last valid preview: ${locale}`, async ({
    page,
  }) => {
    await page.addInitScript((locale) => {
      localStorage.setItem('adl-locale', locale)
      localStorage.setItem('adl-theme', 'light')
    }, locale)
    await page.goto('/')
    const editor = page.getByRole('textbox', { name: /--background.*hex/ })
    const preview = page.getByRole('img', {
      name: locale === 'es' ? 'Vista previa local del tema' : 'Local theme preview',
    })
    const original = await page.evaluate(() => ({
      background: getComputedStyle(document.body).backgroundColor,
      foreground: getComputedStyle(document.body).color,
    }))
    const previewBackground = await preview.evaluate(
      (element) => getComputedStyle(element.parentElement!).backgroundColor,
    )
    for (const value of ['', '#', '#12', '#not-a-color']) {
      await editor.fill(value)
      await expect(editor).toHaveAttribute('aria-invalid', 'true')
      expect(
        await preview.evaluate(
          (element) => getComputedStyle(element.parentElement!).backgroundColor,
        ),
      ).toBe(previewBackground)
      expect(
        await page.evaluate(() => ({
          background: getComputedStyle(document.body).backgroundColor,
          foreground: getComputedStyle(document.body).color,
        })),
      ).toEqual(original)
      await expect(
        page.getByText(locale === 'es' ? 'Hay cambios no válidos.' : 'Some edits are invalid.', {
          exact: false,
        }),
      ).toBeVisible()
    }
    await page
      .getByRole('button', {
        name: locale === 'es' ? 'Restaurar color válido' : 'Restore valid color',
      })
      .click()
    await expect(editor).toHaveAttribute('aria-invalid', 'false')
    await editor.fill('#123456')
    await expect(page.locator('.theme-studio-preview')).toHaveCSS(
      'background-color',
      'rgb(18, 52, 86)',
    )
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(
      original.background,
    )
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('lang', locale)
  })
  for (const width of [320, 360, 390]) {
    test(`installation controls do not overlap: ${locale} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 850 })
      await page.addInitScript((locale) => localStorage.setItem('adl-locale', locale), locale)
      await page.goto('/')
      const toolbar = page.locator('.install-toolbar').first()
      const boxes = await toolbar.locator('button').evaluateAll((buttons) =>
        buttons.map((button) => {
          const { x, y, width, height } = button.getBoundingClientRect()
          return { x, y, width, height }
        }),
      )
      expect(boxes).toHaveLength(5)
      for (let i = 0; i < boxes.length; i++) {
        expect(boxes[i].height).toBeGreaterThanOrEqual(36)
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i],
            b = boxes[j]
          expect(
            Math.min(a.x + a.width, b.x + b.width) > Math.max(a.x, b.x) &&
              Math.min(a.y + a.height, b.y + b.height) > Math.max(a.y, b.y),
          ).toBe(false)
        }
      }
      for (const name of ['npm', 'pnpm', 'yarn', 'bun'])
        await toolbar.getByRole('button', { name, exact: true }).click()
    })
  }
  test(`clipboard denial has visible localized feedback: ${locale}`, async ({ page }) => {
    await page.addInitScript((locale) => {
      localStorage.setItem('adl-locale', locale)
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: () => Promise.reject(new Error('Denied')) },
      })
    }, locale)
    await page.goto('/')
    const install = page.locator('.install-snippet').first()
    await install.locator('[data-copy-code]').click()
    await expect(install.locator('.action-status')).toBeVisible()
    await expect(install.locator('.action-status')).toContainText(
      locale === 'es' ? 'No se pudo copiar' : 'Copy failed',
    )
  })
}

test('locale toggle persists independently and blocked storage falls back safely', async ({
  page,
  context,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'EN', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'es')
  expect(await page.evaluate(() => localStorage.getItem('adl-locale'))).toBe('es')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'es')
  const blocked = await context.newPage()
  await blocked.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('Blocked')
      },
    })
  })
  await blocked.goto('/')
  await expect(blocked.locator('html')).toHaveAttribute('lang', 'en')
  await blocked.getByRole('button', { name: 'EN', exact: true }).click()
  await expect(blocked.locator('html')).toHaveAttribute('lang', 'es')
})
