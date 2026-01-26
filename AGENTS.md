# AI Agent Guidelines for The Firehose

This document provides guidelines for AI agents and AI-assisted development tools contributing to The Firehose repository.

## Overview

The Firehose is an RSS feed reader for CNCF and cloud native content. It is meant to summarize releases across the ecosystem

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
4. **Build pipeline**: `osmosfeed` → `extract-html.js` → `create-html-data.js`

### Key Files

- `osmosfeed.yaml` - Feed configuration
- `includes/index.hbs` - Handlebars template
- `static/index.css` - Custom CSS styling
- `static/html-loader.js` - Client-side HTML injector
- `scripts/extract-html.js` - Build-time HTML extraction
- `scripts/create-html-data.js` - JSON cache generator

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

## Resources

- [Project README](README.md) - Comprehensive technical documentation
- [Osmosfeed Documentation](https://github.com/osmoscraft/osmosfeed)
- [Handlebars Guide](https://handlebarsjs.com/guide/)
- [GitHub Primer CSS](https://primer.style/css/)

## Questions?

For questions about these guidelines or AI-assisted contributions:

1. Review the [README.md](README.md) for technical details
2. Check existing issues and PRs for examples
3. File an issue on the [GitHub repository](https://github.com/castrojo/firehose/issues)

## License

This project is licensed under the MIT License. All contributions, including those made by AI agents, are subject to this license.
