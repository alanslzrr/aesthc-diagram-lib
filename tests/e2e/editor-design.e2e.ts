import { test, expect } from '@playwright/test'

for (const width of [360, 768, 1440]) {
  for (const locale of ['en', 'es'] as const) {
    test(`T45 ${locale} layout stays coherent at ${width}px`, async ({ page, isMobile }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/studio.html')
      if (locale === 'es') await page.getByLabel('Language').selectOption('es')
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 2,
      )
      expect(overflow).toBe(false)
      const fonts = await page.evaluate(() => ({
        geist: document.fonts.check('16px Geist'),
        mono: document.fonts.check('16px "Geist Mono"'),
      }))
      expect(fonts.geist).toBe(true)
      expect(fonts.mono).toBe(true)
      const layers = page.locator('.adl-editor-surface > svg')
      await expect
        .poll(() =>
          layers.evaluateAll((svgs) => {
            if (!svgs.length) return Infinity
            return Math.max(
              ...svgs.map((svg) => {
                const parts = (svg.getAttribute('viewBox') ?? '0 0 1 1').split(' ').map(Number)
                const box = svg.getBoundingClientRect()
                if (parts.length !== 4 || !box.height) return Infinity
                const viewRatio = parts[2] / parts[3]
                return Math.abs(viewRatio - box.width / box.height) / viewRatio
              }),
            )
          }),
        )
        .toBeLessThan(0.02)
      const surfaces = await page.evaluate(() =>
        [...document.querySelectorAll('.adl-editor-inspector')].map((el) => {
          const background = getComputedStyle(el).backgroundColor
          return background === 'rgba(0, 0, 0, 0)' || background === 'transparent'
        }),
      )
      expect(surfaces.every((transparent) => !transparent)).toBe(true)
      await page
        .getByRole('button', {
          name: locale === 'es' ? 'Ajustar diagrama' : 'Fit diagram',
          exact: true,
        })
        .click()
      if (isMobile) {
        const heights = await page
          .locator('.adl-editor-toolbar button')
          .evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().height))
        expect(heights.every((height) => height >= 44)).toBe(true)
      }
      const toolbar = page.getByRole('toolbar', {
        name: locale === 'es' ? 'Herramientas de edición' : 'Editor tools',
      })
      await expect(toolbar).toBeVisible()
    })
  }
}
