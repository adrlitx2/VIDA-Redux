# 🚀 Automated GitHub Deployment for VIDA³

This guide explains how to use the automated deployment script to deploy your VIDA³ project to GitHub with minimal manual steps.

## Quick Start

### Option 1: Use Your GitHub Token (Recommended)

1. **Get your GitHub Token:**
   - Go to https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Give it a name like "VIDA3-Deploy"
   - Select scopes: `repo` (full control of private repositories)
   - Click "Generate token"
   - Copy the token (starts with `ghp_`)

2. **Run the automated deployment:**
   ```bash
   GITHUB_TOKEN=your_github_token_here node scripts/deploy-to-github.js
   ```

### Option 2: Set Environment Variable

1. **Set the token as environment variable:**
   ```bash
   export GITHUB_TOKEN=your_github_token_here
   ```

2. **Run the deployment script:**
   ```bash
   node scripts/deploy-to-github.js
   ```

## What the Script Does

### ✅ Automated Steps:
1. **Creates ReplitWorkbench branch** (if it doesn't exist)
2. **Uploads all 2,329 files** from export directory to GitHub
3. **Uses the professional commit message** we generated
4. **Triggers GitHub Actions CI/CD pipeline** automatically
5. **Provides deployment status and links**

### 📊 Expected Output:
```
🚀 Starting GitHub deployment...
📁 Deploying from: /workspace/export-to-github
🌿 Target branch: ReplitWorkbench

✅ Branch ReplitWorkbench exists
📦 Found 2329 files to deploy

📄 package.json... ✅
📄 client/src/App.tsx... ✅
📄 server/services/meshy-ai-service.ts... ✅
... [continues for all files]

🎉 Deployment Summary:
✅ Successfully deployed: 2329 files
❌ Errors: 0 files
🌿 Branch: ReplitWorkbench
📝 Commit: feat: Multi-Image AI Pipeline Integration

🔗 View at: https://github.com/adrlitx2/VIDA-Redux/tree/ReplitWorkbench
🚀 GitHub Actions: https://github.com/adrlitx2/VIDA-Redux/actions
```

## GitHub Secrets Configuration

After deployment, you'll need to configure these secrets in your GitHub repository:

### Required Secrets:
- `DATABASE_URL` - Your Supabase connection string
- `HUGGINGFACE_API_KEY` - For AI services
- `MESHY_API_KEY` - For 3D model generation
- `OPENAI_API_KEY` - For advanced AI features
- `VITE_SUPABASE_URL` - Your Supabase URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

### How to Add Secrets:
1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret with its value

## CI/CD Pipeline

The deployment automatically triggers a GitHub Actions workflow that:

1. **Installs dependencies** (npm install)
2. **Runs TypeScript checks** (tsc --noEmit)
3. **Builds the application** (npm run build)
4. **Runs tests** (if configured)
5. **Deploys to staging** (ReplitWorkbench branch)
6. **Deploys to production** (when merged to main)

## Troubleshooting

### Common Issues:

1. **"GITHUB_TOKEN is required"**
   - Solution: Set your GitHub token as shown above

2. **"Rate limit exceeded"**
   - Solution: The script includes delays, but you can wait and retry

3. **"Permission denied"**
   - Solution: Ensure your GitHub token has `repo` scope

4. **"Branch already exists"**
   - Solution: This is normal, the script will update existing files

## Next Steps After Deployment

1. **Monitor GitHub Actions**: Check the workflow status
2. **Configure secrets**: Add your environment variables
3. **Test deployment**: Visit your deployed app
4. **Merge to main**: When ready for production

## Features Deployed

Your automated deployment includes:

- ✅ **Complete Multi-Image AI Pipeline** (CLIP + MediaPipe + Stable Diffusion + Meshy AI)
- ✅ **Advanced 3D Avatar Generation** with 85% anatomy confidence
- ✅ **Professional CI/CD Pipeline** with automated testing
- ✅ **Production-Ready Infrastructure** with comprehensive error handling
- ✅ **Comprehensive Test Suite** for AI pipeline validation

## Support

If you encounter any issues:
1. Check the GitHub Actions logs
2. Verify your GitHub token has correct permissions
3. Ensure all required secrets are configured
4. Review the deployment output for specific errors

Your VIDA³ platform is now ready for professional deployment! 🎉