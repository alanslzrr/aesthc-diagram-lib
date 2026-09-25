import { describe, expect, it } from 'vitest'
import { rectsUnion, resizeRect, resizeRects, RESIZE_HANDLES } from '../src/geometry/resize'

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

describe('selection resizing', () => {
  const selection = [
    { x: 0, y: 0, width: 200, height: 100 },
    { x: 240, y: 120, width: 160, height: 80 },
  ]
  it('unions member rectangles without mutating inputs', () => {
    expect(rectsUnion(selection)).toEqual({ x: 0, y: 0, width: 400, height: 200 })
  })
  it('scales every member proportionally from the anchored group edge', () => {
    const resized = resizeRects(selection, 'se', { x: 200, y: 100 })
    expect(resized).toEqual([
      { x: 0, y: 0, width: 300, height: 150 },
      { x: 360, y: 180, width: 240, height: 120 },
    ])
    expect(selection[0]).toEqual({ x: 0, y: 0, width: 200, height: 100 })
  })
  it('keeps the opposite group edge fixed for west and north anchors', () => {
    const resized = resizeRects(selection, 'nw', { x: 100, y: 50 })
    const group = rectsUnion(resized)
    expect(group.x).toBe(100)
    expect(group.y).toBe(50)
    expect(group.x + group.width).toBe(400)
    expect(group.y + group.height).toBe(200)
  })
  it('clamps the group like single resize and never flips members', () => {
    const resized = resizeRects(selection, 'nw', { x: 9999, y: 9999 })
    expect(rectsUnion(resized)).toEqual({ x: 304, y: 152, width: 96, height: 48 })
    for (const member of resized) {
      expect(member.width).toBeGreaterThan(0)
      expect(member.height).toBeGreaterThan(0)
    }
  })
  it('delegates single selections to the anchored single-resize path', () => {
    expect(resizeRects([selection[0]], 'e', { x: 20, y: 10 })).toEqual([
      { x: 0, y: 0, width: 220, height: 100 },
    ])
  })
})
