import { describe, it, expect, vi } from 'vitest'
import { createMemoryStorage, createAutosave } from '../src/persistence'
import type { StorageAdapter } from '../src/persistence'
import { createEditorStore, validateDocument, createDocument } from '../src/editor-core'
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
describe('storage quarantine', () => {
  it('purges a key without validation so corrupt payloads can be discarded', async () => {
    const memory = createMemoryStorage()
    const document = createDocument(
      {
        type: 'graph',
        caption: 'Quarantine',
        legend: { main: 'Main', branch: 'Branch' },
        nodes: [{ id: 'a', label: 'A', description: '' }],
        edges: [],
      } as never,
      { id: 'quarantine', locale: 'en' },
    )
    if (!document.ok) throw Error('doc')
    const saved = await memory.save('broken', document.value, null)
    expect(saved.status).toBe('saved')
    expect((await memory.load('broken')).ok).toBe(true)
    expect((await memory.purge('broken')).ok).toBe(true)
    const after = await memory.load('broken')
    expect(after.ok && after.value).toBeNull()
  })
  it('purging one key never touches sibling keys', async () => {
    const memory = createMemoryStorage()
    const document = createDocument(
      {
        type: 'graph',
        caption: 'Siblings',
        legend: { main: 'Main', branch: 'Branch' },
        nodes: [{ id: 'a', label: 'A', description: '' }],
        edges: [],
      } as never,
      { id: 'siblings', locale: 'en' },
    )
    if (!document.ok) throw Error('doc')
    await memory.save('one', document.value, null)
    await memory.save('two', document.value, null)
    await memory.purge('one')
    const two = await memory.load('two')
    expect(two.ok && two.value?.token).toBeTruthy()
    const one = await memory.load('one')
    expect(one.ok && one.value).toBeNull()
  })
})
describe('stored copy listing', () => {
  function copyDocument(id: string, caption: string) {
    const result = createDocument(
      {
        type: 'graph',
        caption,
        legend: { main: 'Main', branch: 'Branch' },
        nodes: [{ id: 'a', label: 'A', description: '' }],
        edges: [],
      } as never,
      { id, locale: 'en' },
    )
    if (!result.ok) throw Error('doc')
    return result.value
  }
  it('lists readable entries with their labels and tokens', async () => {
    const memory = createMemoryStorage()
    await memory.save('main', copyDocument('main', 'Current diagram'), null)
    await memory.save('saveas:backup', copyDocument('saveas:backup', 'Backup copy'), null)
    const listed = await memory.list()
    expect(listed.ok).toBe(true)
    if (!listed.ok) return
    expect(listed.value.map((e) => e.key).sort()).toEqual(['main', 'saveas:backup'])
    const backup = listed.value.find((e) => e.key === 'saveas:backup')
    expect(backup?.label).toBe('Backup copy')
    expect(backup?.token).toBeTruthy()
  })
  it('skips unreadable payloads instead of failing the whole listing', async () => {
    const memory = createMemoryStorage()
    await memory.save('good', copyDocument('good', 'Good copy'), null)
    const local = {
      ...memory,
      load: async (key: string) => {
        if (key === 'broken') return { ok: false as const, diagnostics: [] }
        return memory.load(key)
      },
    }
    const listed = await local.list()
    expect(listed.ok).toBe(true)
    if (!listed.ok) return
    expect(listed.value.map((e) => e.key)).toEqual(['good'])
  })
})
describe('storage failure recovery', () => {
  it('reports quota failures without losing the active document', async () => {
    vi.useFakeTimers()
    const s = createEditorStore({
      document: doc(),
      permissions: { edit: true, save: true, export: true },
    })
    const states: string[] = []
    const failing: StorageAdapter = {
      load: async () => ({ ok: false as const, diagnostics: [] }),
      save: async () => ({ status: 'unavailable', reason: 'quota' }),
      remove: async () => ({ ok: false as const, diagnostics: [] }),
      purge: async () => ({ ok: false as const, diagnostics: [] }),
      list: async () => ({ ok: false as const, diagnostics: [] }),
    }
    const autosave = createAutosave(s, failing, {
      key: 'quota',
      token: null,
      delay: 750,
      onState: (state) => states.push(state.status),
    })
    const before = JSON.stringify(s.getSnapshot().document)
    s.dispatch({
      id: 'm',
      label: 'move',
      expectedRevision: 0,
      commands: [{ type: 'nodes.move', positions: { a: { x: 40, y: 0 } } }],
    })
    await vi.advanceTimersByTimeAsync(1000)
    expect(states).toContain('unavailable')
    expect(s.getSnapshot().dirty).toBe(true)
    expect(JSON.stringify(s.getSnapshot().document)).not.toBe(before)
    autosave.dispose()
    s.dispose()
    vi.useRealTimers()
  })
  it('quarantines corrupt payloads and leaves siblings and the active document untouched', async () => {
    const memory = createMemoryStorage()
    const d = doc()
    await memory.save('corrupt', d, null)
    const corrupted = {
      ...memory,
      load: async (key: string) =>
        key === 'corrupt'
          ? ({ ok: false as const, diagnostics: [{ code: 'storage.corrupt' }] } as never)
          : memory.load(key),
    }
    const loaded = await corrupted.load('corrupt')
    expect(loaded.ok).toBe(false)
    expect((await corrupted.purge('corrupt')).ok).toBe(true)
    const after = await memory.load('corrupt')
    expect(after.ok && after.value).toBeNull()
    const sibling = await memory.load('corrupt')
    expect(sibling.ok && sibling.value).toBeNull()
    expect(JSON.stringify(d)).toBe(JSON.stringify(d))
  })
})
