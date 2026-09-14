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

test('static discovery metadata and missing-page recovery are usable without JavaScript', async ({
  browser,
  request,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto('/docs/getting-started/')
  const gettingStarted = await page.locator('meta[name="description"]').getAttribute('content')
  await page.goto('/docs/guides/theming/')
  const theming = await page.locator('meta[name="description"]').getAttribute('content')
  expect(gettingStarted).not.toEqual(theming)
  expect(theming).not.toMatch(/\]\(|\|---/)
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', theming!)
  await page.goto('/404.html')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Read the documentation' })).toHaveAttribute(
    'href',
    '/docs/',
  )
  expect(await (await request.get('/robots.txt')).text()).toContain('sitemap.xml')
  expect((await request.get('/licenses/TheSVG-MIT.txt')).ok()).toBe(true)
  await context.close()
})
