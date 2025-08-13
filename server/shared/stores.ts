// Shared in-memory stores for WebSocket-only approach
export const sessions: Map<string, any> = new Map();
export const pendingInvites: Map<string, any[]> = new Map();

// Cleanup timer for expired invites and sessions
setInterval(() => {
  const now = Date.now();
  
  // Clean pending invites (older than 24 hours)
  pendingInvites.forEach((invites, userId) => {
    const filtered = invites.filter((inv: any) => now - new Date(inv.created_at).getTime() < 24 * 60 * 60 * 1000);
    if (filtered.length > 0) {
      pendingInvites.set(userId, filtered);
    } else {
      pendingInvites.delete(userId);
    }
  });
  
  // Clean expired sessions (inactive for 1 hour)
  sessions.forEach((session, sessionId) => {
    if (now - new Date(session.created_at).getTime() > 60 * 60 * 1000) {
      sessions.delete(sessionId);
    }
  });
}, 60 * 60 * 1000); // Run hourly 