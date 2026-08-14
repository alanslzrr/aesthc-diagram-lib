'use client'
// src/canvas/DiagramCanvas.tsx
import { useState } from "react";

// src/theme.ts
var CARD_R = 10;
var CARD_TEXT_X = 50;
var CANVAS_MIN_WIDTH = 1360;
var NODE_ICON_SIZE = 22;
var EDGE_STROKE_WIDTH = 0.9;
var DIMMED_OPACITY = 0.22;
var PILL_H = 20;
var PILL_R = 10;
var DECISION_PILL_H = 24;
var DECISION_PILL_R = 12;
var DOT_R = 6;

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

// src/svgs/expressjs.tsx
import { jsx } from "react/jsx-runtime";
var Expressjs = (props) => /* @__PURE__ */ jsx("svg", { ...props, viewBox: "0 0 32 32", children: /* @__PURE__ */ jsx("path", { d: "M32 24.795c-1.164.296-1.884.013-2.53-.957l-4.594-6.356-.664-.88-5.365 7.257c-.613.873-1.256 1.253-2.4.944l6.87-9.222-6.396-8.33c1.1-.214 1.86-.105 2.535.88l4.765 6.435 4.8-6.4c.615-.873 1.276-1.205 2.38-.883l-2.48 3.288-3.36 4.375c-.4.5-.345.842.023 1.325L32 24.795zM.008 15.427l.562-2.764C2.1 7.193 8.37 4.92 12.694 8.3c2.527 1.988 3.155 4.8 3.03 7.95H1.48c-.214 5.67 3.867 9.092 9.07 7.346 1.825-.613 2.9-2.042 3.438-3.83.273-.896.725-1.036 1.567-.78-.43 2.236-1.4 4.104-3.45 5.273-3.063 1.75-7.435 1.184-9.735-1.248C1 21.6.434 19.812.18 17.9c-.04-.316-.12-.617-.18-.92q.008-.776.008-1.552zm1.498-.38h12.872c-.084-4.1-2.637-7.012-6.126-7.037-3.83-.03-6.58 2.813-6.746 7.037z" }) });

// src/svgs/expressjsDark.tsx
import { jsx as jsx2 } from "react/jsx-runtime";
var ExpressjsDark = (props) => /* @__PURE__ */ jsx2("svg", { ...props, viewBox: "0 0 32 32", children: /* @__PURE__ */ jsx2(
  "path",
  {
    fill: "#fff",
    d: "M32 24.795c-1.164.296-1.884.013-2.53-.957l-4.594-6.356-.664-.88-5.365 7.257c-.613.873-1.256 1.253-2.4.944l6.87-9.222-6.396-8.33c1.1-.214 1.86-.105 2.535.88l4.765 6.435 4.8-6.4c.615-.873 1.276-1.205 2.38-.883l-2.48 3.288-3.36 4.375c-.4.5-.345.842.023 1.325L32 24.795zM.008 15.427l.562-2.764C2.1 7.193 8.37 4.92 12.694 8.3c2.527 1.988 3.155 4.8 3.03 7.95H1.48c-.214 5.67 3.867 9.092 9.07 7.346 1.825-.613 2.9-2.042 3.438-3.83.273-.896.725-1.036 1.567-.78-.43 2.236-1.4 4.104-3.45 5.273-3.063 1.75-7.435 1.184-9.735-1.248C1 21.6.434 19.812.18 17.9c-.04-.316-.12-.617-.18-.92q.008-.776.008-1.552zm1.498-.38h12.872c-.084-4.1-2.637-7.012-6.126-7.037-3.83-.03-6.58 2.813-6.746 7.037z"
  }
) });

// src/svgs/googleCloud.tsx
import { jsx as jsx3, jsxs } from "react/jsx-runtime";
var GoogleCloud = (props) => /* @__PURE__ */ jsxs("svg", { ...props, preserveAspectRatio: "xMidYMid", viewBox: "0 -25 256 256", children: [
  /* @__PURE__ */ jsx3(
    "path",
    {
      fill: "#EA4335",
      d: "m170.252 56.819 22.253-22.253 1.483-9.37C153.437-11.677 88.976-7.496 52.42 33.92 42.267 45.423 34.734 59.764 30.717 74.573l7.97-1.123 44.505-7.34 3.436-3.513c19.797-21.742 53.27-24.667 76.128-6.168l7.496.39Z"
    }
  ),
  /* @__PURE__ */ jsx3(
    "path",
    {
      fill: "#4285F4",
      d: "M224.205 73.918a100.249 100.249 0 0 0-30.217-48.722l-31.232 31.232a55.515 55.515 0 0 1 20.379 44.037v5.544c15.35 0 27.797 12.445 27.797 27.796 0 15.352-12.446 27.485-27.797 27.485h-55.671l-5.466 5.934v33.34l5.466 5.231h55.67c39.93.311 72.553-31.494 72.864-71.424a72.303 72.303 0 0 0-31.793-60.453"
    }
  ),
  /* @__PURE__ */ jsx3(
    "path",
    {
      fill: "#34A853",
      d: "M71.87 205.796h55.593V161.29H71.87a27.275 27.275 0 0 1-11.399-2.498l-7.887 2.42-22.409 22.253-1.952 7.574c12.567 9.489 27.9 14.825 43.647 14.757"
    }
  ),
  /* @__PURE__ */ jsx3(
    "path",
    {
      fill: "#FBBC05",
      d: "M71.87 61.425C31.94 61.664-.237 94.228.001 134.159a72.301 72.301 0 0 0 28.222 56.88l32.248-32.246c-13.99-6.322-20.208-22.786-13.887-36.776 6.32-13.99 22.786-20.208 36.775-13.888a27.796 27.796 0 0 1 13.887 13.888l32.248-32.248A72.224 72.224 0 0 0 71.87 61.425"
    }
  )
] });

// src/svgs/modelContextProtocolDark.tsx
import { jsx as jsx4, jsxs as jsxs2 } from "react/jsx-runtime";
var ModelContextProtocolDark = (props) => /* @__PURE__ */ jsxs2(
  "svg",
  {
    ...props,
    fill: "#ffffff",
    fillRule: "evenodd",
    style: { flex: "none", lineHeight: "1" },
    viewBox: "0 0 24 24",
    children: [
      /* @__PURE__ */ jsx4("title", { children: "ModelContextProtocol" }),
      /* @__PURE__ */ jsx4("path", { d: "M15.688 2.343a2.588 2.588 0 00-3.61 0l-9.626 9.44a.863.863 0 01-1.203 0 .823.823 0 010-1.18l9.626-9.44a4.313 4.313 0 016.016 0 4.116 4.116 0 011.204 3.54 4.3 4.3 0 013.609 1.18l.05.05a4.115 4.115 0 010 5.9l-8.706 8.537a.274.274 0 000 .393l1.788 1.754a.823.823 0 010 1.18.863.863 0 01-1.203 0l-1.788-1.753a1.92 1.92 0 010-2.754l8.706-8.538a2.47 2.47 0 000-3.54l-.05-.049a2.588 2.588 0 00-3.607-.003l-7.172 7.034-.002.002-.098.097a.863.863 0 01-1.204 0 .823.823 0 010-1.18l7.273-7.133a2.47 2.47 0 00-.003-3.537z" }),
      /* @__PURE__ */ jsx4("path", { d: "M14.485 4.703a.823.823 0 000-1.18.863.863 0 00-1.204 0l-7.119 6.982a4.115 4.115 0 000 5.9 4.314 4.314 0 006.016 0l7.12-6.982a.823.823 0 000-1.18.863.863 0 00-1.204 0l-7.119 6.982a2.588 2.588 0 01-3.61 0 2.47 2.47 0 010-3.54l7.12-6.982z" })
    ]
  }
);

// src/svgs/modelContextProtocolLight.tsx
import { jsx as jsx5, jsxs as jsxs3 } from "react/jsx-runtime";
var ModelContextProtocolLight = (props) => /* @__PURE__ */ jsxs3(
  "svg",
  {
    ...props,
    fill: "#000000",
    fillRule: "evenodd",
    style: { flex: "none", lineHeight: "1" },
    viewBox: "0 0 24 24",
    children: [
      /* @__PURE__ */ jsx5("title", { children: "ModelContextProtocol" }),
      /* @__PURE__ */ jsx5("path", { d: "M15.688 2.343a2.588 2.588 0 00-3.61 0l-9.626 9.44a.863.863 0 01-1.203 0 .823.823 0 010-1.18l9.626-9.44a4.313 4.313 0 016.016 0 4.116 4.116 0 011.204 3.54 4.3 4.3 0 013.609 1.18l.05.05a4.115 4.115 0 010 5.9l-8.706 8.537a.274.274 0 000 .393l1.788 1.754a.823.823 0 010 1.18.863.863 0 01-1.203 0l-1.788-1.753a1.92 1.92 0 010-2.754l8.706-8.538a2.47 2.47 0 000-3.54l-.05-.049a2.588 2.588 0 00-3.607-.003l-7.172 7.034-.002.002-.098.097a.863.863 0 01-1.204 0 .823.823 0 010-1.18l7.273-7.133a2.47 2.47 0 00-.003-3.537z" }),
      /* @__PURE__ */ jsx5("path", { d: "M14.485 4.703a.823.823 0 000-1.18.863.863 0 00-1.204 0l-7.119 6.982a4.115 4.115 0 000 5.9 4.314 4.314 0 006.016 0l7.12-6.982a.823.823 0 000-1.18.863.863 0 00-1.204 0l-7.119 6.982a2.588 2.588 0 01-3.61 0 2.47 2.47 0 010-3.54l7.12-6.982z" })
    ]
  }
);

// src/svgs/nextjsIconDark.tsx
import { useId } from "react";
import { jsx as jsx6, jsxs as jsxs4 } from "react/jsx-runtime";
var NextjsIconDark = (props) => {
  const id = useId();
  const maskId = `${id}-nextjs-mask`;
  const wordmarkGradientId = `${id}-nextjs-wordmark-gradient`;
  const stemGradientId = `${id}-nextjs-stem-gradient`;
  return /* @__PURE__ */ jsxs4("svg", { ...props, viewBox: "0 0 180 180", children: [
    /* @__PURE__ */ jsx6(
      "mask",
      {
        height: "180",
        id: maskId,
        maskUnits: "userSpaceOnUse",
        width: "180",
        x: "0",
        y: "0",
        style: { maskType: "alpha" },
        children: /* @__PURE__ */ jsx6("circle", { cx: "90", cy: "90", fill: "black", r: "90" })
      }
    ),
    /* @__PURE__ */ jsxs4("g", { mask: `url(#${maskId})`, children: [
      /* @__PURE__ */ jsx6("circle", { cx: "90", cy: "90", "data-circle": "true", fill: "black", r: "90" }),
      /* @__PURE__ */ jsx6(
        "path",
        {
          d: "M149.508 157.52L69.142 54H54V125.97H66.1136V69.3836L139.999 164.845C143.333 162.614 146.509 160.165 149.508 157.52Z",
          fill: `url(#${wordmarkGradientId})`
        }
      ),
      /* @__PURE__ */ jsx6("rect", { fill: `url(#${stemGradientId})`, height: "72", width: "12", x: "115", y: "54" })
    ] }),
    /* @__PURE__ */ jsxs4("defs", { children: [
      /* @__PURE__ */ jsxs4(
        "linearGradient",
        {
          gradientUnits: "userSpaceOnUse",
          id: wordmarkGradientId,
          x1: "109",
          x2: "144.5",
          y1: "116.5",
          y2: "160.5",
          children: [
            /* @__PURE__ */ jsx6("stop", { stopColor: "white" }),
            /* @__PURE__ */ jsx6("stop", { offset: "1", stopColor: "white", stopOpacity: "0" })
          ]
        }
      ),
      /* @__PURE__ */ jsxs4(
        "linearGradient",
        {
          gradientUnits: "userSpaceOnUse",
          id: stemGradientId,
          x1: "121",
          x2: "120.799",
          y1: "54",
          y2: "106.875",
          children: [
            /* @__PURE__ */ jsx6("stop", { stopColor: "white" }),
            /* @__PURE__ */ jsx6("stop", { offset: "1", stopColor: "white", stopOpacity: "0" })
          ]
        }
      )
    ] })
  ] });
};

// src/svgs/openai.tsx
import { jsx as jsx7 } from "react/jsx-runtime";
var Openai = (props) => /* @__PURE__ */ jsx7("svg", { ...props, preserveAspectRatio: "xMidYMid", viewBox: "0 0 256 260", children: /* @__PURE__ */ jsx7("path", { d: "M239.184 106.203a64.716 64.716 0 0 0-5.576-53.103C219.452 28.459 191 15.784 163.213 21.74A65.586 65.586 0 0 0 52.096 45.22a64.716 64.716 0 0 0-43.23 31.36c-14.31 24.602-11.061 55.634 8.033 76.74a64.665 64.665 0 0 0 5.525 53.102c14.174 24.65 42.644 37.324 70.446 31.36a64.72 64.72 0 0 0 48.754 21.744c28.481.025 53.714-18.361 62.414-45.481a64.767 64.767 0 0 0 43.229-31.36c14.137-24.558 10.875-55.423-8.083-76.483Zm-97.56 136.338a48.397 48.397 0 0 1-31.105-11.255l1.535-.87 51.67-29.825a8.595 8.595 0 0 0 4.247-7.367v-72.85l21.845 12.636c.218.111.37.32.409.563v60.367c-.056 26.818-21.783 48.545-48.601 48.601Zm-104.466-44.61a48.345 48.345 0 0 1-5.781-32.589l1.534.921 51.722 29.826a8.339 8.339 0 0 0 8.441 0l63.181-36.425v25.221a.87.87 0 0 1-.358.665l-52.335 30.184c-23.257 13.398-52.97 5.431-66.404-17.803ZM23.549 85.38a48.499 48.499 0 0 1 25.58-21.333v61.39a8.288 8.288 0 0 0 4.195 7.316l62.874 36.272-21.845 12.636a.819.819 0 0 1-.767 0L41.353 151.53c-23.211-13.454-31.171-43.144-17.804-66.405v.256Zm179.466 41.695-63.08-36.63L161.73 77.86a.819.819 0 0 1 .768 0l52.233 30.184a48.6 48.6 0 0 1-7.316 87.635v-61.391a8.544 8.544 0 0 0-4.4-7.213Zm21.742-32.69-1.535-.922-51.619-30.081a8.39 8.39 0 0 0-8.492 0L99.98 99.808V74.587a.716.716 0 0 1 .307-.665l52.233-30.133a48.652 48.652 0 0 1 72.236 50.391v.205ZM88.061 139.097l-21.845-12.585a.87.87 0 0 1-.41-.614V65.685a48.652 48.652 0 0 1 79.757-37.346l-1.535.87-51.67 29.825a8.595 8.595 0 0 0-4.246 7.367l-.051 72.697Zm11.868-25.58 28.138-16.217 28.188 16.218v32.434l-28.086 16.218-28.188-16.218-.052-32.434Z" }) });

// src/svgs/openaiDark.tsx
import { jsx as jsx8 } from "react/jsx-runtime";
var OpenaiDark = (props) => /* @__PURE__ */ jsx8("svg", { ...props, preserveAspectRatio: "xMidYMid", viewBox: "0 0 256 260", children: /* @__PURE__ */ jsx8(
  "path",
  {
    fill: "#fff",
    d: "M239.184 106.203a64.716 64.716 0 0 0-5.576-53.103C219.452 28.459 191 15.784 163.213 21.74A65.586 65.586 0 0 0 52.096 45.22a64.716 64.716 0 0 0-43.23 31.36c-14.31 24.602-11.061 55.634 8.033 76.74a64.665 64.665 0 0 0 5.525 53.102c14.174 24.65 42.644 37.324 70.446 31.36a64.72 64.72 0 0 0 48.754 21.744c28.481.025 53.714-18.361 62.414-45.481a64.767 64.767 0 0 0 43.229-31.36c14.137-24.558 10.875-55.423-8.083-76.483Zm-97.56 136.338a48.397 48.397 0 0 1-31.105-11.255l1.535-.87 51.67-29.825a8.595 8.595 0 0 0 4.247-7.367v-72.85l21.845 12.636c.218.111.37.32.409.563v60.367c-.056 26.818-21.783 48.545-48.601 48.601Zm-104.466-44.61a48.345 48.345 0 0 1-5.781-32.589l1.534.921 51.722 29.826a8.339 8.339 0 0 0 8.441 0l63.181-36.425v25.221a.87.87 0 0 1-.358.665l-52.335 30.184c-23.257 13.398-52.97 5.431-66.404-17.803ZM23.549 85.38a48.499 48.499 0 0 1 25.58-21.333v61.39a8.288 8.288 0 0 0 4.195 7.316l62.874 36.272-21.845 12.636a.819.819 0 0 1-.767 0L41.353 151.53c-23.211-13.454-31.171-43.144-17.804-66.405v.256Zm179.466 41.695-63.08-36.63L161.73 77.86a.819.819 0 0 1 .768 0l52.233 30.184a48.6 48.6 0 0 1-7.316 87.635v-61.391a8.544 8.544 0 0 0-4.4-7.213Zm21.742-32.69-1.535-.922-51.619-30.081a8.39 8.39 0 0 0-8.492 0L99.98 99.808V74.587a.716.716 0 0 1 .307-.665l52.233-30.133a48.652 48.652 0 0 1 72.236 50.391v.205ZM88.061 139.097l-21.845-12.585a.87.87 0 0 1-.41-.614V65.685a48.652 48.652 0 0 1 79.757-37.346l-1.535.87-51.67 29.825a8.595 8.595 0 0 0-4.246 7.367l-.051 72.697Zm11.868-25.58 28.138-16.217 28.188 16.218v32.434l-28.086 16.218-28.188-16.218-.052-32.434Z"
  }
) });

// src/svgs/openrouterDark.tsx
import { jsx as jsx9, jsxs as jsxs5 } from "react/jsx-runtime";
var OpenrouterDark = (props) => /* @__PURE__ */ jsx9("svg", { ...props, viewBox: "0 0 512 512", fill: "#ffff", stroke: "#ffff", children: /* @__PURE__ */ jsxs5("g", { clipPath: "url(#clip0_205_3)", children: [
  /* @__PURE__ */ jsx9(
    "path",
    {
      d: "M3 248.945C18 248.945 76 236 106 219C136 202 136 202 198 158C276.497 102.293 332 120.945 423 120.945",
      strokeWidth: "90"
    }
  ),
  /* @__PURE__ */ jsx9("path", { d: "M511 121.5L357.25 210.268L357.25 32.7324L511 121.5Z" }),
  /* @__PURE__ */ jsx9(
    "path",
    {
      d: "M0 249C15 249 73 261.945 103 278.945C133 295.945 133 295.945 195 339.945C273.497 395.652 329 377 420 377",
      strokeWidth: "90"
    }
  ),
  /* @__PURE__ */ jsx9("path", { d: "M508 376.445L354.25 287.678L354.25 465.213L508 376.445Z" })
] }) });

// src/svgs/openrouterLight.tsx
import { jsx as jsx10, jsxs as jsxs6 } from "react/jsx-runtime";
var OpenrouterLight = (props) => /* @__PURE__ */ jsx10("svg", { ...props, viewBox: "0 0 512 512", fill: "#111111", stroke: "#111111", children: /* @__PURE__ */ jsxs6("g", { clipPath: "url(#clip0_205_3)", children: [
  /* @__PURE__ */ jsx10(
    "path",
    {
      d: "M3 248.945C18 248.945 76 236 106 219C136 202 136 202 198 158C276.497 102.293 332 120.945 423 120.945",
      strokeWidth: "90"
    }
  ),
  /* @__PURE__ */ jsx10("path", { d: "M511 121.5L357.25 210.268L357.25 32.7324L511 121.5Z" }),
  /* @__PURE__ */ jsx10(
    "path",
    {
      d: "M0 249C15 249 73 261.945 103 278.945C133 295.945 133 295.945 195 339.945C273.497 395.652 329 377 420 377",
      strokeWidth: "90"
    }
  ),
  /* @__PURE__ */ jsx10("path", { d: "M508 376.445L354.25 287.678L354.25 465.213L508 376.445Z" })
] }) });

// src/svgs/pdf.tsx
import { jsx as jsx11, jsxs as jsxs7 } from "react/jsx-runtime";
var Pdf = (props) => /* @__PURE__ */ jsxs7("svg", { ...props, viewBox: "0 0 75.32 92.604", children: [
  /* @__PURE__ */ jsx11(
    "path",
    {
      fill: "#ff2116",
      d: "M-29.633 123.947c-3.552 0-6.443 2.894-6.443 6.446v49.498c0 3.551 2.891 6.445 6.443 6.445h37.85c3.552 0 6.443-2.893 6.443-6.445v-40.702s.102-1.191-.416-2.351a6.516 6.516 0 0 0-1.275-1.844 1.058 1.058 0 0 0-.006-.008l-9.39-9.21a1.058 1.058 0 0 0-.016-.016s-.802-.764-1.99-1.274c-1.4-.6-2.842-.537-2.842-.537l.021-.002z",
      color: "#000",
      fontFamily: "sans-serif",
      overflow: "visible",
      paintOrder: "markers fill stroke",
      style: {
        lineHeight: "normal",
        fontVariantLigatures: "normal",
        fontVariantPosition: "normal",
        fontVariantCaps: "normal",
        fontVariantNumeric: "normal",
        fontVariantAlternates: "normal",
        fontFeatureSettings: "normal",
        textIndent: "0",
        textAlign: "start",
        textDecorationLine: "none",
        textDecorationStyle: "solid",
        textDecorationColor: "#000",
        textTransform: "none",
        textOrientation: "mixed",
        whiteSpace: "normal",
        isolation: "auto",
        mixBlendMode: "normal"
      },
      transform: "translate(53.548 -183.975) scale(1.4843)"
    }
  ),
  /* @__PURE__ */ jsx11(
    "path",
    {
      fill: "#f5f5f5",
      d: "M-29.633 126.064h28.38a1.058 1.058 0 0 0 .02 0s1.135.011 1.965.368a5.385 5.385 0 0 1 1.373.869l9.368 9.19s.564.595.838 1.208c.22.495.234 1.4.234 1.4a1.058 1.058 0 0 0-.002.046v40.746a4.294 4.294 0 0 1-4.326 4.328h-37.85a4.294 4.294 0 0 1-4.326-4.328v-49.498a4.294 4.294 0 0 1 4.326-4.328z",
      color: "#000",
      fontFamily: "sans-serif",
      overflow: "visible",
      paintOrder: "markers fill stroke",
      style: {
        lineHeight: "normal",
        fontVariantLigatures: "normal",
        fontVariantPosition: "normal",
        fontVariantCaps: "normal",
        fontVariantNumeric: "normal",
        fontVariantAlternates: "normal",
        fontFeatureSettings: "normal",
        textIndent: "0",
        textAlign: "start",
        textDecorationLine: "none",
        textDecorationStyle: "solid",
        textDecorationColor: "#000",
        textTransform: "none",
        textOrientation: "mixed",
        whiteSpace: "normal",
        isolation: "auto",
        mixBlendMode: "normal"
      },
      transform: "translate(53.548 -183.975) scale(1.4843)"
    }
  ),
  /* @__PURE__ */ jsx11(
    "path",
    {
      fill: "#ff2116",
      d: "M18.804 55.135c-2.162-2.162.177-5.133 6.526-8.288l3.994-1.985 1.557-3.405a134.054 134.054 0 0 0 2.838-6.79l1.283-3.386-.884-2.506c-1.087-3.08-1.474-7.71-.785-9.374.934-2.255 3.994-2.024 5.205.393.946 1.888.849 5.307-.272 9.618l-.92 3.534.81 1.375c.445.756 1.746 2.55 2.89 3.989l2.152 2.676 2.677-.35c8.503-1.11 11.416.777 11.416 3.48 0 3.413-6.677 3.695-12.284-.243-1.262-.886-2.128-1.767-2.128-1.767s-3.513.716-5.243 1.182c-1.785.48-2.675.782-5.29 1.665 0 0-.918 1.332-1.516 2.301-2.224 3.604-4.821 6.59-6.676 7.677-2.077 1.217-4.254 1.3-5.35.204zm3.393-1.212c1.216-.751 3.676-3.66 5.378-6.361l.69-1.093-3.14 1.578c-4.848 2.438-7.066 4.735-5.913 6.125.648.78 1.423.716 2.985-.25zm31.494-8.84c1.189-.833 1.016-2.51-.328-3.187-1.045-.527-1.888-.635-4.606-.595-1.67.114-4.354.45-4.81.553 0 0 1.476 1.02 2.13 1.394.872.498 2.99 1.422 4.537 1.895 1.526.467 2.409.418 3.077-.06zm-12.663-5.264c-.72-.756-1.943-2.334-2.719-3.507-1.014-1.33-1.523-2.27-1.523-2.27s-.741 2.386-1.35 3.82l-1.898 4.692-.55 1.065s2.925-.96 4.414-1.348c1.576-.412 4.776-1.041 4.776-1.041zm-4.081-16.365c.184-1.54.261-3.078-.233-3.853-1.373-1.5-3.03-.25-2.749 3.318.095 1.2.393 3.25.791 4.515l.725 2.299.51-1.732c.28-.952.71-2.998.956-4.547z"
    }
  ),
  /* @__PURE__ */ jsx11(
    "path",
    {
      fill: "#2c2c2c",
      d: "M-20.93 167.839h2.365q1.133 0 1.84.217.706.21 1.19.944.482.728.482 1.756 0 .945-.392 1.624-.392.678-1.056.98-.658.3-2.03.3h-.818v3.73h-1.581zm1.58 1.224v3.33h.785q1.05 0 1.448-.391.406-.392.406-1.274 0-.657-.266-1.063-.266-.413-.588-.504-.315-.098-1-.098zm5.508-1.224h2.148q1.56 0 2.49.552.938.553 1.414 1.645.483 1.091.483 2.42 0 1.4-.434 2.499-.427 1.091-1.316 1.763-.881.672-2.518.672h-2.267zm1.58 1.266v7.018h.659q1.378 0 2-.952.623-.958.623-2.553 0-3.513-2.623-3.513zm6.473-1.266h5.304v1.266h-3.723v2.855h2.981v1.266h-2.98v4.164H-5.79z",
      fontFamily: "Franklin Gothic Medium Cond",
      letterSpacing: "0",
      style: { lineHeight: "125%" },
      transform: "translate(53.548 -183.975) scale(1.4843)",
      wordSpacing: "4.26"
    }
  )
] });

// src/svgs/postgresql.tsx
import { jsx as jsx12, jsxs as jsxs8 } from "react/jsx-runtime";
var Postgresql = (props) => /* @__PURE__ */ jsx12("svg", { ...props, xmlSpace: "preserve", viewBox: "0 0 432.071 445.383", children: /* @__PURE__ */ jsxs8(
  "g",
  {
    style: {
      fillRule: "nonzero",
      clipRule: "nonzero",
      fill: "none",
      stroke: "#fff",
      strokeWidth: "12.4651",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      strokeMiterlimit: "4"
    },
    children: [
      /* @__PURE__ */ jsx12(
        "path",
        {
          d: "M323.205 324.227c2.833-23.601 1.984-27.062 19.563-23.239l4.463.392c13.517.615 31.199-2.174 41.587-7 22.362-10.376 35.622-27.7 13.572-23.148-50.297 10.376-53.755-6.655-53.755-6.655 53.111-78.803 75.313-178.836 56.149-203.322-52.27-66.789-142.748-35.206-144.262-34.386l-.482.089c-9.938-2.062-21.06-3.294-33.554-3.496-22.761-.374-40.032 5.967-53.133 15.904 0 0-161.408-66.498-153.899 83.628 1.597 31.936 45.777 241.655 98.47 178.31 19.259-23.163 37.871-42.748 37.871-42.748 9.242 6.14 20.307 9.272 31.912 8.147l.897-.765c-.281 2.876-.157 5.689.359 9.019-13.572 15.167-9.584 17.83-36.723 23.416-27.457 5.659-11.326 15.734-.797 18.367 12.768 3.193 42.305 7.716 62.268-20.224l-.795 3.188c5.325 4.26 4.965 30.619 5.72 49.452.756 18.834 2.017 36.409 5.856 46.771 3.839 10.36 8.369 37.05 44.036 29.406 29.809-6.388 52.6-15.582 54.677-101.107",
          style: {
            fill: "#000",
            stroke: "#000",
            strokeWidth: "37.3953",
            strokeLinecap: "butt",
            strokeLinejoin: "miter"
          }
        }
      ),
      /* @__PURE__ */ jsx12(
        "path",
        {
          d: "M402.395 271.23c-50.302 10.376-53.76-6.655-53.76-6.655 53.111-78.808 75.313-178.843 56.153-203.326-52.27-66.785-142.752-35.2-144.262-34.38l-.486.087c-9.938-2.063-21.06-3.292-33.56-3.496-22.761-.373-40.026 5.967-53.127 15.902 0 0-161.411-66.495-153.904 83.63 1.597 31.938 45.776 241.657 98.471 178.312 19.26-23.163 37.869-42.748 37.869-42.748 9.243 6.14 20.308 9.272 31.908 8.147l.901-.765c-.28 2.876-.152 5.689.361 9.019-13.575 15.167-9.586 17.83-36.723 23.416-27.459 5.659-11.328 15.734-.796 18.367 12.768 3.193 42.307 7.716 62.266-20.224l-.796 3.188c5.319 4.26 9.054 27.711 8.428 48.969-.626 21.259-1.044 35.854 3.147 47.254 4.191 11.4 8.368 37.05 44.042 29.406 29.809-6.388 45.256-22.942 47.405-50.555 1.525-19.631 4.976-16.729 5.194-34.28l2.768-8.309c3.192-26.611.507-35.196 18.872-31.203l4.463.392c13.517.615 31.208-2.174 41.591-7 22.358-10.376 35.618-27.7 13.573-23.148z",
          style: { fill: "#336791", stroke: "none" },
          stroke: "none"
        }
      ),
      /* @__PURE__ */ jsx12("path", { d: "M215.866 286.484c-1.385 49.516.348 99.377 5.193 111.495 4.848 12.118 15.223 35.688 50.9 28.045 29.806-6.39 40.651-18.756 45.357-46.051 3.466-20.082 10.148-75.854 11.005-87.281M173.104 38.256S11.583-27.76 19.092 122.365c1.597 31.938 45.779 241.664 98.473 178.316 19.256-23.166 36.671-41.335 36.671-41.335M260.349 26.207c-5.591 1.753 89.848-34.889 144.087 34.417 19.159 24.484-3.043 124.519-56.153 203.329" }),
      /* @__PURE__ */ jsx12(
        "path",
        {
          d: "M348.282 263.953s3.461 17.036 53.764 6.653c22.04-4.552 8.776 12.774-13.577 23.155-18.345 8.514-59.474 10.696-60.146-1.069-1.729-30.355 21.647-21.133 19.96-28.739-1.525-6.85-11.979-13.573-18.894-30.338-6.037-14.633-82.796-126.849 21.287-110.183 3.813-.789-27.146-99.002-124.553-100.599-97.385-1.597-94.19 119.762-94.19 119.762",
          style: { strokeLinejoin: "bevel" }
        }
      ),
      /* @__PURE__ */ jsx12("path", { d: "M188.604 274.334c-13.577 15.166-9.584 17.829-36.723 23.417-27.459 5.66-11.326 15.733-.797 18.365 12.768 3.195 42.307 7.718 62.266-20.229 6.078-8.509-.036-22.086-8.385-25.547-4.034-1.671-9.428-3.765-16.361 3.994z" }),
      /* @__PURE__ */ jsx12("path", { d: "M187.715 274.069c-1.368-8.917 2.93-19.528 7.536-31.942 6.922-18.626 22.893-37.255 10.117-96.339-9.523-44.029-73.396-9.163-73.436-3.193-.039 5.968 2.889 30.26-1.067 58.548-5.162 36.913 23.488 68.132 56.479 64.938" }),
      /* @__PURE__ */ jsx12(
        "path",
        {
          d: "M172.517 141.7c-.288 2.039 3.733 7.48 8.976 8.207 5.234.73 9.714-3.522 9.998-5.559.284-2.039-3.732-4.285-8.977-5.015-5.237-.731-9.719.333-9.996 2.367z",
          style: {
            fill: "#fff",
            strokeWidth: "4.155",
            strokeLinecap: "butt",
            strokeLinejoin: "miter"
          }
        }
      ),
      /* @__PURE__ */ jsx12(
        "path",
        {
          d: "M331.941 137.543c.284 2.039-3.732 7.48-8.976 8.207-5.238.73-9.718-3.522-10.005-5.559-.277-2.039 3.74-4.285 8.979-5.015 5.239-.73 9.718.333 10.002 2.368z",
          style: {
            fill: "#fff",
            strokeWidth: "2.0775",
            strokeLinecap: "butt",
            strokeLinejoin: "miter"
          }
        }
      ),
      /* @__PURE__ */ jsx12("path", { d: "M350.676 123.432c.863 15.994-3.445 26.888-3.988 43.914-.804 24.748 11.799 53.074-7.191 81.435" })
    ]
  }
) });

// src/canvas/ArchitectureNodeIcon.tsx
import { Fragment, jsx as jsx13, jsxs as jsxs9 } from "react/jsx-runtime";
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
    return /* @__PURE__ */ jsx13(
      SemanticIcon,
      {
        ...position,
        className: "text-foreground/55",
        color: "currentColor",
        weight: "regular"
      }
    );
  }
  switch (visual.key) {
    case "express":
      return /* @__PURE__ */ jsxs9(Fragment, { children: [
        /* @__PURE__ */ jsx13(Expressjs, { ...position, className: "adl-icon-light" }),
        /* @__PURE__ */ jsx13(ExpressjsDark, { ...position, className: "adl-icon-dark" })
      ] });
    case "google-cloud":
      return /* @__PURE__ */ jsx13(GoogleCloud, { ...position });
    case "mcp":
      return /* @__PURE__ */ jsxs9(Fragment, { children: [
        /* @__PURE__ */ jsx13(ModelContextProtocolLight, { ...position, className: "adl-icon-light" }),
        /* @__PURE__ */ jsx13(ModelContextProtocolDark, { ...position, className: "adl-icon-dark" })
      ] });
    case "nextjs":
      return /* @__PURE__ */ jsx13(NextjsIconDark, { ...position, className: "dark:invert" });
    case "openai":
      return /* @__PURE__ */ jsxs9(Fragment, { children: [
        /* @__PURE__ */ jsx13(Openai, { ...position, className: "adl-icon-light" }),
        /* @__PURE__ */ jsx13(OpenaiDark, { ...position, className: "adl-icon-dark" })
      ] });
    case "openrouter":
      return /* @__PURE__ */ jsxs9(Fragment, { children: [
        /* @__PURE__ */ jsx13(OpenrouterLight, { ...position, className: "adl-icon-light" }),
        /* @__PURE__ */ jsx13(OpenrouterDark, { ...position, className: "adl-icon-dark" })
      ] });
    case "pdf":
      return /* @__PURE__ */ jsx13(Pdf, { ...position });
    case "postgresql":
      return /* @__PURE__ */ jsx13(Postgresql, { ...position });
  }
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
import { jsx as jsx14, jsxs as jsxs10 } from "react/jsx-runtime";
function TooltipProvider({
  delayDuration = 0,
  ...props
}) {
  return /* @__PURE__ */ jsx14(
    TooltipPrimitive.Provider,
    {
      "data-slot": "tooltip-provider",
      delayDuration,
      ...props
    }
  );
}
function Tooltip({ ...props }) {
  return /* @__PURE__ */ jsx14(TooltipPrimitive.Root, { "data-slot": "tooltip", ...props });
}
function TooltipTrigger({ ...props }) {
  return /* @__PURE__ */ jsx14(TooltipPrimitive.Trigger, { "data-slot": "tooltip-trigger", ...props });
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
  return /* @__PURE__ */ jsx14(TooltipPrimitive.Portal, { children: /* @__PURE__ */ jsxs10(
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
        /* @__PURE__ */ jsx14(
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
import { Fragment as Fragment2, jsx as jsx15, jsxs as jsxs11 } from "react/jsx-runtime";
var strokeForVariant = (variant) => variant === "branch" ? "var(--color-branch)" : "var(--color-cobalt)";
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
  const edgeGradientId = (edgeId) => `arch-edge-${instanceId}-${edgeId.replaceAll(/[^a-zA-Z0-9_-]/g, "-")}`;
  return /* @__PURE__ */ jsxs11(
    "svg",
    {
      viewBox: `0 0 ${layout.width} ${layout.height}`,
      preserveAspectRatio: "xMidYMid meet",
      role: "group",
      "aria-label": ariaLabel,
      className: "block h-auto w-full",
      style: { minWidth: CANVAS_MIN_WIDTH },
      children: [
        /* @__PURE__ */ jsxs11("defs", { children: [
          /* @__PURE__ */ jsx15("pattern", { id: dotsId, width: "22", height: "22", patternUnits: "userSpaceOnUse", children: /* @__PURE__ */ jsx15("circle", { cx: "1", cy: "1", r: "1", fill: "var(--foreground)" }) }),
          /* @__PURE__ */ jsxs11("linearGradient", { id: fadeId, x1: "0%", y1: "0%", x2: "0%", y2: "100%", children: [
            /* @__PURE__ */ jsx15("stop", { offset: "0%", stopColor: "var(--foreground)", stopOpacity: "1" }),
            /* @__PURE__ */ jsx15("stop", { offset: "55%", stopColor: "var(--foreground)", stopOpacity: "0.78" }),
            /* @__PURE__ */ jsx15("stop", { offset: "100%", stopColor: "var(--foreground)", stopOpacity: "0" })
          ] }),
          /* @__PURE__ */ jsx15("mask", { id: maskId, style: { maskType: "alpha" }, children: /* @__PURE__ */ jsx15("rect", { width: layout.width, height: layout.height, fill: `url(#${fadeId})` }) }),
          [
            { id: mainContinuationMarkerId, variant: "main" },
            { id: branchContinuationMarkerId, variant: "branch" }
          ].map(({ id, variant }) => /* @__PURE__ */ jsx15(
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
              children: /* @__PURE__ */ jsx15(
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
            const edgeOpacityValue = edge.variant === "main" ? 0.24 : 0.12;
            return /* @__PURE__ */ jsxs11(
              "linearGradient",
              {
                id: edgeGradientId(edge.id),
                gradientUnits: "userSpaceOnUse",
                x1: edge.startX,
                y1: edge.startY,
                x2: edge.endX,
                y2: edge.endY,
                children: [
                  /* @__PURE__ */ jsx15("stop", { offset: "0%", stopColor: color, stopOpacity: edgeOpacityValue }),
                  /* @__PURE__ */ jsx15("stop", { offset: "24%", stopColor: color, stopOpacity: centreOpacity }),
                  /* @__PURE__ */ jsx15("stop", { offset: "76%", stopColor: color, stopOpacity: centreOpacity }),
                  /* @__PURE__ */ jsx15("stop", { offset: "100%", stopColor: color, stopOpacity: edgeOpacityValue })
                ]
              },
              edge.id
            );
          })
        ] }),
        /* @__PURE__ */ jsx15(
          "rect",
          {
            width: layout.width,
            height: layout.height,
            fill: `url(#${dotsId})`,
            mask: `url(#${maskId})`,
            className: "opacity-[0.075] dark:opacity-[0.12]"
          }
        ),
        layout.containers?.map((container) => /* @__PURE__ */ jsxs11("g", { "data-container-id": container.id, children: [
          /* @__PURE__ */ jsx15(
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
          container.label ? /* @__PURE__ */ jsx15(
            "text",
            {
              x: 18,
              y: container.y + 26,
              letterSpacing: "1.6",
              className: "fill-foreground/60 font-mono text-[11.25px] uppercase",
              children: container.label
            }
          ) : null,
          container.kind ? /* @__PURE__ */ jsx15(
            "text",
            {
              x: 18,
              y: container.y + 44,
              className: "fill-foreground/40 font-mono text-[10px]",
              children: container.kind
            }
          ) : null
        ] }, container.id)),
        layout.lifelines?.map((lifeline) => /* @__PURE__ */ jsx15("g", { "data-lifeline-id": lifeline.id, children: /* @__PURE__ */ jsx15(
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
        /* @__PURE__ */ jsx15("g", { fill: "none", strokeLinecap: "round", strokeLinejoin: "round", children: layout.edges.map((edge) => /* @__PURE__ */ jsx15(
          "path",
          {
            "data-edge-id": edge.id,
            "data-edge-from": edge.from,
            "data-edge-to": edge.to,
            d: edge.d,
            stroke: `url(#${edgeGradientId(edge.id)})`,
            strokeWidth: EDGE_STROKE_WIDTH,
            strokeDasharray: edge.dashed ? "2 7" : void 0,
            opacity: edgeOpacity(edge, highlight),
            className: [
              "transition-opacity duration-150",
              edge.variant === "main" ? "dark:[filter:drop-shadow(0_0_3px_color-mix(in_srgb,var(--color-cobalt)_18%,transparent))]" : ""
            ].join(" ")
          },
          edge.id
        )) }),
        /* @__PURE__ */ jsx15("g", { fill: "none", strokeLinecap: "round", strokeLinejoin: "round", children: layout.continuations?.map((continuation) => /* @__PURE__ */ jsx15(
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
        layout.nodes.filter((node) => node.shape === "bar").map((node) => /* @__PURE__ */ jsx15(
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
        /* @__PURE__ */ jsx15(TooltipProvider, { delayDuration: 140, disableHoverableContent: false, skipDelayDuration: 80, children: layout.nodes.filter((node) => node.shape !== "bar").map((node) => {
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
          const isTerminal = node.shape === "terminal";
          const radius = isState || isTerminal ? Math.min(CARD_R * 2.4, node.h / 2) : CARD_R;
          return /* @__PURE__ */ jsxs11(
            Tooltip,
            {
              open: isTooltipOpen,
              onOpenChange: (open) => {
                if (open) setDismissedNodeId(null);
                onTooltipNodeChange(node.id, open);
              },
              children: [
                /* @__PURE__ */ jsx15(TooltipTrigger, { asChild: true, children: /* @__PURE__ */ jsxs11(
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
                      /* @__PURE__ */ jsx15("desc", { id: descriptionId, children: node.description }),
                      isEvent ? /* @__PURE__ */ jsxs11(Fragment2, { children: [
                        /* @__PURE__ */ jsx15(
                          "line",
                          {
                            x1: node.cx,
                            y1: node.cy,
                            x2: node.cx,
                            y2: node.y,
                            stroke: strokeForVariant(node.weight === "primary" ? "main" : "branch"),
                            strokeWidth: EDGE_STROKE_WIDTH,
                            strokeDasharray: "2 4"
                          }
                        ),
                        /* @__PURE__ */ jsx15(
                          "circle",
                          {
                            cx: node.cx,
                            cy: node.cy,
                            r: DOT_R,
                            fill: "var(--background)",
                            stroke: strokeForVariant(node.weight === "primary" ? "main" : "branch"),
                            strokeWidth: 1.2
                          }
                        ),
                        /* @__PURE__ */ jsx15("circle", { cx: node.cx, cy: node.cy, r: DOT_R / 2.6, fill: strokeForVariant(node.weight === "primary" ? "main" : "branch") }),
                        node.kind ? /* @__PURE__ */ jsx15(
                          "text",
                          {
                            x: node.cx,
                            y: node.y - 24,
                            textAnchor: "middle",
                            letterSpacing: "1.4",
                            className: "fill-foreground/45 font-mono text-[10px] uppercase",
                            children: node.kind
                          }
                        ) : null,
                        /* @__PURE__ */ jsx15(
                          "text",
                          {
                            x: node.cx,
                            y: node.y,
                            textAnchor: "middle",
                            className: node.weight === "primary" ? "fill-foreground text-[13.5px]" : "fill-foreground/82 text-[13.5px]",
                            children: node.label
                          }
                        ),
                        node.sublabel ? /* @__PURE__ */ jsx15(
                          "text",
                          {
                            x: node.cx,
                            y: node.y + 18,
                            textAnchor: "middle",
                            className: "fill-foreground/55 font-mono text-[10.5px]",
                            children: node.sublabel
                          }
                        ) : null,
                        /* @__PURE__ */ jsx15(
                          "circle",
                          {
                            "data-node-hit-area": "true",
                            cx: node.cx,
                            cy: node.cy,
                            r: 18,
                            fill: "transparent"
                          }
                        )
                      ] }) : isTable ? /* @__PURE__ */ jsxs11(Fragment2, { children: [
                        /* @__PURE__ */ jsx15(
                          "rect",
                          {
                            x: node.x,
                            y: node.y,
                            width: node.w,
                            height: node.h,
                            rx: CARD_R,
                            fill: node.weight === "primary" ? "color-mix(in srgb, var(--foreground) 4%, var(--background))" : "transparent",
                            stroke: node.weight === "primary" ? "color-mix(in srgb, var(--foreground) 28%, var(--border))" : "var(--border)",
                            strokeWidth: 1
                          }
                        ),
                        /* @__PURE__ */ jsx15(
                          "rect",
                          {
                            x: node.x,
                            y: node.y,
                            width: node.w,
                            height: 26,
                            rx: CARD_R,
                            fill: "color-mix(in srgb, var(--foreground) 6%, transparent)"
                          }
                        ),
                        /* @__PURE__ */ jsx15(
                          "text",
                          {
                            x: node.x + 14,
                            y: node.y + 17.5,
                            className: node.weight === "primary" ? "fill-foreground text-[13px]" : "fill-foreground/82 text-[13px]",
                            children: node.label
                          }
                        ),
                        (node.fields ?? []).map((field, fieldIndex) => /* @__PURE__ */ jsxs11("g", { children: [
                          /* @__PURE__ */ jsx15(
                            "line",
                            {
                              x1: node.x,
                              y1: node.y + 26 + fieldIndex * 22,
                              x2: node.x + node.w,
                              y2: node.y + 26 + fieldIndex * 22,
                              stroke: "var(--border)",
                              strokeWidth: 0.75
                            }
                          ),
                          /* @__PURE__ */ jsxs11(
                            "text",
                            {
                              x: node.x + 14,
                              y: node.y + 26 + fieldIndex * 22 + 14.5,
                              className: "fill-foreground/80 font-mono text-[11px]",
                              children: [
                                field.key === "pk" ? "\u{1F511} " : field.key === "fk" ? "\u2197 " : "",
                                field.name
                              ]
                            }
                          ),
                          field.type ? /* @__PURE__ */ jsx15(
                            "text",
                            {
                              x: node.x + node.w - 14,
                              y: node.y + 26 + fieldIndex * 22 + 14.5,
                              textAnchor: "end",
                              className: "fill-foreground/45 font-mono text-[10px]",
                              children: field.type
                            }
                          ) : null,
                          field.key === "unique" ? /* @__PURE__ */ jsx15(
                            "text",
                            {
                              x: node.x + node.w - (field.type ? 80 : 14),
                              y: node.y + 26 + fieldIndex * 22 + 14.5,
                              textAnchor: "end",
                              className: "fill-foreground/40 font-mono text-[9.5px]",
                              children: "unique"
                            }
                          ) : null
                        ] }, `${node.id}-${field.name}`))
                      ] }) : isMuted ? /* @__PURE__ */ jsx15(
                        "line",
                        {
                          x1: node.x,
                          y1: node.y + node.h,
                          x2: node.x + node.w,
                          y2: node.y + node.h,
                          stroke: "var(--border)",
                          strokeWidth: 1
                        }
                      ) : /* @__PURE__ */ jsx15(
                        "rect",
                        {
                          x: node.x,
                          y: node.y,
                          width: node.w,
                          height: node.h,
                          rx: radius,
                          fill: weight === "primary" ? "color-mix(in srgb, var(--foreground) 4%, var(--background))" : "transparent",
                          stroke: weight === "primary" ? "color-mix(in srgb, var(--foreground) 28%, var(--border))" : "var(--border)",
                          strokeWidth: 1,
                          className: weight === "primary" ? "opacity-100" : "opacity-70"
                        }
                      ),
                      !isEvent ? /* @__PURE__ */ jsx15(
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
                      /* @__PURE__ */ jsx15(
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
                      isState ? /* @__PURE__ */ jsxs11(Fragment2, { children: [
                        node.initial ? /* @__PURE__ */ jsx15(
                          "rect",
                          {
                            x: node.x + 4,
                            y: node.y + 4,
                            width: node.w - 8,
                            height: node.h - 8,
                            rx: radius - 4,
                            fill: "none",
                            stroke: "var(--border)",
                            strokeWidth: 1,
                            className: "pointer-events-none"
                          }
                        ) : null,
                        node.final ? /* @__PURE__ */ jsx15(
                          "circle",
                          {
                            cx: node.cx,
                            cy: node.cy,
                            r: 7,
                            fill: "var(--background)",
                            stroke: "var(--foreground)",
                            strokeWidth: 1.2,
                            className: "pointer-events-none"
                          }
                        ) : null
                      ] }) : null,
                      !isEvent && visual ? /* @__PURE__ */ jsx15(
                        ArchitectureNodeIcon,
                        {
                          size: NODE_ICON_SIZE,
                          visual,
                          x: node.x + 15,
                          y: node.cy - NODE_ICON_SIZE / 2
                        }
                      ) : null,
                      !isEvent && !isTable && node.kind ? /* @__PURE__ */ jsx15(
                        "text",
                        {
                          x: node.x + CARD_TEXT_X,
                          y: node.y + 24,
                          letterSpacing: "1.6",
                          className: "fill-foreground/45 font-mono text-[11.25px] uppercase",
                          children: node.kind
                        }
                      ) : null,
                      !isEvent && !isTable ? /* @__PURE__ */ jsx15(
                        "text",
                        {
                          x: node.x + CARD_TEXT_X,
                          y: node.y + 48,
                          className: weight === "primary" ? "fill-foreground text-[14.5px]" : "fill-foreground/82 text-[14.5px]",
                          children: node.label
                        }
                      ) : null,
                      !isEvent && !isTable && node.sublabel ? /* @__PURE__ */ jsx15(
                        "text",
                        {
                          x: node.x + CARD_TEXT_X,
                          y: node.y + 70,
                          className: "fill-foreground/55 font-mono text-[11.25px]",
                          children: node.sublabel
                        }
                      ) : null
                    ]
                  }
                ) }),
                /* @__PURE__ */ jsxs11(
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
                    className: "block max-w-[min(19rem,calc(100vw-2rem))] px-4 py-3.5 text-left",
                    children: [
                      /* @__PURE__ */ jsx15("span", { className: "block font-mono text-[9px] uppercase tracking-[0.16em] text-foreground/45", children: node.kind ?? node.label }),
                      node.kind ? /* @__PURE__ */ jsx15("span", { className: "mt-1 block text-[13px] font-medium leading-tight text-foreground", children: node.label }) : null,
                      node.sublabel ? /* @__PURE__ */ jsx15("span", { className: "mt-1 block font-mono text-[10px] leading-relaxed text-foreground/55", children: node.sublabel }) : null,
                      /* @__PURE__ */ jsx15("span", { className: "mt-2.5 block border-t border-border/70 pt-2.5 text-[11.5px] leading-[1.55] text-foreground/78", children: node.description })
                    ]
                  }
                )
              ]
            },
            node.id
          );
        }) }),
        layout.decisions?.map((decision) => /* @__PURE__ */ jsxs11(
          "g",
          {
            "data-decision-id": decision.id,
            opacity: !highlight || highlight.nodes.has(decision.source) ? 1 : DIMMED_OPACITY,
            className: "transition-opacity duration-150",
            children: [
              /* @__PURE__ */ jsx15(
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
              /* @__PURE__ */ jsx15(
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
          return /* @__PURE__ */ jsxs11(
            "g",
            {
              opacity: edgeOpacity(edge, highlight),
              className: "transition-opacity duration-150",
              children: [
                /* @__PURE__ */ jsx15(
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
                /* @__PURE__ */ jsx15(
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
        layout.continuations?.map((continuation) => /* @__PURE__ */ jsxs11(
          "g",
          {
            "data-continuation-label": continuation.id,
            opacity: continuationOpacity(continuation, highlight),
            className: "transition-opacity duration-150",
            children: [
              /* @__PURE__ */ jsx15(
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
              /* @__PURE__ */ jsx15(
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
  DiagramCanvas_default as DiagramCanvasDefault
};
