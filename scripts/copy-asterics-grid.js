/**
 * Script to copy AsTeRICS-Grid source files into the project.
 * 
 * This script should be run after building the main project.
 * It copies necessary files from the AsTeRICS-Grid repository
 * and integrates them with our Android app structure.
 * 
 * Usage:
 *   node scripts/copy-asterics-grid.js
 * 
 * Prerequisites:
 *   - AsTeRICS-Grid repository cloned locally
 *   - Set ASTERICS_GRID_PATH environment variable
 *     OR place in ../asterics-grid relative to this project
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');

// AsTeRICS-Grid source path
const ASTERICS_GRID_PATH =
  process.env.ASTERICS_GRID_PATH ||
  path.resolve(PROJECT_ROOT, '..', 'asterics-grid');

// Files and directories to copy
const COPY_PATTERNS = [
  // Core JavaScript files
  { from: 'app/build/*.js', to: 'js/' },
  { from: 'app/build/*.js.map', to: 'js/' },
  
  // CSS files
  { from: 'app/build/*.css', to: 'css/' },
  
  // Assets
  { from: 'app/img/**/*', to: 'img/' },
  { from: 'app/dictionaries/**/*', to: 'dictionaries/' },
  
  // HTML template (will be modified)
  { from: 'app/index.html', to: 'index.html' },
  
  // Service worker (optional)
  { from: 'app/sw.js', to: 'sw.js', optional: true },
];

/**
 * Colors for console output.
 */
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

/**
 * Logs a message with color.
 * 
 * @param {string} message - Message to log
 * @param {string} color - Color code
 */
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Checks if a path exists.
 * 
 * @param {string} filepath - Path to check
 * @returns {Promise<boolean>} True if exists
 */
async function exists(filepath) {
  try {
    await fs.access(filepath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Recursively creates directory.
 * 
 * @param {string} dirPath - Directory path
 * @returns {Promise<void>}
 */
async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Copies file from source to destination.
 * 
 * @param {string} src - Source path
 * @param {string} dest - Destination path
 * @returns {Promise<void>}
 */
async function copyFile(src, dest) {
  await ensureDir(path.dirname(dest));
  await fs.copyFile(src, dest);
}

/**
 * Recursively copies directory.
 * 
 * @param {string} src - Source directory
 * @param {string} dest - Destination directory
 * @returns {Promise<number>} Number of files copied
 */
async function copyDirectory(src, dest) {
  await ensureDir(dest);
  
  const entries = await fs.readdir(src, { withFileTypes: true });
  let fileCount = 0;

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      fileCount += await copyDirectory(srcPath, destPath);
    } else {
      await copyFile(srcPath, destPath);
      fileCount++;
    }
  }

  return fileCount;
}

/**
 * Processes index.html to integrate with Capacitor.
 * 
 * @param {string} htmlPath - Path to index.html
 * @returns {Promise<void>}
 */
async function processIndexHtml(htmlPath) {
  let html = await fs.readFile(htmlPath, 'utf-8');

  // Inject Capacitor script
  const capacitorScript = '<script src="capacitor.js"></script>';
  html = html.replace('</head>', `  ${capacitorScript}\n</head>`);

  // Inject our custom initialization script
  const initScript = `
  <script>
    // AsTeRICS-Grid Android initialization
    window.ASTERICS_GRID_ANDROID = true;
    window.OFFLINE_MODE = true;
    
    // Performance monitoring
    if (window.performance && window.performance.mark) {
      window.performance.mark('app-init-start');
    }
  </script>`;
  html = html.replace('</body>', `  ${initScript}\n</body>`);

  // Update paths if needed
  html = html.replace(/src="\/app\//g, 'src="');
  html = html.replace(/href="\/app\//g, 'href="');

  await fs.writeFile(htmlPath, html, 'utf-8');
}

/**
 * Main copy function.
 * 
 * @returns {Promise<void>}
 */
async function copyAstericsGrid() {
  log('\n📦 Copying AsTeRICS-Grid files...', colors.bright);

  // Check if AsTeRICS-Grid exists
  if (!(await exists(ASTERICS_GRID_PATH))) {
    log(
      `\n❌ AsTeRICS-Grid not found at: ${ASTERICS_GRID_PATH}`,
      colors.red
    );
    log('\nPlease:', colors.yellow);
    log('  1. Clone AsTeRICS-Grid repository', colors.yellow);
    log('  2. Set ASTERICS_GRID_PATH environment variable', colors.yellow);
    log('     OR place it in ../asterics-grid', colors.yellow);
    log('\nExample:', colors.yellow);
    log('  git clone https://github.com/asterics/AsTeRICS-Grid.git ../asterics-grid', colors.blue);
    process.exit(1);
  }

  // Ensure dist directory exists
  await ensureDir(DIST_DIR);

  let totalFiles = 0;

  // Copy each pattern
  for (const pattern of COPY_PATTERNS) {
    const srcPath = path.join(ASTERICS_GRID_PATH, pattern.from);
    const destPath = path.join(DIST_DIR, pattern.to);

    try {
      if (pattern.from.includes('**')) {
        // Recursive copy
        const basePath = pattern.from.split('**')[0];
        const srcDir = path.join(ASTERICS_GRID_PATH, basePath);
        
        if (await exists(srcDir)) {
          const count = await copyDirectory(srcDir, destPath);
          totalFiles += count;
          log(`  ✓ Copied ${count} files from ${basePath}`, colors.green);
        } else if (!pattern.optional) {
          log(`  ⚠ Directory not found: ${basePath}`, colors.yellow);
        }
      } else if (pattern.from.includes('*')) {
        // Glob pattern
        const dirPath = path.dirname(srcPath);
        const pattern = path.basename(srcPath);
        
        if (await exists(dirPath)) {
          const files = await fs.readdir(dirPath);
          const regex = new RegExp(
            '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
          );
          
          let count = 0;
          for (const file of files) {
            if (regex.test(file)) {
              await copyFile(
                path.join(dirPath, file),
                path.join(destPath, file)
              );
              count++;
            }
          }
          
          totalFiles += count;
          if (count > 0) {
            log(`  ✓ Copied ${count} files matching ${pattern}`, colors.green);
          }
        } else if (!pattern.optional) {
          log(`  ⚠ Directory not found: ${dirPath}`, colors.yellow);
        }
      } else {
        // Single file
        if (await exists(srcPath)) {
          await copyFile(srcPath, destPath);
          totalFiles++;
          log(`  ✓ Copied ${path.basename(srcPath)}`, colors.green);
        } else if (!pattern.optional) {
          log(`  ⚠ File not found: ${pattern.from}`, colors.yellow);
        }
      }
    } catch (error) {
      if (!pattern.optional) {
        log(`  ✗ Error copying ${pattern.from}: ${error.message}`, colors.red);
      }
    }
  }

  // Process index.html
  const indexPath = path.join(DIST_DIR, 'index.html');
  if (await exists(indexPath)) {
    await processIndexHtml(indexPath);
    log('  ✓ Processed index.html for Capacitor', colors.green);
  }

  log(`\n✅ Successfully copied ${totalFiles} files`, colors.bright);
  log(`📂 Output directory: ${DIST_DIR}`, colors.blue);
}

/**
 * Main entry point.
 */
async function main() {
  try {
    await copyAstericsGrid();
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, colors.red);
    if (error.stack) {
      log(error.stack, colors.red);
    }
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { copyAstericsGrid };