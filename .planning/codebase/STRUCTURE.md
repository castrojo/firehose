# Source Code Structure

**Status:** Current organization (v1.1)  
**Last Updated:** February 2, 2026  
**Total Files:** 27 (10 components, 9 lib modules, 3 utils, 2 pages, 1 script, 2 config)

## Directory Overview

```
src/
├── components/         # 10 Astro UI components
├── config/             # 1 configuration file (feed URLs)
├── content/            # 1 content collection config
├── lib/                # 9 core library modules
├── pages/              # 2 page routes (index + RSS feed)
├── scripts/            # 1 client-side script (keyboard nav)
└── utils/              # 3 utility modules
```

## Components (`src/components/`) - UI Layer

**Purpose:** Reusable Astro components for UI elements  
**Count:** 10 components  
**Naming:** PascalCase.astro

### Core Display Components

**`ReleaseCard.astro`** - Individual release display  
- Renders project name, description, release title, content
- Markdown parsing for release notes
- Links to GitHub release page
- Project logo integration
- Data attributes for filtering (`data-project`, `data-status`, `data-date`)

**`CollapsibleReleaseGroup.astro`** - Smart release grouping  
- Groups minor releases by project
- Expandable/collapsible UI
- Shows latest version prominently
- Hides patch releases by default
- Reduces visual clutter

**`SearchBar.astro`** - Pagefind search integration  
- Full-text search UI
- Highlights matched terms
- Keyboard shortcut (/)
- Offline-capable

**`FilterBar.astro`** - Client-side filtering controls  
- Project dropdown (160 options)
- Status dropdown (graduated/incubating/sandbox)
- Date range selector
- Clear filters button
- Instant filtering (<10ms)

### Navigation & Help

**`KeyboardHelp.astro`** - Keyboard shortcuts modal  
- Vim-style navigation reference
- 10 keyboard shortcuts documented
- Modal dialog (triggered by ?)
- Responsive design

**`ThemeToggle.astro`** - Dark mode switcher  
- Light/dark theme toggle
- LocalStorage persistence
- System preference detection
- CNCF-branded colors

### Layout & Enhancement

**`InfiniteScroll.astro`** - Performance optimization  
- Lazy loads releases as user scrolls
- Prevents rendering 600+ cards at once
- Intersection Observer API
- Configurable batch size

**`ErrorBanner.astro`** - Build error display  
- Shows failed feed fetches
- Graceful degradation UI
- Helps debug feed issues

**`InfoBox.astro`** - Statistics display  
- Project count, feed count
- Last update timestamp
- Status distribution

**`KubeConBanner.astro`** - Event promotion  
- Conditional banner for CNCF events
- Time-based display logic
- Dismissable

## Configuration (`src/config/`)

**`feeds.ts`** - Feed source configuration  
- **231 feed URLs** for 160 CNCF projects
- Organized by maturity: graduated, incubating, sandbox
- Format: Array of `{ url: string }` objects
- Example: `{ url: 'https://github.com/kubernetes/kubernetes/releases.atom' }`

**Key data:**
```typescript
export const graduatedFeeds = [...];    // Graduated projects
export const incubatingFeeds = [...];   // Incubating projects
export const sandboxFeeds = [...];      // Sandbox projects
export const allFeeds = [...];          // Combined (231 total)
```

**Line count:** ~240 lines (mostly feed URLs)

## Content Collection (`src/content/`)

**`config.ts`** - Astro Content Layer configuration  
- Defines `releases` collection
- Specifies custom loader: `feedLoader(allFeeds)`
- Schema: `FeedEntrySchema` from `lib/schemas.ts`
- No physical files in `src/content/` - data fetched at build time

**Key configuration:**
```typescript
export const collections = {
  releases: defineCollection({
    loader: feedLoader(allFeeds),
    schema: FeedEntrySchema,
  }),
};
```

## Library Modules (`src/lib/`) - Business Logic

**Purpose:** Core functionality, reusable logic  
**Count:** 9 modules  
**Naming:** kebab-case.ts

### Data Fetching & Processing

**`feed-loader.ts`** (214 lines) - Custom Astro Content Loader  
- **Most important file** - Orchestrates entire data pipeline
- Implements `Loader` interface for Astro Content Layer
- Fetches 231 feeds in parallel (Promise.allSettled)
- Enriches entries with CNCF Landscape metadata
- Error handling with graceful degradation
- Retry logic via `utils/retry.ts`
- Build summary logs (success/failure rates)

**Key function:** `feedLoader(sources: FeedSource[]): Loader`

**`landscape.ts`** (153 lines) - CNCF Landscape integration  
- Fetches landscape.yml from cncf/landscape repo
- Parses 867 ecosystem projects
- Creates lookup map by org/repo slug
- Matches feeds to projects
- Provides canonical project names, descriptions, status

**Key functions:**
- `fetchLandscapeData(): Promise<LandscapeData>`
- `matchFeedToProject(feedUrl, landscapeData): LandscapeProject | null`

**`schemas.ts`** - Zod validation schemas  
- `FeedEntrySchema` - Release entry structure
- `LandscapeProjectSchema` - Project metadata structure
- `FeedSourceSchema` - Feed configuration structure
- TypeScript type inference from Zod schemas

### Content Processing

**`markdown.ts`** - Markdown rendering  
- GitHub-compatible markdown (GFM)
- Syntax highlighting for code blocks
- Auto-generated heading IDs
- Uses marked.js with plugins

**Key function:** `renderMarkdown(content: string): string`

**`releaseGrouping.ts`** - Smart release collapsing  
- Groups minor releases by project
- Semantic version parsing
- Reduces visual noise (shows 1.x.0, hides 1.x.1-9)

**`semver.ts`** - Semantic versioning utilities  
- Parses version strings (v1.2.3, 1.2.3, etc.)
- Extracts major/minor/patch
- Used by release grouping

**`truncate.ts`** - Text truncation  
- Truncates long project descriptions
- Word boundary detection
- Adds ellipsis (...)

### UI Support

**`logoMapper.ts`** - Project logo resolution  
- Maps project names to logo URLs
- CNCF artwork repository integration
- Fallback for missing logos
- 56+ projects with logos

**Key function:** `getProjectLogo(projectName: string): string | null`

**`banners.ts`** - Event banner management  
- Time-based banner display logic
- KubeCon and CNCF event promotion
- Dismissal tracking (LocalStorage)

## Pages (`src/pages/`) - Routes

**Purpose:** Top-level page routes  
**Count:** 2 pages  
**Naming:** kebab-case.astro or .ts

**`index.astro`** - Main page  
- Homepage layout (sidebar + main content)
- Imports all components
- Renders release cards
- Client-side enhancements (search, filters, keyboard nav)
- Inline styles (CSS variables)
- Responsive design (320px-1920px)

**URL:** `/firehose/` (GitHub Pages base path)

**`feed.xml.ts`** - RSS feed generation  
- Generates RSS 2.0 feed
- 100 most recent releases
- XML content type
- Server-side rendering (SSR endpoint)

**URL:** `/firehose/feed.xml`

## Scripts (`src/scripts/`) - Client-Side

**Purpose:** Browser JavaScript (progressive enhancement)  
**Count:** 1 script  
**Naming:** kebab-case.ts

**`keyboard-nav.ts`** - Vim-style keyboard shortcuts  
- 10 keyboard shortcuts (j, k, o, /, ?, space, shift+space, esc, s, h, t)
- Focus management (skip input fields)
- Scroll behaviors
- Theme toggle shortcut

**Loaded in:** `src/pages/index.astro` (inline `<script>`)

## Utilities (`src/utils/`) - Helpers

**Purpose:** Generic utility functions  
**Count:** 3 modules  
**Naming:** kebab-case.ts

**`retry.ts`** - Exponential backoff retry logic  
- Automatic retry for transient errors (5xx, timeouts)
- Configurable attempts, delays, multipliers
- Skips permanent errors (404, 403)
- Used by feed-loader for resilient fetching

**Key function:** `retryWithBackoff(fn, config, feedUrl)`

**`feed-status.ts`** - Feed error handling  
- Creates error entry objects for failed feeds
- Adds fetch metadata (timestamp, status)
- Used by feed-loader for error tracking

**`errors.ts`** - Error classification  
- Categorizes HTTP errors (transient vs permanent)
- Determines retry eligibility
- Error message formatting

## Build Output (`dist/`) - Not in src/

**Generated by:** `npm run build`  
**Contents:**
- Static HTML files
- CSS bundles
- JavaScript bundles (minimal, only for search/filters/keyboard)
- Assets (`_astro/` directory)
- Pagefind search index (`pagefind/` directory)
- RSS feed (`feed.xml`)

**Size:** ~2-3MB total  
**Deployment:** Entire `dist/` directory to GitHub Pages

## Naming Conventions

### Files
- **Components:** PascalCase.astro (e.g., `ReleaseCard.astro`)
- **Libraries:** kebab-case.ts (e.g., `feed-loader.ts`)
- **Utilities:** kebab-case.ts (e.g., `retry.ts`)
- **Pages:** kebab-case.astro or .ts (e.g., `index.astro`, `feed.xml.ts`)
- **Config:** kebab-case.ts (e.g., `feeds.ts`)

### Code
- **Functions:** camelCase (e.g., `fetchLandscapeData`, `renderMarkdown`)
- **Types:** PascalCase (e.g., `FeedEntry`, `LandscapeProject`)
- **Constants:** SCREAMING_SNAKE_CASE (e.g., `LANDSCAPE_URL`)
- **Variables:** camelCase (e.g., `projectMap`, `feedUrl`)

### Astro Components
- **Props:** camelCase interface
- **Slots:** Named slots for composition
- **Styles:** Scoped by default (`<style>` in component)

## Key Files Reference

### Most Important (Must Understand)
1. **`src/lib/feed-loader.ts`** - Heart of the system (data pipeline)
2. **`src/lib/landscape.ts`** - CNCF integration (metadata source)
3. **`src/config/feeds.ts`** - Feed configuration (231 URLs)
4. **`src/pages/index.astro`** - Main page (UI assembly)

### Secondary (Frequent Changes)
5. **`src/components/ReleaseCard.astro`** - Release display
6. **`src/lib/markdown.ts`** - Content rendering
7. **`src/components/FilterBar.astro`** - User controls
8. **`src/lib/schemas.ts`** - Data validation

### Supporting (Occasional Changes)
9. **`src/utils/retry.ts`** - Error resilience
10. **`src/lib/releaseGrouping.ts`** - UI optimization
11. **`src/components/ThemeToggle.astro`** - Dark mode
12. **`src/lib/logoMapper.ts`** - Visual enhancement

## Guidelines for Adding New Code

### Adding a New Feed
**File:** `src/config/feeds.ts`  
**Steps:**
1. Determine project maturity (graduated/incubating/sandbox)
2. Add to appropriate array: `graduatedFeeds`, `incubatingFeeds`, or `sandboxFeeds`
3. Format: `{ url: 'https://github.com/org/repo/releases.atom' }`
4. Ensure project exists in CNCF Landscape
5. Run `npm run build` to test

### Adding a New Component
**Location:** `src/components/`  
**Steps:**
1. Create `ComponentName.astro` (PascalCase)
2. Define props interface at top
3. Use scoped styles (`<style>` tag)
4. Import in `src/pages/index.astro`
5. Test responsiveness (320px-1920px)

### Adding a New Library Module
**Location:** `src/lib/`  
**Steps:**
1. Create `module-name.ts` (kebab-case)
2. Export functions with clear names
3. Add JSDoc comments
4. Include TypeScript types
5. Consider adding to `schemas.ts` if data structures involved

### Adding a New Utility
**Location:** `src/utils/`  
**Steps:**
1. Create `utility-name.ts` (kebab-case)
2. Make functions pure (no side effects)
3. Include error handling
4. Add unit tests (when testing framework added)
5. Document edge cases

## File Size Distribution

```
Large files (>150 lines):
  - src/lib/feed-loader.ts         214 lines
  - src/config/feeds.ts            ~240 lines
  - src/lib/landscape.ts           153 lines
  - src/pages/index.astro          ~200 lines

Medium files (50-150 lines):
  - Most components                50-100 lines
  - Most lib modules               50-100 lines

Small files (<50 lines):
  - src/utils/*                    30-50 lines
  - src/lib/semver.ts              ~40 lines
  - src/lib/truncate.ts            ~30 lines
```

## Testing Structure (Not Yet Implemented)

**Future organization:**
```
tests/
├── unit/
│   ├── lib/
│   │   ├── landscape.test.ts
│   │   ├── markdown.test.ts
│   │   └── semver.test.ts
│   └── utils/
│       ├── retry.test.ts
│       └── errors.test.ts
├── integration/
│   └── feed-loader.test.ts
└── e2e/
    └── search-filter.test.ts
```

**See:** `TESTING.md` for recommended approach

## Go Port Structure Considerations

When porting to Go, suggested organization:

```
firehose-go/
├── cmd/
│   └── firehose/
│       └── main.go           # Entry point
├── internal/
│   ├── feeds/
│   │   ├── loader.go         # Feed fetching
│   │   └── parser.go         # RSS parsing
│   ├── landscape/
│   │   ├── client.go         # Landscape API
│   │   └── matcher.go        # Project matching
│   ├── render/
│   │   ├── markdown.go       # Markdown rendering
│   │   └── templates.go      # HTML templates
│   └── search/
│       └── indexer.go        # Search indexing
├── pkg/
│   └── models/
│       ├── feed.go           # Feed models
│       └── project.go        # Project models
├── web/
│   ├── templates/            # HTML templates
│   ├── static/               # CSS, JS
│   └── components/           # Reusable partials
└── config/
    └── feeds.yaml            # Feed configuration (YAML)
```

## Related Documentation

- `STACK.md` - Technology dependencies (Astro, Node.js, etc.)
- `ARCHITECTURE.md` - How these files work together
- `DATAFLOW.md` - Data pipeline through these modules
- `TESTING.md` - Testing approach (future)
- `CONVENTIONS.md` - Coding standards (archived, but conventions still valid)

## Key Takeaways

1. **27 total source files** - Lean, maintainable codebase
2. **`feed-loader.ts` is the heart** - Orchestrates everything
3. **Clear separation of concerns** - Components, lib, utils, config
4. **Astro-based architecture** - .astro for UI, .ts for logic
5. **No build-time dependencies** - All data fetched fresh
6. **Client-side scripts minimal** - Progressive enhancement only
7. **231 feeds in one config file** - Easy to add new projects

---

**Authored by:** AI Assistant (OpenCode/Claude Sonnet 4.5)  
**Issue:** firehose-1eh - Write STRUCTURE.md  
**Date:** February 2, 2026
