# 4. Contratos de datos, API y algoritmos

`contracts.ts` es un **contrato de destino**, compilable contra los tipos actuales. No se copia automáticamente a `src/`: E01/E02 lo integran con schema generation, tests y exports. Las firmas describen errores de dominio como resultados, no throws no documentados. Errores de programación pueden lanzar y deben aislarse por error boundary.

## 4.1 Envelope y normalización

`format:'aesthc-diagram'`, `schemaVersion:1`, ID, revision entera no negativa, locale autoral, spec, scene, presentation, metadata y views. No se almacena layout calculado en lugar del spec. Arrays conservan orden autorado; mapas se serializan ordenando keys por puntos de código Unicode, sin localeCompare dependiente del sistema. JSON compacto UTF-8, sin timestamps implícitos; números -0 se escriben 0.

`createDocument(spec, {id, locale})` clona y valida, fija revision=0, materializa IDs de relaciones, inicializa campos con defaults del contrato. No usa `Date.now`, random o locale global. IDs nuevos en UI vienen de IdFactory inyectable; default crypto.randomUUID solo al crear entidad, nunca al renderizar. Node ID y edge ID son namespaces separados; selección usa `{kind,id}`, no un Set<string> ambiguo.

Legacy band sin type se acepta solo por `importDocument` con `allowLegacyBand:true`: añadir type sin alterar arrays. Un JSON v0.3 de los siete tipos conserva sus campos. Input de documento con versión futura se rechaza como `version.unsupported`, jamás se interpreta como spec legado. Migración v1→v1 es identidad; nuevas migraciones serán funciones puras y secuenciales, no heurísticas por presencia de campos.

El bundle localized `{en,es}` debe pasar validación existente y requiere `locale` explícita; devuelve un documento del idioma elegido y aviso de que la otra variante no forma parte del export. La API `LocalizedDiagram` original permanece intacta. No guardar dos topologías implícitas dentro de un único documento.

La materialización usa `identifyEdges`, reserva primero IDs explícitos y devuelve mapping por **índice autorado**, no por from/to (no sería único en paralelas). Después de importar, todas las relaciones del documento tienen ID explícito. Export a spec legado conserva esos IDs, pero advierte sobre scene/config/views omitidas; export a documento es el round-trip sin pérdidas.

`validateDocument` rechaza relaciones sin ID en un envelope ya versionado; solo la entrada spec legado los materializa. IdFactory colisionante se reintenta como máximo 32 veces contra todas las identidades del namespace; después devuelve `id.collision` sin commit. No sustituirlo por loop infinito o `Math.random`. Si crypto.randomUUID no existe, el host debe inyectar IdFactory para crear entidades; render/import con IDs existentes sigue funcionando.

## 4.2 Scene y referencias

- `scene.mode`: auto/manual/hybrid. `scene.nodes[id]`: posición absoluta, dimensiones y lock. Tipos estructurados no aceptan overrides libres; sus opciones se editan en spec.
- `scene.routes[edgeId]`: auto o manual; source/target anchors, interior points y label position opcional. Referencias siempre a relaciones materializadas.
- `groups`: IDs únicos entre grupos, parentGroup opcional y nodeIds directos. No miembros duplicados ni ciclos, máximo ocho niveles. `zOrder` enumera cada nodo exactamente una vez (defaults por orden spec); groups tienen orden del array detrás de nodos.
- Metadata de nodo y relación se referencia por ID; links HTTPS o fragmentos locales validados. Notes son texto plano. Evidence es declarada salvo verificación trusted externa.
- `views.focus` contiene arrays explícitos de nodos/relaciones existentes. Cada story step referencia un viewId; no duplica focus. Ruta story, si existe, es una secuencia de edge IDs contigua y dirigida.
- Extensions: keys reverse-domain, solo JSON puro; máx. 64 KiB total dentro del límite general. Ignoradas por renderer y traversal; sobreviven al round-trip. No se permiten nombres reservados ni propiedades desconocidas fuera de ese contenedor.

## 4.3 Normalización de siete tipos

Cada adapter implementa: enumerateNodes, enumerateRelations, capabilities, create/update/remove entities, reorder y seedLayout. `NodeInput`/`RelationInput` del contrato llevan `diagramType` para evitar escribir `lane` en un flowchart o activation en una transición.

`adapter` produce un spec candidato; `spec.replace` lo pasa por la transacción central. No exponer JSON Patch arbitrario como API de edición principal. Edición de band index, lane y participants se valida junto con las referencias afectadas. Eliminar band/lane con miembros requiere política explícita `move-to` o `delete-members`; no escoger una por el usuario. Eliminación de participant elimina sus mensajes en la misma transacción.

`editStructure` recibe la colección de bands/lanes resultante, assignments de todos los nodos supervivientes y removeNodeIds explícitos; esto resuelve la falta de IDs en bands sin usar labels como identidad. Debe cubrir cada nodo exactamente en assignments o removeNodeIds, nunca ambos; prune de relaciones dependientes es atómico. Label-only pasa los assignments actuales. Decisions/continuations de band se editan mediante la operación tipada propia y conservan sus IDs. Aplicar una operación de otro tipo devuelve capability.unsupported.

Los fields de ER carecen de ID propio en v0.3: se editan por índice sobre expectedRevision. No se les inventa identidad estable de grafo; reordenar fields no debe provocar IDs nuevos en la entidad ni en sus relaciones.

## 4.4 Comandos y resultado de commit

Operaciones de bajo nivel de documento: replace-content, replace-spec, move-nodes, resize-node, set-route, upsert/remove-group, set-presentation, set-metadata, set-views, set-scene. Acciones UX (paste, remove selection, align, reorder) se traducen a una transacción con esos comandos mediante adapters.

La pestaña JSON de Studio edita el documento completo. `document.replace-content` exige el mismo format/schema/id/type y revision base; aplica el contenido como un único commit reversible. Para cambiar id/tipo se usa Import/Open con confirmación e historial nuevo. `setTextDraft` conserva texto y baseRevision sin commit; `commitTextDraft` parsea/valida y aplica replace-content, o deja el último documento válido con errores. Una revisión externa mientras se escribe produce conflicto, no sobrescribe el buffer. `beginGesture/previewGesture/commitGesture/cancelGesture` comparten un transactionId; preview siempre se reduce sobre la base inicial, no acumulando otra vez deltas en cada frame.

Transacción trae id, label legible, expectedRevision y commands no vacíos. Estado de retorno: committed, noop o rejected; rejected incluye diagnostics sin modificar snapshot. `changes` indica IDs afectados e invalidaciones (layout/graph/style), para no recomputar todo por hover o un color.

`replace-spec` exige mismo tipo e IDs compatibles o política `prune-references`. Cambiar tipo no es patch; usar conversión/import nuevo documento. `prune-references` limpia scene, metadata, grupos y vistas con receipt exacto. No crea nuevos edges para saltar sobre nodos borrados.

`set-scene` solo admite scene validada correspondiente a la misma revision base; se utiliza para auto-layout atómico. Permisos y locks se comprueban incluso si un host llama dispatch sin UI.

`nodes.set-lock` es la única operación para bloquear/desbloquear nodos; `scene.set` no puede eludir esa protección. Bloquear un nodo auto fija su geometría resuelta actual y cambia a hybrid; desbloquear conserva el pin hasta reset explícito. Capacidades estructuradas no admiten lock espacial. Los snapshots se exponen como datos de solo lectura; congelarlos recursivamente en desarrollo y verificar que ninguna operación muta los inputs. El store no acepta escrituras directas como vía de actualización.

`DiagramFragment.document` contiene **solo** el subdocumento seleccionado inducido, con las lanes/bands necesarias remapeadas; no es una copia del documento completo con una selection como filtro cosmético. El validator rechaza entidades ajenas a la selección/cierre de grupos y edges, y Copy omite extensions del documento raíz. Así no viajan nodos no seleccionados al portapapeles. Cross-type paste se rechaza salvo conversión explícita a graph con receipt.

## 4.5 Resolución geométrica

1. Validar documento y obtener adapter.
2. Obtener layout base determinista o layout provider explícito.
3. Aplicar nodos fijados, recalcular centers/puertos y bounds de grupos.
4. Resolver edges incidentes. Manual: reanchor endpoints, preservar waypoints interiores. Auto: router según tipo; spread usa orden por ID materializado.
5. Resolver labels/decisions/continuations y bounds completos.
6. Generar diagnósticos quality y `origin`. No mutar input al traducir a coordenadas de SVG.

Una simple traslación del path antiguo no basta si solo se mueve un endpoint. Nunca renderizar edge con `from/to` correctos pero geometría de la revisión anterior. Drag draft usa fast routing y revalida al finalizar; publish usa pass completo.

Router graph M2: visibility graph ortogonal sobre coordenadas de puertos y bounds de obstáculos inflados 12; A* con coste Manhattan + penalización bend=24 + penalización crossing=32. Desempate por (coste, bends, x, y, edgeId), sin random. Límite 10000 estados por edge, 250000 por pase, cancelable por requestId. Si no encuentra trayectoria, `layout.route-unresolved`; no devolver un trayecto atravesando nodos marcado como válido. Para secuencia/timeline se conserva su algoritmo, no se fuerza esta cuadrícula.

Dimensiones automáticas usan métricas deterministas actuales + estimación conservadora. `quality:'publish'` verifica text bounds con Geist cargada en browser. Headless sin métricas exactas declara `text-measurement.unverified`; no concede un receipt de verificación visual.

## 4.6 Queries de grafo

Índice por ordered nodes y relations; adjacency guarda IDs de edge, no solo vecinos. Construcción O(V+E), BFS O(V+E), queue con cursor (no shift cuadrático), sin recursión.

`findRoute(a,a)` = found con nodeIds=[a], edgeIds=[]; origen desconocido = error; par desconectado = unreachable. Empates se resuelven por orden autorado de edges. Self-loops nunca se usan para alargar una ruta mínima. La API devuelve una ruta, no enumera todas las rutas (explosión combinatoria). Alcance máximo opcional `maxHops` no puede superar el límite configurado; resultado incluye truncated cuando se aplica un límite.

Reach guarda depth mínimo por nodo, lista de edges incidentes recorridas en la dirección consultada y orden BFS. Incluye self-loop del origen como edge, no duplica el origen; cycles incluyen edges visitadas una vez. Edges paralelas se conservan. Para upstream se camina incoming pero IDs y dirección original se conservan.

Lens no altera el índice. Query puede recibir un filtro **explícito** de variantes/roles; el receipt registra dicho filtro para no aparentar un resultado global. Una route/reach card usa el receipt exacto del query, no vuelve a elegir otro camino al exportar.

## 4.7 Defaults y límites

| Recurso | Default / máximo inicial | Comportamiento al exceder |
|---|---|---|
| Documento importado | 1 MiB UTF-8, profundidad 64 | Rechazar antes de schema/layout |
| Nodes / relations | 1000 / 2000 | Rechazar con diagnóstico; no truncar |
| Groups / profundidad | 100 / 8 | Rechazar |
| Ports por graph node | 32 | Rechazar |
| Puntos manuales por edge | 64 | Rechazar |
| Label / description | 512 / 8192 caracteres Unicode | Rechazar input nuevo, no truncar import a escondidas |
| Views / story steps | 20 / 50 total | Rechazar |
| Posiciones | -100000 a 100000, finitas | Rechazar; cero tamaño viewport no escribe NaN |
| Zoom | 0.1–4 | Clamp para UI, rechazar documento de vista fuera de rango |
| Text scale | 0.75–1.5 | Rechazar valores fuera de rango; recalcular medidas sin CSS arbitrario |
| Historial | 100 entries y 8 MiB | Evict oldest; overflow singular explícito |
| URL share | 64 KiB encoded, 256 KiB expanded, 5 s decode | Sugerir archivo JSON; nunca subirlo sin permiso |
| Raster | 16384 por eje y 32 megapíxeles total | Rechazar o solicitar scale menor; no OOM silencioso |
| HTML artifact | 8 MiB generado | Fallar con detalle de tamaño, no omitir fonts silenciosamente |

Los límites del editor son policy pública configurable **solo hacia abajo por datos importados**. Un host trusted puede proporcionar otra policy al crear store y asume benchmarks propios; la policy no viene del JSON. Los límites anteriores no reducen los de APIs legacy puras ni modifican los del playground existente.

## 4.8 Determinismo y hashes

`canonicalizeDocument` excluye revision solamente para dirty/hash de contenido; serialización normal la conserva. Hash SHA-256 identifica bytes del contenido canónico mediante provider de crypto (Web Crypto o Node adapter), sin prometer firma/autenticidad. IDs SVG se derivan de document ID + ID de entidad codificado + instance ID de montaje; para export se usa prefijo fijo calculado del documento, no del montaje.

Serializar → parsear → validar → serializar produce los mismos bytes para documento canónico. Export raster se compara por dimensiones/pixels tolerados, no bytes PNG universales entre browsers. Receipt no contiene timestamps implícitos ni usuario, token, filesystem path o error stack.

## 4.9 Registro mínimo de códigos de error

Los mensajes se localizan; código y JSON pointer no. Nuevos códigos se añaden con test y no se renombran sin nota de migración. `schema.<keyword>` conserva el keyword del validator y path completo bajo `/spec` cuando corresponda.

| Familia / códigos | Cuándo | Resultado |
|---|---|---|
| `json.syntax`, `version.unsupported`, `format.unsupported` | Parse/envelope no reconocido | Rechazar import, preservar original |
| `data.unsafe-key`, `data.accessor`, `data.prototype`, `data.cycle`, `data.depth`, `data.finite`, `data.unicode` | Datos no puros o fuera del preflight | No invocar getter/layout |
| `limit.bytes`, `limit.nodes`, `limit.edges`, `limit.groups`, `limit.ports`, `limit.route-points`, `limit.text`, `limit.views`, `limit.story` | Policy superada | Rechazo no truncante |
| `id.duplicate`, `id.invalid`, `reference.missing`, `group.cycle`, `group.multiple-parent`, `group.depth` | Identidad/referencias inválidas | Transacción atómica rechazada |
| `capability.unsupported`, `permission.denied`, `entity.locked`, `revision.stale`, `history.capacity` | Comando no aplicable | Documento/history intactos |
| `port.direction`, `port.capacity`, `port.reference` | Conexión invalida un port | No edge parcialmente creado |
| `layout.route-unresolved`, `layout.edge-through-node`, `layout.overlap`, `layout.endpoint`, `layout.label-clearance`, `text-measurement.unverified` | Calidad geométrica/métrica | Warning edit; error publish según regla |
| `graph.unknown-node`, `graph.unsupported`, `query.stale`, `query.invalid` | Query o card no aplicable | No route/reach inventada |
| `url.scheme`, `text.invisible-control-warning`, `evidence.path`, `evidence.commit`, `evidence.range`, `evidence.mismatch` | Texto/link/evidencia | Warning textual o rechazo por frontera |
| `storage.quota`, `storage.denied`, `storage.corrupt`, `storage.conflict` | Persistencia | Mantener local; estado visible |
| `export.unsupported`, `export.empty-selection`, `export.scope`, `export.pixel-limit`, `export.asset`, `export.encode`, `export.cancelled`, `renderer.unsupported` | Preparación/export fallida | Sin download/receipt de success |
| `share.too-large`, `share.timeout`, `share.invalid`, `compare.incompatible-type` | Transferencia/compare | Rechazo recuperable |

Errores internos desconocidos son `internal.unclassified` sin supportedFixes inventados. Un receipt verificado no implica firma, ausencia de vulnerabilidades, verdad del sistema descrito o aprobación humana.
