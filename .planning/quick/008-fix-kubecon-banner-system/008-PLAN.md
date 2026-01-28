---
task: 008
type: quick
title: Fix KubeCon Banner System with Official CNCF Banners
status: planned
---

# Quick Task 008: Fix KubeCon Banner System

## Objective

Replace hardcoded banner system with official CNCF banner configuration that:
- Fetches banners.yml at build time from cncf.github.io
- Uses correct 500x500px square format (not 2400x300 rectangles)
- Supports light-theme and dark-theme image variants
- Automatically rotates to next event when current ends
- Detects user's theme preference and displays correct variant
- Removes manual event configuration files

## Context

**Current Problems:**
1. Hardcoded banner URLs (e.g., NA 2026 returns 404)
2. Wrong dimensions (2400x300 but official is 500x500)
3. No light/dark theme variant support
4. Requires manual updates for new events
5. Using custom event configuration instead of official source

**Official CNCF System:**
- Configuration: https://cncf.github.io/banners/banners.yml
- Format:
  ```yaml
  - name: "KubeCon CloudNativeCon Europe 2026"
    link: https://events.linuxfoundation.org/...
    images:
      light-theme: https://cncf.github.io/banners/events/Kubecon-EU-2026-500x500.png
      dark-theme: https://cncf.github.io/banners/events/Kubecon-EU-2026-500x500.png
  ```

**User's Theme System:**
- Already implemented with `data-theme="light|dark"` on `<html>`
- Theme detected via localStorage + system preference
- Theme initialization prevents FOUC

## Tasks

### Task 1: Fetch and Parse Official Banners at Build Time

<files>
- src/lib/banners.ts (NEW)
- src/config/events.ts (DELETE after migration)
</files>

<action>
Create banner fetching and parsing utility:

**src/lib/banners.ts:**
1. Create `fetchBannersConfig()` function
   - Fetch https://cncf.github.io/banners/banners.yml at build time
   - Use try/catch with fallback to empty array on fetch errors
   - No build failure if banners unavailable

2. Create `parseBannersYaml(yamlText: string)` function
   - Parse YAML to extract banner objects
   - Use js-yaml library (already in dependencies)
   - Extract: name, link, images.light-theme, images.dark-theme

3. Create `getActiveBanner()` function
   - Filter to KubeCon/CloudNativeCon events (name includes "KubeCon")
   - If multiple banners, return first one (following Artifact Hub pattern)
   - Return { name, link, lightImage, darkImage } or null

4. Create TypeScript interface:
   ```typescript
   export interface BannerConfig {
     name: string;
     link: string;
     lightImage: string;
     darkImage: string;
   }
   ```

**Why this approach:**
- Build-time fetching = no runtime overhead
- Graceful degradation = site works even if banners.yml unavailable
- Single source of truth = CNCF controls banner rotation
- No date logic needed = CNCF already manages active banners
</action>

<verify>
- [ ] Build succeeds with `npm run build`
- [ ] Check build logs for "Fetching CNCF banners" message
- [ ] Verify banner data logged: name, link, image URLs
- [ ] Build succeeds even if banners.yml unreachable (test with bad URL)
</verify>

<done>
- Build-time banner fetcher exists
- Parses CNCF banners.yml correctly
- Returns first KubeCon banner or null
- Graceful error handling (no build failures)
</done>

### Task 2: Update Banner Component for Theme Variants

<files>
- src/components/KubeConBanner.astro (MODIFY)
- src/pages/index.astro (MODIFY)
</files>

<action>
Modify banner component to support theme-aware display:

**src/components/KubeConBanner.astro:**
1. Update Props interface:
   ```typescript
   interface Props {
     name: string;
     link: string;
     lightImage: string;  // NEW: light theme variant
     darkImage: string;   // NEW: dark theme variant
   }
   ```

2. Remove date logic (no longer needed - CNCF manages active state)
   - Remove: start, end, isActive check
   - Remove: date formatting code

3. Replace single `bannerUrl` with theme-aware images:
   ```astro
   <picture>
     <source 
       srcset={darkImage} 
       media="(prefers-color-scheme: dark)"
     />
     <img 
       src={lightImage}
       alt={`${name} banner`}
       class="banner-image"
       loading="lazy"
     />
   </picture>
   ```

4. Update CSS for 500x500 square format:
   - Change `aspect-ratio: 8 / 1` to `aspect-ratio: 1 / 1`
   - Adjust overlay positioning for square format
   - Remove mobile `aspect-ratio: 4 / 1` override

5. Add client-side theme switcher:
   ```javascript
   <script>
     // Listen for theme changes and update picture source
     const observer = new MutationObserver(() => {
       const theme = document.documentElement.getAttribute('data-theme');
       // Browser handles picture source selection automatically
     });
     observer.observe(document.documentElement, {
       attributes: true,
       attributeFilter: ['data-theme']
     });
   </script>
   ```

**src/pages/index.astro:**
1. Replace `import { upcomingEvent } from '../config/events'` 
   with `import { getActiveBanner } from '../lib/banners'`

2. Get active banner: `const activeBanner = await getActiveBanner()`

3. Update banner rendering:
   ```astro
   {activeBanner && (
     <KubeConBanner 
       name={activeBanner.name}
       link={activeBanner.link}
       lightImage={activeBanner.lightImage}
       darkImage={activeBanner.darkImage}
     />
   )}
   ```

4. Remove registration button logic (not in official banners)

**Why picture element:**
- Native browser support for theme-aware images
- No JavaScript required for initial render
- Automatically switches sources when theme changes
- Better than CSS background-image approach
</action>

<verify>
Full verification protocol:

**Build verification:**
- [ ] `npm run build` succeeds with no errors
- [ ] Build logs show: "Fetched 1 active KubeCon banner"
- [ ] No errors about missing event configuration

**Light theme verification:**
- [ ] Start preview server: `.dev-tools/restart-preview.sh`
- [ ] Visit http://localhost:4321/firehose/
- [ ] If dark mode active, press 't' to switch to light
- [ ] Banner displays with square 1:1 aspect ratio (not wide rectangle)
- [ ] Banner image loads successfully (check DevTools Network tab)
- [ ] Banner URL contains "light-theme" or shows correct light variant
- [ ] Click banner -> opens KubeCon event page in new tab

**Dark theme verification:**
- [ ] Press 't' key to toggle dark mode
- [ ] Page background turns dark (#0d1117)
- [ ] Banner image switches to dark variant
- [ ] Banner still displays with square 1:1 aspect ratio
- [ ] Banner URL contains "dark-theme" or shows correct dark variant
- [ ] Banner remains clickable

**Responsive verification:**
- [ ] Desktop (1024px+): Banner displays in main content area
- [ ] Tablet (768px): Banner scales proportionally
- [ ] Mobile (480px): Banner fits width, maintains square ratio

**Theme persistence verification:**
- [ ] Toggle theme to dark, refresh page -> stays dark with dark banner
- [ ] Toggle theme to light, refresh page -> stays light with light banner

**Fallback verification:**
- [ ] Check page without banner (if banners.yml unreachable)
- [ ] Page renders normally without errors
- [ ] No console errors about missing banner
</verify>

<done>
Acceptance criteria:
- ✅ Banner uses official CNCF images (500x500px square)
- ✅ Light theme shows light-theme banner variant
- ✅ Dark theme shows dark-theme banner variant
- ✅ Theme toggle ('t' key) switches banner instantly
- ✅ Banner links to correct KubeCon event page
- ✅ Square aspect ratio on all screen sizes
- ✅ No manual event configuration needed
- ✅ Graceful degradation when banners unavailable
- ✅ No date logic in component (CNCF manages rotation)
</done>

### Task 3: Clean Up Old Configuration

<files>
- src/config/events.ts (DELETE)
- package.json (VERIFY js-yaml exists)
</files>

<action>
Remove obsolete event configuration:

1. Delete `src/config/events.ts` completely
   - No longer needed (CNCF controls events via banners.yml)

2. Verify js-yaml dependency exists:
   - Check package.json for "js-yaml"
   - Should already be present (used for landscape parsing)
   - If missing: `npm install js-yaml @types/js-yaml`

3. Update any imports referencing events.ts:
   - Search codebase: `grep -r "config/events" src/`
   - Should only find index.astro (already updated in Task 2)

4. Git cleanup:
   ```bash
   git rm src/config/events.ts
   ```

**Why delete events.ts:**
- Single source of truth = CNCF banners.yml
- No manual updates required
- Automatic rotation handled upstream
- Correct banner dimensions guaranteed
</action>

<verify>
- [ ] `src/config/events.ts` no longer exists
- [ ] `grep -r "config/events" src/` returns no results (or only commented references)
- [ ] `npm run build` succeeds without events.ts
- [ ] Banner still displays correctly after deletion
- [ ] js-yaml listed in package.json dependencies
</verify>

<done>
- Old event configuration deleted
- No references to events.ts in codebase
- Build succeeds without old configuration
- Banner system fully migrated to official CNCF source
</done>

## Success Criteria

**Functional:**
- [x] Banner fetches from official CNCF source at build time
- [x] Displays correct variant for light/dark theme
- [x] Theme toggle switches banner image instantly
- [x] Square 500x500px format (not rectangle)
- [x] Automatic rotation when CNCF updates banners.yml
- [x] No manual event configuration required

**Technical:**
- [x] No build failures when banners.yml unavailable
- [x] No console errors or warnings
- [x] Uses native `<picture>` element for theme switching
- [x] Maintains responsive design on all viewports
- [x] Clean codebase (old config deleted)

**User Experience:**
- [x] Banner links to correct event page
- [x] Theme preference persists across page loads
- [x] Banner variant matches current theme
- [x] Smooth visual experience (no flash/flicker)

## Rollout Plan

1. **Build verification:** Confirm banner fetching works
2. **Visual verification:** Test light/dark variants manually
3. **Commit changes:** Single atomic commit with all updates
4. **Deploy:** Push to trigger GitHub Actions deployment
5. **Production check:** Verify banner on live site

## Files Modified

- **NEW:** `src/lib/banners.ts` - Banner fetcher and parser
- **MODIFIED:** `src/components/KubeConBanner.astro` - Theme-aware component
- **MODIFIED:** `src/pages/index.astro` - Use new banner system
- **DELETED:** `src/config/events.ts` - Obsolete configuration

## Estimated Context Usage

~25% (Quick task - simple integration with existing theme system)

**Rationale:**
- Task 1: ~8% (new utility file, straightforward fetch/parse)
- Task 2: ~12% (component updates, picture element integration)
- Task 3: ~5% (cleanup and verification)
- Total: ~25% (well under 30% quick task target)

## Dependencies

- js-yaml: Already in package.json (used for landscape parsing)
- Existing theme system: data-theme attribute on <html>
- CNCF infrastructure: banners.yml must be accessible at build time

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| banners.yml unavailable | No banner displays | Graceful degradation (try/catch, return null) |
| Banner format changes | Parsing fails | Schema validation, fallback to empty |
| Multiple active banners | Wrong event shown | Take first KubeCon banner (Artifact Hub pattern) |
| Theme switch lag | Brief wrong variant | Use picture element (browser-native switching) |

## References

- Official CNCF Banners: https://cncf.github.io/banners/
- banners.yml: https://cncf.github.io/banners/banners.yml
- Artifact Hub implementation: Uses same banner system
- Picture element docs: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/picture
