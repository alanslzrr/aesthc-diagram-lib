import { afterEach, describe, expect, it, vi } from 'vitest'
import { readDraft, writeDraft, removeDraft } from '../site/src/lib/drafts'
const values = new Map<string, string>()
afterEach(() => {
  vi.unstubAllGlobals()
  values.clear()
})
describe('local draft boundary', () => {
  function storage() {
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    })
  }
  it('round trips raw invalid JSON without executing or validating it', () => {
    storage()
    writeDraft('example-flowchart:en', '{ broken')
    expect(readDraft('example-flowchart:en')?.text).toBe('{ broken')
    removeDraft('example-flowchart:en')
    expect(readDraft('example-flowchart:en')).toBeNull()
  })
  it('rejects unknown versions, malformed records and excessive raw text', () => {
    storage()
    for (const value of [
      '{',
      JSON.stringify({ version: 2, text: '{}' }),
      JSON.stringify({ version: 1, text: 3 }),
      JSON.stringify({ version: 1, text: 'x'.repeat(262145), savedAt: '' }),
    ]) {
      values.set('adl-draft-v1:test', value)
      expect(readDraft('test')).toBeNull()
    }
    expect(() => writeDraft('test', 'x'.repeat(262145))).toThrow('Draft too large')
  })
  it('keeps storage failures observable to the UI', () => {
    vi.stubGlobal('localStorage', {
      getItem() {
        throw new Error('Blocked')
      },
      setItem() {
        throw new Error('Blocked')
      },
    })
    expect(() => readDraft('test')).toThrow('Blocked')
    expect(() => writeDraft('test', '{}')).toThrow('Blocked')
  })
})
