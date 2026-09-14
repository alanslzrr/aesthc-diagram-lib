import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const layouts = ['band', 'flowchart', 'sequence', 'state-machine', 'er', 'timeline', 'swimlane']

test('docs navigation, real previews, downloads and heading anchors are complete', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/docs/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Documentation')
  const navigation = page.locator('.sidebar nav')
  await expect(navigation.locator('a')).toHaveCount(17)
  for (const href of await navigation
    .locator('a')
    .evaluateAll((links) => links.map((a) => a.getAttribute('href')!))) {
    const response = await page.request.get(href)
    expect(response.status()).toBe(200)
    expect(await response.text()).toContain('class="docs-header"')
  }
  for (const type of layouts) {
    await page.goto(`/docs/diagrams/${type}/`)
    await expect(page.locator('.preview svg.diagram-canvas')).toBeVisible()
    await expect(page.locator('.preview [role="button"]')).toHaveCount(0)
    await expect(page.locator('.sidebar [aria-current="page"]')).toHaveCount(1)
    await page.locator('.complete-example summary').click()
    await expect(page.locator('.complete-example code')).toContainText('DiagramCanvas')
    await expect(page.locator('.hljs-keyword').first()).toBeAttached()
    const accessibility = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    expect(
      accessibility.violations.filter(
        (issue) => issue.impact === 'serious' || issue.impact === 'critical',
      ),
    ).toEqual([])
    for (const extension of ['tsx', 'json'])
      expect((await page.request.get(`/examples/${type}.${extension}`)).status()).toBe(200)
    for (const href of await page
      .locator('.toc a[href^="#"]')
      .evaluateAll((links) => links.map((a) => a.getAttribute('href')!)))
      await expect(page.locator(`[id="${href.slice(1)}"]`)).toHaveCount(1)
  }
  expect(errors).toEqual([])
})

test('documentation previews open the relevant playground section', async ({ page }) => {
  await page.goto('/docs/diagrams/sequence/')
  await page.locator('.preview').getByRole('link', { name: 'Open playground ↗' }).click()
  await expect(
    page.locator('[data-diagram-panel="example-sequence"] svg[role="group"]'),
  ).toBeVisible()
  await expect
    .poll(() =>
      page.locator('#main').evaluate((main) => Math.abs(main.getBoundingClientRect().top)),
    )
    .toBeLessThan(120)
})

test('search supports keyboard navigation, empty results and versioned pages', async ({ page }) => {
  await page.goto('/docs/')
  await page.locator('[data-open-search]').click()
  const search = page.getByRole('searchbox')
  await search.fill('zzzz-no-results')
  await expect(page.locator('.search-status')).toHaveText('0 results')
  await search.fill('sequence')
  await expect(page.locator('.search-results a').first()).toContainText('Sequence')
  await page.keyboard.press('ArrowDown')
  await expect(page.locator('.search-results a').first()).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).not.toHaveURL(/\/docs\/$/)
  await page.goto('/versions/0.3.0/docs/')
  await page.keyboard.press('Control+k')
  await page.getByRole('searchbox').fill('sequence')
  await expect(page.locator('.search-results a').first()).toHaveAttribute(
    'href',
    /\/versions\/0\.3\.0\//,
  )
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
})

test('package manager preference is shared with playground and survives invalid storage', async ({
  page,
}) => {
  await page.goto('/docs/getting-started/')
  const install = page.locator('[data-package-command]').first()
  await install.getByRole('button', { name: 'pnpm', exact: true }).click()
  await expect(install.locator('code')).toHaveText('pnpm add @aesthc/diagram-lib@0.3.0')
  await page.reload()
  await expect(install.getByRole('button', { name: 'pnpm', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.goto('/')
  const radii = await page
    .locator('header button:not(.theme-option), header a[href^="https://github"]')
    .evaluateAll((controls) =>
      controls.map((control) => parseFloat(getComputedStyle(control).borderTopLeftRadius)),
    )
  for (const radius of radii) expect(radius).toBeGreaterThanOrEqual(4)
  for (const radius of radii) expect(radius).toBeLessThanOrEqual(8)
  const hero = page.getByRole('region', { name: 'Install package', exact: true })
  await expect(hero.locator('code')).toHaveText('pnpm add @aesthc/diagram-lib@0.3.0')
  await hero.getByRole('button', { name: 'bun', exact: true }).click()
  await page.goto('/docs/getting-started/')
  await expect(install.locator('code')).toHaveText('bun add @aesthc/diagram-lib@0.3.0')
  await page.evaluate(() => localStorage.setItem('adl-package-manager', 'invalid'))
  await page.reload()
  await expect(install.getByRole('button', { name: 'npm', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

test('copy uses the selected command and provides real clipboard feedback', async ({
  page,
  context,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Real clipboard permissions are Chromium-specific')
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/docs/getting-started/')
  const install = page.locator('[data-package-command]').first()
  await install.getByRole('button', { name: 'yarn', exact: true }).click()
  await install.locator('[data-copy-code]').click()
  await expect(install.locator('[data-copy-code]')).toContainText('Copied')
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    'yarn add @aesthc/diagram-lib@0.3.0',
  )
  await page.goto('/agents/')
  await page.locator('[data-copy-agent]').click()
  await expect(page.locator('[data-copy-agent]')).toContainText('Copied')
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    'Read https://alanslzrr.github.io/aesthc-diagram-lib/agents/',
  )
})

for (const theme of ['light', 'dark']) {
  test(`${theme} docs have restrained Geist controls, accessible contrast and no page overflow`, async ({
    page,
    isMobile,
  }) => {
    await page.addInitScript((theme) => localStorage.setItem('adl-theme', theme), theme)
    await page.goto('/docs/getting-started/')
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
    await page.addStyleTag({
      content: '* { transition: none !important; animation: none !important; }',
    })
    const controls = await page
      .locator('button:not([role="tab"]):not(.theme-option)')
      .evaluateAll((buttons) =>
        buttons
          .filter((button) => button.getClientRects().length)
          .map((button) => {
            const style = getComputedStyle(button)
            return { radius: parseFloat(style.borderTopLeftRadius), font: style.fontFamily }
          }),
      )
    expect(controls.length).toBeGreaterThan(3)
    for (const control of controls) {
      expect(control.radius).toBeGreaterThanOrEqual(4)
      expect(control.radius).toBeLessThanOrEqual(8)
      expect(control.font).toContain('Geist')
    }
    if (isMobile) {
      await page.locator('.mobile-nav summary').click()
      await expect(
        page
          .getByRole('navigation', { name: 'Mobile documentation' })
          .getByRole('link', { name: 'Theming', exact: true }),
      ).toBeVisible()
      await page.locator('.mobile-nav summary').click()
      expect(
        await page
          .locator('.preview svg.diagram-canvas')
          .evaluate((svg) => svg.getBoundingClientRect().width <= svg.parentElement!.clientWidth),
      ).toBe(true)
    } else await expect(page.getByRole('navigation', { name: 'On this page' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({
      path: `/tmp/aesthc-docs-${theme}-${isMobile ? 'mobile' : 'desktop'}.png`,
    })
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    expect(
      result.violations.filter(
        (issue) => issue.impact === 'serious' || issue.impact === 'critical',
      ),
    ).toEqual([])
  })
}

test('mobile disclosure uses a rounded chevron, keyboard states and works without JavaScript', async ({
  page,
  browser,
  isMobile,
}) => {
  test.skip(!isMobile, 'Mobile documentation disclosure is hidden on desktop')
  await page.goto('/docs/guides/react/')
  const disclosure = page.locator('.mobile-nav')
  const trigger = disclosure.locator('summary')
  const icon = trigger.locator('.disclosure-icon')
  await expect(trigger).toContainText('Browse docs')
  await expect(trigger.locator('.current-doc')).toHaveText('React & Next.js')
  await expect(icon).toHaveAttribute('stroke-linecap', 'round')
  await expect(icon).toHaveAttribute('aria-hidden', 'true')
  expect(await trigger.evaluate((summary) => getComputedStyle(summary).listStyleType)).toBe('none')
  expect((await trigger.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  await trigger.focus()
  await page.keyboard.press('Enter')
  await expect(disclosure).toHaveAttribute('open', '')
  await expect
    .poll(() => icon.evaluate((svg) => getComputedStyle(svg).transform))
    .toBe('matrix(-1, 0, 0, -1, 0, 0)')
  await page.screenshot({ path: '/tmp/aesthc-docs-mobile-chevron-open.png' })
  await page.keyboard.press('Escape')
  await expect(disclosure).not.toHaveAttribute('open', '')
  await expect(trigger).toBeFocused()
  await expect.poll(() => icon.evaluate((svg) => getComputedStyle(svg).transform)).toBe('none')
  await page.screenshot({ path: '/tmp/aesthc-docs-mobile-chevron-closed.png' })
  await page.keyboard.press('Space')
  await expect(disclosure).toHaveAttribute('open', '')
  await disclosure.getByRole('link', { name: 'Theming', exact: true }).click()
  await expect(page).toHaveURL(/\/docs\/guides\/theming\/$/)
  await expect(disclosure).not.toHaveAttribute('open', '')
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  })
  const staticPage = await context.newPage()
  await staticPage.goto('http://127.0.0.1:4173/docs/guides/react/')
  await staticPage.locator('.mobile-nav summary').click()
  await expect(staticPage.locator('.mobile-nav')).toHaveAttribute('open', '')
  await expect(staticPage.locator('.mobile-nav .disclosure-icon')).toBeVisible()
  await staticPage
    .locator('.mobile-nav')
    .getByRole('link', { name: 'Theming', exact: true })
    .click()
  await expect(staticPage.getByRole('heading', { level: 1 })).toHaveText('Styles and theming')
  await context.close()
})

for (const theme of ['light', 'dark']) {
  test(`${theme} layout previews preserve geometry, center plain labels and mask the grid under nodes`, async ({
    page,
    isMobile,
    browserName,
  }) => {
    await page.addInitScript((theme) => localStorage.setItem('adl-theme', theme), theme)
    for (const type of layouts) {
      await page.goto(`/docs/diagrams/${type}/`)
      await page.evaluate(() => document.fonts.ready)
      const pane = page.locator('[data-preview-panel="canvas"]')
      const svg = pane.locator('svg')
      const geometry = await svg.evaluate((svg) => {
        const box = svg.getBoundingClientRect()
        const view = (svg as SVGSVGElement).viewBox.baseVal
        return {
          ratio: box.width / box.height,
          expected: view.width / view.height,
          labelFont: Array.from(svg.querySelectorAll('[data-node-label]')).map(
            (label) => (parseFloat(getComputedStyle(label).fontSize) * box.width) / view.width,
          ),
          grid: getComputedStyle(svg.querySelector('rect[mask]')!).opacity,
          innerGrid: getComputedStyle(svg.querySelector('rect[mask]')!).display,
          outerGrid: getComputedStyle(svg.parentElement!).backgroundImage,
          surfaces: Array.from(svg.querySelectorAll('[data-node-surface]')).map((surface) => ({
            fill: getComputedStyle(surface).fill,
            opacity: getComputedStyle(surface).opacity,
          })),
          labels: Array.from(svg.querySelectorAll('[data-node-label]'))
            .filter((label) => label.getAttribute('text-anchor') === 'middle')
            .map((label) => {
              const surface = label.parentElement!.querySelector('[data-node-surface]')!
              return {
                x: Number(label.getAttribute('x')),
                cx: Number(surface.getAttribute('x')) + Number(surface.getAttribute('width')) / 2,
                y: Number(label.getAttribute('y')),
                cy: Number(surface.getAttribute('y')) + Number(surface.getAttribute('height')) / 2,
                baseline: label.getAttribute('dominant-baseline'),
              }
            }),
        }
      })
      expect(geometry.ratio).toBeCloseTo(geometry.expected, 2)
      for (const size of geometry.labelFont) expect(size).toBeGreaterThanOrEqual(11)
      expect(geometry.grid).toBe(theme === 'light' ? '0.18' : '0.12')
      expect(geometry.innerGrid).toBe('none')
      expect(geometry.outerGrid).toContain('radial-gradient')
      for (const surface of geometry.surfaces) {
        expect(surface.opacity).toBe('1')
        expect(surface.fill).not.toBe('none')
        expect(surface.fill).not.toBe('transparent')
        const alpha = surface.fill.startsWith('rgba(')
          ? Number(surface.fill.split(',').at(-1)!.replace(')', ''))
          : Number(/\/\s*([\d.]+)/.exec(surface.fill)?.[1] ?? 1)
        expect(alpha).toBe(1)
      }
      for (const label of geometry.labels) {
        expect(label.x).toBe(label.cx)
        expect(label.y).toBe(label.cy)
        expect(label.baseline).toBe('central')
      }
      await pane.screenshot({ path: `/tmp/aesthc-preview-${type}-${theme}.png` })
      if (process.env.VISUAL_REGRESSION && !isMobile && browserName === 'chromium')
        await expect.soft(pane).toHaveScreenshot(`docs-${type}-${theme}.png`)
      const code = page.locator('.preview').getByRole('tab', { name: 'Code', exact: true })
      await code.click()
      await expect(pane).not.toBeVisible()
      await expect(page.locator('[data-preview-panel="code"]')).toBeVisible()
      await expect(page.locator('[data-preview-panel="code"] code')).toContainText('DiagramCanvas')
      await code.press('Home')
      await expect(
        page.locator('.preview').getByRole('tab', { name: 'Preview', exact: true }),
      ).toBeFocused()
      await expect(pane).toBeVisible()
    }
    await page.goto('/agents/')
    const callout = page.locator('blockquote')
    const edges = await callout.evaluate((element) => {
      const style = getComputedStyle(element)
      return [
        style.borderLeftWidth,
        style.borderRightWidth,
        style.borderLeftColor,
        style.borderRightColor,
      ]
    })
    expect(edges[0]).toBe(edges[1])
    expect(edges[2]).toBe(edges[3])
    await expect(page.locator('.version-label')).toHaveCSS('border-radius', '0px')
    await expect(page.locator('.pagination a').first()).toHaveCSS('border-width', '0px')
  })
}
