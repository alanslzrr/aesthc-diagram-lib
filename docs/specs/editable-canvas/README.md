# Spec de evolución: editable canvas + semantic viewer

> Ejecución aprobada por el usuario. Implementación en curso: consulta [el informe de ejecución](execution/README.md). La trazabilidad mapea cada escenario a su prueba real (`implementedIn`) con estado y evidencia; `file` sigue siendo el destino propuesto.

**Estado:** especificación aprobada; implementación parcial en curso. La trazabilidad distingue 50 escenarios implementados, 24 parciales y 38 sin cobertura localizada (fecha 2026-09-24). Los contratos describen el destino completo, no solo los exports disponibles. No se ha publicado esta evolución.
**Fecha:** 2026-09-22. **Responsable de aprobación:** mantenedor de `@aesthc/diagram-lib`.
**Baseline local:** `cdf37a87c94f9ea17f29c62f45e2128bec627763`, paquete `0.3.0`, canal candidate.
**Referencia auditada:** Archify `1bb61c69538e37d80793b25843f620e55469f3a2`, development `2.17.0-dev.1`.

## Objetivo y resultado

Convertir la biblioteca de visualización en una biblioteca **embebible de edición y comunicación de diagramas**, sin convertir el paquete básico en una aplicación SaaS ni perder los siete formatos existentes. Un consumidor podrá crear, seleccionar, mover, conectar, configurar, deshacer, guardar, restaurar y exportar un documento. Otro consumidor podrá limitarse a leerlo y explorar relaciones, recorridos y presentaciones.

La unidad de persistencia será un documento JSON versionado. La geometría SVG seguirá siendo la representación visual canónica. El editor, el viewer, las exportaciones y la persistencia serán opt-in y compartirán datos e identidad, no estados globales ni copias divergentes del grafo.

**Distinción esencial:** Archify declara WYSIWYG fuera de alcance. Se toma como referencia de comunicación, exploración semántica y entrega portable; la edición visual es trabajo nuevo de esta biblioteca. No se promete compatibilidad directa con su JSON ni se incorpora su skill o su código por instalar este spec.

## Cómo usar este paquete de especificación

1. Leer [evidencia y priorización](01-research.md).
2. Aceptar [alcance y comportamiento](02-product-spec.md) y las decisiones propuestas de [arquitectura](03-architecture.md).
3. Tratar [contratos](04-contracts.md) y [contrato TypeScript verificable](contracts.ts) como el destino de implementación, **no como exports actuales**.
4. Aplicar las reglas de [seguridad, exportación y persistencia](05-boundaries.md).
5. Ejecutar [plan TDD](06-tdd.md), [catálogo trazable](test-catalog.md) y [tareas ordenadas](07-execution.md).
6. Completar [migración, release y Definition of Done](08-migration-release.md).
7. Consultar [verificación de esta entrega](09-verification.md) para distinguir lo ejecutado de lo pendiente.

## Hitos y definición del producto

| Hito | Resultado demostrable | Carácter |
|---|---|---|
| M0 | Contrato, fixtures, validación, identidad y pruebas consumidor | Fundamento obligatorio |
| M1 | Editor útil: siete adapters + graph libre, historial, viewport, inspector, guardar e importar | Núcleo solicitado |
| M2 | Exportaciones públicas y HTML offline; búsqueda, rutas/reach, vistas, calidad y share cards | Evolución completa comprometida por este spec |
| M3 | Comparación exacta, evidencia verificable, perfil de despliegue y motion export | Extensiones valiosas, especificadas pero no bloquean M1/M2 |

M1 no se anuncia como paridad con Archify. M2 es la primera entrega que satisface simultáneamente **editable + configurable + exportable + portable + exploración semántica**. M3 no es una promesa de fecha. Los nombres de hitos no son números de versión npm.

## Decisiones por defecto, sin preguntas bloqueantes

- React 18.3/19, ESM, TypeScript, Vitest y Playwright existentes.
- SVG compartido, store headless por instancia, sin dependencia obligatoria de React Flow, Zustand, servicios cloud o modelos externos.
- Graph libre como tipo **del editor**, sin ampliar por sorpresa el union público `DiagramSpec` de siete tipos.
- Edición local single-user. Persistencia y URL sharing voluntarios; cero telemetría.
- UI en español e inglés, light/dark, Geist, tokens y accesibilidad del repositorio.
- Un documento contiene contenido de un idioma; idioma de controles independiente. No se inventan traducciones.
- JSON/SVG/PNG obligatorios; HTML interactivo offline en M2. JPEG/WebP y portapapeles por detección de capacidad. PDF mediante impresión, no promesa de PDF vectorial nativo. WebM opt-in en M3.
- Conservación de APIs de lectura, ejemplos y schemas actuales. Sin publicación, tags, cambios de cuenta o seguridad en esta tarea.

Si se decide cambiar SVG por otro renderer, añadir colaboración o una nueva dependencia grande, abrir una revisión del ADR correspondiente **antes** de ejecutar la tarea afectada. No están pendientes de una decisión las tareas M0/M1 descritas aquí.

## Verificaciones que sí se pueden ejecutar ahora

Desde la raíz del repositorio, con dependencias instaladas (`pnpm install --frozen-lockfile`) y el paquete construido (`pnpm build`):

```sh
node docs/specs/editable-canvas/verify-spec.mjs
pnpm exec tsc --project docs/specs/editable-canvas/tsconfig.json
```

El primer comando verifica referencias, fixtures y trazabilidad del **spec**; el segundo compila los tipos propuestos contra el contrato actual. Ninguno demuestra que exista el editor. Las semillas RED están fuera de `tests/` para no romper la baseline; el plan explica cuándo copiarlas.

## Entregables incluidos

- Auditoría local/upstream fijada a commits y matriz de valor, no una lista de features deducida del marketing.
- Reglas de UX, semántica por tipo, operaciones, concurrencia local y estados de error.
- Modelo versionado, API headless, límites, transacciones, migraciones y contratos de extensibilidad.
- Estrategia de exportación independiente del DOM interactivo y del viewport.
- Requisitos identificados, casos Given/When/Then, archivos de pruebas destino, dependencias y criterios de cierre.
- Fixtures de los siete tipos, documento graph, multigraph cíclico, datos hostiles y semillas de pruebas concretas.
- Gates de seguridad, accesibilidad, rendimiento, compatibilidad de tarball y release.

La documentación de consumo publicada no se modifica para aparentar disponibilidad. Este paquete vive en `docs/specs/`, fuera de las rutas distribuidas del paquete.
