"use client";
import {
  findReach,
  findRoute,
  graphSnapshot,
  relationsOf,
  searchNodes
} from "../chunk-23MOXLIZ.js";
import {
  downloadArtifact,
  exportCard
} from "../chunk-AUK774CG.js";
import {
  resolveDocument
} from "../chunk-EAOYH4UI.js";
import "../chunk-VUW7SRON.js";
import "../chunk-P7FW66WE.js";
import "../chunk-3MHLUDWC.js";
import "../chunk-QVERY2JP.js";
import {
  canonical,
  failure,
  success
} from "../chunk-6NELNSRC.js";
import "../chunk-UHROM3FO.js";
import {
  renderSvg
} from "../chunk-FE2JPGPT.js";
import "../chunk-KDAWQGDC.js";
import "../chunk-YKPE23VO.js";
import "../chunk-TVEV5XLW.js";

// src/viewer/DiagramViewer.tsx
import { useEffect as useEffect2, useMemo as useMemo3, useRef as useRef4, useState as useState3 } from "react";

// src/viewer/Finder.tsx
import { useId, useMemo, useRef, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
function Finder({ graph, label, onSelect, placeholder, disabled }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef(null);
  const listId = useId();
  const results = useMemo(() => searchNodes(graph, query, 8), [graph, query]);
  const open = query.length > 0 && results.length > 0;
  function choose(nodeId) {
    onSelect(nodeId);
    setQuery("");
    setActive(0);
    input.current?.focus();
  }
  function onKeyDown(event) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && results.length) {
      event.preventDefault();
      choose(results[active]?.id ?? results[0].id);
    } else if (event.key === "Escape") {
      setQuery("");
      setActive(0);
    }
  }
  return /* @__PURE__ */ jsxs("div", { className: "adl-viewer-finder", children: [
    /* @__PURE__ */ jsx(
      "input",
      {
        ref: input,
        role: "combobox",
        "aria-label": label,
        "aria-expanded": open,
        "aria-controls": open ? listId : void 0,
        "aria-autocomplete": "list",
        value: query,
        disabled,
        placeholder,
        onChange: (event) => {
          setQuery(event.target.value);
          setActive(0);
        },
        onKeyDown
      }
    ),
    open && /* @__PURE__ */ jsx("ul", { className: "adl-viewer-finder-results", id: listId, role: "listbox", "aria-label": label, children: results.map((result, index) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(
      "button",
      {
        type: "button",
        role: "option",
        "aria-selected": index === active,
        className: index === active ? "adl-viewer-active" : void 0,
        onClick: () => choose(result.id),
        onMouseEnter: () => setActive(index),
        children: [
          /* @__PURE__ */ jsx("span", { children: result.label }),
          /* @__PURE__ */ jsxs("span", { className: "adl-viewer-finder-meta", children: [
            result.id,
            result.kind ? ` \xB7 ${result.kind}` : ""
          ] })
        ]
      }
    ) }, result.id)) }),
    query.length > 0 && results.length === 0 && /* @__PURE__ */ jsxs("p", { className: "adl-viewer-finder-empty", role: "status", children: [
      "No matches for \u201C",
      query,
      "\u201D."
    ] })
  ] });
}

// src/viewer/Inspector.tsx
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
var safeScheme = /^(https?:|mailto:)/i;
function safeLinks(links) {
  return (links ?? []).filter((link) => safeScheme.test(link.href) && !/["<>]/.test(link.href));
}
function Inspector({ document: document2, graph, entity, onSelect, t }) {
  if (!entity)
    return /* @__PURE__ */ jsx2("div", { className: "adl-viewer-inspector adl-viewer-inspector-empty", children: t("Select an entity to inspect.", "Selecciona una entidad para inspeccionarla.") });
  const labelOf = (id) => graph.nodes.find((node2) => node2.id === id)?.label ?? id;
  if (entity.kind === "edge") {
    const edge = graph.edges.find((candidate) => candidate.id === entity.id);
    if (!edge)
      return /* @__PURE__ */ jsx2("div", { className: "adl-viewer-inspector", children: /* @__PURE__ */ jsx2("p", { role: "status", children: t(
        "This relation is no longer in the document.",
        "Esta relaci\xF3n ya no est\xE1 en el documento."
      ) }) });
    const metadata2 = document2.metadata.edges[edge.id];
    const links2 = safeLinks(metadata2?.links);
    return /* @__PURE__ */ jsxs2("div", { className: "adl-viewer-inspector", children: [
      /* @__PURE__ */ jsx2("h3", { children: /* @__PURE__ */ jsx2("span", { className: "adl-viewer-mono", children: edge.id }) }),
      /* @__PURE__ */ jsxs2("p", { children: [
        labelOf(edge.from),
        " ",
        /* @__PURE__ */ jsx2("span", { "aria-hidden": "true", children: "\u2192" }),
        " ",
        labelOf(edge.to)
      ] }),
      edge.label ? /* @__PURE__ */ jsxs2("p", { className: "adl-viewer-muted", children: [
        t("Label:", "Etiqueta:"),
        " ",
        edge.label
      ] }) : null,
      edge.variant ? /* @__PURE__ */ jsx2("p", { className: "adl-viewer-muted", children: edge.variant }) : null,
      links2.length > 0 && /* @__PURE__ */ jsx2("ul", { className: "adl-viewer-links", children: links2.map((link) => /* @__PURE__ */ jsx2("li", { children: /* @__PURE__ */ jsx2("a", { href: link.href, target: "_blank", rel: "noreferrer", children: link.label }) }, link.href)) })
    ] });
  }
  const node = graph.nodes.find((candidate) => candidate.id === entity.id);
  if (!node)
    return /* @__PURE__ */ jsx2("div", { className: "adl-viewer-inspector", children: /* @__PURE__ */ jsx2("p", { role: "status", children: t(
      "This entity is no longer in the document.",
      "Esta entidad ya no est\xE1 en el documento."
    ) }) });
  const metadata = document2.metadata.nodes[node.id];
  const links = safeLinks(metadata?.links);
  const relations = relationsOf(graph, node.id);
  const incoming = relations.ok ? relations.value.incoming : [];
  const outgoing = relations.ok ? relations.value.outgoing : [];
  return /* @__PURE__ */ jsxs2("div", { className: "adl-viewer-inspector", children: [
    /* @__PURE__ */ jsx2("h3", { children: node.label }),
    /* @__PURE__ */ jsx2("p", { className: "adl-viewer-mono adl-viewer-id", children: node.id }),
    node.kind ? /* @__PURE__ */ jsx2("p", { className: "adl-viewer-kind", children: node.kind }) : null,
    node.description ? /* @__PURE__ */ jsx2("p", { children: node.description }) : null,
    metadata?.roles?.length ? /* @__PURE__ */ jsxs2("p", { className: "adl-viewer-muted", children: [
      t("Roles:", "Roles:"),
      " ",
      metadata.roles.join(", ")
    ] }) : null,
    links.length > 0 && /* @__PURE__ */ jsx2("ul", { className: "adl-viewer-links", children: links.map((link) => /* @__PURE__ */ jsx2("li", { children: /* @__PURE__ */ jsx2("a", { href: link.href, target: "_blank", rel: "noreferrer", children: link.label }) }, link.href)) }),
    /* @__PURE__ */ jsx2("h4", { children: t("Incoming", "Entrantes") }),
    incoming.length === 0 ? /* @__PURE__ */ jsx2("p", { className: "adl-viewer-muted", children: t("None.", "Ninguna.") }) : /* @__PURE__ */ jsx2("ul", { className: "adl-viewer-relations", children: incoming.map((relation) => /* @__PURE__ */ jsx2("li", { children: /* @__PURE__ */ jsxs2("button", { type: "button", onClick: () => onSelect({ kind: "edge", id: relation.edgeId }), children: [
      /* @__PURE__ */ jsx2("span", { children: labelOf(relation.from) }),
      /* @__PURE__ */ jsx2("span", { className: "adl-viewer-mono", children: relation.edgeId })
    ] }) }, relation.edgeId)) }),
    /* @__PURE__ */ jsx2("h4", { children: t("Outgoing", "Salientes") }),
    outgoing.length === 0 ? /* @__PURE__ */ jsx2("p", { className: "adl-viewer-muted", children: t("None.", "Ninguna.") }) : /* @__PURE__ */ jsx2("ul", { className: "adl-viewer-relations", children: outgoing.map((relation) => /* @__PURE__ */ jsx2("li", { children: /* @__PURE__ */ jsxs2("button", { type: "button", onClick: () => onSelect({ kind: "edge", id: relation.edgeId }), children: [
      /* @__PURE__ */ jsx2("span", { children: labelOf(relation.to) }),
      /* @__PURE__ */ jsx2("span", { className: "adl-viewer-mono", children: relation.edgeId })
    ] }) }, relation.edgeId)) })
  ] });
}

// src/viewer/Minimap.tsx
import { useMemo as useMemo2, useRef as useRef2 } from "react";
import { jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
function Minimap({
  svg,
  layoutWidth,
  layoutHeight,
  camera,
  viewWorldSize,
  onNavigate
}) {
  const frame = useRef2(null);
  const scale = useMemo2(() => {
    const width = 180;
    return layoutWidth > 0 ? width / layoutWidth : 1;
  }, [layoutWidth]);
  const viewport = {
    left: (camera.x - viewWorldSize.width / 2 / camera.zoom) * scale,
    top: (camera.y - viewWorldSize.height / 2 / camera.zoom) * scale,
    width: viewWorldSize.width / camera.zoom * scale,
    height: viewWorldSize.height / camera.zoom * scale
  };
  function moveTo(event) {
    const bounds = frame.current?.getBoundingClientRect();
    if (!bounds) return;
    const x = (event.clientX - bounds.left) / scale;
    const y = (event.clientY - bounds.top) / scale;
    onNavigate({ x, y });
  }
  return /* @__PURE__ */ jsxs3(
    "div",
    {
      ref: frame,
      className: "adl-viewer-minimap",
      role: "button",
      "aria-label": "Overview map. Click to navigate the diagram.",
      onPointerDown: (event) => {
        ;
        event.currentTarget.setPointerCapture(event.pointerId);
        moveTo(event);
      },
      onPointerMove: (event) => {
        if (event.buttons !== 1) return;
        moveTo(event);
      },
      children: [
        /* @__PURE__ */ jsx3(
          "div",
          {
            className: "adl-viewer-minimap-svg",
            style: { width: layoutWidth * scale, height: layoutHeight * scale },
            dangerouslySetInnerHTML: { __html: svg }
          }
        ),
        /* @__PURE__ */ jsx3(
          "div",
          {
            className: "adl-viewer-minimap-viewport",
            style: {
              left: viewport.left,
              top: viewport.top,
              width: Math.max(24, viewport.width),
              height: Math.max(16, viewport.height)
            }
          }
        )
      ]
    }
  );
}

// src/viewer/Presentation.tsx
import { useEffect, useRef as useRef3, useState as useState2 } from "react";
import { jsxs as jsxs4 } from "react/jsx-runtime";
function Presentation({ children, trigger, onExit, label }) {
  const [mode, setMode] = useState2("off");
  const shell = useRef3(null);
  const [active, setActive] = useState2(false);
  function enter() {
    const element = shell.current;
    if (!element) return;
    if (document.fullscreenEnabled) {
      element.requestFullscreen().then(
        () => {
          setMode("fullscreen");
          setActive(true);
        },
        () => {
          setMode("fallback");
          setActive(true);
        }
      );
    } else {
      setMode("fallback");
      setActive(true);
    }
  }
  function exit() {
    if (mode === "fullscreen" && document.fullscreenElement) void document.exitFullscreen();
    setActive(false);
    onExit();
  }
  useEffect(() => {
    if (!active) return;
    const onKey = (event) => {
      if (event.key === "Escape") exit();
    };
    const onFullscreen = () => {
      if (!document.fullscreenElement) {
        setActive(false);
        onExit();
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFullscreen);
    };
  }, [active, mode]);
  return /* @__PURE__ */ jsxs4(
    "div",
    {
      ref: shell,
      className: active ? "adl-viewer-presentation adl-viewer-presentation-active" : "adl-viewer-presentation",
      children: [
        active && /* @__PURE__ */ jsxs4(
          "button",
          {
            type: "button",
            className: "adl-viewer-presentation-exit",
            onClick: exit,
            "aria-label": label,
            children: [
              "\u2715 ",
              label
            ]
          }
        ),
        children,
        trigger(enter)
      ]
    }
  );
}

// src/viewer/motion.ts
var StoryPlayback = class {
  constructor(steps, callbacks, environment = {}, owner = "story") {
    this.steps = steps;
    this.callbacks = callbacks;
    this.clock = environment.clock ?? (() => performance.now());
    this.setTimer = environment.setTimer ?? ((callback, ms) => setTimeout(callback, ms));
    this.clearTimer = environment.clearTimer ?? ((handle) => clearTimeout(handle));
    this.ownsMotion = owner;
    void this.clock;
  }
  steps;
  stepIndex = -1;
  timer;
  state = "idle";
  callbacks;
  clock;
  setTimer;
  clearTimer;
  ownsMotion;
  getOwner() {
    return this.state === "idle" || this.state === "ended" ? null : this.ownsMotion;
  }
  getState() {
    return this.state;
  }
  getIndex() {
    return this.stepIndex;
  }
  play(fromIndex) {
    if (this.steps.length === 0) return false;
    this.clearTimer(this.timer);
    this.timer = void 0;
    this.stepIndex = Math.max(0, fromIndex ?? this.stepIndex);
    this.state = "playing";
    this.callbacks.onStep(this.stepIndex);
    this.scheduleNext();
    return true;
  }
  pause() {
    if (this.state !== "playing") return;
    this.clearTimer(this.timer);
    this.timer = void 0;
    this.state = "paused";
  }
  next() {
    if (this.steps.length === 0) return false;
    this.clearTimer(this.timer);
    this.timer = void 0;
    const next = Math.min(this.stepIndex + 1, this.steps.length - 1);
    if (next === this.stepIndex) return false;
    this.stepIndex = next;
    this.callbacks.onStep(this.stepIndex);
    if (this.state === "playing") this.scheduleNext();
    return true;
  }
  prev() {
    if (this.steps.length === 0) return false;
    this.clearTimer(this.timer);
    this.timer = void 0;
    const previous = Math.max(this.stepIndex - 1, 0);
    if (previous === this.stepIndex) return false;
    this.stepIndex = previous;
    this.callbacks.onStep(this.stepIndex);
    if (this.state === "playing") this.scheduleNext();
    return true;
  }
  stop() {
    this.clearTimer(this.timer);
    this.timer = void 0;
    if (this.state !== "idle" && this.state !== "ended") this.callbacks.onStop();
    this.state = "idle";
    this.stepIndex = -1;
  }
  end() {
    this.clearTimer(this.timer);
    this.timer = void 0;
    if (this.state === "playing") this.callbacks.onEnd();
    this.state = "ended";
  }
  dispose() {
    this.clearTimer(this.timer);
    this.timer = void 0;
    this.state = "idle";
    this.stepIndex = -1;
  }
  scheduleNext() {
    if (this.state !== "playing") return;
    const step = this.steps[this.stepIndex];
    this.clearTimer(this.timer);
    this.timer = void 0;
    if (this.stepIndex >= this.steps.length - 1) {
      this.timer = this.setTimer(() => this.end(), step.durationMs);
      return;
    }
    this.timer = this.setTimer(() => {
      this.stepIndex += 1;
      this.callbacks.onStep(this.stepIndex);
      this.scheduleNext();
    }, step.durationMs);
  }
};
function createMotionOwnerGuard() {
  let owner = null;
  return {
    get owner() {
      return owner;
    },
    claim(next) {
      if (owner !== null && owner !== next) return false;
      owner = next;
      return true;
    },
    release(previous) {
      if (owner === previous) owner = null;
    }
  };
}

// src/viewer/views.ts
function lensMatches(document2, nodeId, lens) {
  const metadata = document2.metadata.nodes[nodeId];
  const roles = metadata?.roles ?? [];
  const tags = metadata?.tags ?? [];
  if (lens.nodeRoles?.length && !lens.nodeRoles.some((role) => roles.includes(role))) return false;
  if (lens.tags?.length && !lens.tags.some((tag) => tags.includes(tag))) return false;
  return true;
}
function lensFacets(document2) {
  const roles = [], tags = [];
  for (const id of Object.keys(document2.metadata.nodes)) {
    const metadata = document2.metadata.nodes[id];
    for (const role of metadata?.roles ?? []) if (!roles.includes(role)) roles.push(role);
    for (const tag of metadata?.tags ?? []) if (!tags.includes(tag)) tags.push(tag);
  }
  return { roles, tags };
}
function resolveView(document2, viewId) {
  const view = document2.views.find((candidate) => candidate.id === viewId);
  if (!view) return failure("view.reference");
  return success({
    view,
    focusNodes: new Set(view.focus.nodeIds),
    focusEdges: new Set(view.focus.edgeIds)
  });
}
function describeStoryStep(document2, graph, step) {
  const view = document2.views.find((candidate) => candidate.id === step.viewId);
  if (!view) return failure("view.reference");
  if (step.routeEdgeIds?.length) {
    const route2 = findRoute(graph, step.routeEdgeIds[0], step.routeEdgeIds[0]);
    if (!route2.ok) return route2;
  }
  const focusNodes = [...view.focus.nodeIds];
  if (focusNodes.length < 2) return success({ step, view, directRoute: null });
  const route = findRoute(graph, focusNodes[0], focusNodes[1]);
  if (!route.ok) return route;
  return success({
    step,
    view,
    directRoute: route.value.status === "found" ? route.value : null
  });
}
function encodeViewerState(state) {
  const parts = [];
  if (state.viewId !== void 0) parts.push(`v=${encodeURIComponent(state.viewId)}`);
  if (state.focus !== void 0) {
    parts.push(
      `f=${encodeURIComponent([...state.focus.nodeIds, ...state.focus.edgeIds].join(","))}`
    );
    parts.push(
      `k=${encodeURIComponent(`${state.focus.nodeIds.length}:${state.focus.edgeIds.length}`)}`
    );
  }
  if (state.camera !== void 0)
    parts.push(
      `c=${encodeURIComponent(`${state.camera.x},${state.camera.y},${state.camera.zoom}`)}`
    );
  return parts.join("&");
}
function decodeViewerState(text, document2) {
  if (!text) return success({});
  const parsed = new URLSearchParams(text);
  const viewId = parsed.get("v") ?? void 0;
  const focusText = parsed.get("f");
  const kinds = parsed.get("k");
  const cameraText = parsed.get("c");
  let focus;
  if (focusText !== null && focusText !== void 0) {
    const ids = focusText.split(",").filter(Boolean);
    let nodeCount = ids.length;
    if (kinds !== null && kinds !== void 0) {
      const [nodes, edges] = kinds.split(":").map(Number);
      if (!Number.isInteger(nodes) || !Number.isInteger(edges) || nodes + edges !== ids.length)
        return failure("query.invalid");
      nodeCount = nodes;
    }
    focus = { nodeIds: ids.slice(0, nodeCount), edgeIds: ids.slice(nodeCount) };
    const nodeIds = new Set(document2.spec ? graphNodeIds(document2) : []);
    const edgeIds = new Set(document2.spec ? graphEdgeIds(document2) : []);
    if (focus.nodeIds.some((id) => !nodeIds.has(id)) || focus.edgeIds.some((id) => !edgeIds.has(id)))
      return failure("query.invalid");
  }
  let camera;
  if (cameraText !== null && cameraText !== void 0) {
    const [x, y, zoom] = cameraText.split(",").map(Number);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(zoom) || zoom < 0.1 || zoom > 4)
      return failure("layout.range");
    camera = { x, y, zoom };
  }
  if (viewId !== void 0) {
    const view = document2.views.find((candidate) => candidate.id === viewId);
    if (!view) {
      return success({ camera });
    }
    if (focus !== void 0) {
      const matches = view.focus.nodeIds.length === focus.nodeIds.length && view.focus.edgeIds.length === focus.edgeIds.length && [...view.focus.nodeIds].every((id, index) => id === focus.nodeIds[index]) && [...view.focus.edgeIds].every((id, index) => id === focus.edgeIds[index]);
      if (!matches) return failure("query.invalid");
    }
    return success({ viewId, focus: focus ?? { ...view.focus }, camera });
  }
  if (focus !== void 0) return success({ focus, camera });
  return success({ camera });
}
function graphNodeIds(document2) {
  return graphSnapshot(document2).nodeIds;
}
function graphEdgeIds(document2) {
  return graphSnapshot(document2).edges.map((edge) => edge.id);
}

// src/viewer/query.ts
function queryReceipt(query) {
  return {
    documentId: query.result.documentId,
    revision: query.result.revision,
    ...query.result.filter ? { filter: query.result.filter } : {}
  };
}
function isQueryStale(query, document2) {
  if (!query) return false;
  return query.result.documentId !== document2.id || query.result.revision !== document2.revision;
}
function queryHighlight(query) {
  if (!query) return void 0;
  return {
    nodes: new Set(query.result.nodeIds),
    edges: new Set(query.result.edgeIds)
  };
}
function queryEdgeIds(query) {
  if (!query) return [];
  return [...query.result.edgeIds];
}
function highlightStyle(accent) {
  return `<style>[data-query-highlight="true"]>rect,[data-query-highlight="true"]>circle{stroke:${accent};stroke-width:2.5}[data-query-highlight="true"]>text{fill:${accent}}[data-query-highlight="true"]>path{stroke:${accent} !important;stroke-width:3}</style>`;
}
function exportQuerySvg(document2, scene, query, options) {
  const accent = document2.presentation.theme[options.theme].cobalt;
  let svg = renderSvg(document2, scene, {
    instanceId: "viewer-export",
    theme: options.theme,
    background: "theme",
    highlight: queryHighlight(query)
  });
  svg = svg.replace(/<\/svg>$/, `${highlightStyle(accent)}</svg>`);
  if (options.includeSource) {
    const data = canonical(document2).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    svg = svg.replace(/<\/svg>$/, `<metadata id="aesthc-source">${data}</metadata></svg>`);
  }
  return svg;
}
function querySummary(query, graph, t) {
  if (!query) return null;
  const labelOf = (id) => graph.nodes.find((node) => node.id === id)?.label ?? id;
  if (query.kind === "route") {
    const result2 = query.result;
    if (result2.status === "unreachable")
      return t(
        `No route from ${labelOf(query.origin)} to ${labelOf(query.destination ?? "")}.`,
        `Sin ruta de ${labelOf(query.origin)} a ${labelOf(query.destination ?? "")}.`
      );
    return t(
      `Route ${labelOf(query.origin)} \u2192 ${labelOf(query.destination ?? "")}: ${result2.nodeIds.length} nodes, ${result2.edgeIds.length} edges.`,
      `Ruta ${labelOf(query.origin)} \u2192 ${labelOf(query.destination ?? "")}: ${result2.nodeIds.length} nodos, ${result2.edgeIds.length} relaciones.`
    );
  }
  const result = query.result;
  const truncated = result.truncated ? t(" truncated.", ", truncado.") : ".";
  return t(
    `Reach from ${labelOf(query.origin)} ${result.direction}: ${result.nodeIds.length} nodes, ${result.edgeIds.length} edges${truncated}`,
    `Alcance desde ${labelOf(query.origin)} ${result.direction === "upstream" ? "ascendente" : "descendente"}: ${result.nodeIds.length} nodos, ${result.edgeIds.length} relaciones${truncated}`
  );
}

// src/viewer/DiagramViewer.tsx
import { jsx as jsx4, jsxs as jsxs5 } from "react/jsx-runtime";
var ZOOM_MIN = 0.1;
var ZOOM_MAX = 4;
function DiagramViewer({ document: document2, locale = "en", className }) {
  const t = (en, es) => locale === "es" ? es : en;
  const graph = useMemo3(() => graphSnapshot(document2), [document2]);
  const scene = useMemo3(
    () => resolveDocument(document2, { quality: "edit", requestId: "viewer", skipDiagnostics: true }),
    [document2]
  );
  const [selection, setSelection] = useState3(null);
  const [origin, setOrigin] = useState3(null);
  const [destination, setDestination] = useState3(null);
  const [direction, setDirection] = useState3("downstream");
  const [query, setQuery] = useState3(null);
  const [camera, setCamera] = useState3({ x: 0, y: 0, zoom: 1 });
  const [viewSize, setViewSize] = useState3({ width: 960, height: 420 });
  const canvasHost = useRef4(null);
  const collapseSelect = useRef4(null);
  const presentTrigger = useRef4(null);
  const [lens, setLens] = useState3({});
  const [collapsed, setCollapsed] = useState3(/* @__PURE__ */ new Set());
  const [storyIndex, setStoryIndex] = useState3(-1);
  const [storyPlaying, setStoryPlaying] = useState3(false);
  const [storyFocus, setStoryFocus] = useState3(
    null
  );
  const [reducedMotion, setReducedMotion] = useState3(
    () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const stale = isQueryStale(query, document2);
  const queryHighlightSet = stale || !query ? void 0 : queryHighlight(query);
  const highlight = storyFocus ?? queryHighlightSet;
  const lensSet = useMemo3(() => {
    if (!lens.nodeRoles?.length && !lens.tags?.length) return void 0;
    const dim = /* @__PURE__ */ new Set();
    for (const node of graph.nodes) if (!lensMatches(document2, node.id, lens)) dim.add(node.id);
    return dim.size ? dim : void 0;
  }, [document2, graph, lens]);
  const collapse = useMemo3(() => {
    if (collapsed.size === 0 || !scene.ok) return null;
    const members = /* @__PURE__ */ new Set();
    const queue = [...collapsed];
    for (let i = 0; i < queue.length; i++) {
      const group = document2.scene.groups.find((g) => g.id === queue[i]);
      group?.nodeIds.forEach((id) => members.add(id));
      document2.scene.groups.filter((g) => g.parentGroup === queue[i]).forEach((g) => queue.push(g.id));
    }
    const rects = /* @__PURE__ */ new Map();
    for (const container of scene.value.layout.containers ?? [])
      if (collapsed.has(container.id)) rects.set(container.id, container);
    const proxies = graph.edges.filter((edge) => members.has(edge.from) !== members.has(edge.to)).map((edge) => {
      const outsideId = members.has(edge.from) ? edge.to : edge.from;
      const insideId = members.has(edge.from) ? edge.from : edge.to;
      const group = [...rects.entries()].find(([, rect2]) => {
        const inside = scene.value.layout.nodeById[insideId];
        return inside && inside.x >= rect2.x && inside.y >= rect2.y && inside.x <= rect2.x + rect2.w && inside.y <= rect2.y + rect2.h;
      });
      const outside = scene.value.layout.nodeById[outsideId];
      if (!outside || !group) return null;
      const rect = group[1];
      const cx = rect.x + rect.w / 2;
      const cy = rect.y + rect.h / 2;
      const angle = Math.atan2(outside.y - cy, outside.x - cx);
      const edgePoint = {
        x: cx + Math.cos(angle) * rect.w / 2,
        y: cy + Math.sin(angle) * rect.h / 2
      };
      return { edge, outside, edgePoint, label: `${group[0]}\xB7${edge.id}` };
    }).filter((proxy) => proxy !== null);
    return { members, proxies, rects };
  }, [collapsed, document2, graph, scene]);
  const exclude = useMemo3(() => {
    if (!collapse) return void 0;
    const internalEdges = /* @__PURE__ */ new Set();
    for (const edge of graph.edges)
      if (collapse.members.has(edge.from) && collapse.members.has(edge.to))
        internalEdges.add(edge.id);
    return { nodes: collapse.members, edges: internalEdges };
  }, [collapse, graph]);
  const svg = useMemo3(
    () => scene.ok ? renderSvg(document2, scene.value, {
      instanceId: "viewer",
      theme: document2.presentation.theme.mode,
      highlight,
      dim: lensSet,
      exclude
    }) : "",
    [document2, scene, highlight, lensSet, exclude]
  );
  const relationsEnabled = graph.edges.length > 0;
  const summary = querySummary(query, graph, t);
  const edgeIds = queryEdgeIds(query);
  const facets = useMemo3(() => lensFacets(document2), [document2]);
  const story = document2.story;
  const fit = useMemo3(
    () => () => {
      if (!scene.ok) return;
      const layout = scene.value.layout;
      const width = canvasHost.current?.clientWidth ?? viewSize.width;
      const height = canvasHost.current?.clientHeight ?? viewSize.height;
      const zoom = Math.min(width / layout.width, height / layout.height, 1);
      setCamera({
        x: layout.width / 2,
        y: layout.height / 2,
        zoom: Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom))
      });
    },
    [scene]
  );
  useEffect2(() => {
    const host = canvasHost.current;
    if (!host) return;
    const measure = () => {
      const rect = host.getBoundingClientRect();
      if (rect.width > 0) setViewSize({ width: rect.width, height: rect.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    fit();
    return () => observer.disconnect();
  }, [fit, document2.id, document2.revision]);
  const owner = useRef4(createMotionOwnerGuard());
  const playback = useRef4(null);
  useEffect2(() => {
    playback.current?.dispose();
    playback.current = null;
    setStoryIndex(-1);
    setStoryPlaying(false);
    setStoryFocus(null);
    if (story.length === 0) return;
    playback.current = new StoryPlayback(story, {
      onStep: (index) => {
        const step = story[index];
        if (!step) return;
        const view = resolveView(document2, step.viewId);
        if (!view.ok) return;
        setStoryIndex(index);
        setStoryFocus({ nodes: view.value.focusNodes, edges: view.value.focusEdges });
        if (view.value.view.camera) setCamera(view.value.view.camera);
      },
      onEnd: () => {
        setStoryPlaying(false);
        setStoryIndex(-1);
        setStoryFocus(null);
        owner.current.release("story");
      },
      onStop: () => {
        setStoryPlaying(false);
        setStoryIndex(-1);
        setStoryFocus(null);
        owner.current.release("story");
      }
    });
    return () => playback.current?.dispose();
  }, [document2, story]);
  function stopStory() {
    playback.current?.stop();
    setStoryPlaying(false);
    setStoryFocus(null);
  }
  function playStory() {
    if (!playback.current || reducedMotion) return;
    if (!owner.current.claim("story")) {
      stopStory();
      return;
    }
    setQuery(null);
    setStoryPlaying(true);
    playback.current.play();
  }
  useEffect2(() => {
    if (!storyPlaying) return;
    const stop = () => stopStory();
    const onKey = (event) => {
      if (event.key === "Escape") stop();
    };
    const onVisibility = () => {
      if (window.document.hidden) stop();
    };
    window.document.addEventListener("keydown", onKey);
    window.document.addEventListener("visibilitychange", onVisibility);
    window.document.addEventListener("beforeprint", stop);
    canvasHost.current?.addEventListener("pointerdown", stop, { once: true });
    return () => {
      window.document.removeEventListener("keydown", onKey);
      window.document.removeEventListener("visibilitychange", onVisibility);
      window.document.removeEventListener("beforeprint", stop);
    };
  }, [storyPlaying]);
  useEffect2(() => {
    if (typeof matchMedia === "undefined") return;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => {
      setReducedMotion(media.matches);
      if (media.matches) stopStory();
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  function runRoute() {
    if (!origin || !destination) return;
    stopStory();
    const route = findRoute(graph, origin, destination);
    if (!route.ok) return;
    setQuery({ kind: "route", origin, destination, result: route.value });
  }
  function runReach() {
    if (!origin) return;
    stopStory();
    const reach = findReach(graph, origin, direction);
    if (!reach.ok) return;
    setQuery({ kind: "reach", origin, direction, result: reach.value });
  }
  function clearQuery() {
    stopStory();
    setQuery(null);
    setOrigin(null);
    setDestination(null);
    setSelection(null);
  }
  function exportQuery() {
    if (!query || stale || !scene.ok) return;
    const artifact = {
      bytes: new TextEncoder().encode(
        exportQuerySvg(document2, scene.value, query, {
          theme: document2.presentation.theme.mode
        })
      ),
      receipt: {
        documentId: document2.id,
        revision: document2.revision,
        format: "svg",
        mimeType: "image/svg+xml",
        bytes: 0,
        scope: "document",
        canonical: false,
        sourceIncluded: false,
        verified: false,
        diagnostics: []
      }
    };
    artifact.receipt.bytes = artifact.bytes.byteLength;
    downloadArtifact(artifact, "query.svg");
  }
  async function exportCardPng() {
    if (!query || stale || !scene.ok) return;
    const artifact = await exportCard(document2, {
      query: {
        documentId: document2.id,
        revision: document2.revision,
        nodeIds: [...query.result.nodeIds],
        edgeIds: [...query.result.edgeIds],
        label: summary ?? ""
      }
    });
    if (!artifact.ok) return;
    downloadArtifact(artifact.value, "card.png");
  }
  function zoomBy(factor) {
    setCamera((current) => ({
      ...current,
      zoom: Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, current.zoom * factor))
    }));
  }
  function panTo(event) {
    const host = canvasHost.current;
    if (!host || !scene.ok) return;
    const rect = host.getBoundingClientRect();
    const dx = event.clientX - rect.left - rect.width / 2;
    const dy = event.clientY - rect.top - rect.height / 2;
    setCamera((current) => ({
      x: current.x - dx / current.zoom,
      y: current.y - dy / current.zoom,
      zoom: current.zoom
    }));
  }
  const viewWorldSize = {
    width: viewSize.width / camera.zoom,
    height: viewSize.height / camera.zoom
  };
  const proxyMarkup = useMemo3(() => {
    if (!collapse || !scene.ok) return "";
    const theme = document2.presentation.theme[document2.presentation.theme.mode];
    return collapse.proxies.map(
      (proxy) => `<g class="adl-viewer-proxy" data-proxy-edge-id="${proxy.edge.id}"><line x1="${proxy.outside.x + proxy.outside.w / 2}" y1="${proxy.outside.y + proxy.outside.h / 2}" x2="${proxy.edgePoint.x}" y2="${proxy.edgePoint.y}" stroke="${theme.border}" stroke-dasharray="3 4"/><rect x="${proxy.edgePoint.x - 18}" y="${proxy.edgePoint.y - 9}" width="36" height="18" rx="9" fill="${theme.card}" stroke="${theme.cobalt}"/><text x="${proxy.edgePoint.x}" y="${proxy.edgePoint.y + 3.5}" text-anchor="middle" font-family="Geist Mono, monospace" font-size="9" fill="${theme.cobalt}">${proxy.edge.id}</text></g>`
    ).join("");
  }, [collapse, document2, scene]);
  const overlayMarkup = useMemo3(() => {
    if (!proxyMarkup) return "";
    return `<svg class="adl-viewer-proxy-layer" viewBox="0 0 ${scene.ok ? scene.value.layout.width : 1} ${scene.ok ? scene.value.layout.height : 1}" aria-hidden="true">${proxyMarkup}</svg>`;
  }, [proxyMarkup, scene]);
  return /* @__PURE__ */ jsxs5(
    "section",
    {
      className: `adl-viewer${className ? ` ${className}` : ""}`,
      "data-theme": document2.presentation.theme.mode,
      "aria-label": t("Semantic viewer", "Visor sem\xE1ntico"),
      children: [
        /* @__PURE__ */ jsxs5("header", { className: "adl-viewer-header", children: [
          /* @__PURE__ */ jsxs5("div", { children: [
            /* @__PURE__ */ jsx4("h2", { children: document2.spec.caption || t("Untitled diagram", "Diagrama sin t\xEDtulo") }),
            /* @__PURE__ */ jsxs5("p", { className: "adl-viewer-muted", children: [
              t("Revision", "Revisi\xF3n"),
              " ",
              document2.revision
            ] })
          ] }),
          /* @__PURE__ */ jsxs5("div", { className: "adl-viewer-controls", children: [
            /* @__PURE__ */ jsx4(
              Finder,
              {
                graph,
                label: t("Origin node", "Nodo de origen"),
                placeholder: t("Origin\u2026", "Origen\u2026"),
                disabled: !relationsEnabled,
                onSelect: (id) => {
                  setOrigin(id);
                  setSelection({ kind: "node", id });
                }
              }
            ),
            origin && /* @__PURE__ */ jsxs5("span", { className: "adl-viewer-origin", children: [
              "\u2713 ",
              origin
            ] }),
            query?.kind !== "reach" && /* @__PURE__ */ jsx4(
              Finder,
              {
                graph,
                label: t("Destination node", "Nodo de destino"),
                placeholder: t("Destination\u2026", "Destino\u2026"),
                disabled: !relationsEnabled,
                onSelect: (id) => {
                  setDestination(id);
                  setSelection({ kind: "node", id });
                }
              }
            ),
            destination && /* @__PURE__ */ jsxs5("span", { className: "adl-viewer-origin", children: [
              "\u2713 ",
              destination
            ] }),
            /* @__PURE__ */ jsxs5("label", { className: "adl-viewer-direction", children: [
              t("Direction", "Direcci\xF3n"),
              /* @__PURE__ */ jsxs5(
                "select",
                {
                  "aria-label": t("Direction", "Direcci\xF3n"),
                  value: direction,
                  onChange: (event) => setDirection(event.target.value),
                  children: [
                    /* @__PURE__ */ jsx4("option", { value: "downstream", children: t("Downstream", "Descendente") }),
                    /* @__PURE__ */ jsx4("option", { value: "upstream", children: t("Upstream", "Ascendente") })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsx4(
              "button",
              {
                type: "button",
                onClick: runRoute,
                disabled: !relationsEnabled || !origin || !destination,
                children: t("Show route", "Mostrar ruta")
              }
            ),
            /* @__PURE__ */ jsx4("button", { type: "button", onClick: runReach, disabled: !relationsEnabled || !origin, children: t("Show reach", "Mostrar alcance") }),
            /* @__PURE__ */ jsx4("button", { type: "button", onClick: clearQuery, children: t("Clear", "Limpiar") })
          ] })
        ] }),
        facets.roles.length > 0 || facets.tags.length > 0 ? /* @__PURE__ */ jsxs5("div", { className: "adl-viewer-lensbar", children: [
          /* @__PURE__ */ jsxs5("label", { children: [
            t("Roles", "Roles"),
            /* @__PURE__ */ jsxs5(
              "select",
              {
                "aria-label": t("Role lens", "Lente de roles"),
                value: lens.nodeRoles?.[0] ?? "",
                onChange: (event) => setLens((current) => ({
                  ...current,
                  nodeRoles: event.target.value ? [event.target.value] : void 0
                })),
                children: [
                  /* @__PURE__ */ jsx4("option", { value: "", children: t("All", "Todos") }),
                  facets.roles.map((role) => /* @__PURE__ */ jsx4("option", { value: role, children: role }, role))
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxs5("label", { children: [
            t("Tags", "Etiquetas"),
            /* @__PURE__ */ jsxs5(
              "select",
              {
                "aria-label": t("Tag lens", "Lente de etiquetas"),
                value: lens.tags?.[0] ?? "",
                onChange: (event) => setLens((current) => ({
                  ...current,
                  tags: event.target.value ? [event.target.value] : void 0
                })),
                children: [
                  /* @__PURE__ */ jsx4("option", { value: "", children: t("All", "Todos") }),
                  facets.tags.map((tag) => /* @__PURE__ */ jsx4("option", { value: tag, children: tag }, tag))
                ]
              }
            )
          ] }),
          document2.scene.groups.length > 0 && /* @__PURE__ */ jsxs5("label", { children: [
            t("Collapse", "Colapsar"),
            /* @__PURE__ */ jsxs5(
              "select",
              {
                "aria-label": t("Collapse group", "Colapsar grupo"),
                defaultValue: "",
                ref: collapseSelect,
                onChange: (event) => {
                  const id = event.target.value;
                  if (id) {
                    setCollapsed((current) => new Set(current).add(id));
                    if (collapseSelect.current) collapseSelect.current.value = "";
                  }
                },
                children: [
                  /* @__PURE__ */ jsx4("option", { value: "", children: t("None", "Ninguno") }),
                  document2.scene.groups.map((group) => /* @__PURE__ */ jsx4("option", { value: group.id, children: group.label }, group.id))
                ]
              }
            )
          ] }),
          collapsed.size > 0 && /* @__PURE__ */ jsx4("button", { type: "button", onClick: () => setCollapsed(/* @__PURE__ */ new Set()), children: t("Expand all", "Expandir todo") })
        ] }) : null,
        !relationsEnabled && /* @__PURE__ */ jsx4("p", { className: "adl-viewer-note", children: t(
          "This diagram has no relations; route and reach are unavailable.",
          "Este diagrama no tiene relaciones; la ruta y el alcance no est\xE1n disponibles."
        ) }),
        stale && query && /* @__PURE__ */ jsx4("p", { className: "adl-viewer-note", role: "status", children: t(
          "The document changed. The previous route, highlight and export were invalidated.",
          "El documento cambi\xF3. La ruta anterior, el resaltado y la exportaci\xF3n quedaron invalidados."
        ) }),
        /* @__PURE__ */ jsxs5(
          Presentation,
          {
            label: t("Exit presentation", "Salir de presentaci\xF3n"),
            onExit: () => presentTrigger.current?.focus(),
            trigger: (activate) => /* @__PURE__ */ jsx4("button", { ref: presentTrigger, type: "button", onClick: activate, children: t("Present", "Presentar") }),
            children: [
              /* @__PURE__ */ jsxs5(
                "div",
                {
                  ref: canvasHost,
                  className: "adl-viewer-canvas",
                  role: "img",
                  "aria-label": document2.spec.caption,
                  onPointerDown: (event) => {
                    if (event.target !== event.currentTarget) return;
                    event.currentTarget.setPointerCapture(event.pointerId);
                  },
                  onPointerMove: (event) => {
                    if (event.buttons !== 1 || event.target !== event.currentTarget) return;
                    panTo(event);
                  },
                  children: [
                    scene.ok ? /* @__PURE__ */ jsx4(
                      "div",
                      {
                        className: "adl-viewer-stage",
                        style: {
                          width: scene.value.layout.width,
                          height: scene.value.layout.height,
                          transform: `translate(${camera.x - viewWorldSize.width / 2}px, ${camera.y - viewWorldSize.height / 2}px) scale(${camera.zoom})`,
                          transformOrigin: "0 0"
                        },
                        dangerouslySetInnerHTML: { __html: svg }
                      }
                    ) : /* @__PURE__ */ jsx4("p", { className: "adl-viewer-note", role: "alert", children: scene.diagnostics.map((diagnostic) => diagnostic.code).join(", ") }),
                    scene.ok && collapse && /* @__PURE__ */ jsx4(
                      "div",
                      {
                        className: "adl-viewer-overlay",
                        dangerouslySetInnerHTML: { __html: overlayMarkup }
                      }
                    )
                  ]
                }
              ),
              /* @__PURE__ */ jsxs5("div", { className: "adl-viewer-camera", children: [
                /* @__PURE__ */ jsx4("button", { type: "button", onClick: () => zoomBy(1.25), "aria-label": t("Zoom in", "Acercar"), children: "+" }),
                /* @__PURE__ */ jsx4(
                  "button",
                  {
                    type: "button",
                    onClick: () => zoomBy(1 / 1.25),
                    "aria-label": t("Zoom out", "Alejar"),
                    children: "\u2212"
                  }
                ),
                /* @__PURE__ */ jsx4("button", { type: "button", onClick: fit, children: t("Fit", "Ajustar") }),
                /* @__PURE__ */ jsxs5("span", { className: "adl-viewer-muted", role: "status", "aria-label": t("Zoom", "Zoom"), children: [
                  Math.round(camera.zoom * 100),
                  "%"
                ] })
              ] })
            ]
          }
        ),
        story.length > 0 && /* @__PURE__ */ jsxs5("div", { className: "adl-viewer-story", role: "group", "aria-label": t("Story", "Historia"), children: [
          storyPlaying ? /* @__PURE__ */ jsx4("button", { type: "button", onClick: () => playback.current?.pause(), children: t("Pause", "Pausar") }) : /* @__PURE__ */ jsx4(
            "button",
            {
              type: "button",
              onClick: playStory,
              disabled: reducedMotion,
              title: reducedMotion ? t(
                "Reduced motion: use Next and Previous for static navigation.",
                "Movimiento reducido: usa Siguiente y Anterior para la navegaci\xF3n est\xE1tica."
              ) : void 0,
              children: t("Play", "Reproducir")
            }
          ),
          /* @__PURE__ */ jsx4("button", { type: "button", onClick: () => playback.current?.prev(), children: t("Previous", "Anterior") }),
          /* @__PURE__ */ jsx4("button", { type: "button", onClick: () => playback.current?.next(), children: t("Next", "Siguiente") }),
          /* @__PURE__ */ jsx4("button", { type: "button", onClick: stopStory, children: t("Stop", "Detener") }),
          /* @__PURE__ */ jsx4("span", { role: "status", children: storyIndex >= 0 ? `${storyIndex + 1}/${story.length}` : t("Stopped", "Detenido") }),
          reducedMotion && /* @__PURE__ */ jsx4("span", { className: "adl-viewer-muted", children: t("Reduced motion: static navigation.", "Movimiento reducido: navegaci\xF3n est\xE1tica.") })
        ] }),
        scene.ok && /* @__PURE__ */ jsx4(
          Minimap,
          {
            svg,
            layoutWidth: scene.value.layout.width,
            layoutHeight: scene.value.layout.height,
            camera,
            viewWorldSize,
            onNavigate: (center) => setCamera((current) => ({ ...current, ...center }))
          }
        ),
        (summary || query || storyIndex >= 0) && /* @__PURE__ */ jsxs5("div", { className: "adl-viewer-querybar", children: [
          /* @__PURE__ */ jsx4("p", { role: "status", children: storyIndex >= 0 && !query ? t(`Story step ${storyIndex + 1}.`, `Paso ${storyIndex + 1} de la historia.`) : summary ?? "" }),
          edgeIds.length > 0 && !storyFocus && /* @__PURE__ */ jsx4("ul", { className: "adl-viewer-edgeids", "aria-label": t("Relation IDs", "IDs de relaciones"), children: edgeIds.map((edgeId) => /* @__PURE__ */ jsx4("li", { children: /* @__PURE__ */ jsx4(
            "button",
            {
              type: "button",
              className: "adl-viewer-mono",
              onClick: () => setSelection({ kind: "edge", id: edgeId }),
              children: edgeId
            }
          ) }, edgeId)) }),
          /* @__PURE__ */ jsx4(
            "button",
            {
              type: "button",
              onClick: exportQuery,
              disabled: !query || stale || !scene.ok || !!storyFocus,
              "aria-describedby": stale ? "adl-viewer-stale" : void 0,
              children: t("Export query SVG", "Exportar SVG de la consulta")
            }
          ),
          /* @__PURE__ */ jsx4(
            "button",
            {
              type: "button",
              onClick: () => void exportCardPng(),
              disabled: !query || stale || !scene.ok || !!storyFocus,
              children: t("Export card PNG", "Exportar card PNG")
            }
          ),
          /* @__PURE__ */ jsx4("span", { id: "adl-viewer-stale", hidden: true, children: t("Export requires a current query.", "La exportaci\xF3n requiere una consulta vigente.") })
        ] }),
        /* @__PURE__ */ jsx4(
          Inspector,
          {
            document: document2,
            graph,
            entity: selection,
            onSelect: setSelection,
            t
          }
        )
      ]
    }
  );
}
export {
  DiagramViewer,
  Finder,
  Inspector,
  Minimap,
  Presentation,
  StoryPlayback,
  createMotionOwnerGuard,
  decodeViewerState,
  describeStoryStep,
  encodeViewerState,
  exportQuerySvg,
  findReach,
  findRoute,
  graphSnapshot,
  highlightStyle,
  isQueryStale,
  lensFacets,
  lensMatches,
  queryEdgeIds,
  queryHighlight,
  queryReceipt,
  querySummary,
  relationsOf,
  resolveView,
  searchNodes
};
