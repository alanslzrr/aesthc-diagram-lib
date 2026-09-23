# 5. Exportación, persistencia, seguridad y extensiones

## 5.1 Pipeline de exportación

`request → snapshot inmutable → validate → resolve scene → quality → resolver fuentes/assets → render SVG aislado → serialize/raster/runtime → validate artifact → devolver bytes + receipt`. Ninguna etapa modifica store, viewport, selección, focus, reveal, documento ni DOM visible. Descargar/copiar son efectos **posteriores** y separados de producir bytes.

Si el usuario continúa editando durante la exportación, el artifact conserva la revisión capturada y la UI la identifica. No se mezcla fondo de una revisión con nodos de otra. Cancelar por AbortSignal libera canvas, Image callbacks, URLs, workers y recorder; no devuelve un archivo parcial con status success. Cada solicitud tiene owner propio; resultados tardíos tras dispose se descartan.

## 5.2 Contrato por formato

| Formato | Contenido y defaults | Restricciones y comprobación |
|---|---|---|
| JSON | Documento v1 UTF-8, includes source siempre, orden determinista | Scope document únicamente; validate/round-trip exacto |
| SVG | Escena completa, fonts y notices embebidos, theme resuelto, padding documento | Sin scripts, foreignObject, handlers, URLs remotas o overlays; XML parseable; aspect ratio intacto |
| PNG | SVG aislado rasterizado, scale=2, fondo theme | Bounds/alpha comprobados; límite 32 MP; no recorta texto/markers |
| JPEG | Mismo render, calidad encoder 0.92 | Sin transparencia; `background:transparent` es error de opción, no sustitución silenciosa |
| WebP | Mismo render, calidad encoder 0.92 | Comprobar MIME retornado, no poner extensión webp a PNG fallback |
| HTML | SVG + JSON mínimo + runtime viewer + CSS/fonts/notices embebidos | file:// offline, CSP y fallback estático si script bloqueado; sin editor o guardado implícito |
| Share card | PNG 1200×630, diagrama completo fit-contain, margen 32, título máx. 2 líneas | Ruta/reach variante explícita; contexto dimmed preservado; no afirmar calidad certificada solo por ser card |
| WebM M3 | Story/trace finito autorado, 30 fps, máximo 120 s | Codec disponible, archivo decodificable, frame final correcto, cancelación y cleanup |
| Print | Vista canónica y CSS @media print con aspect ratio | Browser print puede guardar PDF; no se anuncia como API de bytes PDF ni PDF vectorial nativo |

SVG dual-theme de Archify no se replica en la primera entrega: SVG de esta biblioteca fija un theme para portabilidad; HTML sí permite ambos. Una futura opción dual-theme requiere sus propias pruebas de viewers externos.

`scope:selection` solo para SVG/raster: nodos seleccionados, grupos seleccionados con descendientes y edges cuyos **ambos** endpoints están incluidos. Seleccionar únicamente edges añade sus dos endpoints; documento sigue inmutable. Export de selección vacío es `export.empty-selection`. Selection export se declara `canonical:false`; JSON/HTML no reciben selection parcial.

`scope:document` siempre excluye focus, lens, active story, minimap, collapse, transient camera, hover, drag handles y editor chrome. `includeSource:false` (default) elimina el documento editable embebido, no es redacción. `metadata:'minimal'` (default) conserva labels, descriptions de accesibilidad, kinds, IDs/topología, roles/tags y vistas/story necesarios para el viewer; omite notes, links/evidence y extensions no dibujados. `metadata:'all'` incluye los detalles autorados del inspector de forma explícita. HTML conserva ese índice semántico declarado en la UI; source=true incluye además el documento completo y muestra advertencia de todos sus campos, independientemente de metadata. Ninguna opción oculta texto ya dibujado. Todos los datos presentes en el archivo son legibles por su destinatario; no exportar credenciales.

Route/reach card requiere `format:'share-card'`, receipt de query de la misma id/revision, elementos únicos existentes y, para route, contigüidad de edge IDs. Rechazar rutas vacías (origen=destino), unreachable, reach sin edges, tampering o snapshot stale; no generar una card normal como fallback silencioso. Canonical card sin scope especial contiene grafo completo sin resaltar query. Header de reach dice “Alcance autorado upstream/downstream”, no impacto.

## 5.3 Fonts y assets

- Usar Geist Sans/Mono del paquete y preservar OFL; no consultar CSS de todas las stylesheets del host como fuente obligatoria.
- Resolver assets por manifest del build y adapter explícito. Renderer headless recibe bytes locales; browser puede leer assets same-origin solo al preparar export. HTML/SVG finales no dependen de esas URLs.
- Cache de bytes por asset digest, no guardar Promise fallida permanentemente. Error de fuente ofrece retry o modo fallback **explícito** con diagnostic/verified=false; no afirmar fidelidad exacta.
- Iconos solo catálogo actual/licencias existentes o renderer trusted registrado. No fetch de logos por el nombre del nodo, SVG arbitrario o URL importada.
- Fonts y assets remotos custom quedan fuera de M2. Un adapter trusted futuro debe verificar MIME, tamaño, CORS y licencia antes de embebido.
- `Image` onerror, `canvas.getContext` null, `toBlob` null, tainted canvas y MIME no soportado producen errores diferentes y recuperables.

## 5.4 HTML standalone y CSP

- Un único archivo, sin imports relativos, source maps ni petición a CDN. Runtime versionado y fijado al build; contener notices de dependencias bundled.
- JSON se pone en data script `application/json` escapando `<`, `>`, `&`, U+2028 y U+2029; prueba específica `</script><script>…`. No insertar mediante concatenación sin escape en texto/atributos HTML.
- CSP: default-src 'none'; script-src hashes calculados de los scripts internos; style-src hashes internos o inline styles documentados del renderer; img-src data: blob:; font-src data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'. Meta CSP no puede sustituir headers `frame-ancestors`; no afirmar aislamiento de embedding por ello.
- Links externos HTTPS deliberados con `rel=noopener noreferrer` y referrer policy. No abrir enlaces ni red sin gesto; preview embebido de contenido importado no navega automáticamente.
- No `eval`, `Function`, event-handler attributes ni URLs javascript/data de usuario. Inline SVG no admite scripts, foreignObject ni enlaces externos. Runtime no lee filesystem ni localStorage.
- Prueba file:// con red bloqueada y log de requests; scripts deshabilitados conservan el SVG y una lista estática de contenido significativo.

## 5.5 Save/load y recuperación

Estados: idle → dirty → saving → saved; dirty → saving → conflict/unavailable; nueva edición durante save conserva dirty aunque termine el request anterior. Saved se fija por digest del snapshot confirmado, no por document actual al resolver Promise.

- Autosave opt-in con debounce trailing de 750 ms tras commit válido; no se reinicia por viewport/selection. Documentos distintos tienen timer/key/token distintos.
- Write ordenado por documento: como máximo un save en vuelo; nueva edición marca next snapshot. Cancelar o unmount no anuncia saved si adapter no confirmó.
- Keys localStorage `adl-document-v1:<hostNamespace>:<documentId>`; namespace suministrado por host para evitar choque entre embeds. Envelope incluye schemaVersion, token y document. Datos inválidos se ponen en cuarentena accesible para descarga, no sobrescriben documento activo.
- Invalid text draft se guarda aparte opt-in `adl-editor-buffer-v1:...`; restore exige confirmación, valida de nuevo y nunca ejecuta código. Borradores v0.3 se mantienen legibles desde su flujo actual; Studio ofrece importación explícita, no los borra al migrar.
- QuotaExceededError, storage denegado y modo privado degradan a memoria y banner con Download JSON; ningún error produce pérdida del documento visible.
- Conflicto: conservar local, ofrecer descargar local, usar remoto tras confirmar o save-as ID nuevo. Sin resolución automática por timestamp.
- `remove` requiere token actual y gesto de eliminar guardado, no se invoca por reset del canvas. Acciones locales delete-document no se traducen en eliminar archivos externos.
- beforeunload solo mientras dirty y únicamente como protección secundaria; no garantiza guardado. No suspender navegación si no hay cambios.

## 5.6 Compartir y links

Mantener decoder `s=` actual y su formato v1. Introducir namespace nuevo `d=` para documentos v1 del editor y `v=` para estado viewer; no reinterpretar `s=` como documento. Payload tiene version y bounds de bytes igual que share actual; descompresión streaming con límite y timeout. Sin hosting ni POST de datos.

Un link viewer puede contener focus, reach, route o named view **uno por vez** y optional UI locale. Usar URLSearchParams/encoding, no concatenación delimitada por `~` que rompa IDs que contienen ese carácter. Duplicados/parámetros contradictorios se rechazan con mensaje no fatal. ID no encontrado abre overview, no otro nodo parecido.

Source JSON grande se descarga, no se sube automáticamente. Hash reduce envío al servidor HTTP pero **no es cifrado**: navegador, extensiones y quien copie el link pueden leerlo. La UI advierte sobre información sensible antes de copiar source links.

## 5.7 Threat model y tests obligatorios

| Frontera | Amenaza | Control / evidencia requerida |
|---|---|---|
| JSON archivo/paste/share/storage | XSS, prototype pollution, depth/size bomb | JSON puro, keys reservadas, schema strict, límites bytes antes de parse y expanded durante decode |
| Objetos JS suministrados por host | Getters, prototype no plano, cyclic/functions | Import seguro acepta plain data; inspeccionar descriptors sin invocar getters, rechazar accessors/prototipos no planos |
| Labels/notes/links | Markup, bidi confuso, schemes peligrosos | Texto escapado, labels originales; HTTPS/fragment allowlist; advertir controles invisibles sin borrar contenido |
| Geometría/routers | NaN, Infinity, combinaciones explosivas | Range, quotas, algoritmos iterativos, budget/cancelación |
| Plugin registry | Código importado desde payload | Solo registro trusted desde host; data validada, namespace sin carga dinámica |
| Export/clipboard | Filtrado inconsistente, active state, datos ocultos | Fresh snapshot, escopos explícitos, source disclosure, gestos para clipboard/download |
| Storage multi-tab | Lost update, write tardío | Token CAS cuando adapter lo garantice, modo browser limitado y conflicto explícito |
| Evidence URLs | SSRF, filesystem traversal, secretos | Verificador aparte, sin red/filesystem desde JSON; host allowlist y selección de repo local |
| Receipts/logs | Filtración de rutas/tokens/contenido | Códigos/IDs públicos, bounded evidence, no logs de documento automático |

Strings nunca son instrucciones. No ejecutar contenido de examples, share payloads o clipboard, incluso si parecen un script, prompt o llamada a herramienta.

## 5.8 M3: diff exacto, evidencia y perfil de despliegue

**Compare:** ambos documentos deben validar y tener el mismo tipo. Comparar por ID explícito; add/remove/modified se calculan por contenido semántico y presentation por separado. Reorder que altera sequence/timeline es cambio semántico; zOrder no lo es. Cambiar el ID se muestra como remove+add, no adivinar rename por label. Different type devuelve `compare.incompatible-type`. Before/After permanecen inmutables; Delta no es documento editable ni merge automático. Views inválidas tras diff se muestran sin target, nunca enlazan por coincidencia parcial.

**Evidence:** nodos pueden contener repo HTTPS, commit hexadecimal completo de 40 o 64 caracteres, path relativo POSIX sin `..`, rango entero start≥1/end≥start y blobSha opcional. Eso se etiqueta **declarado**. Solo `EvidenceVerifier` confiable, ejecutado aparte y autorizado por host, puede devolver verified después de resolver repo exacto/commit/blob/rango. Receipt runtime queda fuera de los datos importados; un JSON no puede autodeclararse verified. API privada/local nunca se consulta automáticamente al abrir HTML. Revocación, file inexistente o mismatch se muestran explícitos. Export no embebe contenido fuente privado.

**Deployment profile:** solo cuando `engineeringProfile:'deployment-ownership'` está elegido. Cada nodo no marcado external necesita owner; exactamente una región por membresía ancestro; database/storage privado; security-group privado dentro de una región consistente; cada edge que cambia membership necesita metadata.crossing no vacío. Roles se declaran en metadata, no por buscar “db” en el label. Sin perfil no imponer estas reglas. No retirar el perfil para pasar validación, no descubrir cloud y no afirmar que un esquema conforme es seguro en producción.

**Motion:** playback exclusivamente autorado, finito y detenido por hidden/print/reduced-motion. Para WebM comprobar [MediaRecorder.isTypeSupported](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported_static) y capacidad efectiva de grabación. No prometer MP4/GIF. Capturar SVG canónico en canvas aislado, sin capturar pantalla ni pedir micrófono/cámara. Error/cancel libera tracks, recorder y object URLs; success exige blob no vacío y decodificación en smoke test.
