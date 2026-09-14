'use client'

import { useState } from 'react'

import {
  CANVAS_MIN_WIDTH,
  CARD_R,
  CARD_TEXT_X,
  DECISION_PILL_H,
  DECISION_PILL_R,
  DIMMED_OPACITY,
  DOT_R,
  EDGE_STROKE_WIDTH,
  NODE_ICON_SIZE,
  PILL_H,
  PILL_R,
} from '../theme'
import type {
  DiagramLayout,
  Highlight,
  PlacedContinuation,
  PlacedEdge,
  PlacedNode,
} from '../layout'
import type { DiagramNodeVisual, EdgeVariant } from '../types'
import { ArchitectureNodeIcon } from './ArchitectureNodeIcon'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip'

export interface DiagramCanvasProps {
  layout: DiagramLayout
  highlight: Highlight | null
  activeNodeId: string | null
  focusedNodeId: string | null
  selectedNodeId: string | null
  onTooltipNodeChange: (id: string, open: boolean) => void
  onFocusNode: (id: string | null) => void
  onSelectNode: (id: string) => void
  onDismissNode: (id: string) => void
  instanceId: string
  ariaLabel: string
  nodeVisuals: Record<string, DiagramNodeVisual>
}

const strokeForVariant = (variant: EdgeVariant) =>
  variant === 'branch' ? 'var(--color-branch)' : 'var(--color-cobalt)'

const NODE_BORDER = 'var(--diagram-node-border, var(--border))'

const nodeOpacity = (node: PlacedNode, highlight: Highlight | null) =>
  !highlight || highlight.nodes.has(node.id) ? 1 : DIMMED_OPACITY

const edgeOpacity = (edge: PlacedEdge, highlight: Highlight | null) =>
  !highlight || highlight.edges.has(edge.id) ? 1 : DIMMED_OPACITY

const continuationOpacity = (continuation: PlacedContinuation, highlight: Highlight | null) =>
  !highlight || highlight.nodes.has(continuation.from) ? 1 : DIMMED_OPACITY

export function DiagramCanvas({
  layout,
  highlight,
  activeNodeId,
  focusedNodeId,
  selectedNodeId,
  onTooltipNodeChange,
  onFocusNode,
  onSelectNode,
  onDismissNode,
  instanceId,
  ariaLabel,
  nodeVisuals,
}: DiagramCanvasProps) {
  const [dismissedNodeId, setDismissedNodeId] = useState<string | null>(null)
  const dismissNode = (id: string) => {
    setDismissedNodeId(id)
    onDismissNode(id)
  }
  const dotsId = `arch-dots-${instanceId}`
  const fadeId = `arch-fade-${instanceId}`
  const maskId = `arch-mask-${instanceId}`
  const mainContinuationMarkerId = `arch-continuation-main-${instanceId}`
  const branchContinuationMarkerId = `arch-continuation-branch-${instanceId}`
  const edgeGradientId = (edgeId: string) =>
    `arch-edge-${instanceId}-${Array.from(edgeId, (character) => character.codePointAt(0)!.toString(16)).join('-')}`

  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      preserveAspectRatio="xMidYMid meet"
      role="group"
      aria-label={ariaLabel}
      className="diagram-canvas mx-auto block h-auto w-full"
      style={{
        // Never upscale past 1 unit = 1px (typography stays true to the band
        // reference), and keep the legibility floor for wide artboards.
        minWidth: Math.min(CANVAS_MIN_WIDTH, layout.width),
        maxWidth: layout.width,
      }}
    >
      <defs>
        <pattern id={dotsId} width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="var(--foreground)" />
        </pattern>
        <linearGradient id={fadeId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="var(--foreground)" stopOpacity="1" />
          <stop offset="55%" stopColor="var(--foreground)" stopOpacity="0.78" />
          <stop offset="100%" stopColor="var(--foreground)" stopOpacity="0.26" />
        </linearGradient>
        <mask id={maskId} style={{ maskType: 'alpha' }}>
          <rect width={layout.width} height={layout.height} fill={`url(#${fadeId})`} />
        </mask>
        {[
          { id: mainContinuationMarkerId, variant: 'main' as const },
          { id: branchContinuationMarkerId, variant: 'branch' as const },
        ].map(({ id, variant }) => (
          <marker
            key={id}
            id={id}
            viewBox="0 0 8 8"
            markerWidth={8}
            markerHeight={8}
            refX={7}
            refY={4}
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path
              d="M 1 1 L 7 4 L 1 7"
              fill="none"
              stroke={strokeForVariant(variant)}
              strokeWidth={EDGE_STROKE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </marker>
        ))}
        {layout.edges.map((edge) => {
          const color = strokeForVariant(edge.variant)
          const centreOpacity = edge.variant === 'main' ? 1 : 0.74
          const edgeOpacityValue =
            edge.variant === 'main'
              ? 'var(--diagram-main-tail-opacity, 0.24)'
              : 'var(--diagram-branch-tail-opacity, 0.12)'
          // An arrowhead needs a solid line under it — only fade the start.
          const endOpacity = edge.arrowEnd ? centreOpacity : edgeOpacityValue

          return (
            <linearGradient
              key={edge.id}
              id={edgeGradientId(edge.id)}
              gradientUnits="userSpaceOnUse"
              x1={edge.startX}
              y1={edge.startY}
              x2={edge.endX}
              y2={edge.endY}
            >
              <stop offset="0%" stopColor={color} stopOpacity={edgeOpacityValue} />
              <stop offset="24%" stopColor={color} stopOpacity={centreOpacity} />
              <stop offset="76%" stopColor={color} stopOpacity={centreOpacity} />
              <stop offset="100%" stopColor={color} stopOpacity={endOpacity} />
            </linearGradient>
          )
        })}
      </defs>

      <rect
        width={layout.width}
        height={layout.height}
        fill={`url(#${dotsId})`}
        mask={`url(#${maskId})`}
        className="opacity-[var(--diagram-grid-opacity,0.075)] dark:opacity-[var(--diagram-grid-opacity,0.12)]"
      />

      {/* Swimlane / group containers sit behind everything else. */}
      {layout.containers?.map((container) => (
        <g key={container.id} data-container-id={container.id}>
          <rect
            x={container.x}
            y={container.y}
            width={container.w}
            height={container.h}
            rx={6}
            fill="color-mix(in srgb, var(--foreground) 2%, transparent)"
            stroke="var(--border)"
            strokeWidth={1}
          />
          {container.label ? (
            <text
              x={18}
              y={container.y + 26}
              letterSpacing="1.6"
              className="fill-foreground/75 font-mono text-[11.25px] uppercase"
            >
              {container.label}
            </text>
          ) : null}
          {container.kind ? (
            <text x={18} y={container.y + 44} className="fill-foreground/75 font-mono text-[10px]">
              {container.kind}
            </text>
          ) : null}
        </g>
      ))}

      {/* Sequence lifelines. */}
      {layout.lifelines?.map((lifeline) => (
        <g key={lifeline.id} data-lifeline-id={lifeline.id}>
          <line
            x1={lifeline.x}
            y1={lifeline.y0}
            x2={lifeline.x}
            y2={lifeline.y1}
            stroke="var(--border)"
            strokeWidth={1}
            strokeDasharray="2 6"
          />
        </g>
      ))}

      <g data-layer="edges" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {layout.edges.map((edge) => (
          <path
            key={edge.id}
            data-edge-id={edge.id}
            data-edge-from={edge.from}
            data-edge-to={edge.to}
            d={edge.d}
            stroke={`url(#${edgeGradientId(edge.id)})`}
            strokeWidth={edge.strokeWidth ?? EDGE_STROKE_WIDTH}
            strokeDasharray={edge.dashed ? '2 7' : undefined}
            markerEnd={
              edge.arrowEnd
                ? `url(#${
                    edge.variant === 'main' ? mainContinuationMarkerId : branchContinuationMarkerId
                  })`
                : undefined
            }
            opacity={edgeOpacity(edge, highlight)}
            className={[
              'transition-opacity duration-150',
              edge.variant === 'main'
                ? 'dark:[filter:drop-shadow(0_0_3px_color-mix(in_srgb,var(--color-cobalt)_18%,transparent))]'
                : '',
            ].join(' ')}
          />
        ))}
      </g>

      <g data-layer="continuations" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {layout.continuations?.map((continuation) => (
          <path
            key={continuation.id}
            data-continuation-id={continuation.id}
            data-continuation-from={continuation.from}
            d={continuation.d}
            stroke={strokeForVariant(continuation.variant)}
            strokeWidth={EDGE_STROKE_WIDTH}
            markerEnd={`url(#${
              continuation.variant === 'main'
                ? mainContinuationMarkerId
                : branchContinuationMarkerId
            })`}
            opacity={continuationOpacity(continuation, highlight)}
            className="transition-opacity duration-150"
          />
        ))}
      </g>

      {/* Non-interactive shapes (activation bars) render below the cards. */}
      {layout.nodes
        .filter((node) => node.shape === 'bar')
        .map((node) => (
          <rect
            key={node.id}
            x={node.x}
            y={node.y}
            width={node.w}
            height={node.h}
            rx={2}
            fill={
              node.weight === 'primary'
                ? 'color-mix(in srgb, var(--color-cobalt) 22%, transparent)'
                : 'color-mix(in srgb, var(--color-branch) 18%, transparent)'
            }
            stroke={
              node.weight === 'primary'
                ? 'color-mix(in srgb, var(--color-cobalt) 40%, transparent)'
                : 'color-mix(in srgb, var(--color-branch) 36%, transparent)'
            }
            strokeWidth={1}
            className="pointer-events-none transition-opacity duration-150"
            opacity={nodeOpacity(node, highlight)}
          />
        ))}

      <TooltipProvider delayDuration={140} disableHoverableContent={false} skipDelayDuration={80}>
        {layout.nodes
          .filter((node) => node.shape !== 'bar')
          .map((node) => {
            const weight = node.weight ?? 'secondary'
            const isMuted = weight === 'muted'
            const visual = nodeVisuals[node.id]
            const isActive = activeNodeId === node.id
            const isTooltipOpen = isActive && dismissedNodeId !== node.id
            const isFocused = focusedNodeId === node.id
            const isSelected = selectedNodeId === node.id
            const accessibleName = node.kind ? `${node.kind}: ${node.label}` : node.label
            const descriptionId = `arch-node-${instanceId}-${node.id}-description`
            const isEvent = node.shape === 'event'
            const isTable = node.shape === 'table'
            const isState = node.shape === 'state'
            const isTerminal = node.shape === 'terminal'
            const centeredLabel = !visual && !node.kind && !node.sublabel && !isMuted
            const textX = visual ? node.x + CARD_TEXT_X : node.x + 18
            const radius = isState || isTerminal ? Math.min(CARD_R * 2.4, node.h / 2) : CARD_R

            return (
              <Tooltip
                key={node.id}
                open={isTooltipOpen}
                onOpenChange={(open) => {
                  if (open) setDismissedNodeId(null)
                  onTooltipNodeChange(node.id, open)
                }}
              >
                <TooltipTrigger asChild>
                  <g
                    data-node-id={node.id}
                    data-node-description={node.description}
                    data-node-trigger-id={descriptionId}
                    data-node-active={isActive ? 'true' : 'false'}
                    data-node-selected={isSelected ? 'true' : 'false'}
                    data-node-tooltip-trigger="true"
                    role="button"
                    tabIndex={0}
                    aria-label={accessibleName}
                    aria-describedby={descriptionId}
                    aria-pressed={isSelected}
                    opacity={nodeOpacity(node, highlight)}
                    className="cursor-pointer transition-opacity duration-150 focus:outline-none"
                    onFocus={() => {
                      setDismissedNodeId(null)
                      onFocusNode(node.id)
                    }}
                    onBlur={() => onFocusNode(null)}
                    onClick={() => {
                      setDismissedNodeId(null)
                      onSelectNode(node.id)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setDismissedNodeId(null)
                        onSelectNode(node.id)
                      }
                    }}
                  >
                    <desc id={descriptionId}>{node.description}</desc>

                    {isEvent ? (
                      (() => {
                        // Below-spine events mirror the text stack so the kind
                        // micro-label stays on top and the connector never
                        // crosses a line of text.
                        const below = (node.nudge ?? 0) > 0
                        const eventStroke = strokeForVariant(
                          node.weight === 'primary' ? 'main' : 'branch',
                        )
                        const connectorEnd = below
                          ? node.y - 38
                          : node.y + (node.sublabel ? 26 : 10)

                        return (
                          <>
                            <line
                              x1={node.cx}
                              y1={node.cy}
                              x2={node.cx}
                              y2={connectorEnd}
                              stroke={eventStroke}
                              strokeWidth={EDGE_STROKE_WIDTH}
                              strokeDasharray="2 4"
                            />
                            <circle
                              cx={node.cx}
                              cy={node.cy}
                              r={DOT_R}
                              fill="var(--background)"
                              stroke={eventStroke}
                              strokeWidth={1.2}
                            />
                            <circle cx={node.cx} cy={node.cy} r={DOT_R / 2.6} fill={eventStroke} />
                            {node.kind ? (
                              <text
                                x={node.cx}
                                y={node.y - 24}
                                textAnchor="middle"
                                letterSpacing="1.4"
                                className="fill-foreground/75 font-mono text-[10px] uppercase"
                              >
                                {node.kind}
                              </text>
                            ) : null}
                            <text
                              x={node.cx}
                              y={node.y}
                              textAnchor="middle"
                              className={
                                node.weight === 'primary'
                                  ? 'fill-foreground text-[13.5px]'
                                  : 'fill-foreground/82 text-[13.5px]'
                              }
                            >
                              {node.label}
                            </text>
                            {node.sublabel ? (
                              <text
                                x={node.cx}
                                y={node.y + 18}
                                textAnchor="middle"
                                className="fill-foreground/75 font-mono text-[10.5px]"
                              >
                                {node.sublabel}
                              </text>
                            ) : null}
                            <rect
                              data-node-hit-area="true"
                              x={node.x}
                              y={below ? node.cy - 12 : node.y - 36}
                              width={node.w}
                              height={
                                below ? node.y + 30 - (node.cy - 12) : node.cy + 12 - (node.y - 36)
                              }
                              fill="transparent"
                            />
                          </>
                        )
                      })()
                    ) : isTable ? (
                      <>
                        <rect
                          data-node-surface="true"
                          x={node.x}
                          y={node.y}
                          width={node.w}
                          height={node.h}
                          rx={CARD_R}
                          fill={
                            node.weight === 'primary'
                              ? 'var(--diagram-node-fill, color-mix(in srgb, var(--foreground) 4%, var(--background)))'
                              : 'var(--diagram-secondary-fill, transparent)'
                          }
                          stroke={
                            node.weight === 'primary'
                              ? 'color-mix(in srgb, var(--foreground) 28%, var(--border))'
                              : NODE_BORDER
                          }
                          strokeWidth={1}
                        />
                        <path
                          d={`M ${node.x} ${node.y + 26} L ${node.x} ${node.y + CARD_R} Q ${node.x} ${node.y} ${node.x + CARD_R} ${node.y} L ${node.x + node.w - CARD_R} ${node.y} Q ${node.x + node.w} ${node.y} ${node.x + node.w} ${node.y + CARD_R} L ${node.x + node.w} ${node.y + 26} Z`}
                          fill="color-mix(in srgb, var(--foreground) 6%, transparent)"
                        />
                        <text
                          x={node.x + 14}
                          y={node.y + 17.5}
                          className={
                            node.weight === 'primary'
                              ? 'fill-foreground text-[13px]'
                              : 'fill-foreground/82 text-[13px]'
                          }
                        >
                          {node.label}
                        </text>
                        {(node.fields ?? []).map((field, fieldIndex) => (
                          <g key={`${node.id}-${field.name}`}>
                            <line
                              x1={node.x}
                              y1={node.y + 26 + fieldIndex * 22}
                              x2={node.x + node.w}
                              y2={node.y + 26 + fieldIndex * 22}
                              stroke={NODE_BORDER}
                              strokeWidth={0.75}
                            />
                            {field.key === 'pk' || field.key === 'fk' ? (
                              <text
                                x={node.x + 14}
                                y={node.y + 26 + fieldIndex * 22 + 14.5}
                                letterSpacing="0.6"
                                className={
                                  field.key === 'pk'
                                    ? 'fill-[var(--color-cobalt)] font-mono text-[8.5px] uppercase'
                                    : 'fill-[var(--color-branch)] font-mono text-[8.5px] uppercase'
                                }
                              >
                                {field.key}
                              </text>
                            ) : null}
                            <text
                              data-field-name={field.name}
                              x={node.x + (field.key === 'pk' || field.key === 'fk' ? 34 : 14)}
                              y={node.y + 26 + fieldIndex * 22 + 14.5}
                              className="fill-foreground/80 font-mono text-[11px]"
                            >
                              {field.name}
                            </text>
                            {field.type || field.key === 'unique' ? (
                              <text
                                data-field-annotation={field.name}
                                x={node.x + node.w - 14}
                                y={node.y + 26 + fieldIndex * 22 + 14.5}
                                textAnchor="end"
                                className="fill-foreground/75 font-mono text-[10px]"
                              >
                                {[field.type, field.key === 'unique' ? 'unique' : null]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </text>
                            ) : null}
                          </g>
                        ))}
                      </>
                    ) : isMuted ? (
                      <line
                        x1={node.x}
                        y1={node.y + node.h}
                        x2={node.x + node.w}
                        y2={node.y + node.h}
                        stroke={NODE_BORDER}
                        strokeWidth={1}
                      />
                    ) : (
                      <rect
                        data-node-surface="true"
                        x={node.x}
                        y={node.y}
                        width={node.w}
                        height={node.h}
                        rx={radius}
                        fill={
                          weight === 'primary'
                            ? 'var(--diagram-node-fill, color-mix(in srgb, var(--foreground) 4%, var(--background)))'
                            : 'var(--diagram-secondary-fill, transparent)'
                        }
                        stroke={
                          weight === 'primary'
                            ? 'color-mix(in srgb, var(--foreground) 28%, var(--border))'
                            : NODE_BORDER
                        }
                        strokeWidth={1}
                        className={
                          weight === 'primary' ? 'opacity-100' : 'opacity-[0.84] dark:opacity-70'
                        }
                      />
                    )}

                    {!isEvent ? (
                      <rect
                        data-node-hit-area="true"
                        x={node.x}
                        y={node.y}
                        width={node.w}
                        height={node.h}
                        fill="transparent"
                      />
                    ) : null}

                    <rect
                      aria-hidden="true"
                      data-node-focus-ring="true"
                      x={node.x - 2}
                      y={node.y - 2}
                      width={node.w + 4}
                      height={isEvent ? 60 : node.h + 4}
                      rx={radius + 2}
                      fill="none"
                      stroke="var(--color-cobalt)"
                      strokeWidth={1.5}
                      opacity={isFocused ? 0.8 : 0}
                      className="pointer-events-none transition-opacity duration-150"
                    />

                    {isState ? (
                      <>
                        {node.initial ? (
                          <rect
                            x={node.x + 4}
                            y={node.y + 4}
                            width={node.w - 8}
                            height={node.h - 8}
                            rx={radius - 4}
                            fill="none"
                            stroke={NODE_BORDER}
                            strokeWidth={1}
                            className="pointer-events-none"
                          />
                        ) : null}
                        {node.final ? (
                          // Terminal marker on the right edge of the pill —
                          // never over the label text.
                          <g className="pointer-events-none">
                            <circle
                              cx={node.x + node.w - 20}
                              cy={node.cy}
                              r={6.5}
                              fill="none"
                              stroke="var(--foreground)"
                              strokeOpacity={0.55}
                              strokeWidth={1}
                            />
                            <circle
                              cx={node.x + node.w - 20}
                              cy={node.cy}
                              r={2.6}
                              fill="var(--foreground)"
                              fillOpacity={0.7}
                            />
                          </g>
                        ) : null}
                      </>
                    ) : null}

                    {!isEvent && visual ? (
                      <ArchitectureNodeIcon
                        size={NODE_ICON_SIZE}
                        visual={visual}
                        x={node.x + 15}
                        y={node.cy - NODE_ICON_SIZE / 2}
                      />
                    ) : null}

                    {!isEvent && !isTable && node.kind ? (
                      <text
                        x={textX}
                        y={node.y + 24}
                        letterSpacing="1.6"
                        className="fill-foreground/75 font-mono text-[11.25px] uppercase"
                      >
                        {node.kind}
                      </text>
                    ) : null}

                    {!isEvent && !isTable ? (
                      <text
                        data-node-label="true"
                        x={centeredLabel ? node.cx : textX}
                        y={centeredLabel ? node.cy : node.y + 48}
                        textAnchor={centeredLabel ? 'middle' : undefined}
                        dominantBaseline={centeredLabel ? 'central' : undefined}
                        className={
                          weight === 'primary'
                            ? 'fill-foreground text-[14.5px]'
                            : 'fill-foreground/82 text-[14.5px]'
                        }
                      >
                        {node.label}
                      </text>
                    ) : null}

                    {!isEvent && !isTable && node.sublabel ? (
                      <text
                        x={textX}
                        y={node.y + 70}
                        className="fill-foreground/75 font-mono text-[11.25px]"
                      >
                        {node.sublabel}
                      </text>
                    ) : null}
                  </g>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  sideOffset={10}
                  variant="glass"
                  onEscapeKeyDown={() => dismissNode(node.id)}
                  onPointerDownOutside={(event) => {
                    const target = event.detail.originalEvent.target
                    const owningTrigger =
                      target instanceof Element ? target.closest('[data-node-trigger-id]') : null

                    if (owningTrigger?.getAttribute('data-node-trigger-id') === descriptionId) {
                      event.preventDefault()
                      return
                    }

                    dismissNode(node.id)
                  }}
                  className="font-sans block max-w-[min(19rem,calc(100vw-2rem))] px-4 py-3.5 text-left"
                >
                  <span className="block font-mono text-[9px] uppercase tracking-[0.16em] text-foreground/75">
                    {node.kind ?? node.label}
                  </span>
                  {node.kind ? (
                    <span className="mt-1 block text-[13px] font-medium leading-tight text-foreground">
                      {node.label}
                    </span>
                  ) : null}
                  {node.sublabel ? (
                    <span className="mt-1 block font-mono text-[10px] leading-relaxed text-foreground/75">
                      {node.sublabel}
                    </span>
                  ) : null}
                  <span className="mt-2.5 block border-t border-border/70 pt-2.5 text-[11.5px] leading-[1.55] text-foreground/78">
                    {node.description}
                  </span>
                </TooltipContent>
              </Tooltip>
            )
          })}
      </TooltipProvider>

      {layout.decisions?.map((decision) => (
        <g
          key={decision.id}
          data-decision-id={decision.id}
          opacity={!highlight || highlight.nodes.has(decision.source) ? 1 : DIMMED_OPACITY}
          className="transition-opacity duration-150"
        >
          <rect
            x={decision.x - decision.width / 2}
            y={decision.y - DECISION_PILL_H / 2}
            width={decision.width}
            height={DECISION_PILL_H}
            rx={DECISION_PILL_R}
            fill="var(--background)"
            stroke="color-mix(in srgb, var(--foreground) 24%, var(--border))"
            strokeWidth={1}
          />
          <text
            x={decision.x}
            y={decision.y + 4.5}
            textAnchor="middle"
            className="fill-foreground/82 text-[12.25px]"
          >
            {decision.label}
          </text>
        </g>
      ))}

      {/* Pills sit above the cards, but authored placements keep them in open slots. */}
      {layout.edges
        .filter((edge) => Boolean(edge.label))
        .map((edge) => {
          const label = edge.label as string

          return (
            <g
              key={`${edge.id}-label`}
              data-edge-label={edge.id}
              opacity={edgeOpacity(edge, highlight)}
              className="transition-opacity duration-150"
            >
              <rect
                x={edge.labelX - edge.labelWidth / 2}
                y={edge.labelY - PILL_H / 2}
                width={edge.labelWidth}
                height={PILL_H}
                rx={PILL_R}
                fill="var(--background)"
                stroke="var(--border)"
                strokeWidth={1}
              />
              <text
                x={edge.labelX}
                y={edge.labelY + 4}
                textAnchor="middle"
                className="fill-foreground/70 font-mono text-[11.25px]"
              >
                {label}
              </text>
            </g>
          )
        })}

      {layout.continuations?.map((continuation) => (
        <g
          key={`${continuation.id}-label`}
          data-continuation-label={continuation.id}
          opacity={continuationOpacity(continuation, highlight)}
          className="transition-opacity duration-150"
        >
          <rect
            x={continuation.labelX - continuation.labelWidth / 2}
            y={continuation.labelY - PILL_H / 2}
            width={continuation.labelWidth}
            height={PILL_H}
            rx={PILL_R}
            fill="var(--background)"
            stroke="var(--border)"
            strokeWidth={1}
          />
          <text
            x={continuation.labelX}
            y={continuation.labelY + 4}
            textAnchor="middle"
            className="fill-foreground/70 font-mono text-[11.25px]"
          >
            {continuation.displayLabel}
          </text>
        </g>
      ))}
    </svg>
  )
}

export default DiagramCanvas
