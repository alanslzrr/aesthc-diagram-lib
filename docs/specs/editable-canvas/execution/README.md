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
| E02 | Implementada; N/N+1 en once límites, trust boundary (getters, ciclos, unsafe keys, hostiles) y JSON fidelity | Completar combinaciones del catálogo no cubiertas por `editor-validation`/`editor-limits` |
| E03 | Adapters, conversión y matriz CRUD/reorder de los siete tipos | Mapeos exhaustivos, poda de relaciones y `convertToGraph` con receipt de pérdidas implementados | Matriz de conversión E2E (T53.2) y combinaciones CRUD restantes |
| E04 | Store funcional; change sets granulares con endpoints en topología, `affected` por comando e invalidaciones layout/graph/style/views | Más interleavings y benchmark de 1000 nodos/memoria |
| E05 | Primitives/estilos alineados con el legado (rx, dashes, pills, tablas, estado, muted, kinds); medición pluggable con provider canvas en editor/export y fuentes embebidas en export; overflow medido también para tipos estructurados | Certificación visual con Chromium fijado y shaping de fuentes definitivo; matriz bundled completa |
| E06 | Superficie, marquee, resize de ocho direcciones y de selección múltiple, teclado, pinch, RAF por frame, scroll nativo/zoom modificado, touch prolongado y outline básico | Matriz completa de accesibilidad/gestos y benchmark de rendimiento |
| E07 | CRUD/conexiones/inspector básicos; selección visual de conexiones, rutas manuales (waypoints y anclas arrastrables, toggle auto/manual) e inspectores estructurados (ER fields, participantes, carriles y puertos con edición visual) | Aceptación completa: IME, reconexiones por teclado/touch, drop inválido y cancelaciones |
| E08 | Multiselección, grupos, clipboard del sistema, align/distribute y paste estructurado con mapping de bandas (clamp o explícito) y carriles (label→índice→rechazo, con regresión de primer carril no coincidente) | Ampliar matriz de plataforma y casos de geometría |
| E09 | Composición pública, ownership Strict Mode, outline integrado, tema/locale y selectores granulares (`useEditorSelector` con caché por store/select y bail-out por igualdad) | Slots/configuración avanzada de componentes |
| E10 | Persistencia/auto-save/conflictos, recuperación de borradores, cuarentena de corruptos sin sobrescribir, save-as y reapertura de copias guardadas (list + open) | Escenarios de fallos de almacenamiento ampliados |
| E11 | API estática/raster funcional; fallos de fuentes (inválidas/required/fallback con familias aisladas), escalas/píxeles, publish por overflow y scope de selección | Paridad visual certificada y fallas de raster en navegador |
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

## Trazabilidad remapeada (2026-09-24)

Los 71 archivos propuestos de los catálogos eran destinos de implementación; 56 de ellos no existen
porque la cobertura real vive en otros archivos. Se remapeó `traceability.json` (status `mapped`):
cada uno de los 112 escenarios tiene ahora `coverage` (`implemented`/`partial`/`missing`),
`implementedIn` (archivo real verificado en disco) y `result` (evidencia observada). `file` sigue
siendo el destino propuesto del spec. `verify-spec.mjs` valida el remapeo y regenera los catálogos.

Resumen por estado: **50 implementados, 24 parciales, 38 sin cobertura localizada** (2026-09-24,
`node docs/specs/editable-canvas/verify-spec.mjs` PASS). Los 38 `missing` y los detalles de los
24 `partial` están enumerados por escenario en `test-catalog.md`.

Gaps reales de M1 identificados por el remapeo (escenarios sin cobertura localizada o parciales):

- **E02/E03/E04:** T03.2 (loss report legacy vs serialize), T04.1/T05.2/T31.2 parciales,
  T53.2 (conversión E2E), interleavings y benchmark.
- **E05/E06:** T07.2 (CSS scale/DPR), T15.2 (relayout preview), T08.1 middle pan, T09.1 discriminación de IDs.
- **E07/E08/E09:** T16.1 IME, T17.2 teclado/touch, T20.x ungroup/group-move, T21.x presentation
  tokens y dos canvas, T22.2 (store controlado por host).
- **E10/E11:** T26.1 QuotaExceeded/descarga, T28.2 reparseo XML, T29.2/T36.1 fallas de raster en browser.
- **E19:** T44.2 (zoom 200%, secuestro de atajos), T45.x matriz 360/768/1440, T46.1 benchmark 1000 nodos.
- **M2/M3:** todo E13–E18, E22, E23 y E24 (excepto queries, budgets, release, docs y tarball ya cubiertos).

No se declara M1 cerrado: el remapeo enlaza escenarios con evidencia, pero los `partial`/`missing`
anteriores siguen siendo trabajo pendiente real.

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

## Continuación: inspectores, selectores, export y matrices (2026-09-23)

Respuesta al segundo veredicto; M1 sigue abierto.

- E07: `EditorStructuredInspector` por tipo — campos ER (nombre/tipo/clave pk-fk-unique, añadir/quitar),
  participantes de sequence (añadir/quitar con poda de referencias), carriles de swimlane
  (reasignar nodo, añadir carril, quitar carril con reassignment explícito al primer carril
  restante vía `lanes.replace` exhaustivo) y puertos de graph (lado/dirección, añadir/quitar).
  Edición visual de puertos: handles en el canvas sobre la posición del anchor, drag
  transaccional que recalcula side/offset con `anchorFromPoint` (cancel/undo incluidos).
  El ejemplo de Studio expone puertos (inbound/outbound en Order API). E2E cubre inspector
  y drag de puertos + campos ER vía import de fixture (`tests/fixtures/editor/er-document.json`).
- E09: `useEditorSelector` con igualdad (Object.is o `shallowEqual`) basado en
  useState+useEffect (patrón zustand; el patrón useSyncExternalStore con getSnapshot
  custom provocaba un loop de re-render #185 en React 19 y se descartó). Toolbar, Inspector,
  JsonPanel, Outline, Route y StructuredInspector consumen slices estables
  (selection/document), de modo que pan/zoom ya no los re-renderiza.
- E11: pruebas de fallos de export añadidas: fuentes embebidas inválidas (`export.font-invalid`),
  política required sin fuentes (`export.font-missing`), fallback con warning, escalas no
  seguras (`export.scale`) y límites de píxeles (`export.pixels`), publish bloqueado por
  overflow medido (`export.quality`), scope de selección con receipt `canonical:false`.
- E03: matriz CRUD/reorder de los siete tipos en `tests/editor-adapters.unit.spec.ts`
  (insert/replace/reorder/remove con inputs estructurados correctos por tipo).
- E04: change sets granulares en el store — `affected` solo para entidades tocadas y
  `invalidates` por comando (layout/graph/style/views), con detección de cambio de topología
  para `graph` y conservadurismo total para undo/redo/replaceDocument. Bug corregido: el
  change set se calculaba tras `notify`, comparando el documento nuevo contra sí mismo.

Gates: `pnpm check` PASS (301 unit, 12 tarball); E2E completo 144 passed/14 skipped.
Pendiente M1: matriz de accesibilidad E06, casos de plataforma E08/E10, cierre de
aceptación E12, Chromium fijado/Firefox/WebKit, benchmark 1000 nodos y revisión de
trazabilidad requisito→prueba→resultado.

## Correcciones del tercer veredicto (2026-09-24)

- E04 change sets: la topología ahora incluye endpoints (`id:from->to`), de modo que
  reconectar un edge conservando su ID invalida `graph` (regresión añadida). Undo/redo
  y replaceDocument invalidan las cuatro áreas incluida `layout`. `affected` deja de ser
  vacío para spec.replace/grupos: diff de contenido de nodos, endpoints/label/variant de
  edges y refs de grupo, con fallback conservador a todos los nodos.
- E09 selector: `useEditorSelector` ahora deriva el slice en render con caché por
  (store, select) y notificación con bail-out por igualdad — recalcula al cambiar el
  store del proveedor, al cambiar la función select y reconcilia el hueco
  render→suscripción. Verificado en StrictMode (Vite/Next) y React 18/19.
- E07 bloqueos: `spec.replace` rechaza mutaciones de nodos bloqueados (`entity.locked`)
  comparando el contenido del nodo antes/después. Los handles de puertos se ocultan para
  nodos bloqueados y la sección de puertos aparece para todo nodo graph, incluso sin
  puertos previos (flujo para añadir el primero).
- E11 fuentes: nombres de familia únicos por exportación (`adl-export-<nonce>-sans|mono`)
  para no interferir con el host ni exportaciones simultáneas; `ready()` resuelve true
  solo si ambas caras cargaron; con política `required` un fallo de carga falla la
  exportación y con `fallback` se emite el warning y se mide con las fuentes del host.

Gates tras las correcciones: `pnpm check` PASS (304 unit, 12 tarball), frameworks
Vite/Next (incluye StrictMode) PASS, tarball React 18 PASS (12), E2E completo
144 passed / 14 skipped.

## Continuación M1: trazabilidad remapeada, E09 y benchmark (2026-09-24)

Sin cerrar M1. Responde al paso concreto de remapear la trazabilidad antes de declarar M1.

- **Trazabilidad**: `traceability.json` pasa de `proposed-not-implemented` a `mapped`. Los 56
  archivos propuestos inexistentes no eran 56 funcionalidades faltantes: cada uno de los 112
  escenarios ahora declara `coverage` (`implemented`/`partial`/`missing`), `implementedIn`
  (archivo real verificado en disco) y `result` (evidencia observada). `verify-spec.mjs` valida
  el remapeo y regenera los catálogos. Resumen: **51 implementados, 24 parciales, 37 sin
  cobertura localizada**. Los gaps reales quedan enumerados por escenario en `test-catalog.md`
  y en la sección de trazabilidad de este informe.
- **E09**: `EditorStatus` exportado como componente standalone (completa la composición
  Root/Surface/Toolbar/Inspector/Outline/Status de 03-architecture) y reutilizado por el
  toolbar. `tests/editor-presentation.unit.spec.ts` (archivo propuesto ahora real) cubre
  validación estricta de `textScale` 0.75–1.5, `grid.size` 4–64 y `padding` 0–256, geometría
  que respeta el scale y aislamiento de paletas entre documentos (render y export usan el
  tema del documento, no uno global). T21.1 pasa a implementado.
- **E09/E11 perf**: `tests/editor-performance.unit.spec.ts` con dataset determinista fijo
  100/200 y 1000/2000 (5 warmups + 30 muestras, p95). Node22: validate 1.6/15.9ms, resolve
  3.1/104ms, commit 2.9/26.9ms, bfs 0.07/5.2ms, export 5/122ms — todos por debajo de los
  targets de 06-tdd. `tests/e2e/editor-performance.e2e.ts` mide drag en browser sobre 1000
  nodos (Chrome153 macOS, evidencia complementaria): pointer-gap p95 **51.6ms**, 0 long
  frames >100ms; el target de 33.3ms queda para el runner de referencia con Chromium fijado.
  El frame de drag no cierra T46.1, pero la evidencia local queda registrada y el harness
  no cambia el dataset para pasar.

### Gates de esta continuación

| Ejecución | Resultado |
|---|---|
| `pnpm check`, Node22.23.2/pnpm10.29.3 | PASS: **311 unit en 38 archivos, 12 tarball**, lint/formato/iconos/schemas/docs/tipos/build/site/budgets |
| E2E completo Chrome153 + Pixel7, puerto 42816 | **146 passed, 14 skipped** (incluye benchmark de drag 1000 nodos en desktop; móvil lo salta) |
| Visual legacy | No re-ejecutado en esta continuación; el diff de 6 píxeles quedó resuelto en la sesión anterior |
| `node docs/specs/editable-canvas/verify-spec.mjs` | PASS: cobertura mapeada 51/24/37, `git diff --check` limpio |
| Perf unit | 2/2 PASS con p95 registrados; drag browser 1/1 PASS (p95 51.6ms, 0 long frames) |

Budgets gzip: studio 163988/179200, landing 176669/179200, docs 105173/179200; paquete
738837 packed / 199 archivos. Logs: `/tmp/adl-check-final2.log`, `/tmp/adl-m1-e2e-results`,
`/tmp/adl-perf-results`, `/tmp/adl-perf2-results`. Siguen pendientes los binarios
Firefox/WebKit/Chromium fijado, el frame target del runner de referencia y todos los `partial`
y `missing` enumerados en la sección de trazabilidad. Reintento `playwright install` en esta
continuación: BLOCKED de nuevo descargando Chrome for Testing153 (chromium v1243) por timeout
de red (`/tmp/adl-browser-retry2.log`); Chrome instalado sigue siendo evidencia complementaria.

## Continuación M1: cierre de escenarios parciales y perf corregido (2026-09-24)

Implementación end-to-end de los bloques de cierre M1 aprobados (handles, features, segunda
instancia y frame p95 con gate de referencia). Sin commits ni publicación.

- **T03.2**: `exportLegacySpec(document)` nuevo en editor-core: devuelve el spec legado con los
  IDs conservados y un receipt de pérdidas exacto (`/scene/*`, `/presentation`, `/metadata`,
  `/views`, `/story`, `/extensions`, `/revision`, `/locale` solo cuando hay contenido no
  transferible); graph se rechaza con `conversion.unsupported`. `serializeDocument` sigue siendo
  el round-trip sin pérdidas.
- **T15.2**: `relayoutScene(document)` recomputa posiciones desde el seed conservando nodos
  locked/grupos; UI «Re-layout» en el toolbar con preview transaccional, Apply en un commit
  undoable y Cancel sin cambios.
- **T17.2**: connection handles en canvas para tipos con `connect`: handle en el nodo
  seleccionado, drag→release sobre un destino crea una relación en un commit undoable, drop en
  fondo cancela sin cambios, y modo teclado (Enter en el handle → Enter en el destino, Escape
  cancela). `export.image` ahora se distingue de `export.raster` en la exportación raster.
- **T20.2**: `group.remove` (keep) rechaza si el grupo o cualquier miembro descendiente está
  locked; tras unlock mantiene coords/IDs y undo exacto.
- **T22.2**: `store.setPermissions(next)` para permiso de edición en runtime; el ejemplo
  frameworks añade una segunda instancia controlada por el host (temas opuestos, `replaceDocument`
  externo con history reset) que cubre T13.2, T21.2 y T22.2 en Vite/Next + StrictMode.
- **T46.1 corregido**: el p95 de 51,6 ms anterior era el **intervalo entre `pointermove`**, no el
  tiempo entre frames. El harness ahora mide el **p95 de deltas de `requestAnimationFrame`**
  durante un drag sostenido de 1000 nodos: **frame p95 366,7 ms con 63 long frames >100 ms**
  (Chrome153 macOS). La aserción de **33,3 ms queda separada y solo se activa en el runner de
  referencia** (CI con Chromium del lockfile o `PERF_REFERENCE=1`); local reporta con un techo de
  regresión documentado. El per-frame `resolveDocument`+`validateDocument` del escena de 1000
  nodos supera el target en todas las plataformas medidas: **T46.1 sigue parcial** y exige la
  optimización E19 (worker/incremental) antes de cerrar. El benchmark de algoritmos (unit) sigue
  separado y cumple los targets (validate 15,9 / resolve 104 / commit 26,9 / bfs 5,2 / export 122 ms
  a 1000 nodos, mediana de p95 para amortiguar ruido de workers).
- **E2E nuevos**: `editor-export-failures` (reparseo XML, fallos de raster y disclosure),
  `editor-viewport` (DPR 2, CSS scale, middle-pan, discriminación de IDs), `editor-connections`,
  `editor-accessibility` (atajos y zoom 200 %) y `editor-design` (matriz 360/768/1440 × en/es).
  `editor-performance` mide frames. Cierres unit en document/validation/store/persistence/export.

### Gates de esta continuación

| Ejecución | Resultado |
|---|---|
| `pnpm check`, Node22.23.2/pnpm10.29.3 | PASS: **331 unit en 38 archivos, 13 tarball**, lint/formato/iconos/schemas/docs/tipos/build/site/budgets (studio 165221/179200) |
| E2E completo Chrome153 + Pixel7, puerto 42876 | **179 passed, 21 skipped** (0 fallos) |
| Frameworks Vite 7.3.6 / Next 15.5.25 (tarball) | PASS: dos instancias aisladas, temas opuestos, permisos runtime, replace externo con history reset |
| Tarball React (NodeNext/Bundler) | 13 tests PASS, incluido el entry `@aesthc/diagram-lib/editor` y `exportLegacySpec`/`relayoutScene`/`setPermissions` |
| Perf frame p95 (Chrome153 macOS) | 366,7 ms reportado; gate 33,3 ms aserrado solo en runner de referencia |
| `verify-spec.mjs` | PASS: **75 implementados, 5 parciales, 32 sin cobertura localizada** |

Pendientes anteriores a M2 (por hito, sin moverlos implícitamente): **T16.1 (E07, M1) parcial** — la
composición IME no está verificada end-to-end; **T53.2 (E03, M0) sin cobertura** — la API
`convertToGraph` no sustituye el flujo de usuario en Studio; **T55.2 (E02, M0) sin cobertura** —
seguridad transversal con dependencia funcional del HTML export (E16). Los parciales de M2 son
T31.2/T36.1/T44.1/T46.1, y los 31 `missing` restantes son M2/M3. Los totales de cobertura
(75/5/32) son correctos; la clasificación por hito anterior a este párrafo no lo era.

## Continuación M1: IME, conversión, seguridad y rendimiento (2026-09-24)

Sin commits ni publicación. Orden: corregir estado → IME/conversión → seguridad → rendimiento → parciales.

- **Estado corregido**: los pendientes anteriores a M2 eran T16.1 (M1, parcial), T53.2 (M0, sin
  cobertura) y T55.2 (M0, sin cobertura); el párrafo anterior los había clasificado mal.
- **T16.1 cerrado**: `tests/e2e/editor-crud.e2e.ts` — composición IME (CDP `imeSetComposition` +
  `insertText`) sin commits intermedios en label y JSON, confirmación única, composición sin
  confirmar que no persiste nada, texto literal sin ejecutar markup y borrador sin commit.
- **T53.2 cerrado**: acción «Convert to graph» en Studio con explicación de pérdidas y
  confirmación; cancel conserva documento/borrador/copia guardada; accept abre un documento nuevo
  (history reset, token nuevo) y la copia original se puede recargar intacta.
- **T55.2 parcial→parcial con evidencia**: almacenamiento forjado en cuarentena sin ejecución ni
  fuga de token, imports hostiles literales y `url.scheme` rechazado antes de layout, sin logs
  privados. Queda registrada la dependencia funcional del HTML export (CSP/offline, E16) — el
  escenario NO se declara terminado.
- **Rendimiento (T46.1 sigue parcial, con optimizaciones reales)**: perfilado por fase del frame
  de drag 1000 nodos (Chrome153 macOS):
  - preview del store: 28 ms → **3 ms** (`previewGesture` con `skipValidation` para comandos de
    escena del propio editor; el commit final valida completo; se eliminó el `inspectData` del
    camino de preview confiado).
  - resolución geométrica: 187 ms → **111 ms** (caché LRU de medición tipográfica en el
    measurer canvas, acotada y compartida solo entre resolves del editor; el export usa su
    measurer embebido y no se contamina).
  - `EditorJsonPanel` ya no serializa el documento (2 MB) por frame durante gestos.
  - markup por frame: 836 KB → **~10 KB** (render incremental `only`/`exclude` por entidad con
    baseline memoizado por gesto).
  - diagnóstico O(N²) de solapes fuera del camino de preview (`skipDiagnostics`; bounds y
    geometría intactos; publish conserva los diagnósticos).
  - Desglose residual por frame: preview 3 + resolve 111 + markup <2 = ~115 ms JS; el resto
    (~300 ms) es commit React/paint del SVG. El frame p95 local se mantiene ~420 ms: **el
    target de 33,3 ms exige el resolver incremental de E19** (reusar geometría no afectada +
    reducir el árbol React), trabajo documentado y pendiente. No se subió el umbral ni se redujo
    el dataset; el gate de referencia (CI/`PERF_REFERENCE=1`) sigue asertando 33,3 ms.
- **Parciales M2 cerrados**: T31.2 (maxHops/truncamiento/grupos), T36.1 (node-overlap,
  edge-through-node, label-collision, edge-endpoint con supportedFixes y publish bloqueado),
  T44.1 (flujo completo solo-teclado crear→editar→mover→conectar→borrar→undo→guardar→exportar;
  el test detectó y fijó un bug real: el foco de un nodo seleccionaba una referencia edge tras
  el refactor de memo).

### Gates de esta continuación

| Ejecución | Resultado |
|---|---|
| `pnpm check`, Node22.23.2/pnpm10.29.3 | PASS: **335 unit en 38 archivos, 13 tarball**, todos los gates; studio 167787/179200 |
| E2E completo Chrome153 + Pixel7, puerto 42918 | **197 passed, 21 skipped** (0 fallos) |
| Perf unit (mediana de p95, 1000 nodos) | validate 15,9 / resolve 104 / commit 26,9 / bfs 5,2 / export 122 ms — targets cumplidos |
| Perf frame (Chrome153 macOS) | desglose 3+111+<2 ms JS; frame p95 ~420 ms; gate 33,3 ms en runner de referencia |
| `verify-spec.mjs` | PASS: **80 implementados, 2 parciales (T46.1, T55.2), 30 missing (M2/M3)** |

Los 30 `missing` restantes son M2 (E13–E21) y M3 (E22–E24). T55.2 y T46.1 quedan parciales con su
dependencia y su gate registrados; no se declaran cerrados.

## Correcciones de integridad y benchmark corregido (2026-09-24)

Respuesta al veredicto de auditoría (3 problemas de integridad + 2 limitaciones del benchmark).

- **Preview inválido (alta)**: `previewGesture(..., { skipValidation: true })` ya no publica
  deltas inválidos. `candidate` valida siempre los deltas (`validateCommandDeltas`): valores
  finitos en `nodes.move`/`node.resize`/`scene.set`/rutas manuales, `layout.range` para tamaños
  no positivos, `limit.route-points`, y `validateEditorSpec` para `spec.replace`. Un rechazo
  conserva el último preview válido (el draft no se notifica). Regresiones: NaN rechazado con
  `data.finite` y preview anterior intacto; rutas sobredimensionadas y specs rotos rechazados.
- **Eliminación de bloqueados (alta)**: `spec.replace` comprueba ahora los IDs anteriores y los
  resultantes; un nodo bloqueado (o miembro de grupo bloqueado) no puede eliminarse, ni siquiera
  con `references: 'prune-references'`. Regresión con lock directo y lock heredado de grupo.
- **Baseline obsoleto (media)**: la caché del baseline del render incluye la revisión del
  documento en su clave y se limpia al terminar el gesto; contenido modificado entre gestos
  (rename de otro nodo, tema) ya no reutiliza markup anterior. Regresión E2E: drag → rename →
  drag con el nuevo label visible durante el preview.
- **Benchmark corregido (media)**: el commit alterna posiciones (`(x+1) % 16`) y exige
  `committed` — ya no mide no-ops; el export espera cada `exportDocument` y verifica el
  artefacto. La corrección destapó dos realidades: el export de 1000 nodos fallaba siempre con
  `export.pixels` (el seed de layoutFlowchart producía bounds de 4352×27208; el dataset del
  benchmark ahora usa la cuadrícula determinista 180×80, bounds ~7300×2100) y el commit real
  superaba 50 ms por tres serializaciones de 2 MB por operación. Se añadió caché de contenido y
  bytes por identidad de documento (WeakMap) en el store. **Cifras comparables corregidas**
  (mediana de p95, 1000 nodos): validate 15,7 ms, resolve 108,3 ms, **commit 48,2 ms (≤50)**,
  bfs 5,7 ms, **export 272,6 ms (≤3000)** — todas las medidas son operaciones reales y
  completas.

### Gates de esta corrección

| Ejecución | Resultado |
|---|---|
| `pnpm check`, Node22.23.2/pnpm10.29.3 | PASS: **338 unit en 38 archivos, 13 tarball**, todos los gates |
| E2E completo Chrome153 + Pixel7, puerto 42922 | **198 passed, 22 skipped** (incluye la regresión de baseline) |
| Frameworks Vite 7.3.6 / Next 15.5.25 | PASS |
| Visual legacy | 4/4 PASS |
| `verify-spec.mjs` | 80 implementados / 2 parciales (T46.1, T55.2) / 30 missing |

Pendiente tras el veredicto, sin cambios de estado: T46.1 requiere el resolver incremental y la
reducción del trabajo React/SVG (frame local ~420 ms vs 33,3 ms de referencia); los tests IME
usan CDP sin alternativa Firefox/WebKit (portabilidad pendiente junto a la descarga de binarios);
T55.2 sigue parcial y visible hasta E16 (CSP/offline).

## Corrección del fallo de CI por rendimiento del commit (2026-09-24)

El CI fallaba en el benchmark unit (`pnpm check`): commit p95 de 27,15 ms (100 nodos, ≤16) y
118,70 ms (1000 nodos, ≤50). Dos causas, corregidas sin subir umbrales ni omitir pruebas:

1. **Coste real del commit** (validación completa + serializaciones por operación):
   - Camino scene-only en `candidate`: `nodes.move`/`node.resize`/`nodes.set-lock` clonan solo la
     escena (los demás campos quedan compartidos y congelados), validan los deltas con rangos
     exactos y no revalidan el documento completo; `scene.set`/`route.set`/operaciones de grupos
     siguen validando la escena estructural. `validateScene` extraída de `validateDocument`.
   - Noop y dirty estructurales: `commandsMatchScene` (solo entidades tocadas) y
     `sceneEquals` contra `savedScene` — sin serializar 2 MB por operación.
   - **Causa dominante**: `trim()` serializaba con `JSON.stringify` toda la historia por cada
     commit. Ahora la contabilidad de bytes del historial es incremental (arrays de tamaños
     alineados con past/future, suma por push/pop/shift y `currentBytes` actualizado por deltas
     de escena), y `invalidationsFor` compara topología con Maps en O(N).
   - Resultado (gate aislado): commit 100 nodos **0,19 ms**, 1000 nodos **1,40 ms** (antes 27/118
     en CI) con margen holgado sobre 16/50 ms incluso en runner lento.
2. **Contención de workers**: el benchmark se ejecutaba dentro de la suite paralela. Ahora
   `vitest.config.ts` excluye `editor-performance.unit.spec.ts` de la suite y `pnpm check`
   ejecuta `pnpm test:perf` como gate aislado en su propio proceso (`vitest.perf.config.ts`,
   un worker, sin paralelismo de archivos). CI corre `pnpm check`, así que la medición es la del
   mismo runner sin contención de la suite.

Cifras del gate aislado (mediana de p95, operaciones reales y completas): 100 nodos — validate
2,2 / resolve 4,6 / commit 0,2 / bfs 0,2 / export 9,6 ms; 1000 nodos — validate 21,7 / resolve
154,5 / commit 1,4 / bfs 7,6 / export 389,2 ms. Todas dentro de presupuesto.

**Bloqueo previsto restante (no ocultado)**: CI también exige 33,3 ms por frame en el drag de
1000 nodos (`editor-performance.e2e.ts` aserta el presupuesto de referencia cuando corre sin
`PLAYWRIGHT_CHANNEL`, como en CI). El frame local medido (~420 ms, desglose JS ~115 ms + commit
React/paint del SVG) sigue lejos; requiere el renderer incremental (T46.1). El commit unit ya no
bloquea; el gate de frames seguirá rojo en CI hasta que ese trabajo aterrice.

### Gates de esta corrección

| Ejecución | Resultado |
|---|---|
| `pnpm check` (incluye `test:perf` aislado), Node22.23.2 | PASS: 336 unit + 13 tarball + perf 2/2, todos los gates |
| E2E completo Chrome153 + Pixel7, puerto 42925 | **198 passed, 22 skipped** |
| Frameworks Vite 7.3.6 / Next 15.5.25 | PASS |
| Visual legacy | 4/4 PASS |
| `verify-spec.mjs` | 80 implementados / 2 parciales (T46.1, T55.2) / 30 missing |

## PR #24 — follow-up profiling and transaction integrity (2026-09-25)

The preceding frame-cost attribution was a hypothesis, not a CPU profile. A CDP CPU/trace
capture located the dominant cost in geometric quality checks invoked by the geometry
inspector on every preview. Paint was not the dominant phase in this capture.

- Geometry, relations and selection tools now subscribe to committed document/selection
  slices; geometry materialization is memoized and does not compute unused diagnostics.
- Immutable seed layouts are reused, routing lookups are indexed, and the static SVG
  markup subtree is memoized. Export/publish diagnostics remain enabled.
- The supplied scene-only transaction optimization needed additional integrity fixes:
  committed coordinate ranges, non-scene dirty state, structural validation, route-key
  counts, bounded history trimming, and undo/redo byte alignment. Two new regressions
  were observed RED and then GREEN; scene-resolution isolation also has a regression.
- Same 1000-node/2000-edge browser dataset, Chrome153 macOS with `PERF_REFERENCE=1`:
  **16.8 ms frame p95**, against the unchanged **33.3 ms** assertion. This is local evidence,
  not certification of the GitHub runner or completion of every E19 acceptance scenario.

The isolated `test:perf` remains part of `pnpm check`. No budgets, datasets or required CI
steps were weakened. Remote verification of the resulting commit remains required.

A pooled strict-browser run subsequently exposed borderline frames (33.4 ms). The frame
benchmark now has a mandatory `performance` project that depends on all five functional
projects and uses one worker. `pnpm test:e2e` still runs it, with the same 33.3 ms assertion.
Static hit targets are memoized separately from gesture targets; already materialized
manual scenes no longer submit a redundant `scene.set` on every move. Placement updates
copy only touched records while retaining structural validation. Three consecutive local
strict repetitions passed after these changes; final CI remains the acceptance evidence.
