import { PLAYGROUND_LIMITS } from './playground-policy'
const prefix = 'adl-draft-v1:'
export interface LocalDraft {
  version: 1
  text: string
  savedAt: string
}
export function readDraft(key: string): LocalDraft | null {
  const value = localStorage.getItem(prefix + key)
  if (!value || value.length > PLAYGROUND_LIMITS.expanded * 6 + 256) return null
  try {
    const data = JSON.parse(value)
    return data?.version === 1 &&
      typeof data.text === 'string' &&
      data.text.length <= PLAYGROUND_LIMITS.expanded &&
      typeof data.savedAt === 'string'
      ? data
      : null
  } catch {
    return null
  }
}
export function writeDraft(key: string, text: string) {
  if (text.length > PLAYGROUND_LIMITS.expanded) throw new Error('Draft too large')
  localStorage.setItem(
    prefix + key,
    JSON.stringify({ version: 1, text, savedAt: new Date().toISOString() }),
  )
}
export function removeDraft(key: string) {
  localStorage.removeItem(prefix + key)
}
