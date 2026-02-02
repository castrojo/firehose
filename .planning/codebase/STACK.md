# Technology Stack

**Status:** Current production dependencies (v1.1)  
**Last Updated:** February 2, 2026  
**Node.js Version:** 20 LTS

## Core Framework

### Astro v5.16+
**Purpose:** Static site generator with Content Layer API  
**Why chosen:**
- Build-time static generation (fast, secure, SEO-friendly)
- Content Layer API for custom data sources
- First-class TypeScript support
- Zero JavaScript by default (progressive enhancement)
- Excellent performance (100 Lighthouse scores)

**Key features used:**
- Content Collections (`src/content/config.ts`)
- Custom Loaders (`src/lib/feed-loader.ts`)
- Static Site Generation (SSG)
- Scoped component styles
- Built-in markdown rendering

**Version:** `^5.16.16` (package.json:30)

## Runtime Dependencies

### rss-parser ^3.13.0
**Purpose:** RSS/Atom feed parsing  
**Why chosen:**
- Handles both RSS 2.0 and Atom formats
- Custom field extraction (`content:encoded`)
- Promise-based API (fits async pipeline)
- Battle-tested (widely used in Node.js ecosystem)

**Usage:** `src/lib/feed-loader.ts:26-30`

### js-yaml ^4.1.1
**Purpose:** YAML parsing for CNCF Landscape data  
**Why chosen:**
- Standard YAML 1.2 support
- Handles large files (2.8MB landscape.yml)
- Safe parsing mode
- TypeScript types available

**Usage:** `src/lib/landscape.ts:1,22`

### marked ^17.0.1
**Purpose:** Markdown rendering (release notes)  
**Why chosen:**
- GitHub-compatible markdown (GFM)
- Fast parsing and rendering
- Extensible with plugins
- Sanitization support

**Related packages:**
- `marked-gfm-heading-id` ^4.1.3 - Auto-generate heading IDs
- `marked-highlight` ^2.2.3 - Syntax highlighting for code blocks

**Usage:** `src/lib/markdown.ts`

### zod ^4.3.6
**Purpose:** Schema validation and TypeScript inference  
**Why chosen:**
- Runtime type safety
- Automatic TypeScript type inference
- Excellent error messages
- Composable schemas

**Usage:** `src/lib/schemas.ts` (FeedEntrySchema, LandscapeProjectSchema)

## Development Dependencies

### Pagefind ^1.4.0
**Purpose:** Static search index generation  
**Why chosen:**
- Build-time indexing (no runtime overhead)
- Works offline (no external API)
- Fast search (<50ms)
- Small bundle size (~50KB gzipped)
- Multi-language support

**Build integration:** `package.json:8` (`npm run build`)  
**Generated files:** `dist/pagefind/` (search index + UI)

### @types/js-yaml ^4.0.9
**Purpose:** TypeScript type definitions for js-yaml  
**Why needed:** js-yaml doesn't include built-in TypeScript types

## Runtime Environment

### Node.js 20 LTS
**Why chosen:**
- Long-term support (maintained until April 2026)
- ES Modules support (type: "module")
- Fetch API built-in (no polyfill needed)
- Performance improvements over v18
- GitHub Actions default for ubuntu-latest

**Minimum version:** 20.x  
**CI/CD version:** `20` (`.github/workflows/update-feed.yaml:32`)

### Package Manager: npm
**Why npm (not pnpm/yarn):**
- Default with Node.js (no extra installation)
- GitHub Actions caching works out-of-box
- Widely supported in CI/CD
- Lockfile v3 format (faster, smaller)

**Lockfile:** `package-lock.json` (v3 format)  
**Install command:** `npm ci` (clean install from lockfile)

## Build Tools

### Astro CLI
**Commands:**
- `astro dev` - Development server with HMR
- `astro build` - Production build to `dist/`
- `astro preview` - Preview production build locally

**Configuration:** `astro.config.mjs`

### Pagefind CLI
**Command:** `pagefind --site dist`  
**When:** After `astro build` (part of build script)  
**Output:** Search index files in `dist/pagefind/`

**Build pipeline:**
```bash
npm run build
  → astro build        # Generate static HTML
  → pagefind --site dist  # Index content for search
```

## Deployment Platform

### GitHub Pages
**Why chosen:**
- Free hosting for public repos
- Automatic HTTPS (*.github.io)
- CDN distribution (fast global access)
- Integrates with GitHub Actions
- Custom domain support (optional)

**URL:** `https://castrojo.github.io/firehose/`  
**Base path:** `/firehose` (configured in `astro.config.mjs`)

### GitHub Actions
**Workflow:** `.github/workflows/update-feed.yaml`  
**Runner:** `ubuntu-latest` (includes Node.js 20)  
**Triggers:**
- Push to `main` branch
- Daily cron: `0 6 * * *` (6 AM UTC)
- Manual: `workflow_dispatch`

**Cache configuration:**
```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'  # Caches node_modules/
```

## Dependency Management

### Dependabot
**Configuration:** `.github/dependabot.yml`

**Update schedule:**
- **npm packages:** Daily
- **GitHub Actions:** Weekly

**Why automated updates:**
- Security patches applied quickly
- Avoid dependency rot
- Test updates in CI before merge

**Review process:**
1. Dependabot opens PR
2. GitHub Actions runs build
3. Manual review if breaking changes
4. Merge if tests pass

### Version Ranges

**Strategy:** Caret (`^`) for minor updates only

```json
{
  "astro": "^5.16.16",      // Allows 5.16.x, 5.17.x, NOT 6.x
  "rss-parser": "^3.13.0",  // Allows 3.13.x, 3.14.x, NOT 4.x
  "zod": "^4.3.6"           // Allows 4.3.x, 4.4.x, NOT 5.x
}
```

**Rationale:** Balance between security updates and stability

## Browser Compatibility

### Target Browsers
- Last 2 versions of major browsers
- Chrome, Firefox, Safari, Edge
- Mobile Safari, Chrome Mobile

### Polyfills
**None required** - Modern browser features only:
- ES2020+ JavaScript
- CSS Grid, Flexbox
- Fetch API
- LocalStorage
- IntersectionObserver

**Progressive enhancement:**
- Search requires JavaScript (graceful fallback)
- Filters require JavaScript (show all if disabled)
- Keyboard nav requires JavaScript (mouse works)
- Dark mode requires JavaScript (defaults to system)

## Security Considerations

### Dependency Scanning
- **Dependabot security alerts** - Automatic vulnerability detection
- **npm audit** - Run during `npm ci` in CI/CD

### Content Security
- **Markdown sanitization** - marked.js escapes HTML by default
- **XSS prevention** - No `dangerouslySetInnerHTML` equivalent
- **HTTPS only** - GitHub Pages enforces HTTPS

### Build Security
- **Lockfile integrity** - `npm ci` verifies checksums
- **Pinned actions** - GitHub Actions use commit SHAs (not tags)
- **Read-only tokens** - GitHub Actions uses minimal permissions

## Development Workflow

### Local Development
```bash
npm install           # Install dependencies
npm run dev           # Start dev server (localhost:4321)
```

**Hot Module Replacement:** Automatic browser refresh on file changes

### Production Build
```bash
npm run build         # Build + index
npm run preview       # Preview locally (localhost:4321)
```

**Output:** `dist/` directory (ready to deploy)

### Type Checking
**Note:** TypeScript checking runs in editor (LSP) but NOT in build

**Why:** Astro v5 Content Layer has type compatibility issues  
**Workaround:** Editor provides feedback, build continues on type errors

## Excluded Technologies (Intentional)

### NOT Used
❌ **React/Vue/Svelte** - Astro components sufficient, zero-JS goal  
❌ **Tailwind CSS** - Custom CSS simpler for this use case  
❌ **State management** - No client-side state complexity  
❌ **Testing frameworks** - Manual testing currently (see TESTING.md)  
❌ **Databases** - Static site, no backend  
❌ **Authentication** - Public site, no auth needed  
❌ **Analytics** - Privacy-first approach  

**Principle:** Minimize dependencies, maximize simplicity

## Version History

### v1.1 (Current)
- Astro 5.16.16
- All dependencies up-to-date
- 867 landscape projects parsed
- 231 feeds tracked

### v1.0 (January 2026)
- Migration from osmosfeed to Astro v5
- Content Layer API implementation
- CNCF Landscape integration
- 610 releases from 62 projects

### Prototype (December 2025)
- osmosfeed-based system
- Hardcoded feed URLs
- Manual project configuration

## Go Port Considerations

When porting to Go, equivalent libraries:

| Current (Node.js) | Go Equivalent | Notes |
|-------------------|---------------|-------|
| rss-parser | `github.com/mmcdole/gofeed` | RSS/Atom parsing |
| js-yaml | `gopkg.in/yaml.v3` | YAML parsing |
| marked | `github.com/russross/blackfriday/v2` | Markdown rendering |
| zod | `github.com/go-playground/validator/v10` | Struct validation |
| Astro | Hugo or custom SSG | Static site generation |
| Pagefind | Bleve or custom | Full-text search |

**Go advantages:**
- Faster builds (compiled language)
- Lower memory usage
- Better concurrency (goroutines)
- Single binary deployment
- No npm install step

**Trade-offs:**
- Astro's Content Layer API is Node.js-specific
- Need custom SSG or Hugo integration
- Pagefind integration may require workaround

## Related Files

- `package.json` - Dependency declarations
- `package-lock.json` - Lockfile with checksums
- `astro.config.mjs` - Astro configuration
- `.github/workflows/update-feed.yaml` - CI/CD pipeline
- `.github/dependabot.yml` - Automated updates
- `src/lib/feed-loader.ts` - Uses rss-parser
- `src/lib/landscape.ts` - Uses js-yaml
- `src/lib/markdown.ts` - Uses marked
- `src/lib/schemas.ts` - Uses zod

## Key Takeaways

1. **Astro v5** - Modern SSG with Content Layer API
2. **Node.js 20 LTS** - Stable runtime environment
3. **Minimal dependencies** - 6 runtime + 2 dev dependencies
4. **Zero client JS frameworks** - Pure Astro components
5. **Dependabot automation** - Daily security updates
6. **GitHub Pages + Actions** - Free hosting + CI/CD
7. **npm with lockfile** - Reproducible builds
8. **No testing framework** - Manual QA currently (opportunity)

---

**Authored by:** AI Assistant (OpenCode/Claude Sonnet 4.5)  
**Issue:** firehose-lbm - Write STACK.md  
**Date:** February 2, 2026
