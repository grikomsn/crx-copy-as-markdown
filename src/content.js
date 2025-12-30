// Content script for Copy as Markdown extension
// Runs on web pages and handles the actual copying

const DEFAULT_SETTINGS = {
  headingStyle: 'atx',           // 'atx' (#) or 'setext' (===)
  bulletListMarker: '-',         // '-', '*', or '+'
  codeBlockStyle: 'fenced',      // 'fenced' or 'indented'
  linkStyle: 'inlined',          // 'inlined' or 'referenced'
  imageHandling: 'keep',         // 'keep' or 'skip'
  includePageTitle: true,
  includeSourceUrl: true
};

/**
 * Load settings from chrome.storage.sync and merge with defaults
 * @returns {Promise<object>} Merged settings object
 */
async function getSettings() {
  try {
    const stored = await chrome.storage.sync.get('settings');
    return { ...DEFAULT_SETTINGS, ...stored.settings };
  } catch (error) {
    console.warn('Failed to load settings, using defaults:', error);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Get HTML content of the current selection
 * @returns {string|null} HTML string of selection, or null if no selection
 */
function getSelectionHtml() {
  const selection = window.getSelection();
  
  if (!selection || selection.rangeCount === 0) {
    return null;
  }
  
  const container = document.createElement('div');
  
  for (let i = 0; i < selection.rangeCount; i++) {
    const range = selection.getRangeAt(i);
    const clonedContents = range.cloneContents();
    container.appendChild(clonedContents);
  }
  
  const html = container.innerHTML.trim();
  return html.length > 0 ? html : null;
}

/**
 * Get HTML content of the entire page body
 * @returns {string} HTML string of page content
 */
function getPageHtml() {
  const clone = document.body.cloneNode(true);
  
  // Remove elements that shouldn't be included in markdown
  const elementsToRemove = clone.querySelectorAll('script, style, noscript');
  elementsToRemove.forEach(el => {
    el.remove();
  });
  
  return clone.innerHTML;
}

/**
 * Copy text to clipboard using the Clipboard API
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} True on success
 * @throws {Error} On failure
 */
async function copyToClipboard(text) {
  await navigator.clipboard.writeText(text);
  return true;
}

/**
 * Format markdown output with optional title and source URL
 * @param {string} markdown - The markdown content
 * @param {object} settings - Settings object
 * @returns {string} Formatted markdown string
 */
function formatMarkdownOutput(markdown, settings) {
  let result = '';
  
  if (settings.includePageTitle && document.title) {
    result += `# ${document.title}\n\n`;
  }
  
  result += markdown;
  
  if (settings.includeSourceUrl) {
    // Ensure proper spacing before footer
    if (!result.endsWith('\n')) {
      result += '\n';
    }
    result += `\n---\nSource: ${window.location.href}`;
  }
  
  return result;
}

// Message listener for communication with background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message.action) {
        case 'copyPage': {
          const settings = await getSettings();
          const html = getPageHtml();
          
          if (!html || html.trim().length === 0) {
            sendResponse({ success: false, error: 'No page content found' });
            return;
          }
          
          const markdown = toMarkdown(html, settings);
          const formatted = formatMarkdownOutput(markdown, settings);
          
          await copyToClipboard(formatted);
          sendResponse({ success: true });
          break;
        }
        
        case 'copySelection': {
          const settings = await getSettings();
          const html = getSelectionHtml();
          
          if (!html) {
            sendResponse({ success: false, error: 'No text selected' });
            return;
          }
          
          const markdown = toMarkdown(html, settings);
          
          // Selection copying does not include title/url formatting
          await copyToClipboard(markdown);
          sendResponse({ success: true });
          break;
        }
        
        case 'copyLink': {
          const { linkUrl, linkText } = message.data || {};
          
          if (!linkUrl) {
            sendResponse({ success: false, error: 'No link URL provided' });
            return;
          }
          
          // Use linkText if available, otherwise use the URL as the text
          const text = linkText && linkText.trim() ? linkText.trim() : linkUrl;
          const markdown = `[${text}](${linkUrl})`;
          
          await copyToClipboard(markdown);
          sendResponse({ success: true });
          break;
        }
        
        default:
          sendResponse({ success: false, error: `Unknown action: ${message.action}` });
      }
    } catch (error) {
      console.error('Copy as Markdown error:', error);
      sendResponse({ success: false, error: error.message || 'Unknown error occurred' });
    }
  })();
  
  // Return true to indicate we will send a response asynchronously
  return true;
});
