# The Firehose (Astro Rebuild)

## What This Is

The Firehose is an RSS feed aggregator that displays release notes from ~100 CNCF cloud native projects in a single chronological feed. It provides CNCF maintainers and ecosystem participants with a comprehensive view of ecosystem activity, rendering GitHub release notes with proper formatting and enriched with project metadata from the CNCF Landscape.

## Core Value

**CNCF maintainers can discover all ecosystem releases in one place with proper formatting and project context.**

## Requirements

### Validated

(None yet — this is a greenfield rebuild replacing the osmosfeed prototype)

### Active

See `.planning/REQUIREMENTS.md` for detailed v1 requirements covering:
- RSS feed aggregation (~100 CNCF project feeds)
- CNCF Landscape integration for project metadata
- Chronological release display with GitHub formatting
- Search and filtering capabilities
- Robust error handling with visible feedback
- GitHub Pages deployment with scheduled updates

### Out of Scope

- **Sandbox projects** — Too many feeds (~250+ projects), defer to v2
- **Custom feed sources** — Focus on GitHub releases only, no blogs/Twitter
- **User accounts/personalization** — Static site, no backend
- **Real-time updates** — Daily scheduled builds are sufficient
- **Mobile app** — Web-first, responsive design only
- **Commenting/social features** — Read-only aggregator

## Context

### Current State (osmosfeed prototype)

The existing prototype uses osmosfeed with custom build scripts:
- Manual HTML extraction via brittle regex parsing
- Silent failures when feeds fail
- No search or filtering beyond chronological view
- Manual YAML parsing for CNCF Landscape integration
- Works but fragile and hard to extend

### Target Users

**Primary:** CNCF project maintainers tracking ecosystem activity
**Secondary:** Cloud native practitioners, DevRel teams, ecosystem observers

### Key Problems Solved

1. **Discovery:** Finding releases across 100+ projects without checking each repo
2. **Context:** Understanding which projects are what (names, descriptions, status)
3. **Formatting:** Viewing release notes as intended (not plain text)
4. **Reliability:** Knowing when feeds fail vs actually having no releases

### Technical Environment

- Deployment: GitHub Pages (static hosting)
- Build: GitHub Actions (scheduled daily)
- Scale: ~100 feeds, ~1000-2000 release entries
- Latency tolerance: Daily updates acceptable

## Constraints

- **Deployment**: GitHub Pages only — No server-side runtime, must be static HTML/CSS/JS
- **Build environment**: GitHub Actions free tier — ~150 build minutes/month for scheduled builds
- **Feed format**: GitHub Atom feeds only — Consistent format, no custom RSS implementations
- **No authentication**: Public feeds only — Cannot access private repos or require tokens
- **Browser support**: Modern browsers only — Evergreen Chrome/Firefox/Safari, no IE11
- **Dependencies**: Minimize external services — Self-contained, no third-party APIs at runtime

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Astro v5 Content Layer API | Designed for build-time aggregation, type-safe, scalable | — Pending |
| rss-parser for feed parsing | Replace brittle regex with battle-tested library | — Pending |
| js-yaml for landscape parsing | Replace manual YAML regex with proper parser | — Pending |
| Pagefind for search | Zero-config, static-friendly, low bandwidth | — Pending |
| Client-side filtering | Fast for <1000 items, no server required | — Pending |
| Promise.allSettled() for feeds | Graceful degradation, no single point of failure | — Pending |
| Daily scheduled builds | CNCF releases are infrequent, hourly is overkill | — Pending |
| Graduated + Incubating only (v1) | ~100 feeds manageable, sandbox projects deferred to v2 | — Pending |

---
*Last updated: 2026-01-26 after research completion*
