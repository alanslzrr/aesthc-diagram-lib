import {
  createEditorStore,
  createFragment,
  fitViewport,
  pasteFragment,
  screenToWorld,
  worldToScreen,
  zoomAt
} from "../chunk-JI4SK5S3.js";
import {
  getAdapter,
  resolveDocument
} from "../chunk-VL4OB4VM.js";
import "../chunk-VUW7SRON.js";
import "../chunk-P7FW66WE.js";
import {
  canonicalizeContent,
  createDocument,
  defaultPresentation,
  importDocument,
  serializeDocument
} from "../chunk-35B4QVKF.js";
import "../chunk-QVERY2JP.js";
import {
  DEFAULT_LIMITS,
  edgesOf,
  failure,
  nodesOf,
  success,
  validateDocument,
  validateEditorSpec
} from "../chunk-4NII3VRT.js";
import "../chunk-UHROM3FO.js";
import "../chunk-YKPE23VO.js";
import "../chunk-TVEV5XLW.js";

// src/editor-core/conversion.ts
function convertToGraph(document, options) {
  const checked = validateDocument(document);
  if (!checked.ok) return checked;
  if (options.id === document.id) return failure("conversion.identity");
  const resolved = resolveDocument(document, { quality: "edit", requestId: "convert" });
  if (!resolved.ok) return resolved;
  const spec = {
    type: "graph",
    caption: document.spec.caption,
    legend: structuredClone(document.spec.legend),
    nodes: nodesOf(document.spec).map((n) => {
      const placed = resolved.value.layout.nodeById[n.id];
      return {
        id: n.id,
        label: n.label,
        description: "description" in n ? n.description ?? "" : "",
        ...n.kind ? { kind: n.kind } : {},
        ..."sublabel" in n && n.sublabel ? { sublabel: n.sublabel } : {},
        ..."fields" in n ? { fields: structuredClone(n.fields), shape: "table" } : {},
        ...placed.initial ? { initial: true } : {},
        ...placed.final ? { final: true } : {}
      };
    }),
    edges: edgesOf(document.spec).map((e) => ({
      id: e.id,
      from: e.from,
      to: e.to,
      ...e.label ? { label: e.label } : {},
      ...e.variant ? { variant: e.variant } : {},
      ...e.dashed ? { dashed: true } : {}
    }))
  };
  const created = createDocument(spec, { id: options.id, locale: document.locale });
  if (!created.ok) return created;
  const doc = created.value, losses = [];
  doc.scene.mode = "manual";
  doc.scene.nodes = Object.fromEntries(
    resolved.value.layout.nodes.map((n) => [
      n.id,
      { x: n.x, y: n.y, width: Math.max(96, n.w), height: Math.max(48, n.h), locked: false }
    ])
  );
  doc.presentation = structuredClone(document.presentation);
  doc.metadata = structuredClone(document.metadata);
  if (document.spec.type !== "graph")
    losses.push({
      path: "/spec/type",
      reason: "Type-specific ordering, membership and layout semantics become explicit graph geometry."
    });
  if (document.spec.type === "sequence")
    losses.push({
      path: "/spec/messages",
      reason: "Message order, lifelines and activations are not sequence semantics in a graph."
    });
  if (document.spec.type === "band")
    losses.push({
      path: "/spec/bands",
      reason: "Bands, decisions and continuations are not converted to graph entities."
    });
  if (document.spec.type === "swimlane")
    losses.push({
      path: "/spec/lanes",
      reason: "Lane membership is not converted to graph containment."
    });
  if (document.spec.type === "timeline")
    losses.push({
      path: "/spec/events",
      reason: "Authored time order is not inferred as directed edges."
    });
  if (document.spec.type === "graph" && document.spec.nodes.some((n) => n.ports || n.renderer))
    return failure("conversion.already-graph");
  if (document.scene.groups.length || Object.keys(document.scene.routes).length)
    losses.push({
      path: "/scene",
      reason: "Manual routing, locks and group containment are not carried into the new graph."
    });
  if (document.views.length || document.story.length)
    losses.push({
      path: "/views",
      reason: "Views and story steps are not copied into a newly identified document."
    });
  if (Object.keys(document.extensions).length)
    losses.push({
      path: "/extensions",
      reason: "Extension data is not implicitly reinterpreted for a different diagram type."
    });
  const valid = validateDocument(doc);
  return valid.ok ? success({ document: doc, sourceDocumentId: document.id, losses }) : valid;
}

// src/editor-core/transaction.ts
function applyTransaction(document, transaction, permissions) {
  const store = createEditorStore({ document, permissions });
  try {
    return store.dispatch(transaction);
  } finally {
    store.dispose();
  }
}
export {
  DEFAULT_LIMITS,
  applyTransaction,
  canonicalizeContent,
  convertToGraph,
  createDocument,
  createEditorStore,
  createFragment,
  defaultPresentation,
  fitViewport,
  getAdapter,
  importDocument,
  pasteFragment,
  resolveDocument,
  screenToWorld,
  serializeDocument,
  validateDocument,
  validateEditorSpec,
  worldToScreen,
  zoomAt
};
