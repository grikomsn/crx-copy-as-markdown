# AGENTS.md - Coding Agent Guidelines

This document provides guidelines for AI coding agents working on the Copy as Markdown Chrome extension.

## Project Overview

A Chrome extension (Manifest V3) that copies web pages, selections, links, or individual elements as Markdown. Uses plain JavaScript with TypeScript definitions for IDE support. No build step required for development.

## Runtime Preference

**Use Bun instead of Node.js, npm, pnpm, or vite.**

- Use `bun <file>` instead of `node <file>`
- Use `bun install` instead of `npm install`
- Use `bun run <script>` instead of `npm run <script>`
- Use `bunx <package>` instead of `npx <package>`
- Bun automatically loads `.env` files

## Build/Lint/Test Commands

### Loading the Extension

```bash
# 1. Open Chrome and navigate to:
chrome://extensions/

# 2. Enable "Developer mode" (toggle in top right)
# 3. Click "Load unpacked"
# 4. Select the crx-copy-as-markdown folder
```

### Development Testing

```bash
# Open test page in browser
open test/test.html

# Test all features:
# - Context menu: Copy Page/Selection/Link as Markdown
# - Element picker: Alt+M or popup button to toggle
# - Keyboard: Esc to exit picker mode
```

### Build Commands (Optional)

Uses Bun + esbuild for bundling (not required for dev):

```bash
bun run build        # Main build
bun run prebuild     # Pre-build tasks
bun run postbuild    # Post-build tasks
bun run clean        # Clean dist folder
bun run version      # Update version
```

### Linting

No linter is configured. If adding one, use ESLint with browser globals:

```json
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
| `content.js` | Content script + element picker | DOM + `window.toMarkdown` |
| `toMarkdown.js` | Conversion logic | Exposes `window.toMarkdown` |
| `popup/popup.js` | Settings UI | DOM + Chrome storage API |
| `lib/turndown.js` | Vendor library | `TurndownService` |

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

// Constants: UPPER_SNAKE_CASE
const DEFAULT_SETTINGS = { };

// Context menu IDs: camelCase strings
chrome.contextMenus.create({ id: 'copyPageAsMarkdown' });
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

### Imports/Dependencies

- No ES module imports in source files (loaded directly by Chrome)
- Vendor libraries in `lib/` folder (do not modify)
- External dependencies: Turndown (in `lib/turndown.js`)

### Error Handling

```javascript
// Async functions: try-catch with graceful fallbacks
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
    sendResponse({ success: true });
  })();
  return true;
});

// Storage: nest under 'settings' key
await chrome.storage.sync.set({ settings });
await chrome.storage.sync.get('settings');
```

### Settings Synchronization

Settings must be consistent across files. When modifying:

1. Update `DEFAULT_SETTINGS` in `src/content.js`
2. Update `DEFAULT_SETTINGS` in `popup/popup.js`
3. Update `Settings` interface in `src/types.d.ts`
4. Update form fields in `popup/popup.html`

## Key Implementation Notes

### Content Script Load Order

Scripts are loaded in order (see `manifest.json`):
1. `lib/turndown.js` - Creates global `TurndownService`
2. `src/toMarkdown.js` - Creates global `window.toMarkdown`
3. `src/content.js` - Uses `toMarkdown()` function

### Text Normalization

The `escapeText()` function preserves newlines while normalizing smart punctuation and dashes. **Do not** collapse all whitespace - this breaks markdown formatting.

### Restricted Pages

The extension cannot run on `chrome://` or `chrome-extension://` pages.

## Reference Implementation

This extension is adapted from [vscode-markdown-paste-image](https://github.com/telesoho/vscode-markdown-paste-image).
