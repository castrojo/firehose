# Osmosfeed Architecture Documentation (Archived)

**Date Range:** December 2025 - January 26, 2026  
**Status:** OBSOLETE - Describes osmosfeed prototype system  
**Reason:** Project completely rebuilt with Astro v5

## What Happened

These documents describe The Firehose's original architecture using `@osmoscraft/osmosfeed` as the static site generator. The project was completely rebuilt with Astro v5 starting January 26, 2026 (same day these docs were written).

## Why These Are Obsolete

The osmosfeed-based system was a **prototype** that was replaced by a production-ready Astro v5 implementation:

- **Old system (osmosfeed):** Configuration-driven, limited customization, opinionated structure
- **New system (Astro v5):** Content Layer API, custom RSS loader, parallel fetching, CNCF Landscape integration, full control

## What Changed

| Aspect | Osmosfeed Era | Current (Astro v5) |
|--------|---------------|-------------------|
| **Core Framework** | osmosfeed 2.x | Astro 5.16+ |
| **Feed Loading** | osmosfeed config | Custom loader (`src/lib/feed-loader.ts`) |
| **Project Metadata** | Manual config | CNCF Landscape API (`src/lib/landscape.ts`) |
| **Directory Structure** | `includes/`, `static/`, `scripts/` | `src/` (components, lib, pages, config) |
| **Build Process** | osmosfeed CLI | Astro Content Layer API |
| **Project Count** | Hardcoded in config | Dynamic from Landscape (160 projects, 231 feeds) |
| **Error Handling** | Basic | Graceful degradation with retry logic |

## Transition Timeline

- **~167 commits ago (Jan 26, 2026):** Migration from osmosfeed to Astro v5
- **Same day:** These docs written (described system that was being replaced)
- **Current:** Full Astro v5 production system with 160+ CNCF projects

## Current Architecture Docs

For up-to-date documentation, see `.planning/codebase/` directory:

- `ARCHITECTURE.md` - Astro v5 build pipeline and Content Layer API
- `DATAFLOW.md` - Build-time data flow from feeds to static HTML
- `STACK.md` - Current technology dependencies
- `STRUCTURE.md` - Astro-based source code organization
- `FEATURES.md` - User-facing functionality
- `INTEGRATIONS.md` - CNCF Landscape, GitHub feeds, external services
- `DEPLOYMENT.md` - Build process and GitHub Actions workflow
- `TESTING.md` - Quality assurance approach

## Historical Value

These documents remain useful for:
- Understanding the project's evolution
- Context for why certain architectural decisions were made
- Comparison between osmosfeed and Astro approaches

## Archived Files

- `ARCHITECTURE.md` - Osmosfeed pipeline description
- `STACK.md` - Listed osmosfeed as core dependency (removed)
- `STRUCTURE.md` - Described `includes/`, `scripts/`, `static/` dirs (now uses `src/`)
- `CONVENTIONS.md` - JavaScript conventions (partially still valid)
- `CONCERNS.md` - Technical debt referencing osmosfeed issues
- `INTEGRATIONS.md` - External services (Landscape integration changed)
- `TESTING.md` - Testing approach (still valid - no tests then or now)

---

**Last Updated:** February 2, 2026  
**Archived By:** AI Assistant (OpenCode/Claude Sonnet 4.5)  
**Issue:** firehose-ahz - Archive outdated osmosfeed architecture docs
