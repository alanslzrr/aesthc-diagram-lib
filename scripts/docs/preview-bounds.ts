import type { DiagramLayout } from '@aesthc/diagram-lib'

/** Fit documentation to visible geometry, not unused layout margins.
 * Bezier control points conservatively contain each curve; unsupported path
 * commands retain the complete artboard rather than risking clipped content.
 */
export function previewBounds(layout: DiagramLayout) {
  const points: Array<[number, number]> = []
  const add = (x: number, y: number) => points.push([x, y])
  const number = /-?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi
  const paths = [...layout.edges, ...layout.continuations]
  if (paths.some(({ d }) => /[^MLCQZ\s,]/.test(d.replace(number, ''))))
    return { x: 0, y: 0, width: layout.width, height: layout.height }
  for (const node of layout.nodes) {
    add(node.x, node.y - (node.shape === 'event' ? 36 : 0))
    add(node.x + node.w, node.y + node.h)
    add(node.cx, node.cy)
  }
  for (const container of layout.containers ?? []) {
    add(container.x, container.y)
    add(container.x + container.w, container.y + container.h)
  }
  for (const line of layout.lifelines ?? []) {
    add(line.x, line.y0)
    add(line.x, line.y1)
  }
  for (const path of paths) {
    const values = Array.from(path.d.matchAll(number), ([value]) => Number(value))
    if (values.length % 2) return { x: 0, y: 0, width: layout.width, height: layout.height }
    for (let i = 0; i < values.length; i += 2) add(values[i], values[i + 1])
    if (path.labelWidth) {
      add(path.labelX - path.labelWidth / 2 - 8, path.labelY - 16)
      add(path.labelX + path.labelWidth / 2 + 8, path.labelY + 16)
    }
  }
  for (const decision of layout.decisions) {
    add(decision.x, decision.y)
    add(decision.x + decision.width, decision.y + 24)
  }
  // Timeline's spine extends beyond its event centres.
  const events = layout.nodes.filter((node) => node.shape === 'event')
  if (events.length) {
    add(Math.min(...events.map((node) => node.cx)) - 48, events[0].cy)
    add(Math.max(...events.map((node) => node.cx)) + 48, events[0].cy)
  }
  if (!points.length) return { x: 0, y: 0, width: layout.width, height: layout.height }
  const x = Math.floor(Math.min(...points.map(([x]) => x)) - 32)
  const y = Math.floor(Math.min(...points.map(([, y]) => y)) - 32)
  return {
    x,
    y,
    width: Math.ceil(Math.max(...points.map(([x]) => x)) + 32) - x,
    height: Math.ceil(Math.max(...points.map(([, y]) => y)) + 32) - y,
  }
}
