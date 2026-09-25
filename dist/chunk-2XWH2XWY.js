import {
  createCanvasTextMeasurer,
  createEmbeddedFontTextMeasurer,
  getAdapter,
  pruneReferences,
  resolveDocument
} from "./chunk-FTHHFRVE.js";
import {
  serializeDocument
} from "./chunk-3MHLUDWC.js";
import {
  canonical,
  failure,
  issue,
  success,
  validateDocument
} from "./chunk-6NELNSRC.js";
import {
  escapeXml,
  renderSvg
} from "./chunk-7OXXAMDF.js";

// src/assets/fonts/notices.json
var notices_default = [
  'Copyright (c) 2023 Vercel, in collaboration with basement.studio\n\nThis Font Software is licensed under the SIL Open Font License, Version 1.1.\nThis license is copied below, and is also available with a FAQ at:\nhttp://scripts.sil.org/OFL\n\n-----------------------------------------------------------\nSIL OPEN FONT LICENSE Version 1.1 - 26 February 2007\n-----------------------------------------------------------\n\nPREAMBLE\nThe goals of the Open Font License (OFL) are to stimulate worldwide\ndevelopment of collaborative font projects, to support the font creation\nefforts of academic and linguistic communities, and to provide a free and\nopen framework in which fonts may be shared and improved in partnership\nwith others.\n\nThe OFL allows the licensed fonts to be used, studied, modified and\nredistributed freely as long as they are not sold by themselves. The\nfonts, including any derivative works, can be bundled, embedded,\nredistributed and/or sold with any software provided that any reserved\nnames are not used by derivative works. The fonts and derivatives,\nhowever, cannot be released under any other type of license. The\nrequirement for fonts to remain under this license does not apply\nto any document created using the fonts or their derivatives.\n\nDEFINITIONS\n"Font Software" refers to the set of files released by the Copyright\nHolder(s) under this license and clearly marked as such. This may\ninclude source files, build scripts and documentation.\n\n"Reserved Font Name" refers to any names specified as such after the\ncopyright statement(s).\n\n"Original Version" refers to the collection of Font Software components as\ndistributed by the Copyright Holder(s).\n\n"Modified Version" refers to any derivative made by adding to, deleting,\nor substituting -- in part or in whole -- any of the components of the\nOriginal Version, by changing formats or by porting the Font Software to a\nnew environment.\n\n"Author" refers to any designer, engineer, programmer, technical\nwriter or other person who contributed to the Font Software.\n\nPERMISSION AND CONDITIONS\nPermission is hereby granted, free of charge, to any person obtaining\na copy of the Font Software, to use, study, copy, merge, embed, modify,\nredistribute, and sell modified and unmodified copies of the Font\nSoftware, subject to the following conditions:\n\n1) Neither the Font Software nor any of its individual components,\nin Original or Modified Versions, may be sold by itself.\n\n2) Original or Modified Versions of the Font Software may be bundled,\nredistributed and/or sold with any software, provided that each copy\ncontains the above copyright notice and this license. These can be\nincluded either as stand-alone text files, human-readable headers or\nin the appropriate machine-readable metadata fields within text or\nbinary files as long as those fields can be easily viewed by the user.\n\n3) No Modified Version of the Font Software may use the Reserved Font\nName(s) unless explicit written permission is granted by the corresponding\nCopyright Holder. This restriction only applies to the primary font name as\npresented to the users.\n\n4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font\nSoftware shall not be used to promote, endorse or advertise any\nModified Version, except to acknowledge the contribution(s) of the\nCopyright Holder(s) and the Author(s) or with their explicit written\npermission.\n\n5) The Font Software, modified or unmodified, in part or in whole,\nmust be distributed entirely under this license, and must not be\ndistributed under any other license. The requirement for fonts to\nremain under this license does not apply to any document created\nusing the Font Software.\n\nTERMINATION\nThis license becomes null and void if any of the above conditions are\nnot met.\n\nDISCLAIMER\nTHE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,\nEXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF\nMERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT\nOF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE\nCOPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,\nINCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL\nDAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING\nFROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM\nOTHER DEALINGS IN THE FONT SOFTWARE.\n',
  'Copyright 2024 The Geist Project Authors (https://github.com/vercel/geist-font.git)\n\nThis Font Software is licensed under the SIL Open Font License, Version 1.1.\nThis license is copied below, and is also available with a FAQ at:\nhttps://openfontlicense.org\n\n\n-----------------------------------------------------------\nSIL OPEN FONT LICENSE Version 1.1 - 26 February 2007\n-----------------------------------------------------------\n\nPREAMBLE\nThe goals of the Open Font License (OFL) are to stimulate worldwide\ndevelopment of collaborative font projects, to support the font creation\nefforts of academic and linguistic communities, and to provide a free and\nopen framework in which fonts may be shared and improved in partnership\nwith others.\n\nThe OFL allows the licensed fonts to be used, studied, modified and\nredistributed freely as long as they are not sold by themselves. The\nfonts, including any derivative works, can be bundled, embedded, \nredistributed and/or sold with any software provided that any reserved\nnames are not used by derivative works. The fonts and derivatives,\nhowever, cannot be released under any other type of license. The\nrequirement for fonts to remain under this license does not apply\nto any document created using the fonts or their derivatives.\n\nDEFINITIONS\n"Font Software" refers to the set of files released by the Copyright\nHolder(s) under this license and clearly marked as such. This may\ninclude source files, build scripts and documentation.\n\n"Reserved Font Name" refers to any names specified as such after the\ncopyright statement(s).\n\n"Original Version" refers to the collection of Font Software components as\ndistributed by the Copyright Holder(s).\n\n"Modified Version" refers to any derivative made by adding to, deleting,\nor substituting -- in part or in whole -- any of the components of the\nOriginal Version, by changing formats or by porting the Font Software to a\nnew environment.\n\n"Author" refers to any designer, engineer, programmer, technical\nwriter or other person who contributed to the Font Software.\n\nPERMISSION & CONDITIONS\nPermission is hereby granted, free of charge, to any person obtaining\na copy of the Font Software, to use, study, copy, merge, embed, modify,\nredistribute, and sell modified and unmodified copies of the Font\nSoftware, subject to the following conditions:\n\n1) Neither the Font Software nor any of its individual components,\nin Original or Modified Versions, may be sold by itself.\n\n2) Original or Modified Versions of the Font Software may be bundled,\nredistributed and/or sold with any software, provided that each copy\ncontains the above copyright notice and this license. These can be\nincluded either as stand-alone text files, human-readable headers or\nin the appropriate machine-readable metadata fields within text or\nbinary files as long as those fields can be easily viewed by the user.\n\n3) No Modified Version of the Font Software may use the Reserved Font\nName(s) unless explicit written permission is granted by the corresponding\nCopyright Holder. This restriction only applies to the primary font name as\npresented to the users.\n\n4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font\nSoftware shall not be used to promote, endorse or advertise any\nModified Version, except to acknowledge the contribution(s) of the\nCopyright Holder(s) and the Author(s) or with their explicit written\npermission.\n\n5) The Font Software, modified or unmodified, in part or in whole,\nmust be distributed entirely under this license, and must not be\ndistributed under any other license. The requirement for fonts to\nremain under this license does not apply to any document created\nusing the Font Software.\n\nTERMINATION\nThis license becomes null and void if any of the above conditions are\nnot met.\n\nDISCLAIMER\nTHE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,\nEXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF\nMERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT\nOF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE\nCOPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,\nINCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL\nDAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING\nFROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM\nOTHER DEALINGS IN THE FONT SOFTWARE.'
];

// src/export/index.ts
function base64(bytes) {
  let raw = "";
  for (const byte of bytes) raw += String.fromCharCode(byte);
  return btoa(raw);
}
function fontCss(fonts) {
  for (const bytes of [fonts.sans, fonts.mono])
    if (bytes.length > 512 * 1024 || String.fromCharCode(...bytes.slice(0, 4)) !== "wOF2")
      return failure("export.font-invalid");
  return success(
    `/* ${escapeXml(notices_default.join("\n"))} */@font-face{font-family:Geist;src:url(data:font/woff2;base64,${base64(fonts.sans)}) format("woff2")}@font-face{font-family:"Geist Mono";src:url(data:font/woff2;base64,${base64(fonts.mono)}) format("woff2")}`
  );
}
async function raster(svg, mime, width, height, signal) {
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
      const result = fontCss(options.fonts);
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
      measureText: measurer?.measure ?? createCanvasTextMeasurer()
    });
    measurer?.dispose();
    if (!resolved.ok) return resolved;
    diagnostics.push(...resolved.diagnostics);
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
      const result = await raster(svg, mimeType, width, height, options.signal);
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
  exportDocument,
  getExportCapabilities,
  downloadArtifact,
  copyArtifact
};
