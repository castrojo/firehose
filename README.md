# The Firehose

This repository hosts the UI and content of "The Firehose" - an RSS feed reader for CNCF and cloud native content.

## About

The Firehose aggregates and displays content from various sources including:
- CNCF blog
- Cloud native community resources
- Developer education and technology blogs

## Links and references

- [How does it work?](https://github.com/osmoscraft/osmosfeed#osmosfeed)
- [File an issue about the template](https://github.com/osmoscraft/osmosfeed-template)
- [File an issue about the tool](https://github.com/osmoscraft/osmosfeed)
- [Latest documentation](https://github.com/osmoscraft/osmosfeed)

## Customization

This repository uses custom templates and styling to properly render GitHub release notes and blog content.

### Custom Template

The custom Handlebars template (`includes/index.hbs`) provides:
- Proper display of GitHub release notes with preserved formatting
- Collapsible article sections using details/summary elements
- Image support for article previews
- Direct links to full release notes on GitHub

### Custom Styling

The custom CSS (`static/index.css`) includes:
- Gruvbox dark theme for consistency with CNCF aesthetic
- Special formatting for release notes content (`white-space: pre-wrap`)
- Comprehensive markdown content styles
- Responsive design support
- Enhanced typography for better readability

### How It Works

1. **Feed Ingestion**: Osmosfeed fetches RSS/Atom feeds from configured sources
2. **Content Processing**: Release notes are processed and formatted
3. **Template Rendering**: The custom Handlebars template renders the content
4. **Static Output**: Generated HTML, CSS, and JS are deployed to GitHub Pages

### Modifying the Template

To customize the homepage layout, edit `includes/index.hbs`. The template uses Handlebars syntax with these data structures available:

- `dates[]` - Articles grouped by publish date
- `sources[]` - Articles grouped by source
- `articles[]` - Flat list of all articles

See the [osmosfeed documentation](https://github.com/osmoscraft/osmosfeed/blob/master/docs/customization-guide.md) for more details.

### Modifying Styles

To customize the appearance, edit `static/index.css`. The theme uses CSS custom properties (variables) defined in the `:root` selector for easy theming.

