import { c as DiagramDocument, R as Result, E as EditorStore } from '../layout-C01UhqPQ.js';
import '../theme.js';

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

export { type AutosaveState, type SaveResult, type StorageAdapter, type StoredDocument, type StoredEntry, createAutosave, createLocalStorageAdapter, createMemoryStorage };
