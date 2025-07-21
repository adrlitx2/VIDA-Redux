/**
 * Meshy AI Service for 2D to 3D Avatar Generation
 * Uses Meshy AI API for professional-quality 3D model generation
 */

import fetch from 'node-fetch';
import FormData from 'form-data';
import { Readable } from 'stream';

export interface MeshyImageTo3DRequest {
  mode: 'preview' | 'refine';
  image_url: string;
  text_prompt?: string;
  enable_pbr: boolean;
  ai_model?: 'meshy-4' | 'meshy-3' | 'meshy-2' | 'meshy-1';
  surface_mode: 'organic' | 'hard';
  target_polycount: number;
  topology: 'triangle' | 'quad';
  texture_richness: number;
  should_remesh: boolean;
  negative_prompt?: string;
  art_style?: string;
}

export interface MeshyTask {
  id: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED';
  task_type: 'IMAGE_TO_3D' | 'TEXT_TO_3D' | 'TEXT_TO_TEXTURE' | 'REMESH';
  created_at: string;
  finished_at?: string;
  progress: number;
  task_error?: {
    message: string;
    code: string;
  };
  model_urls?: {
    glb: string;
    fbx: string;
    usdz: string;
  };
  video_url?: string;
  thumbnail_url?: string;
}

export interface MeshyBalance {
  balance: number;
  monthly_limit: number;
  used_this_month: number;
}

export class MeshyAIService {
  private apiKey: string;
  private baseUrl: string = 'https://api.meshy.ai/v1';

  constructor() {
    this.apiKey = process.env.MESHY_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('MESHY_API_KEY environment variable is required');
    }
  }

  /**
   * Create a 2D to 3D conversion task with subscription-based settings and character analysis
   */
  async createImageTo3DTask(
    imageUrl: string,
    userPlan: string = 'free',
    textPrompt?: string,
    negativePrompt?: string
  ): Promise<MeshyTask> {
    console.log('🎨 Creating Meshy AI Image to 3D task...');
    
    // Configure settings based on user subscription plan
    const settings = this.getSubscriptionSettings(userPlan);
    
    const requestBody: MeshyImageTo3DRequest = {
      mode: settings.mode,
      image_url: imageUrl,
      text_prompt: textPrompt || 'full body character in T-pose stance, arms extended horizontally, standing upright, complete anatomy with all limbs visible, facing forward, neutral pose',
      enable_pbr: false, // Disable PBR to avoid rough textures
      ai_model: 'meshy-4', // Use meshy-4 for best geometry
      surface_mode: 'organic', // Use organic mode for better processing reliability
      target_polycount: settings.target_polycount,
      topology: 'triangle', // Standard for avatars
      texture_richness: 1, // Minimal texture richness for clean look
      should_remesh: false, // Disable remesh to avoid processing issues
      negative_prompt: negativePrompt || 'sitting, crouching, bent arms, crossed arms, arms at sides, closed pose, non-standard pose, partial body, side view, back view', // Avoid non-T-pose stances
      art_style: 'T-pose character, standing straight, arms extended horizontally, neutral stance' // Encourage T-pose
    };

    console.log('📋 Meshy AI request:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${this.baseUrl}/image-to-3d`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Meshy AI API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json() as any;
    console.log('✅ Meshy AI task created. Full response:', JSON.stringify(result, null, 2));
    
    // Handle Meshy AI response structure: { "result": "task-id" }
    let taskId: string;
    let taskData: MeshyTask;
    
    if (result.result && typeof result.result === 'string') {
      // Meshy AI returns { "result": "task-id-string" }
      taskId = result.result;
      taskData = {
        id: taskId,
        status: 'PENDING',
        task_type: 'IMAGE_TO_3D',
        created_at: new Date().toISOString(),
        progress: 0
      } as MeshyTask;
      console.log('✅ Found Meshy AI task ID in result field:', taskId);
    } else if (result.id) {
      taskId = result.id;
      taskData = result as MeshyTask;
      console.log('✅ Found task ID in id field:', taskId);
    } else if (result.task_id) {
      taskId = result.task_id;
      taskData = { ...result, id: result.task_id } as MeshyTask;
      console.log('✅ Found task ID in task_id field:', taskId);
    } else {
      console.log('⚠️ No ID found in response. Available properties:', Object.keys(result));
      console.log('⚠️ Response structure:', result);
      throw new Error('No task ID found in Meshy AI response. Response: ' + JSON.stringify(result));
    }
    
    console.log('✅ Task ID:', taskId);
    return taskData;
  }

  /**
   * Create a multi-image 2D to 3D conversion task with original + side-view images
   */
  async createMultiImageTo3DTask(
    primaryImageUrl: string,
    sideViewImageUrl: string,
    userPlan: string = 'free',
    textPrompt?: string,
    negativePrompt?: string
  ): Promise<MeshyTask> {
    console.log('🎯 Creating Meshy AI Multi-Image to 3D task...');
    console.log('📸 Primary image:', primaryImageUrl);
    console.log('📸 Side-view image:', sideViewImageUrl);
    
    // Configure settings based on user subscription plan
    const settings = this.getSubscriptionSettings(userPlan);
    
    // Multi-image request includes both views for enhanced accuracy
    const requestBody = {
      mode: settings.mode,
      image_urls: [primaryImageUrl, sideViewImageUrl], // Array of images for multi-view
      text_prompt: textPrompt || 'full body character in T-pose stance, arms extended horizontally, standing upright, complete anatomy with all limbs visible, facing forward, neutral pose, consistent character from multiple angles',
      enable_pbr: false, // Disable PBR to avoid rough textures
      ai_model: 'meshy-4', // Use meshy-4 for best geometry
      surface_mode: 'organic', // Use organic mode for better processing reliability
      target_polycount: settings.target_polycount,
      topology: 'triangle', // Standard for avatars
      texture_richness: 1, // Minimal texture richness for clean look
      should_remesh: false, // Disable remesh to avoid processing issues
      negative_prompt: negativePrompt || 'sitting, crouching, bent arms, crossed arms, arms at sides, closed pose, non-standard pose, partial body, inconsistent views, multiple characters',
      art_style: 'T-pose character, standing straight, arms extended horizontally, neutral stance, consistent multi-view character',
      multi_view: true // Enable multi-view processing
    };

    console.log('📋 Meshy AI multi-image request:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${this.baseUrl}/image-to-3d`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('⚠️ Multi-image API failed, attempting single image fallback...');
      
      // Fallback to single image if multi-image not supported
      return this.createImageTo3DTask(primaryImageUrl, userPlan, textPrompt, negativePrompt);
    }

    const result = await response.json() as any;
    console.log('✅ Meshy AI multi-image task created. Full response:', JSON.stringify(result, null, 2));
    
    // Handle Meshy AI response structure: { "result": "task-id" }
    let taskId: string;
    let taskData: MeshyTask;
    
    if (result.result && typeof result.result === 'string') {
      taskId = result.result;
      taskData = {
        id: taskId,
        status: 'PENDING',
        task_type: 'IMAGE_TO_3D',
        created_at: new Date().toISOString(),
        progress: 0
      } as MeshyTask;
      console.log('✅ Found Meshy AI multi-image task ID in result field:', taskId);
    } else if (result.id) {
      taskId = result.id;
      taskData = result as MeshyTask;
      console.log('✅ Found multi-image task ID in id field:', taskId);
    } else {
      console.log('⚠️ No ID found in multi-image response. Falling back to single image.');
      return this.createImageTo3DTask(primaryImageUrl, userPlan, textPrompt, negativePrompt);
    }
    
    console.log('✅ Multi-image Task ID:', taskId);
    return taskData;
  }

  /**
   * Check the status of a Meshy AI task
   */
  async getTaskStatus(taskId: string): Promise<MeshyTask> {
    const response = await fetch(`${this.baseUrl}/image-to-3d/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Meshy AI API error: ${response.status} - ${errorText}`);
    }

    return await response.json() as MeshyTask;
  }

  /**
   * List all Image to 3D tasks
   */
  async listImageTo3DTasks(limit: number = 10): Promise<MeshyTask[]> {
    const response = await fetch(`${this.baseUrl}/image-to-3d?limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Meshy AI API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json() as { data: MeshyTask[] };
    return result.data;
  }

  /**
   * Check account balance
   */
  async getBalance(): Promise<MeshyBalance> {
    const response = await fetch(`${this.baseUrl}/account/balance`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Meshy AI API error: ${response.status} - ${errorText}`);
    }

    return await response.json() as MeshyBalance;
  }

  /**
   * Wait for task completion with timeout and stuck task handling
   */
  async waitForCompletion(
    taskId: string,
    maxWaitTime: number = 600000, // 10 minutes
    pollInterval: number = 10000 // 10 seconds
  ): Promise<MeshyTask> {
    const startTime = Date.now();
    let lastProgress = 0;
    let stuckCounter = 0;
    let highProgressStuckCounter = 0;
    
    while (Date.now() - startTime < maxWaitTime) {
      const task = await this.getTaskStatus(taskId);
      
      console.log(`⏱️ Task ${taskId} status: ${task.status} (${task.progress}%)`);
      
      if (task.status === 'SUCCEEDED') {
        console.log('✅ Meshy AI task completed successfully');
        return task;
      }
      
      if (task.status === 'FAILED') {
        throw new Error(`Meshy AI task failed: ${task.task_error?.message || 'Unknown error'}`);
      }
      
      // Check for stuck progress
      if (task.progress === lastProgress) {
        stuckCounter++;
        
        // Special handling for high progress (95%+) stuck tasks
        if (task.progress >= 95) {
          highProgressStuckCounter++;
          console.log(`⚠️ High progress task stuck at ${task.progress}% (attempts: ${highProgressStuckCounter})`);
          
          // If stuck at high progress for 6+ attempts (30+ seconds), try to get result
          if (highProgressStuckCounter >= 6) {
            console.log(`🔄 Task ${taskId} stuck at high progress. Checking for available model...`);
            
            // Try to get final result even if status isn't "SUCCEEDED"
            if (task.model_urls && (task.model_urls.glb || task.model_urls.fbx)) {
              console.log(`✅ Found model URL despite stuck status. Treating as complete.`);
              // Force status to succeeded since we have the model
              task.status = 'SUCCEEDED';
              return task;
            }
            
            // If we've been stuck too long at high progress, consider it failed
            if (highProgressStuckCounter >= 12) {
              console.log(`❌ Task ${taskId} permanently stuck at ${task.progress}%. Considering failed.`);
              throw new Error(`Task stuck at ${task.progress}% and unable to complete after extended waiting`);
            }
          }
        }
        
        // General stuck detection - be more lenient
        if (task.progress < 50 && stuckCounter >= 25) {
          console.log(`❌ Task ${taskId} appears permanently stuck at ${task.progress}%`);
          throw new Error(`Task stuck at ${task.progress}% with no progress for extended period`);
        } else if (task.progress >= 50 && stuckCounter >= 30) {
          console.log(`❌ Task ${taskId} appears permanently stuck at ${task.progress}%`);
          throw new Error(`Task stuck at ${task.progress}% with no progress for extended period`);
        }
      } else {
        lastProgress = task.progress;
        stuckCounter = 0;
        highProgressStuckCounter = 0;
      }
      
      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    
    throw new Error(`Meshy AI task timeout after ${maxWaitTime / 1000} seconds`);
  }

  /**
   * Download 3D model from Meshy AI
   */
  async downloadModel(modelUrl: string): Promise<Buffer> {
    console.log('📥 Downloading 3D model from Meshy AI...');
    
    const response = await fetch(modelUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to download model: ${response.status} - ${response.statusText}`);
    }
    
    const buffer = Buffer.from(await response.arrayBuffer());
    console.log(`✅ Downloaded model: ${buffer.length} bytes`);
    return buffer;
  }

  /**
   * Get subscription-based settings for Meshy AI with enhanced texture generation and regeneration support
   */
  private getSubscriptionSettings(userPlan: string) {
    const settings = {
      free: {
        mode: 'preview' as const,
        enable_pbr: false,
        target_polycount: 5000,
        texture_richness: 1,
        should_remesh: false,
        max_regeneration_attempts: 2
      },
      reply_guy: {
        mode: 'preview' as const, // Use preview mode for better reliability
        enable_pbr: false, // Disable PBR to avoid rough textures
        target_polycount: 10000,
        texture_richness: 1,
        should_remesh: false, // Disable remesh to avoid processing issues
        max_regeneration_attempts: 3
      },
      spartan: {
        mode: 'preview' as const, // Use preview mode for better reliability
        enable_pbr: false, // Disable PBR to avoid rough textures
        target_polycount: 15000,
        texture_richness: 1,
        should_remesh: false, // Disable remesh to avoid processing issues
        max_regeneration_attempts: 4
      },
      zeus: {
        mode: 'refine' as const,
        enable_pbr: false, // Disable PBR to avoid rough textures
        target_polycount: 20000,
        texture_richness: 1,
        should_remesh: false, // Disable remesh to avoid processing issues
        max_regeneration_attempts: 5
      },
      goat: {
        mode: 'refine' as const,
        enable_pbr: false, // Disable PBR to avoid rough textures
        target_polycount: 30000,
        texture_richness: 1,
        should_remesh: false, // Disable remesh to avoid processing issues
        max_regeneration_attempts: 6
      }
    };

    return settings[userPlan as keyof typeof settings] || settings.free;
  }

  /**
   * Create Text to 3D task (for text-based avatar generation)
   */
  async createTextTo3DTask(
    prompt: string,
    userPlan: string = 'free'
  ): Promise<MeshyTask> {
    console.log('🎨 Creating Meshy AI Text to 3D task...');
    
    const settings = this.getSubscriptionSettings(userPlan);
    
    const requestBody = {
      mode: settings.mode,
      prompt: prompt,
      art_style: 'realistic',
      negative_prompt: 'blurry, low quality, distorted, deformed',
      enable_pbr: settings.enable_pbr,
      surface_mode: 'organic',
      target_polycount: settings.target_polycount,
      topology: 'triangle',
      texture_richness: settings.texture_richness,
      should_remesh: settings.should_remesh
    };

    const response = await fetch(`${this.baseUrl}/text-to-3d`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Meshy AI API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json() as MeshyTask;
    console.log('✅ Meshy AI text-to-3d task created:', result.id);
    return result;
  }

  /**
   * Upload image to temporary URL for Meshy AI processing
   */
  async uploadImageForProcessing(imageBuffer: Buffer): Promise<string> {
    console.log('📤 Uploading image for Meshy AI processing...');
    
    // Use FormData to upload image directly to Meshy AI's upload endpoint
    const form = new FormData();
    
    // Create a readable stream from the buffer
    const bufferStream = new Readable();
    bufferStream.push(imageBuffer);
    bufferStream.push(null);
    
    form.append('file', bufferStream, {
      filename: 'image.png',
      contentType: 'image/png'
    });
    
    try {
      // Try to upload to Meshy AI's upload endpoint first
      const response = await fetch(`${this.baseUrl}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          ...form.getHeaders()
        },
        body: form
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} - ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('✅ Image uploaded to Meshy AI:', result.url);
      return result.url;
      
    } catch (error) {
      console.error('❌ Failed to upload to Meshy AI upload endpoint, using base64 fallback:', error);
      
      // Fallback: convert to base64 data URL which Meshy AI should support
      const base64Data = imageBuffer.toString('base64');
      const dataUrl = `data:image/png;base64,${base64Data}`;
      console.log('📎 Using base64 data URL fallback');
      
      return dataUrl;
    }
  }
}

export const meshyAIService = new MeshyAIService();