---
created: 2026-01-27T10:56
title: Fix search functionality on production (base path issue)
area: ui
files:
  - src/components/SearchBar.astro:53
  - astro.config.mjs
---

## Problem

Search box is completely broken on production (https://castrojo.github.io/firehose/). The Pagefind import fails because the path `/pagefind/pagefind.js` doesn't include the `/firehose` base path required for GitHub Pages deployment.

**Context:**
- SearchBar.astro line 53: `pagefind = await import('/pagefind/pagefind.js')`
- This works locally (localhost:4321) but fails on GitHub Pages
- GitHub Pages serves at https://castrojo.github.io/firehose/ (base path: `/firehose`)
- Pagefind files are at `/firehose/pagefind/pagefind.js` on production
- Current hardcoded path `/pagefind/pagefind.js` returns 404 on production

**Evidence:**
- Build succeeds locally (`dist/pagefind/` exists with all index files)
- Preview server works correctly (base path handled correctly)
- Production deployment succeeds but search fails to load Pagefind
- Console error expected: `Failed to load Pagefind` (404 on pagefind.js)

**Impact:**
- Search completely broken for production users
- One of the core features (full-text search) is non-functional
- Keyboard shortcut `/` focuses input but search doesn't work

**History:**
- v1.1 Bug Fix fixed SearchBar width for sidebar layout (commit: 2f78c8d)
- Search worked in v1.1 deployment but broke after recent changes
- Likely broke when Quick Task 002 (keyboard nav) was deployed

## Solution

**Approach 1: Use Astro base path in import (RECOMMENDED)**
- Astro config has `base: '/firehose'` defined
- Use `import.meta.env.BASE_URL` to get base path dynamically
- Update SearchBar.astro line 53:
  ```javascript
  const basePath = import.meta.env.BASE_URL || '/';
  pagefind = await import(`${basePath}pagefind/pagefind.js`);
  ```
- This works for both local (`BASE_URL = '/'`) and production (`BASE_URL = '/firehose/'`)

**Approach 2: Relative import**
- Change to relative path: `./pagefind/pagefind.js`
- May not work depending on Astro's build output structure

**Approach 3: Vite alias**
- Configure Vite alias in astro.config.mjs
- More complex, unnecessary for this case

**Testing checklist:**
- [ ] Build succeeds: `npm run build`
- [ ] Preview works: `npm run preview` → http://localhost:4321/firehose/
- [ ] Search input accepts text
- [ ] Typing 2+ characters triggers search
- [ ] Results appear with project names and excerpts
- [ ] Console shows "Pagefind loaded successfully"
- [ ] No 404 errors in Network tab
- [ ] Deploy and verify on production URL

**Deployment verification:**
```bash
# After deployment, check production
curl -I https://castrojo.github.io/firehose/pagefind/pagefind.js
# Should return: HTTP/2 200

# Open browser console at https://castrojo.github.io/firehose/
# Search for any term (e.g., "kubernetes")
# Verify results appear and no errors in console
```

**Priority:** CRITICAL - Core feature broken on production
