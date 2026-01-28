---
task: quick-007
type: execute
wave: 1
depends_on: []
files_modified:
  - src/pages/index.astro
  - src/components/KeyboardHelp.astro
autonomous: true
---

# Quick Task 007: Add Keyboard Shortcuts (Space/Shift+Space/h)

## Objective

Add three new keyboard shortcuts to enhance navigation:
- **Space** → Page down (scroll down by viewport height)
- **Shift+Space** → Page up (scroll up by viewport height)  
- **h** → Go home (scroll to top of page)

These shortcuts complement existing j/k navigation by enabling faster page-level scrolling.

## Context

Current keyboard navigation (index.astro lines 346-379):
- j/k for item-by-item navigation
- o/Enter to open focused item
- / to focus search
- ? to show help
- t to toggle theme
- Escape to close/blur

Current KeyboardHelp.astro shows 7 shortcuts in modal table.

## Tasks

### Task 1: Add keyboard event handlers
**Files:** `src/pages/index.astro`

**Action:**
Add three new cases to the keydown event listener switch statement (around line 349):

1. **Space key** - Page down:
   ```javascript
   case ' ':
     if (!e.shiftKey) {
       e.preventDefault();
       window.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
     }
     break;
   ```

2. **Shift+Space** - Page up:
   ```javascript
   case ' ':
     if (e.shiftKey) {
       e.preventDefault();
       window.scrollBy({ top: -window.innerHeight, behavior: 'smooth' });
     }
     break;
   ```
   
   Note: Combine both Space cases into one with if/else for shift detection

3. **h key** - Scroll to top:
   ```javascript
   case 'h':
     e.preventDefault();
     window.scrollTo({ top: 0, behavior: 'smooth' });
     break;
   ```

**Implementation notes:**
- Place after 't' case (line 371-374) and before 'Escape' case (line 375-377)
- Use `window.scrollBy()` for relative scrolling (Space/Shift+Space)
- Use `window.scrollTo()` for absolute positioning (h for home)
- All use `behavior: 'smooth'` for consistent UX
- Space key check must handle Shift modifier properly

**Verify:**
```bash
npm run build && npm run preview
# Test in browser:
# 1. Press Space → page scrolls down smoothly
# 2. Press Shift+Space → page scrolls up smoothly
# 3. Press h → page scrolls to top smoothly
# 4. Verify shortcuts disabled when typing in search input
```

**Done:** Space, Shift+Space, and h keys trigger smooth scrolling. Shortcuts remain disabled in typing contexts.

---

### Task 2: Document shortcuts in keyboard help modal
**Files:** `src/components/KeyboardHelp.astro`

**Action:**
Add three new rows to the shortcuts table (between line 48 `</tr>` for Esc and line 49 `</tbody>`):

```html
<tr>
  <td class="shortcut-key"><kbd>Space</kbd></td>
  <td class="shortcut-description">Page down</td>
</tr>
<tr>
  <td class="shortcut-key"><kbd>Shift</kbd> + <kbd>Space</kbd></td>
  <td class="shortcut-description">Page up</td>
</tr>
<tr>
  <td class="shortcut-key"><kbd>h</kbd></td>
  <td class="shortcut-description">Scroll to top</td>
</tr>
```

**Placement:** Insert after the `Esc` row (line 46-48) and before `</tbody>` (line 49).

**Verify:**
```bash
# In browser:
# 1. Press ? to open help modal
# 2. Verify 10 shortcuts listed (was 7, now 10)
# 3. Verify Space, Shift+Space, and h shortcuts documented
# 4. Check table formatting matches existing rows
# 5. Test on mobile (320px width) - table should remain readable
```

**Done:** Keyboard help modal shows all 10 shortcuts with clear descriptions. Mobile layout remains functional.

## Success Criteria

- [x] Space key scrolls down by one viewport height
- [x] Shift+Space scrolls up by one viewport height  
- [x] h key scrolls to top of page
- [x] All three shortcuts use smooth scrolling behavior
- [x] Shortcuts disabled when typing in input fields
- [x] Keyboard help modal documents all 10 shortcuts
- [x] Build completes without errors
- [x] Preview server demonstrates working shortcuts

## Verification Commands

```bash
# Build and preview
npm run build
npm run preview

# Test all shortcuts:
# - Space (page down)
# - Shift+Space (page up)
# - h (home/top)
# - ? (help modal shows 10 shortcuts)
```

## Output

After completion, create summary:
`.planning/quick/007-add-keyboard-shortcuts-space-shift-space/007-SUMMARY.md`
