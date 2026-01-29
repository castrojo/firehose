---
type: quick
number: 010
title: Add Escape key to unfocus search box
created: 2026-01-29
estimated_effort: 5 minutes
---

# Quick Task 010: Add Escape Key to Unfocus Search Box

## Objective

Enable users to unfocus the search box by pressing Escape, allowing them to return to keyboard navigation (j/k/o/etc.) without using the mouse.

## Current Behavior

When focused inside the search box:
- ✅ Escape clears the search (lines 205-207 in SearchBar.astro)
- ❌ Search input remains focused (keyboard shortcuts still disabled)

## Desired Behavior

When focused inside the search box:
- Escape should blur the search input
- Keyboard navigation shortcuts should become active again
- User can immediately use j/k/o/etc. to navigate releases

## Implementation

<task type="auto">
  <name>Add blur() to Escape key handler in SearchBar</name>
  <files>src/components/SearchBar.astro</files>
  <action>
    Modify the Escape key handler (lines 204-208) to:
    1. Clear the search (existing behavior)
    2. Blur the search input to remove focus
    
    Change from:
    ```typescript
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        clearSearch();
      }
    });
    ```
    
    To:
    ```typescript
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        clearSearch();
        searchInput.blur();
      }
    });
    ```
    
    This allows users to quickly return to keyboard navigation without reaching for the mouse.
  </action>
  <verify>
    1. Run: npm run build
    2. Run: npm run preview
    3. Manual test sequence:
       - Press / to focus search
       - Type a search query
       - Press Escape
       - Immediately press j or k
       - Expected: Navigation works (search is unfocused)
  </verify>
  <done>
    - Escape key clears search AND removes focus from input
    - User can immediately use keyboard navigation shortcuts
    - Build completes successfully
  </done>
</task>

## Success Criteria

- [ ] Pressing Escape in search box clears search
- [ ] Pressing Escape in search box removes focus
- [ ] User can immediately use j/k/o keyboard shortcuts after Escape
- [ ] Build completes without errors
- [ ] Preview server runs successfully

## Files Modified

- `src/components/SearchBar.astro` - Add blur() to Escape handler

## Context

This complements the existing keyboard navigation system:
- `/` or `s` keys focus search (Quick Task 007)
- `j/k` navigate releases (disabled while typing)
- `o/Enter` open focused item
- `Escape` now unfocuses search (this task)

User pain point: After searching, users must click outside the search box to use keyboard navigation again. This change removes that friction.
