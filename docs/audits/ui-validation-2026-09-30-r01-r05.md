# Reauditoría R01–R05 — 2026-09-30

## Alcance y veredicto

Auditoría independiente de código, navegador y pruebas sobre el árbol de trabajo existente. No se implementaron correcciones ni se actualizaron referencias visuales. R01–R04 resuelven los casos originales. R05 corrige la documentación, pero parte de su evidencia automatizada sigue siendo más estrecha que sus afirmaciones. No corresponde aprobar la entrega completa: Heyo sigue sin integrarse, las comparaciones visuales fallan y queda un defecto concreto en los targets de resize a zoom bajo.

## Antes / después

| Hallazgo | Antes | Después verificado |
|---|---|---|
| R01 | El componente viewer conservaba su paleta anterior aunque el shell cambiase | Overrides en el componente real; comprobación directa de `.adl-viewer`, controles y fuentes. El viewer claro se ve blanco, con controles claros coherentes. Defaults del paquete separados |
| R02 | Grid con transformación doble | Eliminado `patternTransform`; regresión correlaciona desplazamientos de geometría y puntos |
| R03 | Undo deshacía un cambio de grid, no el drag | Prueba separada: drag, Undo y Redo, dos temas, coordenadas relativas y grid conservado |
| R04 | Opacidad del rect aplicada dos veces | La superficie propia deja su opacidad a la composición del grupo; el negativo concreto se conserva |
| R05 | Guías y migración contradicen implementación | Se documentan cambios globales de geometría, resize múltiple y tabs. Las pruebas nuevas requieren el ajuste de alcance descrito abajo |

## N01 — P2: el target de resize puede ser menor que el marcador visible

Ubicación: `src/editor/index.tsx:1852–1877`.

El clamp evita cubrir el centro del nodo, pero solo reduce el rect interactivo. El marcador sigue midiendo 10×10 px de pantalla con `pointerEvents="none"`.

Reproducción independiente en el navegador:
1. Playground Flowchart, seleccionar `Build + lint` (240×88).
2. Reducir zoom con la toolbar.
3. A zoom mostrado 13 %, marcador 10×10 y target 9.3256×9.3256 px.
4. A zoom mostrado 11 % (real 0.105973…), marcador 10×10 y target 7.4605×7.4605 px.
5. `elementFromPoint` a 0.5 px del borde izquierdo visible del marcador NW devuelve el SVG de la superficie, no el target de resize.

Esto confirma una zona del control pintado que no pertenece a su acción. No se afirma que todo resize esté roto: el centro del target y los controles de teclado siguen existiendo.

Corrección: coordinar geometría visible y hit-test; mantener libre el centro del nodo sin dibujar una affordance fuera de su área efectiva. Si se opta por handles externos o simplificados bajo cierto zoom, documentar y probar la política. No basta con volver a ampliar todos los targets a 44 px y reintroducir la intercepción del drag.

Aceptación: en zoom bajo, punto visible del marcador pertenece a la acción correcta; drag del cuerpo no cambia tamaño; resize conserva ancla opuesta; Undo único. Cubrir ocho direcciones y selección múltiple.

Evidencia: `/tmp/aesthc-r-review/resize-low-zoom.png`.

## N02 — P2: el nuevo unit de legibilidad vuelve a usar una escala incompleta

Ubicación: `tests/gallery-framing.unit.spec.ts:15–20`.

La fórmula `14.5 * min(1, 316 / view.width)` presupone el mismo font-size en todos los tipos y solo limita por anchura. No incorpora la altura del viewport, los estilos reales ni el tamaño tipográfico de cada label. Puede pasar aunque el `meet` real esté limitado por altura.

El test de navegador con `getScreenCTM` sí es la evidencia adecuada; este hallazgo no invalida automáticamente sus resultados. Renombrar el unit como presupuesto de anchura o modelar ambos ejes y la tipografía real. No presentarlo como prueba de un suelo tipográfico efectivo móvil.

## N03 — P2: las pruebas de geometría no verifican todo lo anunciado

Ubicación: `tests/layout-geometry.unit.spec.ts:13–18,76–96`.

- La etiqueta `ENGINEERING` no se mide: el test usa `91.84` fijo. Protege una desigualdad de constantes, no la legibilidad después de un cambio de fuente, tracking o texto.
- El test de export solo comprueba dimensiones globales/viewBox, presencia de container y grid. No compara posiciones/tamaños de nodos, contenedores ni rutas. Su fixture carece de edges.

Corrección: conservar esos checks con nombres precisos; añadir una medición de etiqueta con fuentes cargadas y comparar geometría relevante de un fixture de varias columnas y conexiones entre layout, escena y SVG exportado. Una mutación deliberada de coordenadas de un nodo o ruta debe hacer fallar la regresión de paridad.

## Pendientes de producto y validación

1. Integrar realmente el shell Heyo: `docs/maintainers/heyo-integration.md:29` sigue declarando que no está integrado. El spike SSR demuestra viabilidad, no entrega del sitio.
2. Revisar los diffs visuales actuales y corregir o aceptar cada cambio justificado. No regenerar referencias para obtener verde automáticamente.
3. Ejecutar Firefox/WebKit en un entorno con sus binarios. No se certifican por resultados de Chromium.
4. El entry de landing conserva solo 160 bytes de margen JS. Riesgo de mantenimiento, no defecto funcional ni motivo para subir el umbral preventivamente.

## Evidencia de esta auditoría

- `pnpm check`: exit 0; 402 unit, 2 perf y tarball, además del resto de gates del comando.
- Primera matriz Chromium + mobile-chromium: 360 passed, 49 skipped, 1 failed. Falló inicialización `html[data-theme]` en docs light móvil. Esta ejecución coincidió con el build; no permite atribuir el fallo al producto.
- Caso fallido repetido sin build: 3/3 pass.
- Segunda matriz sin build: resultado registrado al final de este informe.
- Visual, con puerto separado: 1 passed / 3 failed (docs claro, docs oscuro, siete tipos). Sin actualizar referencias.
- Firefox/WebKit y consumidores Vite/Next no reejecutados en esta ronda. El tarball sí forma parte de `pnpm check`.
- Logs y capturas: `/tmp/aesthc-r-review/`.

## Key Learnings:

1. El hit-test debe corresponder con la superficie visible del control, también cuando se limita por zoom.
2. Un cálculo unitario de anchura no sustituye la escala real del texto renderizado.
3. Dimensiones del SVG no prueban paridad de geometría interna.

### Resultado de la repetición sin build concurrente

Chromium + mobile-chromium: **361 passed / 49 skipped / 0 failed**. El fallo inicial no se reprodujo ni en tres repeticiones aisladas ni en la matriz completa repetida; queda como incidencia observada, no como regresión confirmada del producto.
