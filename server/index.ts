import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import expressWs from 'express-ws';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { tempFileCleanup } from "./services/temp-file-cleanup";
import { createClient } from '@supabase/supabase-js';

// Import the shared stores
import { pendingInvites } from './shared/stores';

// Global error handlers to prevent process crashes
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit process - just log and continue
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit process - just log and continue
});

const app = express();

// Enable WebSocket support
const wsInstance = expressWs(app);

// Add request logging for ALL requests to debug routing
app.use((req, res, next) => {
  // console.log(`🌐 ALL REQUESTS: ${req.method} ${req.url}`);
  if (req.url.includes('/api/')) {
    // console.log(`📥 API REQUEST: ${req.method} ${req.url}`);
    // console.log(`📥 Headers:`, {
    //   'content-type': req.headers['content-type'],
    //   'authorization': req.headers.authorization ? 'Bearer [present]' : 'none',
    //   'content-length': req.headers['content-length']
    // });
    
    // Special logging for 2D to 3D requests
    if (req.url.includes('2d-to-3d')) {
      console.log('🎯 2D-to-3D REQUEST DETECTED:', {
        method: req.method,
        url: req.url,
        contentType: req.headers['content-type'],
        hasAuth: !!req.headers.authorization,
        userAgent: req.headers['user-agent']?.substring(0, 50)
      });
    }
  }
  next();
});

// Add CORS headers for frontend communication
app.use((req, res, next) => {
  // Allow all origins for now to fix connection issues
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Skip body parsing for file upload endpoints
app.use((req, res, next) => {
  if ((req.url.includes('/upload') || req.url.includes('/2d-to-3d')) && req.headers['content-type']?.includes('multipart/form-data')) {
    // Skip body parsing for file uploads - let multer handle it
    console.log('📥 Skipping body parsing for multipart upload:', req.url);
    return next();
  }
  express.json()(req, res, next);
});

app.use((req, res, next) => {
  if ((req.url.includes('/upload') || req.url.includes('/2d-to-3d')) && req.headers['content-type']?.includes('multipart/form-data')) {
    // Skip URL encoding for file uploads - let multer handle it
    console.log('📥 Skipping URL encoding for multipart upload:', req.url);
    return next();
  }
  express.urlencoded({ extended: false })(req, res, next);
});

// Serve static files from attached_assets directory
app.use('/attached_assets', express.static('attached_assets'));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Create HTTP server and Socket.IO instance
  const httpServer = createServer(app);
  const io = new Server(httpServer, { 
    cors: { 
      origin: "*",
      methods: ["GET", "POST"]
    } 
  });

  // Socket.IO authentication middleware
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('No token provided'));
    }
    
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (!supabaseUrl || !supabaseServiceKey) {
        return next(new Error('Supabase configuration missing'));
      }
      
      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
      
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data.user) {
        return next(new Error('Invalid or expired token'));
      }

      // Attach user to socket, using a type assertion to avoid TypeScript error
      (socket as any).user = data.user;
      next();
    } catch (error) {
      return next(new Error('Authentication failed'));
    }
  });

  // Socket.IO connection handler
  io.on('connection', (socket) => {
    // Ensure TypeScript knows about socket.user
    const userId = (socket as any).user?.id;
    if (!userId) {
      console.error('WebSocket connection attempted without valid user');
      socket.disconnect(true);
      return;
    }
    console.log(`🔌 WebSocket connected: ${userId}`);
    
    // Join personal room for targeted emits
    socket.join(userId);
    
    // Send pending invites on connect
    const userInvites = pendingInvites.get(userId) || [];
    socket.emit('pending_invites', userInvites);
    
    // Handle session joining
    socket.on('join-session', (data) => {
      const { sessionId, userId, username, isHost } = data;
      console.log(`🎯 User ${username} joining session ${sessionId}`);
      
      // Join the session room
      socket.join(sessionId);
      
      // Store connection info
      if (!global.coStreamConnections) {
        global.coStreamConnections = new Map();
      }
      
      if (!global.coStreamConnections.has(sessionId)) {
        global.coStreamConnections.set(sessionId, new Map());
      }
      
      const sessionConnections = global.coStreamConnections.get(sessionId);
      if (sessionConnections) {
        sessionConnections.set(userId, {
          ws: socket,
          userId,
          username,
          sessionId,
          isHost
        });
        
        // Get existing participants in the session
        const existingParticipants = Array.from(sessionConnections.entries())
          .filter(([id, _]) => id !== userId) // Exclude the joining user
          .map(([id, connection]) => ({
            user_id: id,
            username: connection.username,
            isHost: connection.isHost
          }));
        
        // Send session-joined message with existing participants
        socket.emit('session-joined', {
          sessionId,
          participants: existingParticipants
        });
      }
      
      // Notify other participants
      socket.to(sessionId).emit('participant-joined', {
        userId,
        username,
        isHost
      });
    });

    // WebRTC signaling handlers
    socket.on('offer', (data) => {
      const { offer, targetUserId } = data;
      console.log(`📡 WebRTC offer from ${userId} to ${targetUserId}`);
      
      // Forward offer to target user
      socket.to(targetUserId).emit('offer', {
        offer,
        fromUserId: userId
      });
    });

    socket.on('answer', (data) => {
      const { answer, targetUserId } = data;
      console.log(`📡 WebRTC answer from ${userId} to ${targetUserId}`);
      
      // Forward answer to target user
      socket.to(targetUserId).emit('answer', {
        answer,
        fromUserId: userId
      });
    });

    socket.on('ice-candidate', (data) => {
      const { candidate, targetUserId } = data;
      console.log(`📡 ICE candidate from ${userId} to ${targetUserId}`);
      
      // Forward ICE candidate to target user
      socket.to(targetUserId).emit('ice-candidate', {
        candidate,
        fromUserId: userId
      });
    });

    // Participant settings update handler
    socket.on('participant_settings_update', (data) => {
      const { sessionId, settings } = data;
      console.log(`🎨 Participant settings update from ${userId} in session ${sessionId}`);
      
      // Forward settings update to all other participants in the session
      socket.to(sessionId).emit('participant_settings_update', {
        userId,
        settings
      });
    });

    // Request settings handler
    socket.on('request-settings', (data) => {
      const { targetUserId } = data;
      console.log(`📋 Settings requested by ${userId} from ${targetUserId}`);
      
      // Forward request to target user
      socket.to(targetUserId).emit('request-settings', {
        fromUserId: userId
      });
    });
    
    socket.on('disconnect', () => {
      console.log(`🔌 WebSocket disconnected: ${userId}`);
      
      // Clean up from all sessions
      if (global.coStreamConnections) {
        global.coStreamConnections.forEach((connections, sessionId) => {
          if (connections.has(userId)) {
            connections.delete(userId);
            socket.to(sessionId).emit('participant-left', { userId });
          }
        });
      }
    });
  });

  const server = await registerRoutes(app, wsInstance, io);
  
  // Initialize temporary file cleanup service
  console.log('🧹 Initializing temporary file cleanup service...');
  tempFileCleanup.initialize();
  


  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Add a specific catch-all for API routes that returns 404 if not found
  app.all('/api/*', (req, res) => {
    console.log(`❌ API route not found: ${req.method} ${req.url}`);
    res.status(404).json({ 
      error: 'API endpoint not found', 
      method: req.method, 
      url: req.url 
    });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  const host = process.platform === 'win32' ? 'localhost' : '0.0.0.0';
  httpServer.listen({
    port,
    host,
    reusePort: process.platform !== 'win32', // Disable reusePort on Windows
  }, () => {
    log(`serving on ${host}:${port}`);
  });
})();
