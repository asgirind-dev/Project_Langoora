import DOMPurify from 'dompurify';

// ✅ Safe HTML Sanitizer - Allows only specific tags for exams
export const sanitizeHtml = (html) => {
  if (!html) return '';
  
  // Configure DOMPurify to allow only what we need
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      // Text formatting
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
      'span', 'div', 'ruby', 'rt', 'rp',
      // Lists
      'ul', 'ol', 'li',
      // Headers
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      // Tables (maybe needed)
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      // Images
      'img',
      // Others
      'hr', 'blockquote', 'code', 'pre'
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel', 'style', 'class', 'src', 'alt',
      'width', 'height'
    ],
    ALLOWED_STYLES: [
      'color', 'background-color', 'font-size', 'font-weight',
      'text-align', 'text-decoration', 'font-style',
      'margin', 'padding', 'display', 'width', 'height'
    ],
    FORCE_BODY: true,
    USE_PROFILES: { html: true }
  });

  return clean;
};

// ✅ For plain text extraction (for display without HTML)
export const stripHtmlToPlainText = (html) => {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = sanitizeHtml(html);
  return div.textContent || div.innerText || '';
};

// ✅ For clean display in lists (with limited HTML)
export const cleanHtmlForDisplay = (html, maxLength = 200) => {
  if (!html) return '';
  
  const clean = sanitizeHtml(html);
  
  // If it's just plain text, trim it
  const plainText = stripHtmlToPlainText(clean);
  if (plainText.length <= maxLength) {
    return clean;
  }
  
  // Truncate while preserving HTML structure
  const truncated = plainText.substring(0, maxLength) + '...';
  return truncated;
};