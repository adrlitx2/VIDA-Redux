/**
 * Database Setup Script for VIDA³
 * Creates and populates all required tables with initial data
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './shared/schema.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const client = postgres(connectionString);
const db = drizzle(client, { schema });

async function setupDatabase() {
  try {
    console.log('🚀 Setting up VIDA³ database...');

    // Insert subscription plans
    console.log('📋 Creating subscription plans...');
    await db.insert(schema.subscriptionPlans).values([
      {
        id: 'free',
        name: 'Free',
        price: 0,
        description: 'Basic avatar streaming with 15 minutes per week',
        features: ['15 min streaming/week', '1 avatar slot', 'Basic support'],
        streamMinutesPerWeek: 15,
        maxAvatars: 1,
        maxConcurrentStreams: 1,
        priority: 1,
        isActive: true
      },
      {
        id: 'reply_guy',
        name: 'Reply Guy',
        price: 9.99,
        description: 'Perfect for regular streamers',
        features: ['2 hours streaming/week', '3 avatar slots', 'Priority support'],
        streamMinutesPerWeek: 120,
        maxAvatars: 3,
        maxConcurrentStreams: 1,
        priority: 2,
        isActive: true
      },
      {
        id: 'spartan',
        name: 'Spartan',
        price: 29.99,
        description: 'Professional streaming package',
        features: ['10 hours streaming/week', '10 avatar slots', 'Advanced features'],
        streamMinutesPerWeek: 600,
        maxAvatars: 10,
        maxConcurrentStreams: 2,
        priority: 3,
        isActive: true
      },
      {
        id: 'zeus',
        name: 'Zeus',
        price: 99.99,
        description: 'Power user package',
        features: ['Unlimited streaming', 'Unlimited avatars', 'Premium support'],
        streamMinutesPerWeek: -1, // Unlimited
        maxAvatars: -1, // Unlimited
        maxConcurrentStreams: 5,
        priority: 4,
        isActive: true
      },
      {
        id: 'goat',
        name: 'GOAT',
        price: 299.99,
        description: 'Ultimate creator package',
        features: ['Everything in Zeus', 'Custom integrations', 'Dedicated support'],
        streamMinutesPerWeek: -1, // Unlimited
        maxAvatars: -1, // Unlimited
        maxConcurrentStreams: 10,
        priority: 5,
        isActive: true
      }
    ]).onConflictDoNothing();

    // Insert add-ons
    console.log('🔌 Creating add-ons...');
    await db.insert(schema.addOns).values([
      {
        id: 'extra_stream_time',
        name: 'Extra Stream Time',
        description: 'Add 2 hours of streaming time',
        price: 4.99,
        type: 'stream_time',
        metadata: { minutes: 120 },
        isActive: true
      },
      {
        id: 'avatar_slot',
        name: 'Extra Avatar Slot',
        description: 'Add one more avatar slot',
        price: 2.99,
        type: 'avatar_slot',
        metadata: { slots: 1 },
        isActive: true
      },
      {
        id: 'premium_voice',
        name: 'Premium Voice Pack',
        description: 'Access to premium voice options',
        price: 9.99,
        type: 'voice_pack',
        metadata: { voiceCount: 10 },
        isActive: true
      }
    ]).onConflictDoNothing();

    // Create sample avatars for demo purposes
    console.log('👤 Creating sample avatars...');
    const sampleAvatars = [
      {
        userId: '8b97c730-73bf-4073-82dc-b8ef84e26009', // Your current user ID
        name: 'Professional Avatar',
        description: 'Clean, professional look for business streams',
        imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=professional',
        modelUrl: null,
        isPublic: true,
        isActive: true,
        tags: ['professional', 'business'],
        metadata: {
          style: 'realistic',
          gender: 'neutral',
          ageRange: 'adult'
        }
      },
      {
        userId: '8b97c730-73bf-4073-82dc-b8ef84e26009',
        name: 'Gaming Avatar',
        description: 'Perfect for gaming streams and casual content',
        imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=gaming',
        modelUrl: null,
        isPublic: true,
        isActive: true,
        tags: ['gaming', 'casual'],
        metadata: {
          style: 'cartoon',
          gender: 'neutral',
          ageRange: 'young'
        }
      },
      {
        userId: '8b97c730-73bf-4073-82dc-b8ef84e26009',
        name: 'Creative Avatar',
        description: 'Artistic and creative for educational content',
        imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=creative',
        modelUrl: null,
        isPublic: true,
        isActive: true,
        tags: ['creative', 'educational'],
        metadata: {
          style: 'artistic',
          gender: 'neutral',
          ageRange: 'adult'
        }
      }
    ];

    for (const avatar of sampleAvatars) {
      await db.insert(schema.avatars).values(avatar).onConflictDoNothing();
    }

    // Create sample streaming sessions
    console.log('📺 Creating sample streaming sessions...');
    const now = new Date();
    const sessionsData = [
      {
        userId: '8b97c730-73bf-4073-82dc-b8ef84e26009',
        avatarId: 1,
        startTime: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        endTime: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000), // 45 minutes
        duration: 45,
        platform: 'twitter_spaces',
        status: 'completed',
        viewers: 23,
        maxViewers: 35,
        quality: 'HD',
        metadata: { engagement: 0.85, chatMessages: 142 }
      },
      {
        userId: '8b97c730-73bf-4073-82dc-b8ef84e26009',
        avatarId: 2,
        startTime: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        endTime: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 67 * 60 * 1000), // 67 minutes
        duration: 67,
        platform: 'twitter_spaces',
        status: 'completed',
        viewers: 45,
        maxViewers: 67,
        quality: 'HD',
        metadata: { engagement: 0.92, chatMessages: 234 }
      },
      {
        userId: '8b97c730-73bf-4073-82dc-b8ef84e26009',
        avatarId: 1,
        startTime: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        endTime: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000 + 32 * 60 * 1000), // 32 minutes
        duration: 32,
        platform: 'twitter_spaces',
        status: 'completed',
        viewers: 18,
        maxViewers: 28,
        quality: 'HD',
        metadata: { engagement: 0.78, chatMessages: 89 }
      }
    ];

    for (const session of sessionsData) {
      await db.insert(schema.streamingSessions).values(session).onConflictDoNothing();
    }

    // Create system logs
    console.log('📝 Creating system logs...');
    const logsData = [
      {
        level: 'info',
        message: 'User login successful',
        source: 'auth',
        userId: '8b97c730-73bf-4073-82dc-b8ef84e26009',
        metadata: { ip: '192.168.1.1', userAgent: 'Mozilla/5.0' }
      },
      {
        level: 'info',
        message: 'Avatar created successfully',
        source: 'avatar',
        userId: '8b97c730-73bf-4073-82dc-b8ef84e26009',
        metadata: { avatarId: 1 }
      },
      {
        level: 'info',
        message: 'Streaming session started',
        source: 'streaming',
        userId: '8b97c730-73bf-4073-82dc-b8ef84e26009',
        metadata: { sessionId: 1 }
      }
    ];

    for (const log of logsData) {
      await db.insert(schema.systemLogs).values(log).onConflictDoNothing();
    }

    console.log('✅ Database setup completed successfully!');
    console.log('\n📊 Summary:');
    console.log('- 5 subscription plans created');
    console.log('- 3 add-ons created');
    console.log('- 3 sample avatars created');
    console.log('- 3 streaming sessions created');
    console.log('- 3 system logs created');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run the setup
setupDatabase().catch(console.error);