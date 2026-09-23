import { describe, expect, it } from 'vitest'
import { pinchViewport } from '../src/geometry/pinch'
import { screenToWorld } from '../src/editor-core'

describe('two-pointer navigation', () => {
  it('scales around the initial world midpoint while translating with the new midpoint', () => {
    const start = [
      { x: 10, y: 30 },
      { x: 110, y: 30 },
    ] as const
    const end = [
      { x: 30, y: 70 },
      { x: 230, y: 70 },
    ] as const
    const viewport = { x: -20, y: 10, zoom: 0.5 }
    const next = pinchViewport(start, end, viewport)
    expect(next.zoom).toBe(1)
    expect(screenToWorld({ x: 130, y: 70 }, next)).toEqual(
      screenToWorld({ x: 60, y: 30 }, viewport),
    )
  })
  it('clamps zoom and never produces invalid coordinates for coincident touches', () => {
    const same = [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ] as const
    const wide = [
      { x: -100, y: 0 },
      { x: 100, y: 0 },
    ] as const
    const viewport = { x: 0, y: 0, zoom: 1 }
    expect(pinchViewport(same, wide, viewport)).toEqual(viewport)
    expect(pinchViewport(wide, same, viewport).zoom).toBe(0.1)
    expect(
      pinchViewport(
        [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ],
        wide,
        viewport,
      ).zoom,
    ).toBe(4)
  })
})
