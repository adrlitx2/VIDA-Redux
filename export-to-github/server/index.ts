import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { tempFileCleanup } from "./services/temp-file-cleanup";

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

// Add request logging for ALL requests to debug routing
app.use((req, res, next) => {
  console.log(`🌐 ALL REQUESTS: ${req.method} ${req.url}`);
  if (req.url.includes('/api/')) {
    console.log(`📥 API REQUEST: ${req.method} ${req.url}`);
    console.log(`📥 Headers:`, {
      'content-type': req.headers['content-type'],
      'authorization': req.headers.authorization ? 'Bearer [present]' : 'none',
      'content-length': req.headers['content-length']
    });
    
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
  const server = await registerRoutes(app);
  
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
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
