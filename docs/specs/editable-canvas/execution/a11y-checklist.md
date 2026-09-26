# Checklist de accesibilidad (E19): evidencia automatizada y sesión humana

> Actualizado el 2026-09-26 sobre el commit mergeado
> `1d1156f211d049349961bb4962112f7e4b57bd09` (CI de push
> [36234713367](https://github.com/alanslzrr/aesthc-diagram-lib/actions/runs/36234713367),
> deploy [36235599979](https://github.com/alanslzrr/aesthc-diagram-lib/actions/runs/36235599979)).
> Las interfaces M2 (viewer, lenses, story, minimapa, presentación, HTML offline,
> shares/cards, formatos) y M3 (comparación, evidencia/perfil, WebM/trace) ya
> existen; la frase «cuando existan» de la versión anterior de este documento
> quedó eliminada porque no describe el producto actual.

Este checklist tiene dos niveles y **no se mezclan**:

1. **Automatizado** (§6): gates que ya corren en CI y localmente. No certifican
   accesibilidad completa por sí solos.
2. **Humano** (§1–§5, §7): revisión de foco/contraste/reflow/zoom y sesión con
   lector de pantalla. Requiere **persona, fecha y navegador**. Hasta que la
   tabla de sesiones de §7 esté completa, la aceptación humana sigue
   **pendiente** y así debe reportarse.

Combinaciones previstas por `06-tdd.md` §6.5:

| Combinación | Estado |
|---|---|
| VoiceOver + Safari (macOS) | **Pendiente de persona.** Combinación primaria de esta máquina. |
| NVDA + Firefox (Windows) | **No ejecutada y no disponible en este equipo.** Documentar así al cerrar la sesión de VoiceOver. |

## 0. Preparación de la sesión (una vez)

Requisitos: Node 22.14+ y `pnpm` del `packageManager`. Desde la raíz:

```sh
pnpm install --frozen-lockfile
pnpm build && pnpm site:build
node scripts/build-offline-sample.mjs   # test-results/a11y/offline.html
PLAYWRIGHT_PORT=42900 pnpm --dir site exec vite preview --host 127.0.0.1 --port 42900 --strictPort
```

Puntos de entrada locales:

| Superficie | URL |
|---|---|
| Landing / playground | `http://127.0.0.1:42900/` |
| Studio (edición) | `http://127.0.0.1:42900/studio.html` |
| Viewer semántico (M2/M3) | `http://127.0.0.1:42900/viewer.html` |
| Docs | `http://127.0.0.1:42900/docs/` |
| HTML offline | `file://<ruta absoluta>/test-results/a11y/offline.html` |

Entorno de la sesión:

- Navegador: Safari del sistema con VoiceOver (`Cmd+F5` para activar/desactivar).
- Versión de Safari, versión de macOS y fecha en la tabla de §7.
- Tema claro y oscuro; idioma inglés y español. En Studio se cambian con los
  controles `Theme` y `Language`; el viewer usa `Language` y hereda el tema del
  documento (el fixture es claro).
- Zoom de página 100 % y 200 % (`Cmd+` / `Cmd+-` en Safari).
- Ancho de ventana 320, 400, 768 y 1280 px (redimensionar o usar el modo
  responsivo de las herramientas de desarrollo).

## 1. Foco, contraste, reflow y zoom (sin lector)

Recorrer Studio (`/studio.html`) y Viewer (`/viewer.html`) en claro/oscuro y
es/en:

- [ ] **Foco:** tabulación completa por toolbar, outline, inspector, panel JSON,
      controles de cámara, story y evidencia; orden lógico; anillo visible con
      VoiceOver activo y sin él; sin trampas de teclado; `Escape` cierra
      presentación/consulta y devuelve el foco al disparador.
- [ ] **Contraste:** WCAG AA (4.5:1 texto, 3:1 UI) comprobado de forma
      independiente de axe en controles, texto del canvas, outline, mensajes de
      estado, alertas y controles deshabilitados, en ambos temas.
- [ ] **Reflow:** a 320 px no hay scroll horizontal ni controles perdidos;
      400/768/1280 px refluyen sin solaparse; zoom de página 200 % sin recortes
      (el E2E T44.2 es evidencia complementaria, no la sustituye).
- [ ] **Objetivos táctiles:** en ventana estrecha los controles conservan un
      objetivo útil (≥44 px con puntero grueso); verificar los nuevos controles
      de viewer/story/export.

Evidencia esperada: captura o nota por hallazgo, con URL, tema, idioma y ancho.

## 2. Flujo completo de edición sin puntero

En `/studio.html`, sin ratón ni trackpad (solo teclado; activar VoiceOver
opcionalmente en una segunda pasada):

- [ ] Abrir `Diagram outline`, seleccionar un nodo publicado con `Enter`.
- [ ] `Add node` → escribir etiqueta → `Apply label`.
- [ ] Mover con flechas (1 px) y con `Shift`+flecha (16 px).
- [ ] Conectar: `Connect: <nodo>` con `Enter`, elegir el destino con `Enter`.
- [ ] Borrar con `Delete` y recuperar con `Cmd+Z`; rehacer con `Cmd+Shift+Z`.
- [ ] `Save locally` → confirmar el anuncio de guardado.
- [ ] Exportar: elegir formato, `Download` → confirmar anuncio y descarga.
- [ ] Guard comprobado: con el foco fuera del canvas, `Delete`, `Backspace`,
      `Cmd+C` y `Cmd+S` no alteran el documento (T44.2).

Criterio: el flujo T44.1 es realizable sin puntero y **cada acción se anuncia**
en el idioma seleccionado (región de estado visible y parlante).

## 3. Lector de pantalla: VoiceOver + Safari

Activar VoiceOver (`Cmd+F5`). Recorrer con `Ctrl+Option+→/←` y activar con
`Ctrl+Option+Space`. En cada superficie comprobar que los nombres, roles y
estados se anuncian de forma comprensible y en el idioma elegido.

### 3.1 Studio

- [ ] Cabecera y toolbar: `Undo`, `Redo`, `Save locally`, selección de `Theme`,
      `Language`, formato y calidad de exportación.
- [ ] Outline: nodos, conexiones y grupos se anuncian como botones con su
      nombre; `Shift+Space` añade a la selección sin editar.
- [ ] Inspector: campo `Label`, `Apply label`, geometría, relaciones.
- [ ] Panel JSON: editable, anuncia errores sin perder el último documento
      válido.
- [ ] Mensajes: cambios sin guardar, guardado, exportación y errores de
      almacenamiento se anuncian como región viva.

### 3.2 Viewer semántico (`/viewer.html`)

- [ ] Finder de origen/destino: al escribir, los resultados se anuncian con
      orden determinista; `Escape` limpia y devuelve el foco; cero resultados se
      anuncia.
- [ ] Inspector: descripción, roles, enlaces seguros y relaciones entrantes y
      salientes **con su ID exacto** (las paralelas no se fusionan).
- [ ] Ruta y alcance: resumen anunciado, IDs de relación navegables, y al
      cambiar el documento se anuncia la invalidación (sin resaltado ni export
      obsoletos).
- [ ] Lentes de roles/etiquetas: el dimming no altera la topología anunciada.
- [ ] Colapso de grupo: los proxies conservan el ID original de la relación.
- [ ] Minimapa y cámara: `Zoom in/out`, `Fit` y el porcentaje de zoom se
      anuncian; arrastrar el minimapa no cambia el documento.
- [ ] Perfil de despliegue (M3): al activarlo aparecen diagnósticos
      navegables (`profile.owner-missing`, `profile.public-entity`,
      `profile.region-conflict`, `profile.crossing-missing`); la exportación de
      publicación queda bloqueada y **no** se auto-desactiva.
- [ ] Evidencia (M3): lo declarado nunca se anuncia como verificado.

### 3.3 Presentación, stories y WebM (M2/M3)

- [ ] `Present` entra en pantalla completa (o fallback CSS si Safari la niega);
      `Escape` sale y el foco vuelve al disparador.
- [ ] Story: `Play/Pause`, `Previous`, `Next`, `Stop` y el indicador `n/total`
      se anuncian; la historia termina sola y nunca arranca sin orden.
- [ ] Con `prefers-reduced-motion: reduce` (Ajustes > Accesibilidad > Mostrar
      movimiento reducido): `Play` está deshabilitado con motivo, y
      `Next/Previous` siguen funcionando.
- [ ] `Export WebM`: si Safari no soporta el códec, el botón está deshabilitado
      y se anuncia «WebM is unavailable in this browser»; si lo soporta, la
      grabación termina con archivo reproducible y `Cancel export` libera sin
      descargar nada.

### 3.4 Comparación (M3)

En `/viewer.html`, `Import JSON` con un documento base y `Compare with…` con una
variante (puede usarse `test-results/a11y/` como carpeta de trabajo):

- [ ] La región `Comparison` anuncia el resumen (`added/removed/modified`) y la
      lista `Changes` es navegable con flechas (`aria-activedescendant`).
- [ ] El resaltado del preview corresponde al cambio seleccionado, sin afirmar
      merge safety (`mergeSafety: false`).
- [ ] Un documento incompatible se rechaza con `compare.incompatible` sin
      mutar la vista previa.

### 3.5 HTML offline

Abrir `test-results/a11y/offline.html` desde `file://` en Safari:

- [ ] Con JavaScript activo: búsqueda, ruta, story manual y tema funcionan sin
      red; VoiceOver anuncia los mismos controles que en §3.2.
- [ ] Con JavaScript desactivado (Safari > Ajustes > Seguridad): el SVG
      estático y las listas `Entities`/`Relations` siguen siendo legibles y
      navegables.
- [ ] Las etiquetas hostiles se leen como texto literal, nunca se ejecutan.

### 3.6 Shares, cards y formatos

- [ ] `Share link` copia y anuncia éxito; si el portapapeles se deniega,
      anuncia el fallo y no miente (descarga JSON como alternativa).
- [ ] `Export query SVG` y `Export card PNG` se anuncian y descargan un archivo
      válido (la card a 1200×630).
- [ ] Los formatos no soportados aparecen deshabilitados con su motivo, nunca
      renombrados como otro MIME.

## 4. Corrección y repetición

- Registrar cada incidencia en §7 con URL, tema, idioma, pasos y resultado
  observado.
- Una incidencia de accesibilidad se corrige con su prueba automatizada cuando
  sea posible (RED antes del cambio) y se repite la sección afectada de esta
  sesión.
- No cerrar un ítem declarándolo «aceptable» sin registrar el motivo.
- Si la corrección cambia geometría, CSS o etiquetas, volver a ejecutar la
  sección completa y las pruebas correspondientes de `pnpm check`.

## 5. IME: nativo por CDP frente a composición simulada

- [ ] La cobertura de IME en Chromium usa `imeSetComposition` + `insertText` por
      CDP (driver del sistema operativo).
- [ ] Firefox/WebKit ejercitan eventos de composición DOM simulados
      (`tests/e2e/editor-crud.e2e.ts`), **no** un IME de sistema.
- [ ] En la sesión humana con Safari, probar al menos una composición real
      (por ejemplo, pinyin o kana) en el campo `Label` y anotar el resultado.
- [ ] Ningún informe declara IME nativo en motores donde no se ejecutó.

## 6. Evidencia automatizada vigente

Ejecutada en el commit mergeado y reproducible con `pnpm check` + `pnpm test:e2e`:

| Gate | Archivo | Qué cubre | Límite |
|---|---|---|---|
| axe Studio claro/oscuro | `tests/e2e/studio.e2e.ts` | cero violaciones serious/critical en Studio | No mide lector real ni juicio humano |
| Flujo solo-teclado T44.1 | `tests/e2e/editor-accessibility.e2e.ts` | crear→editar→mover→conectar→borrar→undo→guardar→exportar | El E2E no oye anuncios |
| Sin secuestro + zoom 200 % T44.2 | `tests/e2e/editor-accessibility.e2e.ts` | atajos fuera del canvas; sin clipping | No sustituye contraste/reflow humanos |
| axe del viewer y controles M2/M3 | `tests/e2e/editor-accessibility.e2e.ts` | viewer, lentes, colapso, ruta, story y perfil sin serious/critical | Igual que arriba |
| axe de comparación | `tests/e2e/editor-compare.e2e.ts` | región de comparación tras diff real | Igual que arriba |
| axe de perfil de despliegue | `tests/e2e/editor-profiles.e2e.ts` | diagnósticos y bloqueo de publish | Igual que arriba |
| axe del HTML offline | `tests/e2e/editor-html.e2e.ts` | artefacto autocontenido cargado desde `file://` | Sin JS no hay árbol completo |
| Matriz diseño 360/768/1440 × es/en | `tests/e2e/editor-design.e2e.ts` | sin overflow, Geist, hit targets, contraste axe | Capturas no son juicio humano |
| Matriz browser fijada | CI `Contracts and package` | Chromium/Firefox/WebKit/móvil | No incluye lectores de pantalla |

### 6.1 Ejecución local (2026-09-26)

Evidencia ejecutada en esta máquina, complementaria y no sustituta de la matriz
fijada de CI:

- `pnpm check` con Node 22.23.2: PASS (lint, formato, iconos, schemas, docs,
  tipos, unit, perf, tarball React 18/19, site, budgets).
- Chromium **fijado 1243** + mobile-chromium: **253 passed / 21 skipped /
  0 failed**; repetido con Chrome del sistema, mismo resultado.
- Firefox **1543** y WebKit **2359** sí se instalaron después, pero en macOS 27
  Firefox no lanza (`sandbox_extension_issue_file_to_process … Operation not
  permitted`, limitación del sistema) y WebKit/móvil presentó 8 fallos locales
  en pruebas preexistentes de descargas/fuentes ajenas a este cambio. La
  certificación de esos motores es la matriz fijada del CI del commit mergeado.
- Consumidores contra el tarball retenido: React 19 y React 18.3.1 (13 pruebas
  cada uno, declaraciones NodeNext/Bundler y ejemplos), más
  `pnpm test:frameworks` (Vite/Next): PASS.
- Los escaneos axe de las superficies M2/M3 se añadieron en esta sesión y
  fallaron primero (RED) en cuatro superficies: el contrato de aceptación se
  mantiene exigiendo cero violaciones serious/critical.

### 6.2 Hallazgos corregidos antes de la sesión humana

| Hallazgo | Superficie | Corrección |
|---|---|---|
| `color-contrast` serious: cobalto claro `#087cbd` 3.89:1 sobre fondo | chrome del viewer, HTML offline, benchmark, enlace del shell | `--adl-cobalt` claro pasa a `#0c6191` (5.74:1 sobre `#e9eef4`, 6.46:1 sobre card); el enlace del shell usa el mismo valor. El SVG ya usaba `foreground`/`mutedForeground` que cumplen AA |
| `nested-interactive` serious: opciones del listbox de cambios contenían `<button>` | `Comparison` | Las opciones `role="option"` ya no anidan controles; la selección por clic vive en el `li` y el teclado sigue en el listbox |
| `aria-required-children` / `aria-required-parent` critical: `ul[role="listbox"] > li > button[role="option"]` | `Finder` | Opciones `role="option"` como hijos directos del listbox, `aria-activedescendant` en el combobox y selección en el `li` |
| `scrollable-region-focusable` serious en móvil: el preview de comparación con overflow no era enfocable | `Comparison` | La región desplazable es enfocable por teclado (`tabIndex=0`) manteniendo `role="img"` y su nombre accesible |

Estos hallazgos habrían aparecido en la revisión humana de contraste/foco; se
corrigieron con su gate automatizado antes de registrar incidencia humana.

Los resultados de CI del commit mergeado están en el
[informe de ejecución](README.md#cierre-de-aceptación-2026-09-26). Ninguno de
estos gates acredita la sesión humana de §3.

## 7. Registro de sesión (a completar por la persona)

Copiar una fila por sesión; una sesión por combinación navegador/AT.

| Persona | Fecha | macOS | Safari | VoiceOver | Tema(s) | Idioma(s) | Secciones revisadas | Resultado | Incidencias |
|---|---|---|---|---|---|---|---|---|---|
| _pendiente_ | | | | | | | | | |

| Combinación no ejecutada | Motivo | Condiciones para ejecutarla |
|---|---|---|
| NVDA + Firefox (Windows) | No disponible en este equipo (macOS) | Equipo Windows con Firefox y NVDA; mismo guion de §3 |

Criterio de cierre humano: al menos una combinación de lector de pantalla
ejecutada por persona con sus secciones completas y sin incidencias abiertas de
severidad alta; la otra combinación documentada como no ejecutada. Hasta
entonces, el estado es **pendiente**, no aprobado.
