import { describe, expect, it } from 'vitest'
import { createDocument } from '../src/editor-core'
import type { DiagramDocument, DiagramScene } from '../src/editor-core/types'
import {
  applyLayoutResult,
  createLayoutProvider,
  runLayoutProvider,
} from '../src/editor-core/layout-provider'

function document(): DiagramDocument {
  const made = createDocument(
    {
      type: 'graph',
      caption: 'Provider seed',
      legend: { main: 'Main', branch: 'Branch' },
      nodes: [
        { id: 'a', label: 'A', description: '' },
        { id: 'b', label: 'B', description: '' },
        { id: 'locked', label: 'Locked', description: '' },
      ],
      edges: [{ id: 'ab', from: 'a', to: 'b' }],
    },
    { id: 'provider-seed', locale: 'en' },
  )
  if (!made.ok) throw Error(JSON.stringify(made.diagnostics))
  made.value.scene = {
    ...made.value.scene,
    mode: 'manual',
    nodes: Object.fromEntries(
      ['a', 'b', 'locked'].map((id, index) => [
        id,
        { x: index * 200, y: 80, width: 140, height: 56, locked: false },
      ]),
    ),
    routes: {},
    groups: [],
    zOrder: ['a', 'b', 'locked'],
  }
  made.value.scene.nodes.locked = { ...made.value.scene.nodes.locked, locked: true }
  return made.value
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

describe('E15 async layout provider', () => {
  it('T37.2 a slow result A never overwrites a newer request B; history only receives B', async () => {
    const doc = document()
    const slow = deferred<DiagramScene>()
    const fast = deferred<DiagramScene>()
    let latest = 'b'
    const applied: string[] = []
    const errors: string[] = []
    const providerA = createLayoutProvider('a', 0, () => slow.promise)
    const providerB = createLayoutProvider('b', 0, () => fast.promise)
    const run = (provider: ReturnType<typeof createLayoutProvider>) =>
      runLayoutProvider(doc, provider, {
        expectedRevision: 0,
        latestRequestId: () => latest,
        onResult: () => applied.push(provider.requestId),
        onError: (code) => errors.push(code),
      })
    const a = run(providerA)
    const b = run(providerB)
    // B resolves first and is the latest request: applied.
    fast.resolve({
      ...doc.scene,
      nodes: { a: { x: 500, y: 80, width: 140, height: 56, locked: false } },
    })
    await b
    expect(applied).toEqual(['b'])
    // A resolves late: ignored, no history entry.
    slow.resolve({
      ...doc.scene,
      nodes: { a: { x: 700, y: 80, width: 140, height: 56, locked: false } },
    })
    await a
    expect(applied).toEqual(['b'])
    expect(errors).toEqual([])
    // An aborted provider never publishes.
    const aborted = createLayoutProvider('c', 0, () => Promise.resolve(doc.scene))
    aborted.cancel()
    latest = 'c'
    await expect(aborted.run()).rejects.toThrow('operation.aborted')
  })

  it('T37.2 rejection keeps pins and the last valid scene: stale revision, unknown ids and locked moves', () => {
    const doc = document()
    const stale = applyLayoutResult(
      doc,
      { requestId: 'x', baseRevision: 9, scene: doc.scene },
      { expectedRevision: 0 },
    )
    expect(stale.ok).toBe(false)
    expect(stale.diagnostics.some((d) => d.code === 'revision.stale')).toBe(true)
    const unknown = applyLayoutResult(
      doc,
      {
        requestId: 'x',
        baseRevision: 0,
        scene: {
          ...doc.scene,
          nodes: { ghost: { x: 1, y: 2, width: 10, height: 10, locked: false } },
        },
      },
      { expectedRevision: 0 },
    )
    expect(unknown.ok).toBe(false)
    expect(unknown.diagnostics.some((d) => d.code === 'reference.missing')).toBe(true)
    const lockedMove = applyLayoutResult(
      doc,
      {
        requestId: 'x',
        baseRevision: 0,
        scene: {
          ...doc.scene,
          nodes: { locked: { ...doc.scene.nodes.locked, x: 999 } },
        },
      },
      { expectedRevision: 0 },
    )
    expect(lockedMove.ok).toBe(false)
    expect(lockedMove.diagnostics.some((d) => d.code === 'entity.locked')).toBe(true)
    const valid = applyLayoutResult(
      doc,
      {
        requestId: 'x',
        baseRevision: 0,
        scene: {
          ...doc.scene,
          nodes: { a: { x: 42, y: 7, width: 140, height: 56, locked: false } },
        },
      },
      { expectedRevision: 0 },
    )
    if (!valid.ok) throw Error(JSON.stringify(valid.diagnostics))
    // The applied document keeps the pins untouched.
    expect(valid.value.scene.nodes.locked.locked).toBe(true)
    expect(valid.value.scene.nodes.a.x).toBe(42)
  })
})
