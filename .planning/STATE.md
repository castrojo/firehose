# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-26)

**Core value:** CNCF maintainers can discover all ecosystem releases in one place with proper formatting and project context
**Current focus:** Go port development - hybrid architecture (Go backend + Astro frontend)

## Current Position

Phase: Go Port Development (v2.0)
Status: Foundation complete, implementation in progress
Last activity: 2026-02-02 — Completed JSON schema design and Go project setup
Next: Implement and test Go CNCF Landscape fetcher

Backlog: All high-priority v1.x enhancements complete! All known bugs resolved.

Progress: v1.0 Milestone [██████████] 100% complete
         v1.4.1 Dark Mode Link Fix [██████████] 100% complete
         Go Port Architecture Docs [██████████] 100% complete (10 docs)
         Go Port Foundation [████░░░░░░] 40% complete (4/10 subtasks)

## v2.0: Go Port (In Progress)

**Completed:** 2026-02-02  
**Status:** 🚧 In Progress - Foundation complete, implementation starting

**Objective:** Port data aggregation pipeline from Node.js to Go for improved performance and reliability. Use hybrid architecture: Go backend (data pipeline) + Astro frontend (UI).

**Approach:**
- **Go handles:** Feed fetching, Landscape parsing, data enrichment, JSON output
- **Astro handles:** JSON import, UI rendering, search, filters, keyboard nav
- **Interface:** JSON file (`src/data/releases.json`) written by Go, read by Astro

**Expected Performance:**
- Current (Node.js): 10-15s build time
- Target (Go): 4-6s build time (60% reduction via goroutines)

### Completed Subtasks (4/10)

1. ✅ **firehose-lfy** - Document current Firehose architecture (BLOCKED firehose-1y6)
   - Created 10 comprehensive architecture docs (5,232 lines, 212KB)
   - Files: ARCHITECTURE.md, DATAFLOW.md, INTEGRATIONS.md, DEPLOYMENT.md, FEATURES.md, STACK.md, STRUCTURE.md, TESTING.md, BUILD-CACHING-STRATEGY.md, LANDSCAPE-SOURCE-OF-TRUTH.md
   - Location: `.planning/codebase/`
   - Provides complete reference for Go implementation

2. ✅ **firehose-cgd** - Design JSON schema for Go → Astro handoff
   - Created JSON-SCHEMA.md (21KB, 577 lines)
   - Defines contract: metadata object, releases array, feed status tracking
   - Includes Go struct tags, Astro TypeScript types, schema versioning
   - Location: `.planning/go-port/JSON-SCHEMA.md`

3. ✅ **firehose-8v8** - Set up Go project structure
   - Created firehose-go/ with standard Go layout
   - Implemented cmd/firehose/main.go (pipeline orchestration)
   - Created internal packages: feeds, landscape, models, output
   - Installed dependencies: gofeed v1.3.0, yaml.v3 v3.0.1
   - Build verified: `go build` succeeds ✅

4. ✅ **firehose-mvi** - Convert feeds.ts to feeds.yaml
   - Converted 231 feed URLs from JavaScript to YAML
   - Added category tagging (graduated/incubating/sandbox)
   - Location: `firehose-go/config/feeds.yaml`

### In Progress Subtasks (0/6)

5. ⏳ **firehose-umo** - Implement Go CNCF Landscape fetcher (NEXT)
   - Port src/lib/landscape.ts to Go
   - Fetch landscape.yml, parse 867 projects, build org/repo map
   - Status: Scaffolded, needs testing

6. ⏳ **firehose-p4p** - Implement Go parallel RSS feed fetcher
   - Port src/lib/feed-loader.ts to Go
   - Use goroutines for parallel fetching of 231 feeds
   - Implement retry logic, error handling, graceful degradation
   - Status: Scaffolded, needs testing

7. ⏳ **firehose-pxk** - Implement Go data enrichment and validation
   - Port enrichEntry() logic
   - Enrich with Landscape metadata, validate, generate IDs

8. ⏳ **firehose-8sz** - Implement Go JSON output writer
   - Marshal enriched releases to JSON
   - Write to ../src/data/releases.json

9. ⏳ **firehose-2w8** - Modify Astro to read JSON
   - Replace Content Layer with JSON import
   - Update index.astro, remove feed-loader.ts

10. ⏳ **firehose-4oq** - Update GitHub Actions workflow
    - Add Go installation step
    - Run Go pipeline before Astro build

### Testing & Documentation Subtasks (0/4)

11. ⏳ **firehose-9uk** - Test equivalence with Node.js pipeline
12. ⏳ **firehose-6bn** - Benchmark Go vs Node.js performance
13. ⏳ **firehose-cqo** - Update documentation for hybrid architecture
14. ⏳ **firehose-6xt** - Clean up unused Node.js dependencies

### Project Structure (New)

```
firehose-go/
├── README.md                         # Go pipeline documentation
├── cmd/firehose/main.go              # CLI entry point (4.1KB)
├── config/feeds.yaml                 # 231 feed URLs (468 lines)
├── go.mod                            # Go module definition
├── go.sum                            # Dependency checksums
├── internal/
│   ├── feeds/feeds.go                # Parallel feed fetching (6.2KB)
│   ├── landscape/landscape.go        # CNCF Landscape integration (5.2KB)
│   ├── models/models.go              # Data structures (4.5KB)
│   └── output/output.go              # Output utilities
└── firehose                          # Compiled binary (12MB)
```

### Files Modified/Created

**New Documentation:**
- `.planning/go-port/JSON-SCHEMA.md` (21KB)
- `firehose-go/README.md` (3.4KB)

**New Code:**
- `firehose-go/cmd/firehose/main.go` (126 lines)
- `firehose-go/internal/models/models.go` (128 lines)
- `firehose-go/internal/landscape/landscape.go` (143 lines)
- `firehose-go/internal/feeds/feeds.go` (194 lines)
- `firehose-go/internal/output/output.go` (3 lines stub)
- `firehose-go/config/feeds.yaml` (468 lines)
- `firehose-go/go.mod` + `firehose-go/go.sum`

**Total:** ~800 lines of Go code, 21KB documentation

### Commits

1. `f9ce10f` - Archive obsolete osmosfeed docs + foundational docs (ARCHITECTURE.md, DATAFLOW.md, etc.)
2. `e52daa8` - Complete architecture documentation (Wave 3-4)
3. `5c8cd3b` - Sync beads issue tracking
4. `d0b321b` - Update AGENTS.md and add .gitattributes
5. `40c36ad` - Set up Go project structure and convert feed config to YAML

**All commits pushed to origin/main ✅**

### Known Issues

None currently. Go project builds successfully but runtime behavior not yet tested.

### Next Steps (Prioritized)

1. **Test Go Landscape fetcher** (firehose-umo)
   - Run Go pipeline: `cd firehose-go && ./firehose`
   - Verify Landscape fetch succeeds
   - Check org/repo mapping works correctly

2. **Test Go feed fetcher** (firehose-p4p)
   - Verify 231 feeds fetch in parallel
   - Check error handling and graceful degradation
   - Measure performance vs Node.js

3. **Complete data enrichment** (firehose-pxk)
   - Test Landscape metadata enrichment
   - Verify all required fields present

4. **Generate JSON and test Astro** (firehose-8sz + firehose-2w8)
   - Write JSON to src/data/releases.json
   - Modify Astro to import JSON
   - Verify UI still works

## Architecture Documentation Status

**Location:** `.planning/codebase/`

All 10 architecture documents are complete and up-to-date:

1. ✅ **ARCHITECTURE.md** (26KB) - Overall system design, build-time SSG, 8 layers
2. ✅ **DATAFLOW.md** (35KB) - Step-by-step data pipeline with ASCII diagrams
3. ✅ **INTEGRATIONS.md** (27KB) - External APIs (CNCF Landscape, GitHub feeds, Pagefind)
4. ✅ **DEPLOYMENT.md** (33KB) - GitHub Actions workflow, troubleshooting
5. ✅ **FEATURES.md** (11KB) - 10 core features, performance metrics
6. ✅ **STACK.md** (9.5KB) - Astro v5, dependencies, Go equivalents
7. ✅ **STRUCTURE.md** (14KB) - 27 source files, code organization
8. ✅ **TESTING.md** (15KB) - Testing strategy, recommended tools
9. ✅ **BUILD-CACHING-STRATEGY.md** (11KB) - No caching rationale, trade-offs
10. ✅ **LANDSCAPE-SOURCE-OF-TRUTH.md** (9.7KB) - Why CNCF Landscape is authoritative

**Archived:** 7 obsolete osmosfeed-era docs in `.planning/archive/osmosfeed-era/`

## Go Port Documentation Status

**Location:** `.planning/go-port/`

1. ✅ **JSON-SCHEMA.md** (21KB) - Go → Astro data contract, struct tags, TypeScript types

**TODO:**
- GO-ARCHITECTURE.md (after implementation complete)
- PERFORMANCE.md (after benchmarking)

## Accumulated Context

### Key Decisions

**v1.x Architecture (Astro v5):**
- Build-time aggregation with Astro Content Layer API
- Custom RSS loader with parallel fetching
- CNCF Landscape integration for project metadata
- Static site generation (no runtime backend)
- Client-side search (Pagefind), filters, keyboard nav
- Daily automated builds (GitHub Actions at 6 AM UTC)

**v2.0 Architecture (Go + Astro Hybrid):**
- Go handles data pipeline (feed fetching, parsing, enrichment)
- Astro handles UI rendering (import JSON, render components)
- JSON file as interface (src/data/releases.json)
- Expected 60% performance improvement (10-15s → 4-6s builds)
- Goroutines for true parallel execution
- Keep all existing UI features unchanged

### Technology Stack

**Current (v1.x):**
- Astro v5.16+ (SSG framework)
- Node.js 20 LTS (runtime)
- rss-parser v3.x (feed parsing)
- js-yaml v4.x (YAML parsing)
- marked v17.x (markdown rendering)
- Pagefind v1.x (static search)

**Future (v2.0):**
- **Backend:** Go 1.25+ (data pipeline)
- **Frontend:** Astro v5.16+ (UI rendering, unchanged)
- **Go Dependencies:** gofeed v1.3.0, yaml.v3 v3.0.1
- **Removed:** rss-parser, js-yaml (replaced by Go)
- **Kept:** marked, Pagefind, Astro (UI layer unchanged)

### Performance Metrics (Current)

**Feed Aggregation:**
- 231 feeds from 160 CNCF projects (69% of 240 total CNCF projects)
- ~612 releases per build
- 867 Landscape projects indexed
- 100% feed success rate (recent builds)

**Build Performance:**
- Total build time: 10-15s
  - Landscape fetch: ~1s
  - Feed fetching: 8-10s (parallel, Node.js Promise.allSettled)
  - Rendering: 2-3s
  - Search indexing: 2s
- GitHub Actions quota: 0.38% per day (daily builds)

**Expected with Go:**
- Total build time: 4-6s (60% reduction)
  - Landscape fetch: ~0.5-1s
  - Feed fetching: 3-5s (goroutines, true parallelism)
  - Rendering: 2-3s (unchanged)
  - Search indexing: 2s (unchanged)

## Session Continuity

**Last session:** 2026-02-02 15:00-15:10 UTC  
**Stopped at:** Go project setup complete, ready to test implementation  
**Resume file:** `firehose-go/internal/landscape/landscape.go` (needs runtime testing)  
**Next step:** Run Go pipeline and verify Landscape fetch works correctly

**Command to resume:**
```bash
cd firehose-go
./firehose  # Test current implementation
# Expected: Landscape fetch should work, feed fetch needs debugging
```

**Open tasks:** 10 remaining subtasks in firehose-1y6 (Go port)
**Beads tracking:** bd ready → shows 3 ready tasks (umo, p4p, 2w8)
