# Error Handling Patterns for RSS Aggregation

**Researched:** 2026-01-26  
**Confidence:** HIGH

## Executive Summary

**Core Principle:** **Never fail the entire build due to a single feed failure.**

RSS aggregation at scale (~100 feeds) requires resilient error handling:
- **Graceful degradation:** Failed feeds don't block successful ones
- **Explicit tracking:** Log all errors with context
- **User visibility:** Show error states in UI
- **Retry logic:** Handle transient failures
- **Monitoring:** Track error rates over time

## Error Categories

### 1. Network Errors

**Cause:** Connectivity issues, timeouts, DNS failures

**Examples:**
- `ENOTFOUND` - DNS resolution failed
- `ECONNREFUSED` - Server refused connection
- `ETIMEDOUT` - Request timed out
- `ECONNRESET` - Connection dropped mid-request

**Handling:**

```typescript
async function fetchFeed(url: string): Promise<FeedResult> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000), // 15s timeout
    });
    
    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        url,
      };
    }
    
    return {
      success: true,
      data: await response.text(),
      url,
    };
  } catch (error) {
    if (error.name === 'TimeoutError') {
      return {
        success: false,
        error: 'Feed request timed out after 15 seconds',
        url,
        retryable: true,
      };
    }
    
    if (error.code === 'ENOTFOUND') {
      return {
        success: false,
        error: 'Feed not found (DNS resolution failed)',
        url,
        retryable: false, // DNS failures unlikely to resolve quickly
      };
    }
    
    return {
      success: false,
      error: `Network error: ${error.message}`,
      url,
      retryable: true,
    };
  }
}
```

### 2. HTTP Errors

**Cause:** Server returns 4xx or 5xx status codes

**Examples:**
- `404 Not Found` - Feed no longer exists
- `403 Forbidden` - Authentication/permissions issue
- `429 Too Many Requests` - Rate limited
- `500 Internal Server Error` - Server-side issue
- `502/503/504` - Gateway/proxy issues

**Handling:**

```typescript
async function fetchFeedWithRetry(
  url: string,
  maxRetries = 3
): Promise<FeedResult> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(15000),
        headers: {
          'User-Agent': 'Firehose/1.0 (https://castrojo.github.io/firehose/)',
        },
      });
      
      // Success cases
      if (response.ok) {
        return {
          success: true,
          data: await response.text(),
          url,
        };
      }
      
      // 304 Not Modified (with ETag caching)
      if (response.status === 304) {
        return {
          success: true,
          cached: true,
          url,
        };
      }
      
      // Rate limiting - wait and retry
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || '60';
        const waitSeconds = parseInt(retryAfter);
        
        if (attempt < maxRetries - 1) {
          await new Promise(r => setTimeout(r, waitSeconds * 1000));
          continue; // Retry
        }
        
        return {
          success: false,
          error: `Rate limited (429). Retry after ${waitSeconds}s`,
          url,
          retryable: true,
        };
      }
      
      // Client errors (4xx) - likely permanent
      if (response.status >= 400 && response.status < 500) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          url,
          retryable: false, // Don't retry 404, 403, etc.
        };
      }
      
      // Server errors (5xx) - may be transient
      if (response.status >= 500) {
        if (attempt < maxRetries - 1) {
          const backoff = Math.pow(2, attempt) * 1000; // Exponential backoff
          await new Promise(r => setTimeout(r, backoff));
          continue; // Retry
        }
        
        return {
          success: false,
          error: `Server error (${response.status}). Tried ${maxRetries} times.`,
          url,
          retryable: true,
        };
      }
      
    } catch (error) {
      if (attempt < maxRetries - 1) {
        const backoff = Math.pow(2, attempt) * 1000;
        await new Promise(r => setTimeout(r, backoff));
        continue; // Retry
      }
      
      return {
        success: false,
        error: `Network error after ${maxRetries} attempts: ${error.message}`,
        url,
        retryable: true,
      };
    }
  }
}
```

### 3. Parsing Errors

**Cause:** Malformed XML, invalid RSS/Atom structure

**Examples:**
- Invalid XML syntax
- Missing required RSS fields
- Encoding issues (non-UTF-8)
- Truncated/incomplete feeds

**Handling:**

```typescript
import Parser from 'rss-parser';

async function parseFeed(xml: string, url: string): Promise<ParseResult> {
  const parser = new Parser({
    timeout: 5000,
    headers: {
      'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml',
    },
  });
  
  try {
    const feed = await parser.parseString(xml);
    
    // Validate required fields
    if (!feed.items || feed.items.length === 0) {
      return {
        success: false,
        error: 'Feed contains no items',
        url,
      };
    }
    
    // Validate item structure
    const validItems = feed.items.filter(item => {
      return item.title && (item.link || item.guid);
    });
    
    if (validItems.length === 0) {
      return {
        success: false,
        error: 'Feed items missing required fields (title, link/guid)',
        url,
      };
    }
    
    if (validItems.length < feed.items.length) {
      logger.warn(
        `Feed ${url}: Skipped ${feed.items.length - validItems.length} invalid items`
      );
    }
    
    return {
      success: true,
      feed: {
        ...feed,
        items: validItems,
      },
      url,
    };
    
  } catch (error) {
    // Specific XML parsing errors
    if (error.message.includes('Non-whitespace before first tag')) {
      return {
        success: false,
        error: 'Invalid XML: Content before root element',
        url,
      };
    }
    
    if (error.message.includes('Unexpected close tag')) {
      return {
        success: false,
        error: 'Invalid XML: Mismatched tags',
        url,
      };
    }
    
    if (error.message.includes('Invalid character')) {
      return {
        success: false,
        error: 'Invalid XML: Encoding issue',
        url,
      };
    }
    
    return {
      success: false,
      error: `Parse error: ${error.message}`,
      url,
    };
  }
}
```

### 4. Data Validation Errors

**Cause:** Feed parsed successfully but data doesn't match schema

**Examples:**
- Missing required fields
- Invalid date formats
- Broken URLs
- Type mismatches

**Handling:**

```typescript
import { z } from 'astro/zod';

const feedItemSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  link: z.string().url('Invalid URL'),
  pubDate: z.coerce.date(),
  description: z.string().optional(),
  content: z.string().optional(),
});

async function validateFeedItem(
  item: unknown,
  feedUrl: string
): Promise<ValidationResult> {
  try {
    const validated = await feedItemSchema.parseAsync(item);
    return {
      success: true,
      data: validated,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(i => 
        `${i.path.join('.')}: ${i.message}`
      ).join(', ');
      
      return {
        success: false,
        error: `Validation failed: ${issues}`,
        feedUrl,
      };
    }
    
    return {
      success: false,
      error: `Unknown validation error: ${error.message}`,
      feedUrl,
    };
  }
}
```

## Loader-Level Error Handling

### Comprehensive Loader Pattern

```typescript
// src/loaders/rss-loader.ts
import type { Loader } from 'astro/loaders';
import Parser from 'rss-parser';
import { z } from 'astro/zod';

export function rssLoader(options: RSSLoaderOptions): Loader {
  return {
    name: 'rss-loader',
    async load({ store, logger, parseData, generateDigest, meta }) {
      logger.info(`Loading ${options.feeds.length} RSS feeds...`);
      
      // Fetch all feeds in parallel
      const feedResults = await Promise.allSettled(
        options.feeds.map(async (feedUrl) => {
          try {
            logger.debug(`Fetching: ${feedUrl}`);
            const result = await fetchFeedWithRetry(feedUrl, 3);
            
            if (!result.success) {
              logger.error(`Failed to fetch ${feedUrl}: ${result.error}`);
              return { feedUrl, error: result.error, success: false };
            }
            
            if (result.cached) {
              logger.info(`Using cached data for ${feedUrl}`);
              return meta.get(`feed-data-${feedUrl}`);
            }
            
            const parsed = await parseFeed(result.data, feedUrl);
            
            if (!parsed.success) {
              logger.error(`Failed to parse ${feedUrl}: ${parsed.error}`);
              return { feedUrl, error: parsed.error, success: false };
            }
            
            // Cache successful result
            meta.set(`feed-data-${feedUrl}`, parsed);
            
            return { feedUrl, feed: parsed.feed, success: true };
            
          } catch (error) {
            logger.error(`Unexpected error for ${feedUrl}: ${error.message}`);
            return { feedUrl, error: error.message, success: false };
          }
        })
      );
      
      // Track statistics
      let successCount = 0;
      let errorCount = 0;
      let itemCount = 0;
      
      // Process results
      for (const [index, result] of feedResults.entries()) {
        const feedUrl = options.feeds[index];
        
        if (result.status === 'rejected') {
          logger.error(`Promise rejected for ${feedUrl}: ${result.reason}`);
          errorCount++;
          
          // Store error state
          await store.set({
            id: `error-${slugify(feedUrl)}`,
            data: await parseData({
              id: `error-${slugify(feedUrl)}`,
              data: {
                feedUrl,
                feedStatus: 'error',
                errorMessage: result.reason.toString(),
                lastAttempt: new Date(),
              },
            }),
          });
          
          continue;
        }
        
        const feedResult = result.value;
        
        if (!feedResult.success) {
          errorCount++;
          
          // Store error state
          await store.set({
            id: `error-${slugify(feedUrl)}`,
            data: await parseData({
              id: `error-${slugify(feedUrl)}`,
              data: {
                feedUrl,
                feedStatus: 'error',
                errorMessage: feedResult.error,
                lastAttempt: new Date(),
              },
            }),
          });
          
          continue;
        }
        
        successCount++;
        
        // Process feed items
        for (const item of feedResult.feed.items) {
          try {
            const enrichedData = await enrichWithLandscape(item, landscapeData);
            
            // Validate against schema
            const validatedData = await parseData({
              id: `${slugify(feedResult.feed.title)}-${item.guid}`,
              data: enrichedData,
            });
            
            const digest = generateDigest(validatedData);
            
            const wasSet = await store.set({
              id: `${slugify(feedResult.feed.title)}-${item.guid}`,
              data: validatedData,
              digest,
            });
            
            if (wasSet) {
              itemCount++;
            }
            
          } catch (error) {
            logger.warn(`Failed to store item from ${feedUrl}: ${error.message}`);
            // Continue processing other items
          }
        }
      }
      
      // Log summary
      logger.info(`
        RSS Loader Summary:
        - Total feeds: ${options.feeds.length}
        - Successful: ${successCount}
        - Failed: ${errorCount}
        - Items processed: ${itemCount}
      `.trim());
      
      // Store metadata
      meta.set('last-run', new Date().toISOString());
      meta.set('success-count', successCount);
      meta.set('error-count', errorCount);
      meta.set('item-count', itemCount);
      
      // Fail build if ALL feeds failed (catastrophic)
      if (successCount === 0) {
        throw new Error('All RSS feeds failed to load. Check network/configuration.');
      }
      
      // Warn if > 50% feeds failed
      if (errorCount / options.feeds.length > 0.5) {
        logger.warn(`⚠️  Warning: ${errorCount} of ${options.feeds.length} feeds failed!`);
      }
    },
  };
}
```

## UI Error Display

### Error State Schema

```typescript
// src/content.config.ts
import { defineCollection, z } from 'astro:content';
import { rssLoader } from './loaders/rss-loader';

const releases = defineCollection({
  loader: rssLoader({
    feeds: [ /* ... */ ],
  }),
  schema: z.object({
    // Success fields
    title: z.string(),
    link: z.string().url(),
    pubDate: z.coerce.date(),
    description: z.string().optional(),
    project: z.string(),
    projectDescription: z.string().optional(),
    
    // Error tracking fields
    feedUrl: z.string().url(),
    feedStatus: z.enum(['success', 'error', 'stale']).default('success'),
    errorMessage: z.string().optional(),
    lastAttempt: z.coerce.date().optional(),
    errorCount: z.number().default(0),
  }),
});
```

### Error Banner Component

```astro
---
// src/components/ErrorBanner.astro
import { getCollection } from 'astro:content';

const allEntries = await getCollection('releases');
const errors = allEntries.filter(e => e.data.feedStatus === 'error');
const stale = allEntries.filter(e => e.data.feedStatus === 'stale');
---

{errors.length > 0 && (
  <div class="alert alert-error" role="alert">
    <h3>⚠️ Feed Errors</h3>
    <p>
      {errors.length} feed{errors.length !== 1 ? 's' : ''} failed to update.
      These projects may be missing recent releases.
    </p>
    
    <details>
      <summary>Show failed feeds</summary>
      <ul>
        {errors.map(e => (
          <li>
            <code>{e.data.feedUrl}</code>
            <br />
            <small>Error: {e.data.errorMessage}</small>
            <br />
            <small>
              Last attempted: {e.data.lastAttempt?.toLocaleString()}
            </small>
          </li>
        ))}
      </ul>
    </details>
  </div>
)}

{stale.length > 0 && (
  <div class="alert alert-warning" role="alert">
    <p>
      ℹ️ {stale.length} feed{stale.length !== 1 ? 's' : ''} haven't updated in 30+ days.
    </p>
  </details>
)}

<style>
  .alert {
    padding: 1rem;
    margin: 1rem 0;
    border-radius: 0.5rem;
    border-left: 4px solid;
  }
  
  .alert-error {
    background: #fee;
    border-color: #c33;
    color: #800;
  }
  
  .alert-warning {
    background: #ffeaa7;
    border-color: #fdcb6e;
    color: #6c5900;
  }
  
  details {
    margin-top: 0.5rem;
  }
  
  details summary {
    cursor: pointer;
    text-decoration: underline;
  }
  
  details ul {
    margin-top: 0.5rem;
    padding-left: 1.5rem;
  }
  
  details li {
    margin: 0.5rem 0;
  }
</style>
```

### Per-Feed Error Indicator

```astro
---
// src/pages/index.astro
import { getCollection } from 'astro:content';

const releases = await getCollection('releases', ({ data }) => {
  return data.feedStatus === 'success';
});

const errors = await getCollection('releases', ({ data }) => {
  return data.feedStatus === 'error';
});
---

<ErrorBanner />

<div class="releases">
  {releases.map(release => (
    <article>
      <h2>
        <a href={release.data.link}>{release.data.title}</a>
      </h2>
      <p>{release.data.description}</p>
    </article>
  ))}
</div>

<!-- Optional: Show unavailable feeds at bottom -->
{errors.length > 0 && (
  <section class="unavailable-feeds">
    <h2>Temporarily Unavailable</h2>
    <p>The following project feeds could not be loaded:</p>
    <ul>
      {errors.map(e => (
        <li>
          <strong>{e.data.project || 'Unknown'}</strong>
          <br />
          <small>{e.data.errorMessage}</small>
        </li>
      ))}
    </ul>
  </section>
)}
```

## Monitoring & Alerting

### Build-Time Monitoring

```typescript
// src/loaders/rss-loader.ts
export function rssLoader(options: RSSLoaderOptions): Loader {
  return {
    name: 'rss-loader',
    async load({ store, logger, meta }) {
      const startTime = Date.now();
      
      // ... fetch and process feeds ...
      
      const duration = Date.now() - startTime;
      
      // Store metrics
      meta.set('build-duration-ms', duration);
      meta.set('last-build', new Date().toISOString());
      
      logger.info(`RSS loader completed in ${duration}ms`);
      
      // Alert if build took too long
      if (duration > 60000) { // 1 minute
        logger.warn(`⚠️  RSS loader took ${duration / 1000}s (expected < 60s)`);
      }
    },
  };
}
```

### GitHub Actions Integration

```yaml
# .github/workflows/deploy.yml
jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      # ... build steps ...
      
      - name: Build with error tracking
        id: build
        run: npm run build 2>&1 | tee build.log
        continue-on-error: true  # Don't fail job immediately
      
      - name: Check for critical errors
        run: |
          if grep -q "All RSS feeds failed" build.log; then
            echo "::error::Critical: All feeds failed!"
            exit 1
          fi
          
          if grep -q "⚠️  Warning:" build.log; then
            echo "::warning::Some feeds failed, but build continued"
          fi
      
      - name: Upload build log
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: build-log
          path: build.log
```

### External Monitoring

**Recommended:** Set up external uptime monitoring for the deployed site.

**Services:**
- **UptimeRobot** (free tier: 50 monitors, 5-min intervals)
- **Pingdom** (paid, more features)
- **Sentry** (error tracking)

**Example: UptimeRobot**
1. Monitor: `https://castrojo.github.io/firehose/`
2. Alert: Email when site is down for > 5 minutes
3. Check: Every 5 minutes

## Testing Error Scenarios

### Unit Tests

```typescript
// tests/error-handling.test.ts
import { describe, it, expect, vi } from 'vitest';
import { fetchFeedWithRetry } from '../src/loaders/rss-loader';

describe('Error handling', () => {
  it('should retry on 500 errors', async () => {
    const mockFetch = vi.fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce({ ok: true, text: () => '<rss>...</rss>' });
    
    global.fetch = mockFetch;
    
    const result = await fetchFeedWithRetry('https://example.com/feed.xml', 3);
    
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.success).toBe(true);
  });
  
  it('should not retry on 404 errors', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' });
    
    global.fetch = mockFetch;
    
    const result = await fetchFeedWithRetry('https://example.com/feed.xml', 3);
    
    expect(mockFetch).toHaveBeenCalledTimes(1); // No retries
    expect(result.success).toBe(false);
    expect(result.retryable).toBe(false);
  });
  
  it('should handle parse errors gracefully', async () => {
    const invalidXml = '<invalid>xml<missing-close>';
    
    const result = await parseFeed(invalidXml, 'https://example.com/feed.xml');
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid XML');
  });
});
```

### Integration Tests

```typescript
// tests/loader-integration.test.ts
import { describe, it, expect } from 'vitest';
import { rssLoader } from '../src/loaders/rss-loader';

describe('RSS Loader integration', () => {
  it('should handle mix of successful and failed feeds', async () => {
    const loader = rssLoader({
      feeds: [
        'https://valid-feed.example.com/rss',      // Works
        'https://invalid-feed.example.com/rss',    // 404
        'https://timeout-feed.example.com/rss',    // Timeout
      ],
    });
    
    const mockContext = createMockLoaderContext();
    
    // Should not throw
    await expect(loader.load(mockContext)).resolves.not.toThrow();
    
    // Should log errors
    expect(mockContext.logger.error).toHaveBeenCalled();
    
    // Should have processed successful feed
    expect(mockContext.store.set).toHaveBeenCalled();
  });
});
```

### Manual Testing

Create a test feed list with known failure modes:

```typescript
// src/test-feeds.ts
export const TEST_FEEDS = {
  valid: 'https://github.com/dapr/dapr/releases.atom',
  notFound: 'https://github.com/fake-project/fake-repo/releases.atom',
  malformed: 'https://httpbin.org/html', // Returns HTML, not XML
  timeout: 'https://httpstat.us/200?sleep=30000', // 30s delay
  rateLimited: 'https://httpbin.org/status/429',
  serverError: 'https://httpbin.org/status/500',
};
```

Then test locally:

```bash
npm run build  # Should succeed despite some failures
# Check build log for error messages
```

## Best Practices Summary

### DO ✅

- **Use `Promise.allSettled()`** to handle multiple feeds independently
- **Log all errors** with context (URL, error message, timestamp)
- **Store error states** in collection for UI display
- **Retry transient failures** (5xx, timeouts) with exponential backoff
- **Set reasonable timeouts** (15s for feeds)
- **Fail fast on permanent errors** (404, 403)
- **Display errors prominently** in UI
- **Monitor error rates** over time
- **Test with real failure scenarios**

### DON'T ❌

- **Don't fail the entire build** due to one feed failure (unless all fail)
- **Don't retry 404s** or other permanent errors
- **Don't hide errors** from users
- **Don't use infinite retries** (max 3 attempts)
- **Don't use short timeouts** (< 10s may cause false failures)
- **Don't swallow errors** silently
- **Don't retry without backoff** (causes thundering herd)
- **Don't assume feeds never fail** (plan for failure)

## Confidence Assessment

| Aspect | Confidence | Reasoning |
|--------|-----------|-----------|
| Error categories | HIGH | Common patterns, well-documented |
| Retry logic | HIGH | Standard exponential backoff approach |
| Loader patterns | HIGH | Based on Astro's official Loader API |
| UI error display | HIGH | Standard web patterns |
| Testing strategies | MEDIUM | Some edge cases may vary |
| Monitoring | MEDIUM | Depends on specific tools used |

## References

- **Astro Loader API:** https://docs.astro.build/en/reference/content-loader-reference/
- **MDN: Promise.allSettled:** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled
- **Exponential Backoff:** https://en.wikipedia.org/wiki/Exponential_backoff
- **HTTP Status Codes:** https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
- **Retry Patterns:** https://learn.microsoft.com/en-us/azure/architecture/patterns/retry
