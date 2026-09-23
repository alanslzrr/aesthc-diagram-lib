# 6. TDD ejecutable y estrategia de verificación

## 6.1 Qué significa RED → GREEN → REFACTOR aquí

Por cada escenario T del [catálogo](test-catalog.md):

1. Crear test con ID en el nombre y fixture mínima. Ejecutarlo aislado y guardar el fallo esperado. Un error de compilación/import por API inexistente solo prueba ausencia de API; **no es todavía un RED de comportamiento**.
2. Crear únicamente el export/firma necesario para colectar el test, devolver el resultado mínimo que provoque la aserción esperada, y ejecutar de nuevo. Antes de lógica funcional debe constar el assertion failure del comportamiento.
3. Implementar la mínima lógica para pasar ese caso. Añadir el caso negativo/edge complementario antes de ampliar funcionalidad.
4. Refactorizar con tests verdes. Ejecutar suite de la responsabilidad y regresiones asociadas.
5. En el cierre de tarea ejecutar unit, typecheck y consumo real afectado; en cada hito `pnpm check` y navegador. Registrar comandos y resultados, no “probado” sin evidencia.

No snapshots como único oráculo de topología. No `test.skip`, `.todo`, assertions tautológicas o mocks del algoritmo bajo prueba para aparentar cobertura. No actualizar baselines para silenciar cambios no comprendidos. Un test que siempre pasa por `if (unsupported) return` no comprueba capacidad: probar la rama unsupported con assertions, y la supported en al menos un entorno compatible.

## 6.2 Semillas incluidas y activación segura

En `tdd/seeds/` hay cuatro suites reales listas para copiar a `tests/`: documento/identidad (M0), store/history (M0), viewport (M1) y graph queries (M2). Se mantienen fuera de la suite actual porque las APIs destino **aún no existen**. No se han ejecutado como pruebas de funcionalidad implementada.

El activador comprueba todos los destinos antes de escribir y nunca sobreescribe archivos. No crea módulos de producción ni cambia package.json. Copia fixtures bajo `tests/fixtures/editor` para que los tests finales no dependan de `docs/specs`.

```sh
# E01: activar semillas M0. La suite de store se implementa en E04.
node docs/specs/editable-canvas/tdd/activate-seeds.mjs M0
pnpm exec vitest run tests/editor-document.unit.spec.ts
# Tras implementar E01/E02/E03, ejecutar E04:
pnpm exec vitest run tests/editor-store.unit.spec.ts

# E06:
node docs/specs/editable-canvas/tdd/activate-seeds.mjs M1
pnpm exec vitest run tests/editor-viewport.unit.spec.ts

# E13:
node docs/specs/editable-canvas/tdd/activate-seeds.mjs M2
pnpm exec vitest run tests/editor-graph.unit.spec.ts
```

El primer fallo de import es esperable y **no cierra RED**. Las semillas no sustituyen los 112 escenarios trazados; son la primera rebanada ejecutable. Cada tarea implementa además sus escenarios completos, que ya indican dato inicial, acción, resultado y archivo destino.

## 6.3 Pirámide de pruebas y aislamiento

| Nivel | Responsabilidad | Ambiente / oráculo |
|---|---|---|
| Unit puro | Documentos, validación, IDs, adapters, commands/history, viewport, graph, router y compare | Vitest Node actual; freeze inputs; resultados estructurales exactos |
| Component/interaction | Store binding, focus, keyboard, gesture y listeners | Playwright sobre Studio consumidor; no añadir jsdom por inercia |
| Package | Export map, declarations, CSS/assets, SSR safety, sharing state | Tarball instalado, NodeNext/Bundler y condiciones react-server |
| Framework | Vite + Next, React18 y19 | Fixtures consumidor sin source aliases; build+hydrate+interact |
| E2E | Flujos de autor/lector, import/save/export/restore | Cinco proyectos Playwright existentes; errores de consola capturados |
| Visual | Identidad visual, conexiones/labels, skins y tamaño de pantalla | Screenshots por plataforma, theme/locale; revisión humana antes de aceptar |
| Security | Todas las fronteras untrusted y receipts | Fixtures hostiles + objetos con descriptors/getters + network deny |
| Performance | Algoritmos, frame latency y peso | Dataset determinista, ambiente registrado y runner estable |

Mocks permitidos: reloj, IDs, errores de Storage/Clipboard, fetch de assets controlado, provider async y MediaRecorder error branches. No mockear `identifyEdges`, validación real, BFS, scene resolver, serialización o resize en el test que afirma esas capacidades. Al menos una exportación usa fuentes y decodificador de imagen reales.

## 6.4 Fixtures y oráculos

- `legacy-specs.json`: copia de los siete ejemplos del commit baseline; válido contra validator actual. Mantener también test directo de `examples/*.json` para detectar cambios intencionados futuros.
- `graph-document.json`: cinco nodos, dos paralelas, un ciclo, self-loop y un aislado; posiciones/tokens explícitos. Es fixture topológica, **no** baseline de calidad publish: sus rutas automáticas deben resolverse antes de verificar geometría.
- `graph-expected.json`: ruta a→c usa `ab-primary, bc`; reach downstream orden BFS y depths mínimos. Ningún grupo añade conectividad.
- `viewport-cases.json`: inversa, zoom y fit con coordenadas negativas y resultados exactos.
- `hostile-inputs.json`: strings de script/URL/prototype/path/Unicode, tratados siempre como datos.

Fixtures sintéticas que se crearán en E00/E02/E15/E19: límite N/N+1 de cada policy; labels 512/513; descripción8192/8193; schema unknown; group depth8/9; inválido port; eight-type editing; geometry crowded; layout race; large graphs. Generación sin random global: seed `0xAD1`, generador local xorshift32, IDs `n-0000`/`e-0000`, 60% forward DAG, 20% parallel, 10% back, 10% self; seed y output digest en reporte. No hacer que fixture de benchmark se recalcule distinto en cada corrida.

Property tests de E04/E13 sin nueva dependencia obligatoria: generador determinista de 100 seeds y 100 operaciones por seed; puede adoptarse fast-check como dev dependency solo con justificación y lockfile. Invariantes:

1. Aplicar transacción rechazada conserva contenido/revision/history.
2. Undo/redo conserva contenido canónico e IDs, no revision anterior.
3. Serialización canónica idempotente y parse round-trip.
4. Ningún edge/group/view/metadata apunta a entidad inexistente.
5. World→screen→world error absoluto ≤1e-8 para zoom soportado.
6. Toda route sigue edges reales consecutivas y mínima distancia BFS contra un oráculo pequeño independiente.
7. Reach termina en ciclos, depth mínimo y visited unique.
8. Export no muta documento/session/DOM visible, incluso en fallo o cancelación.

## 6.5 Matrices obligatorias

**Unidad:** ocho tipos × CRUD permitido/rechazado; anónimos/IDs explícitos × paralelo/self/cycle; edit/publish × válido/inválido; light/dark × es/en para contenido de UI; nodeIDs que incluyen espacios, `::`, `%`, `~`, Unicode y prefijos reservados rechazados.

**Browser funcional:** chromium, firefox, webkit, mobile-chromium y mobile (WebKit), como en playwright.config.ts. Chrome sistema es comprobación complementaria si faltan binarios fijados; no reemplaza esa matriz sin registrarlo.

**Viewport:** 360×800, 768×1024, 1440×900; zoom 0.1/0.5/1/2/4, página 200%, DPR1/2; CSS scale y preserveAspectRatio letterbox. No hacer producto cartesiano ciego: pipeline nightly completo y smoke de cambios por responsabilidades.

**Export:** cada tipo en SVG/PNG/JSON/HTML; JPEG/WebP cuando available y negativa cuando no; light/dark; source on/off; canonical/selection; route/reach cards con paralelas; WebM M3 en entorno realmente compatible y unsupported probado en otro.

**Accesibilidad:** axe sin serious/critical + ruta keyboard completa, reflow/contraste/focus manual, lector de pantalla al menos VoiceOver/Safari o NVDA/Firefox registrado por persona. Automatización sola no certifica accesibilidad completa.

## 6.6 Rendimiento: targets propuestos, no resultados medidos

Runner de referencia futuro: Ubuntu24.04, Node22.23.2 (o patch LTS validado equivalente), Playwright del lockfile, Chromium bundled, 4 vCPU, 8GiB; registrar CPU real. No comparar números de laptop con CI como si fueran equivalentes. 5 warmups + 30 muestras; p95 por responsabilidad; drag 10s tras fuentes loaded, traces adjuntas. Runner dedicado o job sin competencia pesada; 2 repeticiones si >10% ruido, ninguna relajación silenciosa.

| Medida | 100 nodos / 200 edges | 1000 nodos / 2000 edges |
|---|---:|---:|
| Validar+normalizar, p95 | ≤25ms | ≤150ms |
| Resolver escena auto inicial, p95 | ≤100ms | ≤1000ms; puede usar worker con feedback |
| Commit selección / metadata, p95 | ≤16ms | ≤50ms |
| BFS route/reach, p95 | ≤5ms | ≤25ms |
| Frame de drag, p95 | ≤16.7ms | ≤33.3ms |
| Interacción drag bloqueada por long task | ninguna >100ms | ninguna >100ms tras carga |
| SVG export sin carga inicial de fonts, p95 | ≤500ms | ≤3000ms |

Raster mide aparte a tamaño fijo2048×2048 para no mezclar cantidad de nodos con píxeles; objetivo p95≤3000ms. Memory gate: 50 ciclos mount/edit/export/dispose no conservan listeners/URLs/tracks y heap post-GC no crece >10MiB en benchmark controlado; heap con `performance.memory` no disponible en todos browsers no se reporta como universal.

Rebasar target bloquea el hito de rendimiento o requiere ADR con medición y nuevo límite de producto; no se reduce dataset para pasar. A* tiene budget duro independiente del tiempo de máquina. Presupuestos de bytes son los de arquitectura; añadir worker cuenta en el graph de la entrada que lo carga.

## 6.7 Comandos de gates

Usar Node22.14+ y pnpm10.29.3 (`packageManager`). Recomendado Node22 LTS para reproducir baseline.

```sh
pnpm install --frozen-lockfile
node docs/specs/editable-canvas/verify-spec.mjs
pnpm exec tsc --project docs/specs/editable-canvas/tsconfig.json

# Durante una rebanada RED/GREEN (sustituir por el archivo trazado):
pnpm exec vitest run tests/editor-document.unit.spec.ts

# Si cambiaron contratos generados:
pnpm schemas:generate
pnpm docs:generate

# Antes de entregar cada hito:
pnpm check
pnpm exec playwright install
pnpm test:e2e
pnpm test:frameworks
pnpm test:visual
git diff --check
git status --short
```

`pnpm check` ya hace build completo, tests del paquete, typechecks y site/docs/budgets. **No incluye** E2E, frameworks o visual comparisons. `pnpm test:visual` actual no incluye Studio: E19 debe extender grep/tests explícitamente; ejecutar el comando antiguo no demuestra cobertura nueva. Tests de export standalone añaden su servidor/file fixture controlado, no dependen de uno abierto por otra tarea.

En CI exigir `git diff --exit-code -- dist schemas src/validation docs/api site/src/generated` después de regenerar; adaptar lista si la generación añade outputs nuevos. Cambios generados se incluyen junto con fuente. En local inspeccionar diff antes de commit, nunca resetear archivos del usuario para “limpiar”.

Antes de browser tests, comprobar que baseURL sirve esta build y no otro proceso. `reuseExistingServer` puede aceptar un servicio ajeno en4173: en verificación reproducible usar servidor propiedad del run, puerto dedicado y `reuseExistingServer:false`, o CI sin servidor previo. No terminar procesos ajenos. Tests con URLs4173 hardcoded requieren refactor a baseURL en E00 antes de una matriz por puertos; una corrida contra otro servidor no es evidencia de regresión del repo.

## 6.8 Evidencia por tarea y anti-falsos verdes

Guardar en artefactos de CI o notas del PR: commit, task/requirement/test IDs, comando RED y assertion, GREEN, navegadores realmente ejecutados, tarball digest, medidas, screenshots revisadas y limitaciones. No hace falta commitear binarios de cada export, salvo fixture golden deliberada.

Los escenarios M2 que activan lens/story sobre export amplían los tests creados en E11 cuando esas capacidades existan. E11 verifica independencia de session con state fixtures y los gestures M1 disponibles; no declara probado un panel M2 aún ausente.

Definition of TDD done: pruebas de comportamiento pasan, el mutation relevante hace fallar al menos una aserción (por ejemplo borrar la comprobación expectedRevision o deduplicar paralelas por endpoints), y el código quedó refactorizado sin mocks que escondan el contrato. Mutation review puede ser manual documentado en M0; automatizar herramienta nueva no es prerequisito para empezar.
