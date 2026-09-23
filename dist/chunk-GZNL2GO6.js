import {
  nodeGeometry,
  tableFieldGeometry
} from "./chunk-YKPE23VO.js";
import {
  CARD_R,
  DECISION_PILL_H,
  DECISION_PILL_R,
  DOT_R,
  EDGE_STROKE_WIDTH,
  LANE_R,
  NODE_ICON_SIZE,
  PILL_H,
  PILL_R
} from "./chunk-TVEV5XLW.js";
import {
  brandIcons,
  scopeIconMarkup
} from "./chunk-KDAWQGDC.js";

// src/brand-icons/semantic-data.ts
var semanticIcons = {
  "arrows-split": {
    viewBox: "0 0 256 256",
    body: '<path d="M229.66,189.66l-32,32a8,8,0,0,1-11.32,0l-32-32a8,8,0,0,1,11.32-11.32L184,196.69V139.31l-56-56-56,56v57.38l18.34-18.35a8,8,0,0,1,11.32,11.32l-32,32a8,8,0,0,1-11.32,0l-32-32a8,8,0,0,1,11.32-11.32L56,196.69V136a8,8,0,0,1,2.34-5.66L120,68.69V24a8,8,0,0,1,16,0V68.69l61.66,61.65A8,8,0,0,1,200,136v60.69l18.34-18.35a8,8,0,0,1,11.32,11.32Z"></path>'
  },
  "brackets-curly": {
    viewBox: "0 0 256 256",
    body: '<path d="M43.18,128a29.78,29.78,0,0,1,8,10.26c4.8,9.9,4.8,22,4.8,33.74,0,24.31,1,36,24,36a8,8,0,0,1,0,16c-17.48,0-29.32-6.14-35.2-18.26-4.8-9.9-4.8-22-4.8-33.74,0-24.31-1-36-24-36a8,8,0,0,1,0-16c23,0,24-11.69,24-36,0-11.72,0-23.84,4.8-33.74C50.68,38.14,62.52,32,80,32a8,8,0,0,1,0,16C57,48,56,59.69,56,84c0,11.72,0,23.84-4.8,33.74A29.78,29.78,0,0,1,43.18,128ZM240,120c-23,0-24-11.69-24-36,0-11.72,0-23.84-4.8-33.74C205.32,38.14,193.48,32,176,32a8,8,0,0,0,0,16c23,0,24,11.69,24,36,0,11.72,0,23.84,4.8,33.74a29.78,29.78,0,0,0,8,10.26,29.78,29.78,0,0,0-8,10.26c-4.8,9.9-4.8,22-4.8,33.74,0,24.31-1,36-24,36a8,8,0,0,0,0,16c17.48,0,29.32-6.14,35.2-18.26,4.8-9.9,4.8-22,4.8-33.74,0-24.31,1-36,24-36a8,8,0,0,0,0-16Z"></path>'
  },
  "folder-lock": {
    viewBox: "0 0 256 256",
    body: '<path d="M224,160h-8v-4a28,28,0,0,0-56,0v4h-8a8,8,0,0,0-8,8v40a8,8,0,0,0,8,8h72a8,8,0,0,0,8-8V168A8,8,0,0,0,224,160Zm-48-4a12,12,0,0,1,24,0v4H176Zm40,44H160V176h56Zm0-128H131.31L104,44.69A15.86,15.86,0,0,0,92.69,40H40A16,16,0,0,0,24,56V200.62A15.4,15.4,0,0,0,39.38,216h73.18a8,8,0,0,0,0-16H40V88H216v16a8,8,0,0,0,16,0V88A16,16,0,0,0,216,72ZM92.69,56l16,16H40V56Z"></path>'
  },
  gauge: {
    viewBox: "0 0 256 256",
    body: '<path d="M207.06,72.67A111.24,111.24,0,0,0,128,40h-.4C66.07,40.21,16,91,16,153.13V176a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V152A111.25,111.25,0,0,0,207.06,72.67ZM224,176H119.71l54.76-75.3a8,8,0,0,0-12.94-9.42L99.92,176H32V153.13c0-3.08.15-6.12.43-9.13H56a8,8,0,0,0,0-16H35.27c10.32-38.86,44-68.24,84.73-71.66V80a8,8,0,0,0,16,0V56.33A96.14,96.14,0,0,1,221,128H200a8,8,0,0,0,0,16h23.67c.21,2.65.33,5.31.33,8Z"></path>'
  },
  graph: {
    viewBox: "0 0 256 256",
    body: '<path d="M200,152a31.84,31.84,0,0,0-19.53,6.68l-23.11-18A31.65,31.65,0,0,0,160,128c0-.74,0-1.48-.08-2.21l13.23-4.41A32,32,0,1,0,168,104c0,.74,0,1.48.08,2.21l-13.23,4.41A32,32,0,0,0,128,96a32.59,32.59,0,0,0-5.27.44L115.89,81A32,32,0,1,0,96,88a32.59,32.59,0,0,0,5.27-.44l6.84,15.4a31.92,31.92,0,0,0-8.57,39.64L73.83,165.44a32.06,32.06,0,1,0,10.63,12l25.71-22.84a31.91,31.91,0,0,0,37.36-1.24l23.11,18A31.65,31.65,0,0,0,168,184a32,32,0,1,0,32-32Zm0-64a16,16,0,1,1-16,16A16,16,0,0,1,200,88ZM80,56A16,16,0,1,1,96,72,16,16,0,0,1,80,56ZM56,208a16,16,0,1,1,16-16A16,16,0,0,1,56,208Zm56-80a16,16,0,1,1,16,16A16,16,0,0,1,112,128Zm88,72a16,16,0,1,1,16-16A16,16,0,0,1,200,200Z"></path>'
  },
  handshake: {
    viewBox: "0 0 256 256",
    body: '<path d="M254.3,107.91,228.78,56.85a16,16,0,0,0-21.47-7.15L182.44,62.13,130.05,48.27a8.14,8.14,0,0,0-4.1,0L73.56,62.13,48.69,49.7a16,16,0,0,0-21.47,7.15L1.7,107.9a16,16,0,0,0,7.15,21.47l27,13.51,55.49,39.63a8.06,8.06,0,0,0,2.71,1.25l64,16a8,8,0,0,0,7.6-2.1l55.07-55.08,26.42-13.21a16,16,0,0,0,7.15-21.46Zm-54.89,33.37L165,113.72a8,8,0,0,0-10.68.61C136.51,132.27,116.66,130,104,122L147.24,80h31.81l27.21,54.41ZM41.53,64,62,74.22,36.43,125.27,16,115.06Zm116,119.13L99.42,168.61l-49.2-35.14,28-56L128,64.28l9.8,2.59-45,43.68-.08.09a16,16,0,0,0,2.72,24.81c20.56,13.13,45.37,11,64.91-5L188,152.66Zm62-57.87-25.52-51L214.47,64,240,115.06Zm-87.75,92.67a8,8,0,0,1-7.75,6.06,8.13,8.13,0,0,1-1.95-.24L80.41,213.33a7.89,7.89,0,0,1-2.71-1.25L51.35,193.26a8,8,0,0,1,9.3-13l25.11,17.94L126,208.24A8,8,0,0,1,131.82,217.94Z"></path>'
  },
  "list-checks": {
    viewBox: "0 0 256 256",
    body: '<path d="M224,128a8,8,0,0,1-8,8H128a8,8,0,0,1,0-16h88A8,8,0,0,1,224,128ZM128,72h88a8,8,0,0,0,0-16H128a8,8,0,0,0,0,16Zm88,112H128a8,8,0,0,0,0,16h88a8,8,0,0,0,0-16ZM82.34,42.34,56,68.69,45.66,58.34A8,8,0,0,0,34.34,69.66l16,16a8,8,0,0,0,11.32,0l32-32A8,8,0,0,0,82.34,42.34Zm0,64L56,132.69,45.66,122.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32,0l32-32a8,8,0,0,0-11.32-11.32Zm0,64L56,196.69,45.66,186.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32,0l32-32a8,8,0,0,0-11.32-11.32Z"></path>'
  },
  "list-magnifying-glass": {
    viewBox: "0 0 256 256",
    body: '<path d="M32,64a8,8,0,0,1,8-8H216a8,8,0,0,1,0,16H40A8,8,0,0,1,32,64Zm8,72h72a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16Zm88,48H40a8,8,0,0,0,0,16h88a8,8,0,0,0,0-16Zm109.66,13.66a8,8,0,0,1-11.32,0L206,177.36A40,40,0,1,1,217.36,166l20.3,20.3A8,8,0,0,1,237.66,197.66ZM184,168a24,24,0,1,0-24-24A24,24,0,0,0,184,168Z"></path>'
  },
  monitor: {
    viewBox: "0 0 256 256",
    body: '<path d="M208,40H48A24,24,0,0,0,24,64V176a24,24,0,0,0,24,24H208a24,24,0,0,0,24-24V64A24,24,0,0,0,208,40Zm8,136a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V64a8,8,0,0,1,8-8H208a8,8,0,0,1,8,8Zm-48,48a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h64A8,8,0,0,1,168,224Z"></path>'
  },
  receipt: {
    viewBox: "0 0 256 256",
    body: '<path d="M72,104a8,8,0,0,1,8-8h96a8,8,0,0,1,0,16H80A8,8,0,0,1,72,104Zm8,40h96a8,8,0,0,0,0-16H80a8,8,0,0,0,0,16ZM232,56V208a8,8,0,0,1-11.58,7.15L192,200.94l-28.42,14.21a8,8,0,0,1-7.16,0L128,200.94,99.58,215.15a8,8,0,0,1-7.16,0L64,200.94,35.58,215.15A8,8,0,0,1,24,208V56A16,16,0,0,1,40,40H216A16,16,0,0,1,232,56Zm-16,0H40V195.06l20.42-10.22a8,8,0,0,1,7.16,0L96,199.06l28.42-14.22a8,8,0,0,1,7.16,0L160,199.06l28.42-14.22a8,8,0,0,1,7.16,0L216,195.06Z"></path>'
  },
  "rocket-launch": {
    viewBox: "0 0 256 256",
    body: '<path d="M223.85,47.12a16,16,0,0,0-15-15c-12.58-.75-44.73.4-71.41,27.07L132.69,64H74.36A15.91,15.91,0,0,0,63,68.68L28.7,103a16,16,0,0,0,9.07,27.16l38.47,5.37,44.21,44.21,5.37,38.49a15.94,15.94,0,0,0,10.78,12.92,16.11,16.11,0,0,0,5.1.83A15.91,15.91,0,0,0,153,227.3L187.32,193A15.91,15.91,0,0,0,192,181.64V123.31l4.77-4.77C223.45,91.86,224.6,59.71,223.85,47.12ZM74.36,80h42.33L77.16,119.52,40,114.34Zm74.41-9.45a76.65,76.65,0,0,1,59.11-22.47,76.46,76.46,0,0,1-22.42,59.16L128,164.68,91.32,128ZM176,181.64,141.67,216l-5.19-37.17L176,139.31Zm-74.16,9.5C97.34,201,82.29,224,40,224a8,8,0,0,1-8-8c0-42.29,23-57.34,32.86-61.85a8,8,0,0,1,6.64,14.56c-6.43,2.93-20.62,12.36-23.12,38.91,26.55-2.5,36-16.69,38.91-23.12a8,8,0,1,1,14.56,6.64Z"></path>'
  },
  scales: {
    viewBox: "0 0 256 256",
    body: '<path d="M239.43,133l-32-80h0a8,8,0,0,0-9.16-4.84L136,62V40a8,8,0,0,0-16,0V65.58L54.26,80.19A8,8,0,0,0,48.57,85h0v.06L16.57,165a7.92,7.92,0,0,0-.57,3c0,23.31,24.54,32,40,32s40-8.69,40-32a7.92,7.92,0,0,0-.57-3L66.92,93.77,120,82V208H104a8,8,0,0,0,0,16h48a8,8,0,0,0,0-16H136V78.42L187,67.1,160.57,133a7.92,7.92,0,0,0-.57,3c0,23.31,24.54,32,40,32s40-8.69,40-32A7.92,7.92,0,0,0,239.43,133ZM56,184c-7.53,0-22.76-3.61-23.93-14.64L56,109.54l23.93,59.82C78.76,180.39,63.53,184,56,184Zm144-32c-7.53,0-22.76-3.61-23.93-14.64L200,77.54l23.93,59.82C222.76,148.39,207.53,152,200,152Z"></path>'
  },
  "seal-check": {
    viewBox: "0 0 256 256",
    body: '<path d="M225.86,102.82c-3.77-3.94-7.67-8-9.14-11.57-1.36-3.27-1.44-8.69-1.52-13.94-.15-9.76-.31-20.82-8-28.51s-18.75-7.85-28.51-8c-5.25-.08-10.67-.16-13.94-1.52-3.56-1.47-7.63-5.37-11.57-9.14C146.28,23.51,138.44,16,128,16s-18.27,7.51-25.18,14.14c-3.94,3.77-8,7.67-11.57,9.14C88,40.64,82.56,40.72,77.31,40.8c-9.76.15-20.82.31-28.51,8S41,67.55,40.8,77.31c-.08,5.25-.16,10.67-1.52,13.94-1.47,3.56-5.37,7.63-9.14,11.57C23.51,109.72,16,117.56,16,128s7.51,18.27,14.14,25.18c3.77,3.94,7.67,8,9.14,11.57,1.36,3.27,1.44,8.69,1.52,13.94.15,9.76.31,20.82,8,28.51s18.75,7.85,28.51,8c5.25.08,10.67.16,13.94,1.52,3.56,1.47,7.63,5.37,11.57,9.14C109.72,232.49,117.56,240,128,240s18.27-7.51,25.18-14.14c3.94-3.77,8-7.67,11.57-9.14,3.27-1.36,8.69-1.44,13.94-1.52,9.76-.15,20.82-.31,28.51-8s7.85-18.75,8-28.51c.08-5.25.16-10.67,1.52-13.94,1.47-3.56,5.37-7.63,9.14-11.57C232.49,146.28,240,138.44,240,128S232.49,109.73,225.86,102.82Zm-11.55,39.29c-4.79,5-9.75,10.17-12.38,16.52-2.52,6.1-2.63,13.07-2.73,19.82-.1,7-.21,14.33-3.32,17.43s-10.39,3.22-17.43,3.32c-6.75.1-13.72.21-19.82,2.73-6.35,2.63-11.52,7.59-16.52,12.38S132,224,128,224s-9.15-4.92-14.11-9.69-10.17-9.75-16.52-12.38c-6.1-2.52-13.07-2.63-19.82-2.73-7-.1-14.33-.21-17.43-3.32s-3.22-10.39-3.32-17.43c-.1-6.75-.21-13.72-2.73-19.82-2.63-6.35-7.59-11.52-12.38-16.52S32,132,32,128s4.92-9.15,9.69-14.11,9.75-10.17,12.38-16.52c2.52-6.1,2.63-13.07,2.73-19.82.1-7,.21-14.33,3.32-17.43S70.51,56.9,77.55,56.8c6.75-.1,13.72-.21,19.82-2.73,6.35-2.63,11.52-7.59,16.52-12.38S124,32,128,32s9.15,4.92,14.11,9.69,10.17,9.75,16.52,12.38c6.1,2.52,13.07,2.63,19.82,2.73,7,.1,14.33.21,17.43,3.32s3.22,10.39,3.32,17.43c.1,6.75.21,13.72,2.73,19.82,2.63,6.35,7.59,11.52,12.38,16.52S224,124,224,128,219.08,137.15,214.31,142.11ZM173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34Z"></path>'
  },
  "user-check": {
    viewBox: "0 0 256 256",
    body: '<path d="M144,157.68a68,68,0,1,0-71.9,0c-20.65,6.76-39.23,19.39-54.17,37.17a8,8,0,0,0,12.25,10.3C50.25,181.19,77.91,168,108,168s57.75,13.19,77.87,37.15a8,8,0,0,0,12.25-10.3C183.18,177.07,164.6,164.44,144,157.68ZM56,100a52,52,0,1,1,52,52A52.06,52.06,0,0,1,56,100Zm197.66,33.66-32,32a8,8,0,0,1-11.32,0l-16-16a8,8,0,0,1,11.32-11.32L216,148.69l26.34-26.35a8,8,0,0,1,11.32,11.32Z"></path>'
  },
  "user-focus": {
    viewBox: "0 0 256 256",
    body: '<path d="M224,40V76a8,8,0,0,1-16,0V48H180a8,8,0,0,1,0-16h36A8,8,0,0,1,224,40Zm-8,132a8,8,0,0,0-8,8v28H180a8,8,0,0,0,0,16h36a8,8,0,0,0,8-8V180A8,8,0,0,0,216,172ZM76,208H48V180a8,8,0,0,0-16,0v36a8,8,0,0,0,8,8H76a8,8,0,0,0,0-16ZM40,84a8,8,0,0,0,8-8V48H76a8,8,0,0,0,0-16H40a8,8,0,0,0-8,8V76A8,8,0,0,0,40,84Zm136,92a8,8,0,0,1-6.41-3.19,52,52,0,0,0-83.2,0,8,8,0,1,1-12.8-9.62A67.94,67.94,0,0,1,101,141.51a40,40,0,1,1,53.94,0,67.94,67.94,0,0,1,27.43,21.68A8,8,0,0,1,176,176Zm-48-40a24,24,0,1,0-24-24A24,24,0,0,0,128,136Z"></path>'
  },
  warning: {
    viewBox: "0 0 256 256",
    body: '<path d="M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM222.93,203.8a8.5,8.5,0,0,1-7.48,4.2H40.55a8.5,8.5,0,0,1-7.48-4.2,7.59,7.59,0,0,1,0-7.72L120.52,44.21a8.75,8.75,0,0,1,15,0l87.45,151.87A7.59,7.59,0,0,1,222.93,203.8ZM120,144V104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,180Z"></path>'
  }
};
var semanticIconLicense = 'MIT License\n\nCopyright (c) 2020 Phosphor Icons\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the "Software"), to deal\nin the Software without restriction, including without limitation the rights\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the Software is\nfurnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all\ncopies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\nIMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\nFITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\nAUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\nLIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\nOUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\nSOFTWARE.\n';
var brandIconNotices = "# TheSVG asset notices\n\nSelected icon artwork (geometry and colors preserved) from https://github.com/GLINCKER/thesvg/tree/5835c13cec232bce8b0c5c22ab3f5d65ac44b097/public/icons.\nUpstream revision: `5835c13cec232bce8b0c5c22ab3f5d65ac44b097`. Local fill-only styles are flattened to attributes to prevent stylesheet leakage; the SVG wrapper is recreated to position/size the original artwork.\nNo remote requests or executable markup are used at runtime.\n\nThe collection code license does not supersede individual asset licensing or trademark guidelines.\nIcons identify the named projects and architecture providers; no affiliation or endorsement is implied.\n\n## pnpm\n\nUpstream license metadata: `CC0-1.0`. Source: https://pnpm.io/.\nGuidelines: https://pnpm.io/.\nAttribution: pnpm artwork, distributed through TheSVG.\n\n## Yarn\n\nUpstream license metadata: `CC-BY-4.0`. Source: https://yarnpkg.com/.\nGuidelines: https://github.com/yarnpkg/assets/tree/76d30ca2aebed5b73ea8131d972218fb860bd32d.\nAttribution: Yarn artwork, distributed through TheSVG.\n\n## npm\n\nUpstream license metadata: `CC0-1.0`. Source: https://www.npmjs.com/.\nGuidelines: https://docs.npmjs.com/policies/logos-and-usage.\nAttribution: npm artwork, distributed through TheSVG.\n\n## Bun\n\nUpstream license metadata: `CC0-1.0`. Source: https://bun.sh.\nGuidelines: https://bun.sh/press-kit.\nAttribution: Bun artwork, distributed through TheSVG.\n\n## GitHub\n\nUpstream license metadata: `CC0-1.0`. Source: https://github.com/.\nGuidelines: https://brand.github.com/.\nAttribution: GitHub artwork, distributed through TheSVG.\n\n## Google Cloud\n\nUpstream license metadata: `CC0-1.0`. Source: https://cloud.google.com/.\nGuidelines: https://cloud.google.com/.\nAttribution: Google Cloud artwork, distributed through TheSVG.\n\n## Microsoft Azure\n\nUpstream license metadata: `brand-use`. Source: https://azure.microsoft.com.\nGuidelines: https://azure.microsoft.com.\nAttribution: Microsoft Azure artwork, distributed through TheSVG.\n\n## Express\n\nUpstream license metadata: `CC0-1.0`. Source: https://github.com/openjs-foundation/artwork/blob/ac43961d1157f973c54f210cf5e0c9c45e3d3f10/projects/express/express-icon-black.svg.\nGuidelines: https://github.com/openjs-foundation/artwork/blob/ac43961d1157f973c54f210cf5e0c9c45e3d3f10/projects/express/express-icon-black.svg.\nAttribution: Express artwork, distributed through TheSVG.\n\n## Next.js\n\nUpstream license metadata: `brand-use`. Source: https://nextjs.org.\nGuidelines: https://nextjs.org.\nAttribution: Next.js artwork, distributed through TheSVG.\n\n## Model Context Protocol\n\nUpstream license metadata: `CC0-1.0`. Source: https://modelcontextprotocol.io/.\nGuidelines: https://modelcontextprotocol.io/.\nAttribution: Model Context Protocol artwork, distributed through TheSVG.\n\n## OpenAI\n\nUpstream license metadata: `MIT`. Source: https://openai.com/.\nGuidelines: https://openai.com/brand/.\nAttribution: OpenAI artwork, distributed through TheSVG.\n\n## OpenRouter\n\nUpstream license metadata: `CC0-1.0`. Source: https://openrouter.ai/.\nGuidelines: https://openrouter.ai/.\nAttribution: OpenRouter artwork, distributed through TheSVG.\n\n## PDF\n\nUpstream license metadata: `MIT`. Source: https://www.adobe.com/acrobat.html.\nGuidelines: https://www.adobe.com/acrobat.html.\nAttribution: PDF artwork, distributed through TheSVG.\n\n## PostgreSQL\n\nUpstream license metadata: `CC0-1.0`. Source: https://www.postgresql.org/.\nGuidelines: https://www.postgresql.org/about/policies/trademarks/.\nAttribution: PostgreSQL artwork, distributed through TheSVG.\n\n## Asset checksums\n\n- `pnpm/default`: `/icons/pnpm/default.svg`; SHA-256 `bde4fb8d2d95cc126c221113edc85fb393e24bf2085b12e1a376a669f3b8cd93`.\n- `pnpm/light`: `/icons/pnpm/light.svg`; SHA-256 `b8f4f05304a2081b08dc2a6713de68c5178ddec5ec8ef0b07c7852b00084ab61`.\n- `pnpm/dark`: `/icons/pnpm/dark.svg`; SHA-256 `bde4fb8d2d95cc126c221113edc85fb393e24bf2085b12e1a376a669f3b8cd93`.\n- `yarn/default`: `/icons/yarn/default.svg`; SHA-256 `683406caba9c47fb2ea29e6ffe7fc951da41e6678e40100acb7d62073a7c64a3`.\n- `npm/default`: `/icons/npm/default.svg`; SHA-256 `8fe7a9b3c30d7c44a4b7a431d6f943e30e374d8bde032d83377f2ab4e6a34544`.\n- `bun/default`: `/icons/bun/default.svg`; SHA-256 `8d28d9adf8bcda380ac9fdd1418453d451ec61942ed6661f5360846ac36f521a`.\n- `github/default`: `/icons/github/default.svg`; SHA-256 `5ca23571194899d8eb1d26a622bba6f59d7fe03abc08e2cd2970eb3795874ece`.\n- `github/light`: `/icons/github/light.svg`; SHA-256 `64568845c83d5e840e6a1fb7af1939fed14709636427ce9be2fbcdc14ac5e021`.\n- `github/dark`: `/icons/github/dark.svg`; SHA-256 `faa06f9e98a868d7a718670e779a649b2fdf4157cb4351993322258b842ae3c7`.\n- `google-cloud/default`: `/icons/google-cloud/default.svg`; SHA-256 `e314a1d65f5035bdcebb84ed740ed0341cc5ba15ecf22fa2c1b10d39fbe18880`.\n- `azure/default`: `/icons/azure/default.svg`; SHA-256 `6c6f0097f0e4a2b4adb7c29f770205c25b7b5c97fb317f3eaebab603f0de4a35`.\n- `express/default`: `/icons/express/default.svg`; SHA-256 `2ebc83e8b704b5eada8216215f55ff14f0bf15186908c533a15a884841d8657b`.\n- `nextjs/default`: `/icons/nextjs/default.svg`; SHA-256 `babba6badaa72dcdaf2995a5db877abb5f1c7226915faf1649621ee38007cba6`.\n- `model-context-protocol/default`: `/icons/model-context-protocol/default.svg`; SHA-256 `ac789162cbc24f8be20f17fe8390d9d95ac6f58d1444ec8d8d5fddd3339b894e`.\n- `model-context-protocol/light`: `/icons/model-context-protocol/light.svg`; SHA-256 `7b1a39135aff77616de792f253e38e2d0c308fb09e81586a2ce0454156f9ae4f`.\n- `model-context-protocol/dark`: `/icons/model-context-protocol/dark.svg`; SHA-256 `ac789162cbc24f8be20f17fe8390d9d95ac6f58d1444ec8d8d5fddd3339b894e`.\n- `openai/default`: `/icons/openai/default.svg`; SHA-256 `db81a8225166f02f773304ba4d8f0141343da5f43870d8b41f10bf6bc59840c8`.\n- `openai/light`: `/icons/openai/light.svg`; SHA-256 `a4b4dae5e28790a0fb3dc7b5d8bb199b0dd6938a002e52a8b6355394c321718e`.\n- `openai/dark`: `/icons/openai/dark.svg`; SHA-256 `db81a8225166f02f773304ba4d8f0141343da5f43870d8b41f10bf6bc59840c8`.\n- `openrouter/default`: `/icons/openrouter/default.svg`; SHA-256 `d05021526e72fddf3426eabc066924aca83da0cd66a699a3de3bac58ed2fe0a2`.\n- `openrouter/light`: `/icons/openrouter/light.svg`; SHA-256 `c2da40883edc203e91519bfd4ae2b7b353e14ea64c8b7347e8c13fe3cdd32dff`.\n- `openrouter/dark`: `/icons/openrouter/dark.svg`; SHA-256 `ef7ffcc624bef2e669ddd49a750016741a1b15a3223fb3801671b6b61ee856a7`.\n- `pdf/default`: `/icons/pdf/default.svg`; SHA-256 `3bf9487beaa660805d74e783749b34a9c0415c6f3d145ff7a78eb8102728f003`.\n- `postgresql/default`: `/icons/postgresql/default.svg`; SHA-256 `dc6bb4376a5cf235b19a8871f3219c2b98d97e4469309c8bbecb86ff1811f506`.\n\nYarn is attributed to the Yarn contributors and distributed under https://creativecommons.org/licenses/by/4.0/.\nTheSVG project code notice is included in TheSVG-MIT.txt; brand-use assets remain subject to the respective owner policies.\n";

// src/render/icons.ts
function renderNodeIcon(visual, prefix, x, y, size, theme, foreground) {
  const key = visual.key === "mcp" ? "model-context-protocol" : visual.key;
  const asset = visual.source === "phosphor" ? semanticIcons[visual.key] : brandIcons[key];
  const data = "body" in asset ? asset : "light" in asset && "dark" in asset ? asset[theme] : asset.default;
  const monochrome = visual.source !== "phosphor" && (key === "nextjs" || key === "express");
  return `<svg data-node-icon="${visual.key}" x="${x}" y="${y}" width="${size}" height="${size}" viewBox="${data.viewBox}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" color="${foreground}" fill="${visual.source === "phosphor" ? "currentColor" : "#000000"}"${monochrome && theme === "dark" ? ' style="filter:invert(1)"' : ""}>${scopeIconMarkup(data.body, prefix)}</svg>`;
}

// src/render/index.ts
var escapeXml = (text) => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
function renderSceneMarkup(document, scene, options) {
  const p = document.presentation.theme[options.theme ?? document.presentation.theme.mode], l = scene.layout;
  const id = Array.from(options.instanceId, (c) => c.codePointAt(0).toString(16)).join("-") || "0";
  const color = (variant) => variant === "branch" ? p.branch : p.cobalt;
  const text = (x, y, value, size = 13, fill = p.foreground, anchor = "start", family = "Geist") => `<text x="${x}" y="${y}" font-family="${family}, sans-serif" font-size="${size * document.presentation.textScale}" fill="${fill}" text-anchor="${anchor}">${escapeXml(value)}</text>`;
  const monoLabel = (x, y, value, size, fill, spacing = 0) => `<text x="${x}" y="${y}"${spacing ? ` letter-spacing="${spacing}"` : ""} font-family="Geist Mono, monospace" font-size="${size * document.presentation.textScale}" fill="${fill}">${escapeXml(value)}</text>`;
  let out = `<defs><marker id="arrow-${id}" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M1 1L7 4L1 7" fill="none" stroke="context-stroke" stroke-linecap="round" stroke-linejoin="round"/></marker><pattern id="grid-${id}" width="${document.presentation.grid.size}" height="${document.presentation.grid.size}" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="${p.foreground}" fill-opacity="0.12"/></pattern></defs>`;
  if (document.presentation.grid.visible)
    out += `<rect x="${scene.worldBounds.x}" y="${scene.worldBounds.y}" width="${scene.worldBounds.width}" height="${scene.worldBounds.height}" fill="url(#grid-${id})"/>`;
  for (const c of l.containers ?? [])
    out += `<g><rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="${LANE_R}" fill="${p.background}" stroke="${p.border}"/>${monoLabel(c.x + 18, c.y + 26, (c.label ?? "").toUpperCase(), 11.25, p.mutedForeground, 1.6)}${c.kind ? monoLabel(c.x + 18, c.y + 44, c.kind, 10, p.mutedForeground) : ""}</g>`;
  for (const line of l.lifelines ?? [])
    out += `<path d="M${line.x} ${line.y0}V${line.y1}" fill="none" stroke="${p.border}" stroke-dasharray="2 6"/>`;
  for (const e of l.edges)
    out += `<g data-edge-id="${escapeXml(e.id)}"><path d="${escapeXml(e.d)}" fill="none" stroke="${color(e.variant)}" stroke-width="${e.strokeWidth ?? EDGE_STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round"${e.dashed ? ' stroke-dasharray="2 7"' : ""}${e.arrowEnd ? ` marker-end="url(#arrow-${id})"` : ""}/></g>`;
  for (const c of l.continuations)
    out += `<path d="${escapeXml(c.d)}" fill="none" stroke="${color(c.variant)}" stroke-width="${EDGE_STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#arrow-${id})"/>`;
  for (const n of l.nodes) {
    const visual = document.metadata.visuals[n.id];
    const g = nodeGeometry(n, !!visual);
    out += `<g data-node-id="${escapeXml(n.id)}"><title>${escapeXml(n.label)}</title><desc>${escapeXml(n.description ?? "")}</desc>`;
    if (n.shape === "bar") {
      out += `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="2" fill="${color(n.weight === "primary" ? "main" : "branch")}" fill-opacity=".22" stroke="${p.border}"/></g>`;
      continue;
    }
    if (n.shape === "event") {
      const stroke = color(n.weight === "primary" ? "main" : "branch");
      out += `<line x1="${n.cx}" y1="${n.cy}" x2="${n.cx}" y2="${g.connectorEnd}" stroke="${stroke}" stroke-dasharray="2 4"/><circle cx="${n.cx}" cy="${n.cy}" r="${DOT_R}" fill="${p.background}" stroke="${stroke}"/><circle cx="${n.cx}" cy="${n.cy}" r="${DOT_R / 2.6}" fill="${stroke}"/>`;
      if (n.kind) out += monoLabel(n.cx, n.y - 24, n.kind.toUpperCase(), 10, p.mutedForeground, 1.4);
      out += `<text data-node-label="true" x="${n.cx}" y="${n.y}" text-anchor="middle" font-family="Geist, sans-serif" font-size="${13.5 * document.presentation.textScale}" fill="${p.foreground}">${escapeXml(n.label)}</text>`;
      if (n.sublabel) out += monoLabel(n.cx, n.y + 18, n.sublabel, 10.5, p.mutedForeground);
      out += "</g>";
      continue;
    }
    if (n.weight === "muted" && n.shape !== "table")
      out += `<line x1="${n.x}" y1="${n.y + n.h}" x2="${n.x + n.w}" y2="${n.y + n.h}" stroke="${p.border}" stroke-width="1"/>`;
    else
      out += `<rect data-node-surface="true" x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="${g.radius}" fill="${p.card}" stroke="${p.border}"/>`;
    if (visual) {
      const nodeId = Array.from(n.id, (c) => c.codePointAt(0).toString(16)).join("-");
      out += renderNodeIcon(
        visual,
        `icon-${id}-${nodeId}`,
        n.x + 15,
        n.cy - NODE_ICON_SIZE / 2,
        NODE_ICON_SIZE,
        options.theme ?? document.presentation.theme.mode,
        p.foreground
      );
    }
    if (n.shape === "table") {
      out += text(n.x + 14, n.y + 17.5, n.label, 13);
      out += `<path d="M ${n.x} ${n.y + 26} L ${n.x} ${n.y + CARD_R} Q ${n.x} ${n.y} ${n.x + CARD_R} ${n.y} L ${n.x + n.w - CARD_R} ${n.y} Q ${n.x + n.w} ${n.y} ${n.x + n.w} ${n.y + CARD_R} L ${n.x + n.w} ${n.y + 26} Z" fill="${p.foreground}" fill-opacity="0.06"/>`;
      for (const [index, field] of (n.fields ?? []).entries()) {
        const f = tableFieldGeometry(n, index, field.key);
        out += `<line x1="${n.x}" y1="${f.lineY}" x2="${n.x + n.w}" y2="${f.lineY}" stroke="${p.border}" stroke-width=".75"/>`;
        if (field.key === "pk" || field.key === "fk")
          out += text(
            n.x + 14,
            f.baseline,
            field.key,
            8.5,
            color(field.key === "pk" ? "main" : "branch"),
            "start",
            "Geist Mono"
          );
        out += `<text data-field-name="${escapeXml(field.name)}" x="${f.nameX}" y="${f.baseline}" font-family="Geist Mono, monospace" font-size="${11 * document.presentation.textScale}" fill="${p.foreground}">${escapeXml(field.name)}</text>`;
        const annotation = [field.type, field.key === "unique" ? "unique" : null].filter(Boolean).join(" \xB7 ");
        if (annotation)
          out += `<text data-field-annotation="${escapeXml(field.name)}" x="${f.annotationX}" y="${f.baseline}" text-anchor="end" font-family="Geist Mono, monospace" font-size="${10 * document.presentation.textScale}" fill="${p.mutedForeground}">${escapeXml(annotation)}</text>`;
      }
      out += "</g>";
      continue;
    }
    if (n.shape === "state" && n.initial)
      out += `<rect x="${n.x + 4}" y="${n.y + 4}" width="${n.w - 8}" height="${n.h - 8}" rx="${g.radius - 4}" fill="none" stroke="${p.border}"/>`;
    if (n.shape === "state" && n.final)
      out += `<circle cx="${g.final.x}" cy="${g.final.y}" r="6.5" fill="none" stroke="${p.foreground}" stroke-opacity="0.55"/><circle cx="${g.final.x}" cy="${g.final.y}" r="2.6" fill="${p.foreground}" fill-opacity="0.7"/>`;
    if (n.kind)
      out += monoLabel(g.textX, n.y + 24, n.kind.toUpperCase(), 11.25, p.mutedForeground, 1.6);
    out += `<text data-node-label="true" x="${g.labelX}" y="${g.labelY}"${g.centeredLabel ? ' text-anchor="middle" dominant-baseline="central"' : ""} font-family="Geist, sans-serif" font-size="${14.5 * document.presentation.textScale}" fill="${p.foreground}">${escapeXml(n.label)}</text>`;
    if (n.sublabel) out += monoLabel(g.textX, n.y + 70, n.sublabel, 11.25, p.mutedForeground);
    out += "</g>";
  }
  for (const d of l.decisions)
    out += `<g><rect x="${d.x - d.width / 2}" y="${d.y - DECISION_PILL_H / 2}" width="${d.width}" height="${DECISION_PILL_H}" rx="${DECISION_PILL_R}" fill="${p.background}" stroke="${p.border}"/>${text(d.x, d.y + 4.5, d.label, 12.25, p.foreground, "middle")}</g>`;
  for (const e of l.edges)
    if (e.label)
      out += `<g data-edge-label="${escapeXml(e.id)}"><rect x="${e.labelX - e.labelWidth / 2}" y="${e.labelY - PILL_H / 2}" width="${e.labelWidth}" height="${PILL_H}" rx="${PILL_R}" fill="${p.background}" stroke="${p.border}"/>${monoLabel(e.labelX, e.labelY + 4, e.label, 11.25, p.foreground)}</g>`;
  for (const c of l.continuations)
    out += `<g data-continuation-label="${escapeXml(c.id)}"><rect x="${c.labelX - c.labelWidth / 2}" y="${c.labelY - PILL_H / 2}" width="${c.labelWidth}" height="${PILL_H}" rx="${PILL_R}" fill="${p.background}" stroke="${p.border}"/>${monoLabel(c.labelX, c.labelY + 4, c.displayLabel, 11.25, p.foreground)}</g>`;
  if (Object.values(document.metadata.visuals).some((v) => v.source === "phosphor"))
    out += `<metadata>${escapeXml(semanticIconLicense)}</metadata>`;
  if (Object.values(document.metadata.visuals).some((v) => v.source !== "phosphor"))
    out += `<metadata>${escapeXml(brandIconNotices)}</metadata>`;
  return out;
}
function renderSvg(document, scene, options) {
  const p = document.presentation.theme[options.theme ?? document.presentation.theme.mode];
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${scene.layout.width}" height="${scene.layout.height}" viewBox="0 0 ${scene.layout.width} ${scene.layout.height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeXml(document.spec.caption)}"><title>${escapeXml(document.spec.caption)}</title>${options.fontCss ? `<style>${options.fontCss}</style>` : ""}${options.background === "transparent" ? "" : `<rect width="100%" height="100%" fill="${p.background}"/>`}<g transform="translate(${scene.origin.x} ${scene.origin.y})">${renderSceneMarkup(document, scene, options)}</g></svg>`;
}

export {
  escapeXml,
  renderSceneMarkup,
  renderSvg
};
