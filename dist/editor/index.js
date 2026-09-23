"use client";
import {
  createEditorStore,
  createFragment,
  fitViewport,
  pasteFragment,
  screenToWorld,
  zoomAt
} from "../chunk-J6DV6I5R.js";
import {
  createCanvasTextMeasurer,
  getAdapter,
  isNodeLocked,
  resolveDocument
} from "../chunk-GGCCJ4RU.js";
import "../chunk-VUW7SRON.js";
import "../chunk-P7FW66WE.js";
import {
  serializeDocument
} from "../chunk-35B4QVKF.js";
import "../chunk-QVERY2JP.js";
import {
  edgesOf,
  nodesOf
} from "../chunk-4NII3VRT.js";
import "../chunk-UHROM3FO.js";
import {
  renderSceneMarkup
} from "../chunk-JPBPMASF.js";
import {
  nodeGeometry
} from "../chunk-YKPE23VO.js";
import "../chunk-TVEV5XLW.js";
import "../chunk-KDAWQGDC.js";

// src/editor/index.tsx
import {
  createContext,
  useContext,
  useEffect,
  useId,
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
  return /* @__PURE__ */ jsx(Context.Provider, { value: { store, locale }, children });
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
function useEditorSelector(select) {
  return select(useEditorSnapshot());
}
function useLabels() {
  const { locale } = useEditor();
  return (en, es) => locale === "es" ? es : en;
}
function dispatch(store, commands, label) {
  return store.dispatch({
    id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
    label,
    expectedRevision: store.getSnapshot().document.revision,
    commands
  });
}
function materialize(document) {
  const result = resolveDocument(document, { quality: "edit", requestId: "gesture", measureText });
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
function EditorToolbar() {
  const { store } = useEditor(), snapshot = useEditorSnapshot(), t = useLabels();
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
        /* @__PURE__ */ jsx("span", { className: "adl-editor-status", role: "status", children: snapshot.dirty ? t("Unsaved changes", "Cambios sin guardar") : t("No pending changes", "Sin cambios pendientes") })
      ]
    }
  );
}
function EditorSurface({
  ariaLabel,
  className
}) {
  const { store } = useEditor(), snapshot = useEditorSnapshot(), t = useLabels(), instanceId = useId();
  const svgRef = useRef(null), [size, setSize] = useState({ width: 800, height: 600 });
  const activeDoc = snapshot.draft.kind === "gesture" ? snapshot.draft.preview : snapshot.document;
  const resolved = useMemo(
    () => resolveDocument(activeDoc, { quality: "edit", requestId: instanceId, measureText }),
    [activeDoc, instanceId]
  );
  const markup = useMemo(
    () => resolved.ok ? renderSceneMarkup(activeDoc, resolved.value, { instanceId }) : "",
    [activeDoc, resolved, instanceId]
  );
  const gesture = useRef(null);
  const marquee = useRef(null);
  const [selectionBox, setSelectionBox] = useState(null);
  const authoredNodes = useMemo(() => {
    const ids = new Set(nodesOf(activeDoc.spec).map((n) => n.id));
    return resolved.ok ? resolved.value.layout.nodes.filter((n) => ids.has(n.id)) : [];
  }, [activeDoc.spec, resolved]);
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
      const baseline = selection.additive ? selection.selection : [];
      store.setSelection([
        ...baseline,
        ...selected.filter((n) => !baseline.some((r) => r.kind === n.kind && r.id === n.id))
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
    const dx = point.x - current.start.x, dy = point.y - current.start.y, positions = {}, grid = snapshot.document.presentation.grid;
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
      store.previewGesture([{ type: "scene.set", scene: current.scene }, ...resizeCommands]);
      return;
    }
    for (const [id, start] of Object.entries(current.positions)) {
      const x = start.x + dx / current.viewport.zoom, y = start.y + dy / current.viewport.zoom;
      positions[id] = {
        x: grid.snap ? Math.round(x / grid.size) * grid.size : x,
        y: grid.snap ? Math.round(y / grid.size) * grid.size : y
      };
    }
    store.previewGesture([
      { type: "scene.set", scene: current.scene },
      { type: "nodes.move", positions }
    ]);
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
            measureText
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
    if (!gesture.current.pan) {
      if (cancel) store.cancelGesture();
      else {
        flushMove();
        store.commitGesture();
      }
    }
    gesture.current = null;
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
  return /* @__PURE__ */ jsxs("div", { className: `adl-editor-surface ${className ?? ""}`, children: [
    /* @__PURE__ */ jsx(
      "svg",
      {
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
            "[data-hit-node], [data-resize-node], [data-resize-selection]"
          ), resizeId = target?.getAttribute("data-resize-node") ?? void 0, resizeSelection = target?.hasAttribute("data-resize-selection") ?? false, id = resizeId ?? target?.getAttribute("data-hit-node");
          const pan = snapshot.tool === "hand" || event.button === 1 || spacePan.current;
          if (!pan && !id && !resizeSelection) {
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
          }
        },
        children: /* @__PURE__ */ jsxs(
          "g",
          {
            transform: `translate(${snapshot.viewport.x} ${snapshot.viewport.y}) scale(${snapshot.viewport.zoom})`,
            children: [
              /* @__PURE__ */ jsx("g", { dangerouslySetInnerHTML: { __html: markup } }),
              authoredNodes.map((n) => /* @__PURE__ */ jsx("g", { children: /* @__PURE__ */ jsx(
                "rect",
                {
                  "data-hit-node": n.id,
                  x: nodeGeometry(n).hit.x,
                  y: nodeGeometry(n).hit.y,
                  width: nodeGeometry(n).hit.width,
                  height: nodeGeometry(n).hit.height,
                  rx: 4,
                  fill: "transparent",
                  stroke: snapshot.selection.some((r) => r.kind === "node" && r.id === n.id) ? activeDoc.presentation.theme[activeDoc.presentation.theme.mode].cobalt : "none",
                  strokeWidth: 2 / snapshot.viewport.zoom,
                  tabIndex: 0,
                  role: "button",
                  "aria-label": n.label,
                  "aria-pressed": snapshot.selection.some((r) => r.kind === "node" && r.id === n.id),
                  onFocus: () => {
                    if (!snapshot.selection.some((r) => r.kind === "node" && r.id === n.id))
                      store.setSelection([{ kind: "node", id: n.id }]);
                  },
                  onKeyDown: (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      store.setSelection([{ kind: "node", id: n.id }]);
                    }
                  }
                }
              ) }, n.id)),
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
                  const rects = ids.map((resizeId) => scene.nodes[resizeId]).filter((node) => node).map((node) => ({ x: node.x, y: node.y, width: node.width, height: node.height }));
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
    !resolved.ok && /* @__PURE__ */ jsx("p", { role: "alert", children: resolved.diagnostics.map((d) => d.code).join(", ") })
  ] });
}
function EditorInspector() {
  const { store } = useEditor(), snapshot = useEditorSnapshot(), t = useLabels();
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
    /* @__PURE__ */ jsx(EditorRelations, {}),
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
  const { store } = useEditor(), snapshot = useEditorSnapshot(), t = useLabels();
  const text = snapshot.draft.kind === "text" ? snapshot.draft.text : serializeDocument(snapshot.document);
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
  const { store } = useEditor(), snapshot = useEditorSnapshot(), t = useLabels();
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
function EditorNodeGeometry({ nodeId }) {
  const { store } = useEditor(), snapshot = useEditorSnapshot(), t = useLabels();
  const placement = materialize(snapshot.document).nodes[nodeId];
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
        const scene = materialize(snapshot.document), result = dispatch(
          store,
          [
            { type: "scene.set", scene },
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
  const { store } = useEditor(), snapshot = useEditorSnapshot(), t = useLabels();
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
  const { store } = useEditor(), snapshot = useEditorSnapshot(), t = useLabels();
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
  EditorSelectionTools,
  EditorSurface,
  EditorToolbar,
  useEditor,
  useEditorSelector,
  useEditorSnapshot,
  useEditorStore
};
