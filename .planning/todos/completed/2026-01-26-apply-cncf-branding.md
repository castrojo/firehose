---
created: 2026-01-26T20:52
title: Apply CNCF official style guidelines and branding
area: ui
files:
  - src/pages/index.astro
  - src/components/ReleaseCard.astro
---

## Problem

The Firehose currently uses generic GitHub Primer styling. To align with CNCF ecosystem standards and improve brand recognition, the site should adopt official CNCF style guidelines and branding elements.

**Context:**
- Site aggregates CNCF project releases but lacks CNCF visual identity
- Users may not immediately recognize this as an official/community CNCF resource
- CNCF has published style guidelines and brand assets
- Current styling is functional but generic (GitHub Primer variables)

**Goals:**
- Establish clear CNCF visual identity
- Apply official color palette, typography, and spacing guidelines
- Integrate CNCF logo and branding elements appropriately
- Maintain accessibility and responsive design standards

**Priority:** High for production deployment (mentioned in backlog)

## Solution

**Research needed:**
- Review CNCF style guide: https://github.com/cncf/artwork
- Check CNCF website (cncf.io) for color schemes and typography
- Identify official fonts, colors, spacing standards
- Determine logo placement guidelines and usage restrictions

**Implementation approach:**
1. Update CSS variables in `index.astro` to match CNCF color palette
2. Replace GitHub Primer conventions with CNCF-approved styling
3. Add CNCF logo/attribution (header, footer, or sidebar)
4. Apply typography standards (fonts, weights, sizes)
5. Ensure contrast ratios meet accessibility standards (WCAG AA)
6. Test responsive behavior with new styling

**Related todos:**
- Project logos on release cards (2026-01-26-add-cncf-project-logos.md)
- Sidebar info box with CNCF links (2026-01-26-add-sidebar-info-box.md)

**Note:** This is a broader milestone that encompasses multiple UI enhancements. Consider breaking down into specific tasks during planning phase.
