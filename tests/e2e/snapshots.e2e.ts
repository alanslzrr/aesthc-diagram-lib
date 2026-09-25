import { test, expect } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { createServer } from 'node:http'
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, extname } from 'node:path'

test('frozen A remains complete after rebuilding and serving only B', async ({ browser }, info) => {
  test.skip(
    info.project.name !== 'chromium',
    'One Chromium fixture verifies JS and no-JS; other suites cover browser compatibility',
  )
  test.setTimeout(180_000)
  const root = resolve('.')
  const directory = mkdtempSync(join(tmpdir(), 'adl-two-versions-'))
  const version = JSON.parse(readFileSync('package.json', 'utf8')).version
  const snapshot = JSON.parse(readFileSync(`site/dist/versions/${version}/snapshot.json`, 'utf8'))
  const base = '/fixture/'
  expect(snapshot.base).toBeTruthy()
  let server: ReturnType<typeof createServer> | undefined
  try {
    for (const path of [
      ...readdirSync(root).filter((file) => file.endsWith('.md')),
      'schemas',
      'licenses',
      'scripts',
      'src',
      'dist',
      'docs',
      'examples',
      'site/src',
      'site/docs',
      'site/public',
      'site/package.json',
      'site/tsconfig.json',
      'site/vite.config.ts',
      'site/index.html',
      'site/docs.html',
      'site/studio.html',
      'package.json',
      'tsconfig.json',
      'pnpm-workspace.yaml',
    ])
      cpSync(join(root, path), join(directory, path), { recursive: true })
    symlinkSync(join(root, 'node_modules'), join(directory, 'node_modules'), 'dir')
    symlinkSync(join(root, 'site/node_modules'), join(directory, 'site/node_modules'), 'dir')
    cpSync(`site/dist/versions/${version}`, join(directory, `site/public/versions/${version}`), {
      recursive: true,
    })
    const original = readFileSync(`site/dist/versions/${version}/examples/flowchart.json`, 'utf8')
    const originalScripts = [
      ...readFileSync(
        `site/dist/versions/${version}/docs/diagrams/flowchart/index.html`,
        'utf8',
      ).matchAll(/src="([^"]+\.js)"/g),
    ].map((match) => match[1])
    const manifest = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'))
    manifest.version = '99.0.0'
    writeFileSync(join(directory, 'package.json'), JSON.stringify(manifest))
    const changed = JSON.parse(original)
    changed.caption = 'B-only fixture caption'
    writeFileSync(join(directory, 'examples/flowchart.json'), JSON.stringify(changed))
    writeFileSync(
      join(directory, 'examples/flowchart.tsx'),
      'export const changed = "B-only fixture code"\n',
    )
    const client = join(directory, 'site/src/docs/client.tsx')
    writeFileSync(
      client,
      readFileSync(client, 'utf8') + '\ndocument.documentElement.dataset.snapshotFixture = "B"\n',
    )
    const env = { ...process.env, SITE_BASE: base }
    execFileSync('pnpm', ['--dir', 'site', 'build'], {
      cwd: directory,
      env,
      stdio: 'pipe',
      timeout: 90_000,
    })
    execFileSync(join(root, 'node_modules/.bin/tsx'), ['scripts/render-doc-previews.tsx'], {
      cwd: directory,
      env,
      stdio: 'pipe',
      timeout: 30_000,
    })
    execFileSync(
      join(root, 'node_modules/.bin/tsx'),
      ['--tsconfig', 'site/tsconfig.json', 'scripts/build-docs.mjs'],
      { cwd: directory, env, stdio: 'pipe', timeout: 45_000 },
    )
    const out = join(directory, 'site/dist')
    expect(readFileSync(join(out, `versions/${version}/examples/flowchart.json`), 'utf8')).toBe(
      original,
    )
    expect(readFileSync(join(out, 'examples/flowchart.json'), 'utf8')).not.toBe(original)
    const currentHtml = readFileSync(join(out, 'docs/diagrams/flowchart/index.html'), 'utf8')
    expect(originalScripts.some((script) => currentHtml.includes(script))).toBe(false)
    for (const script of originalScripts.filter((script) => script.includes('/assets/')))
      expect(existsSync(join(out, 'assets', script.split('/').at(-1)!))).toBe(false)
    server = createServer((request, response) => {
      const url = new URL(request.url!, 'http://localhost')
      if (!url.pathname.startsWith(base)) {
        response.writeHead(404).end()
        return
      }
      const path = resolve(out, '.' + '/' + decodeURIComponent(url.pathname.slice(base.length)))
      const file = extname(path) ? path : join(path, 'index.html')
      if (!file.startsWith(out + '/') || !existsSync(file)) {
        response.writeHead(404).end()
        return
      }
      const mime = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.woff2': 'font/woff2',
        '.svg': 'image/svg+xml',
      } as Record<string, string>
      response.setHeader('Content-Type', mime[extname(file)] ?? 'application/octet-stream')
      response.end(readFileSync(file))
    })
    await new Promise<void>((done) => server!.listen(0, '127.0.0.1', done))
    const port = (server.address() as import('node:net').AddressInfo).port
    const origin = `http://127.0.0.1:${port}`
    for (const javaScriptEnabled of [true, false]) {
      const context = await browser.newContext({ javaScriptEnabled })
      const page = await context.newPage()
      const failures: string[] = []
      page.on('pageerror', (error) => failures.push(error.message))
      page.on('response', (response) => {
        if (response.status() >= 400) failures.push(response.url())
      })
      await page.goto(`${origin}${base}versions/${version}/docs/diagrams/flowchart/`)
      await expect(page.locator('.preview svg.diagram-canvas')).toBeVisible()
      await page.evaluate(() => document.fonts.ready)
      expect(await page.evaluate(() => document.fonts.check('16px Geist'))).toBe(true)
      const download = page.getByRole('link', { name: 'JSON spec' })
      const downloadUrl = new URL((await download.getAttribute('href'))!, page.url())
      expect(downloadUrl.pathname).toBe(`${base}versions/${version}/examples/flowchart.json`)
      expect(await (await page.request.get(downloadUrl.href)).text()).toBe(original)
      expect(
        (
          await page.request.get(
            `${origin}${base}versions/${version}/schemas/${version}/DiagramSpec.schema.json`,
          )
        ).status(),
      ).toBe(200)
      if (javaScriptEnabled) {
        await page.locator('[data-open-search]').click()
        await page.locator('#docs-search').fill('BrandIcon')
        await expect(page.locator('.search-results a').first()).toHaveAttribute(
          'href',
          new RegExp(`versions/${version.replaceAll('.', '\\.')}/`),
        )
        await page.locator('[data-close-search]').click()
        await page
          .locator('.sidebar')
          .getByRole('link', { name: 'API reference', exact: true })
          .click()
        await expect(page.getByRole('main')).toContainText('BrandIcon')
      }
      expect(failures).toEqual([])
      await context.close()
    }
  } finally {
    if (server) await new Promise<void>((done) => server!.close(() => done()))
    rmSync(directory, { recursive: true, force: true })
  }
})
