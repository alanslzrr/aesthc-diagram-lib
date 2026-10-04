import { importDocument } from '@aesthc/diagram-lib/editor-core'
import type { DiagramDocument, Locale } from '@aesthc/diagram-lib/editor-core'

// Bounded, same-origin handoff record between the Playground and Studio. The
// record is identified separately from the document identity: the document
// keeps its own id, while the transfer carries source metadata for the Studio
// to explain where it came from.
export const HANDOFF_STORAGE_KEY = 'adl-handoff-v1:studio'
const MAX_HANDOFF_BYTES = 1048576

export interface PlaygroundHandoff {
  schemaVersion: 1
  document: DiagramDocument
  locale: Locale
  hostTheme: 'light' | 'dark'
  source: { entryKey: string; sessionKey: string }
}

interface StoredHandoff {
  schemaVersion: 1
  document: unknown
  locale?: string
  hostTheme?: string
  source?: { entryKey?: string; sessionKey?: string }
}

/** Persist a handoff with a hard byte budget. Returns false instead of throwing. */
export function writeHandoff(
  document: DiagramDocument,
  options: { locale: Locale; hostTheme: 'light' | 'dark'; sessionKey: string; entryKey: string },
): boolean {
  if (typeof window === 'undefined') return false
  const record: PlaygroundHandoff = {
    schemaVersion: 1,
    document,
    locale: options.locale,
    hostTheme: options.hostTheme,
    source: { entryKey: options.entryKey, sessionKey: options.sessionKey },
  }
  let text: string
  try {
    text = JSON.stringify(record)
  } catch {
    return false
  }
  if (new TextEncoder().encode(text).length > MAX_HANDOFF_BYTES) return false
  try {
    window.localStorage.setItem(HANDOFF_STORAGE_KEY, text)
    return true
  } catch {
    return false
  }
}

/** Read and validate a handoff. A malformed record is removed and ignored. */
export function readHandoff(): PlaygroundHandoff | null {
  if (typeof window === 'undefined') return null
  let text: string | null
  try {
    text = window.localStorage.getItem(HANDOFF_STORAGE_KEY)
  } catch {
    return null
  }
  if (!text) return null
  const remove = () => {
    try {
      window.localStorage.removeItem(HANDOFF_STORAGE_KEY)
    } catch {
      /* A denied storage keeps the record; the caller still ignores it. */
    }
  }
  let stored: StoredHandoff
  try {
    stored = JSON.parse(text) as StoredHandoff
  } catch {
    remove()
    return null
  }
  if (!stored || stored.schemaVersion !== 1) {
    remove()
    return null
  }
  const parsed = importDocument(stored.document, {
    id: 'handoff',
    locale: stored.locale === 'es' ? 'es' : 'en',
  })
  if (!parsed.ok) {
    remove()
    return null
  }
  return {
    schemaVersion: 1,
    document: parsed.value.document,
    locale: stored.locale === 'es' ? 'es' : 'en',
    hostTheme: stored.hostTheme === 'dark' ? 'dark' : 'light',
    source: {
      entryKey: stored.source?.entryKey ?? '',
      sessionKey: stored.source?.sessionKey ?? '',
    },
  }
}

export function clearHandoff(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(HANDOFF_STORAGE_KEY)
  } catch {
    /* Best effort. */
  }
}
