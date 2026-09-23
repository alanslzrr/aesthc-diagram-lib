import type { Point, Rect, Size, Viewport } from './types'
function finite(...values: number[]) {
  if (!values.every(Number.isFinite)) throw new RangeError('Coordinates must be finite')
}
function valid(viewport: Viewport) {
  finite(viewport.x, viewport.y, viewport.zoom)
  if (viewport.zoom <= 0) throw new RangeError('Zoom must be positive')
}
export function screenToWorld(point: Point, viewport: Viewport): Point {
  valid(viewport)
  finite(point.x, point.y)
  return { x: (point.x - viewport.x) / viewport.zoom, y: (point.y - viewport.y) / viewport.zoom }
}
export function worldToScreen(point: Point, viewport: Viewport): Point {
  valid(viewport)
  finite(point.x, point.y)
  return { x: point.x * viewport.zoom + viewport.x, y: point.y * viewport.zoom + viewport.y }
}
export function zoomAt(point: Point, nextZoom: number, viewport: Viewport): Viewport {
  finite(nextZoom)
  const world = screenToWorld(point, viewport),
    zoom = Math.max(0.1, Math.min(4, nextZoom))
  return { x: point.x - world.x * zoom, y: point.y - world.y * zoom, zoom }
}
export function fitViewport(bounds: Rect, size: Size, padding: number): Viewport {
  finite(bounds.x, bounds.y, bounds.width, bounds.height, size.width, size.height, padding)
  if (bounds.width < 0 || bounds.height < 0 || size.width <= 0 || size.height <= 0 || padding < 0)
    throw new RangeError('Invalid fit bounds')
  const zoom = Math.max(
    0.1,
    Math.min(
      1,
      Math.max(1, size.width - padding * 2) / Math.max(1, bounds.width),
      Math.max(1, size.height - padding * 2) / Math.max(1, bounds.height),
    ),
  )
  return {
    x: size.width / 2 - (bounds.x + bounds.width / 2) * zoom,
    y: size.height / 2 - (bounds.y + bounds.height / 2) * zoom,
    zoom,
  }
}
