/**
 * Keyboard navigation for release/news listing pages.
 *
 * Shared between src/pages/index.astro (releases) and
 * src/pages/news/index.astro (news).  Each page instantiates
 * KeyboardNavigator with its own item selector and wires up the
 * MutationObserver for its specific list container.
 */
export class KeyboardNavigator {
  focusedIndex = -1;
  items: HTMLElement[] = [];
  searchInput: HTMLElement | null = null;
  itemSelector: string;

  constructor(itemSelector: string, searchInputSelector: string) {
    this.itemSelector = itemSelector;
    this.items = Array.from(document.querySelectorAll<HTMLElement>(itemSelector));
    this.searchInput = document.querySelector<HTMLElement>(searchInputSelector);
    this.attachListeners();
  }

  attachListeners() {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (this.isTypingContext(e.target as HTMLElement | null)) return;

      switch (e.key) {
        case 'j':
          e.preventDefault();
          this.moveFocus(1);
          break;
        case 'k':
          e.preventDefault();
          this.moveFocus(-1);
          break;
        case '/':
          e.preventDefault();
          this.focusSearch();
          break;
        case 'o':
        case 'Enter':
          e.preventDefault();
          this.openFocused();
          break;
        case '?':
          e.preventDefault();
          this.showHelp();
          break;
        case 't':
          e.preventDefault();
          this.toggleTheme();
          break;
        case ' ':
          e.preventDefault();
          if ((e as KeyboardEvent).shiftKey) {
            window.scrollBy({ top: -window.innerHeight, behavior: 'smooth' });
          } else {
            window.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
          }
          break;
        case 'h':
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });
          break;
        case 's':
          e.preventDefault();
          this.focusSearch();
          break;
        case 'Escape':
          this.handleEscape();
          break;
      }
    });
  }

  isTypingContext(target: HTMLElement | null): boolean {
    if (!target) return false;
    const tag = target.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
    if (target.isContentEditable) return true;
    // Also bail out inside search/pagefind widgets
    if (target.closest('.pagefind-ui') || target.closest('.search-bar')) return true;
    return false;
  }

  moveFocus(direction: number) {
    // Re-query to pick up newly-loaded items; exclude items inside aria-hidden containers
    const visibleItems = Array.from(
      document.querySelectorAll<HTMLElement>(this.itemSelector)
    ).filter((el) => !el.closest('[aria-hidden="true"]'));
    this.items = visibleItems;

    if (this.items.length === 0) return;

    this.items.forEach((el) => el.classList.remove('kbd-focused'));

    this.focusedIndex = Math.max(
      0,
      Math.min(this.items.length - 1, this.focusedIndex + direction)
    );

    const focused = this.items[this.focusedIndex];
    if (focused) {
      focused.classList.add('kbd-focused');
      focused.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      this.announceNavigation();
    }
  }

  openFocused() {
    const item = this.items[this.focusedIndex];
    if (!item) return;

    // On the releases page, collapse buttons are navigable items too
    if (item.classList.contains('collapse-button')) {
      item.click();
      return;
    }

    const link = item.querySelector<HTMLAnchorElement>('a[href]');
    if (link) window.open(link.href, '_blank', 'noopener,noreferrer');
  }

  focusSearch() {
    if (this.searchInput) {
      (this.searchInput as HTMLInputElement).focus();
      (this.searchInput as HTMLInputElement).select?.();
    }
  }

  showHelp() {
    document.getElementById('keyboard-help-modal')?.classList.add('visible');
    document.getElementById('keyboard-help-backdrop')?.classList.add('visible');
  }

  hideHelp() {
    document.getElementById('keyboard-help-modal')?.classList.remove('visible');
    document.getElementById('keyboard-help-backdrop')?.classList.remove('visible');
  }

  toggleTheme() {
    if (typeof (window as any).toggleTheme === 'function') {
      (window as any).toggleTheme();
    }
  }

  handleEscape() {
    const helpModal = document.getElementById('keyboard-help-modal');
    if (helpModal?.classList.contains('visible')) {
      this.hideHelp();
      return;
    }
    if (document.activeElement === this.searchInput) {
      (this.searchInput as HTMLElement)?.blur();
      return;
    }
    this.items.forEach((el) => el.classList.remove('kbd-focused'));
    this.focusedIndex = -1;
  }

  announceNavigation() {
    const item = this.items[this.focusedIndex];
    const liveRegion = document.getElementById('kbd-live-region');
    if (liveRegion && item) {
      const title =
        item.querySelector('h2, .release-title')?.textContent?.trim() || 'Item';
      liveRegion.textContent = `Focused: ${title}`;
    }
  }

  refresh() {
    this.items = Array.from(document.querySelectorAll<HTMLElement>(this.itemSelector));
  }
}
