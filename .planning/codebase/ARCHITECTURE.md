# Architecture Overview

**System:** The Firehose - CNCF Release Aggregator  
**Paradigm:** Build-time Static Site Generation (SSG)  
**Framework:** Astro v5 with Content Layer API  
**Last Updated:** February 2, 2026

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         BUILD TIME (Daily 6AM UTC)               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐                                               │
│  │ GitHub       │                                               │
│  │ Actions      │  Triggers build on:                           │
│  │ Workflow     │  - Push to main                               │
│  └──────┬───────┘  - Daily cron (0 6 * * *)                     │
│         │          - Manual workflow_dispatch                   │
│         ▼                                                        │
│  ┌──────────────┐                                               │
│  │ Astro Build  │                                               │
│  └──────┬───────┘                                               │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │          CONTENT LAYER API (Custom Loader)                │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │                                                           │   │
│  │  Step 1: Fetch CNCF Landscape (SOURCE OF TRUTH)          │   │
│  │  ┌────────────────────────────────────────────┐          │   │
│  │  │ https://raw.githubusercontent.com/          │          │   │
│  │  │ cncf/landscape/master/landscape.yml         │          │   │
│  │  │                                             │          │   │
│  │  │ Parses 867 ecosystem projects              │          │   │
│  │  │ Creates lookup map: org/repo → metadata    │          │   │
│  │  └────────────────┬───────────────────────────┘          │   │
│  │                   │                                       │   │
│  │  Step 2: Fetch 231 RSS/Atom Feeds (Parallel)             │   │
│  │  ┌────────────────▼───────────────────────────┐          │   │
│  │  │ Promise.allSettled([                       │          │   │
│  │  │   github.com/kubernetes/kubernetes/releases.atom      │   │
│  │  │   github.com/dapr/dapr/releases.atom                  │   │
│  │  │   ... 229 more feeds                       │          │   │
│  │  │ ])                                          │          │   │
│  │  │                                             │          │   │
│  │  │ With retry logic (exponential backoff)     │          │   │
│  │  │ Transient errors (5xx) → retry 3x          │          │   │
│  │  │ Permanent errors (404) → fail fast         │          │   │
│  │  └────────────────┬───────────────────────────┘          │   │
│  │                   │                                       │   │
│  │  Step 3: Enrich Entries with Landscape Data              │   │
│  │  ┌────────────────▼───────────────────────────┐          │   │
│  │  │ For each feed entry:                       │          │   │
│  │  │  - Extract org/repo from feed URL          │          │   │
│  │  │  - Look up in Landscape map                │          │   │
│  │  │  - Add: projectName, description, status   │          │   │
│  │  └────────────────┬───────────────────────────┘          │   │
│  │                   │                                       │   │
│  │  Step 4: Validate with Zod Schemas                        │   │
│  │  ┌────────────────▼───────────────────────────┐          │   │
│  │  │ FeedEntrySchema.safeParse(entry)           │          │   │
│  │  │ - Reject invalid entries                    │          │   │
│  │  │ - Log validation errors                     │          │   │
│  │  └────────────────┬───────────────────────────┘          │   │
│  │                   │                                       │   │
│  │  Step 5: Store in Content Collection                      │   │
│  │  ┌────────────────▼───────────────────────────┐          │   │
│  │  │ store.set({ id, data: validatedEntry })    │          │   │
│  │  │                                             │          │   │
│  │  │ Result: ~600+ release entries               │          │   │
│  │  └─────────────────────────────────────────────┘          │   │
│  │                                                           │   │
│  └───────────────────────────────────────────────────────────┘   │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────────┐                                           │
│  │ Astro SSG        │  Renders components to static HTML        │
│  │ index.astro      │  - Loops through releases collection      │
│  │                  │  - Applies filters (client-side prep)     │
│  └──────┬───────────┘  - Injects search UI placeholder         │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────────┐                                           │
│  │ Pagefind Index   │  Generates search index                   │
│  │ pagefind --site  │  - Indexes all HTML content               │
│  │ dist             │  - Creates pagefind.js bundle             │
│  └──────┬───────────┘  - ~50KB gzipped                          │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────────┐                                           │
│  │ dist/            │  Static output ready for deployment       │
│  │  ├── index.html  │  - Main page (~50KB)                      │
│  │  ├── feed.xml    │  - RSS feed (100 releases)                │
│  │  ├── _astro/     │  - CSS/JS bundles                         │
│  │  └── pagefind/   │  - Search index                           │
│  └──────┬───────────┘                                           │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────────┐                                           │
│  │ GitHub Pages     │  Deploys to castrojo.github.io/firehose   │
│  │ Deploy Action    │  - Uploads dist/ to gh-pages branch       │
│  └──────────────────┘  - CDN distribution                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         RUNTIME (Browser)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User visits: https://castrojo.github.io/firehose               │
│                                                                  │
│  ┌──────────────────┐                                           │
│  │ Static HTML      │  Loaded instantly (cached by CDN)         │
│  │ ~50KB gzipped    │  - No API calls needed                    │
│  └──────┬───────────┘  - All data pre-rendered                  │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │          CLIENT-SIDE ENHANCEMENTS (Progressive)           │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │                                                           │   │
│  │  Pagefind Search                                          │   │
│  │  ┌────────────────────────────────────────────┐          │   │
│  │  │ Loads pagefind.js on demand                 │          │   │
│  │  │ Searches pre-built index (offline-capable)  │          │   │
│  │  │ <50ms response time                         │          │   │
│  │  └─────────────────────────────────────────────┘          │   │
│  │                                                           │   │
│  │  Client-Side Filters                                      │   │
│  │  ┌────────────────────────────────────────────┐          │   │
│  │  │ Reads data-* attributes on cards            │          │   │
│  │  │ Instant filtering (<10ms)                   │          │   │
│  │  │ No page reload required                     │          │   │
│  │  └─────────────────────────────────────────────┘          │   │
│  │                                                           │   │
│  │  Keyboard Navigation                                      │   │
│  │  ┌────────────────────────────────────────────┐          │   │
│  │  │ Vim-style shortcuts (j/k/o/?)               │          │   │
│  │  │ Focus management with aria-live             │          │   │
│  │  │ Screen reader support                       │          │   │
│  │  └─────────────────────────────────────────────┘          │   │
│  │                                                           │   │
│  │  Dark Mode Toggle                                         │   │
│  │  ┌────────────────────────────────────────────┐          │   │
│  │  │ LocalStorage persistence                    │          │   │
│  │  │ System preference detection                 │          │   │
│  │  └─────────────────────────────────────────────┘          │   │
│  │                                                           │   │
│  │  Infinite Scroll                                          │   │
│  │  ┌────────────────────────────────────────────┐          │   │
│  │  │ Intersection Observer                       │          │   │
│  │  │ Loads 50 releases per batch                 │          │   │
│  │  └─────────────────────────────────────────────┘          │   │
│  │                                                           │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Architectural Layers

### Layer 1: Configuration (`src/config/`)

**Purpose:** Define data sources  
**Files:** `feeds.ts` (231 feed URLs)

**Responsibilities:**
- List all CNCF project feed URLs
- Organize by maturity (graduated/incubating/sandbox)
- Single source for feed configuration

**Key Principle:** Feeds are manually configured, but metadata comes from Landscape API

### Layer 2: Content Layer API (`src/content/config.ts`)

**Purpose:** Integrate custom data sources into Astro  
**Implementation:** Content Collections with custom loader

**Configuration:**
```typescript
export const collections = {
  releases: defineCollection({
    loader: feedLoader(allFeeds),  // Custom loader
    schema: FeedEntrySchema,        // Zod validation
  }),
};
```

**Why Content Layer:**
- Build-time data fetching (no runtime API calls)
- Type-safe with schemas
- Integrates with Astro's rendering
- Caching handled by Astro (though we clear it)

### Layer 3: Custom RSS Loader (`src/lib/feed-loader.ts`)

**Purpose:** Fetch, parse, enrich, and validate RSS feeds  
**Entry Point:** `feedLoader(sources: FeedSource[]): Loader`

**Pipeline:**

1. **Clear store** (line 19) - Fresh data every build
2. **Fetch Landscape** - Single source of truth for metadata
3. **Parallel feed fetching** - Promise.allSettled (non-blocking)
4. **Per-feed processing:**
   - Parse RSS/Atom (rss-parser)
   - Match to Landscape project (by org/repo slug)
   - Enrich with metadata (name, description, status)
   - Validate with Zod schema
5. **Error handling:**
   - Transient errors → retry with exponential backoff
   - Permanent errors → log and continue
   - Catastrophic failure (>50%) → fail build
6. **Store entries** - Astro Content Collection

**Performance:** 8-10 seconds for 231 feeds (parallel)

### Layer 4: Landscape Integration (`src/lib/landscape.ts`)

**Purpose:** Fetch and parse CNCF Landscape metadata  
**Source:** `https://raw.githubusercontent.com/cncf/landscape/master/landscape.yml`

**Process:**
1. Fetch YAML (2.8MB)
2. Parse with js-yaml
3. Navigate nested structure (landscape → categories → subcategories → items)
4. Extract projects (867 ecosystem projects)
5. Create lookup map: `{ "org/repo": { name, description, status, ... } }`

**Why This Matters:** 
- **NO hardcoded project counts** - Always uses latest from Landscape
- **Canonical names** - "Kubernetes" not "kubernetes/kubernetes"
- **Maturity status** - Graduated/incubating/sandbox from CNCF
- **Automatic updates** - Daily builds fetch latest Landscape

**See:** `LANDSCAPE-SOURCE-OF-TRUTH.md` for detailed explanation

### Layer 5: Static Site Generation (`src/pages/index.astro`)

**Purpose:** Render HTML at build time  
**Templating:** Astro components + JSX-like syntax

**Rendering Process:**
1. Query `releases` collection (from Content Layer)
2. Sort by date (newest first)
3. Loop through entries, render `ReleaseCard` component
4. Inject Pagefind search UI placeholder
5. Add client-side scripts (filters, keyboard nav)
6. Generate static HTML (no server required)

**Output:** `dist/index.html` (~50KB gzipped with 600+ releases)

### Layer 6: Search Indexing (Pagefind)

**Purpose:** Build-time search index generation  
**Command:** `pagefind --site dist` (runs after `astro build`)

**Process:**
1. Crawls all HTML in `dist/`
2. Extracts text content
3. Creates inverted index
4. Generates `pagefind.js` bundle
5. Outputs to `dist/pagefind/`

**Runtime Behavior:**
- Search UI loads `pagefind.js` on first search
- Queries local index (offline-capable)
- Returns results <50ms

### Layer 7: Client-Side Enhancement (Progressive)

**Purpose:** Add interactivity without breaking base functionality  
**Philosophy:** HTML works without JavaScript, JS enhances

**Enhancements:**
- **Search** - Pagefind UI (loads async)
- **Filters** - JavaScript reads `data-*` attributes
- **Keyboard nav** - Listens for key events
- **Dark mode** - Toggles CSS classes
- **Infinite scroll** - IntersectionObserver API

**Fallback:** If JavaScript disabled, all releases still visible (no filtering/search)

### Layer 8: Deployment (GitHub Pages)

**Purpose:** Host static site with CDN  
**Process:**
1. Build completes (dist/ directory ready)
2. GitHub Actions uploads artifact
3. Deployed to `gh-pages` branch
4. GitHub Pages serves from CDN
5. Available at `castrojo.github.io/firehose`

**Performance:**
- CDN edge caching (fast global access)
- HTTPS by default
- Custom domain support (optional)

## Error Handling & Resilience

### Feed Fetch Failures

**Strategy:** Graceful degradation

**Logic:**
```typescript
// src/lib/feed-loader.ts:124-134
const failureRate = errorCount / sources.length;
if (failureRate > 0.5) {
  throw new Error('Build failed: >50% feeds failed');
}
// Otherwise, build succeeds with partial data
```

**Behavior:**
- **<50% failure:** Build succeeds, shows available releases
- **>50% failure:** Build fails, GitHub Actions retries
- **Individual feed errors:** Logged but don't block others

### Retry Logic

**Implementation:** `src/utils/retry.ts`

**Configuration:**
```typescript
{
  maxAttempts: 3,
  initialDelay: 1000,      // 1s
  maxDelay: 10000,         // 10s
  backoffMultiplier: 2,    // Exponential
}
```

**Retry Decision:**
- **Transient errors** (5xx, timeouts) → Retry
- **Permanent errors** (404, 403) → Fail fast
- **Network errors** (ECONNRESET) → Retry

### Landscape Fetch Failure

**Behavior:** Build fails immediately (no fallback)

**Rationale:**
- Landscape is source of truth for metadata
- Running without it produces incorrect data
- Better to fail than show wrong project names/status

**Recovery:** GitHub Actions will retry on next scheduled run (daily)

## Data Flow Summary

```
Config (feeds.ts)
  ↓
Content Layer API (content/config.ts)
  ↓
Custom Loader (feed-loader.ts)
  ├─→ Landscape Fetch (landscape.ts) → 867 projects
  └─→ Feed Fetch (rss-parser) → 231 feeds
      ↓
  Enrichment (match feeds to projects)
      ↓
  Validation (schemas.ts with Zod)
      ↓
  Storage (Astro Content Collection)
      ↓
Page Rendering (index.astro)
  ├─→ Static HTML (dist/)
  └─→ RSS Feed (feed.xml.ts)
      ↓
Search Indexing (Pagefind)
  └─→ dist/pagefind/
      ↓
Deployment (GitHub Pages)
  └─→ castrojo.github.io/firehose
      ↓
Client-Side Enhancement (browser)
  ├─→ Search (Pagefind UI)
  ├─→ Filters (JavaScript)
  ├─→ Keyboard Nav (event listeners)
  └─→ Dark Mode (localStorage)
```

## Key Architectural Decisions

### 1. Build-Time vs Runtime

**Decision:** Build-time static generation (no backend)

**Rationale:**
- **Performance:** Pre-rendered HTML is fastest
- **Cost:** Zero infrastructure costs (static hosting free)
- **Security:** No server to attack
- **SEO:** Perfect Lighthouse scores
- **Reliability:** No database to go down

**Trade-off:** Updates require rebuild (acceptable for daily schedule)

### 2. CNCF Landscape as Source of Truth

**Decision:** Always fetch latest landscape.yml at build time

**Rationale:**
- **Accuracy:** No hardcoded counts, always current
- **Automatic adaptation:** New projects appear automatically
- **Canonical metadata:** Official CNCF names/status
- **No manual sync:** Eliminates maintenance burden

**See:** `LANDSCAPE-SOURCE-OF-TRUTH.md`

### 3. No Feed Content Caching

**Decision:** Clear store and refetch all feeds every build

**Rationale:**
- **Freshness priority:** Users expect latest releases
- **Simple architecture:** No cache invalidation complexity
- **Fast enough:** 10-15s builds acceptable for daily runs
- **Rare builds:** Not continuous (once per day)

**See:** `BUILD-CACHING-STRATEGY.md`

### 4. Parallel Feed Fetching

**Decision:** Promise.allSettled for 231 feeds simultaneously

**Rationale:**
- **Speed:** 8-10s vs 3-5 minutes sequential
- **Non-blocking:** One slow feed doesn't block others
- **Graceful degradation:** Continue if some feeds fail

**Implementation:** `src/lib/feed-loader.ts:36`

### 5. Client-Side Filtering (Not Build-Time)

**Decision:** JavaScript filters in browser, not pre-rendered pages

**Rationale:**
- **UX:** Instant filtering (<10ms) vs page reload
- **Build complexity:** Avoid generating 160+ filtered pages
- **Bundle size:** Data attributes add minimal overhead
- **Progressive enhancement:** Works without JS (shows all)

**Implementation:** `src/components/FilterBar.astro`

### 6. Offline-Capable Search

**Decision:** Pagefind for build-time search indexing

**Rationale:**
- **No backend:** Static search, no API server
- **Offline:** Works without internet after first load
- **Fast:** <50ms query execution
- **Small:** ~50KB gzipped index

**Alternative considered:** Algolia (rejected: requires account, API calls)

## Performance Characteristics

### Build Performance
- **Total time:** 10-15 seconds
- **Landscape fetch:** 0.5-1s (2.8MB download)
- **Feed fetching:** 8-10s (231 parallel requests)
- **Astro rendering:** 2-3s
- **Pagefind indexing:** 2s
- **Output size:** 2-3MB (600+ releases)

### Runtime Performance
- **First Contentful Paint:** <1s
- **Time to Interactive:** <2s
- **Search response:** <50ms
- **Filter execution:** <10ms
- **Lighthouse score:** 100/100/100/100

### Scalability Limits
- **Current:** 231 feeds, 600+ releases
- **Theoretical max:** ~1000 feeds before build time >60s
- **Mitigation:** HTTP caching (ETags) if needed

## Related Documentation

- `DATAFLOW.md` - Detailed data pipeline flow
- `LANDSCAPE-SOURCE-OF-TRUTH.md` - Why Landscape is authoritative
- `BUILD-CACHING-STRATEGY.md` - Performance trade-offs
- `STACK.md` - Technology choices
- `STRUCTURE.md` - Code organization
- `FEATURES.md` - User-facing capabilities
- `DEPLOYMENT.md` - Build and release process

## Key Takeaways

1. **Build-time SSG** - All data processing at build, runtime is static
2. **Content Layer API** - Astro v5 feature enables custom data sources
3. **Landscape as truth** - NO hardcoded metadata, always fresh from CNCF
4. **Parallel fetching** - 231 feeds in 8-10s (not sequential)
5. **Graceful degradation** - Build succeeds if >50% feeds load
6. **Progressive enhancement** - Works without JS, better with JS
7. **Zero backend** - Static hosting, offline-capable search

---

**Authored by:** AI Assistant (OpenCode/Claude Sonnet 4.5)  
**Issue:** firehose-hdj - Write ARCHITECTURE.md  
**Date:** February 2, 2026
