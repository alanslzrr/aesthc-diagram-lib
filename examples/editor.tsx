import { createDocument, createEditorStore } from '@aesthc/diagram-lib/editor-core'
import {
  EditorRoot, EditorToolbar, EditorSurface, EditorInspector, EditorOutline, EditorStatus, useEditorStore,
} from '@aesthc/diagram-lib/editor'
import '@aesthc/diagram-lib/editor.css'
import { useEffect, useState } from 'react'

function makeDocument(id: string, caption: string, label: string) {
  const result = createDocument({
    type: 'graph', caption, legend: { main: 'Main', branch: 'Branch' },
    nodes: [{ id: 'service', label, description: 'Editable through public package exports.' }],
    edges: [],
  }, { id, locale: 'en' })
  if (!result.ok) throw new Error(result.diagnostics.map(d => d.code).join(', '))
  return result.value
}

export function EditorExample() {
  const store = useEditorStore({
    document: makeDocument('consumer-editor', 'Editable consumer example', 'Consumer service'),
    permissions: { edit: true, save: true, export: true },
  })
  return (
    <EditorRoot store={store} locale="en">
      <section className="adl-editor" data-theme="light">
        <EditorToolbar />
        <div className="adl-editor-body"><EditorSurface /><EditorInspector /></div>
        <EditorOutline />
        <EditorStatus />
      </section>
    </EditorRoot>
  )
}

function ControlledEditor() {
  const [permissions, setPermissions] = useState({ edit: true, save: true, export: true })
  const [store] = useState(() =>
    createEditorStore({
      document: makeDocument('controlled-editor', 'Host-owned editor', 'Controlled service'),
      permissions: { edit: true, save: true, export: true },
    }),
  )
  useEffect(() => store.setPermissions(permissions), [permissions, store])
  useEffect(() => () => store.dispose(), [store])
  return (
    <>
      <EditorRoot store={store} locale="en">
        <section className="adl-editor" data-theme="dark">
          <EditorToolbar />
          <div className="adl-editor-body"><EditorSurface /><EditorInspector /></div>
          <EditorOutline />
          <EditorStatus />
        </section>
      </EditorRoot>
      <div className="adl-editor-controls">
        <button
          type="button"
          onClick={() => setPermissions({ ...permissions, edit: !permissions.edit })}
        >
          Toggle edit permission
        </button>
        <button
          type="button"
          onClick={() =>
            store.replaceDocument(
              makeDocument('controlled-editor', 'Host-owned editor', 'Externally replaced'),
              { expectedRevision: store.getSnapshot().document.revision, history: 'reset' },
            )
          }
        >
          Replace externally
        </button>
      </div>
    </>
  )
}

export function EditorControlledExample() {
  return <ControlledEditor />
}