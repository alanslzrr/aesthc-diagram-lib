import { importDocument } from '@aesthc/diagram-lib/editor-core'
import type { DiagramDocument, Locale } from '@aesthc/diagram-lib/editor-core'

// Local recovery for the playground's in-memory sessions. Each example and
// locale pair keeps its own validated document and unapplied text draft, so
// leaving the page and returning does not discard work. Guards still warn
// before navigation; this record is the supplementary recovery path.
const PREFIX = 'adl-playground-draft-v1:'
const MAX_DRAFT_BYTES = 1048576

export type SessionDraftWrite = 'ok' | 'unavailable'

function keyFor(sessionKey: string): string {
  return `${PREFIX}${encodeURIComponent(sessionKey)}`
}

export function readSessionDraft(
  sessionKey: string,
  locale: Locale,
): { document: DiagramDocument; text?: string } | null {
  if (typeof window === 'undefined') return null
  let text: string | null
  try {
    text = window.localStorage.getItem(keyFor(sessionKey))
  } catch {
    return null
  }
  if (!text) return null
  let stored: { schemaVersion?: number; document?: unknown; text?: unknown }
  try {
    stored = JSON.parse(text) as typeof stored
  } catch {
    return null
  }
  if (!stored || stored.schemaVersion !== 1) return null
  const parsed = importDocument(stored.document, { id: 'playground-draft', locale })
  if (!parsed.ok) return null
  return {
    document: parsed.value.document,
    ...(typeof stored.text === 'string' ? { text: stored.text } : {}),
  }
}

export function writeSessionDraft(
  sessionKey: string,
  document: DiagramDocument,
  text: string | undefined,
): SessionDraftWrite {
  if (typeof window === 'undefined') return 'unavailable'
  try {
    const payload = JSON.stringify({ schemaVersion: 1, document, text })
    if (new TextEncoder().encode(payload).length > MAX_DRAFT_BYTES) return 'unavailable'
    window.localStorage.setItem(keyFor(sessionKey), payload)
    return 'ok'
  } catch {
    return 'unavailable'
  }
}

export function clearSessionDraft(sessionKey: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(keyFor(sessionKey))
  } catch {
    /* Best effort. */
  }
}
