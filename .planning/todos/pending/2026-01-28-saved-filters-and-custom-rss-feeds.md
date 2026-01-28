---
created: 2026-01-28T15:50
title: Saved filters and custom RSS feeds for filtered views
area: ui
files:
  - src/components/FilterBar.astro
  - src/pages/feed.xml.ts
  - src/pages/index.astro
---

## Problem

Users may want to:
1. **Save filter combinations** - Bookmark specific views like "Graduated projects from last 7 days" or "Kubernetes-related releases"
2. **Share filtered views** - Send colleagues a link to a specific filtered view
3. **Subscribe to filtered feeds** - Get RSS feeds for specific projects/statuses/date ranges instead of everything

**Current limitation:** All filters are client-side only (JavaScript). Page refreshes lose filter state. RSS feed returns all releases (100 most recent, no filtering).

**Use cases:**
- Project maintainer wants RSS feed of only their project's releases
- Developer wants to bookmark "All sandbox projects" view
- Team wants to subscribe to "Security-focused graduated projects"
- User wants to share "All Linkerd releases from 2025" with colleague

## Solution

### Approach 1: URL Query Parameters (Recommended First Step)

**Benefits:** Simple, shareable, no server changes needed

**Implementation:**
1. **Persist filters to URL:**
   - `?project=linkerd&status=graduated&date=7d`
   - Update URL on filter change: `history.pushState()`
   - Read URL params on page load: `URLSearchParams`

2. **"Save Filter" button:**
   - Generates permalink with current filters
   - Copy-to-clipboard functionality
   - Share icon in FilterBar

3. **Server-side rendering with filters:**
   - Parse URL params in `index.astro`
   - Pre-filter `sortedReleases` before rendering
   - Benefits: Works without JS, SEO-friendly, faster

**Files to modify:**
- `src/components/FilterBar.astro` - Add URL sync, copy link button
- `src/pages/index.astro` - Parse URL params, pre-filter releases
- `src/components/SearchBar.astro` - Sync with URL params

**Astro best practice:** Use `Astro.url.searchParams` for SSR URL parsing

---

### Approach 2: Custom RSS Feeds with Query Params

**Benefits:** Standard RSS readers, real-time updates, no UI needed

**Implementation:**
1. **Dynamic RSS filtering in `feed.xml.ts`:**
   ```typescript
   const { searchParams } = Astro.url;
   const projectFilter = searchParams.get('project');
   const statusFilter = searchParams.get('status');
   const dateFilter = searchParams.get('date');
   
   let filteredReleases = sortedReleases;
   if (projectFilter) filteredReleases = filter by project
   if (statusFilter) filteredReleases = filter by status
   if (dateFilter) filteredReleases = filter by date range
   ```

2. **Feed URL examples:**
   - `/feed.xml?project=linkerd` - Only Linkerd releases
   - `/feed.xml?status=graduated` - Graduated projects only
   - `/feed.xml?status=sandbox&date=30d` - Sandbox projects, last 30 days

3. **"Subscribe to Filtered View" button:**
   - Appears when filters active
   - Generates feed URL with current filters
   - RSS icon with "Subscribe to this filter" text

**Files to modify:**
- `src/pages/feed.xml.ts` - Add filter logic, update title/description to reflect filters
- `src/components/FilterBar.astro` - Add RSS subscribe button when filtered

**RSS best practice:** Update feed title to reflect filters: "The Firehose - Linkerd Releases"

---

### Approach 3: Named Saved Searches (Advanced)

**Benefits:** User-friendly names, manage multiple searches

**Implementation:**
1. **localStorage-based saved searches:**
   ```typescript
   interface SavedSearch {
     id: string;
     name: string;
     filters: {
       project?: string;
       status?: string;
       date?: string;
     };
   }
   ```

2. **"Save Search" modal:**
   - Input: Search name (e.g., "My Security Projects")
   - Stores in localStorage
   - Shows in dropdown or sidebar

3. **Saved searches UI:**
   - Dropdown in FilterBar: "Quick Filters"
   - Lists: "All", "My Searches", saved items
   - Edit/delete buttons per search

**Files to create:**
- `src/components/SavedSearches.astro` - UI component
- `src/lib/savedSearches.ts` - localStorage management

**Limitation:** localStorage is client-side only, not shareable across devices

---

### Approach 4: Shareable Filter Presets (URL Hash-based)

**Benefits:** Compact URLs, no backend changes

**Implementation:**
1. **Base64-encoded filter state in URL hash:**
   - `#filters=eyJwcm9qZWN0IjoibGlua2VyZCJ9` (base64 JSON)
   - Shorter than query params for complex filters
   - Parse on page load, apply filters

2. **"Share Filter" button:**
   - Encodes current filters to base64
   - Copies URL with hash to clipboard
   - Shows "Link copied!" feedback

**Files to modify:**
- `src/pages/index.astro` - Parse URL hash, decode filters
- `src/components/FilterBar.astro` - Add share button, encoding logic

**Trade-off:** Less readable URLs, but more compact

---

## Recommended Implementation Order

### Phase 1: URL Query Params (Highest ROI)
1. ✅ Implement URL sync in FilterBar (1-2 hours)
2. ✅ Add server-side URL param parsing in index.astro (30 min)
3. ✅ Add "Copy Filter Link" button (30 min)
4. ✅ Test: Share link works, filters persist on refresh

**Why first:** Solves sharing + persistence with minimal code, standard pattern

---

### Phase 2: Custom RSS Feeds (High Value)
1. ✅ Add filter logic to feed.xml.ts (1 hour)
2. ✅ Update feed metadata to reflect active filters (30 min)
3. ✅ Add "Subscribe to Filtered View" button in FilterBar (30 min)
4. ✅ Test: RSS feed filters work, validates correctly

**Why second:** RSS power users will love this, standard protocol

---

### Phase 3: Named Saved Searches (Optional Polish)
1. ✅ Create localStorage management utility (1 hour)
2. ✅ Build SavedSearches component UI (2 hours)
3. ✅ Integrate with FilterBar (1 hour)
4. ✅ Test: Save/load/delete searches work

**Why third:** Nice-to-have for power users, but URL params solve 80% of use case

---

## Technical Considerations

### Astro v5 Best Practices

1. **URL params in pages:**
   ```astro
   ---
   const { searchParams } = Astro.url;
   const projectFilter = searchParams.get('project');
   ---
   ```

2. **Client-side URL updates:**
   ```typescript
   const updateURL = (filters) => {
     const params = new URLSearchParams();
     if (filters.project) params.set('project', filters.project);
     const url = `${window.location.pathname}?${params.toString()}`;
     history.pushState({}, '', url);
   };
   ```

3. **RSS feed filtering:**
   ```typescript
   export async function GET(context: APIContext) {
     const { searchParams } = context.url;
     // Filter logic here
   }
   ```

### Performance

- **Client-side filtering:** Already efficient (<10ms)
- **Server-side pre-filtering:** Reduces HTML payload for large filters
- **RSS feed caching:** Keep 1-hour cache, add `?v=timestamp` for unique filters

### Accessibility

- **"Copy Link" button:** Use `navigator.clipboard.writeText()` with fallback
- **RSS button:** Clear label "Subscribe to filtered releases"
- **Keyboard shortcuts:** `Shift+C` to copy filter link?

### Edge Cases

1. **Invalid filter params:** Gracefully ignore, don't break page
2. **Conflicting filters:** Project + Status that don't match → show empty state
3. **Deep links to collapsed releases:** Auto-expand group if URL contains project
4. **RSS feed with no results:** Valid RSS, just empty `<channel>`

---

## Success Metrics

- [ ] URL updates when filters change
- [ ] Page refresh preserves filters
- [ ] "Copy Link" button works, URL is shareable
- [ ] RSS feed respects query params
- [ ] Feed title reflects active filters
- [ ] No performance regression (<10ms client-side filtering)
- [ ] Filters work without JavaScript (server-side fallback)
- [ ] Keyboard accessible (all buttons focusable)

---

## References

- **Astro URL handling:** https://docs.astro.build/en/reference/api-reference/#astrourl
- **RSS 2.0 spec:** https://www.rssboard.org/rss-specification
- **History API:** https://developer.mozilla.org/en-US/docs/Web/API/History_API
- **URLSearchParams:** https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams

---

## Estimated Effort

- **Phase 1 (URL params):** 2-3 hours
- **Phase 2 (Custom RSS):** 2 hours
- **Phase 3 (Saved searches):** 4 hours
- **Total:** 8-9 hours for all three phases

**Recommended:** Start with Phase 1 + Phase 2 (4-5 hours) for maximum value
