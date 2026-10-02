import { test, expect } from '@playwright/test'

// F22: the host theme/locale preference is shared by every surface, while the
// document and its export appearance stay independent from the host chrome.
test('host theme and locale persist across surfaces and stay separate from documents', async ({
  page,
}) => {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem('adl-locale', 'es')
    localStorage.setItem('adl-theme', 'dark')
  })
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'es')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.getByRole('link', { name: 'Empezar', exact: true })).toBeVisible()

  // Docs are English-only content, but the shared host theme still applies.
  await page.goto('/docs/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')

  await page.goto('/playground.html')
  await expect(page.locator('html')).toHaveAttribute('lang', 'es')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('.playground-sidebar')).toContainText('Tipos de diagrama')

  await page.goto('/studio.html')
  await expect(page.locator('html')).toHaveAttribute('lang', 'es')
  await expect(page.getByRole('heading', { name: 'Estudio de diagramas' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Guardar localmente', exact: true })).toBeVisible()
  await expect(page.locator('.studio-shell')).toHaveAttribute('data-theme', 'dark')
  // The document keeps its own presentation theme; only the host chrome is dark.
  await page.getByText('JSON del documento', { exact: true }).click()
  const json = page.getByRole('textbox', { name: 'JSON del documento' })
  const studioDocument = JSON.parse(await json.inputValue())
  expect(studioDocument.presentation.theme.mode).toBe('light')

  await page.goto('/viewer.html')
  await expect(page.locator('html')).toHaveAttribute('lang', 'es')
  await expect(page.getByRole('heading', { name: 'Visor semántico' })).toBeVisible()
  await expect(page.locator('.viewer-shell')).toHaveAttribute('data-theme', 'dark')
  expect(
    await page.evaluate(
      () => getComputedStyle(document.querySelector('.viewer-shell') as Element).backgroundColor,
    ),
  ).toBe('rgb(0, 0, 0)')
  // The viewer component keeps the document's own light theme and English content.
  await expect(page.locator('.adl-viewer')).toHaveAttribute('data-theme', 'light')
  await expect(page.locator('.adl-viewer')).toContainText('Web client')
  await expect(page.locator('.adl-viewer')).toContainText('Order API')

  // Switching locale updates the host copy, html lang and the shared storage.
  await page.getByLabel('Idioma', { exact: true }).selectOption('en')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('heading', { name: 'Semantic viewer', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('heading', { name: 'Semantic viewer', exact: true })).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('adl-locale'))).toBe('en')
})
