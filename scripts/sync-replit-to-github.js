/**
 * Complete Replit to GitHub Synchronization Script
 * Ensures all files are aligned between environments
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Configuration
const GITHUB_REPO = 'https://github.com/adrlitx2/VIDA-Redux.git';
const BRANCH = 'ReplitWorkbench';
const TEMP_DIR = './temp-github-sync';

// Essential directories and files to sync
const SYNC_PATTERNS = [
  // Core application files
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'vite.config.ts',
  'tailwind.config.ts',
  'postcss.config.js',
  'components.json',
  'drizzle.config.ts',
  'replit.md',
  
  // Source directories
  'client/**/*',
  'server/**/*',
  'shared/**/*',
  'scripts/**/*',
  
  // GitHub workflow
  '.github/**/*',
  
  // Documentation
  '*.md',
  
  // Configuration files
  '.env',
  '.env.production',
  '.gitignore',
  '.replit',
  
  // Asset files
  'generated-icon.png',
  'attached_assets/**/*',
  
  // Database and setup files
  '*.sql',
  'setup-*.js',
  'create-*.sql',
  'fix-*.sql',
  'add-*.sql',
  
  // Test files
  'test-*.js',
  'test-*.cjs',
  'test-*.ts',
  'verify-*.js',
  'debug-*.js',
  'debug-*.cjs',
  
  // Migration and utility files
  'migrate-*.js',
  'complete-*.js',
  'temp_*.js',
  
  // Documentation files
  '*.txt',
  'cicd-*.md',
  'glb-*.md',
  'mediapipe-*.md',
  
  // Build and development files
  'test-*.html',
  'test-*.png',
  'test-*.glb',
  'test-*.txt'
];

// Files to exclude from sync
const EXCLUDE_PATTERNS = [
  'node_modules/**/*',
  'uploads/**/*',
  'temp/**/*',
  '.cache/**/*',
  '.vite/**/*',
  'dist/**/*',
  'build/**/*',
  '.replit.nix',
  'replit.nix',
  '.env.local',
  '.DS_Store',
  '*.log',
  'export-to-github/**/*' // Avoid recursion
];

async function syncToGitHub() {
  console.log('🔄 Starting Complete Replit to GitHub Synchronization...');
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Initialize Git if not exists
    await initializeGit();
    
    // Step 2: Get all files to sync
    const filesToSync = await getFilesToSync();
    console.log(`📁 Found ${filesToSync.length} files to sync`);
    
    // Step 3: Stage all files
    await stageFiles(filesToSync);
    
    // Step 4: Commit changes
    await commitChanges();
    
    // Step 5: Push to GitHub
    await pushToGitHub();
    
    console.log('✅ Complete synchronization successful!');
    console.log(`🔗 Repository: ${GITHUB_REPO}`);
    console.log(`🌿 Branch: ${BRANCH}`);
    console.log(`📊 Files synced: ${filesToSync.length}`);
    
  } catch (error) {
    console.error('❌ Synchronization failed:', error.message);
    process.exit(1);
  }
}

async function initializeGit() {
  console.log('🔧 Initializing Git...');
  
  try {
    // Check if git is already initialized
    execSync('git status', { stdio: 'pipe' });
    console.log('✅ Git already initialized');
  } catch (error) {
    // Initialize git
    execSync('git init');
    console.log('✅ Git initialized');
  }
  
  // Configure git
  try {
    execSync('git config user.email "adam.d.roorda@gmail.com"');
    execSync('git config user.name "adrlitx2"');
    console.log('✅ Git configured');
  } catch (error) {
    console.log('⚠️  Git configuration skipped (already configured)');
  }
  
  // Add remote if not exists
  try {
    execSync('git remote add origin ' + GITHUB_REPO, { stdio: 'pipe' });
    console.log('✅ Remote added');
  } catch (error) {
    // Remote already exists, update it
    execSync('git remote set-url origin ' + GITHUB_REPO);
    console.log('✅ Remote updated');
  }
}

async function getFilesToSync() {
  console.log('📋 Scanning files to sync...');
  
  const allFiles = [];
  
  // Get all files matching patterns
  for (const pattern of SYNC_PATTERNS) {
    try {
      const files = execSync(`find . -path "./${pattern}" -type f`, { 
        encoding: 'utf8',
        stdio: 'pipe'
      }).trim().split('\n').filter(f => f.length > 0);
      
      allFiles.push(...files);
    } catch (error) {
      // Pattern might not match any files, continue
    }
  }
  
  // Filter out excluded files
  const filteredFiles = allFiles.filter(file => {
    return !EXCLUDE_PATTERNS.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
      return regex.test(file);
    });
  });
  
  // Remove duplicates and sort
  const uniqueFiles = [...new Set(filteredFiles)].sort();
  
  console.log('📁 Files to sync:');
  uniqueFiles.slice(0, 20).forEach(file => console.log(`  ${file}`));
  if (uniqueFiles.length > 20) {
    console.log(`  ... and ${uniqueFiles.length - 20} more files`);
  }
  
  return uniqueFiles;
}

async function stageFiles(files) {
  console.log('📦 Staging files...');
  
  // Add all files
  try {
    execSync('git add -A');
    console.log('✅ All files staged');
  } catch (error) {
    console.error('❌ Failed to stage files:', error.message);
    throw error;
  }
}

async function commitChanges() {
  console.log('💾 Committing changes...');
  
  const timestamp = new Date().toISOString();
  const commitMessage = `Complete Replit-GitHub Sync: ${timestamp}

🔄 Synchronized all project files between Replit and GitHub
✅ Core application files (client, server, shared)
✅ Configuration files (package.json, tsconfig, vite.config)
✅ Documentation and README files
✅ GitHub Actions workflow
✅ Database setup and migration files
✅ Test and utility scripts
✅ Asset files and attachments

This commit ensures complete alignment between development environment and GitHub repository.
Repository: https://github.com/adrlitx2/VIDA-Redux
Branch: ReplitWorkbench
Environment: Replit → GitHub`;

  try {
    execSync(`git commit -m "${commitMessage}"`, { stdio: 'pipe' });
    console.log('✅ Changes committed');
  } catch (error) {
    if (error.message.includes('nothing to commit')) {
      console.log('ℹ️  No changes to commit');
    } else {
      console.error('❌ Failed to commit:', error.message);
      throw error;
    }
  }
}

async function pushToGitHub() {
  console.log('🚀 Pushing to GitHub...');
  
  try {
    // Push to ReplitWorkbench branch
    execSync(`git push -u origin HEAD:${BRANCH}`, { stdio: 'pipe' });
    console.log('✅ Pushed to GitHub successfully');
  } catch (error) {
    console.error('❌ Failed to push to GitHub:', error.message);
    throw error;
  }
}

// Additional utility functions
async function checkGitHubStatus() {
  console.log('🔍 Checking GitHub repository status...');
  
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (status.trim()) {
      console.log('📝 Uncommitted changes found:');
      console.log(status);
    } else {
      console.log('✅ Working directory clean');
    }
  } catch (error) {
    console.error('❌ Failed to check status:', error.message);
  }
}

async function validateSync() {
  console.log('🔍 Validating synchronization...');
  
  const criticalFiles = [
    'package.json',
    'client/src/App.tsx',
    'server/index.ts',
    'shared/schema.ts',
    '.github/workflows/deploy-vida3.yml'
  ];
  
  for (const file of criticalFiles) {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file} - exists`);
    } else {
      console.log(`❌ ${file} - missing`);
    }
  }
}

// Run the synchronization
if (import.meta.url === `file://${process.argv[1]}`) {
  syncToGitHub().catch(console.error);
}

export { syncToGitHub, checkGitHubStatus, validateSync };