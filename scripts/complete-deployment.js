#!/usr/bin/env node

/**
 * Complete GitHub Deployment for VIDA³
 * Finishes uploading remaining client files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GITHUB_REPO = 'adrlitx2/VIDA-Redux';
const BRANCH_NAME = 'ReplitWorkbench';
const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Remaining important client files
const CLIENT_FILES = [
  'client/src/main.tsx',
  'client/index.html',
  'client/src/pages/Home.tsx',
  'client/src/pages/StreamingRoom.tsx',
  'client/src/components/Navbar.tsx',
  'client/src/components/AvatarCreator.tsx',
  'client/src/components/AvatarPreviewModal.tsx',
  'client/src/lib/supabase.ts',
  'client/src/lib/queryClient.ts',
  'client/src/hooks/useAuth.ts',
  'client/src/hooks/use-toast.ts',
  'client/src/components/ui/button.tsx',
  'client/src/components/ui/card.tsx',
  'client/src/components/ui/input.tsx',
  'client/src/components/ui/toast.tsx',
  'client/src/index.css'
];

async function githubRequest(endpoint, options = {}) {
  const url = `${GITHUB_API_BASE}${endpoint}`;
  const headers = {
    'Authorization': `token ${GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'VIDA3-Deploy-Script',
    ...options.headers
  };

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`GitHub API Error: ${response.status} - ${error.message}`);
  }
  return await response.json();
}

async function updateFile(filePath, content, message) {
  try {
    const existingFile = await githubRequest(`/repos/${GITHUB_REPO}/contents/${filePath}?ref=${BRANCH_NAME}`);
    await githubRequest(`/repos/${GITHUB_REPO}/contents/${filePath}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message, content, sha: existingFile.sha, branch: BRANCH_NAME
      })
    });
  } catch (error) {
    if (error.message.includes('404')) {
      await githubRequest(`/repos/${GITHUB_REPO}/contents/${filePath}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, content, branch: BRANCH_NAME })
      });
    } else {
      throw error;
    }
  }
}

async function main() {
  const exportDir = path.join(__dirname, '..', 'export-to-github');
  const commitMessage = fs.readFileSync(path.join(exportDir, 'COMMIT_MESSAGE.txt'), 'utf8').trim();
  
  console.log('🚀 Completing GitHub deployment...');
  console.log(`📦 Deploying ${CLIENT_FILES.length} client files`);
  
  let deployed = 0;
  
  for (const file of CLIENT_FILES) {
    try {
      const filePath = path.join(exportDir, file);
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  ${file} - Not found, skipping`);
        continue;
      }
      
      const content = Buffer.from(fs.readFileSync(filePath)).toString('base64');
      process.stdout.write(`📄 ${file}... `);
      
      await updateFile(file, content, commitMessage);
      console.log('✅');
      deployed++;
      
      await new Promise(resolve => setTimeout(resolve, 250));
    } catch (error) {
      console.log(`❌ ${error.message}`);
    }
  }
  
  console.log(`\n🎉 Deployment complete! ${deployed} files uploaded`);
  console.log('🔗 https://github.com/adrlitx2/VIDA-Redux/tree/ReplitWorkbench');
}

main().catch(console.error);
