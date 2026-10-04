import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Exercise packaged modules in a real browser without source aliases or a production harness.
test.beforeEach(async ({ page }) => {
  const root = resolve('dist')
  await page.route('**/__portable/dist/**', async (route) => {
    const path = decodeURIComponent(
      new URL(route.request().url()).pathname.split('/__portable/dist/')[1],
    )
    const file = resolve(root, path)
    if (!file.startsWith(root + '/')) return route.abort()
    await route.fulfill({
      body: readFileSync(file),
      contentType: file.endsWith('.woff2') ? 'font/woff2' : 'text/javascript',
    })
  })
  await page.goto('/viewer.html')
})

for (const locale of ['en', 'es'] as const) {
  test(`portable card and HTML use exact embedded typography in ${locale}`, async ({ page }) => {
    const result = await page.evaluate(async (locale) => {
      const base = location.origin + '/__portable/dist'
      const api = await import(base + '/export/index.js')
      const core = await import(base + '/editor-core/index.js')
      const fonts = {
        sans: new Uint8Array(await (await fetch(base + '/fonts/geist-sans.woff2')).arrayBuffer()),
        mono: new Uint8Array(await (await fetch(base + '/fonts/geist-mono.woff2')).arrayBuffer()),
      }
      const made = core.createDocument(
        {
          type: 'graph',
          caption: 'Typography',
          legend: { main: 'Main', branch: 'Branch' },
          nodes: [
            {
              id: 'a',
              label: locale === 'es' ? 'Confirmación de pago' : 'Payment confirmation',
              description: '',
            },
            { id: 'b', label: 'API', description: '' },
          ],
          edges: [{ id: 'ab', from: 'a', to: 'b', label: 'payment.succeeded' }],
        },
        { id: 'font-test', locale },
      )
      const before = document.querySelectorAll('style').length
      const [card, png, html] = await Promise.all([
        api.exportCardSvg(made.value, { fonts, fontPolicy: 'required' }),
        api.exportCard(made.value, { fonts, fontPolicy: 'required' }),
        api.exportDocumentHtmlAsync(made.value, {
          fonts,
          fontPolicy: 'required',
          runtime: '',
          css: '',
        }),
      ])
      if (!card.ok || !png.ok || !html.ok)
        throw Error(JSON.stringify([card, png, html].map((result) => result.diagnostics)))
      const image = await createImageBitmap(new Blob([png.value.bytes], { type: 'image/png' }))
      const dimensions = [image.width, image.height]
      image.close()
      return {
        typography: [
          card.value.typography,
          png.value.receipt.typography,
          html.value.receipt.typography,
        ],
        svg: card.value.svg,
        html: html.value.html,
        dimensions,
        leaked: document.querySelectorAll('style').length - before,
      }
    }, locale)
    expect(result.typography).toEqual(Array(3).fill({ measurement: 'embedded', embedded: true }))
    expect(result.svg).toContain('data:font/woff2;base64,')
    expect(result.html).toContain('data-font-measurement="embedded"')
    expect(result.dimensions).toEqual([1200, 630])
    expect(result.leaked).toBe(0)
  })
}

test('required and fallback font failures remain explicit and release scoped declarations', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const base = location.origin + '/__portable/dist'
    const api = await import(base + '/export/index.js'),
      core = await import(base + '/editor-core/index.js')
    const made = core.createDocument(
      {
        type: 'graph',
        caption: 'Failure',
        legend: { main: 'Main', branch: 'Branch' },
        nodes: [{ id: 'a', label: 'A', description: '' }],
        edges: [],
      },
      { id: 'font-failure', locale: 'en' },
    )
    const fonts = {
      sans: new Uint8Array([119, 79, 70, 50]),
      mono: new Uint8Array([119, 79, 70, 50]),
    }
    const before = document.querySelectorAll('style').length
    const required = await api.exportCardSvg(made.value, { fonts, fontPolicy: 'required' })
    const fallback = await api.exportCardSvg(made.value, { fonts, fontPolicy: 'fallback' })
    return {
      required: required.diagnostics.map((d: { code: string }) => d.code),
      fallback: fallback.ok ? fallback.value.typography : null,
      warnings: fallback.diagnostics.map((d: { code: string }) => d.code),
      leaked: document.querySelectorAll('style').length - before,
    }
  })
  expect(result.required).toContain('export.font-missing')
  expect(result.fallback).toEqual({ measurement: 'fallback', embedded: false })
  expect(result.warnings).toContain('export.font-fallback')
  expect(result.leaked).toBe(0)
})
