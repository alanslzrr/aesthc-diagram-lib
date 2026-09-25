# 1. Evidencia y priorización

## 1.1 Método y límites

Lectura del checkout local y de una copia de solo inspección de Archify fijada al commit declarado en el índice. No se ejecutaron instaladores, skills, tests ni código de Archify. Sus instrucciones y diagramas se trataron como datos. Se revisaron README, contrato de authoring/viewer, schemas, módulos viewer, comparador, manifiesto y licencia. El comportamiento upstream aquí atribuido está documentado o respaldado por código; **no equivale a una prueba interactiva de su aplicación**.

Las referencias a documentación externa se consultaron el 2026-09-22. Las decisiones de diseño y prioridades son propuestas propias para esta biblioteca, no afirmaciones sobre las preferencias de usuarios de Archify. No se utilizan estrellas de GitHub como evidencia de valor.

## 1.2 Estado real de diagram-lib

| Área | Evidencia local | Consecuencia |
|---|---|---|
| Datos | `src/types.ts`: siete specs discriminados; relaciones opcionalmente identificadas | No sustituir estos contratos por un grafo universal que pierda participantes, campos o lanes |
| Geometría | `src/layout.ts`, `src/layouts/`: funciones sin DOM a `DiagramLayout` | Reutilizar para SSR, viewer, export y seed inicial del editor |
| Identidad | `identifyEdges` conserva IDs explícitos; anónimos paralelos siguen orden autoral | Materializar IDs antes de la primera edición; nunca regenerarlos en drag/reorder |
| Canvas | `src/canvas/DiagramCanvas.tsx`: SVG, tooltip, focus y selección simple controlados | No hay viewport libre, drag, handles, multiselección o historial público |
| Grafo | `buildAdjacency`, `connectedIds`, `diagramEdges` | Hay resaltado agregado upstream/downstream, no query pública de ruta ordenada ni receipt de reach |
| Playground | `site/src/components/DiagramPanel.tsx` | Edita JSON y algunas opciones; no es un editor WYSIWYG |
| Seguridad | `src/validation/index.ts`, `site/src/lib/code.ts`, `playground-policy.ts` | JSON.parse, validación estructural/semántica y límites ya existen; no presentar su creación como feature nueva |
| Compartir | `site/src/lib/share.ts` | Fragmentos v1 comprimidos/JSON; 64 KiB codificados, 256 KiB expandidos, timeout y validación |
| Guardar | `site/src/lib/drafts.ts` | Borradores locales de texto y opt-in; no documento público transaccional ni adaptador CAS |
| Export | `site/src/lib/svg-export.ts` | SVG con CSS calculado/fuentes y PNG 2x; código privado del site, acoplado al DOM vivo y al fondo de body |
| Estilo | ThemeStudio, palette y DESIGN_SYSTEM | Ya hay edición de tokens; falta contrato serializable portable a la librería |
| Distribución | `tsup.config.ts`, export map, `site/vite.config.ts` | Registry compartido por chunks; site usa paquete, no alias a src; no repetir defectos históricos ya resueltos |
| Calidad | 135 unit tests y 10 pruebas de tarball en baseline de `pnpm check` | Preservar estos gates y añadir cobertura, no sustituirlos |
| Tamaño | `scripts/check-budgets.mjs` incluye dynamicImports | Playground Node22: 176758/179200 bytes gzip, margen 2442; Node25: 176188, margen 3012. Editor requiere entrada separada |

Baseline no implica publicación: `diagramRelease` sigue candidate y `npmAvailable:false`. No se consultó npm para declarar una release.

## 1.3 Matriz de valor y brecha

P0 = necesario para el pedido; P1 = diferenciación directamente aprovechable; P2 = extensión separable. Es una priorización razonada, no una medición de demanda.

| Capacidad contrastada | Archify: evidencia | Situación local | Decisión / hito |
|---|---|---|---|
| Fuente tipada reproducible | [Schemas](https://github.com/tt-a1i/archify/blob/1bb61c69538e37d80793b25843f620e55469f3a2/archify/schemas/README.md) | Specs sin envelope de documento | P0: documento versionado, M0 |
| Canvas editable directo | [Alcance explícito](https://github.com/tt-a1i/archify/blob/1bb61c69538e37d80793b25843f620e55469f3a2/README.md#reference-and-scope) lo excluye | Tampoco existe | P0: diseño propio M1, no paridad upstream |
| Posiciones, boundaries y rutas autoradas | [Architecture schema](https://github.com/tt-a1i/archify/blob/1bb61c69538e37d80793b25843f620e55469f3a2/archify/schemas/architecture.schema.json) | Band/lane y ajustes acotados | P0: scene + groups + graph libre M1 |
| Diagnósticos y última versión válida | [Delivery contract](https://github.com/tt-a1i/archify/blob/1bb61c69538e37d80793b25843f620e55469f3a2/archify/references/delivery-contract.md) | Validación de datos y preview seguro | P0: validar cada transacción; P1: calidad geométrica M2 |
| Encontrar, focalizar y ver detalles | [Node finder](https://github.com/tt-a1i/archify/blob/1bb61c69538e37d80793b25843f620e55469f3a2/viewer/node-finder.js), [focus](https://github.com/tt-a1i/archify/blob/1bb61c69538e37d80793b25843f620e55469f3a2/viewer/focus.js) | Tooltip y highlight | P1: viewer, panel y búsqueda M2 |
| Reach dirigido y rutas exactas | [Route probe](https://github.com/tt-a1i/archify/blob/1bb61c69538e37d80793b25843f620e55469f3a2/viewer/route-probe.js) | Adjacency reutilizable, no journey | P1: query determinista con IDs M2 |
| Lentes, minimapa y profundidad de lectura | [Viewer runtime](https://github.com/tt-a1i/archify/blob/1bb61c69538e37d80793b25843f620e55469f3a2/archify/references/viewer-runtime.md) | No público | P1: roles, filtros no destructivos y minimapa M2 |
| Vistas, historias y presentación | [Guided views](https://github.com/tt-a1i/archify/blob/1bb61c69538e37d80793b25843f620e55469f3a2/viewer/guided-views.js) | Reveal visual, no narrativa autorada | P1: secuencia de vistas sin inferir causalidad M2 |
| HTML autónomo | [Delivery](https://github.com/tt-a1i/archify/blob/1bb61c69538e37d80793b25843f620e55469f3a2/archify/references/delivery-contract.md) | Solo web app y export estático | P0/P1: viewer offline autocontenido M2 |
| Export limpio y share cards | [Export](https://github.com/tt-a1i/archify/blob/1bb61c69538e37d80793b25843f620e55469f3a2/viewer/export.js), [cleanup](https://github.com/tt-a1i/archify/blob/1bb61c69538e37d80793b25843f620e55469f3a2/viewer/export-cleanup.js) | SVG/PNG del DOM actual | P0: API pública M1/M2; P1: cards de ruta/reach M2 |
| JPEG/WebP y WebM finito | [Viewer contract](https://github.com/tt-a1i/archify/blob/1bb61c69538e37d80793b25843f620e55469f3a2/archify/references/viewer-runtime.md#canonical-exports) | PNG/SVG | P1: raster por capacidad M2; P2: WebM M3 |
| Comparación Before/Delta/After | [Comparator](https://github.com/tt-a1i/archify/blob/1bb61c69538e37d80793b25843f620e55469f3a2/archify/delta/architecture-delta.mjs) | No existe | P2: comparación por ID, no merge ni impacto, M3 |
| Evidencia ligada a Git | [Evidence verifier](https://github.com/tt-a1i/archify/blob/1bb61c69538e37d80793b25843f620e55469f3a2/archify/renderers/shared/repository-evidence.mjs) | Descripciones y referencias de ejemplos | P2: links declarados + verificador opt-in M3 |
| Ownership/deployment fail-closed | [Engineering profiles](https://github.com/tt-a1i/archify/blob/1bb61c69538e37d80793b25843f620e55469f3a2/archify/renderers/shared/engineering-profiles.mjs) | Sin perfil formal | P2: reglas autoradas opt-in M3 |

## 1.4 Qué NO trasladar literalmente

- La tipografía, paletas y chrome de Archify: mantener el sistema visual propio.
- Sus cinco schemas como sustitución de los siete locales: sus semánticas y versiones son diferentes; workflow acepta v1/v2, los otros v1 en el commit leído.
- La lógica global ensamblada en HTML como store de React. Extraer capacidades por diseño, no copiar el runtime completo.
- Límite de cinco capítulos: aquí se especifica un límite propio de veinte vistas y cincuenta pasos totales.
- El CLI/skill, update checker, instalación multi-agente, website de promoción y Proof Lab: no resuelven edición embebible.
- Claims de análisis de repositorio, impacto de cambios o ejecución real: mostrar solamente topología autorada o evidencia verificada.
- WebM como requisito universal de navegador: negociar codec y rechazar de forma explícita si no está disponible.

No se copiaron fuentes ni assets upstream en esta entrega. Si una implementación reutiliza código MIT, debe conservar las atribuciones de [LICENSE](https://github.com/tt-a1i/archify/blob/1bb61c69538e37d80793b25843f620e55469f3a2/LICENSE), registrar los archivos y revisar también sus notices de assets. Esta es una condición de ingeniería del proyecto, no un dictamen legal.

## 1.5 Alternativas de motor

| Alternativa | Beneficio | Coste relevante aquí | Decisión |
|---|---|---|---|
| SVG actual + controlador propio | Un scene/render/export; siete tipos sin reescritura | Implementar interacción, hit testing y keyboard | Elegida para M0–M2 |
| React Flow opcional | [Custom nodes](https://reactflow.dev/learn/customization/custom-nodes), [API de viewport/interacción](https://reactflow.dev/api-reference/react-flow) | Adapter de geometría/identidad, segunda representación visual, medición de peso y diferencias de export | No introducir en base; reconsiderar solo mediante spike medido si M1 incumple objetivos |
| Canvas2D/WebGL | Potencial para escenas muy grandes | Accessibility tree, texto/SVG/export y siete renderers adicionales | Fuera de alcance actual |
| Fork completo de Archify | Viewer y deliver ya integrados upstream | No aporta WYSIWYG; modelo, distribución y estilo diferentes | Rechazado |

La elección SVG no afirma que sea más rápido que React Flow. Reduce migración y divergencia **en este código**; el benchmark definido es el gate de rendimiento.
