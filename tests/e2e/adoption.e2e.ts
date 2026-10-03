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

const visibleHrefs = (page: import('@playwright/test').Page, selector: string) =>
  page.evaluate(
    (selector) => [
      ...new Set(
        [...document.querySelectorAll<HTMLAnchorElement>(selector)]
          .filter((anchor) => anchor.offsetParent !== null)
          .map((anchor) => anchor.getAttribute('href') as string),
      ),
    ],
    selector,
  )

for (const locale of ['en', 'es'] as const) {
  for (const route of ['/', '/?only=example-band', '/?only=example-flowchart'] as const) {
    test(`${route} (${locale}) keeps every visible internal anchor resolvable`, async ({
      page,
    }) => {
      // One navigation per case: the locale is persisted before the first load
      // so the traversal never needs a reload, which was timing out on WebKit.
      await page.addInitScript((value) => localStorage.setItem('adl-locale', value), locale)
      await page.goto(route)
      await page.evaluate(() => document.fonts.ready)
      for (const href of await visibleHrefs(page, 'a[href^="#"]')) {
        const id = decodeURIComponent(href.slice(1))
        expect(
          await page.evaluate((id) => document.getElementById(id) !== null, id),
          `${route} (${locale}) ${href} has no target`,
        ).toBe(true)
      }
      const switches = await visibleHrefs(page, 'a[href^="?only="]')
      if (!route.includes('only=')) {
        // Full mode renders every layout, so each route switch names a card.
        for (const href of switches) {
          const target = new URL(href, page.url()).searchParams.get('only') as string
          await expect(
            page.locator(`[data-diagram-panel="${target}"]`),
            `${route} (${locale}) ${href} has no card`,
          ).toBeVisible()
        }
        return
      }
      for (const href of switches) {
        const target = new URL(href, page.url()).searchParams.get('only') as string
        await page.goto(href)
        await expect(page).toHaveURL(new RegExp(`only=${target}`))
        await expect(page.locator(`#${target}`)).toBeVisible()
      }
      await page
        .getByRole('link', { name: /Back to all diagrams|Volver a todos los diagramas/ })
        .click()
      await expect(page.locator('.layout-gallery')).toBeVisible()
    })
  }
}

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
