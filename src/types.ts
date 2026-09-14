// Data model for the diagram library.
//
// A diagram is a localized spec discriminated by `type`. Each type (band,
// flowchart, sequence, state-machine, er, timeline, swimlane) declares its own
// authoring shape; every layout converts its spec into the same `DiagramLayout`
// geometry so a single SVG canvas can render them all.

/** Visual weight of a node card. */
export type NodeWeight = 'primary' | 'secondary' | 'muted'
/** Edge flavour: cobalt main path vs amber branch path. */
export type EdgeVariant = 'main' | 'branch'
export type PortSide = 'left' | 'right' | 'top' | 'bottom'
export type ContinuationSide = Extract<PortSide, 'left' | 'right'>
export type ContinuationAnchor = 'upper' | 'center' | 'lower'
export type EdgeLabelPlacement = 'above-target' | 'below-target' | 'left-of-edge' | 'right-of-edge'
export type EdgeLane = 'above' | 'below'

/** How a node is drawn: hairline card (default), state pill, ER table, timeline event, terminal, activation bar. */
export type DiagramNodeShape = 'card' | 'state' | 'table' | 'event' | 'terminal' | 'bar'
/** For `event` shapes, where the label sits relative to the dot. */
export type DiagramNodeTextAnchor = 'start' | 'end' | 'middle'

export type SvglNodeIconKey =
  'express' | 'google-cloud' | 'mcp' | 'nextjs' | 'openai' | 'openrouter' | 'pdf' | 'postgresql'

export type SemanticNodeIconKey =
  | 'arrows-split'
  | 'brackets-curly'
  | 'folder-lock'
  | 'gauge'
  | 'graph'
  | 'handshake'
  | 'list-checks'
  | 'list-magnifying-glass'
  | 'monitor'
  | 'receipt'
  | 'rocket-launch'
  | 'scales'
  | 'seal-check'
  | 'user-check'
  | 'user-focus'
  | 'warning'

export type ThesvgNodeIconKey = SvglNodeIconKey | 'azure'

export type DiagramNodeVisual =
  | { source: 'thesvg'; key: ThesvgNodeIconKey }
  | { source: 'svgl'; key: SvglNodeIconKey }
  | { source: 'phosphor'; key: SemanticNodeIconKey }

/** A single row in an ER table node. */
export interface TableField {
  name: string
  /** Optional column type, e.g. `uuid`, `varchar(64)`. */
  type?: string
  /** Row badge: primary key / foreign key / unique. */
  key?: 'pk' | 'fk' | 'unique'
}

export interface DiagramNode {
  id: string
  label: string
  /** Localized explanation shown on hover/focus and available to assistive technology. */
  description: string
  /** Mono micro-label above the title, e.g. 'Trigger', 'Engine', 'Gate'. */
  kind?: string
  sublabel?: string
  weight?: NodeWeight
  /** Vertical fine-tune in viewBox units, applied after the layout centres the node. */
  nudge?: number
  /** Draw this node as something other than a hairline card. */
  shape?: DiagramNodeShape
  /** Label alignment for `event` shapes (timeline). */
  textAnchor?: DiagramNodeTextAnchor
  /** ER table rows (only meaningful for `shape: 'table'`). */
  fields?: TableField[]
  /** State-machine: draw a double outline (initial state). */
  initial?: boolean
  /** State-machine: draw a hollow centre (final state). */
  final?: boolean
}

/** Band-layout nodes additionally declare which column they belong to. */
export interface BandDiagramNode extends DiagramNode {
  band: number
}

export interface DiagramEdge {
  /** Stable identity for parallel relations; recommended when editing/reordering. */
  id?: string
  from: string
  to: string
  label?: string
  variant?: EdgeVariant
  dashed?: boolean
  /** Move a pill into an authored whitespace slot without changing its edge. */
  labelPlacement?: EdgeLabelPlacement
  /** Route a cross-band edge around every intervening band on an outer lane. */
  route?: { lane: EdgeLane; clearance?: number }
}

/**
 * A source-only, off-canvas continuation. It preserves return/feedback semantics
 * without adding a long relation to the graph or enclosing the diagram in a rail.
 */
export interface DiagramContinuation {
  id: string
  from: string
  label: string
  destination: string
  side: ContinuationSide
  anchor?: ContinuationAnchor
  labelPlacement: 'above-source' | 'below-source'
  variant?: EdgeVariant
  /** Spoken text when the compact visible label needs clearer return semantics. */
  ariaLabel?: string
}

export interface DiagramBand {
  title: string
}

/** A compact authored question placed in the free run after a branching node. */
export interface DiagramDecision {
  id: string
  source: string
  label: string
}

/** ─── Per-type specs ─────────────────────────────────────────────────────── */

export interface BandDiagramSpec {
  type: 'band'
  caption: string
  legend: { main: string; branch: string }
  bands: DiagramBand[]
  nodes: BandDiagramNode[]
  edges: DiagramEdge[]
  decisions?: DiagramDecision[]
  continuations?: DiagramContinuation[]
}

export interface FlowchartDiagramSpec {
  type: 'flowchart'
  caption: string
  legend: { main: string; branch: string }
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  /** Global level override for every node; omit for automatic topological levels. */
  level?: number
  /** Main flow direction. */
  direction?: 'top-down' | 'left-right'
}

export interface SequenceParticipant {
  id: string
  label: string
  kind?: string
}

export interface SequenceMessage {
  id: string
  from: string
  to: string
  label?: string
  variant?: EdgeVariant
  dashed?: boolean
  /** Draw a thin activation bar on the target lifeline for this message. */
  activation?: boolean
}

export interface SequenceDiagramSpec {
  type: 'sequence'
  caption: string
  legend: { main: string; branch: string }
  participants: SequenceParticipant[]
  messages: SequenceMessage[]
}

export interface StateMachineState {
  id: string
  label: string
  kind?: string
  sublabel?: string
  weight?: NodeWeight
  description?: string
  /** Drawn with a double outline. */
  initial?: boolean
  /** Drawn with a hollow centre. */
  final?: boolean
}

export interface StateTransition {
  /** Stable identity for parallel relations; recommended when editing/reordering. */
  id?: string
  from: string
  to: string
  label?: string
  variant?: EdgeVariant
  dashed?: boolean
}

export interface StateMachineDiagramSpec {
  type: 'state-machine'
  caption: string
  legend: { main: string; branch: string }
  states: StateMachineState[]
  transitions: StateTransition[]
}

export interface ErEntity {
  id: string
  label: string
  kind?: string
  weight?: NodeWeight
  fields: TableField[]
}

export interface ErRelation {
  /** Stable identity for parallel relations; recommended when editing/reordering. */
  id?: string
  from: string
  to: string
  label?: string
  variant?: EdgeVariant
  dashed?: boolean
}

export interface ErDiagramSpec {
  type: 'er'
  caption: string
  legend: { main: string; branch: string }
  entities: ErEntity[]
  relations: ErRelation[]
}

export interface TimelineEvent {
  id: string
  label: string
  kind?: string
  sublabel?: string
  description: string
  variant?: EdgeVariant
  weight?: NodeWeight
}

export interface TimelineDiagramSpec {
  type: 'timeline'
  caption: string
  legend: { main: string; branch: string }
  events: TimelineEvent[]
}

export interface SwimlaneLane {
  id: string
  label: string
  kind?: string
}

export interface SwimlaneDiagramSpec {
  type: 'swimlane'
  caption: string
  legend: { main: string; branch: string }
  lanes: SwimlaneLane[]
  nodes: Array<DiagramNode & { lane: string }>
  edges: DiagramEdge[]
}

export type DiagramSpec =
  | BandDiagramSpec
  | FlowchartDiagramSpec
  | SequenceDiagramSpec
  | StateMachineDiagramSpec
  | ErDiagramSpec
  | TimelineDiagramSpec
  | SwimlaneDiagramSpec

/** Backwards-compatible alias: the pre-library band diagram had no `type`. */
export type LegacyBandSpec = Omit<BandDiagramSpec, 'type'>

export type LocalizedDiagram<T extends DiagramSpec = DiagramSpec> = { en: T; es: T }

export interface DiagramRegistration<T extends DiagramSpec = DiagramSpec> {
  /** Localized spec. Both locales must share ids and topology. */
  diagram: LocalizedDiagram<T>
  /** Node icons keyed by stable node id. */
  visuals?: Record<string, DiagramNodeVisual>
}

export type DiagramType = DiagramSpec['type']
