# Catálogo trazable de aceptación y pruebas

Generado desde `traceability.json` por `node docs/specs/editable-canvas/verify-spec.mjs --write-catalog`. Escenarios previstos, no tests ya ejecutados. Cada R tiene tarea, criterio verificable y dos casos Given/When/Then. Los nombres de archivos son destinos de implementación.

## R01 — Envelope versionado y normalización

**Tarea:** [E01](task-catalog.md#e01) · **Hito:** M0.

**Aceptación:** Documento v1 canónico, input inmutable y defaults deterministas.

### T01.1 · unit

**Archivo:** `tests/editor-document.unit.spec.ts`.

- **Given:** legacy-specs con los siete tipos.
- **When:** createDocument con id y locale fijos.
- **Then:** format/schema/revision correctos, arrays/spec intactos salvo IDs materializados.

### T01.2 · unit

**Archivo:** `tests/editor-document.unit.spec.ts`.

- **Given:** documento v1 y schemaVersion=999.
- **When:** importDocument sobre ambos.
- **Then:** v1 round-trip; 999 version.unsupported sin fallback.

## R02 — Identidad estable de relaciones

**Tarea:** [E01](task-catalog.md#e01) · **Hito:** M0.

**Aceptación:** No colisiones ni reasignación por move/reconnect/reorder.

### T02.1 · unit

**Archivo:** `tests/editor-document.unit.spec.ts`.

- **Given:** dos anónimas a→b y un ID explícito a::b.
- **When:** normalizar y reordenar después.
- **Then:** tres IDs únicos, explícito conservado, materiales estables después del reorder.

### T02.2 · unit

**Archivo:** `tests/editor-commands.unit.spec.ts`.

- **Given:** parallel edges y un reconnect.
- **When:** aplicar reconnect y undo.
- **Then:** mismo ID, mismo orden restante, referencias exactas restauradas.

## R03 — Migración de entrada y locale

**Tarea:** [E01](task-catalog.md#e01) · **Hito:** M0.

**Aceptación:** Legacy band explícitamente habilitado; localized selecciona idioma sin inventar traducción.

### T03.1 · unit

**Archivo:** `tests/editor-document.unit.spec.ts`.

- **Given:** band sin type y localized en/es.
- **When:** importar con/ sin allowLegacyBand y locale.
- **Then:** aceptación solo opt-in; locale elegido y receipt de variante omitida.

### T03.2 · unit

**Archivo:** `tests/editor-document.unit.spec.ts`.

- **Given:** Documento con metadata/view/scene.
- **When:** export spec legado versus serializeDocument.
- **Then:** spec loss report; documento conserva todos los campos.

## R04 — Validación de referencias

**Tarea:** [E02](task-catalog.md#e02) · **Hito:** M0.

**Aceptación:** Schema strict y semántica bloquean todos los dangling IDs.

### T04.1 · unit

**Archivo:** `tests/editor-validation.unit.spec.ts`.

- **Given:** duplicados, missing node/port/lane/group/view y unknown property.
- **When:** validateDocument.
- **Then:** error code/path/subject estable, nunca se llama layout.

### T04.2 · unit

**Archivo:** `tests/editor-validation.unit.spec.ts`.

- **Given:** JSON con __proto__, accessor con counter y objeto cíclico.
- **When:** importDocument.
- **Then:** rechazo, counter=0 y Object.prototype sin contaminación.

## R05 — Políticas acotadas de recursos

**Tarea:** [E02](task-catalog.md#e02) · **Hito:** M0.

**Aceptación:** Límites previenen explosión de memoria/CPU sin truncar.

### T05.1 · unit

**Archivo:** `tests/editor-limits.unit.spec.ts`.

- **Given:** N y N+1 de cada límite de 04-contracts.
- **When:** validar fixtures generadas.
- **Then:** acepta N estructuralmente válido, rechaza N+1 con code/path específico.

### T05.2 · unit

**Archivo:** `tests/editor-limits.unit.spec.ts`.

- **Given:** profundidad 65, NaN, Infinity, surrogate roto.
- **When:** importar objeto o texto por su frontera.
- **Then:** fallo antes de schema/layout, no stack overflow.

## R06 — Adapters por tipo y capabilities

**Tarea:** [E03](task-catalog.md#e03) · **Hito:** M0.

**Aceptación:** Ocho tipos editables conservando sus invariantes propias.

### T06.1 · unit

**Archivo:** `tests/editor-adapters.unit.spec.ts`.

- **Given:** cada tipo y su CRUD/reorder permitido.
- **When:** insertar/reemplazar/borrar/reordenar.
- **Then:** spec resultante valida y no pierde campos específicos.

### T06.2 · unit

**Archivo:** `tests/editor-adapters.unit.spec.ts`.

- **Given:** timeline edge, sequence XY, lane inexistente.
- **When:** comandos no soportados.
- **Then:** capability.unsupported/reference sin ninguna mutación.

## R07 — Viewport matemático correcto

**Tarea:** [E06](task-catalog.md#e06) · **Hito:** M1.

**Aceptación:** Conversión inversa y zoom mantienen el anchor.

### T07.1 · unit

**Archivo:** `tests/editor-viewport.unit.spec.ts`.

- **Given:** viewport-cases.json.
- **When:** screenToWorld, worldToScreen, zoomAt y fit.
- **Then:** resultados numéricos exactos; round-trip con epsilon 1e-8.

### T07.2 · e2e

**Archivo:** `tests/e2e/editor-viewport.e2e.ts`.

- **Given:** canvas con CSS scale/offset, letterbox, scroll y DPR 1/2.
- **When:** drag del mismo nodo a mismo punto mundo.
- **Then:** posición igual ±1 unidad y sin doble aplicación de transform.

## R08 — Pan/pinch y scroll contenido

**Tarea:** [E06](task-catalog.md#e06) · **Hito:** M1.

**Aceptación:** Navegación no cambia documento ni secuestra página.

### T08.1 · e2e

**Archivo:** `tests/e2e/editor-viewport.e2e.ts`.

- **Given:** surface enfocada y rueda dentro/fuera.
- **When:** wheel normal, modificada, middle pan, Space pan.
- **Then:** scroll nativo salvo gesto explícito; hash documento unchanged.

### T08.2 · e2e

**Archivo:** `tests/e2e/editor-touch.e2e.ts`.

- **Given:** dos dedos, panel y canvas estrecho.
- **When:** pinch/pan y scroll del inspector.
- **Then:** zoom bounded; panel scroll y cancel correctos; cero commits.

## R09 — Gestos y multiselección

**Tarea:** [E06](task-catalog.md#e06) · **Hito:** M1.

**Aceptación:** Selección tipada, capture seguro y transacción única.

### T09.1 · e2e

**Archivo:** `tests/e2e/editor-selection.e2e.ts`.

- **Given:** nodes con IDs iguales a un edge ID.
- **When:** click/Shift/marquee sobre bounds.
- **Then:** refs discriminadas y marquee no añade edges automáticamente.

### T09.2 · e2e

**Archivo:** `tests/e2e/editor-gestures.e2e.ts`.

- **Given:** drag en curso.
- **When:** Escape, pointercancel, lost capture, pointerup fuera, unmount.
- **Then:** cancel no history; pointerup capturado un solo commit; no listeners residuales.

## R10 — Transacción atómica y permisos

**Tarea:** [E04](task-catalog.md#e04) · **Hito:** M0.

**Aceptación:** Ningún estado intermedio se publica ante rechazo.

### T10.1 · unit

**Archivo:** `tests/editor-commands.unit.spec.ts`.

- **Given:** move válido seguido de route a ID ausente.
- **When:** dispatch batch.
- **Then:** status rejected, mismo contenido/revision/history, cero commit notifications.

### T10.2 · unit

**Archivo:** `tests/editor-commands.unit.spec.ts`.

- **Given:** store edit=false o expectedRevision stale.
- **When:** dispatch por API sin UI.
- **Then:** permission.denied/revision.stale y snapshot intacto.

## R11 — Undo/redo y no-op

**Tarea:** [E04](task-catalog.md#e04) · **Hito:** M0.

**Aceptación:** Contenido reversible, revisions monotónicas y gestures agrupados.

### T11.1 · unit

**Archivo:** `tests/editor-history.unit.spec.ts`.

- **Given:** A→B→C, undo y edit D.
- **When:** undo/redo y nueva rama.
- **Then:** restore de contenido exacto, revisions crecen y redo se vacía.

### T11.2 · unit

**Archivo:** `tests/editor-history.unit.spec.ts`.

- **Given:** 100 pointermoves en un gesture y move a coordenada actual.
- **When:** commit gesture y luego no-op.
- **Then:** un entry para gesture, cero entry/revision para no-op.

## R12 — Historial bounded y dirty

**Tarea:** [E04](task-catalog.md#e04) · **Hito:** M0.

**Aceptación:** Memoria acotada y dirty ligado al contenido guardado.

### T12.1 · unit

**Archivo:** `tests/editor-history.unit.spec.ts`.

- **Given:** historial con maxEntries=2/maxBytes fijo.
- **When:** tres commits y undo hasta límite.
- **Then:** evict oldest conservando orden, no exceed bytes ni undo parcial.

### T12.2 · unit

**Archivo:** `tests/editor-history.unit.spec.ts`.

- **Given:** contenido guardado A, edit B.
- **When:** undo a A con nueva revision.
- **Then:** dirty false pese a revision distinta; markSaved viejo no limpia B.

## R13 — Aislamiento y reemplazo externo

**Tarea:** [E04](task-catalog.md#e04) · **Hito:** M0.

**Aceptación:** Stores independientes y conflictos locales explícitos.

### T13.1 · unit

**Archivo:** `tests/editor-store.unit.spec.ts`.

- **Given:** stores A/B, subscription y draft en A.
- **When:** commit A, eco externo y documento externo distinto.
- **Then:** B sin cambios; eco no duplicado; distinto exige resolver conflicto.

### T13.2 · e2e

**Archivo:** `tests/e2e/editor-store.e2e.ts`.

- **Given:** dos instancias bajo StrictMode.
- **When:** mount/unmount y editar cada una.
- **Then:** listeners se liberan, SVG IDs distintos, no history ni theme cruzados.

## R14 — Scene y renderer legacy

**Tarea:** [E05](task-catalog.md#e05) · **Hito:** M1.

**Aceptación:** SVG compartido sin regresión de tipos originales.

### T14.1 · unit

**Archivo:** `tests/editor-scene.unit.spec.ts`.

- **Given:** siete fixtures y layouts baseline.
- **When:** render antes/después del refactor.
- **Then:** nodos/paths/bounds/IDs iguales y props legacy intactas.

### T14.2 · e2e

**Archivo:** `tests/e2e/editor-render.e2e.ts`.

- **Given:** light/dark es/en con coords negativas y edge labels externos.
- **When:** fit y screenshot revisada.
- **Then:** sin clipping de texto/markers; aspect ratio y superficies opacas.

## R15 — Manual, hybrid y auto-layout

**Tarea:** [E05](task-catalog.md#e05) · **Hito:** M1.

**Aceptación:** Autoría espacial estable y relayout explícito.

### T15.1 · unit

**Archivo:** `tests/editor-scene.unit.spec.ts`.

- **Given:** manual/hybrid con nodo locked/pinned.
- **When:** editar label, añadir nodo y resolver.
- **Then:** posiciones guardadas intactas; nuevo nodo no mueve pins.

### T15.2 · e2e

**Archivo:** `tests/e2e/editor-layout.e2e.ts`.

- **Given:** preview de relayout con locks.
- **When:** aplicar, deshacer y reset tras confirmación.
- **Then:** un commit, locks conservados, undo exacto; cancel sin cambios.

## R16 — CRUD y texto seguro

**Tarea:** [E07](task-catalog.md#e07) · **Hito:** M1.

**Aceptación:** Crear/renombrar/eliminar sin perder semántica.

### T16.1 · e2e

**Archivo:** `tests/e2e/editor-crud.e2e.ts`.

- **Given:** cada tipo en palette/inspector.
- **When:** crear entidad y editar label/descripción con IME.
- **Then:** solo confirma al finalizar IME; texto literal, sin markup ejecutado.

### T16.2 · unit

**Archivo:** `tests/editor-adapters.unit.spec.ts`.

- **Given:** nodo con relaciones/metadata/groups/views.
- **When:** removeNodes y prune referencias.
- **Then:** dependencias borradas atómicamente y receipt de vistas vacías; undo restaura.

## R17 — Conexiones, ports y paralelas

**Tarea:** [E07](task-catalog.md#e07) · **Hito:** M1.

**Aceptación:** Conexiones son entidades estables, no pares únicos.

### T17.1 · unit

**Archivo:** `tests/editor-connections.unit.spec.ts`.

- **Given:** graph con capacity/side/direction y self/parallel.
- **When:** crear y reconnect relación.
- **Then:** capacidad respetada, ID intacto; nada se deduplica por from/to.

### T17.2 · e2e

**Archivo:** `tests/e2e/editor-connections.e2e.ts`.

- **Given:** handle seleccionado por teclado o touch.
- **When:** conectar endpoint válido, inválido y soltar fondo.
- **Then:** success explícito o cancel/reject; no delete por drop vacío.

## R18 — Resize, lock y alineación

**Tarea:** [E08](task-catalog.md#e08) · **Hito:** M1.

**Aceptación:** Transformaciones preservan semántica y mínimos.

### T18.1 · unit

**Archivo:** `tests/editor-transforms.unit.spec.ts`.

- **Given:** tres nodos, uno locked y tabla ER.
- **When:** align/distribute/resize batch.
- **Then:** rechazo atómico por locked; tamaños mínimos y extremos correctos.

### T18.2 · e2e

**Archivo:** `tests/e2e/editor-transforms.e2e.ts`.

- **Given:** selección en zoom 0.5 y 2.
- **When:** multi-drag y resize.
- **Then:** offsets mundo estables, labels legibles y único undo.

## R19 — Clipboard y duplicación

**Tarea:** [E08](task-catalog.md#e08) · **Hito:** M1.

**Aceptación:** Remapeo completo y cut seguro.

### T19.1 · unit

**Archivo:** `tests/editor-clipboard.unit.spec.ts`.

- **Given:** fragment con grupos anidados, internas y edges externas.
- **When:** duplicate/paste con IdFactory fija.
- **Then:** IDs nuevos únicos, internas remapeadas, externas omitidas, offset24.

### T19.2 · e2e

**Archivo:** `tests/e2e/editor-clipboard.e2e.ts`.

- **Given:** clipboard denegado y fragment hostile.
- **When:** cut y paste.
- **Then:** cut no borra; payload no válido no cambia documento.

## R20 — Grupos estructurales

**Tarea:** [E08](task-catalog.md#e08) · **Hito:** M1.

**Aceptación:** Membresía inequívoca y movimiento sin duplicación.

### T20.1 · unit

**Archivo:** `tests/editor-groups.unit.spec.ts`.

- **Given:** A contiene B contiene nodo; ciclo o doble parent propuestos.
- **When:** validar y move group 20,30.
- **Then:** ciclo/doble parent rechazados; descendiente movido una vez.

### T20.2 · unit

**Archivo:** `tests/editor-groups.unit.spec.ts`.

- **Given:** grupo con locked child y edges externas.
- **When:** intentar move/ungroup bloqueados, desbloquear explícitamente, ungroup keep y undo.
- **Then:** move/ungroup con lock rechazan; después de unlock ungroup mantiene coords/IDs; undo exacto.

## R21 — Configuración serializable y scoped

**Tarea:** [E09](task-catalog.md#e09) · **Hito:** M1.

**Aceptación:** Tema/leyenda/grid portable sin CSS ejecutable.

### T21.1 · unit

**Archivo:** `tests/editor-presentation.unit.spec.ts`.

- **Given:** tokens válidos/invalid hex, textScale fuera 0.75–1.5.
- **When:** set-presentation y undo.
- **Then:** validación estricta; geometría respeta scale; rollback exacto.

### T21.2 · e2e

**Archivo:** `tests/e2e/editor-theme.e2e.ts`.

- **Given:** dos canvas con themes opuestos.
- **When:** cambiar tokens y exportar uno.
- **Then:** otro y host no cambian; export usa theme del documento no body.

## R22 — API compuesta y host controlado

**Tarea:** [E09](task-catalog.md#e09) · **Hito:** M1.

**Aceptación:** Store único y chrome opcional sin dependencia del site.

### T22.1 · package

**Archivo:** `scripts/test-package.mjs`.

- **Given:** tarball instalado en React18 y React19.
- **When:** compilar Root/Surface con toolbar custom.
- **Then:** tipos resueltos sin import a src, funciona con y sin inspector.

### T22.2 · e2e

**Archivo:** `tests/e2e/editor-controlled.e2e.ts`.

- **Given:** store del host con permisos y replace externo.
- **When:** toggle permisos, commit y acceptExternal.
- **Then:** mutación protegida en UI/API, history reset y focos huérfanos limpios.

## R23 — Sync texto/canvas y last-good

**Tarea:** [E07](task-catalog.md#e07) · **Hito:** M1.

**Aceptación:** Buffer inválido nunca sustituye el documento válido.

### T23.1 · e2e

**Archivo:** `tests/e2e/editor-json.e2e.ts`.

- **Given:** preview válido A y textarea dirty.
- **When:** pegar JSON incompleto o estructural inválido.
- **Then:** A visible, error con path, texto preservado, cero commit.

### T23.2 · unit

**Archivo:** `tests/editor-json.unit.spec.ts`.

- **Given:** validación async A lenta y B nueva.
- **When:** resolver B antes de A.
- **Then:** solo B publicado, A ignorado por requestId y revision.

## R24 — Save/load opt-in

**Tarea:** [E10](task-catalog.md#e10) · **Hito:** M1.

**Aceptación:** Montar no persiste, round-trip íntegro al aceptar.

### T24.1 · unit

**Archivo:** `tests/editor-persistence.unit.spec.ts`.

- **Given:** adapter spy y autosave desactivado.
- **When:** mount, viewport y commit.
- **Then:** cero writes hasta opt-in; con opt-in solo commit dispara a750ms.

### T24.2 · e2e

**Archivo:** `tests/e2e/editor-persistence.e2e.ts`.

- **Given:** documento dirty con scene/theme/views.
- **When:** save, reload y restore confirmado.
- **Then:** contenido/IDs iguales; history y cámara temporal no serializados.

## R25 — Orden de guardado y conflictos

**Tarea:** [E10](task-catalog.md#e10) · **Hito:** M1.

**Aceptación:** No lost updates ni saved engañoso.

### T25.1 · unit

**Archivo:** `tests/editor-persistence.unit.spec.ts`.

- **Given:** save A pendiente y nuevo edit B.
- **When:** resolver A y luego B.
- **Then:** B dirty hasta su confirmación; token correcto y un vuelo por key.

### T25.2 · unit

**Archivo:** `tests/editor-persistence.unit.spec.ts`.

- **Given:** tokens diferentes, dos writers y storage event.
- **When:** autosave o remove con token viejo.
- **Then:** conflict; conserva local y no sobrescribe/remueve remoto.

## R26 — Cuota, datos corruptos y drafts

**Tarea:** [E10](task-catalog.md#e10) · **Hito:** M1.

**Aceptación:** Fallos recuperables sin pérdida del último documento.

### T26.1 · unit

**Archivo:** `tests/editor-persistence.unit.spec.ts`.

- **Given:** QuotaExceeded/SecurityError y blob corrupto.
- **When:** save/load.
- **Then:** unavailable/quarantine, documento activo intacto, download posible.

### T26.2 · e2e

**Archivo:** `tests/e2e/editor-persistence.e2e.ts`.

- **Given:** draft textual inválido y borrador v0.3.
- **When:** restaurar, cancelar y descartar.
- **Then:** slots separados, confirmación, no borra legacy automáticamente.

## R27 — Entrypoints y Studio aislado

**Tarea:** [E12](task-catalog.md#e12) · **Hito:** M1.

**Aceptación:** Nuevas capacidades no inflan imports de lectura.

### T27.1 · package

**Archivo:** `scripts/test-package.mjs`.

- **Given:** exports actuales y nuevos del tarball.
- **When:** import cross-entry con react-server y NodeNext/Bundler.
- **Then:** sin window en import puro, registry compartido y use client correcto.

### T27.2 · unit

**Archivo:** `tests/editor-budgets.unit.spec.ts`.

- **Given:** Vite manifest de landing/docs/studio.
- **When:** check-budgets contando dynamicImports.
- **Then:** landing/docs mantienen175/12; Studio250/16; no editor en graph landing.

## R28 — Export estático canónico

**Tarea:** [E11](task-catalog.md#e11) · **Hito:** M1.

**Aceptación:** Output independiente del estado interactivo.

### T28.1 · e2e

**Archivo:** `tests/e2e/editor-export.e2e.ts`.

- **Given:** selection/lens/hover/reveal/camera/drag activos.
- **When:** export document SVG y PNG.
- **Then:** mismo grafo completo que sesión neutral; UI y store unchanged.

### T28.2 · unit

**Archivo:** `tests/editor-export.unit.spec.ts`.

- **Given:** documento con viewport irrelevante, coords negativas y labels.
- **When:** serializar SVG y reparsear XML.
- **Then:** IDs refs válidos, bounds incluyen todo y sin handlers/foreignObject.

## R29 — Assets y raster faults

**Tarea:** [E11](task-catalog.md#e11) · **Hito:** M1.

**Aceptación:** Output standalone y errores recuperables.

### T29.1 · e2e

**Archivo:** `tests/e2e/editor-export.e2e.ts`.

- **Given:** Geist/assets disponibles sin stylesheets host.
- **When:** export y abrir SVG/PNG fuera del app.
- **Then:** fuentes/icons correctos, PNG pixels no vacíos y notices presentes.

### T29.2 · e2e

**Archivo:** `tests/e2e/editor-export-failures.e2e.ts`.

- **Given:** fetch font falla, Image.onerror, toBlob null o canvas tainted.
- **When:** export, retry y abort.
- **Then:** códigos precisos, retry posible, URLs recursos liberados.

## R30 — Ruta dirigida exacta

**Tarea:** [E13](task-catalog.md#e13) · **Hito:** M2.

**Aceptación:** BFS determinista por relaciones autoradas.

### T30.1 · unit

**Archivo:** `tests/editor-graph.unit.spec.ts`.

- **Given:** graph-document y graph-expected.
- **When:** a→c, a→a y a→isolated.
- **Then:** elegir ab-primary/bc; self cero edges; unreachable explícito.

### T30.2 · unit

**Archivo:** `tests/editor-graph.unit.spec.ts`.

- **Given:** mismo graph reordenando edges paralelas y unknown node.
- **When:** query.
- **Then:** desempate según nuevo orden; ID exacto; unknown error no ruta inventada.

## R31 — Reach seguro en ciclos

**Tarea:** [E13](task-catalog.md#e13) · **Hito:** M2.

**Aceptación:** Depth mínimos, no inferencia de impacto.

### T31.1 · unit

**Archivo:** `tests/editor-graph.unit.spec.ts`.

- **Given:** ciclo, self-loop, parallel y isolated.
- **When:** downstream a y upstream b.
- **Then:** termina, dedup nodes/edges por ID, depths BFS correctos.

### T31.2 · unit

**Archivo:** `tests/editor-graph.unit.spec.ts`.

- **Given:** maxHops=1 y scene groups sin edge.
- **When:** reach y route entre miembros.
- **Then:** truncated true cuando hay más alcance; grupo no crea conectividad.

## R32 — Finder e inspector semántico

**Tarea:** [E13](task-catalog.md#e13) · **Hito:** M2.

**Aceptación:** Búsqueda accesible sin depender de geometría.

### T32.1 · e2e

**Archivo:** `tests/e2e/editor-viewer.e2e.ts`.

- **Given:** Unicode/ID y dos labels iguales.
- **When:** buscar exact/prefix/substring, abrir relación paralela.
- **Then:** orden determinista e ID exacto, cero resultado anunciado.

### T32.2 · e2e

**Archivo:** `tests/e2e/editor-viewer.e2e.ts`.

- **Given:** query receipt rev0, documento cambia rev1.
- **When:** intentar seguir ruta/card antigua.
- **Then:** query invalidada, no stale highlight ni export.

## R33 — Lens, minimapa y collapse

**Tarea:** [E14](task-catalog.md#e14) · **Hito:** M2.

**Aceptación:** Filtros de lectura no mutan topología.

### T33.1 · e2e

**Archivo:** `tests/e2e/editor-viewer.e2e.ts`.

- **Given:** roles/tags, grupo y edges externas.
- **When:** lens, collapse y minimap pan.
- **Then:** doc/hash intacto, proxy ligado al ID original y viewport correcto.

### T33.2 · unit

**Archivo:** `tests/editor-views.unit.spec.ts`.

- **Given:** lens ocultando nodo necesario.
- **When:** findRoute sin filtro explícito.
- **Then:** ruta global no cambia; filtro explícito queda en receipt.

## R34 — Vistas y story truthful

**Tarea:** [E14](task-catalog.md#e14) · **Hito:** M2.

**Aceptación:** No crear causalidad ni edges desde orden de pasos.

### T34.1 · unit

**Archivo:** `tests/editor-views.unit.spec.ts`.

- **Given:** dos vistas sin edge directa, ruta no contigua y view huérfana.
- **When:** validar story y describir transición.
- **Then:** sin inferir relación; inválidos bloqueados por ID.

### T34.2 · e2e

**Archivo:** `tests/e2e/editor-story.e2e.ts`.

- **Given:** story con 3 pasos, duración y control manual.
- **When:** play/next/prev/escape/hidden y reduced-motion.
- **Then:** un owner, finito, controles funcionales y cero autoplay.

## R35 — Presentación y deep links

**Tarea:** [E14](task-catalog.md#e14) · **Hito:** M2.

**Aceptación:** Restauración bounded y salida segura.

### T35.1 · e2e

**Archivo:** `tests/e2e/editor-presentation.e2e.ts`.

- **Given:** fullscreen denegado y foco en trigger.
- **When:** entrar/salir presentación.
- **Then:** fallback usable, Escape/foco restaurados y documento igual.

### T35.2 · unit

**Archivo:** `tests/editor-share.unit.spec.ts`.

- **Given:** IDs con ~/%/Unicode, parámetros repetidos y unknown view.
- **When:** encode/decode viewer state.
- **Then:** round-trip con escaping; contradicción rechazada, unknown overview.

## R36 — Geometría y diagnósticos publish

**Tarea:** [E15](task-catalog.md#e15) · **Hito:** M2.

**Aceptación:** Fallo localizado sin falsos certificados.

### T36.1 · unit

**Archivo:** `tests/editor-quality.unit.spec.ts`.

- **Given:** node overlap, edge-through-node, endpoint incorrecto y label collision.
- **When:** quality edit versus publish.
- **Then:** edit warnings; publish errors medidos con fixes soportados, sin borrar labels.

### T36.2 · e2e

**Archivo:** `tests/e2e/editor-quality.e2e.ts`.

- **Given:** fuentes cargadas y labels largos es/en.
- **When:** medir y export publish.
- **Then:** sin clipping; font/métricas ausentes verified=false y error accionable.

## R37 — Router y layout cancelables

**Tarea:** [E15](task-catalog.md#e15) · **Hito:** M2.

**Aceptación:** Trabajo acotado y latest revision wins.

### T37.1 · unit

**Archivo:** `tests/editor-routing.unit.spec.ts`.

- **Given:** obstáculos, parallel, self-loop y ruta imposible.
- **When:** router a límite exacto de estados.
- **Then:** determinismo, clearance12 y bends24; impossible diagnostic sin atraviesos.

### T37.2 · unit

**Archivo:** `tests/editor-layout-provider.unit.spec.ts`.

- **Given:** provider A lento, B nuevo y abort.
- **When:** resolver A después de B.
- **Then:** A no aplicado; history solo B; cancel mantiene pins y última scene.

## R38 — HTML portable y offline

**Tarea:** [E16](task-catalog.md#e16) · **Hito:** M2.

**Aceptación:** Un archivo con lectura funcional y fallback estático.

### T38.1 · e2e

**Archivo:** `tests/e2e/editor-html.e2e.ts`.

- **Given:** artifact file:// y todos requests bloqueados.
- **When:** buscar, route, theme y story manual.
- **Then:** funciona sin red y sin storage; fonts incluidas.

### T38.2 · e2e

**Archivo:** `tests/e2e/editor-html.e2e.ts`.

- **Given:** mismo artifact scripts disabled y malicious label.
- **When:** abrir archivo.
- **Then:** SVG/lista visible; ninguna ejecución inyectada; fuente exacta si includeSource.

## R39 — Scope y disclosure de exports

**Tarea:** [E11](task-catalog.md#e11) · **Hito:** M1.

**Aceptación:** No filtrar datos no solicitados ni ocultar pérdidas.

### T39.1 · unit

**Archivo:** `tests/editor-export.unit.spec.ts`.

- **Given:** selection nodes+edge externo y includeSource false.
- **When:** export selection raster, JSON selection, HTML sin source.
- **Then:** raster induced scope; JSON rechaza; HTML solo índice mínimo declarado.

### T39.2 · e2e

**Archivo:** `tests/e2e/editor-export.e2e.ts`.

- **Given:** documento con notes/links/extensions no dibujados, descriptions y default source=false/metadata=minimal.
- **When:** export SVG y revisar XML/HTML.
- **Then:** no JSON completo ni notes/links/extensions; conserva descriptions/datos mínimos del viewer y advierte sobre contenido visible.

## R40 — Share document compatible y bounded

**Tarea:** [E17](task-catalog.md#e17) · **Hito:** M2.

**Aceptación:** s= conserva significado; d= nuevo validado.

### T40.1 · unit

**Archivo:** `tests/editor-share.unit.spec.ts`.

- **Given:** hash legacy, d=v1, futuro, malformed y expansión >256KiB.
- **When:** decode con clock limitado.
- **Then:** legacy igual, futuro rechaza, expansión/timeout aborta y release reader.

### T40.2 · e2e

**Archivo:** `tests/e2e/editor-share.e2e.ts`.

- **Given:** documento >URL máximo y clipboard denegado.
- **When:** copy share.
- **Then:** ofrece JSON local, no red ni subida automática, toast no anuncia success.

## R41 — Cards de contexto exacto

**Tarea:** [E17](task-catalog.md#e17) · **Hito:** M2.

**Aceptación:** 1200×630 sin recorte y query snapshot íntegro.

### T41.1 · e2e

**Archivo:** `tests/e2e/editor-cards.e2e.ts`.

- **Given:** ruta con parallel edge explícita y reach en ciclo.
- **When:** descargar cards y decodificar.
- **Then:** dimensiones1200×630, todo grafo fit, highlight exacto y canonical=false.

### T41.2 · unit

**Archivo:** `tests/editor-cards.unit.spec.ts`.

- **Given:** receipt stale/alterado/vacío/unreachable.
- **When:** export card.
- **Then:** rechaza sin fallback engañoso; canonical card sigue sin highlights.

## R42 — Formatos negociados y límites raster

**Tarea:** [E17](task-catalog.md#e17) · **Hito:** M2.

**Aceptación:** Nunca MIME incorrecto ni memoria descontrolada.

### T42.1 · e2e

**Archivo:** `tests/e2e/editor-formats.e2e.ts`.

- **Given:** browser sin WebP real/ClipboardItem y JPEG transparente.
- **When:** seleccionar export.
- **Then:** disabled/error explícito, no PNG renombrado ni fondo cambiado silenciosamente.

### T42.2 · unit

**Archivo:** `tests/editor-export-limits.unit.spec.ts`.

- **Given:** dimensions 16384, 32MP y un pixel sobre límite.
- **When:** planRaster y abort.
- **Then:** acepta borde válido; rechaza excedente antes de canvas allocation.

## R43 — Plugins y extensiones seguras

**Tarea:** [E18](task-catalog.md#e18) · **Hito:** M2.

**Aceptación:** Registro trusted por instancia y renderer exportable.

### T43.1 · unit

**Archivo:** `tests/editor-renderers.unit.spec.ts`.

- **Given:** dos registries y payload con typeKey no registrado.
- **When:** resolver/validar/exportar.
- **Then:** no carga remota; renderer.unsupported; otra instancia intacta.

### T43.2 · package

**Archivo:** `scripts/test-package.mjs`.

- **Given:** tarball y custom node con validate/measure/renderSvg.
- **When:** compilar y exportar fixture; round-trip extensions.
- **Then:** tipos públicos suficientes, datos conservados sin callbacks serializados.

## R44 — Keyboard y accesibilidad funcional

**Tarea:** [E19](task-catalog.md#e19) · **Hito:** M2.

**Aceptación:** Toda edición esencial realizable sin drag.

### T44.1 · e2e

**Archivo:** `tests/e2e/editor-accessibility.e2e.ts`.

- **Given:** usuario solo teclado y outline HTML.
- **When:** crear, editar, mover, conectar, delete, undo, save, export.
- **Then:** foco visible/orden lógico, anuncios, cero serious/critical axe.

### T44.2 · e2e

**Archivo:** `tests/e2e/editor-accessibility.e2e.ts`.

- **Given:** textarea/IME y foco fuera del editor.
- **When:** atajos de borrar/copiar/guardar y zoom página200%.
- **Then:** sin secuestro; ningún contenido/control inaccesible por clipping.

## R45 — Temas/locales y móvil

**Tarea:** [E19](task-catalog.md#e19) · **Hito:** M2.

**Aceptación:** Experiencia coherente con DESIGN_SYSTEM.

### T45.1 · e2e

**Archivo:** `tests/e2e/editor-design.e2e.ts`.

- **Given:** light/dark × es/en a360/768/1440.
- **When:** abrir todos paneles y export menu.
- **Then:** Geist cargada, 4–8px corners, contrastes y hit targets≥44 coarse.

### T45.2 · e2e

**Archivo:** `tests/e2e/editor-design.e2e.ts`.

- **Given:** touch pointercancel, inspector y desktop screenshots.
- **When:** recorrer formularios y revisar baselines.
- **Then:** sin overflow página, preserveAspectRatio, surfaces opacas y sin stripes.

## R46 — Performance y budgets verificables

**Tarea:** [E19](task-catalog.md#e19) · **Hito:** M2.

**Aceptación:** No prometer 1000 nodes sin medición.

### T46.1 · e2e

**Archivo:** `tests/e2e/editor-performance.e2e.ts`.

- **Given:** dataset seed fijada 100/200 y1000/2000.
- **When:** medir load, frame drag, selection y route en Chromium.
- **Then:** satisface p95 y reporte ambiente de 06-tdd; no cambiar dataset para pasar.

### T46.2 · unit

**Archivo:** `tests/editor-budgets.unit.spec.ts`.

- **Given:** tarball y graphs de entries prod.
- **When:** medir gzip/packed/unpacked.
- **Then:** lectura≤175/12KiB; Studio≤250/16KiB; paquete≤2/8MiB.

## R47 — Consumidores y backwards compatibility

**Tarea:** [E20](task-catalog.md#e20) · **Hito:** M2.

**Aceptación:** APIs y docs se verifican contra el artifact instalado.

### T47.1 · package

**Archivo:** `scripts/test-package.mjs`.

- **Given:** tarball en limpio, ejemplos siete tipos+nuevos.
- **When:** build React18/19 y SSR imports.
- **Then:** contratos legacy y nuevos compilan sin src alias ni singleton duplicado.

### T47.2 · framework

**Archivo:** `scripts/test-frameworks.mjs`.

- **Given:** Next/Vite consumidores de tarball.
- **When:** build, hidratar y editar/exportar.
- **Then:** sin hydration warnings/window en server; CSS/fonts y subpaths resolubles.

## R48 — Release y documentación honestas

**Tarea:** [E21](task-catalog.md#e21) · **Hito:** M2.

**Aceptación:** Gate publicado distinto de local check.

### T48.1 · unit

**Archivo:** `tests/editor-release.unit.spec.ts`.

- **Given:** dist/schema/docs stale o docs prometen API no distribuida.
- **When:** release verification.
- **Then:** bloqueo con causa, sin cambiar channel a stable por tests locales.

### T48.2 · e2e

**Archivo:** `tests/e2e/editor-docs.e2e.ts`.

- **Given:** docs build con Pages base y snapshot anterior.
- **When:** recorrer guías/ejemplos/links es/en y sin JS.
- **Then:** rutas correctas y snapshot antiguo preservado; publicación requiere autorización.

## R49 — Comparación de documentos

**Tarea:** [E22](task-catalog.md#e22) · **Hito:** M3.

**Aceptación:** Delta exacta sin heurísticas de rename/impact.

### T49.1 · unit

**Archivo:** `tests/editor-compare.unit.spec.ts`.

- **Given:** same IDs+label change, moved node, renamed ID y changed sequence order.
- **When:** compare.
- **Then:** modified semántico, presentation-only, remove+add, reorder semántico respectivamente.

### T49.2 · e2e

**Archivo:** `tests/e2e/editor-compare.e2e.ts`.

- **Given:** Before/Delta/After y tipo incompatible.
- **When:** navegar cambios con teclado/export.
- **Then:** IDs exactos, inputs intactos; incompatible rechaza; no claims de merge safety.

## R50 — Evidencia declarada versus verificada

**Tarea:** [E23](task-catalog.md#e23) · **Hito:** M3.

**Aceptación:** No confiar badges importados.

### T50.1 · unit

**Archivo:** `tests/editor-evidence.unit.spec.ts`.

- **Given:** JSON con verified=true, path traversal, commit/rango inválido.
- **When:** validate/verify.
- **Then:** unknown field o diagnostics; no acceso a red/fs ni verified desde input.

### T50.2 · unit

**Archivo:** `tests/editor-evidence.unit.spec.ts`.

- **Given:** verifier fake de commit/blob correcto e incorrecto.
- **When:** resolver receipt.
- **Then:** verified solo match completo; mismatch/unavailable sin false positive.

## R51 — Deployment profile explícito

**Tarea:** [E23](task-catalog.md#e23) · **Hito:** M3.

**Aceptación:** Reglas declarativas opt-in y fail-closed.

### T51.1 · unit

**Archivo:** `tests/editor-profiles.unit.spec.ts`.

- **Given:** owner faltante, múltiples regiones, db pública, crossing ausente.
- **When:** validar con perfil on/off.
- **Then:** on falla por facts exactos; off no impone perfil ni descubre infraestructura.

### T51.2 · e2e

**Archivo:** `tests/e2e/editor-profiles.e2e.ts`.

- **Given:** perfil inválido en inspector.
- **When:** solicitar export publish.
- **Then:** no se desactiva profile automáticamente; diagnóstico navega al nodo/edge.

## R52 — Motion y WebM finitos

**Tarea:** [E24](task-catalog.md#e24) · **Hito:** M3.

**Aceptación:** Capability-gated con recursos liberados.

### T52.1 · e2e

**Archivo:** `tests/e2e/editor-motion.e2e.ts`.

- **Given:** codec soportado y story autorada.
- **When:** grabar y decodificar archivo.
- **Then:** duration bounded, pixels no vacíos, final frame, sin UI overlays.

### T52.2 · e2e

**Archivo:** `tests/e2e/editor-motion.e2e.ts`.

- **Given:** no codec, onerror, abort, hidden y reduced-motion.
- **When:** intentar/grabar/cancelar.
- **Then:** unavailable o cancelled real; tracks/URLs/timers liberados, no falso éxito.

## R53 — Conversión explícita sin pérdida silenciosa

**Tarea:** [E03](task-catalog.md#e03) · **Hito:** M0.

**Aceptación:** Graph nuevo no reemplaza al documento original.

### T53.1 · unit

**Archivo:** `tests/editor-conversion.unit.spec.ts`.

- **Given:** sequence con activation, band decisions y ER fields.
- **When:** convertToGraph.
- **Then:** ID de doc nuevo y receipt enumera campos/semántica no transferida, original intacto.

### T53.2 · e2e

**Archivo:** `tests/e2e/editor-conversion.e2e.ts`.

- **Given:** documento dirty estructurado.
- **When:** cancelar y aceptar conversión.
- **Then:** cancel sin cambios; accept abre nuevo documento sin sobreescribir guardado.

## R54 — Characterization guard de baseline

**Tarea:** [E00](task-catalog.md#e00) · **Hito:** M0.

**Aceptación:** El punto de partida se mide antes de refactor.

### T54.1 · unit

**Archivo:** `tests/editor-baseline.unit.spec.ts`.

- **Given:** siete specs y exports existentes.
- **When:** resolver geometría y serialize helpers.
- **Then:** mismas identidades públicas y errores esperados reproducibles.

### T54.2 · package

**Archivo:** `scripts/test-package.mjs`.

- **Given:** tarball actual limpio.
- **When:** run consumer characterization.
- **Then:** 10 pruebas existentes conservadas, baseline documentada sin fingir disponibilidad npm.

## R55 — API de metadata y source privacy

**Tarea:** [E02](task-catalog.md#e02) · **Hito:** M0.

**Aceptación:** Texto/URL son datos y las policies no viajan desde imports.

### T55.1 · unit

**Archivo:** `tests/editor-security.unit.spec.ts`.

- **Given:** hostile-inputs y extensions con límites.
- **When:** importar y renderizar cada frontera.
- **Then:** texto literal; schemes rechazados; extensions no cargan código ni elevan límites.

### T55.2 · e2e

**Archivo:** `tests/e2e/editor-security.e2e.ts`.

- **Given:** HTML export, forged storage y fuente con caracteres especiales.
- **When:** abrir, restaurar y seguir link con gesto.
- **Then:** CSP sin conexiones, no execute, rel seguro, sin logs de tokens/rutas privadas.

## R56 — Auto-layout es asíncrono solo por adapter explícito

**Tarea:** [E18](task-catalog.md#e18) · **Hito:** M2.

**Aceptación:** Provider no controla el documento ni omite locks.

### T56.1 · unit

**Archivo:** `tests/editor-providers.unit.spec.ts`.

- **Given:** provider devuelve scene con nodeId ajeno o lock movido.
- **When:** aplicar resultado con baseRevision correcta.
- **Then:** rechazo semántico, sin side effects ni history parcial.

### T56.2 · unit

**Archivo:** `tests/editor-providers.unit.spec.ts`.

- **Given:** provider valido y otro que rechaza Promise.
- **When:** request layout y cleanup.
- **Then:** aplicar un commit; error aislado conserva last-good y puede reintentar.
