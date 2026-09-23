import type { Point, Rect } from '../editor-core/types'
export type Arrangement =
  'left' | 'right' | 'top' | 'bottom' | 'center-x' | 'center-y' | 'horizontal' | 'vertical'
/** Equal-gap distribution preserves the first/last authored rectangles along the chosen axis. */
export function arrangeRects(
  nodes: readonly (Rect & { id: string })[],
  mode: Arrangement,
): Record<string, Point> {
  const distribution = mode === 'horizontal' || mode === 'vertical'
  if (nodes.length < (distribution ? 3 : 2)) return {}
  const positions = Object.fromEntries(nodes.map((n) => [n.id, { x: n.x, y: n.y }]))
  if (distribution) {
    const horizontal = mode === 'horizontal',
      axis = horizontal ? 'x' : 'y',
      size = horizontal ? 'width' : 'height'
    const ordered = [...nodes].sort((a, b) => a[axis] - b[axis])
    const first = ordered[0],
      last = ordered[ordered.length - 1]
    const gap =
      (last[axis] + last[size] - first[axis] - ordered.reduce((sum, n) => sum + n[size], 0)) /
      (ordered.length - 1)
    let cursor = first[axis]
    for (const n of ordered) {
      positions[n.id][axis] = cursor
      cursor += n[size] + gap
    }
    positions[last.id][axis] = last[axis]
  } else {
    const left = Math.min(...nodes.map((n) => n.x)),
      top = Math.min(...nodes.map((n) => n.y))
    const right = Math.max(...nodes.map((n) => n.x + n.width)),
      bottom = Math.max(...nodes.map((n) => n.y + n.height))
    for (const n of nodes) {
      if (mode === 'left') positions[n.id].x = left
      else if (mode === 'right') positions[n.id].x = right - n.width
      else if (mode === 'center-x') positions[n.id].x = (left + right - n.width) / 2
      else if (mode === 'top') positions[n.id].y = top
      else if (mode === 'bottom') positions[n.id].y = bottom - n.height
      else positions[n.id].y = (top + bottom - n.height) / 2
    }
  }
  return positions
}
