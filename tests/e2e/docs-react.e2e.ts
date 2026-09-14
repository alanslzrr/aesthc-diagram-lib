import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test('React docs preserve shell, sidebar scroll, history, metadata and focus without document reloads', async ({
  page,
  isMobile,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const documents: string[] = []
  page.on('request', (request) => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame())
      documents.push(request.url())
  })
  await page.goto('/docs/')
  await expect(page.locator('html')).toHaveAttribute('data-enhanced', 'true')
  if (!isMobile)
    await page
      .locator('.sidebar-scroll .scroll-viewport')
      .evaluate((element) => (element.scrollTop = 150))
  await page.evaluate(() => {
    ;(window as unknown as { shell?: Element }).shell = document.querySelector('.sidebar')!
    window.scrollTo(0, 600)
  })
  const before = await page.evaluate(() => window.scrollY)
  // A prose link is also a client-router link.
  await page.locator('.typeset').getByRole('link', { name: 'Getting started', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Getting started')
  await expect(page.locator('#content')).toBeFocused()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  expect(documents).toHaveLength(1)
  expect(
    await page.evaluate(
      () => (window as unknown as { shell: Element }).shell === document.querySelector('.sidebar'),
    ),
  ).toBe(true)
  if (!isMobile)
    expect(
      await page
        .locator('.sidebar-scroll .scroll-viewport')
        .evaluate((element) => element.scrollTop),
    ).toBe(150)
  await expect(page).toHaveTitle('Getting started · @aesthc/diagram-lib')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    /docs\/getting-started\/$/,
  )
  await page.goBack()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Documentation')
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThanOrEqual(before - 100)
  await page.goForward()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Getting started')
  expect(documents).toHaveLength(1)
  await page.goto('/versions/0.3.0/docs/')
  await page.locator('.typeset').getByRole('link', { name: 'Getting started', exact: true }).click()
  await expect(page).toHaveURL(/versions\/0\.3\.0\/docs\/getting-started\/$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Getting started')
  expect(errors).toEqual([])
})

test('system theme follows OS, persists explicit selection and synchronizes tabs', async ({
  page,
  context,
}) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/docs/')
  await expect(page.getByRole('radio', { name: 'System', exact: true })).toBeChecked()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  const sibling = await context.newPage()
  await sibling.goto('/docs/guides/react/')
  await page.getByRole('radio', { name: 'Light', exact: true }).click()
  await expect(sibling.getByRole('radio', { name: 'Light', exact: true })).toBeChecked()
  await expect(sibling.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.reload()
  await expect(page.getByRole('radio', { name: 'Light', exact: true })).toBeChecked()
  await page.goto('/')
  await expect(page.getByRole('radio', { name: 'Light', exact: true })).toBeChecked()
  await page.getByRole('radio', { name: 'System', exact: true }).click()
  await expect(sibling.getByRole('radio', { name: 'System', exact: true })).toBeChecked()
  await sibling.close()
})

test('blocked preference storage still allows theme changes and keyboard selection', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('Storage blocked')
      },
    })
  })
  await page.goto('/docs/')
  const dark = page.getByRole('radio', { name: 'Dark', exact: true })
  await dark.click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await dark.focus()
  await page.keyboard.press('ArrowLeft')
  await expect(page.getByRole('radio', { name: 'Light', exact: true })).toBeFocused()
  await page.keyboard.press('Space')
  await expect(page.getByRole('radio', { name: 'Light', exact: true })).toBeChecked()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})

test('Geist reading rhythm excludes diagrams and fonts survive standalone export', async ({
  page,
}) => {
  await page.goto('/docs/')
  await page.evaluate(() => document.fonts.ready)
  const sizes = await page.locator('.typeset').evaluate((element) => ({
    body: getComputedStyle(element).fontSize,
    font: getComputedStyle(element).fontFamily,
    heading: getComputedStyle(element.querySelector('h1')!).fontFamily,
    line: getComputedStyle(element).lineHeight,
  }))
  expect(sizes.font).toContain('Geist')
  expect(sizes.heading).toContain('Geist')
  expect(['15px', '16px']).toContain(sizes.body)
  expect(
    await page
      .locator('.preview [data-node-label]')
      .first()
      .evaluate((label) => getComputedStyle(label).fontSize),
  ).toBe('14.5px')
  await page.goto('/?only=example-band')
  await page.evaluate(() => document.fonts.ready)
  await page.locator('[data-diagram-panel] summary.export-trigger').click()
  const download = page.waitForEvent('download')
  await page
    .locator('[data-diagram-panel]')
    .getByRole('button', { name: 'Download SVG', exact: true })
    .click()
  const markup = await readFile((await (await download).path())!, 'utf8')
  expect(markup).toContain('font/woff2;base64')
  expect(markup).toContain('Geist')
  expect(markup).not.toContain('Sora')
  expect(markup).not.toContain('Bodoni')
})

test('disclosures remain operable during reversals and code scroll uses a bounded viewport', async ({
  page,
}) => {
  await page.goto('/docs/diagrams/band/')
  const disclosure = page.locator('.complete-example')
  const trigger = disclosure.locator('summary')
  await trigger.click()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  await expect(disclosure.locator('code')).toBeVisible()
  await trigger.click()
  await expect(disclosure).not.toHaveAttribute('open', '')
  await trigger.focus()
  await page.keyboard.press('Enter')
  await expect(disclosure).toHaveAttribute('open', '')
  await page.keyboard.press('Escape')
  await expect(disclosure).not.toHaveAttribute('open', '')
  await expect(trigger).toBeFocused()
  await page.getByRole('tab', { name: 'Code', exact: true }).click()
  const viewport = page.locator('.preview-code .scroll-viewport')
  await viewport.focus()
  await page.keyboard.press('ArrowRight')
  expect(await viewport.evaluate((element) => getComputedStyle(element).overflowX)).toBe('scroll')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('unknown routes, malformed anchors and readable long source never break the docs shell', async ({
  page,
  isMobile,
}) => {
  await page.goto('/docs/guides/react/#%E0%A4')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('React, Vite and Next.js')
  await page.goto('/404.html')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found')
  if (isMobile) await page.locator('.mobile-nav summary').click()
  await page
    .locator(isMobile ? '.mobile-nav' : '.sidebar')
    .getByRole('link', { name: 'Band', exact: true })
    .click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Band diagrams')
  await page.getByRole('tab', { name: 'Code', exact: true }).click()
  const viewport = page.locator('.preview-code .scroll-viewport')
  expect(await viewport.evaluate((element) => getComputedStyle(element).overflowY)).toBe('scroll')
  await viewport.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  expect(
    await viewport.evaluate(
      (element) => element.scrollTop + element.clientHeight >= element.scrollHeight - 1,
    ),
  ).toBe(true)
})

test('animated disclosure can reverse without leaving clipped or focusable closed content', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/docs/diagrams/band/')
  const root = page.locator('.complete-example')
  const trigger = root.locator('summary')
  await trigger.click()
  await trigger.click()
  await trigger.click()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  await expect(root).toHaveAttribute('open', '')
  await expect
    .poll(() =>
      root.locator('[data-disclosure-content]').evaluate((element) => element.style.height),
    )
    .toBe('')
  await trigger.click()
  await expect(root).not.toHaveAttribute('open', '')
  await expect(root.locator('button')).not.toBeVisible()
})

test('reading scroll remains native for wheel and touch gestures', async ({
  page,
  context,
  isMobile,
  browserName,
}) => {
  test.skip(
    isMobile && browserName !== 'chromium',
    'Touch gesture transport in this test uses Chromium CDP',
  )
  await page.goto('/docs/getting-started/')
  await expect(page.locator('html')).toHaveAttribute('data-enhanced', 'true')
  if (isMobile) {
    const client = await context.newCDPSession(page)
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: 250, y: 650 }],
    })
    for (const y of [600, 550, 500, 450, 400])
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: 250, y }],
      })
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await client.detach()
  } else {
    await page.mouse.move(700, 550)
    await page.mouse.wheel(0, 400)
  }
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100)
  const article = await page
    .locator('#content')
    .evaluate((element) => getComputedStyle(element).overflowY)
  expect(article).toBe('visible')
})

test('returning during a pending route aborts the request and clears the busy state', async ({
  page,
}) => {
  await page.goto('/docs/')
  await page.route('**/docs/getting-started/page.json', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500))
    await route.abort()
  })
  await page.locator('.typeset').getByRole('link', { name: 'Getting started', exact: true }).click()
  await expect(page.locator('#content')).toHaveAttribute('aria-busy', 'true')
  await page.goBack()
  await expect(page).toHaveURL(/\/docs\/$/)
  await expect(page.locator('#content')).toHaveAttribute('aria-busy', 'false')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Documentation')
})

test('headers keep one Docs label, compact theme controls and icon-only GitHub with one home license mention', async ({
  page,
  isMobile,
}) => {
  for (const route of ['/', '/docs/', '/docs/getting-started/']) {
    await page.goto(route)
    const header = page.locator('header')
    await expect(header.getByRole('link', { name: 'Docs', exact: true })).toHaveCount(1)
    expect((await header.innerText()).match(/docs/gi) ?? []).toHaveLength(1)
    const github = header.getByRole('link', { name: 'GitHub', exact: true })
    await expect(github).toBeVisible()
    await expect(github.locator('svg')).toHaveCount(1)
    expect((await github.innerText()).trim()).toBe('')
    const theme = header.locator('.theme-selector')
    const bounds = await theme.boundingBox()
    expect(bounds!.width).toBeLessThanOrEqual(isMobile ? 140 : 100)
    expect(bounds!.height).toBeLessThanOrEqual(isMobile ? 52 : 38)
    const mentions = (await page.locator('body').innerText()).match(/\bMIT\b/g) ?? []
    expect(mentions).toHaveLength(route === '/' ? 1 : 0)
    if (route === '/') {
      await expect(page.locator('footer')).toContainText('MIT')
      await expect(
        page.getByRole('region', { name: 'Install package' }).locator('.package-icon'),
      ).toHaveCount(4)
    } else if (route.includes('getting-started')) {
      await expect(page.locator('[data-package-command] .package-icon')).toHaveCount(4)
    }
  }
})

test('installation uses colored brand tabs, an underline, icon-only copy and a separate shell prompt', async ({
  page,
  context,
  browserName,
}) => {
  if (browserName === 'chromium')
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  for (const route of ['/', '/docs/getting-started/']) {
    await page.goto(route)
    const install = page.locator('[data-package-command]').first()
    const tabs = install.locator('.install-manager')
    expect(await tabs.allTextContents()).toEqual(['pnpm', 'yarn', 'npm', 'bun'])
    await expect(install.locator('.package-icon')).toHaveCount(4)
    expect(
      await install.locator('.package-icon').evaluateAll((icons) =>
        icons.every((icon) =>
          [...icon.querySelectorAll('path, use, rect, circle')].some((path) => {
            const rgb = getComputedStyle(path).fill.match(/\d+/g)?.map(Number)
            return rgb && rgb.length >= 3 && (rgb[0] !== rgb[1] || rgb[1] !== rgb[2])
          }),
        ),
      ),
    ).toBe(true)
    await install.getByRole('button', { name: 'pnpm', exact: true }).click()
    const active = install.locator('[data-manager="pnpm"]')
    await expect(active).toHaveAttribute('aria-pressed', 'true')
    await expect
      .poll(() =>
        active.evaluate((button) => {
          const style = getComputedStyle(button, '::after')
          return (
            style.content !== 'none' &&
            style.height === '2px' &&
            style.backgroundColor !== 'rgba(0, 0, 0, 0)'
          )
        }),
      )
      .toBe(true)
    await expect(install.locator('.install-prompt')).toHaveText('$')
    await expect(install.locator('code')).toHaveText('pnpm add @aesthc/diagram-lib@0.3.0')
    const copy = install.locator('.install-copy')
    const toolbarBounds = await install.locator('.install-toolbar').boundingBox()
    const copyBounds = await copy.boundingBox()
    const installBounds = await install.boundingBox()
    expect(toolbarBounds!.width).toBeGreaterThan(installBounds!.width - 4)
    expect(
      toolbarBounds!.x + toolbarBounds!.width - copyBounds!.x - copyBounds!.width,
    ).toBeLessThanOrEqual(13)
    expect((await copy.innerText()).trim()).toBe('')
    if (browserName === 'chromium') {
      await copy.click()
      await expect(copy.getByRole('status')).toContainText('Copied')
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
        'pnpm add @aesthc/diagram-lib@0.3.0',
      )
    }
  }
  await page.goto('/')
  const cloud = page.getByRole('region', { name: 'Cloud architecture example' })
  await expect(cloud.locator('svg.diagram-canvas')).toBeVisible()
  await expect(cloud.getByRole('button', { name: 'Compute: Document worker' })).toBeAttached()
  await cloud.getByRole('radio', { name: 'Order fulfillment', exact: true }).click()
  await expect(cloud.getByRole('button', { name: 'Database: Order ledger' })).toBeAttached()
  const ids = await cloud.locator('svg [id]').evaluateAll((nodes) => nodes.map((node) => node.id))
  expect(new Set(ids).size).toBe(ids.length)
  if (browserName === 'chromium') {
    const sequence = page.locator('[data-diagram-panel="example-sequence"]')
    await sequence.locator('summary.export-trigger').click()
    await sequence.getByRole('button', { name: 'Copy SVG', exact: true }).click()
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toContain('rgb(51, 103, 145)')
    const markup = await page.evaluate(() => navigator.clipboard.readText())
    expect(markup).toContain('Geist')
    expect(markup).not.toContain('<image')
  }
})

test('formal web scale bounds headings, installation icons and headers across viewports', async ({
  page,
  context,
  browserName,
}) => {
  for (const width of [1280, 720, 390]) {
    await page.setViewportSize({ width, height: 900 })
    for (const route of ['/', '/docs/', '/docs/getting-started/']) {
      await page.goto(route)
      await page.evaluate(() => document.fonts.ready)
      const measured = await page.evaluate(() => {
        const heading = document.querySelector('h1')!
        const style = getComputedStyle(heading)
        return {
          root: getComputedStyle(document.documentElement).fontSize,
          heading: parseFloat(style.fontSize),
          weight: parseFloat(style.fontWeight),
          family: style.fontFamily,
          header: document.querySelector('header')!.getBoundingClientRect().height,
          overflow: document.documentElement.scrollWidth > innerWidth,
          icons: [...document.querySelectorAll('.package-icon')].map(
            (icon) => icon.getBoundingClientRect().width,
          ),
          install: document.querySelector('#top .install-snippet')?.getBoundingClientRect(),
        }
      })
      expect(measured.root).toBe('16px')
      expect(measured.family).toContain('Geist')
      expect(measured.weight).toBeGreaterThanOrEqual(500)
      expect(measured.heading).toBeLessThanOrEqual(route === '/' ? 40 : 32)
      expect(measured.header).toBeLessThanOrEqual(80)
      expect(measured.overflow).toBe(false)
      for (const size of measured.icons) expect(size).toBeLessThanOrEqual(16)
      if (route === '/') {
        expect(measured.install!.width).toBeLessThanOrEqual(560)
        expect(measured.install!.height).toBeLessThanOrEqual(104)
      }
      if (browserName === 'chromium') {
        const client = await context.newCDPSession(page)
        await client.send('DOM.enable')
        await client.send('CSS.enable')
        const { root } = await client.send('DOM.getDocument')
        const { nodeId } = await client.send('DOM.querySelector', {
          nodeId: root.nodeId,
          selector: 'h1',
        })
        const { fonts } = await client.send('CSS.getPlatformFontsForNode', { nodeId })
        expect(fonts.every((font) => font.isCustomFont && font.familyName === 'Geist')).toBe(true)
        expect(fonts.length).toBeGreaterThan(0)
        await client.detach()
      }
    }
  }
})

test('ER type and unique annotations do not overlap each other or field names', async ({
  page,
}) => {
  await page.goto('/')
  await page.evaluate(() => document.fonts.ready)
  const er = page.locator('[data-diagram-panel="example-er"]')
  await expect(er.locator('[data-field-annotation="slug"]')).toHaveText('varchar(120) · unique')
  const spacing = await er.locator('[data-field-annotation]').evaluateAll((annotations) =>
    annotations.map((annotation) => {
      const name = annotation.parentElement!.querySelector(
        '[data-field-name]',
      ) as SVGGraphicsElement
      const nameBox = name.getBBox()
      const annotationBox = (annotation as SVGGraphicsElement).getBBox()
      return annotationBox.x - nameBox.x - nameBox.width
    }),
  )
  for (const gap of spacing) expect(gap).toBeGreaterThanOrEqual(8)
})

test('architecture showcase switches concrete service flows, failures and locales without stale selection', async ({
  page,
}) => {
  await page.goto('/')
  const region = page.getByRole('region', { name: /Cloud architecture example|Ejemplo de arquitectura cloud/ })
  const cases = [
    {
      en: 'Document ingestion',
      es: 'Ingesta de documentos',
      label: 'Compute: Document worker',
      failure: 'Rejected objects',
      service: 'Cloud Run',
    },
    {
      en: 'Order fulfillment',
      es: 'Procesamiento de pedidos',
      label: 'Compute: Fulfillment worker',
      failure: 'Dead-letter queue',
      service: 'Container Apps Job',
    },
    {
      en: 'Container delivery',
      es: 'Entrega de contenedores',
      label: 'Runtime: Service revision',
      failure: 'Release blocked',
      service: 'Artifact Registry',
    },
  ]
  for (const theme of ['Light', 'Dark']) {
    await page.getByRole('radio', { name: theme, exact: true }).click()
    for (const item of cases) {
      const tab = region.getByRole('radio', { name: item.en, exact: true })
      await tab.click()
      await expect(tab).toHaveAttribute('aria-checked', 'true')
      const node = region.getByRole('button', { name: item.label, exact: true })
      await expect(node).toBeAttached()
      await expect(region.locator('svg.diagram-canvas')).toContainText(item.failure)
      await expect(region.locator('svg.diagram-canvas')).toContainText(item.service)
      await expect(region.locator('[data-node-id][aria-pressed="true"]')).toHaveCount(0)
      await node.focus()
      await node.press('Enter')
      await expect(node).toHaveAttribute('aria-pressed', 'true')
      const ids = await region
        .locator('svg [id]')
        .evaluateAll((nodes) => nodes.map((node) => node.id))
      expect(new Set(ids).size).toBe(ids.length)
      await expect(region.getByRole('link')).toHaveCount(2)
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      ).toBe(true)
    }
  }
  await page.getByRole('button', { name: 'EN', exact: true }).click()
  for (const item of cases) {
    await region.getByRole('radio', { name: item.es, exact: true }).click()
    await expect(region.locator('svg.diagram-canvas')).toBeVisible()
    await expect(region.locator('svg.diagram-canvas')).not.toContainText('Microsoft Azure')
    await expect(region.locator('.architecture-notes')).toBeVisible()
  }
})
