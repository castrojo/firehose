# Phase 1 Plans: Core Infrastructure

**Phase Goal**: Establish foundational Astro project with a working custom RSS loader that can fetch a single feed, parse it reliably, and enrich entries with CNCF landscape metadata.

**Success Criteria**:
1. Developer can run `npm run build` and Astro successfully fetches one test feed (e.g., dapr/dapr releases)
2. Feed entries are enriched with project name, description, and status from landscape.yml
3. Build output shows TypeScript types working (no type errors)
4. Feed entries validate against Zod schema, invalid entries are skipped
5. Landscape.yml parsing uses js-yaml library (no regex) and extracts correct project metadata

---

## Plan 1.1: Initialize Astro v5 Project with TypeScript

**Objective**: Set up a new Astro v5 project with TypeScript support and verify basic build works.

**Why this first**: Need a working Astro foundation before adding custom loaders and content collections.

**Tasks**:
1. Run `npm create astro@latest` to initialize new Astro v5 project
   - Choose "Empty" template
   - Enable TypeScript (strict mode)
   - Skip install initially (we'll add dependencies next)
2. Install dependencies: `npm install`
3. Verify basic build works: `npm run build`
4. Verify dev server works: `npm run dev` (quick smoke test)
5. Create `.gitignore` entries for Astro build artifacts if not present:
   - `dist/`
   - `.astro/`
   - `node_modules/`

**Acceptance Criteria**:
- [ ] `npm run build` completes successfully
- [ ] `npm run dev` starts development server
- [ ] No TypeScript errors in output
- [ ] `dist/` directory created with build artifacts

**Estimated Duration**: 15 minutes

**Risks**: None (standard Astro setup)

---

## Plan 1.2: Install RSS and YAML Parsing Libraries

**Objective**: Add rss-parser and js-yaml dependencies with TypeScript types.

**Why this now**: Need these libraries available before writing the custom loader.

**Tasks**:
1. Install rss-parser: `npm install rss-parser`
2. Install js-yaml: `npm install js-yaml`
3. Install TypeScript types: `npm install --save-dev @types/js-yaml`
4. Verify imports work by creating a temporary test file:
   ```typescript
   import Parser from 'rss-parser';
   import yaml from 'js-yaml';
   console.log('Imports successful');
   ```
5. Run `npm run build` to verify no import errors
6. Remove test file

**Acceptance Criteria**:
- [ ] Dependencies installed in package.json
- [ ] TypeScript can resolve types for both libraries
- [ ] Build completes with no import errors

**Estimated Duration**: 10 minutes

**Risks**: None (well-established packages)

---

## Plan 1.3: Create TypeScript Types and Zod Schemas

**Objective**: Define TypeScript types and Zod validation schemas for feed entries and landscape data.

**Why this now**: Schemas must exist before custom loader implementation for type safety.

**Tasks**:
1. Install Zod: `npm install zod`
2. Create `src/lib/types.ts` with:
   - `ReleaseEntry` interface (title, link, pubDate, content, etc.)
   - `LandscapeProject` interface (name, description, status, repo_url, etc.)
   - `EnrichedEntry` interface (combines ReleaseEntry + landscape metadata)
3. Create `src/lib/schemas.ts` with Zod schemas:
   - `releaseEntrySchema` matching ReleaseEntry interface
   - `landscapeProjectSchema` matching LandscapeProject interface
   - Include proper validation (URLs are valid, dates are parsable, required fields present)
4. Add JSDoc comments explaining each field
5. Run `npm run build` to verify TypeScript compilation

**Acceptance Criteria**:
- [ ] Type definitions cover all required fields from requirements (FEED-01, FEED-02)
- [ ] Zod schemas include validation rules (required fields, format checks)
- [ ] TypeScript compilation succeeds
- [ ] Schemas export correctly for use in loader

**Estimated Duration**: 30 minutes

**Risks**: Low (straightforward type definition)

---

## Plan 1.4: Implement CNCF Landscape Fetcher and Parser

**Objective**: Create utility function that fetches landscape.yml and parses it into structured data using js-yaml.

**Why this now**: Landscape data is needed by the loader to enrich feed entries.

**Tasks**:
1. Create `src/lib/landscape.ts` with:
   - `fetchLandscapeData()` function that fetches raw YAML from GitHub
   - `parseLandscapeYaml(yamlText)` function using js-yaml
   - `createProjectMap(projects)` that creates org/repo → project lookup
2. Implement parsing logic following AGENTS.md indentation rules:
   - Extract `name`, `repo_url`, `project` (status), `homepage_url`
   - Extract `extra.summary_use_case` for description
   - Handle multi-line YAML content correctly
3. Add error handling for network failures and parse errors
4. Export `getLandscapeProjects()` that returns Map<string, LandscapeProject>
5. Create simple test script to verify parsing:
   ```typescript
   import { getLandscapeProjects } from './lib/landscape.ts';
   const projects = await getLandscapeProjects();
   console.log(`Parsed ${projects.size} projects`);
   console.log('Dapr project:', projects.get('dapr/dapr'));
   ```
6. Run test script and verify output shows correct data

**Acceptance Criteria**:
- [ ] Function successfully fetches landscape.yml from GitHub
- [ ] js-yaml parses YAML without errors (no regex parsing)
- [ ] Resulting Map contains 100+ projects
- [ ] Test lookup for 'dapr/dapr' returns correct name and description
- [ ] TypeScript types match landscapeProjectSchema

**Estimated Duration**: 45 minutes

**Risks**: Medium (YAML structure complexity, but well-documented in AGENTS.md)

---

## Plan 1.5: Create Custom RSS Loader for Content Layer API

**Objective**: Implement Astro Content Layer custom loader that fetches one RSS feed, parses it, and enriches with landscape data.

**Why this now**: This is the core integration point bringing together all previous components.

**Tasks**:
1. Create `src/loaders/rss-loader.ts`
2. Implement loader function following Astro v5 Content Layer API:
   ```typescript
   import { z } from 'astro:content';
   import Parser from 'rss-parser';
   import { getLandscapeProjects } from '../lib/landscape.ts';
   
   export function rssLoader(feedUrl: string) {
     return {
       async load({ store }) {
         // Fetch landscape data
         // Fetch RSS feed using rss-parser
         // Match feed to landscape project (extract org/repo from URL)
         // Enrich each entry with project metadata
         // Validate with Zod schema
         // Store entries using store.set()
       }
     }
   }
   ```
3. Implement feed URL → org/repo extraction:
   - Parse GitHub URLs to extract organization and repository
   - Use as key to lookup in landscape Map
4. Implement entry enrichment:
   - Add projectName, projectDescription, projectStatus from landscape
   - Add feedStatus: 'success' | 'error'
   - Preserve original feed data (title, link, pubDate, content)
5. Add Zod validation using releaseEntrySchema:
   - Skip invalid entries with warning log
   - Count skipped entries
6. Add logging for debugging:
   - Log feed fetch start/complete
   - Log number of entries processed
   - Log validation failures

**Acceptance Criteria**:
- [ ] Loader follows Astro Content Layer API signature
- [ ] Successfully fetches and parses RSS feed using rss-parser
- [ ] Correctly matches feed to landscape project by org/repo
- [ ] Enriches entries with landscape metadata
- [ ] Validates entries with Zod, skips invalid ones
- [ ] Returns properly structured data for Astro

**Estimated Duration**: 60 minutes

**Risks**: Medium (Content Layer API is new in Astro v5, requires careful API adherence)

---

## Plan 1.6: Configure Content Collection with Custom Loader

**Objective**: Set up Astro content collection that uses the custom RSS loader to fetch a single test feed (dapr/dapr).

**Why this now**: This wires the loader into Astro's build process.

**Tasks**:
1. Create `src/content/config.ts`:
   ```typescript
   import { defineCollection } from 'astro:content';
   import { releaseEntrySchema } from '../lib/schemas';
   import { rssLoader } from '../loaders/rss-loader';
   
   const releases = defineCollection({
     loader: rssLoader('https://github.com/dapr/dapr/releases.atom'),
     schema: releaseEntrySchema
   });
   
   export const collections = { releases };
   ```
2. Run `npm run build` and verify:
   - Loader executes during build
   - Feed is fetched successfully
   - Entries are processed and stored
   - Build completes without errors
3. Check build output for expected logs:
   - "Fetching landscape data..."
   - "Fetching feed from https://github.com/dapr/dapr/releases.atom"
   - "Processed X entries"

**Acceptance Criteria**:
- [ ] Content collection properly configured
- [ ] Build executes loader and fetches feed
- [ ] No TypeScript errors
- [ ] Build output shows successful feed processing
- [ ] Astro's internal content store contains feed entries

**Estimated Duration**: 20 minutes

**Risks**: Low (straightforward configuration)

---

## Plan 1.7: Create Minimal Test Page to Query Collection

**Objective**: Build a simple Astro page that queries the releases collection and displays data to verify everything works end-to-end.

**Why this now**: This is the final verification that all components integrate correctly.

**Tasks**:
1. Create `src/pages/index.astro`:
   ```astro
   ---
   import { getCollection } from 'astro:content';
   const releases = await getCollection('releases');
   ---
   <html>
   <head><title>Firehose Test</title></head>
   <body>
     <h1>Releases ({releases.length})</h1>
     <ul>
       {releases.map(release => (
         <li>
           <strong>{release.data.projectName}</strong>: {release.data.title}
           <br><small>{release.data.projectDescription}</small>
         </li>
       ))}
     </ul>
   </body>
   </html>
   ```
2. Run `npm run build`
3. Serve built site: `cd dist && python3 -m http.server 8080`
4. Open browser to http://localhost:8080
5. Verify page displays:
   - Project name from landscape (e.g., "Dapr")
   - Release titles from feed
   - Project descriptions from landscape
   - Correct count of releases

**Acceptance Criteria**:
- [ ] Page builds successfully
- [ ] Page displays at least 10 releases (dapr is active)
- [ ] Project name shows "Dapr" (from landscape, not "Release notes from dapr")
- [ ] Project description is present and accurate
- [ ] No console errors in browser
- [ ] TypeScript types work correctly in Astro component

**Estimated Duration**: 20 minutes

**Risks**: Low (simple display logic)

---

## Plan 1.8: Verify Success Criteria and Document

**Objective**: Systematically verify all Phase 1 success criteria are met and document the results.

**Why this now**: Ensures phase completion is objective and traceable.

**Tasks**:
1. Run through success criteria checklist:
   - ✓ Developer can run `npm run build` and Astro successfully fetches one test feed
   - ✓ Feed entries are enriched with project name, description, and status from landscape.yml
   - ✓ Build output shows TypeScript types working (no type errors)
   - ✓ Feed entries validate against Zod schema, invalid entries are skipped
   - ✓ Landscape.yml parsing uses js-yaml library (no regex) and extracts correct project metadata
2. Create `PHASE_1_COMPLETION.md` documenting:
   - Success criteria verification (with evidence)
   - Key files created and their purpose
   - How to test the implementation
   - Known issues or limitations
   - Next steps for Phase 2
3. Update `.planning/ROADMAP.md`:
   - Mark Phase 1 as complete
   - Update progress table
4. Update `.planning/STATE.md`:
   - Set current phase to 2
   - Update metrics

**Acceptance Criteria**:
- [ ] All 5 success criteria verified as met
- [ ] Documentation created
- [ ] Planning files updated
- [ ] Ready to proceed to Phase 2

**Estimated Duration**: 20 minutes

**Risks**: None

---

## Plan Summary

| Plan | Objective | Duration | Depends On |
|------|-----------|----------|------------|
| 1.1 | Initialize Astro v5 Project | 15 min | - |
| 1.2 | Install RSS/YAML Libraries | 10 min | 1.1 |
| 1.3 | Create Types and Schemas | 30 min | 1.2 |
| 1.4 | Implement Landscape Parser | 45 min | 1.2, 1.3 |
| 1.5 | Create Custom RSS Loader | 60 min | 1.3, 1.4 |
| 1.6 | Configure Content Collection | 20 min | 1.5 |
| 1.7 | Create Test Page | 20 min | 1.6 |
| 1.8 | Verify & Document | 20 min | 1.7 |

**Total Estimated Duration**: 3 hours 40 minutes

**Critical Path**: 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6 → 1.7 → 1.8

**Key Risks**:
- Content Layer API integration (Plan 1.5) - NEW in Astro v5, requires careful adherence to API
- YAML parsing complexity (Plan 1.4) - Mitigated by using js-yaml and detailed AGENTS.md guidance

**Next Phase Preview**: Phase 2 will scale this to ~100 feeds with error handling using Promise.allSettled()
