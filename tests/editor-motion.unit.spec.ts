import { describe, expect, it } from 'vitest'
import { StoryPlayback, createMotionOwnerGuard } from '../src/viewer/motion'
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
