import { describe, expect, it } from 'vitest'
import { layoutDiagram } from '../src/layouts'
import { previewBounds } from '../src/canvas/bounds'
import { renderSvg } from '../src/render'
import { resolveDocument, createDocument } from '../src/editor-core'
import { SWIMLANE_HEADER_W, SWIMLANE_PAD, TIMELINE_EVENT_GAP } from '../src/theme'
import type { DiagramLayout } from '../src/layout'
import type { SwimlaneDiagramSpec, TimelineDiagramSpec } from '../src/types'

interface ExportedRect {
  x: number
  y: number
  width: number
  height: number
}

/** Geometry parsed back from a rendered SVG, keyed by authored entity id. */
function exportGeometry(markup: string) {
  const nodes: Record<string, ExportedRect> = {}
  for (const match of markup.matchAll(
    /<g data-node-id="([^"]+)"[^>]*><title>[^<]*<\/title><desc>[^<]*<\/desc><rect data-node-surface="true" x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"/g,
  ))
    nodes[match[1]] = {
      x: Number(match[2]),
      y: Number(match[3]),
      width: Number(match[4]),
      height: Number(match[5]),
    }
  const containers: Record<string, ExportedRect> = {}
  for (const match of markup.matchAll(
    /<g data-container-id="([^"]+)"><rect x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"/g,
  ))
    containers[match[1]] = {
      x: Number(match[2]),
      y: Number(match[3]),
      width: Number(match[4]),
      height: Number(match[5]),
    }
  const edges: Record<string, string> = {}
  for (const match of markup.matchAll(/<g data-edge-id="([^"]+)"[^>]*><path d="([^"]+)"/g))
    edges[match[1]] = match[2]
  return { nodes, containers, edges }
}

/** Compare node, container and route geometry between a layout and its SVG. */
function expectExportParity(layout: DiagramLayout, markup: string) {
  const exported = exportGeometry(markup)
  for (const node of layout.nodes)
    expect(exported.nodes[node.id], `node ${node.id}`).toEqual({
      x: node.x,
      y: node.y,
      width: node.w,
      height: node.h,
    })
  for (const container of layout.containers ?? [])
    expect(exported.containers[container.id], `container ${container.id}`).toEqual({
      x: container.x,
      y: container.y,
      width: container.w,
      height: container.h,
    })
  for (const edge of layout.edges) expect(exported.edges[edge.id], `edge ${edge.id}`).toBe(edge.d)
}

// The multipurpose fixture behind the export parity checks: two lanes, two
// columns and two cross-lane connections, so a coordinate or route regression
// cannot hide inside a single-node document.
const paritySpec: SwimlaneDiagramSpec = {
  type: 'swimlane',
  caption: 'Export parity fixture',
  legend: { main: 'Main', branch: 'Alt' },
  lanes: [
    { id: 'support', label: 'Support' },
    { id: 'engineering', label: 'Engineering' },
  ],
  nodes: [
    { id: 'intake', label: 'Intake', description: '', lane: 'support' },
    { id: 'triage', label: 'Triage', description: '', lane: 'support' },
    { id: 'handoff', label: 'Handoff', description: '', lane: 'engineering' },
    { id: 'resolve', label: 'Resolve', description: '', lane: 'engineering' },
  ],
  edges: [
    { id: 'intake-triage', from: 'intake', to: 'triage' },
    { id: 'intake-handoff', from: 'intake', to: 'handoff' },
    { id: 'triage-resolve', from: 'triage', to: 'resolve' },
  ],
}

// R05: the compact examples share the trimmed layout constants with every
// consumer. These tests keep broad fixtures honest and guard the constants
// that changed from regressing silently.
describe('layout geometry contracts', () => {
  it('reserves the measured ENGINEERING label inside the lane header constant', () => {
    // 'ENGINEERING' at 11.25px Geist Mono with 1.6px letter-spacing: the fixed
    // 91.83px is the browser measurement behind `SWIMLANE_HEADER_W`. This unit
    // guards the constant arithmetic only; the font-loaded measurement is
    // taken in `tests/e2e/diagram-labels.e2e.ts`.
    const measuredEngineering = 91.83
    expect(18 + measuredEngineering + 8).toBeLessThanOrEqual(SWIMLANE_HEADER_W)
  })

  it('keeps swimlane columns aligned with the shared header and padding', () => {
    const spec: SwimlaneDiagramSpec = {
      type: 'swimlane',
      caption: 'Long fixture',
      legend: { main: 'Main', branch: 'Alt' },
      lanes: [
        { id: 'support', label: 'Support' },
        { id: 'engineering', label: 'Engineering' },
      ],
      nodes: [
        { id: 'a', label: 'Intake', description: '', lane: 'support' },
        { id: 'b', label: 'Handoff', description: '', lane: 'engineering' },
        { id: 'c', label: 'Resolve', description: '', lane: 'engineering' },
      ],
      edges: [
        { id: 'ab', from: 'a', to: 'b' },
        { id: 'bc', from: 'b', to: 'c' },
      ],
    }
    const layout = layoutDiagram(spec)
    const first = layout.nodeById.a
    expect(first.x).toBe(SWIMLANE_HEADER_W + SWIMLANE_PAD)
    const containers = layout.containers ?? []
    expect(containers).toHaveLength(2)
    for (const container of containers) {
      expect(container.w).toBeGreaterThanOrEqual(first.x + first.w + SWIMLANE_PAD)
    }
    // Columns advance by one card each and stay strictly ordered.
    const columns = [layout.nodeById.a, layout.nodeById.b, layout.nodeById.c].map((node) => node.x)
    expect(columns[1] - columns[0]).toBe(columns[2] - columns[1])
    expect(columns[2]).toBeGreaterThan(columns[1])
  })

  it('keeps timeline events evenly spaced for longer sequences', () => {
    const spec: TimelineDiagramSpec = {
      type: 'timeline',
      caption: 'Five milestones',
      legend: { main: 'Main', branch: 'Alt' },
      events: Array.from({ length: 5 }, (_, index) => ({
        id: `e${index}`,
        label: `Milestone ${index}`,
        description: '',
      })),
    }
    const layout = layoutDiagram(spec)
    const centres = layout.nodes.map((node) => node.cx)
    for (let index = 1; index < centres.length; index++) {
      expect(centres[index] - centres[index - 1]).toBe(TIMELINE_EVENT_GAP)
    }
    const bounds = previewBounds(layout)
    for (const node of layout.nodes) {
      expect(node.cx).toBeGreaterThanOrEqual(bounds.x)
      expect(node.cx).toBeLessThanOrEqual(bounds.x + bounds.width)
    }
  })

  it('exports node, container and route geometry identical to the resolved scene', () => {
    const layout = layoutDiagram(paritySpec)
    // Guard the fixture itself: several columns, containers and connections.
    expect(layout.nodes).toHaveLength(4)
    expect(new Set(layout.nodes.map((node) => node.x)).size).toBeGreaterThanOrEqual(3)
    expect(layout.containers).toHaveLength(2)
    expect(layout.edges).toHaveLength(3)
    const created = createDocument(paritySpec, { id: 'geometry', locale: 'en' })
    if (!created.ok) throw Error('document')
    const scene = resolveDocument(created.value, { quality: 'edit', requestId: 'geometry' })
    if (!scene.ok) throw Error('scene')
    // layout reports the same geometry the editable scene resolves.
    for (const node of layout.nodes)
      expect(scene.value.layout.nodeById[node.id], `scene node ${node.id}`).toEqual(
        expect.objectContaining({ x: node.x, y: node.y, w: node.w, h: node.h }),
      )
    for (const container of layout.containers ?? [])
      expect(
        scene.value.layout.containers?.find((candidate) => candidate.id === container.id),
        `scene container ${container.id}`,
      ).toEqual(container)
    for (const edge of layout.edges)
      expect(
        scene.value.layout.edges.find((candidate) => candidate.id === edge.id)?.d,
        `scene edge ${edge.id}`,
      ).toBe(edge.d)
    // The SVG export serializes that exact scene geometry.
    const markup = renderSvg(created.value, scene.value, { instanceId: 'geometry' })
    expect(markup).toContain(`width="${scene.value.layout.width}"`)
    expect(markup).toContain(
      `viewBox="0 0 ${scene.value.layout.width} ${scene.value.layout.height}"`,
    )
    expect(markup).toContain('data-container-id="support"')
    expect(markup).toContain('url(#grid-')
    expectExportParity(scene.value.layout, markup)
  })

  it('fails the export parity comparator when a node or route is mutated', () => {
    const created = createDocument(paritySpec, { id: 'geometry-mutation', locale: 'en' })
    if (!created.ok) throw Error('document')
    const scene = resolveDocument(created.value, {
      quality: 'edit',
      requestId: 'geometry-mutation',
    })
    if (!scene.ok) throw Error('scene')
    const original = renderSvg(created.value, scene.value, { instanceId: 'geometry-mutation' })
    // Moving one node by a unit and rerouting one edge must both be detected.
    const mutated = structuredClone(scene.value)
    mutated.layout.nodes[0].x += 1
    mutated.layout.nodes[0].cx += 1
    mutated.layout.nodeById[mutated.layout.nodes[0].id] = mutated.layout.nodes[0]
    mutated.layout.edges[0].d = `${mutated.layout.edges[0].d} L 0 0`
    const mutatedMarkup = renderSvg(created.value, mutated, { instanceId: 'geometry-mutation' })
    expect(() => expectExportParity(scene.value.layout, mutatedMarkup)).toThrow()
    expect(() => expectExportParity(mutated.layout, original)).toThrow()
  })
})
