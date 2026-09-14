/** Visual weight of a node card. */
type NodeWeight = 'primary' | 'secondary' | 'muted';
/** Edge flavour: cobalt main path vs amber branch path. */
type EdgeVariant = 'main' | 'branch';
type PortSide = 'left' | 'right' | 'top' | 'bottom';
type ContinuationSide = Extract<PortSide, 'left' | 'right'>;
type ContinuationAnchor = 'upper' | 'center' | 'lower';
type EdgeLabelPlacement = 'above-target' | 'below-target' | 'left-of-edge' | 'right-of-edge';
type EdgeLane = 'above' | 'below';
/** How a node is drawn: hairline card (default), state pill, ER table, timeline event, terminal, activation bar. */
type DiagramNodeShape = 'card' | 'state' | 'table' | 'event' | 'terminal' | 'bar';
/** For `event` shapes, where the label sits relative to the dot. */
type DiagramNodeTextAnchor = 'start' | 'end' | 'middle';
type SvglNodeIconKey = 'express' | 'google-cloud' | 'mcp' | 'nextjs' | 'openai' | 'openrouter' | 'pdf' | 'postgresql';
type SemanticNodeIconKey = 'arrows-split' | 'brackets-curly' | 'folder-lock' | 'gauge' | 'graph' | 'handshake' | 'list-checks' | 'list-magnifying-glass' | 'monitor' | 'receipt' | 'rocket-launch' | 'scales' | 'seal-check' | 'user-check' | 'user-focus' | 'warning';
type ThesvgNodeIconKey = SvglNodeIconKey | 'azure';
type DiagramNodeVisual = {
    source: 'thesvg';
    key: ThesvgNodeIconKey;
} | {
    source: 'svgl';
    key: SvglNodeIconKey;
} | {
    source: 'phosphor';
    key: SemanticNodeIconKey;
};
/** A single row in an ER table node. */
interface TableField {
    name: string;
    /** Optional column type, e.g. `uuid`, `varchar(64)`. */
    type?: string;
    /** Row badge: primary key / foreign key / unique. */
    key?: 'pk' | 'fk' | 'unique';
}
interface DiagramNode {
    id: string;
    label: string;
    /** Localized explanation shown on hover/focus and available to assistive technology. */
    description: string;
    /** Mono micro-label above the title, e.g. 'Trigger', 'Engine', 'Gate'. */
    kind?: string;
    sublabel?: string;
    weight?: NodeWeight;
    /** Vertical fine-tune in viewBox units, applied after the layout centres the node. */
    nudge?: number;
    /** Draw this node as something other than a hairline card. */
    shape?: DiagramNodeShape;
    /** Label alignment for `event` shapes (timeline). */
    textAnchor?: DiagramNodeTextAnchor;
    /** ER table rows (only meaningful for `shape: 'table'`). */
    fields?: TableField[];
    /** State-machine: draw a double outline (initial state). */
    initial?: boolean;
    /** State-machine: draw a hollow centre (final state). */
    final?: boolean;
}
/** Band-layout nodes additionally declare which column they belong to. */
interface BandDiagramNode extends DiagramNode {
    band: number;
}
interface DiagramEdge {
    /** Stable identity for parallel relations; recommended when editing/reordering. */
    id?: string;
    from: string;
    to: string;
    label?: string;
    variant?: EdgeVariant;
    dashed?: boolean;
    /** Move a pill into an authored whitespace slot without changing its edge. */
    labelPlacement?: EdgeLabelPlacement;
    /** Route a cross-band edge around every intervening band on an outer lane. */
    route?: {
        lane: EdgeLane;
        clearance?: number;
    };
}
/**
 * A source-only, off-canvas continuation. It preserves return/feedback semantics
 * without adding a long relation to the graph or enclosing the diagram in a rail.
 */
interface DiagramContinuation {
    id: string;
    from: string;
    label: string;
    destination: string;
    side: ContinuationSide;
    anchor?: ContinuationAnchor;
    labelPlacement: 'above-source' | 'below-source';
    variant?: EdgeVariant;
    /** Spoken text when the compact visible label needs clearer return semantics. */
    ariaLabel?: string;
}
interface DiagramBand {
    title: string;
}
/** A compact authored question placed in the free run after a branching node. */
interface DiagramDecision {
    id: string;
    source: string;
    label: string;
}
/** ─── Per-type specs ─────────────────────────────────────────────────────── */
interface BandDiagramSpec {
    type: 'band';
    caption: string;
    legend: {
        main: string;
        branch: string;
    };
    bands: DiagramBand[];
    nodes: BandDiagramNode[];
    edges: DiagramEdge[];
    decisions?: DiagramDecision[];
    continuations?: DiagramContinuation[];
}
interface FlowchartDiagramSpec {
    type: 'flowchart';
    caption: string;
    legend: {
        main: string;
        branch: string;
    };
    nodes: DiagramNode[];
    edges: DiagramEdge[];
    /** Global level override for every node; omit for automatic topological levels. */
    level?: number;
    /** Main flow direction. */
    direction?: 'top-down' | 'left-right';
}
interface SequenceParticipant {
    id: string;
    label: string;
    kind?: string;
}
interface SequenceMessage {
    id: string;
    from: string;
    to: string;
    label?: string;
    variant?: EdgeVariant;
    dashed?: boolean;
    /** Draw a thin activation bar on the target lifeline for this message. */
    activation?: boolean;
}
interface SequenceDiagramSpec {
    type: 'sequence';
    caption: string;
    legend: {
        main: string;
        branch: string;
    };
    participants: SequenceParticipant[];
    messages: SequenceMessage[];
}
interface StateMachineState {
    id: string;
    label: string;
    kind?: string;
    sublabel?: string;
    weight?: NodeWeight;
    description?: string;
    /** Drawn with a double outline. */
    initial?: boolean;
    /** Drawn with a hollow centre. */
    final?: boolean;
}
interface StateTransition {
    /** Stable identity for parallel relations; recommended when editing/reordering. */
    id?: string;
    from: string;
    to: string;
    label?: string;
    variant?: EdgeVariant;
    dashed?: boolean;
}
interface StateMachineDiagramSpec {
    type: 'state-machine';
    caption: string;
    legend: {
        main: string;
        branch: string;
    };
    states: StateMachineState[];
    transitions: StateTransition[];
}
interface ErEntity {
    id: string;
    label: string;
    kind?: string;
    weight?: NodeWeight;
    fields: TableField[];
}
interface ErRelation {
    /** Stable identity for parallel relations; recommended when editing/reordering. */
    id?: string;
    from: string;
    to: string;
    label?: string;
    variant?: EdgeVariant;
    dashed?: boolean;
}
interface ErDiagramSpec {
    type: 'er';
    caption: string;
    legend: {
        main: string;
        branch: string;
    };
    entities: ErEntity[];
    relations: ErRelation[];
}
interface TimelineEvent {
    id: string;
    label: string;
    kind?: string;
    sublabel?: string;
    description: string;
    variant?: EdgeVariant;
    weight?: NodeWeight;
}
interface TimelineDiagramSpec {
    type: 'timeline';
    caption: string;
    legend: {
        main: string;
        branch: string;
    };
    events: TimelineEvent[];
}
interface SwimlaneLane {
    id: string;
    label: string;
    kind?: string;
}
interface SwimlaneDiagramSpec {
    type: 'swimlane';
    caption: string;
    legend: {
        main: string;
        branch: string;
    };
    lanes: SwimlaneLane[];
    nodes: Array<DiagramNode & {
        lane: string;
    }>;
    edges: DiagramEdge[];
}
type DiagramSpec = BandDiagramSpec | FlowchartDiagramSpec | SequenceDiagramSpec | StateMachineDiagramSpec | ErDiagramSpec | TimelineDiagramSpec | SwimlaneDiagramSpec;
/** Backwards-compatible alias: the pre-library band diagram had no `type`. */
type LegacyBandSpec = Omit<BandDiagramSpec, 'type'>;
type LocalizedDiagram<T extends DiagramSpec = DiagramSpec> = {
    en: T;
    es: T;
};
interface DiagramRegistration<T extends DiagramSpec = DiagramSpec> {
    /** Localized spec. Both locales must share ids and topology. */
    diagram: LocalizedDiagram<T>;
    /** Node icons keyed by stable node id. */
    visuals?: Record<string, DiagramNodeVisual>;
}
type DiagramType = DiagramSpec['type'];

export type { BandDiagramNode, BandDiagramSpec, ContinuationAnchor, ContinuationSide, DiagramBand, DiagramContinuation, DiagramDecision, DiagramEdge, DiagramNode, DiagramNodeShape, DiagramNodeTextAnchor, DiagramNodeVisual, DiagramRegistration, DiagramSpec, DiagramType, EdgeLabelPlacement, EdgeLane, EdgeVariant, ErDiagramSpec, ErEntity, ErRelation, FlowchartDiagramSpec, LegacyBandSpec, LocalizedDiagram, NodeWeight, PortSide, SemanticNodeIconKey, SequenceDiagramSpec, SequenceMessage, SequenceParticipant, StateMachineDiagramSpec, StateMachineState, StateTransition, SvglNodeIconKey, SwimlaneDiagramSpec, SwimlaneLane, TableField, ThesvgNodeIconKey, TimelineDiagramSpec, TimelineEvent };
