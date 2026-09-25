# 9. Verificación de esta entrega de especificación

> Registro histórico de la entrega del spec, anterior a la aprobación de implementación. Para el estado actual consulta [ejecución](execution/README.md).

Fecha: 2026-09-22. Repositorio base `cdf37a87c94f9ea17f29c62f45e2128bec627763`; árbol limpio al iniciar. Archify inspeccionado en `1bb61c69538e37d80793b25843f620e55469f3a2` mediante lectura, no ejecutando su runtime.

## Alcance de los cambios

- Solo `docs/specs/editable-canvas/` y enlace en `ROADMAP.md`.
- Sin implementación en `src`, sin dependencias nuevas, sin cambios manuales de dist/schema, sin modificación del manifest público.
- Contratos y seed tests son destinos de implementación, no APIs disponibles.
- Sin commits, push, PR, tags o publicación realizados en esta tarea.

## Checks realizados

| Comando / comprobación | Estado y alcance |
|---|---|
| `pnpm install --frozen-lockfile` | PASS; lockfile vigente, sin cambios de dependencias |
| `pnpm check` | PASS con Node25.9.0/pnpm10.29.3: 135 unit tests, 10 tests de tarball, typechecks, schemas/docs, build y budgets |
| `pnpm check` repetido con Node22.23.2/pnpm10.29.3 | PASS; mismos 135 unit tests y 10 tests de tarball, gates completos y ningún diff productivo generado |
| `pnpm exec tsc --project docs/specs/editable-canvas/tsconfig.json` | PASS: tipos propuestos compilables contra el contrato actual; no comprueba implementación |
| `node docs/specs/editable-canvas/verify-spec.mjs` con Node22 | PASS: 25 tareas, 56 requisitos, 112 escenarios, dependencias sin ciclos, referencias locales, siete fixtures legacy, documento graph contra schema estructural propuesto y sintaxis de cuatro suites seed |
| Activador TDD en dos repositorios temporales | PASS: M0/M1/M2 copian cuatro suites y cinco fixtures; segunda activación rechaza overwrite, y conflicto en archivo posterior produce cero escrituras y conserva contenido del usuario |
| Prettier de contracts/checker/seed suites | PASS; sin modificación de código productivo |
| `pnpm exec playwright install` | BLOCKED: timeout repetido descargando Chrome for Testing153 / chromium1243 desde CDN; no se completó instalación |
| `pnpm test:e2e --max-failures=1` con Node22.23.2 | BLOCKED por executable inexistente de chromium_headless_shell1243. Runner: 1 failed de infraestructura, 1 interrupted, 278 no ejecutados; no se afirma matriz browser aprobada |
| Smoke complementario Chrome del sistema en puerto propio42813 | PASS: 10 tests actuales de playground/drafts en8.6s; baseline de render de siete tipos, last-good JSON, share, keyboard/downloads, axe y recuperación de drafts. No prueba editor futuro ni sustituye matriz bundled |
| `git diff --check` y revisión de alcance | PASS; `src`, `dist`, `schemas`, `site` y lockfile sin modificaciones |

La primera tentativa del smoke usó `reuseExistingServer` y encontró un servicio Python ajeno en4173 que servía un directorio distinto. Se interrumpió y se descarta como evidencia del producto; no se terminó ese proceso. Se repitió con config temporal, `reuseExistingServer:false`, puerto42813 y preview de esta build. Un primer arranque de esa config temporal detectó pnpm12 desde cwd `/tmp`; se corrigió invocando Node22/Vite por rutas explícitas, sin cambiar packageManager ni configuración del repo.

Comando del smoke aislado: `pnpm exec playwright test --config=/tmp/aesthc-editor-spec-smoke.config.ts tests/e2e/playground.e2e.ts tests/e2e/drafts.e2e.ts --grep-invert 'static docs'`. La config temporal fija project chromium con channel chrome, baseURL42813, testDir de este repositorio y Vite preview con strictPort. El test sin JS con URLs4173 hardcoded se excluyó expresamente; los otros diez se ejecutaron. Logs temporales de esta sesión: `/tmp/aesthc-canvas-spec-check-node22.log`, `/tmp/aesthc-canvas-spec-e2e.log`, `/tmp/aesthc-canvas-spec-chrome-isolated.log`. No son artefactos versionados ni garantías de disponibilidad futura.

## Baseline de tamaño observada

- Node22: landing/playground176758 /179200 bytes JS gzip, margen2442; docs105608 /179200.
- Node22 CSS: playground10591 /12288; docs9137 /12288 bytes gzip.
- Node22 tarball:473088 bytes packed,1301221 unpacked,136 archivos.
- Node25 primera corrida: playground176188, docs105307, CSS10588/9141, tarball472357 packed. El tamaño unpacked y los archivos productivos no cambian; no mezclar runtimes al comparar medidas gzip.
- No se midió rendimiento del editor futuro. Los targets de `06-tdd.md` son requisitos propuestos.

## No ejecutado / pendiente para implementación

- RED/GREEN del editor: APIs aún inexistentes; semillas no activadas en el repo de trabajo.
- Benchmarks editor, accesibilidad manual de Studio, export HTML/WebM, React18/19 del editor nuevo y browser matrix completa.
- `pnpm test:frameworks` y `pnpm test:visual` no forman parte de `pnpm check`; no se atribuye su resultado a ese gate.
- Publicación e instalación desde registry, verificación de documentación desplegada y licencia de cualquier código upstream que una implementación decida reutilizar.

## Recuperación del gate browser

Reintentar `pnpm exec playwright install` cuando el CDN esté disponible y ejecutar `pnpm test:e2e` completo con los browsers del lockfile. No reutilizar binarios antiguos renombrándolos como1243. Un smoke con Chrome del sistema puede aportar evidencia limitada, pero no sustituye Firefox/WebKit/mobile ni baselines del runtime fijado.
