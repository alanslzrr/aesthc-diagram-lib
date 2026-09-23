import { describe, expect, it } from 'vitest'
import { validateDocument } from '../src/editor-core'
import fixture from './fixtures/editor/graph-document.json'

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
