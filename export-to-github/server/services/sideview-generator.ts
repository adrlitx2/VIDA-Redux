/**
 * Side View Generator Service
 * Uses Stable Diffusion to generate proper side-view images for enhanced Meshy generation
 */

import fs from 'fs';
import path from 'path';

export interface SideViewGeneration {
  generated: boolean;
  sideViewImagePath?: string;
  sideViewPrompt?: string;
  confidenceScore?: number;
}

export class SideViewGenerator {
  private apiKey: string;
  
  constructor() {
    this.apiKey = process.env.HUGGINGFACE_API_KEY || '';
  }
  
  /**
   * Generate side view image using Stable Diffusion
   */
  async generateSideView(
    originalImageBuffer: Buffer,
    characterDescription: string,
    clipAnalysis?: any,
    mediaPipeAnalysis?: any
  ): Promise<SideViewGeneration> {
    try {
      console.log('🎨 Generating side view with Stable Diffusion...');
      
      // Create enhanced prompt for side view generation
      const sideViewPrompt = this.createSideViewPrompt(characterDescription, clipAnalysis, mediaPipeAnalysis);
      
      // Generate side view using Stable Diffusion
      const sideViewImage = await this.generateWithStableDiffusion(sideViewPrompt);
      
      if (sideViewImage) {
        // Save generated side view
        const fileName = `sideview_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
        const filePath = path.join('./temp', fileName);
        
        // Ensure temp directory exists
        const tempDir = path.dirname(filePath);
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        fs.writeFileSync(filePath, sideViewImage);
        
        console.log('✅ Side view generated successfully:', fileName);
        
        return {
          generated: true,
          sideViewImagePath: filePath,
          sideViewPrompt,
          confidenceScore: 0.8
        };
      } else {
        console.log('⚠️ Side view generation failed, proceeding without');
        return { generated: false };
      }
      
    } catch (error) {
      console.error('❌ Side view generation failed:', error);
      return { generated: false };
    }
  }
  
  /**
   * Create enhanced prompt for side view generation
   */
  private createSideViewPrompt(
    characterDescription: string,
    clipAnalysis?: any,
    mediaPipeAnalysis?: any
  ): string {
    const components = [];
    
    // Base character description
    components.push(characterDescription);
    
    // Add side view specifications
    components.push('side view');
    components.push('profile view');
    components.push('standing in T-pose stance');
    components.push('arms extended horizontally to the sides');
    components.push('facing left or right');
    components.push('complete side profile');
    
    // Add style information from CLIP analysis
    if (clipAnalysis?.characterConcepts) {
      const styleKeywords = clipAnalysis.characterConcepts.filter((concept: string) => 
        concept.includes('cartoon') || concept.includes('anime') || concept.includes('realistic')
      );
      components.push(...styleKeywords);
    }
    
    // Add pose refinements from MediaPipe analysis
    if (mediaPipeAnalysis?.estimatedPose === 'frontal') {
      components.push('convert frontal view to side profile');
      components.push('maintain character proportions');
    }
    
    // Quality and style specifications
    components.push('high quality');
    components.push('detailed character design');
    components.push('consistent with original character');
    components.push('clear silhouette');
    components.push('proper anatomy');
    
    return components.join(', ');
  }
  
  /**
   * Generate image using Stable Diffusion
   */
  private async generateWithStableDiffusion(prompt: string): Promise<Buffer | null> {
    try {
      // Use Hugging Face Stable Diffusion model
      const response = await fetch('https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            negative_prompt: 'blurry, low quality, distorted, deformed, multiple views, front view, back view, multiple characters, cropped, incomplete, text, watermark',
            num_inference_steps: 20,
            guidance_scale: 7.5,
            width: 512,
            height: 512
          }
        })
      });
      
      if (!response.ok) {
        console.log('⚠️ Stable Diffusion API unavailable');
        return null;
      }
      
      const imageBuffer = Buffer.from(await response.arrayBuffer());
      
      // Validate generated image
      if (imageBuffer.length > 1000) {
        return imageBuffer;
      } else {
        console.log('⚠️ Generated image too small, likely error response');
        return null;
      }
      
    } catch (error) {
      console.error('❌ Stable Diffusion generation failed:', error);
      return null;
    }
  }
  
  /**
   * Create negative prompt for side view generation
   */
  private createNegativePrompt(): string {
    return [
      'front view', 'frontal view', 'facing forward', 'facing camera',
      'back view', 'rear view', 'multiple views', 'multiple angles',
      'blurry', 'low quality', 'distorted', 'deformed', 'malformed',
      'multiple characters', 'cropped', 'incomplete', 'partial',
      'text', 'watermark', 'signature', 'logo',
      'sitting', 'crouching', 'bent arms', 'arms down', 'closed pose'
    ].join(', ');
  }
}

export const sideViewGenerator = new SideViewGenerator();