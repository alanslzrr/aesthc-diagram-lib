import { describe, expect, it } from 'vitest'
import { createEditorStore, validateDocument, serializeDocument } from '../src/editor-core'
import fixture from './fixtures/editor/graph-document.json'
function make(edit = true) {
  const checked = validateDocument(structuredClone(fixture))
  if (!checked.ok) throw Error('fixture')
  return createEditorStore({
    document: checked.value,
    permissions: { edit, save: true, export: true },
  })
}
const move = (x: number) => [{ type: 'nodes.move' as const, positions: { a: { x, y: 0 } } }]
describe('store lifecycle', () => {
  it('keeps gestures ephemeral and commits one undo entry', () => {
    const s = make()
    let commits = 0
    s.onCommit(() => commits++)
    expect(s.beginGesture({ id: 'g', label: 'drag', expectedRevision: 0 }).ok).toBe(true)
    expect(s.previewGesture(move(50)).ok).toBe(true)
    expect(s.getSnapshot().document.scene.nodes.a.x).toBe(0)
    expect(s.getSnapshot().draft.kind).toBe('gesture')
    s.previewGesture(move(100))
    expect(s.commitGesture().status).toBe('committed')
    expect(commits).toBe(1)
    expect(s.undo().status).toBe('committed')
    expect(s.getSnapshot().document.scene.nodes.a.x).toBe(0)
    expect(s.getSnapshot().canUndo).toBe(false)
  })
  it('cancels gesture and protects locked nodes and read-only stores', () => {
    const s = make()
    s.beginGesture({ id: 'g', label: 'drag', expectedRevision: 0 })
    s.previewGesture(move(50))
    s.cancelGesture()
    expect(s.getSnapshot().document.revision).toBe(0)
    s.dispatch({
      id: 'lock',
      label: 'lock',
      expectedRevision: 0,
      commands: [{ type: 'nodes.set-lock', ids: ['a'], locked: true }],
    })
    expect(
      s.dispatch({ id: 'move', label: 'move', expectedRevision: 1, commands: move(50) }).status,
    ).toBe('rejected')
    expect(
      make(false).dispatch({ id: 'move', label: 'move', expectedRevision: 0, commands: move(50) })
        .status,
    ).toBe('rejected')
  })
  it('keeps invalid text separate and rejects stale text drafts', () => {
    const s = make()
    s.setTextDraft('{invalid')
    expect(s.commitTextDraft().status).toBe('rejected')
    expect(s.getSnapshot().document.revision).toBe(0)
    s.setTextDraft(serializeDocument(s.getSnapshot().document))
    s.dispatch({ id: 'move', label: 'move', expectedRevision: 0, commands: move(50) })
    expect(s.commitTextDraft().status).toBe('rejected')
    expect(s.getSnapshot().document.scene.nodes.a.x).toBe(50)
  })
  it('uses content equality for dirty state and isolates immutable snapshots', () => {
    const s = make()
    const first = s.getSnapshot()
    expect(s.getSnapshot()).toBe(first)
    expect(Object.isFrozen(first.document.spec)).toBe(true)
    s.dispatch({ id: 'move', label: 'move', expectedRevision: 0, commands: move(50) })
    expect(s.getSnapshot().dirty).toBe(true)
    s.undo()
    expect(s.getSnapshot().dirty).toBe(false)
    s.redo()
    s.markSaved(s.getSnapshot().document)
    expect(s.getSnapshot().dirty).toBe(false)
    s.dispose()
    expect(
      s.dispatch({ id: 'x', label: 'x', expectedRevision: 3, commands: move(60) }).status,
    ).toBe('rejected')
  })
})

describe('transaction hardening', () => {
  it('rejects a history entry larger than the configured budget without changing content', () => {
    const checked = validateDocument(structuredClone(fixture))
    if (!checked.ok) throw Error('fixture')
    const s = createEditorStore({
      document: checked.value,
      permissions: { edit: true, save: true, export: true },
      history: { maxEntries: 100, maxBytes: 64 },
    })
    const result = s.dispatch({
      id: 'move',
      label: 'move',
      expectedRevision: 0,
      commands: move(60),
    })
    expect(result.status).toBe('rejected')
    expect(result.diagnostics.map((d) => d.code)).toContain('history.capacity')
    expect(s.getSnapshot().document.revision).toBe(0)
  })
  it('does not commit a click as a drag', () => {
    const s = make()
    s.beginGesture({ id: 'g', label: 'drag', expectedRevision: 0 })
    expect(s.commitGesture().status).toBe('noop')
    expect(s.getSnapshot().canUndo).toBe(false)
  })
})

describe('group deletion', () => {
  it('deletes descendant members and their incident relations atomically', () => {
    const s = make(),
      d = structuredClone(s.getSnapshot().document)
    d.scene.groups = [
      { id: 'outer', label: 'Outer', kind: 'visual', nodeIds: ['a'], locked: false },
      {
        id: 'inner',
        label: 'Inner',
        kind: 'visual',
        nodeIds: ['b'],
        parentGroup: 'outer',
        locked: false,
      },
    ]
    s.replaceDocument(d, { expectedRevision: 0, history: 'reset' })
    const result = s.dispatch({
      id: 'delete',
      label: 'Delete group',
      expectedRevision: 1,
      commands: [{ type: 'group.remove', id: 'outer', members: 'delete' }],
    })
    expect(result.status).toBe('committed')
    expect(s.getSnapshot().document.scene.groups).toHaveLength(0)
    expect(s.getSnapshot().document.scene.nodes.a).toBeUndefined()
    expect(s.getSnapshot().document.scene.nodes.b).toBeUndefined()
    expect(s.undo().status).toBe('committed')
    expect(s.getSnapshot().document.scene.groups).toHaveLength(2)
  })
})
