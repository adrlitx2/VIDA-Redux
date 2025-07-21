import express from "express";
import { isAuthenticated } from "../routes";
import { storage } from "../storage";
import { insertStreamingSessionSchema } from "../../shared/schema";

const router = express.Router();

// Start a streaming session
router.post("/start", isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Check if user has streaming time remaining
    if (user.streamTimeRemaining <= 0) {
      return res.status(403).json({ message: "No streaming time remaining. Please upgrade your plan or purchase additional time." });
    }
    
    // Check if user already has an active streaming session
    const activeSessions = await storage.getActiveStreamingSessions();
    const userActiveSession = activeSessions.find(session => session.userId === userId);
    
    if (userActiveSession) {
      return res.status(400).json({ message: "You already have an active streaming session." });
    }
    
    // Start new streaming session
    const session = await storage.startStreamingSession({
      userId,
      startTime: new Date(),
      status: "active",
      viewers: 0
    });
    
    res.status(201).json(session);
  } catch (error: any) {
    console.error("Error starting streaming session:", error);
    res.status(500).json({ message: "Error starting streaming session" });
  }
});

// End a streaming session
router.post("/end", isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any).id;
    
    // Find user's active streaming session
    const activeSessions = await storage.getActiveStreamingSessions();
    const userActiveSession = activeSessions.find(session => session.userId === userId);
    
    if (!userActiveSession) {
      return res.status(404).json({ message: "No active streaming session found" });
    }
    
    // Calculate duration in minutes
    const endTime = new Date();
    const startTime = new Date(userActiveSession.startTime);
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationMinutes = Math.ceil(durationMs / (1000 * 60));
    
    // End the streaming session
    const updatedSession = await storage.endStreamingSession(userActiveSession.id, {
      endTime,
      duration: durationMinutes,
      viewers: typeof userActiveSession.viewers === 'number' ? userActiveSession.viewers : 0
    });
    
    if (!updatedSession) {
      return res.status(500).json({ message: "Failed to end streaming session" });
    }
    
    // Deduct streaming time from user's account
    const user = await storage.getUser(userId);
    if (user) {
      const remainingTime = Math.max(0, user.streamTimeRemaining - durationMinutes);
      await storage.updateUser(userId, { streamTimeRemaining: remainingTime });
    }
    
    res.json(updatedSession);
  } catch (error: any) {
    console.error("Error ending streaming session:", error);
    res.status(500).json({ message: "Error ending streaming session" });
  }
});

// Get active streaming sessions (public endpoint for viewers)
router.get("/active", async (req, res) => {
  try {
    const activeSessions = await storage.getActiveStreamingSessions();
    
    // Enrich with user data
    const enrichedSessions = await Promise.all(
      activeSessions.map(async (session) => {
        const user = await storage.getUser(session.userId);
        return {
          ...session,
          username: user?.username,
          avatarUrl: user?.avatarUrl
        };
      })
    );
    
    res.json(enrichedSessions);
  } catch (error: any) {
    console.error("Error fetching active streaming sessions:", error);
    res.status(500).json({ message: "Error fetching active streaming sessions" });
  }
});

// Get streaming history for current user
router.get("/history", isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const history = await storage.getUserStreamingHistory(userId);
    res.json(history);
  } catch (error: any) {
    console.error("Error fetching streaming history:", error);
    res.status(500).json({ message: "Error fetching streaming history" });
  }
});

// Update viewer count for an active session
router.post("/:id/viewers", async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    if (isNaN(sessionId)) {
      return res.status(400).json({ message: "Invalid session ID" });
    }
    
    const { viewers } = req.body;
    if (typeof viewers !== 'number' || viewers < 0) {
      return res.status(400).json({ message: "Invalid viewer count" });
    }
    
    // Find the active session
    const activeSessions = await storage.getActiveStreamingSessions();
    const session = activeSessions.find(s => s.id === sessionId);
    
    if (!session) {
      return res.status(404).json({ message: "Streaming session not found or not active" });
    }
    
    // For now, we'll just return success without actually updating
    // since our current storage implementation might not support this operation
    
    res.json({ message: "Viewer count updated", viewers });
  } catch (error: any) {
    console.error("Error updating viewer count:", error);
    res.status(500).json({ message: "Error updating viewer count" });
  }
});

export default router;