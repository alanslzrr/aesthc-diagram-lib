import {
  canonicalizeContent,
  importDocument,
  serializeDocument
} from "../chunk-35B4QVKF.js";
import "../chunk-QVERY2JP.js";
import {
  failure,
  success,
  validateDocument
} from "../chunk-4NII3VRT.js";
import "../chunk-UHROM3FO.js";
import "../chunk-TVEV5XLW.js";

// src/persistence/index.ts
function createMemoryStorage() {
  const values = /* @__PURE__ */ new Map(), listeners = /* @__PURE__ */ new Map();
  let ordinal = 0;
  const emit = (key, token) => listeners.get(key)?.forEach((l) => l(token));
  return {
    async load(key, signal) {
      return signal?.aborted ? failure("operation.aborted") : success(structuredClone(values.get(key) ?? null));
    },
    async save(key, document, expectedToken, signal) {
      if (signal?.aborted || !validateDocument(document).ok)
        return { status: "unavailable", reason: "unknown" };
      const current = values.get(key);
      if ((current?.token ?? null) !== expectedToken)
        return current ? { status: "conflict", current: structuredClone(current) } : { status: "unavailable", reason: "unknown" };
      const token = String(++ordinal);
      values.set(key, { token, document: structuredClone(document) });
      emit(key, token);
      return { status: "saved", token };
    },
    async remove(key, expectedToken, signal) {
      if (signal?.aborted) return failure("operation.aborted");
      if (values.get(key)?.token !== expectedToken) return failure("storage.conflict");
      values.delete(key);
      emit(key, null);
      return success(void 0);
    },
    subscribe(key, listener) {
      const set = listeners.get(key) ?? /* @__PURE__ */ new Set();
      set.add(listener);
      listeners.set(key, set);
      return () => {
        set.delete(listener);
        if (!set.size) listeners.delete(key);
      };
    }
  };
}
function createLocalStorageAdapter(namespace) {
  if (!/^[a-zA-Z0-9._-]{1,80}$/.test(namespace)) throw new TypeError("Invalid storage namespace");
  const keyFor = (key) => `adl-document-v1:${namespace}:${encodeURIComponent(key)}`;
  const available = () => typeof window !== "undefined" && typeof navigator !== "undefined" && !!navigator.locks;
  async function read(key) {
    try {
      const text = window.localStorage.getItem(keyFor(key));
      if (text === null) return success(null);
      if (new TextEncoder().encode(text).length > 1048576 + 4096) return failure("storage.corrupt");
      const envelope = JSON.parse(text);
      if (envelope?.schemaVersion !== 1 || typeof envelope.token !== "string" || !envelope.token)
        return failure("storage.corrupt");
      const parsed = importDocument(envelope.document, { id: "storage", locale: "en" });
      if (!parsed.ok) return failure("storage.corrupt");
      return success({ document: parsed.value.document, token: envelope.token });
    } catch {
      return failure("storage.denied");
    }
  }
  return {
    async load(key, signal) {
      if (signal?.aborted) return failure("operation.aborted");
      if (typeof window === "undefined") return failure("storage.unavailable");
      return read(key);
    },
    async save(key, document, expectedToken, signal) {
      if (!available()) return { status: "unavailable", reason: "denied" };
      if (!validateDocument(document).ok) return { status: "unavailable", reason: "unknown" };
      try {
        return await navigator.locks.request(keyFor(key), signal ? { signal } : {}, async () => {
          const current = await read(key);
          if (!current.ok) return { status: "unavailable", reason: "unknown" };
          if ((current.value?.token ?? null) !== expectedToken)
            return current.value ? { status: "conflict", current: current.value } : { status: "unavailable", reason: "unknown" };
          if (signal?.aborted) return { status: "unavailable", reason: "unknown" };
          const token = crypto.randomUUID();
          window.localStorage.setItem(
            keyFor(key),
            JSON.stringify({
              schemaVersion: 1,
              token,
              document: JSON.parse(serializeDocument(document))
            })
          );
          return { status: "saved", token };
        });
      } catch (error) {
        return {
          status: "unavailable",
          reason: error instanceof DOMException && error.name === "QuotaExceededError" ? "quota" : "denied"
        };
      }
    },
    async remove(key, expectedToken, signal) {
      if (!available()) return failure("storage.unavailable");
      try {
        return await navigator.locks.request(keyFor(key), signal ? { signal } : {}, async () => {
          const current = await read(key);
          if (!current.ok) return current;
          if (current.value?.token !== expectedToken) return failure("storage.conflict");
          window.localStorage.removeItem(keyFor(key));
          return success(void 0);
        });
      } catch {
        return failure("storage.denied");
      }
    },
    subscribe(key, listener) {
      if (typeof window === "undefined") return () => {
      };
      const handler = (event) => {
        if (event.storageArea === window.localStorage && event.key === keyFor(key)) {
          void read(key).then((r) => {
            if (r.ok) listener(r.value?.token ?? null);
          });
        }
      };
      window.addEventListener("storage", handler);
      return () => window.removeEventListener("storage", handler);
    }
  };
}
function createAutosave(store, adapter, options) {
  let token = options.token, timer, disposed = false, saving = false, blocked = false, pending;
  const controller = new AbortController();
  const publish = (state) => {
    if (!disposed) options.onState?.(state);
  };
  async function flush() {
    if (disposed || blocked || saving || !pending) return;
    const document = pending;
    pending = void 0;
    saving = true;
    publish({ status: "saving" });
    try {
      const result = await adapter.save(options.key, document, token, controller.signal);
      if (disposed) return;
      if (result.status === "saved") {
        token = result.token;
        store.markSaved(document);
        publish({ status: "saved", token });
      } else {
        blocked = true;
        publish(result);
      }
    } catch {
      blocked = true;
      publish({ status: "unavailable", reason: "unknown" });
    } finally {
      saving = false;
      if (!disposed && !blocked && pending) void flush();
    }
  }
  const unsubscribe = store.onCommit((result) => {
    if (disposed || blocked) return;
    pending = structuredClone(result.document);
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = void 0;
      void flush();
    }, options.delay ?? 750);
  });
  return {
    async flush() {
      if (timer) clearTimeout(timer);
      timer = void 0;
      await flush();
    },
    retry(nextToken = token) {
      token = nextToken;
      blocked = false;
      pending = structuredClone(store.getSnapshot().document);
      void flush();
    },
    isCurrent(document) {
      return canonicalizeContent(document) === canonicalizeContent(store.getSnapshot().document);
    },
    dispose() {
      disposed = true;
      controller.abort();
      if (timer) clearTimeout(timer);
      unsubscribe();
      pending = void 0;
    }
  };
}
export {
  createAutosave,
  createLocalStorageAdapter,
  createMemoryStorage
};
