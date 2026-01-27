---
phase: quick-003
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/SearchBar.astro
autonomous: true

must_haves:
  truths:
    - "Search works on production (https://castrojo.github.io/firehose/)"
    - "Pagefind.js loads successfully from /firehose/pagefind/pagefind.js"
    - "Search results appear when typing 2+ characters"
  artifacts:
    - path: "src/components/SearchBar.astro"
      provides: "Dynamic base path handling for Pagefind import"
      min_lines: 180
      contains: "import.meta.env.BASE_URL"
  key_links:
    - from: "src/components/SearchBar.astro"
      to: "/firehose/pagefind/pagefind.js"
      via: "dynamic import with BASE_URL"
      pattern: "import.*BASE_URL.*pagefind"
---

<objective>
Fix search functionality on production by making Pagefind import path respect Astro's base path configuration.

Purpose: Search is completely broken on production (https://castrojo.github.io/firehose/) because the hardcoded `/pagefind/pagefind.js` path doesn't include the `/firehose` base path required for GitHub Pages deployment.

Output: Working search on both local development and production deployment.
</objective>

<execution_context>
@~/.config/opencode/get-shit-done/workflows/execute-plan.md
@~/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@src/components/SearchBar.astro
@astro.config.mjs

## Problem Context

**Current situation:**
- Local development: Works fine (base path = `/`)
- Production: Completely broken (returns 404 on `/pagefind/pagefind.js`)
- GitHub Pages serves at: https://castrojo.github.io/firehose/
- Pagefind files are at: `/firehose/pagefind/pagefind.js` on production
- SearchBar.astro line 53: Hardcoded path `/pagefind/pagefind.js`

**Root cause:**
```javascript
// Current (BROKEN on production):
pagefind = await import('/pagefind/pagefind.js');
```

**Solution:**
```javascript
// Fixed (works both environments):
const basePath = import.meta.env.BASE_URL || '/';
pagefind = await import(`${basePath}pagefind/pagefind.js`);
```

**Why this works:**
- Local: `BASE_URL = '/'` → imports from `/pagefind/pagefind.js` ✅
- Production: `BASE_URL = '/firehose/'` → imports from `/firehose/pagefind/pagefind.js` ✅
- Astro automatically sets `BASE_URL` based on `base: '/firehose'` in config
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix Pagefind import path with dynamic base path</name>
  <files>src/components/SearchBar.astro</files>
  <action>
Update SearchBar.astro line ~52-53 to use Astro's `import.meta.env.BASE_URL` for dynamic path construction.

**Current code (line 52-53):**
```javascript
// @ts-ignore - Pagefind is loaded dynamically
pagefind = await import('/pagefind/pagefind.js');
```

**Replace with:**
```javascript
// Use Astro's base path for GitHub Pages compatibility
const basePath = import.meta.env.BASE_URL || '/';
// @ts-ignore - Pagefind is loaded dynamically
pagefind = await import(`${basePath}pagefind/pagefind.js`);
```

**Why this approach:**
- `import.meta.env.BASE_URL` is set by Astro based on `base` config
- Local dev: `BASE_URL = '/'` → imports from `/pagefind/pagefind.js`
- Production: `BASE_URL = '/firehose/'` → imports from `/firehose/pagefind/pagefind.js`
- Fallback to `'/'` handles edge cases
- No changes needed to astro.config.mjs (already has `base: '/firehose'`)

**Testing checklist:**
1. Build succeeds: `npm run build`
2. Preview server works: `npm run preview`
3. Visit http://localhost:4321/firehose/
4. Type in search box (2+ characters)
5. Verify results appear
6. Check browser console: "Pagefind loaded successfully"
7. Check Network tab: No 404 errors on pagefind.js
  </action>
  <verify>
```bash
# 1. Build
npm run build

# 2. Start preview server reliably
.dev-tools/restart-preview.sh

# 3. Test search locally
curl -s http://localhost:4321/firehose/pagefind/pagefind.js | head -c 100
# Should return JavaScript code (not 404)

# 4. Check browser console at http://localhost:4321/firehose/
# - Type "kubernetes" in search box
# - Verify results appear
# - Console shows: "Pagefind loaded successfully"
# - No 404 errors in Network tab
```
  </verify>
  <done>
- [ ] SearchBar.astro updated with `import.meta.env.BASE_URL`
- [ ] Build completes successfully
- [ ] Preview server shows working search
- [ ] Browser console logs "Pagefind loaded successfully"
- [ ] No 404 errors on pagefind.js in Network tab
- [ ] Search results appear when typing 2+ characters
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
SearchBar.astro updated to dynamically construct Pagefind import path using Astro's BASE_URL environment variable. This fixes the 404 error on production where GitHub Pages requires the /firehose base path.
  </what-built>
  <how-to-verify>
**Local verification (preview server):**
1. Visit http://localhost:4321/firehose/
2. Type "kubernetes" in the search box
3. ✅ Results should appear with project names and excerpts
4. Open browser console (F12)
5. ✅ Should see: "Pagefind loaded successfully"
6. Open Network tab
7. ✅ `/firehose/pagefind/pagefind.js` should return 200 (not 404)

**Expected behavior:**
- Search input accepts text
- Results appear after 2+ characters
- Results show project names and text excerpts
- Clicking result opens release in new tab
- No JavaScript errors in console

**What to check:**
- Browser console shows success message (not error)
- Network tab shows pagefind.js loaded (200 status)
- Search results appear with proper formatting
  </how-to-verify>
  <resume-signal>
Type "approved" if search works correctly in preview, or describe any issues found.

After approval, we'll commit changes and prepare for production deployment.
  </resume-signal>
</task>

</tasks>

<verification>
**Overall success criteria:**

**Local (preview server):**
- [ ] Build completes without errors
- [ ] Preview server runs at http://localhost:4321/firehose/
- [ ] Search input accepts text
- [ ] Typing 2+ characters triggers search
- [ ] Results appear with project names and excerpts
- [ ] Browser console: "Pagefind loaded successfully"
- [ ] Network tab: `/firehose/pagefind/pagefind.js` returns 200

**After production deployment:**
- [ ] Visit https://castrojo.github.io/firehose/
- [ ] Search for "kubernetes" or any term
- [ ] Results appear correctly
- [ ] Browser console: No 404 errors
- [ ] Network tab: `pagefind.js` loads successfully
</verification>

<success_criteria>
**Search works on both environments:**
1. ✅ Local development (http://localhost:4321/firehose/)
2. ✅ Production (https://castrojo.github.io/firehose/)

**Technical validation:**
- SearchBar.astro uses `import.meta.env.BASE_URL` for dynamic path
- Build succeeds with no TypeScript errors
- Pagefind.js loads successfully (200 status)
- Search results appear when typing
- No 404 errors in browser console

**User impact:**
- Core search feature restored on production
- Users can discover releases via full-text search
- Keyboard shortcut `/` works correctly
- No degradation of local development experience
</success_criteria>

<output>
After completion, create `.planning/quick/003-fix-search-base-path-for-production-depl/003-SUMMARY.md`
</output>
