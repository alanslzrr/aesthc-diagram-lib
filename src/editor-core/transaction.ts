import { createEditorStore } from './store'
import type { CommitResult, DiagramDocument, EditorPermissions, Transaction } from './types'

/** Stateless transaction adapter: no subscriptions, persistence or shared history escape this call. */
export function applyTransaction(
  document: DiagramDocument,
  transaction: Transaction,
  permissions: EditorPermissions,
): CommitResult {
  const store = createEditorStore({ document, permissions })
  try {
    return store.dispatch(transaction)
  } finally {
    store.dispose()
  }
}
