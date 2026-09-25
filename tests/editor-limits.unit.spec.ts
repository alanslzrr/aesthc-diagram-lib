import { describe, it, expect } from 'vitest'
import { validateDocument } from '../src/editor-core'
import type { DiagramDocument, GraphDiagramSpec } from '../src/editor-core'
import fixture from './fixtures/editor/graph-document.json'
function doc() {
  return structuredClone(fixture) as DiagramDocument & { spec: GraphDiagramSpec }
}
describe('exact structural limits', () => {
  it.each([
    [
      'nodes',
      1000,
      'limit.nodes',
      (d: ReturnType<typeof doc>, n: number) => {
        d.spec.nodes = Array.from({ length: n }, (_, i) => ({
          id: 'n' + i,
          label: 'N',
          description: '',
        }))
        d.spec.edges = []
        d.scene.nodes = {}
        d.scene.zOrder = d.spec.nodes.map((n) => n.id)
      },
    ],
    [
      'edges',
      2000,
      'limit.edges',
      (d: ReturnType<typeof doc>, n: number) => {
        d.spec.edges = Array.from({ length: n }, (_, i) => ({ id: 'e' + i, from: 'a', to: 'b' }))
      },
    ],
    [
      'groups',
      100,
      'limit.groups',
      (d: ReturnType<typeof doc>, n: number) => {
        d.scene.groups = Array.from({ length: n }, (_, i) => ({
          id: 'g' + i,
          label: 'G',
          kind: 'visual',
          nodeIds: [],
          locked: false,
        }))
      },
    ],
    [
      'ports',
      32,
      'limit.ports',
      (d: ReturnType<typeof doc>, n: number) => {
        d.spec.nodes[0].ports = Array.from({ length: n }, (_, i) => ({
          id: 'p' + i,
          side: 'right',
          offset: 0.5,
          direction: 'out',
        }))
      },
    ],
    [
      'route points',
      64,
      'limit.route-points',
      (d: ReturnType<typeof doc>, n: number) => {
        d.scene.routes['ab-primary'] = {
          mode: 'manual',
          source: { side: 'right', offset: 0.5 },
          target: { side: 'left', offset: 0.5 },
          points: Array.from({ length: n }, () => ({ x: 10, y: 10 })),
        }
      },
    ],
    [
      'views',
      20,
      'limit.views',
      (d: ReturnType<typeof doc>, n: number) => {
        d.views = Array.from({ length: n }, (_, i) => ({
          id: 'v' + i,
          label: 'View',
          focus: { nodeIds: ['a'], edgeIds: [] },
        }))
      },
    ],
    [
      'story steps',
      50,
      'limit.story',
      (d: ReturnType<typeof doc>, n: number) => {
        d.views = [{ id: 'view', label: 'View', focus: { nodeIds: ['a'], edgeIds: [] } }]
        d.story = Array.from({ length: n }, (_, i) => ({
          id: 's' + i,
          viewId: 'view',
          durationMs: 500,
        }))
      },
    ],
    [
      'label',
      512,
      'limit.text',
      (d: ReturnType<typeof doc>, n: number) => {
        d.spec.nodes[0].label = 'a'.repeat(n)
      },
    ],
    [
      'description',
      8192,
      'limit.text',
      (d: ReturnType<typeof doc>, n: number) => {
        d.spec.nodes[0].description = 'a'.repeat(n)
      },
    ],
  ] as const)('accepts N and rejects N+1 %s', (_name, limit, code, modify) => {
    const accepted = doc()
    modify(accepted, limit)
    expect(validateDocument(accepted).ok).toBe(true)
    const rejected = doc()
    modify(rejected, limit + 1)
    expect(validateDocument(rejected).diagnostics.map((d) => d.code)).toContain(code)
  })
  it('counts ancestor group depth including the leaf', () => {
    for (const n of [8, 9]) {
      const d = doc()
      d.scene.groups = Array.from({ length: n }, (_, i) => ({
        id: 'g' + i,
        label: 'G',
        kind: 'visual',
        nodeIds: [],
        locked: false,
        ...(i ? { parentGroup: 'g' + (i - 1) } : {}),
      }))
      expect(validateDocument(d).ok).toBe(n === 8)
    }
  })
  it('enforces graph port direction and capacity using exact endpoint identity', () => {
    const d = doc()
    d.spec.nodes[0].ports = [
      { id: 'out', side: 'right', offset: 0.5, direction: 'out', capacity: 1 },
    ]
    d.spec.edges[0].sourcePort = 'out'
    expect(validateDocument(d).ok).toBe(true)
    d.spec.edges[1].sourcePort = 'out'
    expect(validateDocument(d).diagnostics.map((d) => d.code)).toContain('port.capacity')
    delete d.spec.edges[1].sourcePort
    d.spec.nodes[0].ports[0].direction = 'in'
    expect(validateDocument(d).diagnostics.map((d) => d.code)).toContain('port.direction')
  })
})
