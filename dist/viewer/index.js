"use client";
import {
  findReach,
  findRoute,
  graphSnapshot,
  relationsOf,
  searchNodes
} from "../chunk-23MOXLIZ.js";
import {
  downloadArtifact
} from "../chunk-2XWH2XWY.js";
import {
  resolveDocument
} from "../chunk-FTHHFRVE.js";
import "../chunk-VUW7SRON.js";
import "../chunk-P7FW66WE.js";
import "../chunk-3MHLUDWC.js";
import "../chunk-QVERY2JP.js";
import {
  canonical
} from "../chunk-6NELNSRC.js";
import "../chunk-UHROM3FO.js";
import {
  renderSvg
} from "../chunk-7OXXAMDF.js";
import "../chunk-KDAWQGDC.js";
import "../chunk-YKPE23VO.js";
import "../chunk-TVEV5XLW.js";

// src/viewer/DiagramViewer.tsx
import { useMemo as useMemo2, useState as useState2 } from "react";

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
function Inspector({ document, graph, entity, onSelect, t }) {
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
    const metadata2 = document.metadata.edges[edge.id];
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
  const metadata = document.metadata.nodes[node.id];
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

// src/viewer/query.ts
function queryReceipt(query) {
  return {
    documentId: query.result.documentId,
    revision: query.result.revision,
    ...query.result.filter ? { filter: query.result.filter } : {}
  };
}
function isQueryStale(query, document) {
  if (!query) return false;
  return query.result.documentId !== document.id || query.result.revision !== document.revision;
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
function exportQuerySvg(document, scene, query, options) {
  const accent = document.presentation.theme[options.theme].cobalt;
  let svg = renderSvg(document, scene, {
    instanceId: "viewer-export",
    theme: options.theme,
    background: "theme",
    highlight: queryHighlight(query)
  });
  svg = svg.replace(/<\/svg>$/, `${highlightStyle(accent)}</svg>`);
  if (options.includeSource) {
    const data = canonical(document).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
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
import { jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
function DiagramViewer({ document, locale = "en", className }) {
  const t = (en, es) => locale === "es" ? es : en;
  const graph = useMemo2(() => graphSnapshot(document), [document]);
  const scene = useMemo2(
    () => resolveDocument(document, { quality: "edit", requestId: "viewer", skipDiagnostics: true }),
    [document]
  );
  const [selection, setSelection] = useState2(null);
  const [origin, setOrigin] = useState2(null);
  const [destination, setDestination] = useState2(null);
  const [direction, setDirection] = useState2("downstream");
  const [query, setQuery] = useState2(null);
  const stale = isQueryStale(query, document);
  const highlight = stale || !query ? void 0 : queryHighlight(query);
  const svg = useMemo2(
    () => scene.ok ? renderSvg(document, scene.value, {
      instanceId: "viewer",
      theme: document.presentation.theme.mode,
      highlight
    }) : "",
    [document, scene, highlight]
  );
  const relationsEnabled = graph.edges.length > 0;
  const summary = querySummary(query, graph, t);
  const edgeIds = queryEdgeIds(query);
  function runRoute() {
    if (!origin || !destination) return;
    const route = findRoute(graph, origin, destination);
    if (!route.ok) return;
    setQuery({ kind: "route", origin, destination, result: route.value });
  }
  function runReach() {
    if (!origin) return;
    const reach = findReach(graph, origin, direction);
    if (!reach.ok) return;
    setQuery({ kind: "reach", origin, direction, result: reach.value });
  }
  function clearQuery() {
    setQuery(null);
    setOrigin(null);
    setDestination(null);
    setSelection(null);
  }
  function exportQuery() {
    if (!query || stale || !scene.ok) return;
    const artifact = {
      bytes: new TextEncoder().encode(
        exportQuerySvg(document, scene.value, query, {
          theme: document.presentation.theme.mode
        })
      ),
      receipt: {
        documentId: document.id,
        revision: document.revision,
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
  return /* @__PURE__ */ jsxs3(
    "section",
    {
      className: `adl-viewer${className ? ` ${className}` : ""}`,
      "data-theme": document.presentation.theme.mode,
      "aria-label": t("Semantic viewer", "Visor sem\xE1ntico"),
      children: [
        /* @__PURE__ */ jsxs3("header", { className: "adl-viewer-header", children: [
          /* @__PURE__ */ jsxs3("div", { children: [
            /* @__PURE__ */ jsx3("h2", { children: document.spec.caption || t("Untitled diagram", "Diagrama sin t\xEDtulo") }),
            /* @__PURE__ */ jsxs3("p", { className: "adl-viewer-muted", children: [
              t("Revision", "Revisi\xF3n"),
              " ",
              document.revision
            ] })
          ] }),
          /* @__PURE__ */ jsxs3("div", { className: "adl-viewer-controls", children: [
            /* @__PURE__ */ jsx3(
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
            origin && /* @__PURE__ */ jsxs3("span", { className: "adl-viewer-origin", children: [
              "\u2713 ",
              origin
            ] }),
            query?.kind !== "reach" && /* @__PURE__ */ jsx3(
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
            destination && /* @__PURE__ */ jsxs3("span", { className: "adl-viewer-origin", children: [
              "\u2713 ",
              destination
            ] }),
            /* @__PURE__ */ jsxs3("label", { className: "adl-viewer-direction", children: [
              t("Direction", "Direcci\xF3n"),
              /* @__PURE__ */ jsxs3(
                "select",
                {
                  "aria-label": t("Direction", "Direcci\xF3n"),
                  value: direction,
                  onChange: (event) => setDirection(event.target.value),
                  children: [
                    /* @__PURE__ */ jsx3("option", { value: "downstream", children: t("Downstream", "Descendente") }),
                    /* @__PURE__ */ jsx3("option", { value: "upstream", children: t("Upstream", "Ascendente") })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsx3(
              "button",
              {
                type: "button",
                onClick: runRoute,
                disabled: !relationsEnabled || !origin || !destination,
                children: t("Show route", "Mostrar ruta")
              }
            ),
            /* @__PURE__ */ jsx3("button", { type: "button", onClick: runReach, disabled: !relationsEnabled || !origin, children: t("Show reach", "Mostrar alcance") }),
            /* @__PURE__ */ jsx3("button", { type: "button", onClick: clearQuery, children: t("Clear", "Limpiar") })
          ] })
        ] }),
        !relationsEnabled && /* @__PURE__ */ jsx3("p", { className: "adl-viewer-note", children: t(
          "This diagram has no relations; route and reach are unavailable.",
          "Este diagrama no tiene relaciones; la ruta y el alcance no est\xE1n disponibles."
        ) }),
        stale && query && /* @__PURE__ */ jsx3("p", { className: "adl-viewer-note", role: "status", children: t(
          "The document changed. The previous route, highlight and export were invalidated.",
          "El documento cambi\xF3. La ruta anterior, el resaltado y la exportaci\xF3n quedaron invalidados."
        ) }),
        scene.ok ? /* @__PURE__ */ jsx3(
          "div",
          {
            className: "adl-viewer-canvas",
            role: "img",
            "aria-label": document.spec.caption,
            dangerouslySetInnerHTML: { __html: svg }
          }
        ) : /* @__PURE__ */ jsx3("p", { className: "adl-viewer-note", role: "alert", children: scene.diagnostics.map((diagnostic) => diagnostic.code).join(", ") }),
        (summary || query) && /* @__PURE__ */ jsxs3("div", { className: "adl-viewer-querybar", children: [
          /* @__PURE__ */ jsx3("p", { role: "status", children: summary ?? "" }),
          edgeIds.length > 0 && /* @__PURE__ */ jsx3("ul", { className: "adl-viewer-edgeids", "aria-label": t("Relation IDs", "IDs de relaciones"), children: edgeIds.map((edgeId) => /* @__PURE__ */ jsx3("li", { children: /* @__PURE__ */ jsx3(
            "button",
            {
              type: "button",
              className: "adl-viewer-mono",
              onClick: () => setSelection({ kind: "edge", id: edgeId }),
              children: edgeId
            }
          ) }, edgeId)) }),
          /* @__PURE__ */ jsx3(
            "button",
            {
              type: "button",
              onClick: exportQuery,
              disabled: !query || stale || !scene.ok,
              "aria-describedby": stale ? "adl-viewer-stale" : void 0,
              children: t("Export query SVG", "Exportar SVG de la consulta")
            }
          ),
          /* @__PURE__ */ jsx3("span", { id: "adl-viewer-stale", hidden: true, children: t("Export requires a current query.", "La exportaci\xF3n requiere una consulta vigente.") })
        ] }),
        /* @__PURE__ */ jsx3(
          Inspector,
          {
            document,
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
  exportQuerySvg,
  findReach,
  findRoute,
  graphSnapshot,
  highlightStyle,
  isQueryStale,
  queryEdgeIds,
  queryHighlight,
  queryReceipt,
  querySummary,
  relationsOf,
  searchNodes
};
