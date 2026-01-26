#!/usr/bin/env node

/**
 * Create a JSON file with HTML content for client-side loading
 * Much faster than fetching feeds - instant load from local JSON
 */

const fs = require('fs');
const path = require('path');

const CACHE_PATH = path.join(__dirname, '../public/cache.json');
const OUTPUT_PATH = path.join(__dirname, '../public/html-content.json');

console.log('📦 Reading cache.json...');
const cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));

const htmlMap = {};
let count = 0;

for (const source of cache.sources) {
  for (const article of source.articles || []) {
    if (article.htmlContent) {
      htmlMap[article.link] = article.htmlContent;
      count++;
    }
  }
}

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(htmlMap));
console.log(`✅ Created html-content.json with ${count} articles`);
