import { useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { DiagramDocument, EntityRef, Locale } from '../editor-core/types'
import { resolveDocument } from '../editor-core/scene'
import { compareDocuments } from '../graph'
import { renderSvg } from '../render'
import { downloadArtifact } from '../export'
import type { ExportArtifact } from '../export'

export interface ComparisonProps {
  before: DiagramDocument
  after: DiagramDocument
  locale?: Locale
}
interface ChangeItem {
  key: string
  ref: EntityRef | null
  label: string
}
/** Before/Delta/After comparison with keyboard navigation and a JSON receipt.
 * Entities are matched by exact ID; inputs are never mutated and no merge
 * behavior is implied. */
export function Comparison({ before, after, locale = 'en' }: ComparisonProps) {
  const t = (en: string, es: string) => (locale === 'es' ? es : en)
  const comparison = useMemo(() => compareDocuments(before, after), [before, after])
  const [side, setSide] = useState<'before' | 'after'>('after')
  const [selected, setSelected] = useState(0)
  const list = useRef<HTMLUListElement>(null)
  const items: ChangeItem[] = useMemo(() => {
    if (!comparison.ok) return []
    const entries: ChangeItem[] = []
    for (const delta of [...comparison.value.nodes, ...comparison.value.edges])
      entries.push({
        key: `${delta.kind}:${delta.id}`,
        ref: delta.status === 'added' ? null : { kind: delta.kind, id: delta.id },
        label: `${delta.status} · ${delta.id}`,
      })
    for (const entry of comparison.value.reorder)
      entries.push({
        key: `reorder:${entry.collection}`,
        ref: null,
        label: `reorder · ${entry.collection}: ${entry.after.join(' → ')}`,
      })
    return entries
  }, [comparison])
  const selectedRef = items[selected]?.ref ?? null
  const scene = useMemo(() => {
    const document = side === 'before' ? before : after
    const resolved = resolveDocument(document, {
      quality: 'edit',
      requestId: 'comparison',
      skipDiagnostics: true,
    })
    if (!resolved.ok) return null
    return {
      document,
      svg: renderSvg(document, resolved.value, {
        instanceId: `comparison-${side}`,
        theme: document.presentation.theme.mode,
        highlight: selectedRef
          ? selectedRef.kind === 'node'
            ? { nodes: new Set([selectedRef.id]) }
            : { edges: new Set([selectedRef.id]) }
          : undefined,
      }),
    }
  }, [before, after, side, selectedRef])
  function onKeyDown(event: ReactKeyboardEvent<HTMLUListElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSelected((index) => Math.min(index + 1, items.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSelected((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Home') {
      event.preventDefault()
      setSelected(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      setSelected(Math.max(0, items.length - 1))
    }
  }
  function exportComparison() {
    if (!comparison.ok) return
    const artifact: ExportArtifact = {
      bytes: new TextEncoder().encode(JSON.stringify(comparison.value, null, 2)),
      receipt: {
        documentId: `${comparison.value.before.documentId}→${comparison.value.after.documentId}`,
        revision: comparison.value.after.revision,
        format: 'json',
        mimeType: 'application/json',
        bytes: 0,
        scope: 'document',
        canonical: false,
        sourceIncluded: false,
        verified: false,
        diagnostics: [],
      },
    }
    artifact.receipt.bytes = artifact.bytes.byteLength
    downloadArtifact(artifact, 'comparison.json')
  }
  if (!comparison.ok)
    return (
      <section className="adl-viewer-comparison" aria-label={t('Comparison', 'Comparación')}>
        <p className="adl-viewer-note" role="alert">
          {comparison.diagnostics.map((diagnostic) => diagnostic.code).join(', ')}
        </p>
      </section>
    )
  const counts = comparison.value.counts
  return (
    <section className="adl-viewer-comparison" aria-label={t('Comparison', 'Comparación')}>
      <header className="adl-viewer-controls">
        <fieldset>
          <legend>{t('Side', 'Lado')}</legend>
          <label>
            <input
              type="radio"
              name="comparison-side"
              checked={side === 'before'}
              onChange={() => setSide('before')}
            />
            {t('Before', 'Antes')}
          </label>
          <label>
            <input
              type="radio"
              name="comparison-side"
              checked={side === 'after'}
              onChange={() => setSide('after')}
            />
            {t('After', 'Después')}
          </label>
        </fieldset>
        <p role="status">
          {t(
            `${counts.added} added · ${counts.removed} removed · ${counts.modified} modified (${counts.presentationOnly} presentation-only) · ${counts.reorder} reordered`,
            `${counts.added} añadidos · ${counts.removed} eliminados · ${counts.modified} modificados (${counts.presentationOnly} solo presentación) · ${counts.reorder} reordenados`,
          )}
        </p>
        <button type="button" onClick={exportComparison}>
          {t('Export comparison JSON', 'Exportar comparación JSON')}
        </button>
      </header>
      <div className="adl-viewer-comparison-body">
        <ul
          ref={list}
          className="adl-viewer-changes"
          role="listbox"
          aria-label={t('Changes', 'Cambios')}
          tabIndex={0}
          aria-activedescendant={items[selected] ? `change-${selected}` : undefined}
          onKeyDown={onKeyDown}
        >
          {items.map((item, index) => (
            <li
              key={item.key}
              id={`change-${index}`}
              role="option"
              aria-selected={index === selected}
              onClick={() => setSelected(index)}
            >
              <span className="adl-viewer-mono">{item.label}</span>
            </li>
          ))}
        </ul>
        {scene ? (
          <div
            className="adl-viewer-comparison-stage"
            role="img"
            aria-label={t('Comparison preview', 'Vista de comparación')}
            tabIndex={0}
            dangerouslySetInnerHTML={{ __html: scene.svg }}
          />
        ) : (
          <p className="adl-viewer-note" role="alert">
            {t('The preview could not be resolved.', 'La vista no se pudo resolver.')}
          </p>
        )}
      </div>
    </section>
  )
}
