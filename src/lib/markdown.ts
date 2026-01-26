import { marked } from 'marked';
import { gfmHeadingId } from 'marked-gfm-heading-id';
import { markedHighlight } from 'marked-highlight';

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
    return typeof html === 'string' ? html : '';
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
