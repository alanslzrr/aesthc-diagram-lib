import { R as ResolveRendererRegistry, g as DiagramDocument, k as Result, j as Diagnostic, o as EntityRef } from '../layout-D_aGN70Q.js';
import { T as TypographyReceipt, P as PortableFontOptions, C as CardQueryReceipt } from '../cards-CvxKOp96.js';
export { a as CARD_HEIGHT, b as CARD_WIDTH, c as CardArtifact, d as CardSvgOptions, V as ValidatedQuery, e as cardSvg, f as exportCard, g as exportCardSvg, v as validateCardQuery } from '../cards-CvxKOp96.js';
import '../theme.js';

interface ExportHtmlOptions {
    /** Minified standalone viewer runtime (dist/standalone/viewer.js). */
    runtime: string;
    /** Viewer stylesheet (dist/viewer.css). */
    css: string;
    fonts: {
        sans: Uint8Array;
        mono: Uint8Array;
    };
    theme?: 'light' | 'dark';
    title?: string;
    /** Embed the canonical source JSON for round-trip recovery. */
    includeSource?: boolean;
    /**
     * Portable metadata policy. `minimal` (default) removes undrawn private
     * notes, links/evidence and extensions; `all` keeps authored inspector
     * detail. Independent from `includeSource`, which always embeds the exact
     * canonical document.
     */
    metadata?: 'minimal' | 'all';
    /**
     * Trusted per-instance renderer registry. Custom nodes are frozen into
     * canonical SVG; without a renderer the artifact fails with
     * `renderer.unsupported` instead of shipping a placeholder.
     */
    registry?: ResolveRendererRegistry;
}
interface ExportHtmlArtifact {
    html: string;
    receipt: {
        documentId: string;
        revision: number;
        mimeType: 'text/html';
        bytes: number;
        canonical: boolean;
        sourceIncluded: boolean;
        metadata: 'minimal' | 'all';
        /** Number of custom nodes frozen into the runtime payload. */
        frozenCustomNodes: number;
        verified: false;
        runtimeBytes: number;
        fontBytes: number;
        typography?: TypographyReceipt;
    };
}
declare function exportDocumentHtml(input: DiagramDocument, options: ExportHtmlOptions): Result<ExportHtmlArtifact>;
/** Exact-font HTML preparation. The synchronous helper remains a legacy measurement path. */
declare function exportDocumentHtmlAsync(input: DiagramDocument, options: ExportHtmlOptions & PortableFontOptions): Promise<Result<ExportHtmlArtifact>>;

interface ProbedExportCapabilities {
    png: boolean;
    jpeg: boolean;
    webp: boolean;
    html: boolean;
    clipboardText: boolean;
    clipboardPng: boolean;
    print: boolean;
    webmMimeType: string | null;
}
/**
 * Real capability probe: WebP is verified by encoding, not by assuming the
 * browser honors the request; unsupported formats are reported so callers can
 * disable them instead of renaming a PNG or silently changing the background.
 */
declare function probeExportCapabilities(): ProbedExportCapabilities;
declare function supportedFormats(capabilities: ProbedExportCapabilities): ExportFormat[];

/** Capability gate: the recorder and a canvas stream must exist and a WebM
 * codec must be really supported. No camera or microphone is ever requested. */
declare function webmCapability(): {
    supported: boolean;
    mimeType: string | null;
};
interface MotionOptions extends PortableFontOptions {
    fps?: number;
    scale?: number;
    signal?: AbortSignal;
    /** Reduced motion never records: the static story navigation stays. */
    reducedMotion?: boolean;
    /** Effective appearance for the recorded frames; defaults to the document mode. */
    theme?: 'light' | 'dark';
    /** Trusted renderers; without one a custom story fails instead of freezing a placeholder. */
    renderers?: ResolveRendererRegistry;
}
interface MotionArtifact {
    bytes: Uint8Array;
    receipt: {
        documentId: string;
        revision: number;
        mimeType: string;
        bytes: number;
        width: number;
        height: number;
        fps: number;
        durationMs: number;
        frameCount: number;
        /** Written but never verified as decodable by the exporter itself. */
        verified: false;
        diagnostics: Diagnostic[];
        typography?: TypographyReceipt;
    };
}
/**
 * Records a finite story to WebM from a canvas stream only. The duration is
 * bounded by the validated story, every resource (tracks, object URLs, canvas)
 * is released on success, failure and abort, and an abort never reports success.
 */
declare function exportStoryWebm(input: DiagramDocument, options?: MotionOptions): Promise<Result<MotionArtifact>>;

type ExportFormat = 'json' | 'svg' | 'png' | 'jpeg' | 'webp';
interface ExportOptions {
    format: ExportFormat;
    scope: {
        type: 'document';
    } | {
        type: 'selection';
        selection: EntityRef[];
    };
    theme: 'light' | 'dark';
    quality: 'edit' | 'publish';
    background: 'theme' | 'transparent';
    scale: number;
    includeSource: boolean;
    metadata: 'minimal' | 'all';
    signal?: AbortSignal;
    /** Exact, revision-bound query highlights; only whole-document visual export. */
    query?: CardQueryReceipt;
    fonts?: {
        sans: Uint8Array;
        mono: Uint8Array;
    };
    fontPolicy?: 'required' | 'fallback';
    /** Trusted custom node renderers for documents declaring `renderer` payloads. */
    renderers?: ResolveRendererRegistry;
}
interface ExportArtifact {
    bytes: Uint8Array;
    receipt: {
        documentId: string;
        revision: number;
        format: ExportFormat;
        mimeType: string;
        bytes: number;
        width?: number;
        height?: number;
        scope: 'document' | 'selection';
        canonical: boolean;
        sourceIncluded: boolean;
        verified: boolean;
        diagnostics: Diagnostic[];
        typography?: TypographyReceipt;
    };
}
declare function exportDocument(input: DiagramDocument, options: ExportOptions): Promise<Result<ExportArtifact>>;
declare function getExportCapabilities(): {
    svg: boolean;
    png: boolean;
    jpeg: boolean;
    webp: boolean;
    html: boolean;
    clipboardText: boolean;
    clipboardPng: boolean;
    print: boolean;
    webmMimeType: null;
};
declare function downloadArtifact(artifact: ExportArtifact, filename: string): Result<void>;
declare function copyArtifact(artifact: ExportArtifact): Promise<Result<void>>;

export { CardQueryReceipt, type ExportArtifact, type ExportFormat, type ExportHtmlArtifact, type ExportHtmlOptions, type ExportOptions, type MotionArtifact, type MotionOptions, PortableFontOptions, type ProbedExportCapabilities, TypographyReceipt, copyArtifact, downloadArtifact, exportDocument, exportDocumentHtml, exportDocumentHtmlAsync, exportStoryWebm, getExportCapabilities, probeExportCapabilities, supportedFormats, webmCapability };
