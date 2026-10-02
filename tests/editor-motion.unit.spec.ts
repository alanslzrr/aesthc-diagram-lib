import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { StoryPlayback, createMotionOwnerGuard } from '../src/viewer/motion'
import { exportStoryWebm } from '../src/export'
import { createDocument } from '../src/editor-core'
import type { StoryStep } from '../src/editor-core/types'

function fakeTimers() {
  const queue: Array<{ at: number; callback: () => void }> = []
  let now = 0
  return {
    clock: () => now,
    setTimer: (callback: () => void, ms: number) => {
      const handle = { at: now + ms, callback }
      queue.push(handle)
      return handle
    },
    clearTimer: (handle: unknown) => {
      const index = queue.findIndex((entry) => entry === handle)
      if (index >= 0) queue.splice(index, 1)
    },
    advance(ms: number) {
      now += ms
      for (const entry of [...queue].sort((a, b) => a.at - b.at)) {
        if (entry.at <= now) {
          queue.splice(queue.indexOf(entry), 1)
          entry.callback()
        }
      }
    },
  }
}

const steps: StoryStep[] = [
  { id: 's1', viewId: 'v1', durationMs: 1000 },
  { id: 's2', viewId: 'v2', durationMs: 1000 },
  { id: 's3', viewId: 'v3', durationMs: 1000 },
]

describe('E14 finite story playback', () => {
  it('T34.2 never auto-starts and is finite with a single owner', () => {
    const timers = fakeTimers()
    const seen: number[] = []
    const ended: boolean[] = []
    const playback = new StoryPlayback(
      steps,
      {
        onStep: (index) => seen.push(index),
        onEnd: () => ended.push(true),
        onStop: () => ended.push(false),
      },
      timers,
    )
    expect(playback.getState()).toBe('idle')
    expect(playback.getOwner()).toBeNull()
    expect(seen).toEqual([])
    expect(playback.play()).toBe(true)
    expect(playback.getOwner()).toBe('story')
    timers.advance(1000)
    expect(seen).toEqual([0, 1])
    timers.advance(1000)
    expect(seen).toEqual([0, 1, 2])
    timers.advance(1000)
    expect(ended).toEqual([true])
    expect(playback.getState()).toBe('ended')
    expect(playback.getOwner()).toBeNull()
    // A second playback cannot coexist with a different owner.
    const guard = createMotionOwnerGuard()
    expect(guard.claim('story')).toBe(true)
    expect(guard.claim('route')).toBe(false)
    guard.release('story')
    expect(guard.claim('route')).toBe(true)
  })

  it('T34.2 next/prev/pause work while paused and stop clears timers', () => {
    const timers = fakeTimers()
    const seen: number[] = []
    const stopped: boolean[] = []
    const playback = new StoryPlayback(
      steps,
      {
        onStep: (index) => seen.push(index),
        onEnd: () => undefined,
        onStop: () => stopped.push(true),
      },
      timers,
    )
    playback.play()
    playback.pause()
    expect(playback.getState()).toBe('paused')
    expect(playback.next()).toBe(true)
    expect(seen).toEqual([0, 1])
    // No timer runs while paused.
    timers.advance(5000)
    expect(seen).toEqual([0, 1])
    playback.prev()
    expect(seen).toEqual([0, 1, 0])
    playback.stop()
    expect(stopped).toEqual([true])
    expect(playback.getState()).toBe('idle')
    expect(playback.getOwner()).toBeNull()
  })
})

describe('E24 finite trace playback', () => {
  it('T52.2 plays an authored route edge by edge and never invents edges', async () => {
    const { createTracePlayer } = await import('../src/viewer/trace')
    const timers = fakeTimers()
    const seen: Array<[number, string]> = []
    const ended: boolean[] = []
    const player = createTracePlayer(
      { edgeIds: ['e1', 'e2', 'e3'] },
      {
        onStep: (index, edgeId) => seen.push([index, edgeId]),
        onEnd: () => ended.push(true),
        onStop: () => ended.push(false),
      },
      { edgeDurationMs: 100, environment: timers },
    )
    expect(player.state()).toBe('idle')
    expect(seen).toEqual([])
    player.play()
    expect(player.edgeIds()).toEqual(['e1', 'e2', 'e3'])
    timers.advance(100)
    timers.advance(100)
    expect(seen).toEqual([
      [0, 'e1'],
      [1, 'e2'],
      [2, 'e3'],
    ])
    timers.advance(100)
    expect(ended).toEqual([true])
    expect(player.state()).toBe('ended')
  })
})

describe('WebM recorder lifecycle', () => {
  const behavior = {
    constructorThrows: false,
    startThrows: false,
    imageNeverLoads: false,
    captureCalls: 0,
  }
  const makeTrack = () => ({
    readyState: 'live',
    stopped: false,
    stop() {
      this.stopped = true
      this.readyState = 'ended'
    },
  })
  let track: ReturnType<typeof makeTrack>
  const stream = { getTracks: () => [track] }
  class FakeRecorder {
    static isTypeSupported = () => true
    state = 'inactive'
    ondataavailable: ((event: { data: Blob }) => void) | null = null
    onstop: (() => void) | null = null
    onerror: (() => void) | null = null
    constructor() {
      if (behavior.constructorThrows) throw Error('codec failed')
    }
    start() {
      if (behavior.startThrows) throw Error('start failed')
      this.state = 'recording'
    }
    stop() {
      this.state = 'inactive'
      this.onstop?.()
    }
  }
  class FakeImage {
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    set src(_value: string) {
      if (!behavior.imageNeverLoads) queueMicrotask(() => this.onload?.())
    }
  }
  let canvas: {
    width: number
    height: number
    getContext: () => { drawImage: () => void }
    captureStream: () => typeof stream
  }
  function motionDocument() {
    const made = createDocument(
      {
        type: 'graph',
        caption: 'Motion',
        legend: { main: 'Main', branch: 'Branch' },
        nodes: [{ id: 'a', label: 'A', description: '' }],
        edges: [],
      },
      { id: 'motion', locale: 'en' },
    )
    if (!made.ok) throw Error('document')
    made.value.views = [{ id: 'v1', label: 'View', focus: { nodeIds: ['a'], edgeIds: [] } }]
    made.value.story = [{ id: 's1', viewId: 'v1', durationMs: 1000 }]
    return made.value
  }
  beforeAll(() => {
    track = makeTrack()
    canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: () => {} }),
      captureStream: () => {
        behavior.captureCalls += 1
        return stream
      },
    }
    vi.stubGlobal('window', { document: { createElement: () => canvas } })
    vi.stubGlobal('MediaRecorder', FakeRecorder)
    vi.stubGlobal('HTMLCanvasElement', { prototype: { captureStream: () => stream } })
    vi.stubGlobal('Image', FakeImage)
    vi.stubGlobal('URL', {
      createObjectURL: () => 'blob:motion',
      revokeObjectURL: () => {},
    })
  })
  afterAll(() => {
    vi.unstubAllGlobals()
  })
  beforeEach(() => {
    behavior.constructorThrows = false
    behavior.startThrows = false
    behavior.imageNeverLoads = false
    behavior.captureCalls = 0
    track = makeTrack()
  })
  it('stops acquired tracks when the recorder constructor throws', async () => {
    behavior.constructorThrows = true
    const result = await exportStoryWebm(motionDocument())
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.diagnostics.map((d) => d.code)).toContain('webm.recorder')
    expect(track.stopped).toBe(true)
    expect(canvas.width).toBe(0)
  })
  it('settles when start throws while the recorder stays inactive', async () => {
    behavior.startThrows = true
    const outcome = await Promise.race([
      exportStoryWebm(motionDocument()).then((result) => result.ok),
      new Promise((resolve) => setTimeout(() => resolve('timeout'), 500)),
    ])
    expect(outcome).toBe(false)
    expect(track.stopped).toBe(true)
  })
  it('interrupts a pending image load on abort instead of hanging', async () => {
    behavior.imageNeverLoads = true
    const controller = new AbortController()
    const pending = exportStoryWebm(motionDocument(), { signal: controller.signal })
    await new Promise((resolve) => setTimeout(resolve, 10))
    controller.abort()
    const result = (await Promise.race([
      pending,
      new Promise((resolve) => setTimeout(() => resolve('timeout'), 1000)),
    ])) as Awaited<ReturnType<typeof exportStoryWebm>> | 'timeout'
    expect(result).not.toBe('timeout')
    if (result !== 'timeout') {
      expect(result.ok).toBe(false)
      if (!result.ok)
        expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
          'operation.aborted',
        )
    }
    expect(track.stopped).toBe(true)
  })
  it('rejects oversized output before allocating the stream', async () => {
    const made = createDocument(
      {
        type: 'timeline',
        caption: 'Long',
        legend: { main: 'Main', branch: 'Branch' },
        events: Array.from({ length: 120 }, (_, index) => ({
          id: `e${index}`,
          label: `Event ${index}`,
          description: '',
        })),
      },
      { id: 'long-timeline', locale: 'en' },
    )
    if (!made.ok) throw Error('timeline')
    made.value.views = [{ id: 'v1', label: 'View', focus: { nodeIds: ['e0'], edgeIds: [] } }]
    made.value.story = [{ id: 's1', viewId: 'v1', durationMs: 1000 }]
    const result = await exportStoryWebm(made.value)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.diagnostics.map((d) => d.code)).toContain('export.pixels')
    expect(behavior.captureCalls).toBe(0)
  })
})
