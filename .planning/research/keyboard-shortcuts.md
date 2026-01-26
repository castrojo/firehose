# Keyboard Shortcuts Implementation

**Research Date:** 2026-01-26  
**Purpose:** Document best practices for implementing vim-style keyboard shortcuts in web applications  
**Confidence:** HIGH (established patterns)

## Overview

Vim-style keyboard navigation (j/k for down/up, / for search, o for open) improves power-user experience without requiring external dependencies. Implementation requires careful handling of focus states and input contexts to avoid conflicts.

## Recommended Approach: Native JavaScript Event Listeners

**Why:** Zero dependencies, full control, standard web platform APIs

### Core Implementation Pattern

```typescript
// src/components/KeyboardNav.astro or .ts
class KeyboardNavigator {
  private focusedIndex = -1;
  private items: HTMLElement[] = [];
  
  constructor(itemSelector: string) {
    this.items = Array.from(document.querySelectorAll(itemSelector));
    this.attachListeners();
  }
  
  private attachListeners() {
    document.addEventListener('keydown', (e) => {
      // Don't intercept when user is typing in inputs
      if (this.isTypingContext(e.target)) return;
      
      switch(e.key) {
        case 'j': // Down
          e.preventDefault();
          this.moveDown();
          break;
        case 'k': // Up
          e.preventDefault();
          this.moveUp();
          break;
        case '/': // Focus search
          e.preventDefault();
          this.focusSearch();
          break;
        case 'o': // Open in new tab
        case 'Enter':
          e.preventDefault();
          this.openFocused();
          break;
        case '?': // Help modal
          e.preventDefault();
          this.showHelp();
          break;
      }
    });
  }
  
  private isTypingContext(target: EventTarget | null): boolean {
    if (!target || !(target instanceof HTMLElement)) return false;
    const tagName = target.tagName.toLowerCase();
    return tagName === 'input' || 
           tagName === 'textarea' || 
           target.isContentEditable;
  }
  
  private moveDown() {
    this.focusedIndex = Math.min(this.focusedIndex + 1, this.items.length - 1);
    this.scrollToFocused();
  }
  
  private moveUp() {
    this.focusedIndex = Math.max(this.focusedIndex - 1, 0);
    this.scrollToFocused();
  }
  
  private scrollToFocused() {
    const item = this.items[this.focusedIndex];
    if (!item) return;
    
    // Remove previous focus styling
    this.items.forEach(el => el.classList.remove('kbd-focused'));
    
    // Add focus styling
    item.classList.add('kbd-focused');
    
    // Scroll into view smoothly
    item.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'nearest' 
    });
  }
  
  private openFocused() {
    const item = this.items[this.focusedIndex];
    if (!item) return;
    
    const link = item.querySelector('a[href]') as HTMLAnchorElement;
    if (link) {
      window.open(link.href, '_blank');
    }
  }
  
  private focusSearch() {
    const searchInput = document.querySelector('#search-input') as HTMLInputElement;
    searchInput?.focus();
  }
  
  private showHelp() {
    // Show modal with keyboard shortcuts
    const modal = document.querySelector('#keyboard-help-modal');
    modal?.classList.add('visible');
  }
}

// Initialize on page load
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    new KeyboardNavigator('.release-item');
  });
}
```

## CSS for Visual Focus Indicator

```css
/* Visual indicator for keyboard-focused item */
.release-item {
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

.release-item.kbd-focused {
  box-shadow: 0 0 0 3px rgba(3, 102, 214, 0.3);
  border-color: #0366d6;
  outline: none;
}

/* Help modal */
#keyboard-help-modal {
  display: none;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  border: 1px solid #d1d5da;
  border-radius: 6px;
  padding: 24px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  max-width: 400px;
}

#keyboard-help-modal.visible {
  display: block;
}

/* Backdrop */
#keyboard-help-backdrop {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
}

#keyboard-help-backdrop.visible {
  display: block;
}
```

## Help Modal Content

```html
<div id="keyboard-help-backdrop" class="visible"></div>
<div id="keyboard-help-modal" class="visible">
  <h2>Keyboard Shortcuts</h2>
  <table>
    <tr>
      <td><kbd>j</kbd></td>
      <td>Next release</td>
    </tr>
    <tr>
      <td><kbd>k</kbd>
      <td>Previous release</td>
    </tr>
    <tr>
      <td><kbd>o</kbd> or <kbd>Enter</kbd></td>
      <td>Open focused release in new tab</td>
    </tr>
    <tr>
      <td><kbd>/</kbd></td>
      <td>Focus search input</td>
    </tr>
    <tr>
      <td><kbd>?</kbd></td>
      <td>Show this help</td>
    </tr>
    <tr>
      <td><kbd>Esc</kbd></td>
      <td>Close this help</td>
    </tr>
  </table>
  <button id="close-help">Close</button>
</div>
```

## Critical Implementation Details

### 1. Context Detection

**MUST CHECK** if user is typing before intercepting keys:

```typescript
private isTypingContext(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  
  // Check for input elements
  if (tagName === 'input' || tagName === 'textarea') return true;
  
  // Check for contentEditable (rich text editors)
  if (target.isContentEditable) return true;
  
  // Check if inside Pagefind search (it creates dynamic inputs)
  if (target.closest('.pagefind-ui')) return true;
  
  return false;
}
```

**Why critical:** Users expect normal typing in search boxes. Intercepting `/` while typing would break search.

### 2. Prevent Default Behavior

```typescript
case 'j':
  e.preventDefault(); // Prevents page scroll
  this.moveDown();
  break;
```

**Why critical:** `j`/`k` would trigger browser's quick-find or other default actions.

### 3. Smooth Scrolling with `scrollIntoView`

```typescript
item.scrollIntoView({ 
  behavior: 'smooth',  // Animate scroll
  block: 'nearest'     // Only scroll if item is offscreen
});
```

**Why critical:** `block: 'nearest'` prevents jarring jumps when item is already visible.

### 4. Focus Management for `/` Key

```typescript
private focusSearch() {
  const searchInput = document.querySelector('#search-input') as HTMLInputElement;
  if (searchInput) {
    searchInput.focus();
    // Optionally select existing text
    searchInput.select();
  }
}
```

**Escape to blur:**

```typescript
case 'Escape':
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
  break;
```

**Why critical:** Vim users expect `/` to enter search mode and `Esc` to exit.

### 5. Help Modal Toggle

```typescript
private showHelp() {
  const modal = document.querySelector('#keyboard-help-modal');
  const backdrop = document.querySelector('#keyboard-help-backdrop');
  modal?.classList.add('visible');
  backdrop?.classList.add('visible');
}

private hideHelp() {
  const modal = document.querySelector('#keyboard-help-modal');
  const backdrop = document.querySelector('#keyboard-help-backdrop');
  modal?.classList.remove('visible');
  backdrop?.classList.remove('visible');
}

// Attach to modal close button and Escape key
document.querySelector('#close-help')?.addEventListener('click', () => {
  this.hideHelp();
});

// In keydown handler:
case 'Escape':
  this.hideHelp();
  break;
```

## Accessibility Considerations

### 1. Focus Indicator Must Be Visible

```css
.release-item.kbd-focused {
  /* High contrast, 3:1 ratio minimum */
  box-shadow: 0 0 0 3px rgba(3, 102, 214, 0.3);
  border-color: #0366d6;
}
```

### 2. Help Should Be Discoverable

Add a visible `?` icon in UI for users who don't know about keyboard shortcuts:

```html
<button id="show-shortcuts" aria-label="Keyboard shortcuts">
  <span aria-hidden="true">?</span>
</button>
```

### 3. Don't Break Tab Navigation

Keyboard shortcuts should complement, not replace, standard Tab-based navigation:

```typescript
// Allow Tab to work normally
case 'Tab':
  return; // Let browser handle it
```

### 4. Screen Reader Announcements

```typescript
private announceNavigation() {
  const item = this.items[this.focusedIndex];
  const liveRegion = document.querySelector('#kbd-live-region');
  if (liveRegion && item) {
    const title = item.querySelector('h2')?.textContent || 'Release';
    liveRegion.textContent = `Focused: ${title}`;
  }
}
```

```html
<!-- In layout -->
<div id="kbd-live-region" aria-live="polite" aria-atomic="true" class="sr-only"></div>
```

## Integration with Pagefind

Pagefind creates its own search input dynamically. Ensure keyboard shortcuts don't interfere:

```typescript
// Wait for Pagefind to initialize
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const pagefindInput = document.querySelector('.pagefind-ui__search-input');
    if (pagefindInput) {
      // Pagefind's input is now in the DOM
      // isTypingContext() will handle it via .closest('.pagefind-ui')
    }
  }, 100);
});
```

## Testing Checklist

- [ ] j/k navigate between items
- [ ] Enter/o opens focused item in new tab
- [ ] / focuses search input
- [ ] ? shows help modal
- [ ] Esc closes help modal
- [ ] Esc from search blurs input
- [ ] Typing in search doesn't trigger shortcuts
- [ ] Typing in Pagefind doesn't trigger shortcuts
- [ ] Tab navigation still works
- [ ] Focus indicator is visible
- [ ] Smooth scrolling works
- [ ] Screen reader announces focused item
- [ ] Works with mouse + keyboard (hybrid use)
- [ ] Help modal is accessible via click

## Alternative Libraries (Not Recommended)

### Mousetrap

- **Pros:** Popular, well-tested
- **Cons:** 7KB minified, overkill for simple shortcuts, last updated 2017
- **Verdict:** Unnecessary dependency for simple use case

### Hotkeys-js

- **Pros:** Modern, TypeScript support
- **Cons:** 5KB minified, still unnecessary for ~50 lines of native code
- **Verdict:** Save the bytes

### React/Vue keyboard libraries

- **Cons:** Framework-specific, Astro is framework-agnostic
- **Verdict:** Don't add framework just for shortcuts

## Recommended Stack

**Technology:** Native JavaScript + TypeScript
**Dependencies:** Zero (use Web APIs)
**Bundle Size:** ~2KB minified (inline code)
**Browser Support:** All modern browsers (ES6+)

## Implementation Checklist for Phase 4

- [ ] Create `src/scripts/keyboard-nav.ts` with KeyboardNavigator class
- [ ] Add `.kbd-focused` CSS styles
- [ ] Create keyboard help modal component
- [ ] Add help button to UI (? icon)
- [ ] Add `#kbd-live-region` for screen readers
- [ ] Test with Pagefind integration
- [ ] Document shortcuts in README
- [ ] Add shortcuts to success criteria verification

## References

- [MDN: KeyboardEvent](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent)
- [MDN: Element.scrollIntoView()](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView)
- [WCAG 2.1: Focus Visible](https://www.w3.org/WAI/WCAG21/Understanding/focus-visible.html)
- [Vim keyboard navigation pattern examples](https://vimium.github.io/) (browser extension, not dependency)

---

**Status:** Research complete, ready for implementation  
**Recommendation:** Native JavaScript implementation, zero dependencies  
**Complexity:** Low (50-100 lines of code)  
**Accessibility:** High (with proper focus indicators and screen reader support)
