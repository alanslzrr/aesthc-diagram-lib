# @aesthc/diagram-lib

Librería reutilizable de diagramas SVG con el lenguaje visual de la sección
work de [alansalazar.dev](https://alansalazar.dev): grid de puntos, tarjetas
hairline, aristas cobalt/branch, pills y tooltips glass. Un solo canvas
(`DiagramCanvas`) renderiza cualquier tipo de diagrama; el contenido es datos
declarativos y bilingües que se registran en un registry global.

## Tipos de diagrama

| `type` | Spec | Layout |
|---|---|---|
| `band` | `bands` + `nodes` + `edges` (+ `decisions`, `continuations`) | Columnas verticales, stacks centrados, beziers entre bandas (el diseño original de Quote Agent / Orchestrator) |
| `flowchart` | `nodes` + `edges` (+ `direction`, `level`) | Niveles top-down o left-right por orden topológico |
| `sequence` | `participants` + `messages` | Lifelines + mensajes horizontales + barras de activación |
| `state-machine` | `states` (+ `initial`/`final`) + `transitions` | Estados en anillo, self-loops, doble outline inicial |
| `er` | `entities` (con `fields`) + `relations` | Tablas en grid con filas tipadas (pk/fk/unique) |
| `timeline` | `events` | Espina central punteada, eventos alternando arriba/abajo |
| `swimlane` | `lanes` + `nodes` (con `lane`) + `edges` | Carriles horizontales etiquetados |

## Uso

```ts
import { registerDiagram } from '@aesthc/diagram-lib'
import { layoutBand } from '@aesthc/diagram-lib/layouts/band'
import { DiagramCanvas } from '@aesthc/diagram-lib/canvas'
```

Registra contenido (spec bilingüe + visuals), lee el spec localizado con
`getDiagram(key, locale)`, calcula la geometría con un layout y pásala al
canvas. Ver `src/examples.ts` para seis diagramas completos y
`tests/diagrams-library.unit.spec.ts` para el contrato.

## Exports (subpaths)

| Subpath | Contenido |
|---|---|
| `@aesthc/diagram-lib` | Core: `types`, `theme`, `layout` (común), `registry` — sin layouts |
| `@aesthc/diagram-lib/layouts` | Dispatcher `layoutByType` + `layoutDiagram` + los 7 layouts |
| `@aesthc/diagram-lib/layouts/band` | Solo el layout de bandas (import mínimo) |
| `@aesthc/diagram-lib/canvas` | `DiagramCanvas`, `ArchitectureNodeIcon`, `DiagramCanvasProps` |
| `@aesthc/diagram-lib/examples` | `EXAMPLE_DIAGRAMS` + `registerExampleDiagrams()` |

El core no importa los layouts, así que un consumidor que solo renderiza
`band` (como el portfolio) no arrastra los otros motores de layout.

## Diseño

- **`DiagramLayout`** normaliza cualquier spec: nodos colocados (`PlacedNode`),
  edges con paths + gradientes, y opcionalmente `containers` (swimlane),
  `lifelines` (sequence) y shapes (`card`, `state`, `table`, `event`,
  `terminal`, `bar`).
- **Tokens** (`theme.ts`): geometría y constantes de render centralizadas.
- **Registry** (`registry.ts`): `registerDiagram(key, { diagram: {en, es}, visuals })`.
- **Estilos**: el canvas usa clases Tailwind (arbitrarias y utilitarias) que el
  consumidor debe escanear (ver "Integración con Tailwind").

## Desarrollo

```bash
pnpm install
pnpm typecheck
pnpm test
```

## Integración con un consumidor Next.js + Tailwind v4

El paquete se distribuye como fuente TSX **más un CSS compilado** con las
utilidades que usa el canvas (generado con `pnpm build:css`). El consumidor:

1. Dependencia local o vía git:
   `"@aesthc/diagram-lib": "file:../aesthc-diagram-lib"` (o
   `github:alanslzrr/aesthc-diagram-lib`).
2. `next.config.js` → `transpilePackages: ['@aesthc/diagram-lib']`.
3. Importar el CSS del paquete en el CSS raíz (junto a `@import 'tailwindcss'`):
   `@import '@aesthc/diagram-lib/styles.css';`
   El CSS es utilities-only (sin preflight), referencia las variables del tema
   del host (`--foreground`, `--background`, `--border`, `--card`, `--cobalt`,
   `--branch`) y usa el mismo `dark` variant
   (`&:is([data-theme='dark'] *)`), así el aspecto coincide con el tema del
   consumidor en claro y oscuro.
4. Si el consumidor cambia clases del canvas (retoque visual), recompilar:
   `pnpm --dir ../aesthc-diagram-lib build:css`.
5. Opcional: `paths` en tsconfig apuntando a la fuente para el editor.
