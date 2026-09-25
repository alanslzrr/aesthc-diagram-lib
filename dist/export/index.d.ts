import { g as DiagramDocument, j as Result, m as Diagnostic, n as EntityRef } from '../layout-Bw-QA7sy.js';
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
        verified: false;
        runtimeBytes: number;
        fontBytes: number;
    };
}
declare function exportDocumentHtml(input: DiagramDocument, options: ExportHtmlOptions): Result<ExportHtmlArtifact>;

declare const CARD_WIDTH = 1200;
declare const CARD_HEIGHT = 630;
/** Receipt carried by the query that produced the card. Stale or altered
 * receipts are rejected: a card never exports a highlight from another
 * revision, and canonical cards never carry highlights. */
interface CardQueryReceipt {
    documentId: string;
    revision: number;
    nodeIds: string[];
    edgeIds: string[];
    label?: string;
}
interface CardSvgOptions {
    query?: CardQueryReceipt;
    theme?: 'light' | 'dark';
    padding?: number;
}
interface CardArtifact {
    bytes: Uint8Array;
    receipt: {
        documentId: string;
        revision: number;
        format: 'png';
        mimeType: 'image/png';
        bytes: number;
        width: number;
        height: number;
        scope: 'document';
        canonical: boolean;
        sourceIncluded: false;
        verified: false;
        diagnostics: [];
    };
}
interface ValidatedQuery {
    nodes: Set<string>;
    edges: Set<string>;
    label: string;
}
declare function validateCardQuery(document: DiagramDocument, query?: CardQueryReceipt): Result<ValidatedQuery | null>;
/** Full-diagram card at a fixed 1200x630 canvas. The whole graph is fitted;
 * the query receipt only marks exact node and edge ids (parallels included). */
declare function cardSvg(input: DiagramDocument, options?: CardSvgOptions): Result<{
    svg: string;
    canonical: boolean;
}>;
/** Raster card at the fixed 1200x630 size. Rasterization failures keep their
 * precise code; no fallback renames one format as another. */
declare function exportCard(input: DiagramDocument, options?: CardSvgOptions & {
    signal?: AbortSignal;
}): Promise<Result<CardArtifact>>;

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
    fonts?: {
        sans: Uint8Array;
        mono: Uint8Array;
    };
    fontPolicy?: 'required' | 'fallback';
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

export { CARD_HEIGHT, CARD_WIDTH, type CardArtifact, type CardQueryReceipt, type CardSvgOptions, type ExportArtifact, type ExportFormat, type ExportHtmlArtifact, type ExportHtmlOptions, type ExportOptions, type ProbedExportCapabilities, type ValidatedQuery, cardSvg, copyArtifact, downloadArtifact, exportCard, exportDocument, exportDocumentHtml, getExportCapabilities, probeExportCapabilities, supportedFormats, validateCardQuery };
