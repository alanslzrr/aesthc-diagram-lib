import {
  BrandIcon
} from "./chunk-GIHY37DH.js";
import {
  nodeGeometry
} from "./chunk-YKPE23VO.js";
import {
  CANVAS_MIN_WIDTH,
  CARD_R,
  DECISION_PILL_H,
  DECISION_PILL_R,
  DIMMED_OPACITY,
  DOT_R,
  EDGE_STROKE_WIDTH,
  NODE_ICON_SIZE,
  PILL_H,
  PILL_R
} from "./chunk-TVEV5XLW.js";

// src/canvas/DiagramCanvas.tsx
import { useState } from "react";

// src/canvas/ArchitectureNodeIcon.tsx
import {
  ArrowsSplit,
  BracketsCurly,
  FolderLock,
  Gauge,
  Graph,
  Handshake,
  ListChecks,
  ListMagnifyingGlass,
  Monitor,
  Receipt,
  RocketLaunch,
  Scales,
  SealCheck,
  UserCheck,
  UserFocus,
  Warning
} from "@phosphor-icons/react";
import { jsx } from "react/jsx-runtime";
var SEMANTIC_ICONS = {
  "arrows-split": ArrowsSplit,
  "brackets-curly": BracketsCurly,
  "folder-lock": FolderLock,
  gauge: Gauge,
  graph: Graph,
  handshake: Handshake,
  "list-checks": ListChecks,
  "list-magnifying-glass": ListMagnifyingGlass,
  monitor: Monitor,
  receipt: Receipt,
  "rocket-launch": RocketLaunch,
  scales: Scales,
  "seal-check": SealCheck,
  "user-check": UserCheck,
  "user-focus": UserFocus,
  warning: Warning
};
var positionedProps = (x, y, size) => ({
  "aria-hidden": true,
  focusable: false,
  height: size,
  width: size,
  x,
  y
});
function ArchitectureNodeIcon({ size, visual, x, y }) {
  const position = positionedProps(x, y, size);
  if (visual.source === "phosphor") {
    const SemanticIcon = SEMANTIC_ICONS[visual.key];
    return /* @__PURE__ */ jsx(
      SemanticIcon,
      {
        ...position,
        className: "text-foreground/75",
        color: "currentColor",
        weight: "regular"
      }
    );
  }
  return /* @__PURE__ */ jsx(BrandIcon, { ...position, name: visual.key === "mcp" ? "model-context-protocol" : visual.key });
}

// src/canvas/tooltip.tsx
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

// src/lib/cn.ts
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// src/canvas/tooltip.tsx
import { jsx as jsx2, jsxs } from "react/jsx-runtime";
function TooltipProvider({
  delayDuration = 0,
  ...props
}) {
  return /* @__PURE__ */ jsx2(
    TooltipPrimitive.Provider,
    {
      "data-slot": "tooltip-provider",
      delayDuration,
      ...props
    }
  );
}
function Tooltip({ ...props }) {
  return /* @__PURE__ */ jsx2(TooltipPrimitive.Root, { "data-slot": "tooltip", ...props });
}
function TooltipTrigger({ ...props }) {
  return /* @__PURE__ */ jsx2(TooltipPrimitive.Trigger, { "data-slot": "tooltip-trigger", ...props });
}
function TooltipContent({
  className,
  sideOffset = 0,
  children,
  style,
  variant = "default",
  ...props
}) {
  const isGlass = variant === "glass";
  return /* @__PURE__ */ jsx2(TooltipPrimitive.Portal, { children: /* @__PURE__ */ jsxs(
    TooltipPrimitive.Content,
    {
      "data-slot": "tooltip-content",
      "data-glass-refraction": isGlass ? "fallback" : void 0,
      "data-glass-surface": isGlass ? "panel" : void 0,
      "data-glass-variant": isGlass ? "strong" : void 0,
      sideOffset,
      className: cn(
        "z-50 inline-flex w-fit max-w-xs origin-(--radix-tooltip-content-transform-origin) items-center gap-1.5 px-3 py-1.5 text-xs has-data-[slot=kbd]:pr-1.5 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 **:data-[slot=kbd]:relative **:data-[slot=kbd]:isolate **:data-[slot=kbd]:z-50 **:data-[slot=kbd]:rounded-none data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 motion-reduce:animate-none",
        isGlass ? "liquid-glass rounded-[var(--glass-radius-panel)] text-foreground" : "rounded-none bg-foreground text-background",
        className
      ),
      style: isGlass ? {
        backdropFilter: "blur(var(--glass-current-blur))",
        WebkitBackdropFilter: "blur(var(--glass-current-blur))",
        ...style
      } : style,
      ...props,
      children: [
        children,
        /* @__PURE__ */ jsx2(
          TooltipPrimitive.Arrow,
          {
            className: cn(
              "z-50",
              isGlass ? "h-2 w-4 fill-card stroke-border/90 [stroke-width:0.75px]" : "size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-none bg-foreground fill-foreground"
            )
          }
        )
      ]
    }
  ) });
}

// src/canvas/DiagramCanvas.tsx
import { Fragment, jsx as jsx3, jsxs as jsxs2 } from "react/jsx-runtime";
var strokeForVariant = (variant) => variant === "branch" ? "var(--color-branch)" : "var(--color-cobalt)";
var NODE_BORDER = "var(--diagram-node-border, var(--border))";
var nodeOpacity = (node, highlight) => !highlight || highlight.nodes.has(node.id) ? 1 : DIMMED_OPACITY;
var edgeOpacity = (edge, highlight) => !highlight || highlight.edges.has(edge.id) ? 1 : DIMMED_OPACITY;
var continuationOpacity = (continuation, highlight) => !highlight || highlight.nodes.has(continuation.from) ? 1 : DIMMED_OPACITY;
function DiagramCanvas({
  layout,
  highlight,
  activeNodeId,
  focusedNodeId,
  selectedNodeId,
  onTooltipNodeChange,
  onFocusNode,
  onSelectNode,
  onDismissNode,
  instanceId,
  ariaLabel,
  nodeVisuals
}) {
  const [dismissedNodeId, setDismissedNodeId] = useState(null);
  const dismissNode = (id) => {
    setDismissedNodeId(id);
    onDismissNode(id);
  };
  const dotsId = `arch-dots-${instanceId}`;
  const fadeId = `arch-fade-${instanceId}`;
  const maskId = `arch-mask-${instanceId}`;
  const mainContinuationMarkerId = `arch-continuation-main-${instanceId}`;
  const branchContinuationMarkerId = `arch-continuation-branch-${instanceId}`;
  const edgeGradientId = (edgeId) => `arch-edge-${instanceId}-${Array.from(edgeId, (character) => character.codePointAt(0).toString(16)).join("-")}`;
  return /* @__PURE__ */ jsxs2(
    "svg",
    {
      viewBox: `0 0 ${layout.width} ${layout.height}`,
      preserveAspectRatio: "xMidYMid meet",
      role: "group",
      "aria-label": ariaLabel,
      className: "diagram-canvas mx-auto block h-auto w-full",
      style: {
        // Never upscale past 1 unit = 1px (typography stays true to the band
        // reference), and keep the legibility floor for wide artboards.
        minWidth: Math.min(CANVAS_MIN_WIDTH, layout.width),
        maxWidth: layout.width
      },
      children: [
        /* @__PURE__ */ jsxs2("defs", { children: [
          /* @__PURE__ */ jsx3("pattern", { id: dotsId, width: "22", height: "22", patternUnits: "userSpaceOnUse", children: /* @__PURE__ */ jsx3("circle", { cx: "1", cy: "1", r: "1", fill: "var(--foreground)" }) }),
          /* @__PURE__ */ jsxs2("linearGradient", { id: fadeId, x1: "0%", y1: "0%", x2: "0%", y2: "100%", children: [
            /* @__PURE__ */ jsx3("stop", { offset: "0%", stopColor: "var(--foreground)", stopOpacity: "1" }),
            /* @__PURE__ */ jsx3("stop", { offset: "55%", stopColor: "var(--foreground)", stopOpacity: "0.78" }),
            /* @__PURE__ */ jsx3("stop", { offset: "100%", stopColor: "var(--foreground)", stopOpacity: "0.26" })
          ] }),
          /* @__PURE__ */ jsx3("mask", { id: maskId, style: { maskType: "alpha" }, children: /* @__PURE__ */ jsx3("rect", { width: layout.width, height: layout.height, fill: `url(#${fadeId})` }) }),
          [
            { id: mainContinuationMarkerId, variant: "main" },
            { id: branchContinuationMarkerId, variant: "branch" }
          ].map(({ id, variant }) => /* @__PURE__ */ jsx3(
            "marker",
            {
              id,
              viewBox: "0 0 8 8",
              markerWidth: 8,
              markerHeight: 8,
              refX: 7,
              refY: 4,
              orient: "auto",
              markerUnits: "userSpaceOnUse",
              children: /* @__PURE__ */ jsx3(
                "path",
                {
                  d: "M 1 1 L 7 4 L 1 7",
                  fill: "none",
                  stroke: strokeForVariant(variant),
                  strokeWidth: EDGE_STROKE_WIDTH,
                  strokeLinecap: "round",
                  strokeLinejoin: "round"
                }
              )
            },
            id
          )),
          layout.edges.map((edge) => {
            const color = strokeForVariant(edge.variant);
            const centreOpacity = edge.variant === "main" ? 1 : 0.74;
            const edgeOpacityValue = edge.variant === "main" ? "var(--diagram-main-tail-opacity, 0.24)" : "var(--diagram-branch-tail-opacity, 0.12)";
            const endOpacity = edge.arrowEnd ? centreOpacity : edgeOpacityValue;
            return /* @__PURE__ */ jsxs2(
              "linearGradient",
              {
                id: edgeGradientId(edge.id),
                gradientUnits: "userSpaceOnUse",
                x1: edge.startX,
                y1: edge.startY,
                x2: edge.endX,
                y2: edge.endY,
                children: [
                  /* @__PURE__ */ jsx3("stop", { offset: "0%", stopColor: color, stopOpacity: edgeOpacityValue }),
                  /* @__PURE__ */ jsx3("stop", { offset: "24%", stopColor: color, stopOpacity: centreOpacity }),
                  /* @__PURE__ */ jsx3("stop", { offset: "76%", stopColor: color, stopOpacity: centreOpacity }),
                  /* @__PURE__ */ jsx3("stop", { offset: "100%", stopColor: color, stopOpacity: endOpacity })
                ]
              },
              edge.id
            );
          })
        ] }),
        /* @__PURE__ */ jsx3(
          "rect",
          {
            width: layout.width,
            height: layout.height,
            fill: `url(#${dotsId})`,
            mask: `url(#${maskId})`,
            className: "opacity-[var(--diagram-grid-opacity,0.075)] dark:opacity-[var(--diagram-grid-opacity,0.12)]"
          }
        ),
        layout.containers?.map((container) => /* @__PURE__ */ jsxs2("g", { "data-container-id": container.id, children: [
          /* @__PURE__ */ jsx3(
            "rect",
            {
              x: container.x,
              y: container.y,
              width: container.w,
              height: container.h,
              rx: 6,
              fill: "color-mix(in srgb, var(--foreground) 2%, transparent)",
              stroke: "var(--border)",
              strokeWidth: 1
            }
          ),
          container.label ? /* @__PURE__ */ jsx3(
            "text",
            {
              x: 18,
              y: container.y + 26,
              letterSpacing: "1.6",
              className: "fill-foreground/75 font-mono text-[11.25px] uppercase",
              children: container.label
            }
          ) : null,
          container.kind ? /* @__PURE__ */ jsx3("text", { x: 18, y: container.y + 44, className: "fill-foreground/75 font-mono text-[10px]", children: container.kind }) : null
        ] }, container.id)),
        layout.lifelines?.map((lifeline) => /* @__PURE__ */ jsx3("g", { "data-lifeline-id": lifeline.id, children: /* @__PURE__ */ jsx3(
          "line",
          {
            x1: lifeline.x,
            y1: lifeline.y0,
            x2: lifeline.x,
            y2: lifeline.y1,
            stroke: "var(--border)",
            strokeWidth: 1,
            strokeDasharray: "2 6"
          }
        ) }, lifeline.id)),
        /* @__PURE__ */ jsx3("g", { "data-layer": "edges", fill: "none", strokeLinecap: "round", strokeLinejoin: "round", children: layout.edges.map((edge) => /* @__PURE__ */ jsx3(
          "path",
          {
            "data-edge-id": edge.id,
            "data-edge-from": edge.from,
            "data-edge-to": edge.to,
            d: edge.d,
            stroke: `url(#${edgeGradientId(edge.id)})`,
            strokeWidth: edge.strokeWidth ?? EDGE_STROKE_WIDTH,
            strokeDasharray: edge.dashed ? "2 7" : void 0,
            markerEnd: edge.arrowEnd ? `url(#${edge.variant === "main" ? mainContinuationMarkerId : branchContinuationMarkerId})` : void 0,
            opacity: edgeOpacity(edge, highlight),
            className: [
              "transition-opacity duration-150",
              edge.variant === "main" ? "dark:[filter:drop-shadow(0_0_3px_color-mix(in_srgb,var(--color-cobalt)_18%,transparent))]" : ""
            ].join(" ")
          },
          edge.id
        )) }),
        /* @__PURE__ */ jsx3("g", { "data-layer": "continuations", fill: "none", strokeLinecap: "round", strokeLinejoin: "round", children: layout.continuations?.map((continuation) => /* @__PURE__ */ jsx3(
          "path",
          {
            "data-continuation-id": continuation.id,
            "data-continuation-from": continuation.from,
            d: continuation.d,
            stroke: strokeForVariant(continuation.variant),
            strokeWidth: EDGE_STROKE_WIDTH,
            markerEnd: `url(#${continuation.variant === "main" ? mainContinuationMarkerId : branchContinuationMarkerId})`,
            opacity: continuationOpacity(continuation, highlight),
            className: "transition-opacity duration-150"
          },
          continuation.id
        )) }),
        layout.nodes.filter((node) => node.shape === "bar").map((node) => /* @__PURE__ */ jsx3(
          "rect",
          {
            x: node.x,
            y: node.y,
            width: node.w,
            height: node.h,
            rx: 2,
            fill: node.weight === "primary" ? "color-mix(in srgb, var(--color-cobalt) 22%, transparent)" : "color-mix(in srgb, var(--color-branch) 18%, transparent)",
            stroke: node.weight === "primary" ? "color-mix(in srgb, var(--color-cobalt) 40%, transparent)" : "color-mix(in srgb, var(--color-branch) 36%, transparent)",
            strokeWidth: 1,
            className: "pointer-events-none transition-opacity duration-150",
            opacity: nodeOpacity(node, highlight)
          },
          node.id
        )),
        /* @__PURE__ */ jsx3(TooltipProvider, { delayDuration: 140, disableHoverableContent: false, skipDelayDuration: 80, children: layout.nodes.filter((node) => node.shape !== "bar").map((node) => {
          const weight = node.weight ?? "secondary";
          const isMuted = weight === "muted";
          const visual = nodeVisuals[node.id];
          const isActive = activeNodeId === node.id;
          const isTooltipOpen = isActive && dismissedNodeId !== node.id;
          const isFocused = focusedNodeId === node.id;
          const isSelected = selectedNodeId === node.id;
          const accessibleName = node.kind ? `${node.kind}: ${node.label}` : node.label;
          const descriptionId = `arch-node-${instanceId}-${node.id}-description`;
          const isEvent = node.shape === "event";
          const isTable = node.shape === "table";
          const isState = node.shape === "state";
          const { centeredLabel, textX, radius } = nodeGeometry(node, !!visual);
          return /* @__PURE__ */ jsxs2(
            Tooltip,
            {
              open: isTooltipOpen,
              onOpenChange: (open) => {
                if (open) setDismissedNodeId(null);
                onTooltipNodeChange(node.id, open);
              },
              children: [
                /* @__PURE__ */ jsx3(TooltipTrigger, { asChild: true, children: /* @__PURE__ */ jsxs2(
                  "g",
                  {
                    "data-node-id": node.id,
                    "data-node-description": node.description,
                    "data-node-trigger-id": descriptionId,
                    "data-node-active": isActive ? "true" : "false",
                    "data-node-selected": isSelected ? "true" : "false",
                    "data-node-tooltip-trigger": "true",
                    role: "button",
                    tabIndex: 0,
                    "aria-label": accessibleName,
                    "aria-describedby": descriptionId,
                    "aria-pressed": isSelected,
                    opacity: nodeOpacity(node, highlight),
                    className: "cursor-pointer transition-opacity duration-150 focus:outline-none",
                    onFocus: () => {
                      setDismissedNodeId(null);
                      onFocusNode(node.id);
                    },
                    onBlur: () => onFocusNode(null),
                    onClick: () => {
                      setDismissedNodeId(null);
                      onSelectNode(node.id);
                    },
                    onKeyDown: (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setDismissedNodeId(null);
                        onSelectNode(node.id);
                      }
                    },
                    children: [
                      /* @__PURE__ */ jsx3("desc", { id: descriptionId, children: node.description }),
                      isEvent ? (() => {
                        const below = (node.nudge ?? 0) > 0;
                        const eventStroke = strokeForVariant(
                          node.weight === "primary" ? "main" : "branch"
                        );
                        const connectorEnd = below ? node.y - 38 : node.y + (node.sublabel ? 26 : 10);
                        return /* @__PURE__ */ jsxs2(Fragment, { children: [
                          /* @__PURE__ */ jsx3(
                            "line",
                            {
                              x1: node.cx,
                              y1: node.cy,
                              x2: node.cx,
                              y2: connectorEnd,
                              stroke: eventStroke,
                              strokeWidth: EDGE_STROKE_WIDTH,
                              strokeDasharray: "2 4"
                            }
                          ),
                          /* @__PURE__ */ jsx3(
                            "circle",
                            {
                              cx: node.cx,
                              cy: node.cy,
                              r: DOT_R,
                              fill: "var(--background)",
                              stroke: eventStroke,
                              strokeWidth: 1.2
                            }
                          ),
                          /* @__PURE__ */ jsx3("circle", { cx: node.cx, cy: node.cy, r: DOT_R / 2.6, fill: eventStroke }),
                          node.kind ? /* @__PURE__ */ jsx3(
                            "text",
                            {
                              x: node.cx,
                              y: node.y - 24,
                              textAnchor: "middle",
                              letterSpacing: "1.4",
                              className: "fill-foreground/75 font-mono text-[10px] uppercase",
                              children: node.kind
                            }
                          ) : null,
                          /* @__PURE__ */ jsx3(
                            "text",
                            {
                              x: node.cx,
                              y: node.y,
                              textAnchor: "middle",
                              className: node.weight === "primary" ? "fill-foreground text-[13.5px]" : "fill-foreground/82 text-[13.5px]",
                              children: node.label
                            }
                          ),
                          node.sublabel ? /* @__PURE__ */ jsx3(
                            "text",
                            {
                              x: node.cx,
                              y: node.y + 18,
                              textAnchor: "middle",
                              className: "fill-foreground/75 font-mono text-[10.5px]",
                              children: node.sublabel
                            }
                          ) : null,
                          /* @__PURE__ */ jsx3(
                            "rect",
                            {
                              "data-node-hit-area": "true",
                              x: node.x,
                              y: below ? node.cy - 12 : node.y - 36,
                              width: node.w,
                              height: below ? node.y + 30 - (node.cy - 12) : node.cy + 12 - (node.y - 36),
                              fill: "transparent"
                            }
                          )
                        ] });
                      })() : isTable ? /* @__PURE__ */ jsxs2(Fragment, { children: [
                        /* @__PURE__ */ jsx3(
                          "rect",
                          {
                            "data-node-surface": "true",
                            x: node.x,
                            y: node.y,
                            width: node.w,
                            height: node.h,
                            rx: CARD_R,
                            fill: node.weight === "primary" ? "var(--diagram-node-fill, color-mix(in srgb, var(--foreground) 4%, var(--background)))" : "var(--diagram-secondary-fill, transparent)",
                            stroke: node.weight === "primary" ? "color-mix(in srgb, var(--foreground) 28%, var(--border))" : NODE_BORDER,
                            strokeWidth: 1
                          }
                        ),
                        /* @__PURE__ */ jsx3(
                          "path",
                          {
                            d: `M ${node.x} ${node.y + 26} L ${node.x} ${node.y + CARD_R} Q ${node.x} ${node.y} ${node.x + CARD_R} ${node.y} L ${node.x + node.w - CARD_R} ${node.y} Q ${node.x + node.w} ${node.y} ${node.x + node.w} ${node.y + CARD_R} L ${node.x + node.w} ${node.y + 26} Z`,
                            fill: "color-mix(in srgb, var(--foreground) 6%, transparent)"
                          }
                        ),
                        /* @__PURE__ */ jsx3(
                          "text",
                          {
                            x: node.x + 14,
                            y: node.y + 17.5,
                            className: node.weight === "primary" ? "fill-foreground text-[13px]" : "fill-foreground/82 text-[13px]",
                            children: node.label
                          }
                        ),
                        (node.fields ?? []).map((field, fieldIndex) => /* @__PURE__ */ jsxs2("g", { children: [
                          /* @__PURE__ */ jsx3(
                            "line",
                            {
                              x1: node.x,
                              y1: node.y + 26 + fieldIndex * 22,
                              x2: node.x + node.w,
                              y2: node.y + 26 + fieldIndex * 22,
                              stroke: NODE_BORDER,
                              strokeWidth: 0.75
                            }
                          ),
                          field.key === "pk" || field.key === "fk" ? /* @__PURE__ */ jsx3(
                            "text",
                            {
                              x: node.x + 14,
                              y: node.y + 26 + fieldIndex * 22 + 14.5,
                              letterSpacing: "0.6",
                              className: field.key === "pk" ? "fill-[var(--color-cobalt)] font-mono text-[8.5px] uppercase" : "fill-[var(--color-branch)] font-mono text-[8.5px] uppercase",
                              children: field.key
                            }
                          ) : null,
                          /* @__PURE__ */ jsx3(
                            "text",
                            {
                              "data-field-name": field.name,
                              x: node.x + (field.key === "pk" || field.key === "fk" ? 34 : 14),
                              y: node.y + 26 + fieldIndex * 22 + 14.5,
                              className: "fill-foreground/80 font-mono text-[11px]",
                              children: field.name
                            }
                          ),
                          field.type || field.key === "unique" ? /* @__PURE__ */ jsx3(
                            "text",
                            {
                              "data-field-annotation": field.name,
                              x: node.x + node.w - 14,
                              y: node.y + 26 + fieldIndex * 22 + 14.5,
                              textAnchor: "end",
                              className: "fill-foreground/75 font-mono text-[10px]",
                              children: [field.type, field.key === "unique" ? "unique" : null].filter(Boolean).join(" \xB7 ")
                            }
                          ) : null
                        ] }, `${node.id}-${field.name}`))
                      ] }) : isMuted ? /* @__PURE__ */ jsx3(
                        "line",
                        {
                          x1: node.x,
                          y1: node.y + node.h,
                          x2: node.x + node.w,
                          y2: node.y + node.h,
                          stroke: NODE_BORDER,
                          strokeWidth: 1
                        }
                      ) : /* @__PURE__ */ jsx3(
                        "rect",
                        {
                          "data-node-surface": "true",
                          x: node.x,
                          y: node.y,
                          width: node.w,
                          height: node.h,
                          rx: radius,
                          fill: weight === "primary" ? "var(--diagram-node-fill, color-mix(in srgb, var(--foreground) 4%, var(--background)))" : "var(--diagram-secondary-fill, transparent)",
                          stroke: weight === "primary" ? "color-mix(in srgb, var(--foreground) 28%, var(--border))" : NODE_BORDER,
                          strokeWidth: 1,
                          className: weight === "primary" ? "opacity-100" : "opacity-[0.84] dark:opacity-70"
                        }
                      ),
                      !isEvent ? /* @__PURE__ */ jsx3(
                        "rect",
                        {
                          "data-node-hit-area": "true",
                          x: node.x,
                          y: node.y,
                          width: node.w,
                          height: node.h,
                          fill: "transparent"
                        }
                      ) : null,
                      /* @__PURE__ */ jsx3(
                        "rect",
                        {
                          "aria-hidden": "true",
                          "data-node-focus-ring": "true",
                          x: node.x - 2,
                          y: node.y - 2,
                          width: node.w + 4,
                          height: isEvent ? 60 : node.h + 4,
                          rx: radius + 2,
                          fill: "none",
                          stroke: "var(--color-cobalt)",
                          strokeWidth: 1.5,
                          opacity: isFocused ? 0.8 : 0,
                          className: "pointer-events-none transition-opacity duration-150"
                        }
                      ),
                      isState ? /* @__PURE__ */ jsxs2(Fragment, { children: [
                        node.initial ? /* @__PURE__ */ jsx3(
                          "rect",
                          {
                            x: node.x + 4,
                            y: node.y + 4,
                            width: node.w - 8,
                            height: node.h - 8,
                            rx: radius - 4,
                            fill: "none",
                            stroke: NODE_BORDER,
                            strokeWidth: 1,
                            className: "pointer-events-none"
                          }
                        ) : null,
                        node.final ? (
                          // Terminal marker on the right edge of the pill —
                          // never over the label text.
                          /* @__PURE__ */ jsxs2("g", { className: "pointer-events-none", children: [
                            /* @__PURE__ */ jsx3(
                              "circle",
                              {
                                cx: node.x + node.w - 20,
                                cy: node.cy,
                                r: 6.5,
                                fill: "none",
                                stroke: "var(--foreground)",
                                strokeOpacity: 0.55,
                                strokeWidth: 1
                              }
                            ),
                            /* @__PURE__ */ jsx3(
                              "circle",
                              {
                                cx: node.x + node.w - 20,
                                cy: node.cy,
                                r: 2.6,
                                fill: "var(--foreground)",
                                fillOpacity: 0.7
                              }
                            )
                          ] })
                        ) : null
                      ] }) : null,
                      !isEvent && visual ? /* @__PURE__ */ jsx3(
                        ArchitectureNodeIcon,
                        {
                          size: NODE_ICON_SIZE,
                          visual,
                          x: node.x + 15,
                          y: node.cy - NODE_ICON_SIZE / 2
                        }
                      ) : null,
                      !isEvent && !isTable && node.kind ? /* @__PURE__ */ jsx3(
                        "text",
                        {
                          x: textX,
                          y: node.y + 24,
                          letterSpacing: "1.6",
                          className: "fill-foreground/75 font-mono text-[11.25px] uppercase",
                          children: node.kind
                        }
                      ) : null,
                      !isEvent && !isTable ? /* @__PURE__ */ jsx3(
                        "text",
                        {
                          "data-node-label": "true",
                          x: centeredLabel ? node.cx : textX,
                          y: centeredLabel ? node.cy : node.y + 48,
                          textAnchor: centeredLabel ? "middle" : void 0,
                          dominantBaseline: centeredLabel ? "central" : void 0,
                          className: weight === "primary" ? "fill-foreground text-[14.5px]" : "fill-foreground/82 text-[14.5px]",
                          children: node.label
                        }
                      ) : null,
                      !isEvent && !isTable && node.sublabel ? /* @__PURE__ */ jsx3(
                        "text",
                        {
                          x: textX,
                          y: node.y + 70,
                          className: "fill-foreground/75 font-mono text-[11.25px]",
                          children: node.sublabel
                        }
                      ) : null
                    ]
                  }
                ) }),
                /* @__PURE__ */ jsxs2(
                  TooltipContent,
                  {
                    side: "top",
                    sideOffset: 10,
                    variant: "glass",
                    onEscapeKeyDown: () => dismissNode(node.id),
                    onPointerDownOutside: (event) => {
                      const target = event.detail.originalEvent.target;
                      const owningTrigger = target instanceof Element ? target.closest("[data-node-trigger-id]") : null;
                      if (owningTrigger?.getAttribute("data-node-trigger-id") === descriptionId) {
                        event.preventDefault();
                        return;
                      }
                      dismissNode(node.id);
                    },
                    className: "font-sans block max-w-[min(19rem,calc(100vw-2rem))] px-4 py-3.5 text-left",
                    children: [
                      /* @__PURE__ */ jsx3("span", { className: "block font-mono text-[9px] uppercase tracking-[0.16em] text-foreground/75", children: node.kind ?? node.label }),
                      node.kind ? /* @__PURE__ */ jsx3("span", { className: "mt-1 block text-[13px] font-medium leading-tight text-foreground", children: node.label }) : null,
                      node.sublabel ? /* @__PURE__ */ jsx3("span", { className: "mt-1 block font-mono text-[10px] leading-relaxed text-foreground/75", children: node.sublabel }) : null,
                      /* @__PURE__ */ jsx3("span", { className: "mt-2.5 block border-t border-border/70 pt-2.5 text-[11.5px] leading-[1.55] text-foreground/78", children: node.description })
                    ]
                  }
                )
              ]
            },
            node.id
          );
        }) }),
        layout.decisions?.map((decision) => /* @__PURE__ */ jsxs2(
          "g",
          {
            "data-decision-id": decision.id,
            opacity: !highlight || highlight.nodes.has(decision.source) ? 1 : DIMMED_OPACITY,
            className: "transition-opacity duration-150",
            children: [
              /* @__PURE__ */ jsx3(
                "rect",
                {
                  x: decision.x - decision.width / 2,
                  y: decision.y - DECISION_PILL_H / 2,
                  width: decision.width,
                  height: DECISION_PILL_H,
                  rx: DECISION_PILL_R,
                  fill: "var(--background)",
                  stroke: "color-mix(in srgb, var(--foreground) 24%, var(--border))",
                  strokeWidth: 1
                }
              ),
              /* @__PURE__ */ jsx3(
                "text",
                {
                  x: decision.x,
                  y: decision.y + 4.5,
                  textAnchor: "middle",
                  className: "fill-foreground/82 text-[12.25px]",
                  children: decision.label
                }
              )
            ]
          },
          decision.id
        )),
        layout.edges.filter((edge) => Boolean(edge.label)).map((edge) => {
          const label = edge.label;
          return /* @__PURE__ */ jsxs2(
            "g",
            {
              "data-edge-label": edge.id,
              opacity: edgeOpacity(edge, highlight),
              className: "transition-opacity duration-150",
              children: [
                /* @__PURE__ */ jsx3(
                  "rect",
                  {
                    x: edge.labelX - edge.labelWidth / 2,
                    y: edge.labelY - PILL_H / 2,
                    width: edge.labelWidth,
                    height: PILL_H,
                    rx: PILL_R,
                    fill: "var(--background)",
                    stroke: "var(--border)",
                    strokeWidth: 1
                  }
                ),
                /* @__PURE__ */ jsx3(
                  "text",
                  {
                    x: edge.labelX,
                    y: edge.labelY + 4,
                    textAnchor: "middle",
                    className: "fill-foreground/70 font-mono text-[11.25px]",
                    children: label
                  }
                )
              ]
            },
            `${edge.id}-label`
          );
        }),
        layout.continuations?.map((continuation) => /* @__PURE__ */ jsxs2(
          "g",
          {
            "data-continuation-label": continuation.id,
            opacity: continuationOpacity(continuation, highlight),
            className: "transition-opacity duration-150",
            children: [
              /* @__PURE__ */ jsx3(
                "rect",
                {
                  x: continuation.labelX - continuation.labelWidth / 2,
                  y: continuation.labelY - PILL_H / 2,
                  width: continuation.labelWidth,
                  height: PILL_H,
                  rx: PILL_R,
                  fill: "var(--background)",
                  stroke: "var(--border)",
                  strokeWidth: 1
                }
              ),
              /* @__PURE__ */ jsx3(
                "text",
                {
                  x: continuation.labelX,
                  y: continuation.labelY + 4,
                  textAnchor: "middle",
                  className: "fill-foreground/70 font-mono text-[11.25px]",
                  children: continuation.displayLabel
                }
              )
            ]
          },
          `${continuation.id}-label`
        ))
      ]
    }
  );
}
var DiagramCanvas_default = DiagramCanvas;

export {
  ArchitectureNodeIcon,
  DiagramCanvas,
  DiagramCanvas_default
};
