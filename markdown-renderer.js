// Simple markdown-like renderer for release notes
(function() {
  'use strict';
  
  function renderMarkdownContent() {
    const contentElements = document.querySelectorAll('.markdown-content');
    
    contentElements.forEach(element => {
      const rawText = element.textContent.trim();
      if (!rawText) return;
      
      // Process the text to add basic markdown-like formatting
      let html = escapeHtml(rawText);
      
      // Convert headers (lines that look like headers)
      html = html.replace(/^([A-Z][^\n]{0,60})$/gm, '<h3>$1</h3>');
      
      // Convert code blocks (indented lines or lines with kubectl, etc.)
      html = html.replace(/(kubectl [^\n]+)/g, '<code>$1</code>');
      html = html.replace(/(docker [^\n]+)/g, '<code>$1</code>');
      html = html.replace(/(git [^\n]+)/g, '<code>$1</code>');
      
      // Convert URLs to links
      html = html.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
      
      // Convert line breaks to paragraphs
      html = html.split('\n\n').map(para => {
        para = para.trim();
        if (!para) return '';
        if (para.startsWith('<h3>') || para.startsWith('<code>')) return para;
        return '<p>' + para.replace(/\n/g, '<br>') + '</p>';
      }).join('\n');
      
      element.innerHTML = html;
    });
  }
  
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderMarkdownContent);
  } else {
    renderMarkdownContent();
  }
})();
