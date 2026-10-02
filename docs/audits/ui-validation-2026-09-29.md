# Auditoría independiente de UI e instrumentos — 2026-09-29

## Veredicto: Block — no aprobar el cierre todavía

Hay mejoras reales, pero también defectos visibles y pruebas que aprueban por motivos equivocados. `pnpm check` y Chromium de escritorio pasan; eso no certifica el resultado visual ni la matriz móvil. Esta auditoría no modifica la implementación, no actualiza imágenes de referencia y no crea commits.

Estado inspeccionado: `main`, HEAD `a7d8e24`, más el árbol de trabajo con 193 entradas modificadas/nuevas previo a esta auditoría. **No se auditó solamente HEAD**: la implementación que importa es el árbol sin commits. Los builds ejecutados regeneran `dist`; no se parcheó distribución manualmente ni se descartaron cambios existentes.

## 1. Qué se verificó realmente

- Lectura de fuentes, CSS, tests, configuración, documentación de integración y paquete Heyo instalado.
- Navegación e inspección visual del build local en `http://127.0.0.1:4173` mediante el navegador del agente: landing, galería móvil, playground, docs, Studio y viewer.
- Interacción en playground: drag con commit, Undo, zoom y cambio de ejemplo con recuperación de cámara/selección/historial.
- Búsqueda de documentación, navegación a la guía del editor y cambio de tema. El tema y el viewport usados para inspección se restauraron.
- Ejecución nueva de `pnpm check`, Chromium completo, mobile-chromium completo, repetición serial de los nueve fallos móviles, frameworks Vite/Next y comparaciones visuales sin actualizar referencias.
- Intento nuevo de arranque de Firefox/WebKit: faltan sus ejecutables en la caché actual. **No es correcto reutilizar como resultado actual la explicación anterior del sandbox o de descargas**: esta ronda se bloqueó antes, al lanzar el navegador.
- Prueba SSR independiente del mismo `@heyo-sh/heyo-docs@3.3.0`, con el mismo manifiesto y tema, cambiando únicamente la representación de los slugs.

No se han vuelto a certificar todas las combinaciones posibles de los 112 escenarios históricos, el presupuesto de frames del runner de referencia, memoria de 50 ciclos, React 18 separado ni todos los estados de hover/loading/error de cada componente. Tampoco se inspeccionó motion a velocidad reducida en DevTools. No presentar este informe como una certificación absoluta de todo el producto.

## 2. Hallazgos por causa raíz

En la columna «Después» se describe el resultado exigido, **no un cambio ya realizado**.

| ID / severidad | Principio y ubicación                                                                                                                     | Antes: estado comprobado                                                                                                                                                           | Después: criterio de solución                                                                                     | Impacto                                                                                            |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| A01 · Alta     | Orden de capas. `src/editor/index.tsx:1332–1342,1751–1761`                                                                                | `BaselineLayer` contiene los nodos confirmados en un SVG anterior. `ViewportGrid` está en el SVG siguiente, pintado encima. Los puntos se ven dentro de tarjetas opacas en Studio. | Fondo/cuadrícula debajo de baseline y delta; hit targets y controles encima.                                      | El supuesto fondo interfiere con nodos y texto; opacidad 1 de los rellenos no protege del overlay. |
| A02 · Alta     | Evidencia reproducible. `tests/heyo-shell-spike.unit.spec.ts:23–24,37,51–60`; `docs/maintainers/heyo-integration.md:40–48`                | El spike usa `slug: 'guides/editor'` con `pathname: '/guides/editor'`. Renderiza 404 y llama a eso una limitación SSR.                                                             | Slugs canónicos y aserciones positivas de contenido/navegación; documentación corregida.                          | Una integración pendiente se está justificando con un experimento inválido.                        |
| A03 · Media    | Instrumentación ejecutable. `tests/e2e/diagram-backdrop.e2e.ts:6,211–217`                                                                 | `TYPES` contiene `state-machine`/`timeline`, pero las ramas comparan con `example-state-machine`/`example-timeline`. Nunca entran.                                                 | Casos independientes que ejecuten ambas aserciones, con claves correctas.                                         | Las dos regresiones de escala anunciadas no existen como protección efectiva.                      |
| A04 · Media    | Contraste efectivo. `tests/e2e/diagram-backdrop.e2e.ts:143–154`                                                                           | `toRgb()` devuelve alpha, pero `a: paintOpacity` lo sustituye. Una tinta transparente puede aprobar como opaca.                                                                    | Componer el alpha del color y las opacidades, con negativos explícitos.                                           | Persiste un falso positivo pese a que el caso de grupo al 40 % ahora está bien calculado.          |
| A05 · Alta     | Legibilidad responsive. `site/src/styles.css:39–58,77–87`; `site/docs/docs.css:671–687`                                                   | State machine tiene un stage de 500 px de alto en móvil con etiquetas visualmente diminutas; docs falla con tamaño efectivo 7.8146 px frente al mínimo 11.                         | Encuadre/fixtures responsive que respeten legibilidad, aspecto y contenido; no reducir umbrales.                  | El dibujo cabe, pero no se puede leer. El espacio vacío permanece mientras el texto se comprime.   |
| A06 · Media    | Contrato de estado responsive. `src/editor/styles.css:352–357`; `src/editor/index.tsx:292–307`                                            | En móvil el texto dirty se oculta; siete tests todavía exigen que ese texto sea visible.                                                                                           | Estado compacto comprensible y contrato de pruebas consistente, manteniendo comprobaciones de dirty/historial.    | La matriz actual está roja. No demuestra por sí sola que pinch, IME o export estén rotos.          |
| A07 · Media    | Consistencia entre superficies. `site/src/viewer/main.tsx:6–8`; `site/src/viewer/viewer.css:3–24`; `src/viewer/DiagramViewer.tsx:144–150` | Viewer declara Geist, no carga fuentes; paleta gris-azulada anterior, margen exterior nativo y cuadrícula limitada al documento.                                                   | Fuentes y host tokens compartidos; política explícita de tema y backdrop del viewport sin contaminar exportación. | No se ha entregado el mismo sistema visual en todas las superficies.                               |
| A08 · Media    | Contrato público. `src/canvas/DiagramCanvas.tsx:42–51`                                                                                    | Nuevas props públicas `showGrid` y `fit` sin cobertura explícita en docs API/migración ni ejemplo de contrato contra tarball.                                                      | Documentar defaults/alcance y compilar un consumidor que use ambas props.                                         | Una capacidad de presentación ya usada por el sitio queda sin contrato público explicado.          |

## 3. Instrucciones técnicas y RED → GREEN por hallazgo

### A01 — La cuadrícula está delante del baseline

**Reproducción:** abrir Studio con su documento inicial y tema claro. Dentro de las tarjetas «Web client», «Order API», «Orders» y «Email worker» se ven puntos. No es transparencia de esas tarjetas: el patrón se pinta después.

Inspección DOM ejecutada sobre `.adl-editor-surface > svg`:

```text
SVG 1: position absolute; 4 node surfaces; 0 grids; baseline
SVG 2: position relative; 0 node surfaces en reposo; 1 grid; interacción/delta
```

La separación incremental está bien motivada por rendimiento. El error es colocar la cuadrícula en la capa superior, no mantener un baseline persistente.

Orden necesario:

```text
background del viewport
cuadrícula decorativa con fade
geometría confirmada persistente
geometría temporal del gesto
selección / handles / hit targets
```

**RED:** crear una regresión en Studio y playground que active/desactive la cuadrícula y compare píxeles en una zona interior de tarjeta sin texto ni bordes. Esa región debe permanecer idéntica; una región exterior sí debe cambiar. Repetir antes del drag, durante el preview y después de commit/Undo, en ambos temas. El test de `fill-opacity: 1` no sustituye esta prueba.

**Implementación:** sacar el patrón de la capa que cubre el baseline o reordenar capas con una única cuadrícula inferior. Conservar transformaciones de cámara idénticas y eventos únicamente en la capa interactiva. No volver a reconstruir los 1000 nodos por frame. No eliminar el fade ni esconder el defecto desactivando la cuadrícula.

**GREEN:** ningún punto sobre superficies opacas; patrón continuo en el viewport; labels/edges/control handles sin máscara; drag, cancelación y Undo mantienen la misma apariencia de relleno. Revisar también la fase del patrón al pan para que la cuadrícula siga coordenadas coherentes, no solamente que cubra las esquinas.

### A02 — El spike de Heyo prueba un 404, no una limitación del paquete

El modelo del paquete instalado normaliza el pathname con `/` inicial y resuelve la página por igualdad exacta con `page.slug`. Los identificadores del manifiesto pueden ser referencias sin `/`; eso **no significa** que el registro runtime de páginas deba usar la misma representación sin normalizar.

Resultado independiente, mismo paquete/configuración/`grainTheme`, sin DOM:

| Slugs del registro | Pathname         | 404 | Contenido correcto      | Link a editor   |
| ------------------ | ---------------- | --- | ----------------------- | --------------- |
| Sin `/` inicial    | `/index`         | Sí  | No                      | No              |
| Sin `/` inicial    | `/guides/editor` | Sí  | No                      | No              |
| Con `/` inicial    | `/index`         | No  | `CONTENT-index`         | No, grupo Start |
| Con `/` inicial    | `/guides/editor` | No  | `CONTENT-guides/editor` | Sí              |

**Conclusión limitada y correcta:** el runtime sí puede producir artículo y navegación con SSR cuando recibe páginas válidas. Esto no certifica todavía la integración real del sitio, rutas bajo `/docs/`, hidratación, búsqueda ni navegación sin JS. Pero invalida la afirmación «el shell no emite contenido/anchors y necesita el template para poder hacerlo» como resultado del experimento actual.

**RED:** registrar páginas con contenido diferente por ruta y slugs válidos. Asertar artículo esperado, ausencia de artículo ajeno, enlaces del grupo correspondiente y ausencia de «Page not found». Añadir una ruta inexistente que **sí** deba renderizar 404. No utilizar longitud de HTML como sustituto de igualdad ni como prueba de contenido correcto.

**Implementación:** normalización explícita `manifest reference → runtime slug → deployment URL`. Definir raíz (`/` frente a `/index`), rutas index anidadas, base de GitHub Pages y trailing slash. Evitar `DocsApp as never`/props `as never` que esconden incompatibilidades del spike.

**Documentación:** corregir la sección de resultados en `heyo-integration.md` y reconciliarla con su sección final, que todavía dice que el spike no prueba ni refuta no-JS. No presentar MDX/plugin/framework mode como necesidad demostrada por el falso 404. Son opciones de integración que hay que evaluar contra el contrato real.

**Entrega pendiente real:** montar la experiencia Heyo solicitada. La app sigue usando su shell propio. Una integración de manifiesto es útil, pero no equivale a la interfaz pedida. Conservar Geist/Vercel, búsqueda, URLs, estáticos sin JS, Markdown y snapshots versionados; medir el bundle real antes de cambiar presupuestos.

### A03 — Las dos ramas de escala no se ejecutan

El cambio a `Math.hypot(matrix.a, matrix.b)` es correcto para medir la escala del texto en el render inspeccionado. Lo que falla es la regresión adicional:

```ts
const TYPES = ['band', 'flowchart', 'sequence', 'state-machine', 'er', 'timeline', 'swimlane']
// Nunca puede ser true:
if (type === 'example-state-machine') {
  /* ... */
}
if (type === 'example-timeline') {
  /* ... */
}
```

**RED/GREEN:** crear dos tests nominales, uno altura-limitante y otro ancho-limitante, con fixture y viewport conocidos. Deben fallar al sustituir la escala real por `width/viewBoxWidth` en el primero. Usar las claves correctas, no solamente editar comentarios.

La comprobación actual de tamaño usa `.find(fontSize >= 13)`: mide **un** label, no todos los principales. Identificar explícitamente labels principales y comprobar el mínimo de todos ellos. Añadir 390/768 a 1280/1718. El proyecto llamado mobile-chromium no garantiza cobertura móvil cuando el propio test cambia el viewport a 1280/1718.

### A04 — Se pierde el alpha del color

El caso nuevo de tarjeta `#202020`, tinta `#808080`, grupo al 40 % y exterior `#fafafa` sí tiene la composición esperada. No cierra el instrumento completo.

Contraejemplo deducible directamente del helper: `stroke: rgb(0 0 0 / 0)` sobre blanco. `toRgb()` devuelve alpha 0; después se reemplaza por `strokeOpacity = 1`. El helper evalúa negro opaco sobre blanco, 21:1, mientras el resultado visible es blanco sobre blanco, 1:1.

**RED:** añadir casos con alpha de color 0 y 0.01, otro que combine alpha del color con `stroke-opacity`, y otro con `fill-opacity` de la superficie. Asertar colores finales y ratio, no solamente que sean menores que 3.

**Implementación:** en el caso local, usar `paint.a * paintOpacity`, preservar cero e incluirlo en `minimumOpacity`. Resolver también las opacidades de la superficie adyacente: actualmente se inspecciona su color, pero se ignora su `fill-opacity`. No declarar soporte general de todas las composiciones SVG basándose en una única superficie opaca dentro de un único grupo.

**GREEN:** los negativos detectan invisibilidad real; los positivos de los siete tipos siguen pasando. Complementar cálculo de contraste con pruebas de orden de pintura como A01: un calculador de colores no detecta que otro elemento se dibuje encima.

### A05 — «Cabe» no equivale a «se lee»

En galería móvil de 390 px, State machine mantiene un stage de 500 px con gran cantidad de vacío; su dibujo se reduce hasta mostrar cajas de texto de aproximadamente 5 px de alto en pantalla. Esa cifra describe la caja visible observada, no pretende ser `font-size` CSS ni el resultado CTM del test de escritorio.

En docs hay además evidencia automatizada determinista: los tests light/dark fallan con tamaño efectivo **7.814641744548287 px**, mínimo esperado **11 px**. El preview usa `width:100%; height:auto`, y el propio test comprueba la proporción del SVG; no es una comparación visual obsoleta ni una descarga que haya fallado.

**RED:** probar todos los tipos a 390/768/1280/1718, con todos los labels principales y ambos temas. Separar legibilidad, clipping y ausencia de scroll; son tres condiciones distintas.

**Implementación:** ajustar fixtures y encuadre por tipo/breakpoint. En presentaciones estáticas, usar bounds útiles con padding explícito y suficiente altura real para su composición; quitar espacio vacío autorado cuando no representa contenido. Si no cabe una composición compleja legible, utilizar un ejemplo mínimo adaptado, sin falsear el ejemplo de código asociado. No aplicar una transformación CSS que deforme el SVG. No cortar nodos interactivos ni ocultar focos.

**GREEN:** los mínimos ya fijados se cumplen en móvil y desktop; no se reduce el dataset/umbral para hacer pasar el test, no se añade scroll horizontal al showcase y no se consigue legibilidad amputando nodos. Las alturas deben responder a la composición, no permanecer en 500 px por inercia.

### A06 — Nueve fallos móviles, dos causas; no nueve features averiadas

Los nueve fallos se repitieron con un único worker: no son ruido de concurrencia.

- Dos corresponden a A05: previews docs light/dark.
- Siete esperan `No pending changes` o `Unsaved changes` visible cuando el CSS lo oculta a ≤900 px. Ocurren en teclado, composición IME, fallos de raster/encoding y pinch.

El componente conserva `role="status"` y `aria-label` dinámico; por eso **no hay evidencia suficiente para declarar esas siete features rotas**. Sí hay una inconsistencia de contrato que impide cerrar el gate, y un indicador móvil reducido a un punto cuyo cambio visible depende del color.

**RED/GREEN:** definir una presentación compacta comprensible del estado y probar tanto su representación visible como su nombre/estado semántico. Si se mantiene el punto, añadir una distinción no dependiente únicamente del color. Actualizar los tests para el contrato correcto (`role=status`/nombre y estado observable), conservando assertions de documento, undo y ausencia de commits indebidos. No convertir los siete casos en skips ni limitarse a `.toBeAttached()`.

### A07 — Viewer quedó fuera de la unificación visual

Inspección de recursos del documento viewer: **0 fuentes**, dos hojas CSS. Las hojas importadas no incluyen `@font-face`; `font-family: Geist` por sí solo no carga Geist. Studio, en contraste, sí solicitó los dos WOFF2; landing tiene la comprobación de FontFaceSet en `adoption.e2e.ts`, que pasó.

Además, `.viewer-shell` y `.adl-viewer` mantienen `#e9eef4/#202b38/#aebdcd`, diferentes de los tokens blanco/negro usados en la dirección aprobada. La captura muestra margen exterior nativo y un rectángulo blanco con puntos dentro de un canvas gris-azulado. `renderSvg` conserva el fondo/grid del documento; no hay una capa de viewport equivalente a la del editor.

**RED:** carga directa de viewer en contexto limpio; verificar ambas caras de fuente realmente cargadas, no solo `fontFamily` declarado. Verificar host claro/oscuro, margen del body y continuidad/fade del fondo al pan/zoom. Extender estas aserciones a todas las entradas, no asumir que importar `design-system.css` aporta fuentes, reset y tokens completos.

**Implementación:** compartir fuentes y tokens del host sin depender de haber visitado la landing antes. Separar el tema del host de los datos importados con una política explícita de presentación. Mantener la autonomía del componente de librería y los exports: quitar el artboard de la vista interactiva no debe quitar el fondo solicitado a un SVG exportado. No modificar silenciosamente el documento para sincronizar el chrome.

### A08 — Completar el contrato de las props públicas

`showGrid?: boolean` y `fit?: 'natural' | 'contain'` son API pública, no una modificación privada del sitio. Están en tipos y JSDoc, pero no aparecen en la búsqueda de docs API/migración ni tests explícitos del contrato público.

Documentar defaults, relación entre grid propio y del host, `natural` frente a `contain`, escalado y responsabilidades de legibilidad. Agregar ejemplo compilado contra el tarball y una prueba de defaults compatibles. Actualizar el generador de documentación, no su salida manualmente; registrar la adición en notas de cambio/migración conforme a AGENTS.md.

## 4. Verificación de cada afirmación del último reporte

| Afirmación                                                  | Evaluación independiente                                                                                                               |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| La escala usa `getScreenCTM()`                              | Confirmada en código; gate ≥10 pasa a 1280/1718. No certifica móvil.                                                                   |
| Hay regresiones explícitas altura/ancho                     | Refutada: ambas ramas son inalcanzables por claves incorrectas.                                                                        |
| Hay 12 casos de etiquetas + export                          | Confirmado: 13 pasan en Chromium. Los 12 casos de zoom se saltan en móvil; el export corre en Chromium, incluyendo el proyecto móvil.  |
| El idioma se fija por caso y se comprueba el zoom alcanzado | Confirmado. La tolerancia es max(2, 5 %) y se falla tras 12 pasos si no llega.                                                         |
| El export solo se salta en WebKit                           | Confirmado en el código. El skip por browserName también rige fuera del entorno local; la prueba no certifica ese export en CI WebKit. |
| Composición de contraste completa                           | Parcial. El caso al 40 % está corregido; el alpha de la tinta sigue perdiéndose y la pintura superpuesta queda fuera del instrumento.  |
| Heyo no emite artículo/nav por SSR                          | Refutada por prueba independiente con slugs válidos. El test actual observa un 404.                                                    |
| Heyo shell todavía no está montado                          | Confirmada. Es trabajo de producto pendiente, no solo documentación.                                                                   |
| `pnpm check` pasa                                           | Reejecutado y confirmado.                                                                                                              |
| Chromium 196/3/0                                            | Reejecutado y confirmado.                                                                                                              |
| Mobile no reejecutado en la ronda reportada                 | No se infiere nada de cifras antiguas. Esta auditoría lo ejecutó: 147/43/9.                                                            |
| Referencias visuales fallan, no actualizadas                | Reejecutado: 1 pasa / 3 fallan. No se regeneraron durante esta auditoría.                                                              |

## 5. Qué sí mejoró y no debe romperse de nuevo

- La matriz de etiquetas de conexión es real ahora: locales aislados, zoom alcanzado y SVG exportado medido.
- `monoLabel` conserva `start` por defecto y usa `middle` en las cápsulas necesarias.
- Las capas decorativas de galería/docs usan máscara radial separada del contenido. Los tests existentes confirman una capa, sin grid SVG duplicado en esas superficies.
- Los nodos y estructuras del renderer tienen tokens separados de hairlines del panel. Esto es una mejora real aunque el instrumento necesite A04.
- La toolbar observada ya no presenta el solapamiento original; las acciones se agrupan y el zoom no se parte en dos líneas.
- El playground observado no muestra un selector de tema de documento independiente del switch del host.
- Drag de Band sí mueve un nodo con commit; un Undo devuelve el estado limpio. Cambio de ejemplo conserva la cámara probada a 77 %, selección y disponibilidad de historial.
- La búsqueda de docs devuelve resultados y el router navega a la guía del editor. El shell propio funciona; eso no lo convierte en el shell Heyo.
- Geist sí se carga en las superficies donde están los WOFF2 y sus comprobaciones; no atribuir todos los defectos a una fuente inexistente. La omisión encontrada es específica del viewer.
- Vite y Next pasan build, hidratación, estilos y commit/undo contra el paquete.

### Alcance residual de componentes prohibidos

`site/src/components/primitives/Disclosure.tsx` todavía contiene el componente `<details>/<summary>` con chevron (`path="m6 9 6 6 6-6"`). No se localizaron consumidores activos fuera de su definición: **es deuda residual de código, no un accordion visible demostrado en esta ronda**. Si se mantiene el requisito literal de no conservar ese componente en el repositorio activo, retirarlo junto con sus estilos después de verificar referencias. No confundir flechas de conexión o indicadores de selects con el accordion rechazado.

## 6. Resultados de ejecución propios

| Gate                                                    | Resultado de esta auditoría                                                                                        |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `pnpm check` / Node 22.23.2                             | PASS: 389 unit, 2 perf, 13 tarball; lint/format/icons/schemas/docs/typecheck/build/site/budgets.                   |
| Chromium completo                                       | 196 passed / 3 skipped / 0 failed.                                                                                 |
| Mobile Chromium completo                                | 147 passed / 43 skipped / 9 failed.                                                                                |
| Total Chromium + Mobile Chromium                        | 343 passed / 46 skipped / 9 failed.                                                                                |
| Repetición móvil, un worker, nueve fallos seleccionados | 9 failed; mismos dos motivos.                                                                                      |
| Matriz etiquetas Chromium                               | 13/13, incluida en la ejecución completa.                                                                          |
| BG/contraste existentes Chromium                        | 8/8, con las limitaciones A01/A03/A04.                                                                             |
| Vite/Next consumidores                                  | PASS en build, hidratación, estilos, selección y commit/undo.                                                      |
| Snapshots congelados                                    | Test incluido en Chromium completo: PASS.                                                                          |
| Visual, sin actualizar imágenes                         | 1 passed / 3 failed: docs claro, docs oscuro y siete tipos. Landing presentation pasa.                             |
| Firefox / WebKit smoke                                  | No ejecutables: faltan `firefox-1543/.../firefox` y `webkit-2359/pw_run.sh`. No hay resultados funcionales nuevos. |
| iPhone/WebKit                                           | No reejecutado; comparte la falta de binario WebKit.                                                               |
| Frame de referencia / memoria / React 18 separado       | No reejecutados. No se hereda aprobación de otra sesión.                                                           |

Presupuestos observados: landing JS **178987 / 179200 bytes gzip**, margen de **213 B**. Playground JS 181559 / 184320 y CSS 11950 / 12288; docs CSS 11739 / 12288. Pasan, pero la futura integración Heyo y las correcciones deben medirse; no aumentar techos para ocultar incrementos sin análisis.

Los tres fallos visuales no prueban automáticamente tres defectos nuevos: hay cambios intencionados frente a referencias anteriores. Tampoco prueban aprobación visual. Clasificar los diffs por causa, corregir los defectos reales y solo entonces actualizar las referencias correspondientes, sin subir tolerancias para absorberlos.

## 7. Orden de ejecución recomendado para el agente implementador

1. **A01:** reparar orden de pintura y añadir regresión visual de tarjetas opacas, preservando renderer incremental.
2. **A03/A04:** cerrar falsos positivos del instrumento antes de volver a usarlo como evidencia.
3. **A05:** resolver mobile framing/legibilidad; mantener mínimos existentes y verificar todos los labels principales.
4. **A06:** reconciliar estado responsive y tests; volver a ejecutar los nueve casos y después el proyecto móvil completo.
5. **A02:** corregir el spike y el mapa de Heyo; continuar la integración real sin basarse en el 404.
6. **A07/A08:** completar viewer y contratos públicos. Reejecutar consumidores empaquetados.
7. Revisar diffs visuales reales, generar únicamente referencias justificadas y ejecutar los gates actuales sobre el mismo árbol/commit final.

Cada entrega debe enumerar escenarios probados, comando, resultado, entorno y límites. No usar «todos los tests pasan» cuando solo se ejecutó el proyecto Chromium. No convertir fallos de UI en supuestas limitaciones del entorno. Mantener commits granulares por responsabilidad cuando se autorice implementarlos/commitearlos.

## 8. Evidencia reproducible y conservación

Directorio local de evidencias: `/tmp/aesthc-audit-20260929/` (temporal; conservar los archivos necesarios antes de limpiar `/tmp`).

- `check.log`, `e2e.log`, `mobile-repeat.log`, `frameworks.log`, `visual.log`, `browser-smoke.log`.
- `heyo-probe.log` y HTML `heyo-{canonical,malformed}-{index,guides-editor}.html`.
- `gallery-mobile.png`: State machine pequeña dentro de un stage de 500 px; descripción textual en A05 para lectores sin imágenes.
- `studio-light.png`: puntos sobre las cuatro superficies de nodo; A01 explica el orden de capas.
- `viewer-light.png`, `viewer-assets.json`: paleta anterior, artboard acotado, cero fuentes descubiertas en esa página.
- `docs-editor-light.png`: shell actual propio, navegación y jerarquía verificadas.
- `e2e-artifacts/`, `mobile-repeat/`, `visual-artifacts/`, `browser-smoke/`: capturas/traces de la ejecución.
- `status-before.txt`, `tracked-before.patch`: contexto del árbol previo, no un commit de aprobación.

Comandos para reproducir los gates, con puertos separados para no interferir con el preview 4173. Los logs anteriores son la evidencia de las ejecuciones de esta auditoría:

```sh
export PATH=/Users/alansalazar/.nvm/versions/node/v22.23.2/bin:$PATH
pnpm check
PLAYWRIGHT_PORT=43915 pnpm exec playwright test --project=chromium --project=mobile-chromium
pnpm test:frameworks
# La comparación visual se ejecutó con VISUAL_REGRESSION, sin update-snapshots.
# Consultar visual.log para los cuatro tests seleccionados y sus resultados.
PLAYWRIGHT_PORT=43918 pnpm exec playwright test --project=mobile-chromium --workers=1 \
  --grep='layout previews preserve|full editing workflow|shortcuts do not|composition left|JSON draft stays|raster image failures|null canvas blob|two-finger'
```

Reproducción mínima de la diferencia SSR, desde la raíz del repositorio:

```sh
node --input-type=module <<'JS'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { DocsApp } from '@heyo-sh/heyo-docs'
import { grainTheme } from '@heyo-sh/heyo-docs/theme/grain'
import config from './heyo-docs.config.mjs'

for (const canonical of [false, true]) {
  const pages = ['index', 'guides/editor', 'api/index'].map((id) => ({
    slug: canonical ? `/${id}` : id,
    title: id,
    description: 'Spike page',
    content: () => createElement('p', null, `CONTENT-${id}`),
    tableOfContents: [],
    seo: { title: id, description: 'Spike page' },
  }))
  const html = renderToStaticMarkup(createElement(DocsApp, {
    config, pages, pathname: '/guides/editor', theme: grainTheme,
  }))
  console.log({
    canonical,
    notFound: html.includes('Page not found'),
    article: html.includes('CONTENT-guides/editor'),
    navigation: html.includes('href="/guides/editor"'),
  })
}
JS
```

## Referencias de criterio

Se usaron las instrucciones del repositorio, `DESIGN_SYSTEM.md`, las skills locales `better-ui` y `emil-design-eng`, y las [Web Interface Guidelines de Vercel](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md). La inspección de Heyo se hizo contra el paquete **instalado y fijado**, no suponiendo comportamiento de otra versión: [repositorio de referencia](https://github.com/heyo-sh/heyo-docs).

La decisión final es **Block** hasta cerrar los defectos de UI y las pruebas inválidas descritas. Esto no equivale a rechazar lo ya corregido ni a exigir una reescritura completa.
