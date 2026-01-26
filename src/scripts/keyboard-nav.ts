// src/scripts/keyboard-nav.ts

export class KeyboardNavigator {
  private focusedIndex = -1;
  private items: HTMLElement[] = [];
  private searchInput: HTMLInputElement | null = null;
  
  constructor(itemSelector: string, searchInputSelector: string) {
    this.items = Array.from(document.querySelectorAll(itemSelector));
    this.searchInput = document.querySelector(searchInputSelector);
    this.attachListeners();
    console.log(`[KeyboardNav] Initialized with ${this.items.length} items`);
  }
  
  private attachListeners(): void {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      // Don't intercept when user is typing in inputs
      if (this.isTypingContext(e.target)) return;
      
      switch(e.key) {
        case 'j': // Next release
          e.preventDefault();
          this.moveDown();
          break;
        case 'k': // Previous release
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
        case 'Escape': // Close help or blur search
          this.handleEscape();
          break;
      }
    });
  }
  
  private isTypingContext(target: EventTarget | null): boolean {
    if (!target || !(target instanceof HTMLElement)) return false;
    const tagName = target.tagName.toLowerCase();
    
    // Check for input elements
    if (tagName === 'input' || tagName === 'textarea') return true;
    
    // Check for contentEditable
    if (target.isContentEditable) return true;
    
    // Check if inside Pagefind search UI (future-proof for search component)
    if (target.closest('.pagefind-ui') || target.closest('.search-bar')) return true;
    
    return false;
  }
  
  private moveDown(): void {
    if (this.items.length === 0) return;
    
    this.focusedIndex = Math.min(this.focusedIndex + 1, this.items.length - 1);
    this.scrollToFocused();
    this.announceNavigation();
  }
  
  private moveUp(): void {
    if (this.items.length === 0) return;
    
    this.focusedIndex = Math.max(this.focusedIndex - 1, 0);
    this.scrollToFocused();
    this.announceNavigation();
  }
  
  private scrollToFocused(): void {
    const item = this.items[this.focusedIndex];
    if (!item) return;
    
    // Remove previous focus styling
    this.items.forEach(el => el.classList.remove('kbd-focused'));
    
    // Add focus styling to current item
    item.classList.add('kbd-focused');
    
    // Scroll into view smoothly (only if not visible)
    item.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'nearest',
      inline: 'nearest'
    });
  }
  
  private openFocused(): void {
    const item = this.items[this.focusedIndex];
    if (!item) return;
    
    const link = item.querySelector('a[href]') as HTMLAnchorElement;
    if (link) {
      window.open(link.href, '_blank', 'noopener,noreferrer');
    }
  }
  
  private focusSearch(): void {
    if (this.searchInput) {
      this.searchInput.focus();
      this.searchInput.select(); // Select existing text
    }
  }
  
  private showHelp(): void {
    const modal = document.getElementById('keyboard-help-modal');
    const backdrop = document.getElementById('keyboard-help-backdrop');
    modal?.classList.add('visible');
    backdrop?.classList.add('visible');
  }
  
  private hideHelp(): void {
    const modal = document.getElementById('keyboard-help-modal');
    const backdrop = document.getElementById('keyboard-help-backdrop');
    modal?.classList.remove('visible');
    backdrop?.classList.remove('visible');
  }
  
  private handleEscape(): void {
    // If help modal is open, close it
    const helpModal = document.getElementById('keyboard-help-modal');
    if (helpModal?.classList.contains('visible')) {
      this.hideHelp();
      return;
    }
    
    // If search is focused, blur it
    if (document.activeElement === this.searchInput) {
      this.searchInput?.blur();
      return;
    }
    
    // Otherwise, clear keyboard focus
    this.items.forEach(el => el.classList.remove('kbd-focused'));
    this.focusedIndex = -1;
  }
  
  private announceNavigation(): void {
    const item = this.items[this.focusedIndex];
    const liveRegion = document.getElementById('kbd-live-region');
    if (liveRegion && item) {
      const title = item.querySelector('h2, .release-title')?.textContent?.trim() || 'Release';
      liveRegion.textContent = `Focused: ${title}`;
    }
  }
  
  // Public method to refresh items (for infinite scroll)
  public refresh(): void {
    this.items = Array.from(document.querySelectorAll('.release-card'));
    console.log(`[KeyboardNav] Refreshed, now tracking ${this.items.length} items`);
  }
}

// Auto-initialize on page load
if (typeof window !== 'undefined') {
  let navigator: KeyboardNavigator | null = null;
  
  document.addEventListener('DOMContentLoaded', () => {
    navigator = new KeyboardNavigator('.release-card', '#search-input, .search-bar input');
    
    // Refresh on infinite scroll load (listen for custom event or observe DOM)
    const observer = new MutationObserver(() => {
      navigator?.refresh();
    });
    
    const releaseList = document.getElementById('release-list');
    if (releaseList) {
      observer.observe(releaseList, { childList: true });
    }
    
    // Also observe the infinite scroll container for dynamic content
    const infiniteScrollContainer = document.querySelector('.infinite-scroll-container');
    if (infiniteScrollContainer) {
      observer.observe(infiniteScrollContainer, { childList: true, subtree: true });
    }
  });
}
