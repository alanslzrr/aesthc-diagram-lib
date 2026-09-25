import type { Result } from './types'
import { failure, success } from './data'

export interface RouteObstacle {
  x: number
  y: number
  w: number
  h: number
}
export interface OrthogonalRouteRequest {
  from: { x: number; y: number }
  to: { x: number; y: number }
  obstacles: RouteObstacle[]
  /** Expansion around every obstacle; default 12. */
  clearance?: number
  /** Hard bend budget; default 24. */
  maxBends?: number
  /** Bounded state budget; default 20000. */
  maxStates?: number
  /** Perpendicular stub leaving the anchor; default 16. */
  stub?: number
  /** Anchor direction used to emit the initial stub. */
  fromSide?: 'left' | 'right' | 'top' | 'bottom'
  toSide?: 'left' | 'right' | 'top' | 'bottom'
}
export interface RoutedPath {
  points: Array<[number, number]>
  bends: number
  states: number
  clearance: number
}
/**
 * Bounded deterministic orthogonal A* router over an expanded corridor graph.
 * Obstacles are grown by `clearance`; candidate corners are the expanded
 * obstacle edges plus the stubbed anchors. Tie-breaking is stable (lower cost,
 * lower heuristic, then coordinate order), so the same request always yields
 * the same path. An exhausted budget reports `router.budget` and an enclosed
 * target `router.impossible`; the receipt never claims a crossing route.
 */
export function routeOrthogonal(request: OrthogonalRouteRequest): Result<RoutedPath> {
  const clearance = request.clearance ?? 12
  const maxBends = request.maxBends ?? 24
  const maxStates = request.maxStates ?? 20000
  const stub = request.stub ?? 16
  const grow = (o: RouteObstacle) => ({
    x: o.x - clearance,
    y: o.y - clearance,
    w: o.w + clearance * 2,
    h: o.h + clearance * 2,
  })
  const obstacles = request.obstacles.map(grow)
  const stubbed = (point: { x: number; y: number }, side?: string) => {
    if (side === 'left') return { x: point.x - stub, y: point.y }
    if (side === 'right') return { x: point.x + stub, y: point.y }
    if (side === 'top') return { x: point.x, y: point.y - stub }
    if (side === 'bottom') return { x: point.x, y: point.y + stub }
    return { ...point }
  }
  const start = stubbed(request.from, request.fromSide)
  const goal = stubbed(request.to, request.toSide)
  const inside = (x: number, y: number) =>
    obstacles.some((o) => x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h)
  if (inside(start.x, start.y) || inside(goal.x, goal.y)) return failure('router.budget')
  const xs = [...new Set([start.x, goal.x, ...obstacles.flatMap((o) => [o.x, o.x + o.w])])].sort(
    (a, b) => a - b,
  )
  const ys = [...new Set([start.y, goal.y, ...obstacles.flatMap((o) => [o.y, o.y + o.h])])].sort(
    (a, b) => a - b,
  )
  // Midpoint lines keep every free corridor reachable: two adjacent obstacle
  // edges would otherwise block the grid row between them. A margin extends
  // the grid past the obstacle extents so detours can leave the scene bounds.
  // Margins are re-sorted into the axis: an unordered axis makes index-adjacent
  // coordinates jump across obstacles.
  const margin = clearance * 2 + stub
  const withMidpoints = (values: number[]) => {
    const result: number[] = []
    for (let i = 0; i < values.length; i++) {
      result.push(values[i])
      if (i + 1 < values.length && values[i + 1] > values[i])
        result.push((values[i] + values[i + 1]) / 2)
    }
    result.push(values[0] - margin, values[values.length - 1] + margin)
    return result.sort((a, b) => a - b)
  }
  const axisX = withMidpoints(xs)
  const axisY = withMidpoints(ys)
  const xi = new Map(axisX.map((value, index) => [value, index]))
  const yi = new Map(axisY.map((value, index) => [value, index]))
  const startIndex = [xi.get(start.x)!, yi.get(start.y)!] as [number, number]
  const goalIndex = [xi.get(goal.x)!, yi.get(goal.y)!] as [number, number]
  const key = (x: number, y: number) => x * axisY.length + y
  const node = (index: number): [number, number] => [
    Math.floor(index / axisY.length),
    index % axisY.length,
  ]
  const reachable = (x: number, y: number) => !inside(axisX[x], axisY[y])
  /** Axis-aligned segment vs grown obstacles: the whole segment must stay
   * clear, not only its endpoints. Boundary contact counts as blocked, matching
   * the point test. */
  const segmentClear = (ax: number, ay: number, bx: number, by: number) => {
    const minX = Math.min(ax, bx),
      maxX = Math.max(ax, bx),
      minY = Math.min(ay, by),
      maxY = Math.max(ay, by)
    for (const obstacle of obstacles) {
      if (maxX < obstacle.x || minX > obstacle.x + obstacle.w) continue
      if (maxY < obstacle.y || minY > obstacle.y + obstacle.h) continue
      return false
    }
    return true
  }
  const goalKey = key(goalIndex[0], goalIndex[1])
  const startKey = key(startIndex[0], startIndex[1])
  const g = new Map<number, number>([[startKey, 0]])
  const came = new Map<number, [number, string]>()
  const open = new Map<number, number>([[startKey, 0]])
  const closed = new Set<number>()
  const previousDirection = new Map<number, string>()
  const neighborsOf = (x: number, y: number): Array<[number, number, string]> => {
    const result: Array<[number, number, string]> = []
    const connects = (nx: number, ny: number) =>
      reachable(nx, ny) && segmentClear(axisX[x], axisY[y], axisX[nx], axisY[ny])
    if (x + 1 < axisX.length && connects(x + 1, y)) result.push([x + 1, y, 'h'])
    if (x - 1 >= 0 && connects(x - 1, y)) result.push([x - 1, y, 'h'])
    if (y + 1 < axisY.length && connects(x, y + 1)) result.push([x, y + 1, 'v'])
    if (y - 1 >= 0 && connects(x, y - 1)) result.push([x, y - 1, 'v'])
    return result
  }
  const heuristic = (x: number, y: number) =>
    Math.abs(axisX[x] - axisX[goalIndex[0]]) + Math.abs(axisY[y] - axisY[goalIndex[1]])
  let states = 0
  let settled = startKey
  while (open.size > 0 && states < maxStates) {
    const current = [...open.entries()].sort((a, b) => a[1] - b[1] || a[0] - b[0])[0]
    const [currentKey] = current
    open.delete(currentKey)
    closed.add(currentKey)
    states += 1
    if (currentKey === goalKey) {
      settled = currentKey
      break
    }
    const [cx, cy] = node(currentKey)
    for (const [nx, ny, direction] of neighborsOf(cx, cy)) {
      const neighbor = key(nx, ny)
      if (closed.has(neighbor)) continue
      const step = Math.abs(axisX[nx] - axisX[cx]) + Math.abs(axisY[ny] - axisY[cy])
      const previous = previousDirection.get(currentKey)
      const bendCost = previous !== undefined && previous !== direction ? 96 : 0
      const tentative = g.get(currentKey)! + step + bendCost
      const existing = open.get(neighbor)
      if (existing === undefined || tentative < g.get(neighbor)!) {
        g.set(neighbor, tentative)
        open.set(neighbor, tentative + heuristic(nx, ny))
        came.set(neighbor, [currentKey, direction])
        previousDirection.set(neighbor, direction)
      }
    }
  }
  if (settled !== goalKey) {
    const impossible = closed.size > 0 && open.size === 0
    return failure(impossible ? 'router.impossible' : 'router.budget')
  }
  const points: Array<[number, number]> = []
  let cursor = goalKey
  const directions: string[] = []
  while (cursor !== startKey) {
    const [previous, direction] = came.get(cursor)!
    const [px, py] = node(cursor)
    points.push([axisX[px], axisY[py]])
    directions.push(direction)
    cursor = previous
  }
  const [sx, sy] = node(startKey)
  points.push([axisX[sx], axisY[sy]])
  points.reverse()
  directions.reverse()
  let bends = 0
  for (let i = 1; i < directions.length; i++) if (directions[i] !== directions[i - 1]) bends += 1
  if (bends > maxBends) return failure('router.bends')
  return success({ points, bends, states, clearance })
}
