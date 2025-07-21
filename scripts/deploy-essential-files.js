#!/usr/bin/env node

/**
 * Essential Files GitHub Deployment Script for VIDA³
 * Deploys only the core application files, excluding cache and temp files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const GITHUB_REPO = 'adrlitx2/VIDA-Redux';
const BRANCH_NAME = 'ReplitWorkbench';
const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Essential files/directories to deploy
const ESSENTIAL_PATTERNS = [
  '.github/',
  'client/',
  'server/',
  'shared/',
  'scripts/',
  'package.json',
  'package-lock.json',
  'vite.config.ts',
  'tsconfig.json',
  'tailwind.config.ts',
  'postcss.config.js',
  'drizzle.config.ts',
  'components.json',
  'replit.md',
  'COMMIT_SUMMARY.md',
  'AUTOMATED_DEPLOYMENT_GUIDE.md',
  'COMMIT_MESSAGE.txt',
  'EXPORT_README.md'
];

// Files to exclude
const EXCLUDE_PATTERNS = [
  '.local/',
  'temp/',
  'uploads/',
  'node_modules/',
  '.git/',
  '.replit',
  '.env'
];

if (!GITHUB_TOKEN) {
  console.error('❌ GITHUB_TOKEN environment variable is required');
  process.exit(1);
}

/**
 * Make authenticated GitHub API request
 */
async function githubRequest(endpoint, options = {}) {
  const url = `${GITHUB_API_BASE}${endpoint}`;
  const headers = {
    'Authorization': `token ${GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'VIDA3-Deploy-Script',
    ...options.headers
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`GitHub API Error: ${response.status} - ${error.message}`);
  }

  return await response.json();
}

/**
 * Check if file should be included
 */
function shouldIncludeFile(filePath, exportDir) {
  const relativePath = path.relative(exportDir, filePath);
  
  // Check exclude patterns
  for (const pattern of EXCLUDE_PATTERNS) {
    if (relativePath.startsWith(pattern)) {
      return false;
    }
  }
  
  // Check include patterns
  for (const pattern of ESSENTIAL_PATTERNS) {
    if (relativePath.startsWith(pattern) || relativePath === pattern) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get file content as base64
 */
function getFileBase64(filePath) {
  const content = fs.readFileSync(filePath);
  return Buffer.from(content).toString('base64');
}

/**
 * Create or update file in GitHub repository
 */
async function updateFile(filePath, content, message) {
  try {
    const existingFile = await githubRequest(`/repos/${GITHUB_REPO}/contents/${filePath}?ref=${BRANCH_NAME}`);
    
    await githubRequest(`/repos/${GITHUB_REPO}/contents/${filePath}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message,
        content,
        sha: existingFile.sha,
        branch: BRANCH_NAME
      })
    });
  } catch (error) {
    if (error.message.includes('404')) {
      await githubRequest(`/repos/${GITHUB_REPO}/contents/${filePath}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message,
          content,
          branch: BRANCH_NAME
        })
      });
    } else {
      throw error;
    }
  }
}

/**
 * Deploy essential files
 */
async function deployEssentialFiles() {
  const exportDir = path.join(__dirname, '..', 'export-to-github');
  
  if (!fs.existsSync(exportDir)) {
    console.error('❌ Export directory not found');
    process.exit(1);
  }

  console.log('🚀 Deploying essential VIDA³ files to GitHub...');
  console.log(`📁 Source: ${exportDir}`);
  console.log(`🌿 Branch: ${BRANCH_NAME}`);
  console.log('');

  // Ensure branch exists
  try {
    await githubRequest(`/repos/${GITHUB_REPO}/git/refs/heads/${BRANCH_NAME}`);
    console.log(`✅ Branch ${BRANCH_NAME} exists`);
  } catch (error) {
    if (error.message.includes('404')) {
      console.log(`🌿 Creating branch ${BRANCH_NAME}...`);
      
      const mainRef = await githubRequest(`/repos/${GITHUB_REPO}/git/refs/heads/main`);
      
      await githubRequest(`/repos/${GITHUB_REPO}/git/refs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ref: `refs/heads/${BRANCH_NAME}`,
          sha: mainRef.object.sha
        })
      });
      
      console.log(`✅ Branch ${BRANCH_NAME} created`);
    } else {
      throw error;
    }
  }

  // Get essential files
  const allFiles = getAllFiles(exportDir);
  const essentialFiles = allFiles.filter(file => shouldIncludeFile(file, exportDir));
  
  console.log(`📦 Found ${essentialFiles.length} essential files to deploy`);
  console.log('');

  const commitMessage = fs.readFileSync(path.join(exportDir, 'COMMIT_MESSAGE.txt'), 'utf8').trim();
  let deployed = 0;
  let errors = 0;

  for (const file of essentialFiles) {
    try {
      const relativePath = path.relative(exportDir, file);
      const content = getFileBase64(file);
      
      process.stdout.write(`📄 ${relativePath}... `);
      
      await updateFile(relativePath, content, commitMessage);
      
      console.log('✅');
      deployed++;
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 150));
      
    } catch (error) {
      console.log(`❌ ${error.message}`);
      errors++;
    }
  }

  console.log('');
  console.log('🎉 Essential Files Deployment Summary:');
  console.log(`✅ Successfully deployed: ${deployed} files`);
  console.log(`❌ Errors: ${errors} files`);
  console.log(`🌿 Branch: ${BRANCH_NAME}`);
  console.log('');
  console.log(`🔗 View repository: https://github.com/${GITHUB_REPO}/tree/${BRANCH_NAME}`);
  console.log(`🚀 GitHub Actions: https://github.com/${GITHUB_REPO}/actions`);
  console.log(`📋 Next: Configure GitHub Secrets for your environment variables`);
}

/**
 * Get all files recursively
 */
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

/**
 * Main deployment function
 */
async function main() {
  try {
    await deployEssentialFiles();
    console.log('🎉 GitHub deployment completed successfully!');
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}