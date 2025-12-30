# AGENTS.md - Coding Agent Guidelines

This document provides guidelines for AI coding agents working on the Copy as Markdown Chrome extension.

## Project Overview

A Chrome extension (Manifest V3) that adds context menu options to copy web pages, selections, or links as Markdown. Uses plain JavaScript with TypeScript definitions for IDE support. No build step required - files are loaded directly by the browser.

## Project Structure

```
crx-copy-as-markdown/
├── manifest.json           # Chrome Extension Manifest V3
├── src/
│   ├── background.js       # Service worker (context menus, notifications)
│   ├── content.js          # Content script (DOM access, clipboard)
│   ├── toMarkdown.js       # HTML→Markdown conversion (Turndown + custom rules)
│   └── types.d.ts          # TypeScript definitions for IDE support
├── popup/
│   ├── popup.html          # Settings UI
│   ├── popup.js            # Settings logic
│   └── popup.css           # Settings styles
├── lib/
│   └── turndown.js         # Turndown library (vendor, do not modify)
├── icons/                  # Extension icons (16, 48, 128px)
└── test/
    └── test.html           # Manual testing page
```

## Build/Lint/Test Commands

This project has **no build step**. Files are plain JavaScript loaded directly by Chrome.

### Loading the Extension

```bash
# 1. Open Chrome and navigate to:
chrome://extensions/

# 2. Enable "Developer mode" (toggle in top right)
# 3. Click "Load unpacked"
# 4. Select the crx-copy-as-markdown folder
```

### Manual Testing

```bash
# Open test page in browser
open test/test.html

# Test actions:
# - Right-click page → "Copy Page as Markdown"
# - Select text, right-click → "Copy Selection as Markdown"
# - Right-click link → "Copy Link as Markdown"
```

### Linting (Optional)

No linter is configured. If adding one, use ESLint with browser globals:

```javascript
// Suggested .eslintrc.json
{
  "env": { "browser": true, "webextensions": true, "es2021": true },
  "parserOptions": { "ecmaVersion": "latest" },
  "rules": { "no-unused-vars": "warn" }
}
```

## Code Style Guidelines

### Language & Runtime

- **Plain JavaScript (ES2021+)** - No TypeScript compilation
- **TypeScript definitions** in `src/types.d.ts` for IDE support only
- Target: Chrome extension environment (Manifest V3)

### File Organization

| File | Purpose | Global Scope |
|------|---------|--------------|
| `background.js` | Service worker | Chrome APIs only |
| `content.js` | Content script | DOM + `window.toMarkdown` |
| `toMarkdown.js` | Conversion logic | Exposes `window.toMarkdown` |
| `popup/popup.js` | Settings UI | DOM + Chrome storage API |

### Formatting

- **Indentation**: 2 spaces
- **Quotes**: Single quotes for strings
- **Semicolons**: Required
- **Line length**: ~100 characters soft limit
- **Trailing commas**: In multiline arrays/objects

### Naming Conventions

```javascript
// Functions: camelCase, verb prefix
function getSelectionHtml() { }
function formatMarkdownOutput() { }
async function copyToClipboard(text) { }

// Constants: UPPER_SNAKE_CASE
const DEFAULT_SETTINGS = { };
const SETTING_IDS = [ ];

// Variables: camelCase
let borderCells = '';
const alignMap = { left: ':--' };

// DOM IDs: camelCase (match JS variable names)
document.getElementById('headingStyle');
```

### Function Documentation

Use JSDoc comments for all exported/significant functions:

```javascript
/**
 * Convert HTML to Markdown
 * @param {string} html - HTML string to convert
 * @param {Object} options - Conversion options
 * @returns {string} Markdown string
 */
function toMarkdown(html, options = {}) { }
```

### Error Handling

```javascript
// Async functions: try-catch with user-friendly messages
async function getSettings() {
  try {
    const stored = await chrome.storage.sync.get('settings');
    return { ...DEFAULT_SETTINGS, ...stored.settings };
  } catch (error) {
    console.warn('Failed to load settings, using defaults:', error);
    return { ...DEFAULT_SETTINGS };
  }
}

// Message responses: always return { success, error? }
sendResponse({ success: false, error: 'No text selected' });
sendResponse({ success: true });
```

### Chrome Extension Patterns

```javascript
// Message listener - must return true for async response
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    // ... async work
    sendResponse({ success: true });
  })();
  return true; // Required for async sendResponse
});

// Context menu IDs: camelCase strings
chrome.contextMenus.create({ id: 'copyPageAsMarkdown' });

// Storage: nest under 'settings' key
await chrome.storage.sync.set({ settings });
await chrome.storage.sync.get('settings');
```

### Turndown Rules

When adding custom Turndown rules, follow this pattern:

```javascript
turndownService.addRule('ruleName', {
  filter: 'tagName',  // or ['tag1', 'tag2'] or function(node)
  replacement: function(content, node, options) {
    return 'markdown output';
  }
});
```

### Settings Synchronization

Settings must be consistent across files. When modifying:

1. Update `DEFAULT_SETTINGS` in `src/content.js`
2. Update `DEFAULT_SETTINGS` in `popup/popup.js`
3. Update `Settings` interface in `src/types.d.ts`
4. Update form fields in `popup/popup.html`

Current settings:
- `headingStyle`: 'atx' | 'setext'
- `bulletListMarker`: '-' | '*' | '+'
- `codeBlockStyle`: 'fenced' | 'indented'
- `linkStyle`: 'inlined' | 'referenced'
- `imageHandling`: 'keep' | 'skip'
- `includePageTitle`: boolean
- `includeSourceUrl`: boolean

## Key Implementation Notes

### Content Script Load Order

Scripts are loaded in order (see `manifest.json`):
1. `lib/turndown.js` - Creates global `TurndownService`
2. `src/toMarkdown.js` - Creates global `window.toMarkdown`
3. `src/content.js` - Uses `toMarkdown()` function

### Text Normalization

The `escapeText()` function in `toMarkdown.js` preserves newlines while normalizing:
- Smart quotes → straight quotes
- Em/en dashes → hyphens
- Collapse 3+ newlines to 2
- Remove trailing whitespace per line

**Do not** collapse all whitespace - this breaks markdown formatting.

### Restricted Pages

The extension cannot run on `chrome://` or `chrome-extension://` pages. This is handled in `background.js`.

## Reference Implementation

This extension is adapted from [vscode-markdown-paste-image](https://github.com/telesoho/vscode-markdown-paste-image). When in doubt about Markdown conversion behavior, refer to `src/toMarkdown.ts` in that repository.
