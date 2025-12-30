#!/usr/bin/env bun

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
};

let hasErrors = false;

console.log(`\n${colors.bold}Pre-build Validation${colors.reset}\n`);

// Check manifest.json exists and is valid
try {
  const manifestPath = 'manifest.json';
  if (!existsSync(manifestPath)) {
    log.error('manifest.json not found');
    hasErrors = true;
  } else {
    const manifestContent = readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);
    
    // Check required fields
    const requiredFields = ['manifest_version', 'name', 'version', 'description'];
    const missingFields = requiredFields.filter(field => !manifest[field]);
    
    if (missingFields.length > 0) {
      log.error(`manifest.json missing required fields: ${missingFields.join(', ')}`);
      hasErrors = true;
    } else {
      log.success('manifest.json is valid');
      
      // Check version matches package.json
      const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
      if (manifest.version !== packageJson.version) {
        log.error(`Version mismatch: manifest.json (${manifest.version}) != package.json (${packageJson.version})`);
        hasErrors = true;
      } else {
        log.success(`Version matches (${manifest.version})`);
      }
    }
  }
} catch (error) {
  log.error(`Failed to parse manifest.json: ${error.message}`);
  hasErrors = true;
}

// Check required files exist
const requiredFiles = [
  'src/background.js',
  'src/content.js',
  'src/toMarkdown.js',
  'popup/popup.html',
  'popup/popup.js',
  'popup/popup.css',
  'lib/turndown.js',
  'icons/icon16.png',
  'icons/icon48.png',
  'icons/icon128.png',
  'LICENSE',
];

let allFilesExist = true;
for (const file of requiredFiles) {
  if (!existsSync(file)) {
    log.error(`Missing required file: ${file}`);
    hasErrors = true;
    allFilesExist = false;
  }
}

if (allFilesExist) {
  log.success('All required files present');
}

// Check required directories
const requiredDirs = ['src', 'popup', 'lib', 'icons'];
let allDirsExist = true;
for (const dir of requiredDirs) {
  if (!existsSync(dir)) {
    log.error(`Missing required directory: ${dir}`);
    hasErrors = true;
    allDirsExist = false;
  }
}

if (allDirsExist) {
  log.success('All required directories present');
}

// Warn if dist/ already exists
if (existsSync('dist')) {
  log.warn('dist/ directory already exists (will be overwritten)');
}

// Final status
console.log();
if (hasErrors) {
  console.log(`${colors.red}${colors.bold}✗ Pre-build validation failed${colors.reset}\n`);
  process.exit(1);
} else {
  console.log(`${colors.green}${colors.bold}✓ Ready to build!${colors.reset}\n`);
  process.exit(0);
}
