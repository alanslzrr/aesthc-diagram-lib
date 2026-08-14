// src/registry.ts
var registry = /* @__PURE__ */ new Map();
function registerDiagram(key, registration) {
  const visuals = registration.visuals ?? {};
  registry.set(key, { diagram: registration.diagram, visuals });
}
function getDiagramEntry(key) {
  return registry.get(key);
}
function hasDiagram(key) {
  return registry.has(key);
}
function getDiagram(key, locale) {
  const entry = registry.get(key);
  if (!entry) throw new Error(`Unknown diagram key: ${key}`);
  return entry.diagram[locale.startsWith("es") ? "es" : "en"];
}
function getDiagramVisuals(key) {
  return registry.get(key)?.visuals ?? {};
}
function getDiagramKeys() {
  return [...registry.keys()];
}
function registerDiagrams(entries) {
  for (const [key, registration] of Object.entries(entries)) {
    registerDiagram(key, registration);
  }
}
export {
  getDiagram,
  getDiagramEntry,
  getDiagramKeys,
  getDiagramVisuals,
  hasDiagram,
  registerDiagram,
  registerDiagrams
};
