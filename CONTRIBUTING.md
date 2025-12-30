# Contributing to Copy as Markdown

Thank you for your interest in contributing! This document provides guidelines for contributing to this project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/crx-copy-as-markdown.git`
3. Create a new branch: `git checkout -b feature/your-feature-name`

## Development Setup

This extension requires no build step. Simply:

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the project folder
4. Make your changes and refresh the extension

## Code Style

Please follow the existing code style:

- **Language**: Plain JavaScript (ES2021+), no TypeScript compilation
- **Indentation**: 2 spaces
- **Quotes**: Single quotes for strings
- **Semicolons**: Required
- **Line length**: ~100 characters soft limit

See [AGENTS.md](AGENTS.md) for detailed code style guidelines.

## Testing

Before submitting:

1. Test all three context menu options:
   - Copy Page as Markdown
   - Copy Selection as Markdown
   - Copy Link as Markdown
2. Test with various HTML elements (tables, code blocks, lists, images)
3. Test settings popup functionality
4. Open `test/test.html` and verify conversions

## Submitting Changes

1. Commit your changes with clear, descriptive messages
2. Push to your fork
3. Open a Pull Request with:
   - Clear description of the changes
   - Any relevant issue numbers
   - Screenshots/examples if applicable

## Reporting Issues

When reporting bugs, please include:

- Chrome version
- Extension version
- Steps to reproduce
- Expected vs actual behavior
- Console errors (if any)

## Feature Requests

Feature requests are welcome! Please:

- Check existing issues first
- Provide clear use cases
- Explain why this would be valuable

## Questions?

Feel free to open an issue for questions or discussions.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
