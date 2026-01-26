# Phase 2 Plans: Multi-Feed Aggregation

**Phase Goal:** Scale loader to handle ~100 feeds in parallel with comprehensive error handling that gracefully degrades on failures without blocking the build.

**Depends on:** Phase 1 (Complete ✅)

**Requirements:** FEED-03, FEED-04, FEED-05, FEED-06, ERR-01, ERR-02, ERR-03, ERR-04, ERR-05, ERR-06, VALID-03

**Success Criteria:**
1. System fetches 100+ feeds in parallel, completing in <30 seconds
2. Build succeeds when 50%+ of feeds succeed (partial failures don't block deployment)
3. Build logs show which feeds succeeded/failed with clear error messages
4. Failed feeds are tracked in collection with error state (feedStatus: 'error')
5. Transient errors (5xx, timeouts) are retried with exponential backoff (max 3 attempts)
6. Permanent errors (404, 403) skip retry and log immediately

---

## Plan 2.1: Add Feed Configuration File (30 min)

**Goal:** Create a centralized configuration file listing all ~100 CNCF project feed URLs to replace single hardcoded feed.

**Why this plan:** Currently the RSS loader hardcodes a single feed URL (dapr/dapr). Need a maintainable way to manage ~100 feeds that developers can easily edit without touching loader code.

**Acceptance criteria:**
- [ ] Created `src/config/feeds.ts` with TypeScript types
- [ ] File exports array of feed objects with `{ url: string, project?: string }` structure
- [ ] Includes all ~62 graduated project feeds from current osmosfeed.yaml
- [ ] Includes all ~38 incubating project feeds from current osmosfeed.yaml
- [ ] Each feed URL is GitHub Atom format (`.atom` suffix, not `.rss`)
- [ ] File has JSDoc comments explaining structure
- [ ] Loader updated to import and iterate over feed config array

**Tasks:**
1. Create `src/config/feeds.ts` file
2. Define `FeedConfig` TypeScript interface
3. Extract feed URLs from `osmosfeed.yaml` in repository root
4. Convert RSS feed URLs to Atom format (GitHub uses `.atom` for releases)
5. Populate array with all graduated project feeds (comments for organization)
6. Add all incubating project feeds
7. Export config as default
8. Update `src/content/config.ts` loader to import feed config
9. Test build with new config (should still fetch Dapr successfully)

**Dependencies:** None (uses existing Phase 1 infrastructure)

**Estimated duration:** 30 minutes

---

## Plan 2.2: Implement Error Classification (25 min)

**Goal:** Create error classification utilities that distinguish between transient (retry) and permanent (skip) HTTP errors.

**Why this plan:** Not all errors are equal. Network timeouts should retry, but 404s shouldn't waste build time. Need smart classification before implementing retry logic.

**Acceptance criteria:**
- [ ] Created `src/utils/errors.ts` with error classification functions
- [ ] Function `classifyError(error: Error): ErrorType` distinguishes transient vs permanent
- [ ] Transient errors: timeouts, 5xx status codes, network failures
- [ ] Permanent errors: 404, 403, 401, 410, invalid URLs, parse errors
- [ ] Custom error types exported: `TransientError`, `PermanentError`
- [ ] Each error type includes original error message and HTTP status (if applicable)
- [ ] Unit tests verify classification logic (if time permits)

**Tasks:**
1. Create `src/utils/errors.ts`
2. Define `ErrorType` enum or union type ('transient' | 'permanent')
3. Create custom error classes extending Error
4. Implement `isTransientError(error)` helper checking status codes/error types
5. Implement `classifyError(error)` that wraps errors with proper classification
6. Add JSDoc documentation for error types
7. Export error utilities from utils module
8. Verify TypeScript types compile correctly

**Dependencies:** None (utility module)

**Estimated duration:** 25 minutes

---

## Plan 2.3: Add Retry Logic with Exponential Backoff (40 min)

**Goal:** Implement retry wrapper that attempts transient failures up to 3 times with exponential backoff delays.

**Why this plan:** Transient failures (rate limits, temporary network issues) often succeed on retry. Exponential backoff prevents hammering failing endpoints.

**Acceptance criteria:**
- [ ] Created `src/utils/retry.ts` with retry wrapper function
- [ ] Function `retryWithBackoff<T>(fn: () => Promise<T>, options): Promise<T>`
- [ ] Options include: maxAttempts (default 3), baseDelay (default 1000ms), maxDelay (default 10000ms)
- [ ] Exponential backoff: delay = min(baseDelay * 2^attempt, maxDelay)
- [ ] Only retries errors classified as transient (uses error classification from 2.2)
- [ ] Permanent errors throw immediately without retry
- [ ] Logs each retry attempt with delay duration
- [ ] Returns result on success or throws final error after max attempts

**Tasks:**
1. Create `src/utils/retry.ts`
2. Define `RetryOptions` TypeScript interface
3. Implement exponential backoff calculation function
4. Implement `retryWithBackoff` async function
5. Add error classification check (import from errors.ts)
6. Add delay between attempts using `setTimeout` promise wrapper
7. Add console logging for retry attempts
8. Handle edge cases (negative delays, zero attempts, etc.)
9. Add JSDoc documentation with usage examples
10. Test manually with a feed that occasionally fails

**Dependencies:** Plan 2.2 (uses error classification)

**Estimated duration:** 40 minutes

---

## Plan 2.4: Add Feed Status Tracking (30 min)

**Goal:** Extend FeedEntry schema to track fetch status (success/error) and store error details for failed feeds.

**Why this plan:** Users need visibility into which feeds failed and why. Failed feeds should appear in collection with error state for potential UI display.

**Acceptance criteria:**
- [ ] Updated `src/schemas/feed.ts` FeedEntry schema
- [ ] Added optional `feedStatus: 'success' | 'error'` field
- [ ] Added optional `feedError: string` field for error messages
- [ ] Added optional `feedAttempts: number` field for retry count
- [ ] Added optional `feedLastAttempt: Date` field for timestamp
- [ ] Schema allows partial entry with just status fields (for failed feeds)
- [ ] TypeScript types updated and compile successfully
- [ ] Zod schema validates new fields

**Tasks:**
1. Open `src/schemas/feed.ts`
2. Add new optional fields to Zod schema with descriptions
3. Update TypeScript type inference
4. Verify schema validates correctly with test data
5. Update any existing test code that creates FeedEntry objects
6. Document new fields in JSDoc comments

**Dependencies:** None (schema extension)

**Estimated duration:** 30 minutes

---

## Plan 2.5: Refactor Loader for Parallel Fetching (50 min)

**Goal:** Update RSS loader to fetch multiple feeds in parallel using Promise.allSettled() instead of sequential single feed.

**Why this plan:** Sequential fetching of 100 feeds would take forever. Promise.allSettled() runs all fetches concurrently while capturing both successes and failures.

**Acceptance criteria:**
- [ ] Updated `src/content/config.ts` loader function
- [ ] Loader iterates over feed config array (from plan 2.1)
- [ ] Uses Promise.allSettled() to fetch all feeds concurrently
- [ ] Successful fetches return entries with feedStatus: 'success'
- [ ] Failed fetches return single entry with feedStatus: 'error' and error details
- [ ] Loader flattens all results into single array
- [ ] Build completes with mix of successes and failures
- [ ] Console logs summary: X feeds succeeded, Y feeds failed

**Tasks:**
1. Open `src/content/config.ts`
2. Import feed config from `src/config/feeds.ts`
3. Wrap existing single-feed logic in a `fetchFeed(url)` helper function
4. Create array of promises by mapping feed config to fetchFeed calls
5. Replace sequential logic with Promise.allSettled(promises)
6. Process settled results:
   - Fulfilled: extract entries, mark feedStatus: 'success'
   - Rejected: create error entry with feedStatus: 'error'
7. Flatten all entries into single array
8. Add console logging for summary statistics
9. Test build with feed config (should fetch multiple feeds)

**Dependencies:** Plan 2.1 (feed config), Plan 2.4 (status tracking schema)

**Estimated duration:** 50 minutes

---

## Plan 2.6: Integrate Retry Logic into Loader (35 min)

**Goal:** Wrap feed fetching with retry logic so transient failures are automatically retried before marking as failed.

**Why this plan:** Many feed failures are temporary (rate limits, network blips). Retrying before giving up dramatically improves reliability.

**Acceptance criteria:**
- [ ] Loader imports and uses `retryWithBackoff` from utils
- [ ] Each feed fetch is wrapped with retry logic
- [ ] Transient errors retry up to 3 times with exponential backoff
- [ ] Permanent errors fail immediately without retry
- [ ] Retry attempts are logged to console with feed URL
- [ ] Failed feed entries include attempt count in feedAttempts field
- [ ] Build completes successfully even with some failed feeds

**Tasks:**
1. Open `src/content/config.ts`
2. Import `retryWithBackoff` from `src/utils/retry.ts`
3. Wrap `parser.parseURL(url)` call with retry wrapper
4. Configure retry options (max 3 attempts, 1s base delay)
5. Update error handling to capture retry metadata
6. Store attempt count in feedAttempts field
7. Test build with intentionally failing feed (e.g., invalid URL)
8. Verify retry logs appear in console
9. Verify build succeeds with failed feed marked as error

**Dependencies:** Plan 2.3 (retry logic), Plan 2.5 (parallel fetching)

**Estimated duration:** 35 minutes

---

## Plan 2.7: Improve Build Logging and Error Reporting (30 min)

**Goal:** Add comprehensive console logging that clearly shows feed fetch progress, successes, failures, and final statistics.

**Why this plan:** Build visibility is critical for debugging. Developers need to see which feeds failed and why without digging through verbose output.

**Acceptance criteria:**
- [ ] Build logs show "Fetching X feeds..." at start
- [ ] Progress indicator shows completed/total count during fetching (optional, if feasible)
- [ ] Each feed success logs: "✓ Fetched [project-name]: N entries"
- [ ] Each feed failure logs: "✗ Failed [project-name]: [error message]" (in red if possible)
- [ ] Final summary shows statistics:
  - Total feeds attempted
  - Successful feeds count
  - Failed feeds count
  - Total entries fetched
  - Total time elapsed
- [ ] Failed feeds list at end with URLs and error messages
- [ ] Logs use structured format (consistent indentation, symbols)

**Tasks:**
1. Add logging utility or use console.log with formatting
2. Add startup log in loader before Promise.allSettled
3. Add per-feed success/failure logs in result processing
4. Collect statistics during result processing
5. Add final summary log after all feeds processed
6. Format failed feeds list for readability
7. Add timestamp calculation for total time
8. Test build and verify logs are helpful and clear
9. Adjust formatting based on output readability

**Dependencies:** Plan 2.5 (parallel fetching with results)

**Estimated duration:** 30 minutes

---

## Plan 2.8: Add Build Failure Logic (20 min)

**Goal:** Configure loader to fail build only if ALL feeds fail (catastrophic failure) or if success rate is below 50%.

**Why this plan:** Partial failures shouldn't block deployment. But complete failure indicates infrastructure problems that need immediate attention.

**Acceptance criteria:**
- [ ] Build succeeds if >50% of feeds succeed
- [ ] Build fails if <50% of feeds succeed (throw error)
- [ ] Build fails if 0 feeds succeed (catastrophic failure)
- [ ] Failure message clearly explains: "Build failed: Only X/Y feeds succeeded (threshold: 50%)"
- [ ] Error message includes list of failed feeds
- [ ] Successful builds still log warnings about failed feeds

**Tasks:**
1. Calculate success rate after processing all feeds
2. Add conditional check for success threshold (50%)
3. Throw error if threshold not met with descriptive message
4. Include failed feed details in error message
5. Add warning logs for failed feeds even on successful build
6. Test with various failure scenarios:
   - All feeds succeed (build succeeds)
   - 70% succeed (build succeeds with warnings)
   - 40% succeed (build fails)
   - 0% succeed (build fails catastrophically)
7. Verify error messages are actionable

**Dependencies:** Plan 2.7 (statistics tracking)

**Estimated duration:** 20 minutes

---

## Plan 2.9: Verify Phase 2 Success Criteria (25 min)

**Goal:** Systematically verify all Phase 2 success criteria are met and document results.

**Why this plan:** Disciplined verification prevents scope creep and ensures readiness for Phase 3.

**Acceptance criteria:**
- [ ] Created `.planning/phase-2-verification.md` documenting verification results
- [ ] Each success criterion verified with evidence (logs, test results, code references)
- [ ] Any deviations or limitations documented
- [ ] Performance tested: 100+ feeds complete in <30 seconds
- [ ] Failure scenarios tested: partial failure, high failure rate, all failure
- [ ] Log output quality verified: clear, actionable, professional

**Tasks:**
1. Create `.planning/phase-2-verification.md`
2. Copy Phase 2 success criteria into document
3. For each criterion:
   - Run test build
   - Capture evidence (screenshots, logs, code snippets)
   - Document pass/fail status
4. Test performance with full feed list (~100 feeds)
5. Test failure scenarios:
   - Add intentionally broken feeds (404, timeout)
   - Verify retry logic triggers
   - Verify build succeeds with partial failures
   - Verify build fails with high failure rate
6. Review logs for clarity and usefulness
7. Document any issues or limitations discovered
8. Summarize overall phase status

**Dependencies:** Plans 2.1-2.8 (all previous plans)

**Estimated duration:** 25 minutes

---

## Summary

**Total Plans:** 9
**Total Estimated Time:** 4 hours 45 minutes

**Plan Sequence:**
1. 2.1: Feed Configuration File (30 min) - Foundation
2. 2.2: Error Classification (25 min) - Error utilities
3. 2.3: Retry Logic (40 min) - Error recovery
4. 2.4: Feed Status Tracking (30 min) - Schema extension
5. 2.5: Parallel Fetching (50 min) - Core scaling work
6. 2.6: Integrate Retry Logic (35 min) - Reliability improvement
7. 2.7: Build Logging (30 min) - Developer experience
8. 2.8: Build Failure Logic (20 min) - Graceful degradation
9. 2.9: Verification (25 min) - Quality assurance

**Dependencies:**
- 2.3 depends on 2.2
- 2.5 depends on 2.1, 2.4
- 2.6 depends on 2.3, 2.5
- 2.7 depends on 2.5
- 2.8 depends on 2.7
- 2.9 depends on all others

**Critical Path:** 2.1 → 2.4 → 2.5 → 2.7 → 2.8 → 2.9 (sequential, ~3 hours)
**Parallel Track:** 2.2 → 2.3 → 2.6 (can run alongside 2.5 → 2.7, ~1.7 hours)

---

*Phase 2 plans created: 2026-01-26*
