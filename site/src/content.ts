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
  preview: { en: 'preview', es: 'vista' },
  code: { en: 'code', es: 'código' },
  spec: { en: 'spec', es: 'spec' },
  usage: { en: 'usage', es: 'uso' },
  copy: { en: 'copy', es: 'copiar' },
  copied: { en: 'copied', es: 'copiado' },
  copySvg: { en: 'copy svg', es: 'copiar svg' },
  downloadSvg: { en: 'svg', es: 'svg' },
  reset: { en: 'reset', es: 'restaurar' },
  edited: { en: 'edited', es: 'editado' },
  direction: { en: 'direction', es: 'dirección' },
  topDown: { en: 'top-down', es: 'vertical' },
  leftRight: { en: 'left-right', es: 'horizontal' },
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
  copyCss: { en: 'copy theme css', es: 'copiar css del tema' },
  presets: { en: 'presets', es: 'presets' },
  quickStartTitle: { en: 'Quick start', es: 'Inicio rápido' },
  quickStartIntro: {
    en: 'Register a localized spec once, lay it out, render the canvas. The full API — registry, adjacency helpers, per-type layouts, theming contract — is documented in the README.',
    es: 'Registrá un spec localizado una vez, calculá el layout y renderizá el canvas. La API completa — registry, helpers de adyacencia, layouts por tipo y contrato de theming — está documentada en el README.',
  },
  install: { en: 'install', es: 'instalar' },
  viewOnGitHub: { en: 'view on github', es: 'ver en github' },
  readme: { en: 'readme', es: 'readme' },
  license: { en: 'MIT license', es: 'licencia MIT' },
  footerNote: {
    en: 'built with the library it documents',
    es: 'construida con la misma librería que documenta',
  },
} satisfies Record<string, Localized>

export const GITHUB_URL = 'https://github.com/alanslzrr/aesthc-diagram-lib'
export const INSTALL_COMMAND = 'pnpm add @aesthc/diagram-lib'

export const QUICK_START = `import { registerDiagram, getDiagram } from '@aesthc/diagram-lib'
import { layoutDiagram } from '@aesthc/diagram-lib/layouts'
import { DiagramCanvas } from '@aesthc/diagram-lib/canvas'
import '@aesthc/diagram-lib/styles.css'

registerDiagram('my-pipeline', {
  diagram: {
    en: {
      type: 'band',
      caption: 'what the diagram tells',
      legend: { main: 'main path', branch: 'alternative' },
      bands: [{ title: 'Input' }, { title: 'Process' }, { title: 'Output' }],
      nodes: [
        { id: 'a', band: 0, label: 'Step A', description: 'What A does.', kind: 'Trigger' },
        { id: 'b', band: 1, label: 'Step B', description: 'What B does.', weight: 'primary' },
        { id: 'c', band: 2, label: 'Step C', description: 'What C does.' },
      ],
      edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }],
    },
    es: { /* same ids and topology, Spanish text */ },
  },
})

const layout = layoutDiagram(getDiagram('my-pipeline', 'en'))
// <DiagramCanvas layout={layout} … />`
