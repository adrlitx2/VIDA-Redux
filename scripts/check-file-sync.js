/**
 * File Synchronization Checker
 * Verifies all critical files exist and generates sync report
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Critical files that must be synced
const CRITICAL_FILES = [
  // Core configuration
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'vite.config.ts',
  'tailwind.config.ts',
  'postcss.config.js',
  'components.json',
  'drizzle.config.ts',
  'replit.md',
  
  // Application source
  'client/index.html',
  'client/src/App.tsx',
  'client/src/main.tsx',
  'server/index.ts',
  'server/routes.ts',
  'server/vite.ts',
  'shared/schema.ts',
  
  // GitHub Actions
  '.github/workflows/deploy-vida3.yml',
  
  // Key services
  'server/services/meshy-ai-service.ts',
  'server/services/image-character-analyzer.ts',
  'server/services/enhanced-ai-tracking.ts',
  
  // Documentation
  'GITHUB_SECRETS_SETUP.md',
  'AUTOMATED_DEPLOYMENT_GUIDE.md',
  'RTMP_DEPLOYMENT_GUIDE.md'
];

// Generate sync report
async function checkFileSync() {
  console.log('🔍 Checking File Synchronization Status...');
  console.log('=' .repeat(50));
  
  const report = {
    existing: [],
    missing: [],
    totalSize: 0,
    fileCount: 0
  };
  
  for (const file of CRITICAL_FILES) {
    if (fs.existsSync(file)) {
      const stats = fs.statSync(file);
      report.existing.push({
        path: file,
        size: stats.size,
        modified: stats.mtime
      });
      report.totalSize += stats.size;
      report.fileCount++;
      console.log(`✅ ${file} (${formatBytes(stats.size)})`);
    } else {
      report.missing.push(file);
      console.log(`❌ ${file} - MISSING`);
    }
  }
  
  console.log('\n📊 Sync Report:');
  console.log(`✅ Existing files: ${report.existing.length}`);
  console.log(`❌ Missing files: ${report.missing.length}`);
  console.log(`📁 Total size: ${formatBytes(report.totalSize)}`);
  
  if (report.missing.length > 0) {
    console.log('\n⚠️  Missing files need to be created or synced:');
    report.missing.forEach(file => console.log(`  - ${file}`));
  }
  
  return report;
}

// Get all project files for manual sync
async function generateSyncList() {
  console.log('\n📋 Generating Complete File List for Manual Sync...');
  
  const syncFiles = [];
  
  // Get all relevant files
  const patterns = [
    'client/**/*.{ts,tsx,js,jsx,css,html,json}',
    'server/**/*.{ts,tsx,js,jsx}',
    'shared/**/*.{ts,tsx,js,jsx}',
    'scripts/**/*.{ts,tsx,js,jsx}',
    '.github/**/*.yml',
    '*.{json,ts,js,md,config.ts,config.js}',
    '*.sql',
    'setup-*.js',
    'test-*.{js,ts,cjs}'
  ];
  
  for (const pattern of patterns) {
    try {
      const files = execSync(`find . -path "./${pattern}" -type f`, { 
        encoding: 'utf8',
        stdio: 'pipe'
      }).trim().split('\n').filter(f => f.length > 0);
      
      syncFiles.push(...files);
    } catch (error) {
      // Pattern might not match, continue
    }
  }
  
  // Filter out excluded files
  const filtered = syncFiles.filter(file => 
    !file.includes('node_modules') && 
    !file.includes('.cache') && 
    !file.includes('temp/') &&
    !file.includes('uploads/') &&
    !file.includes('export-to-github/')
  );
  
  const unique = [...new Set(filtered)].sort();
  
  console.log(`📁 Found ${unique.length} files to sync`);
  
  // Write to file for easy reference
  const syncList = unique.join('\n');
  fs.writeFileSync('sync-file-list.txt', syncList);
  console.log('📄 Complete file list saved to: sync-file-list.txt');
  
  return unique;
}

// Manual sync instructions
function generateSyncInstructions() {
  console.log('\n📝 Manual Sync Instructions:');
  console.log('=' .repeat(40));
  console.log('1. Download all files from this Replit environment');
  console.log('2. Go to your GitHub repository: https://github.com/adrlitx2/VIDA-Redux');
  console.log('3. Switch to ReplitWorkbench branch');
  console.log('4. Upload/update all files in the same directory structure');
  console.log('5. Commit with message: "Complete Replit-GitHub sync"');
  console.log('6. GitHub Actions will automatically deploy');
  console.log('\n🔑 Ensure these secrets are configured in GitHub:');
  console.log('- DATABASE_URL');
  console.log('- HUGGINGFACE_API_KEY');
  console.log('- MESHY_API_KEY');
  console.log('- OPENAI_API_KEY');
  console.log('- VITE_SUPABASE_URL');
  console.log('- VITE_SUPABASE_ANON_KEY');
  console.log('- PINATA_API_KEY');
  console.log('- PINATA_SECRET_API_KEY');
}

// Utility functions
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Main execution
async function main() {
  try {
    await checkFileSync();
    await generateSyncList();
    generateSyncInstructions();
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Review sync-file-list.txt for complete file list');
    console.log('2. Manually sync files to GitHub repository');
    console.log('3. Ensure all GitHub secrets are configured');
    console.log('4. GitHub Actions will handle deployment');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { checkFileSync, generateSyncList, generateSyncInstructions };