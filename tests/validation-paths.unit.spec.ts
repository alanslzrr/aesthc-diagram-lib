import { describe, expect, it } from 'vitest'
import { minimalSpecs } from '../examples/specs'
import { validateDiagramSpec } from '../src/validation'
import { checkedPlaygroundSpec, PLAYGROUND_LIMITS } from '../site/src/lib/playground-policy'

describe('authored semantic issue paths', () => {
  for (const [type, base] of Object.entries(minimalSpecs)) {
    const nodeField =
      (
        {
          sequence: 'participants',
          'state-machine': 'states',
          er: 'entities',
          timeline: 'events',
        } as Record<string, string>
      )[type] ?? 'nodes'
    const edgeField =
      (
        { sequence: 'messages', 'state-machine': 'transitions', er: 'relations' } as Record<
          string,
          string
        >
      )[type] ?? 'edges'
    it(`uses the authored ${nodeField} collection for ${type}`, () => {
      const data = structuredClone(base) as unknown as Record<string, { id: string }[]>
      data[nodeField].push({ ...data[nodeField][0] })
      const result = validateDiagramSpec(data)
      expect(result.success).toBe(false)
      if (!result.success)
        expect(result.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: `/${nodeField}/${data[nodeField].length - 1}/id`,
              code: 'duplicate-id',
            }),
          ]),
        )
    })
    if (type === 'timeline') continue
    it(`keeps original explicit ID indices and reference collection for ${type}`, () => {
      const data = structuredClone(base) as unknown as Record<
        string,
        Array<{ id?: string; from: string; to: string }>
      >
      const first = data[edgeField][0]
      const anonymous = { ...first }
      if (type === 'sequence') anonymous.id = 'first'
      else delete anonymous.id
      data[edgeField] = [
        anonymous,
        { ...first, id: 'dup' },
        { ...first, id: 'dup' },
        { ...first, id: 'unknown', from: 'missing' },
      ]
      const result = validateDiagramSpec(data)
      expect(result.success).toBe(false)
      if (!result.success)
        expect(result.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ path: `/${edgeField}/2/id`, code: 'duplicate-id' }),
            expect.objectContaining({ path: `/${edgeField}/3/from`, code: 'reference' }),
          ]),
        )
    })
  }
})
describe('playground count policy', () => {
  it('accepts the node boundary and rejects the next node before layout', () => {
    const spec = structuredClone(minimalSpecs.flowchart)
    spec.nodes = Array.from({ length: PLAYGROUND_LIMITS.nodes }, (_, i) => ({
      ...spec.nodes[0],
      id: `n${i}`,
    }))
    spec.edges = []
    expect(checkedPlaygroundSpec(spec)).toBe(spec)
    spec.nodes.push({ ...spec.nodes[0], id: 'overflow' })
    expect(() => checkedPlaygroundSpec(spec)).toThrow('Too many diagram nodes')
  })
  it('accepts the relation boundary and rejects the next relation', () => {
    const spec = structuredClone(minimalSpecs.flowchart)
    spec.edges = Array.from({ length: PLAYGROUND_LIMITS.relations }, (_, i) => ({
      ...spec.edges[0],
      id: `e${i}`,
    }))
    expect(checkedPlaygroundSpec(spec)).toBe(spec)
    spec.edges.push({ ...spec.edges[0], id: 'overflow' })
    expect(() => checkedPlaygroundSpec(spec)).toThrow('Too many diagram relations')
  })
})
