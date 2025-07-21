# 🔐 GitHub Secrets Configuration for VIDA³

## Quick Setup Instructions

Go to your GitHub repository: https://github.com/adrlitx2/VIDA-Redux

1. Click **Settings** (top menu)
2. Click **Secrets and variables** → **Actions** (left sidebar)
3. Click **New repository secret**
4. Add each secret below with its corresponding value

## Required Secrets

### Core Database & Authentication
```
Name: DATABASE_URL
Value: [Your Supabase PostgreSQL connection string]
```

```
Name: VITE_SUPABASE_URL
Value: [Your Supabase project URL]
```

```
Name: VITE_SUPABASE_ANON_KEY
Value: [Your Supabase anonymous key]
```

### AI Services
```
Name: HUGGINGFACE_API_KEY
Value: [Your Hugging Face API key for AI services]
```

```
Name: MESHY_API_KEY
Value: [Your Meshy AI API key for 3D model generation]
```

```
Name: OPENAI_API_KEY
Value: [Your OpenAI API key for advanced AI features]
```

### Payment Processing
```
Name: STRIPE_SECRET_KEY
Value: [Your Stripe secret key for payment processing]
```

```
Name: VITE_STRIPE_PUBLIC_KEY
Value: [Your Stripe publishable key]
```

### File Storage
```
Name: PINATA_API_KEY
Value: [Your Pinata API key for IPFS storage]
```

```
Name: PINATA_SECRET_API_KEY
Value: [Your Pinata secret key for IPFS storage]
```

## How to Add Each Secret

1. **Click "New repository secret"**
2. **Enter the Name** (exactly as shown above)
3. **Enter the Value** (copy from your current environment)
4. **Click "Add secret"**
5. **Repeat for all 10 secrets**

## Verification

Once all secrets are added, you should see:
- ✅ 10 secrets configured
- ✅ GitHub Actions can now access your environment variables
- ✅ Automated deployment will work

## Next Steps

After adding all secrets:
1. **GitHub Actions will automatically trigger** when you push to the ReplitWorkbench branch
2. **Your app will be built and deployed** using the configured secrets
3. **Monitor the deployment** at: https://github.com/adrlitx2/VIDA-Redux/actions

## Important Notes

- **Never share these secret values** - they provide access to your services
- **Keep them secure** - only add them to your GitHub repository secrets
- **Update them if needed** - you can edit secrets anytime in GitHub settings
- **All secrets are required** - missing any will cause deployment failures

Your VIDA³ platform will be fully operational once these secrets are configured! 🚀