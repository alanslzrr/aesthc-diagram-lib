import { describe, expect, it } from 'vitest'
import { marqueeBounds, intersectsMarquee } from '../src/geometry/selection'

describe('marquee geometry', () => {
  it('normalizes a reverse drag in world coordinates', () => {
    expect(marqueeBounds({ x: 80, y: 90 }, { x: -20, y: 10 })).toEqual({
      x: -20,
      y: 10,
      width: 100,
      height: 80,
    })
  })
  it('selects partial overlap, but not disjoint or merely touching rectangles', () => {
    const box = { x: 0, y: 0, width: 100, height: 100 }
    expect(intersectsMarquee(box, { x: 90, y: 90, width: 20, height: 20 })).toBe(true)
    expect(intersectsMarquee(box, { x: 100, y: 20, width: 20, height: 20 })).toBe(false)
    expect(intersectsMarquee(box, { x: 120, y: 20, width: 20, height: 20 })).toBe(false)
    expect(intersectsMarquee(box, { x: 20, y: 20, width: 0, height: 0 })).toBe(false)
  })
})
