/**
 * TypeScript definitions for Copy as Markdown extension
 * Provides IDE support (IntelliSense) without requiring a build step
 */

// Settings interface
interface Settings {
  headingStyle: 'atx' | 'setext';
  bulletListMarker: '-' | '*' | '+';
  codeBlockStyle: 'fenced' | 'indented';
  linkStyle: 'inlined' | 'referenced';
  imageHandling: 'keep' | 'skip';
  includePageTitle: boolean;
  includeSourceUrl: boolean;
  textReplacements: TextReplacementConfig;
}

interface TextReplacementConfig {
  pre: TextReplacementGroup;
  post: TextReplacementGroup;
}

interface TextReplacementGroup {
  enabled: boolean;
  rules: TextReplacementRule[];
}

interface TextReplacementRule {
  id: string;
  enabled: boolean;
  scope: 'all' | 'selection' | 'page' | 'link';
  useRegex: boolean;
  pattern: string;
  replacement: string;
}

// Message types
interface CopyPageMessage {
  action: 'copyPage';
}

interface CopySelectionMessage {
  action: 'copySelection';
}

interface CopyLinkMessage {
  action: 'copyLink';
  data: {
    linkUrl: string;
    linkText?: string;
  };
}

type ExtensionMessage = CopyPageMessage | CopySelectionMessage | CopyLinkMessage;

// Response type
interface CopyResponse {
  success: boolean;
  error?: string;
}

// Turndown options (partial, for what we use)
interface TurndownOptions {
  headingStyle?: 'setext' | 'atx';
  bulletListMarker?: '-' | '*' | '+';
  codeBlockStyle?: 'indented' | 'fenced';
  linkStyle?: 'inlined' | 'referenced';
  emDelimiter?: '_' | '*';
  strongDelimiter?: '__' | '**';
}

// Global toMarkdown function
declare function toMarkdown(html: string, options?: Partial<Settings>): string;

// Helper functions exposed on toMarkdown
declare namespace toMarkdown {
  function createMarkdownConverter(options?: Partial<Settings>): TurndownService;
  function escapeText(str: string): string;
  function fromElement(element: Element, options?: Partial<Settings>): string;
}

// TurndownService type (simplified)
interface TurndownService {
  turndown(html: string): string;
  addRule(key: string, rule: object): TurndownService;
}

// Extend Window interface to include toMarkdown
declare global {
  interface Window {
    toMarkdown: typeof toMarkdown & {
      createMarkdownConverter: typeof toMarkdown.createMarkdownConverter;
      escapeText: typeof toMarkdown.escapeText;
      fromElement: typeof toMarkdown.fromElement;
    };
  }
}

export {};
