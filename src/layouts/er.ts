// ER / data model layout: entities as tables (header + typed field rows) in a
// grid whose row heights follow the actual tables, with relations routed
// orthogonally through the column and row corridors — never across a table.

import type { ErDiagramSpec, TableField } from '../types'
import { LANE_R } from '../theme'
import {
  edgeId,
  labelPillWidth,
  roundedPolyline,
  type DiagramLayout,
  type PlacedEdge,
  type PlacedNode,
} from '../layout'

const TABLE_W = 240
/** Matches the canvas: 26u header band, 22u field rows, 10u foot pad. */
const HEADER_H = 26
const ROW_H = 22
const FOOT_PAD = 10
const GRID_GAP_X = 112
const GRID_GAP_Y = 88
const MARGIN_X = 72
const MARGIN_TOP = 64
const BOTTOM_PAD = 64
const COLS = 3

const tableHeight = (fields: TableField[]): number =>
  HEADER_H + fields.length * ROW_H + FOOT_PAD

export function layoutEr(spec: ErDiagramSpec): DiagramLayout {
  const cols = Math.min(COLS, Math.max(1, spec.entities.length))
  const rows = Math.ceil(spec.entities.length / cols)

  const rowHeights: number[] = []
  for (let row = 0; row < rows; row += 1) {
    const members = spec.entities.slice(row * cols, row * cols + cols)
    rowHeights.push(Math.max(...members.map((entity) => tableHeight(entity.fields))))
  }
  const rowTops: number[] = []
  let cursorY = MARGIN_TOP
  for (let row = 0; row < rows; row += 1) {
    rowTops.push(cursorY)
    cursorY += rowHeights[row] + GRID_GAP_Y
  }
  const height = cursorY - GRID_GAP_Y + BOTTOM_PAD

  const usedCols = Math.min(cols, spec.entities.length)
  const width = MARGIN_X * 2 + usedCols * TABLE_W + (usedCols - 1) * GRID_GAP_X
  const xFor = (col: number): number => MARGIN_X + col * (TABLE_W + GRID_GAP_X)

  const nodes: PlacedNode[] = []
  const nodeById: Record<string, PlacedNode> = {}
  const colOf = new Map<string, number>()
  const rowOf = new Map<string, number>()

  spec.entities.forEach((entity, index) => {
    const col = index % cols
    const row = Math.floor(index / cols)
    const h = tableHeight(entity.fields)
    const x = xFor(col)
    const y = rowTops[row]
    colOf.set(entity.id, col)
    rowOf.set(entity.id, row)
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

  /** Relations anchor at the header midline — a table-level statement. */
  const anchorY = (node: PlacedNode): number => node.y + HEADER_H / 2

  const edges: PlacedEdge[] = []
  for (const relation of spec.relations) {
    const from = nodeById[relation.from]
    const to = nodeById[relation.to]
    if (!from || !to) continue

    const variant = relation.variant ?? 'main'
    const labelWidth = relation.label ? labelPillWidth(relation.label) : 0
    const fromCol = colOf.get(relation.from) ?? 0
    const toCol = colOf.get(relation.to) ?? 0
    const fromRow = rowOf.get(relation.from) ?? 0
    const toRow = rowOf.get(relation.to) ?? 0

    let d: string
    let labelX: number
    let labelY: number
    let startX: number
    let startY: number
    let endX: number
    let endY: number
    let fromSide: PlacedEdge['fromSide']
    let toSide: PlacedEdge['toSide']
    let routePoints: Array<[number, number]> | undefined

    if (fromRow === toRow && Math.abs(fromCol - toCol) === 1) {
      // Neighbouring columns: direct bezier between header midlines.
      const rightward = toCol > fromCol
      startX = rightward ? from.x + from.w : from.x
      endX = rightward ? to.x : to.x + to.w
      startY = anchorY(from)
      endY = anchorY(to)
      const controlX = (startX + endX) / 2
      d = `M ${startX} ${startY} C ${controlX} ${startY}, ${controlX} ${endY}, ${endX} ${endY}`
      labelX = (startX + endX) / 2
      labelY = (startY + endY) / 2
      fromSide = rightward ? 'right' : 'left'
      toSide = rightward ? 'left' : 'right'
    } else if (fromRow === toRow) {
      // Same row, skipping columns: drop into the corridor below the row.
      const rightward = toCol > fromCol
      startX = rightward ? from.x + from.w : from.x
      endX = rightward ? to.x : to.x + to.w
      startY = anchorY(from)
      endY = anchorY(to)
      const corridorY = rowTops[fromRow] + rowHeights[fromRow] + GRID_GAP_Y / 2
      const gapA = rightward ? from.x + from.w + GRID_GAP_X / 2 : from.x - GRID_GAP_X / 2
      const gapB = rightward ? to.x - GRID_GAP_X / 2 : to.x + to.w + GRID_GAP_X / 2
      routePoints = [
        [startX, startY],
        [gapA, startY],
        [gapA, corridorY],
        [gapB, corridorY],
        [gapB, endY],
        [endX, endY],
      ]
      d = roundedPolyline(routePoints, LANE_R)
      labelX = (gapA + gapB) / 2
      labelY = corridorY
      fromSide = rightward ? 'right' : 'left'
      toSide = rightward ? 'left' : 'right'
    } else if (fromCol === toCol && Math.abs(fromRow - toRow) === 1) {
      // Neighbouring rows, same column: vertical bezier between facing edges.
      const movingDown = toRow > fromRow
      startX = from.cx
      endX = to.cx
      startY = movingDown ? from.y + from.h : from.y
      endY = movingDown ? to.y : to.y + to.h
      const controlY = Math.abs(endY - startY) * 0.5
      d = movingDown
        ? `M ${startX} ${startY} C ${startX} ${startY + controlY}, ${endX} ${endY - controlY}, ${endX} ${endY}`
        : `M ${startX} ${startY} C ${startX} ${startY - controlY}, ${endX} ${endY + controlY}, ${endX} ${endY}`
      labelX = (startX + endX) / 2
      labelY = (startY + endY) / 2
      fromSide = movingDown ? 'bottom' : 'top'
      toSide = movingDown ? 'top' : 'bottom'
    } else {
      // Any other pair routes through the corridors, which are clear by
      // construction: the shared column gap when the columns are neighbours
      // (or equal), otherwise gap → row corridor → gap.
      const colDelta = toCol - fromCol
      startY = anchorY(from)
      endY = anchorY(to)

      if (Math.abs(colDelta) <= 1) {
        const gapX =
          colDelta === 0
            ? fromCol < usedCols - 1
              ? xFor(fromCol) + TABLE_W + GRID_GAP_X / 2
              : xFor(fromCol) - GRID_GAP_X / 2
            : Math.max(xFor(fromCol), xFor(toCol)) - GRID_GAP_X / 2
        startX = gapX > from.cx ? from.x + from.w : from.x
        endX = gapX > to.cx ? to.x + to.w : to.x
        routePoints = [
          [startX, startY],
          [gapX, startY],
          [gapX, endY],
          [endX, endY],
        ]
        labelX = gapX
        labelY = (startY + endY) / 2
      } else {
        const rightward = colDelta > 0
        const gapA = rightward
          ? xFor(fromCol) + TABLE_W + GRID_GAP_X / 2
          : xFor(fromCol) - GRID_GAP_X / 2
        const gapB = rightward
          ? xFor(toCol) - GRID_GAP_X / 2
          : xFor(toCol) + TABLE_W + GRID_GAP_X / 2
        const corridorRow = Math.min(fromRow, toRow)
        const corridorY = rowTops[corridorRow] + rowHeights[corridorRow] + GRID_GAP_Y / 2
        startX = rightward ? from.x + from.w : from.x
        endX = rightward ? to.x : to.x + to.w
        routePoints = [
          [startX, startY],
          [gapA, startY],
          [gapA, corridorY],
          [gapB, corridorY],
          [gapB, endY],
          [endX, endY],
        ]
        labelX = (gapA + gapB) / 2
        labelY = corridorY
      }

      d = roundedPolyline(routePoints, LANE_R)
      fromSide = startX > from.cx ? 'right' : 'left'
      toSide = endX > to.cx ? 'right' : 'left'
    }

    edges.push({
      ...relation,
      id: edgeId(relation),
      variant,
      d,
      labelX,
      labelY,
      labelWidth,
      startX,
      startY,
      endX,
      endY,
      fromSide,
      toSide,
      routePoints,
    })
  }

  return { width, height, nodes, edges, decisions: [], continuations: [], nodeById }
}
