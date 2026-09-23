import { describe, expect, it } from 'vitest'
import { arrangeRects } from '../src/geometry/arrange'
const nodes = [
  { id: 'a', x: 0, y: 0, width: 100, height: 50 },
  { id: 'b', x: 200, y: 100, width: 50, height: 100 },
  { id: 'c', x: 400, y: 300, width: 100, height: 50 },
]
describe('selection arrangement', () => {
  it('aligns all six bounds/center variants without resizing or mutating input', () => {
    const before = JSON.stringify(nodes)
    expect(arrangeRects(nodes, 'left').b).toEqual({ x: 0, y: 100 })
    expect(arrangeRects(nodes, 'right').b).toEqual({ x: 450, y: 100 })
    expect(arrangeRects(nodes, 'top').b).toEqual({ x: 200, y: 0 })
    expect(arrangeRects(nodes, 'bottom').b).toEqual({ x: 200, y: 250 })
    expect(arrangeRects(nodes, 'center-x').b).toEqual({ x: 225, y: 100 })
    expect(arrangeRects(nodes, 'center-y').b).toEqual({ x: 200, y: 125 })
    expect(JSON.stringify(nodes)).toBe(before)
  })
  it('distributes equal gaps while keeping first/last endpoints and authored tie order', () => {
    expect(arrangeRects(nodes, 'horizontal')).toEqual({
      a: { x: 0, y: 0 },
      b: { x: 225, y: 100 },
      c: { x: 400, y: 300 },
    })
    expect(arrangeRects(nodes, 'vertical').b).toEqual({ x: 200, y: 125 })
    expect(arrangeRects(nodes.slice(0, 2), 'horizontal')).toEqual({})
    expect(arrangeRects(nodes.slice(0, 1), 'left')).toEqual({})
  })
})
