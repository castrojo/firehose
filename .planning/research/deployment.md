# GitHub Pages Deployment with Scheduled Builds

**Researched:** 2026-01-26  
**Confidence:** HIGH

## Executive Summary

**Recommended:** Use Astro's official GitHub Action for deployment + GitHub Actions scheduled workflow for daily updates.

**Key Features:**
- **Official Astro GitHub Action** handles build/deploy automatically
- **GitHub Actions schedule** triggers daily builds (cron syntax)
- **Zero configuration** for most cases
- **Free** (within GitHub Actions limits: 2000 mins/mo for free accounts)
- **Fast builds** (~2-5 minutes for typical Astro site)

## Recommended Deployment Setup

### Step 1: Enable GitHub Pages

1. Go to repository **Settings** → **Pages**
2. Set **Source** to "GitHub Actions" (not "Deploy from a branch")

### Step 2: Create Deployment Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  # Trigger on push to main branch
  push:
    branches: [main]
  
  # Trigger daily at 6am UTC (adjust as needed)
  schedule:
    - cron: '0 6 * * *'
  
  # Allow manual triggering from Actions tab
  workflow_dispatch:

# Required permissions
permissions:
  contents: read
  pages: write
  id-token: write

# Prevent concurrent deployments
concurrency:
  group: 'pages'
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v5
      
      - name: Setup Node.js
        uses: actions/setup-node@v5
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build site with Astro
        uses: withastro/action@v5
        # Default: runs `npm run build`
        # Customize if needed:
        # with:
        #   path: .
        #   node-version: 20
        #   package-manager: npm@latest
  
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

### Step 3: Configure Astro

Update `astro.config.mjs`:

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';

export default defineConfig({
  // Required: Set to your GitHub Pages URL
  site: 'https://castrojo.github.io',
  
  // Required if deploying to a repo subpath
  // (e.g., https://username.github.io/repo-name/)
  base: '/firehose',
  
  // Optional: Enable for better debugging
  output: 'static', // Default, but explicit is good
});
```

## Schedule Configuration

### Cron Syntax Reference

```yaml
schedule:
  - cron: '0 6 * * *'  # Every day at 6:00 AM UTC
```

**Cron format:** `minute hour day month weekday`

| Pattern | Description | Example |
|---------|-------------|---------|
| `0 6 * * *` | Daily at 6 AM UTC | Default recommendation |
| `0 */6 * * *` | Every 6 hours | More frequent updates |
| `0 0,12 * * *` | Twice daily (midnight & noon) | Balanced approach |
| `0 0 * * 1` | Weekly on Monday | Less frequent |
| `*/30 * * * *` | Every 30 minutes | ⚠️ Wastes CI minutes |

**Recommendation for Firehose:** `0 6 * * *` (daily at 6 AM UTC)

**Why daily?**
- CNCF project releases are infrequent (not hourly)
- Avoids wasting GitHub Actions minutes
- Fresh content without over-building

### Testing Schedules

**Don't wait for the cron schedule** to test deployment!

```yaml
on:
  # Keep schedule for production
  schedule:
    - cron: '0 6 * * *'
  
  # Add workflow_dispatch for manual testing
  workflow_dispatch:
  
  # Test on every push during development
  push:
    branches: [main, develop]
```

Then manually trigger from **Actions** → **Deploy to GitHub Pages** → **Run workflow**.

## Build Optimization

### Caching Dependencies

The official Astro action handles caching automatically, but you can optimize further:

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v5
  with:
    node-version: '20'
    cache: 'npm'  # Caches node_modules

- name: Install dependencies
  run: npm ci  # Faster than npm install
```

**Speed improvement:** 30-60 seconds saved per build.

### Caching Content Collections

Astro v5's Content Layer API caches collection data:

```yaml
- name: Cache Astro content
  uses: actions/cache@v4
  with:
    path: |
      .astro
      node_modules/.astro
    key: ${{ runner.os }}-astro-${{ hashFiles('src/content.config.ts') }}
    restore-keys: |
      ${{ runner.os }}-astro-
```

**Speed improvement:** 10-30 seconds for unchanged collections.

### Parallel Builds (Advanced)

For very large sites, split builds:

```yaml
jobs:
  build-feeds:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1, 2, 3, 4]  # 4 parallel jobs
    steps:
      - name: Build shard ${{ matrix.shard }}
        run: npm run build:shard:${{ matrix.shard }}
  
  combine-and-deploy:
    needs: build-feeds
    runs-on: ubuntu-latest
    steps:
      - name: Combine shards
        run: npm run combine-shards
      - name: Deploy
        uses: actions/deploy-pages@v4
```

**For Firehose:** Unnecessary at 100 feeds. Consider at 1000+ feeds.

## Environment Variables & Secrets

### Public Variables

Set in `astro.config.mjs` or `.env` (committed to repo):

```bash
# .env (public, committed)
PUBLIC_SITE_TITLE=Firehose
PUBLIC_GITHUB_ORG=cncf
```

Access in Astro:

```typescript
import.meta.env.PUBLIC_SITE_TITLE
```

### Secret Variables

Set in **Settings** → **Secrets and variables** → **Actions**:

1. Click "New repository secret"
2. Name: `GITHUB_API_TOKEN`
3. Value: Your GitHub PAT (if needed for API rate limits)

Use in workflow:

```yaml
- name: Build with API token
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_API_TOKEN }}
  run: npm run build
```

Access in Astro loader:

```typescript
const token = process.env.GITHUB_TOKEN;

const response = await fetch(url, {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});
```

**For Firehose:** Not needed unless hitting GitHub API rate limits (unlikely for RSS feeds).

## Error Handling & Notifications

### Fail Build on Critical Errors

```typescript
// src/loaders/rss-loader.ts
export function rssLoader(options: RSSLoaderOptions): Loader {
  return {
    name: 'rss-loader',
    async load({ store, logger, meta }) {
      const criticalFeeds = options.feeds.filter(f => f.critical);
      const optionalFeeds = options.feeds.filter(f => !f.critical);
      
      // Critical feeds MUST succeed
      const criticalResults = await Promise.all(
        criticalFeeds.map(async feed => {
          try {
            return await fetchFeed(feed);
          } catch (error) {
            logger.error(`CRITICAL: ${feed.url} failed: ${error}`);
            throw error; // Fail build
          }
        })
      );
      
      // Optional feeds can fail gracefully
      const optionalResults = await Promise.allSettled(
        optionalFeeds.map(fetchFeed)
      );
      
      // Process results...
    },
  };
}
```

### Slack/Discord Notifications

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      # ... build steps ...
      
      - name: Notify Slack on failure
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "Firehose build failed! Check Actions tab."
            }
```

### Email Notifications

GitHub sends email automatically for workflow failures to repository admins. Enable in:
**Settings** → **Notifications** → **Actions** → Check "Send notifications for failed workflows"

## Monitoring & Debugging

### Build Status Badge

Add to `README.md`:

```markdown
[![Deploy Status](https://github.com/castrojo/firehose/actions/workflows/deploy.yml/badge.svg)](https://github.com/castrojo/firehose/actions/workflows/deploy.yml)
```

### View Build Logs

1. Go to **Actions** tab
2. Click on a workflow run
3. Expand each step to see logs

### Enable Debug Logging

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    
    env:
      # Enable Astro debug logs
      DEBUG: 'astro:*'
    
    steps:
      - name: Build with debug logs
        run: npm run build
```

### Check Deployed Site

```yaml
jobs:
  deploy:
    # ... deploy steps ...
    
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
      
      - name: Verify deployment
        run: |
          sleep 10  # Wait for Pages to propagate
          curl -f ${{ steps.deployment.outputs.page_url }} || exit 1
```

## Custom Domain Setup

### Configure Custom Domain

1. **DNS Records (with your domain provider):**

```
# For apex domain (example.com)
A record: @ → 185.199.108.153
A record: @ → 185.199.109.153
A record: @ → 185.199.110.153
A record: @ → 185.199.111.153

# For subdomain (firehose.example.com)
CNAME record: firehose → castrojo.github.io
```

2. **GitHub Pages Settings:**
   - Go to **Settings** → **Pages**
   - Set **Custom domain** to `firehose.example.com`
   - Check **Enforce HTTPS**

3. **Update Astro Config:**

```javascript
// astro.config.mjs
export default defineConfig({
  site: 'https://firehose.example.com',
  base: '/', // No subpath with custom domain
});
```

### CNAME File

GitHub Pages creates this automatically, but you can add to `public/CNAME`:

```
firehose.example.com
```

## Troubleshooting

### Build Fails: "Module not found"

**Cause:** Missing dependencies.

**Fix:**

```yaml
- name: Install dependencies
  run: npm ci  # NOT npm install
```

### Build Fails: "Permission denied"

**Cause:** Incorrect permissions in workflow.

**Fix:**

```yaml
permissions:
  contents: read
  pages: write        # Required!
  id-token: write     # Required!
```

### Deployment Succeeds but Site Not Updated

**Cause:** Caching or deployment delay.

**Fix:**
1. Hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R)
2. Check workflow logs for actual deployment URL
3. Wait 1-2 minutes for CDN propagation

### Schedule Not Triggering

**Cause:** GitHub Actions schedule can have delays (up to 10 minutes).

**Fix:**
- Use `workflow_dispatch` to manually trigger
- Check **Actions** → **All workflows** → **Deploy to GitHub Pages** → Last run

### Rate Limiting on Feed Fetches

**Cause:** Too many requests to GitHub.

**Fix:**

```typescript
// Add retry with backoff
async function fetchWithRetry(url: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      
      if (response.status === 429) {
        // Rate limited, wait
        const retryAfter = response.headers.get('Retry-After') || '60';
        await new Promise(r => setTimeout(r, parseInt(retryAfter) * 1000));
        continue;
      }
      
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
}
```

## Cost & Limits

### GitHub Actions Limits

| Plan | Build Minutes/Month | Concurrent Jobs |
|------|-------------------|-----------------|
| **Free** | 2,000 | 20 |
| **Pro** | 3,000 | 40 |
| **Team** | 10,000 | 60 |
| **Enterprise** | 50,000 | 180 |

**Firehose estimate:**
- ~5 minutes/build
- 30 builds/month (daily)
- **Total:** 150 minutes/month (well under free tier)

### GitHub Pages Limits

- **Bandwidth:** 100 GB/month (soft limit)
- **Build size:** 1 GB max
- **File size:** 100 MB per file max
- **Publish rate:** 10 deploys/hour max

**Firehose estimate:**
- ~5 MB build output
- ~1 GB bandwidth/month (estimated)
- **Total:** Well within limits

## Comparison: GitHub Pages vs Alternatives

| Platform | Setup | Cost | Build Time | Custom Domain | Verdict |
|----------|-------|------|-----------|---------------|---------|
| **GitHub Pages** | Easy | Free | ~3-5 min | ✅ | ✅ **Best for this project** |
| Netlify | Easy | Free (with limits) | ~2-3 min | ✅ | ✅ Good alternative |
| Vercel | Easy | Free (with limits) | ~2-3 min | ✅ | ✅ Good alternative |
| Cloudflare Pages | Medium | Free | ~2-3 min | ✅ | ✅ Good alternative |
| AWS S3 + CloudFront | Hard | $5-20/mo | N/A | ✅ | ⚠️ More complex |

**For Firehose:** GitHub Pages is ideal since the repo is already on GitHub.

## Complete Example Workflow

Here's the full production-ready workflow:

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 6 * * *'  # Daily at 6 AM UTC
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: 'pages'
  cancel-in-progress: false

env:
  NODE_VERSION: '20'

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v5
      
      - name: Setup Node.js
        uses: actions/setup-node@v5
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Cache Astro content
        uses: actions/cache@v4
        with:
          path: |
            .astro
            node_modules/.astro
          key: ${{ runner.os }}-astro-${{ hashFiles('src/content.config.ts') }}
          restore-keys: |
            ${{ runner.os }}-astro-
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build with Astro
        uses: withastro/action@v5
        # Optionally customize:
        # with:
        #   path: .
        #   node-version: 20
        #   package-manager: npm@latest
      
      - name: Run Pagefind indexing
        run: npx pagefind --site dist
      
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist
  
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
      
      - name: Verify deployment
        run: |
          echo "Deployed to: ${{ steps.deployment.outputs.page_url }}"
          sleep 10
          curl -f "${{ steps.deployment.outputs.page_url }}" || echo "Warning: Site not immediately available"
```

## Confidence Assessment

| Aspect | Confidence | Reasoning |
|--------|-----------|-----------|
| GitHub Actions setup | HIGH | Official Astro action, well-documented |
| Scheduled builds | HIGH | GitHub Actions cron is reliable |
| Deployment process | HIGH | Standard GitHub Pages workflow |
| Custom domain | HIGH | Well-documented GitHub Pages feature |
| Cost estimates | HIGH | Based on GitHub's public limits |
| Troubleshooting | MEDIUM | Common issues documented, edge cases vary |

## References

- **Astro GitHub Pages Guide:** https://docs.astro.build/en/guides/deploy/github/
- **GitHub Actions Docs:** https://docs.github.com/en/actions
- **GitHub Pages Docs:** https://docs.github.com/en/pages
- **Astro Action GitHub:** https://github.com/withastro/action
- **Actions Deploy Pages:** https://github.com/actions/deploy-pages
