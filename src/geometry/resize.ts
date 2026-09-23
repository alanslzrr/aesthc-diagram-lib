import type { Point, Rect } from '../editor-core/types'

export type ResizeDirection = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw'
export const RESIZE_HANDLES = [
  { direction: 'nw', x: 0, y: 0, cursor: 'nwse-resize', en: 'top left', es: 'superior izquierdo' },
  { direction: 'n', x: 0.5, y: 0, cursor: 'ns-resize', en: 'top', es: 'superior' },
  { direction: 'ne', x: 1, y: 0, cursor: 'nesw-resize', en: 'top right', es: 'superior derecho' },
  { direction: 'e', x: 1, y: 0.5, cursor: 'ew-resize', en: 'right', es: 'derecho' },
  { direction: 's', x: 0.5, y: 1, cursor: 'ns-resize', en: 'bottom', es: 'inferior' },
  {
    direction: 'sw',
    x: 0,
    y: 1,
    cursor: 'nesw-resize',
    en: 'bottom left',
    es: 'inferior izquierdo',
  },
  { direction: 'w', x: 0, y: 0.5, cursor: 'ew-resize', en: 'left', es: 'izquierdo' },
  {
    direction: 'se',
    x: 1,
    y: 1,
    cursor: 'nwse-resize',
    en: 'bottom right',
    es: 'inferior derecho',
  },
] as const

/** Deltas are world-space. Clamp dimensions before deriving the anchored origin. */
export function resizeRect(
  initial: Rect,
  direction: ResizeDirection,
  delta: Point,
  gridSize?: number,
): Rect {
  const dimension = (value: number, minimum: number) =>
    Math.max(minimum, Math.min(4096, gridSize ? Math.round(value / gridSize) * gridSize : value))
  const west = direction.includes('w'),
    east = direction.includes('e'),
    north = direction.includes('n'),
    south = direction.includes('s')
  const width =
    west || east ? dimension(initial.width + (west ? -delta.x : delta.x), 96) : initial.width
  const height =
    north || south ? dimension(initial.height + (north ? -delta.y : delta.y), 48) : initial.height
  return {
    x: west ? initial.x + initial.width - width : initial.x,
    y: north ? initial.y + initial.height - height : initial.y,
    width,
    height,
  }
}

/** Smallest axis-aligned rectangle that contains every input rect. */
export function rectsUnion(rects: Rect[]): Rect {
  if (!rects.length) return { x: 0, y: 0, width: 0, height: 0 }
  const x = Math.min(...rects.map((r) => r.x)),
    y = Math.min(...rects.map((r) => r.y))
  const right = Math.max(...rects.map((r) => r.x + r.width)),
    bottom = Math.max(...rects.map((r) => r.y + r.height))
  return { x, y, width: right - x, height: bottom - y }
}

/**
 * Resize a whole selection from one anchored edge or corner. The group bounds
 * are resized and clamped like a single rect; every member scales
 * proportionally from the group origin, so the union always matches the
 * resized group. Members are rounded to whole pixels to avoid float drift.
 */
export function resizeRects(
  rects: Rect[],
  direction: ResizeDirection,
  delta: Point,
  gridSize?: number,
): Rect[] {
  if (!rects.length) return []
  if (rects.length === 1) return [resizeRect(rects[0], direction, delta, gridSize)]
  const group = rectsUnion(rects),
    resized = resizeRect(group, direction, delta, gridSize)
  const sx = group.width ? resized.width / group.width : 1,
    sy = group.height ? resized.height / group.height : 1
  return rects.map((rect) => ({
    x: Math.round(resized.x + (rect.x - group.x) * sx),
    y: Math.round(resized.y + (rect.y - group.y) * sy),
    width: Math.round(rect.width * sx),
    height: Math.round(rect.height * sy),
  }))
}
