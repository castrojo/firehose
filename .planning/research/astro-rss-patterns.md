# RSS Aggregation Architecture Patterns in Astro

**Researched:** 2026-01-26  
**Confidence:** HIGH

## Executive Summary

Astro v5.0 introduced the **Content Layer API** with custom loaders, making it ideal for RSS feed aggregation. The recommended architecture uses:

1. **Custom loader** to fetch and parse RSS feeds at build time
2. **Content collections** to store and query aggregated feed data
3. **Build-time data fetching** with incremental updates via digests
4. **Static generation** for optimal performance

This approach avoids the brittleness of manual XML/YAML parsing and provides robust error handling, TypeScript safety, and scalability for ~100 feeds.

## Recommended Architecture

### High-Level Data Flow

```
Build Time:
  1. Custom RSS Loader (src/content.config.ts)
     └─> Fetch RSS feeds from GitHub releases
     └─> Parse with rss-parser library
     └─> Enrich with CNCF landscape.yml data
     └─> Store in content collection via DataStore API
  
  2. Astro Build Process
     └─> Generate static pages from collection data
     └─> Create chronological feed display
     └─> Generate filter/search indexes (Pagefind)

Runtime:
  - Static HTML served from GitHub Pages
  - Client-side filtering/search via Pagefind
  - No runtime data fetching required
```

### Component Architecture

```typescript
// src/content.config.ts - Collection Definition
const releases = defineCollection({
  loader: rssLoader({
    feeds: [
      'https://github.com/dapr/dapr/releases.atom',
      'https://github.com/kubernetes/kubernetes/releases.atom',
      // ... ~100 feeds
    ],
    landscapeUrl: 'https://raw.githubusercontent.com/cncf/landscape/master/landscape.yml',
  }),
  schema: z.object({
    title: z.string(),
    link: z.string().url(),
    pubDate: z.coerce.date(),
    description: z.string().optional(),
    project: z.string(), // from CNCF landscape
    projectDescription: z.string().optional(),
    feedUrl: z.string().url(),
    feedStatus: z.enum(['success', 'error']),
    errorMessage: z.string().optional(),
  }),
});
```

## Key Architectural Decisions

### 1. Use Content Collections (Not API Routes)

**Decision:** Store feed data in content collections, not fetch at runtime.

**Rationale:**
- **Performance:** Static generation beats runtime fetching
- **Reliability:** No dependency on external feeds at page load time
- **Type Safety:** Full TypeScript support for feed data
- **Query API:** Use `getCollection()` instead of manual data wrangling
- **Scalability:** Content Layer API designed for tens of thousands of entries

**Tradeoff:** Feeds only update on rebuild (acceptable for daily updates via GitHub Actions)

### 2. Custom Loader with Content Loader API

**Decision:** Build a custom RSS loader using Astro's Loader API.

**Rationale:**
- **Proper abstraction:** Loaders separate data fetching from presentation
- **Error handling:** Loader can catch/log feed failures without blocking build
- **Incremental updates:** Use `digest` field to only update changed entries
- **Caching:** Loader can use `meta` store for ETags, Last-Modified headers
- **Reusability:** Package loader for other projects or publish to npm

**Code Structure:**

```typescript
// src/loaders/rss-loader.ts
export function rssLoader(options: RSSLoaderOptions): Loader {
  return {
    name: 'rss-loader',
    async load({ store, logger, generateDigest, parseData, meta }) {
      // Fetch feeds in parallel
      const feedResults = await Promise.allSettled(
        options.feeds.map(url => fetchAndParseFeed(url))
      );
      
      // Enrich with landscape data
      const landscapeData = await fetchLandscapeData(options.landscapeUrl);
      
      // Store entries with error tracking
      for (const [index, result] of feedResults.entries()) {
        if (result.status === 'fulfilled') {
          for (const item of result.value.items) {
            const enrichedData = enrichWithLandscape(item, landscapeData);
            const digest = generateDigest(enrichedData);
            
            await store.set({
              id: `${slugify(result.value.feedTitle)}-${item.guid}`,
              data: await parseData({ id, data: enrichedData }),
              digest,
            });
          }
        } else {
          // Log error but don't fail build
          logger.error(`Feed ${options.feeds[index]} failed: ${result.reason}`);
          // Optionally store error state
          await store.set({
            id: `error-${index}`,
            data: { feedUrl: options.feeds[index], feedStatus: 'error', errorMessage: result.reason },
          });
        }
      }
    },
  };
}
```

### 3. Build-Time vs Runtime Data Fetching

**Decision:** Fetch all feed data at build time, not at runtime.

| Aspect | Build-Time (Recommended) | Runtime |
|--------|--------------------------|---------|
| Performance | Static HTML, instant load | Fetch delay on page load |
| Reliability | Survives feed outages | Fails if feed is down |
| Cost | Free (GitHub Actions) | Server/function costs |
| Freshness | Updated on build (daily) | Always current |
| Complexity | Simple deployment | Needs SSR/API routes |

**For this use case:** Daily updates are sufficient, build-time wins decisively.

### 4. Parallel Feed Fetching

**Decision:** Fetch all feeds in parallel with `Promise.allSettled()`.

**Rationale:**
- **Speed:** 100 feeds serially = 50+ seconds, parallel = 5-10 seconds
- **Resilience:** `allSettled` continues even if some feeds fail
- **Error tracking:** Can log which feeds failed without blocking others

```typescript
const results = await Promise.allSettled(
  feeds.map(async (feedUrl) => {
    try {
      const response = await fetch(feedUrl, { 
        signal: AbortSignal.timeout(10000) // 10s timeout
      });
      return await parser.parseURL(feedUrl);
    } catch (error) {
      return { feedUrl, error: error.message };
    }
  })
);
```

### 5. Incremental Updates with Digests

**Decision:** Use content digests to avoid re-parsing unchanged entries.

**Rationale:**
- **Build speed:** Only process changed entries on subsequent builds
- **Git diffs:** Smaller changes = cleaner git history
- **Bandwidth:** Don't re-fetch unchanged data (use ETags)

```typescript
const digest = generateDigest({
  title: item.title,
  pubDate: item.pubDate,
  content: item.content,
});

// Only updates if digest changed
store.set({ id, data, digest });
```

## Landscape Data Integration

### Strategy: Pre-fetch and Enrich

1. **Fetch landscape.yml once** at loader initialization
2. **Parse with js-yaml** (not manual regex parsing!)
3. **Create lookup map** by repo URL
4. **Enrich each feed item** with project metadata

```typescript
import yaml from 'js-yaml';

async function fetchLandscapeData(url: string) {
  const response = await fetch(url);
  const text = await response.text();
  const data = yaml.load(text) as LandscapeData;
  
  // Build fast lookup map
  const projectMap = new Map<string, Project>();
  for (const category of data.landscape) {
    for (const subcategory of category.subcategories) {
      for (const item of subcategory.items) {
        if (item.repo_url) {
          const repoKey = extractRepoKey(item.repo_url);
          projectMap.set(repoKey, {
            name: item.name,
            description: item.extra?.summary_use_case,
            homepage: item.homepage_url,
            project: item.project, // graduated, incubating, etc.
          });
        }
      }
    }
  }
  
  return projectMap;
}

function enrichWithLandscape(feedItem: RSSItem, landscape: Map<string, Project>) {
  const repoKey = extractRepoKeyFromFeedUrl(feedItem.link);
  const project = landscape.get(repoKey);
  
  return {
    ...feedItem,
    project: project?.name ?? 'Unknown Project',
    projectDescription: project?.description,
    projectHomepage: project?.homepage,
    projectStatus: project?.project,
  };
}
```

## Error Handling Strategy

### Principles

1. **Never fail the build** due to a single feed failure
2. **Log all errors** with context for debugging
3. **Track error state** in collection data
4. **Display errors** prominently in UI
5. **Retry with backoff** for transient failures

### Implementation Pattern

```typescript
async function fetchFeedWithRetry(url: string, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(15000),
        headers: {
          'User-Agent': 'Firehose/1.0 (https://castrojo.github.io/firehose/)',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.text();
    } catch (error) {
      if (attempt === maxRetries - 1) {
        throw error; // Last attempt, propagate error
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
    }
  }
}
```

### Error Display

Store error states in collection:

```typescript
schema: z.object({
  // ... other fields
  feedStatus: z.enum(['success', 'error', 'stale']),
  errorMessage: z.string().optional(),
  lastSuccessfulFetch: z.date().optional(),
  errorCount: z.number().default(0),
})
```

Display in UI:

```astro
---
const releases = await getCollection('releases');
const errors = releases.filter(r => r.data.feedStatus === 'error');
---

{errors.length > 0 && (
  <div class="alert alert-warning">
    <p>{errors.length} feed(s) failed to update:</p>
    <ul>
      {errors.map(e => (
        <li>
          <code>{e.data.feedUrl}</code>: {e.data.errorMessage}
        </li>
      ))}
    </ul>
  </div>
)}
```

## Scalability Considerations

### Current Scale: ~100 Feeds

**No special optimizations needed.** The Content Layer API handles this easily.

### Future Scale: 1000+ Feeds

If the project grows significantly:

1. **Sharding:** Split feeds into multiple collections (by category)
2. **Lazy loading:** Use dynamic imports for feed pages
3. **Parallel builds:** Use GitHub Actions matrix strategy
4. **CDN caching:** Cache landscape.yml fetch between builds
5. **Delta updates:** Only fetch feeds modified since last build (use ETags)

### Build Time Optimization

Current architecture should build in ~30-60 seconds for 100 feeds:

- **Parallel fetching:** 5-10s for feed data
- **Landscape data:** ~2s (cached between builds)
- **Parsing & enrichment:** ~5-10s
- **Astro build:** ~10-20s

To optimize further:
- Cache parsed landscape data in `meta` store
- Use HTTP conditional requests (ETags, If-Modified-Since)
- Implement feed-level incremental updates

## Testing Strategy

### Local Development

```bash
# Test loader with single feed
npm run astro dev

# Test with all feeds
npm run build

# Test with intentionally broken feed URL
# (should log error, not fail build)
```

### Integration Testing

```typescript
// tests/rss-loader.test.ts
import { describe, it, expect } from 'vitest';
import { rssLoader } from '../src/loaders/rss-loader';

describe('RSS Loader', () => {
  it('should handle feed fetch failures gracefully', async () => {
    const loader = rssLoader({
      feeds: ['https://invalid.example.com/feed.xml'],
      landscapeUrl: 'https://valid.url/landscape.yml',
    });
    
    const mockContext = createMockLoaderContext();
    await loader.load(mockContext);
    
    // Should not throw
    expect(mockContext.logger.error).toHaveBeenCalled();
  });
  
  it('should enrich entries with landscape data', async () => {
    // Test data enrichment logic
  });
});
```

## Comparison: Content Collections vs Alternatives

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Content Collections + Loader** (Recommended) | Type-safe, cacheable, scalable, error-resilient | Requires understanding Loader API | ✅ **Best choice** |
| API Routes | Flexible, familiar pattern | Slower, requires SSR, harder to cache | ❌ Not suitable |
| `getStaticPaths` + fetch | Simple for small scale | Doesn't scale, no caching, brittle | ❌ Not suitable |
| Middleware | Runtime flexibility | Performance overhead, complex | ❌ Not suitable |

## Migration Path from Osmosfeed

### Current State Analysis

The existing prototype uses:
- `osmosfeed.yaml` to define feeds
- `osmosfeed` library to fetch/parse at build time
- Manual HTML extraction with regex
- Manual YAML parsing with regex
- Client-side JavaScript to inject data

### Migration Steps

1. **Replace osmosfeed with custom loader** (new functionality)
2. **Replace manual YAML parsing with js-yaml** (reliability)
3. **Replace manual HTML extraction with rss-parser** (reliability)
4. **Replace client-side injection with static generation** (performance)
5. **Add error handling** (new functionality)
6. **Add filtering/search with Pagefind** (new functionality)

### Key Improvements

| Aspect | Before (Osmosfeed) | After (Content Collections) |
|--------|-------------------|----------------------------|
| Feed parsing | Osmosfeed (opaque) | rss-parser (configurable) |
| Landscape parsing | Regex (brittle) | js-yaml (robust) |
| Error handling | Silent failures | Explicit tracking & display |
| Type safety | None | Full TypeScript support |
| Data access | Manual JSON wrangling | `getCollection()` API |
| Extensibility | Limited | Fully extensible loader |

## References

- **Astro Content Collections:** https://docs.astro.build/en/guides/content-collections/
- **Content Loader API:** https://docs.astro.build/en/reference/content-loader-reference/
- **RSS Parser Library:** https://www.npmjs.com/package/rss-parser
- **js-yaml Library:** https://www.npmjs.com/package/js-yaml
- **Confidence Level:** HIGH (based on official Astro v5 documentation)
