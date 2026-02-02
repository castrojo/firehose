# Codebase Structure

**Analysis Date:** 2026-01-26

## Directory Layout

```
firehose/
├── .github/
│   └── workflows/          # CI/CD automation
├── .planning/
│   └── codebase/          # Architecture documentation
├── includes/              # Handlebars templates
├── public/                # Build output (generated, deployed)
├── scripts/               # Build-time data processing
├── static/                # Static assets (CSS, client JS)
├── osmosfeed.yaml         # Feed configuration
├── package.json           # Dependencies and build scripts
└── README.md              # Technical documentation
```

## Directory Purposes

**`.github/workflows/`:**
- Purpose: GitHub Actions CI/CD configuration
- Contains: Workflow YAML files
- Key files: `update-feed.yaml` (scheduled builds and deployments)

**`.planning/codebase/`:**
- Purpose: Architecture and development documentation
- Contains: Markdown analysis documents
- Key files: `ARCHITECTURE.md`, `STRUCTURE.md` (this file)

**`includes/`:**
- Purpose: Handlebars templates for osmosfeed
- Contains: HTML templates processed by osmosfeed
- Key files: `index.hbs` (main page template)

**`public/`:**
- Purpose: Build output directory (generated, not committed except on gh-pages branch)
- Contains: Complete static site ready for deployment
- Key files: `index.html`, `cache.json`, `landscape-data.json`, `html-content.json`, `feed.atom`, all static assets

**`scripts/`:**
- Purpose: Build-time data processing scripts
- Contains: Node.js scripts that run after osmosfeed
- Key files: `fetch-landscape-data.js`, `extract-html.js`, `create-html-data.js`

**`static/`:**
- Purpose: Static assets copied to public/ during build
- Contains: CSS stylesheets, client-side JavaScript modules
- Key files: `index.css`, `html-loader.js`, `project-info-loader.js`, `index.js`

## Key File Locations

**Entry Points:**
- `package.json`: Build script orchestration (`npm run build`)
- `.github/workflows/update-feed.yaml`: CI/CD automation
- `includes/index.hbs`: Template entry point

**Configuration:**
- `osmosfeed.yaml`: Feed sources (100+ RSS/Atom feeds)
- `package.json`: Dependencies and build pipeline
- `.github/workflows/update-feed.yaml`: Deployment settings

**Core Logic:**
- `scripts/fetch-landscape-data.js`: CNCF Landscape data fetcher and parser
- `scripts/extract-html.js`: HTML content extractor and project matcher
- `scripts/create-html-data.js`: JSON cache generator

**Styling:**
- `static/index.css`: GitHub Primer-inspired custom CSS

**Client Enhancement:**
- `static/html-loader.js`: Injects pre-cached HTML content
- `static/project-info-loader.js`: Updates project names and descriptions from landscape
- `static/index.js`: UI state management (accordions, timestamps)

**Testing:**
- No test files present (testing not currently implemented)

## Naming Conventions

**Files:**
- Scripts: `kebab-case.js` (e.g., `fetch-landscape-data.js`)
- Templates: `index.hbs`
- Stylesheets: `index.css`
- Config: `osmosfeed.yaml`, `package.json`

**Directories:**
- Lowercase: `scripts`, `static`, `includes`, `public`
- Dotfiles: `.github`, `.planning`

**Generated Files:**
- Data: `kebab-case.json` (e.g., `landscape-data.json`, `html-content.json`)
- HTML: `index.html`
- Feeds: `feed.atom`

**JavaScript:**
- Functions: `camelCase` (e.g., `fetchLandscapeData`, `parseYaml`)
- Constants: `SCREAMING_SNAKE_CASE` (e.g., `CACHE_PATH`, `LANDSCAPE_YML_URL`)
- Variables: `camelCase` (e.g., `projectMap`, `enriched`)

## Where to Add New Code

**New Feed Source:**
- Primary: Edit `osmosfeed.yaml`, add URL to `sources` array
- No code changes required

**New Build Step:**
- Add script: `scripts/new-script.js`
- Update pipeline: Modify `package.json` scripts.build to include `&& node scripts/new-script.js`
- Make executable: `chmod +x scripts/new-script.js`

**New Data Source (like Landscape):**
- Fetcher script: `scripts/fetch-[source]-data.js`
- Output: `public/[source]-data.json`
- Loader: `static/[source]-loader.js`
- Template reference: `<script src="[source]-loader.js"></script>` in `includes/index.hbs`

**New Client Enhancement:**
- Implementation: `static/[feature]-loader.js`
- Template reference: Add `<script src="[feature]-loader.js"></script>` in `includes/index.hbs`

**New Styling:**
- Primary: Add rules to `static/index.css`
- Organization: CSS uses GitHub Primer conventions, grouped by component

**New Template Section:**
- Primary: Edit `includes/index.hbs`
- Follow: Handlebars syntax, semantic HTML, accessibility practices
- Note: osmosfeed controls data model; custom fields require client-side injection

**New Dependency:**
- Add to `package.json` dependencies
- Run `npm install` to update lockfile
- Minimize external dependencies (currently only osmosfeed)

## Special Directories

**`public/`:**
- Purpose: Complete build output
- Generated: Yes (by `npm run build`)
- Committed: No (on main branch), Yes (on gh-pages branch via CI)
- Contents: `index.html`, `cache.json`, `landscape-data.json`, `html-content.json`, `feed.atom`, static assets

**`node_modules/`:**
- Purpose: npm dependencies
- Generated: Yes (by `npm install`)
- Committed: No
- Contents: osmosfeed and its dependencies

**`.git/`:**
- Purpose: Git version control
- Generated: Yes
- Committed: N/A
- Contents: Git internal files

**`.github/workflows/`:**
- Purpose: GitHub Actions automation
- Generated: No
- Committed: Yes
- Contents: Workflow definitions for scheduled builds

---

*Structure analysis: 2026-01-26*
