import { describe, expect, it } from 'vitest'
import { fitViewport, screenToWorld, worldToScreen, zoomAt } from '../src/editor-core'
import cases from './fixtures/editor/viewport-cases.json'

describe('pure viewport math', () => {
  it('T07.1 maps coordinates and inverts the transform', () => {
    const { screen, world, viewport } = cases.screenToWorld
    expect(screenToWorld(screen, viewport)).toEqual(world)
    expect(worldToScreen(world, viewport)).toEqual(screen)
    for (const zoom of [0.1, 0.5, 1, 2, 4]) {
      const point = { x: -71.25, y: 950.5 }
      const transform = { x: 10, y: -13, zoom }
      const actual = screenToWorld(worldToScreen(point, transform), transform)
      expect(actual.x).toBeCloseTo(point.x, 8)
      expect(actual.y).toBeCloseTo(point.y, 8)
    }
  })

  it('T07.1 retains the cursor world anchor when changing zoom', () => {
    const { point, zoom, viewport, expected } = cases.zoomAt
    const next = zoomAt(point, zoom, viewport)
    expect(next).toEqual(expected)
    expect(screenToWorld(point, next)).toEqual(screenToWorld(point, viewport))
  })

  it('T07.1 fits negative bounds without upscaling past 100 percent', () => {
    const { bounds, size, padding, expected } = cases.fit
    expect(fitViewport(bounds, size, padding)).toEqual(expected)
  })
})
