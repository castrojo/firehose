# External Integrations

**System:** The Firehose - CNCF Release Aggregator  
**Integration Model:** Build-time data fetching (no runtime APIs)  
**Last Updated:** February 2, 2026

## Overview

The Firehose integrates with external services exclusively at **build time**. There are NO runtime API calls, NO authentication, NO database connections, and NO backend services. The entire application is a static site that pulls data during the GitHub Actions build process.

**Architecture Philosophy:**
- **Zero runtime dependencies** - All data fetched at build time
- **No authentication required** - All sources are public APIs
- **Fail-safe design** - Graceful degradation on partial failures
- **Automatic updates** - Daily scheduled builds fetch fresh data

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    BUILD TIME (GitHub Actions)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Integration 1: CNCF Landscape API (PRIMARY)                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Fetches: landscape.yml (2.8MB)                             │ │
│  │ Frequency: Every build (daily 6 AM UTC)                    │ │
│  │ Purpose: Single source of truth for project metadata      │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              ▼                                   │
│  Integration 2: GitHub Atom Feeds (231 feeds)                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Fetches: Release feeds from 160 CNCF projects             │ │
│  │ Frequency: Every build (daily 6 AM UTC)                    │ │
│  │ Purpose: Release data (titles, dates, content)            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              ▼                                   │
│  Integration 3: CNCF Artwork Repository                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Uses: Pre-downloaded logos in /public/logos                │ │
│  │ Frequency: Manual updates (as needed)                      │ │
│  │ Purpose: Project branding (SVG icons)                      │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              ▼                                   │
│  Integration 4: Pagefind (Build-time Search)                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Indexes: dist/ HTML files                                  │ │
│  │ Frequency: After astro build (every build)                │ │
│  │ Purpose: Static search index generation                    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              ▼                                   │
│  Integration 5: GitHub Pages (Deployment)                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Deploys: dist/ to gh-pages branch                          │ │
│  │ Frequency: After successful build                          │ │
│  │ Purpose: Static hosting with CDN                           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    RUNTIME (Browser)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  NO external integrations - Everything is static HTML            │
│  - Pagefind search runs locally (dist/pagefind/)                │
│  - Filters use data attributes (no API calls)                    │
│  - Logos served from public/ directory                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Integration 1: CNCF Landscape API

**Role:** PRIMARY source of truth for all project metadata  
**Source:** `https://github.com/cncf/landscape`  
**Implementation:** `src/lib/landscape.ts`

### What We Fetch

**URL:** `https://raw.githubusercontent.com/cncf/landscape/master/landscape.yml`  
**Size:** ~2.8MB (867 ecosystem projects)  
**Format:** YAML

**Structure:**
```yaml
landscape:
  - name: "App Definition and Development"
    subcategories:
      - name: "Application Definition & Image Build"
        items:
          - name: "Helm"
            repo_url: "https://github.com/helm/helm"
            homepage_url: "https://helm.sh"
            project: "graduated"  # Maturity status
            extra:
              summary_use_case: "Package manager for Kubernetes"
```

### How We Parse It

**File:** `src/lib/landscape.ts`

```typescript
// Line 10: Fetch function
export async function fetchLandscapeData(): Promise<LandscapeData> {
  const response = await fetch(LANDSCAPE_URL);
  const yamlText = await response.text();
  const parsed = yaml.load(yamlText);
  return parseLandscapeYaml(parsed);
}

// Line 37: Parsing logic
function parseLandscapeYaml(data: any): LandscapeData {
  const projectMap: LandscapeData = {};
  
  // Navigate: landscape → categories → subcategories → items
  for (const category of data.landscape) {
    for (const subcategory of category.subcategories) {
      for (const item of subcategory.items) {
        const project = parseProjectItem(item);
        const slug = extractRepoSlug(project.repo_url);
        if (slug) {
          projectMap[slug] = project;  // Key: "org/repo"
        }
      }
    }
  }
  
  return projectMap;
}
```

### What We Extract

For each project, we extract:

| Field | Example | Purpose |
|-------|---------|---------|
| `name` | "Kubernetes" | Canonical CNCF project name |
| `description` | "Production-Grade Container Orchestration" | User-friendly summary |
| `repo_url` | "https://github.com/kubernetes/kubernetes" | Source repository |
| `homepage_url` | "https://kubernetes.io" | Official project site |
| `project` | "graduated" | Maturity status (graduated/incubating/sandbox) |

**Result:** Lookup map of 867 projects indexed by `org/repo` slug

### Why This Is Critical

**Landscape is the SINGLE SOURCE OF TRUTH**

1. **NO hardcoded project counts** - Always uses latest from CNCF
2. **Canonical names** - "Kubernetes" not "kubernetes/kubernetes"  
3. **Automatic maturity tracking** - Project graduations update instantly
4. **Description consistency** - CNCF-approved summaries
5. **No manual synchronization** - Daily builds pull fresh data

**See:** `LANDSCAPE-SOURCE-OF-TRUTH.md` for detailed rationale

### Error Handling

**Strategy:** Fail fast (no fallback)

```typescript
// src/lib/landscape.ts:27-30
catch (error) {
  console.error('[Landscape] Error fetching landscape:', error);
  throw error;  // Build fails immediately
}
```

**Rationale:** Running without Landscape metadata produces incorrect data (wrong project names, missing status). Better to fail the build than deploy incorrect information.

**Recovery:** GitHub Actions will retry on next scheduled run (daily)

### Retry Strategy

**NO retries** - Landscape fetch must succeed or build fails

**Why no retry:**
- CNCF Landscape is highly available (>99.9% uptime)
- Transient errors are rare
- Build failures trigger automatic GitHub Actions retry
- We want fast failure feedback

## Integration 2: GitHub Atom Feeds

**Role:** Release data source  
**Count:** 231 feeds from 160 CNCF projects  
**Implementation:** `src/lib/feed-loader.ts`

### Feed Sources

**Configuration:** `src/config/feeds.ts` (268 lines)

**Example:**
```typescript
const feeds: FeedConfig[] = [
  // Graduated projects
  { url: 'https://github.com/kubernetes/kubernetes/releases.atom' },
  { url: 'https://github.com/helm/helm/releases.atom' },
  { url: 'https://github.com/prometheus/prometheus/releases.atom' },
  
  // Incubating projects
  { url: 'https://github.com/backstage/backstage/releases.atom' },
  { url: 'https://github.com/kyverno/kyverno/releases.atom' },
  
  // Sandbox projects (98 total)
  { url: 'https://github.com/k8sgpt-ai/k8sgpt/releases.atom' },
  // ... 228 more feeds
];
```

**Breakdown:**
- 35 Graduated projects
- 27 Incubating projects  
- 98 Sandbox projects
- Total: 231 feeds from 160 unique projects (some have multiple repos)

### Feed Format

**Standard GitHub Atom Feed:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Release notes from kubernetes/kubernetes</title>
  <link href="https://github.com/kubernetes/kubernetes/releases"/>
  
  <entry>
    <id>tag:github.com,2024:Repository/20580498/v1.29.0</id>
    <title>v1.29.0</title>
    <updated>2024-02-01T12:00:00Z</updated>
    <link href="https://github.com/kubernetes/kubernetes/releases/tag/v1.29.0"/>
    <content type="html">
      &lt;p&gt;Release notes for Kubernetes v1.29.0...&lt;/p&gt;
    </content>
  </entry>
  
  <!-- More entries... -->
</feed>
```

### How We Fetch Feeds

**File:** `src/lib/feed-loader.ts:36-40`

**Parallel fetching with Promise.allSettled:**
```typescript
const results = await Promise.allSettled(
  sources.map((source) =>
    fetchSingleFeed(source, parser, landscapeData, logger)
  )
);
```

**Why Promise.allSettled:**
- Fetches all 231 feeds in parallel (not sequential)
- One slow/failed feed doesn't block others
- Graceful degradation (show what we can)
- 8-10 seconds total vs 3-5 minutes sequential

### Feed Parsing

**Library:** `rss-parser` ^3.13.0

**Configuration:**
```typescript
// src/lib/feed-loader.ts:26-30
const parser = new Parser({
  customFields: {
    item: ['content:encoded'],  // GitHub uses this field
  },
});
```

**Extracted fields:**
```typescript
{
  title: "v1.29.0",
  link: "https://github.com/kubernetes/kubernetes/releases/tag/v1.29.0",
  pubDate: "Thu, 01 Feb 2024 12:00:00 GMT",
  isoDate: "2024-02-01T12:00:00.000Z",
  content: "<p>Release notes...</p>",
  contentSnippet: "Release notes...",  // Plain text
  guid: "tag:github.com,2024:Repository/20580498/v1.29.0"
}
```

### Feed Enrichment

**Process:** Match feed to Landscape project, add metadata

**File:** `src/lib/feed-loader.ts:168-197`

```typescript
// 1. Match feed URL to project
const project = matchFeedToProject(source.url, landscapeData);

// 2. Extract org/repo from feed URL
// "https://github.com/helm/helm/releases.atom" → "helm/helm"

// 3. Look up in Landscape map
// landscapeData["helm/helm"] → { name: "Helm", project: "graduated", ... }

// 4. Enrich entry
if (project) {
  entry.projectName = project.name;              // "Helm" (not "helm/helm")
  entry.projectDescription = project.description; // CNCF summary
  entry.projectStatus = project.project;         // "graduated"
  entry.projectHomepage = project.homepage_url;  // "https://helm.sh"
}
```

**Result:** Release entries have canonical CNCF project metadata attached

### Retry Logic

**Strategy:** Exponential backoff for transient errors

**Implementation:** `src/utils/retry.ts`

```typescript
await retryWithBackoff(
  () => parser.parseURL(source.url),
  {
    maxAttempts: 3,
    initialDelay: 1000,      // 1 second
    maxDelay: 10000,         // 10 seconds
    backoffMultiplier: 2,    // Double each time (1s, 2s, 4s)
  },
  source.url
);
```

**Retry decision tree:**

| Error Type | Status Code | Action |
|------------|-------------|--------|
| Network timeout | - | Retry (3x) |
| Connection reset | ECONNRESET | Retry (3x) |
| Server error | 500-599 | Retry (3x) |
| Rate limit | 429 | Retry (3x) |
| Not found | 404 | Fail fast (don't retry) |
| Forbidden | 403 | Fail fast (don't retry) |
| Client error | 400-499 | Fail fast (don't retry) |

**Rationale:**
- **Transient errors** (network glitches, temporary server issues) → Worth retrying
- **Permanent errors** (404, 403) → Don't waste time retrying

### Error Handling

**Strategy:** Graceful degradation with catastrophic failure threshold

**File:** `src/lib/feed-loader.ts:123-134`

```typescript
// Calculate failure rate
const failureRate = errorCount / sources.length;

// If >50% of feeds failed, fail the build
if (failureRate > 0.5) {
  throw new Error(
    `Build failed: ${errorCount}/${sources.length} feeds failed ` +
    `(${(failureRate * 100).toFixed(1)}%). ` +
    `This exceeds the 50% threshold.`
  );
}

// Otherwise, build succeeds with partial data
if (errorCount > 0 && errorCount <= sources.length * 0.5) {
  logger.info(`Build succeeds with partial data (${successCount}/${sources.length} feeds)`);
}
```

**Behavior:**

| Scenario | Action |
|----------|--------|
| 0 failures | Build succeeds, all releases shown |
| 1-50% failures | Build succeeds, partial data shown |
| >50% failures | Build fails, GitHub Actions retries |

**Why 50% threshold:**
- **Low failure rate** (1-20%) - Normal, shows available data
- **High failure rate** (>50%) - Likely systemic issue (GitHub down, network problem)
- **Catastrophic failure** - Better to retry than deploy incomplete data

### Performance Characteristics

**Timing:**
- **Single feed fetch:** 100-500ms (network latency)
- **Parallel fetch (231 feeds):** 8-10 seconds
- **Sequential fetch (231 feeds):** 3-5 minutes (NOT used)

**Data volume:**
- **Per feed:** 10-50KB (varies by release count)
- **Total (231 feeds):** 5-10MB aggregate
- **Parsed entries:** ~600 releases

**Build impact:** Feed fetching is the bottleneck (8-10s of 10-15s total build time)

## Integration 3: CNCF Artwork Repository

**Role:** Project logos and branding  
**Source:** `https://github.com/cncf/artwork`  
**Implementation:** `src/lib/logoMapper.ts`

### Logo Structure

**Local storage:** `/public/logos/` (copied from cncf/artwork)

**Directory structure:**
```
public/logos/
├── kubernetes/
│   ├── icon-color.svg    # Used in The Firehose
│   ├── horizontal-color.svg
│   └── stacked-color.svg
├── helm/
│   ├── icon-color.svg
│   └── ...
├── prometheus/
│   ├── icon-color.svg
│   └── ...
└── cncf-placeholder.svg  # Fallback for missing logos
```

**Format preference:** `icon-color.svg` (square, compact for cards)

### Logo Mapping

**File:** `src/lib/logoMapper.ts:5-34`

```typescript
export function getProjectLogo(projectName: string | undefined): string {
  const baseUrl = import.meta.env.BASE_URL || '/';  // "/firehose" for GitHub Pages
  
  if (!projectName) {
    return `${baseUrl}/logos/cncf-placeholder.svg`;
  }
  
  // Normalize: "Open Policy Agent" → "open-policy-agent"
  const normalized = projectName
    .toLowerCase()
    .replace(/\s+/g, '-')      // Spaces to hyphens
    .replace(/[()]/g, '')      // Remove parentheses
    .replace(/\./g, '');       // Remove dots
  
  // Special cases (project name doesn't match artwork directory)
  const specialCases: Record<string, string> = {
    'in-toto': 'in-toto',
    'open-policy-agent': 'opa',  // Directory is "opa" not "open-policy-agent"
    'the-update-framework': 'tuf',
  };
  
  const logoDir = specialCases[normalized] || normalized;
  return `${baseUrl}/logos/${logoDir}/icon-color.svg`;
}
```

### Update Process

**Manual process** (not automated):

1. Clone cncf/artwork repository
2. Copy project directories to `/public/logos/`
3. Test build to verify logos load
4. Commit and push

**Frequency:** As needed (when new projects added or logos updated)

**Why manual:**
- CNCF artwork changes infrequently
- Full artwork repo is ~500MB (too large to fetch every build)
- Logos are static assets (no need for daily updates)

### Missing Logo Fallback

**Default:** `cncf-placeholder.svg` (CNCF logo)

**Trigger:** Logo file not found or project name missing

**Implementation:** Line 12 in `logoMapper.ts`

## Integration 4: Pagefind (Build-Time Search)

**Role:** Static search index generation  
**Source:** `https://pagefind.app`  
**Version:** ^1.4.0 (devDependency)

### How It Works

**Build integration:** `package.json:8`

```json
{
  "scripts": {
    "build": "astro build && pagefind --site dist"
  }
}
```

**Process:**

1. `astro build` generates static HTML → `dist/`
2. `pagefind --site dist` runs after Astro completes
3. Pagefind crawls all HTML in `dist/`
4. Extracts text content from `<main>`, `<article>`, etc.
5. Creates inverted index (word → documents)
6. Generates `dist/pagefind/` directory:
   - `pagefind.js` - Search runtime (~50KB gzipped)
   - `fragment/...` - Index fragments
   - `index/...` - Metadata files

**Output:**
```
dist/pagefind/
├── pagefind.js
├── pagefind-entry.json
├── pagefind-ui.css
├── pagefind-ui.js
├── fragment/
│   └── en_[hash].pf_fragment
└── index/
    └── en_[hash].pf_index
```

### Runtime Behavior

**Client-side search:**

```javascript
// src/components/SearchBar.astro
<script>
  // Load Pagefind UI on page load
  const pagefind = await import('/pagefind/pagefind.js');
  await pagefind.options({ baseUrl: '/' });
  
  // Search query
  const results = await pagefind.search('kubernetes');
  // Returns: [{ id, url, excerpt, ... }]
</script>
```

**Performance:**
- **Index load:** <100ms (lazy loaded on first search)
- **Query execution:** <50ms (inverted index lookup)
- **Offline capability:** Works without network after first load

### Configuration

**Automatic** - Pagefind uses sensible defaults

**Indexed elements:**
- `<article>` - Release cards
- `<h1>`, `<h2>`, `<h3>` - Headings
- `<p>` - Paragraphs
- `data-pagefind-body` - Explicit opt-in

**Excluded elements:**
- `<nav>` - Navigation
- `<footer>` - Footer
- `data-pagefind-ignore` - Explicit opt-out

**No configuration file required** - Works out of the box

## Integration 5: GitHub Pages (Deployment)

**Role:** Static hosting with CDN  
**URL:** `https://castrojo.github.io/firehose`  
**Implementation:** `.github/workflows/update-feed.yaml`

### Deployment Pipeline

**Workflow file:** `.github/workflows/update-feed.yaml:46-55`

```yaml
deploy:
  needs: build
  runs-on: ubuntu-latest
  environment:
    name: github-pages
    url: ${{ steps.deployment.outputs.page_url }}
  steps:
    - name: Deploy to GitHub Pages
      id: deployment
      uses: actions/deploy-pages@v4
```

**Process:**

1. Build job completes successfully
2. Uploads `dist/` as artifact
3. Deploy job downloads artifact
4. Pushes to `gh-pages` branch
5. GitHub Pages CDN picks up changes
6. Site live at `castrojo.github.io/firehose`

**Duration:** 30-60 seconds (GitHub Pages propagation)

### Configuration

**Astro config:** `astro.config.mjs`

```javascript
export default defineConfig({
  site: 'https://castrojo.github.io',
  base: '/firehose',  // Subpath for GitHub Pages
});
```

**Why `base: '/firehose'`:**
- GitHub Pages user sites use subpaths (not apex domain)
- All asset URLs must include `/firehose` prefix
- Astro handles this automatically

### GitHub Pages Features

**CDN benefits:**
- **Global edge caching** - Fast worldwide access
- **HTTPS by default** - Secure by design
- **DDoS protection** - GitHub's infrastructure
- **No cost** - Free for public repositories

**Limitations:**
- **Static files only** - No server-side code
- **1GB repository size limit** - Our dist/ is ~3MB (safe)
- **100GB bandwidth/month** - More than enough

## Integration 6: GitHub Actions (CI/CD)

**Role:** Build orchestration and scheduling  
**Workflow:** `.github/workflows/update-feed.yaml`

### Triggers

**File:** `.github/workflows/update-feed.yaml:3-10`

```yaml
on:
  push:
    branches:
      - main
  schedule:
    - cron: "0 6 * * *"  # Daily at 6 AM UTC
  workflow_dispatch:      # Manual trigger
```

**Trigger scenarios:**

| Trigger | When | Why |
|---------|------|-----|
| `push: main` | Code changes merged | Update site with code changes |
| `schedule: cron` | Daily 6 AM UTC | Fetch fresh feed data |
| `workflow_dispatch` | Manual button click | On-demand rebuild |

### Build Environment

**Runner:** `ubuntu-latest` (currently Ubuntu 22.04)  
**Node.js:** 20 LTS

```yaml
steps:
  - name: Setup Node.js
    uses: actions/setup-node@v4
    with:
      node-version: '20'
      cache: 'npm'
```

**Why Node 20:**
- LTS support through April 2026
- Built-in Fetch API (no polyfill)
- ES Modules support
- Excellent performance

### Build Steps

**File:** `.github/workflows/update-feed.yaml:25-44`

```yaml
build:
  runs-on: ubuntu-latest
  steps:
    - name: Checkout repository
      uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build site
      run: npm run build  # Runs astro build && pagefind
    
    - name: Upload artifact
      uses: actions/upload-pages-artifact@v3
      with:
        path: ./dist
```

**Duration:**
- Install dependencies: 5-10s (cached)
- Build site: 10-15s
- Upload artifact: 2-3s
- **Total:** ~20-30 seconds

### Secrets and Permissions

**Permissions required:**

```yaml
permissions:
  contents: read      # Read repository
  pages: write        # Deploy to GitHub Pages
  id-token: write     # OIDC token for deployment
```

**No secrets required** - All data sources are public

## Integration Health Monitoring

### Build Logs

**Where to check:** GitHub Actions → Workflow runs

**Key log sections:**

```
[Landscape] Fetching from: https://raw.githubusercontent.com/.../landscape.yml
[Landscape] Downloaded 2800000 bytes
[Landscape] Parsed 867 projects
```

```
📊 Feed Load Summary:
   ✅ Success: 231/231 feeds (100.0%)
   ❌ Failed:  0/231 feeds (0.0%)
   📝 Entries: 612 total
   ⏱️  Duration: 9.2s
```

### Failure Scenarios

**Scenario 1: Landscape fetch fails**

```
[Landscape] Error fetching landscape: FetchError: request failed
Error: Failed to fetch landscape
```

**Impact:** Build fails immediately  
**Recovery:** Automatic retry on next scheduled run

---

**Scenario 2: <50% feeds fail**

```
❌ Failed Feeds:
   • Keycloak: 404 Not Found
   • Linkerd: ECONNRESET
   
✅ Build succeeds with partial data (229/231 feeds)
```

**Impact:** Build succeeds, 229 projects shown  
**Recovery:** Automatic on next run (may resolve itself)

---

**Scenario 3: >50% feeds fail**

```
⚠️  High failure rate: 65.0% of feeds failed
Error: Build failed: 150/231 feeds failed (65.0%)
```

**Impact:** Build fails, no deployment  
**Recovery:** GitHub Actions automatic retry, investigate systemic issue

## Testing Integrations Locally

### Test Landscape Integration

```bash
# Fetch and parse landscape data
node -e "
  import('./src/lib/landscape.js').then(async m => {
    const data = await m.fetchLandscapeData();
    console.log('Projects:', Object.keys(data).length);
    console.log('Sample:', data['kubernetes/kubernetes']);
  });
"
```

**Expected output:**
```
Projects: 867
Sample: {
  name: 'Kubernetes',
  description: 'Production-Grade Container Orchestration',
  repo_url: 'https://github.com/kubernetes/kubernetes',
  project: 'graduated',
  ...
}
```

### Test Feed Fetching

```bash
# Run full build locally
npm run build

# Watch for feed fetch logs
[Feed Loader] Starting feed load for 231 sources
[Feed Loader] Fetched all feeds in 9.2s
```

### Test Search Integration

```bash
# Build with Pagefind
npm run build

# Preview locally
npm run preview

# Visit: http://localhost:4321/firehose
# Type in search box, verify results appear
```

## Related Documentation

- `ARCHITECTURE.md` - Overall system design
- `DATAFLOW.md` - How data flows through integrations
- `LANDSCAPE-SOURCE-OF-TRUTH.md` - Why Landscape is authoritative
- `DEPLOYMENT.md` - Build and release process
- `STACK.md` - Technology choices

## Key Takeaways

1. **Build-time only** - NO runtime API calls, everything static
2. **Landscape is primary** - Single source of truth for metadata
3. **231 parallel feed fetches** - 8-10 seconds (not sequential)
4. **Graceful degradation** - Build succeeds if >50% feeds load
5. **No authentication** - All sources are public APIs
6. **Offline-capable search** - Pagefind runs in browser
7. **Daily updates** - Scheduled GitHub Actions at 6 AM UTC

---

**Authored by:** AI Assistant (OpenCode/Claude Sonnet 4.5)  
**Issue:** firehose-w6p - Write INTEGRATIONS.md  
**Date:** February 2, 2026
