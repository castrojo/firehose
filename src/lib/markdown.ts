import { marked } from 'marked';
import { gfmHeadingId } from 'marked-gfm-heading-id';
import { markedHighlight } from 'marked-highlight';
import sanitizeHtml from 'sanitize-html';

// Configure marked for GitHub-style rendering
marked.use(gfmHeadingId());

// Set marked options
marked.setOptions({
  gfm: true,              // GitHub Flavored Markdown
  breaks: true,           // Convert \n to <br> (GitHub behavior)
  pedantic: false,
});

// Add syntax highlighting with marked-highlight
// Use simple class-based highlighting (actual syntax coloring via CSS)
marked.use(markedHighlight({
  langPrefix: 'language-',
  highlight(code, lang) {
    // Return code wrapped in spans for CSS styling
    // Don't use heavy runtime syntax highlighter - add CSS classes only
    return code;
  }
}));

/**
 * Strip inline style attributes from pre and span elements inside code blocks.
 *
 * Upstream blog posts (Kubernetes, Flux, PipeCD, etc.) ship Hugo/Chroma HTML
 * with hardcoded light-mode inline styles, e.g.:
 *   <pre style="background-color:#f8f8f8;..."><span style="color:#00f;font-weight:bold">
 *
 * Inline styles take precedence over CSS custom properties, making dark-mode
 * theming impossible without this stripping step. After stripping, the site's
 * own CSS (GitHub Primer token classes) handles both light and dark rendering.
 *
 * Only targets pre[style] and their descendant span[style] — does not touch
 * other inline styles that may legitimately appear in blog content.
 */
export function stripChromaInlineStyles(html: string): string {
  // Strip style attr from <pre ...style="..."> blocks
  let result = html.replace(/<pre([^>]*?) style="[^"]*"([^>]*)>/gi, '<pre$1$2>');
  // Strip style attr from <span style="..."> (token coloring inside code blocks)
  // Only strip spans that carry only color/font-weight/font-style (Chroma token spans)
  result = result.replace(/<span style="(?:color:[^";]*|font-weight:[^";]*|font-style:[^";]*|;|\s)*"([^>]*)>/gi,
    '<span$1>');
  return result;
}

/**
 * Render markdown content to HTML using GitHub-compatible rules
 * @param markdown - Raw markdown string from feed content
 * @returns Sanitized HTML string safe for insertion via set:html
 */
export function renderMarkdown(markdown: string | undefined): string {
  if (!markdown) return '';
  
  try {
    // Parse markdown to HTML
    const html = marked.parse(markdown);
    
    // marked.parse returns string or Promise<string>
    // In synchronous mode it returns string
    const htmlStr = typeof html === 'string' ? html : '';

    // Strip Chroma/Hugo inline styles so our CSS theme takes over
    const strippedHtml = stripChromaInlineStyles(htmlStr);

    // Sanitize HTML to prevent XSS attacks
    // Preserves all standard markdown-rendered tags: headings, lists, links, images, code, tables, etc.
    const sanitized = sanitizeHtml(strippedHtml, {
      allowedTags: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'br', 'hr',
        'ul', 'ol', 'li',
        'a', 'img',
        'code', 'pre', 'kbd',
        'strong', 'em', 'b', 'i', 's',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'blockquote',
        'div', 'span',
        'details', 'summary',
        'dl', 'dt', 'dd',
      ],
      allowedAttributes: {
        a: ['href', 'target', 'rel', 'title'],
        img: ['src', 'alt', 'title', 'width', 'height'],
        code: ['class'],
        pre: ['class'],
        span: ['class'],
      },
      // No style attribute allowed (Chroma styles already stripped)
      allowedStyles: {},
      disallowedTagsMode: 'discard',
    });

    return sanitized;
  } catch (error) {
    console.error('Markdown rendering error:', error);
    // Fallback to escaped plain text on error
    return markdown;
  }
}

/**
 * Truncate markdown content to a preview length
 * Strips markdown syntax and returns plain text
 */
export function getMarkdownPreview(markdown: string | undefined, maxLength: number = 300): string {
  if (!markdown) return '';
  
  // Strip markdown syntax for preview
  const plain = markdown
    .replace(/#{1,6}\s/g, '')           // Remove headers
    .replace(/\*\*(.+?)\*\*/g, '$1')    // Remove bold
    .replace(/\*(.+?)\*/g, '$1')        // Remove italic
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links, keep text
    .replace(/`(.+?)`/g, '$1')          // Remove inline code
    .replace(/```[\s\S]*?```/g, '')     // Remove code blocks
    .trim();
  
  return plain.length > maxLength
    ? plain.substring(0, maxLength) + '...'
    : plain;
}
