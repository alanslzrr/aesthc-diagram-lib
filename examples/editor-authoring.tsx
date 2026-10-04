import { getAdapter, type EditorStore } from '@aesthc/diagram-lib/editor-core'
import { compareDocuments } from '@aesthc/diagram-lib/graph'
import type { DiagramDocument } from '@aesthc/diagram-lib/editor-core'

/** Host-owned action. References are exact IDs, never inferred from labels. */
export function appendSelectedView(store: EditorStore, label: string) {
  const snapshot = store.getSnapshot()
  const id = crypto.randomUUID()
  const adapter = getAdapter(snapshot.document.spec.type)
  const selectedNodes = snapshot.selection.filter(ref => ref.kind === 'node').map(ref => ref.id)
  const selectedEdges = snapshot.selection.filter(ref => ref.kind === 'edge').map(ref => ref.id)
  return store.dispatch({
    id: crypto.randomUUID(),
    label: 'Add view and story step',
    expectedRevision: snapshot.document.revision,
    commands: [{
      type: 'views.set',
      views: [...snapshot.document.views, {
        id,
        label,
        focus: {
          nodeIds: selectedNodes.length ? selectedNodes : adapter.nodeIds(snapshot.document.spec),
          edgeIds: selectedEdges,
        },
        camera: { ...snapshot.viewport },
      }],
      story: [...snapshot.document.story, {
        id: crypto.randomUUID(), viewId: id, durationMs: 1500,
      }],
    }],
  })
}

/** Comparison is a read-only result; it never merges either input. */
export function inspectChanges(before: DiagramDocument, after: DiagramDocument) {
  return compareDocuments(before, after)
}
