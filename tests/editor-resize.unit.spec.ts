import { describe, expect, it } from 'vitest'
import { resizeRect, RESIZE_HANDLES } from '../src/geometry/resize'

describe('directional resizing', () => {
  const rect = { x: -100, y: -50, width: 200, height: 100 }
  it('provides all eight unique handles', () => {
    expect(new Set(RESIZE_HANDLES.map((h) => h.direction)).size).toBe(8)
  })
  it.each([
    ['n', { x: -100, y: -40, width: 200, height: 90 }],
    ['ne', { x: -100, y: -40, width: 220, height: 90 }],
    ['e', { x: -100, y: -50, width: 220, height: 100 }],
    ['se', { x: -100, y: -50, width: 220, height: 110 }],
    ['s', { x: -100, y: -50, width: 200, height: 110 }],
    ['sw', { x: -80, y: -50, width: 180, height: 110 }],
    ['w', { x: -80, y: -50, width: 180, height: 100 }],
    ['nw', { x: -80, y: -40, width: 180, height: 90 }],
  ] as const)('resizes %s and preserves the opposite edge', (direction, expected) => {
    expect(resizeRect(rect, direction, { x: 20, y: 10 })).toEqual(expected)
    expect(rect).toEqual({ x: -100, y: -50, width: 200, height: 100 })
  })
  it('clamps without flipping and keeps opposite edges fixed', () => {
    expect(resizeRect(rect, 'nw', { x: 9999, y: 9999 })).toEqual({
      x: 4,
      y: 2,
      width: 96,
      height: 48,
    })
    expect(resizeRect(rect, 'nw', { x: -9999, y: -9999 })).toEqual({
      x: -3996,
      y: -4046,
      width: 4096,
      height: 4096,
    })
  })
  it('snaps only affected dimensions and derives positions from the clamped size', () => {
    expect(resizeRect(rect, 'w', { x: 11, y: 50 }, 16)).toEqual({
      x: -92,
      y: -50,
      width: 192,
      height: 100,
    })
  })
})
