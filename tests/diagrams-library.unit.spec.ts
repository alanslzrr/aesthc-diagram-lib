import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { DiagramCanvas } from '../src/canvas'
import {
  getDiagram,
  getDiagramVisuals,
  hasDiagram,
  getDiagramKeys,
  diagramEdges,
  type DiagramSpec,
} from '../src/index'
import { layoutDiagram } from '../src/layouts'
import { registerExampleDiagrams, EXAMPLE_DIAGRAMS } from '../src/examples'
import { registerDiagrams } from '../src/registry'

registerExampleDiagrams()

const examples = Object.entries(EXAMPLE_DIAGRAMS) as Array<
  [string, { diagram: { en: DiagramSpec; es: DiagramSpec }; visuals?: Record<string, unknown> }]
>

describe('diagram registry', () => {
  it('registers and looks up a diagram by key and locale', () => {
    registerDiagrams({
      'test-registry': {
        diagram: {
          en: {
            type: 'flowchart',
            caption: 'test',
            legend: { main: 'a', branch: 'b' },
            nodes: [
              { id: 'a', label: 'A', description: 'Node A.' },
              { id: 'b', label: 'B', description: 'Node B.' },
            ],
            edges: [{ from: 'a', to: 'b' }],
          },
          es: {
            type: 'flowchart',
            caption: 'prueba',
            legend: { main: 'a', branch: 'b' },
            nodes: [
              { id: 'a', label: 'A', description: 'Nodo A.' },
              { id: 'b', label: 'B', description: 'Nodo B.' },
            ],
            edges: [{ from: 'a', to: 'b' }],
          },
        },
      },
    })

    expect(hasDiagram('test-registry')).toBe(true)
    expect(getDiagram('test-registry', 'en').caption).toBe('test')
    expect(getDiagram('test-registry', 'es-ES').caption).toBe('prueba')
    expect(getDiagramKeys()).toContain('test-registry')
  })

  it('exposes node visuals per diagram and throws on unknown keys', () => {
    expect(getDiagramVisuals('test-registry')).toEqual({})
    expect(() => getDiagram('missing-diagram', 'en')).toThrow(/Unknown diagram key/)
  })
})

describe('example layouts', () => {
  it.each(examples)('%s: lays out inside a finite canvas', (_key, entry) => {
    for (const locale of ['en', 'es'] as const) {
      const layout = layoutDiagram(entry.diagram[locale])
      expect(layout.width).toBeGreaterThan(0)
      expect(layout.height).toBeGreaterThan(0)
      for (const node of layout.nodes) {
        expect(node.x, `${node.id} x`).toBeGreaterThanOrEqual(0)
        expect(node.x + node.w, `${node.id} right`).toBeLessThanOrEqual(layout.width)
        expect(node.y, `${node.id} y`).toBeGreaterThanOrEqual(0)
        expect(node.y + node.h, `${node.id} bottom`).toBeLessThanOrEqual(layout.height)
      }
      for (const edge of layout.edges) {
        if (edge.from && edge.to) {
          expect(layout.nodeById[edge.from], `${edge.from}`).toBeDefined()
          expect(layout.nodeById[edge.to], `${edge.to}`).toBeDefined()
        }
      }
    }
  })

  it('flowchart assigns a level to every node and builds vertical links', () => {
    const layout = layoutDiagram(EXAMPLE_DIAGRAMS['example-flowchart'].diagram.en)
    for (const node of layout.nodes) expect(node.band).toBeGreaterThanOrEqual(0)
    const cross = layout.edges.find((edge) => edge.id === 'start::build')
    expect(cross?.d).toMatch(/^M .* C /)
  })

  it('sequence emits one lifeline per participant and horizontal messages', () => {
    const layout = layoutDiagram(EXAMPLE_DIAGRAMS['example-sequence'].diagram.en)
    expect(layout.lifelines).toHaveLength(4)
    for (const edge of layout.edges) expect(edge.startY).toBe(edge.endY)
    const activations = layout.nodes.filter((node) => node.shape === 'bar')
    expect(activations.length).toBeGreaterThanOrEqual(3)
  })

  it('state machine places states on a ring and keeps initial/final flags', () => {
    const layout = layoutDiagram(EXAMPLE_DIAGRAMS['example-state-machine'].diagram.en)
    const states = layout.nodes.filter((node) => node.shape === 'state')
    expect(states).toHaveLength(6)
    expect(layout.nodeById.created.initial).toBe(true)
    expect(layout.nodeById.delivered.final).toBe(true)
    const selfLoops = layout.edges.filter((edge) => edge.from === edge.to)
    expect(selfLoops).toHaveLength(0)
  })

  it('er renders every entity as a table with its fields', () => {
    const layout = layoutDiagram(EXAMPLE_DIAGRAMS['example-er'].diagram.en)
    const tables = layout.nodes.filter((node) => node.shape === 'table')
    expect(tables).toHaveLength(5)
    expect(layout.nodeById.products.fields?.some((field) => field.key === 'pk')).toBe(true)
  })

  it('timeline draws a dashed spine and places event dots on it', () => {
    const layout = layoutDiagram(EXAMPLE_DIAGRAMS['example-timeline'].diagram.en)
    const spine = layout.edges.find((edge) => edge.id === 'timeline-spine')
    expect(spine?.dashed).toBe(true)
    const spineY = spine?.startY ?? 0
    for (const node of layout.nodes) expect(node.cy).toBe(spineY)
  })

  it('swimlane emits a container per lane and tags nodes with their lane index', () => {
    const layout = layoutDiagram(EXAMPLE_DIAGRAMS['example-swimlane'].diagram.en)
    expect(layout.containers).toHaveLength(3)
    expect(layout.nodeById.page.band).toBe(0)
    expect(layout.nodeById.debug.band).toBe(1)
    expect(layout.nodeById.notify.band).toBe(2)
  })

  it('diagramEdges normalizes every spec type to plain edges', () => {
    expect(diagramEdges(EXAMPLE_DIAGRAMS['example-flowchart'].diagram.en).length).toBe(10)
    expect(diagramEdges(EXAMPLE_DIAGRAMS['example-sequence'].diagram.en).length).toBe(7)
    expect(diagramEdges(EXAMPLE_DIAGRAMS['example-state-machine'].diagram.en).length).toBe(7)
    expect(diagramEdges(EXAMPLE_DIAGRAMS['example-er'].diagram.en).length).toBe(4)
    expect(diagramEdges(EXAMPLE_DIAGRAMS['example-timeline'].diagram.en).length).toBe(0)
    expect(diagramEdges(EXAMPLE_DIAGRAMS['example-swimlane'].diagram.en).length).toBe(5)
  })
})

describe('DiagramCanvas renders every type', () => {
  const render = (spec: DiagramSpec) =>
    renderToStaticMarkup(
      createElement(DiagramCanvas, {
        activeNodeId: null,
        ariaLabel: 'Library fixture',
        focusedNodeId: null,
        highlight: null,
        instanceId: `lib-${spec.type}`,
        layout: layoutDiagram(spec),
        nodeVisuals: {},
        onDismissNode: () => undefined,
        onFocusNode: () => undefined,
        onSelectNode: () => undefined,
        onTooltipNodeChange: () => undefined,
        selectedNodeId: null,
      }),
    )

  it('centers label-only cards without an empty icon rail', () => {
    const spec: DiagramSpec = {
      type: 'flowchart',
      caption: 'Plain card',
      legend: { main: 'Main', branch: 'Branch' },
      nodes: [{ id: 'plain', label: 'Plain', description: 'Label-only card' }],
      edges: [],
    }
    const node = layoutDiagram(spec).nodes[0]
    const markup = render(spec)
    expect(markup).toContain(
      `data-node-label="true" x="${node.cx}" y="${node.cy}" text-anchor="middle" dominant-baseline="central"`,
    )
    expect(markup).toContain('data-node-surface="true"')
  })

  it('uses the host node-border token for secondary outlines', () => {
    const markup = render(EXAMPLE_DIAGRAMS['example-flowchart'].diagram.en)
    expect(markup).toContain('stroke="var(--diagram-node-border, var(--border))"')
    expect(markup).toContain('opacity-[0.84] dark:opacity-70')
  })

  it('flowchart renders terminal shapes and edge pills', () => {
    const markup = render(EXAMPLE_DIAGRAMS['example-flowchart'].diagram.en)
    expect(markup).toContain('data-node-id="start"')
    expect(markup).toContain('>Merge to main</text>')
    expect(markup).toContain('>probe failed</text>')
  })

  it('sequence renders lifelines, headers and activation bars', () => {
    const markup = render(EXAMPLE_DIAGRAMS['example-sequence'].diagram.en)
    expect(markup).toContain('data-lifeline-id="api"')
    expect(markup).toContain('>POST /checkout</text>')
    expect(markup).toContain('color-mix(in srgb, var(--color-cobalt) 22%, transparent)')
  })

  it('state machine renders double-outline initial states and hollow finals', () => {
    const markup = render(EXAMPLE_DIAGRAMS['example-state-machine'].diagram.en)
    expect(markup).toContain('data-node-id="created"')
    expect(markup).toContain('data-node-id="delivered"')
    expect(markup).toContain('>checkout</text>')
  })

  it('er renders table rows with field names and types', () => {
    const markup = render(EXAMPLE_DIAGRAMS['example-er'].diagram.en)
    expect(markup).toContain('>products</text>')
    expect(markup).toContain('>slug</text>')
    expect(markup).toContain('>uuid</text>')
  })

  it('timeline renders event dots, connectors and labels', () => {
    const markup = render(EXAMPLE_DIAGRAMS['example-timeline'].diagram.en)
    expect(markup).toContain('data-node-id="public"')
    expect(markup).toContain('data-node-id="kickoff"')
  })

  it('swimlane renders containers and lane-labelled nodes', () => {
    const markup = render(EXAMPLE_DIAGRAMS['example-swimlane'].diagram.en)
    expect(markup).toContain('data-container-id="oncall"')
    expect(markup).toContain('>On-call</text>')
    expect(markup).toContain('data-node-id="debug"')
  })
})
