import { g as DiagramDocument, t as EditorSpec, I as ImportOptions, R as Result, u as Presentation, i as DiagramSpec, v as ImportReceipt, w as Limits, S as StoreOptions, E as EditorStore, x as EditorDiagramType, y as TypeAdapter, z as Rect, A as Size, V as Viewport, C as Point, G as DiagramScene, J as ResolveContext, h as ResolvedScene, n as EntityRef, K as DiagramFragment, M as Transaction, O as EditorPermissions, Q as CommitResult } from '../layout-dln3eGv4.js';
export { U as Capability, W as ChangeSet, m as Diagnostic, X as DiagramGroup, Y as DiagramLink, Z as DocumentMetadata, _ as EditorCommand, a as EditorSnapshot, $ as EditorTool, a0 as EndpointAnchor, a1 as EntityMetadata, a2 as FocusSet, a3 as GraphDiagramSpec, a4 as GraphEdge, a5 as GraphNode, a6 as GraphPort, a7 as JsonValue, L as Locale, N as NamedView, a8 as NodeInput, a9 as NodePlacement, aa as Palette, ab as RelationInput, ac as ReorderCollection, ad as RoutePlacement, ae as SourceEvidence, s as StoryStep, af as StructuralEdit } from '../layout-dln3eGv4.js';
import '../theme.js';

declare function defaultPresentation(): Presentation;
declare function createDocument(input: EditorSpec, options: Pick<ImportOptions, 'id' | 'locale'> & Pick<ImportOptions, 'limits'>): Result<DiagramDocument>;
declare function importDocument(input: unknown, options: ImportOptions): Result<ImportReceipt>;
declare function serializeDocument(document: DiagramDocument): string;
/** Revision is a concurrency token, not authored content or the dirty-state baseline. */
declare function canonicalizeContent(document: DiagramDocument): string;
interface LegacySpecExport {
    spec: DiagramSpec;
    losses: Array<{
        path: string;
        reason: string;
    }>;
}
/**
 * The legacy DiagramSpec export keeps explicit edge identities but cannot carry
 * scene geometry, presentation, metadata, views, story or extensions. The receipt
 * lists exactly the non-default content a legacy consumer would lose; the input
 * document is never mutated. Graph documents have no legacy spec shape; use the
 * reverse `convertToGraph` when bridging in the other direction.
 */
declare function exportLegacySpec(document: DiagramDocument): Result<LegacySpecExport>;

declare const DEFAULT_LIMITS: Readonly<Limits>;

declare function validateEditorSpec(input: unknown, options?: Partial<Limits>): Result<EditorSpec>;
declare function validateDocument(input: unknown, options?: Partial<Limits>): Result<DiagramDocument>;

declare function createEditorStore(options: StoreOptions): EditorStore;

declare function getAdapter(type: EditorDiagramType): TypeAdapter;

declare function screenToWorld(point: Point, viewport: Viewport): Point;
declare function worldToScreen(point: Point, viewport: Viewport): Point;
declare function zoomAt(point: Point, nextZoom: number, viewport: Viewport): Viewport;
declare function fitViewport(bounds: Rect, size: Size, padding: number): Viewport;

declare function resolveDocument(document: DiagramDocument, context: ResolveContext): Result<ResolvedScene>;
/**
 * Recomputes authored placements from the seed layout. Unlocked free-layout nodes
 * move to their seeded geometry; locked nodes and their groups keep their current
 * position. Structured types keep their seed geometry (scene placements are not
 * authoritative for them) and are returned unchanged. Routes, groups and zOrder
 * are preserved. The input document is never mutated.
 */
declare function relayoutScene(document: DiagramDocument): Result<DiagramScene>;

declare function createFragment(document: DiagramDocument, selection: EntityRef[]): Result<DiagramFragment>;
interface PasteOptions {
    idFactory: (kind: 'node' | 'edge' | 'group') => string;
    offset: Point;
    /** Explicit structured assignment for band/swimlane pastes. */
    structured?: {
        band?: (sourceIndex: number) => number;
        lane?: (sourceLaneId: string, sourceLabel: string) => string | undefined;
    };
}
declare function pasteFragment(document: DiagramDocument, input: unknown, options: PasteOptions): Result<DiagramDocument>;

interface ConversionReceipt {
    document: DiagramDocument;
    sourceDocumentId: string;
    losses: Array<{
        path: string;
        reason: string;
    }>;
}
declare function convertToGraph(document: DiagramDocument, options: {
    id: string;
}): Result<ConversionReceipt>;

/** Stateless transaction adapter: no subscriptions, persistence or shared history escape this call. */
declare function applyTransaction(document: DiagramDocument, transaction: Transaction, permissions: EditorPermissions): CommitResult;

interface RouteObstacle {
    x: number;
    y: number;
    w: number;
    h: number;
}
interface OrthogonalRouteRequest {
    from: {
        x: number;
        y: number;
    };
    to: {
        x: number;
        y: number;
    };
    obstacles: RouteObstacle[];
    /** Expansion around every obstacle; default 12. */
    clearance?: number;
    /** Hard bend budget; default 24. */
    maxBends?: number;
    /** Bounded state budget; default 20000. */
    maxStates?: number;
    /** Perpendicular stub leaving the anchor; default 16. */
    stub?: number;
    /** Anchor direction used to emit the initial stub. */
    fromSide?: 'left' | 'right' | 'top' | 'bottom';
    toSide?: 'left' | 'right' | 'top' | 'bottom';
}
interface RoutedPath {
    points: Array<[number, number]>;
    bends: number;
    states: number;
    clearance: number;
}
/**
 * Bounded deterministic orthogonal A* router over an expanded corridor graph.
 * Obstacles are grown by `clearance`; candidate corners are the expanded
 * obstacle edges plus the stubbed anchors. Tie-breaking is stable (lower cost,
 * lower heuristic, then coordinate order), so the same request always yields
 * the same path. An exhausted budget reports `router.budget` and an enclosed
 * target `router.impossible`; the receipt never claims a crossing route.
 */
declare function routeOrthogonal(request: OrthogonalRouteRequest): Result<RoutedPath>;

interface LayoutProviderResult {
    requestId: string;
    baseRevision: number;
    scene: DiagramScene;
}
interface LayoutProvider {
    /** Stable request identity: a late result with an older requestId is ignored. */
    requestId: string;
    baseRevision: number;
    run(): Promise<LayoutProviderResult>;
    cancel(): void;
}
/**
 * Applies an asynchronous layout result under a strict contract: the requestId
 * must be the latest issued, the baseRevision must match the current document,
 * unknown node ids are rejected and locked nodes (directly or through their
 * group) can never move. A rejection never mutates the document or the history.
 */
declare function applyLayoutResult(document: DiagramDocument, result: LayoutProviderResult, options: {
    expectedRevision: number;
}): Result<DiagramDocument>;
/** Runs a provider under the latest-wins policy: an older requestId or an
 * aborted provider never publishes its result. The document keeps its last
 * valid scene on rejection or cancellation. */
declare function runLayoutProvider(document: DiagramDocument, provider: LayoutProvider, options: {
    expectedRevision: number;
    latestRequestId: () => string;
    onResult: (document: DiagramDocument) => void;
    onError: (diagnostic: string) => void;
}): Promise<void>;
declare function createLayoutProvider(requestId: string, baseRevision: number, work: (signal: {
    aborted: boolean;
}) => Promise<DiagramScene>): LayoutProvider;

export { CommitResult, type ConversionReceipt, DEFAULT_LIMITS, DiagramDocument, DiagramFragment, DiagramScene, EditorDiagramType, EditorPermissions, EditorSpec, EditorStore, EntityRef, ImportOptions, ImportReceipt, type LayoutProvider, type LayoutProviderResult, Limits, type OrthogonalRouteRequest, Point, Presentation, Rect, ResolveContext, ResolvedScene, Result, type RouteObstacle, type RoutedPath, Size, StoreOptions, Transaction, TypeAdapter, Viewport, applyLayoutResult, applyTransaction, canonicalizeContent, convertToGraph, createDocument, createEditorStore, createFragment, createLayoutProvider, defaultPresentation, exportLegacySpec, fitViewport, getAdapter, importDocument, pasteFragment, relayoutScene, resolveDocument, routeOrthogonal, runLayoutProvider, screenToWorld, serializeDocument, validateDocument, validateEditorSpec, worldToScreen, zoomAt };
