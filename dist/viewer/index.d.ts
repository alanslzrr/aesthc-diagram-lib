import * as react from 'react';
import { c as DiagramDocument, L as Locale, b as EntityRef, j as ResolvedScene } from '../layout-DyDatn-R.js';
import { GraphSnapshot, RouteResult, ReachResult, GraphFilter } from '../graph/index.js';
export { GraphNodeInfo, NodeRelations, SearchMatch, SearchResult, findReach, findRoute, graphSnapshot, relationsOf, searchNodes } from '../graph/index.js';
import '../theme.js';

interface DiagramViewerProps {
    document: DiagramDocument;
    locale?: Locale;
    className?: string;
}
/** Read-only semantic viewer: finder, inspector, exact route/reach highlight
 * and receipt-bound export. Never mutates the document or the store. */
declare function DiagramViewer({ document, locale, className }: DiagramViewerProps): react.JSX.Element;

interface FinderProps {
    graph: GraphSnapshot;
    /** Accessible name of the search input, e.g. "Origin node". */
    label: string;
    onSelect: (nodeId: string) => void;
    placeholder?: string;
    disabled?: boolean;
}
/**
 * Semantic finder: ID, label and kind search with deterministic ordering
 * (exact ID, label prefix, label substring, kind prefix, kind substring, then
 * authored order). Unicode case-insensitive, original text preserved.
 */
declare function Finder({ graph, label, onSelect, placeholder, disabled }: FinderProps): react.JSX.Element;

interface InspectorProps {
    document: DiagramDocument;
    graph: GraphSnapshot;
    entity: EntityRef | null;
    onSelect: (entity: EntityRef) => void;
    t: (en: string, es: string) => string;
}
/** Read-only semantic inspector: description, properties, safe links and the
 * exact incoming/outgoing relations, each identified by its own edge ID. */
declare function Inspector({ document, graph, entity, onSelect, t }: InspectorProps): react.JSX.Element;

interface ViewerQueryState {
    kind: 'route' | 'reach';
    origin: string;
    destination?: string;
    direction?: 'upstream' | 'downstream';
    result: RouteResult | ReachResult;
}
declare function queryReceipt(query: ViewerQueryState): {
    filter?: GraphFilter | undefined;
    documentId: string;
    revision: number;
};
/** A receipt is bound to the document identity; any change invalidates it. */
declare function isQueryStale(query: ViewerQueryState | null, document: DiagramDocument): boolean;
declare function queryHighlight(query: ViewerQueryState | null): {
    nodes: Set<string>;
    edges: Set<string>;
} | undefined;
declare function queryEdgeIds(query: ViewerQueryState | null): string[];
/** Fixed 2048x2048-independent style for the exported SVG: exact IDs only. */
declare function highlightStyle(accent: string): string;
interface ExportQuerySvgOptions {
    theme: 'light' | 'dark';
    includeSource?: boolean;
}
declare function exportQuerySvg(document: DiagramDocument, scene: ResolvedScene, query: ViewerQueryState, options: ExportQuerySvgOptions): string;
declare function querySummary(query: ViewerQueryState | null, graph: GraphSnapshot, t: (en: string, es: string) => string): string | null;

export { DiagramViewer, type DiagramViewerProps, type ExportQuerySvgOptions, Finder, type FinderProps, GraphFilter, GraphSnapshot, Inspector, type InspectorProps, ReachResult, RouteResult, type ViewerQueryState, exportQuerySvg, highlightStyle, isQueryStale, queryEdgeIds, queryHighlight, queryReceipt, querySummary };
