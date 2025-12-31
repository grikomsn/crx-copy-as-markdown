/**
 * Centralized settings for Copy as Markdown extension
 * Used across content script, popup, and background
 */

export const DEFAULT_SETTINGS = {
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  linkStyle: 'inlined',
  imageHandling: 'keep',
  includePageTitle: true,
  includeSourceUrl: true,
  textReplacements: {
    pre: { enabled: true, rules: [] },
    post: { enabled: true, rules: [] }
  }
};

export const SETTING_IDS = Object.keys(DEFAULT_SETTINGS);

export async function getSettings() {
  try {
    const stored = await chrome.storage.sync.get('settings');
    return { ...DEFAULT_SETTINGS, ...stored.settings };
  } catch (error) {
    console.warn('Failed to load settings, using defaults:', error);
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings) {
  await chrome.storage.sync.set({ settings });
}

export function createResponse(success, error = null) {
  return { success, ...(error && { error }) };
}

export function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function validateTextReplacementRule(rule) {
  const errors = [];

  if (!rule.id || typeof rule.id !== 'string') {
    errors.push('Rule must have a valid id');
  }

  if (typeof rule.enabled !== 'boolean') {
    errors.push('Rule must have enabled as boolean');
  }

  if (!['all', 'selection', 'page', 'link'].includes(rule.scope)) {
    errors.push('Rule scope must be: all, selection, page, or link');
  }

  if (typeof rule.useRegex !== 'boolean') {
    errors.push('Rule must have useRegex as boolean');
  }

  if (typeof rule.pattern !== 'string') {
    errors.push('Rule must have pattern as string');
  }

  if (typeof rule.replacement !== 'string') {
    errors.push('Rule must have replacement as string');
  }

  return { valid: errors.length === 0, errors };
}
