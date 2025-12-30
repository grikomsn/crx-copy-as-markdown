# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-01

### Added
- Initial release
- Copy entire page as Markdown via context menu
- Copy selected text/HTML as Markdown via context menu
- Copy links as Markdown via context menu
- Settings popup with configurable options:
  - Heading style (atx/setext)
  - Bullet list marker (-, *, +)
  - Code block style (fenced/indented)
  - Link style (inlined/referenced)
  - Image handling (keep/skip)
  - Include page title toggle
  - Include source URL toggle
- HTML to Markdown conversion using Turndown with custom rules:
  - Smart punctuation normalization
  - Table support with colspan handling
  - Code block detection with language hints
  - Superscript/subscript support
  - Line break preservation
  - Relative URL to absolute conversion
- Chrome notifications for success/failure feedback
- Chrome storage sync for settings across devices

[1.0.0]: https://github.com/grikomsn/crx-copy-as-markdown/releases/tag/v1.0.0
