import { describe, expect, it } from 'vitest'
import { createEditorStore, validateDocument } from '../src/editor-core'
import fixture from './fixtures/editor/graph-document.json'

function doc() {
  const result = validateDocument(structuredClone(fixture))
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics))
  return result.value
}
function makeStore(maxEntries = 100) {
  const result = validateDocument(structuredClone(fixture))
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics))
  let ordinal = 0
  return createEditorStore({
    document: result.value,
    idFactory: (kind) => `${kind}-${++ordinal}`,
    permissions: { edit: true, save: true, export: true },
    history: { maxEntries, maxBytes: 8 * 1024 * 1024 },
  })
}

describe('editor transaction store', () => {
  it('T10.1 rejects an entire batch when its second command is invalid', () => {
    const store = makeStore()
    const before = store.getSnapshot().document
    let commits = 0
    const unsubscribe = store.onCommit(() => {
      commits += 1
    })
    const result = store.dispatch({
      id: 'atomic',
      label: 'Invalid batch',
      expectedRevision: 0,
      commands: [
        { type: 'nodes.move', positions: { a: { x: 32, y: 64 } } },
        { type: 'route.set', id: 'missing', route: { mode: 'auto' } },
      ],
    })
    expect(result.status).toBe('rejected')
    expect(store.getSnapshot().document).toEqual(before)
    expect(store.getSnapshot().canUndo).toBe(false)
    expect(commits).toBe(0)
    unsubscribe()
    store.dispose()
  })

  it('T11.1 undoes content without moving the revision counter backwards', () => {
    const store = makeStore()
    const original = structuredClone(store.getSnapshot().document.scene.nodes.a)
    const moved = store.dispatch({
      id: 'move',
      label: 'Move A',
      expectedRevision: 0,
      commands: [{ type: 'nodes.move', positions: { a: { x: 32, y: 64 } } }],
    })
    expect(moved.status).toBe('committed')
    expect(store.getSnapshot().document.revision).toBe(1)
    expect(store.undo().status).toBe('committed')
    expect(store.getSnapshot().document.scene.nodes.a).toEqual(original)
    expect(store.getSnapshot().document.revision).toBe(2)
    expect(store.redo().status).toBe('committed')
    expect(store.getSnapshot().document.scene.nodes.a).toMatchObject({ x: 32, y: 64 })
    expect(store.getSnapshot().document.revision).toBe(3)
    store.dispose()
  })

  it('T10.2 rejects stale writes and T11.2 does not record no-op moves', () => {
    const store = makeStore()
    const command = { type: 'nodes.move' as const, positions: { a: { x: 0, y: 0 } } }
    expect(
      store.dispatch({ id: 'noop', label: 'No-op', expectedRevision: 0, commands: [command] })
        .status,
    ).toBe('noop')
    expect(store.getSnapshot().document.revision).toBe(0)
    expect(store.getSnapshot().canUndo).toBe(false)
    expect(
      store.dispatch({ id: 'stale', label: 'Stale', expectedRevision: 99, commands: [command] })
        .status,
    ).toBe('rejected')
    expect(store.getSnapshot().document.revision).toBe(0)
    store.dispose()
  })

  it('T12.1 evicts the oldest undo entry and T13.1 isolates stores', () => {
    const store = makeStore(2)
    const other = makeStore(2)
    for (let index = 0; index < 3; index += 1) {
      expect(
        store.dispatch({
          id: `move-${index}`,
          label: 'Move A',
          expectedRevision: index,
          commands: [{ type: 'nodes.move', positions: { a: { x: (index + 1) * 16, y: 0 } } }],
        }).status,
      ).toBe('committed')
    }
    expect(store.undo().status).toBe('committed')
    expect(store.undo().status).toBe('committed')
    expect(store.getSnapshot().document.scene.nodes.a.x).toBe(16)
    expect(store.getSnapshot().canUndo).toBe(false)
    expect(store.undo().status).toBe('noop')
    expect(other.getSnapshot().document.scene.nodes.a.x).toBe(0)
    expect(other.getSnapshot().document.revision).toBe(0)
    store.dispose()
    other.dispose()
  })
})

describe('history replay', () => {
  it('invalidates redo after branching from an undone state', () => {
    const store = makeStore()
    const move = (x: number) =>
      store.dispatch({
        id: 'm' + x,
        label: 'move',
        expectedRevision: store.getSnapshot().document.revision,
        commands: [{ type: 'nodes.move', positions: { a: { x, y: 0 } } }],
      })
    move(20)
    move(40)
    store.undo()
    expect(store.getSnapshot().canRedo).toBe(true)
    move(60)
    expect(store.getSnapshot().canRedo).toBe(false)
    expect(store.redo().status).toBe('noop')
    expect(store.getSnapshot().document.scene.nodes.a.x).toBe(60)
  })
})
describe('granular change sets', () => {
  it('invalidates only layout for moves and marks exactly the moved nodes', () => {
    const store = createEditorStore({
      document: doc(),
      permissions: { edit: true, save: true, export: true },
    })
    const changes: Array<{ invalidates: string[]; affected: string[] }> = []
    store.onCommit((result) =>
      changes.push({
        invalidates: [...result.changes.invalidates],
        affected: result.changes.affected.map((r) => r.id),
      }),
    )
    const r = store.dispatch({
      id: 'm',
      label: 'move',
      expectedRevision: 0,
      commands: [{ type: 'nodes.move', positions: { a: { x: 10, y: 10 }, b: { x: 20, y: 20 } } }],
    })
    expect(r.status).toBe('committed')
    expect(changes.at(-1)?.invalidates).toEqual(['layout'])
    expect(changes.at(-1)?.affected.sort()).toEqual(['a', 'b'])
    store.dispose()
  })
  it('adds graph invalidation only when topology actually changes', () => {
    const store = createEditorStore({
      document: doc(),
      permissions: { edit: true, save: true, export: true },
    })
    const changes: string[][] = []
    store.onCommit((result) => changes.push([...result.changes.invalidates]))
    const rename = store.dispatch({
      id: 'r',
      label: 'rename',
      expectedRevision: 0,
      commands: [
        {
          type: 'spec.replace',
          spec: { ...structuredClone(doc().spec), caption: 'x' },
          references: 'reject',
        },
      ],
    })
    expect(rename.status).toBe('committed')
    expect(changes.at(-1)).toEqual(['layout'])
    const addSpec = structuredClone(doc().spec)
    const add = store.dispatch({
      id: 'a',
      label: 'add',
      expectedRevision: 1,
      commands: [
        {
          type: 'spec.replace',
          spec: {
            ...addSpec,
            nodes: [
              ...(addSpec.type === 'graph' ? addSpec.nodes : []),
              { id: 'z', label: 'Z', description: '' },
            ],
          } as never,
          references: 'reject',
        },
      ],
    })
    expect(add.status).toBe('committed')
    expect(changes.at(-1)).toContain('graph')
    store.dispose()
  })
  it('invalidates style and layout for presentation changes and everything for replacements', () => {
    const store = createEditorStore({
      document: doc(),
      permissions: { edit: true, save: true, export: true },
    })
    const changes: string[][] = []
    store.onCommit((result) => changes.push([...result.changes.invalidates]))
    const theme = store.dispatch({
      id: 't',
      label: 'theme',
      expectedRevision: 0,
      commands: [
        {
          type: 'presentation.set',
          presentation: { ...structuredClone(doc().presentation), textScale: 1.2 },
        },
      ],
    })
    expect(theme.status).toBe('committed')
    expect(changes.at(-1)?.sort()).toEqual(['layout', 'style'])
    const replace = store.dispatch({
      id: 'x',
      label: 'replace',
      expectedRevision: 1,
      commands: [{ type: 'document.replace-content', document: doc() }],
    })
    expect(replace.status).toBe('committed')
    expect(changes.at(-1)?.sort()).toEqual(['graph', 'layout', 'style', 'views'])
    store.dispose()
  })
})
describe('change set regressions', () => {
  it('invalidates graph when an edge reconnects without changing its id', () => {
    const store = createEditorStore({
      document: doc(),
      permissions: { edit: true, save: true, export: true },
    })
    const changes: string[][] = []
    const affected: string[][] = []
    store.onCommit((result) => {
      changes.push([...result.changes.invalidates])
      affected.push(result.changes.affected.map((r) => `${r.kind}:${r.id}`))
    })
    const spec = structuredClone(doc().spec)
    if (spec.type === 'graph') {
      const edge = spec.edges.find((e) => e.id === 'ad')
      if (edge) edge.to = 'isolated'
    }
    const r = store.dispatch({
      id: 'reconnect',
      label: 'reconnect',
      expectedRevision: 0,
      commands: [{ type: 'spec.replace', spec: spec as never, references: 'reject' }],
    })
    expect(r.status).toBe('committed')
    expect(changes.at(-1)).toContain('graph')
    expect(affected.at(-1)).toContain('edge:ad')
    store.dispose()
  })
  it('invalidates layout when undo restores geometry', () => {
    const store = createEditorStore({
      document: doc(),
      permissions: { edit: true, save: true, export: true },
    })
    const changes: string[][] = []
    store.onCommit((result) => changes.push([...result.changes.invalidates]))
    store.dispatch({
      id: 'm',
      label: 'move',
      expectedRevision: 0,
      commands: [{ type: 'nodes.move', positions: { a: { x: 50, y: 50 } } }],
    })
    const undone = store.undo()
    expect(undone.status).toBe('committed')
    expect(changes.at(-1)).toContain('layout')
    expect(changes.at(-1)).toContain('graph')
    store.dispose()
  })
})
