# Codebase Concerns

**Analysis Date:** 2026-01-26

## Tech Debt

**Code Duplication Between static/ and public/:**
- Issue: All JavaScript files are duplicated between `static/` (source) and `public/` (build output)
- Files: `static/index.js`, `static/html-loader.js`, `static/release-html-renderer.js`, `static/markdown-renderer.js`, `static/project-info-loader.js`, `static/index.css` and their `public/` counterparts
- Impact: Changes must be made in `static/` directory but developers might accidentally edit `public/` files which get overwritten on build. No clear documentation distinguishing source vs. build output.
- Fix approach: Add `.gitignore` entry for `public/` directory or add build warning comments to public files. Document clearly in README that `static/` is source and `public/` is build output only.

**Manual YAML Parsing Instead of YAML Library:**
- Issue: `scripts/fetch-landscape-data.js` uses regex-based YAML parsing instead of proper YAML parser
- Files: `scripts/fetch-landscape-data.js` (lines 32-128)
- Impact: Brittle parsing that depends on exact indentation (12 spaces for fields, 14 for extra, 16 for content). Will break if CNCF changes landscape.yml format. Complex multi-line string handling is error-prone.
- Fix approach: Add `js-yaml` dependency (already in osmosfeed's deps) and use proper YAML parsing. This is more maintainable but was likely avoided to keep dependencies minimal.

**Regex-Based XML Parsing:**
- Issue: `scripts/extract-html.js` uses regex to parse Atom feed XML instead of XML parser
- Files: `scripts/extract-html.js` (lines 37-68)
- Impact: Fragile parsing that can break with malformed XML or unusual formatting. Missing proper error handling for entity decoding.
- Fix approach: Use DOMParser (available in Node.js via jsdom) or xml2js library for robust XML parsing.

**No Test Coverage:**
- Issue: Zero test files, no test runner configured
- Files: Entire codebase
- Impact: No automated verification that build scripts work correctly. Refactoring is risky. YAML/XML parsing logic particularly needs tests.
- Fix approach: Add Jest or Vitest, write tests for parsing functions in `scripts/fetch-landscape-data.js` and `scripts/extract-html.js`.

**No Linting or Code Formatting:**
- Issue: No ESLint, Prettier, or other code quality tools configured
- Files: Project root (missing `.eslintrc`, `.prettierrc`)
- Impact: Inconsistent code style (mix of semicolons/no semicolons, quote styles). No automatic error detection for common JavaScript mistakes.
- Fix approach: Add ESLint with recommended config and Prettier for formatting. Add pre-commit hooks via Husky.

**Client-Side localStorage Caching Without Version Control:**
- Issue: `static/release-html-renderer.js` caches feed data in localStorage with 30-minute TTL but no version/invalidation strategy
- Files: `static/release-html-renderer.js` (lines 8-39, only used when runtime fallback is needed)
- Impact: If feed structure changes or build process changes cached format, users get stale/broken data until 30min expires. No way to force invalidation on deploy.
- Fix approach: Add version number to cache key based on build timestamp or content hash. Include cache version in html-content.json metadata.

## Known Bugs

**Silent Failures in Landscape Data Fetch:**
- Symptoms: If CNCF landscape fetch fails, script creates empty `landscape-data.json` and continues silently
- Files: `scripts/fetch-landscape-data.js` (lines 168-172)
- Trigger: Network issues, CNCF repo unavailable, or rate limiting
- Impact: Project names and descriptions don't show on the site, replaced with "Release notes from X" generic text. Users don't see proper project information but no obvious error.
- Workaround: Check console output during build for "⚠️ Created empty landscape cache" warning

**Partial Feed Fetch Errors Hidden:**
- Symptoms: `scripts/extract-html.js` continues processing all feeds even if some fail, only showing error count at end
- Files: `scripts/extract-html.js` (lines 148-151)
- Trigger: Individual feed URLs that timeout, return 404, or have malformed XML
- Impact: Some releases don't get HTML content but build succeeds. Users see plain text descriptions instead of formatted release notes. No clear indication which feeds failed.
- Workaround: Check build logs for "❌ Error fetching" messages to identify problematic feeds

**CORS Proxy Dependency in Fallback Code:**
- Symptoms: `static/release-html-renderer.js` uses `https://api.allorigins.win` CORS proxy for runtime feed fetching (currently not used in normal operation)
- Files: `static/release-html-renderer.js` (line 50)
- Trigger: If user visits site before build completes or if html-content.json is missing
- Impact: Depends on third-party CORS proxy service which could be unavailable, rate-limited, or shut down. No fallback if proxy fails.
- Workaround: This code path shouldn't normally execute with proper build process, but needs proper error handling or removal.

## Security Considerations

**Basic HTML Sanitization Only:**
- Risk: `static/release-html-renderer.js` uses basic script/event handler removal for HTML sanitization
- Files: `static/release-html-renderer.js` (lines 79-98)
- Current mitigation: Removes `<script>` tags and `on*` attributes. Only processes GitHub Atom feeds which are semi-trusted.
- Recommendations: Use DOMPurify library for comprehensive XSS protection. GitHub feeds are relatively trusted but still user-generated content. Add Content Security Policy headers.

**No Input Validation on Feed URLs:**
- Risk: `osmosfeed.yaml` feed URLs are not validated before fetching
- Files: `osmosfeed.yaml`, `scripts/extract-html.js`
- Current mitigation: None - relies on repository maintainer to only add legitimate feeds
- Recommendations: Add URL validation to ensure feeds are HTTPS and from expected domains (github.com, trusted blog domains). Prevent SSRF attacks if config becomes user-editable.

**Large JSON Files Without Size Limits:**
- Risk: Generated files can grow unbounded: `cache.json` (1.7MB), `html-content.json` (1.5MB), `landscape-data.json` (574KB), `index.html` (1.6MB)
- Files: `public/cache.json`, `public/html-content.json`, `public/landscape-data.json`, `public/index.html`
- Current mitigation: GitHub Pages has 1GB repository size limit, but individual files are getting large
- Recommendations: Add limits on number of articles per feed, implement pagination, or archive old releases. Monitor file growth over time.

**No Rate Limiting Protection:**
- Risk: Build scripts make sequential HTTP requests without rate limiting protection or retry logic
- Files: `scripts/extract-html.js` (500ms delay only), `scripts/fetch-landscape-data.js` (no rate limiting)
- Current mitigation: 500ms delay between feed requests in extract-html.js
- Recommendations: Implement exponential backoff retry logic, respect `Retry-After` headers, add configurable rate limits.

## Performance Bottlenecks

**Sequential Feed Fetching:**
- Problem: `scripts/extract-html.js` fetches 89 feeds sequentially with 500ms delay = ~45 second minimum runtime
- Files: `scripts/extract-html.js` (lines 107-152)
- Cause: Rate limiting prevention causes slow builds
- Improvement path: Implement concurrent fetching with configurable parallelism (e.g., 5 concurrent requests). Add better caching to skip unchanged feeds. Use ETags/Last-Modified headers.

**No Incremental Builds:**
- Problem: Every build fetches all feeds from scratch, even if they haven't changed
- Files: `scripts/extract-html.js`, `scripts/fetch-landscape-data.js`
- Cause: No mechanism to track which feeds have been updated since last build
- Improvement path: Store ETags or Last-Modified headers in cache, only re-fetch changed feeds. Persist landscape-data.json across builds in git.

**Large HTML Embedded in Initial Page Load:**
- Problem: `index.html` is 1.6MB due to embedding all article content inline
- Files: `public/index.html`
- Cause: Osmosfeed embeds all article descriptions in HTML template. HTML enrichment adds more content.
- Improvement path: Implement pagination or lazy loading. Split articles into separate JSON files loaded on-demand. Use virtual scrolling for large lists.

**Redundant Content in Multiple Files:**
- Problem: Article content stored in three places: `cache.json` (1.7MB), `html-content.json` (1.5MB), `index.html` (1.6MB) - ~4.8MB total for ~160 articles
- Files: `public/cache.json`, `public/html-content.json`, `public/index.html`
- Cause: Each processing step creates new output file without removing previous data
- Improvement path: Optimize storage format, remove redundant data from cache.json if not needed, consider compression.

## Fragile Areas

**Indentation-Dependent YAML Parsing:**
- Files: `scripts/fetch-landscape-data.js` (lines 32-128)
- Why fragile: Hardcoded regex patterns depend on exact 12/14/16 space indentation. If CNCF landscape.yml formatting changes slightly, parsing completely breaks.
- Safe modification: Don't touch unless switching to proper YAML library. If modifying regex, test against actual landscape.yml file with all edge cases.
- Test coverage: None - high risk area

**HTML Entity Decoding Chain:**
- Files: `scripts/extract-html.js` (lines 54-59)
- Why fragile: Manual entity replacement with simple string replace. Doesn't handle all HTML entities, numeric entities, or nested encoding.
- Safe modification: Test with diverse feed content. Consider using library like `he` for proper entity decoding.
- Test coverage: None - could break on unusual entity formats

**Client-Side URL Matching Logic:**
- Files: `static/project-info-loader.js` (lines 22-27), `static/html-loader.js` (lines 16-23)
- Why fragile: Relies on exact URL matching between cached data and rendered HTML links. If Handlebars template changes link format or osmosfeed URL normalization changes, matching breaks.
- Safe modification: Ensure any template changes maintain consistent URL format. Add data attributes for explicit matching instead of href parsing.
- Test coverage: None - runtime errors only visible in browser console

**Build Script Execution Order:**
- Files: `package.json` (line 7): `"build": "osmosfeed && node scripts/fetch-landscape-data.js && node scripts/extract-html.js && node scripts/create-html-data.js"`
- Why fragile: Scripts depend on exact execution order. extract-html.js requires cache.json from osmosfeed and landscape-data.json. create-html-data.js requires enriched cache.json. No dependency checking.
- Safe modification: Don't reorder scripts. If adding new scripts, carefully consider dependencies. Add validation checks at start of each script.
- Test coverage: None - fails at build time

**GitHub Actions Node.js Version Pin:**
- Files: `.github/workflows/update-feed.yaml` (line 23): `node-version: "16"`
- Why fragile: Node 16 reached end-of-life in September 2023. Using deprecated version with potential security vulnerabilities. May break if GitHub removes support.
- Safe modification: Update to Node 18 or 20 LTS. Test locally before deploying to ensure all scripts still work.
- Test coverage: None - only tested on CI

## Scaling Limits

**GitHub Pages File Size Limits:**
- Current capacity: 1.6MB index.html, 5MB total in public/ directory
- Limit: GitHub Pages has 1GB repository limit, 100MB per-file soft limit
- Scaling path: Index.html will hit problems around 500 feeds or 1000 articles. Need pagination or dynamic loading before then.

**LocalStorage Quota (5-10MB):**
- Current capacity: Release HTML renderer caches feed data in localStorage
- Limit: Browsers limit localStorage to 5-10MB per domain
- Scaling path: If runtime fetching is ever needed again, implement smarter caching with LRU eviction or use IndexedDB for larger storage.

**Build Time Linear with Feed Count:**
- Current: 89 feeds × 500ms + processing = ~60 second builds
- Limit: GitHub Actions has 6-hour timeout, but user-experience degrades after 5-10 minute builds
- Scaling path: Parallelization (5× speedup), incremental builds (only fetch changed feeds), or CDN caching of feeds.

**Single HTML File for All Content:**
- Current: All 160+ articles in one HTML file (1.6MB)
- Limit: Mobile browsers struggle with >5MB HTML, performance degrades on low-end devices
- Scaling path: Pagination (e.g., 50 articles per page), infinite scroll with dynamic loading, or separate pages per project.

## Dependencies at Risk

**@osmoscraft/osmosfeed (v1.2.2):**
- Risk: Core dependency that controls site generation. Last updated unknown. Small project with potential for abandonment.
- Impact: If osmosfeed stops being maintained, can't upgrade dependencies or fix bugs in core generation. Would need to fork or rewrite.
- Migration plan: Could migrate to custom static site generator (11ty, Hugo, or custom Node script). Would need to reimplement feed aggregation and caching logic.

**No Lockfile Version Validation:**
- Risk: `package-lock.json` present but no dependency audit or security scanning
- Impact: Could have known vulnerabilities in dependencies (especially in osmosfeed's transitive deps)
- Migration plan: Add `npm audit` to CI pipeline, set up Dependabot for automated security updates.

**Node.js 16 EOL:**
- Risk: GitHub Actions uses Node.js 16 which reached end-of-life September 2023
- Impact: No security updates, potential compatibility issues with future GitHub Actions environment
- Migration plan: Update to Node.js 18 LTS (active until April 2025) or Node.js 20 LTS (active until April 2026). Test build scripts locally first.

## Missing Critical Features

**No Error Recovery:**
- Problem: Build fails completely if any critical step fails (osmosfeed, landscape fetch). No graceful degradation.
- Blocks: Ability to deploy even with partial data. One bad feed URL breaks entire build.
- Priority: High - impacts reliability

**No Build Caching:**
- Problem: No mechanism to cache unchanged feeds or landscape data between builds
- Blocks: Fast incremental builds, efficient CI/CD pipeline
- Priority: Medium - impacts developer experience and CI costs

**No Content Moderation:**
- Problem: All feed content is included without filtering or quality checks
- Blocks: Ability to exclude spam, malformed releases, or inappropriate content
- Priority: Low - CNCF feeds are generally high quality

**No Search or Filtering:**
- Problem: Users must scroll through all 160+ releases to find specific projects or topics
- Blocks: User ability to quickly find relevant releases
- Priority: Medium - impacts usability at scale

**No Analytics or Monitoring:**
- Problem: No visibility into build failures, user engagement, or performance metrics
- Blocks: Ability to detect and diagnose issues proactively
- Priority: Low - can function without but limits observability

## Test Coverage Gaps

**Build Script Parsing Logic:**
- What's not tested: YAML parsing in `scripts/fetch-landscape-data.js`, XML parsing in `scripts/extract-html.js`, HTML entity decoding
- Files: `scripts/fetch-landscape-data.js`, `scripts/extract-html.js`
- Risk: Parser changes could silently break or corrupt data. No way to verify correctness except manual inspection of output.
- Priority: High

**URL Matching and Data Enrichment:**
- What's not tested: Project matching logic in `scripts/extract-html.js` (lines 71-88), HTML content association with articles
- Files: `scripts/extract-html.js`
- Risk: Changes to URL format or matching logic could break project name display or HTML rendering
- Priority: High

**Client-Side Loading and Injection:**
- What's not tested: HTML injection logic, project info loading, error handling in browser
- Files: `static/html-loader.js`, `static/project-info-loader.js`, `static/release-html-renderer.js`
- Risk: DOM manipulation bugs only caught by manual testing. Browser incompatibilities unknown.
- Priority: Medium

**HTML Sanitization:**
- What's not tested: Sanitization logic that removes scripts and dangerous attributes
- Files: `static/release-html-renderer.js` (lines 79-98)
- Risk: XSS vulnerabilities could be introduced by changes. No verification that sanitization is effective.
- Priority: High (security impact)

**Edge Cases:**
- What's not tested: Empty feeds, malformed XML, missing landscape data, network timeouts, rate limiting
- Files: All build scripts
- Risk: Unknown behavior on edge cases. Could cause build failures or data corruption.
- Priority: Medium

---

*Concerns audit: 2026-01-26*
