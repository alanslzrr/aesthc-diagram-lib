import { j as Diagnostic, R as ResolveRendererRegistry, g as DiagramDocument, k as Result } from './layout-D_aGN70Q.js';

interface PortableFontOptions {
    fonts?: {
        sans: Uint8Array;
        mono: Uint8Array;
    };
    fontPolicy?: 'required' | 'fallback';
    signal?: AbortSignal;
}
interface TypographyReceipt {
    measurement: 'embedded' | 'fallback';
    embedded: boolean;
}

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
    /** Trusted renderers; frozen into the card SVG instead of a placeholder. */
    registry?: ResolveRendererRegistry;
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
        diagnostics: Diagnostic[];
        typography?: TypographyReceipt;
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
declare function exportCardSvg(input: DiagramDocument, options?: CardSvgOptions & PortableFontOptions): Promise<Result<{
    svg: string;
    canonical: boolean;
    typography: TypographyReceipt;
    diagnostics: Diagnostic[];
}>>;
/** Raster card at the fixed 1200x630 size. Rasterization failures keep their
 * precise code; no fallback renames one format as another. */
declare function exportCard(input: DiagramDocument, options?: CardSvgOptions & PortableFontOptions): Promise<Result<CardArtifact>>;

export { type CardQueryReceipt as C, type PortableFontOptions as P, type TypographyReceipt as T, type ValidatedQuery as V, CARD_HEIGHT as a, CARD_WIDTH as b, type CardArtifact as c, type CardSvgOptions as d, cardSvg as e, exportCard as f, exportCardSvg as g, validateCardQuery as v };
