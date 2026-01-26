# AI Agent Guidelines for The Firehose

This document provides guidelines for AI agents and AI-assisted development tools contributing to The Firehose repository.

## Overview

The Firehose is an RSS feed reader for CNCF and cloud native content. It is meant to summarize releases across the ecosystem

## Guidance

- @cncf/landscape is the single source of truth for all projects, it MUST always take priority
- Use the github MCP server for interfacing with the @cncf/landscape, do not use the web search
- Keep this site as simple and straightforward to maintain as possible. Be surgical and not verbose.

## Attribution Requirements

AI agents must disclose what tool and model they are using in the "Assisted-by" commit footer:

```text
Assisted-by: [Model Name] via [Tool Name]
```

Example:

```text
Assisted-by: Claude 3.5 Sonnet via GitHub Copilot
```

## Commit Message Format

When making commits, use the following format:

```text
<type>: <short description>

<detailed description if needed>

Assisted-by: [Model Name] via [Tool Name]
```

Example:

```text
feat: add support for new RSS feed format

This change adds support for RSS 2.0 feeds in addition
to the existing Atom feed support.

Assisted-by: Claude 3.5 Sonnet via GitHub Copilot
```

## Project-Specific Guidance

### Architecture Understanding

Before making changes, agents should understand:

1. **Build-time processing**: HTML content is extracted during build, not at runtime
2. **Template system**: Uses Handlebars (`includes/index.hbs`)
3. **Custom styling**: GitHub Primer-inspired CSS in `static/index.css`
4. **Build pipeline**: `osmosfeed` → `fetch-landscape-data.js` → `extract-html.js` → `create-html-data.js`
5. **Client-side enhancement**: JavaScript loaders inject HTML and project metadata after page load

### Key Files

- `osmosfeed.yaml` - Feed configuration
- `includes/index.hbs` - Handlebars template
- `static/index.css` - Custom CSS styling
- `static/html-loader.js` - Client-side HTML injector
- `static/project-info-loader.js` - Client-side project metadata loader
- `scripts/fetch-landscape-data.js` - CNCF Landscape data fetcher
- `scripts/extract-html.js` - Build-time HTML extraction
- `scripts/create-html-data.js` - JSON cache generator
- `public/landscape-data.json` - Cached CNCF project metadata (generated)

### Common Tasks

#### Adding a New Feed

1. Edit `osmosfeed.yaml`
2. Add the feed URL under `sources`
3. Run `npm run build` to test

#### Modifying Template

1. Edit `includes/index.hbs`
2. Follow Handlebars best practices (see README.md)
3. Use `{{}}` for escaped content, `{{{}}}` for trusted HTML
4. Test with `npm run build`

#### Updating Styles

1. Edit `static/index.css`
2. Follow GitHub Primer conventions
3. Ensure responsive design
4. Test on multiple screen sizes

### Testing Changes

Always run the full build pipeline:

```bash
npm run build
cd public
python3 -m http.server 8080
```

Visit http://localhost:8080 to verify changes.

### Code Quality Standards

1. **JavaScript**: Follow existing code style (no linters configured)
2. **CSS**: Use existing variable naming conventions
3. **Handlebars**: Follow semantic HTML and accessibility practices
4. **Dependencies**: Minimize external dependencies (currently only osmosfeed)

## Pull Request Guidelines

### PR Description Template

```markdown
## Description
[Brief description of changes]
```

### Review Process

1. Ensure all commits include "Assisted-by" footer
2. Verify build completes successfully
3. Test locally before submitting
4. Include screenshots for visual changes
5. Reference related issues if applicable

## Best Practices for AI Agents

### Do's

- Understand the full context before making changes  
- Follow existing code patterns and conventions  
- Test changes with `npm run build`  
- Include proper attribution in commits  
- Document significant changes  
- Preserve existing functionality  
- Use semantic commit messages  

### Don'ts

❌ Don't modify core osmosfeed behavior (it's a dependency)  
❌ Don't add unnecessary dependencies  
❌ Don't break existing feed sources  
❌ Don't remove attribution from existing commits  
❌ Don't make breaking changes without discussion  
❌ Don't skip the build process  

## Debugging Common Issues

### Build Failures

If `npm run build` fails:

1. Check network connectivity (extract-html.js fetches remote feeds)
2. Verify osmosfeed.yaml syntax
3. Check for rate limiting on GitHub feeds
4. Review error messages in extract-html.js output

### Styling Issues

If styles don't apply:

1. Clear browser cache
2. Verify CSS file is in `public/` after build
3. Check browser console for errors
4. Validate CSS syntax

### Template Issues

If template doesn't render:

1. Validate Handlebars syntax
2. Check data structure matches template expectations
3. Verify osmosfeed successfully generated data
4. Review browser console for JavaScript errors

## CNCF Landscape Integration

### Overview

The Firehose integrates with the CNCF Landscape to display project names and descriptions instead of generic feed titles like "Release notes from dapr". This integration happens in two stages:

1. **Build-time**: Fetch and parse landscape data
2. **Runtime**: Client-side JavaScript updates the DOM with project metadata

### Landscape File Structure

The CNCF Landscape is stored at `https://raw.githubusercontent.com/cncf/landscape/master/landscape.yml`.

**IMPORTANT**: Always use the GitHub MCP to fetch this file. Use:
```
github-mcp-server-get_file_contents owner:cncf repo:landscape path:landscape.yml
```

#### YAML Structure

The landscape.yml file uses the following indentation structure:

```yaml
landscape:
  - category:
    subcategories:
      - subcategory:
        items:
          - item:                                    # 10 spaces
            name: Project Name                       # 12 spaces (item fields)
            homepage_url: https://example.com        # 12 spaces
            project: graduated                       # 12 spaces
            repo_url: https://github.com/org/repo    # 12 spaces
            logo: project.svg                        # 12 spaces
            extra:                                   # 12 spaces
              lfx_slug: project                      # 14 spaces (extra fields)
              summary_use_case: >-                   # 14 spaces
                Description text continues here      # 16 spaces (content)
                across multiple lines with           # 16 spaces
                consistent indentation.              # 16 spaces
              summary_business_use_case: >-          # 14 spaces (next field)
                Another description field            # 16 spaces
```

#### Key Indentation Levels

- **Item marker** (`- item:`): 10 spaces
- **Item fields** (`name:`, `repo_url:`, `extra:`): 12 spaces
- **Extra fields** (`summary_use_case:`): 14 spaces  
- **Field content**: 16 spaces

#### Critical Parsing Rules

1. **Match exact indentation**: Use `^\s{12}name:\s+(.+)$` for item fields, `^\s{14}summary_use_case:` for extra fields
2. **Multi-line content**: Content at 16 spaces belongs to the field at 14 spaces
3. **Field termination**: A new field at 14 spaces ends the previous field's content
4. **Section termination**: Indentation at 13 spaces or less exits the extra section
5. **Repository matching**: Extract `org/repo` from `repo_url` for lookup key

#### Example Parsing Logic

```javascript
// Item field (12 spaces)
if (line.match(/^\s{12}name:\s+(.+)$/)) {
  currentItem.name = line.match(/^\s{12}name:\s+(.+)$/)[1].trim();
}

// Extra section start (12 spaces)
if (line.match(/^\s{12}extra:\s*$/)) {
  inExtra = true;
}

// Summary field start (14 spaces)
if (line.match(/^\s{14}summary_use_case:\s+>-?\s*$/)) {
  inSummaryUseCase = true;
  summaryLines = [];
}

// Content lines (16 spaces)
if (line.match(/^\s{16}\S/)) {
  summaryLines.push(line.trim());
}

// Field ends when new field starts (14 spaces)
if (line.match(/^\s{14}\S/)) {
  currentItem.description = summaryLines.join(' ').trim();
  inSummaryUseCase = false;
}
```

### Data Pipeline

#### 1. Fetch Landscape Data (`scripts/fetch-landscape-data.js`)

**Purpose**: Download and parse CNCF Landscape YAML, extract project metadata

**Key Functions**:
- `fetchUrl(url)` - Downloads the landscape.yml file
- `parseYaml(text)` - Parses YAML with specific indentation rules
- `createProjectMap(projects)` - Creates lookup by name and org/repo

**Output**: `public/landscape-data.json` with structure:
```json
{
  "dapr/dapr": {
    "name": "Dapr",
    "description": "The Distributed Application Runtime (Dapr) provides APIs...",
    "repo_url": "https://github.com/dapr/dapr",
    "homepage_url": "https://dapr.io"
  }
}
```

**When to modify**: When landscape structure changes or different fields are needed

#### 2. Enrich Cache with Project Data (`scripts/extract-html.js`)

**Purpose**: Match feeds to landscape projects and enrich cache.json

**Key Functions**:
- `matchProject(feedUrl, landscapeData)` - Matches GitHub URL to project
- Extracts `org/repo` from feed URL
- Adds `projectName` and `projectDescription` to source objects

**Input**: `public/cache.json`, `public/landscape-data.json`  
**Output**: Enriched `public/cache.json`

**When to modify**: When changing how feeds are matched to projects

#### 3. Client-Side Loading (`static/project-info-loader.js`)

**Purpose**: Update DOM with project information after page load

**Why client-side?**: Osmosfeed doesn't pass custom fields like `projectName` through to the Handlebars template. It has a fixed schema and transforms the data during the build process.

**How it works**:
1. Fetches `landscape-data.json` on page load
2. Finds all `.source-header` elements
3. Extracts `org/repo` from the link URL
4. Updates project name from "Release notes from X" to actual project name
5. Injects project description paragraph

**When to modify**: When changing the display format or adding new metadata

### Common Operations

#### Adding New Landscape Fields

1. Update `parseYaml()` in `scripts/fetch-landscape-data.js` to extract new field
2. Update the data structure in `createProjectMap()` to include the field
3. Update `static/project-info-loader.js` to display the field
4. Update CSS in `static/index.css` for styling

#### Troubleshooting Landscape Data

**No descriptions showing:**
- Check `public/landscape-data.json` exists and has data
- Verify indentation parsing in `parseYaml()`
- Check browser console for JavaScript errors
- Confirm `project-info-loader.js` is loaded

**Wrong project names:**
- Verify org/repo extraction logic in `matchProject()`
- Check that GitHub URL format matches expected pattern
- Ensure landscape-data.json has the correct keys

**Build fails on landscape fetch:**
- Check network connectivity to GitHub
- Verify landscape.yml URL is correct
- Check for YAML parsing errors in console output

### Performance Considerations

- Landscape data is cached at build time (~570KB JSON file)
- Client-side loader runs once on page load
- DOM updates are performed synchronously (small dataset)
- No runtime API calls to CNCF landscape

## Resources

- [Project README](README.md) - Comprehensive technical documentation
- [Osmosfeed Documentation](https://github.com/osmoscraft/osmosfeed)
- [Handlebars Guide](https://handlebarsjs.com/guide/)
- [GitHub Primer CSS](https://primer.style/css/)
- [CNCF Landscape](https://landscape.cncf.io) - Interactive landscape viewer
- [CNCF Landscape GitHub](https://github.com/cncf/landscape) - Source repository

## Questions?

For questions about these guidelines or AI-assisted contributions:

1. Review the [README.md](README.md) for technical details
2. Check existing issues and PRs for examples
3. File an issue on the [GitHub repository](https://github.com/castrojo/firehose/issues)

## License

This project is licensed under the MIT License. All contributions, including those made by AI agents, are subject to this license.
