import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Locale } from '@aesthc/diagram-lib/editor-core'
import { resolveDocument } from '@aesthc/diagram-lib/editor-core'
import { shallowEqual, useEditorSelector } from '@aesthc/diagram-lib/editor'
import { CARD_HEIGHT, CARD_WIDTH } from '@aesthc/diagram-lib/export'
import {
  DEFAULT_EXPORT_CHOICE,
  EXPORT_CHOICE_FORMATS,
  choiceIssues,
  dimensionWarning,
  formatBytes,
  formatGate,
  normalizeChoice,
  scopeGate,
  supportsBackground,
  supportsFontPolicy,
  supportsMetadata,
  supportsQuality,
  supportsScale,
  supportsSource,
  type ExportChoice,
  type ExportChoiceFormat,
  type ExportGateReason,
} from '../lib/export-options'
import {
  exportFacts,
  performExport,
  probeSharedCapabilities,
  type ExportPhase,
  type ExportReceipt,
  type SharedCapabilities,
} from '../lib/export-service'
import './export-dialog.css'

const FORMAT_LABEL: Record<ExportChoiceFormat, { en: string; es: string }> = {
  json: { en: 'JSON (canonical)', es: 'JSON (canónico)' },
  svg: { en: 'SVG', es: 'SVG' },
  png: { en: 'PNG', es: 'PNG' },
  jpeg: { en: 'JPEG', es: 'JPEG' },
  webp: { en: 'WebP', es: 'WebP' },
  html: { en: 'HTML (standalone)', es: 'HTML (autónomo)' },
  card: { en: 'Card (1200×630 PNG)', es: 'Tarjeta (PNG 1200×630)' },
  webm: { en: 'WebM story', es: 'Historia WebM' },
}
const REASON_LABEL: Record<ExportGateReason, { en: string; es: string }> = {
  'raster.unavailable': {
    en: 'unavailable in this browser',
    es: 'no disponible en este navegador',
  },
  'html.runtime': {
    en: 'the standalone runtime assets are unavailable',
    es: 'los recursos del runtime autónomo no están disponibles',
  },
  'card.empty': {
    en: 'the document has no nodes to fit',
    es: 'el documento no tiene nodos que encuadrar',
  },
  'webm.unavailable': {
    en: 'recording is unavailable in this browser',
    es: 'la grabación no está disponible en este navegador',
  },
  'webm.empty': {
    en: 'the document has no authored story steps',
    es: 'el documento no tiene pasos de historia de autoría',
  },
  'webm.reduced-motion': {
    en: 'reduced motion is active',
    es: 'el movimiento reducido está activo',
  },
  'selection.empty': {
    en: 'select a node, relation or group on the canvas first',
    es: 'selecciona antes un nodo, relación o grupo en el lienzo',
  },
  'selection.unsupported': {
    en: 'this format always exports the whole document',
    es: 'este formato siempre exporta el documento completo',
  },
  'background.jpeg': {
    en: 'JPEG cannot store transparency',
    es: 'JPEG no puede almacenar transparencia',
  },
  'source.format': {
    en: 'this format does not embed the source JSON',
    es: 'este formato no incrusta el JSON de origen',
  },
}
const PHASE_LABEL: Record<ExportPhase, { en: string; es: string }> = {
  fonts: { en: 'Preparing fonts…', es: 'Preparando tipografías…' },
  rendering: { en: 'Rendering…', es: 'Renderizando…' },
  encoding: { en: 'Encoding…', es: 'Codificando…' },
}
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () =>
      typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    if (typeof matchMedia === 'undefined') return
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => setReduced(media.matches)
    media.addEventListener('change', change)
    return () => media.removeEventListener('change', change)
  }, [])
  return reduced
}
export interface ExportDialogProps {
  locale: Locale
  /** `dialog` renders a modal; `inline` renders the same service in place. */
  variant?: 'dialog' | 'inline'
  open?: boolean
  onClose?: () => void
  /** Download basename without extension. */
  filenameBase?: string
  /** Effective host appearance for visual exports; JSON stays canonical. */
  appearance?: 'light' | 'dark'
}
/**
 * One shared export surface for the Playground and Studio. It exposes the
 * public `@aesthc/diagram-lib/export` pipeline with capability and content
 * gates, progress, cancellation and receipts; it never renders a diagram.
 */
export function ExportDialog({
  locale,
  variant = 'dialog',
  open = false,
  onClose,
  filenameBase,
  appearance,
}: ExportDialogProps) {
  const t = (en: string, es: string) => (locale === 'es' ? es : en)
  const snapshot = useEditorSelector(
    (state) => ({ document: state.document, selection: state.selection }),
    shallowEqual,
  )
  const { document, selection } = snapshot
  const reducedMotion = useReducedMotion()
  const [capabilities, setCapabilities] = useState<SharedCapabilities | null>(null)
  useEffect(() => {
    let alive = true
    void probeSharedCapabilities().then((probed) => {
      if (alive) setCapabilities(probed)
    })
    return () => {
      alive = false
    }
  }, [])
  const facts = useMemo(
    () => exportFacts(document, selection, capabilities, reducedMotion),
    [document, selection, capabilities, reducedMotion],
  )
  const [choice, setChoice] = useState<ExportChoice>(DEFAULT_EXPORT_CHOICE)
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState<ExportPhase | null>(null)
  const [error, setError] = useState<string[] | null>(null)
  const [receipt, setReceipt] = useState<ExportReceipt | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const scopeName = useId()
  useLayoutEffect(() => {
    if (variant !== 'dialog') return
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      openerRef.current =
        window.document.activeElement instanceof HTMLElement ? window.document.activeElement : null
      dialog.showModal()
      dialog.querySelector<HTMLElement>('[data-export-initial-focus]')?.focus()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open, variant])
  useEffect(
    () => () => {
      abortRef.current?.abort()
      const dialog = dialogRef.current
      if (dialog?.open) dialog.close()
    },
    [],
  )
  const close = () => {
    if (busy) return
    onClose?.()
  }
  /** The dialog can stay mounted while closed; focus returns to the opener. */
  const restoreFocus = () => {
    const opener = openerRef.current
    openerRef.current = null
    if (opener?.isConnected) opener.focus()
  }
  async function run() {
    if (busy) return
    setError(null)
    setReceipt(null)
    const controller = new AbortController()
    abortRef.current = controller
    setBusy(true)
    setPhase('fonts')
    try {
      const result = await performExport(choice, {
        document,
        selection,
        signal: controller.signal,
        filenameBase: filenameBase ?? document.id,
        reducedMotion,
        appearance,
        onPhase: (next) => {
          if (!controller.signal.aborted) setPhase(next)
        },
      })
      if (result.ok) setReceipt(result.receipt)
      else setError(result.codes)
    } catch {
      setError(['export.failed'])
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
        setBusy(false)
        setPhase(null)
      }
    }
  }
  function cancel() {
    abortRef.current?.abort()
  }
  const activeGate = formatGate(choice.format, facts)
  const selectionGate = scopeGate(choice.format, facts)
  const layoutSize = useMemo(() => {
    if (variant === 'dialog' && !open) return null
    if (choice.format === 'json') return null
    if (choice.format === 'card') return { width: CARD_WIDTH, height: CARD_HEIGHT }
    const resolved = resolveDocument(document, {
      quality: 'edit',
      requestId: 'export-dialog',
      skipDiagnostics: true,
    })
    if (!resolved.ok) return null
    const scale = supportsScale(choice.format) ? choice.scale : 1
    return {
      width: Math.ceil(resolved.value.layout.width * scale),
      height: Math.ceil(resolved.value.layout.height * scale),
    }
  }, [choice.format, choice.scale, document, open, variant])
  const resourceWarning = layoutSize ? dimensionWarning(layoutSize.width, layoutSize.height) : false
  const blocked = !activeGate.available || choiceIssues(choice, selection.length).length > 0
  const phaseLabel = phase ? PHASE_LABEL[phase][locale] : ''
  const errorLabel = error
    ? error.includes('operation.aborted')
      ? t(
          'Export canceled. The document is unchanged.',
          'Exportación cancelada. El documento no cambió.',
        )
      : error.join(', ')
    : ''
  const receiptLabel = receipt
    ? [
        t(`Exported revision ${receipt.revision}`, `Revisión ${receipt.revision} exportada`),
        FORMAT_LABEL[receipt.format][locale],
        receipt.scope === 'selection' ? t('selection', 'selección') : t('document', 'documento'),
        formatBytes(receipt.bytes),
        receipt.width && receipt.height ? `${receipt.width} × ${receipt.height} px` : '',
        receipt.sourceIncluded ? t('source included', 'origen incluido') : '',
        receipt.canonical ? t('canonical', 'canónico') : '',
        receipt.warnings.length
          ? `${t('warnings', 'avisos')}: ${receipt.warnings.join(', ')}`
          : t('no diagnostics', 'sin diagnósticos'),
      ]
        .filter(Boolean)
        .join(' · ')
    : ''
  const formatField = (
    <label className="export-field">
      <span>{t('Export format', 'Formato de exportación')}</span>
      <select
        aria-label={t('Export format', 'Formato de exportación')}
        data-export-initial-focus
        value={choice.format}
        disabled={busy}
        onChange={(event) =>
          setChoice((current) =>
            normalizeChoice({
              ...current,
              format: event.target.value as ExportChoiceFormat,
            }),
          )
        }
      >
        {EXPORT_CHOICE_FORMATS.map((format) => {
          const gate = formatGate(format, facts)
          return (
            <option
              key={format}
              value={format}
              disabled={!gate.available}
              data-export-gate={gate.available ? 'ok' : gate.reason}
            >
              {FORMAT_LABEL[format][locale]}
              {gate.available ? '' : ` — ${REASON_LABEL[gate.reason!][locale]}`}
            </option>
          )
        })}
      </select>
    </label>
  )
  const optionFields = (
    <>
      <fieldset className="export-scope" disabled={busy}>
        <legend>{t('Scope', 'Alcance')}</legend>
        <label>
          <input
            type="radio"
            name={scopeName}
            data-export-scope="document"
            checked={choice.scope === 'document'}
            onChange={() => setChoice((current) => ({ ...current, scope: 'document' }))}
          />
          {t('Document', 'Documento')}
        </label>
        <label>
          <input
            type="radio"
            name={scopeName}
            data-export-scope="selection"
            checked={choice.scope === 'selection'}
            disabled={!selectionGate.available}
            onChange={() => setChoice((current) => ({ ...current, scope: 'selection' }))}
          />
          {t('Selection', 'Selección')}
        </label>
      </fieldset>
      {supportsScale(choice.format) && (
        <label className="export-field">
          <span>{t('Raster scale', 'Escala ráster')}</span>
          <select
            aria-label={t('Raster scale', 'Escala ráster')}
            value={choice.scale}
            disabled={busy}
            onChange={(event) =>
              setChoice((current) => ({ ...current, scale: Number(event.target.value) }))
            }
          >
            {[1, 2, 3, 4].map((scale) => (
              <option key={scale} value={scale}>
                {scale}×
              </option>
            ))}
          </select>
        </label>
      )}
      {supportsBackground(choice.format) && (
        <label className="export-field">
          <span>{t('Background', 'Fondo')}</span>
          <select
            aria-label={t('Background', 'Fondo')}
            value={choice.background}
            disabled={busy}
            onChange={(event) =>
              setChoice((current) => ({
                ...current,
                background: event.target.value as ExportChoice['background'],
              }))
            }
          >
            <option value="theme">{t('Document theme', 'Tema del documento')}</option>
            <option
              value="transparent"
              disabled={choice.format === 'jpeg'}
              data-export-gate={choice.format === 'jpeg' ? 'background.jpeg' : undefined}
            >
              {t('Transparent', 'Transparente')}
            </option>
          </select>
        </label>
      )}
      {supportsQuality(choice.format) && (
        <label className="export-field">
          <span>{t('Export quality', 'Calidad de exportación')}</span>
          <select
            aria-label={t('Export quality', 'Calidad de exportación')}
            value={choice.quality}
            disabled={busy}
            onChange={(event) =>
              setChoice((current) => ({
                ...current,
                quality: event.target.value as ExportChoice['quality'],
              }))
            }
          >
            <option value="edit">{t('Edit', 'Edición')}</option>
            <option value="publish">{t('Publish', 'Publicación')}</option>
          </select>
        </label>
      )}
      {supportsMetadata(choice.format) && (
        <label className="export-field">
          <span>{t('Portable metadata', 'Metadatos portables')}</span>
          <select
            aria-label={t('Portable metadata', 'Metadatos portables')}
            value={choice.metadata}
            disabled={busy}
            onChange={(event) =>
              setChoice((current) => ({
                ...current,
                metadata: event.target.value as ExportChoice['metadata'],
              }))
            }
          >
            <option value="minimal">
              {t('Minimal (drawn facts)', 'Mínimos (hechos dibujados)')}
            </option>
            <option value="all">
              {t('All (inspector detail)', 'Todos (detalle del inspector)')}
            </option>
          </select>
        </label>
      )}
      {supportsFontPolicy(choice.format) && (
        <label className="export-field">
          <span>{t('Font handling', 'Gestión de tipografías')}</span>
          <select
            aria-label={t('Font handling', 'Gestión de tipografías')}
            value={choice.fontPolicy}
            disabled={busy}
            onChange={(event) =>
              setChoice((current) => ({
                ...current,
                fontPolicy: event.target.value as ExportChoice['fontPolicy'],
              }))
            }
          >
            <option value="required">{t('Require bundled Geist', 'Exigir Geist incluida')}</option>
            <option value="fallback">
              {t('Allow system fallback (warning)', 'Permitir respaldo del sistema (aviso)')}
            </option>
          </select>
        </label>
      )}
    </>
  )
  const notesBlock = (
    <>
      {layoutSize && (
        <output data-export-dimensions>
          {t('Output size', 'Tamaño de salida')}: {layoutSize.width} × {layoutSize.height} px
        </output>
      )}
      {resourceWarning && (
        <p data-export-reason="resource">
          {t(
            'This size exceeds the 16384 px / 32 MP encoder limit. Reduce the scale.',
            'Este tamaño supera el límite del codificador de 16384 px / 32 MP. Reduce la escala.',
          )}
        </p>
      )}
      {EXPORT_CHOICE_FORMATS.map((format) => {
        const gate = formatGate(format, facts)
        if (gate.available) return null
        return (
          <p key={format} data-export-reason={gate.reason}>
            {FORMAT_LABEL[format][locale]}: {REASON_LABEL[gate.reason!][locale]}
          </p>
        )
      })}
      {!selectionGate.available && selectionGate.reason && (
        <p data-export-reason={selectionGate.reason}>
          {t('Selection', 'Selección')}: {REASON_LABEL[selectionGate.reason][locale]}
        </p>
      )}
      {choice.format === 'jpeg' && (
        <p data-export-reason="background.jpeg">
          {t('Background', 'Fondo')}: {REASON_LABEL['background.jpeg'][locale]}
        </p>
      )}
      {choice.format === 'html' && (
        <p>
          {t(
            'The standalone HTML always embeds the bundled Geist faces; the export fails if they cannot be fetched.',
            'El HTML autónomo siempre incrusta las tipografías Geist incluidas; la exportación falla si no se pueden obtener.',
          )}
        </p>
      )}
      {choice.format === 'json' ? (
        <p data-export-disclosure="canonical">
          {t(
            'JSON is the lossless canonical document: the whole source is always included.',
            'JSON es el documento canónico sin pérdidas: el origen completo siempre se incluye.',
          )}
        </p>
      ) : supportsSource(choice.format) ? (
        <>
          <label className="export-check">
            <input
              type="checkbox"
              checked={choice.includeSource}
              disabled={busy}
              onChange={(event) =>
                setChoice((current) => ({ ...current, includeSource: event.target.checked }))
              }
            />
            {t('Include source JSON', 'Incluir JSON de origen')}
          </label>
          <p data-export-disclosure="source">
            {t(
              'The canonical document JSON is embedded next to the artifact, including notes, links and extensions the drawing does not show.',
              'El JSON canónico del documento se incrusta junto al artefacto, incluidas notas, enlaces y extensiones que el dibujo no muestra.',
            )}
          </p>
        </>
      ) : (
        <p data-export-disclosure="source-format">
          {t(
            'This format never embeds the source JSON; use JSON or SVG to keep the document round-trippable.',
            'Este formato nunca incrusta el JSON de origen; usa JSON o SVG para conservar el documento.',
          )}
        </p>
      )}
    </>
  )
  const actionsBlock = (
    <div className="export-panel-actions">
      <button
        type="button"
        onClick={() => void run()}
        disabled={busy || blocked}
        data-export-download
      >
        {busy ? t('Exporting…', 'Exportando…') : t('Download', 'Descargar')}
      </button>
      {busy && (
        <button type="button" onClick={cancel} data-export-cancel>
          {t('Cancel', 'Cancelar')}
        </button>
      )}
      {variant === 'dialog' && (
        <button type="button" onClick={close} disabled={busy}>
          {t('Close', 'Cerrar')}
        </button>
      )}
    </div>
  )
  const statusBlock = (
    <>
      {busy && (
        <p role="status" data-export-phase={phase ?? undefined} className="export-status">
          {phaseLabel}
        </p>
      )}
      {errorLabel && (
        <p role="alert" data-export-error className="export-status">
          {errorLabel}
        </p>
      )}
      {receiptLabel && (
        <p role="status" data-export-receipt className="export-status">
          {receiptLabel}
        </p>
      )}
    </>
  )
  const panel =
    variant === 'inline' ? (
      <div className="export-panel" data-variant="inline">
        <div className="export-inline-row">
          {formatField}
          {actionsBlock}
        </div>
        <details className="export-advanced">
          <summary>{t('More export options', 'Más opciones de exportación')}</summary>
          <div className="export-panel-fields">{optionFields}</div>
          <div className="export-panel-notes">{notesBlock}</div>
        </details>
        {statusBlock}
      </div>
    ) : (
      <div className="export-panel" data-variant="dialog">
        <header className="export-panel-head">
          <h2 id={titleId}>{t('Export document', 'Exportar documento')}</h2>
          <p className="export-panel-caption">
            {document.spec.caption} · {t('revision', 'revisión')} {document.revision}
          </p>
        </header>
        <div className="export-panel-fields">
          {formatField}
          {optionFields}
        </div>
        <div className="export-panel-notes">{notesBlock}</div>
        {actionsBlock}
        {statusBlock}
      </div>
    )
  if (variant === 'inline') return panel
  return (
    <dialog
      ref={dialogRef}
      className="adl-editor-dialog export-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
      onClose={restoreFocus}
      onClick={(event) => {
        if (event.target === event.currentTarget) close()
      }}
    >
      {panel}
    </dialog>
  )
}
