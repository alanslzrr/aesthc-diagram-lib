import { test, expect } from '@playwright/test'
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
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
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const context = canvas.getContext('2d')!
      context.drawImage(image, 0, 0)
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
      const colors = new Set<number>()
      for (let i = 0; i < pixels.length; i += 16)
        colors.add((pixels[i] << 16) | (pixels[i + 1] << 8) | pixels[i + 2])
      canvas.width = canvas.height = 0
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
        colorCount: colors.size,
        leaked: document.querySelectorAll('style').length - before,
      }
    }, locale)
    expect(result.typography).toEqual(Array(3).fill({ measurement: 'embedded', embedded: true }))
    expect(result.svg).toContain('data:font/woff2;base64,')
    expect(result.html).toContain('data-font-measurement="embedded"')
    expect(result.dimensions).toEqual([1200, 630])
    expect(result.colorCount).toBeGreaterThan(20)
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
      sans: new Uint8Array(await (await fetch(base + '/fonts/geist-sans.woff2')).arrayBuffer()),
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

test('abort during delayed font loading releases registrations and never produces an artifact', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const base = location.origin + '/__portable/dist'
    const api = await import(base + '/export/index.js')
    const core = await import(base + '/editor-core/index.js')
    const made = core.createDocument(
      {
        type: 'graph',
        caption: 'Canceled',
        legend: { main: 'Main', branch: 'Branch' },
        nodes: [{ id: 'a', label: 'A', description: '' }],
        edges: [],
      },
      { id: 'cancel-font', locale: 'en' },
    )
    const fonts = {
      sans: new Uint8Array(await (await fetch(base + '/fonts/geist-sans.woff2')).arrayBuffer()),
      mono: new Uint8Array(await (await fetch(base + '/fonts/geist-mono.woff2')).arrayBuffer()),
    }
    const before = document.querySelectorAll('style').length
    const original = document.fonts.load.bind(document.fonts)
    let started = false
    document.fonts.load = (() => {
      started = true
      return new Promise(() => {})
    }) as typeof document.fonts.load
    const controller = new AbortController()
    try {
      const pending = api.exportCardSvg(made.value, {
        fonts,
        fontPolicy: 'required',
        signal: controller.signal,
      })
      await Promise.resolve()
      controller.abort()
      const canceled = await pending
      return {
        started,
        ok: canceled.ok,
        codes: canceled.diagnostics.map((d: { code: string }) => d.code),
        leaked: document.querySelectorAll('style').length - before,
      }
    } finally {
      document.fonts.load = original
    }
  })
  expect(result.started).toBe(true)
  expect(result.ok).toBe(false)
  expect(result.codes).toContain('operation.aborted')
  expect(result.leaked).toBe(0)
})

test('exact-font standalone fallback and hydrated Viewer have identical node geometry offline', async ({
  page,
  browser,
}) => {
  const html = await page.evaluate(async () => {
    const base = location.origin + '/__portable/dist'
    const api = await import(base + '/export/index.js'),
      core = await import(base + '/editor-core/index.js')
    const made = core.createDocument(
      {
        type: 'graph',
        caption: 'Exact offline geometry',
        legend: { main: 'Main', branch: 'Branch' },
        nodes: [
          {
            id: 'long',
            label: 'Confirmación de pago y entrega',
            description: 'Exact embedded Geist measurement',
          },
          { id: 'api', label: 'API', description: '' },
        ],
        edges: [{ id: 'edge', from: 'long', to: 'api', label: 'payment.succeeded' }],
      },
      { id: 'offline-font', locale: 'es' },
    )
    const fonts = {
      sans: new Uint8Array(await (await fetch(base + '/fonts/geist-sans.woff2')).arrayBuffer()),
      mono: new Uint8Array(await (await fetch(base + '/fonts/geist-mono.woff2')).arrayBuffer()),
    }
    const result = await api.exportDocumentHtmlAsync(made.value, {
      fonts,
      fontPolicy: 'required',
      runtime: await (await fetch(base + '/standalone/viewer.js')).text(),
      css: await (await fetch(base + '/viewer.css')).text(),
    })
    if (!result.ok) throw Error(JSON.stringify(result.diagnostics))
    return result.value.html
  })
  const file = resolve(mkdtempSync(resolve(tmpdir(), 'adl-exact-font-')), 'diagram.html')
  writeFileSync(file, html)
  const requests: string[] = []
  page.on('request', (request) => {
    if (/^https?:/.test(request.url())) requests.push(request.url())
  })
  await page.goto(`file://${file}`)
  await expect(page.locator('.adl-viewer')).toBeVisible()
  const runtime = await page
    .locator('.adl-viewer-stage [data-node-surface="true"]')
    .evaluateAll((elements) =>
      elements.map((element) =>
        ['x', 'y', 'width', 'height'].map((key) => Number(element.getAttribute(key))),
      ),
    )
  const context = await browser.newContext({ javaScriptEnabled: false })
  try {
    const staticPage = await context.newPage()
    await staticPage.goto(`file://${file}`)
    await expect(staticPage.locator('#aesthc-fallback')).toBeVisible()
    const fallback = await staticPage
      .locator('.aesthc-static [data-node-surface="true"]')
      .evaluateAll((elements) =>
        elements.map((element) =>
          ['x', 'y', 'width', 'height'].map((key) => Number(element.getAttribute(key))),
        ),
      )
    expect(runtime.length).toBe(2)
    expect(runtime).toEqual(fallback)
    expect(requests).toEqual([])
  } finally {
    await context.close()
  }
})

test('concurrent differing font bytes are isolated from a conflicting host Geist family', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const base = location.origin + '/__portable/dist'
    const api = await import(base + '/export/index.js'),
      core = await import(base + '/editor-core/index.js')
    const made = core.createDocument(
      {
        type: 'graph',
        caption: 'Isolation',
        legend: { main: 'Main', branch: 'Branch' },
        nodes: [{ id: 'a', label: 'Independent typography', description: '' }],
        edges: [],
      },
      { id: 'isolated-fonts', locale: 'en' },
    )
    const sans = new Uint8Array(
        await (await fetch(base + '/fonts/geist-sans.woff2')).arrayBuffer(),
      ),
      mono = new Uint8Array(await (await fetch(base + '/fonts/geist-mono.woff2')).arrayBuffer())
    const base64 = (bytes: Uint8Array) =>
      btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''))
    const host = document.createElement('style')
    host.textContent = `@font-face{font-family:Geist;src:url(data:font/woff2;base64,${base64(mono)})}`
    document.head.append(host)
    const before = document.querySelectorAll('style').length
    try {
      const [normal, reversed] = await Promise.all([
        api.exportCardSvg(made.value, { fonts: { sans, mono }, fontPolicy: 'required' }),
        api.exportCardSvg(made.value, {
          fonts: { sans: mono, mono: sans },
          fontPolicy: 'required',
        }),
      ])
      if (!normal.ok || !reversed.ok) throw Error('font preparation failed')
      return {
        portable: [normal.value.typography, reversed.value.typography],
        sameArtifact: normal.value.svg === reversed.value.svg,
        normalSans: normal.value.svg.includes(
          `font-family:Geist;src:url(data:font/woff2;base64,${base64(sans)})`,
        ),
        reversedSans: reversed.value.svg.includes(
          `font-family:Geist;src:url(data:font/woff2;base64,${base64(mono)})`,
        ),
        leaked: document.querySelectorAll('style').length - before,
      }
    } finally {
      host.remove()
    }
  })
  expect(result.portable).toEqual(Array(2).fill({ measurement: 'embedded', embedded: true }))
  expect(result.sameArtifact).toBe(false)
  expect(result.normalSans).toBe(true)
  expect(result.reversedSans).toBe(true)
  expect(result.leaked).toBe(0)
})
