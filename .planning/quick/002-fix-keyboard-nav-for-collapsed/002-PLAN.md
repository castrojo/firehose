---
phase: quick-002
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/pages/index.astro
  - src/components/CollapsibleReleaseGroup.astro
autonomous: true

must_haves:
  truths:
    - "j/k navigation skips hidden cards inside collapsed sections"
    - "j/k can focus collapse buttons"
    - "Enter/o on collapse button expands or collapses the section"
    - "Visual focus indicator works on both release cards and collapse buttons"
  artifacts:
    - path: "src/pages/index.astro"
      provides: "KeyboardNavigator that tracks visible items and collapse buttons"
      contains: "querySelectorAll.*release-card.*not.*aria-hidden.*collapse-button"
    - path: "src/components/CollapsibleReleaseGroup.astro"
      provides: "Collapse state change event dispatching"
      contains: "dispatchEvent.*collapseStateChanged"
  key_links:
    - from: "KeyboardNavigator.refresh()"
      to: ".release-card:not([aria-hidden=\"true\"] .release-card), .collapse-button"
      via: "querySelectorAll selector"
      pattern: "querySelectorAll.*not.*aria-hidden"
    - from: "CollapsibleReleaseGroup button click"
      to: "document.dispatchEvent"
      via: "custom event dispatch"
      pattern: "dispatchEvent.*collapseStateChanged"
---

<objective>
Fix keyboard navigation to work seamlessly with collapsed release sections by tracking only visible items and collapse buttons.

Purpose: Eliminate the broken UX where pressing j/k appears to do nothing because focus is moving through hidden cards.
Output: Keyboard navigation that skips collapsed cards, focuses collapse buttons, and expands/collapses on Enter.
</objective>

<execution_context>
@~/.config/opencode/get-shit-done/workflows/execute-plan.md
@~/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/pages/index.astro
@src/components/CollapsibleReleaseGroup.astro
</context>

<tasks>

<task type="auto">
  <name>Update KeyboardNavigator to track visible items only</name>
  <files>src/pages/index.astro</files>
  <action>
Modify the KeyboardNavigator class in the client-side script section:

1. **Update constructor and refresh() method:**
   - Change selector from `.release-card` to `.release-card:not([aria-hidden="true"] .release-card), .collapse-button`
   - This excludes cards inside collapsed sections (aria-hidden="true") and includes collapse buttons as navigable items
   
2. **Update openFocused() method:**
   - Detect if focused item is a collapse button: `item.classList.contains('collapse-button')`
   - If collapse button: trigger `item.click()` instead of opening a link
   - If release card: keep existing behavior (open link in new tab)
   
3. **Add event listener for collapse state changes:**
   - In DOMContentLoaded handler, add: `document.addEventListener('collapseStateChanged', () => navigator?.refresh())`
   - This refreshes the navigable items list when sections expand/collapse
   
4. **Add CSS for collapse button focus indicator:**
   - After existing `.kbd-focused` styles (~line 619), add:
   ```css
   :global(.collapse-button.kbd-focused) {
     box-shadow: 0 0 0 2px rgba(9, 105, 218, 0.15), 0 4px 12px rgba(0, 0, 0, 0.08);
     border-color: #0969da;
   }
   ```

**Why these changes:**
- Selector with `:not([aria-hidden="true"] .release-card)` excludes cards that are descendants of elements with aria-hidden="true"
- Including `.collapse-button` allows j/k to focus the expand/collapse buttons
- Detecting collapse button type allows Enter to trigger expand/collapse instead of trying to open a non-existent link
- Event listener ensures item list stays synchronized after expand/collapse actions
  </action>
  <verify>
```bash
# Build should succeed with no errors
npm run build

# Search for updated selector in build output
grep -A 3 "querySelectorAll.*release-card" src/pages/index.astro

# Search for collapseStateChanged listener
grep "collapseStateChanged" src/pages/index.astro
```
  </verify>
  <done>
- KeyboardNavigator constructor/refresh uses selector that excludes hidden cards and includes collapse buttons
- openFocused() checks for collapse-button class and triggers click instead of link opening
- Event listener for 'collapseStateChanged' event registered in DOMContentLoaded
- CSS styling for `.collapse-button.kbd-focused` added
  </done>
</task>

<task type="auto">
  <name>Add collapse state change event dispatching</name>
  <files>src/components/CollapsibleReleaseGroup.astro</files>
  <action>
Modify the collapse button click handler in the `<script>` section:

1. **Dispatch event after expand:**
   - After line 201 (after `setTimeout(() => { collapsedSection.classList.remove('expanding'); }, 300);`)
   - Add: `document.dispatchEvent(new CustomEvent('collapseStateChanged'));`
   
2. **Dispatch event after collapse:**
   - After line 191 (after `setTimeout(() => { ... btn.setAttribute('aria-expanded', 'false'); }, 300);`)
   - Add: `document.dispatchEvent(new CustomEvent('collapseStateChanged'));`

**Why:**
- KeyboardNavigator needs to know when the DOM changes due to expand/collapse
- Custom event allows decoupled communication between components
- Event triggers navigator.refresh() to rebuild the item list with current visible cards
  </action>
  <verify>
```bash
# Search for event dispatch calls
grep -n "dispatchEvent.*collapseStateChanged" src/components/CollapsibleReleaseGroup.astro

# Should find 2 occurrences (one in expand, one in collapse)
```
  </verify>
  <done>
- CustomEvent('collapseStateChanged') dispatched after expand animation completes
- CustomEvent('collapseStateChanged') dispatched after collapse animation completes
- Events allow KeyboardNavigator to refresh its item list
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
Keyboard navigation that intelligently handles collapsed release sections:
- j/k skips hidden cards inside collapsed sections
- j/k can focus collapse buttons
- Enter/o on collapse button expands/collapses the section
- Navigation refreshes automatically after expand/collapse
- Visual focus indicator works on both cards and buttons
  </what-built>
  <how-to-verify>
1. **Start preview server:**
   ```bash
   .dev-tools/restart-preview.sh
   ```

2. **Open browser:** http://localhost:4321/firehose/

3. **Test skipping collapsed cards:**
   - Scroll to a release group with "X more releases" button
   - Collapse it by default if expanded
   - Press `j` repeatedly
   - ✅ EXPECTED: Focus should jump from lead release card directly to the collapse button, NOT stop on hidden cards
   - ✅ EXPECTED: Console should show debug logs like `[KeyboardNav] Refreshed, now tracking N items` where N excludes hidden cards

4. **Test focusing collapse button:**
   - Navigate with j/k to a collapse button
   - ✅ EXPECTED: Collapse button should show blue border focus indicator (same style as release cards)
   - ✅ EXPECTED: Button should be visually distinct when focused

5. **Test Enter/o on collapse button:**
   - Focus a collapsed section's button (says "X more releases")
   - Press `Enter` or `o`
   - ✅ EXPECTED: Section should expand, revealing additional release cards
   - ✅ EXPECTED: Button text should remain visible (says "X more releases")
   - Focus the same button again (press `j` then `k`)
   - Press `Enter` or `o` again
   - ✅ EXPECTED: Section should collapse, hiding additional cards

6. **Test navigation after expand:**
   - Focus collapse button with section collapsed
   - Press Enter to expand
   - Press `j` to navigate down
   - ✅ EXPECTED: Focus should move to first card in newly expanded section
   - ✅ EXPECTED: No "stuck" behavior or invisible focus

7. **Test navigation after collapse:**
   - With section expanded, navigate into the collapsed cards region
   - Navigate back up to collapse button
   - Press Enter to collapse
   - Press `j` to navigate down
   - ✅ EXPECTED: Focus should skip over the now-hidden cards
   - ✅ EXPECTED: Jump directly to next visible item (next release or collapse button)

8. **Test across multiple groups:**
   - Navigate through multiple release groups with j/k
   - Expand and collapse different sections
   - ✅ EXPECTED: Navigation should always skip hidden cards
   - ✅ EXPECTED: No broken states or confusing jumps

**Check browser console for:**
- No JavaScript errors
- Debug logs showing item count changes after expand/collapse
- `[KeyboardNav] Refreshed, now tracking X items` messages
  </how-to-verify>
  <resume-signal>
Type "approved" if keyboard navigation works correctly with collapsed sections, or describe any issues found.
  </resume-signal>
</task>

</tasks>

<verification>
1. Build completes successfully (`npm run build`)
2. KeyboardNavigator selector updated to exclude hidden cards and include collapse buttons
3. openFocused() detects and handles collapse buttons differently from release cards
4. collapseStateChanged event dispatched after expand/collapse animations
5. Event listener registered to refresh navigator on state changes
6. CSS focus styling added for collapse buttons
7. Human verification confirms j/k navigation skips hidden cards and works with collapse buttons
</verification>

<success_criteria>
- j/k navigation never focuses hidden cards inside collapsed sections
- Collapse buttons receive focus and show visual indicator
- Enter/o key on collapse button expands/collapses the section
- Navigation refreshes automatically after state changes
- No JavaScript errors in console
- User reports keyboard navigation feels natural and predictable
</success_criteria>

<output>
After completion, create `.planning/quick/002-fix-keyboard-nav-for-collapsed/002-SUMMARY.md`
</output>
