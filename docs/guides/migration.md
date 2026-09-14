# Migrating to 0.3.0

1. Registry state now matches across public entrypoints. Install the whole package;
   do not copy a single built entry file without its shared chunks.
2. Sequence edge IDs preserve message IDs. Other relations can declare `id`.
   Update integrations that assumed every edge ID was `from::to`. Endpoint tokens
   are escaped to avoid delimiter collisions; anonymous parallel IDs depend on order.
3. Import `DEFAULT_SHOWCASE_ENTRIES` from `/showcase`; `/showcase/entries` was never
   a public export and should not be used.
4. The playground edits strict JSON, not JavaScript expressions. Use quoted keys,
   remove comments and use the generated TSX view for application code.
5. Use `/validation` for untrusted data. Low-level typed layout and registry APIs
   do not automatically validate or sandbox arbitrary objects.
6. Set `--diagram-font-display` for canvas display fonts. This avoids the previous
   self-referencing display-font variable.
7. This release targets React 18.3/19 and Node 20.19+ consumers, with Node 22.14+
   for development. Validate your actual framework/bundler configuration.

Pre-1.0 minor versions can contain documented breaking changes. Pin a version when
embedding documentation in an agent workflow and upgrade deliberately. We keep
published versions immutable; fixes use a new version, not replacement tarballs.
