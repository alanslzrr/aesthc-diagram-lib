# Ejecución del canvas editable

Fecha: 2026-09-23. Rama: `alanslzrr/editable-canvas-foundation`.

**Estado: integración funcional parcial; el spec completo NO está terminado.**
No se han publicado paquetes, creado releases ni hecho commits en esta ejecución.
El catálogo de 25 tareas continúa siendo el alcance objetivo. Tener una API o un
test semilla verde no cierra todos los escenarios de una tarea.

## Implementación disponible

- Documento v1, importación de JSON/spec/localized/legacy explícito, IDs estables,
  serialización canónica, schemas generados y límites de datos.
- Ocho adapters semánticos y conversión explícita a graph con recibo de pérdidas.
- Store aislado, snapshots congelados, transacciones atómicas, expectedRevision,
  undo/redo monótonos, límites de historial, drafts y gestos.
- Resolución de posiciones, dimensiones, rutas manuales, grupos y bounds negativos.
- React opt-in: superficie SVG editable, pan/zoom/fit, selección con Shift y marquee cancelable,
  movimiento por teclado, copiar/pegar interno y del sistema, alineación/distribución, duplicación, grupos, conexión,
  resize visual de ocho direcciones/teclado, pinch, Space pan, outline de entidades, cambio de etiqueta/geometría, bloqueo, temas, grid y JSON.
- Queries dirigidas route/reach con IDs exactos de paralelas y self-loops.
- Exportación aislada JSON/SVG/PNG/JPEG/WebP con fonts WOFF2 explícitas,
  licencias Geist embebidas, límites de píxeles, cancelación y receipts.
- Persistencia por instancia, localStorage con Web Locks, conflictos por token
  y autosave opt-in. No uploads de documentos.
- Studio separado en `site/studio.html`, imports públicos y ejemplo consumidor.
  Importar el root antiguo no carga el editor.

## TDD observado

No se presenta toda prueba añadida como test-first. Las siguientes rebanadas
sí tuvieron RED observado antes de su implementación o corrección:

| Rebanada | Evidencia RED | Resultado posterior |
|---|---|---|
| Documento | 10 assertions fallaron | 10 verdes |
| Validación | 11 assertions fallaron | 11 verdes + casos posteriores |
| Store/lifecycle | 8 fallos con store ausente | 8 verdes + regresiones posteriores |
| Adapters/graph/viewport | 16 fallos iniciales | 16 verdes |
| Scene | 2 fallos, 1 caso de abort ya verde | 3 verdes |
| Export | 2 fallos, 1 caso de rechazo ya verde | 3 verdes |
| Persistencia | 2 fallos | 2 verdes |
| Clipboard | 2 fallos | 2 verdes |
| Array JSON / history capacity | 2 fallos | 2 verdes |
| Conversión / borrado de grupos | 8 fallos | 8 verdes |
| Bounds de texto largo | 1 fallo | 1 verde |
| Geometría renderer | 4 assertions fallaron (card/ER/timeline/state) | 4 verdes |
| Marquee | Módulo ausente y E2E sin rectángulo | 2 unit verdes + E2E con zoom, Shift, Escape y sin historial |
| Resize handle | E2E sin handle | E2E preview/cancel/commit único/teclado/undo verde |
| Mutation expectedRevision | Eliminar temporalmente el guard hizo fallar el test stale | Guard restaurado; suite verde |

Los logs RED están en `/tmp/adl-*-red.log`; la mutación en
`/tmp/adl-revision-mutation.log`. Son evidencia local temporal, no artefactos
inmutables de CI. No se ha ejecutado un mutation runner exhaustivo.

## Estado por tarea

| Tarea | Estado real | Falta para cerrar |
|---|---|---|
| E00 | Baseline y harness ejecutados | Matriz bundled y visual legacy íntegramente aprobados |
| E01 | Implementada y probada | Revisión final de contratos del candidato |
| E02 | Implementada; N/N+1 en once límites y preflight adversarial | Completar todas las combinaciones del catálogo |
| E03 | Adapters y conversión implementados | Expandir matriz CRUD completa, reorder semántico y remapeos |
| E04 | Store funcional y testeado; mutation manual | Más interleavings, invalidaciones granulares y benchmark |
| E05 | Primitives/estilos alineados con el legado (rx, dashes, pills, tablas, estado, muted, kinds); medición pluggable con provider canvas en editor/export y fuentes embebidas en export; overflow medido también para tipos estructurados | Certificación visual con Chromium fijado y shaping de fuentes definitivo; matriz bundled completa |
| E06 | Superficie, marquee, resize de ocho direcciones y de selección múltiple, teclado, pinch, RAF por frame, scroll nativo/zoom modificado, touch prolongado y outline básico | Matriz completa de accesibilidad/gestos y benchmark de rendimiento |
| E07 | CRUD/conexiones/inspector básicos; selección visual de conexiones y edición de rutas manuales (waypoints y anclas arrastrables, toggle auto/manual) | Inspector estructurado específico (ER/sequence/swimlane) y edición visual de puertos |
| E08 | Multiselección, grupos, clipboard del sistema, align/distribute y paste estructurado con mapping de bandas (clamp o explícito) y carriles (label, luego índice, rechazo explícito) | Ampliar matriz de plataforma y casos de geometría |
| E09 | Composición pública, ownership Strict Mode, outline integrado y tema/locale | Slots/configuración avanzada y selectores con suscripción granular |
| E10 | Persistencia/auto-save/conflictos, recuperación de borradores, cuarentena de corruptos sin sobrescribir, save-as y reapertura de copias guardadas (list + open) | Escenarios de fallos de almacenamiento ampliados |
| E11 | API estática/raster funcional | Paridad visual certificada, medición de fuentes y todas las fallas de plataforma |
| E12 | Studio y consumidor externo funcionales | Cerrar dependencias M1 antes de declarar hito completo |
| E13 | Graph queries implementadas | Viewer semántico y sus controles |
| E14 | Contrato persistible validado | Lenses, vistas UI, stories, minimap y presentación |
| E15 | Warnings básicos de overlap/texto | Router A*, calidad publish real, text shaping, workers/providers |
| E16 | Pendiente | HTML autónomo, runtime offline, CSP y no-JS |
| E17 | Raster adicional disponible | Share links versionados, cards y receipt query verification |
| E18 | Pendiente | Registros trusted por instancia y export de renderers custom |
| E19 | Parte de gates ejecutada | Firefox/WebKit/bundled, a11y manual, perf y memoria |
| E20 | Guía, ejemplo, tarball y frameworks | Matriz editor React18/19 completa y migración de todas las superficies |
| E21 | No cerrado | Cerrar M2 y todos sus gates; publicación requiere autorización aparte |
| E22 | Pendiente | Diff exacto semántico/presentación |
| E23 | Datos evidence validados | Verificador trusted y validación deployment profile |
| E24 | Pendiente | Playback finito y WebM, abort/cleanup/decodificación |

## Limitaciones que no deben ocultarse

- El renderer del editor es nuevo y no sustituye todavía los primitivos del
  canvas legado. No se afirma paridad visual completa en todos los tipos,
  iconos, ER/state/event ni custom renderer.
- El cálculo de texto es conservador, no un shaping engine. Un receipt con
  `verified: false` no es certificación de calidad. No hay auto-routing A*.
- Clipboard interno y del sistema están separados; la ruta de sistema depende de
  permisos del navegador. Los E2E de editor usan un mock de Clipboard API. Paste de
  tipos estructurados exige mapping aún no implementado.
- El input JSON conserva datos de vistas/story/evidence, pero eso no implica
  que existan sus viewers, verificadores o exportaciones.
- El store hace invalidación conservadora de toda la escena. No se han medido
  los objetivos de drag/1000 nodos ni ciclos de memoria del spec.
- La copia local no es backup. Sin Web Locks se informa guardado no disponible;
  no se simula compare-and-swap con localStorage no atómico.
- Chrome del sistema es evidencia complementaria. No sustituye el Chromium
  del lockfile ni Firefox/WebKit.

## Reanudar de forma segura

1. Leer este informe y ejecutar `pnpm check` con Node22.
2. Cerrar E05 antes de ampliar el viewer: extraer primitives compartidos y
   verificar formas/iconos/bounds para los siete tipos.
3. Completar E06–E11; luego E13–E21 por dependencias, sin marcar todos los
   requisitos satisfechos porque las semillas mínimas pasan.
4. Instalar browsers del lockfile cuando el CDN responda. Usar puertos propios
   con `PLAYWRIGHT_PORT`; `reuseExistingServer:false` evita el servicio ajeno
   en4173. Runs simultáneos deben tener `--output` distintos.
5. No publicar ni actualizar golden images para ocultar diferencias.

## Verificación de la integración anterior (antes de la continuación)

| Gate ejecutado | Resultado observado |
|---|---|
| `pnpm check`, Node22.23.2 / pnpm10.29.3 | PASS: lint, formato, schemas/docs sincronizados, tipos, **214 tests unitarios**, **11 tests de tarball** con React19.2.8, exports react-server, resolvers NodeNext/Bundler, site/docs/build/budgets |
| Tarball con `REACT_VERSION=18.3.1 REACT_TYPES_VERSION=18 REACT_DOM_TYPES_VERSION=18 node scripts/test-package.mjs` | PASS: 11 tests y ambos resolvers; no implica browser matrix React18 del editor |
| `PLAYWRIGHT_PORT=42813 PLAYWRIGHT_CHANNEL=chrome pnpm test:e2e --project=chromium --project=mobile-chromium --output=/tmp/adl-final-e2e-results --reporter=list` | PASS: **117 passed, 7 skipped**, Chrome153.0.8010.53; incluye Studio, axe serious/critical, edición/undo/grupos/geometría, export, frozen docs A/B y tests legacy |
| `PLAYWRIGHT_CHANNEL=chrome node scripts/test-frameworks.mjs` después del build | PASS: tarball aislado, Vite7.3.6 y Next15.5.25; build, hydration, CSS, selección, edición y undo; Strict Mode en consumidor Vite |
| `PLAYWRIGHT_PORT=42814 PLAYWRIGHT_CHANNEL=chrome pnpm test:visual --update-snapshots=none --output=/tmp/adl-final-visual-results --reporter=list` | **3 passed, 1 failed**: seis píxeles distintos en `docs-sequence-dark.png`, texto GET; diff revisado, golden NO actualizado. Falta resolver o verificar con browser fijado |
| `pnpm exec playwright install` | BLOCKED: timeout reiterado descargando Chromium1243 |
| Studio Firefox/WebKit | No ejecutable: faltan Firefox1543 y WebKit2359; dos fallos de infraestructura y diez no ejecutados |
| Checker del spec y tsc de contracts | PASS: 25 tareas, 56 requisitos, 112 escenarios, fixtures y sintaxis seeds; no prueba implementación completa |
| `git diff --check` | PASS |

Las capturas Studio light/en y dark/es, desktop/mobile, se generaron bajo
`/tmp/adl-final-e2e-results`; se revisaron visualmente capturas de escritorio y
móvil. No son golden baselines de Studio. La captura fullPage de Chrome emulado
cambia pointer:coarse después de capturar; se reprodujo y los controles pequeños
también tienen mínimo44px por viewport. No se actualizó ningún golden legado.

Tamaños finales observados con Node22:

- Landing: 176781 /179200 bytes JS gzip; CSS10794 /12288.
- Docs: 105353 /179200 bytes JS gzip; CSS9853 /12288.
- Studio: 134654 /179200 bytes JS gzip; CSS2837 /12288.
- Tarball: 686545 bytes packed,3179131 unpacked,188 archivos.

Logs locales: `/tmp/adl-check-final.log`, `/tmp/adl-react18.log`,
`/tmp/adl-e2e-final.log`, `/tmp/adl-frameworks-final.log`,
`/tmp/adl-visual-final.log`, `/tmp/adl-browser-install.log` y
`/tmp/adl-matrix-unavailable.log`. El preview local fue iniciado en
`http://127.0.0.1:42819/studio.html`; no es un despliegue público.

## Continuación: geometría y selección directa (2026-09-23)

- Se extrajo `src/geometry/node.ts`, sin runtime React/DOM, compartido por el
  canvas legado y el renderer nuevo. Se corrigieron centro de labels sencillos,
  filas/annotations ER, posiciones spine/label timeline y marcador final state.
  Esto no cierra la paridad completa de iconos, estilos y primitives de E05.
- Los eventos timeline tienen hit bounds no nulos; solo los nodos autorados
  reciben overlays interactivos. Las barras sintéticas de sequence no son
  controles seleccionables.
- Marquee en coordenadas mundo, overlap positivo, drag inverso, Shift aditivo,
  Escape/pointercancel y estado efímero sin dirty/history. Pan sigue separado.
- Handle inferior derecho para un nodo libre desbloqueado: target de 44px bajo
  zoom, preview transaccional, snap, límites de tamaño, un commit por gesto,
  cancelación, teclado y undo. No se declara soporte de ocho handles o pinch.

### Gates de esta continuación

| Ejecución | Resultado |
|---|---|
| `pnpm check`, Node22.23.2 | PASS: **220 unit**, **11 tarball**, lint/format/schemas/docs/types/build/site/budgets |
| Suite E2E completa, Chrome153 desktop + Pixel7 emulado, puerto42823 | **121 passed, 9 skipped**; skips explícitos, no fallos |
| Studio dentro de la suite, mismos proyectos | **15 passed, 3 skipped**; incluye geometría estructurada, marquee y resize |
| Framework tarball, Vite7.3.6 y Next15.5.25 | PASS: build, hydration, estilos, selección y editor commit/undo |
| Visual legacy, Chrome153, puerto42824 | **3 passed, 1 failed**: permanece diferencia conocida de seis píxeles en `docs-sequence-dark.png`; no se modificaron goldens |
| Checker del spec + tsc de contratos + `git diff --check` | PASS; checker no certifica cobertura funcional completa |

Logs locales: `/tmp/adl-continue-final-check.log`,
`/tmp/adl-continue-full-e2e.log`, `/tmp/adl-continue-frameworks.log`,
`/tmp/adl-continue-visual.log`. RED: `/tmp/adl-render-parity-red.log`,
`/tmp/adl-marquee-red.log`, `/tmp/adl-marquee-browser-red.log`,
`/tmp/adl-resize-red.log`. Evidencia visual de control de tamaño revisada:
`/tmp/adl-continue-resize-handle.png`. Los archivos `/tmp` son temporales.

Budgets actuales gzip: landing JS177067/179200, Studio JS136331/179200.
El paquete empaquetado mide692159bytes (191archivos); dist se regeneró mediante
build, no manualmente. Firefox/WebKit/browsers bundled siguen sin validación;
esta continuación no reintentó sus descargas ni sustituye esos gates.


## Implementación posterior a la aprobación del plan (2026-09-23)

Esta entrega sigue siendo parcial; no se cierran automáticamente E05–E24.

- Iconos de documentos desde assets TheSVG locales y 16 iconos Phosphor regular,
  generados con `pnpm icons:generate` y comprobados con `pnpm icons:check`.
  No React/DOM en renderer headless ni peticiones de iconos. Scoping compartido
  con BrandIcon, tema explícito, gutter de texto y notices inertes en SVG.
- Corrección de `includeSource`: se inserta metadata en el SVG raíz, no en el
  primer SVG de icono anidado. Bounds conservadores incluyen ambos extremos de
  etiquetas centradas y el desplazamiento por iconos; no son text shaping.
- Pinch de dos pointers, Space pan y rueda Ctrl/Meta anclada. La rueda normal
  vuelve al scroll nativo; comenzar pinch cancela el drag sin commit.
- API pública `EditorOutline`: botones nativos de nodos, relaciones y grupos,
  selección tipada sin dirty/history; integrada en Studio y ejemplo consumidor.
- Clipboard del sistema explícito, límite de 1MiB antes de parsear, validación,
  remapeo, denegación visible y rechazo si cambia revisión/documento durante la
  lectura. IdFactory reintenta hasta 32 veces y falla atómicamente al agotarse.
- Alineación de seis tipos y distribución horizontal/vertical con gaps iguales,
  extremos conservados, tamaños intactos y una transacción undoable. Selección
  bloqueada no se mueve parcialmente.

TDD observado: iconos (dos fallos válidos iniciales; otro fixture inicialmente
usó pnpm, que no pertenece a DiagramNodeVisual, y fue corregido), metadata SVG
anidada, bounds centrados/iconos, módulo de pinch ausente, dos E2E de navegación,
outline ausente, clipboard ausente, reintentos de ID y arrange unit/UI ausentes.
Las pruebas de expansión de matriz no se presentan como test-first.

### Verificación de esta entrega

- `pnpm check` Node22.23.2/pnpm10.29.3: **231 unitarios en 33 archivos, 11 tarball**,
  lint/formato/generados/tipos/build/docs/site/budgets aprobados. Headless soporta
  react-server; fuentes e iconos salen del paquete, no de aliases al source.
- El último build registra landing JS177149/179200 gzip y Studio156514/179200;
  paquete716315bytes packed,3275040unpacked,197archivos.
- Visual legacy Chrome153: **3 pass, 1 fail**, la misma diferencia de seis píxeles
  en docs-sequence-dark. No se cambiaron goldens.
- Reintento `playwright install chromium firefox webkit`: falló descargando
  Chromium1243 por timeouts de 10s. Firefox/WebKit y Chromium fijado siguen sin
  verificación; Chrome instalado es evidencia complementaria.
- Captura revisada: `/tmp/adl-implementation-studio-dark.png`, iconos y outline.
  No es un golden ni una certificación de paridad.

Logs RED locales: `/tmp/adl-icons-red.log`, `/tmp/adl-nested-source-red.log`,
`/tmp/adl-icon-bounds-red.log`, `/tmp/adl-pinch-red.log`, `/tmp/adl-touch-red.log`,
`/tmp/adl-outline-red.log`, `/tmp/adl-osclipboard-red.log`,
`/tmp/adl-id-retry-red.log`, `/tmp/adl-arrange-red.log`,
`/tmp/adl-arrange-browser-red.log`. No son evidencias inmutables de CI.

Sigue pendiente cerrar renderer/medición tipográfica, resize múltiple y touch avanzado,
inspectores/ports/waypoints, paste estructurado, configuración y selectors,
recuperación de persistencia, y todo el viewer/HTML/stories/calidad avanzada y
extensiones señalados en la tabla. `metadata:'all'` tampoco debe considerarse
terminado por disponer del campo en ExportOptions. No se han creado commits,
publicado paquetes ni declarado un candidato listo para release.

Resultados finales adicionales sobre el último build:

- E2E completo Chrome153 desktop + Pixel7 emulado: **133 passed, 11 skipped**;
  puerto42829, salida `/tmp/adl-implementation-final2-results`. Incluye nuevo
  clipboard (mock API y lectura stale), arrange, Space pan, pinch y outline.
- Consumidor tarball React18.3.1: **11 tests**, declaraciones NodeNext/Bundler
  aprobadas. No sustituye una matriz browser completa React18.
- Consumidores tarball Vite7.3.6/Next15.5.25: build, hydration, CSS, selección,
  edición y undo aprobados con el ejemplo que incluye EditorOutline.
- Checker del spec, tsc de sus contratos y `git diff --check`: aprobados.

Logs: `/tmp/adl-implementation-final2-check.log`,
`/tmp/adl-implementation-final2-e2e.log`, `/tmp/adl-implementation-react18.log`,
`/tmp/adl-implementation-final2-frameworks.log`, `/tmp/adl-implementation-visual.log`,
`/tmp/adl-browser-retry.log`. Todos son temporales locales.

## Continuación: mappings estructurados y ocho direcciones de resize

Se retoma el alcance del canvas; se descarta la solicitud ajena de shader/cilindro.

- E03: reemplazar bandas/carriles exige cobertura exhaustiva y disjunta de nodos
  en assignments/removeNodeIds; rechaza IDs desconocidos y eliminaciones duplicadas.
  Mantiene el original intacto y poda relaciones dependientes. Diez casos RED
  observados antes del fix; 16 escenarios de mappings pasan. Prueba adicional
  contra el tarball comprueba rechazo, commit, undo y redo. Ejemplo y diagnósticos
  documentados en la guía del editor.
- E06: ocho handles para un nodo libre desbloqueado, bordes y esquinas con
  anclaje opuesto, dimensiones limitadas, snap, teclado 1/16px, hit area 44px.
  Posición y tamaño se actualizan en la misma transacción. Once pruebas puras
  pasan tras RED por módulo ausente; browser RED mostró un handle en lugar de ocho.
  Browser GREEN incluye teclado, zoom, cancelación y ocultación por bloqueo.
  El test de bloqueo tuvo que reseleccionar el nodo tras Escape, que elimina
  la selección según el comportamiento existente; no se cambió ese comportamiento.
- No se declara resize múltiple, touch prolongado, matriz completa de gestos,
  cierre de E03/E06 ni de M1/M2.

Validación posterior con Node 22.23.2:
- pnpm check: **258 unitarias y 12 pruebas del tarball**; generación/build y
  presupuestos pasan. Studio JS: 157036 bytes gzip / 179200.
- React 18.3.1: **12 pruebas del tarball**, resolvers NodeNext/Bundler pasan.
- Vite 7.3.6 / Next 15.5.25: builds y navegador con Chrome instalado pasan,
  incluyendo hidratación, CSS, selección, edición y undo.
- Playwright completo disponible con Chrome 153 desktop/Pixel 7:
  **136 passed, 12 skipped**. Suite específica resize: **6 passed, 2 skipped**.
- Visual: **3 passed, 1 failed**, mismos **6 píxeles** en docs-sequence-dark;
  referencias sin actualizar. Sigue bloqueando el cierre visual.
- Chromium fijado de Playwright/Firefox/WebKit continúan sin validación por
  falta de los binarios; el primer intento frameworks sin channel también falló
  por ese motivo, y se repitió explícitamente con PLAYWRIGHT_CHANNEL=chrome.
- Lint/format tras el último cambio del test, verificador del spec, tsc del
  contrato y git diff --check pasan. Captura de ocho handles inspeccionada.

Logs temporales: /tmp/adl-structure-red.log,
 /tmp/adl-resize-directions-red.log, /tmp/adl-resize-browser-red.log,
 /tmp/adl-resize-browser-green2.log, /tmp/adl-continuation-check.log,
 /tmp/adl-continuation-react18.log, /tmp/adl-continuation-frameworks2.log,
 /tmp/adl-continuation-e2e2.log, /tmp/adl-continuation-visual.log.
Captura: /tmp/adl-eight-handles.png. No publicación ni commits.

## Continuación M1: renderer, gestos, clipboard estructurado y persistencia (2026-09-23)

Baseline commiteado (`feat(editor): baseline editable canvas foundation`), verificado
con Node 22.23.2 / pnpm 10.29.3. Los cambios de esta continuación están en 9 commits
convencionales (feat/perf/test/chore), sin publicar ni declarar release.

- E05: primitives del renderer alineados con el canvas legado: contenedores rx LANE_R con
  label mono uppercase + tracking, lifelines 2/6, edges con EDGE_STROKE_WIDTH y caps round,
  dashes 2/7, pills de edge/continuation con PILL_H/PILL_R, pills de decisión, header path
  de tablas ER, opacidades del estado final, muted hairline, barras de activación y kinds
  uppercase. Los labels de edge salen del grupo del path (z-order como el legado), por lo
  que el test E2E de Studio pasó a filtrar `[data-edge-label]`. Test de paridad nuevo
  `tests/editor-render-parity.unit.spec.ts` (11 casos, siete tipos + primitives de gap).
- E05 medición: `src/geometry/text.ts` con `TextMeasurer` pluggable y
  `createCanvasTextMeasurer()` (canvas 2D), usado por el editor y la exportación vía
  `ResolveContext.measureText`; el estimador conservador se mantiene como fallback y el
  overflow reporta con la medición real cuando hay DOM.
- E06: resize de selección múltiple (`resizeRects`/`rectsUnion` en `src/geometry/resize.ts`):
  un set de 8 handles sobre el rect de unión, escala proporcional con ancla opuesta fija,
  un commit por gesto, undo y cancelación; teclado 1/16px. El `onFocus` de los hit rects ya
  no reemplaza una selección múltiple existente. Gestos coalescidos con requestAnimationFrame
  (un preview por frame; el queue se vacía en pointerup antes de commit y se descarta sin
  gesto activo). Long-press táctil sin callouts del sistema (`-webkit-touch-callout`,
  `-webkit-user-select`) con E2E de selección sin drag ni commits.
- E07: selección visual de conexiones (hit rects por segmento, no paths de bbox cero) y
  edición de rutas: toggle manual/auto, waypoints arrastrables (gesto transaccional con
  cancel/undo) y anclas source/target reubicables (`anchorPoint`/`anchorFromPoint`
  exportados desde scene). Inspector `EditorRoute` con lista, añadir y quitar waypoints.
- E08: paste estructurado en `pasteFragment`: bandas por índice con clamp al target o
  mapping explícito `structured.band`; carriles por label con fallback a la primera lane o
  mapping explícito `structured.lane`, rechazo `lane.missing` sin carril válido. Sin
  placements/escena para tipos estructurados; zOrder siempre actualizado. `read()` del
  adapter distingue JSON corrupto (`storage.corrupt`) de acceso denegado.
- E10: `purge` en StorageAdapter (memoria y localStorage) para descartar copias corruptas;
  Studio con recuperación de borrador persistido (aviso "Restore draft" con confirmación),
  cuarentena de copias corruptas sin sobrescribirlas y «Guardar como» con slug sanitizado.

### Gates de esta continuación

| Ejecución | Resultado |
|---|---|
| `pnpm check` Node22.23.2 | PASS: **281 unit en 36 archivos, 12 tarball**, lint/formato/schemas/docs/tipos/build/site/budgets |
| E2E completo Chrome153 + Pixel7, puerto 42880 | **142 passed, 14 skipped**; sin fallos |
| Studio dentro de la suite | 19 tests: resize múltiple, waypoints/anchors, clipboard estructurado, persistencia (draft/cuarentena/save-as) |
| Visual legacy Chrome153, puerto 42878 | **4 passed** tras diagnosticar y revisar el golden darwin de docs-sequence-dark |
| Tarball Vite/Next y React18 | No re-ejecutados en esta continuación; el build del paquete pasó en `pnpm check` |

### Diagnóstico del diff visual de 6 píxeles

La diferencia en `docs-sequence-dark.png` se root-causeó antes de tocar referencias:
el golden se capturó el 2026-09-14 y la ruta de render del preview (canvas legado,
layouts, tema, página docs) está byte-idéntica desde el baseline. Los 13 píxeles que
superan el umbral de Playwright están en el anti-aliasing de un glifo de texto (filas
188-195, x 342-367): mismas formas, pesos AA distintos. Es drift de renderizado de
Chrome en macOS, no un bug de código. Se actualizó el golden darwin tras revisión;
los goldens Linux de CI con Chromium fijado no se modificaron y siguen siendo la
referencia autoritativa.

### Pendiente tras esta continuación

E09 (slots/configuración y selectores granulares), E11 (paridad visual certificada y
fallas de plataforma), E12 (cierre formal M1), E02/E03/E04 (matrices exhaustivas y
benchmarks), y todo E13–E24 según la tabla de estado. Firefox/WebKit/Chromium fijado
siguen sin binarios; Chrome instalado es evidencia complementaria. No se crearon
releases ni se publicó el paquete.

## Continuación: correcciones de revisión M1 (2026-09-23)

Respuesta al veredicto de revisión; sin cerrar M1.

- E08 lane mapping: el emparejamiento usaba la etiqueta del NODO, no la del carril
  de origen, y el fallback al primer carril podía cambiar el significado del diagrama.
  Ahora busca el carril de origen por id en el documento fuente y mapea por etiqueta,
  con fallback por índice del carril de origen y rechazo `lane.missing` si no hay
  coincidencia ni índice válido. Regresión nueva con destino cuyo primer carril NO es
  la coincidencia (Worker en Engineering → engineering, no sales) y caso de rechazo.
- E10 save-as: el ciclo se completó con `list()` en StorageAdapter (memoria y
  localStorage; entradas ilegibles se omiten) y una sección «Saved copies» en Studio
  que enumera las copias y permite abrirlas con confirmación, token y limpieza del aviso
  de borrador. `StoredEntry` y `list` son API pública documentada.
- E05/E11 medición: `resolveDocument` ahora también emite `quality.text-overflow`
  medido para tipos estructurados (sin alterar sus bounds de layout, que son
  autoritativos). La exportación registra las fuentes embebidas en un @font-face scoped
  (`createEmbeddedFontTextMeasurer`) y espera su carga antes de medir, de modo que la
  medición usa los mismos bytes incorporados al archivo y no las fuentes del host;
  el measurer se elimina tras resolver.
- Consumidores re-ejecutados con estos cambios: tarball React 18.3.1 (resolvers
  NodeNext/Bundler) y frameworks Vite 7.3.6 / Next 15.5.25, todos PASS.

Pendiente explícito de E07: inspectores específicos de tipos estructurados (ER fields,
sequence participants, swimlane lanes) y edición visual de puertos. E09 y E11 siguen
abiertos (selectores granulares, slots, fallas de plataforma). Los 14 skips de E2E
siguen siendo casos no aplicables (mobile/touch/pointer), separados de lo aprobado.
