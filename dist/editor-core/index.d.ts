import { c as DiagramDocument, s as EditorSpec, I as ImportOptions, R as Result, t as Presentation, u as ImportReceipt, v as Limits, S as StoreOptions, E as EditorStore, w as EditorDiagramType, x as TypeAdapter, y as Rect, z as Size, V as Viewport, A as Point, C as ResolveContext, k as ResolvedScene, b as EntityRef, G as DiagramFragment, J as Transaction, K as EditorPermissions, M as CommitResult } from '../layout-C6Gt2y8T.js';
export { N as Capability, O as ChangeSet, D as Diagnostic, Q as DiagramGroup, U as DiagramLink, W as DiagramScene, X as DocumentMetadata, Y as EditorCommand, a as EditorSnapshot, Z as EditorTool, _ as EndpointAnchor, $ as EntityMetadata, a0 as FocusSet, a1 as GraphDiagramSpec, a2 as GraphEdge, a3 as GraphNode, a4 as GraphPort, a5 as JsonValue, L as Locale, a6 as NamedView, a7 as NodeInput, a8 as NodePlacement, a9 as Palette, aa as RelationInput, ab as ReorderCollection, ac as RoutePlacement, ad as SourceEvidence, ae as StoryStep, af as StructuralEdit } from '../layout-C6Gt2y8T.js';
import '../theme.js';

declare function defaultPresentation(): Presentation;
declare function createDocument(input: EditorSpec, options: Pick<ImportOptions, 'id' | 'locale'> & Pick<ImportOptions, 'limits'>): Result<DiagramDocument>;
declare function importDocument(input: unknown, options: ImportOptions): Result<ImportReceipt>;
declare function serializeDocument(document: DiagramDocument): string;
/** Revision is a concurrency token, not authored content or the dirty-state baseline. */
declare function canonicalizeContent(document: DiagramDocument): string;

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

declare function createFragment(document: DiagramDocument, selection: EntityRef[]): Result<DiagramFragment>;
declare function pasteFragment(document: DiagramDocument, input: unknown, options: {
    idFactory: (kind: 'node' | 'edge' | 'group') => string;
    offset: Point;
}): Result<DiagramDocument>;

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

export { CommitResult, type ConversionReceipt, DEFAULT_LIMITS, DiagramDocument, DiagramFragment, EditorDiagramType, EditorPermissions, EditorSpec, EditorStore, EntityRef, ImportOptions, ImportReceipt, Limits, Point, Presentation, Rect, ResolveContext, ResolvedScene, Result, Size, StoreOptions, Transaction, TypeAdapter, Viewport, applyTransaction, canonicalizeContent, convertToGraph, createDocument, createEditorStore, createFragment, defaultPresentation, fitViewport, getAdapter, importDocument, pasteFragment, resolveDocument, screenToWorld, serializeDocument, validateDocument, validateEditorSpec, worldToScreen, zoomAt };
