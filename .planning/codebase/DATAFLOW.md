# Data Flow Pipeline

**System:** The Firehose - CNCF Release Aggregator  
**Flow Type:** Build-time data processing (not runtime)  
**Last Updated:** February 2, 2026

## Overview

The Firehose processes data entirely at **build time** (not runtime). User requests serve pre-rendered static HTML with no API calls. This document traces data flow from raw feeds to deployed HTML.

## Complete Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    STEP 1: TRIGGER BUILD                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Triggers:                                                        │
│  • Daily cron (0 6 * * * UTC) - Automated                        │
│  • Push to main branch - On code changes                          │
│  • Manual workflow_dispatch - On demand                           │
│                                                                   │
│  Source: .github/workflows/update-feed.yaml                       │
│                                                                   │
└───────────────────────────────┬──────────────────────────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│            STEP 2: FETCH LANDSCAPE DATA (SOURCE OF TRUTH)         │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  URL: https://raw.githubusercontent.com/cncf/landscape/           │
│       master/landscape.yml                                        │
│                                                                   │
│  File: src/lib/landscape.ts:fetchLandscapeData()                 │
│                                                                   │
│  Input: None (fresh fetch every build)                           │
│  Output: LandscapeData map { "org/repo": LandscapeProject }      │
│                                                                   │
│  Process:                                                         │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 1. HTTP GET landscape.yml (2.8MB)                          │  │
│  │ 2. Parse YAML with js-yaml                                 │  │
│  │ 3. Navigate: landscape → categories → subcategories        │  │
│  │               → items (projects)                            │  │
│  │ 4. Extract for each project:                               │  │
│  │    - name: "Kubernetes" (canonical CNCF name)              │  │
│  │    - description: "Production-Grade Container..."          │  │
│  │    - repo_url: "https://github.com/kubernetes/kubernetes"  │  │
│  │    - project: "graduated" (maturity status)                │  │
│  │    - homepage_url: "https://kubernetes.io"                 │  │
│  │ 5. Create lookup map keyed by org/repo slug                │  │
│  │    Example: "kubernetes/kubernetes" → project object       │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  Result: 867 ecosystem projects indexed                          │
│  Duration: ~0.5-1 second                                          │
│                                                                   │
└───────────────────────────────┬──────────────────────────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│              STEP 3: FETCH RSS/ATOM FEEDS (PARALLEL)             │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  File: src/lib/feed-loader.ts:fetchSingleFeed()                  │
│                                                                   │
│  Input: 231 feed URLs from src/config/feeds.ts                   │
│                                                                   │
│  Process:                                                         │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Promise.allSettled([                                       │  │
│  │   fetchFeed("github.com/kubernetes/kubernetes/..."),       │  │
│  │   fetchFeed("github.com/dapr/dapr/releases.atom"),         │  │
│  │   ... 229 more parallel requests                           │  │
│  │ ])                                                          │  │
│  │                                                             │  │
│  │ For each feed:                                             │  │
│  │   1. HTTP GET feed URL                                     │  │
│  │   2. Parse RSS/Atom with rss-parser                        │  │
│  │   3. Extract items (releases):                             │  │
│  │      - title: "v1.29.0"                                    │  │
│  │      - link: GitHub release URL                            │  │
│  │      - pubDate: "2024-02-01T12:00:00Z"                     │  │
│  │      - content: Release notes (markdown)                   │  │
│  │      - guid: Unique identifier                             │  │
│  │   4. Retry on transient errors (5xx, timeout) up to 3x     │  │
│  │   5. Fail fast on permanent errors (404, 403)              │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  Result: ~600 release entries (aggregate across 231 feeds)        │
│  Duration: ~8-10 seconds (parallel execution)                     │
│                                                                   │
│  Error Handling:                                                  │
│  • <50% failure rate → Continue build with partial data          │
│  • >50% failure rate → Fail build (catastrophic)                 │
│                                                                   │
└───────────────────────────────┬──────────────────────────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│        STEP 4: ENRICH ENTRIES WITH LANDSCAPE METADATA            │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  File: src/lib/feed-loader.ts:fetchSingleFeed() (lines 168-197)  │
│                                                                   │
│  Process for each feed entry:                                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 1. Extract org/repo from feed URL                          │  │
│  │    Input: "https://github.com/dapr/dapr/releases.atom"     │  │
│  │    Output: "dapr/dapr"                                      │  │
│  │                                                             │  │
│  │ 2. Look up project in Landscape map                        │  │
│  │    project = landscapeData["dapr/dapr"]                     │  │
│  │                                                             │  │
│  │ 3. If match found, add metadata to entry:                  │  │
│  │    entry.projectName = "Dapr"                              │  │
│  │    entry.projectDescription = "Event-driven, portable..."   │  │
│  │    entry.projectStatus = "incubating"                       │  │
│  │    entry.projectHomepage = "https://dapr.io"               │  │
│  │                                                             │  │
│  │ 4. If no match, use feed title as fallback:                │  │
│  │    entry.projectName = feed.title                          │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  Result: Enriched entries with canonical CNCF names/status       │
│                                                                   │
│  Why This Matters:                                                │
│  • Feed titles inconsistent ("dapr/dapr" vs "Dapr")              │
│  • Landscape provides canonical names ("Kubernetes")              │
│  • Status comes from CNCF (graduated/incubating/sandbox)         │
│  • Descriptions user-friendly (not just repo READMEs)            │
│                                                                   │
└───────────────────────────────┬──────────────────────────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│              STEP 5: VALIDATE WITH ZOD SCHEMAS                    │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  File: src/lib/feed-loader.ts (lines 60-76)                      │
│  Schema: src/lib/schemas.ts:FeedEntrySchema                      │
│                                                                   │
│  Process:                                                         │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ const validated = FeedEntrySchema.safeParse(entry);        │  │
│  │                                                             │  │
│  │ if (validated.success) {                                   │  │
│  │   // Entry is valid, proceed to storage                    │  │
│  │ } else {                                                    │  │
│  │   // Log validation error, skip entry                      │  │
│  │   logger.warn(`Invalid entry: ${error.message}`);          │  │
│  │ }                                                           │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  Validated Fields:                                                │
│  • title: string (required)                                       │
│  • link: string (required)                                        │
│  • feedUrl: string (required)                                     │
│  • pubDate: string (optional)                                     │
│  • content: string (optional, markdown)                           │
│  • projectName: string (optional, from Landscape)                 │
│  • projectDescription: string (optional, from Landscape)          │
│  • projectStatus: "graduated"|"incubating"|"sandbox" (optional)   │
│  • feedStatus: "success"|"error" (required)                       │
│                                                                   │
│  Why Validation:                                                  │
│  • Type safety (TypeScript inference)                             │
│  • Data integrity (reject malformed entries)                      │
│  • Runtime checking (catches feed format changes)                 │
│                                                                   │
└───────────────────────────────┬──────────────────────────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│          STEP 6: STORE IN CONTENT COLLECTION                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  File: src/lib/feed-loader.ts (lines 67-70)                      │
│                                                                   │
│  Process:                                                         │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ store.set({                                                 │  │
│  │   id: entry.guid || entry.link,  // Unique identifier      │  │
│  │   data: validatedEntry            // Enriched, validated    │  │
│  │ });                                                         │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  Storage: Astro Content Collection (in-memory during build)       │
│  Persistence: .astro/data-store.json (7.1MB, not committed)       │
│                                                                   │
│  Result: ~600 releases stored, queryable by Astro pages           │
│                                                                   │
└───────────────────────────────┬──────────────────────────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│            STEP 7: RENDER STATIC HTML (ASTRO SSG)                │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  File: src/pages/index.astro                                      │
│                                                                   │
│  Process:                                                         │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 1. Query releases collection:                               │  │
│  │    const releases = await getCollection("releases");        │  │
│  │                                                             │  │
│  │ 2. Sort by date (newest first):                            │  │
│  │    releases.sort((a,b) => new Date(b.pubDate) - ...)       │  │
│  │                                                             │  │
│  │ 3. Loop through entries, render components:                │  │
│  │    {releases.map(release => (                              │  │
│  │      <ReleaseCard                                           │  │
│  │        title={release.title}                                │  │
│  │        link={release.link}                                  │  │
│  │        content={release.content}                            │  │
│  │        projectName={release.projectName}                    │  │
│  │        ...                                                  │  │
│  │      />                                                     │  │
│  │    ))}                                                      │  │
│  │                                                             │  │
│  │ 4. Add data attributes for client-side filtering:          │  │
│  │    data-project="Kubernetes"                                │  │
│  │    data-status="graduated"                                  │  │
│  │    data-date="2024-02-01"                                   │  │
│  │                                                             │  │
│  │ 5. Inject Pagefind search UI placeholder                   │  │
│  │ 6. Add client-side scripts (filters, keyboard nav)         │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  Output: dist/index.html (~50KB gzipped with 600+ releases)       │
│  Duration: ~2-3 seconds                                            │
│                                                                   │
└───────────────────────────────┬──────────────────────────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│              STEP 8: GENERATE SEARCH INDEX (PAGEFIND)            │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Command: pagefind --site dist                                    │
│  Runs after: astro build                                          │
│                                                                   │
│  Process:                                                         │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 1. Crawl all HTML files in dist/                           │  │
│  │ 2. Extract text content from elements                      │  │
│  │ 3. Tokenize and create inverted index                      │  │
│  │ 4. Generate pagefind.js bundle (~50KB gzipped)             │  │
│  │ 5. Output to dist/pagefind/                                │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  Result: Offline-capable search index                             │
│  Duration: ~2 seconds                                              │
│                                                                   │
└───────────────────────────────┬──────────────────────────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│               STEP 9: DEPLOY TO GITHUB PAGES                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  File: .github/workflows/update-feed.yaml (deploy job)           │
│                                                                   │
│  Process:                                                         │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 1. Upload dist/ as artifact                                │  │
│  │ 2. Deploy to gh-pages branch                               │  │
│  │ 3. GitHub Pages CDN serves content                         │  │
│  │ 4. Available at: castrojo.github.io/firehose               │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  Result: Static site live on CDN                                  │
│  Duration: ~30-60 seconds (GitHub Pages propagation)              │
│                                                                   │
└───────────────────────────────┬──────────────────────────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                 RUNTIME: USER VISITS SITE                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  User opens: https://castrojo.github.io/firehose                 │
│                                                                   │
│  What Happens:                                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 1. Browser requests index.html from GitHub Pages CDN       │  │
│  │ 2. CDN serves pre-rendered HTML (cached at edge)           │  │
│  │ 3. Page renders instantly (no API calls)                   │  │
│  │ 4. All 600+ releases visible immediately                   │  │
│  │                                                             │  │
│  │ Client-Side Enhancements (Progressive):                    │  │
│  │ • Search: Loads pagefind.js on first use                   │  │
│  │ • Filters: JavaScript reads data-* attributes              │  │
│  │ • Keyboard nav: Attaches event listeners                   │  │
│  │ • Dark mode: Reads LocalStorage, applies theme             │  │
│  │ • Infinite scroll: Intersection Observer watches scroll    │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  NO BACKEND CALLS - Everything is static HTML + client JS        │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

## Data Transformations

### Feed Entry Evolution

**1. Raw RSS XML:**
```xml
<item>
  <title>v1.29.0</title>
  <link>https://github.com/kubernetes/kubernetes/releases/tag/v1.29.0</link>
  <pubDate>Thu, 01 Feb 2024 12:00:00 GMT</pubDate>
  <description>Release notes for Kubernetes v1.29.0...</description>
</item>
```

**2. After RSS Parsing (`rss-parser`):**
```javascript
{
  title: "v1.29.0",
  link: "https://github.com/kubernetes/kubernetes/releases/tag/v1.29.0",
  pubDate: "Thu, 01 Feb 2024 12:00:00 GMT",
  content: "Release notes for Kubernetes v1.29.0...",
  isoDate: "2024-02-01T12:00:00.000Z",
  guid: "tag:github.com,2024:/kubernetes/kubernetes/releases/v1.29.0"
}
```

**3. After Landscape Enrichment:**
```javascript
{
  // Original fields
  title: "v1.29.0",
  link: "https://github.com/kubernetes/kubernetes/releases/tag/v1.29.0",
  pubDate: "Thu, 01 Feb 2024 12:00:00 GMT",
  content: "Release notes...",
  
  // Added from Landscape
  projectName: "Kubernetes",  // NOT "kubernetes/kubernetes"
  projectDescription: "Production-Grade Container Orchestration",
  projectStatus: "graduated",
  projectHomepage: "https://kubernetes.io",
  
  // Feed metadata
  feedUrl: "https://github.com/kubernetes/kubernetes/releases.atom",
  feedTitle: "Release notes from kubernetes/kubernetes"
}
```

**4. After Validation & Storage (Astro Content Collection):**
```javascript
{
  id: "tag:github.com,2024:/kubernetes/kubernetes/releases/v1.29.0",
  data: {
    // All fields above, validated with FeedEntrySchema
    feedStatus: "success",
    fetchedAt: "2024-02-02T06:00:00.000Z"
  }
}
```

**5. In Rendered HTML:**
```html
<article 
  class="release-card"
  data-project="Kubernetes"
  data-status="graduated"
  data-date="2024-02-01"
>
  <header>
    <img src="/logos/kubernetes.svg" alt="Kubernetes">
    <h2>Kubernetes</h2>
    <p>Production-Grade Container Orchestration</p>
  </header>
  <h3>v1.29.0</h3>
  <time datetime="2024-02-01T12:00:00.000Z">Feb 1, 2024</time>
  <div class="release-content">
    <!-- Markdown rendered to HTML -->
    Release notes for Kubernetes v1.29.0...
  </div>
  <a href="https://github.com/..." target="_blank">View Release</a>
</article>
```

## Performance Characteristics

### Build Pipeline Timing

| Step | Duration | Bottleneck |
|------|----------|------------|
| 1. Trigger | Instant | - |
| 2. Landscape fetch | 0.5-1s | Network I/O |
| 3. Feed fetching | 8-10s | Network I/O (parallel) |
| 4. Enrichment | <0.1s | CPU (map lookup) |
| 5. Validation | <0.5s | CPU (Zod parsing) |
| 6. Storage | <0.1s | Memory write |
| 7. Rendering | 2-3s | CPU (Astro SSG) |
| 8. Search indexing | 2s | CPU (Pagefind) |
| 9. Deployment | 30-60s | GitHub Pages |
| **Total** | **10-15s** | **Feed fetching** |

**Optimization Potential:** HTTP caching (ETags) could reduce feed fetching to 5-7s, but not currently needed (see BUILD-CACHING-STRATEGY.md)

### Data Volume

| Stage | Size | Count |
|-------|------|-------|
| Landscape YAML | 2.8MB | 867 projects |
| RSS feeds (aggregate) | ~5-10MB | 231 feeds |
| Release entries (parsed) | ~15-20MB | 600+ releases |
| Astro data store | 7.1MB | 600+ entries |
| Static HTML output | 2-3MB (gzipped: ~300KB) | 1 page + 1 RSS feed |
| Pagefind index | ~200KB (gzipped: ~50KB) | Full-text index |
| **Total deployed** | **~2.5-3MB** | **Ready for CDN** |

## Error Handling in Data Flow

### Landscape Fetch Failure

**Location:** `src/lib/landscape.ts:27-29`

**Behavior:**
```javascript
catch (error) {
  console.error('[Landscape] Error fetching landscape:', error);
  throw error;  // Build fails immediately
}
```

**Impact:** Entire build fails, no deployment  
**Rationale:** Better to fail than serve incorrect metadata  
**Recovery:** GitHub Actions retry on next scheduled run (daily)

### Feed Fetch Failure

**Location:** `src/lib/feed-loader.ts:79-102`

**Behavior:**
```javascript
// Promise.allSettled catches individual failures
if (result.status === 'rejected') {
  const { feedUrl, error } = result.reason;
  errorCount++;
  logger.error(`${feedUrl}: ${error.message}`);
}

// Check catastrophic failure threshold
if (errorCount / sources.length > 0.5) {
  throw new Error('Build failed: >50% feeds failed');
}
```

**Impact:** 
- <50% failure → Build succeeds with partial data
- >50% failure → Build fails, no deployment

**Rationale:** Graceful degradation, show what we can

### Validation Failure

**Location:** `src/lib/feed-loader.ts:74`

**Behavior:**
```javascript
const validated = FeedEntrySchema.safeParse(entry);
if (validated.success) {
  // Store entry
} else {
  logger.warn(`Invalid entry: ${validated.error}`);
  // Skip entry, continue processing
}
```

**Impact:** Invalid entry skipped, others proceed  
**Rationale:** One bad entry shouldn't break entire feed

## Automatic Adaptation to CNCF Changes

### Scenario: CNCF Adds New Project

**What happens:**
1. CNCF adds new project to landscape.yml
2. Next daily build (6 AM UTC) fetches latest Landscape
3. New project appears in 867 parsed projects
4. If project has GitHub releases, can be added to feeds.ts
5. Once added, project releases automatically show up

**Manual step:** Add feed URL to `src/config/feeds.ts`

**Example:**
```typescript
// Someone adds new CNCF sandbox project "projectX"
export const sandboxFeeds = [
  // ... existing feeds
  { url: 'https://github.com/cncf/projectX/releases.atom' },
];
```

**Next build:** projectX releases appear with canonical metadata from Landscape

### Scenario: Project Graduates from Sandbox → Incubating

**What happens:**
1. CNCF updates project status in landscape.yml: `project: incubating`
2. Next daily build fetches latest Landscape
3. Feed enrichment picks up new status
4. Release cards show "incubating" badge instead of "sandbox"

**Manual step:** None! Completely automatic

### Scenario: Project Changes Name or Description

**What happens:**
1. CNCF updates metadata in landscape.yml
2. Next daily build fetches latest Landscape
3. New name/description applied to future releases

**Manual step:** None! Always uses latest from Landscape

## Client-Side Data Flow (Runtime)

### Search Query Flow

```
User types "kubernetes" in search box
  ↓
JavaScript event listener fires
  ↓
Pagefind UI loads pagefind.js (if not already loaded)
  ↓
Query sent to local search index (no network)
  ↓
Inverted index lookup (<50ms)
  ↓
Matching entries returned with highlights
  ↓
Results rendered in UI
```

**No server involved** - All happens in browser

### Filter Application Flow

```
User selects "graduated" in status filter
  ↓
JavaScript change event fires
  ↓
Loop through all .release-card elements
  ↓
Read data-status attribute on each card
  ↓
If data-status !== "graduated":
  card.style.display = "none"
Else:
  card.style.display = "block"
  ↓
Filtering complete (<10ms for 600+ cards)
```

**No API calls** - Data attributes set at build time

## Related Documentation

- `ARCHITECTURE.md` - Architectural layers and design decisions
- `LANDSCAPE-SOURCE-OF-TRUTH.md` - Why Landscape is authoritative
- `BUILD-CACHING-STRATEGY.md` - Performance trade-offs
- `STRUCTURE.md` - Code that implements this flow
- `INTEGRATIONS.md` - External services (Landscape, GitHub)
- `DEPLOYMENT.md` - Build and release process

## Key Takeaways

1. **All data processing at build time** - Runtime serves static HTML
2. **Landscape first** - Metadata fetched before feeds
3. **Parallel feed fetching** - 231 requests simultaneous
4. **Enrichment with Landscape** - Canonical names from CNCF
5. **Graceful degradation** - Build succeeds if >50% feeds load
6. **No caching** - Fresh data every build (intentional)
7. **Client-side enhancement** - Search/filters work without server

---

**Authored by:** AI Assistant (OpenCode/Claude Sonnet 4.5)  
**Issue:** firehose-yb4 - Write DATAFLOW.md  
**Date:** February 2, 2026
