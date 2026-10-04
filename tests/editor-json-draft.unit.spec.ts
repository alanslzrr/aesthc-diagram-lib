import { describe, expect, it } from 'vitest'
import { serializeDocument, validateDocument } from '../src/editor-core'
import { createEditorStore } from '../src/editor-core/store'
import fixture from './fixtures/editor/graph-document.json'

function make(permissions = { edit: true, save: true, export: true }) {
  const checked = validateDocument(structuredClone(fixture))
  if (!checked.ok) throw Error(JSON.stringify(checked.diagnostics))
  return createEditorStore({ document: checked.value, permissions })
}

describe('text draft commit diagnostics', () => {
  it('rejects a stale but valid buffer without overwriting it or the document', () => {
    const store = make()
    const buffered = structuredClone(store.getSnapshot().document)
    buffered.spec.caption = 'Buffered caption'
    store.setTextDraft(JSON.stringify(buffered))
    store.dispatch({
      id: 'move',
      label: 'move',
      expectedRevision: 0,
      commands: [{ type: 'nodes.move', positions: { a: { x: 50, y: 50 } } }],
    })
    const result = store.commitTextDraft()
    expect(result.status).toBe('rejected')
    expect(result.diagnostics.map((d) => d.code)).toContain('revision.stale')
    const snapshot = store.getSnapshot()
    expect(snapshot.draft.kind).toBe('text')
    if (snapshot.draft.kind === 'text') expect(snapshot.draft.text).toContain('Buffered caption')
    expect(snapshot.document.spec.caption).not.toBe('Buffered caption')
    expect(snapshot.document.scene.nodes.a.x).toBe(50)
  })

  it('surfaces permission revocation on apply and keeps the buffer recoverable', () => {
    const store = make()
    const text = serializeDocument(store.getSnapshot().document)
    store.setTextDraft(text)
    store.setPermissions({ edit: false, save: true, export: true })
    const result = store.commitTextDraft()
    expect(result.status).toBe('rejected')
    expect(result.diagnostics.map((d) => d.code)).toContain('permission.edit')
    const snapshot = store.getSnapshot()
    expect(snapshot.draft.kind).toBe('text')
    if (snapshot.draft.kind === 'text') expect(snapshot.draft.text).toBe(text)
    expect(snapshot.document.revision).toBe(0)
  })
})
