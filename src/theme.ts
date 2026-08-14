// Shared geometry + render constants for the diagram library.
//
// Every layout type (band, flowchart, sequence, state-machine, er, timeline,
// swimlane) draws from the same language of cards, hairlines, dots, pills and
// cobalt/branch edges. These constants are the single source of truth; layouts
// and the SVG canvas derive all geometry from them instead of hardcoding
// pixel values at the point of use.

/** Card / node anatomy */
export const CARD_W = 240
export const CARD_H_FULL = 88
export const CARD_H_SLIM = 64
export const CARD_R = 10
/** Node text starts after the icon rail. */
export const CARD_TEXT_X = 50
export const CARD_PADDING_RIGHT = 14

/** Band layout (vertical columns) */
export const BAND_X0 = 40
export const BAND_PITCH = 338
export const SLOT_PITCH = 132
/** First card top — band headers were dropped, so content starts near the canvas top. */
export const CONTENT_TOP = 56
/**
 * Canvas floor below the last card. Must clear a below-source continuation pill: the pill
 * centre sits CONTINUATION_LABEL_OFFSET (16) below its source, and the pill itself extends
 * another 10 past that (half its 20-unit height) — 26 total — plus at least 14 more units of
 * margin before the canvas edge.
 */
export const CANVAS_BOTTOM_PAD = 56

/** Shared canvas */
export const CANVAS_W = 1680
/**
 * Minimum rendered width of the SVG element. The viewBox is CANVAS_W wide but the
 * SVG scales down to fit its container; this floor keeps the diagram legible and
 * forces the local horizontal scroll in `ArchitectureDiagram` when the panel is
 * narrower than the floor.
 */
export const CANVAS_MIN_WIDTH = 1360

/** Icon rail */
export const NODE_ICON_SIZE = 22

/** Edges */
export const EDGE_STROKE_WIDTH = 0.9
/** Same-band non-adjacent jumps: lane offset from the card edge. */
export const SIDE_LANE_GAP = 10
/**
 * Corner radius where a lane changes direction. Deliberately smaller than the
 * cards' own CARD_R (10), so a same-band contour reads as a wire rather than
 * as a second, boxier card.
 */
export const LANE_R = 6
export const DIMMED_OPACITY = 0.22

/** Continuations (off-canvas return stubs) */
export const CONTINUATION_LENGTH = 44
export const CONTINUATION_PORT_INSET = 16
export const CONTINUATION_LABEL_OFFSET = 16
export const CONTINUATION_LABEL_GAP = 8

/** Pills and labels */
export const LABEL_CHAR_WIDTH = 6.25
export const LABEL_HORIZONTAL_PADDING = 18
export const LABEL_EDGE_GAP = 8
export const PILL_H = 20
export const PILL_R = 10
export const DECISION_PILL_H = 24
export const DECISION_PILL_R = 12

/** Horizontal spacing between diagram elements in free-form layouts. */
export const FLOW_GAP_X = 96
export const FLOW_GAP_Y = 72
export const TIMELINE_EVENT_GAP = 180
export const TIMELINE_ALT_OFFSET = 96
export const DOT_R = 6
export const LIFELINE_TOP = 48
export const MESSAGE_PITCH = 56
export const SWIMLANE_HEADER_W = 140
export const SWIMLANE_PAD = 24
export const SWIMLANE_ROW_PAD = 64
