# CNCF Landscape as Single Source of Truth

**Status:** Critical architectural principle  
**Priority:** P0 - Must be understood before working on architecture docs  
**Last Updated:** February 2, 2026

## Overview

The CNCF Landscape (`landscape.cncf.io`) is **the authoritative, canonical source** for all CNCF project metadata in The Firehose. This is a **fundamental architectural decision** that ensures data accuracy, eliminates hardcoded values, and enables automatic adaptation to CNCF ecosystem changes.

## Why Landscape is Authoritative

The CNCF Landscape is maintained by the Cloud Native Computing Foundation as the official registry of:

1. **Official project count** - 240 CNCF projects as of February 2026
2. **Project maturity status** - Graduated, Incubating, Sandbox classifications
3. **Project metadata** - Canonical names, descriptions, repo URLs
4. **Project categorization** - Grouping by function (orchestration, databases, observability, etc.)
5. **Project relationships** - Dependencies, integrations, ecosystem context
6. **Logo assets** - Official project logos from `cncf/artwork` repository

**Key principle:** The Firehose NEVER hardcodes project counts, names, or status. All metadata is fetched fresh from Landscape at build time.

## Implementation: `src/lib/landscape.ts`

### Fetch Process

```typescript
// Fetches landscape.yml from cncf/landscape repository
const LANDSCAPE_URL = 'https://raw.githubusercontent.com/cncf/landscape/master/landscape.yml';

export async function fetchLandscapeData(): Promise<LandscapeData> {
  const response = await fetch(LANDSCAPE_URL);
  const yamlText = await response.text();
  const parsed = yaml.load(yamlText);
  return parseLandscapeYaml(parsed);
}
```

**Location:** `src/lib/landscape.ts:10-31`

### Data Structure

Landscape YAML structure:
```yaml
landscape:
  - name: "App Definition and Development"
    subcategories:
      - name: "Application Definition & Image Build"
        items:
          - name: "Kubernetes"
            project: graduated
            repo_url: https://github.com/kubernetes/kubernetes
            homepage_url: https://kubernetes.io
            extra:
              summary_use_case: "Production-Grade Container Orchestration"
```

### Parsing Logic

The loader parses this nested structure into a flat lookup map:

```typescript
// Key: org/repo slug (e.g., "kubernetes/kubernetes")
// Value: LandscapeProject with name, description, status, URLs
{
  "kubernetes/kubernetes": {
    name: "Kubernetes",
    description: "Production-Grade Container Orchestration",
    repo_url: "https://github.com/kubernetes/kubernetes",
    homepage_url: "https://kubernetes.io",
    project: "graduated"
  },
  // ... 867 total ecosystem projects
}
```

**Location:** `src/lib/landscape.ts:37-83`

### Feed Enrichment

When loading RSS feeds, the system:

1. Extracts `org/repo` slug from feed URL (e.g., `https://github.com/dapr/dapr/releases.atom` → `dapr/dapr`)
2. Looks up project in Landscape map
3. Enriches feed entries with metadata:
   - `projectName` - "Dapr" (NOT "dapr/dapr")
   - `projectDescription` - "Event-driven, portable runtime for building distributed applications"
   - `projectStatus` - "incubating"
   - `projectHomepage` - "https://dapr.io"

**Location:** `src/lib/feed-loader.ts:168-197`

## What Happens if Landscape is Unavailable

### Build-Time Failure

If Landscape fetch fails, **the build fails immediately**:

```typescript
// src/lib/landscape.ts:27-29
catch (error) {
  console.error('[Landscape] Error fetching landscape:', error);
  throw error; // Build stops here
}
```

**Rationale:** Running without Landscape data produces incorrect metadata. Better to fail fast than serve stale/wrong information.

### Error Scenarios

1. **Network failure** → Build fails, GitHub Actions retries on next run
2. **GitHub rate limiting** → Unlikely (uses unauthenticated raw.githubusercontent.com, high quota)
3. **YAML parse error** → Build fails with descriptive error
4. **Landscape structure change** → Parser may fail, requires code update

### No Fallback Data

**CRITICAL:** The Firehose does NOT maintain a cached/fallback copy of Landscape data. This is intentional:

- **Freshness guarantee** - Data is always current
- **No stale metadata** - Never shows outdated project names/status
- **Explicit failure** - Broken builds are better than incorrect data
- **Simple architecture** - No cache invalidation complexity

## How to Verify Correct Data is Being Used

### Build Logs

Check Astro build output for Landscape confirmation:

```
[Landscape] Fetching from: https://raw.githubusercontent.com/cncf/landscape/master/landscape.yml
[Landscape] Downloaded 2847392 bytes
[Landscape] Parsed 867 projects
```

**Expected count:** 867 ecosystem projects (includes CNCF + partner/member projects)

### Feed Matching

Check feed enrichment logs:

```
https://github.com/dapr/dapr/releases.atom: Matched to Dapr (incubating)
https://github.com/kubernetes/kubernetes/releases.atom: Matched to Kubernetes (graduated)
```

### Data Validation

Verify correct metadata in browser DevTools:

```html
<article data-project="Kubernetes" data-status="graduated">
  <h3>Kubernetes</h3>
  <p>Production-Grade Container Orchestration</p>
</article>
```

### Manual Verification

Compare against official sources:
- Visit `landscape.cncf.io`
- Check project maturity status
- Verify descriptions match
- Confirm logo URLs work

## Current System Statistics (Feb 2026)

**From landscape.cncf.io:**
- **240 CNCF projects** (official count from CNCF)
- **Graduated:** 33 projects
- **Incubating:** 52 projects  
- **Sandbox:** 155 projects

**The Firehose implementation:**
- **867 ecosystem projects parsed** (CNCF + partners + members)
- **160 CNCF projects tracked** (67% coverage of 240 total)
- **231 feed URLs** (some projects have multiple repos)
- **100% feed success rate** (as of v1.1)

**Coverage calculation:**
- 160 tracked / 240 total = 67% of all CNCF projects
- Remaining 80 projects either:
  - Don't use GitHub releases (different hosting)
  - Don't publish releases regularly
  - Use non-standard release mechanisms
  - Need manual configuration to add

## Automatic Adaptation to CNCF Changes

### Daily Builds

GitHub Actions runs daily at 6 AM UTC:

```yaml
# .github/workflows/update-feed.yaml:7-9
schedule:
  - cron: "0 6 * * *"
```

This ensures:
- **Fresh Landscape data** - Fetched from GitHub every day
- **New projects detected** - CNCF graduates/adds projects automatically show up
- **Status updates reflected** - Projects moving from sandbox → incubating → graduated
- **Metadata changes tracked** - Name changes, description updates, URL moves

### What Updates Automatically

✅ **Project maturity status** - Sandbox → Incubating → Graduated  
✅ **Project descriptions** - CNCF updates summary_use_case field  
✅ **Project names** - Canonical names from Landscape  
✅ **Project counts** - Total projects, status distribution  
✅ **Logo URLs** - Updates from cncf/artwork repository  

### What Requires Manual Updates

❌ **Feed URLs** - Must add to `src/config/feeds.ts` manually  
❌ **Feed URL changes** - If project moves repos, must update config  
❌ **Non-GitHub projects** - Custom integration needed  
❌ **Multi-repo projects** - Must explicitly list all repos  

## Go Port Implications

When porting to Go, **maintain this principle**:

1. **Fetch Landscape data at build time** - Never hardcode
2. **Fail fast if unavailable** - Don't serve stale data
3. **Parse fresh on every build** - Daily updates ensure accuracy
4. **Log statistics for verification** - Make it easy to spot issues
5. **Match feeds to projects by repo slug** - Same org/repo extraction logic

### Recommended Go Libraries

- `gopkg.in/yaml.v3` - YAML parsing
- Standard `net/http` - Fetch landscape.yml
- Same URL: `https://raw.githubusercontent.com/cncf/landscape/master/landscape.yml`

### Data Structure Considerations

```go
type LandscapeProject struct {
    Name        string  `json:"name"`
    Description string  `json:"description,omitempty"`
    RepoURL     string  `json:"repo_url"`
    HomepageURL string  `json:"homepage_url,omitempty"`
    Project     string  `json:"project,omitempty"` // graduated/incubating/sandbox
}

type LandscapeData map[string]LandscapeProject // key: org/repo slug
```

## Key Takeaways

1. **landscape.cncf.io is THE source of truth** - Not the feeds, not hardcoded config, not documentation
2. **240 total CNCF projects** - Official count as of Feb 2026 (fetched dynamically)
3. **Fetch fresh every build** - No caching, no staleness, explicit failures
4. **Build fails without Landscape** - Better than serving incorrect data
5. **Daily automated updates** - System adapts to CNCF changes automatically
6. **67% current coverage** - 160/240 projects tracked (good, can improve)

## Related Files

- `src/lib/landscape.ts` - Landscape fetch and parsing implementation
- `src/lib/feed-loader.ts` - Feed enrichment using Landscape data (lines 168-197)
- `src/lib/schemas.ts` - TypeScript types for LandscapeProject and LandscapeData
- `.github/workflows/update-feed.yaml` - Daily build schedule (line 8: cron)
- `src/config/feeds.ts` - Manual feed URL configuration (231 feeds)

## Architecture Doc Dependencies

This document is **foundational** for understanding:
- `ARCHITECTURE.md` - Build pipeline depends on Landscape fetch
- `DATAFLOW.md` - Feed enrichment step requires Landscape data
- `INTEGRATIONS.md` - Landscape API is primary external integration
- `FEATURES.md` - Project metadata (names, logos, status) comes from Landscape

**DO NOT write those docs without reading this one first.**

---

**Authored by:** AI Assistant (OpenCode/Claude Sonnet 4.5)  
**Issue:** firehose-dl2 - Document CNCF Landscape as single source of truth  
**Date:** February 2, 2026
