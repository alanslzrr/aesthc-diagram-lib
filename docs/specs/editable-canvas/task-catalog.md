# Catálogo ejecutable de tareas

Generado desde `traceability.json`. `files` son destinos propuestos; la cobertura real de cada escenario
se lista en `test-catalog.md` con su archivo implementado y evidencia. Estados por tarea según `coverage`.

<a id="e00"></a>
## E00 — Caracterizar baseline y harness

**Hito:** M0 · **Depende de:** ninguna · **Cobertura:** 2 implementado / 0 parcial / 0 sin localizar.

**Requisitos:** R54.

**Archivos destino:**
- `tests/contracts.unit.spec.ts`
- `tests/e2e/editor-baseline.e2e.ts`
- `scripts/test-package.mjs`

1. **RED:** Congelar geometría, IDs y API de los siete tipos; falla ante renombrar una relación explícita o introducir un alias a src.
2. **GREEN:** Añadir fixtures seed, helpers de identidad y checklist del estado actual sin cambiar producción.
3. **REFACTOR:** Compartir helpers sin ocultar assertions de topología.

**Cierre verificable:** pnpm check verde; registrar baseline y capturas revisadas; ninguna prueba legacy eliminada.

<a id="e01"></a>
## E01 — Documento versionado e identidad

**Hito:** M0 · **Depende de:** E00 · **Cobertura:** 6 implementado / 0 parcial / 0 sin localizar.

**Requisitos:** R01, R02, R03.

**Archivos destino:**
- `src/types.ts`
- `src/editor-core/types.ts`
- `src/editor-core/document.ts`
- `src/editor-core/index.ts`

1. **RED:** Copiar semillas document; comprobar source inmutable, version future rechazada e IDs paralelos estables.
2. **GREEN:** Implementar envelope, defaults, create/import/serialize y materialización por índice.
3. **REFACTOR:** Separar canonicalización y migraciones puras, no tiempo/azar implícito.

**Cierre verificable:** R01–R03 verdes y contrato compilable; fixtures legacy sin pérdidas de spec.

<a id="e02"></a>
## E02 — Schemas, límites y diagnósticos

**Hito:** M0 · **Depende de:** E01 · **Cobertura:** 5 implementado / 1 parcial / 0 sin localizar.

**Requisitos:** R04, R05, R55.

**Archivos destino:**
- `scripts/generate-schemas.mjs`
- `src/editor-core/validation.ts`
- `src/validation/document-structural.js`
- `schemas/DiagramDocument.schema.json`
- `schemas/GraphDiagramSpec.schema.json`
- `schemas/DiagramFragment.schema.json`

1. **RED:** Duplicados, dangling refs, getters, cycles, límites exactos y unknown props deben fallar antes de layout.
2. **GREEN:** Generar nuevos schemas/validator standalone desde src/types.ts; pipeline de diagnóstico estable.
3. **REFACTOR:** Reutilizar inspect seguro evitando divergencia y sin ampliar silenciosamente API antigua.

**Cierre verificable:** schemas:generate/check reproducible; todos límites tienen caso N y N+1.

<a id="e03"></a>
## E03 — Adapters semánticos y capabilities

**Hito:** M0 · **Depende de:** E02 · **Cobertura:** 4 implementado / 0 parcial / 0 sin localizar.

**Requisitos:** R06, R53.

**Archivos destino:**
- `src/editor-core/adapters/index.ts`
- `src/editor-core/adapters/structured.ts`
- `src/editor-core/adapters/graph.ts`

1. **RED:** Intentar free XY en sequence, edge en timeline y lane inválida debe rechazar; CRUD por tipo debe conservar invariantes.
2. **GREEN:** Implementar ocho adapters, CRUD/reorder, remapeo de bands y eliminación en cascada.
3. **REFACTOR:** Extraer utilidades de entidades sin aplanar semánticas diferentes.

**Cierre verificable:** Matriz de ocho tipos cubierta; todos los comandos unsupported están documentados.

<a id="e04"></a>
## E04 — Store, transacciones e historial

**Hito:** M0 · **Depende de:** E02, E03 · **Cobertura:** 8 implementado / 0 parcial / 0 sin localizar.

**Requisitos:** R10, R11, R12, R13.

**Archivos destino:**
- `src/editor-core/commands.ts`
- `src/editor-core/store.ts`
- `src/editor-core/history.ts`

1. **RED:** Atomicidad, undo/redo, no-op, stale revision, caps de historial y dos stores aislados fallan primero.
2. **GREEN:** Implementar reducer puro, snapshots acotados, revisions monotónicas, subscribe estable y dispose.
3. **REFACTOR:** Índices por ID y notificaciones por invalidación; no store global.

**Cierre verificable:** R10–R13 verdes; replay conserva contenido/IDs; invalid no cambia snapshot.

<a id="e05"></a>
## E05 — Resolved scene y SVG compartido

**Hito:** M1 · **Depende de:** E03 · **Cobertura:** 4 implementado / 0 parcial / 0 sin localizar.

**Requisitos:** R14, R15.

**Archivos destino:**
- `src/canvas/scene.tsx`
- `src/canvas/DiagramCanvas.tsx`
- `src/editor-core/resolve.ts`
- `src/editor-core/routing.ts`

1. **RED:** Snapshots legacy idénticos; mover un solo endpoint debe cambiar ruta; negative coordinates no recortadas.
2. **GREEN:** Extraer primitivos, aplicar overrides y seed layout; renderer sin UI y fast routing.
3. **REFACTOR:** Compartir estilos/defs sin romper instanceId ni use client.

**Cierre verificable:** Geometría/visual de los siete tipos conservada y scene nueva testeada.

<a id="e06"></a>
## E06 — Surface y viewport accesible

**Hito:** M1 · **Depende de:** E04, E05 · **Cobertura:** 6 implementado / 0 parcial / 0 sin localizar.

**Requisitos:** R07, R08, R09.

**Archivos destino:**
- `src/editor/Surface.tsx`
- `src/editor/viewport.ts`
- `src/editor/gestures.ts`
- `src/editor/Outline.tsx`

1. **RED:** Zoom anclado, CSS scale, letterboxing, DPR y pointercancel se verifican antes del handler.
2. **GREEN:** Implementar pan/pinch, matrix conversion, focus scope, marquee y controles keyboard.
3. **REFACTOR:** Separar estado de gesto, matemática y DOM; un RAF por frame.

**Cierre verificable:** R07–R09 y cancelación E2E verdes, sin secuestro de scroll fuera del canvas.

<a id="e07"></a>
## E07 — CRUD, conexión e inspector semántico

**Hito:** M1 · **Depende de:** E06 · **Cobertura:** 6 implementado / 0 parcial / 0 sin localizar.

**Requisitos:** R16, R17, R23.

**Archivos destino:**
- `src/editor/actions.ts`
- `src/editor/ConnectionHandles.tsx`
- `src/editor/Inspector.tsx`

1. **RED:** Crear/reconnect/delete conserva IDs, parallel edges y referencias; IME/Escape no producen commits parciales.
2. **GREEN:** Conectar adapters a palette/inline text/inspector y overlay de handles.
3. **REFACTOR:** Derivar controles de capabilities, no duplicar reglas en UI.

**Cierre verificable:** Flujo crear→conectar→renombrar→borrar→undo válido para cada tipo compatible.

<a id="e08"></a>
## E08 — Multiselección, clipboard y grupos

**Hito:** M1 · **Depende de:** E07 · **Cobertura:** 6 implementado / 0 parcial / 0 sin localizar.

**Requisitos:** R18, R19, R20.

**Archivos destino:**
- `src/editor-core/selection.ts`
- `src/editor-core/clipboard.ts`
- `src/editor-core/groups.ts`
- `src/editor/SelectionOverlay.tsx`

1. **RED:** Multi-drag un commit; paste remapea todos IDs; cut con clipboard denegado no borra; group cycle rechaza.
2. **GREEN:** Implementar align/distribute/duplicate/fragment paste, locks, resize y grupos expandidos.
3. **REFACTOR:** Compartir transforms absolutos y recorte de referencias en transacciones.

**Cierre verificable:** Copiar/pegar no cruza edges externos; undo de group move restaura cada descendiente una vez.

<a id="e09"></a>
## E09 — Composición React y configuración scoped

**Hito:** M1 · **Depende de:** E07 · **Cobertura:** 4 implementado / 0 parcial / 0 sin localizar.

**Requisitos:** R21, R22.

**Archivos destino:**
- `src/editor/index.tsx`
- `src/editor/context.tsx`
- `src/editor/Toolbar.tsx`
- `src/editor/styles.css`

1. **RED:** Dos instancias y React StrictMode no duplican listener, theme ni history; permisos rechazan por dispatch.
2. **GREEN:** Root/Surface/Toolbar/Inspector/Outline/Status compuestos, props React18/19 y settings serializables.
3. **REFACTOR:** Eliminar boolean props redundantes; conservar separación de documento/session.

**Cierre verificable:** Host-owned store y cambio externo documentados; light/dark es/en completos.

<a id="e10"></a>
## E10 — Persistencia, import y autosave

**Hito:** M1 · **Depende de:** E04 · **Cobertura:** 6 implementado / 0 parcial / 0 sin localizar.

**Requisitos:** R24, R25, R26.

**Archivos destino:**
- `src/persistence/index.ts`
- `src/persistence/local-storage.ts`
- `src/editor/persistence.ts`

1. **RED:** Cuota, corrupt storage, dos writers y save A tardío tras edit B no pierden B.
2. **GREEN:** Adapter opt-in, queue por documento, tokens, drafts separados y UI de conflicto.
3. **REFACTOR:** Separar write scheduler de adapters y de React; clocks inyectables.

**Cierre verificable:** R24–R27 verdes, save/reload round-trip y zero writes por mount.

<a id="e11"></a>
## E11 — API pública JSON/SVG/PNG

**Hito:** M1 · **Depende de:** E05, E09 · **Cobertura:** 6 implementado / 0 parcial / 0 sin localizar.

**Requisitos:** R28, R29, R39.

**Archivos destino:**
- `src/export/index.ts`
- `src/export/svg.tsx`
- `src/export/browser.ts`
- `src/export/assets.ts`

1. **RED:** Export con selection/hover/camera/reveal activos coincide con canonical; fonts fallidas/retry se prueban.
2. **GREEN:** Fresh snapshot, SVG standalone, PNG y efectos copy/download separados, cancelación y receipt.
3. **REFACTOR:** Reutilizar renderer y asset manifest; site migra por wrapper compatible.

**Cierre verificable:** Archivos parseados/decodificados y no vacíos; fuente visible/resto del store inmutables.

<a id="e12"></a>
## E12 — Studio aislado y primer paquete consumidor

**Hito:** M1 · **Depende de:** E08, E09, E10, E11 · **Cobertura:** 2 implementado / 0 parcial / 0 sin localizar.

**Requisitos:** R27.

**Archivos destino:**
- `site/studio.html`
- `site/src/studio/main.tsx`
- `site/vite.config.ts`
- `package.json`
- `tsup.config.ts`
- `scripts/inject-use-client.mjs`

1. **RED:** Consumidor tarball importa nuevos subpaths y dos editores; landing no carga editor ni supera budget.
2. **GREEN:** Integrar Studio entrada separada, export map y CSS opcional; link normal desde site.
3. **REFACTOR:** Evitar dependencia inversa biblioteca→site; bundling por entrypoint.

**Cierre verificable:** M1 demo de ocho tipos; pnpm check/e2e, dist generado y paquete sin aliases.

<a id="e13"></a>
## E13 — Graph queries y viewer semántico

**Hito:** M2 · **Depende de:** E03, E05, E09 · **Cobertura:** 6 implementado / 0 parcial / 0 sin localizar.

**Requisitos:** R30, R31, R32.

**Archivos destino:**
- `src/graph/index.ts`
- `src/viewer/DiagramViewer.tsx`
- `src/viewer/Finder.tsx`
- `src/viewer/Inspector.tsx`

1. **RED:** Semillas de multigraph con cycles/self/parallel/unreachable: ruta y reach exactos antes de UI.
2. **GREEN:** BFS iterativo, receipts por revision, finder y relación accesible.
3. **REFACTOR:** Compartir índice; no obtener topology del DOM.

**Cierre verificable:** R30–R32 verdes, edges explícitos y stale queries invalidadas.

<a id="e14"></a>
## E14 — Lenses, vistas, story y presentación

**Hito:** M2 · **Depende de:** E13, E06 · **Cobertura:** 6 implementado / 0 parcial / 0 sin localizar.

**Requisitos:** R33, R34, R35.

**Archivos destino:**
- `src/viewer/views.ts`
- `src/viewer/motion.ts`
- `src/viewer/Minimap.tsx`
- `src/viewer/Presentation.tsx`

1. **RED:** Story no crea transitive edges; reduced-motion/hidden cancela; collapse no cambia queries/export.
2. **GREEN:** Lens por roles, minimap, named views, story finito y control único de movimiento.
3. **REFACTOR:** Separar reducers viewer de camera adapters y tiempos inyectados.

**Cierre verificable:** Un solo owner de motion; links restauran solo IDs existentes; keyboard completo.

<a id="e15"></a>
## E15 — Calidad geométrica y layout asíncrono

**Hito:** M2 · **Depende de:** E05, E04 · **Cobertura:** 1 implementado / 0 parcial / 3 sin localizar.

**Requisitos:** R36, R37.

**Archivos destino:**
- `src/editor-core/quality.ts`
- `src/editor-core/router.ts`
- `src/editor-core/layout-provider.ts`

1. **RED:** Edge atraviesa nodo, label overlap y layout A lento tras B deben fallar de forma localizada.
2. **GREEN:** A* acotado, publish quality, text measurement y requestId/cancelación.
3. **REFACTOR:** Cache índices de obstáculos y medir antes de optimizar; nunca borrar labels.

**Cierre verificable:** Receipts identifican medición/control soportado, latest-only y fallback honesto.

<a id="e16"></a>
## E16 — HTML viewer autónomo

**Hito:** M2 · **Depende de:** E11, E13, E14, E15 · **Cobertura:** 0 implementado / 0 parcial / 2 sin localizar.

**Requisitos:** R38.

**Archivos destino:**
- `src/export/html.ts`
- `src/export/standalone.tsx`
- `scripts/build-standalone.mjs`

1. **RED:** Abrir file:// sin red ni fuente externa; script injection y script disabled probados antes de plantilla.
2. **GREEN:** Bundle runtime viewer, CSS/fonts/notices, índice mínimo y CSP de artifact.
3. **REFACTOR:** Compartir queries y render; no crear una implementación semántica paralela.

**Cierre verificable:** Offline HTML funciona en browsers soportados; 0 network; ≤8 MiB.

<a id="e17"></a>
## E17 — Shares, cards y capacidades raster

**Hito:** M2 · **Depende de:** E11, E13, E14 · **Cobertura:** 1 implementado / 0 parcial / 5 sin localizar.

**Requisitos:** R40, R41, R42.

**Archivos destino:**
- `src/export/cards.ts`
- `src/persistence/share.ts`
- `src/export/capabilities.ts`
- `site/src/components/ExportMenu.tsx`

1. **RED:** Decode bomb, route card stale, webp falso y clipboard denied fallan sin artifacts engañosos.
2. **GREEN:** d=/v= codec, route/reach cards 1200×630, JPEG/WebP y print fallback.
3. **REFACTOR:** Un snapshot para query y card, mismo pipeline raster.

**Cierre verificable:** Receipts scoped/canonical correctos; backward s= decoder preservado.

<a id="e18"></a>
## E18 — Extensibilidad por instancia

**Hito:** M2 · **Depende de:** E09, E11, E15 · **Cobertura:** 0 implementado / 0 parcial / 4 sin localizar.

**Requisitos:** R43, R56.

**Archivos destino:**
- `src/editor-core/renderers.ts`
- `src/editor-core/providers.ts`
- `examples/custom-node.tsx`

1. **RED:** Renderer desconocido o sin export rechaza; extensión serializable persiste; registry aislado.
2. **GREEN:** Registro trusted, validate/measure/renderSvg, layout provider y ejemplo externo.
3. **REFACTOR:** No exponer estado privado o React interno en serialización.

**Cierre verificable:** Tarball ejemplo custom node compila y exporta; payload no registra código.

<a id="e19"></a>
## E19 — Gates a11y, performance y matriz browser

**Hito:** M2 · **Depende de:** E12, E14, E15, E16, E17, E18 · **Cobertura:** 5 implementado / 1 parcial / 0 sin localizar.

**Requisitos:** R44, R45, R46.

**Archivos destino:**
- `tests/e2e/editor-accessibility.e2e.ts`
- `tests/e2e/editor-performance.e2e.ts`
- `scripts/check-budgets.mjs`

1. **RED:** 1000/2000 dataset, drag latency y keyboard-only revelan fallos antes de optimizaciones.
2. **GREEN:** Resolver incumplimientos; budgets por entrada; artefactos benchmark y screenshots.
3. **REFACTOR:** Optimizar solo cuellos medidos, selectors por entidad y RAF; no cambiar semántica.

**Cierre verificable:** Cinco proyectos Playwright + benchmark Chromium, theme/locale + 200% zoom, cero errores console.

<a id="e20"></a>
## E20 — Migración y consumidores reales

**Hito:** M2 · **Depende de:** E19 · **Cobertura:** 2 implementado / 0 parcial / 0 sin localizar.

**Requisitos:** R47.

**Archivos destino:**
- `docs/guides/editor.md`
- `docs/guides/migration.md`
- `docs/guides/share-export.md`
- `docs/agents/integrate.md`
- `scripts/test-package.mjs`
- `scripts/test-frameworks.mjs`

1. **RED:** Compilar ejemplos legacy/nuevos desde tarball, React18/19, NodeNext/Bundler y Next/Vite falla si export falta.
2. **GREEN:** Guías, ejemplos, migrations receipts, snippets y fixtures de framework sin source alias.
3. **REFACTOR:** Mantener docs generadas desde contratos y evitar APIs duplicadas.

**Cierre verificable:** Nuevos usuarios y agentes completan integración desde tarball y docs coincidentes.

<a id="e21"></a>
## E21 — Cierre del candidato y evidencia release

**Hito:** M2 · **Depende de:** E19, E20 · **Cobertura:** 2 implementado / 0 parcial / 0 sin localizar.

**Requisitos:** R48.

**Archivos destino:**
- `CHANGELOG.md`
- `docs/maintainers/releasing.md`
- `.github/workflows/ci.yml`
- `.github/workflows/release.yml`

1. **RED:** Gates impiden candidato con baseline faltante, dist drift o referencias documentales no distribuidas.
2. **GREEN:** Registrar validación exacta, riesgos, known limits, versión candidata y artefactos de release.
3. **REFACTOR:** Mantener permisos publish fuera de CI ordinary.

**Cierre verificable:** Definition of Done M2 satisfecha; publicación separada requiere autorización específica.

<a id="e22"></a>
## E22 — Comparación exacta Before/Delta/After

**Hito:** M3 · **Depende de:** E21 · **Cobertura:** 0 implementado / 0 parcial / 2 sin localizar.

**Requisitos:** R49.

**Archivos destino:**
- `src/graph/compare.ts`
- `src/viewer/Comparison.tsx`
- `examples/compare.tsx`

1. **RED:** Rename ID es remove+add; movimiento solo presentation; sequence reorder semántico; diferente tipo rechaza.
2. **GREEN:** Diff por ID con grupos, settings y navegador accesible de cambios.
3. **REFACTOR:** Mismos selectors y no heurísticas de impacto.

**Cierre verificable:** Receipt determinista, inputs inmutables y sin afirmación de merge safety.

<a id="e23"></a>
## E23 — Evidencia y perfil deployment

**Hito:** M3 · **Depende de:** E21 · **Cobertura:** 0 implementado / 0 parcial / 4 sin localizar.

**Requisitos:** R50, R51.

**Archivos destino:**
- `src/editor-core/evidence.ts`
- `src/editor-core/profiles.ts`
- `src/viewer/Evidence.tsx`

1. **RED:** Evidence declarada no puede hacerse verified por JSON; traversal y owner/region faltantes fallan.
2. **GREEN:** Verificador trusted opt-in, receipts separados, perfil declarativo y UI de estado.
3. **REFACTOR:** No poner network/fs implícitos en editor/browser import.

**Cierre verificable:** No información privada embebida por defecto; reglas opt-in con tests independientes.

<a id="e24"></a>
## E24 — Trace finito y WebM

**Hito:** M3 · **Depende de:** E21 · **Cobertura:** 0 implementado / 0 parcial / 2 sin localizar.

**Requisitos:** R52.

**Archivos destino:**
- `src/export/motion.ts`
- `src/viewer/trace.ts`
- `tests/e2e/editor-motion.e2e.ts`

1. **RED:** Codec ausente, stop temprano, hidden/reduced-motion y recorder error tienen cleanup comprobable.
2. **GREEN:** Motion owner y recorder aislado 30fps/≤120s, capabilities y decodificación real.
3. **REFACTOR:** Reusar scene/clock; sin screen capture o micrófono.

**Cierre verificable:** WebM abre/decodifica con frame final; plataformas sin soporte muestran unavailable, nunca skipped-pass.
