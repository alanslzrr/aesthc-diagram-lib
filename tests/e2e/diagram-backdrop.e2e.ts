import { test, expect, type Page } from '@playwright/test'

// BG-01..BG-06: one masked decorative dot layer per surface, opaque nodes,
// and semantic strokes that stay readable above the dots at final size.

const TYPES = ['band', 'flowchart', 'sequence', 'state-machine', 'er', 'timeline', 'swimlane']

const EDITOR_STRUCTURE: Record<string, string[]> = {
  'example-band': ['[data-node-surface="true"]', '[data-decision-id] rect'],
  'example-flowchart': ['[data-node-surface="true"]'],
  'example-sequence': ['[data-lifeline-id] path', '[data-node-surface="true"]'],
  'example-state-machine': ['[data-structure="state-outline"]', '[data-node-surface="true"]'],
  'example-er': ['[data-structure="er-separator"]', '[data-node-surface="true"]'],
  'example-timeline': ['[data-node-id] text'],
  'example-swimlane': ['[data-container-id] rect', '[data-node-surface="true"]'],
}

async function setTheme(page: Page, theme: 'light' | 'dark') {
  await page.evaluate((value) => {
    document.documentElement.dataset.theme = value
  }, theme)
  // Wait until the host tokens actually resolve; a transition or a late
  // preference effect must not be measured mid-flight.
  await expect
    .poll(() =>
      page.evaluate(() => {
        const probe = document.createElement('div')
        probe.style.background = 'var(--background)'
        document.body.append(probe)
        const background = getComputedStyle(probe).backgroundColor
        probe.remove()
        return background
      }),
    )
    .toBe(theme === 'dark' ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)')
}

/**
 * Effective contrast of each painted stroke/fill against its adjacent surface.
 * Composes per-element and ancestor opacity (an explicit 0 stays 0), uses SVG
 * fills behind the paint when present, and reports the minimum across every
 * matched element instead of a single maximum.
 */
async function strokeContrast(page: Page, root: string, selectors: string[]) {
  return page.evaluate(
    ({ root, selectors }) => {
      // Canvas normalises any computed color (rgb, color(srgb), oklab…) to
      // premultiplied sRGB channels.
      const context = document.createElement('canvas').getContext('2d')!
      context.canvas.width = 1
      context.canvas.height = 1
      const toRgb = (value: string) => {
        if (!value || value === 'none') return { r: 0, g: 0, b: 0, a: 0 }
        context.clearRect(0, 0, 1, 1)
        context.fillStyle = '#000000'
        context.fillStyle = value
        context.fillRect(0, 0, 1, 1)
        const data = context.getImageData(0, 0, 1, 1).data
        return { r: data[0], g: data[1], b: data[2], a: data[3] / 255 }
      }
      const number = (value: string) => {
        const parsed = Number.parseFloat(value)
        return Number.isFinite(parsed) ? parsed : 1
      }
      const over = (
        fg: { r: number; g: number; b: number; a: number },
        bg: { r: number; g: number; b: number },
      ) => ({
        r: fg.r * fg.a + bg.r * (1 - fg.a),
        g: fg.g * fg.a + bg.g * (1 - fg.a),
        b: fg.b * fg.a + bg.b * (1 - fg.a),
      })
      const luminance = ({ r, g, b }: { r: number; g: number; b: number }) => {
        const [rl, gl, bl] = [r, g, b].map((value) => {
          const channel = value / 255
          return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
        })
        return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl
      }
      const ratio = (
        a: { r: number; g: number; b: number },
        b: { r: number; g: number; b: number },
      ) => {
        const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x)
        return (high + 0.05) / (low + 0.05)
      }
      const ancestorOpacity = (element: Element) => {
        let opacity = 1
        let node: Element | null = element.parentElement
        while (node && node !== document.documentElement) {
          opacity *= number(getComputedStyle(node).opacity)
          node = node.parentElement
        }
        return opacity
      }
      const probe = document.createElement('div')
      probe.style.background = 'var(--background, #ffffff)'
      document.body.append(probe)
      const pageBackground = toRgb(getComputedStyle(probe).backgroundColor)
      probe.remove()
      const outerBackground = (element: Element) => {
        let node: Element | null = element.parentElement
        while (node) {
          const parsed = toRgb(getComputedStyle(node).backgroundColor)
          if (parsed.a >= 0.99) return parsed
          node = node.parentElement
        }
        return pageBackground
      }
      // The paint sits on an SVG fill when one is behind it (node card, table,
      // lane); only otherwise fall back to the HTML panel background. A filled
      // text is itself the paint, so its own fill is never the surface.
      const adjacentSurfaceElement = (element: Element, isFill: boolean) => {
        const style = getComputedStyle(element)
        const own = toRgb(style.fill)
        if (!isFill && style.fill !== 'none' && own.a >= 0.99) return element
        return (
          element.closest('[data-node-id]')?.querySelector('[data-node-surface="true"]') ??
          element.closest('[data-container-id]')?.querySelector('rect') ??
          null
        )
      }
      /** Surface colour composed with its own fill opacity over the page. */
      const localSurface = (element: Element, isFill: boolean) => {
        const background = outerBackground(element)
        const surfaceElement = adjacentSurfaceElement(element, isFill)
        if (!surfaceElement) return background
        const style = getComputedStyle(surfaceElement)
        const fill = toRgb(style.fill)
        // The measured element's own opacity is already part of `groupAlpha`;
        // only a sibling surface contributes its own opacity here.
        const alpha =
          fill.a *
          number(style.fillOpacity) *
          (surfaceElement === element ? 1 : number(style.opacity))
        return over({ ...fill, a: alpha }, background)
      }
      const container = document.querySelector(root)
      if (!container) throw new Error(`missing root ${root}`)
      return selectors.map((selector) => {
        const elements = [...container.querySelectorAll(selector)]
        let minimum = Number.POSITIVE_INFINITY
        let minimumOpacity = Number.POSITIVE_INFINITY
        let transparentFill = false
        let ink: { r: number; g: number; b: number } = { r: 0, g: 0, b: 0 }
        let surface: { r: number; g: number; b: number } = { r: 0, g: 0, b: 0 }
        for (const element of elements) {
          const style = getComputedStyle(element)
          const isFill = style.stroke === 'none'
          const paint = toRgb(isFill ? style.fill : style.stroke)
          const paintOpacity = number(isFill ? style.fillOpacity : style.strokeOpacity)
          // The browser composes paint (colour alpha × paint opacity) over
          // its card first, then the whole group over the outer background.
          const inkAlpha = paintOpacity * paint.a
          const groupAlpha = number(style.opacity) * ancestorOpacity(element)
          const card = localSurface(element, isFill)
          const localInk = over({ ...paint, a: inkAlpha }, card)
          const background = outerBackground(element)
          ink = over({ ...localInk, a: groupAlpha }, background)
          surface = over({ ...card, a: groupAlpha }, background)
          minimumOpacity = Math.min(minimumOpacity, inkAlpha * groupAlpha)
          minimum = Math.min(minimum, ratio(ink, surface))
          const fill = toRgb(style.fill)
          if (style.fill !== 'none' && fill.a < 0.99) transparentFill = true
        }
        const first = elements[0]
        const firstStyle = first ? getComputedStyle(first) : null
        return {
          selector,
          count: elements.length,
          minimum,
          minimumOpacity,
          transparentFill,
          ink: [Math.round(ink.r), Math.round(ink.g), Math.round(ink.b)],
          surface: [Math.round(surface.r), Math.round(surface.g), Math.round(surface.b)],
          detail: firstStyle
            ? `${firstStyle.stroke} / ${firstStyle.fill} / ${firstStyle.opacity} / ${firstStyle.strokeOpacity}`
            : 'none',
        }
      })
    },
    { root, selectors },
  )
}

test('gallery cards use one masked backdrop and never mask the diagram', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.layout-gallery-card').first()).toBeVisible()
  for (const type of TYPES) {
    // BG-05: every main label must be readable at the rendered card size.
    for (const width of [390, 768, 1280, 1718]) {
      await page.setViewportSize({ width, height: 1000 })
      const measured = await page
        .locator(`[data-diagram-panel="example-${type}"] .layout-gallery-stage`)
        .evaluate((element) => {
          const svg = element.querySelector('svg')!
          // `width / viewBox.width` ignores `preserveAspectRatio="meet"` when
          // the height is the limiting factor; getScreenCTM is the render scale.
          const widthScale = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width
          const labels = [...element.querySelectorAll<SVGGraphicsElement>('[data-node-label]')]
          const scales = labels.map((label) => {
            const matrix = label.getScreenCTM()!
            return Math.hypot(matrix.a, matrix.b)
          })
          return {
            count: labels.length,
            sizes: labels.map((label, index) => {
              return Number.parseFloat(getComputedStyle(label).fontSize) * scales[index]
            }),
            widthScale,
            renderScale: Math.max(...scales),
            svgWidth: svg.getBoundingClientRect().width,
            viewBox: svg.getAttribute('viewBox'),
            stageWidth: element.getBoundingClientRect().width,
            padding: getComputedStyle(element).paddingLeft,
            mediaMatch: window.matchMedia('(max-width: 640px)').matches,
            matches: (() => {
              const results: string[] = []
              for (const sheet of [...document.styleSheets]) {
                try {
                  for (const rule of [...sheet.cssRules]) {
                    const selector = (rule as CSSStyleRule).selectorText
                    if (selector?.includes('layout-gallery-stage') && element.matches(selector))
                      results.push(`${selector} => ${(rule as CSSStyleRule).style.padding}`)
                  }
                } catch {
                  /* cross-origin sheet */
                }
              }
              return results
            })(),
            hasPadRule: [...document.styleSheets].some((sheet) => {
              try {
                return [...sheet.cssRules].some(
                  (rule) =>
                    rule.cssText.includes('example-swimlane') && rule.cssText.includes('4px'),
                )
              } catch {
                return false
              }
            }),
            innerWidth: window.innerWidth,
          }
        })
      expect(measured.count, `${type} must render main labels at ${width}px`).toBeGreaterThan(0)
      expect(
        Math.min(...measured.sizes),
        `${type} smallest main label at ${width}px (${measured.sizes.join(', ')}) ${JSON.stringify({ svg: measured.svgWidth, view: measured.viewBox, stage: measured.stageWidth, padding: measured.padding, mediaMatch: measured.mediaMatch, matches: measured.matches })}`,
      ).toBeGreaterThanOrEqual(10)
      // The instrument must never overestimate: the render scale of a `meet`
      // SVG is the smaller of the two axes, and the width formula can only be
      // equal or larger.
      expect(measured.renderScale).toBeLessThanOrEqual(measured.widthScale + 1e-6)
      if (type === 'swimlane' && width === 390) {
        // At phone width the swimlane bounds are wider than the stage, so the
        // container width limits the render scale and both formulas agree.
        expect(measured.renderScale).toBeCloseTo(measured.widthScale, 2)
      }
    }
    await page.setViewportSize({ width: 1280, height: 1000 })
    const card = page.locator(`[data-diagram-panel="example-${type}"]`)
    await expect(card).toHaveCount(1)
    // BG-01: the SVG document grid is off; exactly one CSS dot layer remains.
    await expect(card.locator('[data-diagram-grid]')).toHaveCount(0)
    const stage = card.locator('.layout-gallery-stage')
    const backdrop = await stage.evaluate((element) => {
      const own = getComputedStyle(element)
      const before = getComputedStyle(element, '::before')
      return {
        ownBackground: own.backgroundImage,
        mask: before.maskImage || before.webkitMaskImage,
        background: before.backgroundImage,
        inset: before.inset,
        position: before.position,
      }
    })
    // BG-02/03: the mask lives on the decorative layer, which covers the stage.
    expect(backdrop.ownBackground, `${type} stage must not paint a second pattern`).toBe('none')
    expect(backdrop.mask, `${type} backdrop must be masked`).not.toBe('none')
    expect(backdrop.mask).toContain('radial-gradient')
    expect(backdrop.background).toContain('radial-gradient')
    expect(backdrop.position).toBe('absolute')
    expect(backdrop.inset).toBe('0px')
    // BG-05: thumbnails keep authored stroke width at their reduced scale.
    const thumbnail = await stage
      .locator('[data-node-id]')
      .first()
      .evaluate((element) => getComputedStyle(element).vectorEffect)
    expect(thumbnail, `${type} thumbnail strokes must not scale down`).toBe('non-scaling-stroke')
    // BG-02: no ancestor of the diagram carries a mask.
    const maskedAncestors = await card.evaluate((element) => {
      const masked: string[] = []
      let node: Element | null = element.querySelector('svg')
      while (node && node !== element.parentElement) {
        const style = getComputedStyle(node)
        if ((style.maskImage || style.webkitMaskImage) !== 'none')
          masked.push(node.className.toString())
        node = node.parentElement
      }
      return masked
    })
    expect(maskedAncestors, `${type} diagram must not be masked`).toEqual([])
  }
})

test('the scale instrument detects height-limited framing', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('[data-diagram-panel="example-state-machine"]')).toBeVisible()
  await page.setViewportSize({ width: 1280, height: 1000 })
  const measure = () =>
    page
      .locator('[data-diagram-panel="example-state-machine"] .layout-gallery-stage')
      .evaluate((element) => {
        const svg = element.querySelector('svg')!
        const widthScale = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width
        const label = element.querySelector<SVGGraphicsElement>('[data-node-label]')!
        const matrix = label.getScreenCTM()!
        return { widthScale, renderScale: Math.hypot(matrix.a, matrix.b) }
      })
  // Natural framing fits both axes.
  await expect.poll(measure).toMatchObject({ renderScale: 1 })
  // Constrain the height: only getScreenCTM reveals the real scale.
  await page.addStyleTag({
    content:
      "[data-diagram-panel='example-state-machine'] .layout-gallery-stage { height: 140px; }",
  })
  await expect
    .poll(async () => {
      const { widthScale, renderScale } = await measure()
      return renderScale < widthScale - 1e-3
    })
    .toBe(true)
})

test('cropped landing showcases hint the crop without masking the SVG', async ({ page }) => {
  await page.goto('/?only=example-sequence')
  const clip = page.locator('.diagram-showcase-clip')
  await expect(clip).toBeVisible()
  const crop = await clip.evaluate((element) => {
    const own = getComputedStyle(element)
    const after = getComputedStyle(element, '::after')
    return {
      mask: own.maskImage || own.webkitMaskImage,
      cropped: element.hasAttribute('data-cropped'),
      overlay: after.backgroundImage,
      overlayPointer: after.pointerEvents,
    }
  })
  expect(crop.cropped).toBe(true)
  expect(crop.mask, 'the SVG must not be masked').toBe('none')
  expect(crop.overlay).toContain('gradient')
  expect(crop.overlayPointer).toBe('none')
  const maskedAncestors = await clip.evaluate((element) => {
    const masked: string[] = []
    let node: Element | null = element.querySelector('svg')
    while (node && node !== element) {
      const style = getComputedStyle(node)
      if ((style.maskImage || style.webkitMaskImage) !== 'none') masked.push(node.tagName)
      node = node.parentElement
    }
    return masked
  })
  expect(maskedAncestors).toEqual([])
})

test('docs previews use one masked backdrop, fitted with no amputation', async ({ page }) => {
  for (const type of ['swimlane', 'sequence', 'er']) {
    await page.goto(`/docs/diagrams/${type}/`)
    const canvas = page.locator('.preview-canvas')
    await expect(canvas).toBeVisible()
    await expect(canvas.locator('[data-diagram-grid]')).toHaveCount(0)
    const backdrop = await canvas.evaluate((element) => {
      const own = getComputedStyle(element)
      const before = getComputedStyle(element, '::before')
      return {
        ownMask: own.maskImage || own.webkitMaskImage,
        ownOverflow: own.overflow,
        mask: before.maskImage || before.webkitMaskImage,
        background: before.backgroundImage,
      }
    })
    expect(backdrop.ownMask, `${type} preview container must not be masked`).toBe('none')
    expect(backdrop.mask, `${type} backdrop must be masked`).not.toBe('none')
    expect(backdrop.background).toContain('radial-gradient')
    expect(backdrop.ownOverflow).toBe('visible')
    // Export/static rendering policy stays user-space: no non-scaling strokes
    // outside the gallery thumbnail scope.
    const staticStroke = await canvas
      .locator('[data-node-surface="true"]')
      .first()
      .evaluate((element) => getComputedStyle(element).vectorEffect)
    expect(staticStroke, `${type} preview keeps user-space strokes`).toBe('none')

    for (const width of [390, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 })
      const fit = await canvas.evaluate((element) => {
        const bounds = element.getBoundingClientRect()
        const svg = element.querySelector('svg')!
        const svgBounds = svg.getBoundingClientRect()
        const nodes = [...element.querySelectorAll('[data-node-id]')].map((node) =>
          node.getBoundingClientRect(),
        )
        return {
          overflowX: element.scrollWidth - element.clientWidth,
          svgInside: svgBounds.left >= bounds.left - 1 && svgBounds.right <= bounds.right + 1,
          amputated: nodes.filter(
            (node) =>
              node.left < bounds.left - 1 ||
              node.right > bounds.right + 1 ||
              node.top < bounds.top - 1 ||
              node.bottom > bounds.bottom + 1,
          ).length,
          minWidth: getComputedStyle(svg).minWidth,
        }
      })
      expect(
        fit.overflowX,
        `${type} preview at ${width}px must not scroll horizontally`,
      ).toBeLessThanOrEqual(1)
      expect(fit.svgInside, `${type} preview SVG at ${width}px must fit`).toBe(true)
      expect(fit.amputated, `${type} preview at ${width}px must not amputate nodes`).toBe(0)
      expect(fit.minWidth, `${type} fitted preview must drop the forced min-width`).toBe('0px')
    }
    await page.setViewportSize({ width: 1280, height: 900 })
  }
})

test('contrast instrument detects invisible paint, dimmed groups and SVG surfaces', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.locator('.layout-gallery-card').first()).toBeVisible()
  await page.evaluate(() => {
    const svg = document.querySelector('[data-diagram-panel="example-band"] svg')!
    const namespace = 'http://www.w3.org/2000/svg'
    const group = document.createElementNS(namespace, 'g')
    group.setAttribute('opacity', '0.4')
    const make = (attribute: string, fill: string, stroke: string, strokeOpacity?: string) => {
      const rect = document.createElementNS(namespace, 'rect')
      rect.setAttribute(attribute, 'true')
      rect.setAttribute('width', '40')
      rect.setAttribute('height', '20')
      rect.setAttribute('fill', fill)
      rect.setAttribute('stroke', stroke)
      if (strokeOpacity !== undefined) rect.setAttribute('stroke-opacity', strokeOpacity)
      return rect
    }
    group.append(
      // Explicitly invisible paint.
      make('data-probe-invisible', 'none', '#ffffff', '0'),
      // Opaque card + stroke under a 40% group over the card background: both
      // final colours must be composited through the group.
      make('data-probe-composited', '#202020', '#808080'),
      // Own SVG fill is the adjacent surface: white fill makes this low.
      make('data-probe-surface', '#ffffff', '#d0d0d0'),
      // Colour alpha 0 with a fully opaque stroke-opacity: still invisible.
      make('data-probe-transparent-stroke', '#202020', 'transparent', '1'),
    )
    const inkAlpha = make('data-probe-ink-alpha', '#202020', 'rgba(128, 128, 128, 0.01)', '0.5')
    const surfaceAlpha = make('data-probe-surface-alpha', '#202020', '#404040')
    surfaceAlpha.setAttribute('fill-opacity', '0.5')
    group.append(inkAlpha, surfaceAlpha)
    // Element opacity applies once to fill and stroke. Outer background black:
    // the correct result is ink 102 / surface 54.4 (2.09:1); double counting
    // the rect opacity would report 3.16:1 and wrongly pass the 3:1 gate.
    const opacityLayer = document.createElementNS(namespace, 'svg')
    opacityLayer.setAttribute('data-probe-opacity-layer', 'true')
    opacityLayer.style.background = '#000000'
    const elementOpacity = make('data-probe-element-opacity', '#888888', '#ffffff')
    elementOpacity.setAttribute('stroke-width', '8')
    elementOpacity.setAttribute('opacity', '0.4')
    opacityLayer.append(elementOpacity)
    svg.append(opacityLayer)
    svg.append(group)
  })
  const root = '[data-diagram-panel="example-band"]'
  const [invisible] = await strokeContrast(page, root, ['[data-probe-invisible]'])
  expect(invisible.minimumOpacity).toBe(0)
  expect(invisible.minimum).toBeLessThan(3)
  const [composited] = await strokeContrast(page, root, ['[data-probe-composited]'])
  expect(composited.minimumOpacity).toBeCloseTo(0.4, 5)
  expect(composited.minimum).toBeLessThan(3)
  // Expected composition (light theme): card #fafafa, group 0.4, card fill
  // #202020, stroke #808080. finalInk = 0.4·#808080 + 0.6·#fafafa = #c9c9c9;
  // finalSurface = 0.4·#202020 + 0.6·#fafafa = #a3a3a3.
  const background = await page
    .locator('.layout-gallery-card[data-diagram-panel="example-band"]')
    .evaluate((element) => getComputedStyle(element).backgroundColor)
  expect(background).toBe('rgb(250, 250, 250)')
  expect(composited.ink).toEqual([201, 201, 201])
  expect(composited.surface).toEqual([163, 163, 163])
  const [ownSurface] = await strokeContrast(page, root, ['[data-probe-surface]'])
  expect(ownSurface.minimum, 'own SVG fill must be the measured surface').toBeLessThan(3)
  // Colour alpha must not be overwritten by stroke-opacity.
  const [transparent] = await strokeContrast(page, root, ['[data-probe-transparent-stroke]'])
  expect(transparent.minimumOpacity).toBe(0)
  expect(transparent.minimum).toBeLessThan(3)
  const [inkAlphaProbe] = await strokeContrast(page, root, ['[data-probe-ink-alpha]'])
  // 128/255 ≈ 0.01176 colour alpha × 0.5 stroke-opacity × 0.4 group.
  expect(inkAlphaProbe.minimumOpacity).toBeCloseTo(0.00235, 4)
  expect(inkAlphaProbe.minimum).toBeLessThan(3)
  // Surface fill-opacity composes into the adjacent surface too: 0.5·#202020
  // over #fafafa = #8d8d8d; ink #404040 over it, then the 40% group over
  // #fafafa gives ink ≈ #b0b0b0 and surface ≈ #cecece.
  const [surfaceAlphaProbe] = await strokeContrast(page, root, ['[data-probe-surface-alpha]'])
  expect(surfaceAlphaProbe.surface).toEqual([206, 206, 206])
  expect(surfaceAlphaProbe.ink).toEqual([176, 176, 176])
  expect(surfaceAlphaProbe.minimum).toBeLessThan(3)
  // Each opacity is applied exactly once: rect opacity 0.4 over black gives
  // ink [102] and surface [54], a 2.09:1 ratio that must fail the gate.
  const [elementOpacityProbe] = await strokeContrast(page, root, ['[data-probe-element-opacity]'])
  expect(elementOpacityProbe.ink).toEqual([102, 102, 102])
  expect(elementOpacityProbe.surface).toEqual([54, 54, 54])
  expect(elementOpacityProbe.minimumOpacity).toBeCloseTo(0.4, 3)
  expect(elementOpacityProbe.minimum).toBeLessThan(3)
})

test('nodes are opaque and semantic strokes keep 3:1 over their surface', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.layout-gallery-card').first()).toBeVisible()
  for (const theme of ['light', 'dark'] as const) {
    await setTheme(page, theme)
    for (const type of TYPES) {
      // Timeline events are dots + labels, not cards; their essential ink is
      // the label text, so contrast is measured on it.
      const selector = type === 'timeline' ? '[data-node-id] text' : '[data-node-surface="true"]'
      const [nodes] = await strokeContrast(page, `[data-diagram-panel="example-${type}"]`, [
        selector,
      ])
      expect(nodes.count, `${type} must render essential ink`).toBeGreaterThan(0)
      if (type !== 'timeline') {
        expect(nodes.transparentFill, `${type} node fills must be opaque (${theme})`).toBe(false)
        expect(nodes.minimumOpacity, `${type} nodes must not be dimmed (${theme})`).toBe(1)
      }
      expect(
        nodes.minimum,
        `${type} essential contrast (${theme}) ${nodes.detail}`,
      ).toBeGreaterThanOrEqual(3)
    }
  }
})

test('lifelines, lanes, ER separators and states stay above the dots', async ({ page }) => {
  await page.goto('/docs/diagrams/sequence/')
  await expect(page.locator('.preview-canvas')).toBeVisible()
  for (const theme of ['light', 'dark'] as const) {
    await setTheme(page, theme)
    const [lifelines] = await strokeContrast(page, '.preview-canvas', ['[data-lifeline-id] line'])
    expect(lifelines.count).toBeGreaterThan(0)
    expect(lifelines.minimum, `sequence lifelines (${theme})`).toBeGreaterThanOrEqual(3)
  }
  await page.goto('/docs/diagrams/swimlane/')
  await expect(page.locator('.preview-canvas')).toBeVisible()
  for (const theme of ['light', 'dark'] as const) {
    await setTheme(page, theme)
    const [lanes] = await strokeContrast(page, '.preview-canvas', ['[data-container-id] rect'])
    expect(lanes.count).toBeGreaterThan(0)
    expect(lanes.minimum, `swimlane boundaries (${theme})`).toBeGreaterThanOrEqual(3)
  }
  await page.goto('/docs/diagrams/er/')
  await expect(page.locator('.preview-canvas')).toBeVisible()
  for (const theme of ['light', 'dark'] as const) {
    await setTheme(page, theme)
    const [separators] = await strokeContrast(page, '.preview-canvas', [
      '[data-structure="er-separator"]',
    ])
    expect(separators.count).toBeGreaterThan(0)
    expect(separators.minimum, `ER separators (${theme})`).toBeGreaterThanOrEqual(3)
  }
  await page.goto('/docs/diagrams/state-machine/')
  await expect(page.locator('.preview-canvas')).toBeVisible()
  for (const theme of ['light', 'dark'] as const) {
    await setTheme(page, theme)
    const [states] = await strokeContrast(page, '.preview-canvas', [
      '[data-structure="state-outline"]',
    ])
    expect(states.count).toBeGreaterThan(0)
    expect(states.minimum, `state outline (${theme})`).toBeGreaterThanOrEqual(3)
  }
})

test('every editor structure keeps 3:1 in both themes', async ({ page }) => {
  for (const theme of ['light', 'dark'] as const) {
    const label = theme === 'dark' ? 'Dark' : 'Light'
    for (const [key, selectors] of Object.entries(EDITOR_STRUCTURE)) {
      await page.goto(`/playground.html?only=${key}`)
      await expect(page.locator('.adl-editor-surface [data-hit-node]').first()).toBeVisible()
      const current = await page.evaluate(() => document.documentElement.dataset.theme)
      if (current !== theme) await page.getByRole('button', { name: label, exact: true }).click()
      for (const selector of selectors) {
        const [result] = await strokeContrast(page, '.adl-editor-surface', [selector])
        expect(result.count, `${key} ${selector} must exist`).toBeGreaterThan(0)
        expect(result.minimumOpacity, `${key} ${selector} must not be invisible`).toBeGreaterThan(0)
        expect(
          result.minimum,
          `${key} ${selector} contrast (${theme}) ${result.detail}`,
        ).toBeGreaterThanOrEqual(3)
      }
    }
  }
})

test('editor grid is one masked viewport layer and the document grid stays out', async ({
  page,
}) => {
  await page.goto('/playground.html?only=example-er')
  await expect(page.locator('.adl-editor-surface [data-hit-node]').first()).toBeVisible()
  await expect(page.locator('.adl-editor-surface [data-editor-grid]')).toHaveCount(1)
  await expect(page.locator('.adl-editor-surface rect[fill^="url(#grid-"]')).toHaveCount(0)
  const masked = await page
    .locator('.adl-editor-surface [data-editor-grid]')
    .evaluate((element) => Boolean(element.getAttribute('mask')))
  expect(masked).toBe(true)
})
