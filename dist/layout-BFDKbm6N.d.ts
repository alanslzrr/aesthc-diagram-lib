import './theme.js';

/** Font roles shared by scene bounds and quality diagnostics. */
interface TextRole {
    size: number;
    family: 'Geist' | 'Geist Mono';
    tracking?: number;
    /** Character-width fraction of the font size used by the conservative fallback. */
    charFactor: number;
}
type TextMeasurer = (text: string, role: TextRole) => number;

type Locale = 'en' | 'es';
type JsonValue = null | boolean | number | string | JsonValue[] | {
    [key: string]: JsonValue;
};
interface Point {
    x: number;
    y: number;
}
interface Size {
    width: number;
    height: number;
}
interface Rect extends Point, Size {
}
interface Viewport {
    x: number;
    y: number;
    zoom: number;
}
type EntityRef = {
    kind: 'node' | 'edge' | 'group';
    id: string;
};
interface FocusSet {
    nodeIds: string[];
    edgeIds: string[];
}
interface GraphPort {
    id: string;
    side: PortSide;
    offset: number;
    direction: 'in' | 'out' | 'both';
    capacity?: number;
    label?: string;
}
interface GraphNode extends DiagramNode {
    ports?: GraphPort[];
    renderer?: {
        typeKey: string;
        data: {
            [key: string]: JsonValue;
        };
    };
}
interface GraphEdge extends DiagramEdge {
    sourcePort?: string;
    targetPort?: string;
}
interface GraphDiagramSpec {
    type: 'graph';
    profile?: 'architecture' | 'data-flow';
    caption: string;
    legend: {
        main: string;
        branch: string;
    };
    nodes: GraphNode[];
    edges: GraphEdge[];
}
type EditorSpec = DiagramSpec | GraphDiagramSpec;
type EditorDiagramType = EditorSpec['type'];
interface NodePlacement extends Rect {
    locked: boolean;
}
interface EndpointAnchor {
    side: PortSide;
    offset: number;
}
type RoutePlacement = {
    mode: 'auto';
} | {
    mode: 'manual';
    source: EndpointAnchor;
    target: EndpointAnchor;
    points: Point[];
    label?: Point;
};
interface DiagramGroup {
    id: string;
    label: string;
    kind: 'visual' | 'system' | 'region' | 'security-group';
    nodeIds: string[];
    parentGroup?: string;
    locked: boolean;
}
interface DiagramScene {
    mode: 'auto' | 'manual' | 'hybrid';
    nodes: Record<string, NodePlacement>;
    routes: Record<string, RoutePlacement>;
    groups: DiagramGroup[];
    zOrder: string[];
}
interface Palette {
    background: string;
    foreground: string;
    card: string;
    border: string;
    mutedForeground: string;
    cobalt: string;
    branch: string;
}
interface Presentation {
    theme: {
        mode: 'light' | 'dark';
        light: Palette;
        dark: Palette;
    };
    grid: {
        visible: boolean;
        snap: boolean;
        size: number;
    };
    padding: number;
    legend: 'visible' | 'hidden';
    edgeStyle: 'orthogonal' | 'straight';
    textScale: number;
}
interface DiagramLink {
    label: string;
    href: string;
}
interface SourceEvidence {
    id: string;
    repository: string;
    commit: string;
    path: string;
    startLine: number;
    endLine: number;
    blobSha?: string;
}
interface EntityMetadata {
    roles: string[];
    tags: string[];
    notes?: string;
    links?: DiagramLink[];
    evidence?: SourceEvidence[];
    owner?: string;
    visibility?: 'public' | 'private';
    crossing?: string;
}
interface DocumentMetadata {
    nodes: Record<string, EntityMetadata>;
    edges: Record<string, EntityMetadata>;
    visuals: Record<string, DiagramNodeVisual>;
    engineeringProfile?: 'deployment-ownership';
}
interface NamedView {
    id: string;
    label: string;
    note?: string;
    focus: FocusSet;
    camera?: Viewport;
}
interface StoryStep {
    id: string;
    viewId: string;
    durationMs: number;
    routeEdgeIds?: string[];
}
interface DiagramDocument {
    format: 'aesthc-diagram';
    schemaVersion: 1;
    id: string;
    revision: number;
    locale: Locale;
    spec: EditorSpec;
    scene: DiagramScene;
    presentation: Presentation;
    metadata: DocumentMetadata;
    views: NamedView[];
    story: StoryStep[];
    extensions: {
        [namespace: string]: JsonValue;
    };
}
interface DiagramFragment {
    format: 'aesthc-diagram-fragment';
    schemaVersion: 1;
    sourceDocumentId: string;
    document: DiagramDocument;
    selection: EntityRef[];
}
type Capability = 'move-free' | 'resize' | 'resize-width' | 'connect' | 'ports' | 'waypoints' | 'groups' | 'reassign-band' | 'reassign-lane' | 'reorder-participants' | 'reorder-messages' | 'reorder-events' | 'reorder-lanes' | 'edit-fields';
type NodeInput = {
    diagramType: 'graph';
    node: GraphNode;
} | {
    diagramType: 'flowchart';
    node: DiagramNode;
} | {
    diagramType: 'band';
    node: BandDiagramNode;
} | {
    diagramType: 'swimlane';
    node: DiagramNode & {
        lane: string;
    };
} | {
    diagramType: 'sequence';
    node: SequenceParticipant;
} | {
    diagramType: 'state-machine';
    node: StateMachineState;
} | {
    diagramType: 'er';
    node: ErEntity;
} | {
    diagramType: 'timeline';
    node: TimelineEvent;
};
type RelationInput = {
    diagramType: 'graph';
    relation: GraphEdge & {
        id: string;
    };
} | {
    diagramType: 'band' | 'flowchart' | 'swimlane';
    relation: DiagramEdge & {
        id: string;
    };
} | {
    diagramType: 'sequence';
    relation: SequenceMessage;
} | {
    diagramType: 'state-machine';
    relation: StateTransition & {
        id: string;
    };
} | {
    diagramType: 'er';
    relation: ErRelation & {
        id: string;
    };
};
type ReorderCollection = 'nodes' | 'participants' | 'messages' | 'states' | 'transitions' | 'entities' | 'relations' | 'events' | 'lanes' | 'edges';
type StructuralEdit = {
    type: 'bands.replace';
    bands: DiagramBand[];
    assignments: Record<string, number>;
    removeNodeIds: string[];
} | {
    type: 'lanes.replace';
    lanes: SwimlaneLane[];
    assignments: Record<string, string>;
    removeNodeIds: string[];
} | {
    type: 'band-annotations.replace';
    decisions: DiagramDecision[];
    continuations: DiagramContinuation[];
};
interface TypeAdapter {
    type: EditorDiagramType;
    capabilities: readonly Capability[];
    nodeIds(spec: EditorSpec): string[];
    edges(spec: EditorSpec): Array<DiagramEdge & {
        id: string;
    }>;
    insertNode(spec: EditorSpec, input: NodeInput, index?: number): Result<EditorSpec>;
    replaceNode(spec: EditorSpec, input: NodeInput): Result<EditorSpec>;
    removeNodes(spec: EditorSpec, ids: string[]): Result<EditorSpec>;
    insertRelation(spec: EditorSpec, input: RelationInput, index?: number): Result<EditorSpec>;
    replaceRelation(spec: EditorSpec, input: RelationInput): Result<EditorSpec>;
    removeRelations(spec: EditorSpec, ids: string[]): Result<EditorSpec>;
    reorder(spec: EditorSpec, collection: ReorderCollection, orderedIds: string[]): Result<EditorSpec>;
    seedLayout(spec: EditorSpec): Result<DiagramLayout>;
    editStructure(spec: EditorSpec, operation: StructuralEdit): Result<EditorSpec>;
}
interface Diagnostic {
    code: string;
    severity: 'error' | 'warning' | 'info';
    path: string;
    subject?: EntityRef;
    message: string;
    evidence?: {
        [key: string]: JsonValue;
    };
    supportedFixes: Array<'move' | 'resize' | 'set-waypoints' | 'move-label' | 'change-spacing' | 'shorten-text-manually' | 'select-layout'>;
}
type Result<T> = {
    ok: true;
    value: T;
    diagnostics: Diagnostic[];
} | {
    ok: false;
    diagnostics: Diagnostic[];
};
interface Limits {
    maxBytes: number;
    maxDepth: number;
    maxNodes: number;
    maxEdges: number;
    maxGroups: number;
    maxGroupDepth: number;
    maxPorts: number;
    maxRoutePoints: number;
    maxLabelCharacters: number;
    maxDescriptionCharacters: number;
    maxViews: number;
    maxStorySteps: number;
}
interface ImportOptions {
    id: string;
    locale: Locale;
    allowLegacyBand?: boolean;
    limits?: Partial<Limits>;
}
interface ImportReceipt {
    document: DiagramDocument;
    source: 'document-v1' | 'spec' | 'legacy-band' | 'localized';
    materializedEdgeIds: Array<{
        index: number;
        id: string;
    }>;
    omittedLocale?: Locale;
}
interface ResolvedScene {
    layout: DiagramLayout;
    worldBounds: Rect;
    origin: Point;
    diagnostics: Diagnostic[];
}
interface ResolveContext {
    quality: 'edit' | 'publish';
    requestId: string;
    signal?: AbortSignal;
    /** Real typographic measurer (e.g. canvas-backed). Falls back to a conservative estimate when absent. */
    measureText?: TextMeasurer;
    /**
     * Skip the internal document validation when the caller owns the trust boundary
     * (store-produced snapshots and previews are validated before they reach the renderer).
     * Public and exported paths must not set this; their input is untrusted.
     */
    skipValidation?: boolean;
    /**
     * Skip warning diagnostics (overlap scan and text overflow) when no consumer
     * renders them. Geometry and bounds stay exact; only the O(n²) overlap scan
     * and overflow pushes are dropped. Publish/export paths must not set this.
     */
    skipDiagnostics?: boolean;
}
type EditorCommand = {
    type: 'document.replace-content';
    document: DiagramDocument;
} | {
    type: 'spec.replace';
    spec: EditorSpec;
    references: 'reject' | 'prune-references';
} | {
    type: 'nodes.move';
    positions: Record<string, Point>;
} | {
    type: 'nodes.set-lock';
    ids: string[];
    locked: boolean;
} | {
    type: 'node.resize';
    id: string;
    size: Size;
} | {
    type: 'route.set';
    id: string;
    route: RoutePlacement;
} | {
    type: 'group.upsert';
    group: DiagramGroup;
} | {
    type: 'group.remove';
    id: string;
    members: 'keep' | 'delete';
} | {
    type: 'presentation.set';
    presentation: Presentation;
} | {
    type: 'metadata.set';
    metadata: DocumentMetadata;
} | {
    type: 'views.set';
    views: NamedView[];
    story: StoryStep[];
} | {
    type: 'scene.set';
    scene: DiagramScene;
};
interface Transaction {
    id: string;
    label: string;
    expectedRevision: number;
    commands: EditorCommand[];
}
interface ChangeSet {
    affected: EntityRef[];
    invalidates: Array<'layout' | 'graph' | 'style' | 'views'>;
}
type CommitResult = {
    status: 'committed';
    document: DiagramDocument;
    changes: ChangeSet;
    diagnostics: Diagnostic[];
} | {
    status: 'noop';
    document: DiagramDocument;
    diagnostics: Diagnostic[];
} | {
    status: 'rejected';
    document: DiagramDocument;
    diagnostics: Diagnostic[];
};
interface EditorPermissions {
    edit: boolean;
    export: boolean;
    save: boolean;
}
type EditorTool = 'select' | 'hand' | 'connect';
interface EditorSnapshot {
    document: DiagramDocument;
    selection: readonly EntityRef[];
    viewport: Viewport;
    tool: EditorTool;
    dirty: boolean;
    canUndo: boolean;
    canRedo: boolean;
    diagnostics: readonly Diagnostic[];
    draft: {
        kind: 'none';
    } | {
        kind: 'gesture';
        preview: DiagramDocument;
        transactionId: string;
    } | {
        kind: 'text';
        text: string;
        baseRevision: number;
        diagnostics: Diagnostic[];
    };
}
interface StoreOptions {
    document: DiagramDocument;
    idFactory?: (kind: 'node' | 'edge' | 'group' | 'transaction' | 'document') => string;
    permissions: EditorPermissions;
    history?: {
        maxEntries: number;
        maxBytes: number;
    };
    limits?: Partial<Limits>;
}
interface EditorStore {
    getSnapshot(): EditorSnapshot;
    subscribe(listener: () => void): () => void;
    onCommit(listener: (result: Extract<CommitResult, {
        status: 'committed';
    }>) => void): () => void;
    dispatch(transaction: Transaction): CommitResult;
    beginGesture(transaction: Omit<Transaction, 'commands'>): Result<void>;
    previewGesture(commands: EditorCommand[], options?: {
        skipValidation?: boolean;
    }): Result<void>;
    commitGesture(): CommitResult;
    cancelGesture(): void;
    setTextDraft(text: string): void;
    commitTextDraft(): CommitResult;
    cancelTextDraft(): void;
    undo(): CommitResult;
    redo(): CommitResult;
    setSelection(selection: EntityRef[]): void;
    setViewport(viewport: Viewport): void;
    setTool(tool: EditorTool): void;
    /** Replace the runtime permission set; pending gestures are evaluated against the new policy. */
    setPermissions(permissions: EditorPermissions): void;
    replaceDocument(document: DiagramDocument, options: {
        expectedRevision: number;
        history: 'reset';
    }): CommitResult;
    markSaved(document: DiagramDocument): void;
    dispose(): void;
}

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

/** Vertical attachment point for a port on a given side. */
interface NodePort {
    side: PortSide;
    x: number;
    y: number;
    variant: EdgeVariant;
}
interface PlacedNode extends DiagramNode {
    slot?: number;
    /** Logical column/group index: band column, flowchart level, swimlane row… */
    band: number;
    x: number;
    y: number;
    w: number;
    h: number;
    cx: number;
    cy: number;
}
interface PlacedEdge extends DiagramEdge {
    id: string;
    variant: EdgeVariant;
    d: string;
    labelX: number;
    labelY: number;
    labelWidth: number;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    fromSide: PortSide;
    toSide: PortSide;
    routePoints?: Array<[number, number]>;
    /** Draw a chevron arrowhead at the path end (sequence messages, transitions…). */
    arrowEnd?: boolean;
    /** Per-edge stroke override; defaults to EDGE_STROKE_WIDTH. */
    strokeWidth?: number;
}
interface PlacedDecision extends DiagramDecision {
    x: number;
    y: number;
    width: number;
}
interface PlacedContinuation extends DiagramContinuation {
    variant: EdgeVariant;
    displayLabel: string;
    d: string;
    sourceX: number;
    sourceY: number;
    endX: number;
    endY: number;
    labelX: number;
    labelY: number;
    labelWidth: number;
}
/** Labelled region drawn behind nodes, e.g. a swimlane row. */
interface PlacedContainer {
    id: string;
    label: string;
    kind?: string;
    x: number;
    y: number;
    w: number;
    h: number;
    variant?: EdgeVariant;
}
/** Vertical dashed lifeline for sequence participants. */
interface PlacedLifeline {
    id: string;
    label: string;
    kind?: string;
    x: number;
    y0: number;
    y1: number;
}
interface Adjacency {
    out: Map<string, string[]>;
    in: Map<string, string[]>;
    /** Relation identities grouped by encoded endpoints. */
    relations?: Map<string, string[]>;
}
interface Highlight {
    nodes: Set<string>;
    edges: Set<string>;
}
interface DiagramLayout {
    width: number;
    height: number;
    nodes: PlacedNode[];
    edges: PlacedEdge[];
    decisions: PlacedDecision[];
    continuations: PlacedContinuation[];
    containers?: PlacedContainer[];
    lifelines?: PlacedLifeline[];
    nodeById: Record<string, PlacedNode>;
}
declare const edgeId: (edge: Pick<DiagramEdge, "from" | "to" | "id">) => string;
/** Preserve explicit IDs; assign unique deterministic IDs to anonymous edges.
 * Anonymous parallel identities follow authored order. Use explicit IDs when reordering.
 */
declare function identifyEdges<T extends DiagramEdge>(edges: T[]): Array<T & {
    id: string;
}>;
declare const labelPillWidth: (label: string) => number;
declare const nodeHeight: (node: Pick<DiagramNode, "sublabel">) => number;
declare const isMutedNode: (node: Pick<PlacedNode, "weight">) => boolean;
/**
 * Vertical attachment point for a port on a given side. A muted node has no
 * card rect — only a bottom rule — so a horizontal (`left`/`right`) approach,
 * and a vertical approach from below (a `bottom` port), both land on that
 * rule (`y + h`): it is the only thing actually drawn there. A vertical
 * approach from above (a `top` port) must stop at the top of the node's own
 * text block (`y`) instead — continuing down to the rule would draw straight
 * through the card's kind label and title.
 */
declare const connectY: (node: PlacedNode, side: PortSide) => number;
/** Orthogonal polyline through waypoints with rounded corners. */
declare function roundedPolyline(pts: Array<[number, number]>, r?: number): string;
/**
 * Splits an edge list into forward edges and back edges (cycle closers),
 * detected with a DFS in authored order. Levelled layouts (flowchart,
 * swimlane) keep the topology acyclic for placement and route the back
 * edges around the content as feedback lanes.
 */
declare function splitBackEdges(nodes: Array<{
    id: string;
}>, edges: DiagramEdge[]): {
    forward: DiagramEdge[];
    back: DiagramEdge[];
};
declare function buildAdjacency(edges: DiagramEdge[]): Adjacency;
/**
 * Normalizes the authored relation list of any spec type into plain edges.
 * Band/flowchart/swimlane use `edges`, sequence uses `messages`,
 * state-machine uses `transitions`, er uses `relations`, timeline has none.
 */
declare function diagramEdges(spec: DiagramSpec | LegacyBandSpec): DiagramEdge[];
/** Collect the full upstream and downstream control-flow path through a node. */
declare function connectedIds(nodeId: string, adjacency: Adjacency): Highlight;
/** Returns only real connection points; unused/hollow ports are intentionally absent. */
declare function nodePorts(node: PlacedNode, edges: PlacedEdge[], continuations?: PlacedContinuation[]): NodePort[];

export { type EntityMetadata as $, type Point as A, type BandDiagramSpec as B, type DiagramScene as C, type Diagnostic as D, type EditorStore as E, type FlowchartDiagramSpec as F, type ResolveContext as G, type Highlight as H, type ImportOptions as I, type DiagramFragment as J, type Transaction as K, type Locale as L, type EditorPermissions as M, type CommitResult as N, type Capability as O, type PlacedNode as P, type ChangeSet as Q, type Result as R, type StoreOptions as S, type TimelineDiagramSpec as T, type DiagramGroup as U, type Viewport as V, type DiagramLink as W, type DocumentMetadata as X, type EditorCommand as Y, type EditorTool as Z, type EndpointAnchor as _, type EditorSnapshot as a, type FocusSet as a0, type GraphDiagramSpec as a1, type GraphEdge as a2, type GraphNode as a3, type GraphPort as a4, type JsonValue as a5, type NamedView as a6, type NodeInput as a7, type NodePlacement as a8, type Palette as a9, type PlacedLifeline as aA, type SemanticNodeIconKey as aB, type SequenceMessage as aC, type SequenceParticipant as aD, type StateMachineState as aE, type StateTransition as aF, type SvglNodeIconKey as aG, type SwimlaneLane as aH, type TableField as aI, type ThesvgNodeIconKey as aJ, type TimelineEvent as aK, buildAdjacency as aL, connectY as aM, connectedIds as aN, diagramEdges as aO, edgeId as aP, identifyEdges as aQ, isMutedNode as aR, labelPillWidth as aS, nodeHeight as aT, nodePorts as aU, roundedPolyline as aV, splitBackEdges as aW, type RelationInput as aa, type ReorderCollection as ab, type RoutePlacement as ac, type SourceEvidence as ad, type StoryStep as ae, type StructuralEdit as af, type LocalizedDiagram as ag, type Adjacency as ah, type BandDiagramNode as ai, type ContinuationAnchor as aj, type ContinuationSide as ak, type DiagramBand as al, type DiagramContinuation as am, type DiagramNodeShape as an, type DiagramNodeTextAnchor as ao, type DiagramType as ap, type EdgeLabelPlacement as aq, type EdgeLane as ar, type ErEntity as as, type ErRelation as at, type NodePort as au, type NodeWeight as av, type PlacedContainer as aw, type PlacedContinuation as ax, type PlacedDecision as ay, type PlacedEdge as az, type EntityRef as b, type DiagramDocument as c, type DiagramEdge as d, type LegacyBandSpec as e, type DiagramLayout as f, type DiagramDecision as g, type DiagramNode as h, type EdgeVariant as i, type PortSide as j, type ResolvedScene as k, type DiagramSpec as l, type DiagramNodeVisual as m, type DiagramRegistration as n, type SequenceDiagramSpec as o, type StateMachineDiagramSpec as p, type ErDiagramSpec as q, type SwimlaneDiagramSpec as r, type EditorSpec as s, type Presentation as t, type ImportReceipt as u, type Limits as v, type EditorDiagramType as w, type TypeAdapter as x, type Rect as y, type Size as z };
