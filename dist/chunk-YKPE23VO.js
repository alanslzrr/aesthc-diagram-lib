import {
  CARD_R,
  CARD_TEXT_X
} from "./chunk-TVEV5XLW.js";

// src/geometry/node.ts
function nodeGeometry(node, hasVisual = false) {
  const isMuted = node.weight === "muted", isEvent = node.shape === "event";
  const centeredLabel = !hasVisual && !node.kind && !node.sublabel && !isMuted;
  const textX = node.x + (hasVisual ? CARD_TEXT_X : 18);
  const below = (node.nudge ?? 0) > 0;
  const hitY = isEvent ? below ? node.cy - 12 : node.y - 36 : node.y;
  const hitHeight = isEvent ? below ? node.y + 30 - (node.cy - 12) : node.cy + 12 - (node.y - 36) : node.h;
  return {
    centeredLabel,
    textX,
    radius: node.shape === "state" || node.shape === "terminal" ? Math.min(CARD_R * 2.4, node.h / 2) : CARD_R,
    labelX: isEvent ? node.cx : centeredLabel ? node.cx : textX,
    labelY: isEvent ? node.y : centeredLabel ? node.cy : node.y + 48,
    connectorEnd: below ? node.y - 38 : node.y + (node.sublabel ? 26 : 10),
    hit: { x: node.x, y: hitY, width: node.w, height: hitHeight },
    final: { x: node.x + node.w - 20, y: node.cy }
  };
}
function tableFieldGeometry(node, index, key) {
  return {
    nameX: node.x + (key === "pk" || key === "fk" ? 34 : 14),
    annotationX: node.x + node.w - 14,
    lineY: node.y + 26 + index * 22,
    baseline: node.y + 40.5 + index * 22
  };
}

export {
  nodeGeometry,
  tableFieldGeometry
};
