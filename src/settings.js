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
  includeSourceUrl: true
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
