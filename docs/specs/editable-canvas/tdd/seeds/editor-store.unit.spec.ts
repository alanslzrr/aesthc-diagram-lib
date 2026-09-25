import { describe, expect, it } from 'vitest'
import { createEditorStore, validateDocument } from '../src/editor-core'
import fixture from './fixtures/editor/graph-document.json'

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
