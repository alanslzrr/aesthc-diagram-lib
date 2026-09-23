import { createDocument } from '@aesthc/diagram-lib/editor-core'
import {
  EditorRoot, EditorToolbar, EditorSurface, EditorInspector, EditorOutline, useEditorStore,
} from '@aesthc/diagram-lib/editor'
import '@aesthc/diagram-lib/editor.css'

export function EditorExample() {
  const result = createDocument({
    type: 'graph', caption: 'Editable consumer example', legend: { main: 'Main', branch: 'Branch' },
    nodes: [{ id: 'service', label: 'Consumer service', description: 'Editable through public package exports.' }],
    edges: [],
  }, { id: 'consumer-editor', locale: 'en' })
  if (!result.ok) throw new Error(result.diagnostics.map(d => d.code).join(', '))
  const store = useEditorStore({
    document: result.value, permissions: { edit: true, save: true, export: true },
  })
  return (
    <EditorRoot store={store} locale="en">
      <section className="adl-editor" data-theme="light">
        <EditorToolbar />
        <div className="adl-editor-body"><EditorSurface /><EditorInspector /></div>
        <EditorOutline />
      </section>
    </EditorRoot>
  )
}
