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

test('capabilities are a static section with no disclosure pattern', async ({ page }) => {
  await page.goto('/')
  const section = page.locator('#capabilities')
  await expect(section).toBeVisible()
  await expect(section).toContainText('Capabilities · v')
  await expect(section.locator('summary')).toHaveCount(0)
  await expect(section.locator('[aria-expanded]')).toHaveCount(0)
  await expect(section.locator('dt')).toHaveCount(6)
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
