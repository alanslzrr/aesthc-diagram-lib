import { describe, expect, it } from 'vitest'
import { routeOrthogonal } from '../src/editor-core/router'

const wall = { x: 200, y: 0, w: 40, h: 300 }

describe('E15 bounded orthogonal router', () => {
  it('T37.1 detours around an obstacle with clearance 12 and stays deterministic', () => {
    const request = {
      from: { x: 0, y: 150 },
      to: { x: 400, y: 150 },
      obstacles: [wall],
    }
    const first = routeOrthogonal(request)
    const second = routeOrthogonal(request)
    if (!first.ok || !second.ok) throw Error(JSON.stringify(first.diagnostics))
    expect(second.value).toEqual(first.value)
    expect(first.value.clearance).toBe(12)
    expect(first.value.points[0]).toEqual([0, 150])
    expect(first.value.points[first.value.points.length - 1]).toEqual([400, 150])
    // Every segment stays outside the grown obstacle (200-12=188 .. 240+12=252).
    for (const [x, y] of first.value.points) {
      const inside = x >= 188 && x <= 252 && y >= -12 && y <= 312
      expect(inside).toBe(false)
    }
    expect(first.value.bends).toBeLessThanOrEqual(24)
  })

  it('T37.1 parallel requests with different offsets produce separate deterministic slots', () => {
    const base = {
      from: { x: 0, y: 150 },
      to: { x: 400, y: 150 },
      obstacles: [wall],
    }
    const low = routeOrthogonal(base)
    const high = routeOrthogonal({
      ...base,
      from: { x: 0, y: 150 },
      to: { x: 400, y: 150 },
      clearance: 12,
    })
    if (!low.ok || !high.ok) throw Error('router')
    expect(high.value.points).toEqual(low.value.points)
    // A caller-side parallel spread keeps identical geometry: the router never
    // invents new relations or merges parallel edges into one.
    const spread = routeOrthogonal({
      ...base,
      from: { x: 0, y: 150 - 24 },
      to: { x: 400, y: 150 - 24 },
    })
    if (!spread.ok) throw Error('router')
    expect(spread.value.points[0]).toEqual([0, 126])
    expect(spread.value.points).not.toEqual(low.value.points)
  })

  it('T37.1 a self-loop leaves the node and returns without crossing it', () => {
    const node = { x: 100, y: 100, w: 100, h: 60 }
    const result = routeOrthogonal({
      from: { x: 200, y: 130 },
      to: { x: 200, y: 160 },
      obstacles: [node],
      fromSide: 'right',
      toSide: 'right',
    })
    if (!result.ok) throw Error(JSON.stringify(result.diagnostics))
    for (const [x, y] of result.value.points) {
      const inside = x >= 88 && x <= 212 && y >= 88 && y <= 172
      expect(inside).toBe(false)
    }
  })

  it('T37.1 an enclosed target reports impossible without a crossing route', () => {
    const walls = [
      { x: 100, y: 100, w: 300, h: 20 },
      { x: 100, y: 180, w: 300, h: 20 },
      { x: 100, y: 100, w: 20, h: 100 },
      { x: 380, y: 100, w: 20, h: 100 },
    ]
    const result = routeOrthogonal({
      from: { x: 0, y: 150 },
      to: { x: 200, y: 150 },
      obstacles: walls,
    })
    expect(result.ok).toBe(false)
    expect(result.diagnostics.some((d) => d.code === 'router.impossible')).toBe(true)
  })

  it('T37.1 respects the bend budget instead of claiming a valid route', () => {
    const result = routeOrthogonal({
      from: { x: 0, y: 150 },
      to: { x: 400, y: 150 },
      obstacles: [wall],
      maxBends: 1,
    })
    // Any detour around the wall needs at least two bends (leave, cross, return).
    expect(result.ok).toBe(false)
    expect(result.diagnostics.some((d) => d.code === 'router.bends')).toBe(true)
  })
})
