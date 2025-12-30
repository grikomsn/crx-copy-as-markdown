#!/usr/bin/env bun

import { existsSync, statSync, readFileSync } from 'fs';
import { execSync } from 'child_process';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
};

let hasErrors = false;

console.log(`\n${colors.bold}Post-build Validation${colors.reset}\n`);

try {
  // Read version from package.json
  const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
  const version = packageJson.version;
  const zipName = `copy-as-markdown-v${version}.zip`;
  const zipPath = `dist/${zipName}`;

  // Check if ZIP file exists
  if (!existsSync(zipPath)) {
    log.error(`ZIP file not found: ${zipPath}`);
    hasErrors = true;
  } else {
    log.success('ZIP file created');

    // Check file size
    const stats = statSync(zipPath);
    const sizeKB = Math.round(stats.size / 1024);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    if (sizeKB < 10) {
      log.warn(`ZIP file is very small (${sizeKB} KB) - may be incomplete`);
    } else if (stats.size > 5 * 1024 * 1024) {
      log.warn(`ZIP file is large (${sizeMB} MB) - Chrome Web Store has size limits`);
    } else {
      log.success(`Size: ${sizeKB} KB (within limits)`);
    }

    // List ZIP contents
    try {
      const zipContents = execSync(`unzip -l "${zipPath}"`, { encoding: 'utf-8' });
      const lines = zipContents.split('\n');
      
      // Count files (excluding directories)
      const fileLines = lines.filter(line => {
        return line.match(/^\s+\d+\s+\d{2}-\d{2}-\d{4}/) && !line.endsWith('/');
      });
      const fileCount = fileLines.length;

      log.success(`Contains ${fileCount} files`);

      // Check for unwanted files
      const unwantedPatterns = [
        /\.md$/i,
        /test\//i,
        /\.git\//i,
        /package\.json$/i,
        /bun\.lockb$/i,
        /node_modules\//i,
        /scripts\//i,
      ];

      const unwantedFiles = fileLines.filter(line => {
        return unwantedPatterns.some(pattern => pattern.test(line));
      });

      if (unwantedFiles.length > 0) {
        log.error('ZIP contains unwanted files:');
        unwantedFiles.forEach(file => {
          console.log(`  ${colors.red}•${colors.reset} ${file.trim()}`);
        });
        hasErrors = true;
      } else {
        log.success('No unwanted files detected');
      }

      // Check for required files
      const requiredInZip = [
        'manifest.json',
        'LICENSE',
        'src/background.js',
        'src/content.js',
        'popup/popup.html',
        'lib/turndown.js',
        'icons/icon',
      ];

      const allRequired = requiredInZip.every(req => {
        return fileLines.some(line => line.includes(req));
      });

      if (!allRequired) {
        log.error('ZIP missing required files');
        hasErrors = true;
      } else {
        log.success('All required files present');
      }

      // Print build report
      console.log();
      console.log(`${colors.cyan}${colors.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
      console.log(`${colors.cyan}${colors.bold}  📦 Build Report${colors.reset}`);
      console.log(`${colors.cyan}${colors.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
      console.log(`  ${colors.dim}File:${colors.reset}  ${zipPath}`);
      console.log(`  ${colors.dim}Size:${colors.reset}  ${sizeKB} KB`);
      console.log(`  ${colors.dim}Files:${colors.reset} ${fileCount}`);
      console.log();
      console.log(`${colors.bold}  Contents:${colors.reset}`);
      
      // Show top-level items
      const topLevel = new Set();
      fileLines.forEach(line => {
        const match = line.match(/\s+[\d-]+\s+[\d:]+\s+(.+)/);
        if (match) {
          const path = match[1].trim();
          const topItem = path.split('/')[0];
          topLevel.add(topItem);
        }
      });

      const sorted = Array.from(topLevel).sort();
      sorted.forEach(item => {
        console.log(`    ${colors.blue}•${colors.reset} ${item}`);
      });

      console.log();
      console.log(`${colors.green}${colors.bold}  🚀 Ready to upload to Chrome Web Store!${colors.reset}`);
      console.log(`${colors.dim}     https://chrome.google.com/webstore/devconsole${colors.reset}`);
      console.log(`${colors.cyan}${colors.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
      console.log();

    } catch (error) {
      log.error('Failed to list ZIP contents');
      hasErrors = true;
    }
  }

  // Final status
  if (hasErrors) {
    console.log(`${colors.red}${colors.bold}✗ Post-build validation failed${colors.reset}\n`);
    process.exit(1);
  } else {
    process.exit(0);
  }

} catch (error) {
  log.error(`Post-build validation failed: ${error.message}`);
  process.exit(1);
}
