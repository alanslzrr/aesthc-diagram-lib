'use client'
import {
  registerExampleDiagrams
} from "../chunk-PDZ6L65O.js";
import "../chunk-IDNRW7UP.js";
import {
  DiagramCanvas
} from "../chunk-2CGWWC44.js";
import {
  layoutDiagram
} from "../chunk-VUW7SRON.js";
import "../chunk-P7FW66WE.js";
import {
  buildAdjacency,
  connectedIds,
  diagramEdges
} from "../chunk-QVERY2JP.js";
import {
  getDiagram,
  getDiagramVisuals
} from "../chunk-UNV5K3AO.js";
import "../chunk-6F4PWJZI.js";
import "../chunk-TVEV5XLW.js";

// src/showcase/Showcase.tsx
import { useEffect, useId, useMemo, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
registerExampleDiagrams();
var defaultStrings = {
  label: "reusable library",
  hoverHint: "hover a node, focus it with the keyboard, or tap it to explore its role and trace its path",
  heading: "Seven diagram types,",
  headingAccent: "one visual language.",
  intro: "A single SVG renderer and a declarative, localized data model \u2014 band, flowchart, sequence, state machine, ER, timeline and swimlane diagrams that share the same dot-grid, hairline-card and cobalt/branch aesthetic."
};
function ShowcasePanel({
  diagramKey,
  label,
  hoverHint,
  locale,
  hovered = false,
  interactive = true
}) {
  const diagram = getDiagram(diagramKey, locale);
  const [tooltipNode, setTooltipNode] = useState(null);
  const [focusedNode, setFocusedNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const instanceId = `${diagramKey}-${useId().replaceAll(":", "")}`;
  const layout = useMemo(() => layoutDiagram(diagram), [diagram]);
  const edges = useMemo(() => diagramEdges(diagram), [diagram]);
  const adjacency = useMemo(() => buildAdjacency(edges), [edges]);
  const activeNode = interactive ? tooltipNode ?? focusedNode ?? selectedNode : null;
  const highlight = useMemo(
    () => activeNode ? connectedIds(activeNode, adjacency) : null,
    [activeNode, adjacency]
  );
  const caption = "caption" in diagram ? diagram.caption : "";
  const legend = "legend" in diagram ? diagram.legend : { main: "", branch: "" };
  const continuations = "continuations" in diagram ? diagram.continuations ?? [] : [];
  const continuationDescription = continuations.map(
    (continuation) => continuation.ariaLabel ?? `${continuation.label} \xB7 ${continuation.destination}`
  ).join("; ");
  const ariaLabel = [
    caption ? `${label}: ${caption}` : label,
    continuationDescription ? `Continuations: ${continuationDescription}` : ""
  ].filter(Boolean).join(". ");
  useEffect(() => {
    if (interactive) return;
    setTooltipNode(null);
    setFocusedNode(null);
    setSelectedNode(null);
  }, [interactive]);
  return /* @__PURE__ */ jsxs(
    "div",
    {
      "data-diagram-panel": diagramKey,
      className: [
        "relative mt-6 bg-background transition-colors duration-200",
        hovered ? "[--diagram-frame-opacity:0.32]" : "[--diagram-frame-opacity:0.2]"
      ].join(" "),
      onKeyDown: (event) => {
        if (event.key === "Escape") {
          setTooltipNode(null);
          setSelectedNode(null);
        }
      },
      children: [
        /* @__PURE__ */ jsx(
          "span",
          {
            "aria-hidden": "true",
            "data-frame-edge": "top",
            className: "pointer-events-none absolute inset-x-0 top-0 h-px bg-foreground opacity-[var(--diagram-frame-opacity)]"
          }
        ),
        /* @__PURE__ */ jsx(
          "span",
          {
            "aria-hidden": "true",
            "data-frame-edge": "left",
            className: "pointer-events-none absolute inset-y-0 left-0 w-px bg-[linear-gradient(180deg,var(--foreground),transparent)] opacity-[var(--diagram-frame-opacity)]"
          }
        ),
        /* @__PURE__ */ jsx(
          "span",
          {
            "aria-hidden": "true",
            "data-frame-edge": "right",
            className: "pointer-events-none absolute inset-y-0 right-0 w-px bg-[linear-gradient(180deg,var(--foreground),transparent)] opacity-[var(--diagram-frame-opacity)]"
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: "relative flex flex-wrap items-center justify-between gap-x-5 gap-y-2 px-5 py-4 font-mono text-[10.5px] uppercase tracking-[0.18em] text-foreground/75", children: [
          /* @__PURE__ */ jsxs("span", { className: "inline-flex shrink-0 items-center gap-3", children: [
            /* @__PURE__ */ jsx("i", { className: "inline-block h-[7px] w-[7px] rounded-full bg-cobalt shadow-[0_0_8px_color-mix(in_srgb,var(--color-cobalt)_55%,transparent)]" }),
            label,
            " / ",
            diagramKey
          ] }),
          /* @__PURE__ */ jsx("span", { className: "w-full text-[9.5px] leading-relaxed text-foreground/75 sm:w-auto sm:text-right sm:text-[10.5px]", children: hoverHint }),
          /* @__PURE__ */ jsx(
            "span",
            {
              "aria-hidden": "true",
              className: "pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,var(--border)_10%,var(--border)_90%,transparent)] opacity-70"
            }
          )
        ] }),
        /* @__PURE__ */ jsx("div", { className: "overflow-x-auto px-5 py-10 sm:px-7", "data-diagram-scroll": true, children: /* @__PURE__ */ jsx(
          DiagramCanvas,
          {
            layout,
            highlight,
            activeNodeId: activeNode,
            focusedNodeId: interactive ? focusedNode : null,
            selectedNodeId: interactive ? selectedNode : null,
            onTooltipNodeChange: (id, open) => {
              setTooltipNode((currentNode) => open ? id : currentNode === id ? null : currentNode);
            },
            onFocusNode: (id) => {
              setFocusedNode(id);
              if (id) setTooltipNode(null);
            },
            onSelectNode: (id) => setSelectedNode((currentNode) => currentNode === id ? null : id),
            onDismissNode: (id) => {
              setTooltipNode((currentNode) => currentNode === id ? null : currentNode);
              setSelectedNode((currentNode) => currentNode === id ? null : currentNode);
            },
            instanceId,
            ariaLabel,
            nodeVisuals: getDiagramVisuals(diagramKey)
          }
        ) }),
        /* @__PURE__ */ jsxs("div", { className: "relative flex flex-wrap items-center justify-between gap-4 px-5 py-4 font-mono text-[10.5px] text-foreground/75", children: [
          /* @__PURE__ */ jsxs("span", { className: "max-w-[68ch] leading-relaxed", children: [
            "// ",
            caption
          ] }),
          /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-5", children: [
            /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-2", children: [
              /* @__PURE__ */ jsx("i", { className: "inline-block h-[10px] w-[10px] rounded-full bg-cobalt" }),
              legend.main
            ] }),
            /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-2", children: [
              /* @__PURE__ */ jsx("i", { className: "inline-block h-[10px] w-[10px] rounded-full bg-branch" }),
              legend.branch
            ] })
          ] })
        ] })
      ]
    }
  );
}
function DiagramShowcase({
  locale = "en",
  label = defaultStrings.label,
  hoverHint = defaultStrings.hoverHint,
  heading = defaultStrings.heading,
  headingAccent = defaultStrings.headingAccent,
  intro = defaultStrings.intro,
  entries
}) {
  return /* @__PURE__ */ jsxs("div", { className: "pb-24 pt-16", children: [
    /* @__PURE__ */ jsxs("div", { className: "mx-auto w-full max-w-[720px] px-4 sm:px-8", children: [
      /* @__PURE__ */ jsx("p", { className: "text-xs uppercase tracking-[0.35em] text-muted-foreground", children: label }),
      /* @__PURE__ */ jsxs("h1", { className: "mt-3 font-display text-[clamp(2.5rem,4vw,4rem)] leading-[0.95] tracking-[-0.05em]", children: [
        heading,
        " ",
        /* @__PURE__ */ jsx("span", { className: "italic text-[var(--color-cobalt)]", children: headingAccent })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "mt-4 max-w-2xl text-lg leading-8 text-muted-foreground", children: intro })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "mx-auto mt-16 w-full max-w-[1180px] px-4 sm:px-8", children: entries.map((entry, index) => /* @__PURE__ */ jsxs(
      "article",
      {
        className: "border-t border-foreground/20 py-16 first:border-t-0 first:pt-0 last:pb-4",
        children: [
          /* @__PURE__ */ jsxs("div", { className: "mb-6 flex flex-wrap items-baseline gap-x-5 gap-y-2", children: [
            /* @__PURE__ */ jsxs("span", { className: "font-mono text-[11px] uppercase tracking-[0.22em] text-foreground/75", children: [
              String(index + 1).padStart(2, "0"),
              " \u2014 ",
              entry.title
            ] }),
            /* @__PURE__ */ jsx("span", { className: "h-px flex-1 bg-foreground/16" }),
            /* @__PURE__ */ jsx("span", { className: "font-mono text-[10.5px] uppercase tracking-[0.14em] text-foreground/75", children: entry.key })
          ] }),
          /* @__PURE__ */ jsx("h2", { className: "font-display text-[clamp(1.8rem,2.6vw,2.4rem)] font-normal leading-tight tracking-[-0.03em] text-foreground", children: entry.title }),
          /* @__PURE__ */ jsx("p", { className: "mt-3 max-w-[64ch] text-base leading-relaxed text-foreground/74", children: entry.description }),
          /* @__PURE__ */ jsx(
            ShowcasePanel,
            {
              diagramKey: entry.key,
              label,
              hoverHint,
              locale
            }
          )
        ]
      },
      entry.key
    )) })
  ] });
}
var Showcase_default = DiagramShowcase;

// src/showcase/entries.ts
var DEFAULT_SHOWCASE_ENTRIES = [
  {
    key: "example-band",
    title: "Band",
    description: "Vertical columns with centred card stacks and bezier edges between bands \u2014 the layout of the Validation Orchestrator and Quote Agent case studies."
  },
  {
    key: "example-flowchart",
    title: "Flowchart",
    description: "Top-down or left-right levels assigned by topological order, with vertical links and branch pills for failures and rollbacks."
  },
  {
    key: "example-sequence",
    title: "Sequence",
    description: "Participants as vertical lifelines with horizontal messages and activation bars, from a checkout to a webhook reconciliation."
  },
  {
    key: "example-state-machine",
    title: "State machine",
    description: "States on a ring with curved transitions, self-loops, double-outline initial states and hollow final states."
  },
  {
    key: "example-er",
    title: "ER / data model",
    description: "Entities as typed tables in a grid \u2014 primary keys, foreign keys and unique constraints \u2014 connected by labelled relations."
  },
  {
    key: "example-timeline",
    title: "Timeline",
    description: "A dashed central spine with events alternating above and below it, from an internal kickoff to a public launch."
  },
  {
    key: "example-swimlane",
    title: "Swimlane",
    description: "Labelled horizontal lanes for cross-team flows, with edges that cross lanes when work hands off."
  }
];
export {
  DEFAULT_SHOWCASE_ENTRIES,
  DiagramShowcase,
  Showcase_default as DiagramShowcaseDefault
};
