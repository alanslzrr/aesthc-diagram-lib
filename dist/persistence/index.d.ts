import { g as DiagramDocument, j as Result, E as EditorStore } from '../layout-DmZ-4ly5.js';
import '../theme.js';

/** Bounded share envelopes: `d=` carries a versioned document, `s=` stays
 * readable for legacy spec links. Expansion and time are capped; every reader
 * is released, even on abort. */
declare const SHARE_LIMITS: {
    encoded: number;
    expanded: number;
    timeoutMs: number;
    version: number;
};
interface ShareDecodeOptions {
    clock?: () => number;
    timeoutMs?: number;
    limits?: {
        encoded: number;
        expanded: number;
    };
}
interface DecodedShare {
    document: DiagramDocument;
    source: 'd' | 's';
    version: number;
}
/** Encodes the canonical document. Returns `share.too-large`/`share.too-long`
 * instead of producing an ambiguous link; callers offer a JSON download. */
declare function encodeShareDocument(input: DiagramDocument, options?: {
    limits?: {
        encoded: number;
        expanded: number;
    };
}): Promise<Result<string>>;
/**
 * Decodes a `d=` document or an `s=` legacy spec link. Malformed input,
 * unsupported future versions, expansion bombs and timeouts are rejected
 * without inventing a document.
 */
declare function decodeShareDocument(hash: string, options?: ShareDecodeOptions): Promise<Result<DecodedShare>>;

interface StoredDocument {
    document: DiagramDocument;
    token: string;
}
interface StoredEntry {
    key: string;
    token: string;
    label: string;
}
type SaveResult = {
    status: 'saved';
    token: string;
} | {
    status: 'conflict';
    current: StoredDocument;
} | {
    status: 'unavailable';
    reason: 'quota' | 'denied' | 'offline' | 'unknown';
};
interface StorageAdapter {
    load(key: string, signal?: AbortSignal): Promise<Result<StoredDocument | null>>;
    save(key: string, document: DiagramDocument, expectedToken: string | null, signal?: AbortSignal): Promise<SaveResult>;
    remove(key: string, expectedToken: string, signal?: AbortSignal): Promise<Result<void>>;
    /** Remove stored data without validation or token checks; only for quarantined entries. */
    purge(key: string, signal?: AbortSignal): Promise<Result<void>>;
    /** Enumerate readable stored entries; unreadable payloads are skipped, never returned. */
    list(signal?: AbortSignal): Promise<Result<StoredEntry[]>>;
    subscribe?(key: string, listener: (token: string | null) => void): () => void;
}
declare function createMemoryStorage(): StorageAdapter;
/** Browser writes require Web Locks: localStorage by itself does not provide cross-tab CAS. */
declare function createLocalStorageAdapter(namespace: string): StorageAdapter;
type AutosaveState = {
    status: 'idle' | 'saving';
} | {
    status: 'saved';
    token: string;
} | {
    status: 'conflict';
    current: StoredDocument;
} | {
    status: 'unavailable';
    reason: string;
};
declare function createAutosave(store: EditorStore, adapter: StorageAdapter, options: {
    key: string;
    token: string | null;
    delay?: number;
    onState?: (state: AutosaveState) => void;
}): {
    flush(): Promise<void>;
    retry(nextToken?: string | null): void;
    isCurrent(document: DiagramDocument): boolean;
    dispose(): void;
};

export { type AutosaveState, type DecodedShare, SHARE_LIMITS, type SaveResult, type ShareDecodeOptions, type StorageAdapter, type StoredDocument, type StoredEntry, createAutosave, createLocalStorageAdapter, createMemoryStorage, decodeShareDocument, encodeShareDocument };
