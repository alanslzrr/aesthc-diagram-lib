import { expect, test, type Locator } from '@playwright/test'

/** Missing references fail in CI too; retain review evidence without updating them. */
export async function compareVisual(
  locator: Locator,
  name: string,
  options: { animations?: 'disabled'; maxDiffPixelRatio?: number; threshold?: number } = {},
) {
  await expect.soft(locator).toHaveScreenshot(name, options)
  if (process.env.CI && test.info().errors.length > 0) {
    const path = test.info().outputPath(`review-${name}`)
    await locator.screenshot({ path, animations: 'disabled' })
    await test.info().attach(`Review ${name}`, { path, contentType: 'image/png' })
  }
}
