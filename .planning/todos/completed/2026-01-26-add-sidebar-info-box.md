---
created: 2026-01-26T20:51
title: Add sidebar info box with CNCF links
area: ui
files:
  - src/pages/index.astro
---

## Problem

The sidebar currently only contains stats and filters. To provide better context and navigation to CNCF resources, add an informational box above the statistics section with links to key CNCF sites.

**Context:**
- Sidebar has room above the stats section for additional content
- Users may want quick access to CNCF.io and the Landscape
- Need extensible design to accommodate future links
- Should maintain current responsive sidebar behavior (sticky on desktop, stack on mobile)

**Goals:**
- Provide quick navigation to CNCF ecosystem resources
- Improve discoverability of related CNCF sites
- Create foundation for additional informational links

## Solution

**Approach:**
1. Add info box component/section above `<Stats />` in sidebar
2. Include links to:
   - https://cncf.io (main CNCF site)
   - https://landscape.cncf.io (interactive landscape)
   - Placeholder links for future additions
3. Style consistently with existing sidebar design (GitHub Primer)
4. Ensure responsive behavior matches current sidebar
5. Add appropriate ARIA labels for accessibility

**Design considerations:**
- Box should be visually distinct but not overwhelming
- Links should open in new tabs (target="_blank" rel="noopener noreferrer")
- Consider icon/logo for visual interest (optional)
- Maintain sidebar width of 320px
- Test on mobile breakpoints (<1024px)

**Location:**
- `src/pages/index.astro` - Add before `<Stats />` component in sidebar
- Alternatively: Create new `InfoBox.astro` component if styling is complex

**Related:**
- Part of CNCF branding enhancement
- Complements logo integration todo
