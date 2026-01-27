# Backlog

## Current Milestone: v1.1 - Bug Fixes

### Fix Broken Search (CRITICAL)
**Priority:** Critical  
**Effort:** Medium  
**Context:** User reported search is completely broken after sidebar layout changes

The search functionality stopped working after the UI enhancements were deployed. Need to investigate and fix.

**Investigation needed:**
- Check if Pagefind integration broke with new layout
- Verify SearchBar component is properly integrated in sidebar layout
- Test search input focus and functionality
- Check browser console for JavaScript errors
- Verify Pagefind build output and index files

**Location:** `src/components/SearchBar.astro`, `src/pages/index.astro`

---

## Phase 3 Follow-up

### Truncate Long Project Descriptions
**Priority:** Medium  
**Effort:** Small  

Project descriptions from landscape.yml can be very long. Truncate to 2-3 sentences maximum in ReleaseCard display.

**Location:** `src/components/ReleaseCard.astro`  
**Implementation:** Add truncation helper or CSS line-clamp

---

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

## Future Milestone: CNCF Branding

### Implement CNCF Website Style Guidelines
**Priority:** High (for production)  
**Effort:** Medium  
**Context:** This is a prototype for CNCF organization

Apply official CNCF website style guidelines to make this look like an official CNCF site.

**Reference:** @cncf/website style guidelines  
**Scope:**
- Colors and typography
- Layout and spacing
- Component styles (buttons, badges, cards)
- Header/footer branding
- CNCF logo and assets

**Note:** Should be separate milestone after core functionality complete
