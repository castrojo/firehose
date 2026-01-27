# Backlog

## Future Enhancement Ideas

(Currently empty - all high-priority enhancements completed!)

**Recently Completed:**
- ✅ RSS Feed Output (2026-01-27)
- ✅ Dark Mode (2026-01-27)
- ✅ Site Portability (2026-01-27)
- ✅ Clickable Home Link (2026-01-27)

---

---

## Completed Enhancements

### ✅ RSS Feed Output (v1.4)
**Completed:** 2026-01-27  
**Commit:** b21c06c  
**Value:** Users can subscribe to The Firehose in their RSS readers

**Implementation:**
- Created `src/pages/feed.xml.ts` RSS 2.0 endpoint
- 100 most recent releases with full content
- Auto-discovery meta tag in `<head>`
- Orange RSS button in InfoBox sidebar
- Feed metadata includes project name and status as categories
- Markdown rendered to HTML for rich content

**Results:**
- ✅ Feed validates at https://castrojo.github.io/firehose/feed.xml
- ✅ Auto-discovery works in modern browsers
- ✅ 1-hour cache for performance
- ✅ Professional orange RSS icon (#ff6600 light, #ffa657 dark)

---

### ✅ Dark Mode (v1.4)
**Completed:** 2026-01-27  
**Commits:** 9fb2846, 0c76290, 21bf8b4  
**Value:** Improves accessibility for developers who prefer dark themes

**Implementation:**
- Created `src/components/ThemeToggle.astro` toggle component
- Full CSS variable system for light/dark themes
- localStorage persistence + system preference detection
- No FOUC (theme applied before render)
- Keyboard shortcut: `t` key
- CNCF brand colors adapted for dark mode

**Color Schemes:**
- **Light Mode:** CNCF site colors (#ffffff bg, #D62293 pink, #0086FF blue)
- **Dark Mode:** GitHub-inspired (#0d1117 bg, #ff6bc4 pink, #79c0ff blue)

**Results:**
- ✅ Smooth theme transitions
- ✅ Theme persists across sessions
- ✅ WCAG AA accessibility (bright link colors)
- ✅ Project logos look good on both backgrounds
- ✅ All interactive states have proper contrast

---

### ✅ Site Portability (v1.4)
**Completed:** 2026-01-27  
**Commit:** a5b9b45  
**Value:** Site can be deployed to any organization without code changes

**Problem:** Hardcoded URLs (`/firehose/`, `castrojo.github.io`) would break if deployed elsewhere.

**Solution:**
- Used `import.meta.env.BASE_URL` throughout codebase
- Dynamic URL construction in RSS feed
- Client-side base URL detection for infinite scroll
- Logo mapper uses BASE_URL for image paths
- Created `DEPLOYMENT.md` guide

**Results:**
- ✅ Change 2 values in `astro.config.mjs` to deploy anywhere
- ✅ All internal links work regardless of base path
- ✅ RSS feed URLs generated dynamically
- ✅ Logo images load correctly at any path

---

### ✅ Clickable Home Link (v1.4)
**Completed:** 2026-01-27  
**Commit:** 826eede  
**Value:** Quick way to reset all filters and return to full view

**Implementation:**
- Made "The Firehose" title in header a clickable link
- Clears all filter dropdowns (project, status, date)
- Clears search input and results
- Scrolls smoothly to top of page
- Hover effect shows CNCF pink color

**Results:**
- ✅ One-click reset of entire interface
- ✅ Shows all 610 releases again
- ✅ Better UX than manually clearing each filter
- ✅ Intuitive interaction pattern

---

### ✅ Collapse Minor Releases (v1.3)
**Completed:** 2026-01-27  
**Issue:** Projects with frequent releases dominated the feed  
**Solution:** Smart grouping by project and minor version series with expand/collapse UI  
**Features:**
- Semantic version parsing (v1.2.3, 1.2.3, prerelease tags)
- Groups consecutive releases by project + minor version
- Most recent release always shown expanded
- Older releases in same series collapse under "X more releases" button
- Smooth expand/collapse animation
- Maintains keyboard navigation and accessibility
- Search and filters remain functional
**Algorithm:**
- Same project + same minor version (e.g., v1.2.3, v1.2.2) → collapse together
- Different minor/major versions → separate expanded groups
- Non-semver releases → show all (no grouping)
**Files:**
- `src/lib/semver.ts` (version parsing utility)
- `src/lib/releaseGrouping.ts` (grouping logic)
- `src/components/CollapsibleReleaseGroup.astro` (UI component)
- `src/pages/index.astro` (integration)

### ✅ Fix Broken Search (v1.1)
**Completed:** 2026-01-27  
**Issue:** Search completely broken after UI enhancement deployment  
**Solution:** Removed max-width constraints from SearchBar to work in grid layout  
**Files:** `src/components/SearchBar.astro`

### ✅ Truncate Long Project Descriptions (v1.2)
**Completed:** 2026-01-27  
**Issue:** Project descriptions were too long (some 5+ sentences)  
**Solution:** Created truncation utility to limit descriptions to 2 sentences with "..."  
**Features:**
- Intelligently splits on sentence boundaries (. ! ?)
- Preserves full description in title attribute for hover tooltip
- Maintains readability and professionalism
**Files:** 
- `src/lib/truncate.ts` (new utility)
- `src/components/ReleaseCard.astro` (integration)

### ✅ CNCF Branding (Phase 6)
**Completed:** 2026-01-27  
**Scope:** Full CNCF visual identity integration  
**Features:**
- CNCF Pink (#D62293) for links
- CNCF Blue (#0086FF) for accents
- 56 project logos from cncf/artwork
- InfoBox component with CNCF links
- Clean, professional appearance
