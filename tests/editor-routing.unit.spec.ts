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

function grows(obstacle: { x: number; y: number; w: number; h: number }, clearance = 12) {
  return {
    x: obstacle.x - clearance,
    y: obstacle.y - clearance,
    w: obstacle.w + clearance * 2,
    h: obstacle.h + clearance * 2,
  }
}
function segmentHits(
  from: [number, number],
  to: [number, number],
  rect: { x: number; y: number; w: number; h: number },
) {
  const minX = Math.min(from[0], to[0]),
    maxX = Math.max(from[0], to[0])
  const minY = Math.min(from[1], to[1]),
    maxY = Math.max(from[1], to[1])
  if (maxX < rect.x || minX > rect.x + rect.w || maxY < rect.y || minY > rect.y + rect.h)
    return false
  return true
}
function assertNoCrossing(
  points: Array<[number, number]>,
  obstacles: Array<{ x: number; y: number; w: number; h: number }>,
) {
  for (let i = 1; i < points.length; i++)
    for (const rect of obstacles) expect(segmentHits(points[i - 1], points[i], rect)).toBe(false)
}

describe('E23 audit regressions: router segments', () => {
  it('never returns a segment crossing an expanded obstacle', () => {
    const obstacle = { x: 209, y: 2, w: 54, h: 24 }
    const grown = [grows(obstacle)]
    const result = routeOrthogonal({
      from: { x: 216.5, y: 177 },
      to: { x: 216.5, y: -80 },
      obstacles: [obstacle],
    })
    if (result.ok) assertNoCrossing(result.value.points, grown)
    else
      expect(
        result.diagnostics.some((d) =>
          ['router.impossible', 'router.budget', 'router.bends'].includes(d.code),
        ),
      ).toBe(true)
  })

  it('regression: the margin jump never crosses an obstacle between adjacent axis lines', () => {
    // Reproduced before the axis sort + segment checks: the path jumped from
    // y=276 to the y=58 margin line across obstacle (399,98,111,70).
    const obstacles = [
      { x: 411, y: 110, w: 87, h: 46 },
      { x: 402, y: 137, w: 52, h: 127 },
    ]
    const result = routeOrthogonal({
      from: { x: 659, y: 174 },
      to: { x: 144, y: 257 },
      obstacles,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    assertNoCrossing(
      result.value.points,
      obstacles.map((obstacle) => grows(obstacle)),
    )
  })

  it('keeps every segment clear across mixed geometry', () => {
    const obstacles = [
      { x: 200, y: 0, w: 40, h: 300 },
      { x: 320, y: 120, w: 120, h: 40 },
      { x: 500, y: 40, w: 60, h: 260 },
    ]
    const grown = obstacles.map((obstacle) => grows(obstacle))
    for (const request of [
      { from: { x: 0, y: 150 }, to: { x: 700, y: 150 } },
      { from: { x: 0, y: 20 }, to: { x: 700, y: 400 } },
      { from: { x: 260, y: -100 }, to: { x: 260, y: 500 } },
    ]) {
      const result = routeOrthogonal({ ...request, obstacles })
      if (result.ok) assertNoCrossing(result.value.points, grown)
    }
  })
})
