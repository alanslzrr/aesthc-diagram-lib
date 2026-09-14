import { compareVisual } from './helpers/visual'
import { test, expect } from '@playwright/test'

test('landing links reach adoption tools and editors mount only on demand', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('[data-diagram-panel] textarea')).toHaveCount(0)
  const navigation = page.getByRole('navigation', { name: 'Explore the library', exact: true })
  for (const id of ['quick-start', 'cloud-architecture', 'theme-studio']) {
    await navigation.locator(`a[href="#${id}"]`).click()
    await expect(page).toHaveURL(new RegExp(`#${id}$`))
    await expect(page.locator(`#${id}`)).toBeInViewport()
  }
  const types = page.getByRole('navigation', { name: 'Diagram types', exact: true })
  await expect(types.getByRole('link')).toHaveCount(7)
  await types.locator('a[href="#example-band"]').click()
  await expect(page.locator('#example-band')).toBeInViewport()
})

test('native disclosure handles rapid toggle and Escape', async ({ page }) => {
  await page.goto('/')
  const trigger = page.getByText(/Capabilities · v/)
  await trigger.click()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  await trigger.press('Escape')
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await trigger.click()
  await trigger.click()
  await trigger.click()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  await expect(trigger.locator('..')).toHaveAttribute('open', '')
})

test('landing presentation preserves both locales and themes at narrow and desktop widths', async ({
  page,
}) => {
  test.skip(process.env.VISUAL_REGRESSION !== '1')
  for (const width of [320, 1365]) {
    await page.setViewportSize({ width, height: 900 })
    for (const locale of ['en', 'es']) {
      for (const theme of ['light', 'dark']) {
        await page.goto('/')
        await page.evaluate(
          ({ locale, theme }) => {
            localStorage.setItem('adl-locale', locale)
            localStorage.setItem('adl-theme', theme)
          },
          { locale, theme },
        )
        await page.reload()
        await page.evaluate(() => document.fonts.ready)
        const fonts = await page.evaluate(() =>
          Array.from(document.fonts, (face) => ({
            family: face.family.replaceAll('\"', '').replaceAll("'", ''),
            status: face.status,
          })),
        )
        for (const family of ['Geist', 'Geist Mono'])
          expect(fonts.some((face) => face.family === family && face.status === 'loaded')).toBe(
            true,
          )
        await page.addStyleTag({ content: 'header.fixed { visibility: hidden }' })
        await expect(page.locator('.site-hero img')).toBeVisible()
        await compareVisual(page.locator('.site-hero'), `hero-${width}-${locale}-${theme}.png`, {
          animations: 'disabled',
          maxDiffPixelRatio: 0.001,
        })
      }
    }
  }
})
