# Backlog

## Optional Enhancements

(None currently planned - all major enhancements complete!)

---

## Completed Enhancements

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
