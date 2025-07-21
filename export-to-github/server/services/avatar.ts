import path from "path";
import fs from "fs";
import { promisify } from "util";
import { storage } from "../storage";
import type { InsertAvatar } from "@shared/schema";
import { vidaVision2Dto3D } from "./huggingface-2d-to-3d";
import sharp from "sharp";

// Promisify fs functions
const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

// Avatar service for handling uploads and 2D-to-3D conversion
export function setupAvatarService() {
  // Create avatar uploads directory if it doesn't exist
  const avatarDir = path.join(process.cwd(), "uploads", "avatars");
  
  try {
    if (!fs.existsSync(avatarDir)) {
      fs.mkdirSync(avatarDir, { recursive: true });
    }
  } catch (error) {
    console.error("Error creating avatar directory:", error);
  }
  
  return {
    generateAvatarFrom2D,
    uploadGLBAvatarFile,
    getAvatarFile,
    create2D3DAvatar
  };
}

// Generate a 3D avatar from a 2D image using Hugging Face AI
async function generateAvatarFrom2D(
  userId: string,
  name: string,
  imageFile: Buffer,
  userPlan: string = 'free',
  options: { isPremium?: boolean } = {}
): Promise<InsertAvatar> {
  console.log(`🎨 Starting 2D to 3D conversion for user ${userId}, plan: ${userPlan}`);
  
  // Create unique filenames
  const timestamp = Date.now();
  const baseFilename = `${userId}_${timestamp}`;
  const imageFilename = `${baseFilename}_original.png`;
  const thumbnailFilename = `${baseFilename}_thumb.png`;
  const previewFilename = `${baseFilename}_preview.png`;
  const modelFilename = `${baseFilename}.glb`;
  
  // Create avatar uploads directory if it doesn't exist
  const avatarDir = path.join(process.cwd(), "uploads", "avatars");
  await mkdir(avatarDir, { recursive: true });

  try {
    // Step 1: Save original image
    const imagePath = path.join(avatarDir, imageFilename);
    await writeFile(imagePath, imageFile);
    console.log('✅ Original image saved');

    // Step 2: Get processing options based on user plan
    const processingOptions = vidaVision2Dto3D.getProcessingOptions(userPlan);
    console.log(`🔧 Processing options for ${userPlan}:`, processingOptions);

    // Step 3: Convert 2D image to 3D model using custom VidaVision model
    const conversionResult = await vidaVision2Dto3D.convertImage2D3D(
      imageFile,
      processingOptions
    );

    if (!conversionResult.success || !conversionResult.glbBuffer) {
      throw new Error(`2D to 3D conversion failed: ${conversionResult.error}`);
    }

    console.log('✅ 2D to 3D conversion completed:', {
      vertices: conversionResult.meshData?.vertices,
      faces: conversionResult.meshData?.faces,
      steps: conversionResult.processingSteps.length
    });

    // Step 4: Save the generated GLB model
    const modelPath = path.join(avatarDir, modelFilename);
    await writeFile(modelPath, conversionResult.glbBuffer);
    console.log('✅ GLB model saved');

    // Step 5: Generate thumbnail from original image
    const thumbnailBuffer = await vidaVision2Dto3D.generateThumbnail(imageFile);
    const thumbnailPath = path.join(avatarDir, thumbnailFilename);
    await writeFile(thumbnailPath, thumbnailBuffer);
    console.log('✅ Thumbnail generated');

    // Step 6: Generate preview image (enhanced version of original)
    const previewBuffer = await sharp(imageFile)
      .resize(400, 400, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .jpeg({ quality: 90 })
      .toBuffer();
    const previewPath = path.join(avatarDir, previewFilename);
    await writeFile(previewPath, previewBuffer);
    console.log('✅ Preview image generated');

    // Step 7: Create avatar metadata for database
    const avatar: InsertAvatar = {
      userId,
      name,
      type: "2d-to-3d",
      category: "generated",
      thumbnailUrl: `/uploads/avatars/${thumbnailFilename}`,
      previewUrl: `/uploads/avatars/${previewFilename}`,
      modelUrl: `/uploads/avatars/${modelFilename}`,
      fileUrl: `/uploads/avatars/${modelFilename}`,
      vertices: conversionResult.meshData?.vertices || 0,
      controlPoints: 0,
      fileSize: conversionResult.glbBuffer.length
    };

    console.log('🎉 2D to 3D avatar generation completed successfully');
    return avatar;

  } catch (error: any) {
    console.error('❌ 2D to 3D conversion failed:', error);
    throw new Error(`Failed to generate 3D avatar from 2D image: ${error.message}`);
  }
  
  // Save the original image
  const imagePath = path.join(avatarDir, imageFilename);
  await writeFile(imagePath, imageFile);
  
  // In a real implementation, we would now:
  // 1. Call an external AI service to generate a 3D model from the 2D image
  // 2. Process and optimize the generated model
  // 3. Generate thumbnail and preview images
  
  // For this demo, we'll simulate this by just creating placeholder files
  // In production, these would be the actual generated files
  
  // Create a simple thumbnail (would normally be generated from the 3D model)
  const thumbnailPath = path.join(avatarDir, thumbnailFilename);
  await writeFile(thumbnailPath, imageFile); // Using same image as placeholder
  
  // Create a simple preview (would normally be generated from the 3D model)
  const previewPath = path.join(avatarDir, previewFilename);
  await writeFile(previewPath, imageFile); // Using same image as placeholder
  
  // In a real implementation, we would have a 3D model file here
  // For this demo, we'll use a placeholder GLB file or create an empty one
  const modelPath = path.join(avatarDir, modelFilename);
  
  try {
    // For demo purposes only - in real implementation this would be the generated model
    const placeholderGlb = Buffer.from("placeholder 3d model content");
    await writeFile(modelPath, placeholderGlb);
  } catch (error) {
    console.error("Error creating placeholder GLB:", error);
    throw new Error("Failed to create avatar model");
  }
  
  // Create avatar metadata for database
  const avatar: InsertAvatar = {
    userId,
    name,
    type: "2d-generated",
    thumbnailUrl: `/uploads/avatars/${thumbnailFilename}`,
    previewUrl: `/uploads/avatars/${previewFilename}`,
    modelUrl: `/uploads/avatars/${modelFilename}`,
    fileUrl: `/uploads/avatars/${modelFilename}`,
    isPremium: options.isPremium || false,
    vertices: 5000, // Placeholder values
    controlPoints: 100, // Placeholder values
    fileSize: imageFile.length, // Using original image size as placeholder
    createdAt: new Date()
  };
  
  // Save avatar to database
  return await storage.createAvatar(avatar);
}

// Upload and process a GLB file directly
async function uploadGLBAvatarFile(
  userId: number,
  name: string,
  glbFile: Buffer,
  options: { isPremium?: boolean } = {}
): Promise<InsertAvatar> {
  // Create unique filenames
  const timestamp = Date.now();
  const baseFilename = `${userId}_${timestamp}`;
  const glbFilename = `${baseFilename}.glb`;
  const thumbnailFilename = `${baseFilename}_thumb.png`;
  const previewFilename = `${baseFilename}_preview.png`;
  
  // Create avatar uploads directory if it doesn't exist
  const avatarDir = path.join(process.cwd(), "uploads", "avatars");
  await mkdir(avatarDir, { recursive: true });
  
  // Save the GLB file
  const glbPath = path.join(avatarDir, glbFilename);
  await writeFile(glbPath, glbFile);
  
  // In a real implementation, we would now:
  // 1. Validate and optimize the GLB file
  // 2. Generate thumbnail and preview images from the 3D model
  
  // For this demo, we'll create placeholder thumbnail and preview images
  const placeholderImage = Buffer.from("placeholder image content");
  
  const thumbnailPath = path.join(avatarDir, thumbnailFilename);
  await writeFile(thumbnailPath, placeholderImage);
  
  const previewPath = path.join(avatarDir, previewFilename);
  await writeFile(previewPath, placeholderImage);
  
  // Create avatar metadata for database
  const avatar: InsertAvatar = {
    userId,
    name,
    type: "glb-upload",
    thumbnailUrl: `/uploads/avatars/${thumbnailFilename}`,
    previewUrl: `/uploads/avatars/${previewFilename}`,
    modelUrl: `/uploads/avatars/${glbFilename}`,
    fileUrl: `/uploads/avatars/${glbFilename}`,
    isPremium: options.isPremium || false,
    vertices: 10000, // Placeholder values
    controlPoints: 150, // Placeholder values
    fileSize: glbFile.length,
    createdAt: new Date()
  };
  
  // Save avatar to database
  return await storage.createAvatar(avatar);
}

// Retrieve an avatar file (GLB model, thumbnail, or preview)
async function getAvatarFile(userId: number, fileName: string): Promise<Buffer> {
  // Security check: Verify the file belongs to the user
  // Extract user ID from the filename (assumes format: userId_timestamp_filename)
  const fileUserId = parseInt(fileName.split('_')[0]);
  
  if (fileUserId !== userId) {
    throw new Error("Unauthorized access to avatar file");
  }
  
  const filePath = path.join(process.cwd(), "uploads", "avatars", fileName);
  
  try {
    return await readFile(filePath);
  } catch (error) {
    console.error("Error reading avatar file:", error);
    throw new Error("Avatar file not found");
  }
}

// Create 2D to 3D avatar conversion with proper integration
async function create2D3DAvatar({
  userId,
  name,
  imageFile,
  userPlan
}: {
  userId: string;
  name: string;
  imageFile: Buffer;
  userPlan: string;
}) {
  try {
    console.log('🎨 Starting 2D to 3D avatar creation for user:', userId);
    console.log('📄 Image file size:', imageFile.length, 'bytes');
    console.log('👤 User plan:', userPlan);
    console.log('🏷️ Avatar name:', name);

    // Get processing options based on user plan
    const processingOptions = vidaVision2Dto3D.getProcessingCapabilities(userPlan);
    console.log('🔧 Processing options for', userPlan, ':', processingOptions);

    // Convert 2D image to 3D model using custom VidaVision model
    console.log('🔄 Starting custom VidaVision 2D to 3D conversion...');
    const conversionResult = await vidaVision2Dto3D.convertImage2D3D(
      imageFile,
      processingOptions
    );

    console.log('📊 Conversion result status:', conversionResult.success);
    if (conversionResult.error) {
      console.log('❌ Conversion error:', conversionResult.error);
    }

    if (!conversionResult.success || !conversionResult.glbBuffer) {
      console.error('❌ 2D to 3D conversion failed');
      return {
        success: false,
        error: `2D to 3D conversion failed: ${conversionResult.error || 'Unknown error'}`,
        canSave: false
      };
    }

    console.log('✅ 2D to 3D conversion completed:', {
      vertices: conversionResult.meshData?.vertices,
      faces: conversionResult.meshData?.faces,
      steps: conversionResult.processingSteps.length,
      glbSize: conversionResult.glbBuffer.length
    });

    // Create temporary avatar for preview
    const tempId = `temp_2d3d_${Date.now()}_${userId}`;
    console.log('📁 Creating temporary avatar with ID:', tempId);
    
    // Generate thumbnail from original image for preview
    console.log('🖼️ Generating thumbnail for 2D to 3D preview...');
    const thumbnailBuffer = await vidaVision2Dto3D.generateThumbnail(imageFile);
    
    // Save thumbnail to temp directory
    const tempDir = path.join(process.cwd(), 'temp', 'avatars');
    await mkdir(tempDir, { recursive: true });
    
    const thumbnailPath = path.join(tempDir, `${tempId}_thumb.png`);
    await writeFile(thumbnailPath, thumbnailBuffer);
    console.log('✅ Thumbnail generated and saved for preview');
    
    const avatar = {
      id: tempId,
      userId,
      name,
      type: '2d-generated',
      category: 'custom',
      thumbnailUrl: `/temp/avatars/${tempId}_thumb.png`,
      previewUrl: `/temp/avatars/${tempId}_thumb.png`,
      modelUrl: `/temp/avatars/${tempId}.glb`,
      fileUrl: null,
      ipfsHash: null,
      supabaseUrl: null,
      vertices: conversionResult.meshData?.vertices || 1000,
      controlPoints: conversionResult.meshData?.faces || 800,
      fileSize: conversionResult.glbBuffer.length,
      isRigged: false,
      faceTrackingEnabled: true,
      bodyTrackingEnabled: true,
      handTrackingEnabled: true,
      metadata: {
        originalFileName: `${name}.jpg`,
        conversionType: '2d-to-3d',
        uploadedAt: new Date().toISOString(),
        temporaryUpload: true,
        processingSteps: conversionResult.processingSteps
      }
    };

    // Store GLB buffer temporarily for preview and potential saving (temp dir already created above)
    const tempGLBPath = path.join(tempDir, `${tempId}.glb`);
    console.log('💾 Saving GLB file to:', tempGLBPath);
    await writeFile(tempGLBPath, conversionResult.glbBuffer);
    
    console.log('✅ GLB file saved successfully');

    // For now, assume all plans can save (implement plan restrictions later)
    const canSave = true;
    const saveRestriction = userPlan === 'free' ? 'upgrade_required' : 'permitted';

    console.log('🎉 2D to 3D avatar creation completed successfully');
    return {
      success: true,
      avatar,
      canSave,
      saveRestriction,
      glbBuffer: conversionResult.glbBuffer
    };

  } catch (error: any) {
    console.error('❌ 2D to 3D avatar creation failed with error:', error);
    console.error('❌ Error stack:', error.stack);
    return {
      success: false,
      error: error.message || 'Unknown error during 2D to 3D conversion',
      canSave: false
    };
  }
}

// Export avatar service functions
export const avatarService = {
  create2D3DAvatar,
  getAvatarFile
};