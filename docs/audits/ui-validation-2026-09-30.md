# Reauditoría crítica de A01–A08 — 2026-09-30

## Veredicto

**No aprobar todavía el cierre completo. Sí reconocer y conservar las correcciones verificadas.**

Esta ronda corrige problemas importantes de la anterior: pintura del grid sobre tarjetas, experimento SSR inválido, ramas de escala inalcanzables y fallos móviles. No corresponde repetir que nada mejoró. Sin embargo, siguen abiertos el tema real del viewer, la fase del grid del editor y dos falsos positivos de los instrumentos. Además, la documentación mantiene contradicciones y la experiencia Heyo todavía no está montada.

Auditoría del árbol de trabajo de `main`, HEAD `a7d8e24`, con **238 entradas modificadas/nuevas previas**, no solamente de HEAD. Raíz: `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib`. No se corrigió implementación, no se actualizaron referencias visuales y no se crearon commits. Las rutas de código indicadas dentro de este informe son relativas a esa raíz.

## 1. Verificación independiente ejecutada

| Comprobación | Resultado nuevo de esta auditoría |
| --- | --- |
| `pnpm check`, Node 22.23.2 | PASS: **397 unit en 50 archivos, 2 perf, 14 tarball**, además de lint, formato, iconos, schemas, docs, tipos, build y presupuestos. |
| Chromium completo | **200 passed / 3 skipped / 0 failed**. |
| Mobile Chromium completo | **158 passed / 45 skipped / 0 failed**. |
| Total de ambos proyectos | **358 passed / 48 skipped / 0 failed**. |
| `pnpm test:frameworks` | PASS: Vite 7.3.6 y Next 15.5.25, tarball, build, hidratación, estilos, selección y commit/undo. |
| `pnpm test:visual` | **1 passed / 3 failed**: previews docs light, docs dark y siete tipos. Sin regenerar referencias ni subir tolerancias. |
| Firefox / WebKit, intento focal nuevo | Bloqueados **antes de ejecutar el test**: faltan `firefox-1543/.../firefox` y `webkit-2359/pw_run.sh`. Existe una caché WebKit anterior, pero no el ejecutable solicitado por esta configuración. |
| Navegador del agente | Inspección directa de viewer, playground, galería móvil y docs; pan medido, secuencia de Undo reproducida, screenshots vistos. |
| Frames precalculados de galería | Comparados adicionalmente con `previewBounds(layoutDiagram(spec))` en **EN y ES**: 14/14 coincidencias. El unit del repo solo recorre EN. |
| Conservación | `git diff --binary` antes/después de los gates es byte-idéntico. SHA-256: `4da268d1b266e75ebe0f06712a6d4130216b93176bc557322b821f1767b3fbc0`. |

Las suites anteriores incluyen las regresiones de labels, toolbar, tema global, sesiones, drag, import y snapshots congelados. No equivalen a certificar cualquier estado posible. No se reejecutaron el proyecto iPhone/WebKit, React 18 separado, el protocolo de frames del runner de referencia ni los 50 ciclos de memoria. Tampoco se comprobó la procedencia de la descarga manual del binario de Chromium. No heredar aprobaciones de otras sesiones.

## 2. Estado exacto de los ocho hallazgos anteriores

| ID | Estado ahora | Evidencia y límite |
| --- | --- | --- |
| A01 — Grid sobre baseline | **Causa original corregida; cobertura de Undo incompleta.** | `src/editor/index.tsx:672–682`: grid antes de `SceneMarkup`, ambos en el baseline. Los 3 tests nuevos pasan. Su rama “undone” no deshace el gesto: ver R03. La fase tiene otro defecto, R02. |
| A02 — Spike Heyo probaba 404 | **Corregido.** | `tests/heyo-shell-spike.unit.spec.ts:23–24,44–64`: slugs canónicos, artículo propio presente, ajeno ausente, enlaces hermanos y 404 real. Ambos tests pasan. Esto prueba SSR de ese contrato, no integración del sitio. |
| A03 — Ramas de escala muertas | **Corregido.** | `diagram-backdrop.e2e.ts:195–225`: todos los labels principales, CTM real, cuatro anchos y ramas alcanzables para state-machine y swimlane. |
| A04 — Alpha del color descartado | **Ese defecto está corregido; instrumento aún incompleto.** | Se multiplica `paintOpacity * paint.a`, y se contempla `fillOpacity`. Los negativos añadidos pasan. Persiste la doble aplicación de `opacity` del elemento: R04. |
| A05 — Legibilidad móvil | **Mínimos de los fixtures actuales verificados.** | Galería ≥10 px para labels principales; docs ≥11 px en la matriz ejecutada. No significa que todos los textos secundarios o cualquier diagrama grande tengan esa legibilidad. Los ejemplos ahora son considerablemente más simples: ver sección 4. |
| A06 — Status/móvil | **Corregido en la matriz ejecutada.** | Nombre de `role=status` y señal de forma limpio/sucio; los 9 fallos anteriores ya no aparecen. Mobile Chromium 158/45/0. |
| A07 — Viewer visualmente separado | **Parcial.** | Fuentes cargadas, margen 0, backdrop de viewport y ausencia de grid de artboard sí. Los tokens del componente hijo siguen siendo los anteriores: R01. |
| A08 — Contrato de presentación | **Props/helper documentados y probados contra tarball.** | `tests/fixtures/package-consumer/package.test.mjs:350–376` verifica defaults, override de viewBox, grid y min-width. La frase de compatibilidad necesita matiz por cambios globales de geometría: R05. |

`Disclosure` residual fue retirado. No se encontraron `<details>/<summary>` en los paneles del editor revisados. Permanece `ExportMenu`, un menú de descarga con glyph y marcador nativo oculto; no es evidencia de que haya vuelto el accordion con flecha rechazado. Si se desea prohibir el elemento HTML `details` incluso en menús sin flecha, tratarlo como un alcance distinto y explícito, no mezclarlo con el hallazgo ya corregido.

## 3. Hallazgos abiertos, causas y criterios de cierre

En **After** se describe el resultado requerido; esta auditoría no lo implementó.

| ID / prioridad | Before — estado comprobado | After — solución exigida | Why |
| --- | --- | --- | --- |
| R01 · Alta | Header blanco del viewer, componente interior azul-gris y controles con paleta anterior. | Tokens efectivos coherentes en el componente, no solo en su padre; fallback del paquete conservado. | La personalización del host se sobrescribe en el hijo y el nuevo test mide el nodo equivocado. |
| R02 · Media | Pan de 5 px: geometría +5 px; patrón de puntos +10 px, módulo su paso. | Puntos y geometría comparten un único transform de cámara. | La fase se aplica además de la transformación que ya tiene el grupo SVG. |
| R03 · Media | La rama “undone” deshace `Show grid=true`. El nodo mantiene el estado posterior al gesto. | Undo del gesto comprobado mediante posición/estructura e historial, sin toggles intermedios contaminándolo. | Un diff de píxeles cero no demuestra restauración si las dos capturas tienen el grid apagado. |
| R04 · Media | `opacity` del mismo rectángulo se aplica a su fill y de nuevo a toda la superficie. | Composición por capas donde cada opacidad se aplica exactamente una vez. | Hay un caso que informa 3.16:1 cuando el contraste correcto es 2.09:1. |
| R05 · Media | Migración afirma preservar output de consumidores; geometría global cambió. Guía dice que resize múltiple sigue pendiente. | Documentación coherente con comportamiento y pruebas actuales, con cambios de geometría expresos. | Una guía que compila puede describir mal el producto. |

### R01 — El viewer sigue usando su paleta anterior dentro del shell

**Archivos:** `src/viewer/styles.css:1–20`, `site/src/viewer/viewer.css:6–26`, `tests/e2e/editor-viewer.e2e.ts:180–214`.

El host define `--adl-*` en `.viewer-shell`. Pero `.adl-viewer` vuelve a declarar esas propiedades en el hijo. Una declaración propia del hijo gana frente al valor heredado del padre, con independencia de lo fuerte que parezca el selector del padre.

Medición nueva en `/viewer.html`:

```text
.viewer-shell                     background rgb(255,255,255)
.adl-viewer[data-theme=light]      background rgb(233,238,244)   #e9eef4
.adl-viewer-controls input         background rgb(249,251,253)  #f9fbfd
.adl-viewer-controls input         border     rgb(174,189,205)  #aebdcd
```

El canvas tiene fondo transparente y deja ver ese azul-gris. La captura `viewer-palette.png` muestra la separación real. En dark también siguen valores propios del paquete (`#070707`, `#14a8ff`, etc.), distintos del contrato del host; esto último se comprobó en fuente, no con una segunda importación visual dark en esta ronda.

**No atribuirlo a fuentes inexistentes:** el test nuevo de carga de Geist y Geist Mono sí pasa. La reparación de fonts y `body margin:0` es real.

**TDD / implementación:**

1. RED: medir `.adl-viewer`, inputs, selects, texto y canvas efectivo en los dos temas. Medir una sola propiedad de `.viewer-shell` debe dejar de ser suficiente.
2. Establecer override explícito en el propio componente dentro del host, o un contrato de variables con fallback verdaderamente sobreescribible. No cambiar silenciosamente la paleta de todos los consumidores del paquete para arreglar solo el sitio.
3. Evitar que el SVG y el chrome tomen dos autoridades incompatibles. Conservar personalización del documento y política de exportación.
4. GREEN: fondo y controles efectivos usan tokens del sitio; paquete sin host mantiene sus defaults; dos instancias no se contaminan.

### R02 — La cuadrícula se desplaza al doble durante pan

**Archivos:** `src/editor/index.tsx:486–504,672–682`; `tests/e2e/editor-grid.e2e.ts:64–72`.

El patrón tiene `patternTransform=translate(phaseX / zoom, phaseY / zoom)`, pero ahora también vive dentro de `translate(viewport.x, viewport.y) scale(zoom)`. La cámara ya desplaza la cuadrícula una vez; la fase la vuelve a desplazar.

Reproducción mediante el navegador del agente, Band, zoom `0.6134538152610441`, paso del patrón de 32 unidades mundo:

| Magnitud | Antes | Después de pan horizontal de 5 px |
| --- | --- | --- |
| Cámara X | 24 | 29 |
| Patrón X, unidades locales | 7.122749590834699 | 15.273322422258595 |
| Posición X del hit del primer nodo | 369.53814697265625 | 374.53814697265625 |

La diferencia local del patrón × zoom es otros **5 px**. Resultado: los nodos avanzan 5 px, los puntos avanzan 10 px módulo `32 * zoom`. No es una opinión sobre estética: es una transformación duplicada.

El test existente solo exige que `patternTransform` cambie. Ese assert favorece precisamente el error cuando el patrón está en espacio mundo.

**TDD / implementación:**

1. RED: pan corto no múltiplo del paso, en ambos ejes; comparar desplazamiento de un punto y de una referencia de geometría. Tolerancia de raster pequeña y explícita.
2. Elegir **un** espacio: patrón mundo dentro del grupo de cámara sin fase adicional, o patrón viewport fuera del grupo con fase calculada. Mantener fade y cobertura en espacio viewport sin mover los nodos.
3. Probar zoom 0.5/1/2, pan negativo, cambio de densidad y snap. Un patrón decorativo no debe cambiar las reglas de snap ni escribir historial.
4. Sustituir “la fase cambia” por la invariante de alineamiento correcta para el espacio elegido. No copiar mecánicamente este cambio al viewer: su patrón vive fuera del stage y su fase tiene otra justificación.

### R03 — La regresión de Undo no deshace el drag

**Archivo:** `tests/e2e/editor-grid-order.e2e.ts:163–193`. El checkbox realmente muta presentación e historial en `src/editor/index.tsx:2293–2298`.

El test hace:

```text
drag → grid false → grid true → Undo → grid false → comparar
```

Undo revierte el último `grid true`, no el drag. En el paso “undone”, la primera captura ya tiene el grid oculto; `setGrid(false)` no hace nada. Una comparación consigo misma aprueba.

Reproducción independiente, leyendo el JSON visible del editor:

```text
antes Undo:   revision 3, grid true,  nodes [validate, approve, quarantine, ingress]
después Undo: revision 4, grid false, nodes [validate, approve, quarantine, ingress]
```

No hay fallo demostrado del motor de Undo aquí: **el fallo es de la prueba y del alcance que se le atribuye**. Además, el drag corto sobre Ingress en este Band estructurado no cambió sus coordenadas visibles; cambió el orden del spec. `canUndo` tampoco prueba desplazamiento porque las pruebas de grid previas ya crearon historial.

**TDD / implementación:**

1. Usar una escena libre determinista o un gesto estructurado que se sepa que cambia la posición; verificar antes/después relativos a la superficie.
2. Separar casos/contexts para grid on/off, o restaurar y comprobar el historial de los toggles antes de deshacer el gesto. No usar `replaceDocument(...history:reset)` para simular Undo.
3. Comprobar la posición/estructura original tras Undo y la posición final tras Redo, así como el valor de grid esperado.
4. Ejecutar commit, Undo y preview en **cada tema**. En el test actual el bucle light/dark acaba antes del drag; commit/Undo solo usa el último tema y el test de preview usa el inicial.
5. Conservar las dos comprobaciones válidas: interior opaco invariable y espacio vacío que sí cambia con grid. No eliminar el control positivo exterior.

### R04 — El compositor aún cuenta dos veces la opacidad propia

**Archivo:** `tests/e2e/diagram-backdrop.e2e.ts:113–155`.

Para el stroke de un rectángulo con fill propio, `adjacentSurfaceElement` devuelve el mismo elemento. `localSurface` multiplica por `style.opacity` en la línea 130. Después `groupAlpha` vuelve a incluir `style.opacity` en la línea 150 y lo aplica a `card` en la 155.

Los nuevos negativos ponen `opacity=0.4` en el **grupo padre**, no en el rectángulo. Por eso pasan y no cubren esta variante.

Contraejemplo analítico reproducible del algoritmo — no se presenta como una nueva medición de píxeles:

```svg
<!-- Fondo exterior negro; medir el interior plano del trazo, fuera del AA. -->
<rect fill="#888888" stroke="#ffffff" stroke-width="8" opacity="0.4" />
```

| Resultado | Tinta | Superficie | Contraste |
| --- | --- | --- | --- |
| Composición correcta | 0.4 × 255 = 102 | 0.4 × 136 = 54.4 | **2.092:1** |
| Algoritmo actual | 102 | 0.4 × (0.4 × 136) = 21.76 | **3.159:1** |

Se comprobó numéricamente con la fórmula de luminancia del instrumento. Esto constituye un falso aprobado del umbral 3:1. No demuestra por sí solo que las tarjetas actuales, con `opacity=1`, incumplan contraste.

**TDD / implementación:**

1. RED: incorporar exactamente ese caso con opacidad en el elemento; exigir colores finales, no solo ratio. Conservar los negativos anteriores.
2. Separar alpha del color, fill/stroke-opacity, opacidad del elemento y composiciones de ancestros. No retirar ciegamente la opacidad de toda superficie: una superficie hermana puede tener opacidad propia distinta de la tinta.
3. Cubrir rect con stroke/fill, texto sobre rect hermano, grupo padre y dos grupos anidados. Incluir distintos fondos SVG/HTML y opacidad 0.
4. Extraer cálculo puro testeable y contrastarlo con unos pocos pixels planos del navegador. Documentar límites de filtros, máscaras, blends y gradientes: el helper no es un compositor SVG universal.
5. No relajar 3:1 ni cambiar la paleta para acomodar un instrumento incorrecto.

### R05 — Contrato escrito y comportamiento real divergen

**Compatibilidad de geometría:** `docs/guides/migration.md:78–80` afirma que los consumidores existentes no cambian y que los defaults preservan el output. Las props opcionales sí preservan sus defaults, pero esta misma entrega cambia la geometría de los layouts incluso sin usarlas:

| Cambio global | HEAD | Árbol actual | Efecto sin usar `view` |
| --- | --- | --- | --- |
| `src/theme.ts:80`, `SWIMLANE_HEADER_W` | 140 | 72 | Cambia la posición de todas las columnas. |
| `src/theme.ts:81`, `SWIMLANE_PAD` | 24 | 8 | Reduce offsets y ancho del layout. |
| `src/layouts/timeline.ts:10`, `MARGIN_X` | 96 | 64 | Cambia ancho y posiciones del timeline. |

Ejemplo mínimo actual, ejecutado con `layoutDiagram`:

- Swimlane: primer nodo `x=80`, ancho total `336`; con las constantes anteriores y el mismo algoritmo serían `x=164`, ancho `452`.
- Timeline de un hito: `cx=184`, ancho `368`; antes serían `cx=216`, ancho `432`.

Esto no implica necesariamente un breaking change de tipos. Sí implica un **cambio observable de geometría y exportación** que no puede describirse como output intacto. Si la intención es cambiar solo previews, mantener geometría base y encuadrar en el host. Si el cambio global es deliberado, documentarlo y probar fixtures amplios, cabeceras/kinds largos, escenas manuales y exports; no solo los nuevos mínimos.

**Contenido stale adicional, comprobado:**

- `docs/guides/editor.md:92` dice “Multi-node resizing remains pending”; `tests/e2e/studio.e2e.ts:462–514` prueba esa capacidad y pasó en esta ronda.
- `docs/guides/editor.md:54` todavía describe el outline como colapsable; la UI observada usa secciones y tabs, no el disclosure antiguo.
- `DESIGN_SYSTEM.md` y una entrada de `CHANGELOG.md` siguen describiendo el fade inferior de los previews docs, mientras otra sección exige máscara únicamente en la capa decorativa. El CSS actual y los tests corresponden a esta última política.
- `site/src/lib/gallery.ts` conserva captions que mencionan entidades eliminadas: “Client, API and database” con solo Client; “Users own orders” con solo orders; “Design, build and release” con solo Release; “Support and engineering” con solo Support.

**Cierre:** actualizar fuentes, no HTML generado; ejecutar generación/check; revisar lenguaje de compatibilidad y ejemplos actuales. Añadir assertions de contenido para capacidades públicas clave o una matriz requisito → sección → prueba, sin confundir compilación de ejemplos con veracidad de toda la prosa.

## 4. Evaluación visual y de producto, separada de los bugs

### Lo que ahora sí se ve mejor

- Galería móvil Sequence: tarjeta opaca, lifeline distinguible, etiqueta legible, un único patrón atenuado; no reproduce la acumulación de dos grids de las capturas antiguas.
- Previews docs revisados: geometría contenida, sin scroll horizontal forzado en los casos ejecutados, bordes de nodos distinguibles del borde exterior.
- Fonts: Geist está cargada; en la guía del editor el heading es Geist 32 px y la página observada no tiene overflow horizontal. No seguir tratando la fuente ausente como una causa general.
- Toolbar, estado y tema global del playground tienen cobertura nueva que pasa. El drag de layouts libres y el reordenamiento/reasignación de estructurados pasan su suite; el fallo específico R03 no invalida toda esa funcionalidad.
- Ya se distingue entre resultado de tests, implementación y aprobación de referencias. Esa separación debe mantenerse.

### Lo que el mínimo numérico no resuelve

Reducir un fixture es una técnica válida para una miniatura. Pero ER con **una tabla sin relación**, Swimlane con **un carril sin traspaso** y Timeline con **un hito** ya no demuestran las características descritas por sus tarjetas. En desktop, ER ocupa una fila completa con una tabla de 240 px en una imagen de más de 1100 px de ancho: mejora lectura, pero deja bastante espacio sin función.

Esto es una limitación de la presentación, no una nueva acusación de overflow ni un motivo para volver a reducir fuentes. Propuesta para la siguiente iteración visual:

1. Definir un ejemplo pequeño pero representativo por tipo; al menos una relación visible donde esa relación sea la razón de mostrar el tipo.
2. En pantallas amplias aprovechar la anchura con una composición adecuada. En móvil elegir stacking, layout compacto o preview parcial explícito + CTA, sin controles enfocables invisibles.
3. Mantener mínimos de texto y strokes, pero verificar también labels de relaciones y campos ER, no solo `[data-node-label]`.
4. Ajustar el texto descriptivo al ejemplo real. No exigir al mismo fixture ser simultáneamente tutorial completo y miniatura.

No afirmar que “7/7 tipos legibles” certifica cualquier spec de siete tipos: certifica los fixtures y tamaños ensayados.

## 5. Heyo: el siguiente paso sigue siendo integración, no otro spike

El experimento ahora prueba correctamente que `DocsApp` de Heyo puede SSR-ear artículo y navegación sin DOM con slugs canónicos. El sitio sigue montando su `site/src/docs/DocsApp.tsx`, no el runtime Heyo. El reporte actual lo reconoce; no es un hallazgo de ocultación.

**Entrega pendiente y criterio de cierre:**

1. Implementar una vertical real: introducción, guía del editor y API bajo `/docs/`, usando el runtime y adaptando enlaces/slug/base path.
2. Conservar Geist y el sistema Vercel mediante el tema/adapter elegido, sin aceptar por defecto la tipografía del tema upstream.
3. Probar navegación directa y entre rutas, refresco, búsqueda, anchors, 404, copy Markdown y fallback estático sin JavaScript. Un `renderToStaticMarkup` positivo aislado no cubre hidratación ni base path.
4. Mantener snapshots publicados inmutables y comprobar subpath de Pages. No sustituir el contenido congelado de 0.3.0 por una implementación nueva.
5. Medir entry graph real. La necesidad de migrar todo a MDX o activar framework mode no se deduce del spike: decidir si se usa ese camino o un adapter de contenido válido antes de introducir la migración.

Cerrar primero ese flujo funcional; después extenderlo al resto del manifiesto. Otro cambio de colores del shell propio no cierra esta entrega.

## 6. Referencias visuales y presupuestos

Vi screenshots actuales del viewer, galería móvil y docs, además de los artefactos actuales de previews dark Swimlane y galería ER/Sequence. Hay mejoras observables; no es una revisión basada únicamente en números. **No se inspeccionaron uno por uno todos los píxeles de las referencias de todos los navegadores/temas/locales.**

Los tres fallos de comparación visual son reproducibles. Parte de las diferencias corresponde a cambios de fixtures y encuadre intencionados; no equivalen automáticamente a tres bugs. Tampoco se convierten en aprobación por regenerar imágenes.

Orden: corregir bugs abiertos → decidir fixtures/composición → clasificar cada diff → actualizar únicamente referencias justificadas → rerun. No añadir una aprobación manual externa como bloqueo nuevo; esta auditoría identifica qué se vio y qué no.

| Entry | JS gzip | CSS gzip |
| --- | --- | --- |
| Landing | **178997 / 179200 B** | 11751 / 12288 B |
| Playground | 181595 / 184320 B | 11992 / 12288 B |
| Docs | 105464 / 179200 B | 11571 / 12288 B |
| Studio | 179756 / 184320 B | 5200 / 12288 B |
| Viewer | 147962 / 179200 B | 5161 / 12288 B |

Landing tiene **203 B** de margen JS y playground **296 B** CSS. No es un fallo actual, pero obliga a medir la siguiente integración; no subir techos preventivamente ni retirar features solo para pasar un número.

## 7. Orden concreto de trabajo

1. R01: conectar tokens al componente real del viewer y corregir el test de destino.
2. R02: eliminar la doble fase del grid; mantener orden de capas y renderer persistente.
3. R03/R04: reparar instrumentos con negativos que fallen antes del fix. No declarar cerrada la aceptación con falsos positivos conocidos.
4. R05: reconciliar migración, guía, captions y política de fondo; decidir explícitamente el alcance de cambios de geometría global.
5. Montar la vertical Heyo, manteniendo contratos y midiendo tamaño.
6. Resolver composición representativa de galería y revisar diffs concretos; actualizar solamente los baselines de cambios aprobados.
7. Ejecutar gates sobre el árbol final. FF/WebKit requieren los ejecutables correctos antes de afirmar compatibilidad. Separar resultados de esta ronda de los futuros.

Si luego se autorizan commits, separar responsabilidades: viewer theme, grid phase, grid Undo test, contrast compositor, documentación/compatibilidad y Heyo. No mezclar correcciones de tests con regeneraciones visuales para ocultar qué comportamiento cambió.

## 8. Evidencia y reproducción

Directorio local de artefactos de esta auditoría: `/tmp/aesthc-reaudit-20260930/`.

- `check.log`, `e2e.log`, `visual.log`, `frameworks.log`, `other-browsers.log`: resultados de procesos nuevos.
- `viewer-palette.png`: shell blanco y componente azul-gris, con controles anteriores.
- `gallery-sequence-mobile.png`: miniatura móvil actual, distinta de las capturas históricas.
- `docs-editor-desktop.png`: shell real, fuente y contenido de la guía.
- `undo-grid-evidence.json`: lectura antes/después del Undo que cambia grid y no el spec.
- `geometry-current.log`: valores medidos de los layouts mínimos actuales.
- `tracked-before.patch`, `tracked-after-checks.patch`: prueba de conservación del diff binario.

Los archivos de `/tmp` son evidencia local temporal; los números, causas y criterios necesarios para continuar están transcritos arriba, sin exigir que el implementador pueda ver imágenes.

```sh
# Desde la raíz del repositorio, Node 22.14+ y pnpm del packageManager.
pnpm check
PLAYWRIGHT_PORT=43921 pnpm exec playwright test \
  --project=chromium --project=mobile-chromium --reporter=list
pnpm test:frameworks
PLAYWRIGHT_PORT=43922 pnpm test:visual

# Smoke que en esta ronda NO llegó a ejecutar el escenario por falta de binarios.
PLAYWRIGHT_PORT=43923 pnpm exec playwright test tests/e2e/editor-viewer.e2e.ts \
  --project=webkit --project=firefox -g 'viewer entry loads Geist'
```

Criterios consultados: `DESIGN_SYSTEM.md`, las skills instaladas `better-ui` y `emil-design-eng`, y las [Web Interface Guidelines de Vercel](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md). Los hallazgos de este informe proceden del código/DOM/ejecuciones indicados, no de atribuir a Vercel una implementación particular de esta librería.

## Key Learnings:

1. Comprobar el color del padre no demuestra el tema efectivo de un componente que redefine sus variables.
2. Un patrón en espacio mundo ya recibe la cámara; añadir además fase de viewport duplica el pan.
3. Las acciones auxiliares de una prueba pueden contaminar el historial que esa misma prueba pretende verificar.
4. Mínimos tipográficos, exactitud del contenido y representatividad visual son contratos diferentes.
