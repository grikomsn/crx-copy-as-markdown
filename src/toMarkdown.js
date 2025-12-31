/**
 * Markdown converter using Turndown with custom rules
 * Adapted from vscode-markdown-paste-image project
 */

/**
 * Generate border cell for table header separator
 * @param {string} content - Border content (e.g., '---')
 * @param {HTMLElement} node - Table cell node
 * @returns {string} Formatted border cell
 */
function genBorder(content, node) {
  const colspan = parseInt(node.getAttribute('colspan') || '0');
  let suffix = ' ' + content + ' |';
  if (colspan) {
    suffix = suffix.repeat(colspan);
  }

  const index = Array.prototype.indexOf.call(node.parentNode.childNodes, node);
  let prefix = ' ';
  if (index === 0) {
    prefix = '|';
  }
  return prefix + suffix;
}

/**
 * Generate table cell content
 * @param {string} content - Cell content
 * @param {HTMLElement} node - Table cell node
 * @returns {string} Formatted cell
 */
function cell(content, node) {
  const colspan = parseInt(node.getAttribute('colspan') || '0');
  let suffix = '|';
  if (colspan) {
    suffix = suffix.repeat(colspan);
  }

  const index = Array.prototype.indexOf.call(node.parentNode.childNodes, node);
  let prefix = ' ';
  if (index === 0) {
    prefix = '| ';
  }
  return prefix + content + ' ' + suffix;
}

/**
 * Escape and normalize text - preserves newlines while normalizing smart punctuation
 * Matches the behavior of vscode-markdown-paste-image
 * @param {string} str - Text to escape
 * @returns {string} Escaped text
 */
function escapeText(str) {
  if (!str) return '';
  
  return str
    // Smart punctuation normalization
    .replace(/[\u2018\u2019\u00b4]/g, "'")      // Curly single quotes -> straight
    .replace(/[\u201c\u201d\u2033]/g, '"')      // Curly double quotes -> straight
    .replace(/[\u2212\u2022\u00b7\u25aa]/g, '-') // Various dashes/bullets -> hyphen
    .replace(/[\u2013\u2015]/g, '--')           // En-dash -> double hyphen
    .replace(/\u2014/g, '---')                  // Em-dash -> triple hyphen
    .replace(/\u2026/g, '...')                  // Ellipsis -> three dots
    // Whitespace normalization (preserves newlines)
    .replace(/[ ]+\n/g, '\n')                   // Remove trailing spaces before newlines
    .replace(/\s*\\\n/g, '\\\n')                // Normalize escaped newlines
    .replace(/\s*\\\n\s*\\\n/g, '\n\n')         // Double escaped newlines -> paragraph break
    .replace(/\s*\\\n\n/g, '\n\n')              // Escaped newline + newline -> paragraph
    .replace(/\n-\n/g, '\n')                    // Remove lone dashes between newlines
    .replace(/\n\n\s*\\\n/g, '\n\n')            // Paragraph + escaped newline -> paragraph
    .replace(/\n\n\n*/g, '\n\n')                // Collapse multiple newlines to max 2
    .replace(/[ ]+$/gm, '')                     // Remove trailing spaces on each line
    .replace(/<!--\s*([\s\S]*?)\s*-->/gm, '')   // Remove HTML comments
    .replace(/^\s+|[\s\\]+$/g, '');             // Trim start and end
}

/**
 * Create a configured Turndown service with custom rules
 * @param {Object} options - Configuration options
 * @param {string} options.headingStyle - 'setext' or 'atx'
 * @param {string} options.bulletListMarker - '-', '+', or '*'
 * @param {string} options.codeBlockStyle - 'fenced' or 'indented'
 * @param {string} options.linkStyle - 'inlined' or 'referenced'
 * @param {string} options.imageHandling - 'keep' or 'skip'
 * @returns {TurndownService} Configured Turndown instance
 */
function createMarkdownConverter(options = {}) {
  const {
    headingStyle = 'atx',
    bulletListMarker = '-',
    codeBlockStyle = 'fenced',
    linkStyle = 'inlined',
    imageHandling = 'keep'
  } = options;

  const turndownService = new TurndownService({
    headingStyle,
    bulletListMarker,
    codeBlockStyle,
    linkStyle,
    emDelimiter: '*',
    strongDelimiter: '**'
  });

  // ===========================================
  // Filter rule - remove unwanted elements
  // ===========================================
  turndownService.addRule('removeUnwanted', {
    filter: ['style', 'script', 'head', 'meta', 'noscript', 'link'],
    replacement: function() {
      return '';
    }
  });

  // ===========================================
  // Superscript rule: <sup> -> ^content^
  // ===========================================
  turndownService.addRule('superscript', {
    filter: 'sup',
    replacement: function(content) {
      return '^' + content + '^';
    }
  });

  // ===========================================
  // Subscript rule: <sub> -> ~content~
  // ===========================================
  turndownService.addRule('subscript', {
    filter: 'sub',
    replacement: function(content) {
      return '~' + content + '~';
    }
  });

  // ===========================================
  // Line break rule: <br> -> \n
  // ===========================================
  turndownService.addRule('lineBreak', {
    filter: 'br',
    replacement: function() {
      return '\n';
    }
  });

  // ===========================================
  // Emphasis rule: <em>, <i>, <cite>, <var>
  // ===========================================
  turndownService.addRule('emphasis', {
    filter: ['em', 'i', 'cite', 'var'],
    replacement: function(content, node, options) {
      if (!content.trim()) return '';
      return options.emDelimiter + content + options.emDelimiter;
    }
  });

  // ===========================================
  // Inline code: <code>, <kbd>, <samp>, <tt>
  // ===========================================
  turndownService.addRule('inlineCode', {
    filter: function(node) {
      const hasSiblings = node.previousSibling || node.nextSibling;
      const isCodeBlock = node.parentNode.nodeName === 'PRE' && !hasSiblings;
      const isCodeElem = 
        node.nodeName === 'CODE' ||
        node.nodeName === 'KBD' ||
        node.nodeName === 'SAMP' ||
        node.nodeName === 'TT';
      
      return isCodeElem && !isCodeBlock;
    },
    replacement: function(content) {
      if (!content) return '';
      return '`' + content + '`';
    }
  });

  // ===========================================
  // Smart link rule for <a> tags
  // ===========================================
  turndownService.addRule('smartLink', {
    filter: function(node) {
      return node.nodeName === 'A' && node.getAttribute('href');
    },
    replacement: function(content, node) {
      const url = node.getAttribute('href');
      const titlePart = node.title ? ' "' + node.title + '"' : '';
      
      if (content === url) {
        return '<' + url + '>';
      } else if (url === 'mailto:' + content) {
        return '<' + content + '>';
      } else if (content !== '') {
        return '[' + content + '](' + url + titlePart + ')';
      } else {
        return '';
      }
    }
  });

  // ===========================================
  // Passthrough elements: <font>, <span>
  // ===========================================
  turndownService.addRule('passthrough', {
    filter: ['font', 'span'],
    replacement: function(content) {
      return content;
    }
  });

  // ===========================================
  // Div handling: add newline after
  // ===========================================
  turndownService.addRule('div', {
    filter: ['div'],
    replacement: function(content) {
      return content + '\n';
    }
  });

  // ===========================================
  // Code blocks: <pre>
  // ===========================================
  turndownService.addRule('codeBlock', {
    filter: ['pre'],
    replacement: function(content, node) {
      // Try to detect language from code element class
      const codeElement = node.querySelector('code');
      let language = '';
      
      if (codeElement) {
        const className = codeElement.getAttribute('class') || '';
        const langMatch = className.match(/(?:language-|lang-)(\w+)/);
        if (langMatch) {
          language = langMatch[1];
        }
      }

      return '\n```' + language + '\n' + content + '\n```\n';
    }
  });

  // ===========================================
  // Table support rules
  // ===========================================

  // Remove colgroup
  turndownService.addRule('colgroup', {
    filter: ['colgroup'],
    replacement: function() {
      return '';
    }
  });

  // Table cells
  turndownService.addRule('tableCell', {
    filter: ['th', 'td'],
    replacement: function(content, node) {
      return cell(content.replace(/\n/gm, ''), node);
    }
  });

  // Table rows
  turndownService.addRule('tableRow', {
    filter: 'tr',
    replacement: function(content, node) {
      let borderCells = '';
      const alignMap = { left: ':--', right: '--:', center: ':-:' };

      // Determine if we need to add header separator
      const parent = node.parentNode;
      const needsSeparator = (
        (parent && parent.nodeName === 'THEAD') ||
        (parent && parent.nodeName === 'TBODY' && parent.previousSibling === null && node.previousSibling === null) ||
        node.previousSibling === null ||
        (node.previousSibling && node.previousSibling.nodeName === 'COLGROUP')
      );

      if (needsSeparator) {
        for (const childNode of node.childNodes) {
          if (childNode.nodeType !== 1) continue; // Skip non-element nodes
          const align = childNode.getAttribute && childNode.getAttribute('align');
          let border = '---';
          if (align) border = alignMap[align] || border;
          borderCells += genBorder(border, childNode);
        }
      }

      return '\n' + content + (borderCells ? '\n' + borderCells : '');
    }
  });

  // Table wrapper
  turndownService.addRule('table', {
    filter: 'table',
    replacement: function(content) {
      return '\n\n' + content + '\n\n';
    }
  });

  // Table sections
  turndownService.addRule('tableSection', {
    filter: ['thead', 'tbody', 'tfoot'],
    replacement: function(content) {
      return content;
    }
  });

  // ===========================================
  // Image handling
  // ===========================================
  turndownService.addRule('image', {
    filter: 'img',
    replacement: function(content, node) {
      if (imageHandling === 'skip') {
        return '';
      }

      const alt = node.getAttribute('alt') || '';
      const src = node.getAttribute('src') || '';
      const title = node.getAttribute('title');

      if (!src) {
        return '';
      }

      // Convert relative URLs to absolute
      let absoluteUrl = src;
      try {
        if (typeof document !== 'undefined' && document.baseURI) {
          absoluteUrl = new URL(src, document.baseURI).href;
        }
      } catch (e) {
        // If URL parsing fails, use original src
        absoluteUrl = src;
      }

      if (title) {
        return '![' + alt + '](' + absoluteUrl + ' "' + title + '")';
      }
      return '![' + alt + '](' + absoluteUrl + ')';
    }
  });

  return turndownService;
}

/**
 * Convert HTML to Markdown
 * @param {string} html - HTML string to convert
 * @param {Object} options - Conversion options
 * @returns {string} Markdown string
 */
function toMarkdown(html, options = {}) {
  if (!html || typeof html !== 'string') {
    return '';
  }

  const converter = createMarkdownConverter(options);
  let markdown = converter.turndown(html);
  
  // Apply escape/normalization (preserves newlines)
  markdown = escapeText(markdown);
  
  return markdown;
}

/**
 * Convert a DOM element to Markdown
 * @param {Element} element - DOM element to convert
 * @param {Object} options - Conversion options
 * @returns {string} Markdown string
 */
function toMarkdownFromElement(element, options = {}) {
  if (!element || !(element instanceof Element)) {
    return '';
  }

  const html = element.outerHTML;
  return toMarkdown(html, options);
}

// Expose toMarkdown globally
if (typeof window !== 'undefined') {
  window.toMarkdown = toMarkdown;
  window.toMarkdown.createMarkdownConverter = createMarkdownConverter;
  window.toMarkdown.escapeText = escapeText;
  window.toMarkdown.fromElement = toMarkdownFromElement;
}
