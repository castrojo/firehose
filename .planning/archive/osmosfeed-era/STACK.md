# Technology Stack

**Analysis Date:** 2026-01-26

## Languages

**Primary:**
- JavaScript (Node.js) - All build scripts and client-side code
- No TypeScript detected

**Secondary:**
- YAML - Feed configuration (`osmosfeed.yaml`)
- Handlebars - HTML templating (`includes/index.hbs`)
- CSS - Custom styling (`static/index.css`)

## Runtime

**Environment:**
- Node.js v25.4.0 (development environment)
- Node.js v16 (CI/CD as specified in GitHub Actions workflow)

**Package Manager:**
- npm 11.7.0
- Lockfile: Present (`package-lock.json`)

## Frameworks

**Core:**
- @osmoscraft/osmosfeed v1.2.2 - RSS/Atom feed aggregation and site generation

**Testing:**
- None detected

**Build/Dev:**
- Osmosfeed (generates static site from feeds)
- Node.js built-in modules (`fs`, `path`, `https`, `http`)

## Key Dependencies

**Critical:**
- @osmoscraft/osmosfeed v1.2.2 - Core feed aggregation engine that generates static HTML from RSS/Atom feeds

**Infrastructure:**
- Node.js built-in modules only:
  - `https` - Fetching remote YAML and Atom feeds
  - `http` - HTTP requests
  - `fs` - File system operations for cache and data files
  - `path` - Path resolution

**Client-side:**
- No npm dependencies for browser code
- Uses native `fetch` API for loading JSON data
- Uses native `DOMParser` for parsing XML feeds
- Uses `localStorage` for client-side caching

## Configuration

**Environment:**
- No environment variables required for build
- Configuration via `osmosfeed.yaml` (feed sources, cache URL)
- No `.env` files detected

**Build:**
- `package.json` - Project metadata and build scripts
- `osmosfeed.yaml` - Feed sources and osmosfeed configuration
- `includes/index.hbs` - Handlebars template for HTML generation

**Build Pipeline:**
```bash
npm run build
# Executes: osmosfeed && node scripts/fetch-landscape-data.js && node scripts/extract-html.js && node scripts/create-html-data.js
```

**Build Steps:**
1. `osmosfeed` - Fetches RSS/Atom feeds, generates `public/cache.json`
2. `scripts/fetch-landscape-data.js` - Fetches CNCF Landscape YAML, generates `public/landscape-data.json`
3. `scripts/extract-html.js` - Enriches cache with HTML content and project metadata
4. `scripts/create-html-data.js` - Generates `public/html-content.json`

## Platform Requirements

**Development:**
- Node.js 16+ (16 minimum for GitHub Actions, 25.4.0 in local dev)
- npm 7+ (for lockfile version compatibility)
- Internet connection (build fetches remote feeds)

**Production:**
- Static file hosting (GitHub Pages)
- No server-side runtime required
- Generated output: Static HTML, CSS, JavaScript, JSON

**Deployment:**
- GitHub Actions workflow (`.github/workflows/update-feed.yaml`)
- Scheduled daily builds (cron: `0 0 * * *`)
- Manual trigger via `workflow_dispatch`
- Automatic deployment to GitHub Pages via `peaceiris/actions-gh-pages@v3`

---

*Stack analysis: 2026-01-26*
