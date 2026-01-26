# Requirements: The Firehose (Astro Rebuild)

**Defined:** 2026-01-26
**Core Value:** CNCF maintainers can discover all ecosystem releases in one place with proper formatting and project context

## v1 Requirements

Requirements for initial Astro rebuild. Includes all core functionality with graduated + incubating CNCF projects.

### Feed Aggregation

- [ ] **FEED-01**: System fetches RSS feeds from ~100 CNCF project GitHub release feeds at build time
- [ ] **FEED-02**: System parses both RSS 2.0 and Atom 1.0 feed formats
- [ ] **FEED-03**: System fetches feeds in parallel to minimize build time
- [ ] **FEED-04**: System handles network errors gracefully without failing entire build
- [ ] **FEED-05**: System retries transient failures (5xx, timeouts) with exponential backoff
- [ ] **FEED-06**: System skips permanent failures (404, 403) without retry

### CNCF Landscape Integration

- [ ] **LAND-01**: System fetches CNCF landscape.yml at build time
- [ ] **LAND-02**: System parses landscape.yml using proper YAML library (not regex)
- [ ] **LAND-03**: System matches feed URLs to landscape projects by GitHub repo
- [ ] **LAND-04**: System enriches feed entries with project name from landscape
- [ ] **LAND-05**: System enriches feed entries with project description from landscape
- [ ] **LAND-06**: System enriches feed entries with project status (graduated/incubating)

### Display & Formatting

- [ ] **DISP-01**: User sees releases in chronological order (newest first)
- [ ] **DISP-02**: User sees GitHub release notes rendered exactly as they appear on GitHub (markdown with code blocks, tables, headers, lists)
- [ ] **DISP-03**: User sees project name (not "Release notes from X")
- [ ] **DISP-04**: User sees project description
- [ ] **DISP-05**: User sees project status badge (graduated/incubating)
- [ ] **DISP-06**: User sees publication date in human-readable format
- [ ] **DISP-07**: User can click release title to view full release on GitHub

### Search Functionality

- [ ] **SRCH-01**: User can search release content by keyword
- [ ] **SRCH-02**: Search returns results instantly (<300ms)
- [ ] **SRCH-03**: Search highlights matching terms in results
- [ ] **SRCH-04**: Search works offline after initial page load

### Filtering Functionality

- [ ] **FILT-01**: User can filter releases by project name
- [ ] **FILT-02**: User can filter releases by project status (graduated/incubating)
- [ ] **FILT-03**: User can filter releases by date range (last 7/30/90 days)
- [ ] **FILT-04**: User can clear all filters to return to full view
- [ ] **FILT-05**: Filters apply instantly without page reload (<10ms)

### Keyboard Navigation

- [ ] **KBD-01**: User can navigate between releases using j/k keys (vim-style down/up)
- [ ] **KBD-02**: User can open focused release in new tab using Enter or o
- [ ] **KBD-03**: User can focus search input using / key
- [ ] **KBD-04**: User can see keyboard shortcuts help with ? key
- [ ] **KBD-05**: Keyboard shortcuts don't interfere with typing in inputs

### Error Handling & Visibility

- [ ] **ERR-01**: User sees error banner when feeds fail to load
- [ ] **ERR-02**: Error banner lists which projects failed with error message
- [ ] **ERR-03**: Error banner shows timestamp of last attempt
- [ ] **ERR-04**: Failed feeds don't prevent display of successful feeds
- [ ] **ERR-05**: Build logs show detailed error information for debugging
- [ ] **ERR-06**: Build fails only if ALL feeds fail (catastrophic failure)

### Data Validation & Type Safety

- [ ] **VALID-01**: System validates feed entries against Zod schema
- [ ] **VALID-02**: System skips entries missing required fields (title, link)
- [ ] **VALID-03**: System logs validation failures without blocking build
- [ ] **VALID-04**: System provides TypeScript types for all feed data

### Performance

- [ ] **PERF-01**: Build completes in <2 minutes (acceptable for daily builds)
- [ ] **PERF-02**: Initial page load completes in <2 seconds
- [ ] **PERF-03**: Search index loads incrementally (<100KB initial chunk)
- [ ] **PERF-04**: Page works on mobile devices (responsive design)

### Deployment

- [ ] **DEPLOY-01**: Site deploys to GitHub Pages automatically on push to main
- [ ] **DEPLOY-02**: Site rebuilds daily via GitHub Actions scheduled workflow
- [ ] **DEPLOY-03**: Scheduled builds run at 6 AM UTC (off-peak for users)
- [ ] **DEPLOY-04**: Failed builds send notification (GitHub Actions failure)

### Developer Experience

- [ ] **DEV-01**: Developer can run local build with `npm run build`
- [ ] **DEV-02**: Developer can preview site locally with `npm run dev`
- [ ] **DEV-03**: Developer can add new feed by editing config file
- [ ] **DEV-04**: Build provides clear progress indicators for feed fetching
- [ ] **DEV-05**: Build provides summary statistics (success/failure counts)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Sandbox Projects

- **SAND-01**: System includes sandbox CNCF projects (~150 additional feeds)
- **SAND-02**: User can filter to show/hide sandbox projects
- **SAND-03**: System handles >250 total feeds without performance degradation

### Advanced Filtering

- **FILT-06**: User can save filter preferences across sessions
- **FILT-07**: User can share filtered view via URL parameters
- **FILT-08**: User can create custom project groups

### Enhanced Display

- **DISP-08**: User sees project logo/icon next to name
- **DISP-09**: User sees release notes syntax highlighted
- **DISP-10**: User can expand/collapse long release notes

### Analytics & Monitoring

- **MON-01**: System tracks page views (privacy-friendly analytics)
- **MON-02**: System tracks search queries for UX improvement
- **MON-03**: Admin dashboard shows feed health metrics
- **MON-04**: System alerts on sustained feed failures (>3 days)

### Content Enrichment

- **ENR-01**: System detects breaking changes in release notes
- **ENR-02**: System categorizes releases (major/minor/patch)
- **ENR-03**: System links CVE mentions to security databases

## Out of Scope

| Feature | Reason |
|---------|--------|
| User accounts/authentication | Static site, no backend; personalization not core value |
| Real-time updates | Daily builds sufficient; CNCF releases infrequent |
| Comment/discussion threads | Read-only aggregator; discussion happens on GitHub |
| RSS feed output | Users can subscribe to individual project feeds directly |
| Email notifications | Out of scope for static site; users can use GitHub watch |
| Custom feed sources (blogs, Twitter) | GitHub releases only; focus on release notes not announcements |
| Mobile native app | Web-first with responsive design sufficient |
| Dark mode (v1) | Nice-to-have, defer to v2 |
| Internationalization | English only; CNCF releases are in English |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FEED-01 | Phase 1 | Pending |
| FEED-02 | Phase 1 | Pending |
| LAND-01 | Phase 1 | Pending |
| LAND-02 | Phase 1 | Pending |
| LAND-03 | Phase 1 | Pending |
| LAND-04 | Phase 1 | Pending |
| LAND-05 | Phase 1 | Pending |
| LAND-06 | Phase 1 | Pending |
| VALID-01 | Phase 1 | Pending |
| VALID-02 | Phase 1 | Pending |
| VALID-04 | Phase 1 | Pending |
| FEED-03 | Phase 2 | Pending |
| FEED-04 | Phase 2 | Pending |
| FEED-05 | Phase 2 | Pending |
| FEED-06 | Phase 2 | Pending |
| ERR-01 | Phase 2 | Pending |
| ERR-02 | Phase 2 | Pending |
| ERR-03 | Phase 2 | Pending |
| ERR-04 | Phase 2 | Pending |
| ERR-05 | Phase 2 | Pending |
| ERR-06 | Phase 2 | Pending |
| VALID-03 | Phase 2 | Pending |
| DISP-01 | Phase 3 | Pending |
| DISP-02 | Phase 3 | Pending |
| DISP-03 | Phase 3 | Pending |
| DISP-04 | Phase 3 | Pending |
| DISP-05 | Phase 3 | Pending |
| DISP-06 | Phase 3 | Pending |
| DISP-07 | Phase 3 | Pending |
| PERF-02 | Phase 3 | Pending |
| PERF-04 | Phase 3 | Pending |
| SRCH-01 | Phase 4 | Pending |
| SRCH-02 | Phase 4 | Pending |
| SRCH-03 | Phase 4 | Pending |
| SRCH-04 | Phase 4 | Pending |
| FILT-01 | Phase 4 | Pending |
| FILT-02 | Phase 4 | Pending |
| FILT-03 | Phase 4 | Pending |
| FILT-04 | Phase 4 | Pending |
| FILT-05 | Phase 4 | Pending |
| KBD-01 | Phase 4 | Pending |
| KBD-02 | Phase 4 | Pending |
| KBD-03 | Phase 4 | Pending |
| KBD-04 | Phase 4 | Pending |
| KBD-05 | Phase 4 | Pending |
| DEPLOY-01 | Phase 5 | Pending |
| DEPLOY-02 | Phase 5 | Pending |
| DEPLOY-03 | Phase 5 | Pending |
| DEPLOY-04 | Phase 5 | Pending |
| PERF-01 | Phase 5 | Pending |
| PERF-03 | Phase 5 | Pending |
| DEV-01 | Phase 5 | Pending |
| DEV-02 | Phase 5 | Pending |
| DEV-03 | Phase 5 | Pending |
| DEV-04 | Phase 5 | Pending |
| DEV-05 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 54 total
- Mapped to phases: 54
- Unmapped: 0 ✓

---
*Requirements defined: 2026-01-26*
*Last updated: 2026-01-26 after adding keyboard shortcuts (KBD-01 through KBD-05)*
