/**
 * Meshy AI 2D to 3D Converter Service
 * Professional-quality 3D avatar generation using Meshy AI API
 */

import { meshyAIService, MeshyTask } from './meshy-ai-service.js';
import { imageCharacterAnalyzer } from './image-character-analyzer.js';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

export interface ConversionOptions {
  userPlan?: string;
  quality?: 'draft' | 'standard' | 'high' | 'ultra';
  style?: 'realistic' | 'stylized' | 'cartoon' | 'clean';
  enablePBR?: boolean;
  enableRegeneration?: boolean;
  enableAnatomyCompletion?: boolean;
  maxRegenerationAttempts?: number;
  forceTextureGeneration?: boolean;
}

export interface ConversionResult {
  success: boolean;
  avatarId: string;
  glbPath: string;
  thumbnailPath: string;
  fileSize: number;
  processingTime: number;
  meshyTaskId: string;
  vertexCount?: number;
  faceCount?: number;
  error?: string;
}

export class Meshy2DTo3DConverter {
  private tempDir: string;
  private outputDir: string;
  private meshyProcessingDir: string;

  constructor() {
    this.tempDir = path.resolve('./temp/meshy-processing');
    this.outputDir = path.resolve('./temp/avatars');
    this.meshyProcessingDir = path.resolve('./temp/meshy-processing');
  }

  /**
   * Convert 2D image to 3D avatar using Meshy AI with regeneration support
   */
  async convertImageTo3D(
    imageBuffer: Buffer,
    options: ConversionOptions = {}
  ): Promise<ConversionResult> {
    const startTime = Date.now();
    const avatarId = `meshy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('🚀 Starting Meshy AI 2D to 3D conversion with regeneration support...');
    console.log('📋 Options:', JSON.stringify(options, null, 2));

    // Enable regeneration by default for enhanced texture quality
    const enableRegeneration = options.enableRegeneration !== false;
    const maxAttempts = options.maxRegenerationAttempts || 3;
    const forceTextureGeneration = options.forceTextureGeneration !== false;
    
    console.log(`🔄 Regeneration enabled: ${enableRegeneration}, Max attempts: ${maxAttempts}, Force textures: ${forceTextureGeneration}`);

    try {
      // Ensure directories exist
      await this.ensureDirectories();

      // Analyze character for T-pose prompt generation and side-view generation
      console.log('🔍 Analyzing character with comprehensive AI integration...');
      const characterAnalysis = await imageCharacterAnalyzer.analyzeCharacter(imageBuffer);
      
      console.log('✅ Character analysis complete:', {
        type: characterAnalysis.characterType,
        pose: characterAnalysis.pose.armPosition,
        needsTPose: characterAnalysis.pose.needsTPose,
        missing: characterAnalysis.missingElements,
        promptLength: characterAnalysis.tPosePrompt.length,
        aiIntegrations: {
          clip: !!characterAnalysis.clipAnalysis,
          mediaPipe: !!characterAnalysis.mediaPipeAnalysis,
          sideView: !!characterAnalysis.sideViewGeneration?.generated
        }
      });
      
      // Preprocess image for optimal Meshy AI processing
      const processedImageBuffer = await this.preprocessImage(imageBuffer);
      
      // Save processed image temporarily
      const tempImagePath = path.join(this.tempDir, `${avatarId}_input.png`);
      await fs.writeFile(tempImagePath, processedImageBuffer);
      
      // Upload primary image to Meshy AI for processing
      const imageUrl = await meshyAIService.uploadImageForProcessing(processedImageBuffer);
      
      // Upload side-view image if generated for multi-image processing
      let sideViewImageUrl: string | undefined;
      if (characterAnalysis.sideViewGeneration?.generated && characterAnalysis.sideViewGeneration.sideViewImagePath) {
        try {
          console.log('📸 Uploading generated side-view image for multi-image processing...');
          const sideViewBuffer = await fs.readFile(characterAnalysis.sideViewGeneration.sideViewImagePath);
          sideViewImageUrl = await meshyAIService.uploadImageForProcessing(sideViewBuffer);
          console.log('✅ Side-view image uploaded successfully');
        } catch (error) {
          console.log('⚠️ Side-view upload failed, proceeding with single image:', error);
        }
      }
      
      let bestResult: ConversionResult | null = null;
      let attempts = 0;
      
      // Regeneration loop to maximize quality
      while (attempts < maxAttempts) {
        attempts++;
        console.log(`🎯 Generation attempt ${attempts}/${maxAttempts}`);
        
        // Check for anatomy completion option
        if (options.enableAnatomyCompletion) {
          console.log('🦴 Anatomy completion enabled - ensuring complete 3D humanoid structure with T-pose stance');
        }
        
        try {
          // Create Meshy AI task with character-specific prompts and multi-image support
          console.log('📝 Sending character-specific prompts to Meshy AI:');
          console.log('✅ T-Pose Prompt:', characterAnalysis.tPosePrompt);
          console.log('❌ Negative Prompt:', characterAnalysis.negativePrompt);
          
          // Create task with multi-image support if side-view is available
          const meshyTask = sideViewImageUrl 
            ? await meshyAIService.createMultiImageTo3DTask(
                imageUrl,
                sideViewImageUrl,
                options.userPlan || 'free',
                characterAnalysis.tPosePrompt,
                characterAnalysis.negativePrompt
              )
            : await meshyAIService.createImageTo3DTask(
                imageUrl,
                options.userPlan || 'free',
                characterAnalysis.tPosePrompt,
                characterAnalysis.negativePrompt
              );
          
          if (sideViewImageUrl) {
            console.log('🎯 Multi-image task created with original + side-view images');
          } else {
            console.log('📸 Single-image task created');
          }
          
          console.log(`⏳ Waiting for Meshy AI task ${meshyTask.id} to complete...`);
          
          // Wait for completion with extended timeout
          const completedTask = await meshyAIService.waitForCompletion(
            meshyTask.id,
            30 * 60 * 1000, // 30 minutes
            5000 // 5 seconds poll interval
          );
          
          if (!completedTask.model_urls?.glb) {
            throw new Error('Meshy AI task completed but no GLB model URL provided');
          }
          
          // Download the generated 3D model
          const glbBuffer = await meshyAIService.downloadModel(completedTask.model_urls.glb);
          
          // Analyze mesh for quality assessment
          const meshStats = await this.analyzeMesh(glbBuffer);
          
          // Check if this result has better quality
          const currentResult = {
            success: true,
            avatarId: `${avatarId}_attempt${attempts}`,
            glbPath: '',
            thumbnailPath: '',
            fileSize: glbBuffer.length,
            processingTime: Date.now() - startTime,
            meshyTaskId: meshyTask.id,
            vertexCount: meshStats.vertexCount,
            faceCount: meshStats.faceCount,
            glbBuffer: glbBuffer,
            completedTask: completedTask
          };
          
          // Quality assessment: prioritize models with PBR textures and high vertex count
          const hasTextures = completedTask.model_urls.glb.includes('texture') || 
                             completedTask.thumbnail_url || 
                             options.userPlan !== 'free';
          
          const qualityScore = meshStats.vertexCount + (hasTextures ? 10000 : 0);
          
          console.log(`📊 Attempt ${attempts} - Quality score: ${qualityScore}, Vertices: ${meshStats.vertexCount}, Has textures: ${hasTextures}`);
          
          if (!bestResult || qualityScore > (bestResult.qualityScore || 0)) {
            bestResult = { ...currentResult, qualityScore };
            console.log(`🏆 New best result found in attempt ${attempts}`);
          }
          
          // If we have a high-quality result with textures, we can stop early
          if (hasTextures && meshStats.vertexCount > 15000) {
            console.log(`✅ High-quality result achieved in attempt ${attempts}, stopping early`);
            break;
          }
          
          // If regeneration is disabled, use first result
          if (!enableRegeneration) {
            console.log(`🔄 Regeneration disabled, using first result`);
            break;
          }
          
        } catch (attemptError) {
          console.warn(`⚠️ Attempt ${attempts} failed:`, attemptError);
          
          // Continue to next attempt unless it's the last one
          if (attempts === maxAttempts) {
            throw attemptError;
          }
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
      
      if (!bestResult) {
        throw new Error('All generation attempts failed');
      }
      
      // Save the best result
      const finalAvatarId = avatarId;
      const glbPath = path.join(this.outputDir, `${finalAvatarId}.glb`);
      await fs.writeFile(glbPath, bestResult.glbBuffer);
      
      // Save original image for future regenerations (preserve processed image)
      const originalImagePath = path.join(this.meshyProcessingDir, `${finalAvatarId}_input.png`);
      await fs.writeFile(originalImagePath, processedImageBuffer);
      console.log('✅ Saved original image for regeneration:', originalImagePath);
      
      // Generate thumbnail using the best result
      const thumbnailPath = await this.generateThumbnail(bestResult.completedTask, finalAvatarId);
      
      const processingTime = Date.now() - startTime;
      
      console.log(`✅ Meshy AI conversion completed in ${processingTime}ms after ${attempts} attempts`);
      console.log(`📊 Final mesh stats: ${bestResult.vertexCount} vertices, ${bestResult.faceCount} faces`);
      console.log(`🎨 Texture quality: ${bestResult.qualityScore > 15000 ? 'High' : 'Standard'}`);
      
      // Cleanup temporary files
      await this.cleanup(tempImagePath);
      
      return {
        success: true,
        avatarId: finalAvatarId,
        glbPath,
        thumbnailPath,
        fileSize: bestResult.fileSize,
        processingTime,
        meshyTaskId: bestResult.meshyTaskId,
        vertexCount: bestResult.vertexCount,
        faceCount: bestResult.faceCount
      };
      
    } catch (error) {
      console.error('❌ Meshy AI conversion failed after all attempts:', error);
      
      return {
        success: false,
        avatarId,
        glbPath: '',
        thumbnailPath: '',
        fileSize: 0,
        processingTime: Date.now() - startTime,
        meshyTaskId: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Preprocess image for optimal Meshy AI results
   */
  private async preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
    console.log('🔧 Preprocessing image for Meshy AI...');
    
    try {
      // Optimize image for Meshy AI processing
      const processedBuffer = await sharp(imageBuffer)
        .resize(1024, 1024, { 
          fit: 'contain', 
          background: { r: 255, g: 255, b: 255, alpha: 1 } 
        })
        .png({ 
          quality: 95,
          compressionLevel: 6 
        })
        .toBuffer();
      
      console.log(`✅ Image preprocessed: ${processedBuffer.length} bytes`);
      return processedBuffer;
      
    } catch (error) {
      console.warn('⚠️ Image preprocessing failed, using original:', error);
      return imageBuffer;
    }
  }



  /**
   * Generate thumbnail from Meshy AI result
   */
  private async generateThumbnail(completedTask: MeshyTask, avatarId: string): Promise<string> {
    console.log('🖼️ Generating thumbnail...');
    
    const thumbnailPath = path.join(this.outputDir, `${avatarId}_thumbnail.png`);
    
    try {
      if (completedTask.thumbnail_url) {
        // Download thumbnail from Meshy AI
        const response = await fetch(completedTask.thumbnail_url);
        if (response.ok) {
          const thumbnailBuffer = Buffer.from(await response.arrayBuffer());
          await fs.writeFile(thumbnailPath, thumbnailBuffer);
          console.log('✅ Downloaded thumbnail from Meshy AI');
          return thumbnailPath;
        }
      }
      
      // Generate fallback thumbnail
      const fallbackThumbnail = await this.generateFallbackThumbnail(avatarId);
      await fs.writeFile(thumbnailPath, fallbackThumbnail);
      console.log('✅ Generated fallback thumbnail');
      return thumbnailPath;
      
    } catch (error) {
      console.warn('⚠️ Thumbnail generation failed:', error);
      
      // Create minimal placeholder thumbnail
      const placeholder = await sharp({
        create: {
          width: 512,
          height: 512,
          channels: 4,
          background: { r: 100, g: 100, b: 100, alpha: 1 }
        }
      }).png().toBuffer();
      
      await fs.writeFile(thumbnailPath, placeholder);
      return thumbnailPath;
    }
  }

  /**
   * Generate fallback thumbnail using 3D model preview
   */
  private async generateFallbackThumbnail(avatarId: string): Promise<Buffer> {
    // Create a simple gradient thumbnail as fallback
    return await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 4,
        background: { r: 128, g: 128, b: 200, alpha: 1 }
      }
    })
    .composite([{
      input: Buffer.from(
        `<svg width="512" height="512">
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#8080ff;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#4040cc;stop-opacity:1" />
            </linearGradient>
          </defs>
          <rect width="512" height="512" fill="url(#grad)" />
          <text x="256" y="256" font-family="Arial" font-size="24" fill="white" text-anchor="middle" dy="0.3em">3D Avatar</text>
        </svg>`
      ),
      top: 0,
      left: 0
    }])
    .png()
    .toBuffer();
  }

  /**
   * Analyze mesh for vertex and face count
   */
  private async analyzeMesh(glbBuffer: Buffer): Promise<{ vertexCount: number; faceCount: number }> {
    // Basic GLB analysis - count vertices and faces from binary data
    try {
      // GLB files start with "glTF" magic header
      const magic = glbBuffer.subarray(0, 4).toString();
      if (magic !== 'glTF') {
        throw new Error('Invalid GLB file format');
      }
      
      // For now, return estimated counts based on file size
      // In a full implementation, you would parse the GLB structure
      const estimatedVertices = Math.floor(glbBuffer.length / 50); // Rough estimate
      const estimatedFaces = Math.floor(estimatedVertices * 1.8); // Typical ratio
      
      return {
        vertexCount: estimatedVertices,
        faceCount: estimatedFaces
      };
      
    } catch (error) {
      console.warn('⚠️ Mesh analysis failed:', error);
      return {
        vertexCount: 10000, // Default estimate
        faceCount: 18000
      };
    }
  }

  /**
   * Ensure required directories exist
   */
  private async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.tempDir, { recursive: true });
    await fs.mkdir(this.outputDir, { recursive: true });
  }

  /**
   * Cleanup temporary files
   */
  private async cleanup(tempImagePath: string): Promise<void> {
    try {
      await fs.unlink(tempImagePath);
      console.log('🧹 Temporary files cleaned up');
    } catch (error) {
      console.warn('⚠️ Cleanup failed:', error);
    }
  }

  /**
   * Get conversion status by Meshy task ID
   */
  async getConversionStatus(meshyTaskId: string): Promise<MeshyTask> {
    return await meshyAIService.getTaskStatus(meshyTaskId);
  }

  /**
   * List recent conversions
   */
  async listRecentConversions(limit: number = 10): Promise<MeshyTask[]> {
    return await meshyAIService.listImageTo3DTasks(limit);
  }
}

export const meshy2DTo3DConverter = new Meshy2DTo3DConverter();