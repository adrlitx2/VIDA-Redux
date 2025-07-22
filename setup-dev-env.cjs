/**
 * VIDA³ Development Environment Setup Script
 * This script helps set up the development environment for local testing
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up VIDA³ Development Environment...\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const envExists = fs.existsSync(envPath);

if (envExists) {
  console.log('✅ .env file already exists');
} else {
  console.log('📝 Creating .env file for development...');
  
  const envContent = `# VIDA³ Development Environment Variables

# Supabase Configuration (Required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/vida_db

# Session Configuration
SESSION_SECRET=vida-streaming-secret-key-for-development

# API Keys (Optional for basic streaming)
HUGGINGFACE_API_KEY=
OPENAI_API_KEY=
MESHY_API_KEY=
XAI_API_KEY=

# IPFS Configuration (Optional)
PINATA_API_KEY=
PINATA_SECRET_KEY=
PINATA_NEW_API_KEY=
PINATA_NEW_SECRET_KEY=

# Stripe Configuration (Optional)
STRIPE_SECRET_KEY=

# Application Configuration
APP_URL=http://localhost:5000
NODE_ENV=development

# Streaming Configuration
STREAMING_ENABLED=true
MAX_CONCURRENT_STREAMS=10
STREAM_TIMEOUT=300000
`;

  try {
    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env file created successfully');
  } catch (error) {
    console.error('❌ Failed to create .env file:', error.message);
  }
}

console.log('\n📋 Required Environment Variables:');
console.log('=====================================');
console.log('1. SUPABASE_URL - Your Supabase project URL');
console.log('2. SUPABASE_SERVICE_ROLE_KEY - Your Supabase service role key');
console.log('3. VITE_SUPABASE_URL - Same as SUPABASE_URL');
console.log('4. VITE_SUPABASE_ANON_KEY - Your Supabase anon key');
console.log('5. DATABASE_URL - PostgreSQL connection string');
console.log('6. SESSION_SECRET - Random string for session encryption');

console.log('\n🚀 Next Steps:');
console.log('1. Edit the .env file with your actual values');
console.log('2. Run: npm run dev:win (Windows) or npm run dev (Unix)');
console.log('3. Test the streaming functionality');

console.log('\n⚠️  Note: For basic streaming testing, you can use dummy values for:');
console.log('   - SUPABASE_URL: https://dummy.supabase.co');
console.log('   - SUPABASE_SERVICE_ROLE_KEY: dummy-key');
console.log('   - DATABASE_URL: postgresql://dummy:dummy@localhost:5432/dummy');

console.log('\n🎯 For full functionality, you\'ll need:');
console.log('   - A Supabase project (free tier works)');
console.log('   - PostgreSQL database (local or cloud)');
console.log('   - Optional: API keys for AI services');

console.log('\n✅ Setup complete! Edit .env and start developing!'); 