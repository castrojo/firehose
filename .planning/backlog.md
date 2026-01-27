# Backlog

## Future Enhancement Ideas

### RSS Feed Output
**Priority:** High  
**Effort:** Medium  
**Value:** Allow users to subscribe to The Firehose itself via RSS/Atom

**Context:**
The Firehose aggregates releases from 62 CNCF projects, but users still need to visit the site to see updates. Creating an RSS feed OF the aggregated content would let users subscribe to The Firehose in their own RSS readers - very meta and useful for staying updated without visiting the site.

**Implementation approach:**
1. Create `src/pages/feed.xml.ts` (Astro endpoint)
2. Generate RSS 2.0 or Atom feed at build time
3. Include all releases (or top 100 most recent)
4. Feed metadata:
   - Title: "The Firehose - CNCF Project Releases"
   - Description: "Aggregated release feed from 62 CNCF projects"
   - Link: https://castrojo.github.io/firehose/
5. Entry format:
   - Title: "[Project] Release Title"
   - Content: Full release notes (markdown rendered to HTML)
   - Published date: Release date
   - GUID: Release URL (unique identifier)
   - Categories: Project name, project status (graduated/incubating)
6. Add RSS link to site header with icon
7. Auto-discovery meta tag: `<link rel="alternate" type="application/rss+xml">`

**Technical considerations:**
- Use existing release data from content collection
- Leverage markdown rendering from ReleaseCard
- Keep feed size reasonable (100-200 items max)
- Include proper XML escaping
- Test with multiple RSS readers (Feedly, NetNewsWire, etc.)

**Location:**
- New file: `src/pages/feed.xml.ts`
- Update: `src/pages/index.astro` (add feed link/icon in header)

**References:**
- [Astro RSS guide](https://docs.astro.build/en/guides/rss/)
- [RSS 2.0 spec](https://www.rssboard.org/rss-specification)
- [Atom spec](https://datatracker.ietf.org/doc/html/rfc4287)

---

### Dark Mode
**Priority:** High  
**Effort:** Medium  
**Value:** Improve accessibility and user preference for developers who prefer dark themes

**Context:**
Many developers work in dark environments or prefer dark UIs. Adding dark mode would improve readability and reduce eye strain for a significant portion of users. Should integrate CNCF brand colors adapted for dark backgrounds.

**Implementation approach:**
1. **CSS Variable Strategy:**
   - Define light theme variables (current state)
   - Define dark theme variables with CNCF colors adapted
   - Use `data-theme` attribute on `<html>` or `<body>`
   - CSS: `[data-theme="dark"] { --color-bg-default: #0d1117; }`

2. **Dark Theme Color Palette:**
   - Background: GitHub dark (#0d1117, #161b22)
   - Text: Near-white (#c9d1d9, #8b949e)
   - Links: CNCF Pink (brighter for contrast: #FF2DA0)
   - Accents: CNCF Blue (brighter: #58A6FF)
   - Borders: Subtle gray (#30363d)
   - Cards: Slightly elevated (#161b22)

3. **Theme Toggle Component:**
   - Create `src/components/ThemeToggle.astro`
   - Button with sun/moon icons
   - Position in header or sidebar
   - Client-side JS for toggle

4. **Persistence:**
   - Save preference to localStorage: `theme: 'light' | 'dark' | 'auto'`
   - Respect system preference: `prefers-color-scheme` media query
   - Default to 'auto' (follow system)
   - Apply theme before page renders (prevent flash of wrong theme)

5. **Implementation Files:**
   - `src/components/ThemeToggle.astro` - Toggle UI component
   - `src/pages/index.astro` - Integrate toggle, define dark variables
   - Inline script in `<head>` - Apply theme before render
   - All component files - Ensure styles use CSS variables (already done)

6. **Keyboard Shortcut:**
   - Add `t` key to toggle theme
   - Update KeyboardHelp component

**Technical considerations:**
- Prevent flash of unstyled content (FOUC)
- Test contrast ratios for accessibility (WCAG AA minimum)
- Ensure project logos look good on dark backgrounds
- Test with Pagefind search UI in dark mode
- Maintain CNCF branding guidelines
- Keep CNCF logos visible (may need light variants or backgrounds)
- Test collapsible release groups animations in dark mode
- Verify all interactive states (hover, focus, active) have good contrast

**Testing checklist:**
- [ ] All text readable in both modes
- [ ] Interactive elements clearly visible
- [ ] Focus indicators meet contrast requirements
- [ ] Smooth transitions between themes
- [ ] No layout shifts during theme change
- [ ] localStorage persists across sessions
- [ ] System preference detection works
- [ ] No flash of wrong theme on page load

**Location:**
- New file: `src/components/ThemeToggle.astro`
- Update: `src/pages/index.astro` (add CSS variables, theme script, toggle component)
- Update: `src/components/KeyboardHelp.astro` (add 't' shortcut)

**References:**
- [GitHub Primer Dark Theme](https://primer.style/css/support/color-system#dark-mode)
- [Web.dev Dark Mode Guide](https://web.dev/prefers-color-scheme/)
- [WCAG Contrast Checker](https://webaim.org/resources/contrastchecker/)

---

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
