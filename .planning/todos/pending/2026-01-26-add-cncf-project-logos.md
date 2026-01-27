---
created: 2026-01-26T20:49
title: Add CNCF project logos to release cards
area: ui
files:
  - src/components/ReleaseCard.astro
---

## Problem

Currently, release cards show project names as text only. To improve visual recognition and project identity, each release card should display the project's unique logo from the cncf/artwork repository.

**Context:**
- CNCF maintains official project logos at https://github.com/cncf/artwork
- Each project has artwork in various formats and aspect ratios
- Need to use appropriate aspect ratio (squarish preferred for card layout)
- Should integrate with existing ReleaseCard component
- Must maintain responsive design and accessibility

**Visual Enhancement:**
- Helps users quickly identify projects at a glance
- Adds professional polish aligned with CNCF branding
- Makes the feed more visually engaging

## Solution

**Approach:**
1. Map project names to cncf/artwork repository paths
2. Use appropriate logo format (SVG preferred, PNG fallback)
3. Add logo display to ReleaseCard.astro component
4. Ensure proper sizing for sidebar layout (likely 32x32 or 48x48px)
5. Add fallback for projects without logos
6. Consider loading strategy (inline vs. external URLs)

**Technical considerations:**
- Logo sizing should work in current sidebar + content grid layout
- Need alt text for accessibility
- May need to fetch artwork repo structure to map projects to logo paths
- Consider using GitHub raw.githubusercontent.com URLs for direct loading

**Related:**
- Part of optional CNCF branding enhancement mentioned in backlog
- Could be combined with description truncation for cleaner visual hierarchy
