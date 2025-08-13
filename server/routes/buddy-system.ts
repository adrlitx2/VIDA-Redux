import { Router, Request, Response } from 'express';
import { supabase } from '../auth/supabase';
import { Server } from 'socket.io';
import { sessions, pendingInvites } from '../shared/stores';
import { storage } from '../storage';

// We'll use the same authentication pattern as the main routes
async function isAuthenticated(req: any, res: any, next: any) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    // Check for token
    if (!token) {
      return res.status(401).json({ message: "No auth token provided" });
    }
    
    // Use JWT verification with Supabase
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data.user) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    
    // Set user data
    req.supabaseUser = data.user;
    req.user = data.user;
    
    next();
  } catch (error) {
    console.error("Error authenticating user:", error);
    res.status(500).json({ message: "Authentication error" });
  }
}

export default function buddyRouter(io: Server) {
  const router = Router();

// Buddy System APIs
router.post('/buddies/request', isAuthenticated, async (req: any, res: Response) => {
  try {
    const { recipientId } = req.body;
    const requesterId = req.user?.id || req.supabaseUser?.id || req.supabaseUser?.id;

    if (!recipientId) {
      return res.status(400).json({ error: 'Recipient ID is required' });
    }

    // Check if relationship already exists
    const { data: existingRelationship } = await supabase
      .from('buddy_relationships')
      .select('*')
      .or(`and(requester_id.eq.${requesterId},recipient_id.eq.${recipientId}),and(requester_id.eq.${recipientId},recipient_id.eq.${requesterId})`)
      .single();

    if (existingRelationship) {
      return res.status(400).json({ error: 'Buddy relationship already exists' });
    }

    // Create buddy request
    const { data: relationship, error } = await supabase
      .from('buddy_relationships')
      .insert({
        requester_id: requesterId,
        recipient_id: recipientId,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Buddy request error:', error);
      return res.status(500).json({ error: 'Failed to send buddy request' });
    }

    // Create notification for recipient
    await supabase
      .from('notifications')
      .insert({
        user_id: recipientId,
        type: 'buddy_request',
        title: 'New Buddy Request',
        message: `${req.user?.user_metadata?.username || req.supabaseUser?.user_metadata?.username || 'Someone'} wants to be your buddy!`,
        data: { requester_id: requesterId }
      });

    res.json({ success: true, relationship });
  } catch (error) {
    console.error('Buddy request exception:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/buddies/accept/:requestId', isAuthenticated, async (req: any, res: Response) => {
  try {
    const { requestId } = req.params;
    const userId = req.user?.id || req.supabaseUser?.id || req.supabaseUser?.id;

    // Update relationship status
    const { data: relationship, error } = await supabase
      .from('buddy_relationships')
      .update({ status: 'accepted' })
      .eq('id', requestId)
      .eq('recipient_id', userId)
      .select()
      .single();

    if (error || !relationship) {
      return res.status(404).json({ error: 'Buddy request not found' });
    }

    // Create notification for requester
    await supabase
      .from('notifications')
      .insert({
        user_id: relationship.requester_id,
        type: 'buddy_accepted',
        title: 'Buddy Request Accepted',
        message: `${req.user?.user_metadata?.username || req.supabaseUser?.user_metadata?.username || 'Someone'} accepted your buddy request!`,
        data: { recipient_id: userId }
      });

    res.json({ success: true, relationship });
  } catch (error) {
    console.error('Accept buddy request exception:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/buddies/decline/:requestId', isAuthenticated, async (req: any, res: Response) => {
  try {
    const { requestId } = req.params;
    const userId = req.user?.id || req.supabaseUser?.id || req.supabaseUser?.id;

    // Get relationship before updating
    const { data: relationship } = await supabase
      .from('buddy_relationships')
      .select('*')
      .eq('id', requestId)
      .eq('recipient_id', userId)
      .single();

    if (!relationship) {
      return res.status(404).json({ error: 'Buddy request not found' });
    }

    // Update relationship status
    const { error } = await supabase
      .from('buddy_relationships')
      .update({ status: 'declined' })
      .eq('id', requestId);

    if (error) {
      return res.status(500).json({ error: 'Failed to decline request' });
    }

    // Create notification for requester
    await supabase
      .from('notifications')
      .insert({
        user_id: relationship.requester_id,
        type: 'buddy_declined',
        title: 'Buddy Request Declined',
        message: `${req.user?.user_metadata?.username || req.supabaseUser?.user_metadata?.username || 'Someone'} declined your buddy request.`,
        data: { recipient_id: userId }
      });

    res.json({ success: true });
  } catch (error) {
    console.error('Decline buddy request exception:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/buddies/list', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user?.id || req.supabaseUser?.id || req.supabaseUser?.id;

    const { data: relationships, error } = await supabase
      .from('buddy_relationships')
      .select(`
        *,
        requester:users!buddy_relationships_requester_id_fkey(id, username, email, role, plan),
        recipient:users!buddy_relationships_recipient_id_fkey(id, username, email, role, plan)
      `)
      .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)
      .eq('status', 'accepted');

    if (error) {
      console.error('Get buddies error:', error);
      return res.status(500).json({ error: 'Failed to get buddies' });
    }

    // Format buddies list
    const buddies = relationships?.map(rel => {
      const isRequester = rel.requester_id === userId;
      const buddy = isRequester ? rel.recipient : rel.requester;
      return {
        id: buddy.id,
        username: buddy.username,
        email: buddy.email,
        role: buddy.role,
        plan: buddy.plan,
        relationshipId: rel.id
      };
    }) || [];

    res.json({ buddies });
  } catch (error) {
    console.error('Get buddies exception:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Co-Streaming Session APIs
router.post('/co-stream/create', isAuthenticated, async (req: any, res: Response) => {
  try {
    const { sessionName, maxParticipants, streamPlatform, gridLayout } = req.body;
    const hostId = req.user?.id || req.supabaseUser?.id;
    const username = req.user?.user_metadata?.username || req.supabaseUser?.user_metadata?.username || 'User';

    if (!hostId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const finalSessionName = sessionName || `${username}'s Co-Stream (${new Date().toLocaleString()})`;

    const session: any = {
      id: `co-stream-${Date.now()}`,
      host_id: hostId,
      session_name: finalSessionName,
      status: 'active',
      max_participants: maxParticipants || 4,
      stream_platform: streamPlatform || 'twitter',
      grid_layout: gridLayout || 'dynamic',
      created_at: new Date().toISOString(),
      participants: [] // Add array for participants
    };

    const hostParticipant = {
      id: `participant-${Date.now()}`,
      session_id: session.id,
      user_id: hostId,
      username: username,
      role: 'host',
      canvas_position: 0,
      is_active: true,
      joined_at: new Date().toISOString(),
      email: req.user?.email || req.supabaseUser?.email || '',
      plan: req.user?.user_metadata?.plan || req.supabaseUser?.user_metadata?.plan || 'free'
    };

    session.participants.push(hostParticipant);
    sessions.set(session.id, session);

    res.json({ 
      success: true, 
      session,
      participant: hostParticipant
    });
  } catch (error) {
    console.error('Create co-stream session exception:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/co-stream/:sessionId/invite', isAuthenticated, async (req: any, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { inviteeId, message } = req.body;
    const inviterId = req.user?.id || req.supabaseUser?.id;
    const inviterUsername = req.user?.user_metadata?.username || req.supabaseUser?.user_metadata?.username || 'Someone';
    const inviterEmail = req.user?.email || req.supabaseUser?.email || '';

    if (!inviterId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!inviteeId) {
      return res.status(400).json({ error: 'Invitee ID is required' });
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.host_id !== inviterId) {
      return res.status(403).json({ error: 'Only host can invite' });
    }

    const invitation = {
      id: Date.now().toString(),
      session_id: sessionId,
      inviter_id: inviterId,
      invitee_id: inviteeId,
      message: message || `Join my co-stream!`,
      status: 'pending',
      created_at: new Date().toISOString(),
      inviter: {
        id: inviterId,
        username: inviterUsername,
        email: inviterEmail
      },
      session: { // Add session snapshot for client
        id: session.id,
        session_name: session.session_name,
        host_id: session.host_id
      }
    };

    let userInvites = pendingInvites.get(inviteeId) || [];
    userInvites.push(invitation);
    pendingInvites.set(inviteeId, userInvites);

    // Emit via WebSocket to invitee (if online)
    io.to(inviteeId).emit('new_invite', invitation);

    res.json({ success: true, invitation });
  } catch (error) {
    console.error('Create invitation exception:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/co-stream/:sessionId/join', async (req: any, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { canvasPosition } = req.body;
    const userId = req.user?.id || req.supabaseUser?.id || '8b97c730-73bf-4073-82dc-b8ef84e26009';

    // Check if session exists and is active
    const { data: session } = await supabase
      .from('co_stream_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('status', 'active')
      .single();

    if (!session) {
      return res.status(404).json({ error: 'Session not found or inactive' });
    }

    // Check if user is already a participant
    const { data: existingParticipant } = await supabase
      .from('co_stream_participants')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .single();

    if (existingParticipant) {
      return res.status(400).json({ error: 'Already a participant in this session' });
    }

    // Check if position is available
    if (canvasPosition !== undefined) {
      const { data: positionTaken } = await supabase
        .from('co_stream_participants')
        .select('id')
        .eq('session_id', sessionId)
        .eq('canvas_position', canvasPosition)
        .eq('is_active', true)
        .single();

      if (positionTaken) {
        return res.status(400).json({ error: 'Canvas position already taken' });
      }
    }

    // Add participant
    const { data: participant, error } = await supabase
      .from('co_stream_participants')
      .insert({
        session_id: sessionId,
        user_id: userId,
        canvas_position: canvasPosition || 1
      })
      .select()
      .single();

    if (error) {
      console.error('Join session error:', error);
      return res.status(500).json({ error: 'Failed to join session' });
    }

    // Create notification for host
    await supabase
      .from('notifications')
      .insert({
        user_id: session.host_id,
        type: 'participant_joined',
        title: 'Participant Joined',
        message: `${req.user?.user_metadata?.username || req.supabaseUser?.user_metadata?.username || 'Someone'} joined your co-stream!`,
        data: { session_id: sessionId, participant_id: userId }
      });

    res.json({ success: true, participant });
  } catch (error) {
    console.error('Join session exception:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/co-stream/:sessionId/participants', async (req: any, res: Response) => {
  try {
    const { sessionId } = req.params;

    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ participants: session.participants });
  } catch (error) {
    console.error('Get participants exception:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User search for co-stream invitations - NEW WORKING VERSION
router.get('/users/search', isAuthenticated, async (req: any, res: Response) => {
  try {
    const { query } = req.query;
    const currentUserId = req.user?.id || req.supabaseUser?.id;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    if (query.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    // Create a new Supabase client with service role key for direct auth access
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase credentials for user search');
      return res.status(500).json({ error: 'Database configuration error' });
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get ALL users from Supabase auth
    const { data: authUsers, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.error('Error fetching users from Supabase auth:', error);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    console.log(`Found ${authUsers.users.length} total users in Supabase auth`);

    // Filter users based on search query
    const filteredUsers = authUsers.users
      .filter((user: any) => {
        // Skip the current user
        if (user.id === currentUserId) return false;
        
        const username = user.user_metadata?.username || '';
        const email = user.email || '';
        const searchTerm = query.toLowerCase();
        
        const matchesUsername = username.toLowerCase().includes(searchTerm);
        const matchesEmail = email.toLowerCase().includes(searchTerm);
        
        if (matchesUsername || matchesEmail) {
          console.log(`Found matching user: ${username} (${email})`);
        }
        
        return matchesUsername || matchesEmail;
      })
      .slice(0, 10) // Limit to 10 results
      .map((user: any) => ({
        id: user.id,
        username: user.user_metadata?.username || user.email?.split('@')[0] || 'User',
        email: user.email,
        role: user.app_metadata?.roles?.[0] || 'user',
        plan: user.user_metadata?.plan || 'free',
        created_at: user.created_at
      }));

    console.log(`Returning ${filteredUsers.length} filtered users for query: "${query}"`);
    res.json({ users: filteredUsers });
  } catch (error) {
    console.error('User search exception:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Invitation APIs
router.get('/invitations/pending', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user?.id || req.supabaseUser?.id;

    const invitations = pendingInvites.get(userId) || [];

    res.json({ invitations });
  } catch (error) {
    console.error('Get invitations exception:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/invitations/:invitationId/accept', isAuthenticated, async (req: any, res: Response) => {
  try {
    const { invitationId } = req.params;
    const userId = req.user?.id || req.supabaseUser?.id;
    const username = req.user?.user_metadata?.username || req.supabaseUser?.user_metadata?.username || 'User';

    let userInvites = pendingInvites.get(userId) || [];
    const inviteIndex = userInvites.findIndex(inv => inv.id === invitationId);
    if (inviteIndex === -1) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    const invitation = userInvites[inviteIndex];
    userInvites.splice(inviteIndex, 1);
    pendingInvites.set(userId, userInvites);

    const session = sessions.get(invitation.session_id);
    if (!session) {
      return res.status(404).json({ error: 'Session expired or not found' });
    }

    if (session.participants.length >= session.max_participants) {
      return res.status(400).json({ error: 'Session is full' });
    }

    const participant = {
      id: `participant-${Date.now()}`,
      session_id: session.id,
      user_id: userId,
      username: username,
      role: 'participant',
      canvas_position: session.participants.length,
      is_active: true,
      joined_at: new Date().toISOString(),
      email: req.user?.email || req.supabaseUser?.email || '',
      plan: req.user?.user_metadata?.plan || req.supabaseUser?.user_metadata?.plan || 'free'
    };

    session.participants.push(participant);

    // Emit to host via WebSocket
    io.to(session.host_id).emit('participant_joined', { session_id: session.id, participant });

    res.json({ 
      success: true, 
      session,
      participant
    });
  } catch (error) {
    console.error('Accept invitation exception:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/invitations/:invitationId/decline', isAuthenticated, async (req: any, res: Response) => {
  try {
    const { invitationId } = req.params;
    const userId = req.user?.id || req.supabaseUser?.id;

    console.log(`🎯 Declining invitation ${invitationId} for user ${userId}`);

    // Use service role key for admin-level operations
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase environment variables');
      return res.status(500).json({ error: 'Server configuration error' });
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get the invitation details first
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('co_stream_invitations')
      .select('*')
      .eq('id', invitationId)
      .eq('invitee_id', userId)
      .eq('status', 'pending')
      .single();

    if (invitationError || !invitation) {
      console.error('❌ Invitation not found or already processed:', invitationError);
      return res.status(404).json({ error: 'Invitation not found or already processed' });
    }

    console.log(`✅ Found invitation for session ${invitation.session_id}`);

    // Update invitation status to declined
    const { error: updateError } = await supabaseAdmin
      .from('co_stream_invitations')
      .update({ 
        status: 'declined',
        responded_at: new Date().toISOString()
      })
      .eq('id', invitationId)
      .eq('invitee_id', userId);

    if (updateError) {
      console.error('❌ Error updating invitation:', updateError);
      return res.status(500).json({ error: 'Failed to update invitation' });
    }

    // Delete the invitation after updating status
    const { error: deleteError } = await supabaseAdmin
      .from('co_stream_invitations')
      .delete()
      .eq('id', invitationId);

    if (deleteError) {
      console.error('❌ Error deleting invitation:', deleteError);
      // Don't fail the request, just log the error
    }

    // Create notification for inviter
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: invitation.inviter_id,
        type: 'invitation_declined',
        title: 'Invitation Declined',
        message: `${req.user?.user_metadata?.username || req.supabaseUser?.user_metadata?.username || 'Someone'} declined your co-stream invitation.`,
        data: { 
          session_id: invitation.session_id, 
          invitee_id: userId
        }
      });

    console.log(`✅ Invitation declined and deleted`);

    res.json({ 
      success: true, 
      message: 'Invitation declined successfully'
    });

  } catch (error) {
    console.error('Decline invitation exception:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// Clean up expired invitations (can be called periodically)
router.post('/invitations/cleanup', async (req: any, res: Response) => {
  try {
    console.log('🧹 Cleaning up expired invitations...');

    // Use service role key for cleanup operations
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase environment variables');
      return res.status(500).json({ error: 'Server configuration error' });
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Delete expired invitations (older than 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: deletedInvitations, error: deleteError } = await supabaseAdmin
      .from('co_stream_invitations')
      .delete()
      .lt('created_at', twentyFourHoursAgo)
      .select();

    if (deleteError) {
      console.error('❌ Error cleaning up expired invitations:', deleteError);
      return res.status(500).json({ error: 'Failed to clean up expired invitations' });
    }

    console.log(`✅ Cleaned up ${deletedInvitations?.length || 0} expired invitations`);

    res.json({ 
      success: true, 
      deletedCount: deletedInvitations?.length || 0 
    });

  } catch (error) {
    console.error('Cleanup invitations exception:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Notification APIs
router.get('/notifications', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user?.id || req.supabaseUser?.id;
    const { limit = 50, offset = 0 } = req.query;

    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) {
      console.error('Get notifications error:', error);
      return res.status(500).json({ error: 'Failed to get notifications' });
    }

    res.json({ notifications: notifications || [] });
  } catch (error) {
    console.error('Get notifications exception:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/notifications/:notificationId/read', isAuthenticated, async (req: any, res: Response) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user?.id || req.supabaseUser?.id;

    const { error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) {
      console.error('Mark notification read error:', error);
      return res.status(500).json({ error: 'Failed to mark notification as read' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Mark notification read exception:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/notifications/read-all', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user?.id || req.supabaseUser?.id;

    const { error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Mark all notifications read error:', error);
      return res.status(500).json({ error: 'Failed to mark notifications as read' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Mark all notifications read exception:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

  return router;
} 
 