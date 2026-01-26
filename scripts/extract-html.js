#!/usr/bin/env node

/**
 * Extract HTML content from Atom feeds and add to cache.json
 * Runs after osmosfeed build to enrich articles with HTML
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const CACHE_PATH = path.join(__dirname, '../public/cache.json');

// Fetch URL content
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    client.get(url, { timeout: 10000 }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject).on('timeout', () => {
      reject(new Error(`Timeout for ${url}`));
    });
  });
}

// Parse Atom feed XML
function parseAtomFeed(xml) {
  const entries = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  
  while ((match = entryRegex.exec(xml)) !== null) {
    const entryXml = match[1];
    
    // Extract link
    const linkMatch = entryXml.match(/<link[^>]+href="([^"]+)"/);
    const link = linkMatch ? linkMatch[1] : null;
    
    // Extract content (handle both text and HTML)
    const contentMatch = entryXml.match(/<content[^>]*>([\s\S]*?)<\/content>/);
    let content = null;
    
    if (contentMatch) {
      content = contentMatch[1]
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
    }
    
    if (link && content) {
      entries.push({ link, content });
    }
  }
  
  return entries;
}

// Process cache.json
async function enrichCache() {
  console.log('📦 Reading cache.json...');
  const cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
  
  const feedCache = new Map();
  let enriched = 0;
  let errors = 0;
  
  console.log(`📊 Processing ${cache.sources.length} sources...`);
  
  for (const source of cache.sources) {
    const feedUrl = source.feedUrl;
    
    if (!feedUrl.includes('github.com') && !feedUrl.includes('releases')) {
      // Skip non-GitHub release feeds
      continue;
    }
    
    console.log(`📡 Fetching ${feedUrl}...`);
    
    try {
      // Check cache
      let entries;
      if (feedCache.has(feedUrl)) {
        entries = feedCache.get(feedUrl);
      } else {
        const xml = await fetchUrl(feedUrl);
        entries = parseAtomFeed(xml);
        feedCache.set(feedUrl, entries);
        
        // Rate limiting - wait between requests
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Match articles with feed entries
      for (const article of source.articles || []) {
        const entry = entries.find(e => e.link === article.link);
        if (entry && entry.content) {
          article.htmlContent = entry.content;
          enriched++;
        }
      }
    } catch (error) {
      console.error(`❌ Error fetching ${feedUrl}:`, error.message);
      errors++;
    }
  }
  
  console.log(`💾 Writing enriched cache.json...`);
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
  
  console.log(`✅ Done! Enriched ${enriched} articles (${errors} errors)`);
  console.log(`📝 Cache saved to: ${CACHE_PATH}`);
}

// Run
enrichCache().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
