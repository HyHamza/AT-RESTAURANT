#!/usr/bin/env node

/**
 * Generate Service Worker Manifest
 * Creates a list of all build assets for pre-caching
 */

const fs = require('fs');
const path = require('path');

const BUILD_DIR = path.join(process.cwd(), '.next');
const OUTPUT_FILE = path.join(process.cwd(), 'public', 'sw-manifest.json');

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

function generateManifest() {
  console.log('[SW Manifest] Generating service worker manifest...');

  const manifest = {
    version: Date.now(),
    timestamp: new Date().toISOString(),
    pages: [],
    chunks: [],
    css: [],
    images: [],
    fonts: []
  };

  try {
    // Get all static files
    const staticDir = path.join(BUILD_DIR, 'static');
    
    if (fs.existsSync(staticDir)) {
      const files = getAllFiles(staticDir);
      
      files.forEach((file) => {
        const relativePath = file.replace(BUILD_DIR, '/_next').replace(/\\/g, '/');
        
        if (file.endsWith('.js')) {
          manifest.chunks.push(relativePath);
        } else if (file.endsWith('.css')) {
          manifest.css.push(relativePath);
        } else if (file.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/)) {
          manifest.images.push(relativePath);
        } else if (file.match(/\.(woff|woff2|ttf|eot)$/)) {
          manifest.fonts.push(relativePath);
        }
      });
    }

    // Add public pages
    manifest.pages = [
      '/',
      '/menu',
      '/order',
      '/dashboard',
      '/settings',
      '/location',
      '/order-status',
      '/privacy',
      '/terms',
      '/offline',
      '/login',
      '/signup'
    ];

    // Write manifest
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(manifest, null, 2));
    
    console.log('[SW Manifest] ✓ Generated manifest:');
    console.log(`  - Pages: ${manifest.pages.length}`);
    console.log(`  - JS Chunks: ${manifest.chunks.length}`);
    console.log(`  - CSS Files: ${manifest.css.length}`);
    console.log(`  - Images: ${manifest.images.length}`);
    console.log(`  - Fonts: ${manifest.fonts.length}`);
    console.log(`[SW Manifest] ✓ Saved to: ${OUTPUT_FILE}`);
    
  } catch (error) {
    console.error('[SW Manifest] Error generating manifest:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  generateManifest();
}

module.exports = { generateManifest };
