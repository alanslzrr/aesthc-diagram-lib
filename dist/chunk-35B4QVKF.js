import {
  identifyEdges
} from "./chunk-QVERY2JP.js";
import {
  canonical,
  edgeCollection,
  edgesOf,
  failure,
  inspectData,
  limitsWith,
  nodesOf,
  success,
  validateDocument,
  validateEditorSpec
} from "./chunk-4NII3VRT.js";
import {
  validateLocalizedDiagram
} from "./chunk-UHROM3FO.js";

// src/editor-core/document.ts
function defaultPresentation() {
  return {
    theme: {
      mode: "light",
      light: {
        background: "#e9eef4",
        foreground: "#202b38",
        card: "#f9fbfd",
        border: "#aebdcd",
        mutedForeground: "#536273",
        cobalt: "#087cbd",
        branch: "#a66b21"
      },
      dark: {
        background: "#070707",
        foreground: "#f2f2ee",
        card: "#101010",
        border: "#242424",
        mutedForeground: "#a8a8a1",
        cobalt: "#14a8ff",
        branch: "#d6a55e"
      }
    },
    grid: { visible: true, snap: true, size: 16 },
    padding: 32,
    legend: "visible",
    edgeStyle: "orthogonal",
    textScale: 1
  };
}
function createDocument(input, options) {
  const checked = validateEditorSpec(input, options.limits);
  if (!checked.ok) return checked;
  const spec = structuredClone(checked.value);
  if (spec.type !== "timeline")
    Object.assign(spec, { [edgeCollection(spec)]: identifyEdges(edgesOf(spec)) });
  const document = {
    format: "aesthc-diagram",
    schemaVersion: 1,
    id: options.id,
    revision: 0,
    locale: options.locale,
    spec,
    scene: {
      mode: "auto",
      nodes: {},
      routes: {},
      groups: [],
      zOrder: nodesOf(spec).map((n) => n.id)
    },
    presentation: defaultPresentation(),
    metadata: { nodes: {}, edges: {}, visuals: {} },
    views: [],
    story: [],
    extensions: {}
  };
  return validateDocument(document, options.limits);
}
function importDocument(input, options) {
  const limits = limitsWith(options.limits);
  if (typeof input === "string") {
    if (new TextEncoder().encode(input).length > limits.maxBytes) return failure("limit.bytes");
    try {
      input = JSON.parse(input);
    } catch {
      return failure("data.json");
    }
  }
  const unsafe = inspectData(input, limits);
  if (unsafe.length) return { ok: false, diagnostics: unsafe };
  if (!input || typeof input !== "object" || Array.isArray(input)) return failure("data.type");
  const record = input;
  if ("format" in record || "schemaVersion" in record) {
    const result = validateDocument(record, limits);
    return result.ok ? success({
      document: structuredClone(result.value),
      source: "document-v1",
      materializedEdgeIds: []
    }) : result;
  }
  let source = "spec";
  let omittedLocale;
  if ("en" in record || "es" in record) {
    if (Object.keys(record).some((key) => key !== "en" && key !== "es"))
      return failure("schema.additionalProperties");
    const localized = validateLocalizedDiagram(record);
    if (!localized.success)
      return failure("locale.invalid", "/", localized.issues.map((i) => i.message).join("; "));
    input = localized.data[options.locale];
    source = "localized";
    omittedLocale = options.locale === "en" ? "es" : "en";
  } else if (!("type" in record)) {
    if (!options.allowLegacyBand) return failure("legacy.disabled");
    input = { ...record, type: "band" };
    source = "legacy-band";
  }
  const created = createDocument(input, options);
  if (!created.ok) return created;
  const originalEdges = edgesOf(input);
  const materializedEdgeIds = edgesOf(created.value.spec).flatMap(
    (edge, index) => originalEdges[index].id === void 0 ? [{ index, id: edge.id }] : []
  );
  return success({
    document: created.value,
    source,
    materializedEdgeIds,
    ...omittedLocale ? { omittedLocale } : {}
  });
}
function serializeDocument(document) {
  const result = validateDocument(document);
  if (!result.ok) throw new TypeError(result.diagnostics.map((d) => d.code).join(", "));
  return canonical(result.value);
}
function canonicalizeContent(document) {
  return canonical({ ...document, revision: 0 });
}

export {
  defaultPresentation,
  createDocument,
  importDocument,
  serializeDocument,
  canonicalizeContent
};
