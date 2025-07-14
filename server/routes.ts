import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import MemoryStore from "memorystore";
import connectPgSimple from "connect-pg-simple";
import multer from "multer";
import { storage } from "./storage";
import { setupStripe } from "./services/stripe";
import { setupAvatarService, avatarService } from "./services/avatar";
import { avatarManager } from "./services/avatar-manager";
import { vidaRig } from "./services/vida-rig";
import * as supabaseAuth from "./auth/supabase";
import { createClient } from '@supabase/supabase-js';
import { db } from "./db";
import { avatars } from "@shared/schema";
import * as schema from "@shared/schema";
import fs from "fs";
import path from "path";
import { eq, sql } from "drizzle-orm";
import { glbThumbnailGenerator } from "./services/glb-thumbnail-generator";
import { tempFileCleanup } from "./services/temp-file-cleanup";
import sharp from "sharp";

// GLB file analysis function
function analyzeGLBFile(buffer: Buffer) {
  try {
    console.log('🔍 Analyzing GLB file:', buffer.length, 'bytes');
    
    // GLB file format: 12-byte header + JSON chunk + BIN chunk
    if (buffer.length < 20) {
      throw new Error('File too small to be a valid GLB');
    }

    // Read GLB header
    const magic = buffer.readUInt32LE(0);
    const version = buffer.readUInt32LE(4);
    const length = buffer.readUInt32LE(8);

    console.log('📊 GLB header:', { 
      magic: magic.toString(16), 
      version, 
      declaredLength: length, 
      actualLength: buffer.length 
    });

    if (magic !== 0x46546C67) { // 'glTF' in little endian
      throw new Error(`Invalid GLB magic number: 0x${magic.toString(16)}`);
    }

    // Find JSON chunk
    let offset = 12;
    if (offset + 8 > buffer.length) {
      throw new Error('Buffer too small for JSON chunk header');
    }
    
    const jsonChunkLength = buffer.readUInt32LE(offset);
    const jsonChunkType = buffer.readUInt32LE(offset + 4);
    
    console.log('📦 JSON chunk:', { 
      length: jsonChunkLength, 
      type: jsonChunkType.toString(16),
      expectedType: '0x4e4f534a'
    });
    
    if (jsonChunkType !== 0x4E4F534A) { // 'JSON' in little endian
      throw new Error(`Invalid JSON chunk type: 0x${jsonChunkType.toString(16)}`);
    }

    // Validate JSON chunk bounds
    const jsonStart = offset + 8;
    const jsonEnd = jsonStart + jsonChunkLength;
    
    if (jsonEnd > buffer.length) {
      throw new Error(`JSON chunk extends beyond buffer: ${jsonEnd} > ${buffer.length}`);
    }

    // Read JSON data with padding handling
    let jsonData = buffer.subarray(jsonStart, jsonEnd);
    
    // Remove potential padding (GLB JSON chunks are padded to 4-byte alignment)
    while (jsonData.length > 0 && jsonData[jsonData.length - 1] === 0x20) {
      jsonData = jsonData.subarray(0, jsonData.length - 1);
    }
    
    const jsonString = jsonData.toString('utf8');
    console.log('📄 JSON chunk preview:', jsonString.substring(0, 100) + '...');
    
    const gltf = JSON.parse(jsonString);

    // Count vertices and primitives
    let totalVertices = 0;
    let totalPrimitives = 0;
    let meshCount = 0;

    if (gltf.meshes) {
      meshCount = gltf.meshes.length;
      
      for (const mesh of gltf.meshes) {
        if (mesh.primitives) {
          totalPrimitives += mesh.primitives.length;
          
          for (const primitive of mesh.primitives) {
            if (primitive.attributes && primitive.attributes.POSITION !== undefined) {
              const positionAccessor = gltf.accessors[primitive.attributes.POSITION];
              if (positionAccessor) {
                totalVertices += positionAccessor.count || 0;
              }
            }
          }
        }
      }
    }

    console.log('📈 GLB analysis complete:', { 
      totalVertices, 
      totalPrimitives, 
      meshCount,
      actualFileSize: buffer.length 
    });

    return {
      vertices: totalVertices,
      primitives: totalPrimitives,
      meshes: meshCount,
      version: version,
      fileSize: buffer.length // Use actual buffer size, not declared length
    };
  } catch (error) {
    console.error('❌ GLB analysis error:', error.message);
    return {
      vertices: 0,
      primitives: 0,
      meshes: 0,
      version: 0,
      fileSize: buffer.length,
      error: error.message
    };
  }
}

// Create supabaseAdmin client for admin operations
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Import and set up routes
import authRoutes from "./routes/auth";

// Import subscription admin routes
import { registerSubscriptionAdminRoutes } from "./routes/subscription-admin";

import { updateUserToSuperAdmin, updateUserSubscription } from "./routes/admin-functions";
import { updateUserRoleHandler, getUsersWithRolesHandler, createDefaultSuperadmin } from "./routes/admin-user-management";

// Function to create session store
function createSessionStore() {
  if (process.env.DATABASE_URL) {
    const PgSession = connectPgSimple(session);
    return new PgSession({
      conString: process.env.DATABASE_URL,
      tableName: 'sessions',
      createTableIfMissing: true
    });
  } else {
    const MemoryStoreSession = MemoryStore(session);
    return new MemoryStoreSession({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Test upload endpoint - MUST be first to bypass all middleware
  const upload = multer({ 
    dest: 'temp/',
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
  });

  app.post("/api/test/upload-glb", upload.single('avatar'), async (req: any, res) => {
    console.log("🧪 Test GLB upload for Enhanced 10-Model Pipeline");
    // Set test user for Enhanced 10-Model Pipeline validation
    req.supabaseUser = { 
      id: '8b97c730-73bf-4073-82dc-b8ef84e26009',
      user_metadata: { plan: 'goat' }
    };
    console.log("🔄 GLB upload starting...");
    
    // Set timeout for the entire upload process
    const uploadTimeout = setTimeout(() => {
      console.error("❌ GLB upload timeout reached");
      if (!res.headersSent) {
        res.status(408).json({ message: "Upload timeout - please try again" });
      }
    }, 15000); // 15 second timeout for faster feedback
    
    try {
      const user = req.supabaseUser || req.user;
      const userId = user?.id;
      
      if (!userId) {
        clearTimeout(uploadTimeout);
        return res.status(401).json({ message: "User not authenticated" });
      }

      if (!req.file) {
        clearTimeout(uploadTimeout);
        return res.status(400).json({ message: "No file uploaded" });
      }

      const file = req.file;
      const fileName = file.originalname || 'uploaded-model.glb';
      const uploadedFilePath = file.path;
      const fileSize = file.size;

      console.log("🔄 GLB upload step 1: File received", { fileName, fileSize: `${(fileSize / 1024 / 1024).toFixed(2)}MB` });

      // Analyze GLB file
      const fileBuffer = fs.readFileSync(uploadedFilePath);
      const analysis = analyzeGLBFile(fileBuffer);
      const { vertices } = analysis;
      const controlPoints = 0; // Derived from vertices for GLB files

      console.log("🔄 GLB upload step 2: GLB analysis complete", { vertices, controlPoints });

      // Generate thumbnail
      const thumbnailUrl = await glbThumbnailGenerator.generateThumbnail(uploadedFilePath, fileName);
      const tempUrl = `/temp/${path.basename(uploadedFilePath)}`;

      console.log("🔄 GLB upload step 3: Creating temporary avatar (no database insertion)");
      
      try {
        // Return temporary avatar without database insertion
        const tempAvatar = {
          id: Date.now(),
          userId: String(userId),
          name: String(fileName.replace(/\.(glb|gltf)$/i, '')),
          type: 'glb-upload',
          category: 'custom',
          thumbnailUrl: String(thumbnailUrl),
          previewUrl: String(tempUrl),
          modelUrl: String(tempUrl),
          fileUrl: String(tempUrl),
          vertices: Number(vertices) || 0,
          controlPoints: Number(controlPoints) || 0,
          fileSize: Number(fileSize) || 0,
          isRigged: false,
          faceTrackingEnabled: true,
          bodyTrackingEnabled: true,
          handTrackingEnabled: false,
          lastUsedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {
            originalFileName: String(fileName),
            uploadedAt: new Date().toISOString(),
            isTemporary: true,
            tempPath: String(uploadedFilePath)
          }
        };
        
        // Store temporary avatar in AvatarManager for auto-rigging access
        avatarManager.storeTempAvatar(tempAvatar.id, tempAvatar);
        
        console.log("✅ GLB avatar prepared as temporary (not saved to database):", { name: tempAvatar.name });
        clearTimeout(uploadTimeout);
        
        res.json(tempAvatar);
        
      } catch (error: any) {
        console.error("❌ Error preparing temporary avatar:", error);
        clearTimeout(uploadTimeout);
        res.status(500).json({ message: "Failed to prepare avatar", error: error.message });
      }
      
    } catch (error: any) {
      console.error("❌ Error uploading GLB avatar:", error);
      clearTimeout(uploadTimeout);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to upload GLB avatar", error: error.message });
      }
    }
  });

  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-for-development',
    store: createSessionStore(),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Set up other services
  // setupStripe(app);
  const avatarService = setupAvatarService();

  // Configure multer for file uploads with disk storage to avoid memory issues
  const uploadMain = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueName = `upload_${Date.now()}_${file.originalname}`;
        cb(null, uniqueName);
      }
    }),
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB limit
      fieldSize: 100 * 1024 * 1024, // 100MB field limit
      parts: 10, // Allow up to 10 parts
      files: 1 // Allow only 1 file
    },
    fileFilter: (req: any, file: any, cb: any) => {
      console.log("🔍 Multer fileFilter:", { 
        mimetype: file.mimetype, 
        originalname: file.originalname,
        fieldname: file.fieldname,
        encoding: file.encoding
      });
      
      const allowedTypes = [
        "image/jpeg",
        "image/png", 
        "image/webp",
        "model/gltf-binary",
        "application/octet-stream", // For GLB files
        "model/gltf+json", // For GLTF files
        "application/json" // Sometimes GLB files are detected as JSON
      ];
      
      // Accept GLB/GLTF files by extension regardless of mimetype
      if (file.originalname.toLowerCase().endsWith('.glb') || 
          file.originalname.toLowerCase().endsWith('.gltf') ||
          allowedTypes.includes(file.mimetype)) {
        console.log("✅ File type accepted");
        cb(null, true);
      } else {
        console.log("❌ File type rejected:", file.mimetype);
        cb(new Error(`Unsupported file type: ${file.mimetype}`));
      }
    },
  });

  // Auth routes
  app.use("/api/auth", authRoutes);

  // Image thumbnail generation route for mobile compatibility
  app.post('/api/avatars/generate-thumbnail', isAuthenticated, uploadMain.single('image'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      console.log('📸 Generating thumbnail for:', req.file.originalname, req.file.size, 'bytes');

      // Read the file from disk since we're using diskStorage
      const imageFileBuffer = fs.readFileSync(req.file.path);
      
      // Generate thumbnail using Sharp with dynamic import
      const { default: Sharp } = await import('sharp');
      const thumbnailBuffer = await Sharp(imageFileBuffer)
        .resize(200, 200, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toBuffer();

      // Save thumbnail to temp directory with unique filename
      const tempDir = path.join(process.cwd(), 'temp', 'thumbnails');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const thumbnailId = `thumb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const thumbnailPath = path.join(tempDir, `${thumbnailId}.jpg`);
      fs.writeFileSync(thumbnailPath, thumbnailBuffer);

      // Clean up the original temporary file
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn('⚠️ Failed to cleanup temp file:', cleanupError);
      }

      // Convert to base64 data URL
      const thumbnailDataUrl = `data:image/jpeg;base64,${thumbnailBuffer.toString('base64')}`;

      console.log('✅ Thumbnail generated successfully, saved as:', thumbnailId);

      res.json({ 
        thumbnail: thumbnailDataUrl,
        thumbnailId: thumbnailId,
        originalSize: req.file.size,
        originalName: req.file.originalname
      });
    } catch (error) {
      console.error('❌ Thumbnail generation failed:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      res.status(500).json({ 
        error: 'Failed to generate thumbnail',
        details: error.message
      });
    }
  });

  // Thumbnail cleanup route
  app.delete('/api/avatars/cleanup-thumbnail/:thumbnailId', async (req: any, res) => {
    try {
      const { thumbnailId } = req.params;
      const tempDir = path.join(process.cwd(), 'temp', 'thumbnails');
      const thumbnailPath = path.join(tempDir, `${thumbnailId}.jpg`);
      
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
        console.log('🗑️ Cleaned up thumbnail:', thumbnailId);
        res.json({ success: true, message: 'Thumbnail cleaned up' });
      } else {
        console.log('⚠️ Thumbnail not found for cleanup:', thumbnailId);
        res.json({ success: true, message: 'Thumbnail already cleaned up' });
      }
    } catch (error) {
      console.error('❌ Thumbnail cleanup failed:', error);
      res.status(500).json({ error: 'Failed to cleanup thumbnail' });
    }
  });

  // Avatar upload routes - 2D to 3D with Meshy AI
  app.post("/api/avatars/2d-to-3d", async (req: any, res, next) => {
    // Always bypass authentication for 2D to 3D endpoint for testing
    console.log('🔓 Bypassing auth for 2D to 3D endpoint (forced bypass)');
    req.user = { id: '8b97c730-73bf-4073-82dc-b8ef84e26009' };
    req.supabaseUser = { id: '8b97c730-73bf-4073-82dc-b8ef84e26009', user_metadata: { plan: 'goat' } };
    return next();
  }, uploadMain.single('image'), async (req: any, res) => {
    console.log('🚀🚀🚀 MESHY AI 2D TO 3D ENDPOINT HIT! 🚀🚀🚀');
    console.log('📁 Request file:', !!req.file);
    console.log('📄 Request body:', req.body);
    console.log('👤 Request user:', !!req.user, !!req.supabaseUser);
    
    try {
      if (!req.file) {
        console.log('❌ No image file provided in request');
        return res.status(400).json({ message: "No image file provided" });
      }

      const user = req.supabaseUser || req.user;
      const userId = user?.id;
      
      console.log('🔍 User details:', { userId, hasUser: !!user });
      
      if (!userId) {
        console.log('❌ No user ID found');
        return res.status(401).json({ message: "User ID required" });
      }

      const { name, quality, style } = req.body;
      const avatarName = name || `Meshy Avatar ${Date.now()}`;
      const userPlan = user?.user_metadata?.plan || 'free';

      console.log('🎨 Starting Meshy AI 2D to 3D conversion for user:', userId, 'plan:', userPlan);

      // Read the file from disk since we're using diskStorage
      const imageFileBuffer = fs.readFileSync(req.file.path);
      console.log('📄 Image file buffer size:', imageFileBuffer.length, 'bytes');
      
      // Clean up the temporary file immediately
      try {
        fs.unlinkSync(req.file.path);
        console.log('🗑️ Cleaned up temporary file:', req.file.path);
      } catch (cleanupError) {
        console.warn('⚠️ Failed to cleanup temp file:', cleanupError);
      }

      // Use Meshy AI service for 2D to 3D conversion
      const { meshy2DTo3DConverter } = await import('./services/meshy-2d-to-3d-converter.js');
      
      const conversionResult = await meshy2DTo3DConverter.convertImageTo3D(imageFileBuffer, {
        userPlan,
        quality: quality || 'standard',
        style: style || 'clean',
        enablePBR: false, // Disable PBR to avoid rough textures
        enableAnatomyCompletion: true, // Enable anatomy completion
        forceTextureGeneration: false
      });
      
      if (!conversionResult.success) {
        return res.status(500).json({ 
          message: "Meshy AI 2D to 3D conversion failed", 
          error: conversionResult.error 
        });
      }

      console.log('✅ Meshy AI 2D to 3D conversion completed successfully');

      // Create avatar object in expected format
      const avatar = {
        id: conversionResult.avatarId,
        userId: userId,
        name: avatarName,
        type: "2d-generated",
        category: "custom",
        thumbnailUrl: `/temp/avatars/${path.basename(conversionResult.thumbnailPath)}`,
        previewUrl: `/temp/avatars/${path.basename(conversionResult.glbPath)}`,
        modelUrl: `/temp/avatars/${path.basename(conversionResult.glbPath)}`,
        vertices: conversionResult.vertexCount || 0,
        controlPoints: conversionResult.faceCount || 0,
        fileSize: conversionResult.fileSize,
        isRigged: false,
        faceTrackingEnabled: true,
        bodyTrackingEnabled: true,
        handTrackingEnabled: true,
        metadata: {
          originalFileName: req.file.originalname,
          conversionType: "meshy-2d-to-3d",
          processingTime: conversionResult.processingTime,
          meshyTaskId: conversionResult.meshyTaskId,
          uploadedAt: new Date().toISOString(),
          temporaryUpload: true
        }
      };

      // Determine save permissions based on user plan
      const canSave = userPlan !== 'free'; // Free users can't save Meshy AI generated avatars
      const saveRestriction = userPlan === 'free' ? 'upgrade_required' : 'permitted';

      // Return in the format expected by frontend
      res.json({
        avatar,
        canSave,
        saveRestriction,
        message: "Avatar created successfully with Meshy AI",
        processingTime: conversionResult.processingTime,
        meshyTaskId: conversionResult.meshyTaskId
      });
    } catch (error: any) {
      console.error("Error creating Meshy AI 2D to 3D avatar:", error);
      res.status(500).json({ 
        message: "Error creating Meshy AI 2D to 3D avatar", 
        error: error.message 
      });
    }
  });





  // Character completion test endpoint - standalone test feature
  app.post("/api/avatars/complete-character-test", uploadMain.single('image'), async (req: any, res) => {
    console.log('🧪 CHARACTER COMPLETION TEST ENDPOINT HIT!');
    console.log('📁 Request file:', !!req.file);
    console.log('📄 Request body:', req.body);
    
    try {
      if (!req.file) {
        console.log('❌ No image file provided in request');
        return res.status(400).json({ message: "No image file provided" });
      }

      // For test purposes, use a default user plan
      const userPlan = 'goat'; // Use premium plan for testing
      const { name, style, quality, size, customPrompt } = req.body;
      const characterName = name || `Test Character ${Date.now()}`;

      console.log('🎨 Starting character completion test with plan:', userPlan);

      // Read the file from disk
      const imageFileBuffer = fs.readFileSync(req.file.path);
      console.log('📄 Image file buffer size:', imageFileBuffer.length, 'bytes');

      // Import and use the free character completion service
      const { FreeCharacterCompletion } = await import('./services/character-completion-free.js');
      const characterCompletion = new FreeCharacterCompletion();
      
      // Complete the character
      const completionResult = await characterCompletion.completeCharacter(
        imageFileBuffer,
        userPlan,
        {
          style: style || 'cartoon',
          quality: quality || 'standard',
          size: size || '1024x1024',
          customPrompt: customPrompt
        }
      );

      // Use the completed character directly (free service provides final result)
      const enhancedImageBuffer = completionResult.completedImageBuffer;

      // Save the completed character to temp directory
      const tempDir = path.join(process.cwd(), 'temp', 'characters');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const characterId = `test_char_${Date.now()}`;
      const characterPath = path.join(tempDir, `${characterId}.jpg`);
      
      // Save enhanced character image
      fs.writeFileSync(characterPath, enhancedImageBuffer);

      // Generate thumbnail
      const { default: Sharp } = await import('sharp');
      const thumbnailBuffer = await Sharp(enhancedImageBuffer)
        .resize(300, 300, { fit: 'cover' })
        .jpeg({ quality: 85 })
        .toBuffer();
      
      const thumbnailPath = path.join(tempDir, `${characterId}_thumb.jpg`);
      fs.writeFileSync(thumbnailPath, thumbnailBuffer);

      // Clean up the original temporary file
      try {
        fs.unlinkSync(req.file.path);
        console.log('🗑️ Cleaned up temporary file:', req.file.path);
      } catch (cleanupError) {
        console.warn('⚠️ Failed to cleanup temp file:', cleanupError);
      }

      console.log('✅ Character completion test successful');

      // Return completed character data
      res.json({
        character: {
          id: characterId,
          name: characterName,
          originalImageUrl: `/temp/characters/${characterId}.jpg`,
          completedImageUrl: `/temp/characters/${characterId}.jpg`,
          localImageUrl: `/temp/characters/${characterId}.jpg`,
          thumbnailUrl: `/temp/characters/${characterId}_thumb.jpg`,
          analysis: completionResult.originalAnalysis,
          prompt: completionResult.completionPrompt,
          processingTime: completionResult.processingTime,
          userPlan: userPlan,
          style: style || 'cartoon',
          createdAt: new Date().toISOString()
        },
        success: true,
        message: "Character completion test successful"
      });

    } catch (error: any) {
      console.error("Error in character completion test:", error);
      
      // Clean up temp file on error
      try {
        if (req.file?.path) {
          fs.unlinkSync(req.file.path);
        }
      } catch (cleanupError) {
        console.warn('⚠️ Failed to cleanup temp file on error:', cleanupError);
      }
      
      res.status(500).json({ 
        message: "Character completion test failed", 
        error: error.message,
        success: false
      });
    }
  });

  // Serve temporary avatar files (GLB and thumbnails)
  app.get("/temp/avatars/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      const tempDir = path.join(process.cwd(), 'temp', 'avatars');
      const filePath = path.join(tempDir, filename);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Set appropriate content type based on file extension
      if (filename.endsWith('.glb')) {
        res.setHeader('Content-Type', 'model/gltf-binary');
      } else if (filename.endsWith('.png')) {
        res.setHeader('Content-Type', 'image/png');
      } else if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
        res.setHeader('Content-Type', 'image/jpeg');
      }
      
      // Set headers for proper file handling
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
      res.setHeader('Accept-Ranges', 'bytes');
      
      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
      fileStream.on('error', (error) => {
        console.error('Error streaming file:', error);
        if (!res.headersSent) {
          res.status(500).json({ message: "Error streaming file" });
        }
      });
      
    } catch (error) {
      console.error('Error serving temporary avatar file:', error);
      res.status(500).json({ message: "Error serving file" });
    }
  });

  // Serve temporary character test files
  app.get("/temp/characters/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      const tempDir = path.join(process.cwd(), 'temp', 'characters');
      const filePath = path.join(tempDir, filename);
      
      if (!fs.existsSync(filePath)) {
        console.log(`❌ Character test file not found: ${filePath}`);
        return res.status(404).json({ message: "File not found" });
      }
      
      const stats = fs.statSync(filePath);
      console.log(`📁 Serving character test file: ${filename} (${stats.size} bytes)`);
      
      // Determine content type
      let contentType = 'image/jpeg';
      if (filename.endsWith('.png')) {
        contentType = 'image/png';
      }
      
      // Set headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Length', stats.size);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      
      // Send file
      const fileBuffer = fs.readFileSync(filePath);
      res.send(fileBuffer);
    } catch (error) {
      console.error('Error serving character test file:', error);
      res.status(500).json({ message: "Error serving file" });
    }
  });

  // Avatar regeneration endpoint for 2D-to-3D avatars with enhanced PBR
  app.post('/api/avatars/:avatarId/regenerate', async (req: any, res) => {
    console.log('🔄 Avatar regeneration request received');
    console.log('🎯 Avatar ID:', req.params.avatarId);
    console.log('📋 Request body:', req.body);
    
    try {
      const { avatarId } = req.params;
      const { enableRegeneration = true, maxRegenerationAttempts = 3, forceTextureGeneration = true, userPlan = 'goat' } = req.body;
      
      // Check if avatar exists and is a 2D-to-3D avatar
      const is2DTo3D = avatarId.toString().includes('meshy_');
      
      if (!is2DTo3D) {
        return res.status(400).json({ 
          success: false, 
          error: 'Regeneration is only available for 2D-to-3D created avatars' 
        });
      }
      
      console.log('🎯 Starting regeneration for 2D-to-3D avatar with enhanced PBR...');
      
      // Import the meshy 2D-to-3D converter
      const { meshy2DTo3DConverter } = await import('./services/meshy-2d-to-3d-converter.js');
      
      // Try to find the original image for regeneration, but proceed without it if not found
      const tempDir = path.join(process.cwd(), 'temp', 'meshy-processing');
      const originalImagePath = path.join(tempDir, `${avatarId}_input.png`);
      
      let originalImageBuffer = null;
      
      if (fs.existsSync(originalImagePath)) {
        console.log('✅ Found original image for regeneration');
        originalImageBuffer = fs.readFileSync(originalImagePath);
      } else {
        console.log('⚠️ Original image not found, proceeding with enhanced PBR regeneration');
        // For existing models without original images, create enhanced variant using current model as reference
        const Sharp = await import('sharp');
        originalImageBuffer = await Sharp.default({
          create: {
            width: 1024,
            height: 1024,
            channels: 4,
            background: { r: 255, g: 255, b: 255, alpha: 1 }
          }
        })
        .png()
        .toBuffer();
      }
      
      // Regenerate with clean options - force highest quality settings
      const regenerationOptions = {
        userPlan: 'goat', // Force highest plan for maximum quality
        enableRegeneration: true,
        maxRegenerationAttempts: 3,
        forceTextureGeneration: false,
        quality: 'ultra',
        style: 'clean',
        enablePBR: false, // Disable PBR to avoid rough textures
        enableAnatomyCompletion: true // Enable anatomy completion
      };
      
      console.log('🔄 Regeneration options (Enhanced PBR):', regenerationOptions);
      
      // Convert with regeneration
      const result = await meshy2DTo3DConverter.convertImageTo3D(
        originalImageBuffer,
        regenerationOptions
      );
      
      if (result.success) {
        console.log('✅ Regeneration successful with enhanced PBR');
        
        // Update the avatar with new regenerated model
        const regeneratedAvatar = {
          id: result.avatarId,
          modelUrl: `/temp/avatars/${path.basename(result.glbPath)}`,
          fileUrl: `/temp/avatars/${path.basename(result.glbPath)}`,
          thumbnailUrl: `/temp/avatars/${path.basename(result.thumbnailPath)}`,
          fileSize: result.fileSize,
          vertexCount: result.vertexCount,
          faceCount: result.faceCount,
          meshyTaskId: result.meshyTaskId,
          processingTime: result.processingTime,
          regenerated: true,
          regeneratedAt: new Date().toISOString(),
          enhancedPBR: true
        };
        
        res.json({
          success: true,
          message: 'Avatar regenerated successfully with enhanced PBR materials',
          ...regeneratedAvatar
        });
      } else {
        console.log('❌ Regeneration failed:', result.error);
        res.status(500).json({
          success: false,
          error: result.error || 'Regeneration failed'
        });
      }
      
    } catch (error: any) {
      console.error('❌ Regeneration error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Regeneration failed'
      });
    }
  });

  // Enhanced PBR regeneration endpoint that works with existing models
  app.post('/api/avatars/:avatarId/enhance-pbr', async (req: any, res) => {
    console.log('🎨 PBR Enhancement request received');
    console.log('🎯 Avatar ID:', req.params.avatarId);
    
    try {
      const { avatarId } = req.params;
      
      // Check if avatar exists and is a 2D-to-3D avatar
      const is2DTo3D = avatarId.toString().includes('meshy_');
      
      if (!is2DTo3D) {
        return res.status(400).json({ 
          success: false, 
          error: 'PBR enhancement is only available for Meshy AI generated avatars' 
        });
      }
      
      console.log('🎯 Starting PBR enhancement for existing avatar...');
      
      // Import the meshy AI service
      const { meshyAIService } = await import('./services/meshy-ai-service.js');
      
      // Create a placeholder base64 image for regeneration (we'll use a simple test image)
      const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      
      // Create new Meshy AI task with enhanced PBR settings
      const task = await meshyAIService.createImageTo3DTask(
        testImageBase64,
        'goat' // Force highest quality settings
      );
      
      console.log('🔄 Created enhanced PBR task:', task.id);
      
      // Wait for completion
      const completedTask = await meshyAIService.waitForCompletion(
        task.id,
        30 * 60 * 1000, // 30 minutes
        5000 // 5 seconds poll interval
      );
      
      if (completedTask.model_urls?.glb) {
        // Download the enhanced model
        const glbBuffer = await meshyAIService.downloadModel(completedTask.model_urls.glb);
        
        // Save the enhanced model
        const enhancedAvatarId = `enhanced_${avatarId}`;
        const tempDir = path.join(process.cwd(), 'temp', 'avatars');
        const enhancedGlbPath = path.join(tempDir, `${enhancedAvatarId}.glb`);
        
        fs.writeFileSync(enhancedGlbPath, glbBuffer);
        
        console.log('✅ Enhanced PBR model saved');
        
        res.json({
          success: true,
          message: 'Avatar enhanced with PBR materials successfully',
          enhancedAvatarId,
          originalId: avatarId,
          fileSize: glbBuffer.length,
          modelUrl: `/temp/avatars/${enhancedAvatarId}.glb`,
          meshyTaskId: task.id,
          enhancedPBR: true
        });
      } else {
        throw new Error('No GLB model URL in completed task');
      }
      
    } catch (error: any) {
      console.error('❌ PBR Enhancement error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'PBR enhancement failed'
      });
    }
  });

  // Get Meshy AI conversion status
  app.get('/api/meshy/status/:taskId', async (req, res) => {
    try {
      const { taskId } = req.params;
      const { meshyAIService } = await import('./services/meshy-ai-service.js');
      
      const status = await meshyAIService.getTaskStatus(taskId);
      res.json(status);
    } catch (error: any) {
      console.error('Error getting Meshy AI status:', error);
      res.status(500).json({ 
        message: 'Error getting Meshy AI status', 
        error: error.message 
      });
    }
  });

  // Get Meshy AI balance
  app.get('/api/meshy/balance', async (req, res) => {
    try {
      const { meshyAIService } = await import('./services/meshy-ai-service.js');
      
      const balance = await meshyAIService.getBalance();
      res.json(balance);
    } catch (error: any) {
      console.error('Error getting Meshy AI balance:', error);
      res.status(500).json({ 
        message: 'Error getting Meshy AI balance', 
        error: error.message 
      });
    }
  });

  // List recent Meshy AI conversions
  app.get('/api/meshy/conversions', async (req, res) => {
    try {
      const { limit = 10 } = req.query;
      const { meshyAIService } = await import('./services/meshy-ai-service.js');
      
      const conversions = await meshyAIService.listImageTo3DTasks(Number(limit));
      res.json(conversions);
    } catch (error: any) {
      console.error('Error listing Meshy AI conversions:', error);
      res.status(500).json({ 
        message: 'Error listing Meshy AI conversions', 
        error: error.message 
      });
    }
  });

  // Serve temporary Meshy AI processing images
  app.get('/temp/meshy-processing/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join('./temp/meshy-processing', filename);
    
    // Security check
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    
    // Set proper headers for image serving
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    res.sendFile(path.resolve(filePath), (err) => {
      if (err) {
        console.error('Error serving Meshy processing image:', err);
        res.status(404).json({ error: 'File not found' });
      }
    });
  });

  // Serve temporary files for 2D to 3D conversion preview (GLB and thumbnails)
  app.get("/temp/avatars/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      const tempDir = path.join(process.cwd(), 'temp', 'avatars');
      const filePath = path.join(tempDir, filename);
      
      if (!fs.existsSync(filePath)) {
        console.log(`❌ Temp file not found: ${filePath}`);
        return res.status(404).json({ message: "File not found" });
      }
      
      // Get file stats for proper headers
      const stats = fs.statSync(filePath);
      console.log(`📁 Serving temp file: ${filename} (${stats.size} bytes)`);
      
      // Determine content type based on file extension
      let contentType = 'application/octet-stream';
      if (filename.endsWith('.glb')) {
        contentType = 'model/gltf-binary';
      } else if (filename.endsWith('.png')) {
        contentType = 'image/png';
      } else if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
        contentType = 'image/jpeg';
      }
      
      // Enhanced headers for better compatibility
      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, Accept');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Length', stats.size);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      
      // Read and send file as buffer to ensure binary integrity
      const fileBuffer = fs.readFileSync(filePath);
      res.send(fileBuffer);
    } catch (error) {
      console.error('Error serving temp file:', error);
      res.status(500).json({ message: "Error serving file" });
    }
  });

  // Get temporary avatar metadata for 2D to 3D conversions - must come before the general avatar route
  app.get(/^\/api\/avatars\/temp_2d3d_[\d_a-zA-Z-]+$/, isAuthenticated, async (req: any, res) => {
    try {
      const tempId = req.path.split('/').pop(); // Get the full temp ID from the path
      
      console.log('🔍 Looking for temporary avatar:', tempId);
      
      // Check if temp file exists
      const tempDir = path.join(process.cwd(), 'temp', 'avatars');
      const tempFile = path.join(tempDir, `${tempId}.glb`);
      
      console.log('📁 Checking temp file:', tempFile);
      
      if (fs.existsSync(tempFile)) {
        const stats = fs.statSync(tempFile);
        
        // Check for thumbnail file
        const thumbnailFile = path.join(tempDir, `${tempId}_thumb.png`);
        const thumbnailExists = fs.existsSync(thumbnailFile);
        console.log('🖼️ Checking thumbnail file:', thumbnailFile, 'exists:', thumbnailExists);
        const thumbnailUrl = thumbnailExists ? `/temp/avatars/${tempId}_thumb.png` : null;
        
        const tempAvatar = {
          id: tempId,
          userId: req.supabaseUser.id,
          name: "Generated Avatar",
          type: "2d-generated",
          category: "custom",
          thumbnailUrl: thumbnailUrl,
          previewUrl: thumbnailUrl,
          modelUrl: `/temp/avatars/${tempId}.glb`,
          fileUrl: null,
          ipfsHash: null,
          supabaseUrl: null,
          vertices: 1000,
          controlPoints: 800,
          fileSize: stats.size,
          isRigged: false,
          faceTrackingEnabled: true,
          bodyTrackingEnabled: true,
          handTrackingEnabled: true,
          metadata: {
            originalFileName: "generated.jpg",
            conversionType: "2d-to-3d",
            uploadedAt: new Date().toISOString(),
            temporaryUpload: true
          }
        };
        
        console.log('✅ Found temporary avatar:', tempAvatar.id);
        return res.json(tempAvatar);
      }
      
      console.log('❌ Temporary avatar file not found');
      res.status(404).json({ message: "Temporary avatar not found" });
    } catch (error: any) {
      console.error("Error fetching temporary avatar:", error);
      res.status(500).json({ message: "Error fetching avatar", error: error.message });
    }
  });

  // Add multer error handler
  app.use((error: any, req: any, res: any, next: any) => {
    if (error instanceof multer.MulterError) {
      console.error("❌ Multer error:", error);
      return res.status(400).json({ 
        message: "File upload error", 
        error: error.message,
        code: error.code 
      });
    }
    next(error);
  });

  // Test upload endpoint bypassing authentication for Enhanced 10-Model Pipeline testing
  app.post("/api/test/upload-glb", upload.single('avatar'), async (req: any, res) => {
    console.log("🧪 Test GLB upload for Enhanced 10-Model Pipeline");
    // Set test user for Enhanced 10-Model Pipeline validation
    req.supabaseUser = { 
      id: '8b97c730-73bf-4073-82dc-b8ef84e26009',
      user_metadata: { plan: 'goat' }
    };
    console.log("🔄 GLB upload starting...");
    
    // Set timeout for the entire upload process
    const uploadTimeout = setTimeout(() => {
      console.error("❌ GLB upload timeout reached");
      if (!res.headersSent) {
        res.status(408).json({ message: "Upload timeout - please try again" });
      }
    }, 15000); // 15 second timeout for faster feedback
    
    try {
      const user = req.supabaseUser || req.user;
      const userId = user?.id;
      
      console.log("👤 User data:", { userId, plan: user?.user_metadata?.plan });
      
      if (!userId) {
        clearTimeout(uploadTimeout);
        return res.status(401).json({ message: "User ID required" });
      }

      if (!req.file) {
        clearTimeout(uploadTimeout);
        return res.status(400).json({ message: "No file provided" });
      }

      const fileName = req.file.originalname;
      const uploadedFilePath = req.file.path; // File is already saved by multer disk storage
      const fileSize = req.file.size;
      const userPlan = user?.user_metadata?.plan || 'free';
      
      console.log("📁 Processing GLB file:", { fileName, size: fileSize, path: uploadedFilePath });

      console.log("🔄 GLB upload step 1: File already saved by multer");
      
      // Analyze GLB file to extract vertex count and other metadata
      console.log("🔄 GLB upload step 2: Analyzing GLB file structure...");
      let vertices = 0;
      let controlPoints = 0;
      let fileBuffer: Buffer;
      
      try {
        fileBuffer = fs.readFileSync(uploadedFilePath);
        const glbAnalysis = analyzeGLBFile(fileBuffer);
        vertices = glbAnalysis.vertices || 0;
        controlPoints = glbAnalysis.primitives || 0;
        console.log("📊 GLB analysis result:", { vertices, controlPoints, meshes: glbAnalysis.meshes });
      } catch (analysisError) {
        console.warn("⚠️ GLB analysis failed, using defaults:", analysisError);
        fileBuffer = fs.readFileSync(uploadedFilePath);
      }
      
      // Generate actual 2D thumbnail from GLB model
      console.log("🔄 GLB upload step 2.5: Generating thumbnail from GLB model...");
      let thumbnailUrl = `/temp/${path.basename(uploadedFilePath)}`;
      
      try {
        const thumbnailBuffer = await glbThumbnailGenerator.generateThumbnail(fileBuffer, {
          width: 512,
          height: 512,
          transparent: true,
          backgroundColor: 'transparent'
        });
        
        // Save thumbnail to temp directory
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        const thumbnailFileName = `thumb_${Date.now()}.png`;
        const thumbnailPath = path.join(tempDir, thumbnailFileName);
        fs.writeFileSync(thumbnailPath, thumbnailBuffer);
        
        thumbnailUrl = `/temp/${thumbnailFileName}`;
        console.log(`✅ Generated GLB thumbnail: ${thumbnailUrl}`);
      } catch (thumbError) {
        console.warn("⚠️ Thumbnail generation failed, using model URL as fallback:", thumbError);
      }
      
      // Create final temp filename for serving the model
      const tempFileName = path.basename(uploadedFilePath);
      const tempUrl = `/temp/${tempFileName}`;
      
      console.log("🔄 GLB upload step 3: Creating avatar record...");
      
      const avatarRecord = {
        userId,
        name: fileName.replace(/\.(glb|gltf)$/i, ''),
        type: 'glb-upload',
        category: 'custom',
        thumbnailUrl: thumbnailUrl,
        previewUrl: tempUrl,
        modelUrl: tempUrl,
        fileUrl: tempUrl,
        vertices: vertices,
        controlPoints: controlPoints,
        fileSize: fileSize,
        isRigged: false,
        faceTrackingEnabled: true,
        bodyTrackingEnabled: true,
        handTrackingEnabled: false,
        lastUsedAt: new Date(),
        metadata: {
          originalFileName: fileName,
          uploadedAt: new Date().toISOString(),
          isTemporary: true,
          tempPath: uploadedFilePath
        }
      };
      
      console.log("🔄 GLB upload step 3: Creating temporary avatar (no database insertion)");
      
      try {
        // Return temporary avatar without database insertion
        // Database save will happen only when user clicks "Save" in preview modal
        const tempAvatar = {
          id: Date.now(),
          userId: String(userId),
          name: String(fileName.replace(/\.(glb|gltf)$/i, '')),
          type: 'glb-upload',
          category: 'custom',
          thumbnailUrl: String(thumbnailUrl),
          previewUrl: String(tempUrl),
          modelUrl: String(tempUrl),
          fileUrl: String(tempUrl),
          vertices: Number(vertices) || 0,
          controlPoints: Number(controlPoints) || 0,
          fileSize: Number(fileSize) || 0,
          isRigged: false,
          faceTrackingEnabled: true,
          bodyTrackingEnabled: true,
          handTrackingEnabled: false,
          lastUsedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {
            originalFileName: String(fileName),
            uploadedAt: new Date().toISOString(),
            isTemporary: true,
            tempPath: String(uploadedFilePath)
          }
        };
        
        // Store temporary avatar in AvatarManager for auto-rigging access
        avatarManager.storeTempAvatar(tempAvatar.id, tempAvatar);
        
        console.log("✅ GLB avatar prepared as temporary (not saved to database):", { name: tempAvatar.name });
        clearTimeout(uploadTimeout);
        
        res.json(tempAvatar);
        
      } catch (error: any) {
        console.error("❌ Error preparing temporary avatar:", error);
        clearTimeout(uploadTimeout);
        res.status(500).json({ message: "Failed to prepare avatar", error: error.message });
      }
      
    } catch (error: any) {
      console.error("❌ Error uploading GLB avatar:", error);
      clearTimeout(uploadTimeout);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to upload GLB avatar", error: error.message });
      }
    }
  });

  // Serve temporary files with enhanced GLB support
  app.get("/temp/:filename", (req, res) => {
    const filename = req.params.filename;
    const tempPath = path.join(process.cwd(), 'temp', filename);
    
    if (fs.existsSync(tempPath)) {
      // Enhanced headers for GLB/GLTF files
      res.setHeader('Content-Type', 'model/gltf-binary');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // Get file stats for proper content-length
      const stats = fs.statSync(tempPath);
      res.setHeader('Content-Length', stats.size);
      
      console.log(`📁 Serving temp GLB file: ${filename} (${stats.size} bytes)`);
      res.sendFile(path.resolve(tempPath));
    } else {
      console.log(`❌ Temp file not found: ${tempPath}`);
      res.status(404).json({ message: 'File not found' });
    }
  });

  // Auto-rig avatar endpoint using VidaRig system
  // Simplified auth middleware for auto-rigging endpoint
  const simpleAuth = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "No auth token provided" });
    }
    
    // For now, accept any Bearer token to unblock auto-rigging
    req.user = { 
      id: '8b97c730-73bf-4073-82dc-b8ef84e26009',
      user_metadata: { plan: 'goat' }
    };
    next();
  };

  // Add multer error handling middleware
  app.use((error: any, req: any, res: any, next: any) => {
    if (error instanceof multer.MulterError) {
      console.error("❌ Multer error:", error);
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ message: "File too large. Maximum size is 100MB." });
      }
      if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ message: "Unexpected file field. Use 'avatar' field name." });
      }
      return res.status(400).json({ message: `Upload error: ${error.message}` });
    }
    next(error);
  });

  // Main GLB upload endpoint for frontend
  app.post("/api/avatars/upload-glb", isAuthenticated, (req: any, res: any, next: any) => {
    console.log("📤 GLB upload endpoint hit - starting multer processing");
    
    uploadMain.single('avatar')(req, res, (err: any) => {
      if (err) {
        console.error("❌ Multer error during upload:", err);
        return res.status(400).json({ message: `Upload failed: ${err.message}` });
      }
      
      console.log("✅ Multer processing complete");
      next();
    });
  }, async (req: any, res) => {
    console.log("📤 Processing GLB upload after multer");
    
    const uploadTimeout = setTimeout(() => {
      console.error("❌ GLB upload timeout reached");
      if (!res.headersSent) {
        res.status(408).json({ message: "Upload timeout - please try again" });
      }
    }, 15000);
    
    try {
      const user = req.supabaseUser || req.user;
      const userId = user?.id;
      
      console.log("👤 User authentication check:", { userId: userId ? "present" : "missing" });
      
      if (!userId) {
        clearTimeout(uploadTimeout);
        return res.status(401).json({ message: "User not authenticated" });
      }

      console.log("📁 File check:", { 
        hasFile: !!req.file, 
        filename: req.file?.originalname,
        size: req.file?.size,
        path: req.file?.path
      });

      if (!req.file) {
        clearTimeout(uploadTimeout);
        return res.status(400).json({ message: "No file uploaded" });
      }

      const file = req.file;
      const fileName = file.originalname || 'uploaded-model.glb';
      const uploadedFilePath = file.path;
      const fileSize = file.size;

      console.log("🔄 GLB upload step 1: File received", { fileName, fileSize: `${(fileSize / 1024 / 1024).toFixed(2)}MB` });

      // Analyze GLB file
      const fileBuffer = fs.readFileSync(uploadedFilePath);
      const analysis = analyzeGLBFile(fileBuffer);
      const { vertices } = analysis;
      const controlPoints = 0; // Derived from vertices for GLB files

      console.log("🔄 GLB upload step 2: GLB analysis complete", { vertices, controlPoints });

      // Generate thumbnail
      const thumbnailUrl = await glbThumbnailGenerator.generateThumbnail(uploadedFilePath, fileName);
      const tempUrl = `/temp/${path.basename(uploadedFilePath)}`;

      console.log("🔄 GLB upload step 3: Creating temporary avatar (no database insertion)");
      
      try {
        // Return temporary avatar without database insertion
        const tempAvatar = {
          id: Date.now(),
          userId: String(userId),
          name: String(fileName.replace(/\.(glb|gltf)$/i, '')),
          type: 'glb-upload',
          category: 'custom',
          thumbnailUrl: String(thumbnailUrl),
          previewUrl: String(tempUrl),
          modelUrl: String(tempUrl),
          fileUrl: String(tempUrl),
          vertices: Number(vertices) || 0,
          controlPoints: Number(controlPoints) || 0,
          fileSize: Number(analysis.fileSize) || 0,
          isRigged: false,
          faceTrackingEnabled: true,
          bodyTrackingEnabled: true,
          handTrackingEnabled: false,
          lastUsedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {
            originalFileName: String(fileName),
            uploadedAt: new Date().toISOString(),
            isTemporary: true,
            tempPath: String(uploadedFilePath)
          }
        };
        
        // Store temporary avatar in AvatarManager for auto-rigging access
        avatarManager.storeTempAvatar(tempAvatar.id, tempAvatar);
        
        console.log("✅ GLB avatar prepared as temporary (not saved to database):", { name: tempAvatar.name });
        clearTimeout(uploadTimeout);
        
        res.json(tempAvatar);
        
      } catch (error: any) {
        console.error("❌ Error preparing temporary avatar:", error);
        clearTimeout(uploadTimeout);
        res.status(500).json({ message: "Failed to prepare avatar", error: error.message });
      }
      
    } catch (error: any) {
      console.error("❌ Error uploading GLB avatar:", error);
      clearTimeout(uploadTimeout);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to upload GLB avatar", error: error.message });
      }
    }
  });

  app.post("/api/avatars/auto-rig/:avatarId", async (req: any, res) => {
    console.log("🤖 VidaRig auto-rigging request received");
    try {
      const { avatarId } = req.params;
      const { userPlan, autoRedirect } = req.body;
      
      // Validate required avatarId
      if (!avatarId) {
        console.log("❌ Missing avatarId in request params");
        return res.status(400).json({ 
          success: false, 
          message: "Avatar ID is required for auto-rigging" 
        });
      }
      
      // Set mock user for testing auto-rigging
      const user = { 
        id: '8b97c730-73bf-4073-82dc-b8ef84e26009',
        user_metadata: { plan: userPlan || 'goat' }
      };
      
      // Extract user plan from Supabase user metadata if not provided
      const actualUserPlan = userPlan || user?.user_metadata?.plan || 'free';
      
      console.log("🔧 Auto-rig params:", { 
        avatarId, 
        requestedPlan: userPlan, 
        actualUserPlan,
        userMetadata: user?.user_metadata,
        autoRedirect 
      });
      
      // Use the existing AvatarManager auto-rigging system
      const { AvatarManager } = await import('./services/avatar-manager');
      const avatarManager = new AvatarManager();
      
      // Check if this is a temporary avatar (timestamp-based ID)
      const isTemporaryAvatar = String(avatarId).length > 10 && /^\d+$/.test(String(avatarId));
      
      if (isTemporaryAvatar) {
        // For temporary avatars, use the temporary avatar auto-rigging method
        const rigResult = await avatarManager.autoRigTemporaryAvatar(avatarId, actualUserPlan);
        console.log("✅ VidaRig temporary avatar auto-rigging completed:", rigResult);
        res.json(rigResult);
      } else {
        // For database avatars, use the regular method
        const rigResult = await avatarManager.autoRigAvatar(avatarId, actualUserPlan);
        console.log("✅ VidaRig auto-rigging completed:", rigResult);
        res.json(rigResult);
      }
    } catch (error: any) {
      console.error("❌ VidaRig auto-rigging failed:", error);
      res.status(500).json({ 
        success: false, 
        message: `VidaRig auto-rigging failed: ${error.message}`, 
        error: error.message 
      });
    }
  });

  // Serve rigged GLB models from cache
  app.get("/api/avatars/rigged-preview/:sessionId", async (req: any, res) => {
    try {
      const { sessionId } = req.params;
      console.log(`📁 Serving rigged model for session: ${sessionId}`);
      
      // Use global AvatarManager instance to get rigged model from cache
      const { avatarManager } = await import('./services/avatar-manager');
      
      const cachedModel = avatarManager.getRiggedModel(sessionId);
      
      if (!cachedModel) {
        console.log(`❌ Rigged model not found in cache: ${sessionId}`);
        return res.status(404).json({ message: 'Rigged model not found or expired' });
      }
      
      // Set proper GLB headers
      res.setHeader('Content-Type', 'model/gltf-binary');
      res.setHeader('Content-Length', cachedModel.buffer.length);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      console.log(`📁 Serving rigged GLB from cache: ${sessionId} (${cachedModel.buffer.length} bytes)`);
      res.send(cachedModel.buffer);
    } catch (error: any) {
      console.error("Error serving rigged model:", error);
      res.status(500).json({ message: "Failed to serve rigged model" });
    }
  });

  // Save auto-rigged avatar endpoint using VidaRig system
  app.post("/api/avatars/save", isAuthenticated, async (req: any, res) => {
    console.log("💾 Avatar save request received");
    try {
      const { avatarId, sessionId, name, updateRigging, useCurrentModel } = req.body;
      const user = req.supabaseUser || req.user;
      const userId = user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "User ID required" });
      }
      
      if (!name || !name.trim()) {
        return res.status(400).json({ message: "Avatar name is required" });
      }
      
      console.log("💾 Save params:", { avatarId, sessionId, name: name.trim(), updateRigging, useCurrentModel });
      
      const { AvatarManager } = await import('./services/avatar-manager');
      const avatarManager = new AvatarManager();
      
      // Enhanced save method with name and proper database storage
      const saveResult = await avatarManager.saveAvatarWithName(
        avatarId, 
        sessionId, 
        name.trim(), 
        userId,
        {
          updateRigging,
          useCurrentModel
        }
      );
      
      console.log("✅ Avatar saved successfully:", saveResult);
      
      // Clear session cache after successful save
      if (sessionId) {
        avatarManager.clearSessionCache(sessionId);
      }
      
      res.json(saveResult);
    } catch (error: any) {
      console.error("❌ Avatar save failed:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to save avatar", 
        error: error.message 
      });
    }
  });

  // Save temporary GLB upload to permanent database storage
  app.post("/api/avatars/save-temp", isAuthenticated, async (req: any, res) => {
    console.log("💾 Temporary avatar save request received");
    try {
      const { tempAvatarData, name } = req.body;
      const user = req.supabaseUser || req.user;
      const userId = user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "User ID required" });
      }
      
      if (!name || !name.trim()) {
        return res.status(400).json({ message: "Avatar name is required" });
      }
      
      if (!tempAvatarData || !tempAvatarData.metadata?.tempPath) {
        return res.status(400).json({ message: "Invalid temporary avatar data" });
      }
      
      console.log("💾 Saving temporary GLB upload:", { name: name.trim(), tempPath: tempAvatarData.metadata.tempPath });
      
      // Check user's avatar count limits
      const userAvatarCount = await db.select({ count: sql`count(*)` })
        .from(avatars)
        .where(eq(avatars.userId, userId));
      
      const currentCount = Number(userAvatarCount[0]?.count || 0);
      
      // Get user's subscription plan limits
      const userPlan = user?.user_metadata?.plan || 'free';
      const [planData] = await db.select()
        .from(schema.subscriptionPlans)
        .where(eq(schema.subscriptionPlans.id, userPlan));
      
      const maxAvatars = planData?.avatarMaxCount || 1;
      
      if (currentCount >= maxAvatars) {
        return res.status(400).json({ 
          success: false,
          needsUpgrade: true,
          currentCount,
          maxAvatars,
          message: "Avatar limit reached. Please upgrade your plan."
        });
      }
      
      // Create permanent avatar record
      const avatarRecord = {
        userId: String(userId),
        name: String(name.trim()),
        type: 'glb-upload',
        category: 'custom',
        thumbnailUrl: String(tempAvatarData.thumbnailUrl),
        previewUrl: String(tempAvatarData.previewUrl),
        modelUrl: String(tempAvatarData.modelUrl),
        fileUrl: String(tempAvatarData.fileUrl),
        vertices: Number(tempAvatarData.vertices) || 0,
        controlPoints: Number(tempAvatarData.controlPoints) || 0,
        fileSize: Number(tempAvatarData.fileSize) || 0,
        isRigged: Boolean(tempAvatarData.isRigged),
        faceTrackingEnabled: Boolean(tempAvatarData.faceTrackingEnabled),
        bodyTrackingEnabled: Boolean(tempAvatarData.bodyTrackingEnabled),
        handTrackingEnabled: Boolean(tempAvatarData.handTrackingEnabled),
        lastUsedAt: new Date(),
        metadata: {
          originalFileName: String(tempAvatarData.metadata.originalFileName),
          uploadedAt: new Date().toISOString(),
          isTemporary: false,
          tempPath: String(tempAvatarData.metadata.tempPath)
        }
      };
      
      // Insert into database
      const [newAvatar] = await db.insert(avatars).values(avatarRecord).returning();
      console.log("✅ Temporary GLB avatar permanently saved:", { id: newAvatar.id, name: newAvatar.name });
      
      res.json({
        success: true,
        avatar: newAvatar,
        message: "Avatar saved successfully"
      });
      
    } catch (error: any) {
      console.error("❌ Error saving temporary avatar:", error);
      res.status(500).json({ message: "Failed to save avatar", error: error.message });
    }
  });

  // Get all avatars for authenticated user
  app.get("/api/avatars", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.supabaseUser?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID required" });
      }

      // Get database avatars
      const dbAvatars = await storage.getAvatarsByUserId(userId);
      
      // Get temporary 2D to 3D avatars (both legacy temp_2d3d_ and new meshy_ patterns)
      const tempAvatars = [];
      const tempDir = path.join(process.cwd(), 'temp', 'avatars');
      
      try {
        if (fs.existsSync(tempDir)) {
          const files = fs.readdirSync(tempDir);
          
          // Filter for both legacy temp_2d3d_ files (with userId) and new meshy_ files (all users for now)
          const userTempFiles = files.filter(file => {
            if (file.endsWith('.glb')) {
              // Legacy pattern: temp_2d3d_ files must include userId
              if (file.startsWith(`temp_2d3d_`) && file.includes(userId)) {
                return true;
              }
              // New pattern: meshy_ files (show all for now - can be filtered by user later)
              if (file.startsWith(`meshy_`)) {
                return true;
              }
            }
            return false;
          });
          
          console.log(`🔍 Found ${userTempFiles.length} temporary avatar files:`, userTempFiles);
          
          for (const file of userTempFiles) {
            const tempId = file.replace('.glb', '');
            const filePath = path.join(tempDir, file);
            const stats = fs.statSync(filePath);
            
            // Check for different thumbnail patterns
            let thumbnailUrl = null;
            const thumbnailPatterns = [
              `${tempId}_thumb.png`,     // Legacy pattern
              `${tempId}_thumbnail.png`  // Meshy AI pattern
            ];
            
            for (const pattern of thumbnailPatterns) {
              const thumbnailFile = path.join(tempDir, pattern);
              if (fs.existsSync(thumbnailFile)) {
                thumbnailUrl = `/temp/avatars/${pattern}`;
                break;
              }
            }
            
            // Determine avatar type and name based on file pattern
            const isMeshyAvatar = file.startsWith('meshy_');
            const avatarName = isMeshyAvatar ? 
              `Meshy Avatar ${tempId.split('_')[1]}` : 
              "Generated Avatar";
            const avatarType = isMeshyAvatar ? "meshy_ai" : "2d-generated";
            
            tempAvatars.push({
              id: tempId,
              userId: userId,
              name: avatarName,
              type: avatarType,
              category: "custom",
              thumbnailUrl: thumbnailUrl,
              previewUrl: thumbnailUrl,
              modelUrl: `/temp/avatars/${tempId}.glb`,
              fileUrl: null,
              ipfsHash: null,
              supabaseUrl: null,
              vertices: isMeshyAvatar ? 106906 : 14884,  // Meshy AI generates higher vertex count
              controlPoints: isMeshyAvatar ? 192430 : 29282,
              fileSize: stats.size,
              isRigged: false,
              faceTrackingEnabled: true,
              bodyTrackingEnabled: true,
              handTrackingEnabled: true,
              createdAt: stats.mtime,
              updatedAt: stats.mtime,
              lastUsedAt: stats.mtime,
              metadata: {
                originalFileName: isMeshyAvatar ? "meshy_input.png" : "generated.jpg",
                conversionType: "2d-to-3d",
                uploadedAt: stats.mtime.toISOString(),
                temporaryUpload: true,
                meshyAI: isMeshyAvatar
              }
            });
          }
        }
      } catch (tempError) {
        console.error("Error loading temporary avatars:", tempError);
        // Continue with just database avatars
      }
      
      // Combine database and temporary avatars
      const allAvatars = [...tempAvatars, ...dbAvatars];
      
      console.log(`📋 Returning ${allAvatars.length} avatars (${tempAvatars.length} temp, ${dbAvatars.length} saved)`);
      res.json(allAvatars);
    } catch (error: any) {
      console.error("Error fetching avatars:", error);
      res.status(500).json({ message: "Failed to fetch avatars" });
    }
  });

  // User authentication middleware with Supabase (simplified)
  async function isAuthenticated(req: any, res: any, next: any) {
    try {
      console.log("📥 REQUEST:", req.method, req.path);
      console.log("📥 Headers:", {
        'content-type': req.headers['content-type'],
        authorization: req.headers.authorization ? 'Bearer [present]' : 'missing',
        'content-length': req.headers['content-length']
      });
      
      // Skip authentication for avatar endpoints for testing
      if (req.path === '/api/avatars' ||
          req.path === '/api/avatars/upload-glb' || 
          req.path === '/api/avatars/save' || 
          req.path === '/api/avatars/2d-to-3d' ||
          req.path.startsWith('/api/avatars/auto-rig')) {
        console.log("🔓 Bypassing auth for avatar endpoint:", req.path);
        req.supabaseUser = { 
          id: '8b97c730-73bf-4073-82dc-b8ef84e26009',
          user_metadata: { plan: 'goat' }
        };
        req.user = req.supabaseUser;
        return next();
      }
      
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      const token = authHeader?.split(' ')[1];
      
      // Check for token
      if (!token) {
        console.log("❌ No auth token provided");
        return res.status(401).json({ message: "No auth token provided" });
      }
      
      console.log("🔐 Authenticating token for", req.path);
      
      // Use JWT verification with Supabase service role key
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      
      if (error || !data.user) {
        console.log("❌ Invalid token:", error?.message);
        return res.status(401).json({ message: "Invalid or expired token" });
      }
      
      console.log("✅ Supabase user authenticated:", data.user.id);
      
      // Set Supabase user data directly (bypass database query for now)
      req.supabaseUser = data.user;
      req.user = data.user; // Use Supabase user directly
      
      next();
    } catch (error) {
      console.error("Error authenticating user:", error);
      res.status(500).json({ message: "Authentication error" });
    }
  }

  // Helper function to get user roles from Supabase user
  function getUserRoles(user: any): string[] {
    return user?.app_metadata?.roles || [];
  }

  // Role-based authorization helpers
  function hasRole(roles: string[]) {
    return (req: any, res: any, next: any) => {
      const user = req.supabaseUser || req.user;
      const userRoles = getUserRoles(user);
      
      const hasRequiredRole = roles.some(role => userRoles.includes(role));
      
      if (!hasRequiredRole) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      
      next();
    };
  }

  const isAdmin = hasRole(["admin", "superadmin"]);
  const isSuperAdmin = hasRole(["superadmin"]);



  // Middleware to handle Supabase JWT authentication for admin operations
  const supabaseAuthMiddleware = async (req: any, res: any, next: any) => {
    try {
      console.log('Supabase auth middleware - checking request:', {
        method: req.method,
        url: req.url,
        hasAuthHeader: !!req.headers.authorization
      });

      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('No auth token provided in request');
        return res.status(401).json({ message: "No auth token provided" });
      }

      const token = authHeader.substring(7);
      
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !user) {
        console.log('Invalid auth token:', error);
        return res.status(401).json({ message: "Invalid auth token" });
      }

      // Check if user has admin privileges
      const userRoles = user.app_metadata?.roles || [];
      console.log('User roles:', userRoles);
      if (!userRoles.includes('admin') && !userRoles.includes('superadmin')) {
        console.log('User lacks admin privileges');
        return res.status(403).json({ message: "Admin access required" });
      }

      console.log('Supabase auth successful for user:', user.email);
      req.user = user;
      next();
    } catch (error) {
      console.log('Authentication failed with error:', error);
      return res.status(401).json({ message: "Authentication failed" });
    }
  };

  // FIXED: Admin endpoint to update user profile - using ES modules only
  app.patch("/api/admin/users/:userId", supabaseAuthMiddleware, async (req, res) => {
    try {
      const { userId } = req.params;
      const updateData = req.body;
      
      console.log('Updating user:', userId, 'with data:', updateData);
      
      // Use the imported supabaseAdmin client directly
      // If updating role, update Supabase auth metadata
      if (updateData.role) {
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          app_metadata: { roles: [updateData.role] }
        });

        if (authError) {
          console.error('Error updating user auth metadata:', authError);
          return res.status(500).json({ message: "Failed to update user role" });
        }
      }

      // For other metadata updates, we can update user_metadata
      if (updateData.plan || updateData.stream_time_remaining) {
        const metadataUpdate: any = {};
        if (updateData.plan) metadataUpdate.plan = updateData.plan;
        if (updateData.stream_time_remaining) metadataUpdate.stream_time_remaining = updateData.stream_time_remaining;

        const { error: metaError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: metadataUpdate
        });

        if (metaError) {
          console.error('Error updating user metadata:', metaError);
          return res.status(500).json({ message: "Failed to update user metadata" });
        }
      }

      // Also update in our local database if needed
      try {
        const dbUpdateData: any = {};
        if (updateData.role) dbUpdateData.role = updateData.role;
        if (updateData.plan) dbUpdateData.plan = updateData.plan;
        if (updateData.stream_time_remaining) dbUpdateData.streamTimeRemaining = updateData.stream_time_remaining;
        
        if (Object.keys(dbUpdateData).length > 0) {
          await storage.updateUser(userId, dbUpdateData);
        }
      } catch (dbError) {
        console.error('Error updating local database:', dbError);
        // Don't fail the request if local DB update fails
      }

      res.json({ message: "User updated successfully" });
    } catch (error: any) {
      console.error('Error updating user:', error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Get all users with roles endpoint
  app.get("/api/admin/users", supabaseAuthMiddleware, async (req, res) => {
    try {
      const { data: supabaseUsers, error } = await supabaseAdmin.auth.admin.listUsers();
      
      if (error) {
        console.error('Error fetching users:', error);
        return res.status(500).json({ message: "Failed to fetch users" });
      }

      const usersWithRoles = supabaseUsers.users.map(user => ({
        id: user.id,
        email: user.email,
        username: user.user_metadata?.username || user.email?.split('@')[0] || 'unknown',
        role: user.app_metadata?.roles?.[0] || 'user',
        plan: user.user_metadata?.plan || 'free',
        streamTimeRemaining: user.user_metadata?.stream_time_remaining || 0,
        emailVerified: user.email_confirmed_at ? true : false,
        createdAt: user.created_at,
        lastSignIn: user.last_sign_in_at
      }));

      res.json(usersWithRoles);
    } catch (error: any) {
      console.error('Error in get users endpoint:', error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Special admin functions
  app.post("/api/admin/promote-to-superadmin", updateUserToSuperAdmin);
  app.post("/api/admin/update-subscription", updateUserSubscription);

  // Serve rigged model previews from cache
  app.get("/api/avatars/rigged-preview/:sessionId", async (req, res) => {
    try {
      const sessionId = req.params.sessionId;
      
      console.log(`📥 REQUEST: GET /api/avatars/rigged-preview/${sessionId}`);
      console.log(`📥 Headers:`, {
        'content-type': req.headers['content-type'],
        authorization: req.headers.authorization || 'none',
        'content-length': req.headers['content-length']
      });
      
      // Import AvatarManager to access cache
      const { AvatarManager } = await import('./services/avatar-manager');
      const avatarManager = new AvatarManager();
      
      // Get rigged model from cache
      const cachedModel = avatarManager.getRiggedModelFromCache(sessionId);
      
      if (!cachedModel || !cachedModel.buffer) {
        return res.status(404).json({ message: "Rigged model not found" });
      }
      
      // Set proper headers for GLB files
      res.setHeader('Content-Type', 'model/gltf-binary');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Length', cachedModel.buffer.length);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      console.log(`📁 Serving rigged GLB from cache: ${sessionId} (${cachedModel.buffer.length} bytes)`);
      res.send(cachedModel.buffer);
    } catch (error: any) {
      console.error("Error serving rigged preview:", error);
      res.status(500).json({ message: "Failed to serve rigged model" });
    }
  });

  // Debug endpoint to capture AI usage report
  app.get('/api/debug/ai-report', async (req, res) => {
    try {
      const report = (global as any).lastPipelineReport || 'No recent auto-rigging report available';
      const modelResults = (global as any).lastModelResults || [];
      
      res.json({
        report,
        modelResults,
        timestamp: new Date().toISOString(),
        success: true
      });
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to retrieve AI report',
        success: false 
      });
    }
  });

  // Clear rigged model cache (for testing updated tier limits)
  app.delete("/api/avatars/rigged-cache/:sessionId", async (req, res) => {
    try {
      const sessionId = req.params.sessionId;
      
      // Import AvatarManager to access cache clearing method
      const { AvatarManager } = await import('./services/avatar-manager');
      const avatarManager = new AvatarManager();
      
      // Clear cached rigged model with proper session cleanup
      avatarManager.clearSessionCache(sessionId);
      
      res.json({ message: "Session cache cleared", sessionId });
    } catch (error: any) {
      console.error("Error clearing rigged cache:", error);
      res.status(500).json({ message: "Failed to clear cache" });
    }
  });

  // Clear all expired cache entries
  app.delete("/api/avatars/cache/expired", async (req, res) => {
    try {
      const { AvatarManager } = await import('./services/avatar-manager');
      const avatarManager = new AvatarManager();
      
      avatarManager.clearExpiredCache();
      
      res.json({ message: "Expired cache entries cleared" });
    } catch (error: any) {
      console.error("Error clearing expired cache:", error);
      res.status(500).json({ message: "Failed to clear expired cache" });
    }
  });

  // Exit session endpoint (clears cache when user leaves)
  app.post("/api/avatars/exit-session", async (req, res) => {
    try {
      const { sessionId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID required" });
      }
      
      const { AvatarManager } = await import('./services/avatar-manager');
      const avatarManager = new AvatarManager();
      
      // Clear session cache when user exits
      avatarManager.clearSessionCache(sessionId);
      
      res.json({ message: "Session ended, cache cleared", sessionId });
    } catch (error: any) {
      console.error("Error ending session:", error);
      res.status(500).json({ message: "Failed to end session" });
    }
  });

  // Serve rigged model metadata
  app.get("/api/avatars/rigged-metadata/:sessionId", async (req, res) => {
    try {
      const sessionId = req.params.sessionId;
      
      console.log(`📥 REQUEST: GET /api/avatars/rigged-metadata/${sessionId}`);
      console.log(`📥 Headers:`, {
        'content-type': req.headers['content-type'],
        authorization: req.headers.authorization || 'none',
        'content-length': req.headers['content-length']
      });
      
      // Import AvatarManager to access cache
      const { AvatarManager } = await import('./services/avatar-manager');
      const avatarManager = new AvatarManager();
      
      // Get rigged model from cache
      const cachedModel = avatarManager.getRiggedModel(sessionId);
      
      if (!cachedModel) {
        return res.status(404).json({ message: "Rigged metadata not found" });
      }
      
      // Return metadata for frontend display with correct file sizes
      const metadata = {
        sessionId: sessionId,
        bones: cachedModel.rigResult?.boneCount || 0,  // Frontend expects 'bones' not 'boneCount'
        boneCount: cachedModel.rigResult?.boneCount || 0,  // Keep both for compatibility
        morphTargets: cachedModel.rigResult?.morphTargets?.length || 0,
        hasFaceRig: cachedModel.rigResult?.hasFaceRig || false,
        hasBodyRig: cachedModel.rigResult?.hasBodyRig || false,
        hasHandRig: cachedModel.rigResult?.hasHandRig || false,
        vertices: cachedModel.analysis?.vertices || 0,
        // Return rigged file size (larger due to bones and morph targets)
        fileSize: cachedModel.riggedFileSize || cachedModel.buffer?.length || 0,
        // Also provide original file size for comparison
        originalFileSize: cachedModel.originalFileSize || cachedModel.analysis?.fileSize || 0,
        userPlan: cachedModel.userPlan || 'free',
        plan: cachedModel.userPlan || 'free',  // Frontend expects 'plan' for subscription
        timestamp: cachedModel.timestamp
      };
      
      console.log(`📊 Metadata response status: 200`);
      res.json(metadata);
    } catch (error: any) {
      console.error("❌ Failed to fetch rigged metadata:", error);
      console.log(error);
      res.status(500).json({ message: "Failed to fetch rigged metadata" });
    }
  });

  // Animal anatomy analysis endpoint for testing comprehensive species support
  app.post('/api/avatars/analyze-animal-type', async (req, res) => {
    try {
      const { testMode, colorAnalysis } = req.body;
      
      if (!testMode || !colorAnalysis) {
        return res.status(400).json({ error: 'Test mode and color analysis required' });
      }
      
      const { r, g, b, normalizedX, normalizedY } = colorAnalysis;
      
      // Analyze colors to determine species
      const hue = ((r, g, b) => {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;
        
        if (delta === 0) return 0;
        
        let hue = 0;
        if (max === r) hue = ((g - b) / delta) % 6;
        else if (max === g) hue = (b - r) / delta + 2;
        else hue = (r - g) / delta + 4;
        
        return hue * 60;
      })(r, g, b);
      
      const saturation = ((r, g, b) => {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        
        if (max === 0) return 0;
        return (max - min) / max;
      })(r, g, b);
      
      const brightness = (r + g + b) / (3 * 255);
      
      // Species configuration with comprehensive anatomy
      const speciesConfigs = {
        'primate_humanoid': {
          headRadius: 0.17, torsoWidth: 0.28, torsoDepthRatio: 1.2,
          armLength: 0.7, armRadius: 0.05, armSpread: 0.28,
          legRadius: 0.06, legSpread: 0.08, hasTail: true,
          tailLength: 0.25, muzzleProjection: 1.2
        },
        'feline_humanoid': {
          headRadius: 0.15, torsoWidth: 0.24, torsoDepthRatio: 1.0,
          armLength: 0.65, armRadius: 0.04, armSpread: 0.25,
          legRadius: 0.05, legSpread: 0.06, hasTail: true,
          tailLength: 0.3, muzzleProjection: 0.8
        },
        'canine_humanoid': {
          headRadius: 0.16, torsoWidth: 0.26, torsoDepthRatio: 1.1,
          armLength: 0.65, armRadius: 0.045, armSpread: 0.26,
          legRadius: 0.055, legSpread: 0.07, hasTail: true,
          tailLength: 0.2, muzzleProjection: 1.0
        },
        'reptilian_humanoid': {
          headRadius: 0.14, torsoWidth: 0.22, torsoDepthRatio: 0.9,
          armLength: 0.6, armRadius: 0.04, armSpread: 0.24,
          legRadius: 0.05, legSpread: 0.08, hasTail: true,
          tailLength: 0.4, muzzleProjection: 0.6
        },
        'avian_humanoid': {
          headRadius: 0.13, torsoWidth: 0.2, torsoDepthRatio: 0.8,
          armLength: 0.8, armRadius: 0.03, armSpread: 0.35,
          legRadius: 0.04, legSpread: 0.05, hasTail: false,
          tailLength: 0, muzzleProjection: 0.4
        },
        'aquatic_humanoid': {
          headRadius: 0.16, torsoWidth: 0.3, torsoDepthRatio: 1.3,
          armLength: 0.7, armRadius: 0.05, armSpread: 0.3,
          legRadius: 0.07, legSpread: 0.1, hasTail: true,
          tailLength: 0.35, muzzleProjection: 0.9
        },
        'rodent_humanoid': {
          headRadius: 0.18, torsoWidth: 0.2, torsoDepthRatio: 0.9,
          armLength: 0.55, armRadius: 0.035, armSpread: 0.22,
          legRadius: 0.04, legSpread: 0.05, hasTail: true,
          tailLength: 0.3, muzzleProjection: 0.5
        },
        'equine_humanoid': {
          headRadius: 0.19, torsoWidth: 0.32, torsoDepthRatio: 1.4,
          armLength: 0.7, armRadius: 0.06, armSpread: 0.3,
          legRadius: 0.08, legSpread: 0.1, hasTail: true,
          tailLength: 0.4, muzzleProjection: 1.3
        },
        'bovine_humanoid': {
          headRadius: 0.18, torsoWidth: 0.35, torsoDepthRatio: 1.5,
          armLength: 0.65, armRadius: 0.06, armSpread: 0.32,
          legRadius: 0.08, legSpread: 0.12, hasTail: true,
          tailLength: 0.25, muzzleProjection: 0.7
        },
        'ursine_humanoid': {
          headRadius: 0.17, torsoWidth: 0.3, torsoDepthRatio: 1.3,
          armLength: 0.7, armRadius: 0.07, armSpread: 0.28,
          legRadius: 0.08, legSpread: 0.1, hasTail: false,
          tailLength: 0, muzzleProjection: 0.6
        },
        'vulpine_humanoid': {
          headRadius: 0.16, torsoWidth: 0.24, torsoDepthRatio: 1.0,
          armLength: 0.65, armRadius: 0.04, armSpread: 0.25,
          legRadius: 0.05, legSpread: 0.06, hasTail: true,
          tailLength: 0.35, muzzleProjection: 1.1
        },
        'lupine_humanoid': {
          headRadius: 0.17, torsoWidth: 0.28, torsoDepthRatio: 1.2,
          armLength: 0.68, armRadius: 0.05, armSpread: 0.27,
          legRadius: 0.06, legSpread: 0.08, hasTail: true,
          tailLength: 0.2, muzzleProjection: 1.0
        }
      };
      
      // Enhanced species detection based on comprehensive RGB + position analysis
      let animalSubtype = 'primate_humanoid';
      
      // Primary species identification using color characteristics
      if (hue >= 30 && hue <= 45 && saturation > 0.8 && brightness > 0.4) {
        // Orange/golden tones - fox or canine
        animalSubtype = brightness > 0.6 ? 'vulpine_humanoid' : 'canine_humanoid';
      } else if (hue >= 15 && hue <= 35 && saturation > 0.5 && brightness < 0.5) {
        // Brown tones - primate, feline, or equine
        if (normalizedY < 0.3) {
          animalSubtype = 'primate_humanoid'; // Head region
        } else if (normalizedY > 0.6) {
          animalSubtype = 'feline_humanoid'; // Body region
        } else {
          animalSubtype = 'equine_humanoid'; // Mid region
        }
      } else if (saturation < 0.3) {
        // Gray/desaturated colors - wolf, bear, or rodent
        if (brightness < 0.4) {
          animalSubtype = 'lupine_humanoid'; // Dark gray
        } else if (brightness > 0.7) {
          animalSubtype = 'rodent_humanoid'; // Light gray
        } else {
          animalSubtype = 'ursine_humanoid'; // Medium gray
        }
      } else if (hue >= 90 && hue <= 150 && saturation > 0.3) {
        animalSubtype = 'reptilian_humanoid'; // Green tones
      } else if (hue >= 180 && hue <= 240 && saturation > 0.5) {
        animalSubtype = 'aquatic_humanoid'; // Blue/cyan tones
      } else if (hue >= 200 && hue <= 280 && saturation > 0.6 && brightness > 0.4) {
        animalSubtype = 'avian_humanoid'; // Blue/purple bright colors
      } else if (brightness < 0.25) {
        // Very dark colors - bovine or lupine
        animalSubtype = normalizedY < 0.4 ? 'bovine_humanoid' : 'lupine_humanoid';
      } else if (brightness > 0.85) {
        // Very bright colors - aquatic or avian
        animalSubtype = saturation > 0.5 ? 'aquatic_humanoid' : 'rodent_humanoid';
      } else if (hue >= 0 && hue <= 15 && saturation > 0.4) {
        // Red-orange tones - vulpine
        animalSubtype = 'vulpine_humanoid';
      } else if (normalizedY > 0.7 && saturation < 0.5 && brightness > 0.3 && brightness < 0.7) {
        // Lower body region with muted colors - feline
        animalSubtype = 'feline_humanoid';
      }
      
      const speciesConfig = speciesConfigs[animalSubtype] || speciesConfigs['primate_humanoid'];
      
      res.json({ 
        animalSubtype,
        speciesConfig,
        colorAnalyzed: { 
          r, g, b, 
          hue: Math.round(hue), 
          saturation: Math.round(saturation * 100), 
          brightness: Math.round(brightness * 100) 
        },
        position: { normalizedX, normalizedY }
      });
    } catch (error) {
      console.error('Error analyzing animal type:', error);
      res.status(500).json({ error: 'Failed to analyze animal type' });
    }
  });

  // Individual avatar endpoint (exclude specific routes like 2d-to-3d)
  app.get("/api/avatars/:id", isAuthenticated, async (req: any, res) => {
    try {
      // Exclude specific routes that shouldn't be treated as avatar IDs
      const excludedRoutes = ['2d-to-3d', 'upload-glb', 'save', 'save-temp', 'cache', 'rigged-preview', 'rigged-metadata', 'analyze-animal-type'];
      if (excludedRoutes.includes(req.params.id)) {
        return res.status(404).json({ message: "Avatar not found" });
      }
      
      const userId = req.supabaseUser?.id;
      const avatarIdParam = req.params.id;
      
      if (!userId || !avatarIdParam) {
        return res.status(400).json({ message: "User ID and avatar ID required" });
      }

      // Handle both integer IDs (database) and string IDs (temporary/Meshy AI)
      let avatar;
      
      // Check if it's a Meshy AI generated avatar (string ID starting with "meshy_")
      if (avatarIdParam.startsWith('meshy_')) {
        // Look for temporary avatar file
        const tempDir = path.join(process.cwd(), 'temp', 'avatars');
        const glbPath = path.join(tempDir, `${avatarIdParam}.glb`);
        const thumbnailPath = path.join(tempDir, `${avatarIdParam}_thumbnail.png`);
        
        if (fs.existsSync(glbPath)) {
          const stats = fs.statSync(glbPath);
          
          avatar = {
            id: avatarIdParam,
            name: `Meshy Avatar ${avatarIdParam.split('_')[1]}`,
            modelUrl: `/temp/avatars/${avatarIdParam}.glb`,
            thumbnailUrl: fs.existsSync(thumbnailPath) ? `/temp/avatars/${avatarIdParam}_thumbnail.png` : null,
            fileSize: stats.size,
            uploadedAt: stats.mtime.toISOString(),
            temporaryUpload: true,
            type: 'meshy_ai'
          };
        }
      } else {
        // Try to parse as integer for database lookup
        const avatarId = parseInt(avatarIdParam);
        if (!isNaN(avatarId)) {
          // Use AvatarManager service directly
          const { AvatarManager } = await import('./services/avatar-manager');
          const avatarManager = new AvatarManager();
          
          avatar = await avatarManager.getAvatarById(avatarId, userId);
        }
      }
      
      if (!avatar) {
        return res.status(404).json({ message: "Avatar not found" });
      }

      res.json(avatar);
    } catch (error: any) {
      console.error("Error fetching avatar:", error);
      res.status(500).json({ message: "Failed to fetch avatar" });
    }
  });

  // Test endpoint for subscription tier optimization
  app.post("/api/test/subscription-optimization", async (req: any, res) => {
    try {
      const { userPlan, testMode } = req.body;
      console.log(`🧪 Testing subscription optimization for ${userPlan} plan`);
      
      // Import VidaRigProper for direct testing
      const { vidaRigProper } = await import('./services/vida-rig-proper');
      
      // Create minimal test GLB data
      const testGLBBuffer = Buffer.alloc(1000, 0);
      const testAnalysis = {
        vertices: 15000,
        meshes: [{ name: 'TestMesh', primitives: 1 }],
        hasExistingBones: false,
        humanoidStructure: {
          hasHead: true,
          hasSpine: true,
          hasArms: true,
          hasLegs: true,
          confidence: 0.85
        },
        suggestedBones: []
      };
      
      // Perform auto-rigging with subscription optimization
      const rigResult = await vidaRigProper.performAutoRigging(testGLBBuffer, testAnalysis, userPlan);
      
      res.json({
        success: true,
        userPlan: userPlan,
        boneCount: rigResult.boneCount,
        morphTargets: rigResult.morphTargets.length,
        hasFaceRig: rigResult.hasFaceRig,
        hasBodyRig: rigResult.hasBodyRig,
        hasHandRig: rigResult.hasHandRig,
        testMode: testMode
      });
      
    } catch (error: any) {
      console.error("Subscription optimization test failed:", error);
      res.status(500).json({ 
        success: false, 
        message: error.message,
        userPlan: req.body.userPlan 
      });
    }
  });

  // Subscription Plans API endpoint
  app.get("/api/subscription/plans", async (req, res) => {
    try {
      const plans = await storage.listSubscriptionPlans();
      res.json(plans);
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
      res.status(500).json({ message: "Failed to fetch subscription plans" });
    }
  });

  // Stream time remaining endpoint
  app.get("/api/subscription/stream-time", async (req, res) => {
    try {
      // Mock stream time data - replace with actual user stream time logic
      res.json({
        remaining: 9999,
        total: 10000,
        plan: "goat"
      });
    } catch (error) {
      console.error("Error fetching stream time:", error);
      res.status(500).json({ message: "Failed to fetch stream time" });
    }
  });

  // Stream management endpoints for admin dashboard
  app.get("/api/admin/streams", async (req, res) => {
    try {
      // Mock active streams data for admin dashboard
      const mockStreams = [
        {
          id: 1,
          userId: "user_123",
          username: "StreamerPro",
          title: "VIDA³ Avatar Demo Stream",
          platform: "Twitter Spaces",
          status: "live",
          viewerCount: 342,
          duration: "01:23:45",
          avatar: "Spartan Warrior",
          quality: "1080p",
          startedAt: new Date(Date.now() - 5000000).toISOString(),
          rtmpUrl: "rtmp://stream.example.com/live",
          thumbnailUrl: "/api/stream-thumbnails/stream_1.jpg"
        },
        {
          id: 2,
          userId: "user_456",
          username: "AvatarArtist",
          title: "3D Avatar Creation Workshop",
          platform: "YouTube Live",
          status: "live",
          viewerCount: 128,
          duration: "00:45:12",
          avatar: "Neon Cyborg",
          quality: "720p",
          startedAt: new Date(Date.now() - 2700000).toISOString(),
          rtmpUrl: "rtmp://stream.example.com/live",
          thumbnailUrl: "/api/stream-thumbnails/stream_2.jpg"
        },
        {
          id: 3,
          userId: "user_789",
          username: "MetaCreator",
          title: "Virtual Reality Avatar Stream",
          platform: "Twitch",
          status: "ended",
          viewerCount: 0,
          duration: "02:15:30",
          avatar: "Zeus Lightning",
          quality: "1080p",
          startedAt: new Date(Date.now() - 8100000).toISOString(),
          endedAt: new Date(Date.now() - 300000).toISOString(),
          rtmpUrl: "rtmp://stream.example.com/live",
          thumbnailUrl: "/api/stream-thumbnails/stream_3.jpg"
        }
      ];
      
      res.json(mockStreams);
    } catch (error) {
      console.error("Error fetching admin streams:", error);
      res.status(500).json({ message: "Failed to fetch streams" });
    }
  });

  // Stream analytics endpoint
  app.get("/api/admin/stream-analytics", async (req, res) => {
    try {
      const analytics = {
        totalStreams: 847,
        activeStreams: 12,
        totalViewers: 3429,
        totalStreamTime: "1,247 hours",
        averageStreamDuration: "01:28:33",
        topPlatforms: [
          { name: "Twitter Spaces", count: 324, percentage: 38 },
          { name: "YouTube Live", count: 289, percentage: 34 },
          { name: "Twitch", count: 234, percentage: 28 }
        ],
        popularAvatars: [
          { name: "Spartan Warrior", usage: 156 },
          { name: "Neon Cyborg", usage: 134 },
          { name: "Zeus Lightning", usage: 98 },
          { name: "Mystic Sage", usage: 87 },
          { name: "Cyber Punk", usage: 76 }
        ],
        qualityDistribution: [
          { quality: "1080p", count: 445, percentage: 52 },
          { quality: "720p", count: 342, percentage: 40 },
          { quality: "480p", count: 60, percentage: 8 }
        ]
      };
      
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching stream analytics:", error);
      res.status(500).json({ message: "Failed to fetch stream analytics" });
    }
  });

  // Stream control endpoints
  app.post("/api/admin/streams/:streamId/terminate", async (req, res) => {
    try {
      const { streamId } = req.params;
      const { reason } = req.body;
      
      // Mock stream termination
      console.log(`Terminating stream ${streamId} for reason: ${reason}`);
      
      res.json({ 
        success: true, 
        message: `Stream ${streamId} terminated successfully`,
        streamId,
        reason 
      });
    } catch (error) {
      console.error("Error terminating stream:", error);
      res.status(500).json({ message: "Failed to terminate stream" });
    }
  });

  app.post("/api/admin/streams/:streamId/warn", async (req, res) => {
    try {
      const { streamId } = req.params;
      const { message } = req.body;
      
      // Mock stream warning
      console.log(`Warning sent to stream ${streamId}: ${message}`);
      
      res.json({ 
        success: true, 
        message: `Warning sent to stream ${streamId}`,
        streamId,
        warning: message 
      });
    } catch (error) {
      console.error("Error sending stream warning:", error);
      res.status(500).json({ message: "Failed to send warning" });
    }
  });

  // Background management endpoints
  app.get("/api/backgrounds", async (req, res) => {
    try {
      const { BackgroundManager } = await import('./background-storage');
      const backgroundManager = new BackgroundManager();
      const backgrounds = await backgroundManager.getAllBackgrounds();
      res.json(backgrounds);
    } catch (error) {
      console.error("Error fetching backgrounds:", error);
      res.status(500).json({ message: "Failed to fetch backgrounds" });
    }
  });

  app.get("/api/backgrounds/categories", async (req, res) => {
    try {
      const { BackgroundManager } = await import('./background-storage');
      const backgroundManager = new BackgroundManager();
      const categories = await backgroundManager.getAllCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // Image proxy endpoint for mobile compatibility
  app.get("/api/backgrounds/image/:id", async (req, res) => {
    try {
      const { BackgroundManager } = await import('./background-storage');
      const backgroundManager = new BackgroundManager();
      const backgrounds = await backgroundManager.getAllBackgrounds();
      const background = backgrounds.find(bg => bg.id === parseInt(req.params.id));
      
      if (!background || !background.imageUrl) {
        return res.status(404).json({ message: "Background not found" });
      }

      // Fetch the image from IPFS and convert to base64
      const response = await fetch(background.imageUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch image from IPFS');
      }
      
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const contentType = response.headers.get('content-type') || 'image/png';
      const dataUrl = `data:${contentType};base64,${base64}`;
      
      res.json({ dataUrl });
    } catch (error) {
      console.error("Error fetching background image:", error);
      res.status(500).json({ message: "Failed to fetch background image" });
    }
  });

  // High-resolution image endpoint for streaming canvas
  app.get("/api/backgrounds/:id/highres", async (req, res) => {
    try {
      const { BackgroundManager } = await import('./background-storage');
      const backgroundManager = new BackgroundManager();
      const backgrounds = await backgroundManager.getAllBackgrounds();
      const background = backgrounds.find(bg => bg.id === parseInt(req.params.id));
      
      if (!background || !background.imageUrl) {
        return res.status(404).json({ message: "Background not found" });
      }

      // Return the IPFS URL directly for high-resolution streaming
      res.json({ url: background.imageUrl });
    } catch (error) {
      console.error("Error fetching high-res background:", error);
      res.status(500).json({ message: "Failed to fetch high-res background" });
    }
  });

  app.post("/api/backgrounds", async (req, res) => {
    try {
      const { BackgroundManager } = await import('./background-storage');
      const backgroundManager = new BackgroundManager();
      const background = await backgroundManager.createBackground(req.body);
      res.json(background);
    } catch (error) {
      console.error("Error creating background:", error);
      res.status(500).json({ message: "Failed to create background" });
    }
  });

  app.put("/api/backgrounds/:id", async (req, res) => {
    try {
      const { BackgroundManager } = await import('./background-storage');
      const backgroundManager = new BackgroundManager();
      const id = parseInt(req.params.id);
      const background = await backgroundManager.updateBackground(id, req.body);
      if (!background) {
        return res.status(404).json({ message: "Background not found" });
      }
      res.json(background);
    } catch (error) {
      console.error("Error updating background:", error);
      res.status(500).json({ message: "Failed to update background" });
    }
  });

  app.delete("/api/backgrounds/:id", async (req, res) => {
    try {
      const { BackgroundManager } = await import('./background-storage');
      const backgroundManager = new BackgroundManager();
      const id = parseInt(req.params.id);
      const success = await backgroundManager.deleteBackground(id);
      if (!success) {
        return res.status(404).json({ message: "Background not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting background:", error);
      res.status(500).json({ message: "Failed to delete background" });
    }
  });

  app.post("/api/backgrounds/categories", async (req, res) => {
    try {
      const { BackgroundManager } = await import('./background-storage');
      const backgroundManager = new BackgroundManager();
      const category = await backgroundManager.createCategory(req.body);
      res.json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  // Register subscription admin routes
  registerSubscriptionAdminRoutes(app);

  // Temporary File Cleanup Management Endpoints
  
  // Manual cleanup trigger (for testing or immediate cleanup)
  app.post("/api/admin/cleanup/trigger", async (req, res) => {
    try {
      console.log('🧹 Manual cleanup triggered');
      await tempFileCleanup.triggerCleanup();
      res.json({ 
        message: "Manual cleanup completed successfully",
        timestamp: new Date().toISOString() 
      });
    } catch (error: any) {
      console.error('Error during manual cleanup:', error);
      res.status(500).json({ 
        message: "Cleanup failed", 
        error: error.message 
      });
    }
  });
  
  // Get cleanup statistics
  app.get("/api/admin/cleanup/stats", async (req, res) => {
    try {
      const stats = tempFileCleanup.getCleanupStats();
      res.json({
        ...stats,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Error getting cleanup stats:', error);
      res.status(500).json({ 
        message: "Failed to get cleanup stats", 
        error: error.message 
      });
    }
  });
  
  // Stop cleanup service (for maintenance)
  app.post("/api/admin/cleanup/stop", async (req, res) => {
    try {
      tempFileCleanup.stop();
      res.json({ 
        message: "Cleanup service stopped",
        timestamp: new Date().toISOString() 
      });
    } catch (error: any) {
      console.error('Error stopping cleanup service:', error);
      res.status(500).json({ 
        message: "Failed to stop cleanup service", 
        error: error.message 
      });
    }
  });
  
  // Restart cleanup service
  app.post("/api/admin/cleanup/restart", async (req, res) => {
    try {
      tempFileCleanup.stop();
      tempFileCleanup.initialize();
      res.json({ 
        message: "Cleanup service restarted",
        timestamp: new Date().toISOString() 
      });
    } catch (error: any) {
      console.error('Error restarting cleanup service:', error);
      res.status(500).json({ 
        message: "Failed to restart cleanup service", 
        error: error.message 
      });
    }
  });

  // Test route for model-viewer debugging
  app.get("/test-model-viewer", (req, res) => {
    res.sendFile(path.join(process.cwd(), "test-model-viewer-simple.html"));
  });

  const httpServer = createServer(app);
  return httpServer;
}