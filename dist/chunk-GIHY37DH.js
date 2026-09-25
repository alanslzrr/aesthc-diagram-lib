import {
  brandIcons,
  scopeIconMarkup
} from "./chunk-KDAWQGDC.js";

// src/brand-icons/index.tsx
import { useId } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
function BrandIcon({ name, ...props }) {
  const id = `adl-brand-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const data = brandIcons[name];
  const scope = (body, suffix) => scopeIconMarkup(body, `${id}-${suffix}`);
  if ("light" in data && "dark" in data) {
    return /* @__PURE__ */ jsxs(
      "svg",
      {
        width: "24",
        height: "24",
        fill: "none",
        viewBox: data.light.viewBox,
        "aria-hidden": "true",
        focusable: "false",
        xmlnsXlink: "http://www.w3.org/1999/xlink",
        ...props,
        children: [
          /* @__PURE__ */ jsx(
            "g",
            {
              className: "adl-icon-light",
              dangerouslySetInnerHTML: { __html: scope(data.light.body, "light") }
            }
          ),
          /* @__PURE__ */ jsx(
            "g",
            {
              className: "adl-icon-dark",
              dangerouslySetInnerHTML: { __html: scope(data.dark.body, "dark") }
            }
          )
        ]
      }
    );
  }
  return /* @__PURE__ */ jsx(
    "svg",
    {
      width: "24",
      height: "24",
      viewBox: data.default.viewBox,
      fill: "#000000",
      "aria-hidden": "true",
      focusable: "false",
      xmlnsXlink: "http://www.w3.org/1999/xlink",
      ...props,
      className: [
        name === "nextjs" || name === "express" ? "adl-brand-monochrome" : "",
        props.className
      ].filter(Boolean).join(" "),
      dangerouslySetInnerHTML: { __html: scope(data.default.body, "default") }
    }
  );
}

export {
  BrandIcon
};
