import {
  validateDeploymentProfile
} from "./chunk-D5YCKARS.js";
import {
  createCanvasTextMeasurer,
  createEmbeddedFontTextMeasurer,
  estimateTextWidth,
  getAdapter,
  pruneReferences,
  resolveDocument
} from "./chunk-LYWSIJPC.js";
import {
  serializeDocument
} from "./chunk-TSYG4LOT.js";
import {
  canonical,
  edgesOf,
  failure,
  issue,
  nodesOf,
  success,
  validateDocument
} from "./chunk-TN5OC77A.js";
import {
  escapeXml,
  renderSceneMarkup,
  renderSvg
} from "./chunk-S6PSHJSL.js";

// src/export/raster.ts
async function rasterizeSvg(svg, mime, width, height, signal) {
  if (typeof document === "undefined" || typeof Image === "undefined")
    return failure("export.environment");
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return failure("export.context");
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" })), image = new Image();
  try {
    await new Promise((resolve, reject) => {
      const abort = () => {
        cleanup();
        reject(Error("operation.aborted"));
      };
      const cleanup = () => {
        image.onload = null;
        image.onerror = null;
        signal?.removeEventListener("abort", abort);
      };
      image.onload = () => {
        cleanup();
        resolve();
      };
      image.onerror = () => {
        cleanup();
        reject(Error("export.image"));
      };
      signal?.addEventListener("abort", abort, { once: true });
      if (signal?.aborted) abort();
      else image.src = url;
    });
    if (signal?.aborted) return failure("operation.aborted");
    context.drawImage(image, 0, 0, width, height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, 0.92));
    if (signal?.aborted) return failure("operation.aborted");
    if (!blob) return failure("export.encode");
    if (blob.type !== mime) return failure("export.mime");
    return success(new Uint8Array(await blob.arrayBuffer()));
  } catch (error) {
    return failure(
      error instanceof Error && error.message === "operation.aborted" ? "operation.aborted" : error instanceof Error && error.message === "export.image" ? "export.image" : "export.raster"
    );
  } finally {
    image.src = "";
    URL.revokeObjectURL(url);
    canvas.width = 0;
    canvas.height = 0;
  }
}

// src/assets/fonts/notices.json
var notices_default = [
  'Copyright (c) 2023 Vercel, in collaboration with basement.studio\n\nThis Font Software is licensed under the SIL Open Font License, Version 1.1.\nThis license is copied below, and is also available with a FAQ at:\nhttp://scripts.sil.org/OFL\n\n-----------------------------------------------------------\nSIL OPEN FONT LICENSE Version 1.1 - 26 February 2007\n-----------------------------------------------------------\n\nPREAMBLE\nThe goals of the Open Font License (OFL) are to stimulate worldwide\ndevelopment of collaborative font projects, to support the font creation\nefforts of academic and linguistic communities, and to provide a free and\nopen framework in which fonts may be shared and improved in partnership\nwith others.\n\nThe OFL allows the licensed fonts to be used, studied, modified and\nredistributed freely as long as they are not sold by themselves. The\nfonts, including any derivative works, can be bundled, embedded,\nredistributed and/or sold with any software provided that any reserved\nnames are not used by derivative works. The fonts and derivatives,\nhowever, cannot be released under any other type of license. The\nrequirement for fonts to remain under this license does not apply\nto any document created using the fonts or their derivatives.\n\nDEFINITIONS\n"Font Software" refers to the set of files released by the Copyright\nHolder(s) under this license and clearly marked as such. This may\ninclude source files, build scripts and documentation.\n\n"Reserved Font Name" refers to any names specified as such after the\ncopyright statement(s).\n\n"Original Version" refers to the collection of Font Software components as\ndistributed by the Copyright Holder(s).\n\n"Modified Version" refers to any derivative made by adding to, deleting,\nor substituting -- in part or in whole -- any of the components of the\nOriginal Version, by changing formats or by porting the Font Software to a\nnew environment.\n\n"Author" refers to any designer, engineer, programmer, technical\nwriter or other person who contributed to the Font Software.\n\nPERMISSION AND CONDITIONS\nPermission is hereby granted, free of charge, to any person obtaining\na copy of the Font Software, to use, study, copy, merge, embed, modify,\nredistribute, and sell modified and unmodified copies of the Font\nSoftware, subject to the following conditions:\n\n1) Neither the Font Software nor any of its individual components,\nin Original or Modified Versions, may be sold by itself.\n\n2) Original or Modified Versions of the Font Software may be bundled,\nredistributed and/or sold with any software, provided that each copy\ncontains the above copyright notice and this license. These can be\nincluded either as stand-alone text files, human-readable headers or\nin the appropriate machine-readable metadata fields within text or\nbinary files as long as those fields can be easily viewed by the user.\n\n3) No Modified Version of the Font Software may use the Reserved Font\nName(s) unless explicit written permission is granted by the corresponding\nCopyright Holder. This restriction only applies to the primary font name as\npresented to the users.\n\n4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font\nSoftware shall not be used to promote, endorse or advertise any\nModified Version, except to acknowledge the contribution(s) of the\nCopyright Holder(s) and the Author(s) or with their explicit written\npermission.\n\n5) The Font Software, modified or unmodified, in part or in whole,\nmust be distributed entirely under this license, and must not be\ndistributed under any other license. The requirement for fonts to\nremain under this license does not apply to any document created\nusing the Font Software.\n\nTERMINATION\nThis license becomes null and void if any of the above conditions are\nnot met.\n\nDISCLAIMER\nTHE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,\nEXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF\nMERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT\nOF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE\nCOPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,\nINCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL\nDAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING\nFROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM\nOTHER DEALINGS IN THE FONT SOFTWARE.\n',
  'Copyright 2024 The Geist Project Authors (https://github.com/vercel/geist-font.git)\n\nThis Font Software is licensed under the SIL Open Font License, Version 1.1.\nThis license is copied below, and is also available with a FAQ at:\nhttps://openfontlicense.org\n\n\n-----------------------------------------------------------\nSIL OPEN FONT LICENSE Version 1.1 - 26 February 2007\n-----------------------------------------------------------\n\nPREAMBLE\nThe goals of the Open Font License (OFL) are to stimulate worldwide\ndevelopment of collaborative font projects, to support the font creation\nefforts of academic and linguistic communities, and to provide a free and\nopen framework in which fonts may be shared and improved in partnership\nwith others.\n\nThe OFL allows the licensed fonts to be used, studied, modified and\nredistributed freely as long as they are not sold by themselves. The\nfonts, including any derivative works, can be bundled, embedded, \nredistributed and/or sold with any software provided that any reserved\nnames are not used by derivative works. The fonts and derivatives,\nhowever, cannot be released under any other type of license. The\nrequirement for fonts to remain under this license does not apply\nto any document created using the fonts or their derivatives.\n\nDEFINITIONS\n"Font Software" refers to the set of files released by the Copyright\nHolder(s) under this license and clearly marked as such. This may\ninclude source files, build scripts and documentation.\n\n"Reserved Font Name" refers to any names specified as such after the\ncopyright statement(s).\n\n"Original Version" refers to the collection of Font Software components as\ndistributed by the Copyright Holder(s).\n\n"Modified Version" refers to any derivative made by adding to, deleting,\nor substituting -- in part or in whole -- any of the components of the\nOriginal Version, by changing formats or by porting the Font Software to a\nnew environment.\n\n"Author" refers to any designer, engineer, programmer, technical\nwriter or other person who contributed to the Font Software.\n\nPERMISSION & CONDITIONS\nPermission is hereby granted, free of charge, to any person obtaining\na copy of the Font Software, to use, study, copy, merge, embed, modify,\nredistribute, and sell modified and unmodified copies of the Font\nSoftware, subject to the following conditions:\n\n1) Neither the Font Software nor any of its individual components,\nin Original or Modified Versions, may be sold by itself.\n\n2) Original or Modified Versions of the Font Software may be bundled,\nredistributed and/or sold with any software, provided that each copy\ncontains the above copyright notice and this license. These can be\nincluded either as stand-alone text files, human-readable headers or\nin the appropriate machine-readable metadata fields within text or\nbinary files as long as those fields can be easily viewed by the user.\n\n3) No Modified Version of the Font Software may use the Reserved Font\nName(s) unless explicit written permission is granted by the corresponding\nCopyright Holder. This restriction only applies to the primary font name as\npresented to the users.\n\n4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font\nSoftware shall not be used to promote, endorse or advertise any\nModified Version, except to acknowledge the contribution(s) of the\nCopyright Holder(s) and the Author(s) or with their explicit written\npermission.\n\n5) The Font Software, modified or unmodified, in part or in whole,\nmust be distributed entirely under this license, and must not be\ndistributed under any other license. The requirement for fonts to\nremain under this license does not apply to any document created\nusing the Font Software.\n\nTERMINATION\nThis license becomes null and void if any of the above conditions are\nnot met.\n\nDISCLAIMER\nTHE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,\nEXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF\nMERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT\nOF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE\nCOPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,\nINCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL\nDAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING\nFROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM\nOTHER DEALINGS IN THE FONT SOFTWARE.'
];

// src/export/metadata.ts
function projectDocumentMetadata(document2, policy = "minimal") {
  const reduced = structuredClone(document2);
  if (policy === "all") return reduced;
  const project = (entity) => {
    const next = { roles: [...entity.roles], tags: [...entity.tags] };
    if (entity.owner !== void 0) next.owner = entity.owner;
    if (entity.visibility !== void 0) next.visibility = entity.visibility;
    if (entity.crossing !== void 0) next.crossing = entity.crossing;
    return next;
  };
  for (const [id, entity] of Object.entries(reduced.metadata.nodes))
    reduced.metadata.nodes[id] = project(entity);
  for (const [id, entity] of Object.entries(reduced.metadata.edges))
    reduced.metadata.edges[id] = project(entity);
  reduced.extensions = {};
  return reduced;
}

// src/export/html.ts
function base64(bytes) {
  let raw = "";
  for (const byte of bytes) raw += String.fromCharCode(byte);
  return btoa(raw);
}
function fontCss(fonts) {
  return `@font-face{font-family:Geist;src:url(data:font/woff2;base64,${base64(fonts.sans)}) format("woff2")}@font-face{font-family:"Geist Mono";src:url(data:font/woff2;base64,${base64(fonts.mono)}) format("woff2")}`;
}
function embedJson(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c").replaceAll(">", "\\u003e");
}
function sha256Base64(input) {
  const bytes = new TextEncoder().encode(input);
  const h = [
    1779033703,
    3144134277,
    1013904242,
    2773480762,
    1359893119,
    2600822924,
    528734635,
    1541459225
  ];
  const k = [
    1116352408,
    1899447441,
    3049323471,
    3921009573,
    961987163,
    1508970993,
    2453635748,
    2870763221,
    3624381080,
    310598401,
    607225278,
    1426881987,
    1925078388,
    2162078206,
    2614888103,
    3248222580,
    3835390401,
    4022224774,
    264347078,
    604807628,
    770255983,
    1249150122,
    1555081692,
    1996064986,
    2554220882,
    2821834349,
    2952996808,
    3210313671,
    3336571891,
    3584528711,
    113926993,
    338241895,
    666307205,
    773529912,
    1294757372,
    1396182291,
    1695183700,
    1986661051,
    2177026350,
    2456956037,
    2730485921,
    2820302411,
    3259730800,
    3345764771,
    3516065817,
    3600352804,
    4094571909,
    275423344,
    430227734,
    506948616,
    659060556,
    883997877,
    958139571,
    1322822218,
    1537002063,
    1747873779,
    1955562222,
    2024104815,
    2227730452,
    2361852424,
    2428436474,
    2756734187,
    3204031479,
    3329325298
  ];
  const rotr = (value, bits2) => value >>> bits2 | value << 32 - bits2;
  const padded = new Uint8Array(Math.ceil((bytes.length + 9) / 64) * 64);
  padded.set(bytes);
  padded[bytes.length] = 128;
  const view = new DataView(padded.buffer);
  const bits = bytes.length * 8;
  view.setUint32(padded.length - 8, Math.floor(bits / 4294967296));
  view.setUint32(padded.length - 4, bits >>> 0);
  const w = new Uint32Array(64);
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let index = 0; index < 16; index++) w[index] = view.getUint32(offset + index * 4);
    for (let index = 16; index < 64; index++) {
      const s0 = rotr(w[index - 15], 7) ^ rotr(w[index - 15], 18) ^ w[index - 15] >>> 3;
      const s1 = rotr(w[index - 2], 17) ^ rotr(w[index - 2], 19) ^ w[index - 2] >>> 10;
      w[index] = w[index - 16] + s0 + w[index - 7] + s1 >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let index = 0; index < 64; index++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = e & f ^ ~e & g;
      const temp1 = hh + S1 + ch + k[index] + w[index] >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = a & b ^ a & c ^ b & c;
      const temp2 = S0 + maj >>> 0;
      hh = g;
      g = f;
      f = e;
      e = d + temp1 >>> 0;
      d = c;
      c = b;
      b = a;
      a = temp1 + temp2 >>> 0;
    }
    h[0] = h[0] + a >>> 0;
    h[1] = h[1] + b >>> 0;
    h[2] = h[2] + c >>> 0;
    h[3] = h[3] + d >>> 0;
    h[4] = h[4] + e >>> 0;
    h[5] = h[5] + f >>> 0;
    h[6] = h[6] + g >>> 0;
    h[7] = h[7] + hh >>> 0;
  }
  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  h.forEach((value, index) => outView.setUint32(index * 4, value));
  let binary = "";
  for (const byte of out) binary += String.fromCharCode(byte);
  return btoa(binary);
}
function exportDocumentHtml(input, options) {
  const checked = validateDocument(input);
  if (!checked.ok) return checked;
  const document2 = checked.value;
  const theme = options.theme ?? document2.presentation.theme.mode;
  const resolved = resolveDocument(document2, {
    quality: "edit",
    requestId: "html",
    theme,
    measureText: createCanvasTextMeasurer() ?? estimateTextWidth,
    renderers: options.registry
  });
  if (!resolved.ok) return resolved;
  const missingRenderer = resolved.diagnostics.find(
    (diagnostic) => diagnostic.code === "renderer.unsupported" || diagnostic.code === "renderer.invalid" || diagnostic.code === "renderer.measure" || diagnostic.code === "renderer.empty" || diagnostic.code === "renderer.failed"
  );
  if (missingRenderer) return { ok: false, diagnostics: resolved.diagnostics };
  const svg = renderSvg(document2, resolved.value, {
    instanceId: "standalone",
    theme,
    background: "theme"
  });
  const nodes = nodesOf(document2.spec);
  const edges = edgesOf(document2.spec);
  const nodeLabel = (id) => nodes.find((node) => node.id === id)?.label ?? id;
  const locale = document2.locale;
  const text = (en, es) => locale === "es" ? es : en;
  const entityList = [
    `<h2>${escapeXml(text("Entities", "Entidades"))}</h2>`,
    "<ul>",
    ...nodes.map((node) => {
      const description = node.description;
      return `<li><strong>${escapeXml(node.label)}</strong> <code>${escapeXml(node.id)}</code>${node.kind ? ` \u2014 ${escapeXml(node.kind)}` : ""}${description ? `<p>${escapeXml(description)}</p>` : ""}</li>`;
    }),
    "</ul>",
    `<h2>${escapeXml(text("Relations", "Relaciones"))}</h2>`,
    "<ul>",
    ...edges.map(
      (edge) => `<li><code>${escapeXml(edge.id ?? `${edge.from}\u2192${edge.to}`)}</code>: ${escapeXml(
        nodeLabel(edge.from)
      )} \u2192 ${escapeXml(nodeLabel(edge.to))}${edge.label ? ` (${escapeXml(edge.label)})` : ""}</li>`
    ),
    "</ul>"
  ].join("\n");
  const frozen = {};
  if (document2.spec.type === "graph")
    for (const node of document2.spec.nodes) {
      if (!node.renderer) continue;
      const placed = resolved.value.layout.nodeById[node.id];
      if (!placed?.customSvg) continue;
      frozen[node.id] = {
        svg: placed.customSvg,
        width: placed.w,
        height: placed.h,
        typeKey: node.renderer.typeKey
      };
    }
  const metadataPolicy = options.metadata ?? "minimal";
  const runtimeDocument = metadataPolicy === "all" ? structuredClone(document2) : projectDocumentMetadata(document2, "minimal");
  runtimeDocument.presentation.theme.mode = theme;
  if (runtimeDocument.spec.type === "graph") {
    for (const node of runtimeDocument.spec.nodes)
      if (node.renderer && frozen[node.id])
        node.renderer = { typeKey: node.renderer.typeKey, data: { __adlFrozen: node.id } };
  }
  const frozenSection = Object.keys(frozen).length > 0 ? `<script type="application/json" id="aesthc-frozen">${embedJson(frozen)}</script>` : "";
  const sourceSection = options.includeSource ? `<script type="application/json" id="aesthc-source">${canonical(document2).replaceAll("<", "\\u003c").replaceAll(">", "\\u003e")}</script>` : "";
  const scriptHash = sha256Base64(options.runtime);
  const html = [
    "<!doctype html>",
    `<html lang="${escapeXml(locale)}">`,
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<meta name="color-scheme" content="light dark">',
    `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'sha256-${scriptHash}'; img-src data:; font-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'">`,
    `<title>${escapeXml(options.title ?? document2.spec.caption)}</title>`,
    `<!-- ${escapeXml(notices_default.join(" "))} -->`,
    `<style>${fontCss(options.fonts)}${options.css}body{margin:0}main{padding:16px}.aesthc-static svg{display:block;max-width:none;height:auto}#aesthc-standalone{min-height:100vh}</style>`,
    "</head>",
    "<body>",
    `<main id="aesthc-fallback" data-theme="${theme}">`,
    `<div class="aesthc-static">${svg}</div>`,
    entityList,
    "</main>",
    '<div id="aesthc-standalone" hidden></div>',
    `<script type="application/json" id="aesthc-document">${embedJson(runtimeDocument)}</script>`,
    frozenSection,
    sourceSection,
    `<script>${options.runtime}</script>`,
    "</body>",
    "</html>"
  ].join("\n");
  const bytes = new TextEncoder().encode(html).byteLength;
  if (bytes > 8 * 1024 * 1024) return failure("export.bytes");
  return success({
    html,
    receipt: {
      documentId: document2.id,
      revision: document2.revision,
      mimeType: "text/html",
      bytes,
      canonical: true,
      sourceIncluded: !!options.includeSource,
      metadata: metadataPolicy,
      frozenCustomNodes: Object.keys(frozen).length,
      verified: false,
      runtimeBytes: new TextEncoder().encode(options.runtime).byteLength,
      fontBytes: options.fonts.sans.byteLength + options.fonts.mono.byteLength
    }
  });
}

// src/export/cards.ts
var CARD_WIDTH = 1200;
var CARD_HEIGHT = 630;
function validateCardQuery(document2, query) {
  if (!query) return success(null);
  if (query.documentId !== document2.id || query.revision !== document2.revision)
    return failure("query.stale");
  if (query.nodeIds.length === 0 && query.edgeIds.length === 0) return failure("query.invalid");
  const nodeIds = new Set(nodesOf(document2.spec).map((node) => node.id));
  const edgeIds = new Set(edgesOf(document2.spec).map((edge) => edge.id));
  if (query.nodeIds.some((id) => !nodeIds.has(id))) return failure("reference.missing");
  if (query.edgeIds.some((id) => !edgeIds.has(id))) return failure("reference.missing");
  return success({
    nodes: new Set(query.nodeIds),
    edges: new Set(query.edgeIds),
    label: query.label ?? ""
  });
}
function cardSvg(input, options = {}) {
  const checked = validateDocument(input);
  if (!checked.ok) return checked;
  const document2 = checked.value;
  const query = validateCardQuery(document2, options.query);
  if (!query.ok) return query;
  const theme = options.theme ?? document2.presentation.theme.mode;
  const palette = document2.presentation.theme[theme];
  const resolved = resolveDocument(document2, {
    quality: "edit",
    requestId: "card",
    theme,
    measureText: createCanvasTextMeasurer() ?? estimateTextWidth,
    renderers: options.registry
  });
  if (!resolved.ok) return resolved;
  const missingRenderer = resolved.diagnostics.find(
    (diagnostic) => diagnostic.code === "renderer.unsupported" || diagnostic.code === "renderer.invalid" || diagnostic.code === "renderer.measure" || diagnostic.code === "renderer.empty" || diagnostic.code === "renderer.failed"
  );
  if (missingRenderer) return { ok: false, diagnostics: resolved.diagnostics };
  const layout = resolved.value.layout;
  const padding = options.padding ?? 40;
  if (!Number.isFinite(padding) || padding < 0 || padding * 2 >= Math.min(CARD_WIDTH, CARD_HEIGHT))
    return failure("export.options");
  const scale = Math.min(
    (CARD_WIDTH - padding * 2) / layout.width,
    (CARD_HEIGHT - padding * 2) / layout.height
  );
  if (!Number.isFinite(scale) || scale <= 0) return failure("export.options");
  const tx = (CARD_WIDTH - layout.width * scale) / 2;
  const ty = (CARD_HEIGHT - layout.height * scale) / 2;
  const markup = renderSceneMarkup(document2, resolved.value, {
    instanceId: "card",
    theme,
    highlight: query.value ? { nodes: query.value.nodes, edges: query.value.edges } : void 0
  });
  const highlightStyle = query.value ? `<style>[data-query-highlight="true"]>rect,[data-query-highlight="true"]>circle{stroke:${palette.cobalt};stroke-width:2.5}[data-query-highlight="true"]>text{fill:${palette.cobalt}}[data-query-highlight="true"]>path{stroke:${palette.cobalt} !important;stroke-width:3}</style>` : "";
  const caption = query.value?.label ? `<text x="${padding}" y="${padding - 12}" font-family="Geist, sans-serif" font-size="16" fill="${palette.mutedForeground}">${escapeXml(query.value.label)}</text>` : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeXml(document2.spec.caption)}"><title>${escapeXml(document2.spec.caption)}</title>${highlightStyle}<rect width="100%" height="100%" fill="${palette.background}"/>${caption}<g transform="translate(${tx} ${ty}) scale(${scale})"><g transform="translate(${resolved.value.origin.x} ${resolved.value.origin.y})">${markup}</g></g></svg>`;
  return success({ svg, canonical: !query.value });
}
async function exportCard(input, options = {}) {
  const svg = cardSvg(input, options);
  if (!svg.ok) return svg;
  const bytes = await rasterizeSvg(
    svg.value.svg,
    "image/png",
    CARD_WIDTH,
    CARD_HEIGHT,
    options.signal
  );
  if (!bytes.ok) return bytes;
  return success({
    bytes: bytes.value,
    receipt: {
      documentId: input.id,
      revision: input.revision,
      format: "png",
      mimeType: "image/png",
      bytes: bytes.value.byteLength,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      scope: "document",
      canonical: svg.value.canonical,
      sourceIncluded: false,
      verified: false,
      diagnostics: []
    }
  });
}

// src/export/capabilities.ts
function probeExportCapabilities() {
  const base = getExportCapabilities();
  let webp = false;
  if (typeof document !== "undefined") {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 2;
      canvas.height = 2;
      webp = canvas.toDataURL("image/webp").startsWith("data:image/webp");
      canvas.width = 0;
      canvas.height = 0;
    } catch {
      webp = false;
    }
  }
  return {
    png: base.png,
    jpeg: base.jpeg,
    webp,
    html: base.html,
    clipboardText: base.clipboardText,
    clipboardPng: base.clipboardPng,
    print: base.print,
    webmMimeType: base.webmMimeType
  };
}
function supportedFormats(capabilities) {
  return [
    "json",
    "svg",
    ...capabilities.png ? ["png"] : [],
    ...capabilities.jpeg ? ["jpeg"] : [],
    ...capabilities.webp ? ["webp"] : []
  ];
}

// src/export/motion.ts
function webmCapability() {
  if (typeof MediaRecorder === "undefined" || typeof HTMLCanvasElement === "undefined" || typeof HTMLCanvasElement.prototype.captureStream !== "function")
    return { supported: false, mimeType: null };
  for (const mimeType of ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"]) {
    try {
      if (MediaRecorder.isTypeSupported(mimeType)) return { supported: true, mimeType };
    } catch {
    }
  }
  return { supported: false, mimeType: null };
}
var delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function exportStoryWebm(input, options = {}) {
  const checked = validateDocument(input);
  if (!checked.ok) return checked;
  const document2 = checked.value;
  if (options.reducedMotion) return failure("webm.reduced-motion");
  const capability = webmCapability();
  if (!capability.supported || !capability.mimeType) return failure("webm.unavailable");
  if (document2.story.length === 0) return failure("webm.empty");
  const numeric = (value, fallback) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
  const fps = Math.max(1, Math.min(60, Math.round(numeric(options.fps, 30))));
  const scale = Math.max(0.25, Math.min(2, numeric(options.scale, 1)));
  const totalDuration = document2.story.reduce((sum, step) => sum + step.durationMs, 0);
  if (totalDuration <= 0 || totalDuration > 12e4) return failure("limit.story");
  const theme = options.theme ?? document2.presentation.theme.mode;
  const resolved = resolveDocument(document2, {
    quality: "edit",
    requestId: "motion",
    theme,
    measureText: createCanvasTextMeasurer() ?? estimateTextWidth,
    renderers: options.renderers
  });
  if (!resolved.ok) return resolved;
  const missingRenderer = resolved.diagnostics.find(
    (diagnostic) => diagnostic.code.startsWith("renderer.")
  );
  if (missingRenderer) return { ok: false, diagnostics: [missingRenderer] };
  const width = Math.max(2, Math.ceil(resolved.value.layout.width * scale));
  const height = Math.max(2, Math.ceil(resolved.value.layout.height * scale));
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width > 16384 || height > 16384 || width * height > 32e6)
    return failure("export.pixels");
  const canvas = window.document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return failure("export.context");
  let stream;
  let recorder;
  let started = false;
  let aborted = false;
  let stoppedResolve = null;
  const recorderStopped = new Promise((resolve) => {
    stoppedResolve = resolve;
  });
  const settleRecorder = () => stoppedResolve?.();
  const onAbort = () => {
    aborted = true;
    settleRecorder();
  };
  options.signal?.addEventListener("abort", onAbort, { once: true });
  const chunks = [];
  let frameCount = 0;
  try {
    stream = canvas.captureStream(fps);
    recorder = new MediaRecorder(stream, { mimeType: capability.mimeType });
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onstop = settleRecorder;
    recorder.onerror = settleRecorder;
    recorder.start();
    started = true;
    for (const step of document2.story) {
      if (aborted || options.signal?.aborted) return failure("operation.aborted");
      const view = document2.views.find((candidate) => candidate.id === step.viewId);
      const svg = renderSvg(document2, resolved.value, {
        instanceId: `motion-${step.id}`,
        theme,
        highlight: view ? {
          nodes: new Set(view.focus.nodeIds),
          edges: new Set(view.focus.edgeIds)
        } : void 0
      });
      const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
      const image = new Image();
      try {
        await new Promise((resolve, reject) => {
          const abort = () => {
            image.src = "";
            reject(Error("operation.aborted"));
          };
          options.signal?.addEventListener("abort", abort, { once: true });
          image.onload = () => {
            options.signal?.removeEventListener("abort", abort);
            resolve();
          };
          image.onerror = () => {
            options.signal?.removeEventListener("abort", abort);
            reject(Error("export.image"));
          };
          image.src = url;
        });
        const frames = Math.max(1, Math.round(step.durationMs / (1e3 / fps)));
        for (let frame = 0; frame < frames; frame++) {
          if (aborted || options.signal?.aborted) return failure("operation.aborted");
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          frameCount += 1;
          await delay(1e3 / fps);
        }
      } finally {
        image.src = "";
        URL.revokeObjectURL(url);
      }
    }
    if (aborted || options.signal?.aborted) return failure("operation.aborted");
    recorder.stop();
    started = false;
    await Promise.race([recorderStopped, delay(2e3)]);
    if (aborted || options.signal?.aborted) return failure("operation.aborted");
    const blob = new Blob(chunks, { type: capability.mimeType });
    if (!blob.size) return failure("webm.empty");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    return success({
      bytes,
      receipt: {
        documentId: document2.id,
        revision: document2.revision,
        mimeType: capability.mimeType,
        bytes: bytes.byteLength,
        width: canvas.width,
        height: canvas.height,
        fps,
        durationMs: totalDuration,
        frameCount,
        verified: false,
        diagnostics: []
      }
    });
  } catch (error) {
    return failure(
      error instanceof Error && error.message === "operation.aborted" ? "operation.aborted" : error instanceof Error && error.message === "export.image" ? "export.image" : "webm.recorder"
    );
  } finally {
    options.signal?.removeEventListener("abort", onAbort);
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
      }
    }
    if (stream)
      for (const activeTrack of stream.getTracks()) {
        if (activeTrack.readyState !== "ended") activeTrack.stop();
      }
    if (started && recorder && recorder.state !== "inactive")
      await Promise.race([recorderStopped, delay(2e3)]);
    canvas.width = 0;
    canvas.height = 0;
  }
}

// src/export/index.ts
function base642(bytes) {
  let raw = "";
  for (const byte of bytes) raw += String.fromCharCode(byte);
  return btoa(raw);
}
function fontCss2(fonts) {
  for (const bytes of [fonts.sans, fonts.mono])
    if (bytes.length > 512 * 1024 || String.fromCharCode(...bytes.slice(0, 4)) !== "wOF2")
      return failure("export.font-invalid");
  return success(
    `/* ${escapeXml(notices_default.join("\n"))} */@font-face{font-family:Geist;src:url(data:font/woff2;base64,${base642(fonts.sans)}) format("woff2")}@font-face{font-family:"Geist Mono";src:url(data:font/woff2;base64,${base642(fonts.mono)}) format("woff2")}`
  );
}
async function exportDocument(input, options) {
  if (options.signal?.aborted) return failure("operation.aborted");
  const checked = validateDocument(input);
  if (!checked.ok) return checked;
  const original = structuredClone(checked.value), doc = structuredClone(original), diagnostics = [];
  if (!["json", "svg", "png", "jpeg", "webp"].includes(options.format))
    return failure("export.format");
  if (!["light", "dark"].includes(options.theme) || !["theme", "transparent"].includes(options.background) || !["edit", "publish"].includes(options.quality) || !["minimal", "all"].includes(options.metadata))
    return failure("export.options");
  if (!Number.isFinite(options.scale) || options.scale <= 0 || options.scale > 8)
    return failure("export.scale");
  if (options.includeSource && !["json", "svg"].includes(options.format))
    return failure("export.source-format");
  if (options.format === "jpeg" && options.background === "transparent")
    return failure("export.alpha");
  if (options.quality === "publish") {
    const profile = validateDeploymentProfile(checked.value);
    if (!profile.ok) return profile;
    if (profile.value.enabled && profile.value.diagnostics.length)
      return { ok: false, diagnostics: profile.value.diagnostics };
  }
  if (options.scope.type === "selection") {
    if (options.format === "json") return failure("export.scope");
    const selected = new Set(
      options.scope.selection.filter((r) => r.kind === "node").map((r) => r.id)
    );
    const adapter = getAdapter(doc.spec.type);
    for (const ref of options.scope.selection) {
      if (ref.kind === "edge") {
        const edge = adapter.edges(doc.spec).find((e) => e.id === ref.id);
        if (!edge) return failure("reference.missing");
        selected.add(edge.from);
        selected.add(edge.to);
      }
      if (ref.kind === "group") {
        const queue = [ref.id];
        if (!doc.scene.groups.some((g) => g.id === ref.id)) return failure("reference.missing");
        for (let i = 0; i < queue.length; i++) {
          doc.scene.groups.find((g) => g.id === queue[i])?.nodeIds.forEach((id) => selected.add(id));
          doc.scene.groups.filter((g) => g.parentGroup === queue[i]).forEach((g) => queue.push(g.id));
        }
      }
    }
    const ids = adapter.nodeIds(doc.spec);
    if ([...selected].some((id) => !ids.includes(id))) return failure("reference.missing");
    if (!selected.size) return failure("export.empty-selection");
    const removed = adapter.removeNodes(
      doc.spec,
      ids.filter((id) => !selected.has(id))
    );
    if (!removed.ok) return removed;
    doc.spec = removed.value;
    pruneReferences(doc);
  }
  let bytes, mimeType, width, height;
  if (options.format === "json") {
    bytes = new TextEncoder().encode(serializeDocument(doc));
    mimeType = "application/json";
  } else {
    let fonts = "";
    let measurer;
    if (options.fonts) {
      const result = fontCss2(options.fonts);
      if (!result.ok) return result;
      fonts = result.value;
      measurer = createEmbeddedFontTextMeasurer(options.fonts.sans, options.fonts.mono);
      if (measurer) {
        const embeddedReady = await measurer.ready();
        if (!embeddedReady) {
          measurer.dispose();
          measurer = void 0;
          if (options.fontPolicy === "required") return failure("export.font-missing");
          diagnostics.push({ ...issue("export.font-fallback"), severity: "warning" });
        }
      }
    } else if (options.fontPolicy === "fallback")
      diagnostics.push({ ...issue("export.font-fallback"), severity: "warning" });
    else return failure("export.font-missing");
    const resolved = resolveDocument(doc, {
      quality: options.quality,
      requestId: "export",
      signal: options.signal,
      theme: options.theme,
      measureText: measurer?.measure ?? createCanvasTextMeasurer(),
      renderers: options.renderers
    });
    measurer?.dispose();
    if (!resolved.ok) return resolved;
    diagnostics.push(...resolved.diagnostics);
    const missingRenderer = diagnostics.find(
      (d) => d.code === "renderer.unsupported" || d.code === "renderer.invalid" || d.code === "renderer.measure" || d.code === "renderer.empty" || d.code === "renderer.failed"
    );
    if (missingRenderer) return { ok: false, diagnostics };
    if (options.quality === "publish" && diagnostics.some((d) => d.code.startsWith("quality.")))
      return failure("export.quality");
    width = Math.ceil(resolved.value.layout.width * options.scale);
    height = Math.ceil(resolved.value.layout.height * options.scale);
    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width > 16384 || height > 16384 || width * height > 32e6)
      return failure("export.pixels");
    let svg = renderSvg(doc, resolved.value, {
      instanceId: "export",
      theme: options.theme,
      background: options.background,
      fontCss: fonts
    });
    if (options.includeSource) {
      const data = canonical(original).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
      svg = svg.replace(/<\/svg>$/, `<metadata id="aesthc-source">${data}</metadata></svg>`);
    }
    mimeType = options.format === "svg" ? "image/svg+xml" : `image/${options.format}`;
    if (options.format === "svg") {
      svg = svg.replace(
        `width="${resolved.value.layout.width}" height="${resolved.value.layout.height}"`,
        `width="${width}" height="${height}"`
      );
      bytes = new TextEncoder().encode(svg);
    } else {
      const result = await rasterizeSvg(svg, mimeType, width, height, options.signal);
      if (!result.ok) return result;
      bytes = result.value;
    }
  }
  if (options.signal?.aborted) return failure("operation.aborted");
  return success(
    {
      bytes,
      receipt: {
        documentId: original.id,
        revision: original.revision,
        format: options.format,
        mimeType,
        bytes: bytes.byteLength,
        ...width === void 0 ? {} : { width, height },
        scope: options.scope.type,
        canonical: options.scope.type === "document",
        sourceIncluded: options.format === "json" || options.includeSource,
        verified: false,
        diagnostics
      }
    },
    diagnostics
  );
}
function getExportCapabilities() {
  const browser = typeof window !== "undefined";
  return {
    svg: true,
    png: browser,
    jpeg: browser,
    webp: browser,
    html: false,
    clipboardText: browser && !!navigator.clipboard?.writeText,
    clipboardPng: browser && typeof ClipboardItem !== "undefined" && !!navigator.clipboard?.write,
    print: browser,
    webmMimeType: null
  };
}
function downloadArtifact(artifact, filename) {
  if (typeof document === "undefined") return failure("export.environment");
  if (!filename || /[\/\\\x00-\x1f]/.test(filename)) return failure("export.filename");
  const url = URL.createObjectURL(
    new Blob([new Uint8Array(artifact.bytes)], { type: artifact.receipt.mimeType })
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1e3);
  return success(void 0);
}
async function copyArtifact(artifact) {
  if (typeof navigator === "undefined" || !navigator.clipboard)
    return failure("clipboard.unavailable");
  try {
    if (artifact.receipt.mimeType === "image/png" && typeof ClipboardItem !== "undefined")
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": new Blob([new Uint8Array(artifact.bytes)], { type: "image/png" })
        })
      ]);
    else if (["application/json", "image/svg+xml"].includes(artifact.receipt.mimeType))
      await navigator.clipboard.writeText(new TextDecoder().decode(artifact.bytes));
    else return failure("clipboard.format");
    return success(void 0);
  } catch {
    return failure("clipboard.denied");
  }
}

export {
  exportDocumentHtml,
  CARD_WIDTH,
  CARD_HEIGHT,
  validateCardQuery,
  cardSvg,
  exportCard,
  probeExportCapabilities,
  supportedFormats,
  webmCapability,
  exportStoryWebm,
  exportDocument,
  getExportCapabilities,
  downloadArtifact,
  copyArtifact
};
