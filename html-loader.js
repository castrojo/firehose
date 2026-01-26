/**
 * Load pre-cached HTML content (instant, no network requests!)
 */
(function() {
  'use strict';
  
  async function loadHTMLContent() {
    try {
      const response = await fetch('html-content.json');
      const htmlMap = await response.json();
      
      const cards = document.querySelectorAll('.release-card');
      let loaded = 0;
      
      cards.forEach(card => {
        const link = card.querySelector('.release-title a')?.href;
        if (link && htmlMap[link]) {
          const contentDiv = card.querySelector('.release-body');
          if (contentDiv) {
            contentDiv.innerHTML = htmlMap[link];
            loaded++;
          }
        }
      });
      
      console.log(`✅ Loaded HTML for ${loaded} releases`);
    } catch (error) {
      console.error('Error loading HTML content:', error);
    }
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadHTMLContent);
  } else {
    loadHTMLContent();
  }
})();
