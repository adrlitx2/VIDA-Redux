#!/usr/bin/env node

/**
 * Automated GitHub Deployment Script for VIDA³
 * This script automatically deploys the export to GitHub using the GitHub API
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

// Get GitHub token from environment
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

if (!GITHUB_TOKEN) {
  console.error('❌ GITHUB_TOKEN environment variable is required');
  console.log('');
  console.log('Please set your GitHub token:');
  console.log('export GITHUB_TOKEN=your_github_token_here');
  console.log('');
  console.log('Or run with: GITHUB_TOKEN=your_token node scripts/deploy-to-github.js');
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
    // Try to get existing file
    const existingFile = await githubRequest(`/repos/${GITHUB_REPO}/contents/${filePath}?ref=${BRANCH_NAME}`);
    
    // Update existing file
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
      // Create new file
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
 * Deploy all files from export directory
 */
async function deployFiles() {
  const exportDir = path.join(__dirname, '..', 'export-to-github');
  
  if (!fs.existsSync(exportDir)) {
    console.error('❌ Export directory not found. Please run sync script first.');
    process.exit(1);
  }

  console.log('🚀 Starting GitHub deployment...');
  console.log(`📁 Deploying from: ${exportDir}`);
  console.log(`🌿 Target branch: ${BRANCH_NAME}`);
  console.log('');

  // Create branch if it doesn't exist
  try {
    await githubRequest(`/repos/${GITHUB_REPO}/git/refs/heads/${BRANCH_NAME}`);
    console.log(`✅ Branch ${BRANCH_NAME} exists`);
  } catch (error) {
    if (error.message.includes('404')) {
      console.log(`🌿 Creating branch ${BRANCH_NAME}...`);
      
      // Get main branch reference
      const mainRef = await githubRequest(`/repos/${GITHUB_REPO}/git/refs/heads/main`);
      
      // Create new branch
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

  // Get all files to deploy
  const files = getAllFiles(exportDir);
  const commitMessage = fs.readFileSync(path.join(exportDir, 'COMMIT_MESSAGE.txt'), 'utf8').trim();

  console.log(`📦 Found ${files.length} files to deploy`);
  console.log('');

  let deployed = 0;
  let errors = 0;

  for (const file of files) {
    try {
      const relativePath = path.relative(exportDir, file);
      const content = getFileBase64(file);
      
      process.stdout.write(`📄 ${relativePath}... `);
      
      await updateFile(relativePath, content, commitMessage);
      
      console.log('✅');
      deployed++;
      
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      errors++;
    }
  }

  console.log('');
  console.log('🎉 Deployment Summary:');
  console.log(`✅ Successfully deployed: ${deployed} files`);
  console.log(`❌ Errors: ${errors} files`);
  console.log(`🌿 Branch: ${BRANCH_NAME}`);
  console.log(`📝 Commit: ${commitMessage.split('\n')[0]}`);
  console.log('');
  console.log(`🔗 View at: https://github.com/${GITHUB_REPO}/tree/${BRANCH_NAME}`);
  console.log(`🚀 GitHub Actions: https://github.com/${GITHUB_REPO}/actions`);
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
    await deployFiles();
    console.log('🎉 GitHub deployment completed successfully!');
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main, deployFiles };