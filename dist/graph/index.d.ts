import { i as DiagramEdge, j as Result, g as DiagramDocument } from '../layout-DmZ-4ly5.js';
import '../theme.js';

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

export { type GraphFilter, type GraphNodeInfo, type GraphSnapshot, type NodeRelations, type ReachResult, type RouteResult, type SearchMatch, type SearchResult, findReach, findRoute, graphSnapshot, relationsOf, searchNodes };
