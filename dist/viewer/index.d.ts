import * as react from 'react';
import { ReactNode } from 'react';
import { g as DiagramDocument, L as Locale, n as EntityRef, V as Viewport, s as StoryStep, N as NamedView, R as Result, h as ResolvedScene } from '../layout-dln3eGv4.js';
import { GraphSnapshot, RouteResult, ReachResult, GraphFilter } from '../graph/index.js';
export { GraphNodeInfo, NodeRelations, SearchMatch, SearchResult, findReach, findRoute, graphSnapshot, relationsOf, searchNodes } from '../graph/index.js';
import '../theme.js';

interface DiagramViewerProps {
    document: DiagramDocument;
    locale?: Locale;
    className?: string;
}
/** Read-only semantic viewer: finder, inspector, exact route/reach highlight,
 * receipt-bound export, lenses, minimap, finite story and presentation.
 * Never mutates the document or the store. */
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

interface MinimapProps {
    /** Rendered SVG source of the full diagram. */
    svg: string;
    layoutWidth: number;
    layoutHeight: number;
    /** Viewport center in world coordinates with its zoom. */
    camera: Viewport;
    /** Visible world rectangle at zoom 1 (the container size). */
    viewWorldSize: {
        width: number;
        height: number;
    };
    onNavigate: (center: {
        x: number;
        y: number;
    }) => void;
}
/** Overview of the full diagram with a draggable viewport rect. Clicking or
 * dragging on the minimap moves the camera; the diagram itself never changes. */
declare function Minimap({ svg, layoutWidth, layoutHeight, camera, viewWorldSize, onNavigate, }: MinimapProps): react.JSX.Element;

interface PresentationProps {
    children: ReactNode;
    trigger: (activate: () => void) => ReactNode;
    onExit: () => void;
    label: string;
}
/**
 * Presentation surface: requests Fullscreen API and falls back to a CSS
 * overlay when the browser rejects it. Escape exits and the caller restores
 * focus to the trigger. The document itself never changes.
 */
declare function Presentation({ children, trigger, onExit, label }: PresentationProps): react.JSX.Element;

type PlaybackOwner = 'story' | 'route' | 'trace' | null;
type PlaybackState = 'idle' | 'playing' | 'paused' | 'ended';
interface PlaybackEnvironment {
    clock?: () => number;
    setTimer?: (callback: () => void, ms: number) => unknown;
    clearTimer?: (handle: unknown) => void;
}
interface PlaybackCallbacks {
    onStep: (index: number) => void;
    onEnd: () => void;
    onStop: () => void;
}
/**
 * Finite story playback with a single owner. Never auto-starts. Manual
 * interaction, Escape, hidden tab, print and reduced-motion stop it; the
 * reduced-motion consumer shows static states with working Next/Previous.
 */
declare class StoryPlayback {
    private steps;
    private stepIndex;
    private timer;
    private state;
    private callbacks;
    private clock;
    private setTimer;
    private clearTimer;
    private ownsMotion;
    constructor(steps: StoryStep[], callbacks: PlaybackCallbacks, environment?: PlaybackEnvironment, owner?: Exclude<PlaybackOwner, null>);
    getOwner(): PlaybackOwner;
    getState(): PlaybackState;
    getIndex(): number;
    play(fromIndex?: number): boolean;
    pause(): void;
    next(): boolean;
    prev(): boolean;
    stop(): void;
    end(): void;
    dispose(): void;
    private scheduleNext;
}
interface MotionOwnerGuard {
    owner: PlaybackOwner;
    claim(owner: Exclude<PlaybackOwner, null>): boolean;
    release(owner: Exclude<PlaybackOwner, null>): void;
}
/** Exactly one owner can move the camera at a time (story, route or trace). */
declare function createMotionOwnerGuard(): MotionOwnerGuard;

/** Reading-only lens: filters what is dimmed, never what queries traverse. */
interface ViewerLens {
    nodeRoles?: string[];
    tags?: string[];
}
declare function lensMatches(document: DiagramDocument, nodeId: string, lens: ViewerLens): boolean;
/** All authored roles and tags in the document, in first-appearance order. */
declare function lensFacets(document: DiagramDocument): {
    roles: string[];
    tags: string[];
};
interface ResolvedView {
    view: NamedView;
    focusNodes: Set<string>;
    focusEdges: Set<string>;
}
declare function resolveView(document: DiagramDocument, viewId: string): Result<ResolvedView>;
interface StoryTransition {
    step: StoryStep;
    view: NamedView;
    /** Authored direct route between the previous and next focus, when it exists.
     * Never inferred: no direct route is reported truthfully as `directRoute: null`. */
    directRoute: {
        nodeIds: string[];
        edgeIds: string[];
    } | null;
}
/** Truthful story description: transitions never invent edges; orphan steps
 * (missing view or broken route reference) are rejected by ID. */
declare function describeStoryStep(document: DiagramDocument, graph: GraphSnapshot, step: StoryStep): Result<StoryTransition>;
interface ViewerState {
    viewId?: string;
    focus?: {
        nodeIds: string[];
        edgeIds: string[];
    };
    camera?: Viewport;
}
/** URL-safe viewer state codec. Components are percent-escaped individually so
 * IDs with `~`, `%`, `/` and Unicode survive a round-trip. */
declare function encodeViewerState(state: ViewerState): string;
/**
 * Decode against the current document. Unknown views degrade to the overview
 * (focus/camera are dropped, never guessed). A contradiction — a viewId that
 * exists together with a focus that differs from the named view, or a focus
 * whose ids do not exist — is rejected instead of restoring ambiguously.
 */
declare function decodeViewerState(text: string, document: DiagramDocument): Result<ViewerState>;

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

export { DiagramViewer, type DiagramViewerProps, type ExportQuerySvgOptions, Finder, type FinderProps, GraphFilter, GraphSnapshot, Inspector, type InspectorProps, Minimap, type MinimapProps, type MotionOwnerGuard, type PlaybackCallbacks, type PlaybackEnvironment, type PlaybackOwner, type PlaybackState, Presentation, type PresentationProps, ReachResult, type ResolvedView, RouteResult, StoryPlayback, type StoryTransition, type ViewerLens, type ViewerQueryState, type ViewerState, createMotionOwnerGuard, decodeViewerState, describeStoryStep, encodeViewerState, exportQuerySvg, highlightStyle, isQueryStale, lensFacets, lensMatches, queryEdgeIds, queryHighlight, queryReceipt, querySummary, resolveView };
