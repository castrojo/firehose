# AI Agent Guidelines for CNCF Releases

This document provides guidelines for AI agents and AI-assisted development tools contributing to this repository.

## Overview

CNCF Releases is an Astro-based aggregator for CNCF project release announcements **and** CNCF project blog posts. It fetches 217 release feeds and 36 blog feeds from CNCF projects, enriches them with CNCF Landscape metadata, and renders a searchable static site deployed to GitHub Pages.

**Live Site:** https://castrojo.github.io/ (domain migration to `releases.cncf.io` pending — see `astro.config.mjs` comments)

## Architecture (v3.0)

```
Go pipeline → src/data/releases.json { releases: [], news: [] } → Astro → GitHub Pages
```

Two pages, two RSS feeds:

| Route | Content | Items |
|---|---|---|
| `/` | CNCF project release notes | ~2093 |
| `/news/` | CNCF project blog posts | ~1195 |
| `/feed.xml` | Releases RSS 2.0 | latest 100 |
| `/news.xml` | News RSS 2.0 | latest 100 |

### Go Backend (`firehose-go/`)

- Fetches CNCF Landscape metadata (`landscape.yml`) from GitHub
- Fetches 217 release feeds in parallel with goroutines → `releases` array
- Fetches 36 blog feeds in parallel → `news` array (name-based landscape fallback since blog feeds lack GitHub URLs)
- Blog URL discovery via `internal/blog/discovery.go`: Medium special-case → suffix probing (`/feed`, `/feed.xml`, etc.) → HTML `<link rel=alternate>` fallback. 5s timeout, 10-goroutine cap.
- Enriches both arrays with project name, description, and CNCF status
- Writes `src/data/releases.json` with shape `{ releases: Release[], news: Release[], ... }`

### Astro Frontend (`src/`)

- Imports `src/data/releases.json` at build time
- Shared layout: `src/layouts/MainLayout.astro` (HTML shell, CSS vars, dark mode, header with CNCF logos, Releases/News nav tabs, SearchBar, KeyboardHelp modal, footer)
- Two pages import `MainLayout` and render their own content + FilterBar + InfiniteScroll
- Client-side filtering (project, date), keyboard nav, infinite scroll on both pages
- Pagefind index built over both pages (build-time only; no Pagefind UI is rendered — see Known Gotchas)
- Deploys to GitHub Pages via GitHub Actions

### CI Pipeline

1. Go build + `./firehose` (generates `releases.json`)
2. `npm ci && npm run build` (Astro + Pagefind)
3. Deploy to GitHub Pages

## Core Principles

- **@cncf/landscape is the single source of truth** — always takes priority for project metadata
- **Keep it simple** — surgical changes, minimize dependencies
- **Maintain responsive design** — 320px to 1920px viewports

## MCP Servers

Two MCP servers are configured in `opencode.json`. Using them is **mandatory** — they are
the authoritative sources for correctness. Do not substitute web search or model memory.

### Session workflow

Read `opencode.json` at the start of every session. Before writing any code, consult the
relevant MCP for the domain you are touching. This is a lookup, not a judgment call.

| If you are touching... | Query this MCP first |
|---|---|
| `firehose-go/config/feeds.yaml` or any feed/project data | `cncf-landscape` |
| Any file in `src/` (components, pages, lib) | `astro-docs` |
| `astro.config.mjs` or Astro-related deps in `package.json` | `astro-docs` |
| `src/lib/logoMapper.ts` or `public/logos/` | `cncf-landscape` (verify project exists) |
| Any CNCF project name, status, repo URL, or description | `cncf-landscape` |
| `src/assets/` SVG imports or Astro image handling | `astro-docs` |

**Do not** use the CNCF website, GitHub browsing, or model memory as a substitute.
The MCPs return live landscape data and version-exact Astro docs — web search does not.

### cncf-landscape

Provides live data from the CNCF Landscape (`https://landscape.cncf.io/data/full.json`).

**Use it for:**

- **Before adding any feed** — verify the project exists in the landscape, confirm its status (`graduated`, `incubating`, or `sandbox`), and get the canonical project name and repo URL
- **Before modifying `feeds.yaml`** — confirm the category is still correct (projects graduate and are archived)
- **Auditing feeds.yaml** — cross-check existing entries against live landscape data to find stale, miscategorized, or missing projects
- **Getting canonical metadata** — project name, description, homepage URL as CNCF defines them

**Why:** The landscape is the single source of truth per the core principles. Adding a feed
in the wrong category or for a project that no longer exists in the landscape silently
corrupts the data. There is no build-time error — the data is just wrong.

### astro-docs

Provides version-accurate documentation for the exact Astro version in `package.json`.

**Use it for:**

- **Before modifying any file in `src/`** — verify correct API usage, import paths, and component patterns for the current Astro version
- **Asset and image handling** — confirm whether to use `src/assets/` imports, `public/` paths, `<Image />`, or SVG components; the answer changes between Astro versions
- **`BASE_URL` and asset path handling** — confirm the correct way to reference public assets and construct URLs
- **Pagefind integration** — check current integration patterns before touching the search setup
- **Static output vs SSR** — verify any page or endpoint follows the correct static-generation pattern
- **Deprecated APIs** — check before using any Astro feature not already present in the codebase

**Why:** Astro has breaking changes between minor versions. Using the wrong image import
pattern or a removed API produces no build error in development but fails in CI or renders
incorrectly. The MCP returns docs for the exact installed version — web search does not.

## Attribution Requirements

```text
Assisted-by: [Model Name] via [Tool Name]
```

## Commit Message Format

```text
<type>: <short description>

<detailed description if needed>

Assisted-by: [Model Name] via [Tool Name]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

## Key Files

### Go Pipeline

- `firehose-go/cmd/firehose/main.go` — pipeline entry point; fetches both release and blog feeds
- `firehose-go/config/feeds.yaml` — 217 release feeds + 36 blog feeds
- `firehose-go/internal/feeds/feeds.go` — parallel feed fetching; `FetchBlogFeeds()` with name-based landscape fallback
- `firehose-go/internal/blog/discovery.go` — RSS/Atom blog feed auto-discovery
- `firehose-go/internal/landscape/landscape.go` — CNCF Landscape integration; parses `blog_url` from `extra:` block
- `firehose-go/internal/models/models.go` — data structures; `BlogSource`, `News []Release`, `BlogFeedsTotal`
- `firehose-go/go.mod` — Go module (currently Go 1.25)

### Astro Frontend

- `src/layouts/MainLayout.astro` — **shared layout** for all pages: HTML shell, dark mode, header, CNCF logos, Releases/News nav, SearchBar, KeyboardHelp modal, footer
- `src/pages/index.astro` — Releases page (uses `MainLayout`; sidebar, release feed, keyboard nav)
- `src/pages/news/index.astro` — News page (mirrors Releases UX; uses `MainLayout`)
- `src/pages/feed.xml.ts` — Releases RSS 2.0 output
- `src/pages/news.xml.ts` — News RSS 2.0 output
- `src/components/ReleaseCard.astro` — individual release/post display
- `src/components/SearchBar.astro` — project-name autocomplete dropdown (client-side filter; NOT a Pagefind UI)
- `src/components/FilterBar.astro` — client-side filtering
- `src/components/InfiniteScroll.astro` — performance optimization
- `src/components/KeyboardHelp.astro` — keyboard shortcuts modal
- `src/lib/banners.ts` — CNCF banner system (build-time fetch, inline YAML parser)
- `src/lib/markdown.ts` — GitHub-compatible markdown rendering (marked.js)
- `src/lib/logoMapper.ts` — maps project names to logo files
- `src/lib/releaseGrouping.ts` — groups releases by project/version
- `src/lib/semver.ts` — semver parsing helpers
- `src/lib/truncate.ts` — text truncation utilities
- `astro.config.mjs` — Astro configuration; `base: '/firehose'`; domain migration notes inline

### Build and Deployment

- `.github/workflows/update-feed.yaml` — daily build and deploy (6 AM UTC)
- `.github/workflows/update-logos.yaml` — logo update automation
- `.github/workflows/landscape-sync.yaml` — weekly Monday 4 AM UTC auto-sync of feeds.yaml
- `package.json` — Node.js dependencies and scripts

## CNCF Artwork

All CNCF logos come from **https://github.com/cncf/artwork** — this is the canonical
source for all CNCF project and brand logos. The landscape MCP does not serve artwork;
use the artwork repo directly via `curl` or the GitHub API.

**Directory structure:**

```
other/cncf/icon/color/cncf-icon-color.svg   ← CNCF site logo, light mode
other/cncf/icon/white/cncf-icon-white.svg   ← CNCF site logo, dark mode
projects/<name>/icon/color/                  ← project logo, light mode
projects/<name>/icon/white/                  ← project logo, dark mode
```

**Where to store assets locally:**

| Asset type | Location | Why |
|---|---|---|
| Site branding (CNCF logo, static UI SVGs) | `src/assets/` | Astro processes and inlines at build time |
| Project logos (fetched by Go pipeline) | `public/logos/` | Served as-is; accessed via URL paths at runtime |

**Never** put site branding in `public/logos/` or project logos in `src/assets/` — the
distinction matters because `src/assets/` images are bundled by Astro and `public/` files
are copied as-is with no processing.

**Astro SVG import pattern (Astro ≥ 5.7, current):**

Import SVGs from `src/assets/` as Astro components. Do NOT use `<img src="...">` with
`public/` paths for build-time assets — that bypasses Astro's pipeline and requires
manual `BASE_URL` construction.

```astro
---
import CNCFLogoColor from '../assets/cncf-icon-color.svg';
import CNCFLogoWhite from '../assets/cncf-icon-white.svg';
---
<CNCFLogoColor width={40} height={40} />
```

Always confirm the correct SVG import pattern with the `astro-docs` MCP before use —
it has changed across Astro versions.

**Theme-switching pattern:**

The site uses JS-driven `[data-theme="dark"]` on `<html>`, set by `ThemeToggle.astro`.
This is **not** `prefers-color-scheme`. Do NOT use `<picture media="(prefers-color-scheme: dark)">` —
it will not respond to the manual toggle button.

Use the dual-SVG CSS hide/show pattern, consistent with how `ThemeToggle.astro` handles
its sun/moon icons:

```css
/* light mode: show color, hide white */
.logo-dark  { display: none; }

/* dark mode: hide color, show white */
[data-theme="dark"] .logo-light { display: none; }
[data-theme="dark"] .logo-dark  { display: block; }
```

## Common Tasks

### Adding a Release Feed

1. **Use the `cncf-landscape` MCP** to verify the project exists, confirm its current status (`graduated`, `incubating`, `sandbox`), and get the canonical name — do not use the website or model memory
2. Edit `firehose-go/config/feeds.yaml` under the `feeds:` section
3. Add the feed URL under the appropriate CNCF status section
4. Run the Go pipeline and then `npm run build` to test
5. Verify the feed loads in the build output

### Adding a Blog Feed

1. **Use the `cncf-landscape` MCP** to verify the project exists and has a `blog_url` in `extra:`
2. If `blog_url` is present in the landscape, run the landscape sync: `cd firehose-go && go run cmd/sync/main.go`
3. Otherwise, manually add under the `blogs:` section in `firehose-go/config/feeds.yaml`
4. Run the Go pipeline and then `npm run build` to test

Only add CNCF projects.

### Local Development

```bash
# Full build from scratch (self-contained — runs npm ci, Go pipeline, Astro, Pagefind)
just build

# Preview the built site (opens browser at http://localhost:4321/firehose)
just serve

# Dev server with hot reload (Pagefind/search not available)
just dev

# Go linting only
cd firehose-go && go vet ./...
```

> `src/data/releases.json` is gitignored. `just build` handles the full pipeline including
> the Go binary. Use `npm run build` alone only when `releases.json` already exists and
> you want to skip re-fetching all feeds.

### Seeing live changes in the browser

`npm run preview` serves the static `dist/` output and **does not hot-reload** — it will
not pick up changes until you rebuild and restart the server.

**Workflow for iterating on frontend changes (no feed data changes):**

1. Run the Astro build (skip Go pipeline — `releases.json` already exists):
   ```bash
   npm run build
   ```
2. Restart the preview server (`just serve`) to serve the new `dist/`.

After each commit that changes `src/`, run `npm run build` and restart the server to see
the update in the browser. The Go pipeline only needs to re-run if `firehose-go/` or
`firehose-go/config/feeds.yaml` changed.

### Modifying the Layout

- **Before starting:** Query the `astro-docs` MCP to verify correct component patterns and asset handling for the current Astro version
- Edit `src/layouts/MainLayout.astro` for shared chrome (header, nav, footer, dark mode)
- Edit `src/pages/index.astro` for Releases-specific content
- Edit `src/pages/news/index.astro` for News-specific content
- Two-column grid: sidebar (320px, sticky) + main content
- Responsive: single column below 1024px, fully vertical below 480px
- CSS variables defined in `:root` — use `--color-*` tokens from GitHub Primer

### Modifying Release Card Display

- **Before starting:** Query the `astro-docs` MCP to verify correct component patterns for the current Astro version
- Edit `src/components/ReleaseCard.astro`
- Content rendered as GitHub-compatible markdown via `marked.js`
- Project metadata comes from Go pipeline enrichment

### BASE_URL / Asset URL Pattern

`astro.config.mjs` has `base: '/'`. All files that construct URLs use:

```ts
const baseUrl = (import.meta.env.BASE_URL as string).replace(/\/*$/, '/');
```

Never use `import.meta.env.BASE_URL` raw — trailing-slash inconsistencies will cause 404s.
`MainLayout.astro` passes the normalised `baseUrl` constant via `define:vars` to client scripts.

## Testing Changes

```bash
npm run build   # Full pipeline verification (after running Go binary)
npm run preview # Preview at http://localhost:4321/
```

**What to verify:**
- Build completes without errors
- Releases page (`/`) loads with release cards
- News page (`/news/`) loads with blog post cards
- Project filter works (SearchBar.astro is a project-name autocomplete dropdown — not a Pagefind UI; Pagefind index is built but no full-text search UI is rendered)
- Filters work (project, date range) on both pages
- Keyboard navigation works (j/k/o/?)
- Responsive design (resize browser to 320px, 768px, 1024px)
- Infinite scroll (scroll to bottom)
- Dark mode toggle works; code blocks in dark mode are readable (`stripChromaInlineStyles()` in `src/lib/markdown.ts` strips Hugo/Chroma inline styles before rendering)
- RSS feeds: `/feed.xml` and `/news.xml` both return valid XML

## Known Gotchas

- **Dark mode + upstream code blocks:** Blogs from Kubernetes, Flux, PipeCD etc. ship Hugo/Chroma inline styles with hardcoded light-mode colors. Fixed in `src/lib/markdown.ts` via `stripChromaInlineStyles()`, which strips inline `style` attributes from `<pre>` and `<span>` elements before rendering. This produces unstyled code blocks in dark mode rather than inverting light-mode colors.
- **`package sync` shadows stdlib:** `firehose-go/internal/sync/sync.go` uses `gosync "sync"` alias throughout.
- **Blog landscape fallback:** Blog feeds don't have GitHub URLs, so `fetchSingleFeed` falls back to matching `source.Project` against `proj.Name` in the landscape map (not org/repo key).
- **Canonical landscape entry wins:** `landscape.go` ensures the canonical CNCF entry (graduated/incubating/sandbox) wins over duplicate `repo_url` entries (e.g. Wasm subcategory entries).
- **Pre-existing LSP errors:** `src/pages/index.astro` (`Property 'data' does not exist on type 'never'`) — pre-existing and does not affect `npm run build`.
- **`astro check` is banned in builds** — breaks content collection in CI/CD. Never add it.

## Current Dependencies

**Node.js:**
- `astro@5.x` — static site generator
- `marked@17.x` — markdown rendering
- `marked-highlight` — stub (returns raw code; syntax colors come from upstream RSS content)
- `pagefind@1.x` — static search (dev dependency)

**Go:**
- `github.com/mmcdole/gofeed` — RSS/Atom feed parsing
- `gopkg.in/yaml.v3` — YAML parsing (landscape.yml)

**Do NOT add** without discussion:
- UI frameworks (React, Vue, Svelte)
- CSS frameworks (Tailwind, Bootstrap)
- State management libraries

## CNCF Landscape Integration

Landscape integration happens in Go, not TypeScript.

### Go Pipeline (`firehose-go/internal/landscape/landscape.go`)

1. Fetches `landscape.yml` from the `cncf/landscape` GitHub repository
2. Parses project entries: name, repo URL, project status, description, `blog_url` (from `extra:` block)
3. Creates a lookup map by `org/repo` key; canonical CNCF entry wins over duplicates
4. `firehose-go/internal/feeds/feeds.go` uses this map to enrich each feed entry

### Troubleshooting

**No project names in output:**
- Check Go build logs for "Fetching CNCF landscape data"
- Verify `landscape.go` parsing matches current `landscape.yml` indentation

**Wrong project metadata:**
- Check org/repo extraction from feed URL in `landscape.go`
- Verify project exists in `landscape.yml`

**Blog posts have no project name:**
- Blog feeds use name-based fallback (not org/repo key)
- Verify `source.Project` matches `proj.Name` in landscape map

**Build fails fetching landscape:**
- Check network connectivity to `raw.githubusercontent.com`
- Verify landscape.yml URL in `landscape.go` is still correct

## Debugging Common Issues

### Build Failures

1. Run the Go pipeline first: `cd firehose-go && ./firehose`
2. Check `src/data/releases.json` exists and is non-empty; verify it has both `releases` and `news` arrays
3. Run `npm run build` and check for TypeScript errors
4. Check network connectivity (Go pipeline fetches 250+ feeds + landscape data)

### Search Not Working

The search box is **SearchBar.astro** — a project-name autocomplete dropdown (client-side JS filter). It is NOT a Pagefind UI. Pagefind index is built but not surfaced as a UI.

1. Check browser console for JavaScript errors in SearchBar's client script
2. Verify Pagefind index in `dist/pagefind/` after build (index exists even though no UI is rendered)
3. Check `data-project` attributes on `.release-card` elements — FilterBar uses these for filtering

### Filters Not Working

1. Check `data-project`, `data-status`, `data-date` attributes on `.release-card` elements
2. Check browser console for FilterBar script errors

### Keyboard Navigation Issues

1. Focus on an input field disables keyboard nav
2. `.kbd-focused` class should be applied to the focused card
3. Keyboard nav is inlined in each page (`index.astro` and `news/index.astro`)

### News Page Empty

1. Verify `src/data/releases.json` has a non-empty `news` array
2. Re-run the Go pipeline: `cd firehose-go && ./firehose`
3. Check `firehose-go/config/feeds.yaml` has entries under `blogs:`

## Code Quality Standards

1. **TypeScript** — proper types, follow existing patterns
2. **Astro components** — scoped styles, semantic HTML
3. **CSS** — CSS variables, mobile-first responsive design
4. **JavaScript** — vanilla JS for client-side (no frameworks)
5. **Go** — standard library preferred, minimal external deps
6. **Accessibility** — ARIA labels, keyboard navigation, screen reader support

## Best Practices for AI Agents

### Do's

- Follow existing code patterns and conventions
- Test with `npm run build` (after running Go pipeline)
- Include proper attribution in commits
- Maintain responsive design (320px–1920px)
- Preserve accessibility features
- Use semantic commit messages

### Don'ts

- Don't add unnecessary dependencies
- Don't break existing features without testing
- Don't change `astro.config.mjs` `site`/`base` values without reading the inline comments first
- Don't break responsive design
- **CRITICAL:** Don't run `astro check` in build (breaks content collection in CI/CD)
- Don't commit `src/data/releases.json` (gitignored, ~29MB)
- Don't use `import.meta.env.BASE_URL` raw — always normalise with `.replace(/\/*$/, '/')`

## Landing the Plane (Session Completion)

Work is NOT complete until `git push` succeeds.

1. Run `just build` to verify no regressions
2. Commit all changes with conventional commit messages
3. `git pull --rebase && git push`
4. Verify `git status` shows "up to date with origin"

## License

MIT License. All contributions, including AI-assisted ones, are subject to this license.
