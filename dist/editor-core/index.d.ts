import { g as DiagramDocument, u as EditorSpec, I as ImportOptions, j as Result, v as Presentation, h as DiagramSpec, w as ImportReceipt, x as Limits, S as StoreOptions, E as EditorStore, y as EditorDiagramType, z as TypeAdapter, A as Rect, C as Size, V as Viewport, G as Point, J as DiagramScene, K as ResolveContext, R as ResolvedScene, n as EntityRef, M as DiagramFragment, O as Transaction, Q as EditorPermissions, U as CommitResult, i as Diagnostic } from '../layout-BhvxbOAw.js';
export { W as Capability, X as ChangeSet, Y as DiagramGroup, Z as DiagramLink, _ as DocumentMetadata, $ as EditorCommand, a as EditorSnapshot, a0 as EditorTool, a1 as EndpointAnchor, a2 as EntityMetadata, a3 as FocusSet, a4 as GraphDiagramSpec, a5 as GraphEdge, a6 as GraphNode, a7 as GraphPort, a8 as JsonValue, L as Locale, N as NamedView, a9 as NodeInput, aa as NodePlacement, ab as Palette, ac as RelationInput, ad as ReorderCollection, ae as ResolveCustomRenderer, o as ResolveRendererRegistry, af as RoutePlacement, ag as SourceEvidence, t as StoryStep, ah as StructuralEdit } from '../layout-BhvxbOAw.js';
export { D as DeploymentProfileReport, a as DeploymentRule, v as validateDeploymentProfile } from '../profiles-BU8Kb50T.js';
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

/** Custom node payload: JSON data plus a typeKey. Code never travels in the
 * payload; the trusted per-instance registry holds the behavior. */
interface CustomNodePayload {
    typeKey: string;
    data: unknown;
}
interface CustomRenderContext {
    theme: 'light' | 'dark';
    palette: {
        background: string;
        foreground: string;
        card: string;
        border: string;
        muted: string;
    };
    x: number;
    y: number;
}
interface CustomNodeRenderer<T = unknown> {
    typeKey: string;
    validate(data: unknown): Result<T>;
    /** Deterministic box for layout and export. */
    measure(data: T, role: {
        fontSize: number;
    }): {
        width: number;
        height: number;
    };
    /** Canonical SVG fragment for the node, escaped by the renderer. */
    renderSvg(data: T, context: CustomRenderContext): string;
}
interface RendererRegistry {
    register<T>(renderer: CustomNodeRenderer<T>): Result<void>;
    resolve(typeKey: string): CustomNodeRenderer | undefined;
    typeKeys(): string[];
}
/** Local, trusted and per-instance: nothing is loaded from a payload, a URL or
 * a global singleton. Unknown typeKeys resolve to `undefined` and consumers
 * report `renderer.unsupported`. */
declare function createRendererRegistry(): RendererRegistry;
declare function validateCustomPayload(registry: RendererRegistry, payload: unknown): Result<{
    renderer: CustomNodeRenderer;
    data: unknown;
}>;
/** Measures with the registered renderer and renders the canonical SVG
 * fragment. An unsupported typeKey is reported before any rendering. */
declare function renderCustomNode(registry: RendererRegistry, payload: unknown, context: CustomRenderContext & {
    fontSize: number;
}): Result<{
    svg: string;
    width: number;
    height: number;
    typeKey: string;
}>;

/** Explicitly registered async layout provider. Registration is per instance;
 * a provider is never discovered from the document or the network. */
interface RegisteredLayoutProvider {
    id: string;
    run(input: {
        document: DiagramDocument;
        requestId: string;
        signal: AbortSignal;
    }): Promise<DiagramScene>;
}
interface LayoutProviderRegistry {
    register(provider: RegisteredLayoutProvider): Result<void>;
    get(id: string): RegisteredLayoutProvider | undefined;
    ids(): string[];
}
declare function createLayoutProviderRegistry(): LayoutProviderRegistry;
interface RegisteredLayoutOptions {
    expectedRevision: number;
    /** Latest issued request id; an older request never publishes. */
    latestRequestId: () => string;
    /** Current document revision; a change while the provider was pending
     * rejects the result even if the request id still matches. */
    latestRevision?: () => number;
    requestId?: string;
    signal?: AbortSignal;
}
interface RegisteredLayoutOutcome {
    status: 'applied' | 'rejected';
    document: DiagramDocument;
    diagnostics: string[];
}
/**
 * Runs a registered provider under the strict apply contract: the requestId
 * must be the latest, the baseRevision must match, foreign node ids are
 * rejected and locked nodes can never move. Rejections are isolated: the input
 * document is returned untouched (last-good) so the caller can retry with
 * another provider or the same one.
 */
declare function runRegisteredLayout(document: DiagramDocument, registry: LayoutProviderRegistry, providerId: string, options: RegisteredLayoutOptions): Promise<Result<RegisteredLayoutOutcome>>;

interface DeclaredEvidence {
    id: string;
    repository: string;
    commit: string;
    path: string;
    startLine: number;
    endLine: number;
    blobSha?: string;
}
type EvidenceStatus = 'declared' | 'verified' | 'mismatch' | 'unavailable';
interface EvidenceReceipt {
    id: string;
    status: EvidenceStatus;
    declared: DeclaredEvidence;
    detail?: string;
}
/** Trusted, host-provided verifier. It is the only component allowed to reach
 * the network or the filesystem; the document can never enable it. */
interface TrustedVerifier {
    verify(reference: {
        repository: string;
        commit: string;
        path: string;
        blobSha?: string;
    }): Promise<'match' | 'mismatch' | 'unavailable'>;
}
/** Declared evidence from a validated document. Every entry starts as
 * `declared`: an imported JSON can never declare itself verified. */
declare function declaredEvidence(document: DiagramDocument): Result<DeclaredEvidence[]>;
/** Verifies declared evidence through the trusted verifier. `verified` is
 * granted only on a complete match; a mismatch, an exception or an
 * unavailable verifier never becomes a false positive. */
declare function verifyEvidence(document: DiagramDocument, verifier: TrustedVerifier): Promise<Result<EvidenceReceipt[]>>;
/** Diagnostics for declared evidence without running a verifier. */
declare function evidenceDiagnostics(document: DiagramDocument): Result<Diagnostic[]>;

export { CommitResult, type ConversionReceipt, type CustomNodePayload, type CustomNodeRenderer, type CustomRenderContext, DEFAULT_LIMITS, type DeclaredEvidence, Diagnostic, DiagramDocument, DiagramFragment, DiagramScene, EditorDiagramType, EditorPermissions, EditorSpec, EditorStore, EntityRef, type EvidenceReceipt, type EvidenceStatus, ImportOptions, ImportReceipt, type LayoutProvider, type LayoutProviderRegistry, type LayoutProviderResult, Limits, type OrthogonalRouteRequest, Point, Presentation, Rect, type RegisteredLayoutOptions, type RegisteredLayoutOutcome, type RegisteredLayoutProvider, type RendererRegistry, ResolveContext, ResolvedScene, Result, type RouteObstacle, type RoutedPath, Size, StoreOptions, Transaction, type TrustedVerifier, TypeAdapter, Viewport, applyLayoutResult, applyTransaction, canonicalizeContent, convertToGraph, createDocument, createEditorStore, createFragment, createLayoutProvider, createLayoutProviderRegistry, createRendererRegistry, declaredEvidence, defaultPresentation, evidenceDiagnostics, exportLegacySpec, fitViewport, getAdapter, importDocument, pasteFragment, relayoutScene, renderCustomNode, resolveDocument, routeOrthogonal, runLayoutProvider, runRegisteredLayout, screenToWorld, serializeDocument, validateCustomPayload, validateDocument, validateEditorSpec, verifyEvidence, worldToScreen, zoomAt };
