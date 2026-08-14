import { DiagramNode, DiagramEdge, EdgeVariant, PortSide, DiagramDecision, DiagramContinuation, DiagramSpec, LegacyBandSpec } from './types.js';
export { DIMMED_OPACITY } from './theme.js';

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
declare const edgeId: (edge: Pick<DiagramEdge, "from" | "to">) => string;
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

export { type Adjacency, type DiagramLayout, type Highlight, type NodePort, type PlacedContainer, type PlacedContinuation, type PlacedDecision, type PlacedEdge, type PlacedLifeline, type PlacedNode, buildAdjacency, connectY, connectedIds, diagramEdges, edgeId, isMutedNode, labelPillWidth, nodeHeight, nodePorts, roundedPolyline };
