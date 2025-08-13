# VIDA³ Developer Collaboration Setup Guide

## Overview
This guide provides complete setup instructions for additional developers joining the VIDA³ project. It covers database access, authentication, API keys, and development environment configuration.

## 1. Project Access & Repository Setup

### **Replit Project Access**
1. **Invite to Replit Project**: Share the Replit project with developer's email
2. **Project URL**: `https://replit.com/@your-username/vida3-project`
3. **Permissions**: Ensure "Edit" permissions are granted

### **GitHub Repository (if applicable)**
- Repository: [Add your GitHub repo URL]
- Branch: `main` or `development`
- Access: Add as collaborator with write permissions

## 2. Environment Variables & Secrets

The developer will need access to these critical environment variables:

### **Required Secrets**
```bash
# Database & Authentication
DATABASE_URL="postgresql://postgres.ewvbjadosmwgtntdmpog:KHy22jexD3UVmS2k@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
VITE_SUPABASE_URL="https://ewvbjadosmwgtntdmpog.supabase.co"
VITE_SUPABASE_ANON_KEY="[anon key]"

# API Keys
OPENAI_API_KEY="[openai key]"
XAI_API_KEY="[xai key]" 
HUGGINGFACE_API_KEY="[huggingface key]"
MESHY_API_KEY="[meshy key]"

# Storage & CDN
PINATA_API_KEY="[pinata key]"
PINATA_SECRET_API_KEY="[pinata secret]"

# Payment Processing
STRIPE_SECRET_KEY="[stripe key]"
VITE_STRIPE_PUBLIC_KEY="[stripe public key]"

# Additional Keys
GITHUB_TOKEN="[github token]"
```

### **How to Share Secrets Securely**
1. **Replit Secrets**: In Replit, go to "Secrets" tab and add developer as collaborator
2. **Environment File**: Share `.env` file through secure channel (encrypted message/file sharing)
3. **Individual Setup**: Developer can set up their own API keys where needed

## 3. Database Access Methods

### **A. Direct SQL Execution**
The developer can execute SQL directly using our execute_sql_tool:

```sql
-- Example: Check database connection
SELECT current_database(), current_user, version();

-- Example: Query users
SELECT id, email, plan, created_at FROM users LIMIT 5;

-- Example: Check avatar data
SELECT id, name, type, vertices, file_size FROM avatars 
WHERE user_id = '8b97c730-73bf-4073-82dc-b8ef84e26009';
```

### **B. Drizzle ORM Operations**
All database operations use Drizzle ORM with type safety:

```typescript
// Import database connection
import { db } from "./server/db";
import { users, avatars } from "./shared/schema";

// Query examples
const allUsers = await db.select().from(users);
const userAvatars = await db.select().from(avatars)
  .where(eq(avatars.userId, userId));
```

### **C. Schema Management**
```bash
# Apply schema changes to database
npm run db:push

# Generate migrations (if needed)
npm run db:generate

# Check schema status
npm run db:introspect
```

## 4. Supabase Dashboard Access

### **Supabase Project Details**
- **Project URL**: https://supabase.com/dashboard/project/ewvbjadosmwgtntdmpog
- **Database**: PostgreSQL 15.8 on AWS
- **Access Level**: Superuser (postgres role)

### **How to Grant Access**
1. **Supabase Dashboard**: Add developer's email as project member
2. **Database Connection**: Use the DATABASE_URL provided above
3. **Authentication**: Developer inherits authentication setup

### **Available Tools in Supabase**
- **SQL Editor**: Direct SQL query execution
- **Table Editor**: Visual table management
- **Auth Management**: User authentication controls
- **Storage**: File storage management
- **Edge Functions**: Serverless function deployment

## 5. Development Environment Setup

### **Prerequisites**
```bash
# Node.js version
node --version  # Should be v18+ or v20+

# Package manager
npm --version
```

### **Initial Setup**
```bash
# Clone/access project
git clone [repository-url] vida3-project
cd vida3-project

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Add all required secrets to .env file

# Start development server
npm run dev
```

### **Development Commands**
```bash
# Start application
npm run dev

# Database operations
npm run db:push          # Apply schema changes
npm run db:studio        # Open Drizzle Studio
npm run db:generate      # Generate migrations

# Build for production
npm run build
npm run start

# Type checking
npm run type-check

# Testing
npm run test
```

## 6. Project Architecture Overview

### **Key Directories**
```
├── client/              # React frontend
│   ├── src/pages/      # Page components
│   ├── src/components/ # Reusable components
│   └── src/services/   # Frontend services
├── server/             # Express.js backend
│   ├── routes/         # API routes
│   ├── services/       # Backend services
│   └── db.ts           # Database connection
├── shared/             # Shared types & schemas
│   └── schema.ts       # Drizzle database schema
├── temp/               # Temporary file storage
│   ├── avatars/        # Generated avatar files
│   └── 2d-to-3d/       # 2D to 3D conversion files
└── uploads/            # User uploads
```

### **Key Technologies**
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: Supabase (PostgreSQL) + Drizzle ORM
- **Authentication**: Supabase Auth
- **Storage**: IPFS (Pinata) + Local temp storage
- **3D Processing**: Three.js + MediaPipe + Meshy AI
- **Payments**: Stripe

## 7. Current Database Schema

### **Main Tables** (17 total)
- `users` - User accounts and profiles
- `avatars` - 3D avatar models and metadata
- `subscription_plans` - Available subscription tiers
- `user_subscriptions` - Active user subscriptions
- `stream_backgrounds` - Virtual backgrounds
- `streaming_sessions` - Live streaming data
- `rtmp_sources` - RTMP streaming configurations
- `preset_avatars` - Platform-provided avatars
- `dmca_complaints` - Content moderation
- `user_suspensions` - Account suspensions
- `sessions` - Authentication sessions
- And more...

### **Subscription Tiers**
1. **Free**: 15 min/week, 1 avatar, basic features
2. **Reply Guy**: Enhanced limits and features
3. **Spartan**: Advanced streaming capabilities
4. **Zeus**: Premium features with high limits
5. **Goat**: Ultimate tier with maximum capabilities

## 8. Development Workflow

### **Making Changes**
1. **Database Changes**: Update `shared/schema.ts` → Run `npm run db:push`
2. **API Changes**: Modify `server/routes/` files
3. **Frontend Changes**: Update `client/src/` components
4. **Testing**: Use development server and test endpoints

### **Common Development Tasks**

#### **Add New Database Table**
```typescript
// 1. Add to shared/schema.ts
export const newTable = pgTable("new_table", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 2. Apply to database
npm run db:push
```

#### **Create New API Endpoint**
```typescript
// server/routes/new-feature.ts
app.get('/api/new-feature', async (req, res) => {
  // Implementation
});
```

#### **Add Frontend Component**
```typescript
// client/src/components/NewComponent.tsx
export function NewComponent() {
  // React component
}
```

## 9. Current System Status

### **Active Features**
- ✅ 2D to 3D avatar conversion (Meshy AI)
- ✅ Enhanced pipeline with multi-image processing
- ✅ Real-time streaming with avatar overlay
- ✅ Subscription management (Stripe)
- ✅ User authentication (Supabase)
- ✅ Avatar rigging and animation
- ✅ MediaPipe face tracking
- ✅ IPFS storage integration

### **Recent Developments**
- Enhanced 2D-to-3D pipeline integration completed
- Comprehensive database schema documentation
- Streamlined user workflow (upload once, process multiple ways)
- Professional avatar positioning and scaling

### **Known Issues & Considerations**
- Currently using temporary file storage (19 avatar files in temp/)
- Avatar data primarily stored locally, not in Supabase tables yet
- Authentication bypass enabled for avatar endpoints during development

## 10. Security & Best Practices

### **Environment Security**
- Never commit API keys to repository
- Use Replit Secrets for sensitive data
- Rotate API keys periodically

### **Database Security**
- Use Drizzle ORM for type safety
- Validate all inputs with Zod schemas
- Use parameterized queries (handled by Drizzle)

### **Code Quality**
- Follow TypeScript strict mode
- Use ESLint and Prettier
- Write type-safe database queries
- Test API endpoints thoroughly

## 11. Troubleshooting

### **Common Issues**
1. **Database Connection**: Check DATABASE_URL format and credentials
2. **API Keys**: Verify all required keys are set in environment
3. **Build Errors**: Run `npm install` and check Node.js version
4. **Type Errors**: Run `npm run type-check` to identify issues

### **Getting Help**
1. Check console logs for error details
2. Review `SUPABASE_DATABASE_SCHEMA.md` for database structure
3. Use Supabase dashboard for direct database inspection
4. Test API endpoints using browser developer tools

## 12. Next Steps for New Developer

1. **Immediate Setup**:
   - Get Replit project access
   - Set up environment variables
   - Run `npm run dev` to verify setup

2. **Familiarization**:
   - Review database schema documentation
   - Explore existing API endpoints
   - Test avatar creation and streaming features

3. **Development Ready**:
   - Make test database queries
   - Create a simple API endpoint
   - Verify frontend-backend connectivity

This setup guide provides everything needed for seamless collaboration on the VIDA³ project. The new developer will have full access to database operations, API development, and frontend modifications.