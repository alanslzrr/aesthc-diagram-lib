# Semantic viewer

`@aesthc/diagram-lib/viewer` is an opt-in, read-only surface for exploring a
`DiagramDocument`. It never mutates the document, never uses a store and does
not depend on Studio. Import the stylesheet once:

```tsx
import { DiagramViewer } from '@aesthc/diagram-lib/viewer'
import '@aesthc/diagram-lib/viewer.css'

<DiagramViewer document={document} locale="en" />
```

## Finder, inspector and queries

- The finder searches by ID, label and kind with a deterministic order (exact ID,
  label prefix, label substring, kind prefix, kind substring, authored order),
  Unicode case-insensitive and preserving the original text. Keyboard: Arrow
  keys move, Enter selects, Escape clears; zero results are announced.
- The inspector separates description, kind/roles, safe links (`http`, `https`,
  `mailto` only) and exact incoming/outgoing relations, each identified by its
  own edge ID — parallel relations never collapse into one row.
- Route and reach run over authored directed edges with exact edge identities.
  Receipts are bound to `documentId` + `revision`: when the document changes,
  the highlight disappears, the export action is disabled and the change is
  announced. There is no stale highlight and no stale export.

## Lenses, collapse, minimap and presentation

- Lenses filter by authored roles/tags with dimming. They never change topology:
  routes computed on the graph are unaffected by what the lens hides.
- Collapsing a group hides its members and draws proxy overlays bound to the
  **original edge IDs**, so inspecting a proxy still resolves the real relation.
  Expanding restores the scene; the document is untouched.
- The minimap navigates the camera (pan/zoom/fit) without changing the document.
- Presentation requests the Fullscreen API and falls back to a CSS overlay when
  the browser denies it; Escape exits and focus returns to the trigger.

## Finite story

Stories play with Play/Pause/Next/Previous/Stop. Playback never auto-starts,
ends after the last step and has a single motion owner (a query stops the story
and vice versa). Manual interaction, Escape, a hidden tab, printing and
`prefers-reduced-motion` stop it; under reduced motion the static Next/Previous
controls stay functional. Document limits: 20 named views, 50 story steps and
120 seconds of total duration.

## Sharing, cards and the state codec

- `encodeShareDocument` / `decodeShareDocument` (`/persistence`): `d=` carries a
  compressed, versioned document; legacy `s=` spec links stay readable.
  Expansion is capped at 256 KiB and decoding is bounded by a timeout; future
  versions and malformed payloads are rejected. URLs are **not encrypted** —
  never share secrets.
- `cardSvg` / `exportCard` (`/export`): a 1200×630 context card with the whole
  graph fitted and the query highlighted by exact IDs. A receipt from another
  revision is rejected; canonical cards carry no highlights.
- `encodeViewerState` / `decodeViewerState` round-trip view, focus and camera
  with escaping; contradictions are rejected and unknown views degrade to the
  overview.

## Offline HTML

`exportDocumentHtml` builds a single self-contained artifact with the bundled
viewer runtime, base64 WOFF2 fonts, an inline SVG fallback plus a readable
entity list, and a strict CSP (`default-src 'none'; connect-src 'none'`).
It opens from `file://` with zero network requests and no storage; with
JavaScript disabled the static SVG and list remain readable. The canonical
source JSON is embedded only with `includeSource: true`, and the artifact is
capped at 8 MiB. Document text is always data, never instructions.

## Comparison, evidence and motion

- `Comparison` (`compareDocuments`) matches entities by exact ID: a label edit
  is semantic, a move is presentation-only, a renamed ID is a remove + add and
  a sequence reorder is semantic. Different diagram types are rejected. The
  Before/Delta/After view navigates changes with the keyboard, highlights exact
  IDs and exports a JSON receipt with `mergeSafety: false`.
- `Evidence` shows declared source evidence (never presented as verified) and an
  opt-in deployment profile (`validateDeploymentProfile`) that fails by exact
  fact — owner, region conflict, public entity, missing crossing. Diagnostics
  navigate to their subject; an invalid profile blocks publish export and is
  never auto-disabled.
- `exportStoryWebm` records a finite story from a canvas stream only (no camera
  or microphone). It is capability-gated, bounded by the validated story,
  disabled under reduced motion and always releases tracks, object URLs and the
  canvas on success, failure and abort.
