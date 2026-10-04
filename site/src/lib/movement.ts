// One capability-aware vocabulary for node movement. The editor never moves
// authored structure as free geometry: band/swimlane drags change membership
// and order, sequence/timeline drags change authored order, and only the free
// types store coordinates. The models below mirror the real adapter
// capabilities (`move-free`) so the Playground can explain the behavior it
// exposes without duplicating the movement implementation.
import type { EditorDiagramType, Locale } from '@aesthc/diagram-lib/editor-core'

export type MovementKind = 'free' | 'membership' | 'order'
export interface MovementModel {
  kind: MovementKind
  label: Record<Locale, string>
  hint: Record<Locale, string>
  /** Free positioning is available without conversion. */
  free: boolean
}
export const MOVEMENT_MODELS: Record<EditorDiagramType, MovementModel> = {
  graph: {
    kind: 'free',
    free: true,
    label: { en: 'Free placement', es: 'Posición libre' },
    hint: {
      en: 'Drag a node anywhere; its coordinates are stored in the document.',
      es: 'Arrastra un nodo a cualquier lugar; sus coordenadas se guardan en el documento.',
    },
  },
  flowchart: {
    kind: 'free',
    free: true,
    label: { en: 'Free placement', es: 'Posición libre' },
    hint: {
      en: 'Drag a node anywhere; its coordinates are stored in the document.',
      es: 'Arrastra un nodo a cualquier lugar; sus coordenadas se guardan en el documento.',
    },
  },
  'state-machine': {
    kind: 'free',
    free: true,
    label: { en: 'Free placement', es: 'Posición libre' },
    hint: {
      en: 'Drag a state anywhere; its coordinates are stored in the document.',
      es: 'Arrastra un estado a cualquier lugar; sus coordenadas se guardan en el documento.',
    },
  },
  er: {
    kind: 'free',
    free: true,
    label: { en: 'Free placement', es: 'Posición libre' },
    hint: {
      en: 'Drag an entity anywhere; table coordinates are stored in the document.',
      es: 'Arrastra una entidad a cualquier lugar; las coordenadas de la tabla se guardan en el documento.',
    },
  },
  band: {
    kind: 'membership',
    free: false,
    label: { en: 'Band membership and order', es: 'Pertenencia y orden de banda' },
    hint: {
      en: 'Dragging a node into another band reassigns it; its order follows the drop position in that band.',
      es: 'Arrastrar un nodo a otra banda lo reasigna; su orden sigue la posición de destino en esa banda.',
    },
  },
  swimlane: {
    kind: 'membership',
    free: false,
    label: { en: 'Lane membership and order', es: 'Pertenencia y orden de carril' },
    hint: {
      en: 'Dragging a node between lanes changes its lane; its order follows the drop position in that lane.',
      es: 'Arrastrar un nodo entre carriles cambia su carril; su orden sigue la posición de destino en ese carril.',
    },
  },
  sequence: {
    kind: 'order',
    free: false,
    label: { en: 'Authored order', es: 'Orden de autoría' },
    hint: {
      en: 'Dragging a participant left or right changes its authored position; messages keep their own order.',
      es: 'Arrastrar un participante a izquierda o derecha cambia su posición de autoría; los mensajes conservan su orden.',
    },
  },
  timeline: {
    kind: 'order',
    free: false,
    label: { en: 'Authored order', es: 'Orden de autoría' },
    hint: {
      en: 'Dragging an event left or right changes its authored chronological position.',
      es: 'Arrastrar un evento a izquierda o derecha cambia su posición cronológica de autoría.',
    },
  },
}
export function movementModel(type: EditorDiagramType): MovementModel {
  return MOVEMENT_MODELS[type]
}
