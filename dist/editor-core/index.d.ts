import { c as DiagramDocument, s as EditorSpec, I as ImportOptions, R as Result, t as Presentation, l as DiagramSpec, u as ImportReceipt, v as Limits, S as StoreOptions, E as EditorStore, w as EditorDiagramType, x as TypeAdapter, y as Rect, z as Size, V as Viewport, A as Point, C as DiagramScene, G as ResolveContext, k as ResolvedScene, b as EntityRef, J as DiagramFragment, K as Transaction, M as EditorPermissions, N as CommitResult } from '../layout-BFDKbm6N.js';
export { O as Capability, Q as ChangeSet, D as Diagnostic, U as DiagramGroup, W as DiagramLink, X as DocumentMetadata, Y as EditorCommand, a as EditorSnapshot, Z as EditorTool, _ as EndpointAnchor, $ as EntityMetadata, a0 as FocusSet, a1 as GraphDiagramSpec, a2 as GraphEdge, a3 as GraphNode, a4 as GraphPort, a5 as JsonValue, L as Locale, a6 as NamedView, a7 as NodeInput, a8 as NodePlacement, a9 as Palette, aa as RelationInput, ab as ReorderCollection, ac as RoutePlacement, ad as SourceEvidence, ae as StoryStep, af as StructuralEdit } from '../layout-BFDKbm6N.js';
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

export { CommitResult, type ConversionReceipt, DEFAULT_LIMITS, DiagramDocument, DiagramFragment, DiagramScene, EditorDiagramType, EditorPermissions, EditorSpec, EditorStore, EntityRef, ImportOptions, ImportReceipt, Limits, Point, Presentation, Rect, ResolveContext, ResolvedScene, Result, Size, StoreOptions, Transaction, TypeAdapter, Viewport, applyTransaction, canonicalizeContent, convertToGraph, createDocument, createEditorStore, createFragment, defaultPresentation, exportLegacySpec, fitViewport, getAdapter, importDocument, pasteFragment, relayoutScene, resolveDocument, screenToWorld, serializeDocument, validateDocument, validateEditorSpec, worldToScreen, zoomAt };
