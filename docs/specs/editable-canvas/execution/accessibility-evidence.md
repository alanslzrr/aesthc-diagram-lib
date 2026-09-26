# Evidencia automatizada de accesibilidad

Ejecutada en el commit mergeado y reproducible con `pnpm check` + `pnpm test:e2e`:

| Gate | Archivo | Qué cubre | Límite |
|---|---|---|---|
| axe Studio claro/oscuro | `tests/e2e/studio.e2e.ts` | cero violaciones serious/critical en Studio | Limitado a reglas axe |
| Flujo solo-teclado T44.1 | `tests/e2e/editor-accessibility.e2e.ts` | crear→editar→mover→conectar→borrar→undo→guardar→exportar | Comprueba interacciones y estados DOM |
| Sin secuestro + zoom 200 % T44.2 | `tests/e2e/editor-accessibility.e2e.ts` | atajos fuera del canvas; sin clipping | Comprueba las aserciones de foco y geometría |
| axe del viewer y controles M2/M3 | `tests/e2e/editor-accessibility.e2e.ts` | viewer, lentes, colapso, ruta, story y perfil sin serious/critical | Igual que arriba |
| axe de comparación | `tests/e2e/editor-compare.e2e.ts` | región de comparación tras diff real | Igual que arriba |
| axe de perfil de despliegue | `tests/e2e/editor-profiles.e2e.ts` | diagnósticos y bloqueo de publish | Igual que arriba |
| axe del HTML offline | `tests/e2e/editor-html.e2e.ts` | artefacto autocontenido cargado desde `file://` | Sin JS no hay árbol completo |
| Matriz diseño 360/768/1440 × es/en | `tests/e2e/editor-design.e2e.ts` | sin overflow, Geist, hit targets, contraste axe | Limitado a resoluciones y temas de la matriz |
| Matriz browser fijada | CI `Contracts and package` | Chromium/Firefox/WebKit/móvil | No incluye lectores de pantalla |

## Ejecución local (2026-09-26)

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

## Hallazgos corregidos

| Hallazgo | Superficie | Corrección |
|---|---|---|
| `color-contrast` serious: cobalto claro `#087cbd` 3.89:1 sobre fondo | chrome del viewer, HTML offline, benchmark, enlace del shell | `--adl-cobalt` claro pasa a `#0c6191` (5.74:1 sobre `#e9eef4`, 6.46:1 sobre card); el enlace del shell usa el mismo valor. El SVG ya usaba `foreground`/`mutedForeground` que cumplen AA |
| `nested-interactive` serious: opciones del listbox de cambios contenían `<button>` | `Comparison` | Las opciones `role="option"` ya no anidan controles; la selección por clic vive en el `li` y el teclado sigue en el listbox |
| `aria-required-children` / `aria-required-parent` critical: `ul[role="listbox"] > li > button[role="option"]` | `Finder` | Opciones `role="option"` como hijos directos del listbox, `aria-activedescendant` en el combobox y selección en el `li` |
| `scrollable-region-focusable` serious en móvil: el preview de comparación con overflow no era enfocable | `Comparison` | La región desplazable es enfocable por teclado (`tabIndex=0`) manteniendo `role="img"` y su nombre accesible |
