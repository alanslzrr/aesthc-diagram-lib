import { g as DiagramDocument, j as Result, m as DiagramEdge } from '../layout-BhvxbOAw.js';
import '../theme.js';

interface FieldChange {
    path: string;
    before: unknown;
    after: unknown;
}
interface EntityDelta {
    kind: 'node' | 'edge';
    id: string;
    status: 'added' | 'removed' | 'modified';
    /** Changed semantic field paths; empty for presentation-only changes. */
    semantic: string[];
    /** Changed presentation fields (placement, route points). */
    presentation: string[];
}
interface Comparison {
    before: {
        documentId: string;
        revision: number;
    };
    after: {
        documentId: string;
        revision: number;
    };
    type: string;
    nodes: EntityDelta[];
    edges: EntityDelta[];
    /** Authored-order changes over an unchanged id set. Authored order is
     * semantic: anonymous identity and sequence meaning follow it. */
    reorder: Array<{
        collection: 'nodes' | 'edges';
        before: string[];
        after: string[];
    }>;
    presentation: FieldChange[];
    counts: {
        added: number;
        removed: number;
        modified: number;
        presentationOnly: number;
        reorder: number;
    };
    /** Never implies merge safety: the comparison is read-only evidence. */
    mergeSafety: false;
}
/** Exact structural comparison. Entities are matched by their stable IDs only:
 * a renamed ID is a remove + add, never an inferred rename, and no merge
 * behavior is promised. Inputs are never mutated. */
declare function compareDocuments(beforeInput: DiagramDocument, afterInput: DiagramDocument): Result<Comparison>;

interface GraphFilter {
    variants?: Array<'main' | 'branch'>;
    nodeRoles?: string[];
}
interface GraphNodeInfo {
    id: string;
    label: string;
    kind?: string;
    description?: string;
}
interface GraphSnapshot {
    documentId: string;
    revision: number;
    nodeIds: string[];
    /** Authored order with the same role filter applied to `nodeIds`. */
    nodes: GraphNodeInfo[];
    edges: Array<DiagramEdge & {
        id: string;
    }>;
    filter?: GraphFilter;
}
interface RouteResult {
    status: 'found' | 'unreachable';
    documentId: string;
    revision: number;
    nodeIds: string[];
    edgeIds: string[];
    filter?: GraphFilter;
}
interface ReachResult {
    documentId: string;
    revision: number;
    origin: string;
    direction: 'upstream' | 'downstream';
    nodeIds: string[];
    edgeIds: string[];
    depth: Record<string, number>;
    truncated: boolean;
    filter?: GraphFilter;
}
declare function graphSnapshot(document: DiagramDocument, filter?: GraphFilter): GraphSnapshot;
declare function findRoute(graph: GraphSnapshot, from: string, to: string): Result<RouteResult>;
declare function findReach(graph: GraphSnapshot, origin: string, direction: 'upstream' | 'downstream', maxHops?: number): Result<ReachResult>;
type SearchMatch = 'exact-id' | 'label-prefix' | 'label-substring' | 'kind-prefix' | 'kind-substring';
interface SearchResult {
    id: string;
    label: string;
    kind?: string;
    match: SearchMatch;
}
/** Unicode case-insensitive search in authored order: exact ID, label prefix,
 * label substring, kind prefix, kind substring. The original text is kept. */
declare function searchNodes(graph: GraphSnapshot, query: string, limit?: number): SearchResult[];
interface NodeRelations {
    incoming: Array<{
        edgeId: string;
        from: string;
    }>;
    outgoing: Array<{
        edgeId: string;
        to: string;
    }>;
}
/** Authored edge order; parallel relations keep their distinct IDs. */
declare function relationsOf(graph: GraphSnapshot, nodeId: string): Result<NodeRelations>;

export { type Comparison, type EntityDelta, type FieldChange, type GraphFilter, type GraphNodeInfo, type GraphSnapshot, type NodeRelations, type ReachResult, type RouteResult, type SearchMatch, type SearchResult, compareDocuments, findReach, findRoute, graphSnapshot, relationsOf, searchNodes };
