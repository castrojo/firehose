---
quick_task: 005
type: execute
wave: 1
depends_on: []
files_modified:
  - src/config/feeds.ts
autonomous: true

must_haves:
  truths:
    - "Sandbox projects display with blue 'sandbox' label"
    - "Filter dropdown includes 'sandbox' as a status option"
    - "Sandbox project releases appear in the feed"
  artifacts:
    - path: "src/config/feeds.ts"
      provides: "Sandbox project feed URLs"
      min_lines: 150
  key_links:
    - from: "src/config/feeds.ts"
      to: "GitHub releases"
      via: "Atom feed URLs"
      pattern: "github\\.com/.*/releases\\.atom"
---

<objective>
Add all CNCF sandbox projects to the feed by identifying sandbox projects from the CNCF landscape and adding their GitHub release Atom feeds to the configuration.

Purpose: Expand The Firehose to include all sandbox-stage CNCF projects, giving maintainers visibility into early-stage project releases.

Output: Updated feed configuration with sandbox projects, functional sandbox status labels, and sandbox filter option.
</objective>

<execution_context>
@~/.config/opencode/get-shit-done/workflows/execute-plan.md
@~/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@src/config/feeds.ts
@src/lib/landscape.ts
@src/components/ReleaseCard.astro
@src/components/FilterBar.astro
</context>

<tasks>

<task type="auto">
  <name>Fetch sandbox projects from CNCF landscape and add feeds</name>
  <files>src/config/feeds.ts</files>
  <action>
1. Use the github-mcp-server to fetch the CNCF landscape.yml file:
   - Tool: `github-mcp-server-get_file_contents`
   - Parameters: owner:cncf, repo:landscape, path:landscape.yml
   
2. Parse the landscape.yml to identify all projects where `project: sandbox`
   - Extract project name and repo_url fields
   - Filter for projects with valid GitHub repo URLs
   
3. Add all sandbox project Atom feed URLs to src/config/feeds.ts:
   - Create a new section: `// CNCF Sandbox Projects`
   - Format: `{ url: 'https://github.com/org/repo/releases.atom' }`
   - Place section after Incubating projects, before the closing array bracket
   - Alphabetize sandbox projects by org/repo for maintainability
   
4. Update the file comment header to reflect new count (currently "62 projects" → update to actual total)

NOTES:
- The landscape enrichment (src/lib/landscape.ts) already supports "sandbox" status (line 84)
- ReleaseCard.astro already has sandbox label styling (lines 139-142: blue background #ddf4ff)
- FilterBar.astro dynamically reads statuses from actual release data, so no changes needed
- Only add projects with valid GitHub repositories (github.com URLs)
- Some projects may not have GitHub releases - that's OK, the loader handles empty feeds gracefully
</action>
  <verify>
1. Run `npm run build` - build should succeed with more feeds processed
2. Check build logs for "Fetching feeds..." and count of successful/failed feeds
3. Search output: `grep -i sandbox` in build logs to confirm sandbox projects detected
4. Start preview: `.dev-tools/restart-preview.sh`
5. Visit http://localhost:4321/firehose/ and verify:
   - Sandbox projects appear with blue "sandbox" labels
   - Status filter dropdown shows "sandbox" option (dynamically added)
   - Filtering by "sandbox" shows only sandbox projects
   - No JavaScript errors in console
</verify>
  <done>
- src/config/feeds.ts contains new "CNCF Sandbox Projects" section with all sandbox project feeds
- Build completes successfully with increased feed count
- Sandbox releases display with blue status labels
- Status filter includes "sandbox" option and filters correctly
- No errors in build or browser console
</done>
</task>

</tasks>

<verification>
**Manual verification:**
1. Build succeeds with more feeds (62 → 62 + N sandbox projects)
2. Preview shows sandbox projects with blue labels
3. Status filter dropdown includes "sandbox"
4. Filtering by sandbox works correctly
5. No console errors

**Regression checks:**
1. Graduated and incubating projects still work
2. All existing filters still function
3. Keyboard navigation still works
4. Search still works
</verification>

<success_criteria>
- [x] All sandbox projects from CNCF landscape added to feeds.ts
- [x] Feed count comment updated in feeds.ts
- [x] Build completes successfully
- [x] Sandbox releases visible in feed with blue labels
- [x] "sandbox" appears in status filter dropdown
- [x] Filtering by sandbox status works correctly
- [x] No build or runtime errors
- [x] Existing functionality (graduated/incubating) unchanged
</success_criteria>

<output>
After completion, create `.planning/quick/005-add-all-sandbox-projects-from-cncf-lands/005-SUMMARY.md` with:
- Count of sandbox projects added
- Total feed count (graduated + incubating + sandbox)
- Any sandbox projects skipped (if no GitHub repo or invalid URL)
- Verification results
- Build performance impact (if any)
</output>
