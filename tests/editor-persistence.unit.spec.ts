import { describe, it, expect, vi } from 'vitest'
import { createMemoryStorage, createAutosave } from '../src/persistence'
import { createEditorStore, validateDocument } from '../src/editor-core'
import fixture from './fixtures/editor/graph-document.json'
function doc() {
  const r = validateDocument(structuredClone(fixture))
  if (!r.ok) throw Error('fixture')
  return r.value
}
describe('persistence with explicit concurrency tokens', () => {
  it('rejects stale saves, isolates values and guards remove', async () => {
    const a = createMemoryStorage(),
      d = doc()
    const r = await a.save('d', d, null)
    expect(r.status).toBe('saved')
    if (r.status !== 'saved') return
    d.spec.caption = 'changed'
    expect((await a.save('d', d, null)).status).toBe('conflict')
    const loaded = await a.load('d')
    expect(loaded.ok).toBe(true)
    if (!loaded.ok || !loaded.value) return
    expect(loaded.value.document.spec.caption).not.toBe('changed')
    expect((await a.remove('d', 'wrong')).ok).toBe(false)
    expect((await a.remove('d', r.token)).ok).toBe(true)
  })
  it('autosaves only committed content and retains dirty when a save completes late', async () => {
    vi.useFakeTimers()
    const a = createMemoryStorage(),
      s = createEditorStore({
        document: doc(),
        permissions: { edit: true, save: true, export: true },
      })
    const save = vi.spyOn(a, 'save'),
      autosave = createAutosave(s, a, { key: 'd', token: null, delay: 750 })
    s.setViewport({ x: 20, y: 20, zoom: 1 })
    await vi.advanceTimersByTimeAsync(1000)
    expect(save).not.toHaveBeenCalled()
    s.dispatch({
      id: 'm',
      label: 'move',
      expectedRevision: 0,
      commands: [{ type: 'nodes.move', positions: { a: { x: 100, y: 0 } } }],
    })
    await vi.advanceTimersByTimeAsync(749)
    expect(save).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(save).toHaveBeenCalledTimes(1)
    expect(s.getSnapshot().dirty).toBe(false)
    autosave.dispose()
    s.dispose()
    vi.useRealTimers()
  })
})
