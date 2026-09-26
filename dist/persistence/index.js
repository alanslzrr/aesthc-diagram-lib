import {
  canonicalizeContent,
  createDocument,
  importDocument,
  serializeDocument
} from "../chunk-3MHLUDWC.js";
import "../chunk-QVERY2JP.js";
import {
  canonical,
  failure,
  success,
  validateDocument
} from "../chunk-6NELNSRC.js";
import "../chunk-UHROM3FO.js";
import "../chunk-TVEV5XLW.js";

// src/persistence/share.ts
var SHARE_LIMITS = {
  encoded: 65536,
  expanded: 262144,
  timeoutMs: 5e3,
  version: 1
};
var base64url = (bytes) => {
  let binary = "";
  for (let start = 0; start < bytes.length; start += 8192)
    binary += String.fromCharCode(...bytes.subarray(start, start + 8192));
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
};
var fromBase64url = (text) => {
  const binary = atob(text.replaceAll("-", "+").replaceAll("_", "/"));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};
async function readBounded(stream, limits, timeoutMs, clock) {
  const reader = stream.getReader();
  const chunks = [];
  let size = 0;
  const start = clock();
  try {
    while (true) {
      if (clock() - start > timeoutMs) {
        await reader.cancel().catch(() => {
        });
        return failure("share.timeout");
      }
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limits.expanded) {
        await reader.cancel().catch(() => {
        });
        return failure("share.expansion");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    return success(bytes);
  } catch {
    await reader.cancel().catch(() => {
    });
    return failure("share.malformed");
  } finally {
    reader.releaseLock();
  }
}
async function encodeShareDocument(input, options = {}) {
  const limits = options.limits ?? SHARE_LIMITS;
  const checked = validateDocument(input);
  if (!checked.ok) return checked;
  const bytes = new TextEncoder().encode(
    JSON.stringify({ v: SHARE_LIMITS.version, d: JSON.parse(canonical(checked.value)) })
  );
  if (bytes.length > limits.expanded) return failure("share.too-large");
  let marker = "j", payload = base64url(bytes);
  if (typeof CompressionStream !== "undefined") {
    try {
      const bounded = await readBounded(
        new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw")),
        limits,
        SHARE_LIMITS.timeoutMs,
        () => performance.now()
      );
      if (bounded.ok && bounded.value.length < bytes.length) {
        marker = "z";
        payload = base64url(bounded.value);
      }
    } catch {
    }
  }
  if (payload.length + 2 > limits.encoded) return failure("share.too-long");
  return success(`d=${marker}${payload}`);
}
async function decodeShareDocument(hash, options = {}) {
  const limits = options.limits ?? SHARE_LIMITS;
  const clock = options.clock ?? (() => performance.now());
  const timeoutMs = options.timeoutMs ?? SHARE_LIMITS.timeoutMs;
  if (hash.length > limits.encoded + 4) return failure("share.malformed");
  const match = /^#?(d|s)=([zj])([A-Za-z0-9_-]+)$/.exec(hash);
  if (!match) return failure("share.malformed");
  let bytes;
  try {
    bytes = fromBase64url(match[3]);
  } catch {
    return failure("share.malformed");
  }
  if (match[2] === "z") {
    if (typeof DecompressionStream === "undefined") return failure("share.unsupported");
    const bounded = await readBounded(
      new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw")),
      limits,
      timeoutMs,
      clock
    );
    if (!bounded.ok) return bounded;
    bytes = bounded.value;
  }
  if (bytes.length > limits.expanded) return failure("share.expansion");
  let parsed;
  try {
    parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return failure("share.malformed");
  }
  if (!parsed || typeof parsed !== "object") return failure("share.malformed");
  const envelope = parsed;
  if (match[1] === "d") {
    if (envelope.v !== SHARE_LIMITS.version) return failure("share.future");
    const imported = validateDocument(envelope.d);
    if (!imported.ok) return failure("share.malformed");
    return success({ document: imported.value, source: "d", version: envelope.v });
  }
  const version = envelope.v === void 0 ? 0 : envelope.v;
  if (version !== 0 && version !== 1) return failure("share.future");
  const spec = envelope.s;
  const locale = version === 0 ? "en" : envelope.l;
  if (locale !== "en" && locale !== "es") return failure("share.malformed");
  const created = createDocument(spec, {
    id: typeof envelope.k === "string" ? envelope.k : "shared-document",
    locale
  });
  if (!created.ok) return failure("share.malformed");
  return success({ document: created.value, source: "s", version });
}

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
    async purge(key, signal) {
      if (signal?.aborted) return failure("operation.aborted");
      values.delete(key);
      emit(key, null);
      return success(void 0);
    },
    async list(signal) {
      if (signal?.aborted) return failure("operation.aborted");
      return success(
        [...values.entries()].map(([key, stored]) => ({
          key,
          token: stored.token,
          label: stored.document.spec.caption || stored.document.id
        }))
      );
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
    let text;
    try {
      text = window.localStorage.getItem(keyFor(key)) ?? "";
    } catch {
      return failure("storage.denied");
    }
    if (text === "") return success(null);
    try {
      if (new TextEncoder().encode(text).length > 1048576 + 4096) return failure("storage.corrupt");
      const envelope = JSON.parse(text);
      if (envelope?.schemaVersion !== 1 || typeof envelope.token !== "string" || !envelope.token)
        return failure("storage.corrupt");
      const parsed = importDocument(envelope.document, { id: "storage", locale: "en" });
      if (!parsed.ok) return failure("storage.corrupt");
      return success({ document: parsed.value.document, token: envelope.token });
    } catch {
      return failure("storage.corrupt");
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
    async purge(key, signal) {
      if (typeof window === "undefined") return failure("storage.unavailable");
      try {
        if (signal?.aborted) return failure("operation.aborted");
        window.localStorage.removeItem(keyFor(key));
        return success(void 0);
      } catch {
        return failure("storage.denied");
      }
    },
    async list(signal) {
      if (typeof window === "undefined") return failure("storage.unavailable");
      if (signal?.aborted) return failure("operation.aborted");
      try {
        const prefix = `adl-document-v1:${namespace}:`;
        const entries = [];
        for (let index = 0; index < window.localStorage.length; index++) {
          const key = window.localStorage.key(index);
          if (!key || !key.startsWith(prefix)) continue;
          const storedKey = decodeURIComponent(key.slice(prefix.length));
          const result = await read(storedKey);
          if (!result.ok || !result.value) continue;
          entries.push({
            key: storedKey,
            token: result.value.token,
            label: result.value.document.spec.caption || result.value.document.id
          });
        }
        return success(entries);
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
  SHARE_LIMITS,
  createAutosave,
  createLocalStorageAdapter,
  createMemoryStorage,
  decodeShareDocument,
  encodeShareDocument
};
