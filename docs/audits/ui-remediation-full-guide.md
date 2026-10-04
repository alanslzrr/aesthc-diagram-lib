# Guía integral de corrección UI — aesthc

## Addendum de auditoría — fondos y legibilidad (2026-09-27)

**Estado: no aprobar el cierre visual.** El reporte «All gates pass» no coincide con su propia matriz: WebKit registra4fallos, Firefox no ejecuta y las referencias Linux no se actualizaron. Además declara regeneración mecánica de goldens Darwin sin poder ver imágenes; eso no certifica diseño.

### Nueva evidencia traducida para agentes sin visión

- Captura nueva1: tarjetas Band/Flowchart/Sequence/State machine. Band tiene borde visible; los otros nodos casi no se separan del fondo. Los puntos se ven a través de nodos transparentes. La densidad de puntos varía dentro de la misma tarjeta.
- Captura nueva2: Swimlane con dos carriles apenas distinguibles y puntos visibles por encima/dentro de sus superficies; fondo uniforme sin caída suave.
- Captura nueva3: preview documental de Swimlane recortado con barra horizontal gruesa; no corresponde a un preview completo ajustado al ancho.
- Captura nueva4: lifeline vertical discontinua de Sequence casi imperceptible frente a los puntos; las flechas azules se reconocen mejor que la estructura que les da significado.
- Captura nueva5: referencia ibelick; patrones de puntos y grillas sobre una superficie base, algunas variantes con atenuación espacial. No copiar indiscriminadamente colores azulados ni fondos de pantalla completa.

### Causas confirmadas, no conjeturas

En navegador, `.layout-gallery-stage` computa radial-gradient de puntos al14%, `mask-image:none`. A la vez `DiagramCanvas.tsx` dibuja su rect de patrón SVG en bounds del documento. El CSS se define en `site/src/design-system.css`; los dos sistemas se superponen con escalas distintas.

Flowchart: rect visible inspeccionado con fill transparente, stroke `rgb(31,31,31)`, opacity0.7 y stroke-width1px en unidades SVG. Sequence: rects con stroke31/31/31 y fill negro. Band usa un borde calculado mucho más claro (~89/89/89). La disparidad entre tipos y el escalado explican por qué unos contornos sobreviven y otros desaparecen. No arreglar solamente el borde externo de la tarjeta.

### Referencia revisada y adaptación correcta

Fuente: https://github.com/ibelick/background-snippets/blob/main/app/components/background.tsx.

- `BgDarkGrid1`: puntos mediante radial-gradient y repetición20×20px.
- `BgDarkGrid3`: líneas con máscara radial elíptica; es una grilla de líneas, no un ejemplo de dots. Tomar su separación de capas y aplicar la atenuación al patrón de puntos solicitado.
- No copiar `h-screen/w-screen` ni z-index negativo global a una tarjeta; usar contenedor relativo aislado e inset0.

Contrato: **superficie base → capa de puntos con máscara → diagrama opaco → controles**. Una sola cuadrícula por superficie. La máscara nunca envuelve el SVG completo ni el contenedor que contiene captions/controles.

Crear primitiva compartida de fondo con tokens de color, paso, radio, intensidad y perfil de fade. Galería/docs/hero: dots con máscara radial suave, centro visible y borde atenuado. Editor: capa que cubre todo el viewport y conserva fase con cámara; puede atenuarse solo su patrón en bordes, sin volver a una isla limitada por worldBounds. Esto no contradice la prohibición anterior de difuminar contenido editable: se difumina únicamente el fondo decorativo.

Como punto inicial, no como golden automático: paso20–24px, radio0.7–1px, centro de máscara dentro de la zona de interés, tramo de caída gradual hasta el perímetro. Calibrar ambas variantes del tema a escala final. No introducir dependencia/runtime remoto para estas reglas CSS.

### Correcciones requeridas

1. Desactivar el grid SVG cuando el host ya proporciona fondo, mediante opción compatible del renderer o wrapper específico. No usar selectores genéricos que eliminen rects de máscara de iconos.
2. Remover `mask-image` del contenedor completo de preview documental y moverlo a la capa decorativa.
3. Tokens separados para borde decorativo de panel, límite de nodo y estructura semántica. Un hairline de tarjeta no es token válido para lifelines/contornos de nodos.
4. Rellenos opacos de nodos; no permitir puntos a través de ellos. Containers/carriles necesitan superficie y límites perceptibles sin volver a bloques blancos.
5. Recalibrar strokes a tamaño mostrado. Evaluar `vector-effect:non-scaling-stroke` para miniaturas, comprobando marcadores y export; no imponerlo globalmente a todo SVG. Reducir fixture antes de comprimir texto/estructura.
6. Lifelines, separators ER, lanes y estados deben reconocerse sin hover. Ninguna semántica depende de una línea más débil que los puntos decorativos.
7. Docs: quitar min-width forzado del SVG en modo preview fitted; preservar aspecto y CTA a ejemplo completo. Scroll horizontal puede mantenerse en código/tablas, no como sustituto de fit del preview solicitado.
8. Heyo: actualizar estado a «integración del manifiesto/configuración; shell no integrado». La dependencia y builder son avance real, pero no equivalen a entregar su interfaz. No declarar que integrar el shell rompería necesariamente no-JS sin una prueba técnica que lo demuestre.

### Pruebas de cierre añadidas

- BG-01: una sola capa de patrón activa en galería/docs/editor; sin dos frecuencias superpuestas.
- BG-02: máscara en capa de fondo; nodos/edges/captions sin ancestros enmascarados accidentalmente.
- BG-03: patrón atenuado en periferia, visible en zona útil; dimensiones del fondo cubren viewport, no bounds del documento.
- BG-04: contraste y grosor final de nodos/lifelines/edges tras composición de opacidades y escala. Para gráficos esenciales, comprobar objetivo3:1 respecto al fondo adyacente; no exigirlo a puntos decorativos.
- BG-05: los siete tipos comparados a tamaño real de tarjeta, ambos temas, sin hover; no basta comprobar que existe un stroke.
- BG-06: preview documental Swimlane/Sequence sin scrollbar horizontal en anchos objetivo y sin nodos amputados.
- BG-07: no aceptar regeneración mecánica de referencias como evidencia de corrección. Informar por separado baseline actualizado, comparación ejecutada y defectos concretos comprobados.

No hubo cambios de implementación en esta auditoría; este addendum prescribe el trabajo pendiente.

Fecha: 2026-09-27. Destinatario: agente implementador que NO puede ver imágenes.

## 0. Mandato y prioridades

Corregir los problemas descritos aquí, no volver a presentar un cambio de colores como rediseño completo. Este documento consolida las auditorías anteriores y traduce las siete capturas del usuario a especificaciones textuales. No requiere acceso a esas imágenes.

**Orden:** integridad de edición y drag → toolbar sin solapes → tema único y superficies correctas → fondo continuo → sustitución de disclosures → integración documental → composición de landing → validación final.

No reiniciar el proyecto, eliminar funciones para esconder errores, aumentar presupuestos para acomodar cambios sin análisis, ni regenerar goldens como sustituto de corregir defectos. Preservar trabajo ajeno y versiones publicadas.

### Decisiones vinculantes del usuario

1. **Un solo switch global de tema.** En el playground controla shell, toolbar, inspector, canvas, nodos y conexiones. Se elimina el selector Theme/Appearance independiente del playground. Esta instrucción reemplaza la recomendación anterior de exponer dos temas independientes.
2. **No secciones colapsables/desplegables con flechas o triángulos.** No sustituir el triángulo nativo por un chevron y considerar resuelto. Usar navegación por tabs, paneles y acciones explícitas.
3. **shadcn como base de composición de UI.** Verificar instalación/componentes reales; tener Radix o Tailwind no demuestra que toda la UI sea shadcn. No ejecutar una inicialización destructiva sobre estilos existentes.
4. **El canvas debe permitir mover nodos.** No remitir al usuario a JSON ni convertir silenciosamente a graph.
5. **Tema oscuro consistente.** Ningún nodo, tabla ER, carril, pill o panel queda blanco por valores light heredados.
6. **Fondo y cuadrícula del canvas continuos**, no una pequeña isla ligada al tamaño del diagrama.
7. Docs basadas realmente en el proyecto Heyo solicitado; no declarar integración cuando solo se haya retocado el shell propio.

## 1. Evidencia textual: qué muestran exactamente las capturas

| ID | Evidencia sin imágenes | Defecto y aceptación |
|---|---|---|
| IMG-01 | Toolbar oscura horizontal: Select/Pan/Undo/Redo, zoom y muchas acciones. `Arrange selection` invade `Copy`; `Copy to clipboard` invade `Paste from clipboard`; otras etiquetas chocan con Duplicate/Group. El porcentaje aparece como `77` y `%` en líneas distintas. Estado `No pending changes` ocupa dos líneas en el extremo. | Los hijos se comprimen o su texto desborda. Cero intersecciones de controles/texto; porcentaje indivisible; estado con espacio propio. |
| IMG-02 | Playground ER oscuro. Las tablas products/categories/product_categories/variants/stock_lines tienen fondo casi blanco, cabeceras gris claro y pills de cardinalidad claras. Inspector y shell son oscuros. Toolbar solapada. | El tema no llega coherentemente al renderer estructurado; no basta estilizar botones. Todas las superficies siguen el switch global. |
| IMG-03 | Dos filas grandes con triángulo nativo apuntando a la derecha: `Diagram outline` y `Document JSON`. | Diseño expresamente rechazado. Sustituir por tabs/paneles, no ocultar solo el marcador. |
| IMG-04 | `Existing connections (4)` lleva triángulo nativo de disclosure. | Lista de conexiones en panel/tab con contador; sin accordion ni summary. |
| IMG-05 | Canvas alto de Timeline. La cuadrícula de puntos empieza a media altura y termina alrededor del dibujo, dejando grandes bandas lisas arriba/abajo. Fit está abajo a la izquierda. | La cuadrícula parece pertenecer al SVG del documento, no al viewport. Cubrir todo el viewport y mantener continuidad al pan/zoom. |
| IMG-06 | Swimlane oscuro con cuadrícula localizada; en inspector aparece Appearance → Theme → Dark, aunque existe switch global. También se ve Existing connections con triángulo y outline inferior. | Doble autoridad del tema y UI rechazada. Eliminar el control local del playground y resolver todas las superficies desde el global. |
| IMG-07 | Swimlane con carriles enormes gris claro y tarjetas blancas dentro de una interfaz oscura. | Regresión de tema en contenedores estructurados, no solo en tarjetas ER. Revisar todos los tipos y estilos inline/SVG. |
| USER-DRAG | El usuario reporta que el playground/canvas no permite mover nodos. | Reporte funcional pendiente de reproducción. Las imágenes no prueban su causa. Debe demostrarse movimiento persistido, no solo selección o cambio de cursor. |

### Hechos ya verificados en auditorías previas

- Geist Sans/Mono sí estaban cargados en el build inspeccionado: recursos WOFF2 observados y FontFaceSet listo. No empezar reinstalando fuentes como explicación universal.
- Heyo no estaba integrado en manifests ni shell documental inspeccionado. Referencias: https://github.com/heyo-sh/heyo-docs y https://heyo.sh/heyo-docs/introduction/.
- La demo Heyo usa Figtree; aesthc debe conservar Geist por la dirección Vercel del usuario. Copiar arquitectura/jerarquía no obliga a copiar esa fuente.
- Se reprodujeron anteriormente pérdida de dirty/historial al cambiar ejemplo e inicial-fit que sobrescribía cámara. Se reportan corregidos, pero deben conservarse sus regresiones y verificarse en el árbol final.
- La galería compacta existe, pero flowchart completo de altura 1168 se encajaba en 144 px (~12 %), quedando ilegible.
- Resultados de tests aportados por otro agente no constituyen ejecución propia ni aprobación visual.

## 2. Antes de editar

1. Leer AGENTS.md, DESIGN_SYSTEM.md y esta guía. Registrar git status y cambios preexistentes. No resetear ni sobrescribir trabajo.
2. Usar Node 22.14+ y pnpm indicado en packageManager.
3. Inspeccionar `site/src/playground/PlaygroundApp.tsx`, `playground.css`, `src/editor/index.tsx`, `src/editor/styles.css`, renderer/export, `site/src/theme-tokens.css`, `design-system.css`, `utilities.css`, `site/docs/docs.css`, `site/src/docs/DocsApp.tsx`, `scripts/docs` y `LayoutGallery.tsx`.
4. Inventariar fuentes de tema, estilos inline, hardcoded fills y todos los usos de details/summary/Disclosure/Accordion/Collapsible en fuentes activas. Documentar cada sustitución.
5. Comprobar componentes shadcn instalados y sus versiones/configuración. Reutilizar primero. No instalar un segundo set incompatible de primitives.
6. Arrancar producción local y confirmar que corresponde al build actual. Una URL 200 no prueba que el navegador sirva cambios recientes.

## 3. P0 — Toolbar sin solapes

### Composición objetivo

- Grupo principal: Select/Pan, Undo/Redo.
- Grupo cámara: menos, porcentaje indivisible con números tabulares, más, Fit.
- Edición contextual: acciones solo pertinentes; operaciones menos frecuentes en menú de acciones shadcn con trigger explícito, no secciones expandibles con flecha.
- Estado en slot separado. En compacto usar indicador breve con nombre accesible; no empujar el contenido sobre los botones.
- Agrupar variantes de copy/paste y align/distribute; evitar quince botones de texto simultáneos.

### Reglas de layout

- Contenedor de toolbar: ancho disponible real, `min-width: 0` en tracks flex/grid que deban encoger.
- Botones y grupos visibles: `flex-shrink: 0`, `white-space: nowrap`, ancho intrínseco, padding consistente. El porcentaje no se separa.
- **No resolver únicamente con overflow-x:auto**: si los hijos encogen, su texto puede seguir solapándose dentro del scroller.
- Si hay scroller de respaldo, contenido interno de ancho intrínseco y focus que lleva el control a vista. Preferir reducir acciones visibles antes de depender de scroll.
- Labels no se ocultan por `overflow:hidden` sobre toda la toolbar. Estado, selects y botones no comparten un ancho fijo arbitrario.
- Basarse en Button/ToggleGroup/Tooltip/Separator/menú de acciones del sistema instalado; no inventar botones distintos por página.

### RED → GREEN

- Reproducir toolbar con selección vacía, simple, múltiple y labels ES largos.
- Medir bounding boxes de controles vecinos y rects de texto: sin intersección inesperada y texto contenido. No basta medir overflow de página.
- Verificar 390/768/1280/1440/1920 px, zoom de página 200 %, foco visible y acciones alcanzables.
- Assert explícito: porcentaje y símbolo en una línea; no `Arrange selectionCopy` ni texto superpuesto de clipboard.

## 4. P0 — Un único tema global y renderer coherente

### Política del sitio

El switch global es la autoridad visual del playground. Remover el select Theme del inspector en esta composición, no ocultarlo con CSS dejando lógica activa. Documentos importados con theme light NO pueden dejar el canvas blanco mientras el sitio está oscuro.

**No eliminar el campo de tema del contrato público del documento.** Otros consumidores y exportaciones standalone pueden necesitarlo. La política del playground debe implementarse mediante composición/opción pública compatible, no rompiendo el paquete.

Diseño recomendado:

1. Preferencia global → tema efectivo light/dark.
2. Theme efectivo → tokens del host + override de presentación de la vista del playground.
3. Override de vista también usado por su preview/export visual, con semántica documentada.
4. Cambio de tema global NO es una edición semántica: no incrementa revisión del documento, no añade undo y no marca dirty.
5. Si se necesita nueva opción pública para esta separación, añadir tipos, ejemplo, pruebas tarball y nota de migración; usar mecanismo existente si ya permite el override.
6. JSON conserva los datos originales. Documentar diferencia entre documento serializado y apariencia efectiva de export visual del sitio; no modificar el JSON silenciosamente para cuadrarlo con CSS.

### Auditoría del renderer

- Revisar fills/strokes de tablas ER, headers/filas, lanes, containers, pills de relaciones, labels, selección, puertos, hover, estado final y timeline.
- Localizar valores light en inline style/SVG que ganen a tokens CSS. Distinguir tema mal resuelto de color explícito de usuario; no reemplazar todo `white` globalmente.
- Usar tokens semánticos compartidos. Nada de CSS filters/invert ni `rect { fill: ... !important }` global que destruya iconos o semántica.
- Mantener azul/ámbar semánticos con contraste adecuado. Blanco de texto/iconos en dark es válido; el fallo son superficies light no intencionales.
- El switch debe alcanzar sesiones ya creadas e importadas, no solo nuevos ejemplos.

### Aceptación

Todos los tipos: light→dark→light, sesión nueva/existente, import con tema opuesto. Nodes/containers/pills coherentes, JSON/revisión/undo/dirty intactos durante el toggle. No existe un segundo selector de tema en playground.

## 5. P0 — Mover nodos de verdad

### Reproducir antes de atribuir causa

Por cada tipo, seleccionar un nodo desbloqueado, arrastrar su superficie visible, verificar delta de scene y posición persistida al terminar. Registrar si falla pointerdown, preview, commit o si un relayout posterior revierte el resultado.

Investigar:

- `inert`/`pointer-events:none` filtrados desde showcases al editor.
- Overlay de selección/marquee/grid interceptando pointerdown.
- Hit target de label/tabla distinto al del nodo.
- Modo Pan activo, permisos o locks heredados.
- Coordenadas screen→world mal calculadas por zoom, CSS transform, offset/scroll o devicePixelRatio.
- Falta de pointer capture o pérdida de pointerup fuera del canvas.
- Adapter que ignora scene overrides y recalcula layout al terminar.
- Manejo táctil que entrega el gesto al scroll de la página.

### Contrato

- Drag en Select mueve entidad; drag en Pan mueve cámara, no documento.
- Desplazamiento en mundo = desplazamiento en pantalla / zoom, con snap solo cuando esté habilitado.
- Un gesto → una entrada undo; Escape/pointercancel → rollback; redo recupera posición exacta.
- Relaciones conectadas se actualizan durante preview y después del commit.
- Locks/permisos se respetan con feedback; no “solucionar” quitándolos.
- Para tipos estructurados conservar semántica de lanes, timeline, lifelines y ER. No convertir a graph sin consentimiento. Si falta soporte, implementarlo o registrar explícitamente el bloqueo; no declarar drag completo.
- Sesión por ejemplo conserva documento, selección, cámara e historial; mount/ResizeObserver no sobrescribe cámara restaurada.

### Pruebas

Dataset por los siete tipos y graph; zoom50/100/200, pan previo, scroll previo, puntero ratón/touch, nodo con label/tabla, cancelación, locks, multi-selection. Assert sobre documento y bounds, no solo screenshot ni cursor. Añadir pan/zoom→cambio de ejemplo→retorno con igualdad de cámara.

## 6. P1 — Cuadrícula y fondo continuos

El viewport debe tener una capa de fondo que cubra `inset:0`; la cuadrícula no debe depender de worldBounds del documento. Capa no interactiva, debajo de nodos y selección.

- Preferir grid de viewport sincronizado con cámara: espaciado proyectado = tamaño de celda × zoom; fase = traslación de cámara módulo espaciado. Normalizar módulo negativo para pan a coordenadas negativas.
- Definir política para zoom extremo: reducir densidad visual si hace falta sin cambiar snap del documento.
- Evitar segunda cuadrícula en el SVG del escenario que produzca una isla más brillante o superpuesta.
- Eliminar una cuadrícula de la vista no debe alterar el renderer exportable arbitrariamente: exportación usa su política y bounds completos.
- Fondo del viewport permanece continuo con documento vacío, pequeño, desplazado y fuera de pantalla; al resize no aparece una franja lisa.
- Con Show grid desactivado desaparecen todos los puntos, no solo una de dos capas. Con grid activo no hay fade de presentación dentro del canvas editable.

RED: Timeline pequeño en canvas alto muestra banda de puntos central. GREEN: cobertura del viewport en sus cuatro esquinas interiores, fase continua al pan y reflow; ninguna capa bloquea drag.

## 7. P1 — Eliminar UI de disclosures con flechas

La instrucción nueva prevalece sobre recomendaciones anteriores de sidebar plegable.

| Antes rechazado | Sustitución |
|---|---|
| `Diagram outline` con triángulo | Tab `Outline` en panel lateral, con lista navegable |
| `Document JSON` con triángulo | Tab `JSON` o botón `Edit JSON` que abre Sheet/Dialog con título y acciones explícitas |
| `Existing connections (N)` con triángulo | Tab `Connections (N)` con lista visible y scroll propio |
| Grupos documentales expandibles con chevron | Encabezados de grupo estáticos o navegación por secciones sin disclosure |
| Capabilities/metadata dentro de details | Bloque breve visible o panel abierto por acción explícita, según densidad |

- No limitarse a `summary::marker { content: '' }`: sigue siendo el componente rechazado.
- No reemplazar details por Accordion/Collapsible shadcn con flecha. La preferencia rechaza el patrón, no solo el estilo nativo.
- Dropdown de acciones o Select funcional no es una sección colapsable; no eliminar controles de selección legítimos por contener un indicador. Evitar flechas decorativas como sustituto del disclosure.
- En tabs: `TabsList`/`TabsTrigger`/`TabsContent`, nombres correctos y foco consistente. En Sheet/Dialog: título y cierre explícito.
- JSON: conservar borrador inválido y último documento válido, diagnóstico, IME y apply/cancel; cambiar tabs no destruye texto sin guardar.
- Auditar editor, viewer, Studio, playground, landing, docs y ejemplos. Hacer inventario con búsqueda AST/texto y comprobar DOM renderizado; no limitar búsqueda al archivo del playground.
- No borrar APIs exportadas de golpe. Cambiar la implementación/presentación compatible y documentar cambios de markup.
- Archivos generados se regeneran. Dependencias vendorizadas no se editan. **No alterar silenciosamente snapshots de releases congeladas**: listarlos como excepción histórica al barrido y pedir decisión específica si se exige también reescribir esos artefactos inmutables.

## 8. P1 — Sistema de diseño y shadcn reales

- Un conjunto de tokens semánticos para background, surface, text, muted, border, focus, selected, destructive; variantes light/dark en la raíz efectiva.
- Geist Sans: títulos/cuerpo/controles; Geist Mono: código y metadata técnica breve. Comprobar WOFF2 cargados, no únicamente family declarado.
- No agregar Figtree porque Heyo la use por defecto. Mantener Geist y adaptar jerarquía: título documental claro, lead distinguido, texto de lectura de ancho controlado.
- Controles 36px como base del sistema, radios4–8px, padding real, iconos consistentes; targets móviles adecuados sin agrandar toda la UI desproporcionadamente.
- Evitar bordes anidados innecesarios, dropdowns nativos sin estilo y mezcla de tamaños por selector CSS accidental.
- No propagar Tailwind/shadcn como requisito al paquete core. Mantener imports opt-in y CSS consumidor; componentes host en site, extensiones de composición públicas solo si son necesarias y testeadas.
- No confundir `pnpm check` verde con coherencia visual: los tests deben cubrir los defectos concretos anteriores.

## 9. P1 — Docs: integración Heyo sin fingir entrega

Referencia: https://github.com/heyo-sh/heyo-docs. Estado de auditoría: shell propio, no integración real localizada.

1. Inspeccionar versión, licencia, APIs y requisitos actuales del proyecto original. Fijar versión/commit de referencia; no instalar a ciegas un paquete de nombre parecido.
2. Mapear contenido existente, navegación, anchors, Markdown, búsqueda, versiones y render sin JS.
3. Implementar una sección vertical real con introducción, guía del editor y página de referencia. Usar arquitectura/componentes de Heyo compatibles con el stack; registrar qué se reutiliza y cómo, manteniendo licencias.
4. Aplicar tema aesthc/Vercel con Geist y la prohibición de disclosures. No copiar branding Heyo ni agregar servicios de chat/remotos.
5. Validar links, búsqueda, navegación de vuelta, deep links y Markdown antes de migrar el resto. Conservar snapshots históricos.
6. La introducción debe conducir a render/edit/explore/export antes de consumir todo el primer viewport con un diagrama. Ejemplos y bloques de código son apoyo a la tarea.
7. No aceptar una declaración “Heyo completo” sustentada solo por tres columnas o colores. Entregar mapa de integración y limitaciones concretas.

## 10. P2 — Landing, previews y galería

- Conservar separación hero/copy/media y evitar volver a paneles gigantes con toolbar en landing.
- No encajar un flowchart vertical completo en144px. Diseñar fixtures estáticos resumidos por tipo: pocos pasos/entidades/participantes con relaciones reconocibles; enlazar al ejemplo completo.
- Fade únicamente en presentación estática/inert, con CTA fuera del recorte. Nunca en superficie editable ni en exports por accidente.
- La forma del diagrama debe reconocerse; no exigir lectura de código minúsculo. Si los labels comunican valor, deben ser legibles a escala final.
- Fit proporcional y encuadre por tipo; no estirar SVG. No ocultar overflow global para tapar errores.
- Una tarjeta clicable debe tener destino claro; si hay dos acciones distintas, evitar links anidados y áreas decorativas que parezcan botones sin acción.

## 11. Matriz de aceptación obligatoria

| ID | Escenario | Evidencia requerida |
|---|---|---|
| UI-01 | Toolbar EN/ES con selección0/1/N, anchos390/768/1280/1440/1920 | Sin solapes de controles ni texto; zoom indivisible; acciones alcanzables |
| UI-02 | Dark/light en ER y swimlane, luego resto de tipos | Sin superficies light residuales en dark; contraste y semántica preservados |
| UI-03 | Toggle global con sesiones creadas/importadas | Todas las vistas sincronizadas; no segundo selector; revisión/dirty/undo intactos |
| UI-04 | Timeline pequeño, canvas vacío, pan negativo, zoom y resize | Fondo/grid continuos y una sola cuadrícula visual |
| UI-05 | Drag por tipo a diferentes zooms | Delta real scene, conexiones actualizadas, undo/redo exactos |
| UI-06 | Drag cancelado/lock/permiso/touch | Rollback o rechazo correcto, sin commit parcial |
| UI-07 | Cambiar tipo y volver | Documento/dirty/historial/selección/cámara conservados |
| UI-08 | Import diferido + cambio de sesión/edición | Resultado obsoleto rechazado; errores de lectura visibles; éxito solo con commit real |
| UI-09 | Reset con cambios, aceptar/cancelar | Confirma y respeta respuesta; sin pérdida silenciosa |
| UI-10 | JSON inválido/IME y cambio de tab | Último canvas válido y borrador preservados; un apply válido |
| UI-11 | Barrido de componentes rechazados | Cero disclosures con flecha en superficies activas; inventario de excepciones históricas |
| UI-12 | Docs integrada | Tres páginas representativas + search/deep links/Markdown/no-JS/links versionados |
| UI-13 | Carga directa de todas las entradas | CSS/fuentes sin depender de visitar landing primero |
| UI-14 | Galería | Composiciones reconocibles por tipo; sin miniaturas verticales indescifrables |
| UI-15 | Export visual/JSON | Semántica de tema documentada, geometría completa, sin máscara/controles editor |

## 12. TDD, ejecución y evidencia

Para cada defecto: **RED observable → cambio mínimo → GREEN → refactor**. No añadir tests que solo comprueban que existe un botón.

- Registrar prueba que falla antes y resultado después. Reproducir la secuencia exacta del fallo, incluyendo navegación y cambios de viewport.
- Capturas son evidencia complementaria. El agente que no ve imágenes debe usar asserts de bounds, estilos computados, estados, documento, foco y ausencia de componentes rechazados. No afirmar “revisadas visualmente” si no puede inspeccionarlas.
- Capturar estilos efectivos de tablas/carriles/labels y rects de toolbar; no basta `scrollWidth <= clientWidth` de body.
- Ejecutar `pnpm check`, paquete/tarball, `pnpm test:frameworks`, matriz de navegador pertinente y completa antes de cierre según AGENTS.md; visual/snapshots y presupuestos.
- Firefox/WebKit no ejecutados o fallando se reportan tal cual. No atribuir a entorno sin evidencia, ni contar skips como passes.
- Builds/schemas/dist se generan desde fuentes. No editar bundles a mano ni cambiar goldens para esconder regresiones.
- Presupuesto180KiB existente no es permiso para nuevas subidas: medir grafo y considerar carga diferida de JSON/export/inspector antes de aumentarlo.

## 13. Commits y entrega

Commits convencionales, granulares, una responsabilidad; hasta3archivos cuando se separen limpiamente, sin forzar commits rotos. Sin coautorías ni metadatos de generación.

Partición sugerida:

1. `test(editor): reproduce toolbar overlap and structured dark surfaces`
2. `fix(editor): preserve intrinsic toolbar control widths`
3. `fix(playground): resolve all preview surfaces from global theme`
4. `fix(editor): render the grid across the viewport`
5. `fix(editor): restore node dragging across structured layouts` (solo si la causa real lo justifica; describirla con precisión)
6. `refactor(editor): replace disclosure sections with tabbed panels`
7. `refactor(site): remove arrow disclosures from active surfaces`
8. `feat(docs): integrate the verified Heyo documentation shell`
9. `refactor(site): add curated per-layout presentation previews`
10. `test(site): verify cross-surface theme and editing workflows`

No publicar, crear releases ni modificar cuentas. No afirmar terminado mientras un punto quede sustituido por otra decisión no aprobada.

### Formato obligatorio de cierre del agente

| ID | Causa confirmada | Solución/archivos | RED | GREEN | Limitación |
|---|---|---|---|---|---|

Adjuntar comandos/resultados realmente ejecutados, qué archivos estaban modificados antes, qué cambió, commits y riesgos. Separar implementación, verificación automatizada y apariencia; ningún contador agregado demuestra por sí mismo que se corrigieron las capturas.

## Key Learnings:

1. La instrucción actual exige tema único en el playground; la independencia de tema sigue siendo capacidad del contrato, no un segundo control visible.
2. Una toolbar puede no desbordar la página y aun así tener texto superpuesto entre controles.
3. La cuadrícula de un documento no sustituye al fondo continuo de un viewport editable.
4. Eliminar el triángulo por CSS no elimina el patrón de disclosure rechazado.
5. El fallo de drag requiere prueba de movimiento persistido; una imagen no demuestra su causa.
