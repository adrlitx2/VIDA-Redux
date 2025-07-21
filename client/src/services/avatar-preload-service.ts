/**
 * Avatar Preload Service - Loads and analyzes avatars before streaming
 * Uses Grok-designed analyzer for optimal model preparation
 */

import { grokAvatarAnalyzer, type AvatarAnalysis } from './grok-avatar-analyzer';

export interface PreloadedAvatar {
  id: string;
  imageElement: HTMLImageElement;
  analysis: AvatarAnalysis;
  isReady: boolean;
  transformMatrix: {
    translateX: number;
    translateY: number;
    scaleX: number;
    scaleY: number;
    rotation: number;
  };
}

export class AvatarPreloadService {
  private preloadedAvatars = new Map<string, PreloadedAvatar>();
  private loadingPromises = new Map<string, Promise<PreloadedAvatar>>();

  async preloadAvatar(avatar: any): Promise<PreloadedAvatar> {
    const avatarId = avatar.id;
    
    // Return cached preloaded avatar if available
    if (this.preloadedAvatars.has(avatarId)) {
      return this.preloadedAvatars.get(avatarId)!;
    }

    // Return existing loading promise if in progress
    if (this.loadingPromises.has(avatarId)) {
      return this.loadingPromises.get(avatarId)!;
    }

    // Start preloading process
    const loadingPromise = this.performPreload(avatar);
    this.loadingPromises.set(avatarId, loadingPromise);

    try {
      const preloadedAvatar = await loadingPromise;
      this.preloadedAvatars.set(avatarId, preloadedAvatar);
      return preloadedAvatar;
    } finally {
      this.loadingPromises.delete(avatarId);
    }
  }

  private async performPreload(avatar: any): Promise<PreloadedAvatar> {
    console.log('🔄 Preloading avatar for streaming:', avatar.name, 'ModelURL:', avatar.modelUrl);
    
    // Load thumbnail image
    const imageElement = await this.loadImageElement(avatar.thumbnailUrl);
    
    // Analyze 3D model if available
    let analysis: AvatarAnalysis;
    if (avatar.modelUrl) {
      console.log('🔍 Starting GLB model analysis for:', avatar.modelUrl);
      try {
        analysis = await grokAvatarAnalyzer.analyzeModel(avatar.modelUrl);
        console.log('✅ GLB analysis complete:', {
          needsCorrection: analysis.orientation.needsCorrection,
          scale: analysis.scale.recommendedScale,
          rotation: analysis.orientation.rotation
        });
      } catch (error) {
        console.error('❌ GLB analysis failed:', error);
        analysis = this.getDefaultAnalysis();
      }
    } else {
      console.log('⚠️ No model URL available, using default analysis');
      analysis = this.getDefaultAnalysis();
    }
    
    // Calculate transformation matrix based on analysis
    const transformMatrix = this.calculateTransformMatrix(analysis);
    
    const preloadedAvatar: PreloadedAvatar = {
      id: avatar.id,
      imageElement,
      analysis,
      isReady: true,
      transformMatrix
    };
    
    console.log('✅ Avatar preloaded for streaming:', {
      id: avatar.id,
      needsCorrection: analysis.orientation.needsCorrection,
      scale: analysis.scale.recommendedScale,
      transform: transformMatrix
    });
    
    return preloadedAvatar;
  }

  private loadImageElement(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      
      img.src = url;
    });
  }

  private calculateTransformMatrix(analysis: AvatarAnalysis) {
    // Calculate transformations for streaming canvas - updated to match new sizing
    const baseScale = 0.75; // 75% of canvas width (updated from 65%)
    const finalScale = baseScale * analysis.scale.recommendedScale;
    
    // Position adjustments
    let translateX = 0;
    let translateY = 0;
    let rotation = 0;
    
    // Apply orientation corrections
    if (analysis.orientation.needsCorrection) {
      const rotationY = analysis.orientation.rotation.y * 180 / Math.PI;
      const rotationZ = analysis.orientation.rotation.z * 180 / Math.PI;
      
      // Combine rotations
      rotation = rotationY + rotationZ;
      
      console.log('🔄 Applying orientation correction:', {
        rotationY: rotationY.toFixed(1),
        rotationZ: rotationZ.toFixed(1),
        totalRotation: rotation.toFixed(1)
      });
      
      // Adjust position for rotated models
      if (Math.abs(rotation) > 45) {
        translateY += 50; // Move down slightly for rotated models
      }
    }
    
    // Position adjustments from model analysis
    if (analysis.positioning.optimalPosition) {
      translateX += analysis.positioning.optimalPosition.x * 30;
      translateY += analysis.positioning.optimalPosition.y * 30;
    }
    
    // Scale adjustments
    let scaleX = finalScale;
    let scaleY = finalScale;
    
    if (analysis.scale.isOversized) {
      scaleX *= 0.7;
      scaleY *= 0.7;
      translateY += 80; // Move down for oversized models
    } else if (analysis.scale.isUndersized) {
      scaleX *= 1.3;
      scaleY *= 1.3;
    }
    
    return {
      translateX,
      translateY,
      scaleX,
      scaleY,
      rotation
    };
  }

  private getDefaultAnalysis(): AvatarAnalysis {
    return {
      boundingBox: {
        width: 1,
        height: 2,
        depth: 1,
        center: { x: 0, y: 0, z: 0 } as any
      },
      orientation: {
        isUpright: true,
        rotation: { x: 0, y: 0, z: 0 } as any,
        needsCorrection: false
      },
      scale: {
        recommendedScale: 1.0,
        isOversized: false,
        isUndersized: false
      },
      positioning: {
        optimalPosition: { x: 0, y: 0, z: 0 } as any,
        isHeadVisible: true,
        isTorsoVisible: true
      },
      quality: {
        vertices: 1000,
        faces: 2000,
        hasTextures: false,
        complexity: 'low'
      }
    };
  }

  private getTestAnalysis(): AvatarAnalysis {
    console.log('🧪 Using test analysis with forced 180° rotation correction');
    return {
      boundingBox: {
        width: 1,
        height: 2,
        depth: 1,
        center: { x: 0, y: 0, z: 0 } as any
      },
      orientation: {
        isUpright: true,
        rotation: { x: 0, y: Math.PI, z: 0 } as any, // 180 degree rotation
        needsCorrection: true
      },
      scale: {
        recommendedScale: 1.0,
        isOversized: false,
        isUndersized: false
      },
      positioning: {
        optimalPosition: { x: 0, y: 0, z: 0 } as any,
        isHeadVisible: true,
        isTorsoVisible: true
      },
      quality: {
        vertices: 10000,
        faces: 20000,
        hasTextures: true,
        complexity: 'medium'
      }
    };
  }

  getPreloadedAvatar(avatarId: string): PreloadedAvatar | null {
    return this.preloadedAvatars.get(avatarId) || null;
  }

  clearCache() {
    this.preloadedAvatars.clear();
    this.loadingPromises.clear();
  }

  dispose() {
    this.clearCache();
    grokAvatarAnalyzer.dispose();
  }
}

export const avatarPreloadService = new AvatarPreloadService();