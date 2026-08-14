/** Card / node anatomy */
declare const CARD_W = 240;
declare const CARD_H_FULL = 88;
declare const CARD_H_SLIM = 64;
declare const CARD_R = 10;
/** Node text starts after the icon rail. */
declare const CARD_TEXT_X = 50;
declare const CARD_PADDING_RIGHT = 14;
/** Band layout (vertical columns) */
declare const BAND_X0 = 40;
declare const BAND_PITCH = 338;
declare const SLOT_PITCH = 132;
/** First card top — band headers were dropped, so content starts near the canvas top. */
declare const CONTENT_TOP = 56;
/**
 * Canvas floor below the last card. Must clear a below-source continuation pill: the pill
 * centre sits CONTINUATION_LABEL_OFFSET (16) below its source, and the pill itself extends
 * another 10 past that (half its 20-unit height) — 26 total — plus at least 14 more units of
 * margin before the canvas edge.
 */
declare const CANVAS_BOTTOM_PAD = 56;
/** Shared canvas */
declare const CANVAS_W = 1680;
/**
 * Minimum rendered width of the SVG element. The viewBox is CANVAS_W wide but the
 * SVG scales down to fit its container; this floor keeps the diagram legible and
 * forces the local horizontal scroll in `ArchitectureDiagram` when the panel is
 * narrower than the floor.
 */
declare const CANVAS_MIN_WIDTH = 1360;
/** Icon rail */
declare const NODE_ICON_SIZE = 22;
/** Edges */
declare const EDGE_STROKE_WIDTH = 0.9;
/** Same-band non-adjacent jumps: lane offset from the card edge. */
declare const SIDE_LANE_GAP = 10;
/**
 * Corner radius where a lane changes direction. Deliberately smaller than the
 * cards' own CARD_R (10), so a same-band contour reads as a wire rather than
 * as a second, boxier card.
 */
declare const LANE_R = 6;
declare const DIMMED_OPACITY = 0.22;
/** Continuations (off-canvas return stubs) */
declare const CONTINUATION_LENGTH = 44;
declare const CONTINUATION_PORT_INSET = 16;
declare const CONTINUATION_LABEL_OFFSET = 16;
declare const CONTINUATION_LABEL_GAP = 8;
/** Pills and labels */
declare const LABEL_CHAR_WIDTH = 6.25;
declare const LABEL_HORIZONTAL_PADDING = 18;
declare const LABEL_EDGE_GAP = 8;
declare const PILL_H = 20;
declare const PILL_R = 10;
declare const DECISION_PILL_H = 24;
declare const DECISION_PILL_R = 12;
/** Horizontal spacing between diagram elements in free-form layouts. */
declare const FLOW_GAP_X = 96;
declare const FLOW_GAP_Y = 72;
declare const TIMELINE_EVENT_GAP = 180;
declare const TIMELINE_ALT_OFFSET = 96;
declare const DOT_R = 6;
declare const LIFELINE_TOP = 48;
declare const MESSAGE_PITCH = 56;
declare const SWIMLANE_HEADER_W = 140;
declare const SWIMLANE_PAD = 24;
declare const SWIMLANE_ROW_PAD = 64;

export { BAND_PITCH, BAND_X0, CANVAS_BOTTOM_PAD, CANVAS_MIN_WIDTH, CANVAS_W, CARD_H_FULL, CARD_H_SLIM, CARD_PADDING_RIGHT, CARD_R, CARD_TEXT_X, CARD_W, CONTENT_TOP, CONTINUATION_LABEL_GAP, CONTINUATION_LABEL_OFFSET, CONTINUATION_LENGTH, CONTINUATION_PORT_INSET, DECISION_PILL_H, DECISION_PILL_R, DIMMED_OPACITY, DOT_R, EDGE_STROKE_WIDTH, FLOW_GAP_X, FLOW_GAP_Y, LABEL_CHAR_WIDTH, LABEL_EDGE_GAP, LABEL_HORIZONTAL_PADDING, LANE_R, LIFELINE_TOP, MESSAGE_PITCH, NODE_ICON_SIZE, PILL_H, PILL_R, SIDE_LANE_GAP, SLOT_PITCH, SWIMLANE_HEADER_W, SWIMLANE_PAD, SWIMLANE_ROW_PAD, TIMELINE_ALT_OFFSET, TIMELINE_EVENT_GAP };
