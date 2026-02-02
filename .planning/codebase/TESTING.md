# Testing Strategy

**Status:** No automated tests currently (manual QA only)  
**Last Updated:** February 2, 2026  
**Priority:** Medium (recommended for v1.2)

## Current State

### No Automated Testing

**Reality:** The Firehose has ZERO automated tests  
**Rationale:**
- Prototype evolved to production quickly
- Small codebase (27 files, ~2000 LOC)
- Manual testing sufficient for daily builds
- Focus on shipping features over test infrastructure

**Trade-offs:**
- ✅ **Fast development** - No test maintenance overhead
- ✅ **Simple workflow** - npm run build → deploy
- ❌ **Regression risk** - Breaking changes hard to catch
- ❌ **Refactoring confidence** - Changes risky without safety net
- ❌ **New contributor friction** - No test examples to learn from

### Manual Testing Workflow

**Current QA process:**

1. **Local build test:**
   ```bash
   npm run build
   # Watch for errors in console
   # Check feed success rate (should be >90%)
   # Verify Landscape fetch succeeded
   # Confirm Pagefind indexing completed
   ```

2. **Preview locally:**
   ```bash
   npm run preview
   # Open http://localhost:4321/firehose
   ```

3. **Browser verification checklist:**
   - [ ] All releases render correctly
   - [ ] Search works (type query, see results)
   - [ ] Filters work (project, status, date)
   - [ ] Keyboard navigation works (j/k/o/?)
   - [ ] Dark mode toggles correctly
   - [ ] Project logos load
   - [ ] Release groups expand/collapse
   - [ ] Infinite scroll loads more content
   - [ ] Mobile responsive (resize to 320px)
   - [ ] Links open in new tabs

4. **Cross-browser testing:**
   - Chrome (primary)
   - Firefox (secondary)
   - Safari (macOS/iOS)
   - Edge (occasionally)

**Time:** ~10-15 minutes per build

**Pain Points:**
- Tedious manual steps
- Easy to skip checks
- No regression detection
- Browser testing inconsistent

## Critical Untested Areas

### High Risk (Should Have Tests)

**1. Feed Loading (`src/lib/feed-loader.ts`)**
- **Risk:** Silent feed failures, data corruption
- **Complexity:** 214 lines, parallel fetching, error handling
- **Test Needs:**
  - Mock RSS feed responses
  - Test retry logic with transient errors (5xx)
  - Test permanent error handling (404, 403)
  - Test success/failure rate calculations
  - Test graceful degradation (>50% failure)

**2. Landscape Integration (`src/lib/landscape.ts`)**
- **Risk:** Wrong project metadata, parsing errors
- **Complexity:** 153 lines, YAML parsing, matching logic
- **Test Needs:**
  - Mock landscape.yml responses
  - Test project extraction (867 projects)
  - Test org/repo slug matching
  - Test fallback when project not found
  - Test duplicate project handling

**3. Markdown Rendering (`src/lib/markdown.ts`)**
- **Risk:** XSS vulnerabilities, broken formatting
- **Complexity:** Third-party library (marked.js)
- **Test Needs:**
  - Test code block rendering
  - Test GitHub issue linking (#123)
  - Test HTML escaping (XSS prevention)
  - Test malformed markdown handling

### Medium Risk (Nice to Have Tests)

**4. Search (`src/components/SearchBar.astro` + Pagefind)**
- **Risk:** Search not working, poor results
- **Complexity:** Third-party library (Pagefind)
- **Test Needs:**
  - Test search index generation
  - Test query execution (E2E)
  - Test result highlighting

**5. Filtering (`src/components/FilterBar.astro`)**
- **Risk:** Incorrect filtering logic
- **Complexity:** Client-side JavaScript
- **Test Needs:**
  - Test project filter (160 options)
  - Test status filter (3 options)
  - Test date range filter
  - Test clear filters

**6. Keyboard Navigation (`src/scripts/keyboard-nav.ts`)**
- **Risk:** Shortcuts not working, focus issues
- **Complexity:** 189 lines, focus management
- **Test Needs:**
  - Test j/k navigation
  - Test o (open in new tab)
  - Test / (focus search)
  - Test ? (help modal)
  - Test Escape (close modal)

### Low Risk (Maybe Tests)

**7. Schema Validation (`src/lib/schemas.ts`)**
- **Risk:** Invalid data structure
- **Complexity:** Zod schemas
- **Test Needs:**
  - Test valid feed entry parsing
  - Test invalid data rejection
  - Test optional field handling

**8. Utilities (`src/utils/*.ts`)**
- **Risk:** Logic bugs
- **Complexity:** Low (simple functions)
- **Test Needs:**
  - Test retry backoff calculations
  - Test error classification (transient vs permanent)
  - Test feed status helpers

**9. Release Grouping (`src/lib/releaseGrouping.ts`)**
- **Risk:** Incorrect grouping
- **Complexity:** Semver parsing
- **Test Needs:**
  - Test version parsing (v1.2.3, 1.2.3)
  - Test grouping logic (major.minor)
  - Test edge cases (non-semver versions)

## Recommended Testing Strategy

### Phase 1: Unit Tests (High Priority)

**Framework:** Vitest (fast, Vite-native, TypeScript)

**Why Vitest:**
- Zero-config with Vite/Astro projects
- Fast execution (parallel, smart caching)
- Jest-compatible API (familiar)
- Built-in coverage (c8)
- TypeScript out-of-box

**Setup:**
```bash
npm install -D vitest @vitest/ui
```

**Configuration (`vitest.config.ts`):**
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // Most tests are Node.js (build-time)
    coverage: {
      provider: 'c8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['src/pages/**', 'src/components/**'], // Focus on logic
    },
  },
});
```

**Test Structure:**
```
tests/
├── unit/
│   ├── lib/
│   │   ├── landscape.test.ts
│   │   ├── markdown.test.ts
│   │   ├── feed-loader.test.ts
│   │   ├── semver.test.ts
│   │   └── schemas.test.ts
│   └── utils/
│       ├── retry.test.ts
│       ├── errors.test.ts
│       └── feed-status.test.ts
└── fixtures/
    ├── mock-landscape.yml
    ├── mock-feed.xml
    └── mock-release-content.md
```

**Example Test (`tests/unit/lib/landscape.test.ts`):**
```typescript
import { describe, it, expect, vi } from 'vitest';
import { fetchLandscapeData, extractRepoSlug } from '../../../src/lib/landscape';

describe('landscape', () => {
  describe('extractRepoSlug', () => {
    it('extracts org/repo from GitHub URL', () => {
      expect(extractRepoSlug('https://github.com/kubernetes/kubernetes'))
        .toBe('kubernetes/kubernetes');
    });
    
    it('handles URLs with trailing slash', () => {
      expect(extractRepoSlug('https://github.com/dapr/dapr/'))
        .toBe('dapr/dapr');
    });
    
    it('returns null for non-GitHub URLs', () => {
      expect(extractRepoSlug('https://gitlab.com/foo/bar'))
        .toBeNull();
    });
  });
  
  describe('fetchLandscapeData', () => {
    it('fetches and parses landscape.yml', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve('landscape:\n  - ...')
        })
      );
      
      const data = await fetchLandscapeData();
      expect(Object.keys(data).length).toBeGreaterThan(0);
    });
  });
});
```

**Coverage Goal:** 70% for critical paths (lib/, utils/)

### Phase 2: Integration Tests (Medium Priority)

**Framework:** Vitest (same as unit tests)

**Focus:** Build pipeline end-to-end

**Tests:**
```
tests/
└── integration/
    ├── build-pipeline.test.ts   # Full astro build
    ├── feed-loading.test.ts     # Real feed fetching (mocked)
    └── search-indexing.test.ts  # Pagefind integration
```

**Example (`tests/integration/build-pipeline.test.ts`):**
```typescript
import { describe, it, expect } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('build pipeline', () => {
  it('builds successfully', async () => {
    const { stdout, stderr } = await execAsync('npm run build');
    
    expect(stderr).not.toContain('error');
    expect(stdout).toContain('[Landscape] Parsed');
    expect(stdout).toContain('✅ Success:');
  }, 30000); // 30s timeout
  
  it('generates search index', async () => {
    const fs = await import('fs/promises');
    const exists = await fs.stat('dist/pagefind/pagefind.js');
    expect(exists.isFile()).toBe(true);
  });
});
```

**Coverage Goal:** Happy path + critical error scenarios

### Phase 3: E2E Tests (Lower Priority)

**Framework:** Playwright (best-in-class E2E)

**Why Playwright:**
- Multi-browser (Chromium, Firefox, WebKit)
- Fast, reliable (auto-wait)
- Debug mode (pause, inspect)
- Screenshots/videos on failure

**Setup:**
```bash
npm install -D @playwright/test
npx playwright install
```

**Configuration (`playwright.config.ts`):**
```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:4321/firehose',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run preview',
    port: 4321,
    reuseExistingServer: true,
  },
});
```

**Test Structure:**
```
tests/
└── e2e/
    ├── search.test.ts
    ├── filters.test.ts
    ├── keyboard-nav.test.ts
    ├── dark-mode.test.ts
    └── mobile-responsive.test.ts
```

**Example (`tests/e2e/search.test.ts`):**
```typescript
import { test, expect } from '@playwright/test';

test('search functionality', async ({ page }) => {
  await page.goto('/');
  
  // Type in search
  await page.fill('#search-input', 'kubernetes');
  
  // Wait for results
  await page.waitForSelector('.pagefind-ui__result');
  
  // Verify results contain "kubernetes"
  const results = await page.locator('.pagefind-ui__result').allTextContents();
  expect(results.some(r => r.toLowerCase().includes('kubernetes'))).toBe(true);
});

test('keyboard shortcut / focuses search', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('/');
  
  const searchInput = page.locator('#search-input');
  await expect(searchInput).toBeFocused();
});
```

**Coverage Goal:** Critical user workflows (search, filter, navigate)

## Test Execution Workflow

### Local Development
```bash
# Run all tests
npm test

# Run with watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage

# Run specific file
npm test -- tests/unit/lib/landscape.test.ts

# Run E2E tests
npm run test:e2e
```

### CI/CD Integration

**Add to `.github/workflows/update-feed.yaml`:**
```yaml
- name: Run tests
  run: npm test -- --run --coverage

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

**Test before deploy:**
- Prevents broken builds from deploying
- Coverage tracking over time
- Fail on <60% coverage

## Mocking Strategy

### Feed Responses
```typescript
// tests/fixtures/mock-feed.xml
export const mockFeed = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Kubernetes Releases</title>
    <item>
      <title>v1.29.0</title>
      <link>https://github.com/kubernetes/kubernetes/releases/tag/v1.29.0</link>
      <pubDate>Thu, 01 Feb 2024 12:00:00 GMT</pubDate>
      <description>Release notes for v1.29.0</description>
    </item>
  </channel>
</rss>`;
```

### Landscape Data
```typescript
// tests/fixtures/mock-landscape.ts
export const mockLandscape = {
  'kubernetes/kubernetes': {
    name: 'Kubernetes',
    description: 'Production-Grade Container Orchestration',
    repo_url: 'https://github.com/kubernetes/kubernetes',
    project: 'graduated',
  },
};
```

### HTTP Requests
```typescript
import { vi } from 'vitest';

global.fetch = vi.fn((url) => {
  if (url.includes('landscape.yml')) {
    return Promise.resolve({
      ok: true,
      text: () => Promise.resolve(mockLandscapeYaml),
    });
  }
  // ... more mocks
});
```

## Coverage Goals

| Area | Target | Priority |
|------|--------|----------|
| `src/lib/feed-loader.ts` | 80% | Critical |
| `src/lib/landscape.ts` | 80% | Critical |
| `src/lib/markdown.ts` | 70% | High |
| `src/lib/schemas.ts` | 90% | High |
| `src/utils/*.ts` | 80% | High |
| `src/lib/semver.ts` | 90% | Medium |
| `src/lib/releaseGrouping.ts` | 70% | Medium |
| **Overall** | **70%** | **Goal** |

## Performance Testing (Future)

**Tools:** Lighthouse CI, WebPageTest

**Metrics to Track:**
- Build time (<20s threshold)
- Feed fetch time (<15s threshold)
- Page load time (<2s threshold)
- Search response time (<100ms threshold)
- Bundle size (<150KB threshold)

## Go Port Testing Implications

**Advantages:**
- Go has excellent testing story (built-in `testing` package)
- Table-driven tests (idiomatic Go)
- Fast test execution (compiled language)
- Easy mocking (interfaces)

**Recommended Go Tools:**
- `testing` - Standard library (unit tests)
- `testify` - Assertions and mocks
- `httptest` - Mock HTTP servers
- `golangci-lint` - Static analysis

**Example Go Test:**
```go
func TestExtractRepoSlug(t *testing.T) {
    tests := []struct {
        name string
        url  string
        want string
    }{
        {"valid GitHub URL", "https://github.com/kubernetes/kubernetes", "kubernetes/kubernetes"},
        {"trailing slash", "https://github.com/dapr/dapr/", "dapr/dapr"},
        {"non-GitHub URL", "https://gitlab.com/foo/bar", ""},
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got := ExtractRepoSlug(tt.url)
            if got != tt.want {
                t.Errorf("got %q, want %q", got, tt.want)
            }
        })
    }
}
```

## Related Documentation

- `STRUCTURE.md` - Code organization (what to test)
- `FEATURES.md` - User-facing functionality (E2E scenarios)
- `DATAFLOW.md` - Integration test flows
- `BUILD-CACHING-STRATEGY.md` - Performance benchmarks

## Key Takeaways

1. **No tests currently** - Manual QA only (technical debt)
2. **High-risk areas** - Feed loading, Landscape integration, markdown rendering
3. **Recommended: Vitest** - Fast, modern, TypeScript-native
4. **70% coverage goal** - Focus on critical paths
5. **Phase 1: Unit tests** - Low-hanging fruit (utils, lib)
6. **Phase 2: Integration** - Build pipeline validation
7. **Phase 3: E2E** - User workflows (search, filter, navigate)
8. **Go port advantage** - Better testing ecosystem

---

**Authored by:** AI Assistant (OpenCode/Claude Sonnet 4.5)  
**Issue:** firehose-eeq - Write TESTING.md  
**Date:** February 2, 2026
