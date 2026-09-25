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

/**
 * 6.6 protocol: warmup pass first, then a sustained 10 s drag after fonts are
 * loaded. Frame cost uses requestAnimationFrame deltas; blocking is measured
 * with the long-task API (PerformanceObserver), not just frame deltas, which
 * also capture scheduling noise outside the task.
 */
test('drag frame p95 and long-task budget stay under the reference budgets', async ({
  page,
  browserName,
  isMobile,
}) => {
  test.setTimeout(150_000)
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
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: (navigator as { deviceMemory?: number }).deviceMemory ?? 'unreported',
  }))
  await page.evaluate(() => {
    const win = window as unknown as {
      __adlFrames: number[]
      __adlLongTasks: Array<{ start: number; duration: number }>
      __adlWindowStart: number
      __adlStop: () => void
      __adlLongTaskObserver: PerformanceObserver
    }
    win.__adlFrames = []
    win.__adlLongTasks = []
    win.__adlWindowStart = 0
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
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        win.__adlLongTasks.push({
          start: entry.startTime,
          duration: entry.duration,
        })
      }
    })
    observer.observe({ type: 'longtask' })
    win.__adlLongTaskObserver = observer
  })
  const xBefore = Number(await target.getAttribute('x'))
  const cdp = await page.context().newCDPSession(page)
  if (process.env.PERF_PROFILE) {
    await cdp.send('Profiler.enable')
    await cdp.send('Profiler.start')
  }
  const startX = box.x + box.width / 2,
    startY = box.y + box.height / 2
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: startX,
    y: startY,
  })
  async function drag(steps: number, from: number) {
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: startX + from * 3,
      y: startY + Math.round(from / 2),
      button: 'left',
      clickCount: 1,
    })
    for (let step = 1; step <= steps; step++) {
      await cdp.send('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: startX + (from + step) * 3,
        y: startY + Math.round((from + step) / 2),
        button: 'left',
      })
      await new Promise((resolve) => setTimeout(resolve, 30))
    }
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: startX + (from + steps) * 3,
      y: startY + Math.round((from + steps) / 2),
      button: 'left',
      clickCount: 1,
    })
  }
  const warmupSteps = 60
  await drag(warmupSteps, 0)
  // The measured pass is a fresh, sustained 10 s drag (~333 moves at 30 ms).
  const measuredSteps = 333
  await page.evaluate(() => {
    const win = window as unknown as {
      __adlFrames: number[]
      __adlWindowStart: number
    }
    win.__adlFrames = []
    win.__adlWindowStart = performance.now()
  })
  await drag(measuredSteps, warmupSteps)
  if (process.env.PERF_PROFILE) {
    const { profile } = await cdp.send('Profiler.stop')
    await test.info().attach('gesture-cpu-profile', {
      body: JSON.stringify(profile),
      contentType: 'application/json',
    })
  }
  await cdp.detach()
  const xAfter = Number(await target.getAttribute('x'))
  expect(xAfter).not.toBe(xBefore)
  const { frames, longTasks } = await page.evaluate(() => {
    const win = window as unknown as {
      __adlFrames: number[]
      __adlLongTasks: Array<{ start: number; duration: number }>
      __adlWindowStart: number
      __adlStop: () => void
      __adlLongTaskObserver: PerformanceObserver
    }
    win.__adlStop()
    win.__adlLongTaskObserver.disconnect()
    const windowStart = win.__adlWindowStart
    return {
      frames: win.__adlFrames.slice(),
      longTasks: win.__adlLongTasks.filter((task) => task.start >= windowStart),
    }
  })
  const sorted = [...frames].sort((a, b) => a - b)
  // Timestamp subtraction can produce 33.30000000000018 for an exact 33.3 ms frame.
  // Normalize only sub-nanosecond arithmetic noise; 33.300001 and 33.4 still fail.
  const p95 = Number(
    sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))].toFixed(6),
  )
  const longTasksOver100 = longTasks.filter((task) => task.duration > 100)
  const longFrames = frames.filter((delta) => delta > 100)
  await test.info().attach('frame-metrics', {
    body: JSON.stringify({
      environment,
      frames,
      longTasks,
      p95,
      longTasksOver100: longTasksOver100.length,
      longFramesOver100: longFrames.length,
      warmupMoves: warmupSteps,
      measuredMoves: measuredSteps,
      measuredMs: measuredSteps * 30,
      nodeCount: 1000,
      edgeCount: 2000,
      budgetMs: 33.3,
    }),
    contentType: 'application/json',
  })
  console.log(
    `frame p95 ${p95.toFixed(1)}ms over ${frames.length} frames; long tasks >100ms: ` +
      `${longTasksOver100.length} (of ${longTasks.length} long tasks); frame deltas >100ms: ` +
      `${longFrames.length} (reference ${referenceRunner ? 'yes' : 'no'})`,
  )
  console.log(`environment ${JSON.stringify(environment)}`)
  // Local runs report only, with a generous regression ceiling that catches catastrophic
  // hangs; they are NOT the reference runner. The reference budgets below are the product gates.
  expect(p95).toBeLessThanOrEqual(800)
  expect(longTasksOver100.length).toBeLessThanOrEqual(180)
  // The reference budgets are asserted only on the pinned-chromium CI runner (or PERF_REFERENCE=1).
  if (referenceRunner) {
    expect(p95).toBeLessThanOrEqual(33.3)
    // 6.6: "Interacción drag bloqueada por long task | ninguna >100ms | ninguna >100ms tras carga".
    expect(longTasksOver100.length).toBe(0)
  }
})
