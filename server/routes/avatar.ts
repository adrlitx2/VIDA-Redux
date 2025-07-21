import express from "express";
import { isAuthenticated } from "../routes";
import { storage } from "../storage";
import { insertAvatarSchema } from "../../shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import { promisify } from "util";

const router = express.Router();

// Set up multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/octet-stream", // For GLB files
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

// Get all avatars for the current user
router.get("/", isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const avatars = await storage.getUserAvatars(userId);
    res.json(avatars);
  } catch (error: any) {
    console.error("Error fetching avatars:", error);
    res.status(500).json({ message: "Error fetching avatars" });
  }
});

// Get a single avatar by ID
router.get("/:id", isAuthenticated, async (req, res) => {
  try {
    const avatarId = parseInt(req.params.id);
    if (isNaN(avatarId)) {
      return res.status(400).json({ message: "Invalid avatar ID" });
    }

    const avatar = await storage.getAvatar(avatarId);
    if (!avatar) {
      return res.status(404).json({ message: "Avatar not found" });
    }

    // Check if user owns this avatar
    if (avatar.userId !== (req.user as any).id) {
      return res.status(403).json({ message: "Unauthorized access to avatar" });
    }

    res.json(avatar);
  } catch (error: any) {
    console.error("Error fetching avatar:", error);
    res.status(500).json({ message: "Error fetching avatar" });
  }
});

// Create a new avatar from a 2D image
router.post("/create-from-2d", isAuthenticated, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    const userId = (req.user as any).id;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Avatar name is required" });
    }

    // Generate a unique filename
    const filename = `${userId}_${Date.now()}_${path.basename(req.file.originalname)}`;
    
    // Call the avatar generation service
    // This would normally call an AI service to generate a 3D avatar from 2D
    // For now, we'll just store the avatar metadata
    
    const avatar = await storage.createAvatar({
      userId,
      name,
      type: "2d-generated",
      thumbnailUrl: `/avatars/${filename}_thumb.png`,
      previewUrl: `/avatars/${filename}_preview.png`,
      modelUrl: `/avatars/${filename}.glb`, // Path to the 3D model
      fileUrl: `/avatars/${filename}.glb`,  // Same as modelUrl for now
      isPremium: false,
      vertices: 5000,
      controlPoints: 100,
      fileSize: req.file.size,
      createdAt: new Date()
    });

    res.status(201).json(avatar);
  } catch (error: any) {
    console.error("Error creating avatar from 2D:", error);
    res.status(500).json({ message: "Error creating avatar from 2D" });
  }
});

// Create a new avatar from a GLB file
router.post("/create-from-glb", isAuthenticated, upload.single("glb"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No GLB file provided" });
    }

    const userId = (req.user as any).id;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Avatar name is required" });
    }

    // Generate a unique filename
    const filename = `${userId}_${Date.now()}_${path.basename(req.file.originalname)}`;
    
    // Process the GLB file
    // This would normally validate and optimize the GLB file
    // For now, we'll just store the avatar metadata
    
    const avatar = await storage.createAvatar({
      userId,
      name,
      type: "glb-upload",
      thumbnailUrl: `/avatars/${filename}_thumb.png`,
      previewUrl: `/avatars/${filename}_preview.png`,
      modelUrl: `/avatars/${filename}.glb`, // Path to the 3D model
      fileUrl: `/avatars/${filename}.glb`,  // Same as modelUrl for now
      isPremium: false,
      vertices: 10000, // Estimate
      controlPoints: 150, // Estimate
      fileSize: req.file.size,
      createdAt: new Date()
    });

    res.status(201).json(avatar);
  } catch (error: any) {
    console.error("Error creating avatar from GLB:", error);
    res.status(500).json({ message: "Error creating avatar from GLB" });
  }
});

// Update an avatar
router.patch("/:id", isAuthenticated, async (req, res) => {
  try {
    const avatarId = parseInt(req.params.id);
    if (isNaN(avatarId)) {
      return res.status(400).json({ message: "Invalid avatar ID" });
    }

    const avatar = await storage.getAvatar(avatarId);
    if (!avatar) {
      return res.status(404).json({ message: "Avatar not found" });
    }

    // Check if user owns this avatar
    if (avatar.userId !== (req.user as any).id) {
      return res.status(403).json({ message: "Unauthorized access to avatar" });
    }

    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Avatar name is required" });
    }

    const updatedAvatar = await storage.updateAvatar(avatarId, { name });
    res.json(updatedAvatar);
  } catch (error: any) {
    console.error("Error updating avatar:", error);
    res.status(500).json({ message: "Error updating avatar" });
  }
});

// Delete an avatar
router.delete("/:id", isAuthenticated, async (req, res) => {
  try {
    const avatarId = parseInt(req.params.id);
    if (isNaN(avatarId)) {
      return res.status(400).json({ message: "Invalid avatar ID" });
    }

    const avatar = await storage.getAvatar(avatarId);
    if (!avatar) {
      return res.status(404).json({ message: "Avatar not found" });
    }

    // Check if user owns this avatar
    if (avatar.userId !== (req.user as any).id) {
      return res.status(403).json({ message: "Unauthorized access to avatar" });
    }

    const deleted = await storage.deleteAvatar(avatarId);
    if (!deleted) {
      return res.status(500).json({ message: "Failed to delete avatar" });
    }

    res.json({ message: "Avatar deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting avatar:", error);
    res.status(500).json({ message: "Error deleting avatar" });
  }
});

export default router;