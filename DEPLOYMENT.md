# Deployment Configuration Guide

This document explains how to deploy The Firehose to different organizations and environments.

## Quick Start: Deploy to Your Organization

To deploy The Firehose to your own GitHub organization or custom domain, you only need to update **two configuration values** in `astro.config.mjs`:

### 1. Update `astro.config.mjs`

```javascript
export default defineConfig({
  site: 'https://YOUR-ORG.github.io',  // Your GitHub Pages URL or custom domain
  base: '/firehose',                    // Subpath (use '/' for root domain)
  // ... rest of config
});
```

### Configuration Values

#### `site` (string, required)
The full origin URL where your site will be deployed.

**Examples:**
- GitHub Pages (org): `'https://cncf.github.io'`
- GitHub Pages (user): `'https://yourname.github.io'`
- Custom domain: `'https://firehose.example.com'`
- Netlify: `'https://your-site.netlify.app'`

#### `base` (string, optional)
The base path under which your site will be served. Defaults to `'/'`.

**Examples:**
- Subpath deployment: `'/firehose'` → deployed at `your-site.com/firehose`
- Root deployment: `'/'` → deployed at `your-site.com`
- Custom path: `'/releases'` → deployed at `your-site.com/releases`

### 2. Update GitHub Repository Link (Optional)

If you fork the repository, update the "GitHub Repository" link in `src/pages/index.astro`:

```astro
{ text: 'GitHub Repository', url: 'https://github.com/YOUR-ORG/firehose', external: true }
```

Also update the footer link:

```astro
<p>Updated daily • <a href="https://github.com/YOUR-ORG/firehose" target="_blank" rel="noopener noreferrer">View on GitHub</a></p>
```

## Architecture: How URLs Are Generated

The Firehose uses Astro's built-in URL configuration to generate all paths automatically:

### Automatic Path Generation

All asset paths and URLs are generated using `import.meta.env.BASE_URL`:

| Asset Type | Generated Path | Example |
|------------|----------------|---------|
| RSS Feed | `${baseUrl}feed.xml` | `/firehose/feed.xml` |
| Project Logos | `${baseUrl}logos/${project}/icon-color.svg` | `/firehose/logos/cilium/icon-color.svg` |
| Placeholder Logo | `${baseUrl}logos/placeholder.svg` | `/firehose/logos/placeholder.svg` |
| RSS Meta Tag | `${baseUrl}feed.xml` | `/firehose/feed.xml` |

### RSS Feed URL Construction

The RSS feed automatically constructs the full site URL:

```typescript
const baseUrl = import.meta.env.BASE_URL || '/';
const siteOrigin = site?.toString().replace(/\/$/, '') || 'http://localhost:4321';
const siteUrl = `${siteOrigin}${baseUrl}`.replace(/\/+$/, '/');
```

**Result:** `https://YOUR-ORG.github.io/firehose/`

### Client-Side Base URL Access

JavaScript running in the browser accesses the base URL via a data attribute:

```html
<html lang="en" data-base-url="/firehose">
```

```javascript
const baseUrl = document.documentElement.getAttribute('data-base-url') || '/';
```

This allows the InfiniteScroll component to generate correct logo paths dynamically.

## Deployment Examples

### Example 1: CNCF GitHub Pages (Root)

Deploy at `https://firehose.cncf.io`:

```javascript
export default defineConfig({
  site: 'https://firehose.cncf.io',
  base: '/',
});
```

### Example 2: CNCF GitHub Pages (Subpath)

Deploy at `https://cncf.github.io/firehose`:

```javascript
export default defineConfig({
  site: 'https://cncf.github.io',
  base: '/firehose',
});
```

### Example 3: Custom Domain

Deploy at `https://releases.cloudnative.org`:

```javascript
export default defineConfig({
  site: 'https://releases.cloudnative.org',
  base: '/',
});
```

### Example 4: Netlify

Deploy at `https://cncf-firehose.netlify.app`:

```javascript
export default defineConfig({
  site: 'https://cncf-firehose.netlify.app',
  base: '/',
});
```

## Testing Locally

After updating the configuration, test locally:

```bash
# Build with production paths
npm run build

# Preview production build
npm run preview

# Visit http://localhost:4321/YOUR-BASE-PATH
```

**Verify:**
- ✅ All project logos load correctly
- ✅ RSS feed is accessible at `/YOUR-BASE-PATH/feed.xml`
- ✅ RSS feed contains correct `<link>` URLs
- ✅ Subscribe button links to correct feed URL
- ✅ No 404 errors in browser console

## GitHub Actions Deployment

The included `.github/workflows/deploy.yml` automatically deploys to GitHub Pages when you push to `main`.

**No changes needed** - the workflow reads your `astro.config.mjs` automatically.

### Custom Deployment Targets

To deploy to Netlify, Vercel, or other platforms:

1. **Netlify:** Add `netlify.toml`:
   ```toml
   [build]
     command = "npm run build"
     publish = "dist"
   ```

2. **Vercel:** Add `vercel.json`:
   ```json
   {
     "buildCommand": "npm run build",
     "outputDirectory": "dist"
   }
   ```

3. **Cloudflare Pages:** Configure in dashboard:
   - Build command: `npm run build`
   - Build output: `dist`

## Troubleshooting

### Issue: Logos not loading (404 errors)

**Cause:** Base path mismatch between build and deployment.

**Fix:** Ensure `base` in `astro.config.mjs` matches your deployment path.

### Issue: RSS feed URLs are incorrect

**Cause:** `site` value doesn't match actual deployment URL.

**Fix:** Update `site` in `astro.config.mjs` to match your domain exactly.

### Issue: Feed not auto-detected by browsers

**Cause:** RSS auto-discovery meta tag not using correct path.

**Fix:** This is handled automatically by `baseUrl` - rebuild and redeploy.

### Issue: CSS/JS assets not loading

**Cause:** Astro assets are also affected by `base` config.

**Fix:** Ensure you're using Astro's built-in asset handling (no hardcoded `/firehose/` paths in your code).

## Verification Checklist

Before deploying to production:

- [ ] Updated `site` in `astro.config.mjs`
- [ ] Updated `base` in `astro.config.mjs` (if needed)
- [ ] Updated GitHub repository links (if forked)
- [ ] Ran `npm run build` successfully
- [ ] Tested `npm run preview` and verified all assets load
- [ ] Checked RSS feed XML at `YOUR-BASE-PATH/feed.xml`
- [ ] Verified RSS feed URLs point to correct domain
- [ ] Tested subscribe button links to correct feed
- [ ] No console errors in browser DevTools
- [ ] Pushed to GitHub and verified automated deployment

## Need Help?

If you encounter issues deploying The Firehose:

1. Check the [Astro deployment docs](https://docs.astro.build/en/guides/deploy/)
2. Verify your `site` and `base` configuration
3. Test locally with `npm run build && npm run preview`
4. Open an issue with deployment details

## Architecture Notes

### Why This Approach?

The Firehose uses Astro's native configuration system for maximum portability:

- **Single source of truth:** All paths derive from `astro.config.mjs`
- **No hardcoded URLs:** All asset paths use `import.meta.env.BASE_URL`
- **Platform agnostic:** Works on GitHub Pages, Netlify, Vercel, Cloudflare, etc.
- **Zero runtime config:** All paths resolved at build time for performance

### Files That Reference Configuration

These files automatically use `BASE_URL` from Astro:

- `src/pages/index.astro` - RSS feed link, base URL injection
- `src/pages/feed.xml.ts` - RSS feed URL construction
- `src/lib/logoMapper.ts` - Logo path generation
- `src/components/InfiniteScroll.astro` - Client-side logo paths

**You don't need to edit these files** - they read from `astro.config.mjs` automatically.
