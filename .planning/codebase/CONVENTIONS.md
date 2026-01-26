# Coding Conventions

**Analysis Date:** 2026-01-26

## Naming Patterns

**Files:**
- Kebab-case for scripts: `fetch-landscape-data.js`, `extract-html.js`, `create-html-data.js`
- Kebab-case for client-side loaders: `html-loader.js`, `project-info-loader.js`
- Kebab-case for renderers: `markdown-renderer.js`, `release-html-renderer.js`
- `index.js` and `index.css` for main entry points
- Configuration files: `osmosfeed.yaml`, `package.json`

**Functions:**
- camelCase for function names: `fetchUrl()`, `parseYaml()`, `createProjectMap()`, `matchProject()`, `enrichCache()`
- camelCase for async functions: `fetchLandscapeData()`, `loadHTMLContent()`, `processReleases()`
- Descriptive verb-based names: `sanitizeHTML()`, `renderMarkdownContent()`, `handleToggleAccordions()`

**Variables:**
- UPPERCASE_SNAKE_CASE for constants: `OUTPUT_PATH`, `CACHE_PATH`, `LANDSCAPE_PATH`, `LANDSCAPE_YML_URL`, `CACHE_KEY`, `CACHE_DURATION`
- camelCase for local variables: `landscapeData`, `projectMap`, `feedUrl`, `htmlMap`, `currentItem`
- camelCase for loop variables: `summaryLines`, `inExtra`, `inSummaryUseCase`

**CSS Classes:**
- Kebab-case for all CSS classes: `.source-header`, `.project-name`, `.release-card`, `.markdown-body`
- Semantic naming: `.site-header`, `.site-footer`, `.site-title`, `.site-subtitle`
- Component-based naming: `.release-header`, `.release-body`, `.release-footer`, `.release-title`

## Code Style

**Formatting:**
- 2-space indentation for JavaScript
- 2-space indentation for CSS
- 2-space indentation for YAML
- Single quotes for strings in most cases (except HTML attributes)
- Semicolons used consistently in JavaScript

**Linting:**
- No ESLint or Prettier configuration detected
- No formal linting rules enforced
- Style is maintained manually through code review

## Import Organization

**Order:**
1. Node.js built-in modules: `fs`, `path`, `https`, `http`
2. No external dependencies in scripts (except osmosfeed)
3. No import statements (using CommonJS `require()`)

**Import Pattern:**
```javascript
const fs = require('fs');
const path = require('path');
const https = require('https');
```

**Path Aliases:**
- No path aliases configured
- Relative paths used: `../public/cache.json`, `../public/landscape-data.json`

## Error Handling

**Patterns:**
- Try-catch blocks for async operations
- Promise rejection handled with `.catch()`
- Errors logged with descriptive emoji prefixes: `❌ Error:`, `💥 Fatal error:`
- Graceful fallbacks: Empty cache created on landscape fetch failure
- Console warnings for non-critical issues: `⚠️ No landscape data found`

**Examples:**
```javascript
// Try-catch for JSON parsing
try {
  landscapeData = JSON.parse(fs.readFileSync(LANDSCAPE_PATH, 'utf8'));
} catch (error) {
  console.warn('⚠️  No landscape data found, skipping project matching');
}

// Top-level error handler
fetchLandscapeData().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
```

## Logging

**Framework:** `console` (native)

**Patterns:**
- Emoji prefixes for visual categorization:
  - `🌍` - Network operations (fetching)
  - `📦` - File reading operations
  - `📡` - Active fetching/downloading
  - `💾` - File writing operations
  - `✅` - Success messages
  - `❌` - Error messages
  - `⚠️` - Warnings
  - `💥` - Fatal errors
  - `📊` - Progress/statistics
  - `📝` - Completion messages
- Descriptive action messages: `'Reading cache.json...'`, `'Fetching CNCF Landscape YAML...'`
- Error messages include context: `console.error('❌ Error fetching ${feedUrl}:', error.message)`
- Progress indicators for batch operations

## Comments

**When to Comment:**
- File-level JSDoc headers explaining purpose
- Section dividers for logical groupings
- Complex regex or parsing logic
- Business logic explanations

**JSDoc/TSDoc:**
- Used sparingly for type hints in `static/index.js`:
  ```javascript
  /**
   * @type {HTMLDetailsElement[]}
   */
  ```
- Used for parameter types:
  ```javascript
  /**
   * @param {KeyboardEvent=} event
   */
  ```

**File Headers:**
- Shebang for executable scripts: `#!/usr/bin/env node`
- Multi-line comment explaining purpose:
  ```javascript
  /**
   * Fetch project descriptions from CNCF Landscape
   * Maps feed URLs to project names and descriptions for better display
   */
  ```

## Function Design

**Size:** 
- Small, focused functions (typically 10-50 lines)
- Largest function is `parseYaml()` at ~100 lines (complex parsing logic)
- Most functions under 30 lines

**Parameters:**
- Minimal parameters (0-3 typical)
- `fetchUrl(url)` - single parameter
- `matchProject(feedUrl, landscapeData)` - two parameters
- Optional parameters indicated with JSDoc: `@param {KeyboardEvent=} event`

**Return Values:**
- Promises for async operations: `fetchUrl()` returns `Promise`
- Objects for data transformation: `createProjectMap()` returns `{}`
- Arrays for parsing: `parseYaml()` returns `[]`
- Void for side-effect functions: `enrichCache()` modifies files

## Module Design

**Exports:**
- No explicit exports in scripts (executed directly as CLI tools)
- Client-side code wrapped in IIFEs for encapsulation
- Pattern: `(function() { 'use strict'; ... })();`
- Async IIFE for client code: `(async function() { ... })();`

**IIFE Pattern:**
```javascript
(function() {
  'use strict';
  
  // Private functions and variables
  function someFunction() { ... }
  
  // Initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', someFunction);
  } else {
    someFunction();
  }
})();
```

**Barrel Files:**
- Not used (no module system)

## Async/Await Patterns

**Preferred:**
- `async/await` used throughout for readability
- Top-level await not used (wrapped in async functions)

**Example:**
```javascript
async function enrichCache() {
  const xml = await fetchUrl(feedUrl);
  const entries = parseAtomFeed(xml);
  await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
}
```

## HTML/CSS Conventions

**HTML (Handlebars):**
- Semantic HTML5 elements: `<header>`, `<main>`, `<article>`, `<footer>`, `<time>`
- BEM-inspired class naming: `.release-card`, `.release-header`, `.release-body`
- Escaped by default: `{{title}}`
- Unescaped for trusted HTML: `{{{htmlContent}}}`

**CSS:**
- CSS custom properties for theming: `--color-bg-primary`, `--spacing-4`, `--border-radius`
- Mobile-first responsive design with media queries at 768px and 480px
- GitHub Primer-inspired color scheme
- Consistent spacing scale using CSS variables

---

*Convention analysis: 2026-01-26*
