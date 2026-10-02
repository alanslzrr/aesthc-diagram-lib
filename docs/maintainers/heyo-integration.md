# Heyo Docs integration map

The documentation content model is authored with the real Heyo Docs project:

- Package: `@heyo-sh/heyo-docs@3.3.0` (dev dependency, MIT)
- Registry shasum: `f80936b45e039c282848d3dba12113f3b5362dca`, tarball
  `@heyo-sh/heyo-docs/-/heyo-docs-3.3.0.tgz`
- Reference commit (`gitHead` in the published manifest):
  `7f3e8fd142981eec1012dc3ee089929cf67cb413`
- Upstream: <https://github.com/heyo-sh/heyo-docs>, docs at <https://heyo.sh>

## What this repository reuses

| Heyo Docs asset                                                              | How it is used here                                                                                                                                                                                                                                             |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `heyoDocs()` config builder and its Zod schema (`@heyo-sh/heyo-docs/config`) | `heyo-docs.config.mjs` is the canonical documentation manifest. It is validated with the published builder, not a local imitation.                                                                                                                              |
| `DocsApp` runtime shell (`@heyo-sh/heyo-docs`)                               | **Mounted** at `/docs` through `site/src/docs/DocsApp.tsx`: the runtime owns page lookup, navigation adjacency, search slots and page actions. `site/src/docs/server.tsx` / `client.tsx` render and hydrate it with `StaticRouter` / `BrowserRouter`.           |
| Theme component contract (`HeyoDocsTheme`)                                   | `site/src/docs/shell.tsx` implements Layout, TopNavigation, Sidebar, DocsPage, TableOfContents and Search with the repository's Vercel/Geist tokens and existing DOM contracts, so the design system is preserved without importing Heyo's Tailwind/shadcn CSS. |
| Page model (`DocsPage`)                                                      | Every static page publishes its `DocsPage.content` component (previews, metadata, complete example) and `tableOfContents`; `page.json` keeps powering client-side navigation.                                                                                   |
| Link adapter (`DocsApp link`)                                                | `SiteLink` resolves Heyo's mount-relative slugs to real site URLs and delegates internal navigation to `react-router`, keeping `react-router` history and the current frozen-version rebasing.                                                                  |
| Content model `groups → sections → pages`                                    | `scripts/docs/page.mjs` derives Markdown pages, static HTML and the sidebar payload from the manifest, one source of truth for the pipeline and the unit tests.                                                                                                 |
| Representative vertical section                                              | The manifest leads with **Start** (`index`, `getting-started`), **Editor** (`guides/editor`, `guides/react`, `guides/theming`) and **Reference** (`api/index`), the three pages the UI guide asks to validate first.                                            |
| Markdown mirrors                                                             | Every page is still served as `index.md` with a Copy Markdown action; versioned snapshots, `llms.txt` and no-JS HTML stay in the static pipeline.                                                                                                               |
| Search                                                                       | The site's fetch-based `docs-assets/search.json` search is mounted through Heyo's `Search` component slot instead of the built-in index.                                                                                                                        |

`tests/heyo-docs-config.unit.spec.ts` proves the contract: the manifest passes
the published builder and maps exactly onto the published Markdown pages
(internal `docs/audits`, `docs/decisions` and `docs/specs` working papers are
excluded by design).

## Status

**Mounted.** `/docs` is rendered by the real `@heyo-sh/heyo-docs` runtime with a
site-owned theme, and the historical spike remains a runtime contract test.
What the mount provides today:

- `DocsApp` resolves the requested page from the mount-relative slug
  (`/index`, `/guides/editor`, …), renders the not-found page for unknown
  routes and drives previous/next navigation and table of contents.
- The theme components keep the repository's shell: sticky header, full
  manifest sidebar, article, page index, previews with code tabs, Markdown
  mirrors, version badge and downloads.
- Client navigation keeps working through `page.json` fetches and browser
  history; the static HTML for every route is still generated for no-JS and
  deep links.

Known limits, all deliberate:

1. Content is authored as Markdown and converted by the repository pipeline;
   MDX components beyond `DocsPage.content` are not used.
2. Heyo's `grain` theme CSS is not imported. Tailwind/shadcn tokens and
   Heyo's built-in themes would replace the Vercel/Geist direction, so the
   theme component contract is implemented locally instead.
3. AI chat, OpenAPI reference pages and changelog groups are not configured.
4. The docs entry graph is a reviewed 240 KiB gzip ceiling
   (`scripts/check-budgets.mjs`) measured from the mounted runtime; re-measure
   on every Heyo upgrade instead of assuming the reader 175 KiB ceiling.

## Historical spike (2026-09-27)

`tests/heyo-shell-spike.unit.spec.ts` renders `DocsApp` with the real pinned
package, the repository manifest (`heyo-docs.config.mjs`) and the built-in
`grainTheme` through `renderToStaticMarkup`. With canonical `/`-prefixed page
slugs the measured result was:

- the requested article renders server-side (`CONTENT-guides/editor`) and the
  foreign article does not;
- sidebar and page-navigation anchors for sibling pages are part of the static
  HTML (`href="/guides/editor"`, `href="/guides/react"`);
- an unknown route renders the not-found page;
- no DOM access is required during render.

An earlier version of this spike used `slug: 'guides/editor'` together with
`pathname: '/guides/editor'`; that mismatch rendered a 404 and led to a wrong
conclusion. The spike proved SSR feasibility and is retained as a runtime
contract test; the site integration it left open is now the mount described
above, verified by `tests/e2e/docs*.e2e.ts`.

## What is deliberately not reused

- Heyo's built-in themes and `theme/grain.css` (Tailwind v4 + `shadcn` tokens).
  The site keeps Geist and the Vercel tokens through its own theme components.
- AI chat, OpenAPI reference pages and changelog routes, which need product
  decisions and content this repository does not have yet.
- The `@heyo-sh/heyo-docs/vite` MDX pipeline: pages stay Markdown and every
  route keeps its static HTML, `index.md` mirror and `page.json` payload.

## Verification

```sh
pnpm exec vitest run tests/heyo-docs-config.unit.spec.ts tests/heyo-shell-spike.unit.spec.ts
pnpm docs:check && pnpm site:build && pnpm check:budgets
pnpm test:e2e --project=chromium tests/e2e/docs.e2e.ts tests/e2e/docs-react.e2e.ts
```

## Upgrading the reference

1. Bump the pinned version with `pnpm add -Dw @heyo-sh/heyo-docs@<version>`.
2. Read the upstream changelog for config-schema, `DocsApp` and theme-contract
   changes.
3. Run `pnpm exec vitest run tests/heyo-docs-config.unit.spec.ts
tests/heyo-shell-spike.unit.spec.ts`, `pnpm site:build` and
   `pnpm check:budgets`; re-measure the docs entry graph before touching the
   reviewed ceiling in `scripts/check-budgets.mjs`.
