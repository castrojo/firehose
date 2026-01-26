# The Firehose

This repository hosts the UI and content of "The Firehose" - an RSS feed reader for CNCF and cloud native content.

## About

The Firehose aggregates and displays content from various sources including:
- CNCF blog
- Cloud native community resources
- Developer education and technology blogs
- GitHub releases from CNCF projects

## Features

### GitHub-Style Release Notes
The Firehose renders GitHub release notes with the same formatting as GitHub's releases pages:
- ✅ Proper markdown headers (H2, H3, H4)
- ✅ Formatted lists with bullets
- ✅ Code blocks with syntax highlighting
- ✅ Clickable issue and PR links
- ✅ Tables, blockquotes, and more
- ✅ Clean, professional GitHub Primer-inspired design

### Build-Time HTML Extraction
Instead of fetching feeds on every page load, The Firehose:
1. Fetches all Atom feeds during the build process
2. Extracts pre-rendered HTML from GitHub releases
3. Caches HTML content in a local JSON file
4. Loads instantly on page view (no CORS issues, no rate limiting)

## Architecture

### Build Process
```
npm run build
  ↓
1. osmosfeed builds the site from osmosfeed.yaml
  ↓
2. extract-html.js fetches all GitHub Atom feeds
   - Parses XML to extract HTML content
   - Matches articles by URL
   - Stores in cache.json
  ↓
3. create-html-data.js creates html-content.json
   - Maps article URLs to HTML content
   - ~160 releases cached
  ↓
4. Static site ready for deployment
```

### Runtime Process
```
Page loads → html-loader.js fetches html-content.json → Injects HTML → GitHub CSS styles it
```

## Customization

This repository uses custom templates and styling to properly render GitHub release notes and blog content.

### Custom Template (`includes/index.hbs`)

The Handlebars template provides:
- GitHub-style release card layout
- Clean, flat design (no accordions)
- Proper semantic HTML structure
- Support for both HTML content and plain text fallback

**Key features:**
- Uses `{{{htmlContent}}}` for unescaped HTML rendering
- Falls back to `{{description}}` for non-GitHub sources
- Follows Handlebars best practices (proper escaping, semantic structure)

### Custom Styling (`static/index.css`)

The CSS includes:
- GitHub Primer color palette (light theme)
- Comprehensive markdown styles (`.markdown-body`)
- Responsive design for mobile
- Proper typography with GitHub system fonts

**Styled elements:**
- Headers with bottom borders
- Lists with proper spacing
- Code blocks with gray background
- Tables with alternating rows
- Links with hover states
- Blockquotes and horizontal rules

### Build Scripts

#### `scripts/extract-html.js`
Fetches GitHub Atom feeds and extracts HTML content:
- Handles rate limiting (500ms delay between requests)
- Parses XML using regex (no dependencies)
- Decodes HTML entities
- Caches feed content to avoid refetching

#### `scripts/create-html-data.js`
Creates a lightweight JSON mapping:
- Maps article URL → HTML content
- Used for instant client-side loading
- Typically ~160 cached releases

#### `static/html-loader.js`
Client-side HTML injector:
- Fetches local `html-content.json`
- Matches articles by URL
- Injects HTML into release cards
- Runs on page load (~100ms)

## Technical Decisions

### Why Build-Time HTML Extraction?

**Problem:** Osmosfeed converts all HTML to plain text via `htmlToText()` in its processing pipeline, losing all markdown formatting.

**Attempted Solutions:**
1. ❌ Client-side feed fetching - CORS issues, rate limiting
2. ❌ CORS proxy - Unreliable, rate limited
3. ❌ Modifying osmosfeed - Can't change npm package
4. ✅ **Build-time extraction** - Fetch once, cache forever

**Benefits:**
- No external HTTP requests at runtime
- No CORS issues
- No rate limiting problems
- Instant loading (<100ms)
- Works offline
- Perfect GitHub rendering

### Why Not Use GitHub API?

The Atom feeds already contain pre-rendered HTML, so:
- No API token required
- No rate limiting concerns
- Simpler implementation
- Already perfect rendering

### Handlebars Best Practices

The template follows these practices:
1. **Proper escaping**: `{{}}` for user content, `{{{}}}` for trusted HTML
2. **Block helpers**: `{{#each}}` and `{{#if}}` for logic
3. **Semantic HTML**: Proper article/section structure
4. **Accessibility**: ARIA labels where needed
5. **Fallbacks**: Plain text description when HTML unavailable

## Development

### Local Development
```bash
# Install dependencies
npm install

# Build the site
npm run build

# Serve locally
cd public
python3 -m http.server 8080
```

Visit http://localhost:8080 to view the site.

### Build Process Details

The build runs three steps:
```json
{
  "scripts": {
    "build": "osmosfeed && node scripts/extract-html.js && node scripts/create-html-data.js"
  }
}
```

### Modifying the Template

To customize the homepage layout, edit `includes/index.hbs`. The template uses Handlebars syntax with these data structures:

- `dates[]` - Articles grouped by publish date
- `sources[]` - Articles grouped by source
- `articles[]` - Individual articles with metadata

Each article has:
- `title` - Release/article title
- `link` - URL to full content
- `description` - Plain text description (fallback)
- `htmlContent` - Rich HTML (available via html-loader.js)
- `publishedOn` - ISO timestamp
- `source` - Source metadata

### Modifying Styles

To customize the appearance, edit `static/index.css`. The theme uses CSS custom properties (variables) defined in the `:root` selector:

```css
:root {
  --color-bg-primary: #ffffff;
  --color-text-primary: #24292f;
  --color-link: #0969da;
  /* ... etc */
}
```

## Deployment

The site is automatically deployed via GitHub Actions:

1. Push to `main` branch triggers workflow
2. GitHub Actions runs `npm run build`
3. Site deployed to GitHub Pages
4. Available at https://castrojo.github.io/firehose/

## Configuration

Edit `osmosfeed.yaml` to:
- Add/remove RSS feeds
- Configure cache duration
- Set site title and metadata

See the [osmosfeed documentation](https://github.com/osmoscraft/osmosfeed/blob/master/docs/customization-guide.md) for more details.

## Troubleshooting

### Release notes not showing HTML formatting

1. Check `public/html-content.json` exists
2. Check browser console for errors
3. Verify `html-loader.js` is loaded
4. Try rebuilding: `npm run build`

### Build fails during HTML extraction

1. Check network connectivity
2. GitHub might be rate limiting - wait and retry
3. Check `scripts/extract-html.js` timeout settings

### Styles not applying

1. Clear browser cache (Ctrl+Shift+R)
2. Check `public/index.css` was copied
3. Verify CSS classes match template

## Links and References

- [How does osmosfeed work?](https://github.com/osmoscraft/osmosfeed#osmosfeed)
- [Osmosfeed customization guide](https://github.com/osmoscraft/osmosfeed/blob/master/docs/customization-guide.md)
- [File an issue about the template](https://github.com/osmoscraft/osmosfeed-template)
- [File an issue about the tool](https://github.com/osmoscraft/osmosfeed)
- [Latest documentation](https://github.com/osmoscraft/osmosfeed)

## License

MIT

