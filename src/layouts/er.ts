// ER / data model layout: entities as tables (header + typed field rows) in a
// grid, with straight labelled relations between them.

import type { ErDiagramSpec, TableField } from '../types'
import { CANVAS_W, CARD_W } from '../theme'
import {
  edgeId,
  labelPillWidth,
  type DiagramLayout,
  type PlacedEdge,
  type PlacedNode,
} from '../layout'

const TABLE_W = 240
const HEADER_H = 30
const ROW_H = 22
const GRID_GAP_X = 72
const GRID_GAP_Y = 48
const MARGIN = 80
const BOTTOM_PAD = 56
const COLS = 3

const tableHeight = (fields: TableField[]): number => HEADER_H + fields.length * ROW_H + 8

export function layoutEr(spec: ErDiagramSpec): DiagramLayout {
  const cols = Math.min(COLS, Math.max(1, spec.entities.length))
  const rows = Math.ceil(spec.entities.length / cols)

  let width = CANVAS_W
  const height = MARGIN + rows * (CARD_W + GRID_GAP_Y) + BOTTOM_PAD
  const xFor = (col: number): number => MARGIN + col * (TABLE_W + GRID_GAP_X)
  const yFor = (row: number): number => MARGIN + row * (CARD_W + GRID_GAP_Y)

  const lastCol = Math.min(cols - 1, spec.entities.length - 1)
  const rightEdge = xFor(lastCol) + TABLE_W
  width = Math.max(width, rightEdge + MARGIN)

  const nodes: PlacedNode[] = []
  const nodeById: Record<string, PlacedNode> = {}

  spec.entities.forEach((entity, index) => {
    const col = index % cols
    const row = Math.floor(index / cols)
    const h = tableHeight(entity.fields)
    const x = xFor(col)
    const y = yFor(row)
    const placed: PlacedNode = {
      id: entity.id,
      label: entity.label,
      description: entity.kind ? `${entity.kind}: ${entity.label}` : entity.label,
      kind: entity.kind,
      weight: entity.weight,
      fields: entity.fields,
      band: row,
      w: TABLE_W,
      h,
      x,
      y,
      cx: x + TABLE_W / 2,
      cy: y + h / 2,
      shape: 'table',
    }
    nodes.push(placed)
    nodeById[placed.id] = placed
  })

  const edges: PlacedEdge[] = []
  for (const relation of spec.relations) {
    const from = nodeById[relation.from]
    const to = nodeById[relation.to]
    if (!from || !to) continue

    const variant = relation.variant ?? 'main'
    const labelWidth = relation.label ? labelPillWidth(relation.label) : 0
    const startX = from.x + from.w
    const startY = from.y + HEADER_H
    const endX = to.x
    const endY = to.y + HEADER_H

    edges.push({
      ...relation,
      id: edgeId(relation),
      variant,
      d: `M ${startX} ${startY} L ${endX} ${endY}`,
      labelX: (startX + endX) / 2,
      labelY: (startY + endY) / 2,
      labelWidth,
      startX,
      startY,
      endX,
      endY,
      fromSide: 'right',
      toSide: 'left',
    })
  }

  return { width, height, nodes, edges, decisions: [], continuations: [], nodeById }
}
