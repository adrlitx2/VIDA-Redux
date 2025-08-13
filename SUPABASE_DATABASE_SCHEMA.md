# VIDA³ Supabase Database Schema Documentation

## Overview
This document provides comprehensive documentation for all database tables used in the VIDA³ avatar streaming platform. The platform uses Supabase (PostgreSQL) for data persistence with Drizzle ORM for type-safe database operations.

## Table of Contents
1. [Authentication & Session Management](#authentication--session-management)
2. [User Management](#user-management)
3. [Subscription & Billing](#subscription--billing)
4. [Avatar Management](#avatar-management)
5. [Streaming Infrastructure](#streaming-infrastructure)
6. [Content Management](#content-management)
7. [System Administration](#system-administration)
8. [Compliance & Moderation](#compliance--moderation)

---

## Authentication & Session Management

### `sessions` table
**Purpose**: Stores user session data for Replit authentication
```sql
CREATE TABLE sessions (
  sid VARCHAR PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP NOT NULL
);
CREATE INDEX IDX_session_expire ON sessions(expire);
```

**Key Fields**:
- `sid`: Session identifier (Primary Key)
- `sess`: Session data in JSON format
- `expire`: Session expiration timestamp

---

## User Management

### `users` table
**Purpose**: Core user account information with platform-specific metadata
```sql
CREATE TABLE users (
  id VARCHAR PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT,
  email TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  twitter_handle TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  blocked BOOLEAN DEFAULT FALSE NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE NOT NULL,
  twitter_token TEXT,
  twitter_token_secret TEXT,
  google_id TEXT,
  twitter_id TEXT,
  plan TEXT DEFAULT 'free' NOT NULL,
  stream_time_remaining INTEGER DEFAULT 900 NOT NULL,
  
  -- Platform-specific analytics
  total_stream_time INTEGER DEFAULT 0 NOT NULL,
  total_stream_sessions INTEGER DEFAULT 0 NOT NULL,
  avatars_created INTEGER DEFAULT 0 NOT NULL,
  last_stream_at TIMESTAMP,
  last_avatar_created_at TIMESTAMP,
  subscription_start_date TIMESTAMP,
  subscription_end_date TIMESTAMP,
  
  -- Subscription management
  subscription_plan_id TEXT DEFAULT 'free' NOT NULL,
  subscription_status TEXT DEFAULT 'active' NOT NULL,
  avatar_count INTEGER DEFAULT 0 NOT NULL
);
```

**Key Features**:
- Supports multiple OAuth providers (Twitter, Google, Replit)
- Tracks streaming usage and avatar creation metrics
- Integrated with Stripe for billing
- Role-based access control
- Subscription status tracking

---

## Subscription & Billing

### `subscription_plans` table
**Purpose**: Defines available subscription tiers with feature limits
```sql
CREATE TABLE subscription_plans (
  id TEXT PRIMARY KEY, -- free, reply_guy, spartan, zeus, goat
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  billing_interval TEXT DEFAULT 'month',
  stream_minutes_per_week INTEGER DEFAULT 0,
  avatar_max_count INTEGER DEFAULT 1,
  max_concurrent_streams INTEGER DEFAULT 1,
  max_resolution TEXT DEFAULT '720p',
  marketplace_access BOOLEAN DEFAULT FALSE,
  custom_avatars BOOLEAN DEFAULT FALSE,
  priority_support BOOLEAN DEFAULT FALSE,
  white_label BOOLEAN DEFAULT FALSE,
  api_access BOOLEAN DEFAULT FALSE,
  is_popular BOOLEAN DEFAULT FALSE,
  is_free BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  x_spaces_hosting BOOLEAN DEFAULT FALSE,
  rigging_studio_access BOOLEAN DEFAULT FALSE,
  max_morph_points INTEGER DEFAULT 0,
  buddy_invite_access BOOLEAN DEFAULT FALSE,
  is_coming_soon BOOLEAN DEFAULT FALSE,
  
  -- Auto-rigging tier limits
  max_bones INTEGER NOT NULL DEFAULT 0,
  max_morph_targets INTEGER NOT NULL DEFAULT 0,
  tracking_precision NUMERIC DEFAULT 0.5,
  animation_smoothness NUMERIC DEFAULT 0.5,
  rigging_features JSON,
  bone_structure JSON,
  animation_responsiveness NUMERIC DEFAULT 0.5,
  face_tracking BOOLEAN DEFAULT FALSE,
  body_tracking BOOLEAN DEFAULT FALSE,
  hand_tracking BOOLEAN DEFAULT FALSE,
  finger_tracking BOOLEAN DEFAULT FALSE,
  eye_tracking BOOLEAN DEFAULT FALSE,
  expression_tracking BOOLEAN DEFAULT FALSE,
  auto_rigging_enabled BOOLEAN DEFAULT FALSE,
  max_file_size_mb INTEGER DEFAULT 25,
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

**Plan Tiers**:
- **Free**: Basic streaming (15 min/week, 1 avatar)
- **Reply Guy**: Enhanced features with moderate limits
- **Spartan**: Advanced streaming capabilities
- **Zeus**: Premium features with high limits
- **Goat**: Ultimate tier with maximum capabilities

### `user_subscriptions` table
**Purpose**: Tracks active user subscriptions
```sql
CREATE TABLE user_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
  start_date TIMESTAMP DEFAULT NOW() NOT NULL,
  end_date TIMESTAMP,
  auto_renew BOOLEAN DEFAULT TRUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active, cancelled, expired
  stream_time_remaining INTEGER NOT NULL, -- in minutes
  stripe_subscription_id TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

### `add_ons` table
**Purpose**: Additional purchasable features
```sql
CREATE TABLE add_ons (
  id SERIAL PRIMARY KEY,
  addon_id TEXT NOT NULL UNIQUE, -- stream_hours, voice_clone, etc.
  name TEXT NOT NULL,
  price INTEGER NOT NULL, -- in cents
  description TEXT NOT NULL,
  stripe_price_id TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

### `user_add_ons` table
**Purpose**: Tracks user add-on purchases
```sql
CREATE TABLE user_add_ons (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addon_id TEXT NOT NULL REFERENCES add_ons(addon_id),
  quantity INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active', -- active, used, expired
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

---

## Avatar Management

### `avatars` table
**Purpose**: Stores user-created and uploaded 3D avatars with metadata
```sql
CREATE TABLE avatars (
  id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
  user_id VARCHAR NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 2d-generated, glb-upload, preset, built-in
  category TEXT DEFAULT 'custom' NOT NULL, -- custom, fantasy, modern, business, etc.
  thumbnail_url TEXT NOT NULL,
  preview_url TEXT NOT NULL,
  model_url TEXT NOT NULL,
  file_url TEXT NOT NULL, -- Path to the actual file (GLB, etc.)
  ipfs_hash TEXT, -- IPFS hash for decentralized storage
  supabase_url TEXT, -- Backup Supabase storage URL
  
  vertices INTEGER NOT NULL,
  control_points INTEGER NOT NULL,
  file_size INTEGER NOT NULL, -- in bytes
  
  -- Auto-rigging and AI recognition
  is_rigged BOOLEAN DEFAULT FALSE NOT NULL,
  rigged_model_url TEXT, -- URL to auto-rigged version
  rigged_ipfs_hash TEXT, -- IPFS hash for rigged model
  face_tracking_enabled BOOLEAN DEFAULT TRUE NOT NULL,
  body_tracking_enabled BOOLEAN DEFAULT TRUE NOT NULL,
  hand_tracking_enabled BOOLEAN DEFAULT FALSE NOT NULL,
  
  -- Model quality and optimization
  lod_levels JSON, -- Level of detail configurations
  animations JSON, -- Available animations
  blend_shapes JSON, -- Facial expression blend shapes
  
  -- Access control
  is_premium BOOLEAN DEFAULT FALSE NOT NULL,
  is_public BOOLEAN DEFAULT FALSE NOT NULL, -- Can be used by others
  required_plan TEXT DEFAULT 'free' NOT NULL,
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0 NOT NULL,
  last_used_at TIMESTAMP,
  
  metadata JSON,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

**Key Features**:
- IPFS integration for decentralized storage
- Auto-rigging system support
- Multiple tracking capabilities (face, body, hands)
- Level-of-detail (LOD) optimization
- Usage analytics

### `avatar_categories` table
**Purpose**: Organizes avatars into categories
```sql
CREATE TABLE avatar_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  thumbnail_url TEXT,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

### `preset_avatars` table
**Purpose**: Platform-provided avatar templates
```sql
CREATE TABLE preset_avatars (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category_id INTEGER REFERENCES avatar_categories(id),
  thumbnail_url TEXT NOT NULL,
  preview_url TEXT NOT NULL,
  model_url TEXT NOT NULL,
  ipfs_hash TEXT,
  
  vertices INTEGER NOT NULL,
  file_size INTEGER NOT NULL,
  
  -- Pre-configured settings
  is_rigged BOOLEAN DEFAULT TRUE NOT NULL,
  face_tracking_enabled BOOLEAN DEFAULT TRUE NOT NULL,
  body_tracking_enabled BOOLEAN DEFAULT TRUE NOT NULL,
  animations JSON,
  blend_shapes JSON,
  
  -- Access control
  required_plan TEXT DEFAULT 'free' NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0 NOT NULL,
  
  metadata JSON,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

---

## Streaming Infrastructure

### `streaming_sessions` table
**Purpose**: Tracks active and historical streaming sessions
```sql
CREATE TABLE streaming_sessions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  avatar_id INTEGER REFERENCES avatars(id),
  start_time TIMESTAMP DEFAULT NOW() NOT NULL,
  end_time TIMESTAMP,
  duration INTEGER, -- in seconds
  platform TEXT, -- twitter_spaces, other
  viewers INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active', -- active, ended, failed
  metadata JSON,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

### `rtmp_sources` table
**Purpose**: User-specific RTMP streaming configurations
```sql
CREATE TABLE rtmp_sources (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  stream_key TEXT NOT NULL,
  bitrate INTEGER DEFAULT 2500 NOT NULL,
  is_default BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

---

## Content Management

### `stream_backgrounds` table
**Purpose**: Virtual backgrounds for streaming
```sql
CREATE TABLE stream_backgrounds (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'bedroom', 'nature', 'urban', 'abstract', etc.
  image_url TEXT NOT NULL, -- URL or path to background image
  thumbnail_url TEXT, -- Optional thumbnail for admin interface
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  required_plan TEXT DEFAULT 'free' NOT NULL, -- free, pro, premium
  created_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

### `background_categories` table
**Purpose**: Organizes streaming backgrounds
```sql
CREATE TABLE background_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

---

## System Administration

### `system_logs` table
**Purpose**: Application-wide logging and monitoring
```sql
CREATE TABLE system_logs (
  id SERIAL PRIMARY KEY,
  level TEXT NOT NULL, -- info, warning, error
  type TEXT NOT NULL, -- info, warning, error
  service TEXT NOT NULL, -- auth, avatar, stream, subscription
  message TEXT NOT NULL,
  details JSON,
  user_id VARCHAR REFERENCES users(id),
  timestamp TIMESTAMP DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

### `gpu_usage_logs` table
**Purpose**: GPU resource usage tracking
```sql
CREATE TABLE gpu_usage_logs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id),
  operation TEXT NOT NULL, -- avatar_generation, streaming, tracking
  usage INTEGER NOT NULL, -- percentage usage 0-100
  memory_used INTEGER NOT NULL, -- in MB
  service_id TEXT NOT NULL, -- identifier for the service
  resource_usage INTEGER NOT NULL, -- in milliseconds
  cost INTEGER, -- in cents
  metadata JSON,
  timestamp TIMESTAMP DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

---

## Compliance & Moderation

### `dmca_complaints` table
**Purpose**: DMCA takedown request tracking
```sql
CREATE TABLE dmca_complaints (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  complainant_name TEXT NOT NULL,
  complainant_email TEXT NOT NULL,
  content_url TEXT NOT NULL,
  claimed_work TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, investigating, resolved, dismissed
  action_taken TEXT, -- content_removed, user_warned, user_suspended, etc.
  admin_notes TEXT,
  filed_at TIMESTAMP DEFAULT NOW() NOT NULL,
  resolved_at TIMESTAMP,
  resolved_by TEXT, -- admin user ID
);
```

### `user_suspensions` table
**Purpose**: User suspension tracking with automated escalation
```sql
CREATE TABLE user_suspensions (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  suspension_type TEXT NOT NULL, -- 'manual', 'automated', 'dmca'
  suspension_level INTEGER NOT NULL, -- 1-7 (1day, 3day, 7day, 14day, 30day, 180day, permanent)
  reason TEXT NOT NULL,
  description TEXT,
  issued_by TEXT NOT NULL, -- admin user ID
  issued_at TIMESTAMP DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  auto_reactivate_at TIMESTAMP, -- When to automatically unblock
  appeal_submitted BOOLEAN DEFAULT FALSE NOT NULL,
  appeal_notes TEXT,
  related_dmca_id INTEGER, -- Link to DMCA complaint if applicable
);
```

### `user_warnings` table
**Purpose**: User warning system
```sql
CREATE TABLE user_warnings (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  warning_type TEXT NOT NULL, -- dmca, community_guidelines, tos_violation
  reason TEXT NOT NULL,
  description TEXT,
  issued_by TEXT NOT NULL, -- admin user ID
  issued_at TIMESTAMP DEFAULT NOW() NOT NULL,
  acknowledged BOOLEAN DEFAULT FALSE NOT NULL,
  acknowledged_at TIMESTAMP
);
```

---

## Marketing & Communication

### `coming_soon_emails` table
**Purpose**: Email notifications for upcoming features
```sql
CREATE TABLE coming_soon_emails (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

---

## Key Relationships

### Primary Foreign Key Relationships:
- `user_subscriptions.user_id` → `users.id`
- `user_subscriptions.plan_id` → `subscription_plans.id`
- `avatars.user_id` → `users.id`
- `streaming_sessions.user_id` → `users.id`
- `streaming_sessions.avatar_id` → `avatars.id`
- `preset_avatars.category_id` → `avatar_categories.id`
- `stream_backgrounds.created_by` → `users.id`

### Indexes and Constraints:
- Unique constraints on usernames and emails
- Session expiration index for cleanup
- Foreign key cascades for data integrity
- JSON fields for flexible metadata storage

---

## Data Types Used

| Type | Usage | Description |
|------|-------|-------------|
| `VARCHAR` | User IDs, session IDs | Variable length strings |
| `TEXT` | Names, descriptions, URLs | Unlimited text fields |
| `SERIAL` | Auto-incrementing IDs | Primary keys |
| `BIGINT` | Avatar IDs | Large integer values |
| `INTEGER` | Counts, sizes, durations | Standard integers |
| `NUMERIC` | Prices, percentages | Decimal numbers |
| `BOOLEAN` | Flags, status indicators | True/false values |
| `TIMESTAMP` | Date/time fields | Full timestamp with timezone |
| `JSON` | Metadata, configurations | Flexible JSON objects |

---

## Notes

1. **IPFS Integration**: Avatars support both local and IPFS storage for decentralization
2. **Soft Deletes**: Most tables use status fields rather than hard deletes
3. **Audit Trail**: Created/updated timestamps on all major tables
4. **Flexible Metadata**: JSON fields allow for extensible data storage
5. **Subscription Tiers**: Progressive feature unlocking based on plan levels
6. **Usage Tracking**: Comprehensive analytics for platform optimization
7. **Compliance Ready**: Built-in DMCA and moderation workflows

This schema supports the complete VIDA³ platform functionality including user management, avatar creation, streaming sessions, subscription billing, and administrative oversight.