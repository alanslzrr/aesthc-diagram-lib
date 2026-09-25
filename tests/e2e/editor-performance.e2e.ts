import { test, expect } from '@playwright/test'

function seededDocument(nodeCount: number, edgeCount: number) {
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({
    id: `n${i}`,
    label: `Node ${i}`,
    description: '',
  }))
  const edges = Array.from({ length: edgeCount }, (_, i) => ({
    id: `e${i}`,
    from: `n${i % nodeCount}`,
    to: `n${(i * 13 + 3) % nodeCount}`,
  }))
  return {
    format: 'aesthc-diagram',
    schemaVersion: 1,
    id: 'perf-browser',
    revision: 0,
    locale: 'en',
    spec: {
      type: 'graph',
      caption: `Performance seed ${nodeCount}`,
      legend: { main: 'Main', branch: 'Branch' },
      nodes,
      edges,
    },
    scene: {
      mode: 'manual',
      nodes: Object.fromEntries(
        nodes.map((n, i) => [
          n.id,
          { x: (i % 40) * 180, y: Math.floor(i / 40) * 80, width: 140, height: 56, locked: false },
        ]),
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
  }
}

test('drag frame p95 stays under the reference budget on the reference runner', async ({
  page,
  browserName,
  isMobile,
}) => {
  test.skip(
    browserName !== 'chromium' || isMobile,
    'frame timing is desktop chromium evidence; other engines use functional coverage',
  )
  const referenceRunner =
    process.env.PERF_REFERENCE === '1' || (!!process.env.CI && !process.env.PLAYWRIGHT_CHANNEL)
  await page.setViewportSize({ width: 1280, height: 2200 })
  await page.goto('/studio.html')
  await page.getByText('Document JSON', { exact: true }).click()
  const json = page.getByRole('textbox', { name: 'Document JSON' })
  await json.fill(JSON.stringify(seededDocument(1000, 2000)))
  await page.getByRole('button', { name: 'Apply JSON' }).click()
  const target = page.getByRole('button', { name: 'Node 500', exact: true })
  await expect(target).toBeVisible()
  await page.getByRole('button', { name: 'Fit diagram', exact: true }).click()
  await page.waitForTimeout(400)
  const box = await target.boundingBox()
  if (!box) throw Error('target node absent')
  console.log(
    'target box',
    JSON.stringify(box),
    'zoom',
    await page.getByRole('status', { name: 'Zoom' }).textContent(),
  )
  const environment = await page.evaluate(() => ({
    platform: navigator.platform,
    userAgent: navigator.userAgent,
    deviceMemory: (navigator as { deviceMemory?: number }).deviceMemory ?? 'unreported',
  }))
  await page.evaluate(() => {
    const win = window as unknown as {
      __adlFrames: number[]
      __adlStop: () => void
    }
    win.__adlFrames = []
    let running = true
    let last = performance.now()
    const tick = (now: number) => {
      win.__adlFrames.push(now - last)
      last = now
      if (running) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    win.__adlStop = () => {
      running = false
    }
  })
  const xBefore = Number(await target.getAttribute('x'))
  const cdp = await page.context().newCDPSession(page)
  const startX = box.x + box.width / 2,
    startY = box.y + box.height / 2
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: startX,
    y: startY,
  })
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: startX,
    y: startY,
    button: 'left',
    clickCount: 1,
  })
  for (let step = 1; step <= 60; step++) {
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: startX + step * 3,
      y: startY + Math.round(step / 2),
      button: 'left',
    })
    await new Promise((resolve) => setTimeout(resolve, 30))
  }
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: startX + 60 * 3,
    y: startY + 30,
    button: 'left',
    clickCount: 1,
  })
  await cdp.detach()
  const xAfter = Number(await target.getAttribute('x'))
  expect(xAfter).not.toBe(xBefore)
  const frames = await page.evaluate(() => {
    const win = window as unknown as { __adlFrames: number[]; __adlStop: () => void }
    win.__adlStop()
    return win.__adlFrames.slice()
  })
  const settled = frames.slice(Math.max(0, frames.length - 240))
  const sorted = [...settled].sort((a, b) => a - b)
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))]
  const longTasks = settled.filter((delta) => delta > 100)
  console.log(
    `frame p95 ${p95.toFixed(1)}ms over ${settled.length} frames; long frames >100ms: ${longTasks.length} ` +
      `(reference ${referenceRunner ? 'yes' : 'no'})`,
  )
  console.log(`environment ${JSON.stringify(environment)}`)
  // Local runs report only, with a generous regression ceiling that catches catastrophic
  // hangs; they are NOT the reference runner. The reference budget below is the product gate.
  expect(p95).toBeLessThanOrEqual(800)
  expect(longTasks.length).toBeLessThanOrEqual(180)
  // The reference budget is asserted only on the pinned-chromium CI runner (or PERF_REFERENCE=1).
  if (referenceRunner) expect(p95).toBeLessThanOrEqual(33.3)
})
