// Curated landing fixtures: a few readable steps per layout instead of the
// full case-study diagram squeezed into a thumbnail. The complete example is
// one click away in the playground or the spec panel.
import type { DiagramSpec, DiagramLayout } from '@aesthc/diagram-lib'

import type { Locale } from '../content'

// Useful-bounds frames from `previewBounds(layoutDiagram(spec))` for the English
// fixtures. Precomputed so the landing entry does not ship the framing helper;
// `tests/gallery-framing.unit.spec.ts` recomputes and guards every value.
export const GALLERY_VIEWS: Record<
  string,
  { x: number; y: number; width: number; height: number }
> = {
  'example-band': { x: 8, y: 36, width: 304, height: 260 },
  'example-flowchart': { x: 40, y: 24, width: 304, height: 264 },
  'example-sequence': { x: 40, y: -24, width: 326, height: 232 },
  'example-state-machine': { x: 404, y: 44, width: 284, height: 488 },
  'example-er': { x: 40, y: 32, width: 304, height: 144 },
  'example-timeline': { x: 32, y: 20, width: 304, height: 204 },
  'example-swimlane': { x: -32, y: 24, width: 446, height: 192 },
}
export type GalleryLayout = DiagramLayout

export const GALLERY_FIXTURES: Record<string, Record<Locale, DiagramSpec>> = {
  'example-band': {
    en: {
      type: 'band',
      caption: 'A request moves through one pipeline stage.',
      legend: { main: 'Request path', branch: 'Alternative' },
      bands: [{ title: 'Pipeline' }],
      nodes: [
        {
          id: 'ingress',
          band: 0,
          label: 'Ingress',
          description: '',
          kind: 'Trigger',
          weight: 'primary',
        },
        {
          id: 'deliver',
          band: 0,
          label: 'Deliver',
          description: '',
          kind: 'Outcome',
          weight: 'primary',
        },
      ],
      edges: [{ id: 'process', from: 'ingress', to: 'deliver' }],
    },
    es: {
      type: 'band',
      caption: 'Una solicitud recorre una etapa del proceso.',
      legend: { main: 'Camino principal', branch: 'Alternativa' },
      bands: [{ title: 'Proceso' }],
      nodes: [
        {
          id: 'ingress',
          band: 0,
          label: 'Entrada',
          description: '',
          kind: 'Trigger',
          weight: 'primary',
        },
        {
          id: 'deliver',
          band: 0,
          label: 'Entrega',
          description: '',
          kind: 'Outcome',
          weight: 'primary',
        },
      ],
      edges: [{ id: 'process', from: 'ingress', to: 'deliver' }],
    },
  },
  'example-flowchart': {
    en: {
      type: 'flowchart',
      caption: 'Request, validation and response.',
      legend: { main: 'Main path', branch: 'Alternative' },
      direction: 'top-down',
      nodes: [
        { id: 'request', label: 'Request', description: '' },
        { id: 'validate', label: 'Validate', description: '' },
      ],
      edges: [{ id: 'check', from: 'request', to: 'validate' }],
    },
    es: {
      type: 'flowchart',
      caption: 'Solicitud, validación y respuesta.',
      legend: { main: 'Camino principal', branch: 'Alternativa' },
      direction: 'top-down',
      nodes: [
        { id: 'request', label: 'Solicitud', description: '' },
        { id: 'validate', label: 'Validar', description: '' },
      ],
      edges: [{ id: 'check', from: 'request', to: 'validate' }],
    },
  },
  'example-sequence': {
    en: {
      type: 'sequence',
      caption: 'A client retries its request on a lifeline.',
      legend: { main: 'Request path', branch: 'Alternative' },
      participants: [{ id: 'client', label: 'Client' }],
      messages: [{ id: 'retry', from: 'client', to: 'client', label: 'retry' }],
    },
    es: {
      type: 'sequence',
      caption: 'Un cliente reintenta su solicitud en una línea de vida.',
      legend: { main: 'Camino principal', branch: 'Alternativa' },
      participants: [{ id: 'client', label: 'Cliente' }],
      messages: [{ id: 'retry', from: 'client', to: 'client', label: 'retry' }],
    },
  },
  'example-state-machine': {
    en: {
      type: 'state-machine',
      caption: 'Created, paid and shipped states.',
      legend: { main: 'Main path', branch: 'Alternative' },
      states: [
        { id: 'created', label: 'Created', initial: true },
        { id: 'paid', label: 'Paid', final: true },
      ],
      transitions: [{ id: 'pay', from: 'created', to: 'paid', label: 'pay' }],
    },
    es: {
      type: 'state-machine',
      caption: 'Estados creado, pagado y enviado.',
      legend: { main: 'Camino principal', branch: 'Alternativa' },
      states: [
        { id: 'created', label: 'Creado', initial: true },
        { id: 'paid', label: 'Pagado', final: true },
      ],
      transitions: [{ id: 'pay', from: 'created', to: 'paid', label: 'pagar' }],
    },
  },
  'example-er': {
    en: {
      type: 'er',
      caption: 'An orders table with primary and foreign keys.',
      legend: { main: 'Relation', branch: 'Alternative' },
      entities: [
        {
          id: 'orders',
          label: 'orders',
          fields: [
            { name: 'id', type: 'uuid', key: 'pk' },
            { name: 'user_id', type: 'uuid', key: 'fk' },
          ],
        },
      ],
      relations: [],
    },
    es: {
      type: 'er',
      caption: 'Una tabla de pedidos con clave primaria y foránea.',
      legend: { main: 'Relación', branch: 'Alternativa' },
      entities: [
        {
          id: 'orders',
          label: 'orders',
          fields: [
            { name: 'id', type: 'uuid', key: 'pk' },
            { name: 'user_id', type: 'uuid', key: 'fk' },
          ],
        },
      ],
      relations: [],
    },
  },
  'example-timeline': {
    en: {
      type: 'timeline',
      caption: 'A release milestone on the timeline.',
      legend: { main: 'Main path', branch: 'Alternative' },
      events: [{ id: 'release', label: 'Release', description: '' }],
    },
    es: {
      type: 'timeline',
      caption: 'Un hito de publicación en la línea de tiempo.',
      legend: { main: 'Camino principal', branch: 'Alternativa' },
      events: [{ id: 'release', label: 'Publicación', description: '' }],
    },
  },
  'example-swimlane': {
    en: {
      type: 'swimlane',
      caption: 'Triage happens inside the support lane.',
      legend: { main: 'Handoff', branch: 'Alternative' },
      lanes: [{ id: 'support', label: 'Support' }],
      nodes: [
        {
          id: 'triage',
          label: 'Triage',
          description: '',
          lane: 'support',
        },
      ],
      edges: [],
    },
    es: {
      type: 'swimlane',
      caption: 'El triaje ocurre dentro del carril de soporte.',
      legend: { main: 'Traspaso', branch: 'Alternativa' },
      lanes: [{ id: 'support', label: 'Soporte' }],
      nodes: [
        {
          id: 'triage',
          label: 'Clasificar',
          description: '',
          lane: 'support',
        },
      ],
      edges: [],
    },
  },
}
