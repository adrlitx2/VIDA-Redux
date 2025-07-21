/**
 * Grok-Designed Avatar Model Analyzer
 * Simple GLB model analysis for orientation detection and correction
 * Built with Grok recommendations for optimal streaming display
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

export interface AvatarAnalysis {
  boundingBox: {
    width: number;
    height: number;
    depth: number;
    center: THREE.Vector3;
  };
  orientation: {
    isUpright: boolean;
    rotation: THREE.Euler;
    needsCorrection: boolean;
  };
  scale: {
    recommendedScale: number;
    isOversized: boolean;
    isUndersized: boolean;
  };
  positioning: {
    optimalPosition: THREE.Vector3;
    isHeadVisible: boolean;
    isTorsoVisible: boolean;
  };
  quality: {
    vertices: number;
    faces: number;
    hasTextures: boolean;
    complexity: 'low' | 'medium' | 'high';
  };
}

export class GrokAvatarAnalyzer {
  private loader: GLTFLoader;

  constructor() {
    this.loader = new GLTFLoader();
    
    // Configure loader for better GLB support
    this.loader.setPath('');
    
    // Set up DRACO loader for compressed models
    try {
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath('/draco/');
      this.loader.setDRACOLoader(dracoLoader);
    } catch (error) {
      console.log('DRACO loader not available, using standard GLTF loader');
    }
    
    // Configure for better error handling
    this.loader.setRequestHeader({});
    this.loader.setCrossOrigin('anonymous');
  }

  async analyzeModel(modelUrl: string): Promise<AvatarAnalysis> {
    try {
      console.log('🔍 Analyzing GLB model for streaming optimization:', modelUrl);
      
      // Check if URL is accessible
      const fullUrl = modelUrl.startsWith('http') ? modelUrl : `${window.location.origin}${modelUrl}`;
      console.log('📡 Full GLB URL:', fullUrl);
      
      const gltf = await this.loadModel(fullUrl);
      const model = gltf.scene;
      
      console.log('📦 GLB model loaded successfully, analyzing...');
      
      // Quick model analysis for streaming
      const boundingBox = this.calculateBoundingBox(model);
      const orientation = this.detectOrientation(model, boundingBox);
      const scale = this.calculateStreamingScale(boundingBox);
      const positioning = this.calculateStreamingPosition(boundingBox);
      const quality = this.analyzeModelQuality(model);
      
      const analysis: AvatarAnalysis = {
        boundingBox,
        orientation,
        scale,
        positioning,
        quality
      };
      
      console.log('✅ GLB Analysis Complete for streaming:', {
        boundingBox: `${boundingBox.width.toFixed(2)}x${boundingBox.height.toFixed(2)}x${boundingBox.depth.toFixed(2)}`,
        needsCorrection: analysis.orientation.needsCorrection,
        rotationY: analysis.orientation.rotation.y * 180 / Math.PI,
        rotationZ: analysis.orientation.rotation.z * 180 / Math.PI,
        scale: analysis.scale.recommendedScale,
        vertices: analysis.quality.vertices
      });
      
      return analysis;
      
    } catch (error) {
      console.error('❌ GLB Analysis Failed:', error);
      return this.getDefaultAnalysis();
    }
  }

  private loadModel(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      console.log('📥 Loading GLB model from:', url);
      this.loader.load(
        url,
        (gltf) => {
          console.log('✅ GLB model loaded successfully');
          resolve(gltf);
        },
        (progress) => {
          console.log('⏳ GLB loading progress:', Math.round((progress.loaded / progress.total) * 100) + '%');
        },
        (error) => {
          console.error('❌ GLB loading failed:', error);
          reject(error);
        }
      );
    });
  }

  private calculateBoundingBox(model: THREE.Object3D): AvatarAnalysis['boundingBox'] {
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    
    return {
      width: size.x,
      height: size.y,
      depth: size.z,
      center
    };
  }

  private detectOrientation(model: THREE.Object3D, boundingBox: AvatarAnalysis['boundingBox']): AvatarAnalysis['orientation'] {
    const isUpright = boundingBox.height > boundingBox.width;
    let needsCorrection = false;
    const rotation = new THREE.Euler();
    
    console.log('🎯 Grok-optimized orientation detection - BBox:', {
      width: boundingBox.width.toFixed(2),
      height: boundingBox.height.toFixed(2),
      depth: boundingBox.depth.toFixed(2),
      isUpright
    });
    
    // Grok-recommended approach: Face normals analysis for accurate orientation
    let frontFacingNormals = 0;
    let backFacingNormals = 0;
    let upwardNormals = 0;
    let downwardNormals = 0;
    let totalNormals = 0;
    
    // Analyze face normals to determine model orientation (most reliable method)
    model.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        const normals = child.geometry.attributes.normal;
        if (normals) {
          for (let i = 0; i < normals.count; i++) {
            const nx = normals.getX(i);
            const ny = normals.getY(i);
            const nz = normals.getZ(i);
            
            // Count normals by direction (more accurate than vertex position)
            if (nz > 0.5) frontFacingNormals++;
            if (nz < -0.5) backFacingNormals++;
            if (ny > 0.5) upwardNormals++;
            if (ny < -0.5) downwardNormals++;
            
            totalNormals++;
          }
        }
      }
    });
    
    console.log('🧭 Face normals analysis (Grok-optimized):', {
      frontFacing: frontFacingNormals,
      backFacing: backFacingNormals,
      upward: upwardNormals,
      downward: downwardNormals,
      total: totalNormals
    });
    
    // Grok-recommended orientation correction based on face normals
    if (totalNormals > 0) {
      // Check if model is facing backward (more back-facing normals)
      if (backFacingNormals > frontFacingNormals * 1.3) {
        rotation.y = Math.PI; // 180 degree Y rotation
        needsCorrection = true;
        console.log('🔄 Grok: Model facing backward, applying 180° Y rotation');
      }
      
      // Check if model is facing slightly left/right (common Meshy AI issue)
      const leftRightImbalance = Math.abs(frontFacingNormals - backFacingNormals);
      if (leftRightImbalance > totalNormals * 0.1 && frontFacingNormals > backFacingNormals * 0.8) {
        // Model is slightly angled, apply minor correction
        rotation.y = -Math.PI / 12; // 15 degree correction for left-facing models
        needsCorrection = true;
        console.log('🔄 Grok: Model slightly angled left, applying 15° Y correction');
      }
      
      // Check if model is upside down (more downward normals than upward)
      if (downwardNormals > upwardNormals * 1.3) {
        rotation.z = Math.PI; // 180 degree Z rotation
        needsCorrection = true;
        console.log('🔄 Grok: Model upside down, applying 180° Z rotation');
      }
    }
    
    // Fallback to bounding box analysis if normals are insufficient
    if (totalNormals === 0) {
      console.log('⚠️ No normals found, using bounding box fallback');
      
      // Check if model is sideways based on dimensions
      if (boundingBox.width > boundingBox.height * 1.5) {
        rotation.z = Math.PI / 2; // 90 degree rotation
        needsCorrection = true;
        console.log('🔄 Fallback: Model sideways, applying 90° Z rotation');
      }
      
      // Common Meshy AI issue: models facing +Z instead of -Z
      if (boundingBox.depth > boundingBox.width * 0.8) {
        rotation.y = Math.PI; // 180 degree turn
        needsCorrection = true;
        console.log('🔄 Fallback: Meshy AI depth issue, applying 180° Y rotation');
      }
    }
    
    console.log('🎯 Grok-optimized orientation result:', {
      isUpright,
      needsCorrection,
      rotationY: rotation.y * 180 / Math.PI,
      rotationZ: rotation.z * 180 / Math.PI,
      method: totalNormals > 0 ? 'face_normals' : 'bounding_box'
    });
    
    return {
      isUpright,
      rotation,
      needsCorrection
    };
  }

  private calculateStreamingScale(boundingBox: AvatarAnalysis['boundingBox']): AvatarAnalysis['scale'] {
    // Target for streaming canvas (75% width, 95% height) - improved sizing
    const targetWidth = 0.75;
    const targetHeight = 0.95;
    
    // Calculate scale to fit streaming dimensions
    const scaleByWidth = targetWidth / boundingBox.width;
    const scaleByHeight = targetHeight / boundingBox.height;
    
    // Use smaller scale to ensure model fits
    const recommendedScale = Math.min(scaleByWidth, scaleByHeight);
    
    return {
      recommendedScale,
      isOversized: recommendedScale < 0.3,
      isUndersized: recommendedScale > 1.5
    };
  }

  private calculateStreamingPosition(boundingBox: AvatarAnalysis['boundingBox']): AvatarAnalysis['positioning'] {
    // Simple position calculation for streaming
    const optimalPosition = new THREE.Vector3();
    
    // Center horizontally
    optimalPosition.x = -boundingBox.center.x;
    
    // Position for upper torso (2% from top) - improved positioning
    optimalPosition.y = -boundingBox.center.y + (boundingBox.height * 0.45);
    
    // Center in depth
    optimalPosition.z = -boundingBox.center.z;
    
    return {
      optimalPosition,
      isHeadVisible: true,
      isTorsoVisible: true
    };
  }

  private analyzeModelQuality(model: THREE.Object3D): AvatarAnalysis['quality'] {
    let vertices = 0;
    let faces = 0;
    let hasTextures = false;
    
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          vertices += child.geometry.attributes.position?.count || 0;
          faces += child.geometry.index ? child.geometry.index.count / 3 : vertices / 3;
        }
        
        if (child.material) {
          const material = Array.isArray(child.material) ? child.material[0] : child.material;
          if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshBasicMaterial) {
            if (material.map || material.normalMap || material.roughnessMap) {
              hasTextures = true;
            }
          }
        }
      }
    });
    
    // Determine complexity
    let complexity: 'low' | 'medium' | 'high' = 'low';
    if (vertices > 50000) complexity = 'high';
    else if (vertices > 10000) complexity = 'medium';
    
    return {
      vertices,
      faces,
      hasTextures,
      complexity
    };
  }

  private getDefaultAnalysis(): AvatarAnalysis {
    return {
      boundingBox: {
        width: 1,
        height: 2,
        depth: 1,
        center: new THREE.Vector3(0, 0, 0)
      },
      orientation: {
        isUpright: true,
        rotation: new THREE.Euler(0, 0, 0),
        needsCorrection: false
      },
      scale: {
        recommendedScale: 1.0,
        isOversized: false,
        isUndersized: false
      },
      positioning: {
        optimalPosition: new THREE.Vector3(0, 0, 0),
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

  dispose() {
    // Cleanup if needed
  }
}

export const grokAvatarAnalyzer = new GrokAvatarAnalyzer();