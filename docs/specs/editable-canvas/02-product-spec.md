# 2. Spec funcional y UX

El catálogo `test-catalog.md` asigna IDs R/T a las reglas y sus pruebas. MUST = obligatorio para el hito; SHOULD = mejora explícitamente no bloqueante. Lo no indicado como opcional es MUST. Un control no soportado se deshabilita con motivo localizado; nunca aparenta éxito silencioso.

## 2.1 Personas y flujos completos

1. **Integrador React:** instala tarball, importa `/editor`, entrega documento/store, monta dos editores independientes y escucha commits; no necesita clonar este repo ni instalar Tailwind.
2. **Autor técnico:** abre spec existente, añade servicio, conecta excepción, cambia layout, deshace, configura tema y descarga JSON/SVG/PNG sin perder identidad.
3. **Lector/reviewer:** abre HTML offline, busca un nodo, inspecciona conexiones, obtiene ruta/reach, recorre vistas y exporta un asset sin chrome temporal.
4. **Host de producto:** aporta persistencia y permisos, controla reemplazos externos, gestiona conflictos y puede renderizar el viewer en read-only.

Flujo de aceptación M2: importar `examples/flowchart.json` → editar visualmente → mover/conectar → undo/redo → editar JSON → rechazar JSON inválido conservando preview → guardar → recargar → exportar SVG/PNG/HTML → abrir HTML sin red → encontrar una ruta → descargar card. La evidencia incluye IDs, documento antes/después, screenshots revisadas y archivos decodificados.

## 2.2 Canvas y navegación

- Superficie con viewport local, coordenadas mundo en unidades SVG y límites de zoom 0.1–4; inicio fit con padding 32 px CSS, nunca zoom >1 automáticamente.
- Pan con herramienta Mano, botón medio o Space + arrastre. Wheel normal mantiene scroll de página; Ctrl/Meta + wheel sobre superficie hace zoom anclado al cursor. Atajos solo con foco dentro del editor.
- Touch: un dedo selecciona/arrastra con herramienta selección; dos dedos pan/pinch. `touch-action` se limita a la superficie, no al documento; paneles conservan scroll.
- Grid de 16 unidades por defecto, configurable 4–64; snap usa mundo, no píxeles de pantalla. Alt suspende snap durante el gesto; guías visuales transitorias.
- Fit all, fit selection, 100%, +/-; minimapa con viewport y navegación en M2. Nunca cambia el documento al navegar.
- Conversión de coordenadas respeta `viewBox`, `preserveAspectRatio`, offsets, scroll, escala CSS y DPR; no basta restar `getBoundingClientRect().left`. Usar matriz inversa de `getScreenCTM` en el adapter DOM y funciones puras para su matemática.
- `pointercancel`, pérdida de captura, Escape, cambio de documento y desmontaje cancelan draft; pointerup fuera de superficie confirma una sola vez cuando la captura sigue vigente.
- Viewport de tamaño cero o matriz no invertible devuelve diagnóstico recuperable, sin NaN. Resize no resetea cámara salvo primer fit. Scene negativa es válida; un origen calculado de render la desplaza sin reescribir coordenadas autoradas.

## 2.3 Selección, edición e historial

- Click selecciona nodo/relación; Shift alterna pertenencia. Fondo sin modificador limpia selección; marquee intersecta bounds de nodos, no selecciona automáticamente edges.
- Multi-drag preserva offsets relativos; un gesture produce un commit, no uno por pointermove. Los conectores siguen nodos durante draft, sin persistir hasta commit.
- Texto se edita en inspector o editor inline HTML accesible sobre la superficie, nunca como HTML importado. Enter confirma una línea, Ctrl/Meta+Enter confirma multilínea, Escape revierte; eventos IME no confirman prematuramente.
- Crear nodo desde palette usa un ID único y posición del centro visible o drop; crear relación exige endpoints válidos. Parallel edges y self-loops son legales donde el tipo lo permita.
- Reconnect cambia endpoints conservando el ID de relación. Soltar en fondo cancela, no borra; borrar es operación explícita.
- Delete elimina seleccionados y referencias dependientes en una transacción: edges incidentes, ports asociados, metadata, scene, membresías, focus/steps inválidos. Una vista vacía se elimina con warning; nunca queda referencia rota.
- Duplicate y paste crean IDs nuevos para nodos/grupos/relaciones internos; no duplican relaciones hacia nodos ajenos. Offset inicial 24/24, repetición suma 24/24. Copy no incluye historial ni selección global ni credenciales del host; el texto autorado puede contener información sensible y no se promete detectarla automáticamente.
- Cut escribe clipboard primero; si falla, no elimina nada. Pegado de texto externo se valida como fragmento versionado; no se interpreta markup ni código.
- Align izquierda/centro/derecha/arriba/medio/abajo usa bounds de selección; distribute requiere al menos tres nodos y mantiene extremos; caso de solapamiento produce gap cero o positivo, no reordena datos semánticos.
- Resize mínimo width=96/height=48, máximo 4096 por eje; alturas mínimas específicas para tablas, descripciones o headers pueden ser mayores. Rechazar dimensiones que trunquen contenido obligatorio en perfil publish, permitir warning en edit. No cambiar escala tipográfica mediante resize.
- Locked impide move/resize/delete/reparent/reconnect incidente si implica cambiar endpoint del nodo bloqueado. Desbloquear explícitamente sí está permitido con permiso; no es un control de autorización de servidor. Lock espacial aplica a los tipos con posiciones libres; tipos estructurados usan sus capacidades de orden, no placements falsos para implementar locks.
- Undo/redo incluye datos, theme, scene, grupos y vistas; excluye hover, selección, viewport y errores de parser. Cada replay aumenta revision; nuevo commit limpia redo; no-op no ensucia ni notifica.
- Operaciones agrupadas son atómicas: si una falla, documento, history y revision quedan intactos. Texto inválido permanece en buffer con errores, no contamina el último documento válido.

## 2.4 Capacidad exacta por tipo

| Tipo | Edición semántica | Posición/resize | Relaciones | Grupos y orden |
|---|---|---|---|---|
| graph (nuevo, editor-only) | CRUD nodos y ports, roles/descripciones | Libre XY, tamaño, lock | Crear/borrar/reconnect/self/parallel, waypoints | Grupos anidados y z-order |
| flowchart | CRUD nodos/edges; dirección; conservar `level` legado | Libre/híbrida/auto, resize | Completa | Grupos visuales no alteran niveles autorados |
| state-machine | CRUD estados/transiciones, initial/final | Libre/híbrida/auto, resize | Completa; loops preservados | Grupos visuales; sin inferir estados por posición |
| er | CRUD entidades/campos/relations; key/type | Libre/híbrida/auto, width; height calculada mínimo | Completa; referencias siguen entidades | Grupos visuales; reordenar campos no renombra |
| band | CRUD nodos, bands, decisions y continuations | X derivada de band; drag entre columnas cambia band; Y mediante nudge | CRUD; rutas/lane propias del tipo | Reordenar bands remapea índices; no grupos arbitrarios ni resize libre |
| swimlane | CRUD lanes/nodos/edges | Y derivada de lane; drop cambia lane; orden dentro de lane autorado | CRUD; routes compatibles con lanes | Reordenar lanes remapea geometría, no IDs; sin grupos arbitrarios |
| sequence | CRUD participants/messages y activation | Arrastre horizontal reordena participants; vertical reordena messages | Mensaje reconectable con mismo ID; self-message válido | Sin free XY, resize, grupos o waypoints independientes |
| timeline | CRUD events y sus textos | Drag cambia índice; alternancia y posición derivadas | No se pueden crear relaciones de grafo | Sin free XY/resize/grupos; orden de eventos es la semántica |

Todos soportan viewport, selección, texto, JSON, historial, tema, guardado y exportación. Palette e inspector anuncian restricciones antes del gesto. Una relación no soportada devuelve `capability.unsupported`, no se añade un campo desconocido al spec.

Al importar un tipo estructurado, `scene.nodes` libre queda vacío. `getCapabilities(type)` devuelve capacidades atómicas (move-free, reorder-participants, reorder-messages, reassign-lane, resize-width, connect, groups) para que la UI no dependa de una lista de excepciones oculta.

`Convert to graph` es una operación explícita que crea **otro documento con ID nuevo**, conserva el original y entrega un informe de pérdida: lifelines, activations, band/lanes, temporalidad, campos o decisiones no representables no desaparecen silenciosamente. No hay conversión inversa automática. No es necesaria para editar semánticamente los siete tipos.

## 2.5 Layout, conexiones y agrupación

- Auto inicial reutiliza layout actual. Manual respeta coordenadas guardadas. Híbrido conserva pins y solo calcula nodos nuevos/no fijados; drag pinnea un nodo sin reacomodar los demás.
- Auto-layout se solicita explícitamente, muestra preview, respeta locks, aplica un solo commit. `Reset layout` elimina overrides seleccionados tras confirmar; nunca ocurre al cambiar un label o al recargar.
- Grupos son contención semántica/visual, no nodos que generen edges. Parent único por nodo/grupo, profundidad máxima 8, sin ciclos. Bounds se derivan de descendientes + padding 24 + header 32; no hay dos autoridades de coordenadas relativas/absolutas.
- Posiciones de miembros son absolutas. Mover grupo traduce cada descendiente exactamente una vez; si contiene locked, se rechaza toda la operación. Ungroup requiere desbloquear miembros protegidos explícitamente y conserva posiciones, reconnect e identidad.
- Colapsar grupo es estado del viewer; no altera topología ni export canónico. Conexiones externas se representan por overlays de proxy ligados a los IDs originales, nunca por relaciones nuevas. M1 permite grupos expandidos; collapse forma parte de M2.
- Ports nombrados solo en graph: side y offset [0,1], direction in/out/both, capacity opcional. En otros tipos se usan anchors geométricos derivados, no se escriben ports extra en sus specs.
- Rutas automáticas ortogonales con stubs de 16 y clearance de 12 unidades; spread determinista por ID en una misma cara, margen de esquina 12. Self-loop requiere área externa; parallel edges tienen slots distintos. Edges de sequence mantienen semántica de message, no router graph.
- Waypoints manuales en coordenadas mundo, máximo 64 por relación. Los endpoints se recalculan desde nodos/ports; los waypoints interiores quedan autorados. Si un movimiento invalida el trayecto, marcar quality warning; no sustituirlo en secreto.
- En M1 se reportan colisiones; en M2 un router ortogonal de obstáculos acotado intenta reparar automáticas. Si agota el presupuesto, conserva ruta segura anterior o muestra diagnóstico, nunca anuncia routing válido con una línea atravesando un nodo.
- Labels son datos: no se borran ni acortan para pasar calidad. Label offset manual, auto-placement determinista y medición de texto verificable en publish.

## 2.6 Configuración y composición

- `presentation` serializable: tokens light/dark, mode por defecto, grid, padding, leyenda, estilo de edges, tamaño de texto dentro de límites y preset propio. No CSS arbitrario, URLs, callbacks ni expresiones.
- Host props: UI locale, permissions, storage adapter, export capabilities y componentes de chrome; no se serializan dentro del documento.
- Configuración scoped por instancia. Dos canvas distintos no comparten tokens, selección, historial, IDs SVG, listeners ni storage key.
- Export view state solo por intención explícita (`scope:selection`, route/reach card); default siempre diagrama completo.
- Custom nodes de M2: registry por instancia con `typeKey`, schema de data, measure determinista, renderer SVG canónico y inspector opcional. Sin renderer de export se rechaza export publish con `renderer.unsupported`; renderer React arbitrario no se convierte por captura HTML.
- Extensiones no se cargan por nombre desde Internet. Un JSON nunca puede registrar código o componentes. Hosts deben registrar implementaciones confiables localmente.

## 2.7 Semantic viewer

- Finder por ID, label y kind; comparación Unicode case-insensitive, conserva texto original; orden determinista: ID exacto, prefijo de label, substring, orden autorado. Enter enfoca, Escape devuelve foco al trigger; cero resultados se anuncia.
- Inspector separa descripción, propiedades, enlaces seguros y relaciones entrantes/salientes. Seleccionar relación identifica su ID, incluso si hay varias entre los mismos nodos.
- Reach upstream/downstream BFS dirigido: origen profundidad 0, mínimos hops y lista exacta de edges; visited termina ciclos. No se presenta como blast radius, fallo probable o dependencia en ejecución.
- Route usa mínimo número de edges dirigido; empates por orden autorado de relaciones, IDs explícitos para distinguir paralelas. No encuentra a través de proximidad, grupos, continuations o timeline. Origen=destino devuelve ruta de cero edges; ruta inexistente es resultado vacío explícito.
- Sequence permite análisis de participantes y mensajes como grafo autorado, **sin afirmar orden temporal ejecutable**; timeline deshabilita route/reach porque no tiene relaciones. El recorrido de timeline se hace con vistas, no inventando edges.
- Lens selecciona roles/tags autorados; dimming por defecto, no borra ni recalcula geometría. Ocultación opcional es estado viewer y no participa en cálculo de topología.
- Vistas guardadas: IDs y focus explícitos, máximo 20; story máximo 50 pasos, duración 500–10000 ms por paso, total máximo 120 s. Cada paso puede incluir ruta explícita validada por edge IDs. Orden de nodos no demuestra causalidad ni crea aristas transitivas.
- Un solo owner de movimiento (story, route playback o trace). Interacción manual, hidden, print, Escape o reduced-motion lo detiene; nada se auto-inicia. Reduced-motion muestra los estados estáticos con Next/Previous funcionales.
- Presentación cambia framing/chrome y ofrece salir; Fullscreen API solo por gesto y con fallback si denegada. Vistas/links inválidos no rompen el documento.

## 2.8 Accesibilidad e interacción

- Lista/outline HTML equivalente de nodos y relaciones, con acciones de editar, mover por números y conectar sin drag; SVG no es la única vía de operación.
- Roving tabindex para escena, nombres localizados, foco visible, aria-live para commits/errores en lote. No usar `role=application` global ni capturar atajos cuando un input/textarea/contenteditable recibe texto.
- Flechas mueven 1 unidad; Shift+flecha 10, solo en free move y agrupadas por tecla sostenida; en tipos estructurados cambian orden mediante controles anunciados.
- Ctrl/Meta+Z undo; Ctrl+Y o Ctrl/Meta+Shift+Z redo; Ctrl/Meta+C/X/V con selección de escena; Delete/Backspace solo sin foco textual. Escape cancela el gesto/panel superior antes de limpiar selección. `?` abre ayuda.
- Ctrl/Meta+S invoca save adapter solo con foco interno y adapter disponible; si no, no interceptar el navegador.
- Controles de 36 px, hit target grueso mínimo 44; herramientas con nombre normal-case; Geist Sans en UI, Mono en código. Hairlines, radios 4/6/8, sin bandas decorativas de acento.
- Light/dark × es/en obligatorios. Estados no solo por color; contraste de texto 4.5:1 normal y 3:1 grande, controles/foco 3:1; zoom de página 200% y navegación sin puntero. axe se complementa con flujo keyboard y revisión manual.
- 360 px móvil: paneles como drawer, canvas contenido sin overflow de página. No se promete paridad de productividad desktop, pero sí acceso a toda edición por formularios y cancelación segura de touch.

## 2.9 Estados visibles y errores

Estados separados: loading, ready, editing-draft, invalid-text, validating-layout, saving, saved, conflict, storage-unavailable, exporting, cancelled, unsupported y error. Un error de export no cambia saved/dirty. Los diagnósticos muestran campo/entidad y acciones soportadas, no stacks o rutas privadas.

Solo se pide confirmación cuando hay pérdida posible: reemplazar documento dirty, restaurar borrador, reset layout, conversión y aceptar versión externa. Cambiar tema, hacer undo y exportar no requieren confirmación repetida.

## 2.10 No objetivos

Colaboración multiusuario/CRDT, backend, autenticación, autorización de servidor, comentarios sociales, hosted share, pagos, importación arbitraria de HTML/SVG/Mermaid/draw.io, importador de Archify, ejecución de workflows, llamadas a modelos, descubrimiento automático de infraestructura y compatibilidad de plugins de terceros. Un future adapter puede añadirlos sin reescribir el documento; no hay stubs públicos que aparenten soporte.
