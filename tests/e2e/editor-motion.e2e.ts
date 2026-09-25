import { readFileSync } from 'node:fs'
import { test, expect } from '@playwright/test'

function storyFixture() {
  return JSON.stringify({
    format: 'aesthc-diagram',
    schemaVersion: 1,
    id: 'motion-fixture',
    revision: 0,
    locale: 'en',
    spec: {
      type: 'graph',
      caption: 'Motion fixture',
      legend: { main: 'Main', branch: 'Branch' },
      nodes: [
        { id: 'a', label: 'Alpha', description: '', kind: 'Service' },
        { id: 'b', label: 'Beta', description: '', kind: 'Database' },
      ],
      edges: [{ id: 'ab', from: 'a', to: 'b', label: 'Write' }],
    },
    scene: {
      mode: 'manual',
      nodes: {
        a: { x: 0, y: 80, width: 160, height: 64, locked: false },
        b: { x: 260, y: 80, width: 160, height: 64, locked: false },
      },
      routes: {},
      groups: [],
      zOrder: ['a', 'b'],
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
    views: [
      { id: 'v-a', label: 'Alpha', focus: { nodeIds: ['a'], edgeIds: [] } },
      { id: 'v-b', label: 'Beta', focus: { nodeIds: ['b'], edgeIds: ['ab'] } },
    ],
    story: [
      { id: 'st1', viewId: 'v-a', durationMs: 500 },
      { id: 'st2', viewId: 'v-b', durationMs: 500 },
    ],
    extensions: {},
  })
}

async function importFixture(page: import('@playwright/test').Page) {
  await page.setInputFiles('input[type="file"]', {
    name: 'motion.json',
    mimeType: 'application/json',
    buffer: Buffer.from(storyFixture()),
  })
  await expect(page.getByRole('heading', { name: 'Motion fixture' })).toBeVisible()
}

test('T52.1 a supported codec records a decodable, bounded file with no camera access', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'canvas MediaRecorder codecs are certified in Chromium; other engines report unavailable',
  )
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.addInitScript(() => {
    const state = window as unknown as { __getUserMediaCalls: number }
    state.__getUserMediaCalls = 0
    if (navigator.mediaDevices) {
      const original = navigator.mediaDevices.getUserMedia?.bind(navigator.mediaDevices)
      navigator.mediaDevices.getUserMedia = async (...args) => {
        state.__getUserMediaCalls += 1
        if (!original) throw new Error('camera denied')
        return original(...args)
      }
    }
  })
  await page.goto('/viewer.html')
  await importFixture(page)
  const exportButton = page.getByRole('button', { name: 'Export WebM', exact: true })
  await expect(exportButton).toBeEnabled()
  const downloadPromise = page.waitForEvent('download')
  await exportButton.click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('story.webm')
  const bytes = readFileSync((await download.path())!).toString('base64')
  const decoded = await page.evaluate(async (data) => {
    const blob = await (await fetch(`data:video/webm;base64,${data}`)).blob()
    const video = document.createElement('video')
    video.muted = true
    video.src = URL.createObjectURL(blob)
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve()
      video.onerror = () => reject(new Error('decode failed'))
    })
    const duration = video.duration
    video.currentTime = Math.max(0, duration - 0.05)
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve()
    })
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext('2d')!
    context.drawImage(video, 0, 0)
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
    let painted = 0
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 0) painted += 1
    const result = {
      width: video.videoWidth,
      height: video.videoHeight,
      duration,
      painted,
      bytes: blob.size,
    }
    URL.revokeObjectURL(video.src)
    canvas.width = 0
    canvas.height = 0
    return result
  }, bytes)
  expect(decoded.width).toBeGreaterThan(0)
  expect(decoded.height).toBeGreaterThan(0)
  expect(decoded.duration).toBeGreaterThanOrEqual(0.5)
  expect(decoded.duration).toBeLessThanOrEqual(4)
  expect(decoded.painted).toBeGreaterThan(0)
  expect(decoded.bytes).toBeGreaterThan(0)
  expect(
    await page.evaluate(
      () => (window as unknown as { __getUserMediaCalls: number }).__getUserMediaCalls,
    ),
  ).toBe(0)
})

test('T52.2 reduced motion, missing codecs and cancellation never report a false success', async ({
  page,
}) => {
  // 1. Reduced motion (the suite default): recording stays disabled.
  await page.goto('/viewer.html')
  await importFixture(page)
  const exportButton = page.getByRole('button', { name: 'Export WebM', exact: true })
  await expect(exportButton).toBeDisabled()
  // Engines without a WebM codec report unavailable; supported engines report
  // reduced motion. Either way recording is disabled and never a false success.
  await expect(exportButton).toHaveAttribute(
    'title',
    /Reduced motion: recording is disabled\.|WebM is unavailable in this browser\./,
  )
  await expect(page.getByText('Reduced motion: static navigation.')).toBeVisible()
})

test('T52.2 a browser without a WebM codec disables recording instead of producing a file', async ({
  browser,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'MediaRecorder stubbing is Chromium evidence')
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.addInitScript(() => {
    MediaRecorder.isTypeSupported = () => false
  })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/viewer.html')
  await importFixture(page)
  await expect(page.getByRole('button', { name: 'Export WebM', exact: true })).toBeDisabled()
  await expect(page.getByText('WebM is unavailable in this browser.')).toBeVisible()
  await context.close()
})

test('T52.2 cancelling a recording releases the canvas tracks without a download', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.addInitScript(() => {
    const state = window as unknown as { __tracks: MediaStreamTrack[] }
    state.__tracks = []
    const original = HTMLCanvasElement.prototype.captureStream
    HTMLCanvasElement.prototype.captureStream = function (...args: unknown[]) {
      const stream = (original as (...inner: unknown[]) => MediaStream).apply(this, args)
      state.__tracks.push(...stream.getVideoTracks())
      return stream
    }
  })
  await page.goto('/viewer.html')
  await importFixture(page)
  const downloads: string[] = []
  page.on('download', (download) => downloads.push(download.suggestedFilename()))
  await page.getByRole('button', { name: 'Export WebM', exact: true }).click()
  const cancel = page.getByRole('button', { name: 'Cancel export', exact: true })
  await expect(cancel).toBeVisible()
  await cancel.click()
  await expect(page.getByText('operation.aborted')).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as { __tracks: MediaStreamTrack[] }).__tracks.every(
          (track) => track.readyState === 'ended',
        ),
      ),
    )
    .toBe(true)
  expect(downloads).toEqual([])
  await expect(page.getByRole('button', { name: 'Export WebM', exact: true })).toBeEnabled()
})
