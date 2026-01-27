# Backlog

## Optional Enhancements

### Collapse Minor Releases
**Priority:** High  
**Effort:** Medium  
**Context:** User feedback - reduce visual clutter

When projects do a minor release (e.g., v1.2.3 → v1.2.4), collapse the section so it doesn't take up as much room. Users care more about major releases but still want to know if minor releases come out.

**Implementation ideas:**
- Parse version numbers from release titles
- Detect minor vs major releases (semver)
- Show collapsed/summary view for minor releases
- Expand on click to see full details
- Major releases always expanded by default

**Location:** `src/components/ReleaseCard.astro`

---

## Completed Enhancements

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
