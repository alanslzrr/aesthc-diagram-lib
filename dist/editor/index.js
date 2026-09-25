"use client";
import {
  createEditorStore,
  createFragment,
  fitViewport,
  pasteFragment,
  screenToWorld,
  zoomAt
} from "../chunk-6SRL6DX7.js";
import {
  anchorFromPoint,
  anchorPoint,
  createCanvasTextMeasurer,
  createPreviewResolver,
  getAdapter,
  isNodeLocked,
  relayoutScene,
  resolveDocument
} from "../chunk-EAOYH4UI.js";
import "../chunk-VUW7SRON.js";
import "../chunk-P7FW66WE.js";
import {
  serializeDocument
} from "../chunk-3MHLUDWC.js";
import "../chunk-QVERY2JP.js";
import {
  edgesOf,
  freeTypes,
  nodesOf
} from "../chunk-6NELNSRC.js";
import "../chunk-UHROM3FO.js";
import {
  renderSceneMarkup
} from "../chunk-FE2JPGPT.js";
import "../chunk-KDAWQGDC.js";
import {
  nodeGeometry
} from "../chunk-YKPE23VO.js";
import "../chunk-TVEV5XLW.js";

// src/editor/index.tsx
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore
} from "react";

// src/geometry/arrange.ts
function arrangeRects(nodes, mode) {
  const distribution = mode === "horizontal" || mode === "vertical";
  if (nodes.length < (distribution ? 3 : 2)) return {};
  const positions = Object.fromEntries(nodes.map((n) => [n.id, { x: n.x, y: n.y }]));
  if (distribution) {
    const horizontal = mode === "horizontal", axis = horizontal ? "x" : "y", size = horizontal ? "width" : "height";
    const ordered = [...nodes].sort((a, b) => a[axis] - b[axis]);
    const first = ordered[0], last = ordered[ordered.length - 1];
    const gap = (last[axis] + last[size] - first[axis] - ordered.reduce((sum, n) => sum + n[size], 0)) / (ordered.length - 1);
    let cursor = first[axis];
    for (const n of ordered) {
      positions[n.id][axis] = cursor;
      cursor += n[size] + gap;
    }
    positions[last.id][axis] = last[axis];
  } else {
    const left = Math.min(...nodes.map((n) => n.x)), top = Math.min(...nodes.map((n) => n.y));
    const right = Math.max(...nodes.map((n) => n.x + n.width)), bottom = Math.max(...nodes.map((n) => n.y + n.height));
    for (const n of nodes) {
      if (mode === "left") positions[n.id].x = left;
      else if (mode === "right") positions[n.id].x = right - n.width;
      else if (mode === "center-x") positions[n.id].x = (left + right - n.width) / 2;
      else if (mode === "top") positions[n.id].y = top;
      else if (mode === "bottom") positions[n.id].y = bottom - n.height;
      else positions[n.id].y = (top + bottom - n.height) / 2;
    }
  }
  return positions;
}

// src/geometry/resize.ts
var RESIZE_HANDLES = [
  { direction: "nw", x: 0, y: 0, cursor: "nwse-resize", en: "top left", es: "superior izquierdo" },
  { direction: "n", x: 0.5, y: 0, cursor: "ns-resize", en: "top", es: "superior" },
  { direction: "ne", x: 1, y: 0, cursor: "nesw-resize", en: "top right", es: "superior derecho" },
  { direction: "e", x: 1, y: 0.5, cursor: "ew-resize", en: "right", es: "derecho" },
  { direction: "s", x: 0.5, y: 1, cursor: "ns-resize", en: "bottom", es: "inferior" },
  {
    direction: "sw",
    x: 0,
    y: 1,
    cursor: "nesw-resize",
    en: "bottom left",
    es: "inferior izquierdo"
  },
  { direction: "w", x: 0, y: 0.5, cursor: "ew-resize", en: "left", es: "izquierdo" },
  {
    direction: "se",
    x: 1,
    y: 1,
    cursor: "nwse-resize",
    en: "bottom right",
    es: "inferior derecho"
  }
];
function resizeRect(initial, direction, delta, gridSize) {
  const dimension = (value, minimum) => Math.max(minimum, Math.min(4096, gridSize ? Math.round(value / gridSize) * gridSize : value));
  const west = direction.includes("w"), east = direction.includes("e"), north = direction.includes("n"), south = direction.includes("s");
  const width = west || east ? dimension(initial.width + (west ? -delta.x : delta.x), 96) : initial.width;
  const height = north || south ? dimension(initial.height + (north ? -delta.y : delta.y), 48) : initial.height;
  return {
    x: west ? initial.x + initial.width - width : initial.x,
    y: north ? initial.y + initial.height - height : initial.y,
    width,
    height
  };
}
function rectsUnion(rects) {
  if (!rects.length) return { x: 0, y: 0, width: 0, height: 0 };
  const x = Math.min(...rects.map((r) => r.x)), y = Math.min(...rects.map((r) => r.y));
  const right = Math.max(...rects.map((r) => r.x + r.width)), bottom = Math.max(...rects.map((r) => r.y + r.height));
  return { x, y, width: right - x, height: bottom - y };
}
function resizeRects(rects, direction, delta, gridSize) {
  if (!rects.length) return [];
  if (rects.length === 1) return [resizeRect(rects[0], direction, delta, gridSize)];
  const group = rectsUnion(rects), resized = resizeRect(group, direction, delta, gridSize);
  const sx = group.width ? resized.width / group.width : 1, sy = group.height ? resized.height / group.height : 1;
  return rects.map((rect) => ({
    x: Math.round(resized.x + (rect.x - group.x) * sx),
    y: Math.round(resized.y + (rect.y - group.y) * sy),
    width: Math.round(rect.width * sx),
    height: Math.round(rect.height * sy)
  }));
}

// src/geometry/pinch.ts
var midpoint = (points) => ({
  x: (points[0].x + points[1].x) / 2,
  y: (points[0].y + points[1].y) / 2
});
var distance = (points) => Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
function pinchViewport(start, current, viewport) {
  const initialDistance = distance(start);
  if (initialDistance < 1) return { ...viewport };
  const world = screenToWorld(midpoint(start), viewport);
  const zoom = Math.max(0.1, Math.min(4, viewport.zoom * distance(current) / initialDistance));
  const center = midpoint(current);
  return { x: center.x - world.x * zoom, y: center.y - world.y * zoom, zoom };
}

// src/geometry/selection.ts
function marqueeBounds(start, end) {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y)
  };
}
function intersectsMarquee(a, b) {
  return a.width > 0 && a.height > 0 && b.width > 0 && b.height > 0 && a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

// src/editor/index.tsx
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
var Context = createContext(null);
var measureText = createCanvasTextMeasurer();
function EditorRoot({
  store,
  locale,
  children
}) {
  const value = useMemo(() => ({ store, locale }), [store, locale]);
  return /* @__PURE__ */ jsx(Context.Provider, { value, children });
}
function useEditor() {
  const context = useContext(Context);
  if (!context) throw new Error("Editor components require EditorRoot");
  return context;
}
function useEditorSnapshot() {
  const { store } = useEditor();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
var shallowEqual = (a, b) => {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  const keysA = Object.keys(a), keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every(
    (key) => Object.is(a[key], b[key])
  );
};
function useEditorSelector(select, equals = Object.is) {
  const { store } = useEditor();
  const selectRef = useRef(select);
  selectRef.current = select;
  const equalsRef = useRef(equals);
  equalsRef.current = equals;
  const cache = useRef(void 0);
  const [, setTick] = useState(0);
  useEffect(() => {
    const update = () => {
      const next = selectRef.current(store.getSnapshot());
      const current = cache.current?.value;
      if (current === void 0 || !equalsRef.current(next, current)) {
        cache.current = { store, select: selectRef.current, value: next };
        setTick((tick) => tick + 1);
      }
    };
    update();
    return store.subscribe(update);
  }, [store]);
  const cached = cache.current;
  if (!cached || cached.store !== store || cached.select !== select) {
    const next = select(store.getSnapshot());
    cache.current = { store, select, value: next };
    return next;
  }
  return cached.value;
}
function useLabels() {
  const { locale } = useEditor();
  return (en, es) => locale === "es" ? es : en;
}
var NodeHitRect = memo(function NodeHitRect2({
  id,
  x,
  y,
  width,
  height,
  label,
  selected,
  zoom,
  stroke,
  onSelect,
  onKey
}) {
  return /* @__PURE__ */ jsx(
    "rect",
    {
      "data-hit-node": id,
      x,
      y,
      width,
      height,
      rx: 4,
      fill: "transparent",
      stroke: selected ? stroke : "none",
      strokeWidth: 2 / zoom,
      tabIndex: 0,
      role: "button",
      "aria-label": label,
      "aria-pressed": selected,
      onFocus: () => {
        if (!selected) onSelect(id);
      },
      onKeyDown: (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onKey(id);
        }
      }
    }
  );
});
var EdgeHitRect = memo(function EdgeHitRect2({
  id,
  index,
  x,
  y,
  width,
  height,
  selected,
  zoom,
  stroke,
  label,
  onSelect
}) {
  void zoom;
  return /* @__PURE__ */ jsx(
    "rect",
    {
      "data-hit-edge": id,
      x,
      y,
      width,
      height,
      rx: 6,
      fill: "transparent",
      stroke: selected ? stroke : "transparent",
      style: { cursor: "pointer" },
      tabIndex: 0,
      role: "button",
      "aria-label": label,
      "aria-pressed": selected,
      onFocus: () => onSelect(id),
      onKeyDown: (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(id);
        }
      }
    },
    `${id}-hit-${index}`
  );
});
function dispatch(store, commands, label) {
  return store.dispatch({
    id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
    label,
    expectedRevision: store.getSnapshot().document.revision,
    commands
  });
}
function materialize(document) {
  const result = resolveDocument(document, {
    quality: "edit",
    requestId: "gesture",
    measureText,
    skipValidation: true,
    skipDiagnostics: true
  });
  if (!result.ok) return document.scene;
  return {
    ...structuredClone(document.scene),
    mode: "manual",
    nodes: Object.fromEntries(
      result.value.layout.nodes.map((n) => [
        n.id,
        {
          x: n.x,
          y: n.y,
          width: n.w,
          height: n.h,
          locked: document.scene.nodes[n.id]?.locked ?? false
        }
      ])
    )
  };
}
function EditorStatus() {
  const dirty = useEditorSelector((s) => s.dirty), t = useLabels();
  return /* @__PURE__ */ jsx("span", { className: "adl-editor-status", role: "status", children: dirty ? t("Unsaved changes", "Cambios sin guardar") : t("No pending changes", "Sin cambios pendientes") });
}
function EditorToolbar() {
  const { store } = useEditor(), snapshot = useEditorSelector(
    (s) => ({
      tool: s.tool,
      selection: s.selection,
      document: s.document,
      viewport: s.viewport,
      canUndo: s.canUndo,
      canRedo: s.canRedo
    }),
    shallowEqual
  ), t = useLabels();
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: "adl-editor-toolbar",
      role: "toolbar",
      "aria-label": t("Editor tools", "Herramientas de edici\xF3n"),
      children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            "aria-pressed": snapshot.tool === "select",
            onClick: () => store.setTool("select"),
            children: t("Select", "Seleccionar")
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            "aria-pressed": snapshot.tool === "hand",
            onClick: () => store.setTool("hand"),
            children: t("Pan", "Desplazar")
          }
        ),
        /* @__PURE__ */ jsx("button", { type: "button", disabled: !snapshot.canUndo, onClick: () => store.undo(), children: t("Undo", "Deshacer") }),
        /* @__PURE__ */ jsx("button", { type: "button", disabled: !snapshot.canRedo, onClick: () => store.redo(), children: t("Redo", "Rehacer") }),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: () => store.setViewport({
              ...snapshot.viewport,
              zoom: Math.max(0.1, snapshot.viewport.zoom / 1.25)
            }),
            "aria-label": t("Zoom out", "Alejar"),
            children: "\u2212"
          }
        ),
        /* @__PURE__ */ jsxs("output", { "aria-label": t("Zoom", "Zoom"), children: [
          Math.round(snapshot.viewport.zoom * 100),
          "%"
        ] }),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: () => store.setViewport({
              ...snapshot.viewport,
              zoom: Math.min(4, snapshot.viewport.zoom * 1.25)
            }),
            "aria-label": t("Zoom in", "Acercar"),
            children: "+"
          }
        ),
        /* @__PURE__ */ jsx(EditorSelectionTools, {}),
        /* @__PURE__ */ jsx(EditorRelayout, {}),
        /* @__PURE__ */ jsx(EditorStatus, {})
      ]
    }
  );
}
function EditorRelayout() {
  const { store } = useEditor(), snapshot = useEditorSelector((s) => ({ document: s.document, draft: s.draft }), shallowEqual), t = useLabels(), transactionRef = useRef(null);
  const previewing = snapshot.draft.kind === "gesture" && snapshot.draft.transactionId === transactionRef.current;
  const apply = () => {
    const current = store.getSnapshot();
    if (!getAdapter(current.document.spec.type).capabilities.includes("move-free")) return;
    const scene = relayoutScene(current.document);
    if (!scene.ok) return;
    const id = globalThis.crypto?.randomUUID?.() ?? String(Date.now());
    transactionRef.current = id;
    if (!store.beginGesture({ id, label: "Re-layout", expectedRevision: current.document.revision }).ok)
      return;
    store.previewGesture([{ type: "scene.set", scene: scene.value }], { skipValidation: true });
    transactionRef.current = id;
  };
  const confirm = () => {
    store.commitGesture();
    transactionRef.current = null;
  };
  const cancel = () => {
    store.cancelGesture();
    transactionRef.current = null;
  };
  return previewing ? /* @__PURE__ */ jsxs("span", { className: "adl-editor-relayout", children: [
    /* @__PURE__ */ jsx("button", { type: "button", onClick: confirm, children: t("Apply relayout", "Aplicar reajuste") }),
    /* @__PURE__ */ jsx("button", { type: "button", onClick: cancel, children: t("Cancel", "Cancelar") })
  ] }) : /* @__PURE__ */ jsx(
    "button",
    {
      type: "button",
      onClick: apply,
      disabled: !getAdapter(snapshot.document.spec.type).capabilities.includes("move-free"),
      children: t("Re-layout", "Reajustar")
    }
  );
}
var SceneMarkup = memo(function SceneMarkup2({ markup }) {
  return /* @__PURE__ */ jsx("g", { dangerouslySetInnerHTML: { __html: markup } });
});
var SceneHits = memo(function SceneHits2({
  nodes,
  edges,
  selection,
  zoom,
  color,
  connectionLabel,
  selectEdge,
  selectNode,
  handleNodeKey
}) {
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    edges.flatMap((e) => {
      const points = e.routePoints ?? [];
      const segments = [];
      for (let i = 1; i < points.length; i++) {
        const [x1, y1] = points[i - 1], [x2, y2] = points[i];
        segments.push({
          x: Math.min(x1, x2) - 6,
          y: Math.min(y1, y2) - 6,
          width: Math.abs(x2 - x1) + 12,
          height: Math.abs(y2 - y1) + 12
        });
      }
      const hit = segments.length ? segments : [{ x: e.startX - 6, y: e.startY - 6, width: 12, height: 12 }];
      const selected = selection.some((r) => r.kind === "edge" && r.id === e.id);
      const stroke = color;
      return hit.map((segment, index) => /* @__PURE__ */ jsx(
        EdgeHitRect,
        {
          id: e.id,
          index,
          x: segment.x,
          y: segment.y,
          width: segment.width,
          height: segment.height,
          selected,
          zoom,
          stroke,
          label: `${connectionLabel}: ${e.label ?? e.id}`,
          onSelect: selectEdge
        },
        `${e.id}-hit-${index}`
      ));
    }),
    nodes.map((n) => /* @__PURE__ */ jsx("g", { children: /* @__PURE__ */ jsx(
      NodeHitRect,
      {
        id: n.id,
        x: nodeGeometry(n).hit.x,
        y: nodeGeometry(n).hit.y,
        width: nodeGeometry(n).hit.width,
        height: nodeGeometry(n).hit.height,
        label: n.label,
        selected: selection.some((r) => r.kind === "node" && r.id === n.id),
        zoom,
        stroke: color,
        onSelect: selectNode,
        onKey: handleNodeKey
      }
    ) }, n.id))
  ] });
});
var BaselineLayer = memo(function BaselineLayer2({
  markup,
  hidden,
  width,
  height,
  x,
  y,
  zoom
}) {
  const root = useRef(null);
  useLayoutEffect(() => {
    if (!hidden || !root.current) return;
    const nodeIds = new Set(hidden.nodes), edgeIds = new Set(hidden.edges);
    const elements = [
      ...root.current.querySelectorAll(
        "[data-node-id], [data-edge-id], [data-edge-label]"
      )
    ].filter(
      (element) => nodeIds.has(element.getAttribute("data-node-id") ?? "") || edgeIds.has(
        element.getAttribute("data-edge-id") ?? element.getAttribute("data-edge-label") ?? ""
      )
    );
    for (const element of elements) element.style.visibility = "hidden";
    return () => {
      for (const element of elements) element.style.removeProperty("visibility");
    };
  }, [hidden, markup]);
  return /* @__PURE__ */ jsx(
    "svg",
    {
      ref: root,
      "aria-hidden": "true",
      width: "100%",
      height: "100%",
      viewBox: `0 0 ${width} ${height}`,
      style: { position: "absolute", inset: 0, pointerEvents: "none", willChange: "transform" },
      children: /* @__PURE__ */ jsx("g", { transform: `translate(${x} ${y}) scale(${zoom})`, children: /* @__PURE__ */ jsx(SceneMarkup, { markup }) })
    }
  );
});
function EditorSurface({
  ariaLabel,
  className
}) {
  const { store } = useEditor(), snapshot = useEditorSnapshot(), t = useLabels(), instanceId = useId();
  const svgRef = useRef(null), [size, setSize] = useState({ width: 800, height: 600 });
  const activeDoc = snapshot.draft.kind === "gesture" ? snapshot.draft.preview : snapshot.document;
  const resolvePreview = useMemo(() => createPreviewResolver(), [store]);
  const committedResolved = useMemo(
    () => resolveDocument(snapshot.document, {
      quality: "edit",
      requestId: instanceId,
      measureText,
      skipValidation: true,
      skipDiagnostics: true
    }),
    [snapshot.document, instanceId]
  );
  const resolved = useMemo(
    () => activeDoc === snapshot.document ? committedResolved : resolvePreview(activeDoc, {
      quality: "edit",
      requestId: instanceId,
      measureText,
      skipValidation: true,
      skipDiagnostics: true
    }),
    [activeDoc, snapshot.document, committedResolved, instanceId, resolvePreview]
  );
  const [gestureEntities, setGestureEntities] = useState(null);
  const baseline = useMemo(
    () => committedResolved.ok ? renderSceneMarkup(snapshot.document, committedResolved.value, { instanceId }) : "",
    [snapshot.document, committedResolved, instanceId]
  );
  const deltaMarkup = useMemo(() => {
    if (!gestureEntities || !resolved.ok) return null;
    return renderSceneMarkup(activeDoc, resolved.value, {
      instanceId,
      only: { nodes: new Set(gestureEntities.nodes), edges: new Set(gestureEntities.edges) }
    });
  }, [activeDoc, resolved, gestureEntities, instanceId]);
  const gesture = useRef(null);
  const marquee = useRef(null);
  const [selectionBox, setSelectionBox] = useState(null);
  const [connectLine, setConnectLine] = useState(null);
  const [connectSource, setConnectSource] = useState(null);
  const authoredNodes = useMemo(() => {
    const ids = new Set(nodesOf(activeDoc.spec).map((n) => n.id));
    return resolved.ok ? resolved.value.layout.nodes.filter((n) => ids.has(n.id)) : [];
  }, [activeDoc.spec, resolved]);
  const authoredEdges = useMemo(() => {
    const ids = new Set(edgesOf(activeDoc.spec).map((e) => e.id));
    return resolved.ok ? resolved.value.layout.edges.filter((e) => ids.has(e.id)) : [];
  }, [activeDoc.spec, resolved]);
  const hitBaseResolved = gestureEntities ? committedResolved : resolved;
  const hitBaseline = useMemo(() => {
    const scene = hitBaseResolved.ok ? hitBaseResolved.value.layout : null;
    const nodeIds = new Set(nodesOf(snapshot.document.spec).map((node) => node.id));
    const edgeIds = new Set(edgesOf(snapshot.document.spec).map((edge) => edge.id));
    return {
      nodes: (scene?.nodes ?? []).filter(
        (node) => nodeIds.has(node.id) && !gestureEntities?.nodes.includes(node.id)
      ),
      edges: (scene?.edges ?? []).filter(
        (edge) => edgeIds.has(edge.id) && !gestureEntities?.edges.includes(edge.id)
      )
    };
  }, [hitBaseResolved, snapshot.document.spec, gestureEntities]);
  function cancelMarquee() {
    if (!marquee.current) return false;
    store.setSelection([...marquee.current.selection]);
    marquee.current = null;
    setSelectionBox(null);
    return true;
  }
  const touches = useRef(/* @__PURE__ */ new Map());
  const pinch = useRef(null);
  const spacePan = useRef(false);
  const fitted = useRef(false);
  const moveRaf = useRef(0);
  const pendingMove = useRef(null);
  const pendingPointer = useRef(-1);
  const flushMove = () => {
    if (moveRaf.current) {
      cancelAnimationFrame(moveRaf.current);
      moveRaf.current = 0;
    }
    const point = pendingMove.current;
    pendingMove.current = null;
    const pointer = pendingPointer.current;
    pendingPointer.current = -1;
    if (point && pointer >= 0) applyMovePoint(point, pointer);
  };
  useEffect(
    () => () => {
      if (moveRaf.current) cancelAnimationFrame(moveRaf.current);
    },
    []
  );
  function applyMovePoint(point, pointerId) {
    const selection = marquee.current;
    if (selection?.pointer === pointerId) {
      if (!selection.moved) {
        if (Math.hypot(point.x - selection.start.x, point.y - selection.start.y) < 3) return;
        selection.moved = true;
      }
      const box = marqueeBounds(
        screenToWorld(selection.start, selection.viewport),
        screenToWorld(point, selection.viewport)
      );
      setSelectionBox(box);
      const selected = authoredNodes.filter((n) => intersectsMarquee(box, nodeGeometry(n).hit)).map((n) => ({ kind: "node", id: n.id }));
      const baseline2 = selection.additive ? selection.selection : [];
      store.setSelection([
        ...baseline2,
        ...selected.filter((n) => !baseline2.some((r) => r.kind === n.kind && r.id === n.id))
      ]);
      return;
    }
    const current = gesture.current;
    if (!current || current.pointer !== pointerId) return;
    if (current.pan) {
      store.setViewport({
        ...current.viewport,
        x: current.viewport.x + point.x - current.start.x,
        y: current.viewport.y + point.y - current.start.y
      });
      return;
    }
    if (current.connect) {
      const world = screenToWorld(point, current.viewport), source = current.scene.nodes[current.connect.sourceId];
      const anchor = source ? anchorPoint(source, { side: "right", offset: 0.5 }) : { x: 0, y: 0 };
      setConnectLine({ x1: anchor.x, y1: anchor.y, x2: world.x, y2: world.y });
      return;
    }
    const sceneCommands = snapshot.document.scene.mode === "manual" && Object.keys(snapshot.document.scene.nodes).length === nodesOf(snapshot.document.spec).length ? [] : [{ type: "scene.set", scene: current.scene }];
    const dx = point.x - current.start.x, dy = point.y - current.start.y, positions = {}, grid = snapshot.document.presentation.grid;
    if (current.port) {
      const authored = nodesOf(snapshot.document.spec).find((n) => n.id === current.port.nodeId);
      const rect = current.scene.nodes[current.port.nodeId];
      if (!authored || !rect) return;
      const graphNode = authored;
      const port = graphNode.ports?.find((p) => p.id === current.port.portId);
      if (!port) return;
      const world = {
        x: current.port.pointerWorld.x + dx / current.viewport.zoom,
        y: current.port.pointerWorld.y + dy / current.viewport.zoom
      };
      const anchor = anchorFromPoint(world, rect);
      const next = {
        ...graphNode,
        ports: (graphNode.ports ?? []).map(
          (p) => p.id === current.port.portId ? { ...p, side: anchor.side, offset: anchor.offset } : p
        )
      };
      const result = getAdapter(snapshot.document.spec.type).replaceNode(snapshot.document.spec, {
        diagramType: snapshot.document.spec.type,
        node: next
      });
      if (!result.ok) return;
      store.previewGesture([{ type: "spec.replace", spec: result.value, references: "reject" }], {
        skipValidation: true
      });
      return;
    }
    if (current.waypoint) {
      const route = current.scene.routes[current.waypoint.edgeId];
      if (!route || route.mode !== "manual") return;
      const next = structuredClone(route);
      const waypoint = current.waypoint;
      if (waypoint.anchor) {
        const edge = edgesOf(snapshot.document.spec).find((e) => e.id === waypoint.edgeId);
        if (!edge) return;
        const rect = current.scene.nodes[waypoint.anchor === "source" ? edge.from : edge.to];
        if (!rect) return;
        const world = {
          x: waypoint.pointerWorld.x + dx / current.viewport.zoom,
          y: waypoint.pointerWorld.y + dy / current.viewport.zoom
        };
        if (waypoint.anchor === "source") next.source = anchorFromPoint(world, rect);
        else next.target = anchorFromPoint(world, rect);
      } else {
        const index = waypoint.index, initial = route.points[index];
        if (!initial) return;
        next.points = route.points.map(
          (p, i) => i === index ? {
            x: initial.x + dx / current.viewport.zoom,
            y: initial.y + dy / current.viewport.zoom
          } : p
        );
      }
      store.previewGesture(
        [...sceneCommands, { type: "route.set", id: waypoint.edgeId, route: next }],
        { skipValidation: true }
      );
      return;
    }
    if (current.resize) {
      const rects = current.resize.ids.map((resizeId) => current.scene.nodes[resizeId]).filter((node) => node).map((node) => ({
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height
      }));
      const resized = resizeRects(
        rects,
        current.resize.direction,
        {
          x: dx / current.viewport.zoom,
          y: dy / current.viewport.zoom
        },
        grid.snap ? grid.size : void 0
      );
      const resizeCommands = resized.flatMap((rect, index) => {
        const resizeId = current.resize.ids[index];
        return [
          { type: "nodes.move", positions: { [resizeId]: { x: rect.x, y: rect.y } } },
          {
            type: "node.resize",
            id: resizeId,
            size: { width: rect.width, height: rect.height }
          }
        ];
      });
      store.previewGesture([...sceneCommands, ...resizeCommands], {
        skipValidation: true
      });
      return;
    }
    for (const [id, start] of Object.entries(current.positions)) {
      const x = start.x + dx / current.viewport.zoom, y = start.y + dy / current.viewport.zoom;
      positions[id] = {
        x: grid.snap ? Math.round(x / grid.size) * grid.size : x,
        y: grid.snap ? Math.round(y / grid.size) * grid.size : y
      };
    }
    store.previewGesture([...sceneCommands, { type: "nodes.move", positions }], {
      skipValidation: true
    });
  }
  const scheduleMove = (point, pointerId) => {
    pendingMove.current = point;
    pendingPointer.current = pointerId;
    if (moveRaf.current) return;
    moveRaf.current = requestAnimationFrame(() => {
      moveRaf.current = 0;
      const queued = pendingMove.current;
      pendingMove.current = null;
      const pointer = pendingPointer.current;
      pendingPointer.current = -1;
      if (queued && pointer >= 0) applyMovePoint(queued, pointer);
    });
  };
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const observer = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      if (r.width > 0 && r.height > 0) {
        const measured = { width: r.width, height: r.height };
        setSize(measured);
        if (!fitted.current) {
          const current = resolveDocument(store.getSnapshot().document, {
            quality: "edit",
            requestId: "initial-fit",
            measureText,
            skipValidation: true
          });
          if (current.ok) {
            fitted.current = true;
            store.setViewport(fitViewport(current.value.worldBounds, measured, 24));
          }
        }
      }
    });
    observer.observe(svg);
    return () => {
      observer.disconnect();
      store.cancelGesture();
    };
  }, [store]);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const wheel = (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      if (marquee.current || gesture.current || pinch.current) return;
      const viewport = store.getSnapshot().viewport;
      const matrix = svg.getScreenCTM();
      if (!matrix) return;
      const anchor = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? svg.clientHeight : 1);
      store.setViewport(zoomAt(anchor, viewport.zoom * Math.exp(-delta * 2e-3), viewport));
    };
    svg.addEventListener("wheel", wheel, { passive: false });
    return () => svg.removeEventListener("wheel", wheel);
  }, [store]);
  function local(event) {
    const matrix = svgRef.current?.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: point.x, y: point.y };
  }
  function finish(event, cancel = false) {
    touches.current.delete(event.pointerId);
    if (pinch.current) {
      if (cancel) {
        store.setViewport(pinch.current.viewport);
        touches.current.clear();
      }
      if (!touches.current.size) pinch.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId))
        event.currentTarget.releasePointerCapture(event.pointerId);
      return;
    }
    if (!cancel) flushMove();
    if (marquee.current?.pointer === event.pointerId) {
      if (cancel) cancelMarquee();
      else {
        if (!marquee.current.moved && !marquee.current.additive) store.setSelection([]);
        marquee.current = null;
        setSelectionBox(null);
      }
      if (event.currentTarget.hasPointerCapture(event.pointerId))
        event.currentTarget.releasePointerCapture(event.pointerId);
      return;
    }
    if (gesture.current?.pointer !== event.pointerId) return;
    if (gesture.current.connect) {
      if (cancel) store.cancelGesture();
      else {
        flushMove();
        const viewport = store.getSnapshot().viewport, world = screenToWorld(local(event), viewport), sourceId = gesture.current.connect.sourceId, current = store.getSnapshot();
        const target = authoredNodes.find((n) => {
          if (n.id === sourceId) return false;
          const hit = nodeGeometry(n).hit;
          return world.x >= hit.x && world.x <= hit.x + hit.width && world.y >= hit.y && world.y <= hit.y + hit.height;
        });
        if (target) {
          const adapter = getAdapter(current.document.spec.type);
          const inserted = adapter.insertRelation(current.document.spec, {
            diagramType: current.document.spec.type,
            relation: {
              id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
              from: sourceId,
              to: target.id
            }
          });
          if (inserted.ok)
            store.previewGesture([
              { type: "spec.replace", spec: inserted.value, references: "reject" }
            ]);
        }
        store.commitGesture();
      }
      setConnectLine(null);
      gesture.current = null;
      setGestureEntities(null);
      if (event.currentTarget.hasPointerCapture(event.pointerId))
        event.currentTarget.releasePointerCapture(event.pointerId);
      return;
    }
    if (!gesture.current.pan) {
      if (cancel) store.cancelGesture();
      else {
        flushMove();
        store.commitGesture();
      }
    }
    gesture.current = null;
    setGestureEntities(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function removeSelection() {
    const current = store.getSnapshot(), ids = current.selection.filter((r) => r.kind === "node").map((r) => r.id);
    if (ids.some((id) => isNodeLocked(current.document, id))) return;
    const adapter = getAdapter(current.document.spec.type);
    const removed = adapter.removeNodes(current.document.spec, ids);
    if (!removed.ok) return;
    const edgeIds = current.selection.filter((r) => r.kind === "edge").map((r) => r.id);
    const next = edgeIds.length ? adapter.removeRelations(removed.value, edgeIds) : removed;
    if (next.ok)
      dispatch(
        store,
        [{ type: "spec.replace", spec: next.value, references: "prune-references" }],
        "Delete selection"
      );
  }
  function connectKeyboard(from, to) {
    const current = store.getSnapshot(), adapter = getAdapter(current.document.spec.type);
    if (!adapter.capabilities.includes("connect")) return;
    const id = globalThis.crypto?.randomUUID?.() ?? String(Date.now());
    const inserted = adapter.insertRelation(current.document.spec, {
      diagramType: current.document.spec.type,
      relation: { id, from, to }
    });
    if (!inserted.ok) return;
    dispatch(
      store,
      [{ type: "spec.replace", spec: inserted.value, references: "reject" }],
      "Connect nodes"
    );
    store.setSelection([{ kind: "edge", id }]);
  }
  const connectKeyboardRef = useRef(connectKeyboard);
  connectKeyboardRef.current = connectKeyboard;
  const connectSourceRef = useRef(connectSource);
  connectSourceRef.current = connectSource;
  const incidentEdges = useCallback(
    (nodeIds) => {
      const spec = store.getSnapshot().document.spec;
      return edgesOf(spec).filter((e) => e.from && e.to && (nodeIds.includes(e.from) || nodeIds.includes(e.to))).map((e) => e.id);
    },
    [store]
  );
  const selectEdge = useCallback(
    (id) => store.setSelection([{ kind: "edge", id }]),
    [store]
  );
  const selectNode = useCallback(
    (id) => store.setSelection([{ kind: "node", id }]),
    [store]
  );
  const handleNodeKey = useCallback(
    (id) => {
      const source = connectSourceRef.current;
      if (source) {
        if (source === id) setConnectSource(null);
        else {
          connectKeyboardRef.current(source, id);
          setConnectSource(null);
        }
        return;
      }
      store.setSelection([{ kind: "node", id }]);
    },
    [store]
  );
  return /* @__PURE__ */ jsxs("div", { className: `adl-editor-surface ${className ?? ""}`, children: [
    /* @__PURE__ */ jsx(
      BaselineLayer,
      {
        markup: baseline,
        hidden: gestureEntities,
        width: size.width,
        height: size.height,
        x: snapshot.viewport.x,
        y: snapshot.viewport.y,
        zoom: snapshot.viewport.zoom
      }
    ),
    /* @__PURE__ */ jsx(
      "svg",
      {
        style: { position: "relative" },
        ref: svgRef,
        width: "100%",
        height: "100%",
        viewBox: `0 0 ${size.width} ${size.height}`,
        role: "group",
        tabIndex: 0,
        "aria-label": ariaLabel ?? t(
          "Editable diagram. Select a node, then use arrow keys to move it.",
          "Diagrama editable. Selecciona un nodo y usa las flechas para moverlo."
        ),
        onKeyDown: (event) => {
          if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
            return;
          if (event.key === " " && event.target === event.currentTarget) {
            event.preventDefault();
            spacePan.current = true;
            return;
          }
          const mod = event.metaKey || event.ctrlKey;
          if (event.key === "Escape") {
            if (pinch.current) {
              store.setViewport(pinch.current.viewport);
              pinch.current = null;
              touches.current.clear();
            }
            spacePan.current = false;
            setConnectSource(null);
            setConnectLine(null);
            if (cancelMarquee()) {
              event.preventDefault();
              return;
            }
            store.cancelGesture();
            gesture.current = null;
            store.setSelection([]);
            event.preventDefault();
          } else if (mod && event.key.toLowerCase() === "z") {
            event.preventDefault();
            if (event.shiftKey) store.redo();
            else store.undo();
          } else if (mod && event.key.toLowerCase() === "a") {
            event.preventDefault();
            store.setSelection(
              nodesOf(snapshot.document.spec).map((n) => ({ kind: "node", id: n.id }))
            );
          } else if (event.key === "Delete" || event.key === "Backspace") {
            event.preventDefault();
            removeSelection();
          } else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key) && getAdapter(snapshot.document.spec.type).capabilities.includes("move-free")) {
            event.preventDefault();
            const scene = materialize(snapshot.document), positions = {};
            for (const ref of snapshot.selection)
              if (ref.kind === "node" && scene.nodes[ref.id] && !isNodeLocked(snapshot.document, ref.id)) {
                const p = scene.nodes[ref.id], step = event.shiftKey ? 16 : 1;
                positions[ref.id] = {
                  x: p.x + (event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0),
                  y: p.y + (event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0)
                };
              }
            if (Object.keys(positions).length)
              dispatch(
                store,
                [
                  { type: "scene.set", scene },
                  { type: "nodes.move", positions }
                ],
                "Nudge selection"
              );
          }
        },
        onKeyUp: (event) => {
          if (event.key === " ") spacePan.current = false;
        },
        onBlur: (event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            spacePan.current = false;
        },
        onPointerDown: (event) => {
          if (event.pointerType === "touch") {
            touches.current.set(event.pointerId, local(event));
            if (touches.current.size >= 2) {
              event.preventDefault();
              store.cancelGesture();
              gesture.current = null;
              cancelMarquee();
              if (!pinch.current) {
                const points = [...touches.current.values()];
                pinch.current = {
                  start: [points[0], points[1]],
                  viewport: { ...store.getSnapshot().viewport }
                };
              }
              event.currentTarget.setPointerCapture(event.pointerId);
              return;
            }
          }
          if (marquee.current || gesture.current || event.button !== 0 && event.button !== 1)
            return;
          const target = event.target.closest(
            "[data-hit-node], [data-resize-node], [data-resize-selection], [data-hit-edge], [data-waypoint], [data-port], [data-connect-source]"
          ), resizeId = target?.getAttribute("data-resize-node") ?? void 0, resizeSelection = target?.hasAttribute("data-resize-selection") ?? false, id = resizeId ?? target?.getAttribute("data-hit-node"), waypointEdge = target?.getAttribute("data-waypoint") ?? void 0, waypointIndex = Number(target?.getAttribute("data-waypoint-index") ?? "-1"), waypointAnchor = target?.getAttribute("data-waypoint-anchor") ?? void 0, edgeId = target?.getAttribute("data-hit-edge") ?? void 0, portNodeId = target?.getAttribute("data-port-node") ?? void 0, portId = target?.getAttribute("data-port") ?? void 0, connectSourceId = target?.getAttribute("data-connect-source") ?? void 0;
          const pan = snapshot.tool === "hand" || event.button === 1 || spacePan.current;
          if (connectSource && !connectSourceId) setConnectSource(null);
          if (!pan && !id && !resizeSelection && !edgeId && !waypointEdge && !portId && !connectSourceId) {
            event.preventDefault();
            svgRef.current?.focus();
            marquee.current = {
              pointer: event.pointerId,
              start: local(event),
              viewport: { ...snapshot.viewport },
              selection: snapshot.selection,
              additive: event.shiftKey,
              moved: false
            };
            event.currentTarget.setPointerCapture(event.pointerId);
            return;
          }
          event.preventDefault();
          svgRef.current?.focus();
          let resizeIds;
          if (waypointEdge) {
            const route = snapshot.document.scene.routes[waypointEdge];
            if (!route || route.mode !== "manual") return;
            store.setSelection([{ kind: "edge", id: waypointEdge }]);
            if (!store.beginGesture({
              id: globalThis.crypto.randomUUID(),
              label: "Move waypoint",
              expectedRevision: snapshot.document.revision
            }).ok)
              return;
            setGestureEntities({ nodes: [], edges: [waypointEdge] });
            const startPoint = local(event);
            gesture.current = {
              pointer: event.pointerId,
              start: startPoint,
              viewport: { ...snapshot.viewport },
              positions: {},
              scene: materialize(snapshot.document),
              pan: false,
              waypoint: {
                edgeId: waypointEdge,
                index: waypointIndex,
                anchor: waypointAnchor,
                pointerWorld: screenToWorld(startPoint, snapshot.viewport)
              }
            };
            event.currentTarget.setPointerCapture(event.pointerId);
            return;
          }
          if (portId && portNodeId && !pan) {
            store.setSelection([{ kind: "node", id: portNodeId }]);
            if (!store.beginGesture({
              id: globalThis.crypto.randomUUID(),
              label: "Move port",
              expectedRevision: snapshot.document.revision
            }).ok)
              return;
            setGestureEntities({ nodes: [portNodeId], edges: incidentEdges([portNodeId]) });
            const startPoint = local(event);
            gesture.current = {
              pointer: event.pointerId,
              start: startPoint,
              viewport: { ...snapshot.viewport },
              positions: {},
              scene: materialize(snapshot.document),
              pan: false,
              port: {
                nodeId: portNodeId,
                portId,
                pointerWorld: screenToWorld(startPoint, snapshot.viewport)
              }
            };
            event.currentTarget.setPointerCapture(event.pointerId);
            return;
          }
          if (connectSourceId && !pan) {
            store.setSelection([{ kind: "node", id: connectSourceId }]);
            if (!store.beginGesture({
              id: globalThis.crypto.randomUUID(),
              label: "Connect",
              expectedRevision: snapshot.document.revision
            }).ok)
              return;
            const startPoint = local(event);
            const scene2 = materialize(snapshot.document), source = scene2.nodes[connectSourceId];
            const anchor = source ? anchorPoint(source, { side: "right", offset: 0.5 }) : { x: 0, y: 0 };
            const startWorld = screenToWorld(startPoint, snapshot.viewport);
            gesture.current = {
              pointer: event.pointerId,
              start: startPoint,
              viewport: { ...snapshot.viewport },
              positions: {},
              scene: scene2,
              pan: false,
              connect: { sourceId: connectSourceId }
            };
            setConnectLine({ x1: anchor.x, y1: anchor.y, x2: startWorld.x, y2: startWorld.y });
            event.currentTarget.setPointerCapture(event.pointerId);
            return;
          }
          if (edgeId && !pan) {
            store.setSelection(
              event.shiftKey ? snapshot.selection.some((r) => r.kind === "edge" && r.id === edgeId) ? snapshot.selection.filter((r) => !(r.kind === "edge" && r.id === edgeId)) : [...snapshot.selection, { kind: "edge", id: edgeId }] : [{ kind: "edge", id: edgeId }]
            );
            return;
          }
          if (resizeSelection) {
            resizeIds = snapshot.selection.filter((r) => r.kind === "node").map((r) => r.id);
            if (resizeIds.length < 2 || resizeIds.some((nodeId) => isNodeLocked(snapshot.document, nodeId)))
              return;
          } else if (id && !pan) {
            const selection = resizeId ? snapshot.selection.filter((r) => r.kind === "node" && r.id !== id).length === 0 && snapshot.selection.some((r) => r.kind === "node" && r.id === id) ? [...snapshot.selection] : [{ kind: "node", id }] : event.shiftKey ? [
              ...snapshot.selection.filter((r) => !(r.kind === "node" && r.id === id)),
              ...!snapshot.selection.some((r) => r.kind === "node" && r.id === id) ? [{ kind: "node", id }] : []
            ] : snapshot.selection.some((r) => r.kind === "node" && r.id === id) ? [...snapshot.selection] : [{ kind: "node", id }];
            store.setSelection(selection);
            if (!getAdapter(snapshot.document.spec.type).capabilities.includes("move-free") || isNodeLocked(snapshot.document, id))
              return;
            if (resizeId) resizeIds = [id];
          }
          const scene = materialize(snapshot.document), positions = {};
          for (const ref of store.getSnapshot().selection)
            if (ref.kind === "node" && scene.nodes[ref.id])
              positions[ref.id] = { x: scene.nodes[ref.id].x, y: scene.nodes[ref.id].y };
          if (!pan && !store.beginGesture({
            id: globalThis.crypto.randomUUID(),
            label: resizeIds ? resizeIds.length > 1 ? "Resize selection" : "Resize node" : "Move selection",
            expectedRevision: snapshot.document.revision
          }).ok)
            return;
          const draggedIds = resizeIds ?? Object.keys(positions);
          setGestureEntities({ nodes: draggedIds, edges: incidentEdges(draggedIds) });
          gesture.current = {
            pointer: event.pointerId,
            start: local(event),
            viewport: { ...snapshot.viewport },
            positions,
            scene,
            pan,
            resize: resizeIds ? {
              ids: resizeIds,
              direction: target?.getAttribute("data-resize-direction") ?? "se"
            } : void 0
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        },
        onPointerMove: (event) => {
          if (touches.current.has(event.pointerId))
            touches.current.set(event.pointerId, local(event));
          if (pinch.current) {
            const points = [...touches.current.values()];
            if (points.length === 2)
              store.setViewport(
                pinchViewport(pinch.current.start, [points[0], points[1]], pinch.current.viewport)
              );
            return;
          }
          if (!marquee.current && !gesture.current) return;
          scheduleMove(local(event), event.pointerId);
        },
        onPointerUp: (event) => finish(event),
        onPointerCancel: (event) => finish(event, true),
        onLostPointerCapture: (event) => {
          const lostTouch = touches.current.delete(event.pointerId);
          if (lostTouch && pinch.current) {
            store.setViewport(pinch.current.viewport);
            pinch.current = null;
            touches.current.clear();
          }
          cancelMarquee();
          if (gesture.current) {
            store.cancelGesture();
            gesture.current = null;
            setGestureEntities(null);
          }
        },
        children: /* @__PURE__ */ jsxs(
          "g",
          {
            transform: `translate(${snapshot.viewport.x} ${snapshot.viewport.y}) scale(${snapshot.viewport.zoom})`,
            children: [
              /* @__PURE__ */ jsx(SceneMarkup, { markup: deltaMarkup ?? "" }),
              /* @__PURE__ */ jsx("g", { pointerEvents: gestureEntities ? "none" : void 0, children: /* @__PURE__ */ jsx(
                SceneHits,
                {
                  nodes: hitBaseline.nodes,
                  edges: hitBaseline.edges,
                  selection: snapshot.selection,
                  zoom: snapshot.viewport.zoom,
                  color: activeDoc.presentation.theme[activeDoc.presentation.theme.mode].cobalt,
                  connectionLabel: t("Connection", "Conexi\xF3n"),
                  selectEdge,
                  selectNode,
                  handleNodeKey
                }
              ) }),
              gestureEntities && /* @__PURE__ */ jsx(
                SceneHits,
                {
                  nodes: authoredNodes.filter((node) => gestureEntities.nodes.includes(node.id)),
                  edges: authoredEdges.filter((edge) => gestureEntities.edges.includes(edge.id)),
                  selection: snapshot.selection,
                  zoom: snapshot.viewport.zoom,
                  color: activeDoc.presentation.theme[activeDoc.presentation.theme.mode].cobalt,
                  connectionLabel: t("Connection", "Conexi\xF3n"),
                  selectEdge,
                  selectNode,
                  handleNodeKey
                }
              ),
              snapshot.tool === "select" && snapshot.selection.length >= 1 && getAdapter(activeDoc.spec.type).capabilities.includes("resize") && (() => {
                const selected = authoredNodes.filter(
                  (n) => snapshot.selection.some((r) => r.kind === "node" && r.id === n.id) && !isNodeLocked(activeDoc, n.id)
                );
                if (!selected.length) return null;
                const group = rectsUnion(
                  selected.map((n) => ({ x: n.x, y: n.y, width: n.w, height: n.h }))
                );
                const resizeTarget = selected.length === 1 ? selected[0].id : void 0;
                const name = selected.length === 1 ? `${t("Resize", "Redimensionar")} ${selected[0].label}` : t("Resize selection", "Redimensionar selecci\xF3n");
                const apply = (direction, delta, step) => {
                  const scene = materialize(store.getSnapshot().document);
                  const ids = resizeTarget ? [resizeTarget] : snapshot.selection.filter((r) => r.kind === "node").map((r) => r.id);
                  const rects = ids.map((resizeId) => scene.nodes[resizeId]).filter((node) => node).map((node) => ({
                    x: node.x,
                    y: node.y,
                    width: node.width,
                    height: node.height
                  }));
                  const finalRects = resizeRects(rects, direction, {
                    x: delta.x * step,
                    y: delta.y * step
                  });
                  dispatch(
                    store,
                    [
                      { type: "scene.set", scene },
                      ...finalRects.flatMap((rect, index) => {
                        const resizeId = ids[index];
                        return [
                          {
                            type: "nodes.move",
                            positions: { [resizeId]: { x: rect.x, y: rect.y } }
                          },
                          {
                            type: "node.resize",
                            id: resizeId,
                            size: { width: rect.width, height: rect.height }
                          }
                        ];
                      })
                    ],
                    resizeTarget ? "Resize node" : "Resize selection"
                  );
                };
                return RESIZE_HANDLES.map((handle) => /* @__PURE__ */ jsxs("g", { children: [
                  /* @__PURE__ */ jsx(
                    "rect",
                    {
                      x: group.x + group.width * handle.x - 5 / snapshot.viewport.zoom,
                      y: group.y + group.height * handle.y - 5 / snapshot.viewport.zoom,
                      width: 10 / snapshot.viewport.zoom,
                      height: 10 / snapshot.viewport.zoom,
                      fill: activeDoc.presentation.theme[activeDoc.presentation.theme.mode].card,
                      stroke: activeDoc.presentation.theme[activeDoc.presentation.theme.mode].cobalt,
                      strokeWidth: 1 / snapshot.viewport.zoom,
                      pointerEvents: "none"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    "rect",
                    {
                      ...resizeTarget ? { "data-resize-node": resizeTarget } : { "data-resize-selection": "" },
                      "data-resize-direction": handle.direction,
                      x: group.x + group.width * handle.x - 22 / snapshot.viewport.zoom,
                      y: group.y + group.height * handle.y - 22 / snapshot.viewport.zoom,
                      width: 44 / snapshot.viewport.zoom,
                      height: 44 / snapshot.viewport.zoom,
                      fill: "transparent",
                      style: { cursor: handle.cursor },
                      tabIndex: 0,
                      role: "button",
                      "aria-label": `${name}${handle.direction === "se" ? "" : ` \u2014 ${t(handle.en, handle.es)}`}`,
                      "aria-description": t(handle.en, handle.es),
                      onKeyDown: (event) => {
                        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key))
                          return;
                        event.preventDefault();
                        event.stopPropagation();
                        const delta = {
                          x: event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0,
                          y: event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0
                        };
                        apply(handle.direction, delta, event.shiftKey ? 16 : 1);
                      }
                    }
                  )
                ] }, `resize-group-${handle.direction}`));
              })(),
              snapshot.selection.length === 1 && snapshot.selection[0].kind === "edge" && (() => {
                const edge = authoredEdges.find((e) => e.id === snapshot.selection[0].id);
                const route = edge ? activeDoc.scene.routes[edge.id] : void 0;
                if (!edge || route?.mode !== "manual") return null;
                const from = activeDoc.scene.nodes[edge.from] ?? {
                  x: edge.startX,
                  y: edge.startY,
                  width: 0,
                  height: 0
                };
                const to = activeDoc.scene.nodes[edge.to] ?? {
                  x: edge.endX,
                  y: edge.endY,
                  width: 0,
                  height: 0
                };
                const source = anchorPoint(from, route.source);
                const target = anchorPoint(to, route.target);
                const palette = activeDoc.presentation.theme[activeDoc.presentation.theme.mode];
                const dot = (radius) => Math.max(5, radius / snapshot.viewport.zoom);
                return /* @__PURE__ */ jsxs("g", { children: [
                  route.points.map((p, index) => /* @__PURE__ */ jsxs("g", { children: [
                    /* @__PURE__ */ jsx(
                      "circle",
                      {
                        cx: p.x,
                        cy: p.y,
                        r: dot(5),
                        fill: palette.card,
                        stroke: palette.cobalt,
                        strokeWidth: 1 / snapshot.viewport.zoom,
                        pointerEvents: "none"
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "circle",
                      {
                        "data-waypoint": edge.id,
                        "data-waypoint-index": index,
                        cx: p.x,
                        cy: p.y,
                        r: Math.max(16, 22 / snapshot.viewport.zoom),
                        fill: "transparent",
                        style: { cursor: "move" },
                        tabIndex: 0,
                        role: "button",
                        "aria-label": `${t("Waypoint", "Punto intermedio")} ${index + 1}`
                      }
                    )
                  ] }, `waypoint-${edge.id}-${index}`)),
                  [
                    ["source", source, route.source],
                    ["target", target, route.target]
                  ].map(([kind, position]) => /* @__PURE__ */ jsxs("g", { children: [
                    /* @__PURE__ */ jsx(
                      "circle",
                      {
                        cx: position.x,
                        cy: position.y,
                        r: dot(6),
                        fill: palette.background,
                        stroke: palette.branch,
                        strokeWidth: 1.5 / snapshot.viewport.zoom,
                        pointerEvents: "none"
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "circle",
                      {
                        "data-waypoint": edge.id,
                        "data-waypoint-anchor": kind,
                        cx: position.x,
                        cy: position.y,
                        r: Math.max(16, 22 / snapshot.viewport.zoom),
                        fill: "transparent",
                        style: { cursor: "crosshair" },
                        tabIndex: 0,
                        role: "button",
                        "aria-label": `${t("Anchor", "Anclaje")} ${kind}`
                      }
                    )
                  ] }, `anchor-${edge.id}-${kind}`))
                ] });
              })(),
              snapshot.selection.length === 1 && snapshot.selection[0].kind === "node" && getAdapter(activeDoc.spec.type).capabilities.includes("ports") && (() => {
                const id = snapshot.selection[0].id;
                if (isNodeLocked(activeDoc, id)) return null;
                const authored = nodesOf(activeDoc.spec).find((n) => n.id === id);
                const authoredRect = activeDoc.scene.nodes[id];
                const laidOut = resolved.ok ? resolved.value.layout.nodeById[id] : void 0;
                const rect = authoredRect ?? (laidOut ? { x: laidOut.x, y: laidOut.y, width: laidOut.w, height: laidOut.h } : void 0);
                const ports = authored?.ports ?? [];
                if (!rect || !ports.length) return null;
                const palette = activeDoc.presentation.theme[activeDoc.presentation.theme.mode];
                const dot = (radius) => Math.max(5, radius / snapshot.viewport.zoom);
                return /* @__PURE__ */ jsx("g", { children: ports.map((port) => {
                  const position = anchorPoint(rect, port);
                  return /* @__PURE__ */ jsxs("g", { children: [
                    /* @__PURE__ */ jsx(
                      "circle",
                      {
                        cx: position.x,
                        cy: position.y,
                        r: dot(5),
                        fill: palette.background,
                        stroke: palette.cobalt,
                        strokeWidth: 1.5 / snapshot.viewport.zoom,
                        pointerEvents: "none"
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "circle",
                      {
                        "data-port": port.id,
                        "data-port-node": id,
                        cx: position.x,
                        cy: position.y,
                        r: Math.max(16, 22 / snapshot.viewport.zoom),
                        fill: "transparent",
                        style: { cursor: "crosshair" },
                        tabIndex: 0,
                        role: "button",
                        "aria-label": `${t("Port", "Puerto")}: ${port.id}`
                      }
                    )
                  ] }, `port-${id}-${port.id}`);
                }) });
              })(),
              snapshot.tool === "select" && snapshot.selection.length === 1 && snapshot.selection[0].kind === "node" && getAdapter(activeDoc.spec.type).capabilities.includes("connect") && !isNodeLocked(activeDoc, snapshot.selection[0].id) && (() => {
                const id = snapshot.selection[0].id;
                const authored = authoredNodes.find((n) => n.id === id);
                const authoredRect = activeDoc.scene.nodes[id];
                const laidOut = resolved.ok ? resolved.value.layout.nodeById[id] : void 0;
                const rect = authoredRect ?? (laidOut ? { x: laidOut.x, y: laidOut.y, width: laidOut.w, height: laidOut.h } : void 0);
                if (!authored || !rect) return null;
                const anchor = anchorPoint(rect, { side: "right", offset: 0.5 });
                const palette = activeDoc.presentation.theme[activeDoc.presentation.theme.mode];
                const dot = (radius) => Math.max(5, radius / snapshot.viewport.zoom);
                return /* @__PURE__ */ jsxs("g", { children: [
                  /* @__PURE__ */ jsx(
                    "circle",
                    {
                      cx: anchor.x,
                      cy: anchor.y,
                      r: dot(5),
                      fill: palette.background,
                      stroke: palette.branch,
                      strokeWidth: 1.5 / snapshot.viewport.zoom,
                      pointerEvents: "none"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    "circle",
                    {
                      "data-connect-source": id,
                      cx: anchor.x,
                      cy: anchor.y,
                      r: Math.max(16, 22 / snapshot.viewport.zoom),
                      fill: "transparent",
                      style: { cursor: "crosshair" },
                      tabIndex: 0,
                      role: "button",
                      "aria-label": `${t("Connect", "Conectar")}: ${authored.label}`,
                      onKeyDown: (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          event.stopPropagation();
                          setConnectSource(id);
                        }
                      }
                    }
                  )
                ] });
              })(),
              connectSource && (() => {
                const palette = activeDoc.presentation.theme[activeDoc.presentation.theme.mode];
                return /* @__PURE__ */ jsx("g", { pointerEvents: "none", children: authoredNodes.filter((n) => n.id !== connectSource).map((n) => /* @__PURE__ */ jsx(
                  "rect",
                  {
                    x: nodeGeometry(n).hit.x,
                    y: nodeGeometry(n).hit.y,
                    width: nodeGeometry(n).hit.width,
                    height: nodeGeometry(n).hit.height,
                    rx: 4,
                    fill: "none",
                    stroke: palette.cobalt,
                    strokeWidth: 1 / snapshot.viewport.zoom,
                    strokeDasharray: "4 4"
                  },
                  `connect-target-${n.id}`
                )) });
              })(),
              connectLine && /* @__PURE__ */ jsx(
                "line",
                {
                  x1: connectLine.x1,
                  y1: connectLine.y1,
                  x2: connectLine.x2,
                  y2: connectLine.y2,
                  stroke: activeDoc.presentation.theme[activeDoc.presentation.theme.mode].cobalt,
                  strokeWidth: 2 / snapshot.viewport.zoom,
                  strokeDasharray: "4 4",
                  pointerEvents: "none"
                }
              ),
              selectionBox && /* @__PURE__ */ jsx(
                "rect",
                {
                  "data-marquee": "true",
                  x: selectionBox.x,
                  y: selectionBox.y,
                  width: selectionBox.width,
                  height: selectionBox.height,
                  fill: activeDoc.presentation.theme[activeDoc.presentation.theme.mode].cobalt,
                  fillOpacity: 0.08,
                  stroke: activeDoc.presentation.theme[activeDoc.presentation.theme.mode].cobalt,
                  strokeWidth: 1 / snapshot.viewport.zoom,
                  pointerEvents: "none"
                }
              )
            ]
          }
        )
      }
    ),
    /* @__PURE__ */ jsx(
      "button",
      {
        className: "adl-editor-fit",
        type: "button",
        onClick: () => {
          if (resolved.ok) store.setViewport(fitViewport(resolved.value.worldBounds, size, 24));
        },
        children: t("Fit diagram", "Ajustar diagrama")
      }
    ),
    !resolved.ok && /* @__PURE__ */ jsx("p", { role: "alert", children: resolved.diagnostics.map((d) => d.code).join(", ") }),
    connectSource && /* @__PURE__ */ jsx("p", { role: "status", className: "adl-editor-connect-hint", children: t(
      "Press Enter on a target node to connect, or Escape to cancel.",
      "Pulsa Enter en un nodo destino para conectar, o Escape para cancelar."
    ) })
  ] });
}
function EditorInspector() {
  const { store } = useEditor(), snapshot = useEditorSelector(
    (s) => ({ selection: s.selection, document: s.document }),
    shallowEqual
  ), t = useLabels();
  const id = snapshot.selection.find((r) => r.kind === "node")?.id, node = nodesOf(snapshot.document.spec).find((n) => n.id === id);
  const [label, setLabel] = useState(""), [error, setError] = useState("");
  useEffect(() => {
    setLabel(node?.label ?? "");
    setError("");
  }, [node]);
  const free = getAdapter(snapshot.document.spec.type).capabilities.includes("move-free");
  const saveLabel = () => {
    if (!node) return;
    const adapter = getAdapter(snapshot.document.spec.type);
    const result = adapter.replaceNode(snapshot.document.spec, {
      diagramType: snapshot.document.spec.type,
      node: { ...node, label }
    });
    if (result.ok) {
      const commit = dispatch(
        store,
        [{ type: "spec.replace", spec: result.value, references: "reject" }],
        "Rename node"
      );
      setError(commit.diagnostics.map((d) => d.code).join(", "));
    } else setError(result.diagnostics.map((d) => d.code).join(", "));
  };
  function add() {
    const adapter = getAdapter(snapshot.document.spec.type), id2 = globalThis.crypto.randomUUID();
    if (!free) return;
    const n = snapshot.document.spec.type === "er" ? { id: id2, label: t("New entity", "Nueva entidad"), fields: [] } : { id: id2, label: t("New node", "Nuevo nodo"), description: "" };
    const result = adapter.insertNode(snapshot.document.spec, {
      diagramType: snapshot.document.spec.type,
      node: n
    });
    if (result.ok) {
      dispatch(
        store,
        [{ type: "spec.replace", spec: result.value, references: "reject" }],
        "Add node"
      );
      store.setSelection([{ kind: "node", id: id2 }]);
    }
  }
  return /* @__PURE__ */ jsxs("aside", { className: "adl-editor-inspector", "aria-label": t("Properties", "Propiedades"), children: [
    /* @__PURE__ */ jsx("h2", { children: t("Properties", "Propiedades") }),
    free && /* @__PURE__ */ jsx("button", { type: "button", onClick: add, children: t("Add node", "A\xF1adir nodo") }),
    !node ? /* @__PURE__ */ jsx("p", { children: t(
      "Select a node to edit its properties.",
      "Selecciona un nodo para editar sus propiedades."
    ) }) : /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("p", { className: "adl-editor-mono", children: node.id }),
      /* @__PURE__ */ jsxs(
        "form",
        {
          onSubmit: (event) => {
            event.preventDefault();
            saveLabel();
          },
          children: [
            /* @__PURE__ */ jsxs("label", { children: [
              t("Label", "Etiqueta"),
              /* @__PURE__ */ jsx(
                "input",
                {
                  value: label,
                  onChange: (event) => setLabel(event.target.value),
                  maxLength: 512
                }
              )
            ] }),
            /* @__PURE__ */ jsx("button", { type: "submit", children: t("Apply label", "Aplicar etiqueta") })
          ]
        }
      ),
      free && /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          onClick: () => {
            const scene = materialize(snapshot.document);
            dispatch(
              store,
              [
                { type: "scene.set", scene },
                {
                  type: "nodes.set-lock",
                  ids: [node.id],
                  locked: !isNodeLocked(snapshot.document, node.id)
                }
              ],
              "Toggle lock"
            );
          },
          children: isNodeLocked(snapshot.document, node.id) ? t("Unlock", "Desbloquear") : t("Lock", "Bloquear")
        }
      )
    ] }),
    node && free && /* @__PURE__ */ jsx(EditorNodeGeometry, { nodeId: node.id }),
    /* @__PURE__ */ jsx(EditorStructuredInspector, {}),
    /* @__PURE__ */ jsx(EditorRelations, {}),
    /* @__PURE__ */ jsx(EditorRoute, {}),
    /* @__PURE__ */ jsx("h3", { children: t("Appearance", "Apariencia") }),
    /* @__PURE__ */ jsxs("label", { children: [
      t("Theme", "Tema"),
      /* @__PURE__ */ jsxs(
        "select",
        {
          "aria-label": t("Theme", "Tema"),
          value: snapshot.document.presentation.theme.mode,
          onChange: (event) => {
            const presentation = structuredClone(snapshot.document.presentation);
            presentation.theme.mode = event.target.value;
            dispatch(store, [{ type: "presentation.set", presentation }], "Change theme");
          },
          children: [
            /* @__PURE__ */ jsx("option", { value: "light", children: t("Light", "Claro") }),
            /* @__PURE__ */ jsx("option", { value: "dark", children: t("Dark", "Oscuro") })
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("label", { children: [
      /* @__PURE__ */ jsx(
        "input",
        {
          type: "checkbox",
          checked: snapshot.document.presentation.grid.snap,
          onChange: (event) => {
            const presentation = structuredClone(snapshot.document.presentation);
            presentation.grid.snap = event.target.checked;
            dispatch(store, [{ type: "presentation.set", presentation }], "Toggle snap");
          }
        }
      ),
      t("Snap to grid", "Ajustar a cuadr\xEDcula")
    ] }),
    /* @__PURE__ */ jsxs("label", { children: [
      /* @__PURE__ */ jsx(
        "input",
        {
          type: "checkbox",
          checked: snapshot.document.presentation.grid.visible,
          onChange: (event) => {
            const presentation = structuredClone(snapshot.document.presentation);
            presentation.grid.visible = event.target.checked;
            dispatch(store, [{ type: "presentation.set", presentation }], "Toggle grid");
          }
        }
      ),
      t("Show grid", "Mostrar cuadr\xEDcula")
    ] }),
    error && /* @__PURE__ */ jsx("p", { role: "alert", children: error })
  ] });
}
function EditorJsonPanel() {
  const { store } = useEditor(), snapshot = useEditorSelector((s) => ({ document: s.document, draft: s.draft }), shallowEqual), t = useLabels();
  const serialized = useMemo(() => serializeDocument(snapshot.document), [snapshot.document]);
  const text = snapshot.draft.kind === "text" ? snapshot.draft.text : serialized;
  return /* @__PURE__ */ jsxs("details", { className: "adl-editor-json", children: [
    /* @__PURE__ */ jsx("summary", { children: t("Document JSON", "JSON del documento") }),
    /* @__PURE__ */ jsx(
      "textarea",
      {
        "aria-label": t("Document JSON", "JSON del documento"),
        value: text,
        onChange: (event) => store.setTextDraft(event.target.value),
        spellCheck: false
      }
    ),
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          disabled: snapshot.draft.kind !== "text",
          onClick: () => store.commitTextDraft(),
          children: t("Apply JSON", "Aplicar JSON")
        }
      ),
      /* @__PURE__ */ jsx("button", { type: "button", onClick: () => store.cancelTextDraft(), children: t("Discard draft", "Descartar borrador") })
    ] }),
    snapshot.draft.kind === "text" && snapshot.draft.diagnostics.length > 0 && /* @__PURE__ */ jsx("p", { role: "alert", children: snapshot.draft.diagnostics.map((d) => d.code).join(", ") })
  ] });
}
function EditorSelectionTools() {
  const { store } = useEditor(), snapshot = useEditorSelector(
    (s) => ({ document: s.document, selection: s.selection }),
    shallowEqual
  ), t = useLabels();
  const fragment = useRef(null), [hasCopy, setHasCopy] = useState(false), [clipboardBusy, setClipboardBusy] = useState(false), [arrangement, setArrangement] = useState("left"), [error, setError] = useState("");
  const free = getAdapter(snapshot.document.spec.type).capabilities.includes("move-free");
  function copy() {
    const result = createFragment(snapshot.document, [...snapshot.selection]);
    if (result.ok) {
      fragment.current = result.value;
      setHasCopy(true);
      setError("");
    } else setError(result.diagnostics.map((d) => d.code).join(", "));
    return result;
  }
  function paste(input = fragment.current) {
    if (input === void 0) return;
    const result = pasteFragment(store.getSnapshot().document, input, {
      idFactory: () => crypto.randomUUID(),
      offset: { x: 32, y: 32 }
    });
    if (!result.ok) {
      setError(result.diagnostics.map((d) => d.code).join(", "));
      return;
    }
    const previous = new Set(nodesOf(store.getSnapshot().document.spec).map((n) => n.id));
    const commit = dispatch(
      store,
      [{ type: "document.replace-content", document: result.value }],
      "Paste selection"
    );
    if (commit.status === "committed")
      store.setSelection(
        nodesOf(result.value.spec).filter((n) => !previous.has(n.id)).map((n) => ({ kind: "node", id: n.id }))
      );
    setError(commit.diagnostics.map((d) => d.code).join(", "));
  }
  async function systemClipboard(action) {
    if (clipboardBusy) return;
    setClipboardBusy(true);
    setError("");
    const revision = store.getSnapshot().document.revision;
    const documentId = store.getSnapshot().document.id;
    try {
      if (action === "copy") {
        if (!navigator.clipboard?.writeText) {
          setError("clipboard.unavailable");
          return;
        }
        const result = copy();
        if (result.ok) await navigator.clipboard.writeText(JSON.stringify(result.value));
      } else {
        if (!navigator.clipboard?.readText) {
          setError("clipboard.unavailable");
          return;
        }
        const text = await navigator.clipboard.readText();
        const current = store.getSnapshot().document;
        if (current.id !== documentId || current.revision !== revision) {
          setError("revision.stale");
          return;
        }
        if (new TextEncoder().encode(text).length > 1048576) {
          setError("limit.bytes");
          return;
        }
        let input;
        try {
          input = JSON.parse(text);
        } catch {
          setError("clipboard.invalid");
          return;
        }
        paste(input);
      }
    } catch {
      setError("clipboard.denied");
    } finally {
      setClipboardBusy(false);
    }
  }
  const nodeIds = snapshot.selection.filter((r) => r.kind === "node").map((r) => r.id);
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(
      "select",
      {
        "aria-label": t("Arrangement", "Alineaci\xF3n y distribuci\xF3n"),
        value: arrangement,
        onChange: (event) => setArrangement(event.target.value),
        children: [
          ["left", t("Align left", "Alinear izquierda")],
          ["right", t("Align right", "Alinear derecha")],
          ["top", t("Align top", "Alinear arriba")],
          ["bottom", t("Align bottom", "Alinear abajo")],
          ["center-x", t("Center horizontally", "Centrar horizontalmente")],
          ["center-y", t("Center vertically", "Centrar verticalmente")],
          ["horizontal", t("Distribute horizontally", "Distribuir horizontalmente")],
          ["vertical", t("Distribute vertically", "Distribuir verticalmente")]
        ].map(([value, label]) => /* @__PURE__ */ jsx("option", { value, children: label }, value))
      }
    ),
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        disabled: !free || nodeIds.length < (arrangement === "horizontal" || arrangement === "vertical" ? 3 : 2) || nodeIds.some((id) => isNodeLocked(snapshot.document, id)),
        onClick: () => {
          const current = store.getSnapshot().document;
          const scene = materialize(current);
          const positions = arrangeRects(
            nodeIds.map((id) => ({ id, ...scene.nodes[id] })),
            arrangement
          );
          const result = dispatch(
            store,
            [
              { type: "scene.set", scene },
              { type: "nodes.move", positions }
            ],
            "Arrange selection"
          );
          setError(result.diagnostics.map((d) => d.code).join(", "));
        },
        children: t("Arrange selection", "Organizar selecci\xF3n")
      }
    ),
    /* @__PURE__ */ jsx("button", { type: "button", disabled: !snapshot.selection.length, onClick: () => copy(), children: t("Copy", "Copiar") }),
    /* @__PURE__ */ jsx("button", { type: "button", disabled: !hasCopy || !free, onClick: () => paste(), children: t("Paste", "Pegar") }),
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        disabled: clipboardBusy || !snapshot.selection.length,
        onClick: () => void systemClipboard("copy"),
        children: t("Copy to clipboard", "Copiar al portapapeles")
      }
    ),
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        disabled: clipboardBusy || !free,
        onClick: () => void systemClipboard("paste"),
        children: t("Paste from clipboard", "Pegar del portapapeles")
      }
    ),
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        disabled: !snapshot.selection.length || !free,
        onClick: () => {
          const result = copy();
          if (result.ok) paste(result.value);
        },
        children: t("Duplicate", "Duplicar")
      }
    ),
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        disabled: nodeIds.length < 2 || !free,
        onClick: () => {
          const groups = structuredClone(snapshot.document.scene.groups);
          groups.forEach((g) => {
            g.nodeIds = g.nodeIds.filter((id) => !nodeIds.includes(id));
          });
          dispatch(
            store,
            [
              { type: "scene.set", scene: { ...structuredClone(snapshot.document.scene), groups } },
              {
                type: "group.upsert",
                group: {
                  id: crypto.randomUUID(),
                  label: t("Group", "Grupo"),
                  kind: "visual",
                  nodeIds,
                  locked: false
                }
              }
            ],
            "Group selection"
          );
        },
        children: t("Group", "Agrupar")
      }
    ),
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        disabled: !nodeIds.length || !snapshot.document.scene.groups.some((g) => g.nodeIds.some((id) => nodeIds.includes(id))),
        onClick: () => {
          const scene = structuredClone(snapshot.document.scene);
          const removed = new Set(
            scene.groups.filter((g) => g.nodeIds.some((id) => nodeIds.includes(id))).map((g) => g.id)
          );
          scene.groups = scene.groups.filter((g) => !removed.has(g.id));
          scene.groups.forEach((g) => {
            if (g.parentGroup && removed.has(g.parentGroup)) delete g.parentGroup;
          });
          dispatch(store, [{ type: "scene.set", scene }], "Ungroup selection");
        },
        children: t("Ungroup", "Desagrupar")
      }
    ),
    error && /* @__PURE__ */ jsx("span", { role: "alert", children: error })
  ] });
}
function EditorStructuredInspector() {
  const { store } = useEditor(), snapshot = useEditorSelector(
    (s) => ({ selection: s.selection, document: s.document }),
    shallowEqual
  ), t = useLabels();
  const type = snapshot.document.spec.type, ref = snapshot.selection.find((r) => r.kind === "node"), node = ref ? nodesOf(snapshot.document.spec).find((n) => n.id === ref.id) : void 0;
  const [error, setError] = useState("");
  if (!node) return null;
  const commitNode = (next, label) => {
    const result = getAdapter(type).replaceNode(snapshot.document.spec, {
      diagramType: type,
      node: next
    });
    if (!result.ok) {
      setError(result.diagnostics.map((d) => d.code).join(", "));
      return;
    }
    const commit = dispatch(
      store,
      [{ type: "spec.replace", spec: result.value, references: "reject" }],
      label
    );
    setError(commit.diagnostics.map((d) => d.code).join(", "));
  };
  if (type === "er") {
    const entity = node;
    return /* @__PURE__ */ jsxs("section", { "aria-label": t("Table fields", "Campos de la tabla"), children: [
      /* @__PURE__ */ jsx("h3", { children: t("Table fields", "Campos de la tabla") }),
      /* @__PURE__ */ jsx("ol", { className: "adl-editor-fields", children: entity.fields.map((field, index) => /* @__PURE__ */ jsxs("li", { children: [
        /* @__PURE__ */ jsx(
          "input",
          {
            "aria-label": `${t("Field name", "Nombre del campo")} ${index + 1}`,
            value: field.name,
            onChange: (event) => {
              const fields = entity.fields.map(
                (f, i) => i === index ? { ...f, name: event.target.value } : f
              );
              commitNode({ ...entity, fields }, "Rename field");
            }
          }
        ),
        /* @__PURE__ */ jsx(
          "input",
          {
            "aria-label": `${t("Field type", "Tipo del campo")} ${index + 1}`,
            value: field.type ?? "",
            placeholder: t("type", "tipo"),
            onChange: (event) => {
              const fields = entity.fields.map(
                (f, i) => i === index ? { ...f, type: event.target.value || void 0 } : f
              );
              commitNode({ ...entity, fields }, "Set field type");
            }
          }
        ),
        /* @__PURE__ */ jsxs(
          "select",
          {
            "aria-label": `${t("Field key", "Clave del campo")} ${index + 1}`,
            value: field.key ?? "",
            onChange: (event) => {
              const key = event.target.value || void 0;
              const fields = entity.fields.map((f, i) => i === index ? { ...f, key } : f);
              commitNode({ ...entity, fields }, "Set field key");
            },
            children: [
              /* @__PURE__ */ jsx("option", { value: "", children: "\u2014" }),
              /* @__PURE__ */ jsx("option", { value: "pk", children: "pk" }),
              /* @__PURE__ */ jsx("option", { value: "fk", children: "fk" }),
              /* @__PURE__ */ jsx("option", { value: "unique", children: "unique" })
            ]
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            "aria-label": `${t("Remove field", "Quitar campo")} ${index + 1}`,
            onClick: () => commitNode(
              {
                ...entity,
                fields: entity.fields.filter(
                  (field2, fieldIndex) => fieldIndex !== index
                )
              },
              "Remove field"
            ),
            children: "\xD7"
          }
        )
      ] }, index)) }),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          onClick: () => commitNode({ ...entity, fields: [...entity.fields, { name: "" }] }, "Add field"),
          children: t("Add field", "A\xF1adir campo")
        }
      ),
      error && /* @__PURE__ */ jsx("p", { role: "alert", children: error })
    ] });
  }
  if (type === "sequence") {
    const participants = nodesOf(snapshot.document.spec);
    return /* @__PURE__ */ jsxs("section", { "aria-label": t("Participants", "Participantes"), children: [
      /* @__PURE__ */ jsx("h3", { children: t("Participants", "Participantes") }),
      /* @__PURE__ */ jsx("ol", { children: participants.map((participant) => /* @__PURE__ */ jsxs("li", { children: [
        /* @__PURE__ */ jsx("span", { className: "adl-editor-mono", children: participant.label }),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            disabled: participants.length <= 1,
            "aria-label": `${t("Remove participant", "Quitar participante")}: ${participant.label}`,
            onClick: () => {
              const result = getAdapter("sequence").removeNodes(snapshot.document.spec, [
                participant.id
              ]);
              if (result.ok)
                dispatch(
                  store,
                  [
                    {
                      type: "spec.replace",
                      spec: result.value,
                      references: "prune-references"
                    }
                  ],
                  "Remove participant"
                );
            },
            children: "\xD7"
          }
        )
      ] }, participant.id)) }),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          onClick: () => {
            const id = globalThis.crypto.randomUUID();
            const result = getAdapter("sequence").insertNode(snapshot.document.spec, {
              diagramType: "sequence",
              node: { id, label: t("New participant", "Nuevo participante") }
            });
            if (result.ok) {
              dispatch(
                store,
                [{ type: "spec.replace", spec: result.value, references: "reject" }],
                "Add participant"
              );
              store.setSelection([{ kind: "node", id }]);
            }
          },
          children: t("Add participant", "A\xF1adir participante")
        }
      ),
      error && /* @__PURE__ */ jsx("p", { role: "alert", children: error })
    ] });
  }
  if (type === "swimlane") {
    const spec = snapshot.document.spec;
    if (spec.type !== "swimlane") return null;
    const swimNode = node;
    const laneId = swimNode.lane;
    const lanes = spec.lanes;
    const replaceLanes = (nextLanes, assignment, label) => {
      const nodes = nodesOf(spec);
      const assignments = {};
      for (const n of nodes) assignments[n.id] = assignment(n.lane, n.id, n);
      const result = getAdapter("swimlane").editStructure(spec, {
        type: "lanes.replace",
        lanes: nextLanes,
        assignments,
        removeNodeIds: []
      });
      if (result.ok)
        dispatch(store, [{ type: "spec.replace", spec: result.value, references: "reject" }], label);
      else setError(result.diagnostics.map((d) => d.code).join(", "));
    };
    return /* @__PURE__ */ jsxs("section", { "aria-label": t("Swimlane lanes", "Carriles"), children: [
      /* @__PURE__ */ jsx("h3", { children: t("Swimlane lanes", "Carriles") }),
      /* @__PURE__ */ jsxs("label", { children: [
        t("Lane", "Carril"),
        /* @__PURE__ */ jsx(
          "select",
          {
            "aria-label": t("Lane", "Carril"),
            value: laneId,
            onChange: (event) => commitNode({ ...swimNode, lane: event.target.value }, "Assign lane"),
            children: lanes.map((lane) => /* @__PURE__ */ jsx("option", { value: lane.id, children: lane.label }, lane.id))
          }
        )
      ] }),
      /* @__PURE__ */ jsx("ol", { children: lanes.map((lane) => /* @__PURE__ */ jsxs("li", { children: [
        /* @__PURE__ */ jsx("span", { className: "adl-editor-mono", children: lane.label }),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            disabled: lanes.length <= 1,
            "aria-label": `${t("Remove lane", "Quitar carril")}: ${lane.label}`,
            onClick: () => {
              const first = lanes.find((candidate) => candidate.id !== lane.id);
              replaceLanes(
                lanes.filter((candidate) => candidate.id !== lane.id),
                (source) => source === lane.id ? first.id : source,
                "Remove lane"
              );
            },
            children: "\xD7"
          }
        )
      ] }, lane.id)) }),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          onClick: () => replaceLanes(
            [
              ...lanes,
              { id: globalThis.crypto.randomUUID(), label: t("New lane", "Nuevo carril") }
            ],
            (source) => source,
            "Add lane"
          ),
          children: t("Add lane", "A\xF1adir carril")
        }
      ),
      error && /* @__PURE__ */ jsx("p", { role: "alert", children: error })
    ] });
  }
  if (type === "graph") {
    const graphNode = node;
    const ports = graphNode.ports ?? [];
    return /* @__PURE__ */ jsxs("section", { "aria-label": t("Ports", "Puertos"), children: [
      /* @__PURE__ */ jsx("h3", { children: t("Ports", "Puertos") }),
      /* @__PURE__ */ jsx("ol", { children: ports.map((port, index) => /* @__PURE__ */ jsxs("li", { children: [
        /* @__PURE__ */ jsx("span", { className: "adl-editor-mono", children: port.id }),
        /* @__PURE__ */ jsx(
          "select",
          {
            "aria-label": `${t("Port side", "Lado del puerto")} ${index + 1}`,
            value: port.side,
            onChange: (event) => {
              const next = ports.map(
                (p, i) => i === index ? { ...p, side: event.target.value } : p
              );
              commitNode({ ...graphNode, ports: next }, "Set port side");
            },
            children: ["top", "right", "bottom", "left"].map((side) => /* @__PURE__ */ jsx("option", { value: side, children: side }, side))
          }
        ),
        /* @__PURE__ */ jsx(
          "select",
          {
            "aria-label": `${t("Port direction", "Direcci\xF3n del puerto")} ${index + 1}`,
            value: port.direction,
            onChange: (event) => {
              const next = ports.map(
                (p, i) => i === index ? { ...p, direction: event.target.value } : p
              );
              commitNode({ ...graphNode, ports: next }, "Set port direction");
            },
            children: ["in", "out", "both"].map((direction) => /* @__PURE__ */ jsx("option", { value: direction, children: direction }, direction))
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            "aria-label": `${t("Remove port", "Quitar puerto")} ${index + 1}`,
            onClick: () => commitNode(
              { ...graphNode, ports: ports.filter((_, i) => i !== index) },
              "Remove port"
            ),
            children: "\xD7"
          }
        )
      ] }, port.id)) }),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          onClick: () => {
            const id = globalThis.crypto.randomUUID();
            commitNode(
              {
                ...graphNode,
                ports: [...ports, { id, side: "right", offset: 0.5, direction: "both" }]
              },
              "Add port"
            );
          },
          children: t("Add port", "A\xF1adir puerto")
        }
      ),
      error && /* @__PURE__ */ jsx("p", { role: "alert", children: error })
    ] });
  }
  return null;
}
function EditorNodeGeometry({ nodeId }) {
  const { store } = useEditor(), snapshot = useEditorSelector(
    (s) => ({ document: s.document, selection: s.selection }),
    shallowEqual
  ), t = useLabels();
  const scene = useMemo(() => materialize(snapshot.document), [snapshot.document]);
  const placement = scene.nodes[nodeId];
  const [values, setValues] = useState({ x: "0", y: "0", width: "240", height: "64" }), [error, setError] = useState("");
  useEffect(() => {
    if (placement)
      setValues({
        x: String(placement.x),
        y: String(placement.y),
        width: String(placement.width),
        height: String(placement.height)
      });
  }, [placement?.x, placement?.y, placement?.width, placement?.height, nodeId]);
  if (!placement) return null;
  return /* @__PURE__ */ jsxs(
    "form",
    {
      onSubmit: (event) => {
        event.preventDefault();
        const scene2 = materialize(snapshot.document), result = dispatch(
          store,
          [
            { type: "scene.set", scene: scene2 },
            {
              type: "nodes.move",
              positions: { [nodeId]: { x: Number(values.x), y: Number(values.y) } }
            },
            {
              type: "node.resize",
              id: nodeId,
              size: { width: Number(values.width), height: Number(values.height) }
            }
          ],
          "Set node geometry"
        );
        setError(result.diagnostics.map((d) => d.code).join(", "));
      },
      children: [
        /* @__PURE__ */ jsx("h3", { children: t("Position and size", "Posici\xF3n y tama\xF1o") }),
        /* @__PURE__ */ jsx("div", { className: "adl-editor-geometry", children: ["x", "y", "width", "height"].map((key) => /* @__PURE__ */ jsxs("label", { children: [
          key === "width" ? t("Width", "Ancho") : key === "height" ? t("Height", "Alto") : key.toUpperCase(),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "number",
              "aria-label": key === "width" ? t("Node width", "Ancho del nodo") : key === "height" ? t("Node height", "Alto del nodo") : key.toUpperCase(),
              value: values[key],
              onChange: (event) => setValues({ ...values, [key]: event.target.value })
            }
          )
        ] }, key)) }),
        /* @__PURE__ */ jsx("button", { type: "submit", disabled: isNodeLocked(snapshot.document, nodeId), children: t("Apply geometry", "Aplicar geometr\xEDa") }),
        error && /* @__PURE__ */ jsx("p", { role: "alert", children: error })
      ]
    }
  );
}
function EditorRelations() {
  const { store } = useEditor(), snapshot = useEditorSelector(
    (s) => ({ document: s.document, selection: s.selection }),
    shallowEqual
  ), t = useLabels();
  const nodes = nodesOf(snapshot.document.spec), [from, setFrom] = useState(""), [to, setTo] = useState(""), [label, setLabel] = useState(""), [error, setError] = useState("");
  if (snapshot.document.spec.type === "timeline") return null;
  const adapter = getAdapter(snapshot.document.spec.type);
  const source = nodes.some((n) => n.id === from) ? from : nodes[0]?.id ?? "", target = nodes.some((n) => n.id === to) ? to : nodes[1]?.id ?? source;
  return /* @__PURE__ */ jsxs("section", { children: [
    /* @__PURE__ */ jsx("h3", { children: t("Connections", "Conexiones") }),
    /* @__PURE__ */ jsxs(
      "form",
      {
        onSubmit: (event) => {
          event.preventDefault();
          const result = adapter.insertRelation(snapshot.document.spec, {
            diagramType: snapshot.document.spec.type,
            relation: {
              id: crypto.randomUUID(),
              from: source,
              to: target,
              ...label ? { label } : {}
            }
          });
          if (!result.ok) {
            setError(result.diagnostics.map((d) => d.code).join(", "));
            return;
          }
          const commit = dispatch(
            store,
            [{ type: "spec.replace", spec: result.value, references: "reject" }],
            "Connect nodes"
          );
          setError(commit.diagnostics.map((d) => d.code).join(", "));
        },
        children: [
          /* @__PURE__ */ jsxs("label", { children: [
            t("From", "Origen"),
            /* @__PURE__ */ jsx(
              "select",
              {
                "aria-label": t("Connection source", "Origen de conexi\xF3n"),
                value: source,
                onChange: (e) => setFrom(e.target.value),
                children: nodes.map((n) => /* @__PURE__ */ jsx("option", { value: n.id, children: n.label }, n.id))
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("label", { children: [
            t("To", "Destino"),
            /* @__PURE__ */ jsx(
              "select",
              {
                "aria-label": t("Connection target", "Destino de conexi\xF3n"),
                value: target,
                onChange: (e) => setTo(e.target.value),
                children: nodes.map((n) => /* @__PURE__ */ jsx("option", { value: n.id, children: n.label }, n.id))
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("label", { children: [
            t("Connection label", "Etiqueta de conexi\xF3n"),
            /* @__PURE__ */ jsx("input", { value: label, onChange: (e) => setLabel(e.target.value), maxLength: 512 })
          ] }),
          /* @__PURE__ */ jsx("button", { type: "submit", disabled: !source || !target, children: t("Connect", "Conectar") })
        ]
      }
    ),
    /* @__PURE__ */ jsxs("details", { children: [
      /* @__PURE__ */ jsxs("summary", { children: [
        t("Existing connections", "Conexiones existentes"),
        " (",
        edgesOf(snapshot.document.spec).length,
        ")"
      ] }),
      edgesOf(snapshot.document.spec).map((e) => /* @__PURE__ */ jsxs("div", { className: "adl-editor-relation", children: [
        /* @__PURE__ */ jsx("span", { children: e.label || `${e.from} \u2192 ${e.to}` }),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            "aria-label": t(`Delete connection ${e.id}`, `Eliminar conexi\xF3n ${e.id}`),
            onClick: () => {
              const result = adapter.removeRelations(snapshot.document.spec, [e.id]);
              if (result.ok)
                dispatch(
                  store,
                  [{ type: "spec.replace", spec: result.value, references: "prune-references" }],
                  "Delete connection"
                );
            },
            children: "\xD7"
          }
        )
      ] }, e.id))
    ] }),
    error && /* @__PURE__ */ jsx("p", { role: "alert", children: error })
  ] });
}
function EditorRoute() {
  const { store } = useEditor(), snapshot = useEditorSelector(
    (s) => ({ selection: s.selection, document: s.document }),
    shallowEqual
  ), t = useLabels();
  const ref = snapshot.selection.find((r) => r.kind === "edge"), edge = ref ? edgesOf(snapshot.document.spec).find((e) => e.id === ref.id) : void 0;
  const [error, setError] = useState("");
  if (!edge || !edge.id || !freeTypes.has(snapshot.document.spec.type)) return null;
  const edgeId = edge.id;
  const route = snapshot.document.scene.routes[edgeId];
  const manual = route?.mode === "manual" ? route : void 0;
  const setRoute = (next, label) => {
    const scene = materialize(snapshot.document);
    const commit = dispatch(
      store,
      [
        { type: "scene.set", scene },
        { type: "route.set", id: edgeId, route: next }
      ],
      label
    );
    setError(commit.diagnostics.map((d) => d.code).join(", "));
  };
  const toManual = () => {
    const result = resolveDocument(snapshot.document, {
      quality: "edit",
      requestId: "route-manual",
      skipValidation: true
    });
    if (!result.ok) {
      setError(result.diagnostics.map((d) => d.code).join(", "));
      return;
    }
    const placed = result.value.layout.edges.find((e) => e.id === edgeId);
    if (!placed) return;
    setRoute(
      {
        mode: "manual",
        source: { side: placed.fromSide, offset: 0.5 },
        target: { side: placed.toSide, offset: 0.5 },
        points: (placed.routePoints ?? []).slice(1, -1).map(([x, y]) => ({ x, y })).filter((point, index, all) => {
          const previous = all[index - 1];
          return !previous || previous.x !== point.x || previous.y !== point.y;
        }),
        label: placed.label ? { x: placed.labelX, y: placed.labelY } : void 0
      },
      "Set manual route"
    );
  };
  return /* @__PURE__ */ jsxs("section", { "aria-label": t("Connection route", "Ruta de la conexi\xF3n"), children: [
    /* @__PURE__ */ jsx("h3", { children: t("Connection route", "Ruta de la conexi\xF3n") }),
    /* @__PURE__ */ jsx("p", { className: "adl-editor-mono", children: edge.id }),
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        onClick: () => route?.mode === "manual" ? setRoute({ mode: "auto" }, "Set auto route") : toManual(),
        children: route?.mode === "manual" ? t("Auto route", "Ruta autom\xE1tica") : t("Manual route", "Ruta manual")
      }
    ),
    manual && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("ol", { children: manual.points.map((point, index) => /* @__PURE__ */ jsxs("li", { children: [
        /* @__PURE__ */ jsxs("span", { className: "adl-editor-mono", children: [
          point.x.toFixed(0),
          ", ",
          point.y.toFixed(0)
        ] }),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            "aria-label": `${t("Remove waypoint", "Quitar punto intermedio")} ${index + 1}`,
            onClick: () => setRoute(
              { ...manual, points: manual.points.filter((_, i) => i !== index) },
              "Remove waypoint"
            ),
            children: "\xD7"
          }
        )
      ] }, index)) }),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          onClick: () => {
            const points = manual.points;
            const previous = points[points.length - 1];
            const next = {
              ...manual,
              points: [
                ...points,
                previous ? { x: Math.round(previous.x + 24), y: Math.round(previous.y) } : { x: 0, y: 0 }
              ]
            };
            setRoute(next, "Add waypoint");
          },
          children: t("Add waypoint", "A\xF1adir punto intermedio")
        }
      )
    ] }),
    error && /* @__PURE__ */ jsx("p", { role: "alert", children: error })
  ] });
}
function useEditorStore(options) {
  const [store] = useState(() => createEditorStore(options));
  const generation = useRef(0);
  useEffect(() => {
    const active = ++generation.current;
    return () => {
      queueMicrotask(() => {
        if (generation.current === active) store.dispose();
      });
    };
  }, [store]);
  return store;
}
function EditorOutline({ className }) {
  const { store } = useEditor(), snapshot = useEditorSelector(
    (s) => ({ selection: s.selection, document: s.document }),
    shallowEqual
  ), t = useLabels();
  const nodes = nodesOf(snapshot.document.spec);
  const labels = new Map(nodes.map((n) => [n.id, n.label]));
  const sections = [
    {
      label: t("Nodes", "Nodos"),
      kind: "node",
      entities: nodes.map((n) => ({ id: n.id, label: n.label }))
    },
    {
      label: t("Connections", "Conexiones"),
      kind: "edge",
      entities: edgesOf(snapshot.document.spec).map((e) => ({
        id: e.id,
        label: `${labels.get(e.from)} \u2192 ${labels.get(e.to)}${e.label ? `: ${e.label}` : ""}`
      }))
    },
    {
      label: t("Groups", "Grupos"),
      kind: "group",
      entities: snapshot.document.scene.groups.map((g) => ({ id: g.id, label: g.label }))
    }
  ];
  return /* @__PURE__ */ jsxs("details", { className: `adl-editor-outline ${className ?? ""}`, children: [
    /* @__PURE__ */ jsx("summary", { children: t("Diagram outline", "Estructura del diagrama") }),
    /* @__PURE__ */ jsx("section", { role: "region", "aria-label": t("Diagram outline", "Estructura del diagrama"), children: sections.map((section) => /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsxs("h3", { children: [
        section.label,
        " (",
        section.entities.length,
        ")"
      ] }),
      /* @__PURE__ */ jsx("ul", { children: section.entities.map((entity) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          "aria-label": `${section.kind === "node" ? t("Select node", "Seleccionar nodo") : section.kind === "edge" ? t("Select connection", "Seleccionar conexi\xF3n") : t("Select group", "Seleccionar grupo")}: ${entity.label}`,
          "aria-pressed": snapshot.selection.some(
            (r) => r.kind === section.kind && r.id === entity.id
          ),
          onClick: (event) => {
            const ref = { kind: section.kind, id: entity.id };
            const current = store.getSnapshot().selection;
            store.setSelection(
              event.shiftKey ? current.some((r) => r.kind === ref.kind && r.id === ref.id) ? current.filter((r) => !(r.kind === ref.kind && r.id === ref.id)) : [...current, ref] : [ref]
            );
          },
          children: entity.label
        }
      ) }, entity.id)) })
    ] }, section.kind)) })
  ] });
}
export {
  EditorInspector,
  EditorJsonPanel,
  EditorNodeGeometry,
  EditorOutline,
  EditorRelations,
  EditorRoot,
  EditorRoute,
  EditorSelectionTools,
  EditorStatus,
  EditorStructuredInspector,
  EditorSurface,
  EditorToolbar,
  shallowEqual,
  useEditor,
  useEditorSelector,
  useEditorSnapshot,
  useEditorStore
};
