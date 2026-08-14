'use client'

import { useEffect, useId, useMemo, useState } from 'react'

import { registerExampleDiagrams } from '../examples'
import {
  buildAdjacency,
  connectedIds,
  diagramEdges,
  getDiagram,
  getDiagramVisuals,
  type DiagramSpec,
} from '../index'
import { layoutDiagram } from '../layouts'
import { DiagramCanvas } from '../canvas'

registerExampleDiagrams()

/** A single showcase entry: which diagram key + its localized title/description. */
export interface ShowcaseEntry {
  key: string
  title: string
  description: string
}

export interface DiagramShowcaseProps {
  /** 'en' or 'es' — selects the localized spec from the registry. */
  locale?: 'en' | 'es'
  /** Optional localized strings; defaults to English. */
  label?: string
  hoverHint?: string
  heading?: string
  headingAccent?: string
  intro?: string
  /** Ordered list of diagram keys + copy to showcase. */
  entries: ShowcaseEntry[]
}

const defaultStrings = {
  label: 'reusable library',
  hoverHint: 'hover a node, focus it with the keyboard, or tap it to explore its role and trace its path',
  heading: 'Seven diagram types,',
  headingAccent: 'one visual language.',
  intro:
    'A single SVG renderer and a declarative, localized data model — band, flowchart, sequence, state machine, ER, timeline and swimlane diagrams that share the same dot-grid, hairline-card and cobalt/branch aesthetic.',
}

/**
 * Presentational panel for one diagram — same chrome as the alansalazar.dev
 * work section: hairline frame, mono header bar with a cobalt dot, and a
 * caption + legend footer.
 */
function ShowcasePanel({
  diagramKey,
  label,
  hoverHint,
  locale,
  hovered = false,
  interactive = true,
}: {
  diagramKey: string
  label: string
  hoverHint: string
  locale: 'en' | 'es'
  hovered?: boolean
  interactive?: boolean
}) {
  const diagram: DiagramSpec = getDiagram(diagramKey, locale)
  const [tooltipNode, setTooltipNode] = useState<string | null>(null)
  const [focusedNode, setFocusedNode] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const instanceId = `${diagramKey}-${useId().replaceAll(':', '')}`

  const layout = useMemo(() => layoutDiagram(diagram), [diagram])
  const edges = useMemo(() => diagramEdges(diagram), [diagram])
  const adjacency = useMemo(() => buildAdjacency(edges), [edges])
  const activeNode = interactive ? (tooltipNode ?? focusedNode ?? selectedNode) : null
  const highlight = useMemo(
    () => (activeNode ? connectedIds(activeNode, adjacency) : null),
    [activeNode, adjacency],
  )

  const caption = 'caption' in diagram ? diagram.caption : ''
  const legend = 'legend' in diagram ? diagram.legend : { main: '', branch: '' }
  const continuations = 'continuations' in diagram ? (diagram.continuations ?? []) : []
  const continuationDescription = continuations
    .map((continuation) => continuation.ariaLabel ?? `${continuation.label} · ${continuation.destination}`)
    .join('; ')
  const ariaLabel = [
    caption ? `${label}: ${caption}` : label,
    continuationDescription ? `Continuations: ${continuationDescription}` : '',
  ]
    .filter(Boolean)
    .join('. ')

  useEffect(() => {
    if (interactive) return

    setTooltipNode(null)
    setFocusedNode(null)
    setSelectedNode(null)
  }, [interactive])

  return (
    <div
      data-diagram-panel={diagramKey}
      className={[
        'relative mt-6 bg-background transition-colors duration-200',
        hovered ? '[--diagram-frame-opacity:0.32]' : '[--diagram-frame-opacity:0.2]',
      ].join(' ')}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          setTooltipNode(null)
          setSelectedNode(null)
        }
      }}
    >
      <span
        aria-hidden="true"
        data-frame-edge="top"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-foreground opacity-[var(--diagram-frame-opacity)]"
      />
      <span
        aria-hidden="true"
        data-frame-edge="left"
        className="pointer-events-none absolute inset-y-0 left-0 w-px bg-[linear-gradient(180deg,var(--foreground),transparent)] opacity-[var(--diagram-frame-opacity)]"
      />
      <span
        aria-hidden="true"
        data-frame-edge="right"
        className="pointer-events-none absolute inset-y-0 right-0 w-px bg-[linear-gradient(180deg,var(--foreground),transparent)] opacity-[var(--diagram-frame-opacity)]"
      />

      <div className="relative flex flex-wrap items-center justify-between gap-x-5 gap-y-2 px-5 py-4 font-mono text-[10.5px] uppercase tracking-[0.18em] text-foreground/55">
        <span className="inline-flex shrink-0 items-center gap-3">
          <i className="inline-block h-[7px] w-[7px] rounded-full bg-cobalt shadow-[0_0_8px_color-mix(in_srgb,var(--color-cobalt)_55%,transparent)]" />
          {label} / {diagramKey}
        </span>
        <span className="w-full text-[9.5px] leading-relaxed text-foreground/40 sm:w-auto sm:text-right sm:text-[10.5px]">
          {hoverHint}
        </span>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,var(--border)_10%,var(--border)_90%,transparent)] opacity-70"
        />
      </div>

      <div className="overflow-x-auto px-5 py-10 sm:px-7" data-diagram-scroll>
        <DiagramCanvas
          layout={layout}
          highlight={highlight}
          activeNodeId={activeNode}
          focusedNodeId={interactive ? focusedNode : null}
          selectedNodeId={interactive ? selectedNode : null}
          onTooltipNodeChange={(id, open) => {
            setTooltipNode((currentNode) => (open ? id : currentNode === id ? null : currentNode))
          }}
          onFocusNode={(id) => {
            setFocusedNode(id)
            if (id) setTooltipNode(null)
          }}
          onSelectNode={(id) => setSelectedNode((currentNode) => (currentNode === id ? null : id))}
          onDismissNode={(id) => {
            setTooltipNode((currentNode) => (currentNode === id ? null : currentNode))
            setSelectedNode((currentNode) => (currentNode === id ? null : currentNode))
          }}
          instanceId={instanceId}
          ariaLabel={ariaLabel}
          nodeVisuals={getDiagramVisuals(diagramKey)}
        />
      </div>

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

/**
 * Full showcase page/component: hero + one interactive panel per entry.
 * Render it inside any React app that provides the host theme variables
 * (see README → Theming). No i18n framework required — pass localized
 * strings via props (defaults are English).
 */
export function DiagramShowcase({
  locale = 'en',
  label = defaultStrings.label,
  hoverHint = defaultStrings.hoverHint,
  heading = defaultStrings.heading,
  headingAccent = defaultStrings.headingAccent,
  intro = defaultStrings.intro,
  entries,
}: DiagramShowcaseProps) {
  return (
    <div className="pb-24 pt-16">
      <div className="mx-auto w-full max-w-[720px] px-4 sm:px-8">
        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">{label}</p>
        <h1 className="mt-3 font-display text-[clamp(2.5rem,4vw,4rem)] leading-[0.95] tracking-[-0.05em]">
          {heading} <span className="italic text-[var(--color-cobalt)]">{headingAccent}</span>
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">{intro}</p>
      </div>

      <div className="mx-auto mt-16 w-full max-w-[1180px] px-4 sm:px-8">
        {entries.map((entry, index) => (
          <article
            key={entry.key}
            className="border-t border-foreground/20 py-16 first:border-t-0 first:pt-0 last:pb-4"
          >
            <div className="mb-6 flex flex-wrap items-baseline gap-x-5 gap-y-2">
              <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-foreground/55">
                {String(index + 1).padStart(2, '0')} — {entry.title}
              </span>
              <span className="h-px flex-1 bg-foreground/16" />
              <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-foreground/45">
                {entry.key}
              </span>
            </div>

            <h2 className="font-display text-[clamp(1.8rem,2.6vw,2.4rem)] font-normal leading-tight tracking-[-0.03em] text-foreground">
              {entry.title}
            </h2>
            <p className="mt-3 max-w-[64ch] text-base leading-relaxed text-foreground/74">
              {entry.description}
            </p>

            <ShowcasePanel
              diagramKey={entry.key}
              label={label}
              hoverHint={hoverHint}
              locale={locale}
            />
          </article>
        ))}
      </div>
    </div>
  )
}

export default DiagramShowcase
