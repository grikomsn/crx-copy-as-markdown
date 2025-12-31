import { getSettings } from './settings.js';
import { copyToClipboard, formatMarkdownOutput } from './utils.js';

let isSelectMode = false;
let highlightedElement = null;
let highlightOverlay = null;
let lastElementDetection = 0;
const ELEMENT_DETECTION_THROTTLE_MS = 32;

function createHighlightOverlay() {
  if (highlightOverlay) return highlightOverlay;

  highlightOverlay = document.createElement('div');
  highlightOverlay.id = 'cam-highlight-overlay';
  highlightOverlay.style.cssText = `
    position: absolute;
    pointer-events: none;
    z-index: 999999999;
    border: 2px solid #2563eb;
    background-color: rgba(37, 99, 235, 0.1);
    border-radius: 4px;
    display: none;
    transition: opacity 0.15s ease-out;
    left: 0;
    top: 0;
    width: 0;
    height: 0;
  `;
  document.body.appendChild(highlightOverlay);
  return highlightOverlay;
}

function isValidPickableElement(element) {
  if (!element || !(element instanceof Element)) return false;

  if (element.id === 'cam-highlight-overlay') return false;
  if (element.closest('#cam-highlight-overlay')) return false;

  const tagName = element.tagName.toLowerCase();
  if (['script', 'style', 'noscript', 'head', 'meta', 'link'].includes(tagName)) {
    return false;
  }

  const style = window.getComputedStyle(element);
  if (style.display === 'none') return false;
  if (style.visibility === 'hidden') return false;
  if (style.opacity === '0') return false;
  if (style.pointerEvents === 'none') return false;

  const rect = element.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return false;

  return true;
}

function getElementAtCursor(clientX, clientY) {
  const elements = document.elementsFromPoint(clientX, clientY);

  for (const element of elements) {
    if (isValidPickableElement(element)) {
      return element;
    }
  }

  return null;
}

function updateHighlight(element) {
  if (!highlightOverlay) {
    createHighlightOverlay();
  }

  if (!element || !isSelectMode) {
    highlightOverlay.style.display = 'none';
    highlightedElement = null;
    return;
  }

  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  highlightOverlay.style.display = 'block';
  highlightOverlay.style.left = `${rect.left + window.scrollX}px`;
  highlightOverlay.style.top = `${rect.top + window.scrollY}px`;
  highlightOverlay.style.width = `${rect.width}px`;
  highlightOverlay.style.height = `${rect.height}px`;
  highlightOverlay.style.borderRadius = style.borderRadius || '4px';

  highlightedElement = element;
}

function handleSelectModeMouseMove(e) {
  if (!isSelectMode) return;

  const now = performance.now();
  if (now - lastElementDetection < ELEMENT_DETECTION_THROTTLE_MS) {
    return;
  }
  lastElementDetection = now;

  const element = getElementAtCursor(e.clientX, e.clientY);
  updateHighlight(element);
}

function handleSelectModeScroll() {
  if (!isSelectMode || !highlightedElement) return;
  updateHighlight(highlightedElement);
}

async function handleSelectModeClick(e) {
  if (!isSelectMode) return;
  if (e.target.closest('#cam-highlight-overlay')) return;

  const element = getElementAtCursor(e.clientX, e.clientY);

  if (element) {
    try {
      const settings = await getSettings();
      const html = element.outerHTML;
      const markdown = toMarkdown(html, settings);
      const formatted = formatMarkdownOutput(markdown, settings, {
        title: document.title,
        url: window.location.href
      });

      await copyToClipboard(formatted);

      if (highlightOverlay) {
        highlightOverlay.style.backgroundColor = 'rgba(34, 197, 94, 0.3)';
        highlightOverlay.style.borderColor = '#22c55e';
        setTimeout(() => {
          highlightOverlay.style.backgroundColor = 'rgba(37, 99, 235, 0.1)';
          highlightOverlay.style.borderColor = '#2563eb';
        }, 200);
      }

      chrome.runtime.sendMessage({ action: 'copySuccess' });
    } catch (error) {
      console.error('Failed to copy element:', error);
      chrome.runtime.sendMessage({
        action: 'copyError',
        error: error.message || 'Failed to copy element'
      });
    }
  }

  exitSelectMode();
}

function handleSelectModeKeyDown(e) {
  if (e.key === 'Escape' && isSelectMode) {
    exitSelectMode();
  }
}

function enterSelectMode() {
  if (isSelectMode) return;

  isSelectMode = true;
  createHighlightOverlay();

  document.body.appendChild(highlightOverlay);

  document.addEventListener('mousemove', handleSelectModeMouseMove, true);
  document.addEventListener('click', handleSelectModeClick, true);
  document.addEventListener('keydown', handleSelectModeKeyDown, true);
  window.addEventListener('scroll', handleSelectModeScroll, true);

  document.body.style.cursor = 'crosshair';

  highlightOverlay.style.display = 'block';

  console.log('Element picker mode: ON');
}

function exitSelectMode() {
  if (!isSelectMode) return;

  isSelectMode = false;

  document.removeEventListener('mousemove', handleSelectModeMouseMove, true);
  document.removeEventListener('click', handleSelectModeClick, true);
  document.removeEventListener('keydown', handleSelectModeKeyDown, true);
  window.removeEventListener('scroll', handleSelectModeScroll, true);

  document.body.style.cursor = '';

  if (highlightOverlay) {
    highlightOverlay.style.display = 'none';
  }

  highlightedElement = null;

  console.log('Element picker mode: OFF');
}

function toggleSelectMode() {
  if (isSelectMode) {
    exitSelectMode();
  } else {
    enterSelectMode();
  }
  return isSelectMode;
}

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

function getPageHtml() {
  const clone = document.body.cloneNode(true);

  const elementsToRemove = clone.querySelectorAll('script, style, noscript');
  elementsToRemove.forEach(el => {
    el.remove();
  });

  return clone.innerHTML;
}

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
          const formatted = formatMarkdownOutput(markdown, settings, {
            title: document.title,
            url: window.location.href
          });

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

          const text = linkText && linkText.trim() ? linkText.trim() : linkUrl;
          const markdown = `[${text}](${linkUrl})`;

          await copyToClipboard(markdown);
          sendResponse({ success: true });
          break;
        }

        case 'copyElement': {
          const { elementHtml } = message.data || {};

          if (!elementHtml) {
            sendResponse({ success: false, error: 'No element provided' });
            return;
          }

          const settings = await getSettings();
          const markdown = toMarkdown(elementHtml, settings);
          const formatted = formatMarkdownOutput(markdown, settings, {
            title: document.title,
            url: window.location.href
          });

          await copyToClipboard(formatted);
          sendResponse({ success: true });
          break;
        }

        case 'toggleSelectMode': {
          const isActive = toggleSelectMode();
          sendResponse({ success: true, isActive });
          break;
        }

        case 'getSelectModeState': {
          sendResponse({ success: true, isActive: isSelectMode });
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

  return true;
});
