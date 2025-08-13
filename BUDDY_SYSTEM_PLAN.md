# 🎭 VIDA³ Buddy System & Co-Streaming Plan

## 🎯 **Overview**
A comprehensive buddy system that allows users to invite friends to co-stream, with dynamic multi-user canvas grids that automatically combine all participants' content into a single stream output.

## 📋 **Core Features**

### **Phase 1: User Discovery & Invitation System**
- [ ] User search functionality (by username, email, or display name)
- [ ] Friend/buddy request system
- [ ] Co-streaming invitation system
- [ ] Real-time notifications for invites, acceptances, declines
- [ ] Buddy list management

### **Phase 2: Dynamic Multi-User Canvas**
- [ ] Automatic grid layout system (2x2, 3x3, 4x4, etc.)
- [ ] Real-time canvas synchronization
- [ ] Individual user canvas management
- [ ] Host stream aggregation
- [ ] Quality optimization for multi-user streams

### **Phase 3: Twitter/X Optimization**
- [ ] Twitter-specific stream settings
- [ ] Optimal bitrate and resolution for X
- [ ] Stream key management for X
- [ ] Auto-formatting for X requirements

## 🏗️ **Technical Architecture**

### **Database Schema**

```sql
-- Buddy relationships
CREATE TABLE buddy_relationships (
  id SERIAL PRIMARY KEY,
  requester_id VARCHAR REFERENCES users(id),
  recipient_id VARCHAR REFERENCES users(id),
  status VARCHAR DEFAULT 'pending', -- pending, accepted, declined, blocked
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(requester_id, recipient_id)
);

-- Co-streaming sessions
CREATE TABLE co_stream_sessions (
  id SERIAL PRIMARY KEY,
  host_id VARCHAR REFERENCES users(id),
  session_name VARCHAR,
  status VARCHAR DEFAULT 'active', -- active, ended, cancelled
  max_participants INTEGER DEFAULT 4,
  stream_platform VARCHAR DEFAULT 'twitter',
  stream_key VARCHAR,
  rtmp_url VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP
);

-- Session participants
CREATE TABLE co_stream_participants (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES co_stream_sessions(id),
  user_id VARCHAR REFERENCES users(id),
  role VARCHAR DEFAULT 'participant', -- host, participant, moderator
  canvas_position INTEGER, -- 0, 1, 2, 3 for 2x2 grid
  joined_at TIMESTAMP DEFAULT NOW(),
  left_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

-- Invitations
CREATE TABLE co_stream_invitations (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES co_stream_sessions(id),
  inviter_id VARCHAR REFERENCES users(id),
  invitee_id VARCHAR REFERENCES users(id),
  status VARCHAR DEFAULT 'pending', -- pending, accepted, declined, expired
  message TEXT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  responded_at TIMESTAMP
);

-- Notifications
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id),
  type VARCHAR, -- buddy_request, co_stream_invite, invitation_response, etc.
  title VARCHAR,
  message TEXT,
  data JSONB, -- Additional data like session_id, inviter_id, etc.
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### **API Endpoints**

#### **User Discovery**
```
GET /api/users/search?q={search_term}
GET /api/users/suggestions
GET /api/users/{user_id}/profile
```

#### **Buddy System**
```
POST /api/buddies/request
POST /api/buddies/accept/{request_id}
POST /api/buddies/decline/{request_id}
GET /api/buddies/list
DELETE /api/buddies/{buddy_id}
```

#### **Co-Streaming Sessions**
```
POST /api/co-stream/create
POST /api/co-stream/{session_id}/invite
POST /api/co-stream/{session_id}/join
POST /api/co-stream/{session_id}/leave
GET /api/co-stream/{session_id}/participants
DELETE /api/co-stream/{session_id}
```

#### **Invitations**
```
GET /api/invitations/pending
POST /api/invitations/{invitation_id}/accept
POST /api/invitations/{invitation_id}/decline
```

#### **Notifications**
```
GET /api/notifications
POST /api/notifications/{notification_id}/read
POST /api/notifications/read-all
```

## 🎨 **Dynamic Canvas System**

### **Grid Layouts**
- **2x2 Grid**: 4 participants max
- **3x3 Grid**: 9 participants max  
- **4x4 Grid**: 16 participants max
- **Custom Layouts**: Host can arrange participants

### **Canvas Management**
```typescript
interface CanvasGrid {
  layout: '2x2' | '3x3' | '4x4' | 'custom';
  participants: CanvasParticipant[];
  hostCanvas: CanvasData;
  outputStream: StreamConfig;
}

interface CanvasParticipant {
  userId: string;
  position: number; // 0-15 for grid positions
  canvas: CanvasData;
  isActive: boolean;
  quality: 'low' | 'medium' | 'high';
}
```

### **Real-time Synchronization**
- WebSocket connections for each participant
- Canvas frame broadcasting
- Position updates
- Quality adjustments based on network

## 📱 **Frontend Components**

### **User Discovery**
- `UserSearch.tsx` - Search and filter users
- `UserCard.tsx` - Display user profiles
- `BuddyList.tsx` - Manage buddy relationships

### **Co-Streaming**
- `CoStreamSession.tsx` - Session management
- `ParticipantGrid.tsx` - Dynamic grid display
- `InvitationManager.tsx` - Send/receive invitations
- `StreamControls.tsx` - Host controls

### **Notifications**
- `NotificationCenter.tsx` - Real-time notifications
- `NotificationBadge.tsx` - Unread count indicator
- `InvitationResponse.tsx` - Accept/decline invitations

## 🔧 **Implementation Plan**

### **Week 1: Foundation**
- [ ] Database schema setup
- [ ] Basic user search API
- [ ] Buddy request system
- [ ] Notification system

### **Week 2: Invitation System**
- [ ] Co-streaming session creation
- [ ] Invitation sending/accepting
- [ ] Real-time notifications
- [ ] Basic frontend components

### **Week 3: Canvas Integration**
- [ ] Dynamic grid system
- [ ] Multi-user canvas synchronization
- [ ] Stream aggregation
- [ ] Quality optimization

### **Week 4: Twitter/X Optimization**
- [ ] Twitter-specific settings
- [ ] Stream key management
- [ ] Performance testing
- [ ] UI/UX polish

## 🎯 **Twitter/X Optimization Features**

### **Stream Settings**
- **Resolution**: 1080p (Twitter's preferred)
- **Bitrate**: 6000 kbps (optimal for X)
- **FPS**: 30fps (Twitter standard)
- **Audio**: AAC, 128kbps

### **Grid Optimization**
- **2x2 Layout**: Perfect for Twitter's aspect ratio
- **Auto-crop**: Ensure all participants fit
- **Quality scaling**: Adjust based on network
- **Fallback modes**: Single user if others drop

### **Social Features**
- **Auto-tagging**: Tag participants in stream
- **Hashtag integration**: Auto-add relevant hashtags
- **Engagement tracking**: Monitor viewer interaction
- **Clip generation**: Auto-create highlights

## 🔄 **Real-time Features**

### **WebSocket Events**
```typescript
// Session events
'session_created'
'session_joined'
'session_left'
'session_ended'

// Canvas events
'canvas_update'
'position_change'
'quality_change'
'participant_joined'
'participant_left'

// Invitation events
'invitation_sent'
'invitation_accepted'
'invitation_declined'
'invitation_expired'
```

### **Notification Types**
- Buddy request received
- Co-stream invitation
- Invitation accepted/declined
- Session starting soon
- Participant joined/left
- Stream quality issues

## 🚀 **Advanced Features (Future)**

### **AI-Powered Features**
- **Smart Grid Layout**: AI suggests optimal participant arrangement
- **Content Analysis**: Auto-detect interesting moments
- **Auto-clipping**: Create highlights automatically
- **Engagement Prediction**: Suggest best streaming times

### **Social Integration**
- **Twitter Spaces Integration**: Sync with Twitter Spaces
- **Discord Integration**: Stream to Discord servers
- **YouTube Integration**: Multi-platform streaming
- **TikTok Live**: Mobile streaming support

### **Analytics & Insights**
- **Viewer Analytics**: Track engagement per participant
- **Performance Metrics**: Monitor stream quality
- **Social Impact**: Measure reach and engagement
- **Collaboration Stats**: Track successful co-streams

## 📊 **Success Metrics**

### **User Engagement**
- Number of buddy connections
- Co-streaming session frequency
- Average session duration
- Participant retention rate

### **Technical Performance**
- Stream quality consistency
- Latency between participants
- Canvas synchronization accuracy
- Platform compatibility

### **Social Impact**
- Twitter engagement rates
- Follower growth for participants
- Viral clip generation
- Community building metrics

---

**This buddy system will transform VIDA³ into a collaborative streaming platform, perfect for building communities and creating engaging multi-user content optimized for Twitter/X!** 🎭✨ 
 