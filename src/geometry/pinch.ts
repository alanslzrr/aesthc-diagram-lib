import type { Point, Viewport } from '../editor-core/types'
import { screenToWorld } from '../editor-core/viewport'
type Pair = readonly [Point, Point]
const midpoint = (points: Pair): Point => ({
  x: (points[0].x + points[1].x) / 2,
  y: (points[0].y + points[1].y) / 2,
})
const distance = (points: Pair) => Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)
export function pinchViewport(start: Pair, current: Pair, viewport: Viewport): Viewport {
  const initialDistance = distance(start)
  if (initialDistance < 1) return { ...viewport }
  const world = screenToWorld(midpoint(start), viewport)
  const zoom = Math.max(0.1, Math.min(4, (viewport.zoom * distance(current)) / initialDistance))
  const center = midpoint(current)
  return { x: center.x - world.x * zoom, y: center.y - world.y * zoom, zoom }
}
