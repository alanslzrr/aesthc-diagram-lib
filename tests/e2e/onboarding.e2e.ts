import { test, expect } from '@playwright/test'

test('candidate onboarding is explicit and generated pages link to their source', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.locator('[data-release-availability]')).toContainText(
    'not yet available on npm',
  )
  await expect(page.getByText('React 18.3.1 / 19', { exact: true })).toBeVisible()
  await page.goto('/docs/getting-started/')
  await expect(page.getByRole('link', { name: 'Edit generation source' })).toHaveAttribute(
    'href',
    /scripts\/generate-docs\.ts$/,
  )
  await expect(page.getByRole('main')).toContainText('not yet available on npm')
  await page.goto('/docs/api/')
  await expect(page.getByRole('main')).toContainText('BrandIcon')
  await expect(page.getByRole('main')).toContainText('ARCHITECTURE_EXAMPLES')
})
