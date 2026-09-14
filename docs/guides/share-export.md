# Sharing and exporting

These are playground features, not package-level export APIs.

New share links contain a version-1 envelope with diagram key, spec and locale in
the URL fragment. The payload is deflate-raw compressed where supported, with a
plain JSON fallback. Legacy unversioned JSON envelopes remain readable after
validation. Theme tokens are not currently included in a share link.

Limits: 64 KiB encoded payload, 256 KiB expanded data, 1,000 nodes and 2,000
relations. Decompression is bounded while reading and has a timeout. External
inputs also pass structural/reference validation. The editor accepts at most
256 KiB of JSON text. Use file-based JSON for content too large for URLs.

Shared fragments are not encryption. Anyone receiving the URL can read its data;
clipboard, browser history, extensions and screenshots may expose it. Do not put
secrets or personal/customer data into examples you intend to share.

- Copy SVG resolves current computed styles and colors but may depend on fonts
  installed in the destination application.
- Download SVG embeds the playground fonts for a more portable standalone file.
- PNG rasterizes at 2× scale; it is not editable vector content.
- JSON preserves the current validated data. Generated TSX is a typed integration
  example with state callbacks, not a snapshot of the currently hovered node.
- Exports reflect the current SVG styling/selection. Clear selection before
  exporting when you want an undimmed complete diagram.

Clipboard and download errors must be visible rather than reported as successful.
The target application remains part of compatibility testing, especially for SVG
fonts, filters, color handling and transparency.

## Playground limits and local recovery

Editing/importing and sharing use the same playground ceilings: 1,000 items in
node collections, 2,000 relations and 256 KiB expanded data. Shared URLs also have
a 64 KiB encoded ceiling. These are browser-tool protections, not restrictions
on the package's typed layout API or claims of mobile performance at the limit.
Invalid/oversized input retains the last valid preview.

Draft recovery is opt-in per diagram in this browser. Saved raw text is local,
not encrypted or secure storage; do not include secrets. Restore/discard is
explicit and restoring runs validation before rendering. Locale changes retain
raw edits in memory. Clearing resets the current locale's draft and example;
storage failures fall back to an unsaved-exit warning. Shared links do not
silently overwrite a saved draft.
