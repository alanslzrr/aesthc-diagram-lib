# Plan de preparación open-source y adopción por agentes

- **Proyecto:** `@aesthc/diagram-lib`
- **Fecha:** 2026-09-13
- **Estado:** implementación local avanzada de W01–W13; lanzamiento W14 pendiente. Ver [evidencia actual](../verification/2026-09-13-readiness.md). Publicación npm pendiente; envío a GitHub y protecciones remotas autorizados.
- **Baseline auditada:** `62049effea727f95c84e7ee0d931a57443dca9e2`
- **Repositorio local:** `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib`
- **Repositorio público:** [alanslzrr/aesthc-diagram-lib](https://github.com/alanslzrr/aesthc-diagram-lib)
- **Web pública:** [showcase actual](https://alanslzrr.github.io/aesthc-diagram-lib/)

## 1. Resultado que buscamos

Una persona debe poder pasar **una única URL** a su agente, instalar una versión pública verificable y obtener un diagrama funcional, tipado y estilizado, sin copiar código interno del repositorio ni adivinar imports. Una persona sin agente debe poder completar el mismo recorrido con el README y la documentación.

El proyecto también debe poder recibir una contribución, validar un paquete real, publicar una release reproducible, comunicar vulnerabilidades y mantener documentación consistente con la versión publicada.

**No basta con mejorar la landing:** primero debe funcionar lo que se promete instalar. Prepararemos el proceso de release antes, pero la publicación pública será el último hito del lanzamiento.

### Criterios de éxito del lanzamiento

- [ ] El paquete se puede consultar e instalar de forma anónima desde el registro público acordado.
- [ ] README, ejemplos, documentación y código copiado desde el playground compilan contra el tarball, no solo contra el código fuente.
- [ ] Los siete tipos de diagrama funcionan en un proyecto consumidor sin Tailwind y en las integraciones React declaradas.
- [ ] Los entrypoints públicos comparten el registro cuando se usan desde una misma instalación; no hay IDs SVG duplicados por mensajes paralelos ni por instancias del canvas.
- [ ] Los datos inválidos producen errores útiles sin ejecutar JavaScript ni destruir el último diagrama válido.
- [ ] La URL para agentes contiene versión, instalación, imports reales, CSS, ejemplos, restricciones y comprobaciones.
- [ ] CI bloquea regresiones de paquete, sitio, documentación, accesibilidad crítica y seguridad según políticas explícitas.
- [ ] GitHub, npm, changelog y documentación muestran una versión coherente; las diferencias con `main` están identificadas.
- [ ] Existen instrucciones de contribución y canales reales de soporte, conducta y divulgación de vulnerabilidades.

## 2. Alcance y límites

### Incluido

Distribución npm, exports, API existente, validación, ejemplos, documentación humana y para agentes, README, releases, CI, GitHub Pages, UX del playground, accesibilidad, rendimiento, seguridad, licencias, metadatos, comunidad y mantenimiento.

### No incluido en el lanzamiento

- Reescribir la librería, cambiar de framework o rediseñar la marca.
- Agregar tipos de diagrama, un editor drag-and-drop o un motor para grafos arbitrariamente grandes.
- Crear backend, cuentas, telemetría, sincronización remota o pagos.
- Exigir una skill, un plugin, un proveedor de modelos, un CLI o un servidor MCP para consumir la librería.
- Prometer compatibilidad con todos los agentes, navegadores o frameworks sin probarlos.
- Introducir CommonJS, un dominio propio, patrocinio, CLA o DCO sin una necesidad concreta.
- Publicar, modificar permisos remotos, crear issues/milestones o subir una imagen social durante esta fase de planificación.

**“Acceso raíz para agentes” significa una entrada documental en la raíz del repo y una URL pública estable. No significa privilegios de administrador, acceso al sistema del consumidor ni ejecución automática de instrucciones remotas.**

## 3. Hechos de partida y prioridades

Resultados de la auditoría previa sobre esta baseline; deben refrescarse al empezar la ejecución. No son nuevas pruebas ejecutadas al escribir este plan.

| Hallazgo verificado | Consecuencia | Prioridad / trabajo |
|---|---|---|
| npm público devolvió 404; configuración `publishConfig.access` en `restricted` | La instalación pública anunciada no está verificada | P0 · W02, W13, W14 |
| Los bundles independientes duplican el `Map` del registro | Registrar desde un entrypoint no hace visible el diagrama en otro | P0 · W01, W02 |
| Mensajes de secuencia con mismos extremos reutilizan `from::to` | Colisiones en claves React e identificadores SVG | P0 · W03 |
| Quick start y código de uso generado no pasan TypeScript | El primer uso falla aunque el repo compile | P0 · W01, W06 |
| `legend: null` pasa el filtro inicial y rompe el panel | Un error de datos se convierte en fallo de interfaz y pérdida de edición al reintentar | P0 · W04, W05 |
| El editor evalúa texto con `new Function` | Los datos editados no se tratan estrictamente como datos | P0 · W04 |
| Las pruebas y el sitio consumen fuentes; 29 pruebas pasan | Los checks actuales no detectan fallos propios del paquete distribuido | P0 · W01, W08 |
| Tags hasta 0.2.2, GitHub Releases hasta 0.2.0 y cambios posteriores en `main` | Las distintas superficies describen estados diferentes | P1 · W00, W13 |
| Protección de rama, reglas y automatizaciones de seguridad incompletas | Menor protección frente a errores y cambios no verificados | P1 · W09 |
| No hay entrada documental para agentes ni esquemas de datos públicos | El agente debe reconstruir el contrato leyendo implementación | P1 · W04, W07 |
| Enlaces/imports documentados inexistentes y recuentos desactualizados | Desconfianza y mantenimiento duplicado | P1 · W06 |
| Navegación escasa, primer diagrama tardío y canvas ancho en móvil | El valor del producto tarda en verse y explorar cuesta más | P1/P2 · W11, W12 |
| Share básico, copia SVG y selección con Enter sí funcionan | Mejorar sobre una base real, no reemplazar funcionalidades que ya sirven | Conservar · W05, W12 |
| Auditoría de producción sin avisos; desarrollo con avisos identificados | Corregir dependencias afectadas sin afirmar exposición de producción no demostrada | P1 · W09 |

**P0:** bloquea el primer uso o rompe funcionalidad/seguridad básica. **P1:** requisito del lanzamiento open-source fiable. **P2:** mejora posterior medible. **P3:** opcional, requiere demanda. La prioridad no sustituye las dependencias técnicas.

## 4. Decisiones de diseño propuestas

1. **Preservar React, ESM, Vite y el sistema visual actual.** Bodoni para el carácter editorial; Sora en controles en caja normal; mono para información técnica. No añadir otro framework de documentación por defecto.
2. **Probar el producto distribuido.** Fixtures consumidores instalan el tarball generado. Los aliases a fuentes pueden mantenerse para desarrollo rápido, pero nunca serán la única validación ni la única ruta del sitio de producción.
3. **Un único módulo compartido para el registro dentro de una instalación.** Preferir chunks ESM compartidos o preservación de módulos. No ocultar el defecto con un singleton global en `globalThis`; tampoco prometer compartir estado entre dos copias físicas del paquete.
4. **Separar identidad de relaciones y conectividad.** Una relación puede tener identidad propia aunque comparta extremos con otra. La selección/traversal no debe depender de que `from::to` sea una identidad única.
5. **Un contrato de datos, múltiples salidas.** Mantener inicialmente el contrato TypeScript público; derivar de él esquemas estructurales y validadores mediante una prueba técnica acotada. Las reglas semánticas —referencias, unicidad, topología localizada— se verifican además del esquema. Si la derivación no representa correctamente el contrato, documentar y aprobar la alternativa antes de migrar tipos; no mantener tres modelos editados a mano.
6. **Validación importable sin cargar el canvas.** El módulo de validación propuesto debe quedar separado de React, iconos y motores de layout; medir su coste. Elegir generador/validador en W04 mediante casos reales y no por popularidad.
7. **Datos editables en JSON, código de integración en TSX de solo lectura.** Eliminar evaluación de JavaScript del editor. No añadir JSON5 por defecto; si la sintaxis adicional resulta necesaria, usar un parser de datos explícito y documentado, nunca evaluación.
8. **Documentación canónica en Markdown y ejemplos ejecutables.** Generar HTML estático, índice para agentes y snippets desde el mismo corpus. No duplicar manualmente contenido entre README, sitio, guía de agentes y un supuesto documento completo.
9. **Dos entradas de agentes con responsabilidades distintas.** `AGENTS.md` para contribuir al repo; guía pública de integración para usar el paquete desde otro proyecto. `llms.txt` será un índice de descubrimiento, no una garantía universal ni un requisito de instalación.
10. **Versión pública y desarrollo separados.** La documentación estable corresponde a la release publicada. El sitio de desarrollo puede demostrar cambios futuros, pero debe identificarlos y no generar instrucciones que requieran exports aún no publicados.
11. **Release sencilla para un solo paquete.** PR de versión y changelog revisados + workflow explícito de publicación. No combinar Changesets, release-please y versionado manual. Reconsiderar herramientas adicionales si crece el número de paquetes o la frecuencia de releases.
12. **Conservar `dist` versionado durante la transición.** Endurecer su regeneración; reconsiderar retirarlo después de que la instalación pública esté funcionando. No romper el consumo Git existente sin migración.
13. **Inglés canónico en documentación pública y metadatos; conservar la UI en inglés/español.** No prometer documentación bilingüe completa hasta disponer de una política que impida traducciones desactualizadas.
14. **Sin telemetría por defecto.** Medir adopción con pruebas de integración, errores reportados y métricas públicas; cualquier recopilación de datos requiere decisión independiente.

## 5. Fases, dependencias y tamaño

Tamaños relativos: **S** acotado, **M** varios componentes o integración, **L** transversal con pruebas de compatibilidad. No son fechas comprometidas. El orden siguiente es secuencial de referencia; las dependencias permiten reorganizarlo sin crear tareas o agentes adicionales automáticamente.

| Fase | Objetivo | Trabajos | Puerta de salida |
|---|---|---|---|
| F0 · Contrato | Fijar baseline, soporte y decisiones de publicación | W00 | G0: supuestos y decisiones registrados |
| F1 · Producto instalable | Reproducir fallos del tarball y corregir empaquetado e identidad | W01–W03 | G1: consumidor mínimo fiable |
| F2 · Datos seguros | Validación, editor, share y export sin perder datos | W04–W05 | G2: entradas inválidas controladas |
| F3 · Adopción | Ejemplos compilables, documentación y entrada para agentes | W06–W07 | G3: onboarding humano y de agente reproducible |
| F4 · Operación open-source | Base de CI, seguridad y comunidad | Base de W08, W09–W10 | G4: checks y operación protegidos |
| F5 · Web y accesibilidad | Navegación, documentación estática y experiencia usable | W11–W12 y cierre de W08 | G5: recorrido del candidato validado |
| F6 · Release y lanzamiento | Cerrar preparación, publicar y verificar superficies públicas | W13–W14 | G6: instalación y documentación públicas coherentes |
| F7 · Evolución | Mejoras no bloqueantes y mantenimiento | W15 | Cada mejora tiene métrica y criterio propio |

**Camino crítico de adopción:** W00 → W01 → W02/W03 → W04 → W06 → W07 → W08 → W13 → W14. W05, W09, W10, W11 y W12 también deben completar sus requisitos de lanzamiento antes de W14. La infraestructura y los accesos de W13 pueden prepararse antes, pero su aceptación final espera al cierre de CI. Preparar una publicación no autoriza ejecutarla.

### Seguimiento del primer incremento — 2026-09-13

| Trabajo | Estado real |
|---|---|
| W00 | Baseline local/remota y 404 npm reconfirmados. Inventario de exports registrado; soporte definitivo, cuenta y versión siguen pendientes. |
| W01 | Harness de tarball aislado implementado. Cuatro fallos de registro reproducidos antes del fix; siete checks runtime, imports de servidor y tipos pasan después. Faltan fixtures de navegador, README y otros defectos. |
| W02 | Registro compartido y limpieza del build implementados. Dos builds producen los mismos 30 artefactos y eliminan un chunk obsoleto de prueba. Exports nuevos, CSS en navegador y preparación pública siguen pendientes. |
| W08 | CI configurada para ejecutar el smoke del tarball y detectar chunks nuevos no seguidos. No se ha ejecutado una nueva workflow remota. |
| W03–W07, W09–W15 | Pendientes de implementación. |

La decisión técnica y sus límites están registrados en [registro compartido del paquete](/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/docs/decisions/0001-shared-package-registry.md). No se considera completada ninguna fase entera por este incremento.

## 6. Paquetes de trabajo ejecutables

### W00 · Baseline, compatibilidad y decisiones de lanzamiento

**Prioridad:** P0/P1 · **Tamaño:** S · **Depende de:** nada.

- [ ] Confirmar HEAD, estado del árbol, configuración npm/GitHub y resultados de auditoría antes de tocar código.
- [ ] Registrar inventario de exports y API pública actual, incluyendo aliases legacy, registro opcional, CSS y límites de los layouts.
- [ ] Separar versión de Node para desarrollo/CI/publicación de los requisitos reales de consumidores. Elegir líneas soportadas al ejecutar; no copiar el `>=18` actual sin comprobarlo.
- [ ] Definir matriz React 18/19 y alcance concreto Vite/Next App Router. Compatibilidad con futuras versiones mayores no queda implícita.
- [ ] Registrar qué cambios requieren migración: identidad de relaciones, validación estricta, editor JSON, política de versiones de docs y eventuales exports.
- [ ] Proponer siguiente versión menor pre-1.0, previsiblemente `0.3.0`, sujeta al diff de API y aprobación del mantenedor. No anunciar `1.0` para resolver problemas de presentación.
- [ ] Confirmar propiedad/acceso al scope npm y si el 404 representa paquete no publicado, privado u otra restricción. No deducir disponibilidad del nombre.
- [ ] Registrar responsables y decisiones manuales de la sección 10.

**Aceptación:** matriz de soporte escrita, inventario de API fechado, baseline reproducida y ninguna incertidumbre de cuenta presentada como hecho confirmado. El contrato público actual queda distinguido del propuesto.

**Archivos:** [manifiesto](/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/package.json) y notas de decisiones nuevas; las rutas absolutas de trabajo se recogen en la sección 12.

### W01 · Pruebas de consumo real y regresiones iniciales

**Prioridad:** P0 · **Tamaño:** M · **Depende de:** W00.

- [x] Crear harness que construye, empaqueta e instala un tarball en un directorio aislado sin aliases a fuentes ni dependencia accidental del workspace.
- [x] Capturar como regresión el registro entre root, registry y examples, incluyendo lectura desde todos los entrypoints relevantes.
- [x] Probar que cada destino declarado en `exports` existe y que sus tipos resuelven con NodeNext y Bundler en el compilador instalado; la matriz de versiones adicionales sigue pendiente en W08.
- [ ] Crear fixture React/Vite con CSS ordinario, sin Tailwind, que use exclusivamente API pública.
- [ ] Añadir casos de múltiples canvases y mensajes con mismos extremos; demostrar que los tests detectan el defecto antes del arreglo.
- [ ] Extraer quick start y código generado a fixtures de compilación para que los errores actuales no vuelvan a quedar fuera de CI.
- [ ] Comprobar el manifiesto del tarball: archivos esperados, ausencia de secretos/configuración privada, tamaño y documentación necesaria.

**Aceptación:** cada defecto P0 tiene una prueba que falla en la baseline y pasa con su fix. No se fusiona una rama deliberadamente roja: los tests iniciales se integran junto con los arreglos correspondientes o permanecen en una rama de trabajo hasta estar verdes.

### W02 · Empaquetado, exports y build reproducible

**Prioridad:** P0 · **Tamaño:** M · **Depende de:** W01.

- [x] Corregir la duplicación del registro mediante un módulo compartido real; validar runtime y declaraciones con todos los imports públicos.
- [x] Limpiar completamente la salida antes de compilar, regenerando después JS, declaraciones y CSS en orden determinista. Evitar artefactos obsoletos causados por `clean: false`.
- [ ] Preservar directivas `use client` donde son necesarias y comprobar el comportamiento de chunks compartidos en consumidores React/Next.
- [ ] Resolver la referencia documental a `showcase/entries`: preferir exportar `DEFAULT_SHOWCASE_ENTRIES` desde el barrel de showcase y usar únicamente ese import documentado; no seguir anunciando un subpath inexistente.
- [ ] Revisar árbol de dependencias y tree-shaking: importar tipos/layouts no debe arrastrar canvas, showcase o todos los motores innecesariamente.
- [ ] Verificar CSS exportado, `sideEffects`, cascada, variables de fuente, dark mode e iconos en un host sin Tailwind y en un host con Tailwind.
- [ ] Preparar `publishConfig.access: public`, metadatos coherentes, homepage de documentación, bugs, keywords React/TypeScript y archivo `files` explícito. Cambiar el manifiesto no equivale a publicar.
- [ ] Incluir guías de consumo, esquemas y ejemplos seleccionados en el paquete; excluir sitio, fixtures pesados, capturas y documentos de planificación. Reconsiderar publicar `src` únicamente tras verificar impacto en licencias, depuración y tamaño.
- [ ] Añadir un `prepack` acotado que genere los artefactos requeridos y falle si están incompletos. Mantener el conjunto exhaustivo de tests en CI/release para no introducir recursión entre `pack` y las pruebas de tarball.
- [ ] Dejar sourcemaps y subpaths individuales para los siete layouts como decisiones medibles: incorporarlos solo si mejoran depuración/tamaño sin ampliar innecesariamente el contrato de lanzamiento.

**Aceptación:** registro compartido entre entrypoints de una misma instalación; dos builds limpios producen el mismo conjunto de artefactos; tarball instalable; exports y tipos válidos; sin errores de CSS o límites cliente/servidor en fixtures. El check de `dist` detecta también archivos nuevos y eliminados, no solo diferencias de archivos ya seguidos.

### W03 · Identidad de relaciones y contrato de layouts

**Prioridad:** P0/P1 · **Tamaño:** M · **Depende de:** W01; validar junto a W02.

- [ ] Usar la identidad declarada de cada mensaje de secuencia; permitir identidades explícitas donde hagan falta relaciones paralelas en otros tipos.
- [ ] Definir y documentar el fallback determinista para relaciones sin ID y su estabilidad ante reordenación. No presentar un índice de array como identidad estable entre ediciones.
- [ ] Separar búsqueda por extremos, highlight de conectividad e identidad de renderizado.
- [ ] Probar mensajes repetidos, aristas paralelas, self-loops, grafos desconectados, IDs duplicados y claves que contengan delimitadores o caracteres especiales.
- [ ] Mantener identificadores DOM únicos entre instancias y estables durante hidratación; revisar si el `instanceId` obligatorio puede conservarse con documentación suficiente antes de cambiar la API.
- [ ] Aclarar el comportamiento real de `flowchart.level`. No documentarlo como nivel por nodo si es global; cualquier sustitución por niveles por nodo necesita diseño y migración explícitos.
- [ ] Inventariar límites de cada layout: ciclos admitidos, cardinalidades, textos largos, conjuntos vacíos, nodos aislados y geometría mínima. Clasificar errores frente a restricciones documentadas.
- [ ] Añadir notas de migración si consumidores observaban IDs de edges o comportamientos que ahora cambian.

**Aceptación:** ninguna colisión de keys/IDs en los casos reproducidos; selección y recorridos conservan todas las relaciones; no aparecen coordenadas no finitas ni fallos inesperados con los casos declarados soportados; toda limitación restante está probada y documentada.

### W04 · Contrato de datos, esquemas y validación sin evaluación

**Prioridad:** P0/P1 · **Tamaño:** L · **Depende de:** W03.

- [ ] Realizar una prueba técnica acotada con los siete tipos, la intersección de nodos swimlane y el wrapper localizado. Elegir generación de JSON Schema/validación solo si representa correctamente tipos requeridos, opcionales, unions y literales.
- [ ] Definir `validateDiagramSpec` como API propuesta con resultado discriminado y errores con ruta, código y explicación; decidir también validación del wrapper localizado y registro.
- [ ] Publicar esquemas por tipo y un esquema discriminado común, con identificadores/versiones y política de compatibilidad definidos. No aceptar claves de metadatos arbitrarias sin contrato.
- [ ] Validar `legend`, colecciones, elementos nulos, tipos de campo, valores no finitos, IDs únicos, extremos existentes, bandas/lanes válidas y topología consistente entre locales.
- [ ] Distinguir restricciones semánticas de límites defensivos del playground. No imponer silenciosamente a todos los consumidores el tamaño máximo de un enlace compartido.
- [ ] Eliminar `new Function` del editor y emplear parsing de datos; mostrar JSON editable y TSX generado como superficies distintas.
- [ ] Validar al importar/compartir/registrar datos según la política documentada. Evitar revalidar todo en cada render o dentro de cada paso de layout.
- [ ] Versionar fixtures válidos e inválidos; probar que tipos, esquemas, ejemplos y validador coinciden. La generación debe fallar ante drift.
- [ ] Garantizar que importar la validación no incorpora React, canvas ni iconos; registrar incremento de tamaño y dependencias.

**Aceptación:** los siete ejemplos pasan; casos malformados producen errores con localización sin ejecutar código; `legend: null` queda rechazado antes de renderizar; diferencias de contrato quedan detectadas por CI. La elección final de herramienta se registra con tamaño, mantenimiento y compatibilidad como tradeoffs.

### W05 · Editor, enlaces compartidos y exportación robustos

**Prioridad:** P0/P1 · **Tamaño:** L · **Depende de:** W04.

- [ ] Separar texto del borrador, spec válido y estado visual. Conservar último preview válido y borrador incorrecto; “Reintentar” no debe borrar trabajo implícitamente.
- [ ] Corregir detección de “Edited” usando comparación/huella del contenido canónico, no identidad del objeto. Diferenciar selección de ejemplo, edición e importación.
- [ ] Proteger borradores al cambiar locale/ejemplo y añadir confirmación donde se perderían cambios. Persistencia local y undo completo quedan en W15.
- [ ] Añadir envelope versionado a enlaces nuevos y lector compatible de enlaces existentes cuando sea seguro. Nunca evaluar el contenido de un enlace legacy.
- [ ] Establecer límites probados de bytes comprimidos, bytes expandidos, profundidad, nodos/relaciones y tiempo de procesamiento; abortar la descompresión antes de excederlos, no después de cargar todo.
- [ ] Definir explícitamente qué se comparte: spec y locale; theme solo si se incluye en el contrato y se valida. Diferenciar compartir el diagrama completo de exportar una selección/highlight.
- [ ] Mostrar errores de clipboard, compresión, decodificación, descarga e imagen; no anunciar copia correcta cuando la API falla.
- [ ] Documentar que el enlace no cifra el diagrama. No incluir tokens, secretos o configuración privada; explicar límites prácticos de longitud y privacidad.
- [ ] Contrastar SVG copiado, SVG descargado y PNG: fuentes embebidas o dependencia externa, variables CSS resueltas, IDs, fondos, escala y comportamiento de selección. No prometer portabilidad idéntica si no existe.
- [ ] Añadir descarga de spec JSON y código TSX válido; probar roundtrip de spec y exportaciones con textos/locales reales.

**Aceptación:** invalidar/restaurar/recargar/compartir no provoca crash ni pérdida silenciosa; enlaces legacy válidos siguen abriendo; cargas excesivas se rechazan de forma controlada; SVG se valida como XML y se abre en consumidores representativos; PNG tiene dimensiones/fondo documentados; fallos asíncronos son visibles y accesibles.

### W06 · README, ejemplos y documentación canónica

**Prioridad:** P0/P1 · **Tamaño:** L · **Depende de:** W02–W04; W05 para documentación de share/export.

- [ ] Crear ejemplo mínimo completo por cada tipo: band, flowchart, sequence, state-machine, ER, timeline y swimlane. Cada uno debe tener tipo concreto, imports públicos, CSS y datos válidos.
- [ ] Mostrar primero el camino de consumo directo sin registro global cuando no hace falta; explicar después el registro localizado. No obligar a duplicar en/es para un ejemplo que usa directamente un spec.
- [ ] Corregir quick start: datos completos, `labelPlacement` requerido, locales válidos, narrowing del tipo y callbacks funcionales si se anuncia interacción.
- [ ] Corregir generador de código mediante tipos explícitos o `satisfies`; no usar casts que escondan errores. Compilar las variantes de los siete tipos y ambos locales.
- [ ] Reestructurar README: propuesta concreta + imagen útil → instalación real → primer diagrama → documentación → uso con agentes → capacidades/límites → desarrollo/contribución → licencia/soporte.
- [ ] Eliminar instrucciones obsoletas de paquete privado, copia de fuentes o integración Next que ya no correspondan. Actualizar descripción, recuentos y badges solo a datos comprobables.
- [ ] Documentar API/export map, props, estado controlado, selección/focus/tooltip, `instanceId`, CSS/tokens/cascada, dark mode, portales, SSR y límites cliente/servidor.
- [ ] Documentar por tipo campos requeridos/opcionales, defaults, comportamiento, ejemplo mínimo, ejemplo real y límites de layout.
- [ ] Añadir recetas de Vite sin Tailwind, Next App Router, registro, localización, iconos, tematización, múltiples instancias y accesibilidad; separar APIs de librería de utilidades exclusivas del sitio.
- [ ] Añadir troubleshooting: CSS ausente, imports inválidos, tipos ensanchados, hidratación, SVG/fuentes, tamaño del canvas, IDs, locales y datos rechazados.
- [ ] Añadir guía de extensión para nuevos tipos/iconos, glosario y política de versiones/traducción. La referencia técnica extensa vive fuera del README.
- [ ] Comprobar enlaces e imágenes tanto en GitHub como en el README que se renderiza en npm; no depender de rutas relativas que se rompan allí.

**Aceptación:** una instalación limpia reproduce el primer diagrama copiando exactamente el ejemplo; todos los snippets ejecutables se compilan contra el tarball; ningún import documentado depende de internals; cada afirmación de soporte tiene una prueba o un límite explícito.

### W07 · Entrada raíz e integración universalista para agentes

**Prioridad:** P1 · **Tamaño:** M · **Depende de:** W04, W06.

#### Superficies propuestas

| Superficie | Audiencia | Contenido y responsabilidad |
|---|---|---|
| `AGENTS.md` en la raíz | Agente que modifica este repo | Mapa, comandos, convenciones, validaciones, fuentes vs generado, restricciones de publicación; enlaza a la guía de consumo |
| Guía `docs/agents/integrate.md` | Agente dentro de otro proyecto | Instalación, selección de tipo, imports, CSS, límites, ejemplos, validación y comprobación final |
| URL pública `/aesthc-diagram-lib/agents/` | Entrada que comparte el usuario | Página estática legible sin JS con enlace visible al Markdown equivalente y a la versión |
| URL pública `/aesthc-diagram-lib/llms.txt` | Descubrimiento automatizado | Índice breve generado de documentos y esquemas; no reemplaza la guía ni fuerza un agente concreto |
| Esquemas y ejemplos versionados | Herramientas de validación y generación | Contrato de datos, casos válidos/incorrectos y ejemplos que sí compilan |
| Documentación incluida en npm | Consumo con contexto local | Guía y ejemplos correspondientes exactamente a la versión instalada |

- [ ] Añadir “Use with your agent” cerca del inicio del README y en la navegación del sitio; explicar la diferencia entre usar la librería y contribuir al repositorio.
- [ ] Dar un prompt corto copiable con URL estable, versión instalada, framework del consumidor y requisito de validar el resultado. No pedir permisos elevados ni instalar herramientas de agente como requisito.
- [ ] En la guía, pedir primero inspección del proyecto consumidor; elegir package manager existente, respetar sus instrucciones y usar únicamente APIs de la versión instalada.
- [ ] Incluir ejemplo mínimo completo, tabla de decisión entre siete tipos, spec tipado, CSS, interacción, SSR, iconos, errores comunes y checklist de terminación.
- [ ] Prohibir instrucciones del tipo copiar `src` al consumidor, importar archivos privados, asumir exports futuros o declarar pruebas no ejecutadas.
- [ ] Generar índice, enlaces Markdown y eventual `llms-full.txt` desde el corpus de docs; el documento completo solo se añade si no duplica mantenimiento ni excede un presupuesto de contexto útil.
- [ ] Añadir “Copy for agent” al playground con spec actual validado, tipo, versión, locale, tokens relevantes, imports y checks. Escapar/delimitar datos para que labels y descriptions no se interpreten como instrucciones.
- [ ] Ofrecer una skill portable solo después de que la guía sin skill funcione; una skill no reemplaza documentación ni justifica acoplar el repo a un proveedor.
- [ ] Probar arranque en frío: agente recibe únicamente URL documental + solicitud de diagrama + acceso a fixture consumidor limpio. Antes de publicar, usar documentación del candidato servida en preview accesible y fixture con el tarball candidato instalado; después, repetir desde URL y registro públicos en W14. Medir imports inventados, lectura de internals, intervención manual, compilación y render final.
- [ ] Mantener una prueba humana del mismo recorrido. No usar una evaluación subjetiva del agente como sustituto de compilación, validación y browser checks deterministas.

**Aceptación:** guía disponible en tarball y salidas documentales legibles sin JS; el ensayo sobre el candidato en dos entornos de agente disponibles y distintos completa una integración sin skill obligatoria ni acceso al código interno. La comprobación de URLs de producción se cierra en W14. Si solo puede probarse un entorno, declarar ese alcance y no anunciar compatibilidad universal. Instalar/activar un segundo producto requiere autorización independiente.

### W08 · CI y verificación integrada

**Prioridad:** P1 · **Tamaño:** L · **Depende de:** W01–W07 para su base en F4; W11–W12 para el cierre browser/documental en F5. Los trabajos que requieren la base de CI no dependen de ese cierre posterior.

- [ ] Unificar comandos locales y CI mediante un `check` documentado; incorporar typecheck de sitio, build de sitio, paquete, tests y validación documental.
- [ ] Añadir fixture Next App Router que instale el tarball y pruebe límites cliente/servidor; mantener fixture Vite sin Tailwind y una prueba de convivencia con Tailwind.
- [ ] Definir jobs requeridos de unitarios, contrato/tipos, tarball, docs y browser. Evitar un producto cartesiano excesivo de versiones; documentar combinaciones probadas.
- [ ] Añadir E2E para siete tipos, locale, theme, selección, teclado, edición válida/inválida, share/reload, copy/export y múltiples instancias.
- [ ] Guardar regresiones visuales representativas: siete tipos × claro/oscuro, escritorio y móvil; fijar fuentes, datos y estado de animación para estabilidad.
- [ ] Añadir comprobaciones automáticas de accesibilidad y una lista manual de teclado/lector de pantalla. Registrar excepciones con motivo y issue, no silenciarlas globalmente.
- [ ] Detectar drift de generated files, exports, schemas, snippets, enlaces, assets y versiones. Incluir archivos no seguidos para que no pase un build incompleto.
- [ ] Introducir lint/format con configuración pequeña compatible con el estilo del repo; separar el reformat masivo, si hiciera falta, de cambios funcionales.
- [ ] Establecer presupuesto de JS/CSS/tarball después de medir la baseline en condiciones repetibles; presentar el diff y evitar umbrales arbitrarios sin datos.
- [ ] Hacer depender Pages de los checks relevantes. Incluir docs, schemas, ejemplos, manifiestos y generadores en los triggers de despliegue; hoy el filtro no contempla el futuro corpus documental.
- [ ] No exponer credenciales de publicación o permisos de escritura a builds de PR externos. Los previews de PR son opcionales y requieren un modelo de permisos propio.

**Aceptación:** una PR con snippet roto, registro aislado, export inexistente, esquema desfasado, crash reproducido o fallo de build del sitio queda bloqueada. Los comandos del contribuidor reproducen los checks obligatorios. Los artefactos de diagnóstico permiten revisar fallos sin adivinar.

### W09 · Seguridad y cadena de suministro

**Prioridad:** P1 · **Tamaño:** M · **Depende de:** W00; W04 y la base de W08 para cierre.

- [ ] Actualizar dependencias de desarrollo afectadas por los avisos verificados y sus transitivas, revalidando builds/tests. Revisar avisos actuales al ejecutar, sin copiar versiones de parche caducadas.
- [ ] Configurar alertas y actualizaciones de dependencias con frecuencia y agrupación sostenibles para un mantenedor; distinguir vulnerabilidades explotables de avisos no aplicables con justificación revisable.
- [ ] Activar, cuando estén disponibles, secret scanning, push protection y reporte privado de vulnerabilidades; verificar el estado efectivo en GitHub.
- [ ] Crear `SECURITY.md` con versiones soportadas, vía privada real, alcance y expectativas de respuesta razonables; nunca inventar un correo o SLA.
- [ ] Proteger `main` y tags de release con checks concretos. En un repo de mantenedor único, documentar bypass de emergencia sin crear una política de revisores imposible de cumplir.
- [ ] Reducir permisos por job, fijar Actions a revisiones verificadas y documentar cómo se actualizan. Mantener tokens fuera de logs y de builds no confiables.
- [ ] Revisar plugin de desarrollo que escribe galería: rutas confinadas, límites de payload y ausencia en el build público; no abrir un endpoint de escritura innecesario.
- [ ] Definir CSP compatible con sitio estático y eliminación de evaluación; comprobar qué controles pueden publicarse en Pages y cuáles requerirían otro hosting. No prometer headers que no se controlan.
- [ ] Documentar bootstrap de publicación npm, 2FA/recuperación de cuentas y publicación confiable con OIDC cuando el proveedor lo soporte. La configuración de cuenta corresponde al mantenedor.
- [ ] Añadir revisión de permisos y dependencias a cada release; no convertir `audit` sin clasificación de riesgo en un bloqueo arbitrario ni ignorar avisos aplicables.

**Aceptación:** configuración remota verificada tras aplicar cambios autorizados; ningún aviso aplicable queda sin corrección o excepción explícita; canal privado operativo; publicación sin secreto permanente innecesario; PR externo no obtiene permisos privilegiados.

### W10 · Comunidad, licencias y presentación de GitHub

**Prioridad:** P1 · **Tamaño:** M · **Depende de:** W00, W06.

- [ ] Añadir formularios de bug, feature y documentación con versión, entorno y reproducción mínima; guiar vulnerabilidades hacia el canal privado.
- [ ] Añadir plantilla de PR con motivo, cambios, pruebas realmente ejecutadas, screenshots si aplican y compatibilidad.
- [ ] Completar CONTRIBUTING: setup consistente, comandos reales, fuentes/generados, tests de paquete, sitio, agregar tipos/iconos, docs y proceso de release.
- [ ] Añadir código de conducta con contacto y responsable reales; documentar mantenedor, soporte, alcance de ayuda y expectativas sin prometer atención permanente.
- [ ] Verificar licencia raíz, contenido incluido en npm, SVG/iconos/marcas y procedencia/licencias de fuentes autoalojadas. Incluir avisos exigidos por sus licencias tras comprobar los archivos exactos distribuidos.
- [ ] Crear roadmap priorizado y, al ejecutar con autorización, convertir los trabajos en issues/milestones enlazados. Reutilizar labels existentes; no duplicarlas por estética.
- [ ] Decidir soporte por Discussions o issues de preguntas. Desactivar Wiki si seguirá vacío; no crear múltiples canales sin capacidad de mantenerlos.
- [ ] Incorporar CODEOWNERS solo si describe revisión real; valorar autoeliminación de ramas sin convertirla en requisito de lanzamiento.
- [ ] Alinear About, topics, homepage, descripción npm y claims del sitio. Subir manualmente la imagen social preparada a GitHub y verificar preview; el OG del sitio es una configuración distinta.
- [ ] Dejar patrocinio, CLA/DCO y gobernanza multinivel como opcionales. No introducirlos sin motivación ni presentar una revisión técnica como asesoría legal.

**Aceptación:** un externo sabe instalar, pedir ayuda, reportar un bug, contribuir y divulgar una vulnerabilidad; las rutas de contacto existen; ningún asset distribuido carece de una verificación de procedencia/licencia documentada; metadatos y previews representan el producto real.

### W11 · Arquitectura de información, documentación web y descubrimiento

**Prioridad:** P1 · **Tamaño:** L · **Depende de:** W06–W07; toma el contrato de versiones de W00. La comprobación de la versión pública definitiva se realiza en W14, no bloquea el desarrollo del sitio.

- [ ] Conservar identidad visual; acortar la introducción y mostrar un diagrama real cerca del comienzo. La propuesta, instalación y navegación deben ser visibles antes de recorrer toda la galería.
- [ ] Añadir navegación a Getting started, los siete tipos, API, ejemplos, agentes y GitHub; proporcionar enlaces profundos estables.
- [ ] Generar documentación HTML estática desde Markdown sin obligar a ejecutar React para leer instalación/API/guía de agentes. Mantener el playground interactivo como mejora progresiva.
- [ ] Publicar Markdown accesible y enlazado desde HTML, índice para agentes y esquemas; respetar el base path de GitHub Pages.
- [ ] Resolver rutas con directorios/HTML estático y página 404 útil, sin depender de rewrites de servidor que Pages no ofrece por defecto.
- [ ] Añadir títulos/descripciones por página, canonical, social metadata y sitemap para URLs realmente publicadas. No inventar rutas para inflar el sitemap.
- [ ] Revisar descubrimiento por crawlers teniendo en cuenta que `robots.txt` opera en la raíz del dominio; no prometer control del dominio completo desde una subruta de proyecto.
- [ ] Identificar versión estable y, si existe, documentación de desarrollo. Preservar URLs de documentos versionados y evitar enlazar desde una release a ejemplos exclusivos de `main`.
- [ ] Mantener UI en/es y traducciones coherentes; establecer fallback visible en docs sin fingir contenido traducido inexistente.
- [ ] Documentar privacidad y funcionamiento local del playground con precisión; no afirmar funcionamiento offline total sin probar assets, fonts, navegación y exports.

**Aceptación:** navegación e instalación funcionan con enlaces directos; docs/guía de agentes se leen con JS desactivado; build bajo `/aesthc-diagram-lib/` sin enlaces rotos; metadatos y sitemap corresponden a contenido real y versión publicada.

### W12 · Accesibilidad, móvil y calidad de experiencia

**Prioridad:** P1 en barreras; P2 en refinamientos · **Tamaño:** L · **Depende de:** W05, W11.

- [ ] Medir contraste de texto, labels, bordes funcionales, selección y focus en ambos temas. No concluir cumplimiento o incumplimiento a partir de una captura o de la opacidad aislada.
- [ ] Añadir skip link, jerarquía de encabezados, nombres accesibles, estados/errores anunciados y semántica correcta de tabs/controles.
- [ ] Completar pruebas de teclado: navegación, selección, salida de tooltip, focus visible, scroll al elemento enfocado y ausencia de trampas. Conservar el comportamiento de Enter que ya funciona.
- [ ] Proporcionar descripción textual útil de nodos/relaciones para que el SVG no sea la única representación de la información.
- [ ] Revisar targets táctiles: 28 px no constituye por sí solo un fallo del mínimo de 24 px; buscar una experiencia cómoda, idealmente mayor, respetando las excepciones aplicables y sin declarar cumplimiento no medido.
- [ ] Corregir header móvil y ofrecer indicación de desplazamiento/fit para canvas ancho sin reducir texto a tamaños ilegibles. Zoom/pan avanzado puede seguir en W15 si el recorrido móvil básico queda usable.
- [ ] Respetar zoom del navegador, alto contraste, reducción de movimiento y `color-scheme`; evitar animación que impida inspección/copia/export.
- [ ] Hacer visible el efecto de Theme Studio con preview cercano y reset claro. No obligar a volver al inicio para entender cada cambio de token.
- [ ] Medir carga inicial, interacción del editor y coste de los siete diagramas. Aplicar lazy loading/división de código solo donde las mediciones justifiquen la complejidad.
- [ ] Revisar claro/oscuro, escritorio/móvil y contenido largo; incluir capturas comparables y una pasada manual con lector de pantalla.

**Aceptación:** recorrido instalar/explorar/editar/copiar usable con teclado y móvil; sin errores críticos de accesibilidad automatizada pendientes sin explicación; contraste documentado; no se pierde contenido al ampliar; los targets y estados se comprueban manualmente. No anunciar una certificación WCAG por pasar un escáner.

### W13 · Preparación de releases y publicación verificable

**Prioridad:** P1 · **Tamaño:** M · **Depende de:** W00, W02, W08–W10.

- [ ] Documentar un único proceso: PR de versión/changelog → aprobación → comprobaciones sobre commit exacto → tag coherente → publicación → verificación pública → actualización de documentación estable.
- [ ] Añadir workflow de publicación con permisos mínimos, entorno de release y autenticación confiable cuando esté disponible; separar bootstrap inicial de publicaciones siguientes.
- [ ] Verificar requisitos actuales de npm/Node/OIDC y compatibilidad del repositorio/proveedor al implementar. Si el primer paquete requiere una acción manual, explicitarla sin dejar credenciales permanentes por defecto.
- [ ] Comprobar que tag, versión de manifiesto, changelog, GitHub Release y artefacto construido corresponden al mismo commit. Un rerun debe reconocer estados ya completados sin intentar sobrescribir versiones.
- [ ] Ejecutar gates exhaustivos antes de publicar; registrar checksum/manifiesto del tarball y provenance/attestations cuando se puedan generar correctamente.
- [ ] Reconstruir notas de 0.2.1/0.2.2 desde sus diffs reales si se decide completar GitHub Releases históricos. No mover tags, inventar fechas o presentar esos tags como publicaciones npm verificadas.
- [ ] Escribir notas útiles: cambios, correcciones, incompatibilidades, migración, instalación y soporte. No limitarse a un listado automático de commits.
- [ ] Documentar política pre-1.0, deprecaciones, mantenimiento, dist-tags y separación de docs estable/desarrollo.
- [ ] Preparar rollback operativo: corregir con una versión nueva, ajustar dist-tag o deprecar según el caso; restaurar el último deploy conocido. No usar borrado/republicación como estrategia normal.
- [ ] Ensayar el workflow hasta empaquetado/verificaciones en modo no publicador. SBOM y firma adicional quedan sujetos a valor real, además de provenance.

**Aceptación:** un mantenedor puede ejecutar el runbook sin conocimiento implícito; simulación sin publicar pasa; versiones no se pueden sobrescribir por reruns; permisos, credenciales, artefactos y rollback están documentados. El cierre de W13 deja todo preparado, no publicado.

### W14 · Lanzamiento y comprobación externa

**Prioridad:** P1 · **Tamaño:** M · **Depende de:** todos los requisitos de lanzamiento W00–W13 y aprobación de las acciones públicas.

- [ ] Congelar candidato de release y repetir controles sobre ese commit, no sobre un árbol con cambios locales.
- [ ] Revisar el diff público, notas de migración, licencias, contactos, tamaño de paquete y documentación versionada.
- [ ] Obtener confirmación del mantenedor sobre cuenta/scope, versión, visibilidad pública y configuración remota pendiente.
- [ ] Publicar el paquete y la GitHub Release mediante el procedimiento acordado; desplegar documentación estable coherente con esa versión.
- [ ] Consultar metadatos npm e instalar desde un entorno sin credenciales ni caché previa; verificar el paquete realmente descargado y no un enlace local.
- [ ] Repetir recorrido humano del README y recorrido de agente desde la URL pública con el paquete publicado.
- [ ] Verificar enlaces, esquemas, descargas, OG del sitio y GitHub, versión visible y páginas con/sin JavaScript.
- [ ] Registrar resultados y limitaciones conocidas en la release; mantener changelog y roadmap sincronizados.
- [ ] Realizar comprobación manual tras la propagación de registros/cachés. Cualquier monitor recurrente requiere petición separada; este plan no crea automatizaciones.

**Aceptación:** instalación pública anónima y ejemplos confirmados; release, tag, npm, sitio y docs coherentes; smoke externo verde. Un fallo de publicación parcial se recupera con el runbook sin reetiquetar commits existentes ni afirmar que el lanzamiento terminó.

### W15 · Backlog posterior: mejorar sin inflar el lanzamiento

**Prioridad:** P2/P3 · **Tamaño:** variable · **Depende de:** métricas/demanda y base estable.

| Mejora | Motivo / criterio para activarla | Validación mínima |
|---|---|---|
| Componente de alto nivel `Diagram` o hook equivalente | El arranque sigue exigiendo demasiado código después de arreglar docs | Reduce boilerplate sin esconder control, añade ejemplo de migración y test SSR |
| Registro explícito por instancia y unregister | Consumidores necesitan aislamiento, limpieza o SSR multi-tenant | No comparte datos entre solicitudes y no rompe el registro opcional actual |
| Niveles por nodo en flowchart | Caso real no resuelto con el contrato actual | Semántica y migración documentadas, ciclos y estabilidad probados |
| Subpaths por layout y sourcemaps | Beneficio medido en bundles/depuración | Diferencia de tamaño, exports/tipos y ausencia de filtraciones no deseadas |
| Benchmarks y límites de escala publicados | Usuarios intentan diagramas grandes | Dataset reproducible, tiempo/memoria por tamaño y límites declarados |
| Persistencia de borradores, undo/redo y presets | Se pierde continuidad de sesiones de edición | Migración de almacenamiento, reset, privacidad y recuperación probados |
| Editor enfocado y galería separada | La página de siete editores dificulta trabajo prolongado | Pruebas de navegación y tarea completa con menor fricción |
| Pan/zoom avanzado y exports configurables | El fit/scroll y las opciones básicas no cubren usos reales | Teclado/touch, escala/fondo/fuentes y compatibilidad de salida |
| Skill portable opcional | Agentes repiten pasos aun con la guía correcta | Misma fuente documental, sin privilegios y versionado explícito |
| `llms-full.txt` generado | Un índice corto no basta en clientes observados | Sin drift, tamaño de contexto razonable y contenido por versión |
| CLI o MCP | Hay tareas de ejecución/remotas que las docs no resuelven | Caso de uso, modelo de seguridad y coste de mantenimiento demostrados |
| PR previews, SBOM y verificaciones adicionales | Mejoran revisión o exigencias concretas de consumidores | Sin secretos de PR externo, artefactos trazables y proceso mantenible |
| Dominio propio, traducciones completas y ejemplos comunitarios | Demanda y capacidad de mantenimiento | Redirecciones, versionado, enlaces y atribuciones verificados |
| Discussions, patrocinio y gobernanza ampliada | Volumen real de comunidad | Responsable, reglas y canales sin duplicación |
| Retirar `dist` del control de versiones | npm público está consolidado y el consumo Git tiene migración | Builds limpios, instalación documentada y ninguna promesa rota |

## 7. División propuesta en PRs

Una PR por responsabilidad revisable. W01 aporta pruebas a las PRs funcionales: no crear una PR que haga fallar `main` para demostrar errores conocidos. Trabajos grandes pueden dividirse conservando su puerta de aceptación.

| Orden orientativo | Título técnico propuesto, en inglés | Alcance |
|---|---|---|
| 1 | `docs: define support matrix and public release contract` | W00 |
| 2 | `fix(build): share registry state across package entrypoints` | W01 + parte W02 |
| 3 | `fix(layout): preserve distinct identities for parallel relations` | W01 + W03 |
| 4 | `build(package): verify exports and generate clean release artifacts` | resto W02 |
| 5 | `feat(validation): validate diagram data against versioned contracts` | W04 contrato/esquemas |
| 6 | `fix(playground): parse data without evaluating JavaScript` | W04 parser + W05 estado/errores |
| 7 | `fix(share): validate versioned payloads and preserve edited drafts` | W05 share |
| 8 | `fix(export): report failures and verify portable diagram output` | W05 export |
| 9 | `docs: generate compilable quick starts and diagram examples` | W06 README/ejemplos/snippets |
| 10 | `docs: document public APIs and supported integrations` | W06 referencia/recetas |
| 11 | `docs(agents): add versioned integration entrypoints` | W07 guía/índice/root |
| 12 | `ci: validate packed consumers and documentation contracts` | W08 gates de paquete/docs |
| 13 | `ci(security): harden workflows and dependency maintenance` | W09 código; ajustes remotos por checklist |
| 14 | `docs(community): define contribution and security workflows` | W09 políticas + W10 |
| 15 | `feat(site): publish static documentation and agent navigation` | W11 + superficie web W07 |
| 16 | `fix(a11y): improve keyboard and mobile diagram workflows` | W12 |
| 17 | `test(site): cover editing sharing exports and visual regressions` | cierre browser W08 |
| 18 | `ci(release): publish verified package artifacts from release tags` | W13 |
| 19 | `chore(release): prepare the next public package version` | W14 preparación; versión concreta al aprobar |

**Ramas:** prefijo `alanslzrr/`. **Commits:** Conventional Commits, en inglés, técnicos y con una sola responsabilidad; preferir hasta tres archivos cuando la separación sea limpia. Generación de `dist`/schemas puede formar un commit propio de artefactos asociados al cambio, no una edición manual.

No añadir trailers de coautoría, firmas automáticas ni metadatos de generación. Las PRs deben describir Summary, Motivation, Changes, Architecture and flow cuando aporte, Commit breakdown, Validation y Risks and review notes. Declarar solo verificaciones ejecutadas.

## 8. Matriz de validación y puertas de calidad

| Capa | Casos obligatorios | Evidencia esperada |
|---|---|---|
| Contrato | 7 tipos; defaults/opcionales; locales; IDs; referencias; datos degenerados | Tests estructurales y semánticos; fixtures positivos/negativos |
| Geometría | Paralelas, ciclos admitidos, self-loops, desconectados, texto largo | Coordenadas finitas, invariantes y snapshots revisados |
| Distribución | Export map completo, registro entre imports, instalación aislada, CSS | Tarball y logs del consumidor sin aliases/workspace |
| TypeScript | README, código generado, recetas, tipos publicados | Compilación estricta de snippets reales |
| React/SSR | React 18/19 según soporte; Vite; Next App Router; múltiples canvases | Render/hidratación sin errores ni IDs duplicados |
| Estilos | Sin Tailwind; con Tailwind; claro/oscuro; fuentes y portales | Capturas y asserts sobre estilos de salida |
| Browser | Chromium, Firefox y WebKit representativos; móvil y escritorio | E2E, fallos de consola revisados y artefactos de diagnóstico |
| Accesibilidad | Teclado, focus, lector de pantalla, contraste, zoom y movimiento | Checks automáticos más registro manual de recorridos |
| Robustez | `legend: null`, elementos inválidos, payloads excesivos, clipboard denegado | Errores visibles sin crash ni pérdida de borrador |
| Share/export | Enlaces nuevos/legacy, locale, SVG/PNG/JSON/TSX | Roundtrip, XML válido, dimensiones y dependencias de fuentes |
| Documentación | HTML sin JS, Markdown, llms, schemas, imágenes, enlaces y base path | Check de generación, links y lectura pública |
| Adopción de agentes | URL solamente, paquete instalado, imports públicos, estilo y build | Resultado reproducible, intervenciones y límites declarados |
| Release | Tag/manifiesto/changelog/npm/docs; permisos; rerun y recuperación | Simulación y comprobación pública tras autorización |

### Comandos existentes de la baseline

Estos comandos existen hoy; escribirlos aquí **no significa volver a ejecutarlos ni garantizar que seguirán pasando tras cambios**:

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm --dir site exec tsc --noEmit
pnpm --dir site build
npm pack --dry-run --json --ignore-scripts
pnpm audit
pnpm audit --prod
git diff --check
git diff --exit-code dist/
```

En la auditoría previa pasaron typecheck, 29 tests, build del paquete, typecheck/build del sitio y sincronización del `dist` seguido. Los avisos de desarrollo se registraron por separado; `audit --prod` no reportó avisos. No se ejecutó una auditoría completa Lighthouse/axe, una matriz completa de navegadores ni verificación de todas las descargas.

### Comandos por incorporar

`test:package` ya existe desde el primer incremento: construye y ejecuta el consumidor aislado. Los nombres siguientes siguen siendo **propuestas**, no scripts existentes: `check`, `test:docs`, `test:e2e`, `test:a11y`, `docs:build`, `docs:check` y `release:check`. W08/W13 deben definir su implementación, inputs, duración y relación con `build` para evitar bucles y compilaciones duplicadas.

### Regla de cierre

Ningún trabajo se considera terminado por añadir archivos, subir coverage o lograr una captura atractiva. Debe cumplir su aceptación, pasar los checks aplicables, actualizar documentación del comportamiento y registrar limitaciones. Un check que no puede ejecutarse se declara pendiente; no se reemplaza con una afirmación de éxito.

## 9. Riesgos y mitigaciones

| Riesgo | Mitigación / recuperación |
|---|---|
| Cambiar bundling rompe `use client` o tipos | Fixture Next + tarball + revisión de entrypoints antes de mezclar otras mejoras |
| IDs nuevos alteran selección o integraciones existentes | Contrato de identidad explícito, regresiones por tipo y notas de migración |
| Validación estricta rechaza ejemplos antes aceptados | Corpus real, errores accionables, política de compatibilidad y conversión documentada |
| JSON elimina comodidad del editor JavaScript | Separar editor de datos y snippet TSX, facilitar copy/download sin ejecutar texto |
| Descompresión excede memoria antes de validar | Límites durante el stream, límites de estructura y fixtures hostiles |
| Docs de `main` muestran API no publicada | Canal estable asociado a versión y canal development claramente etiquetado |
| Generar docs crea nuevas fuentes duplicadas | Corpus único, generación determinista y CI contra drift |
| Fixture hereda dependencias del monorepo y da falso verde | Instalar tarball en ubicación aislada y comprobar rutas resueltas |
| Cambio CSS arregla site y rompe hosts externos | Pruebas con y sin Tailwind, iconos/fuentes/portales, capas y modo oscuro |
| Reglas de GitHub bloquean al único mantenedor | Política realista, checks requeridos y bypass documentado para recuperación |
| Primer publish/OIDC no está disponible como se esperaba | Verificar cuenta temprano, bootstrap explícito sin guardar secretos en repo |
| Publicación npm y deploy quedan parcialmente completados | Runbook idempotente, verificar estado remoto antes de reintentar y no mover tags |
| La auditoría depende de datos remotos cambiantes | Refrescar versiones, avisos, estado de cuenta y configuraciones al ejecutar |
| El alcance de “TODO” impide lanzar | Mantener P0/P1 como gates; W15 contiene mejoras opcionales con disparadores reales |

## 10. Decisiones del mantenedor antes de acciones públicas

No hacen falta respuestas para terminar este plan. Sí hacen falta antes del paso correspondiente:

1. **npm:** confirmar cuenta/scope, paquete público y acceso de publicación. Recomendación: mantener `@aesthc/diagram-lib` si está bajo control del mantenedor.
2. **Versión:** aprobar número y tratamiento de cambios incompatibles tras revisar diff. Recomendación: siguiente minor pre-1.0, no prometer estabilidad 1.0 aún.
3. **Contactos:** aportar canal privado de seguridad y responsable de conducta/soporte. No usar direcciones inventadas.
4. **GitHub:** autorizar cambios de reglas, seguridad, Discussions/Wiki y presentación social; aplicar con privilegios mínimos y sin bloquear recuperación.
5. **Publicación:** aprobar el lanzamiento concreto una vez todos los gates estén verdes. Aprobar este plan no equivale a publicar ni a instalar productos adicionales para evaluaciones.

Las decisiones técnicas acotadas —generador de schemas, identidad compatible de edges, versión de runtime de CI— se resuelven durante sus trabajos con evidencia y registro del tradeoff. Cambios mayores de API o infraestructura se presentan antes de ejecutarlos.

## 11. Cobertura de la auditoría original

| Área auditada | Lanzamiento | Posterior/opcional |
|---|---|---|
| Package, exports, install, CSS, tipos y metadatos | W00–W02 | Subpaths extra, sourcemaps y retirada de dist en W15 |
| Release, changelog, tags, semver y rollback | W13–W14 | Automatización de versionado más compleja solo por necesidad |
| README, primeros pasos, badges e imágenes | W06, W10 | Traducciones completas con capacidad de mantenimiento |
| API, ejemplos, recetas, SSR y documentación por tipo | W03–W06 | API de alto nivel y nuevos controles en W15 |
| Web, móvil, editor y personalización | W05, W11–W12 | Persistencia, undo y editor dedicado en W15 |
| Accesibilidad y diseño visual | W12 | Refinamientos continuos con medición |
| Corrección, rendimiento y límites | W03–W04, W08, W12 | Benchmarks de escala y APIs nuevas en W15 |
| Share, SVG, PNG y formatos de datos | W05 | Export configurable avanzado en W15 |
| CI, tests de consumidor, docs y previews | W01, W08 | Previews externos solo con permisos seguros |
| Seguridad y supply chain | W04, W09, W13 | SBOM adicional si aporta a consumidores |
| Comunidad, licencias y gobernanza | W10 | Patrocinio, CLA/DCO o estructura ampliada si se justifican |
| Descubrimiento, metadata, estático y SEO | W10–W11 | Dominio propio opcional |
| Acceso para agentes, root, schemas y contexto | W04, W06–W07 | Skill, índice completo, CLI o MCP sujetos a necesidad |

## 12. Mapa de archivos para ejecución

Las siguientes rutas son absolutas. Las marcadas como **nuevas propuestas** no existen por el hecho de figurar en el plan; la estructura final puede ajustarse al implementar sin cambiar las responsabilidades. Los directorios existentes pueden recibir archivos nuevos.

### Existentes

- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/package.json` — metadatos, exports, scripts y publicación.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/tsup.config.ts` — empaquetado, módulos compartidos y limpieza.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/types.ts` — contrato de specs y compatibilidad pública.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/registry.ts` — registro y política de validación.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/layout.ts` — normalización, identidad y conectividad.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/layouts/` — siete motores y casos degenerados.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/canvas/DiagramCanvas.tsx` — IDs, interacción, accesibilidad y múltiples instancias.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/showcase/index.ts` — superficie pública de showcase.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/showcase/entries.ts` — datos de ejemplos para showcase.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/examples.ts` — ejemplos localizados actuales.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/styles.css` — contrato de estilos y fuentes.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/icon-styles.css` — visibilidad de iconos fuera de la capa principal.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/scripts/` — postprocesado del build y futuros generadores/checks.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/README.md` — entrada humana y derivación al recorrido de agentes.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/CONTRIBUTING.md` — setup y flujo de contribución.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/CHANGELOG.md` — historia de versiones y migraciones.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/LICENSE` — licencia principal; no sustituye avisos de terceros.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/.github/workflows/ci.yml` — checks obligatorios.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/.github/workflows/deploy-site.yml` — build y despliegue de Pages.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/tests/` — pruebas actuales y nuevas regresiones.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/site/src/App.tsx` — navegación, composición e i18n/theme.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/site/src/content.ts` — texto público y traducción.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/site/src/components/DiagramPanel.tsx` — editor, spec válido y estado de panel.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/site/src/components/ThemeStudio.tsx` — personalización y preview cercano.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/site/src/components/chrome.tsx` — navegación y controles visuales.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/site/src/components/ui.tsx` — estados de controles y errores.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/site/src/lib/code.ts` — snippets de datos/integración y contexto de agentes.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/site/src/lib/share.ts` — envelope, límites y compatibilidad de enlaces.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/site/src/lib/svg-export.ts` — copia y descargas SVG/PNG.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/site/index.html` — metadata y documento inicial.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/site/vite.config.ts` — base path, consumo y generador de galería de desarrollo.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/site/src/fonts.css` — fuentes autoalojadas y su distribución.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/docs/og.png` — imagen candidata para social preview de GitHub.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/docs/diagrams/` — assets actuales; recibirá documentación por tipo diferenciada de la generación de imágenes.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/site/public/og.png` — imagen social del sitio.

### Nuevas propuestas

- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/AGENTS.md` — mantenimiento del repositorio por agentes.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/SECURITY.md` — divulgación y versiones soportadas.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/CODE_OF_CONDUCT.md` — conducta y contacto real.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/SUPPORT.md` — canales y alcance de ayuda.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/ROADMAP.md` — prioridades mantenidas y enlaces a issues.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/docs/getting-started.md` — primer uso canónico.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/docs/api/` — referencia de contratos y exports.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/docs/guides/` — integración, tematización, SSR y troubleshooting.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/docs/agents/integrate.md` — entrada canónica de consumo por agentes.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/docs/maintainers/releasing.md` — runbook de versión/publicación/recuperación.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/docs/decisions/` — decisiones acotadas con tradeoffs y compatibilidad.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/validation/` — validación pública independiente del canvas.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/schemas/` — esquemas generados/versionados del contrato.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/examples/` — ejemplos completos de consumo y fuente de snippets.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/tests/fixtures/` — consumidores aislados y corpus válido/inválido.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/.github/ISSUE_TEMPLATE/` — formularios de contribución.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/.github/PULL_REQUEST_TEMPLATE.md` — evidencia y contexto para revisión.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/.github/dependabot.yml` — mantenimiento de dependencias.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/.github/workflows/release.yml` — publicación controlada.

Los outputs HTML/Markdown públicos, `llms.txt` y esquemas servidos se producirán dentro del build del sitio. Su fuente editable será el corpus anterior; no se editarán a mano copias generadas en varios directorios.

## 13. Siguiente paso de ejecución

El primer incremento ya cubre las regresiones y el arreglo del registro de W01/W02. Completar las decisiones de compatibilidad pendientes de W00 y continuar con **W03: identidad de relaciones**, sin dar por cerrados los demás requisitos de distribución.

Después: identidad de relaciones → datos seguros → documentación ejecutable → entrada para agentes. No empezar por una nueva landing, un servidor MCP o una automatización de publicación antes de estabilizar ese recorrido.

## Key Learnings:

1. La preparación open-source debe validarse desde el paquete que instalará el consumidor, no solo desde las fuentes del mantenedor.
2. La entrada raíz para agentes debe separar mantenimiento del repo e integración en otros proyectos, con documentación y ejemplos versionados compartidos.
3. Preparar una release y ejecutarla son hitos distintos: la publicación llega después de las comprobaciones de adopción y de la autorización del mantenedor.
