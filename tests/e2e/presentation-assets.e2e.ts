import { test, expect } from '@playwright/test'
import { cpSync, readFileSync } from 'node:fs'

// Explicit authoring command, never an automatic baseline update in CI.
test('regenerate presentation assets from the public playground', async ({ page }, info) => {
  test.skip(process.env.UPDATE_PRESENTATION_ASSETS !== '1' || info.project.name !== 'chromium')
  await page.goto('/')
  await page.evaluate(() => {
    document.documentElement.dataset.theme = 'dark'
  })
  await page.evaluate(() => document.fonts.ready)
  for (const type of [
    'band',
    'flowchart',
    'sequence',
    'state-machine',
    'er',
    'timeline',
    'swimlane',
  ]) {
    const panel = page.locator(`[data-diagram-panel="example-${type}"]`)
    await panel.locator('summary.export-trigger').click()
    const downloading = page.waitForEvent('download')
    await panel.getByRole('button', { name: 'Download SVG', exact: true }).click()
    const download = await downloading
    await download.saveAs(`docs/diagrams/${type}.svg`)
    const svg = readFileSync(`docs/diagrams/${type}.svg`, 'utf8')
    expect(svg).toContain('Geist')
    expect(svg).not.toMatch(/Sora|Bodoni|var\(--/)
  }
  await page.addStyleTag({ content: 'header.fixed { visibility: hidden }' })
  for (const theme of ['light', 'dark']) {
    await page.evaluate((theme) => {
      document.documentElement.dataset.theme = theme
    }, theme)
    await page
      .locator('[data-diagram-panel="example-band"] svg[role="group"]')
      .screenshot({ path: `site/public/diagram-preview-${theme}.png`, animations: 'disabled' })
  }
  // A real site composition, not a rasterized imitation of another design system.
  await page.setViewportSize({ width: 1200, height: 630 })
  await page.evaluate(() => {
    const hero = document.querySelector('.site-hero')!
    const panel = document.querySelector('[data-diagram-panel="example-band"] svg[role="group"]')!
    const card = document.createElement('main')
    card.id = 'social-card'
    card.innerHTML = `<p>@aesthc/diagram-lib</p><h1>Seven diagram types.<br>One visual language.</h1><p>React · TypeScript · SVG · Open source</p>`
    card.append(panel.cloneNode(true))
    hero.replaceChildren(card)
    document.body.replaceChildren(hero)
  })
  await page.addStyleTag({
    content:
      '.site-hero{padding:0;max-width:none}#social-card{box-sizing:border-box;width:1200px;height:630px;padding:40px 64px;background:#171717;color:#eee;font-family:Geist,sans-serif;overflow:hidden}#social-card p{font-size:18px;color:#b5b5b5;margin:0 0 14px}#social-card h1{font-size:52px;line-height:1.08;font-weight:550;letter-spacing:-1.5px;margin:0 0 20px}#social-card>svg{display:block;width:100%;height:260px;margin-top:12px}',
  })
  await page.locator('#social-card').screenshot({ path: 'docs/og.png', animations: 'disabled' })
  cpSync('docs/og.png', 'site/public/og.png')
})
