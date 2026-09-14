// Bilingual page copy. The locale toggle switches both the page chrome and
// the diagram specs — the same localization model the library ships.

export type Locale = 'en' | 'es'
export type Localized = Record<Locale, string>

export interface SectionEntry {
  key: string
  type: string
  title: Localized
  description: Localized
}

export const SECTIONS: SectionEntry[] = [
  {
    key: 'example-band',
    type: 'band',
    title: { en: 'Band', es: 'Band' },
    description: {
      en: 'Vertical columns with centred card stacks and bezier edges between bands — the original architecture-diagram layout, extracted from the alansalazar.dev case studies.',
      es: 'Columnas verticales con pilas de tarjetas centradas y curvas bezier entre bandas — el layout original de diagramas de arquitectura, extraído de los casos de estudio de alansalazar.dev.',
    },
  },
  {
    key: 'example-flowchart',
    type: 'flowchart',
    title: { en: 'Flowchart', es: 'Flowchart' },
    description: {
      en: 'Topological levels as rows (or columns), branch pills for failures, and feedback edges routed around the content on an outer lane.',
      es: 'Niveles topológicos como filas (o columnas), pills de bifurcación para fallos, y aristas de retorno ruteadas alrededor del contenido por un carril exterior.',
    },
  },
  {
    key: 'example-sequence',
    type: 'sequence',
    title: { en: 'Sequence', es: 'Sequence' },
    description: {
      en: 'Participants as vertical lifelines, arrowed messages, and activation bars that span from a request to its reply.',
      es: 'Participantes como líneas de vida verticales, mensajes con flecha y barras de activación que van de una petición a su respuesta.',
    },
  },
  {
    key: 'example-state-machine',
    type: 'state-machine',
    title: { en: 'State machine', es: 'Máquina de estados' },
    description: {
      en: 'States on a compact ring with transitions trimmed at the pill borders — double-outline initial states, hollow finals, self-loops.',
      es: 'Estados sobre un anillo compacto con transiciones recortadas en el borde de las pills — estados iniciales con doble contorno, finales huecos, self-loops.',
    },
  },
  {
    key: 'example-er',
    type: 'er',
    title: { en: 'ER / data model', es: 'ER / modelo de datos' },
    description: {
      en: 'Entities as typed tables — primary keys, foreign keys, unique constraints — with relations routed orthogonally through the grid corridors.',
      es: 'Entidades como tablas tipadas — claves primarias, foráneas y únicas — con relaciones ruteadas ortogonalmente por los corredores de la grilla.',
    },
  },
  {
    key: 'example-timeline',
    type: 'timeline',
    title: { en: 'Timeline', es: 'Timeline' },
    description: {
      en: 'A dashed central spine with a direction arrow and events alternating above and below it.',
      es: 'Una espina central discontinua con flecha de dirección y eventos alternando por encima y por debajo.',
    },
  },
  {
    key: 'example-swimlane',
    type: 'swimlane',
    title: { en: 'Swimlane', es: 'Swimlane' },
    description: {
      en: 'Labelled horizontal lanes whose nodes advance through shared topological columns, so cross-team handoffs read left to right.',
      es: 'Carriles horizontales etiquetados cuyos nodos avanzan por columnas topológicas compartidas, para que los traspasos entre equipos se lean de izquierda a derecha.',
    },
  },
]

export const STRINGS = {
  label: { en: 'open source · react + svg', es: 'open source · react + svg' },
  heading: { en: 'Seven diagram types,', es: 'Siete tipos de diagrama,' },
  headingAccent: { en: 'one visual language.', es: 'un solo lenguaje visual.' },
  intro: {
    en: 'A single SVG renderer and a declarative, localized data model — band, flowchart, sequence, state machine, ER, timeline and swimlane diagrams that share the same dot-grid, hairline-card and cobalt/branch aesthetic. No DOM measurement, no hand-authored coordinates.',
    es: 'Un único renderer SVG y un modelo de datos declarativo y localizado — diagramas band, flowchart, sequence, máquina de estados, ER, timeline y swimlane que comparten la misma estética de dot-grid, tarjetas hairline y cobalt/branch. Sin medir el DOM, sin coordenadas a mano.',
  },
  hoverHint: {
    en: 'hover a node, focus it with the keyboard, or tap it to explore its role and trace its path',
    es: 'pasá el cursor por un nodo, enfocalo con el teclado o tocalo para explorar su rol y trazar su camino',
  },
  preview: { en: 'Preview', es: 'Vista' },
  code: { en: 'Code', es: 'Código' },
  spec: { en: 'spec', es: 'spec' },
  usage: { en: 'usage', es: 'uso' },
  copy: { en: 'Copy', es: 'Copiar' },
  copied: { en: 'Copied', es: 'Copiado' },
  copySvg: { en: 'Copy SVG', es: 'Copiar SVG' },
  downloadSvg: { en: 'SVG', es: 'SVG' },
  downloadPng: { en: 'PNG', es: 'PNG' },
  share: { en: 'Share', es: 'Compartir' },
  shareCopied: { en: 'Link copied', es: 'Link copiado' },
  reset: { en: 'Reset', es: 'Restaurar' },
  edited: { en: 'Edited', es: 'Editado' },
  direction: { en: 'Direction', es: 'Dirección' },
  topDown: { en: 'Top-down', es: 'Vertical' },
  leftRight: { en: 'Left-right', es: 'Horizontal' },
  editorHint: {
    en: 'the spec is live — edit it and the diagram re-lays out as you type',
    es: 'el spec está vivo — editalo y el diagrama se recalcula mientras escribís',
  },
  themeTitle: { en: 'Theme studio', es: 'Estudio de tema' },
  themeIntro: {
    en: 'The canvas reads the host CSS variables, so it inherits any design system. Tune the tokens — every diagram on this page restyles in real time — then copy the CSS block into your app.',
    es: 'El canvas lee las variables CSS del host, así que hereda cualquier design system. Ajustá los tokens — todos los diagramas de esta página se repintan en tiempo real — y copiá el bloque CSS a tu app.',
  },
  themeMode: { en: 'editing', es: 'editando' },
  copyCss: { en: 'Copy theme CSS', es: 'Copiar CSS del tema' },
  presets: { en: 'Presets', es: 'Presets' },
  quickStartTitle: { en: 'Quick start', es: 'Inicio rápido' },
  quickStartIntro: {
    en: 'Register a localized spec once, lay it out, render the canvas. The full API — registry, adjacency helpers, per-type layouts, theming contract — is documented in the README.',
    es: 'Registrá un spec localizado una vez, calculá el layout y renderizá el canvas. La API completa — registry, helpers de adyacencia, layouts por tipo y contrato de theming — está documentada en el README.',
  },
  install: { en: 'install', es: 'instalar' },
  viewOnGitHub: { en: 'View on GitHub', es: 'Ver en GitHub' },
  themeTooltip: { en: 'Theme', es: 'Tema' },
  localeTooltip: { en: 'Language', es: 'Idioma' },
  hexAria: { en: 'hex value', es: 'valor hex' },
  pickerAria: { en: 'color picker', es: 'selector de color' },
  readme: { en: 'README', es: 'README' },
  license: { en: 'MIT license', es: 'Licencia MIT' },
  footerNote: {
    en: 'built with the library it documents',
    es: 'construida con la misma librería que documenta',
  },
} satisfies Record<string, Localized>

export const GITHUB_URL = 'https://github.com/alanslzrr/aesthc-diagram-lib'
export const INSTALL_COMMAND = 'pnpm add @aesthc/diagram-lib@0.3.0'

export interface Feature {
  label: Localized
  detail: Localized
}

export const FEATURES: Feature[] = [
  {
    label: { en: 'Declarative specs', es: 'Specs declarativos' },
    detail: {
      en: 'content is data — layouts compute every coordinate and SVG path',
      es: 'el contenido es data — los layouts computan cada coordenada y path SVG',
    },
  },
  {
    label: { en: 'Localized', es: 'Localizado' },
    detail: {
      en: 'en/es specs share ids and topology; only the text differs',
      es: 'los specs en/es comparten ids y topología; solo cambia el texto',
    },
  },
  {
    label: { en: 'Theme-agnostic', es: 'Agnóstico al tema' },
    detail: {
      en: 'the canvas reads host CSS variables and inherits any design system',
      es: 'el canvas lee variables CSS del host y hereda cualquier design system',
    },
  },
  {
    label: { en: 'Tree-shakeable', es: 'Tree-shakeable' },
    detail: {
      en: 'subpath exports — a band-only consumer ships exactly one layout',
      es: 'exports por subpath — un consumidor de band embarca un solo layout',
    },
  },
  {
    label: { en: 'Accessible', es: 'Accesible' },
    detail: {
      en: 'keyboard-focusable nodes with descriptions; motion respects your OS',
      es: 'nodos enfocables por teclado con descripciones; el motion respeta tu OS',
    },
  },
  {
    label: { en: 'SSR-safe', es: 'SSR-safe' },
    detail: {
      en: 'no DOM measurement — every type renders on the server',
      es: 'sin medir el DOM — todos los tipos renderizan en el servidor',
    },
  },
]

export { QUICK_START } from './generated/quick-start'
