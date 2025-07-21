import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { pinataService } from '../services/ipfs-pinata';
import { db } from '../db';
import { streamBackgrounds } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  },
});

// Test IPFS connection
router.get('/test', async (req, res) => {
  try {
    const isConnected = await pinataService.testConnection();
    res.json({ 
      connected: isConnected,
      message: isConnected ? 'IPFS connection successful' : 'IPFS credentials required'
    });
  } catch (error) {
    res.status(500).json({ 
      connected: false, 
      message: 'IPFS connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Upload single file to IPFS
router.post('/upload', upload.single('file'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' });
    }

    // Save file temporarily
    const fs = await import('fs');
    const path = await import('path');
    const tempDir = path.join(process.cwd(), 'temp');
    
    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFilePath = path.join(tempDir, `temp-${Date.now()}-${req.file.originalname}`);
    fs.writeFileSync(tempFilePath, req.file.buffer);

    try {
      // Upload to IPFS via Pinata
      const result = await pinataService.uploadImage(tempFilePath);
      
      // Add the uploaded image to the database as a new bedroom background
      const { name, category } = req.body;
      const backgroundName = name || req.file.originalname.replace(/\.[^/.]+$/, "");
      const backgroundCategory = category || 'bedroom';
      
      // Insert new background record directly
      const [newBackground] = await db
        .insert(streamBackgrounds)
        .values({
          name: backgroundName,
          description: `User uploaded ${backgroundCategory} background`,
          imageUrl: result.url,
          category: backgroundCategory,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
        
      console.log(`✅ Added new background to database: ${backgroundName} (ID: ${newBackground.id})`);
      
      // Clean up temp file
      fs.unlinkSync(tempFilePath);
      
      res.json({
        success: true,
        ipfsHash: result.hash,
        imageUrl: result.url,
        fileName: req.file.originalname,
        backgroundName: backgroundName,
        category: backgroundCategory
      });
    } catch (uploadError) {
      // Clean up temp file on error
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      throw uploadError;
    }

  } catch (error) {
    console.error('File upload to IPFS failed:', error);
    res.status(500).json({ 
      message: 'Failed to upload file to IPFS',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Upload bedroom images to IPFS
router.post('/upload-bedroom-images', async (req, res) => {
  try {
    console.log('Starting IPFS upload for bedroom images...');
    const results = await pinataService.uploadBedroomImages();
    
    if (results.length === 0) {
      return res.status(400).json({ 
        message: 'No images uploaded - check IPFS credentials and image files' 
      });
    }

    // Update database with IPFS URLs
    const updates = [];
    for (const result of results) {
      const fileName = result.fileName;
      
      // Update backgrounds that use this file
      const updated = await db
        .update(streamBackgrounds)
        .set({ 
          imageUrl: result.url,
          updatedAt: new Date()
        })
        .where(eq(streamBackgrounds.imageUrl, `/attached_assets/${fileName}`))
        .returning();
      
      updates.push(...updated);
    }

    res.json({
      message: `Successfully uploaded ${results.length} images to IPFS`,
      uploads: results,
      updatedBackgrounds: updates.length
    });

  } catch (error) {
    console.error('IPFS upload failed:', error);
    res.status(500).json({ 
      message: 'IPFS upload failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Revert to local images
router.post('/revert-to-local', async (req, res) => {
  try {
    const updates = await db
      .update(streamBackgrounds)
      .set({
        imageUrl: `/attached_assets/3b052c71-59cf-48e3-a3ec-9e238cac1c77.png`,
        updatedAt: new Date()
      })
      .where(eq(streamBackgrounds.name, 'Pop Art Bedroom'))
      .returning();

    await db
      .update(streamBackgrounds)
      .set({
        imageUrl: `/attached_assets/873fe266-5fea-4bfc-b3b1-e10872b96c93.png`,
        updatedAt: new Date()
      })
      .where(eq(streamBackgrounds.name, 'Neon Graffiti Bedroom'));

    await db
      .update(streamBackgrounds)
      .set({
        imageUrl: `/attached_assets/73091702-53fb-42a9-9bf7-569be5e06904.png`,
        updatedAt: new Date()
      })
      .where(eq(streamBackgrounds.name, 'Warhol Modern Bedroom'));

    res.json({
      message: 'Successfully reverted to local image storage',
      updatedBackgrounds: updates.length
    });

  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to revert to local storage',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;