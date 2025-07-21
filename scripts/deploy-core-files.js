#!/usr/bin/env node

/**
 * Core Files GitHub Deployment Script for VIDA³
 * Deploys only the most essential files first to ensure working deployment
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

// Core files that must be deployed first
const CORE_FILES = [
  'package.json',
  'package-lock.json',
  'vite.config.ts',
  'tsconfig.json',
  'tailwind.config.ts',
  'postcss.config.js',
  'drizzle.config.ts',
  'components.json',
  'shared/schema.ts',
  'server/index.ts',
  'server/db.ts',
  'server/storage.ts',
  'server/routes.ts',
  'server/services/meshy-ai-service.ts',
  'server/services/image-character-analyzer.ts',
  'client/src/App.tsx',
  'client/src/main.tsx',
  'client/index.html',
  'replit.md',
  'AUTOMATED_DEPLOYMENT_GUIDE.md'
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
 * Deploy core files
 */
async function deployCoreFiles() {
  const exportDir = path.join(__dirname, '..', 'export-to-github');
  
  if (!fs.existsSync(exportDir)) {
    console.error('❌ Export directory not found');
    process.exit(1);
  }

  console.log('🚀 Deploying core VIDA³ files to GitHub...');
  console.log(`📁 Source: ${exportDir}`);
  console.log(`🌿 Branch: ${BRANCH_NAME}`);
  console.log('');

  // Get commit message
  const commitMessage = fs.readFileSync(path.join(exportDir, 'COMMIT_MESSAGE.txt'), 'utf8').trim();
  
  console.log(`📦 Deploying ${CORE_FILES.length} core files`);
  console.log('');

  let deployed = 0;
  let errors = 0;

  for (const file of CORE_FILES) {
    try {
      const filePath = path.join(exportDir, file);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  ${file} - File not found, skipping`);
        continue;
      }
      
      const content = getFileBase64(filePath);
      
      process.stdout.write(`📄 ${file}... `);
      
      await updateFile(file, content, commitMessage);
      
      console.log('✅');
      deployed++;
      
      // Delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.log(`❌ ${error.message}`);
      errors++;
    }
  }

  console.log('');
  console.log('🎉 Core Files Deployment Summary:');
  console.log(`✅ Successfully deployed: ${deployed} files`);
  console.log(`❌ Errors: ${errors} files`);
  console.log(`🌿 Branch: ${BRANCH_NAME}`);
  console.log('');
  console.log(`🔗 View repository: https://github.com/${GITHUB_REPO}/tree/${BRANCH_NAME}`);
  console.log(`🚀 GitHub Actions: https://github.com/${GITHUB_REPO}/actions`);
}

/**
 * Main deployment function
 */
async function main() {
  try {
    await deployCoreFiles();
    console.log('🎉 Core files deployment completed successfully!');
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}