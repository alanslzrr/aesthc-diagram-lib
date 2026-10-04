import { test, expect } from '@playwright/test'

function viewerDocument(revision: number, extraEdge = false) {
  const nodes = [
    { id: 'a', label: 'Café', description: 'Accented entry.', kind: 'Service' },
    { id: 'b', label: 'café', description: 'Lowercase twin.', kind: 'Database' },
    { id: 'c', label: 'Gateway', description: 'Middle hop.', kind: 'Cafe' },
    { id: 'd', label: 'Café Store', description: 'Terminal.', kind: 'Service' },
  ]
  const edges = [
    { id: 'ac-1', from: 'a', to: 'c', label: 'first' },
    { id: 'ac-2', from: 'a', to: 'c', label: 'parallel' },
    { id: 'cd', from: 'c', to: 'd' },
    ...(extraEdge ? [{ id: 'new-edge', from: 'd', to: 'b' }] : []),
  ]
  return JSON.stringify({
    format: 'aesthc-diagram',
    schemaVersion: 1,
    id: 'viewer-fixture',
    revision,
    locale: 'en',
    spec: {
      type: 'graph',
      caption: 'Semantic fixture',
      legend: { main: 'Main', branch: 'Branch' },
      nodes,
      edges,
    },
    scene: {
      mode: 'manual',
      nodes: Object.fromEntries(
        nodes.map((n, i) => [n.id, { x: i * 220, y: 120, width: 160, height: 60, locked: false }]),
      ),
      routes: {},
      groups: [],
      zOrder: nodes.map((n) => n.id),
    },
    presentation: {
      theme: {
        mode: 'light',
        light: {
          background: '#e9eef4',
          foreground: '#202b38',
          card: '#f9fbfd',
          border: '#aebdcd',
          mutedForeground: '#536273',
          cobalt: '#087cbd',
          branch: '#a66b21',
        },
        dark: {
          background: '#070707',
          foreground: '#f2f2ee',
          card: '#101010',
          border: '#242424',
          mutedForeground: '#a8a8a1',
          cobalt: '#14a8ff',
          branch: '#d6a55e',
        },
      },
      grid: { visible: true, snap: true, size: 16 },
      padding: 32,
      legend: 'visible',
      edgeStyle: 'orthogonal',
      textScale: 1,
    },
    metadata: { nodes: {}, edges: {}, visuals: {} },
    views: [],
    story: [],
    extensions: {},
  })
}

async function importJson(page: import('@playwright/test').Page, revision: number) {
  await page.setInputFiles('input[type="file"]', {
    name: 'fixture.json',
    mimeType: 'application/json',
    buffer: Buffer.from(viewerDocument(revision)),
  })
  await page.getByRole('heading', { name: 'Semantic fixture', exact: true }).waitFor()
}

test('T32.1 finder orders results deterministically and announces zero results', async ({
  page,
}) => {
  await page.goto('/viewer.html')
  await importJson(page, 0)
  const origin = page.getByRole('combobox', { name: 'Origin node' })
  const options = page.getByRole('listbox', { name: 'Origin node' }).getByRole('option')
  await origin.fill('café')
  await expect(options).toHaveCount(3)
  // Authored order, not alphabetical: Café, café, Café Store; the "Cafe" kind never matches.
  await expect(options.nth(0)).toContainText('Café')
  await expect(options.nth(0)).toContainText('a · Service')
  await expect(options.nth(1)).toContainText('b · Database')
  await expect(options.nth(2)).toContainText('Café Store')
  // Unicode case-insensitive, original text preserved.
  await origin.fill('CAFÉ')
  await expect(options).toHaveCount(3)
  // Exact ID wins.
  await origin.fill('d')
  await expect(options.first()).toContainText('d · Service')
  // Zero results are announced.
  await origin.fill('zzz')
  await expect(page.getByRole('status').filter({ hasText: 'No matches' })).toBeVisible()
  // Escape clears the query and keeps focus on the trigger.
  await page.keyboard.press('Escape')
  await expect(options).toHaveCount(0)
  await expect(origin).toBeFocused()
})

test('T32.1 parallel relations keep their exact IDs in the inspector', async ({ page }) => {
  await page.goto('/viewer.html')
  await importJson(page, 0)
  const origin = page.getByRole('combobox', { name: 'Origin node' })
  await origin.fill('café')
  await page.keyboard.press('Enter')
  await expect(page.getByText('✓ a', { exact: true })).toBeVisible()
  const inspector = page.locator('.adl-viewer-inspector')
  await expect(inspector).toContainText('Café')
  const outgoing = inspector.getByRole('list').getByRole('button')
  await expect(outgoing).toHaveCount(2)
  await expect(outgoing.nth(0)).toContainText('ac-1')
  await expect(outgoing.nth(1)).toContainText('ac-2')
  await outgoing.nth(1).click()
  await expect(inspector.getByText('ac-2', { exact: true })).toBeVisible()
  await expect(inspector).toContainText('Gateway')
})

test('T32.2 a stale query invalidates highlight and export when the document changes', async ({
  page,
}) => {
  await page.goto('/viewer.html')
  await importJson(page, 0)
  const origin = page.getByRole('combobox', { name: 'Origin node' })
  await origin.fill('café')
  await page.keyboard.press('Enter')
  const destination = page.getByRole('combobox', { name: 'Destination node' })
  await destination.fill('store')
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Show route', exact: true }).click()
  await expect(page.getByText('Route Café → Café Store', { exact: false })).toBeVisible()
  await expect(page.getByRole('button', { name: 'ac-1', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'cd', exact: true })).toBeVisible()
  await expect(page.locator('.adl-viewer-stage [data-query-highlight="true"]')).toHaveCount(5)
  const exportButton = page.getByRole('button', { name: 'Export query SVG', exact: true })
  await expect(exportButton).toBeEnabled()
  // The document changes (revision bump + a new relation): the receipt is stale.
  await importJson(page, 2)
  await expect(page.getByText('The document changed.', { exact: false })).toBeVisible()
  await expect(page.locator('.adl-viewer-stage [data-query-highlight="true"]')).toHaveCount(0)
  await expect(exportButton).toBeDisabled()
})

test('camera fit centers the diagram and the minimap scales inside its frame', async ({ page }) => {
  await page.goto('/viewer.html')
  const canvas = page.locator('.adl-viewer-canvas')
  const stage = page.locator('.adl-viewer-stage')
  await expect(stage).toBeVisible()
  await expect
    .poll(async () => {
      const host = await canvas.boundingBox()
      const diagram = await stage.boundingBox()
      if (!host || !diagram) return 999
      return Math.max(
        Math.abs(host.x + host.width / 2 - (diagram.x + diagram.width / 2)),
        Math.abs(host.y + host.height / 2 - (diagram.y + diagram.height / 2)),
      )
    })
    .toBeLessThan(24)
  const minimap = page.locator('.adl-viewer-minimap')
  await expect(minimap).toBeVisible()
  const map = await minimap.boundingBox()
  const mapSvg = await page.locator('.adl-viewer-minimap-svg').boundingBox()
  expect(map).not.toBeNull()
  expect(mapSvg).not.toBeNull()
  expect(mapSvg!.width).toBeLessThanOrEqual(map!.width)
  expect(mapSvg!.height).toBeGreaterThan(0)
})

/** Replaces the primary file input payload with a read that rejects or defers. */
async function dispatchViewerRead(
  page: import('@playwright/test').Page,
  mode: 'reject' | 'deferred',
) {
  await page.evaluate((mode) => {
    const input = document.querySelector('input[type=file]') as HTMLInputElement
    const file = new File(['{}'], 'fixture.json', { type: 'application/json' })
    Object.defineProperty(file, 'text', {
      configurable: true,
      value: () =>
        mode === 'reject'
          ? Promise.reject(new Error('read failed'))
          : new Promise<string>((resolve) => {
              ;(window as unknown as { __finishRead: (value: string) => void }).__finishRead =
                resolve
            }),
    })
    const transfer = new DataTransfer()
    transfer.items.add(file)
    input.files = transfer.files
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }, mode)
}

test('viewer reports a failed file read and keeps the last valid document', async ({ page }) => {
  await page.goto('/viewer.html')
  await dispatchViewerRead(page, 'reject')
  await expect(page.locator('.viewer-message')).toContainText('could not be read')
  await expect(page.getByRole('heading', { name: 'Order platform', exact: true })).toBeVisible()
})

test('viewer discards a pending import when the document is reset while reading', async ({
  page,
}) => {
  await page.goto('/viewer.html')
  await dispatchViewerRead(page, 'deferred')
  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  await page.evaluate(
    (text) => (window as unknown as { __finishRead: (value: string) => void }).__finishRead(text),
    viewerDocument(9),
  )
  await expect(page.locator('.viewer-message')).toContainText('Canceled')
  await expect(page.getByRole('heading', { name: 'Semantic fixture', exact: true })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Order platform', exact: true })).toBeVisible()
})

test('viewer entry loads Geist and the shared host tokens over a viewport backdrop', async ({
  page,
}) => {
  await page.goto('/viewer.html')
  const canvas = page.locator('.adl-viewer-canvas')
  await expect(canvas).toBeVisible()
  await page.evaluate(() => document.fonts.ready)

  const shell = await page.evaluate(() => {
    const faces = Array.from(document.fonts, (face) => ({
      family: face.family.replaceAll('"', '').replaceAll("'", ''),
      status: face.status,
    }))
    const element = document.querySelector('.viewer-shell')!
    return {
      faces,
      background: getComputedStyle(element).backgroundColor,
      font: getComputedStyle(element).fontFamily,
      bodyMargin: getComputedStyle(document.body).margin,
    }
  })
  for (const family of ['Geist', 'Geist Mono']) {
    expect(
      shell.faces.some((face) => face.family === family && face.status === 'loaded'),
      `${family} must be loaded on direct viewer entry`,
    ).toBe(true)
  }
  expect(shell.font).toContain('Geist')
  expect(shell.background).toBe('rgb(255, 255, 255)')
  expect(shell.bodyMargin).toBe('0px')

  // The component itself must follow the host tokens, not only its shell: the
  // package declares defaults on `.adl-viewer`, so the host overrides at that
  // element and this checks the effective canvas/control palette.
  const palette = () =>
    page.evaluate(() => {
      const viewer = document.querySelector('.adl-viewer') as HTMLElement
      const control = document.querySelector('.adl-viewer-controls select') as HTMLElement
      return {
        viewerBackground: getComputedStyle(viewer).backgroundColor,
        viewerColor: getComputedStyle(viewer).color,
        controlBackground: getComputedStyle(control).backgroundColor,
        controlBorder: getComputedStyle(control).borderTopColor,
        shellBackground: getComputedStyle(document.querySelector('.viewer-shell')!).backgroundColor,
      }
    })
  await expect.poll(palette).toEqual({
    viewerBackground: 'rgb(255, 255, 255)',
    viewerColor: 'rgb(10, 10, 10)',
    controlBackground: 'rgb(250, 250, 250)',
    controlBorder: 'rgb(234, 234, 234)',
    shellBackground: 'rgb(255, 255, 255)',
  })
  // Dark document mode flips the component tokens while the host shell keeps
  // its own preference: document/export appearance is separate from the host
  // chrome (the host preference test covers a dark host independently).
  await page.evaluate(() => {
    document.querySelector('.adl-viewer')!.setAttribute('data-theme', 'dark')
  })
  await expect.poll(palette).toEqual({
    viewerBackground: 'rgb(0, 0, 0)',
    viewerColor: 'rgb(237, 237, 237)',
    controlBackground: 'rgb(10, 10, 10)',
    controlBorder: 'rgb(31, 31, 31)',
    shellBackground: 'rgb(255, 255, 255)',
  })
  await page.evaluate(() => {
    document.querySelector('.adl-viewer')!.setAttribute('data-theme', 'light')
  })

  // One viewport backdrop layer; the interactive stage no longer paints the
  // document artboard grid (exports keep their own policy).
  await expect(page.locator('[data-viewer-grid]')).toHaveCount(1)
  await expect(page.locator('.adl-viewer-stage rect[fill^="url(#grid-"]')).toHaveCount(0)
  const cover = await page.evaluate(() => {
    const host = document.querySelector('.adl-viewer-canvas')!.getBoundingClientRect()
    const grid = document.querySelector('[data-viewer-grid]')!.getBoundingClientRect()
    return [
      grid.left - host.left,
      grid.top - host.top,
      host.right - grid.right,
      host.bottom - grid.bottom,
    ]
  })
  for (const edge of cover) expect(Math.abs(edge)).toBeLessThanOrEqual(1)

  const phase = () =>
    page.evaluate(() => {
      const rect = document.querySelector('[data-viewer-grid]') as SVGRectElement | null
      const pattern = rect?.ownerSVGElement?.querySelector('pattern')
      return pattern?.getAttribute('patternTransform') ?? null
    })
  const first = await phase()
  expect(first).not.toBeNull()
  const box = (await canvas.boundingBox())!
  // Start on empty canvas (the stage itself owns pointer events over nodes).
  await page.mouse.move(box.x + 8, box.y + 8)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 30, { steps: 5 })
  await page.mouse.up()
  await expect.poll(phase).not.toBe(first)
})
