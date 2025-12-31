/**
 * Shared utilities for Copy as Markdown extension
 */

/**
 * Copy text to clipboard using the Clipboard API
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} True on success
 */
export async function copyToClipboard(text) {
  await navigator.clipboard.writeText(text);
  return true;
}

/**
 * Format markdown output with optional title and source URL
 * @param {string} markdown - The markdown content
 * @param {object} settings - Settings object
 * @param {object} pageInfo - Page information (title, url)
 * @returns {string} Formatted markdown string
 */
export function formatMarkdownOutput(markdown, settings, pageInfo = {}) {
  let result = markdown;

  if (settings.includePageTitle && pageInfo.title) {
    result = `# ${pageInfo.title}\n\n${result}`;
  }

  if (settings.includeSourceUrl && pageInfo.url) {
    if (!result.endsWith('\n')) {
      result += '\n';
    }
    result += `\n---\nSource: ${pageInfo.url}`;
  }

  return result;
}

/**
 * Create a success/error response object
 * @param {boolean} success - Whether the operation succeeded
 * @param {string|null} error - Error message if failed
 * @returns {object} Response object
 */
export function createResponse(success, error = null) {
  return { success, ...(error && { error }) };
}

/**
 * Apply text replacements to a string
 * @param {string} text - Text to apply replacements to
 * @param {Array} rules - Array of replacement rules
 * @param {string} scope - Current copy scope ('page', 'selection', 'link')
 * @returns {string} Text with replacements applied
 */
export function applyTextReplacements(text, rules, scope) {
  if (!text || !Array.isArray(rules)) {
    return text;
  }

  let result = text;

  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (rule.scope !== 'all' && rule.scope !== scope) continue;

    try {
      if (rule.useRegex) {
        const regex = new RegExp(rule.pattern, 'g');
        result = result.replace(regex, rule.replacement);
      } else {
        result = result.split(rule.pattern).join(rule.replacement);
      }
    } catch (error) {
      console.warn('Invalid replacement rule:', rule, error);
    }
  }

  return result;
}
