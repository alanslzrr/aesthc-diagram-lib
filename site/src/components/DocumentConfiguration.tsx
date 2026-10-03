import { useId, useRef, useState } from 'react'
import { useEditor } from '@aesthc/diagram-lib/editor'
import type { DiagramDocument, EditorCommand, Palette } from '@aesthc/diagram-lib/editor-core'
import './document-configuration.css'

type Section = 'Document' | 'Layout' | 'Appearance' | 'Selection'
const sections: Section[] = ['Document', 'Layout', 'Appearance', 'Selection']
const channels: (keyof Palette)[] = [
  'background',
  'foreground',
  'card',
  'border',
  'mutedForeground',
  'cobalt',
  'branch',
]
const spanish: Record<string, string> = {
  Document: 'Documento',
  Layout: 'Disposición',
  Appearance: 'Apariencia',
  Selection: 'Selección',
  'Configure document': 'Configurar documento',
  Caption: 'Título',
  'Main legend': 'Leyenda principal',
  'Branch legend': 'Leyenda alternativa',
  Padding: 'Margen',
  'Text scale': 'Escala de texto',
  'Grid spacing': 'Espaciado de cuadrícula',
  'Snap to grid': 'Ajustar a cuadrícula',
  'Show grid': 'Mostrar cuadrícula',
  'Edge style': 'Estilo de conexión',
  straight: 'recta',
  orthogonal: 'ortogonal',
  'Show legend': 'Mostrar leyenda',
  'Light palette': 'Paleta clara',
  'Dark palette': 'Paleta oscura',
  'Apply configuration': 'Aplicar configuración',
  Cancel: 'Cancelar',
  Kind: 'Tipo semántico',
  Description: 'Descripción',
  Roles: 'Roles',
  Tags: 'Etiquetas',
  Notes: 'Notas',
  Owner: 'Responsable',
  'Select a node or connection before opening configuration.':
    'Selecciona un nodo o conexión antes de abrir la configuración.',
  'Palette editing does not change the global theme.': 'Editar la paleta no cambia el tema global.',
}

function selectedNode(document: DiagramDocument, id: string) {
  const spec = document.spec
  switch (spec.type) {
    case 'sequence':
      return spec.participants.find((node) => node.id === id)
    case 'er':
      return spec.entities.find((node) => node.id === id)
    case 'state-machine':
      return spec.states.find((node) => node.id === id)
    case 'timeline':
      return spec.events.find((node) => node.id === id)
    default:
      return spec.nodes.find((node) => node.id === id)
  }
}

/** Host UI over public, revision-checked commands. Opening captures a revision;
 * an external edit rejects Apply rather than overwriting newer work. */
export function DocumentConfiguration() {
  const { store, locale } = useEditor()
  const t = (value: string) => (locale === 'es' ? (spanish[value] ?? value) : value)
  const dialog = useRef<HTMLDialogElement>(null)
  const opener = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const [draft, setDraft] = useState<DiagramDocument | null>(null)
  const [original, setOriginal] = useState<DiagramDocument | null>(null)
  const [section, setSection] = useState<Section>('Document')
  const [palette, setPalette] = useState<'light' | 'dark'>('light')
  const [subject, setSubject] = useState<{ kind: 'node' | 'edge'; id: string } | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const close = () => {
    dialog.current?.close()
    setDraft(null)
    opener.current?.focus({ preventScroll: true })
  }
  const edit = (change: (next: DiagramDocument) => void) => {
    if (!draft) return
    const next = structuredClone(draft)
    change(next)
    setDraft(next)
  }
  const input = (label: string, value: string, update: (value: string) => void) => (
    <label>
      {t(label)}
      <input value={value} onChange={(event) => update(event.target.value)} />
    </label>
  )
  const numeric = (label: string, value: number, update: (value: number) => void) => (
    <label>
      {t(label)}
      <input
        type="number"
        step="any"
        value={Number.isFinite(value) ? value : ''}
        onChange={(event) => update(event.target.value === '' ? NaN : Number(event.target.value))}
      />
    </label>
  )
  const check = (label: string, value: boolean, update: (value: boolean) => void) => (
    <label className="configuration-check">
      <input type="checkbox" checked={value} onChange={(event) => update(event.target.checked)} />
      {t(label)}
    </label>
  )
  const node = draft && subject?.kind === 'node' ? selectedNode(draft, subject.id) : undefined
  const metadata =
    draft && subject
      ? (draft.metadata[subject.kind === 'node' ? 'nodes' : 'edges'][subject.id] ?? {
          roles: [],
          tags: [],
        })
      : null
  return (
    <>
      <button
        ref={opener}
        type="button"
        onClick={() => {
          const snapshot = store.getSnapshot()
          setOriginal(snapshot.document)
          setDraft(structuredClone(snapshot.document))
          const selected = snapshot.selection.find((item) => item.kind !== 'group')
          setSubject(
            selected && selected.kind !== 'group' ? { id: selected.id, kind: selected.kind } : null,
          )
          setErrors([])
          setSection('Document')
          dialog.current?.showModal()
        }}
      >
        {t('Configure document')}
      </button>
      <dialog
        ref={dialog}
        className="adl-editor-dialog document-configuration"
        aria-labelledby={titleId}
        onCancel={(event) => {
          event.preventDefault()
          close()
        }}
      >
        <h2 id={titleId}>{t('Configure document')}</h2>
        <div className="configuration-navigation" aria-label={t('Configure document')}>
          {sections.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={section === item}
              onClick={() => setSection(item)}
            >
              {t(item)}
            </button>
          ))}
        </div>
        {draft && (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (!original) return
              const nextMetadata = structuredClone(draft.metadata)
              if (subject) {
                const collection = subject.kind === 'node' ? 'nodes' : 'edges'
                const entity = nextMetadata[collection][subject.id]
                if (entity) {
                  entity.roles = entity.roles.map((item) => item.trim()).filter(Boolean)
                  entity.tags = entity.tags.map((item) => item.trim()).filter(Boolean)
                }
              }
              const commands: EditorCommand[] = []
              if (JSON.stringify(draft.spec) !== JSON.stringify(original.spec))
                commands.push({ type: 'spec.replace', spec: draft.spec, references: 'reject' })
              if (JSON.stringify(draft.presentation) !== JSON.stringify(original.presentation))
                commands.push({ type: 'presentation.set', presentation: draft.presentation })
              if (JSON.stringify(nextMetadata) !== JSON.stringify(original.metadata))
                commands.push({ type: 'metadata.set', metadata: nextMetadata })
              const result = store.dispatch({
                id: crypto.randomUUID(),
                label: 'Configure document',
                expectedRevision: original.revision,
                commands,
              })
              if (result.status === 'rejected')
                setErrors(result.diagnostics.map((item) => `${item.path}: ${item.code}`))
              else close()
            }}
          >
            <div className="configuration-fields">
              {section === 'Document' && (
                <>
                  {input('Caption', draft.spec.caption, (value) =>
                    edit((next) => {
                      next.spec.caption = value
                    }),
                  )}
                  {input('Main legend', draft.spec.legend.main, (value) =>
                    edit((next) => {
                      next.spec.legend.main = value
                    }),
                  )}
                  {input('Branch legend', draft.spec.legend.branch, (value) =>
                    edit((next) => {
                      next.spec.legend.branch = value
                    }),
                  )}
                  {check('Show legend', draft.presentation.legend === 'visible', (value) =>
                    edit((next) => {
                      next.presentation.legend = value ? 'visible' : 'hidden'
                    }),
                  )}
                </>
              )}
              {section === 'Layout' && (
                <>
                  {numeric('Padding', draft.presentation.padding, (value) =>
                    edit((next) => {
                      next.presentation.padding = value
                    }),
                  )}
                  {numeric('Text scale', draft.presentation.textScale, (value) =>
                    edit((next) => {
                      next.presentation.textScale = value
                    }),
                  )}
                  {numeric('Grid spacing', draft.presentation.grid.size, (value) =>
                    edit((next) => {
                      next.presentation.grid.size = value
                    }),
                  )}
                  {check('Snap to grid', draft.presentation.grid.snap, (value) =>
                    edit((next) => {
                      next.presentation.grid.snap = value
                    }),
                  )}
                  {check('Show grid', draft.presentation.grid.visible, (value) =>
                    edit((next) => {
                      next.presentation.grid.visible = value
                    }),
                  )}
                  <label>
                    {t('Edge style')}
                    <select
                      value={draft.presentation.edgeStyle}
                      onChange={(event) =>
                        edit((next) => {
                          next.presentation.edgeStyle =
                            event.target.value === 'straight' ? 'straight' : 'orthogonal'
                        })
                      }
                    >
                      {['straight', 'orthogonal'].map((value) => (
                        <option key={value} value={value}>
                          {t(value)}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
              {section === 'Appearance' && (
                <>
                  <div className="configuration-navigation">
                    {(['light', 'dark'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        aria-pressed={palette === mode}
                        onClick={() => setPalette(mode)}
                      >
                        {t(mode === 'light' ? 'Light palette' : 'Dark palette')}
                      </button>
                    ))}
                  </div>
                  <p>{t('Palette editing does not change the global theme.')}</p>
                  {channels.map((channel) => (
                    <div key={channel}>
                      {input(channel, draft.presentation.theme[palette][channel], (value) =>
                        edit((next) => {
                          next.presentation.theme[palette][channel] = value
                        }),
                      )}
                    </div>
                  ))}
                </>
              )}
              {section === 'Selection' &&
                (metadata && subject ? (
                  <>
                    <p>
                      {subject.kind}: {subject.id}
                    </p>
                    {node &&
                      input('Kind', node.kind ?? '', (value) =>
                        edit((next) => {
                          const target = selectedNode(next, subject.id)
                          if (target) target.kind = value
                        }),
                      )}
                    {node &&
                      draft.spec.type !== 'sequence' &&
                      draft.spec.type !== 'er' &&
                      input(
                        'Description',
                        'description' in node && typeof node.description === 'string'
                          ? node.description
                          : '',
                        (value) =>
                          edit((next) => {
                            const target: { id: string; description?: string } | undefined =
                              selectedNode(next, subject.id)
                            if (target) target.description = value
                          }),
                      )}
                    {(['roles', 'tags', 'notes', 'owner'] as const).map((field) => (
                      <div key={field}>
                        {input(
                          field[0].toUpperCase() + field.slice(1),
                          Array.isArray(metadata[field])
                            ? metadata[field].join(',')
                            : (metadata[field] ?? ''),
                          (value) =>
                            edit((next) => {
                              const collection = subject.kind === 'node' ? 'nodes' : 'edges'
                              const current = next.metadata[collection][subject.id] ?? {
                                roles: [],
                                tags: [],
                              }
                              next.metadata[collection][subject.id] = {
                                ...current,
                                [field]:
                                  field === 'roles' || field === 'tags' ? value.split(',') : value,
                              }
                            }),
                        )}
                      </div>
                    ))}
                  </>
                ) : (
                  <p>{t('Select a node or connection before opening configuration.')}</p>
                ))}
            </div>
            {errors.length > 0 && <p role="alert">{errors.join('; ')}</p>}
            <footer>
              <button type="button" onClick={close}>
                {t('Cancel')}
              </button>
              <button type="submit">{t('Apply configuration')}</button>
            </footer>
          </form>
        )}
      </dialog>
    </>
  )
}
