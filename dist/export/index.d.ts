import { D as Diagnostic, b as EntityRef, R as Result, c as DiagramDocument } from '../layout-DyDatn-R.js';
import '../theme.js';

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

export { type ExportArtifact, type ExportFormat, type ExportOptions, copyArtifact, downloadArtifact, exportDocument, getExportCapabilities };
