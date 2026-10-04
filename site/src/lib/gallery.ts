// Curated landing fixtures: a few readable steps per layout instead of the
// full case-study diagram squeezed into a thumbnail. The complete example is
// one click away in the playground or the spec panel.
import type { DiagramSpec, DiagramLayout } from '@aesthc/diagram-lib'

import type { Locale } from '../content'

// Useful-bounds frames from `previewBounds(layoutDiagram(spec))` for both locale
// fixtures. Precomputed so the landing entry does not ship the framing helper;
// `tests/gallery-framing.unit.spec.ts` recomputes and guards every value.
export const GALLERY_VIEWS: Record<
  string,
  Record<Locale, { x: number; y: number; width: number; height: number }>
> = {
  'example-band': {
    en: {
      x: 8,
      y: 36,
      width: 304,
      height: 260,
    },
    es: {
      x: 8,
      y: 36,
      width: 304,
      height: 260,
    },
  },
  'example-flowchart': {
    en: {
      x: 40,
      y: 24,
      width: 304,
      height: 264,
    },
    es: {
      x: 40,
      y: 24,
      width: 304,
      height: 264,
    },
  },
  'example-sequence': {
    en: {
      x: 0,
      y: -24,
      width: 344,
      height: 288,
    },
    es: {
      x: 0,
      y: -24,
      width: 344,
      height: 288,
    },
  },
  'example-state-machine': {
    en: {
      x: 404,
      y: 44,
      width: 284,
      height: 488,
    },
    es: {
      x: 404,
      y: 44,
      width: 284,
      height: 488,
    },
  },
  'example-er': {
    en: {
      x: 40,
      y: 32,
      width: 304,
      height: 324,
    },
    es: {
      x: 40,
      y: 32,
      width: 304,
      height: 324,
    },
  },
  'example-timeline': {
    en: {
      x: 32,
      y: 20,
      width: 304,
      height: 204,
    },
    es: {
      x: 32,
      y: 20,
      width: 304,
      height: 204,
    },
  },
  'example-swimlane': {
    en: {
      x: -32,
      y: 24,
      width: 378,
      height: 320,
    },
    es: {
      x: -32,
      y: 24,
      width: 378,
      height: 320,
    },
  },
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
      caption: 'A client request and API response across two lifelines.',
      legend: { main: 'Request path', branch: 'Alternative' },
      participants: [
        { id: 'client', label: 'Client' },
        { id: 'api', label: 'API' },
      ],
      messages: [
        { id: 'request', from: 'client', to: 'api', label: 'GET' },
        { id: 'reply', from: 'api', to: 'client', label: '200' },
      ],
    },
    es: {
      type: 'sequence',
      caption: 'Solicitud y respuesta entre cliente y API.',
      legend: { main: 'Camino principal', branch: 'Alternativa' },
      participants: [
        { id: 'client', label: 'Cliente' },
        { id: 'api', label: 'API' },
      ],
      messages: [
        { id: 'request', from: 'client', to: 'api', label: 'GET' },
        { id: 'reply', from: 'api', to: 'client', label: '200' },
      ],
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
      caption: 'Users own orders through a primary/foreign-key relationship.',
      legend: { main: 'Relation', branch: 'Alternative' },
      entities: [
        { id: 'users', label: 'users', fields: [{ name: 'id', type: 'uuid', key: 'pk' }] },
        {
          id: 'orders',
          label: 'orders',
          fields: [
            { name: 'id', type: 'uuid', key: 'pk' },
            { name: 'user_id', type: 'uuid', key: 'fk' },
          ],
        },
      ],
      relations: [{ id: 'owns', from: 'users', to: 'orders', label: '1:N' }],
    },
    es: {
      type: 'er',
      caption: 'Usuarios y pedidos vinculados por claves primaria y foránea.',
      legend: { main: 'Relación', branch: 'Alternativa' },
      entities: [
        { id: 'users', label: 'users', fields: [{ name: 'id', type: 'uuid', key: 'pk' }] },
        {
          id: 'orders',
          label: 'orders',
          fields: [
            { name: 'id', type: 'uuid', key: 'pk' },
            { name: 'user_id', type: 'uuid', key: 'fk' },
          ],
        },
      ],
      relations: [{ id: 'owns', from: 'users', to: 'orders', label: '1:N' }],
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
      caption: 'Support hands an issue to Engineering.',
      legend: { main: 'Handoff', branch: 'Alternative' },
      lanes: [
        { id: 'support', label: 'Support' },
        { id: 'engineering', label: 'Engineering' },
      ],
      nodes: [
        { id: 'resolve', label: 'Resolve', description: '', lane: 'engineering' },
        {
          id: 'triage',
          label: 'Triage',
          description: '',
          lane: 'support',
        },
      ],
      edges: [{ id: 'handoff', from: 'triage', to: 'resolve' }],
    },
    es: {
      type: 'swimlane',
      caption: 'Soporte transfiere una incidencia a Ingeniería.',
      legend: { main: 'Traspaso', branch: 'Alternativa' },
      lanes: [
        { id: 'support', label: 'Soporte' },
        { id: 'engineering', label: 'Ingeniería' },
      ],
      nodes: [
        { id: 'resolve', label: 'Resolver', description: '', lane: 'engineering' },
        {
          id: 'triage',
          label: 'Clasificar',
          description: '',
          lane: 'support',
        },
      ],
      edges: [{ id: 'handoff', from: 'triage', to: 'resolve' }],
    },
  },
}
