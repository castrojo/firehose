# Testing Patterns

**Analysis Date:** 2026-01-26

## Test Framework

**Runner:**
- None configured
- No test framework detected in dependencies

**Assertion Library:**
- None

**Run Commands:**
```bash
# No test commands available
npm run build              # Build only (osmosfeed + custom scripts)
```

## Test File Organization

**Location:**
- No test files detected
- No test directory structure

**Naming:**
- Not applicable (no tests)

**Structure:**
```
# No test structure present
```

## Test Structure

**Suite Organization:**
- Not applicable - no tests exist

**Patterns:**
- No established testing patterns

## Mocking

**Framework:**
- None

**Patterns:**
- Not applicable

**What to Mock:**
- Would need to mock HTTP requests (`https.get()`, `fetch()`)
- Would need to mock filesystem operations (`fs.readFileSync()`, `fs.writeFileSync()`)
- Would need to mock `localStorage` for client-side code

**What NOT to Mock:**
- Pure data transformation functions (`parseYaml()`, `createProjectMap()`)
- DOM manipulation could use real DOM with jsdom

## Fixtures and Factories

**Test Data:**
- Not applicable - no test fixtures

**Location:**
- No fixtures directory

## Coverage

**Requirements:**
- None enforced

**View Coverage:**
```bash
# No coverage tooling
```

## Test Types

**Unit Tests:**
- Not present
- Would benefit from testing:
  - `scripts/fetch-landscape-data.js`: `parseYaml()`, `createProjectMap()`
  - `scripts/extract-html.js`: `parseAtomFeed()`, `matchProject()`
  - `static/release-html-renderer.js`: `sanitizeHTML()`

**Integration Tests:**
- Not present
- Would benefit from testing:
  - End-to-end build pipeline (`npm run build`)
  - Feed fetching and parsing
  - HTML content extraction and caching

**E2E Tests:**
- Not present
- Would benefit from testing:
  - Client-side loaders (`html-loader.js`, `project-info-loader.js`)
  - Accordion state persistence
  - Markdown rendering

## Common Patterns

**Testing Approach:**
- Manual testing via local build and visual inspection
- Build validation: `npm run build` followed by `python3 -m http.server 8080`
- No automated tests

**Recommended Testing Strategy:**

**For Node.js Scripts:**
```javascript
// Example structure for testing scripts/fetch-landscape-data.js
describe('parseYaml', () => {
  it('should extract project name from landscape YAML', () => {
    const yaml = `
          - item:
            name: Test Project
            repo_url: https://github.com/test/project
    `;
    const projects = parseYaml(yaml);
    expect(projects[0].name).toBe('Test Project');
  });
});

describe('createProjectMap', () => {
  it('should create lookup by org/repo', () => {
    const projects = [
      { name: 'Dapr', repo_url: 'https://github.com/dapr/dapr' }
    ];
    const map = createProjectMap(projects);
    expect(map['dapr/dapr'].name).toBe('Dapr');
  });
});
```

**For Client-Side Code:**
```javascript
// Example structure for testing static/html-loader.js
describe('loadHTMLContent', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <article class="release-card">
        <a class="release-title" href="https://example.com"></a>
        <div class="release-body"></div>
      </article>
    `;
  });

  it('should inject HTML content into release cards', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({
          'https://example.com': '<p>Test content</p>'
        })
      })
    );
    
    await loadHTMLContent();
    
    const body = document.querySelector('.release-body');
    expect(body.innerHTML).toBe('<p>Test content</p>');
  });
});
```

**For Async Testing:**
```javascript
// Pattern for testing async operations
test('fetchUrl should fetch and return data', async () => {
  const data = await fetchUrl('https://example.com');
  expect(data).toBeDefined();
});
```

**For Error Testing:**
```javascript
// Pattern for testing error handling
test('fetchUrl should handle network errors', async () => {
  await expect(fetchUrl('invalid-url')).rejects.toThrow();
});
```

## Testing Gaps

**Critical Untested Areas:**

1. **YAML Parsing (`scripts/fetch-landscape-data.js`)**
   - `parseYaml()` function has complex indentation logic
   - Risk: Landscape YAML format changes could break parsing silently
   - Priority: High

2. **Project Matching (`scripts/extract-html.js`)**
   - `matchProject()` extracts org/repo from URLs
   - Risk: URL format variations could cause failed matches
   - Priority: Medium

3. **HTML Sanitization (`static/release-html-renderer.js`)**
   - `sanitizeHTML()` removes scripts and dangerous attributes
   - Risk: XSS vulnerabilities if sanitization is incomplete
   - Priority: High

4. **Atom Feed Parsing (`scripts/extract-html.js`)**
   - `parseAtomFeed()` uses regex to parse XML
   - Risk: Malformed feeds could cause parsing errors
   - Priority: Medium

5. **Client-Side Loaders**
   - `html-loader.js` and `project-info-loader.js` modify DOM after load
   - Risk: Race conditions or DOM structure changes
   - Priority: Low

6. **Build Pipeline**
   - Multi-step build: osmosfeed → fetch-landscape-data → extract-html → create-html-data
   - Risk: Failures in one step affect downstream steps
   - Priority: Medium

## Recommended Testing Setup

**Framework Recommendation:**
- Jest for Node.js scripts (good CommonJS support)
- jsdom for client-side code testing
- Supertest or nock for HTTP mocking

**Minimal Setup:**
```json
{
  "devDependencies": {
    "jest": "^29.0.0",
    "jsdom": "^22.0.0"
  },
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

**Jest Config (`jest.config.js`):**
```javascript
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.js', '**/*.test.js'],
  collectCoverageFrom: [
    'scripts/**/*.js',
    'static/**/*.js',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 70,
      functions: 70,
      lines: 70
    }
  }
};
```

## Quality Assurance

**Current Approach:**
- Manual build testing: `npm run build`
- Visual inspection via local server: `python3 -m http.server 8080`
- Git-based review process
- AI-assisted development with attribution (see `AGENTS.md`)

**Recommended Additions:**
- Unit tests for data transformation functions
- Integration tests for build pipeline
- E2E tests for client-side behavior
- CI/CD pipeline with automated testing

---

*Testing analysis: 2026-01-26*
