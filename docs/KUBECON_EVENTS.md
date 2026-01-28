# KubeCon Event Banner Automatic Rotation

## Overview

The Firehose automatically displays the next upcoming KubeCon event banner, rotating through events as they occur. This mimics the behavior of landscape.cncf.io but with enhanced automation.

## How Automatic Rotation Works

### The Algorithm

```
1. GET all configured events from events array
2. FILTER out events where end_date < current_date (past events)
3. SORT remaining events by start_date (earliest first)
4. SELECT the first event (next upcoming)
5. DISPLAY the selected event
```

### Example Timeline

**Configuration:**
```typescript
events = [
  { name: "KubeCon Europe 2026", start: "2026-03-23", end: "2026-03-27" },
  { name: "KubeCon North America 2026", start: "2026-11-09", end: "2026-11-13" }
]
```

**Timeline:**

| Date | Active Events | Next Event Shown |
|------|---------------|------------------|
| Jan 1, 2026 | Both (future) | **Europe 2026** (earlier start) |
| Mar 24, 2026 | Both (during Europe) | **Europe 2026** (still active) |
| Mar 28, 2026 | NA only (Europe ended) | **North America 2026** |
| Nov 10, 2026 | NA only (during NA) | **North America 2026** |
| Nov 14, 2026 | None (NA ended) | **No banner shown** |

### Date Comparison Logic

**Start of Day Normalization:**
```javascript
now.setHours(0, 0, 0, 0);  // 2026-03-28 00:00:00
```

**End of Day Extension:**
```javascript
endDate.setHours(23, 59, 59, 999);  // 2026-03-27 23:59:59
```

This ensures:
- Events show on their end date (full day coverage)
- Events hide the day after they end (clean cutoff)

## Adding New Events

Simply add to the `events` array in `src/config/events.ts`:

```typescript
export const events: UpcomingEvent[] = [
  // Existing events
  { ... },
  
  // Add new event here
  {
    name: "KubeCon + CloudNativeCon China 2027",
    start: "2027-06-15",
    end: "2027-06-18",
    bannerUrl: "https://cncf.github.io/banners/events/Kubecon-China-2027-2400x300.png",
    detailsUrl: "https://events.linuxfoundation.org/kubecon-cloudnativecon-china/?utm_source=firehose&utm_campaign=KubeCon-China-2027",
    registrationUrl: "https://events.linuxfoundation.org/kubecon-cloudnativecon-china/register/?utm_source=firehose&utm_campaign=KubeCon-China-2027"
  }
];
```

**Registration URL Pattern:**
```
{detailsUrl}/register/
```

**Note:** The registration URL is typically the event URL + `/register/` path. Always verify the registration link is active before adding an event.

**No manual cleanup needed** - past events are automatically filtered out.

## Build-Time Evaluation

**Important:** Event selection happens at **build time**, not runtime.

```
User visits site → Static HTML served → Banner already determined
```

This means:
- ✅ Fast performance (no date calculations on page load)
- ✅ SEO-friendly (banner is in static HTML)
- ✅ No JavaScript required for basic display

**Deployment schedule:**
- Site rebuilds **daily at 6 AM UTC** (via GitHub Actions)
- Event rotation updates within 24 hours of event ending

### Manual Rebuild

To force an immediate rotation (if event just ended):

```bash
# Trigger workflow manually
gh workflow run "Build and Deploy to GitHub Pages"

# Or push any change
git commit --allow-empty -m "chore: trigger rebuild for event rotation"
git push
```

## KubeCon Event Schedule Pattern

CNCF typically holds 3-4 KubeCon events per year:

1. **Europe** - Spring (March/April)
2. **China** - Summer (June/July) 
3. **North America** - Fall (November)
4. **India/Japan** - Occasional

### Recommended Configuration

Add events as they're announced (usually 6-12 months in advance):

```typescript
export const events: UpcomingEvent[] = [
  // 2026 Events
  {
    name: "KubeCon Europe 2026",
    start: "2026-03-23",
    end: "2026-03-27",
    bannerUrl: "https://cncf.github.io/banners/events/Kubecon-EU-2026-2400x300.png",
    detailsUrl: "https://events.linuxfoundation.org/kubecon-cloudnativecon-europe/?utm_source=firehose&utm_campaign=KubeCon-EU-2026",
    registrationUrl: "https://events.linuxfoundation.org/kubecon-cloudnativecon-europe/register/?utm_source=firehose&utm_campaign=KubeCon-EU-2026"
  },
  
  // 2027 Events (add as announced)
  // { name: "KubeCon Europe 2027", start: "2027-03-...", end: "2027-03-...", ... },
];
```

## Banner Images

**Source:** https://cncf.github.io/banners/events/

**Naming Convention:**
```
Kubecon-{REGION}-{YEAR}-2400x300.png

Examples:
- Kubecon-EU-2026-2400x300.png
- Kubecon-NA-2026-2400x300.png
- Kubecon-China-2026-2400x300.png
```

**Dimensions:** 2400px × 300px (8:1 aspect ratio)

## Register Now Button

The banner includes a prominent "Register Now" call-to-action button that appears on hover (desktop) or is always visible (mobile).

**Design:**
- **Background:** CNCF pink (#D62293)
- **Hover:** CNCF blue (#0086FF)
- **Position:** Bottom-right of banner overlay
- **Responsive:** Full-width on mobile (< 768px)

**Behavior:**
- Clicking the button goes directly to the registration page
- Clicking the banner background goes to the event details page
- Button prevents event propagation (separate click target)

**URL Pattern:**
```
Registration: {baseUrl}/register/
Details:      {baseUrl}
```

**Example:**
```typescript
{
  detailsUrl: "https://events.linuxfoundation.org/kubecon-cloudnativecon-europe/",
  registrationUrl: "https://events.linuxfoundation.org/kubecon-cloudnativecon-europe/register/"
}
```

## Testing

Run the test script to verify rotation logic:

```bash
npm run test:events
# or
node scripts/test-event-rotation.mjs
```

This shows:
- All configured events
- Current next event
- Simulated future rotations
- Edge case handling

## Maintenance

**Monthly Check (recommended):**
1. Visit https://events.linuxfoundation.org/kubecon-cloudnativecon/
2. Check for newly announced events
3. Add new events to `src/config/events.ts`
4. Commit and push

**Automatic Cleanup:**
- Past events don't need removal
- They're automatically filtered at build time
- Keep them for historical reference

## Edge Cases

### No Upcoming Events
```typescript
// If all events have ended
getNextEvent() // returns null
// Banner component doesn't render
```

### Same-Day Event Changes
```typescript
// Europe ends: 2026-03-27
// Build runs: 2026-03-27 06:00 AM UTC
// Europe still shows (end of day logic)

// Next build: 2026-03-28 06:00 AM UTC
// North America shows (Europe filtered out)
```

### Multiple Events on Same Day
```typescript
// If two events start on same day (rare)
// First event in array takes precedence
// Consider: Manual ordering or priority field
```

## UTM Tracking

Each event link includes tracking parameters:

```
?utm_source=firehose&utm_campaign=KubeCon-{REGION}-{YEAR}
```

**Analytics:**
- Track which events drive traffic
- Measure banner effectiveness
- Compare regional interest

## Technical Implementation

**File:** `src/config/events.ts`
- `events[]` - Array of all events
- `getNextEvent()` - Selection logic
- `upcomingEvent` - Exported for backward compatibility

**File:** `src/components/KubeConBanner.astro`
- Renders banner with hover overlay showing event details
- "Register Now" button (CNCF pink → blue on hover)
- Auto-hides if event is null
- Responsive design (overlay always visible on mobile)
- Button click goes to registration, banner click goes to event details

**File:** `src/pages/index.astro`
- Imports upcomingEvent
- Conditionally renders banner
- Positioned below search bar

## Performance

**Static Build:**
- Event selection: ~1ms (at build time)
- Banner HTML: Included in static page
- Image loading: Lazy-loaded from cncf.github.io

**Runtime:**
- Zero JavaScript for basic display
- CSS-only hover effects
- Responsive image loading

## Future Enhancements

**Possible improvements:**
1. **Multi-event display** - Show upcoming events (not just next)
2. **Countdown timer** - Days until event starts
3. **Regional preferences** - Show events based on user location
4. **Client-side rotation** - Update without rebuild (if needed)
5. **Early bird pricing indicator** - Show deadline for discounted registration

**Current approach is optimal for:**
- Simple maintenance
- Fast performance  
- SEO optimization
- Static hosting compatibility

---

**Last Updated:** January 2026  
**Maintainer:** CNCF Projects Team
