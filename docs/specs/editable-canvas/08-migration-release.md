# 8. Compatibilidad, migraciones y Definition of Done

## 8.1 Compatibilidad que debe conservarse

| Superficie actual | Compromiso en M0–M2 |
|---|---|
| Root, `/types`, `/layout`, `/layouts`, `/layouts/band` | Exports y firmas de lectura existentes conservados; graph solo por APIs nuevas |
| `/canvas` | `DiagramCanvasProps` actual sigue siendo válido; mismas interacciones y SVG por defecto |
| `/registry`, `/examples`, `/showcase`, `/icons` | Estado compartido cross-entry y registro opcional; no migrar consumidores a store obligatorio |
| Siete specs y LegacyBandSpec | No retirar campos, IDs explícitos intactos, anónimos materializados solo al crear documento editor |
| CSS actual | Sin reset global ni cambio de tokens del host; CSS editor opt-in con nombres scoped |
| React | Peers18.3/19; demos/SSR y use client comprobados para ambos |
| Share `s=` y drafts actuales | Decoder conservado, import explícito; no destrucción de storage legacy |
| Docs y ejemplos | Continúan consumiendo tarball; frozen docs jamás se reescriben |

Añadir exports/types no equivale automáticamente a no-breaking: verificar type inference, estilos, side effects y budgets. Si mantener una firma no es posible, separar un cambio breaking con migration y versión minor pre-1.0 autorizada, no ocultarlo dentro del renderer refactor.

## 8.2 Rutas de migración de consumidor

1. **Solo lectura:** ningún cambio requerido. Seguir con layoutDiagram + DiagramCanvas.
2. **Edición embebida:** importar `createDocument/createEditorStore` desde `/editor-core`, registrar styles editor y montar componentes `/editor`. Guardar el envelope, no solo `spec`, si quiere conservar posiciones/configuración.
3. **Viewer nuevo:** montar `/viewer` con documento; si solo dispone de spec, normalizar una vez fuera de render. No regenerar IDs cada rerender.
4. **Export reusable:** migrar wrappers privados de `site/src/lib/svg-export.ts` a `/export` y `/export/browser`. Preservar nombres de acciones actuales; salida nueva recibe opciones explícitas, no fondo del body.
5. **Persistencia host:** implementar StorageAdapter con token CAS del backend existente. La librería no crea backend, cuenta o permisos. Browser localStorage es un adapter limitado, no una solución multiusuario.
6. **Spec original desde documento:** pedir operación de export legacy con receipt enumerando scene/config/views omitidas. No prometer round-trip del editor desde un JSON de siete tipos.

Guías públicas se escriben en E20 junto con ejemplos compilables para: viewer mínimo, editor gestionado, editor host-owned, custom node SVG, export offline y storage adapter. Los snippets de este spec son de destino; no copiarlos al README principal antes de existir sus exports.

## 8.3 Matriz de degradación

- Browser sin clipboard image: Download PNG + Copy SVG/JSON si texto disponible; un clipboard failure no anuncia copied.
- WebP/JPEG no soportado: formato deshabilitado; no MIME masquerading.
- MediaRecorder/codec ausente: WebM unavailable, mantener SVG/PNG/HTML; no exigir permisos de cámara.
- localStorage denegado/cuota: memory + Download JSON; preservar editor.
- Web Locks ausente: no prometer CAS cross-tab, single-writer/conflict detectado; host puede inyectar adapter fuerte.
- Fuentes offline no resolubles: retry o fallback explícito no verified; artifacts finales deben estar autocontenidos cuando se anuncia standalone.
- JS bloqueado en HTML: SVG y lista estática permanecen; exploración interactiva requiere scripts propios autorizados por CSP.
- Documento futuro: no editar ni reescribir. Descargar original o usar herramienta compatible; no degradarlo silenciosamente a spec.

## 8.4 Definition of Done por hito

### M0

- Schemas generados validan fixtures y rechazan inputs adversos; límites y paths estables.
- IDs explícitos y materializados sobreviven transacciones/serialización.
- Adapters por tipo no pierden semántica; transacciones, rollback, history y stale revision probados.
- Baseline `pnpm check` y caracterización preservadas; no nuevas APIs públicas de UI prometidas.

### M1

- Ocho tipos accesibles en Studio según capabilities; create/edit/connect donde corresponde, move/reorder, config, import, JSON, save/load, undo/redo.
- JSON/SVG/PNG disponibles como APIs de paquete, no solo como botones del site.
- Dos instancias independientes y consumidor tarball externo funcionando.
- Invalid text y storage failures conservan trabajo. Permisos UX/dispatch coherentes.
- No regresión legacy ni aumento oculto de payload landing/docs; dist completo generado.

### M2

- Finder, relation inspector, directed route/reach, lens, minimap, named views y story finito.
- Publish quality con diagnóstico accionable, geometry safe y fuentes verificadas en la prueba que lo afirma.
- HTML offline funcionando, cards exactas, share limits, formatos negociados y export sin estado temporal.
- Extensibilidad registrada confiable, sin ejecutar payloads.
- Todos los escenarios M0–M2 del catálogo verdes, matriz browser y React soportados comprobados.
- Accesibilidad, revisión visual manual, métricas y budgets completos o limitación aprobada/documentada; nunca hidden skip.
- Docs, ejemplos, tarball, migrations, changelog y release candidate coherentes. Sin TODO funcional escondido.

### M3

- Diff exacto validado; evidencia distingue declared/verified; profile opt-in fail-closed.
- Motion/WebM probados con reproducción real y cancelación; capacidad ausente correctamente anunciada.
- Sus escenarios pasan sin reabrir regresiones M2 ni cambiar semántica de documentos existentes.

## 8.5 Release y rollback

Seguir `docs/maintainers/releasing.md`. E21 prepara un candidato y evidencia, **no publica**. No crear tags, GitHub release o ejecutar npm publish sin autorización específica. Local checks no prueban disponibilidad npm; verificar artifact instalado desde registry y docs matching después de publicación autorizada.

Release checklist adicional:

1. Versionar paquete/docs/schema document explícitamente: semver del paquete y schemaVersion son ejes separados.
2. Inspeccionar tarball: entrypoints, CSS, fonts, notices, runtime HTML y schemas nuevos. Sin docs privadas, rutas locales, source maps inesperados ni secrets.
3. Instalar artifact exacto en consumidores limpios React18/19, NodeNext/Bundler, Vite/Next, import server puro; guardar digest.
4. Ejecutar `pnpm release:check`, `pnpm test:frameworks`, `pnpm test:visual` extendido y benchmarks definidos.
5. Hacer human smoke completo M2 desde candidato construido con base Pages. Revisar assets exportados fuera del app.
6. Publicar solo por proceso autorizado. Después verificar npm anónimo, checksum y documentación pública correcta; solo entonces actualizar channel/npmAvailable.
7. Congelar snapshot estable con comando existente, nunca una candidate sin publicación verificada.

Rollback de feature UI: ocultar enlace Studio o restaurar despliegue anterior no borra documentos guardados. Los consumidores de lectura siguen disponibles porque entrypoints originales no cambiaron. Una versión npm publicada es inmutable; corregir con versión nueva, no mover tags. Conservar migradores lectores de documentos anteriores; nunca sobreescribir storage v1 con formato no compatible sin opt-in.

## 8.6 Lo que esta entrega no certifica

No hay editor implementado, nueva versión publicada, integración Archify ejecutada, garantía universal de browser, benchmark de las funcionalidades futuras ni validación legal de assets. El estado real de los comandos ejecutados para preparar el spec está en [09-verification.md](09-verification.md).

> **Actualización 2026-09-26:** este apartado describía la entrega inicial del spec (previa a la implementación). Estado actual: implementación completa del catálogo (112/0/0), aceptación automatizada certificada en CI sobre el commit `1d1156f211d049349961bb4962112f7e4b57bd09`, **revisión humana con lector de pantalla pendiente de persona** y **paquete no publicado** (`diagramRelease.channel: candidate`, `npmAvailable: false`). La distinción de niveles está en [execution/README.md](execution/README.md#cierre-de-aceptación-2026-09-26) y el registro humano en [execution/a11y-checklist.md](execution/a11y-checklist.md).
