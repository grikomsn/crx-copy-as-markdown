#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync } from 'fs';
import { execSync } from 'child_process';

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
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
};

console.log(`\n${colors.bold}Building Chrome Extension${colors.reset}\n`);

try {
  // Read version from package.json
  const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
  const version = packageJson.version;
  const zipName = `copy-as-markdown-v${version}.zip`;
  const distDir = 'dist';
  const zipPath = `${distDir}/${zipName}`;

  // Create dist directory (clean if exists)
  if (existsSync(distDir)) {
    log.info('Cleaning existing dist directory...');
    execSync(`rm -rf ${distDir}`);
  }
  
  mkdirSync(distDir, { recursive: true });
  log.success('Created dist directory');

  // Build zip file using native zip command
  log.info('Creating ZIP archive...');
  
  const zipCommand = `zip -r "${zipPath}" \
    manifest.json \
    LICENSE \
    src/ \
    popup/ \
    lib/ \
    icons/ \
    -x "*.DS_Store" "**/.DS_Store" "**/.*"`;

  try {
    execSync(zipCommand, { stdio: 'pipe' });
    log.success(`Created ${zipName}`);
  } catch (error) {
    log.error('Failed to create ZIP archive');
    console.error(error.message);
    process.exit(1);
  }

  // Copy manifest.json to dist for inspection
  execSync('cp manifest.json dist/manifest.json');
  log.success('Copied manifest.json to dist/');

  console.log();
  console.log(`${colors.green}${colors.bold}✓ Build completed successfully${colors.reset}`);
  console.log(`${colors.blue}  Output: ${zipPath}${colors.reset}\n`);

} catch (error) {
  log.error(`Build failed: ${error.message}`);
  process.exit(1);
}
