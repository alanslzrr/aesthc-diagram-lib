// One showcase panel: the library chrome (hairline frame, mono header,
// caption + legend footer) around a live DiagramCanvas, plus the playground
// toolbar — preview/code tabs, live spec editor, per-type knobs, SVG export.

import { useEffect, useMemo, useRef, useState } from 'react'

import {
  buildAdjacency,
  connectedIds,
  diagramEdges,
  getDiagramVisuals,
  type DiagramSpec,
} from '@aesthc/diagram-lib'
import { layoutDiagram } from '@aesthc/diagram-lib/layouts'
import { DiagramCanvas } from '@aesthc/diagram-lib/canvas'
import { EXAMPLE_DIAGRAMS } from '@aesthc/diagram-lib/examples'

import type { Locale, SectionEntry } from '../content'
import { STRINGS } from '../content'
import { parseSpecSource, specSource, usageSnippet } from '../lib/code'
import { downloadDiagramSvg, serializeDiagramSvg } from '../lib/svg-export'
import { CopyButton, MonoButton } from './ui'

type PanelTab = 'preview' | 'code'
type CodeTab = 'spec' | 'usage'

export function DiagramPanel({ entry, locale }: { entry: SectionEntry; locale: Locale }) {
  const baseSpec = EXAMPLE_DIAGRAMS[entry.key].diagram[locale]
  const [draft, setDraft] = useState<DiagramSpec>(baseSpec)
  const [tab, setTab] = useState<PanelTab>('preview')
  const edited = draft !== baseSpec

  useEffect(() => {
    setDraft(EXAMPLE_DIAGRAMS[entry.key].diagram[locale])
  }, [entry.key, locale])

  const [tooltipNode, setTooltipNode] = useState<string | null>(null)
  const [focusedNode, setFocusedNode] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  const layoutResult = useMemo(() => {
    try {
      return { layout: layoutDiagram(draft), error: null }
    } catch (error) {
      return { layout: null, error: error instanceof Error ? error.message : String(error) }
    }
  }, [draft])
  const edges = useMemo(() => {
    try {
      return diagramEdges(draft)
    } catch {
      return []
    }
  }, [draft])
  const adjacency = useMemo(() => buildAdjacency(edges), [edges])
  const activeNode = tooltipNode ?? focusedNode ?? selectedNode
  const highlight = useMemo(
    () => (activeNode ? connectedIds(activeNode, adjacency) : null),
    [activeNode, adjacency],
  )

  const svgHostRef = useRef<HTMLDivElement>(null)
  const findSvg = () => svgHostRef.current?.querySelector('svg') ?? null

  const caption = 'caption' in draft ? draft.caption : ''
  const legend = 'legend' in draft ? draft.legend : { main: '', branch: '' }
  const direction =
    draft.type === 'flowchart' ? (draft.direction ?? 'top-down') : null

  return (
    <div
      data-diagram-panel={entry.key}
      className="relative mt-6 bg-background transition-colors duration-200 [--diagram-frame-opacity:0.2] hover:[--diagram-frame-opacity:0.32]"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          setTooltipNode(null)
          setSelectedNode(null)
        }
      }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-foreground opacity-[var(--diagram-frame-opacity)]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-px bg-[linear-gradient(180deg,var(--foreground),transparent)] opacity-[var(--diagram-frame-opacity)]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-px bg-[linear-gradient(180deg,var(--foreground),transparent)] opacity-[var(--diagram-frame-opacity)]"
      />

      {/* Mono header bar: identity left, playground controls right. */}
      <div className="relative flex flex-wrap items-center justify-between gap-x-5 gap-y-2.5 px-5 py-3.5">
        <span className="inline-flex shrink-0 items-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-foreground/55">
          <i className="inline-block h-[7px] w-[7px] rounded-full bg-cobalt shadow-[0_0_8px_color-mix(in_srgb,var(--color-cobalt)_55%,transparent)]" />
          {entry.type} / {entry.key}
          {edited ? (
            <span className="border border-branch/50 px-1.5 py-0.5 text-[9px] tracking-[0.14em] text-[var(--branch-ink)]">
              {STRINGS.edited[locale]}
            </span>
          ) : null}
        </span>
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <MonoButton active={tab === 'preview'} onClick={() => setTab('preview')}>
            {STRINGS.preview[locale]}
          </MonoButton>
          <MonoButton active={tab === 'code'} onClick={() => setTab('code')}>
            {STRINGS.code[locale]}
          </MonoButton>
          <span aria-hidden="true" className="mx-1 h-4 w-px bg-border" />
          {direction ? (
            <MonoButton
              onClick={() =>
                setDraft({
                  ...draft,
                  direction: direction === 'top-down' ? 'left-right' : 'top-down',
                } as DiagramSpec)
              }
              title={STRINGS.direction[locale]}
            >
              {direction === 'top-down' ? STRINGS.topDown[locale] : STRINGS.leftRight[locale]}
            </MonoButton>
          ) : null}
          {edited ? (
            <MonoButton onClick={() => setDraft(baseSpec)}>{STRINGS.reset[locale]}</MonoButton>
          ) : null}
          {tab === 'preview' && layoutResult.layout ? (
            <>
              <CopyButton
                label={STRINGS.copySvg[locale]}
                copiedLabel={STRINGS.copied[locale]}
                getText={() => {
                  const svg = findSvg()
                  return svg ? serializeDiagramSvg(svg) : ''
                }}
              />
              <MonoButton
                onClick={() => {
                  const svg = findSvg()
                  if (svg) downloadDiagramSvg(svg, `${entry.key}.svg`)
                }}
              >
                ↓ {STRINGS.downloadSvg[locale]}
              </MonoButton>
            </>
          ) : null}
        </span>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,var(--border)_10%,var(--border)_90%,transparent)] opacity-70"
        />
      </div>

      {tab === 'preview' ? (
        <div className="overflow-x-auto px-5 py-10 sm:px-7" data-diagram-scroll ref={svgHostRef}>
          {layoutResult.layout ? (
            <DiagramCanvas
              layout={layoutResult.layout}
              highlight={highlight}
              activeNodeId={activeNode}
              focusedNodeId={focusedNode}
              selectedNodeId={selectedNode}
              onTooltipNodeChange={(id, open) => {
                setTooltipNode((current) => (open ? id : current === id ? null : current))
              }}
              onFocusNode={(id) => {
                setFocusedNode(id)
                if (id) setTooltipNode(null)
              }}
              onSelectNode={(id) => setSelectedNode((current) => (current === id ? null : id))}
              onDismissNode={(id) => {
                setTooltipNode((current) => (current === id ? null : current))
                setSelectedNode((current) => (current === id ? null : current))
              }}
              instanceId={entry.key}
              ariaLabel={`${entry.type}: ${caption}`}
              nodeVisuals={getDiagramVisuals(entry.key)}
            />
          ) : (
            <p className="py-16 text-center font-mono text-[11px] text-[var(--branch-ink)]">
              {layoutResult.error}
            </p>
          )}
        </div>
      ) : (
        <CodeView entry={entry} locale={locale} draft={draft} onApply={setDraft} />
      )}

      <div className="relative flex flex-wrap items-center justify-between gap-4 px-5 py-4 font-mono text-[10.5px] text-foreground/55">
        <span className="max-w-[68ch] leading-relaxed">
          {'// '}
          {caption}
        </span>
        <span className="inline-flex items-center gap-5">
          <span className="inline-flex items-center gap-2">
            <i className="inline-block h-[10px] w-[10px] rounded-full bg-cobalt" />
            {legend.main}
          </span>
          <span className="inline-flex items-center gap-2">
            <i className="inline-block h-[10px] w-[10px] rounded-full bg-branch" />
            {legend.branch}
          </span>
        </span>
      </div>
    </div>
  )
}

function CodeView({
  entry,
  locale,
  draft,
  onApply,
}: {
  entry: SectionEntry
  locale: Locale
  draft: DiagramSpec
  onApply: (spec: DiagramSpec) => void
}) {
  const [codeTab, setCodeTab] = useState<CodeTab>('spec')
  const [text, setText] = useState(() => specSource(draft))
  const [error, setError] = useState<string | null>(null)
  const fromEditorRef = useRef(false)
  const debounceRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (fromEditorRef.current) {
      fromEditorRef.current = false
      return
    }
    setText(specSource(draft))
    setError(null)
  }, [draft])

  // A pending parse must not fire into an unmounted editor (tab switch) or
  // over a freshly reset draft.
  useEffect(() => () => window.clearTimeout(debounceRef.current), [])

  const usage = useMemo(
    () => usageSnippet(entry.key, entry.type, draft),
    [entry.key, entry.type, draft],
  )

  const handleEdit = (value: string) => {
    setText(value)
    window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      try {
        const parsed = parseSpecSource(value) as DiagramSpec
        if (!parsed || typeof parsed !== 'object' || !('type' in parsed)) {
          throw new Error("spec must be an object with a 'type' field")
        }
        fromEditorRef.current = true
        onApply(parsed)
        setError(null)
      } catch (parseError) {
        setError(parseError instanceof Error ? parseError.message : String(parseError))
      }
    }, 350)
  }

  return (
    <div className="px-5 py-6 sm:px-7">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <span className="inline-flex items-center gap-1.5">
          <MonoButton active={codeTab === 'spec'} onClick={() => setCodeTab('spec')}>
            {STRINGS.spec[locale]}.ts
          </MonoButton>
          <MonoButton active={codeTab === 'usage'} onClick={() => setCodeTab('usage')}>
            {STRINGS.usage[locale]}.tsx
          </MonoButton>
        </span>
        <span className="inline-flex items-center gap-3">
          {codeTab === 'spec' ? (
            <span className="hidden font-mono text-[9.5px] tracking-wide text-foreground/40 sm:inline">
              {STRINGS.editorHint[locale]}
            </span>
          ) : null}
          <CopyButton
            label={STRINGS.copy[locale]}
            copiedLabel={STRINGS.copied[locale]}
            getText={() => (codeTab === 'spec' ? text : usage)}
          />
        </span>
      </div>

      {codeTab === 'spec' ? (
        <>
          <textarea
            value={text}
            onChange={(event) => handleEdit(event.target.value)}
            spellCheck={false}
            aria-label={`${entry.key} — ${STRINGS.spec[locale]}`}
            className={[
              'block h-[430px] w-full resize-y border bg-[color-mix(in_srgb,var(--foreground)_3%,var(--background))] p-4 font-mono text-[11.5px] leading-[1.7] text-foreground/85 outline-none transition-colors',
              error ? 'border-branch/60' : 'border-border focus:border-foreground/35',
            ].join(' ')}
          />
          <p
            aria-live="polite"
            className={[
              'mt-2 min-h-[1rem] font-mono text-[10px]',
              error ? 'text-[var(--branch-ink)]' : 'text-transparent',
            ].join(' ')}
          >
            {error ?? '·'}
          </p>
        </>
      ) : (
        <pre className="max-h-[460px] overflow-auto border border-border bg-[color-mix(in_srgb,var(--foreground)_3%,var(--background))] p-4 font-mono text-[11.5px] leading-[1.7] text-foreground/85">
          {usage}
        </pre>
      )}
    </div>
  )
}
