import { d as DiagramEdge, R as Result, c as DiagramDocument } from '../layout-B5aXwz9Z.js';
import '../theme.js';

interface GraphFilter {
    variants?: Array<'main' | 'branch'>;
    nodeRoles?: string[];
}
interface GraphSnapshot {
    documentId: string;
    revision: number;
    nodeIds: string[];
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

export { type GraphFilter, type GraphSnapshot, type ReachResult, type RouteResult, findReach, findRoute, graphSnapshot };
