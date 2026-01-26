# Roadmap: The Firehose (Astro Rebuild)

## Overview

This roadmap transforms The Firehose from a brittle osmosfeed prototype into a robust Astro-based RSS aggregator for CNCF releases. The journey progresses from core infrastructure (feed parsing + landscape integration) through multi-feed aggregation with error resilience, user interface with GitHub-style formatting, search and filtering capabilities, and finally deployment automation. Each phase builds on the previous, delivering verifiable capabilities that bring us closer to the core value: CNCF maintainers discovering all ecosystem releases in one place with proper formatting and project context.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Core Infrastructure** - Establish Astro project with working RSS loader and landscape parsing ✅ 2026-01-26
- [x] **Phase 2: Multi-Feed Aggregation** - Scale to ~100 feeds with robust error handling ✅ 2026-01-26
- [x] **Phase 3: User Interface** - Display releases chronologically with GitHub formatting and project metadata ✅ 2026-01-26
- [x] **Phase 4: Search & Filtering** - Add Pagefind search and client-side filtering ✅ 2026-01-26
- [ ] **Phase 5: Deployment & Automation** - GitHub Actions workflow with scheduled builds and monitoring

## Phase Details

### Phase 1: Core Infrastructure

**Goal**: Establish foundational Astro project with a working custom RSS loader that can fetch a single feed, parse it reliably, and enrich entries with CNCF landscape metadata.

**Depends on**: Nothing (first phase)

**Requirements**: FEED-01, FEED-02, LAND-01, LAND-02, LAND-03, LAND-04, LAND-05, LAND-06, VALID-01, VALID-02, VALID-04

**Success Criteria** (what must be TRUE):
1. Developer can run `npm run build` and Astro successfully fetches one test feed (e.g., dapr/dapr releases)
2. Feed entries are enriched with project name, description, and status from landscape.yml
3. Build output shows TypeScript types working (no type errors)
4. Feed entries validate against Zod schema, invalid entries are skipped
5. Landscape.yml parsing uses js-yaml library (no regex) and extracts correct project metadata

**Plans**: See `.planning/phase-1-plans.md` for detailed breakdown (8 plans, ~3.5 hours total)

Plans:
- [ ] 1.1: Initialize Astro v5 Project with TypeScript (15 min)
- [ ] 1.2: Install RSS and YAML Parsing Libraries (10 min)
- [ ] 1.3: Create TypeScript Types and Zod Schemas (30 min)
- [ ] 1.4: Implement CNCF Landscape Fetcher and Parser (45 min)
- [ ] 1.5: Create Custom RSS Loader for Content Layer API (60 min)
- [ ] 1.6: Configure Content Collection with Custom Loader (20 min)
- [ ] 1.7: Create Minimal Test Page to Query Collection (20 min)
- [ ] 1.8: Verify Success Criteria and Document (20 min)

---

### Phase 2: Multi-Feed Aggregation

**Goal**: Scale loader to handle ~100 feeds in parallel with comprehensive error handling that gracefully degrades on failures without blocking the build.

**Depends on**: Phase 1

**Requirements**: FEED-03, FEED-04, FEED-05, FEED-06, ERR-01, ERR-02, ERR-03, ERR-04, ERR-05, ERR-06, VALID-03

**Success Criteria** (what must be TRUE):
1. System fetches 100+ feeds in parallel, completing in <30 seconds
2. Build succeeds when 50%+ of feeds succeed (partial failures don't block deployment)
3. Build logs show which feeds succeeded/failed with clear error messages
4. Failed feeds are tracked in collection with error state (feedStatus: 'error')
5. Transient errors (5xx, timeouts) are retried with exponential backoff (max 3 attempts)
6. Permanent errors (404, 403) skip retry and log immediately

**Plans**: See `.planning/phase-2-plans.md` for detailed breakdown (9 plans, ~4.75 hours total)

Plans:
- [ ] 2.1: Add Feed Configuration File (30 min)
- [ ] 2.2: Implement Error Classification (25 min)
- [ ] 2.3: Add Retry Logic with Exponential Backoff (40 min)
- [ ] 2.4: Add Feed Status Tracking (30 min)
- [ ] 2.5: Refactor Loader for Parallel Fetching (50 min)
- [ ] 2.6: Integrate Retry Logic into Loader (35 min)
- [ ] 2.7: Improve Build Logging and Error Reporting (30 min)
- [ ] 2.8: Add Build Failure Logic (20 min)
- [ ] 2.9: Verify Phase 2 Success Criteria (25 min)

---

### Phase 3: User Interface

**Goal**: Users can view aggregated releases in a clean, chronological feed with proper GitHub markdown formatting and enriched project metadata.

**Depends on**: Phase 2

**Requirements**: DISP-01, DISP-02, DISP-03, DISP-04, DISP-05, DISP-06, DISP-07, PERF-02, PERF-04

**Success Criteria** (what must be TRUE):
1. User opens site and sees releases sorted newest-first
2. Release notes render with proper markdown (headers, lists, code blocks, links)
3. Each release shows project name from landscape (not "Release notes from X")
4. Each release shows project description and status badge (graduated/incubating)
5. Page loads in <2 seconds on typical broadband connection
6. Page is responsive and usable on mobile devices (320px width minimum)
7. User can click release title to open full release on GitHub

**Plans**: 3 plans

Plans:
- [x] 03-01-PLAN.md — Markdown rendering with GitHub-compatible formatting
- [x] 03-02-PLAN.md — Infinite scroll for performance optimization
- [x] 03-03-PLAN.md — Error banner and responsive design

---

### Phase 4: Search & Filtering

**Goal**: Users can quickly find specific releases using full-text search, filter by project/status/date, and navigate using vim-style keyboard shortcuts.

**Depends on**: Phase 3

**Requirements**: SRCH-01, SRCH-02, SRCH-03, SRCH-04, FILT-01, FILT-02, FILT-03, FILT-04, FILT-05, KBD-01, KBD-02, KBD-03, KBD-04, KBD-05

**Success Criteria** (what must be TRUE):
1. User types in search box and sees matching releases instantly (<300ms)
2. Search results highlight matching terms
3. Search works offline after initial page load (static index)
4. User selects project filter and sees only releases from that project (instant)
5. User selects status filter (graduated/incubating) and view updates instantly
6. User selects date range (7/30/90 days) and view updates instantly
7. User clicks "Clear filters" and returns to full unfiltered view
8. Filters apply client-side without page reload (<10ms)
9. User presses j/k to navigate down/up between releases (vim-style)
10. User presses Enter or o to open focused release in new tab
11. User presses / to focus search input
12. User presses ? to see keyboard shortcuts help modal
13. Keyboard shortcuts don't trigger when typing in input fields

**Plans**: 3 plans

Plans:
- [x] 04-01-PLAN.md — Pagefind search integration with term highlighting and offline support
- [x] 04-02-PLAN.md — Client-side filtering by project, status, and date range
- [x] 04-03-PLAN.md — Vim-style keyboard navigation with help modal

---

### Phase 5: Deployment & Automation

**Goal**: Site deploys automatically to GitHub Pages with daily scheduled builds that run reliably and provide clear success/failure feedback.

**Depends on**: Phase 4

**Requirements**: DEPLOY-01, DEPLOY-02, DEPLOY-03, DEPLOY-04, PERF-01, PERF-03, DEV-01, DEV-02, DEV-03, DEV-04, DEV-05

**Success Criteria** (what must be TRUE):
1. Push to main branch triggers automatic build and deployment to GitHub Pages
2. Site is accessible at https://castrojo.github.io/firehose/ within 5 minutes of push
3. GitHub Actions workflow runs daily at 6 AM UTC and publishes updated content
4. Failed builds send GitHub notification (workflow status)
5. Build completes in <2 minutes (within GitHub Actions free tier limits)
6. Developer can run `npm run dev` for local preview with live reload
7. Developer can add new feed by editing single config file (no code changes)
8. Build output shows progress indicators and final statistics (X feeds succeeded, Y failed, Z items processed)

**Plans**: TBD

Plans:
- [ ] TBD during phase planning

---

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Core Infrastructure | 8/8 | ✅ Complete | 2026-01-26 |
| 2. Multi-Feed Aggregation | 9/9 | ✅ Complete | 2026-01-26 |
| 3. User Interface | 3/3 | ✅ Complete | 2026-01-26 |
| 4. Search & Filtering | 3/3 | ✅ Complete | 2026-01-26 |
| 5. Deployment & Automation | 0/TBD | Not started | - |

---

## Rationale & Design Notes

### Phase 1 Rationale
Start with a single feed to validate the entire architecture (Astro + Content Layer API + custom loader + landscape integration) before scaling. This catches integration issues early when they're cheap to fix. Success means the foundation is solid.

### Phase 2 Rationale
Error handling is not an afterthought—it's THE critical feature for reliability at scale. With 100 feeds, something will always be broken (repo renamed, network blip, GitHub maintenance). Graceful degradation ensures the site stays useful even when feeds fail. This phase transforms a brittle prototype into a production-ready system.

### Phase 3 Rationale
Users don't care about our clever architecture—they care about seeing releases clearly. This phase delivers the core user value: browsing ecosystem activity with context. GitHub formatting is essential; plain text loses critical structure (code blocks, headers, lists) that make release notes readable.

### Phase 4 Rationale
With 1000+ releases, discovery becomes the bottleneck. Search handles "find releases mentioning X" queries. Filters handle "what did graduated projects ship last month" queries. Both must be instant (<300ms) to feel native. Static approaches (Pagefind + client-side JS) achieve this without backend complexity.

### Phase 5 Rationale
Automation is what makes this sustainable. Manual daily rebuilds are unsustainable; scheduled GitHub Actions runs are fire-and-forget. This phase transforms a demo into an operational service. Developer experience features ensure future maintainers can contribute without archaeologically decoding the build process.

### Complexity Estimates
- **Phase 1**: Medium (new architecture, but single feed limits scope)
- **Phase 2**: High (error handling has many edge cases)
- **Phase 3**: Medium (UI work is straightforward once data flows)
- **Phase 4**: Medium (Pagefind integration is well-documented; filters are standard JS)
- **Phase 5**: Low (GitHub Actions patterns are established)

### Research Confidence
All phases backed by HIGH confidence research (see `.planning/research/SUMMARY.md`). Technology stack validated against Astro v5 official docs, established libraries (rss-parser, js-yaml, Pagefind), and proven deployment patterns (GitHub Pages + Actions).

---

*Roadmap created: 2026-01-26*
*Last updated: 2026-01-26 after research completion*
