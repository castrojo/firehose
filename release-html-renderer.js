/**
 * Release HTML Renderer
 * Fetches actual HTML from GitHub Atom feeds and renders it properly
 */
(function() {
  'use strict';
  
  const CACHE_KEY = 'firehose_feed_cache';
  const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes
  
  // Get cached feeds
  function getCachedFeeds() {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return {};
      const data = JSON.parse(cached);
      if (Date.now() - data.timestamp > CACHE_DURATION) {
        localStorage.removeItem(CACHE_KEY);
        return {};
      }
      return data.feeds || {};
    } catch (e) {
      return {};
    }
  }
  
  // Save feeds to cache
  function saveFeedToCache(feedUrl, entries) {
    try {
      const cached = getCachedFeeds();
      cached[feedUrl] = entries;
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        feeds: cached
      }));
    } catch (e) {
      console.warn('Could not cache feed:', e);
    }
  }
  
  // Fetch and parse Atom feed
  async function fetchFeed(feedUrl) {
    const cached = getCachedFeeds();
    if (cached[feedUrl]) {
      return cached[feedUrl];
    }
    
    try {
      // Use CORS proxy for GitHub feeds
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`;
      const response = await fetch(proxyUrl);
      const text = await response.text();
      
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, 'text/xml');
      
      const entries = [];
      const entryElements = xml.querySelectorAll('entry');
      
      entryElements.forEach(entry => {
        const id = entry.querySelector('id')?.textContent;
        const link = entry.querySelector('link')?.getAttribute('href');
        const contentElem = entry.querySelector('content');
        const content = contentElem?.textContent || '';
        
        if (id && content) {
          entries.push({ id, link, content });
        }
      });
      
      saveFeedToCache(feedUrl, entries);
      return entries;
    } catch (error) {
      console.error('Error fetching feed:', feedUrl, error);
      return [];
    }
  }
  
  // Sanitize HTML (basic - removes script tags)
  function sanitizeHTML(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    // Remove script tags
    temp.querySelectorAll('script').forEach(el => el.remove());
    
    // Remove dangerous attributes
    temp.querySelectorAll('*').forEach(el => {
      const attrs = [...el.attributes];
      attrs.forEach(attr => {
        if (attr.name.startsWith('on') || attr.name === 'href' && attr.value.startsWith('javascript:')) {
          el.removeAttribute(attr.name);
        }
      });
    });
    
    return temp.innerHTML;
  }
  
  // Process all release cards
  async function processReleases() {
    const cards = document.querySelectorAll('.release-card');
    const feedsToFetch = new Map();
    
    // Group cards by feed URL
    cards.forEach(card => {
      const feedUrl = card.dataset.feedUrl;
      const articleLink = card.dataset.articleLink;
      if (feedUrl && articleLink) {
        if (!feedsToFetch.has(feedUrl)) {
          feedsToFetch.set(feedUrl, []);
        }
        feedsToFetch.get(feedUrl).push({ card, articleLink });
      }
    });
    
    // Fetch feeds and update cards
    for (const [feedUrl, cardData] of feedsToFetch.entries()) {
      try {
        const entries = await fetchFeed(feedUrl);
        
        cardData.forEach(({ card, articleLink }) => {
          const entry = entries.find(e => e.link === articleLink);
          if (entry && entry.content) {
            const contentDiv = card.querySelector('.release-body');
            if (contentDiv) {
              const sanitized = sanitizeHTML(entry.content);
              contentDiv.innerHTML = sanitized;
              contentDiv.classList.add('markdown-body');
            }
          }
        });
      } catch (error) {
        console.error('Error processing feed:', feedUrl, error);
      }
    }
  }
  
  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', processReleases);
  } else {
    processReleases();
  }
})();
