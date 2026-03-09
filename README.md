# CNCF Releases

Aggregates release announcements from 230+ CNCF projects into a single searchable feed.

**Live site:** https://castrojo.github.io/firehose/

## Architecture

```
Go pipeline → src/data/releases.json → Astro → GitHub Pages
```

1. **Go binary** (`firehose-go/`) fetches CNCF Landscape metadata and 230+ RSS/Atom feeds in parallel, enriches each release with project name/description/status, and writes `src/data/releases.json` (~29MB, gitignored).
2. **Astro** imports that JSON at build time, renders static HTML, and Pagefind indexes the content for full-text search.
3. **GitHub Actions** runs the full pipeline daily at 6 AM UTC and deploys to GitHub Pages.

## Local Development

### Prerequisites

- Go 1.24+
- Node.js 20+

### Full build from scratch

```bash
just build
```

This runs the full pipeline: Go binary → feeds JSON → Astro build → Pagefind index.

### Preview the built site

```bash
just serve  # opens http://localhost:4321/firehose in your browser
```

### Dev server (hot reload, no search)

```bash
just dev
```

> Note: `src/data/releases.json` is gitignored. `just build` handles the full pipeline
> including the Go binary. Use `npm run build` alone only when `releases.json` already
> exists and you want to skip re-fetching all feeds.

## Adding a Feed

Edit `firehose-go/config/feeds.yaml` and add the feed URL under the appropriate CNCF status category (`graduated`, `incubating`, `sandbox`).

Only add feeds for CNCF projects. Verify at https://landscape.cncf.io.

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for GitHub Pages setup, automated deployment, and instructions for migrating to `releases.cncf.io`.

## Contributing

See [AGENTS.md](AGENTS.md) for architecture details and contribution guidelines.
