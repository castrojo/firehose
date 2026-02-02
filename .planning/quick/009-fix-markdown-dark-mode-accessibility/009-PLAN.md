# Quick Task 009: Fix Markdown Dark Mode Accessibility

**Date:** 2026-01-28  
**Priority:** High  
**Type:** Bug Fix - Accessibility

## Problem Statement

User reported: "The markdown table used in the falco entry on the homepage uses inaccessible colors when in dark mode"

**Root cause:** Markdown rendering in `ReleaseCard.astro` uses hardcoded light-mode colors that don't adapt to theme changes, violating WCAG AA accessibility standards in dark mode.

**Affected elements:**
- Table borders and headers
- Heading underlines (h1, h2)
- Code block backgrounds
- Blockquote colors
- Horizontal rules

## Current Behavior

Hardcoded colors in `ReleaseCard.astro`:
- `#d0d7de` - Light gray borders (invisible on dark backgrounds)
- `#f6f8fa` - Light gray backgrounds (poor contrast)
- `#57606a` - Dark text (insufficient contrast on dark bg)
- `rgba(175, 184, 193, 0.2)` - Light code background

## Desired Behavior

All markdown elements should:
1. Adapt to the current theme (light/dark)
2. Meet WCAG AA contrast requirements
3. Use CSS variables consistent with site theming
4. Maintain GitHub-style markdown aesthetics

## Solution Approach

### 1. Add CSS Variables (index.astro)

**Light mode variables:**
```css
--color-markdown-border: #d0d7de;
--color-markdown-bg-muted: #f6f8fa;
--color-markdown-code-bg: rgba(175, 184, 193, 0.2);
--color-markdown-blockquote: #57606a;
```

**Dark mode overrides:**
```css
--color-markdown-border: #3d444d;          /* Darker borders */
--color-markdown-bg-muted: #161b22;        /* Dark elevated bg */
--color-markdown-code-bg: rgba(110, 118, 129, 0.4);  /* Dark code bg */
--color-markdown-blockquote: #8b949e;      /* Muted text */
```

### 2. Update ReleaseCard.astro

Replace all hardcoded colors with CSS variables:
- `.markdown-body table th, td` borders
- `.markdown-body table th` background
- `.markdown-body h1, h2` border-bottom
- `.markdown-body code` background
- `.markdown-body pre` background
- `.markdown-body blockquote` border and color
- `.markdown-body hr` background

## Implementation Steps

1. ✅ Add markdown CSS variables to `:root` in index.astro
2. ✅ Add dark mode overrides in `[data-theme="dark"]`
3. ✅ Update table styles in ReleaseCard.astro
4. ✅ Update heading styles
5. ✅ Update code block styles
6. ✅ Update blockquote styles
7. ✅ Update horizontal rule styles
8. ✅ Test in both light and dark modes

## Testing Criteria

- [ ] Table borders visible in both themes
- [ ] Table headers have readable background
- [ ] Heading underlines visible
- [ ] Code blocks have proper contrast
- [ ] Blockquotes readable
- [ ] Horizontal rules visible
- [ ] Build succeeds with no errors
- [ ] WCAG AA compliance verified

## Files to Modify

- `src/pages/index.astro` - Add CSS variables
- `src/components/ReleaseCard.astro` - Update markdown styles

## Success Metrics

- All markdown content meets WCAG AA contrast ratios
- Falco entry table readable in dark mode
- No visual regression in light mode
- Consistent with GitHub Primer design system

## Risks & Considerations

- **Low risk:** Only changing colors, not layout
- **Testing:** Must verify all markdown elements (tables, code, quotes, hr)
- **Compatibility:** CSS variables supported in all modern browsers

## Estimated Duration

~30 minutes

## References

- WCAG AA Contrast: 4.5:1 for normal text, 3:1 for large text
- GitHub Primer dark theme colors
- Existing CNCF color system in index.astro
