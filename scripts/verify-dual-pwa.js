#!/usr/bin/env node

/**
 * Dual PWA Configuration Verification Script
 * 
 * This script verifies that the dual PWA setup is correctly configured
 * by checking manifest files, service workers, and component files.
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(filePath, description) {
  const fullPath = path.join(process.cwd(), filePath);
  if (fs.existsSync(fullPath)) {
    log(`✓ ${description}`, 'green');
    return true;
  } else {
    log(`✗ ${description} - NOT FOUND`, 'red');
    return false;
  }
}

function checkManifest(filePath, expectedId, expectedScope, expectedStartUrl, appName) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    log(`✗ ${appName} manifest not found: ${filePath}`, 'red');
    return false;
  }

  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    const manifest = JSON.parse(content);
    
    let allGood = true;

    // Check ID
    if (manifest.id === expectedId) {
      log(`  ✓ ${appName} ID: ${manifest.id}`, 'green');
    } else {
      log(`  ✗ ${appName} ID incorrect: ${manifest.id} (expected: ${expectedId})`, 'red');
      allGood = false;
    }

    // Check scope
    if (manifest.scope === expectedScope) {
      log(`  ✓ ${appName} Scope: ${manifest.scope}`, 'green');
    } else {
      log(`  ✗ ${appName} Scope incorrect: ${manifest.scope} (expected: ${expectedScope})`, 'red');
      allGood = false;
    }

    // Check start_url
    if (manifest.start_url === expectedStartUrl) {
      log(`  ✓ ${appName} Start URL: ${manifest.start_url}`, 'green');
    } else {
      log(`  ✗ ${appName} Start URL incorrect: ${manifest.start_url} (expected: ${expectedStartUrl})`, 'red');
      allGood = false;
    }

    // Check name
    log(`  ℹ ${appName} Name: ${manifest.name}`, 'cyan');
    log(`  ℹ ${appName} Short Name: ${manifest.short_name}`, 'cyan');

    return allGood;
  } catch (error) {
    log(`✗ Error parsing ${appName} manifest: ${error.message}`, 'red');
    return false;
  }
}

function checkServiceWorker(filePath, appName, shouldIgnore, shouldHandle) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    log(`✗ ${appName} service worker not found: ${filePath}`, 'red');
    return false;
  }

  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    
    let allGood = true;

    // Check if it ignores the routes it should
    if (shouldIgnore) {
      const ignorePattern = new RegExp(shouldIgnore.replace('/', '\\/'), 'i');
      if (ignorePattern.test(content)) {
        log(`  ✓ ${appName} SW ignores ${shouldIgnore} routes`, 'green');
      } else {
        log(`  ✗ ${appName} SW doesn't ignore ${shouldIgnore} routes`, 'red');
        allGood = false;
      }
    }

    // Check if it handles the routes it should
    if (shouldHandle) {
      const handlePattern = new RegExp(shouldHandle.replace('/', '\\/'), 'i');
      if (handlePattern.test(content)) {
        log(`  ✓ ${appName} SW handles ${shouldHandle} routes`, 'green');
      } else {
        log(`  ⚠ ${appName} SW might not handle ${shouldHandle} routes correctly`, 'yellow');
      }
    }

    return allGood;
  } catch (error) {
    log(`✗ Error reading ${appName} service worker: ${error.message}`, 'red');
    return false;
  }
}

function checkIconDirectory(dirPath, appName) {
  const fullPath = path.join(process.cwd(), dirPath);
  
  if (!fs.existsSync(fullPath)) {
    log(`✗ ${appName} icon directory not found: ${dirPath}`, 'red');
    return false;
  }

  const files = fs.readdirSync(fullPath);
  const iconCount = files.filter(f => f.endsWith('.png')).length;
  
  if (iconCount > 0) {
    log(`  ✓ ${appName} has ${iconCount} icon file(s)`, 'green');
    return true;
  } else {
    log(`  ✗ ${appName} has no icon files`, 'red');
    return false;
  }
}

function main() {
  log('\n========================================', 'cyan');
  log('  Dual PWA Configuration Verification', 'cyan');
  log('========================================\n', 'cyan');

  let allChecks = true;

  // Check manifest files
  log('📄 Checking Manifest Files...', 'blue');
  const userManifestOk = checkManifest(
    'public/manifest.json',
    'com.atrestaurant.user',
    '/',
    '/?source=pwa&app=user',
    'User App'
  );
  allChecks = allChecks && userManifestOk;

  console.log();

  const adminManifestOk = checkManifest(
    'public/admin-manifest.json',
    'com.atrestaurant.admin',
    '/admin',
    '/admin?source=pwa&app=admin',
    'Admin App'
  );
  allChecks = allChecks && adminManifestOk;

  console.log();

  // Check service workers
  log('⚙️  Checking Service Workers...', 'blue');
  const userSwOk = checkServiceWorker(
    'public/sw.js',
    'User',
    '/admin',
    null
  );
  allChecks = allChecks && userSwOk;

  console.log();

  const adminSwOk = checkServiceWorker(
    'public/admin-sw.js',
    'Admin',
    null,
    '/admin'
  );
  allChecks = allChecks && adminSwOk;

  console.log();

  // Check component files
  log('🧩 Checking Component Files...', 'blue');
  checkFile('src/components/user-sw-register.tsx', 'User SW Registration Component');
  checkFile('src/components/admin-head.tsx', 'Admin Head Component');
  checkFile('src/components/admin-pwa-install.tsx', 'Admin PWA Install Component');

  console.log();

  // Check icon directories
  log('🎨 Checking Icon Directories...', 'blue');
  checkIconDirectory('public/assets/icons', 'User App');
  checkIconDirectory('public/assets/admin-icons', 'Admin App');

  console.log();

  // Check documentation
  log('📚 Checking Documentation...', 'blue');
  checkFile('docs/DUAL_PWA_TESTING_GUIDE.md', 'Testing Guide');
  checkFile('docs/DUAL_PWA_IMPLEMENTATION_SUMMARY.md', 'Implementation Summary');
  checkFile('docs/DUAL_PWA_QUICK_REFERENCE.md', 'Quick Reference');
  checkFile('public/pwa-cleanup.html', 'PWA Cleanup Tool');

  console.log();

  // Final summary
  log('========================================', 'cyan');
  if (allChecks) {
    log('✅ All critical checks passed!', 'green');
    log('\nYour dual PWA setup is correctly configured.', 'green');
    log('Next steps:', 'cyan');
    log('1. Start dev server: npm run dev', 'cyan');
    log('2. Visit: http://localhost:3000/pwa-cleanup.html', 'cyan');
    log('3. Run full cleanup', 'cyan');
    log('4. Test user app installation', 'cyan');
    log('5. Test admin app installation', 'cyan');
  } else {
    log('⚠️  Some checks failed!', 'yellow');
    log('\nPlease review the errors above and fix them.', 'yellow');
    log('Refer to: docs/DUAL_PWA_IMPLEMENTATION_SUMMARY.md', 'cyan');
  }
  log('========================================\n', 'cyan');
}

main();
