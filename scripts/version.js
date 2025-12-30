#!/usr/bin/env bun

import { readFileSync, writeFileSync } from 'fs';

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

// Get bump type from command line args
const bumpType = process.argv[2];
const validBumpTypes = ['major', 'minor', 'patch'];

if (!bumpType || !validBumpTypes.includes(bumpType)) {
  console.log(`${colors.bold}Usage:${colors.reset} bun run version [major|minor|patch]\n`);
  console.log('Examples:');
  console.log('  bun run version patch  # 1.0.0 -> 1.0.1');
  console.log('  bun run version minor  # 1.0.1 -> 1.1.0');
  console.log('  bun run version major  # 1.1.0 -> 2.0.0');
  process.exit(1);
}

console.log(`\n${colors.bold}Version Bump (${bumpType})${colors.reset}\n`);

try {
  // Read current version from package.json
  const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
  const currentVersion = packageJson.version;
  
  // Parse version
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  
  // Calculate new version
  let newVersion;
  switch (bumpType) {
    case 'major':
      newVersion = `${major + 1}.0.0`;
      break;
    case 'minor':
      newVersion = `${major}.${minor + 1}.0`;
      break;
    case 'patch':
      newVersion = `${major}.${minor}.${patch + 1}`;
      break;
  }

  log.info(`Current version: ${currentVersion}`);
  log.info(`New version: ${newVersion}`);
  console.log();

  // Update package.json
  packageJson.version = newVersion;
  writeFileSync('package.json', JSON.stringify(packageJson, null, 2) + '\n');
  log.success('Updated package.json');

  // Update manifest.json
  const manifest = JSON.parse(readFileSync('manifest.json', 'utf-8'));
  manifest.version = newVersion;
  writeFileSync('manifest.json', JSON.stringify(manifest, null, 2) + '\n');
  log.success('Updated manifest.json');

  // Try to update CHANGELOG.md if it exists
  try {
    const changelogPath = 'CHANGELOG.md';
    const changelog = readFileSync(changelogPath, 'utf-8');
    const today = new Date().toISOString().split('T')[0];
    
    // Look for "## Unreleased" section
    if (changelog.includes('## Unreleased')) {
      const updated = changelog.replace(
        '## Unreleased',
        `## Unreleased\n\n## [${newVersion}] - ${today}`
      );
      writeFileSync(changelogPath, updated);
      log.success('Updated CHANGELOG.md');
    } else {
      log.info('CHANGELOG.md found but no "## Unreleased" section');
    }
  } catch (error) {
    log.info('CHANGELOG.md not found (skipping)');
  }

  console.log();
  console.log(`${colors.green}${colors.bold}✓ Version bumped to ${newVersion}${colors.reset}\n`);
  console.log(`${colors.blue}Next steps:${colors.reset}`);
  console.log(`  1. Review changes: git diff`);
  console.log(`  2. Commit: git add . && git commit -m "chore: bump version to ${newVersion}"`);
  console.log(`  3. Tag: git tag v${newVersion}`);
  console.log(`  4. Build: bun run build`);
  console.log(`  5. Push: git push && git push --tags`);
  console.log();

} catch (error) {
  log.error(`Version bump failed: ${error.message}`);
  process.exit(1);
}
