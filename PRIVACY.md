# Privacy Policy for Copy as Markdown

**Last Updated:** December 31, 2025

## Overview

Copy as Markdown is a Chrome extension that converts web pages, selections, and links to Markdown format. This privacy policy explains our data handling practices.

## Data Collection

**We do not collect, store, transmit, or share any user data.**

This extension:
- Does not collect personally identifiable information
- Does not collect health information
- Does not collect financial or payment information
- Does not collect authentication information
- Does not collect personal communications
- Does not collect location data
- Does not track web browsing history
- Does not monitor user activity
- Does not collect or transmit website content

## How the Extension Works

The extension operates entirely locally on your device:

1. **Content Processing**: When you use the context menu to copy content, the extension accesses the current page's HTML structure and converts it to Markdown format using the Turndown library
2. **Local Storage**: User preferences (such as heading style, bullet markers, etc.) are stored locally using Chrome's storage API and synced across your devices via Chrome Sync
3. **Clipboard Access**: Converted Markdown text is written directly to your clipboard for pasting
4. **No External Servers**: All processing happens locally in your browser. No data is sent to external servers

## Permissions Used

The extension requires the following permissions:

- **contextMenus**: To add right-click menu options
- **activeTab**: To access the current page's content for conversion
- **clipboardWrite**: To copy Markdown text to your clipboard
- **storage**: To save your settings preferences locally
- **notifications**: To show success/error messages
- **Host permissions (<all_urls>)**: To allow the extension to work on any website you choose to use it on

These permissions are used solely for the extension's core functionality and do not involve data collection or transmission.

## Third-Party Services

This extension does not use any third-party analytics, tracking, or advertising services. The Turndown library used for HTML-to-Markdown conversion is bundled locally within the extension.

## Data Sharing

We do not sell, transfer, or share any user data with third parties because we do not collect any user data.

## Children's Privacy

This extension does not knowingly collect information from children under 13 years of age. Since we do not collect any user data, the extension is safe for users of all ages.

## Changes to This Policy

We may update this privacy policy from time to time. Any changes will be reflected in the "Last Updated" date above and published in this repository.

## Contact

If you have questions about this privacy policy, please open an issue on our GitHub repository:
https://github.com/grikomsn/crx-copy-as-markdown/issues

## Open Source

This extension is open source. You can review the complete source code to verify our privacy practices:
https://github.com/grikomsn/crx-copy-as-markdown
