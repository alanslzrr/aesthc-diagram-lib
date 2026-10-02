import { useEffect, useState } from 'react'
import {
  convertToGraph,
  getAdapter,
  type ConversionReceipt,
  type DiagramDocument,
} from '@aesthc/diagram-lib/editor-core'
import { shallowEqual, useEditor, useEditorSelector } from '@aesthc/diagram-lib/editor'
import { movementModel } from '../lib/movement'

interface PendingConversion {
  document: DiagramDocument
  losses: ConversionReceipt['losses']
  /** Identity and revision the snapshot was generated from. */
  documentId: string
  baseRevision: number
}
/**
 * Capability-aware movement contract for the current diagram type. Free types
 * explain stored coordinates; structured types explain membership/order and
 * offer the safe Convert to graph path (new identity, reviewed losses, bound to
 * the source revision). The conversion is never applied to a stale snapshot.
 */
export function MovementPanel() {
  const { store, locale } = useEditor()
  const snapshot = useEditorSelector((state) => ({ document: state.document }), shallowEqual)
  const t = (en: string, es: string) => (locale === 'es' ? es : en)
  const document = snapshot.document
  const model = movementModel(document.spec.type)
  const free = getAdapter(document.spec.type).capabilities.includes('move-free')
  const [conversion, setConversion] = useState<PendingConversion | null>(null)
  const [message, setMessage] = useState('')
  useEffect(() => {
    if (!conversion) return
    const current = store.getSnapshot().document
    if (current.id === conversion.documentId && current.revision === conversion.baseRevision) return
    setConversion(null)
    setMessage(
      t(
        'The document changed after this conversion was prepared. Request a new conversion to review the current content.',
        'El documento cambió después de preparar esta conversión. Solicita una conversión nueva para revisar el contenido actual.',
      ),
    )
  }, [conversion, document.id, document.revision, store])
  function request() {
    const current = store.getSnapshot().document
    if (current.spec.type === 'graph') return
    const converted = convertToGraph(current, { id: globalThis.crypto.randomUUID() })
    if (!converted.ok) {
      setMessage(converted.diagnostics.map((diagnostic) => diagnostic.code).join(', '))
      return
    }
    setMessage('')
    setConversion({
      document: converted.value.document,
      losses: converted.value.losses,
      documentId: current.id,
      baseRevision: current.revision,
    })
  }
  function confirm() {
    if (!conversion) return
    const current = store.getSnapshot().document
    // A fresh read must never authorize a snapshot from another revision.
    if (current.id !== conversion.documentId || current.revision !== conversion.baseRevision) {
      setConversion(null)
      setMessage(
        t(
          'The document changed after this conversion was prepared. Request a new conversion to review the current content.',
          'El documento cambió después de preparar esta conversión. Solicita una conversión nueva para revisar el contenido actual.',
        ),
      )
      return
    }
    const commit = store.replaceDocument(conversion.document, {
      expectedRevision: conversion.baseRevision,
      history: 'reset',
    })
    if (commit.status === 'rejected') {
      setConversion(null)
      setMessage(commit.diagnostics.map((diagnostic) => diagnostic.code).join(', '))
      return
    }
    setConversion(null)
    setMessage(
      t(
        'Converted to a new graph document. Positions are explicit geometry from now on.',
        'Convertido a un documento graph nuevo. Las posiciones ahora son geometría explícita.',
      ),
    )
  }
  return (
    <section
      className="playground-movement"
      aria-label={t('Movement model', 'Modelo de movimiento')}
      data-movement-kind={model.kind}
    >
      <p className="playground-movement-model">
        <span className="playground-movement-label">{model.label[locale]}</span>
        <span className="playground-movement-hint">{model.hint[locale]}</span>
      </p>
      {!free &&
        (conversion ? (
          <div className="playground-movement-convert" role="alert">
            <strong>
              {t(
                `Convert to a new graph document? ${conversion.losses.length} field${
                  conversion.losses.length === 1 ? '' : 's'
                } will not transfer.`,
                `¿Convertir a un documento graph nuevo? ${conversion.losses.length} campo${
                  conversion.losses.length === 1 ? '' : 's'
                } no se transferirá${conversion.losses.length === 1 ? '' : 'n'}.`,
              )}
            </strong>
            {conversion.losses.length > 0 && (
              <ul>
                {conversion.losses.map((loss) => (
                  <li key={loss.path}>
                    <code>{loss.path}</code> — {loss.reason}
                  </li>
                ))}
              </ul>
            )}
            <span className="playground-movement-actions">
              <button type="button" onClick={confirm}>
                {t('Confirm conversion', 'Confirmar conversión')}
              </button>
              <button type="button" onClick={() => setConversion(null)}>
                {t('Cancel', 'Cancelar')}
              </button>
            </span>
          </div>
        ) : (
          <button type="button" onClick={request}>
            {t('Convert to graph', 'Convertir a graph')}
          </button>
        ))}
      {message && <p role="status">{message}</p>}
    </section>
  )
}
