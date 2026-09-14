import { describe, expect, it } from 'vitest'
import { EXAMPLE_DIAGRAMS } from '../src/examples'
import { buildAdjacency, connectedIds, diagramEdges, edgeId, identifyEdges } from '../src/layout'
import { layoutDiagram } from '../src/layouts'
import { validateDiagramSpec, validateLocalizedDiagram } from '../src/validation'
import { parseSpecSource, usageSnippet } from '../site/src/lib/code'

describe('public contracts', () => {
  for (const [key, registration] of Object.entries(EXAMPLE_DIAGRAMS)) {
    it(`validates both locales and geometry for ${key}`, () => {
      expect(validateLocalizedDiagram(registration.diagram)).toMatchObject({ success: true })
      for (const spec of Object.values(registration.diagram)) {
        expect(validateDiagramSpec(spec)).toMatchObject({ success: true })
        const layout = layoutDiagram(spec)
        expect(Number.isFinite(layout.width)).toBe(true)
        expect(Number.isFinite(layout.height)).toBe(true)
        expect(new Set(layout.edges.map((edge) => edge.id)).size).toBe(layout.edges.length)
      }
    })
  }
  const flow = {
    type: 'flowchart',
    caption: '',
    legend: { main: '', branch: '' },
    nodes: [{ id: 'a', label: 'A', description: '' }],
    edges: [],
  }
  it.each([
    null,
    {},
    { ...flow, legend: null },
    { ...flow, nodes: [null] },
    { ...flow, edges: [{ from: 'a', to: 'missing' }] },
    { ...flow, nodes: [...flow.nodes, ...flow.nodes] },
    { ...flow, level: Infinity },
  ])('rejects malformed data: %j', (input) => {
    expect(validateDiagramSpec(input).success).toBe(false)
  })
  it('rejects cyclic objects and prototype keys', () => {
    const cyclic: Record<string, unknown> = {}
    cyclic.self = cyclic
    expect(validateDiagramSpec(cyclic).success).toBe(false)
    expect(validateDiagramSpec(JSON.parse('{"__proto__": {}}')).success).toBe(false)
  })
  it('never evaluates JavaScript from the editor', () => {
    expect(() => parseSpecSource('(() => { throw new Error("executed") })()')).toThrow(SyntaxError)
    expect(parseSpecSource(JSON.stringify(flow))).toEqual(flow)
  })
  it('generates typed complete usage rather than interpolating unsafe keys', () => {
    const code = usageSnippet("x'\nthrow", 'flowchart', flow)
    expect(code).toContain('satisfies DiagramSpec')
    expect(code).not.toContain("x'\nthrow")
    expect(code).toContain('useId()')
  })
  it('keeps parallel sequence identities during highlighting', () => {
    const spec = {
      type: 'sequence' as const,
      caption: '',
      legend: { main: '', branch: '' },
      participants: [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
      ],
      messages: [
        { id: 'one', from: 'a', to: 'b' },
        { id: 'two', from: 'a', to: 'b' },
        { id: 'self', from: 'b', to: 'b' },
      ],
    }
    expect(layoutDiagram(spec).edges.map((edge) => edge.id)).toEqual(['one', 'two', 'self'])
    expect(connectedIds('a', buildAdjacency(diagramEdges(spec))).edges).toEqual(
      new Set(['one', 'two', 'self']),
    )
  })
  it('allocates anonymous IDs without colliding with explicit IDs or delimiters', () => {
    const edges = identifyEdges([
      { from: 'a', to: 'b' },
      { from: 'a', to: 'b' },
      { id: 'a::b', from: 'a', to: 'b' },
    ])
    expect(new Set(edges.map(edgeId)).size).toBe(3)
    expect(edgeId({ from: 'a::b', to: 'c' })).not.toBe(edgeId({ from: 'a', to: 'b::c' }))
    expect(() =>
      identifyEdges([
        { id: 'x', from: 'a', to: 'b' },
        { id: 'x', from: 'b', to: 'a' },
      ]),
    ).toThrow('Duplicate')
  })
  it('keeps activation bars separate from authored participant IDs', () => {
    const layout = layoutDiagram({
      type: 'sequence',
      caption: '',
      legend: { main: '', branch: '' },
      participants: [
        { id: 'a', label: 'A' },
        { id: 'activation-call', label: 'B' },
      ],
      messages: [{ id: 'call', from: 'a', to: 'activation-call', activation: true }],
    })
    expect(new Set(layout.nodes.map((node) => node.id)).size).toBe(layout.nodes.length)
    expect(layout.nodeById['activation-call'].label).toBe('B')
  })
  it('rejects malformed Unicode before endpoint encoding', () => {
    expect(validateDiagramSpec({ ...flow, caption: '\ud800' }).success).toBe(false)
  })
})
