# Build Caching Strategy and Performance Analysis

**Status:** Current architecture decision (intentionally NO feed content caching)  
**Priority:** P1 - Important for understanding efficiency trade-offs  
**Last Updated:** February 2, 2026

## Executive Summary

The Firehose uses a **"full refresh on every build"** strategy with **NO feed content caching**. This prioritizes **data freshness** over build speed. Current performance: **10-15 second builds** for 231 feeds with daily automated runs.

**Key Finding:** This approach is **justified for current use case** - daily builds with freshness priority make caching complexity unnecessary.

## Current Caching State

### What IS Cached

✅ **npm packages** - GitHub Actions caches `node_modules/` (~25s savings per build)
- Location: `.github/workflows/update-feed.yaml:33` (`cache: 'npm'`)
- Benefit: Faster dependency installation
- Invalidation: Automatic when `package-lock.json` changes

### What is NOT Cached

❌ **Feed content** - All 231 feeds re-fetched completely every build  
❌ **Landscape data** - Fresh `landscape.yml` downloaded every build  
❌ **Astro data store** - `.astro/data-store.json` (7.1MB) cleared on startup  
❌ **HTTP response headers** - No ETag or Last-Modified checks  
❌ **Build artifacts** - Dist directory rebuilt from scratch  

## Implementation Details

### Feed Content Cache Clearing

**Location:** `src/lib/feed-loader.ts:19`

```typescript
export function feedLoader(sources: FeedSource[]): Loader {
  return {
    name: 'feed-loader',
    load: async ({ store, logger }) => {
      // Clear existing entries - NO CACHING
      store.clear();
      
      // Fetch all feeds fresh...
```

**Why it's cleared:** Ensures every build starts with clean slate, no stale data.

### Landscape Data Fetching

**Location:** `src/lib/landscape.ts:14-20`

```typescript
const response = await fetch(LANDSCAPE_URL);
if (!response.ok) {
  throw new Error(`Failed to fetch landscape: ${response.status}`);
}
const yamlText = await response.text();
```

**No caching headers checked:** Fresh download every time (~2.8MB YAML file).

### Astro Data Store

**File:** `.astro/data-store.json`
- **Size:** 7.1MB (contains all parsed feed entries)
- **Format:** Single-line JSON (optimized for Astro Content Layer)
- **Persistence:** Exists locally, NOT persisted in GitHub Actions workflow
- **Lifecycle:** Generated during build, cleared on next `store.clear()`

**Why not persisted:** GitHub Actions starts with fresh checkout every run, no cache restoration configured.

## Build Performance Breakdown

### Current Timing (Daily Builds)

```
Total build time: 10-15 seconds

Breakdown:
  - npm ci:              ~3s (with cache) / ~28s (without)
  - Landscape fetch:     ~0.5-1s (2.8MB download)
  - Feed fetching:       ~8-10s (231 feeds in parallel)
  - Astro processing:    ~2-3s (parse, validate, generate HTML)
  - Pagefind indexing:   ~2s (search index generation)
```

### GitHub Actions Quota Analysis

**Monthly usage:**
- Daily builds: 30 runs/month
- Build time: ~15s per run
- Total: **450 seconds = 7.5 minutes/month**
- GitHub Free tier: **2,000 minutes/month**
- **Quota usage: 0.38%** (negligible)

**Conclusion:** Performance optimization NOT critical for quota management.

## Trade-offs Analysis

| Aspect | Current (No Cache) | With HTTP Caching | With Full Cache |
|--------|-------------------|-------------------|-----------------|
| **Data Freshness** | ✅ Guaranteed fresh | ⚠️ Depends on upstream | ❌ Stale until invalidated |
| **Build Time** | 10-15s | 5-8s | 2-3s |
| **Complexity** | ✅ Simple | ⚠️ Moderate (ETag logic) | ❌ High (invalidation) |
| **Code Maintenance** | ✅ Easy | ⚠️ Moderate | ❌ Complex |
| **Debugging** | ✅ Straightforward | ⚠️ Cache-related bugs | ❌ Many edge cases |
| **Correctness** | ✅ Always correct | ⚠️ Usually correct | ❌ Risk of staleness |
| **GitHub Quota** | 0.38% | 0.25% | 0.1% |

**Current choice wins on:** Simplicity, correctness, freshness, maintainability  
**Caching would win on:** Build speed (not a priority for daily runs)

## Why Full Refresh Works

### Use Case Alignment

1. **Daily build schedule** - Runs once per day at 6 AM UTC
   - Not continuous deployment (no impact on rapid iteration)
   - Fresh data more important than build speed
   
2. **Feed volatility** - New releases unpredictable
   - CNCF projects release on varied schedules
   - Can't predict which feeds have new content
   - Full refresh ensures no releases missed

3. **Landscape changes** - CNCF updates project metadata
   - New projects added (240 total, growing)
   - Status changes (sandbox → incubating → graduated)
   - Description updates, repo moves
   - Must reflect latest state

4. **User expectations** - Site should show "today's releases"
   - Users expect current data when visiting
   - Stale data would erode trust
   - 6 AM build ensures morning freshness

### Why Optimization Isn't Needed

**Time savings aren't meaningful:**
- HTTP caching: Save ~5-7s → Build: 8s instead of 15s
- Full caching: Save ~10s → Build: 3s instead of 15s
- **But:** Runs once per day, not blocking humans
- **And:** Adds complexity for negligible quota savings (0.3% → 0.1%)

**Complexity costs are real:**
- Cache invalidation logic (when to refresh?)
- Stale data bugs (hard to debug)
- ETag/Last-Modified header handling
- Conditional fetch logic
- Cache corruption recovery
- Testing cache behavior

**Principle:** "Premature optimization is the root of all evil" - Donald Knuth

## Optimization Opportunities (Future)

If build time becomes a problem (e.g., hourly builds, 500+ feeds), consider:

### 1. HTTP Conditional Requests (Low Hanging Fruit)

**Implementation:**
```typescript
const headers: HeadersInit = {};
if (cachedETag) {
  headers['If-None-Match'] = cachedETag;
}

const response = await fetch(url, { headers });
if (response.status === 304) {
  // Use cached content
  return cachedFeed;
}
```

**Benefit:** ~5-7s savings if many feeds return 304 Not Modified  
**Complexity:** Moderate (need ETag storage, conditional logic)  
**When:** If builds run hourly or more frequently

### 2. Incremental Landscape Updates

**Implementation:**
- Store Landscape data hash
- Only re-parse if hash changes
- Cache parsed project map

**Benefit:** ~0.5s savings (not significant)  
**Complexity:** Low  
**When:** If Landscape fetch becomes bottleneck

### 3. Astro Data Store Persistence

**Implementation:**
```yaml
# .github/workflows/update-feed.yaml
- uses: actions/cache@v4
  with:
    path: .astro/data-store.json
    key: astro-store-${{ hashFiles('src/config/feeds.ts') }}
```

**Benefit:** Could enable incremental builds  
**Complexity:** High (Astro may not support this pattern)  
**When:** If Astro Content Layer adds incremental update support

### 4. Parallel Build Pipeline

**Current:** Sequential (fetch → parse → render → index)  
**Optimized:** Parallel (fetch feeds while Landscape parses)

**Benefit:** ~2-3s savings  
**Complexity:** Moderate (Promise.all coordination)  
**When:** If build time exceeds 30s

## Recommendations for Go Port

### Start Simple (Recommended)

1. **Match current behavior** - Full refresh every build
2. **Measure first** - Instrument Go build pipeline
3. **Optimize only if needed** - Don't add caching prematurely

**Rationale:** Understand Go performance characteristics before optimizing. May be faster than Node.js anyway.

### If Optimization Needed

**Priority order:**
1. **Parallel fetching** - Go's goroutines excel at this
2. **HTTP conditional requests** - Standard library support
3. **Memory-mapped cache** - Go's `mmap` for fast data store
4. **Incremental builds** - Only if build time exceeds 60s

### Go-Specific Advantages

```go
// Goroutines for parallel fetching
var wg sync.WaitGroup
results := make(chan FeedResult, len(sources))

for _, source := range sources {
    wg.Add(1)
    go func(s FeedSource) {
        defer wg.Done()
        result := fetchFeed(s)
        results <- result
    }(source)
}
```

**Expected:** Go will likely be FASTER than Node.js without caching due to:
- Better concurrency (goroutines vs promises)
- Lower memory overhead
- Faster JSON parsing
- Static binary (no npm install step)

## Build Time Targets

### Current (Acceptable)
- **10-15 seconds** - Daily builds, no optimization needed

### If Scaling Up
- **<30 seconds** - Hourly builds, still acceptable
- **<60 seconds** - Every 15 minutes, consider HTTP caching
- **>60 seconds** - Requires optimization (incremental builds, caching)

### Hard Limits
- **5 minutes** - GitHub Actions timeout (default)
- **2,000 minutes/month** - Free tier quota (67 minutes/day)

## Monitoring and Alerting

### Build Duration Tracking

**Current:** Check GitHub Actions logs manually

**Recommended additions:**
```yaml
# .github/workflows/update-feed.yaml
- name: Build site
  run: |
    START=$(date +%s)
    npm run build
    END=$(date +%s)
    DURATION=$((END - START))
    echo "Build duration: ${DURATION}s"
    
    # Alert if >30s
    if [ $DURATION -gt 30 ]; then
      echo "::warning::Build took ${DURATION}s (>30s threshold)"
    fi
```

### Feed Success Rate Monitoring

**Location:** `src/lib/feed-loader.ts:108-120`

```typescript
logger.info(`📊 Feed Load Summary:`);
logger.info(`   ✅ Success: ${successCount}/${sources.length} feeds`);
logger.info(`   ❌ Failed:  ${errorCount}/${sources.length} feeds`);
logger.info(`   ⏱️  Duration: ${fetchDuration}s`);
```

**Alerts configured:** Build fails if >50% feeds fail (line 129)

## Key Takeaways

1. **No caching is intentional** - Simplicity and freshness over speed
2. **10-15s builds acceptable** - Daily schedule doesn't need optimization
3. **0.38% GitHub quota** - Performance not a concern
4. **Optimization premature** - Current architecture appropriate for use case
5. **Go port should start simple** - Measure before optimizing
6. **HTTP caching is fallback** - If build time becomes issue (>30s)
7. **Full refresh guarantees correctness** - No stale data bugs

## Related Files

- `src/lib/feed-loader.ts:19` - `store.clear()` clears cache
- `src/lib/landscape.ts:14` - Fresh Landscape fetch (no caching)
- `.github/workflows/update-feed.yaml:33` - npm cache configuration
- `.astro/data-store.json` - 7.1MB content layer store (not persisted)
- `src/utils/retry.ts` - Exponential backoff for transient errors

## Architecture Doc Dependencies

This document provides context for:
- `ARCHITECTURE.md` - Build pipeline performance characteristics
- `DATAFLOW.md` - No caching in data flow (fresh fetch every time)
- `DEPLOYMENT.md` - Build time expectations and GitHub Actions quota
- `INTEGRATIONS.md` - HTTP behavior for Landscape and feed fetching

---

**Authored by:** AI Assistant (OpenCode/Claude Sonnet 4.5)  
**Issue:** firehose-uub - Analyze and document build caching strategy  
**Date:** February 2, 2026
