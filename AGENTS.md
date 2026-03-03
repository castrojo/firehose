# AI Agent Guidelines for CNCF Releases

This document provides guidelines for AI agents and AI-assisted development tools contributing to this repository.

## Overview

CNCF Releases is an Astro-based aggregator for CNCF project release announcements. It fetches 230+ RSS/Atom feeds from CNCF projects, enriches them with CNCF Landscape metadata, and renders a searchable static site deployed to GitHub Pages.

**Live Site:** https://castrojo.github.io/firehose/

## Architecture (v2.0)

```
Go pipeline → src/data/releases.json (~29MB, gitignored) → Astro → GitHub Pages
```

### Go Backend (`firehose-go/`)

- Fetches CNCF Landscape metadata (`landscape.yml`) from GitHub
- Fetches 230+ RSS/Atom feeds in parallel with goroutines
- Enriches releases with project name, description, and CNCF status
- Validates and normalizes data
- Writes `src/data/releases.json` for Astro to consume

### Astro Frontend (`src/`)

- Imports `src/data/releases.json` at build time
- Renders static HTML with Pagefind search index
- Client-side filtering (project, date), keyboard nav, infinite scroll
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

- `firehose-go/cmd/firehose/main.go` — pipeline entry point
- `firehose-go/config/feeds.yaml` — 230+ feed URLs
- `firehose-go/internal/feeds/feeds.go` — parallel feed fetching
- `firehose-go/internal/landscape/landscape.go` — CNCF Landscape integration
- `firehose-go/internal/models/models.go` — data structures with JSON tags
- `firehose-go/go.mod` — Go module (currently Go 1.24)

### Astro Frontend

- `src/pages/index.astro` — main page (sidebar layout, release feed, keyboard nav)
- `src/pages/feed.xml.ts` — RSS feed output
- `src/components/ReleaseCard.astro` — individual release display
- `src/components/SearchBar.astro` — Pagefind search integration
- `src/components/FilterBar.astro` — client-side filtering
- `src/components/InfiniteScroll.astro` — performance optimization
- `src/components/KeyboardHelp.astro` — keyboard shortcuts modal
- `src/lib/banners.ts` — CNCF banner system (build-time fetch, inline YAML parser)
- `src/lib/markdown.ts` — GitHub-compatible markdown rendering (marked.js)
- `src/lib/logoMapper.ts` — maps project names to logo files
- `src/lib/releaseGrouping.ts` — groups releases by project/version
- `src/lib/semver.ts` — semver parsing helpers
- `src/lib/truncate.ts` — text truncation utilities
- `astro.config.mjs` — Astro configuration (site/base for GitHub Pages)

### Build and Deployment

- `.github/workflows/update-feed.yaml` — daily build and deploy (6 AM UTC)
- `.github/workflows/update-logos.yaml` — logo update automation
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

### Adding a Feed

1. **Use the `cncf-landscape` MCP** to verify the project exists, confirm its current status (`graduated`, `incubating`, `sandbox`), and get the canonical name — do not use the website or model memory
2. Edit `firehose-go/config/feeds.yaml`
3. Add the feed URL under the appropriate CNCF status section
4. Run the Go pipeline and then `npm run build` to test
5. Verify the feed loads in the build output

Only add CNCF projects.

### Local Development

```bash
# Full build from scratch
cd firehose-go && go build -o firehose cmd/firehose/main.go && ./firehose && cd ..
npm ci && npm run build && npm run preview

# Dev server (requires existing releases.json)
npm run dev

# Go validation
cd firehose-go && go vet ./...
```

> `src/data/releases.json` is gitignored. Run the Go pipeline before `npm run build`.

### Seeing live changes in the browser

`npm run preview` serves the static `dist/` output and **does not hot-reload** — it will
not pick up changes until you rebuild and restart the server.

**Workflow for iterating on frontend changes (no feed data changes):**

1. Run the Astro build (skip Go pipeline — `releases.json` already exists):
   ```bash
   npm run build
   ```
2. Restart the preview server (`just serve` or `npm run preview`) to serve the new `dist/`.

After each commit that changes `src/`, run `npm run build` and restart the server to see
the update in the browser. The Go pipeline only needs to re-run if `firehose-go/` or
`firehose-go/config/feeds.yaml` changed.

### Modifying the Layout

- **Before starting:** Query the `astro-docs` MCP to verify correct component patterns and asset handling for the current Astro version
- Edit `src/pages/index.astro` for main page structure
- Two-column grid: sidebar (320px, sticky) + main content
- Responsive: single column below 1024px, fully vertical below 480px
- CSS variables defined in `:root` — use `--color-*` tokens from GitHub Primer

### Modifying Release Card Display

- **Before starting:** Query the `astro-docs` MCP to verify correct component patterns for the current Astro version
- Edit `src/components/ReleaseCard.astro`
- Content rendered as GitHub-compatible markdown via `marked.js`
- Project metadata comes from Go pipeline enrichment

## Testing Changes

```bash
npm run build   # Full pipeline verification (after running Go binary)
npm run preview # Preview at http://localhost:4321/firehose
```

**What to verify:**
- Build completes without errors
- Search works (type in search box)
- Filters work (project, date range)
- Keyboard navigation works (j/k/o/?)
- Responsive design (resize browser to 320px, 768px, 1024px)
- Infinite scroll (scroll to bottom)

## Current Dependencies

**Node.js:**
- `astro@5.x` — static site generator
- `marked@17.x` — markdown rendering
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
2. Parses project entries: name, repo URL, project status, description
3. Creates a lookup map by `org/repo` key
4. `firehose-go/internal/feeds/feeds.go` uses this map to enrich each feed entry

### Troubleshooting

**No project names in output:**
- Check Go build logs for "Fetching CNCF landscape data"
- Verify `landscape.go` parsing matches current `landscape.yml` indentation

**Wrong project metadata:**
- Check org/repo extraction from feed URL in `landscape.go`
- Verify project exists in `landscape.yml`

**Build fails fetching landscape:**
- Check network connectivity to `raw.githubusercontent.com`
- Verify landscape.yml URL in `landscape.go` is still correct

## Debugging Common Issues

### Build Failures

1. Run the Go pipeline first: `cd firehose-go && ./firehose`
2. Check `src/data/releases.json` exists and is non-empty
3. Run `npm run build` and check for TypeScript errors
4. Check network connectivity (Go pipeline fetches 230+ feeds + landscape data)

### Search Not Working

1. Check browser console for JavaScript errors
2. Verify Pagefind index in `dist/pagefind/` after build
3. Check `/pagefind/pagefind.js` loads in the Network tab

### Filters Not Working

1. Check `data-project`, `data-status`, `data-date` attributes on `.release-card` elements
2. Check browser console for FilterBar script errors

### Keyboard Navigation Issues

1. Focus on an input field disables keyboard nav
2. `.kbd-focused` class should be applied to the focused card
3. Keyboard nav is inlined in `src/pages/index.astro`

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
- Don't change `astro.config.mjs` `site`/`base` values without reading DEPLOYMENT.md first
- Don't break responsive design
- **CRITICAL:** Don't run `astro check` in build (breaks content collection in CI/CD)
- Don't commit `src/data/releases.json` (gitignored, ~29MB)

## Landing the Plane (Session Completion)

Work is NOT complete until `git push` succeeds.

1. Run `npm run build` to verify no regressions
2. Commit all changes with conventional commit messages
3. `git pull --rebase && git push`
4. Verify `git status` shows "up to date with origin"

## License

MIT License. All contributions, including AI-assisted ones, are subject to this license.
