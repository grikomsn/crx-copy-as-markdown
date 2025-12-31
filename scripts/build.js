#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync } from 'fs';
import { execSync } from 'child_process';
import * as esbuild from 'esbuild';

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
  const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
  const version = packageJson.version;
  const distDir = 'dist';
  const bundleDir = `${distDir}/bundled`;

  if (existsSync(distDir)) {
    log.info('Cleaning existing dist directory...');
    execSync(`rm -rf ${distDir}`);
  }

  mkdirSync(bundleDir, { recursive: true });
  log.success('Created dist directory');

  log.info('Bundling JavaScript with esbuild...');

  await esbuild.build({
    entryPoints: ['src/content.js'],
    bundle: true,
    outfile: `${bundleDir}/content.js`,
    minify: true,
    sourcemap: false,
    target: ['es2020'],
    format: 'iife',
    platform: 'browser',
    define: {
      'process.env.NODE_ENV': '"production"'
    },
    loader: {
      '.js': 'js'
    },
    external: ['chrome']
  });

  await esbuild.build({
    entryPoints: ['popup/popup.js'],
    bundle: true,
    outfile: `${bundleDir}/popup.js`,
    minify: true,
    sourcemap: false,
    target: ['es2020'],
    format: 'iife',
    platform: 'browser',
    define: {
      'process.env.NODE_ENV': '"production"'
    },
    loader: {
      '.js': 'js'
    },
    external: ['chrome']
  });

  log.success('Bundled JavaScript files');

  const zipName = `copy-as-markdown-v${version}.zip`;
  const zipPath = `${distDir}/${zipName}`;

  log.info('Creating ZIP archive...');

  execSync('cp manifest.json LICENSE dist/ && cp -r icons lib popup src dist/');
  log.success('Copied manifest.json, LICENSE, icons, lib, and src to dist/');

  const zipCommand = `cd "${distDir}" && zip -r "${zipName}" \
    manifest.json \
    LICENSE \
    icons/ \
    lib/ \
    src/ \
    popup/ \
    bundled/ \
    -x "*.DS_Store" "**/.DS_Store"`;

  try {
    execSync(zipCommand, { stdio: 'pipe' });
    log.success(`Created ${zipName}`);
  } catch (error) {
    log.error('Failed to create ZIP archive');
    console.error(error.message);
    process.exit(1);
  }

  console.log();
  console.log(`${colors.green}${colors.bold}✓ Build completed successfully${colors.reset}`);
  console.log(`${colors.blue}  Output: ${zipPath}${colors.reset}\n`);

} catch (error) {
  log.error(`Build failed: ${error.message}`);
  process.exit(1);
}
