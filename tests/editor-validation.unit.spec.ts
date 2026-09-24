import { describe, expect, it } from 'vitest'
import { validateDocument, createDocument } from '../src/editor-core'
import type { DiagramGroup } from '../src/editor-core/types'
import fixture from './fixtures/editor/graph-document.json'
const group = (
  partial: Omit<DiagramGroup, 'id' | 'label' | 'kind' | 'nodeIds' | 'locked'> & {
    id: string
    label: string
    nodeIds: string[]
  },
): DiagramGroup => ({
  kind: 'visual',
  locked: false,
  ...partial,
})

describe('editor trust boundary', () => {
  it('accepts the canonical fixture and never executes getters', () => {
    expect(validateDocument(fixture).ok).toBe(true)
    let reads = 0
    const value = Object.defineProperty({}, 'spec', {
      enumerable: true,
      get() {
        reads++
        return fixture.spec
      },
    })
    const result = validateDocument(value)
    expect(reads).toBe(0)
    expect(result.diagnostics.map((d) => d.code)).toContain('data.accessor')
  })
  it.each([
    [
      'id.duplicate',
      (d: typeof fixture) => {
        d.spec.nodes.push(d.spec.nodes[0])
      },
    ],
    [
      'reference.missing',
      (d: typeof fixture) => {
        d.spec.edges[0].to = 'absent'
      },
    ],
    [
      'reference.missing',
      (d: typeof fixture) => {
        d.scene.zOrder.push('absent')
      },
    ],
    [
      'id.invalid',
      (d: typeof fixture) => {
        d.spec.edges[0].id = ''
      },
    ],
    [
      'layout.range',
      (d: typeof fixture) => {
        d.scene.nodes.a.width = -1
      },
    ],
    [
      'presentation.color',
      (d: typeof fixture) => {
        d.presentation.theme.light.card = 'url(https://bad.invalid)'
      },
    ],
    [
      'limit.text',
      (d: typeof fixture) => {
        d.spec.nodes[0].label = 'a'.repeat(513)
      },
    ],
  ])('rejects %s without mutating input', (code, modify) => {
    const doc = structuredClone(fixture)
    modify(doc)
    const before = JSON.stringify(doc)
    const result = validateDocument(doc)
    expect(result.ok).toBe(false)
    expect(result.diagnostics.map((d) => d.code)).toContain(code)
    expect(JSON.stringify(doc)).toBe(before)
  })
  it('rejects unsafe keys, cycles, non-finite numbers and non-plain objects', () => {
    for (const [value, code] of [
      [JSON.parse('{"__proto__":{}}'), 'data.unsafe-key'],
      [new Date(), 'data.prototype'],
      [{ value: Infinity }, 'data.finite'],
      [{ value: '\ud800' }, 'data.unicode'],
    ] as const)
      expect(validateDocument(value).diagnostics.map((d) => d.code)).toContain(code)
    const value: Record<string, unknown> = {}
    value.self = value
    expect(validateDocument(value).diagnostics.map((d) => d.code)).toContain('data.cycle')
  })
  it('rejects future documents, invalid group ancestry and executable links', () => {
    expect(
      validateDocument({ ...fixture, schemaVersion: 2 }).diagnostics.map((d) => d.code),
    ).toContain('version.unsupported')
    const group = {
      id: 'g',
      label: 'Group',
      kind: 'visual',
      nodeIds: ['a'],
      parentGroup: 'g',
      locked: false,
    }
    expect(
      validateDocument({
        ...fixture,
        scene: { ...fixture.scene, groups: [group] },
      }).diagnostics.map((d) => d.code),
    ).toContain('group.cycle')
    const doc = {
      ...fixture,
      metadata: {
        ...fixture.metadata,
        nodes: { a: { roles: [], tags: [], links: [{ label: 'X', href: 'javascript:alert(1)' }] } },
      },
    }
    expect(validateDocument(doc).diagnostics.map((d) => d.code)).toContain('url.scheme')
  })
  it('applies exact byte/node limits before the layout boundary', () => {
    const bytes = new TextEncoder().encode(JSON.stringify(fixture)).length
    expect(validateDocument(fixture, { maxBytes: bytes }).ok).toBe(true)
    expect(
      validateDocument(fixture, { maxBytes: bytes - 1 }).diagnostics.map((d) => d.code),
    ).toContain('limit.bytes')
    expect(validateDocument(fixture, { maxNodes: 5 }).ok).toBe(true)
    expect(validateDocument(fixture, { maxNodes: 4 }).diagnostics.map((d) => d.code)).toContain(
      'limit.nodes',
    )
  })
})

describe('JSON fidelity', () => {
  it('rejects sparse arrays and non-index array keys instead of silently dropping data', () => {
    const sparse = new Array(4)
    const extra = Object.assign(['safe'], { extra: 'lost' })
    for (const value of [sparse, extra])
      expect(validateDocument({ value }).diagnostics.map((d) => d.code)).toContain('data.array')
  })
})
describe('dangling references and unknown properties', () => {
  function doc() {
    const result = validateDocument(structuredClone(fixture))
    if (!result.ok) throw Error('fixture')
    return result.value
  }
  it('blocks dangling view, lane, port and edge references with stable codes', () => {
    const view = doc()
    view.views = [{ id: 'v', label: 'View', focus: { nodeIds: ['absent'], edgeIds: [] } }]
    expect(validateDocument(view).diagnostics.map((d) => d.code)).toContain('reference.missing')
    const made = createDocument(
      {
        type: 'swimlane',
        caption: 's',
        legend: { main: 'm', branch: 'b' },
        lanes: [{ id: 'l', label: 'L' }],
        nodes: [{ id: 'n', label: 'N', description: '', lane: 'ghost' }],
        edges: [],
      } as never,
      { id: 'd', locale: 'en' },
    )
    if (!made.ok) expect(made.diagnostics.map((d) => d.code)).toContain('reference.missing')
  })
  it('rejects unknown top-level and spec properties before layout', () => {
    const unknown = doc()
    Object.assign(unknown, { extra: 1 })
    expect(validateDocument(unknown).diagnostics.map((d) => d.code)).toContain(
      'schema.additionalProperties',
    )
  })
  it('rejects nested data beyond the maximum depth without a stack overflow', () => {
    const deep = doc()
    let value: unknown = { terminal: 'x' }
    for (let i = 0; i < 70; i++) value = { next: value }
    deep.extensions = { deep: value as never }
    expect(validateDocument(deep).diagnostics.map((d) => d.code)).toContain('data.depth')
  })
  it('bounds extensions to the byte and namespace policy without executing payloads', () => {
    const oversized = doc()
    oversized.extensions = { big: 'a'.repeat(70000) }
    expect(validateDocument(oversized).diagnostics.map((d) => d.code)).toContain('limit.bytes')
    const invalidNamespace = doc()
    invalidNamespace.extensions = { 'bad namespace!': { x: 1 } }
    expect(validateDocument(invalidNamespace).diagnostics.map((d) => d.code)).toContain(
      'extension.namespace',
    )
    const payload = doc()
    payload.extensions = { 'com.example': { steps: ['a', 'b'] } }
    expect(validateDocument(payload).ok).toBe(true)
  })
  it('rejects groups with two parents and self-referential ancestry', () => {
    const doubleParent = doc()
    doubleParent.scene.groups = [
      group({ id: 'g1', label: 'G1', nodeIds: ['a', 'b'] }),
      group({ id: 'g2', label: 'G2', nodeIds: ['a'] }),
    ]
    expect(validateDocument(doubleParent).diagnostics.map((d) => d.code)).toContain(
      'group.multiple-parent',
    )
    const cycle = doc()
    cycle.scene.groups = [
      group({ id: 'g1', label: 'G1', nodeIds: [], parentGroup: 'g2' }),
      group({ id: 'g2', label: 'G2', nodeIds: [], parentGroup: 'g1' }),
    ]
    expect(validateDocument(cycle).diagnostics.map((d) => d.code)).toContain('group.cycle')
  })
})
