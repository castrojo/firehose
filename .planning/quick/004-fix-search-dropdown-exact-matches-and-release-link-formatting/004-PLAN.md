---
phase: quick-004
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/SearchBar.astro
autonomous: true

must_haves:
  truths:
    - "Typing 'cilium' shows only Cilium project and Cilium releases"
    - "No results from other projects appear when searching specific project"
    - "Release links in dropdown show project name prefix (e.g., 'Cilium 1.17.12')"
  artifacts:
    - path: "src/components/SearchBar.astro"
      provides: "Search dropdown with exact project matching and prefixed release titles"
      min_lines: 400
  key_links:
    - from: "SearchBar search input"
      to: "Filtered results (projects + releases)"
      via: "performSearch() with exact project scope"
      pattern: "performSearch.*query"
---

<objective>
Fix search dropdown to show only exact project matches (not partial matches from other projects) and add project name prefix to release links in dropdown results.

**Purpose:** Users typing a project name should only see that project's results, and release links should clearly identify which project they belong to.

**Output:** SearchBar.astro with improved filtering logic and prefixed release titles.
</objective>

<execution_context>
@~/.config/opencode/get-shit-done/workflows/execute-plan.md
@~/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/components/SearchBar.astro

## Current Implementation

SearchBar shows a dropdown with:
1. **Project names** (clickable to filter)
2. **No release links currently** (user wants this added)

## Problems

**Problem 1: Partial matching confusion**
- User types "cilium"
- Dropdown shows "Cilium" (correct)
- But also shows "Dragonfly" (WRONG)
- Root cause: Need to investigate why unrelated projects appear

**Problem 2: No release links in dropdown**
- Currently dropdown only shows project names
- User wants to see individual releases
- But release links must show project prefix: "Cilium 1.17.12" not just "1.17.12"

## Solution Approach

**For Problem 1:**
- Investigate current filtering logic (line 88: `projectName.toLowerCase().includes(queryLower)`)
- Ensure ONLY projects matching the query appear
- May need stricter matching or bug fix

**For Problem 2:**
- Add release titles to dropdown results
- Group by project: Show project name, then its releases
- Format: `{ProjectName} {ReleaseVersion}`
- Link to release URL (open in new tab)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix exact project matching and add release links to dropdown</name>
  <files>src/components/SearchBar.astro</files>
  <action>
1. **Investigate and fix partial matching issue:**
   - Review why unrelated projects appear in results
   - Current logic: `projectName.toLowerCase().includes(queryLower)` (line 88)
   - This should be correct - investigate if there's a data issue or bug
   - Test with "cilium" query - ensure ONLY Cilium appears

2. **Add release links to dropdown with project prefixes:**
   - Modify `performSearch()` to collect matching releases, not just project names
   - For each matching project, fetch its releases from `.release-card[data-project="{projectName}"]`
   - Extract release title from card (look for `.release-title` or `h3` element)
   - Format display as: `{ProjectName} {ReleaseTitle}` (e.g., "Cilium 1.17.12")
   - Group results: Show project name header, then its releases below
   - Make releases clickable (extract `href` from release card link)
   - Limit to 5 releases per project to avoid overwhelming dropdown

3. **Update dropdown HTML structure:**
   - Project header: Bold, not clickable (just label)
   - Release items: Indented, clickable links
   - On release click: Open release URL in new tab
   - Keep existing project filtering behavior (clicking project name still applies filter)

4. **Update styles:**
   - Add styles for release items (indented, smaller font)
   - Add styles for project headers (bold, gray background)
   - Ensure release links are clearly clickable (hover effect)

**Why this approach:**
- Exact matching: Only show projects whose names contain the query
- Project prefixes: Make release ownership clear in dropdown
- Grouped display: Visual hierarchy (project → releases)
- Limit releases: Prevent dropdown overflow
  </action>
  <verify>
```bash
npm run build && npm run preview
# Test scenarios:
# 1. Type "cilium" - should show ONLY Cilium project and releases
# 2. Type "kube" - should show Kubernetes, KubeEdge, etc. (multiple projects OK)
# 3. Check release links show project prefix: "Cilium 1.17.12"
# 4. Click release link - should open release in new tab
# 5. Check no JavaScript errors in browser console
```
  </verify>
  <done>
- [ ] Typing "cilium" shows only Cilium project and its releases (no Dragonfly or other projects)
- [ ] Release links display with project name prefix (e.g., "Cilium 1.17.12")
- [ ] Clicking release opens in new tab
- [ ] Dropdown shows grouped results (project header → releases)
- [ ] No JavaScript errors
- [ ] Existing project filter behavior still works
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
Fixed search dropdown with exact project matching and prefixed release links.

**Changes:**
1. Ensured only queried project appears in results
2. Added release links to dropdown
3. Prefixed releases with project name (e.g., "Cilium 1.17.12")
4. Grouped display (project header → releases)
  </what-built>
  <how-to-verify>
**Test exact project matching:**
1. Visit http://localhost:4321/firehose/
2. Type "cilium" in search box
3. Verify ONLY Cilium project and releases appear (no Dragonfly, no other projects)

**Test release links with prefixes:**
4. Verify release links show format: "Cilium 1.17.12" (not just "1.17.12")
5. Click a release link - should open in new tab
6. Verify releases are grouped under project name

**Test multiple project search:**
7. Type "kube" - should show Kubernetes, KubeEdge, etc. (each with their releases)
8. Verify each project's releases are clearly labeled

**Expected behavior:**
- ✅ Search query filters by project name only
- ✅ No unrelated projects appear
- ✅ Release links include project name prefix
- ✅ Clicking release opens URL in new tab
- ✅ Clean, grouped display
- ✅ No JavaScript errors in console
  </how-to-verify>
  <resume-signal>Type "approved" if search works correctly, or describe any issues found</resume-signal>
</task>

</tasks>

<verification>
**Overall checks:**
- [ ] Search filters by exact project name (no false positives)
- [ ] Release links show project prefixes
- [ ] Dropdown displays grouped results (project → releases)
- [ ] Clicking releases opens URLs in new tabs
- [ ] No JavaScript errors
- [ ] Existing filter behavior preserved
</verification>

<success_criteria>
**Measurable outcomes:**
1. Typing "cilium" shows ONLY Cilium results (0 other projects)
2. Release links display format: "{ProjectName} {Version}" (100% prefixed)
3. Clicking release link opens in new tab (verified manually)
4. No console errors (verified in browser DevTools)
5. User confirms search behavior matches expectations
</success_criteria>

<output>
After completion, create `.planning/quick/004-fix-search-dropdown-exact-matches-and-release-link-formatting/004-SUMMARY.md` documenting the fix and test results.
</output>
