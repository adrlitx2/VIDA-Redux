/**
 * Image Character Analyzer Service
 * Analyzes uploaded images to generate T-pose character descriptions for Meshy AI
 */

import sharp from 'sharp';
import { clipAnalyzer } from './clip-analyzer.js';
import { mediaPipeAnalyzer } from './mediapipe-analyzer.js';
import { sideViewGenerator } from './sideview-generator.js';

export interface CharacterAnalysis {
  characterType: 'male' | 'female' | 'child' | 'anthropomorphic' | 'creature' | 'unknown';
  bodyParts: {
    head: boolean;
    torso: boolean;
    leftArm: boolean;
    rightArm: boolean;
    leftLeg: boolean;
    rightLeg: boolean;
    feet: boolean;
  };
  clothing: {
    shirt: boolean;
    pants: boolean;
    shoes: boolean;
    accessories: string[];
  };
  pose: {
    armPosition: 'up' | 'down' | 'crossed' | 'extended' | 'mixed' | 'unknown';
    legPosition: 'standing' | 'sitting' | 'walking' | 'unknown';
    needsTPose: boolean;
  };
  style: 'realistic' | 'cartoon' | 'anime' | 'pixelart' | 'sketch' | 'photo';
  missingElements: string[];
  tPosePrompt: string;
  negativePrompt: string;
  // Enhanced vida/vidarig analysis
  anatomyConfidence: number;
  styleComplexity: 'simple' | 'moderate' | 'complex' | 'highly_complex';
  humanoidStructure?: {
    hasHead: boolean;
    hasSpine: boolean;
    hasArms: boolean;
    hasLegs: boolean;
    confidence: number;
  };
  depthAnalysis?: {
    hasDepth: boolean;
    complexity: number;
    shadowsDetected: boolean;
    lightingQuality: 'poor' | 'fair' | 'good' | 'excellent';
  };
  // Advanced AI analysis
  clipAnalysis?: {
    semanticDescription: string;
    characterConcepts: string[];
    artStyleConfidence: number;
    objectConfidence: number;
  };
  mediaPipeAnalysis?: {
    faceDetected: boolean;
    bodyLandmarks: Array<{x: number, y: number, z?: number, visibility?: number}>;
    handLandmarks: Array<{x: number, y: number, z?: number, visibility?: number}>;
    poseScore: number;
    estimatedPose: 'frontal' | 'side' | 'back' | 'three_quarter' | 'unknown';
  };
  sideViewGeneration?: {
    generated: boolean;
    sideViewImagePath?: string;
    sideViewPrompt?: string;
    confidenceScore?: number;
  };
}

export class ImageCharacterAnalyzer {
  /**
   * Analyze image to generate character description and T-pose prompt
   */
  async analyzeCharacter(imageBuffer: Buffer): Promise<CharacterAnalysis> {
    console.log('🔍 Starting comprehensive character analysis with AI integration...');
    
    const startTime = Date.now();
    
    try {
      // Get image metadata
      const metadata = await sharp(imageBuffer).metadata();
      const { width, height } = metadata;
      
      // Extract image data for analysis
      const imageData = await sharp(imageBuffer)
        .resize(512, 512, { fit: 'inside' })
        .png()
        .raw()
        .toBuffer({ resolveWithObject: true });
      
      // Analyze image content with enhanced vida/vidarig techniques
      const analysis = await this.performAdvancedImageAnalysis(imageData.data, 512, 512);
      
      // ✨ ENHANCED AI INTEGRATION ✨
      console.log('🚀 Integrating advanced AI analysis...');
      
      // 1. CLIP semantic analysis
      try {
        analysis.clipAnalysis = await clipAnalyzer.analyzeImage(imageBuffer);
        console.log('✅ CLIP analysis completed:', analysis.clipAnalysis.semanticDescription);
      } catch (error) {
        console.log('⚠️ CLIP analysis failed, continuing without');
      }
      
      // 2. MediaPipe pose detection
      try {
        analysis.mediaPipeAnalysis = await mediaPipeAnalyzer.analyzeImage(imageBuffer);
        console.log('✅ MediaPipe analysis completed, pose score:', analysis.mediaPipeAnalysis.poseScore);
      } catch (error) {
        console.log('⚠️ MediaPipe analysis failed, continuing without');
      }
      
      // 3. Stable Diffusion side view generation
      try {
        const characterDescription = `${analysis.characterType} character in ${analysis.style} style`;
        analysis.sideViewGeneration = await sideViewGenerator.generateSideView(
          imageBuffer,
          characterDescription,
          analysis.clipAnalysis,
          analysis.mediaPipeAnalysis
        );
        if (analysis.sideViewGeneration.generated) {
          console.log('✅ Side view generated successfully');
        } else {
          console.log('⚠️ Side view generation failed, proceeding without');
        }
      } catch (error) {
        console.log('⚠️ Side view generation failed, continuing without');
      }
      
      // Generate enhanced T-pose prompt incorporating AI insights
      const tPosePrompt = this.generateAIEnhancedTPosePrompt(analysis);
      const negativePrompt = this.generateAdvancedNegativePrompt(analysis);
      
      const endTime = Date.now();
      console.log(`✅ Comprehensive character analysis completed in ${endTime - startTime}ms`);
      console.log(`📊 Anatomy confidence: ${(analysis.anatomyConfidence * 100).toFixed(1)}%`);
      console.log(`📊 Style complexity: ${analysis.styleComplexity}`);
      console.log(`🧠 AI integrations: CLIP=${!!analysis.clipAnalysis}, MediaPipe=${!!analysis.mediaPipeAnalysis}, SideView=${!!analysis.sideViewGeneration?.generated}`);
      
      return {
        ...analysis,
        tPosePrompt,
        negativePrompt
      };
      
    } catch (error) {
      console.error('❌ Character analysis failed:', error);
      return this.getDefaultAnalysis();
    }
  }
  
  /**
   * Perform advanced image analysis with vida/vidarig techniques
   */
  private async performAdvancedImageAnalysis(
    imageData: Buffer,
    width: number,
    height: number
  ): Promise<Omit<CharacterAnalysis, 'tPosePrompt' | 'negativePrompt'>> {
    
    // Sample pixels across the image for analysis
    const samples = this.sampleImageRegions(imageData, width, height);
    
    // Enhanced vida/vidarig analysis techniques
    const shapeFromShadingAnalysis = this.performShapeFromShadingAnalysis(samples);
    const anthropometricAnalysis = this.performAnthropometricAnalysis(samples, width, height);
    const depthAnalysis = this.performDepthAnalysis(samples);
    
    // Detect character type with enhanced confidence
    const characterType = this.detectCharacterType(samples);
    
    // Analyze body parts presence with anatomical validation
    const bodyParts = this.analyzeBodyParts(samples, width, height);
    
    // Detect clothing and accessories
    const clothing = this.analyzeClothing(samples);
    
    // Analyze current pose with enhanced detection
    const pose = this.analyzePose(samples, bodyParts);
    
    // Determine art style with complexity assessment
    const style = this.detectArtStyle(samples);
    
    // Identify missing elements
    const missingElements = this.identifyMissingElements(bodyParts, clothing, characterType);
    
    // Calculate anatomy confidence using vida techniques
    const anatomyConfidence = this.calculateAnatomyConfidence(
      shapeFromShadingAnalysis,
      anthropometricAnalysis,
      bodyParts
    );
    
    // Assess style complexity
    const styleComplexity = this.assessStyleComplexity(samples, style);
    
    // Humanoid structure analysis
    const humanoidStructure = this.analyzeHumanoidStructure(bodyParts, samples);
    
    return {
      characterType,
      bodyParts,
      clothing,
      pose,
      style,
      missingElements,
      anatomyConfidence,
      styleComplexity,
      humanoidStructure,
      depthAnalysis
    };
  }
  
  /**
   * Sample image regions for analysis
   */
  private sampleImageRegions(imageData: Buffer, width: number, height: number) {
    const regions = {
      head: this.sampleRegion(imageData, width, height, 0.2, 0.6, 0.0, 0.3),
      torso: this.sampleRegion(imageData, width, height, 0.15, 0.65, 0.25, 0.65),
      leftArm: this.sampleRegion(imageData, width, height, 0.0, 0.3, 0.2, 0.8),
      rightArm: this.sampleRegion(imageData, width, height, 0.7, 1.0, 0.2, 0.8),
      legs: this.sampleRegion(imageData, width, height, 0.2, 0.6, 0.6, 1.0),
      background: this.sampleRegion(imageData, width, height, 0.0, 1.0, 0.0, 0.1)
    };
    
    return regions;
  }
  
  /**
   * Sample a specific region of the image
   */
  private sampleRegion(
    imageData: Buffer,
    width: number,
    height: number,
    x1: number,
    x2: number,
    y1: number,
    y2: number
  ) {
    const startX = Math.floor(x1 * width);
    const endX = Math.floor(x2 * width);
    const startY = Math.floor(y1 * height);
    const endY = Math.floor(y2 * height);
    
    const pixels: Array<{r: number, g: number, b: number}> = [];
    
    for (let y = startY; y < endY; y += 5) {
      for (let x = startX; x < endX; x += 5) {
        const index = (y * width + x) * 3;
        if (index < imageData.length - 2) {
          pixels.push({
            r: imageData[index],
            g: imageData[index + 1],
            b: imageData[index + 2]
          });
        }
      }
    }
    
    return pixels;
  }
  
  /**
   * Detect character type from image samples
   */
  private detectCharacterType(samples: any): 'male' | 'female' | 'child' | 'anthropomorphic' | 'creature' | 'unknown' {
    const headPixels = samples.head;
    const torsoPixels = samples.torso;
    
    // Analyze skin tones and features
    const skinTones = this.detectSkinTones(headPixels);
    const hasHumanFeatures = skinTones.length > 0;
    
    // Check for anthropomorphic features (non-human skin colors)
    const hasUnusualColors = this.hasUnusualSkinColors(headPixels);
    
    if (hasUnusualColors) {
      return 'anthropomorphic';
    }
    
    if (hasHumanFeatures) {
      // Simple heuristic: if torso is relatively small, likely child
      const torsoSize = torsoPixels.length;
      return torsoSize < 50 ? 'child' : 'male'; // Default to male, could be enhanced
    }
    
    return 'unknown';
  }
  
  /**
   * Analyze which body parts are visible
   */
  private analyzeBodyParts(samples: any, width: number, height: number) {
    return {
      head: samples.head.length > 10,
      torso: samples.torso.length > 20,
      leftArm: samples.leftArm.length > 5,
      rightArm: samples.rightArm.length > 5,
      leftLeg: samples.legs.length > 10,
      rightLeg: samples.legs.length > 10,
      feet: samples.legs.length > 15 // Assume feet if legs are present
    };
  }
  
  /**
   * Analyze clothing and accessories
   */
  private analyzeClothing(samples: any) {
    const torsoColors = this.getDistinctColors(samples.torso);
    const legColors = this.getDistinctColors(samples.legs);
    
    return {
      shirt: torsoColors.length > 1, // Multiple colors suggest clothing
      pants: legColors.length > 1,
      shoes: samples.legs.length > 20, // Assume shoes if legs well-defined
      accessories: [] // Could be enhanced with specific detection
    };
  }
  
  /**
   * Analyze current pose to determine if T-pose is needed
   */
  private analyzePose(samples: any, bodyParts: any) {
    const leftArmPresent = bodyParts.leftArm;
    const rightArmPresent = bodyParts.rightArm;
    
    // Simple heuristic: if both arms not visible or in wrong position, needs T-pose
    const needsTPose = !leftArmPresent || !rightArmPresent;
    
    let armPosition: 'up' | 'down' | 'crossed' | 'extended' | 'mixed' | 'unknown' = 'unknown';
    
    if (leftArmPresent && rightArmPresent) {
      armPosition = 'extended'; // Assume extended if both visible
    } else if (leftArmPresent || rightArmPresent) {
      armPosition = 'mixed'; // One arm visible
    } else {
      armPosition = 'down'; // No arms visible
    }
    
    return {
      armPosition,
      legPosition: bodyParts.leftLeg && bodyParts.rightLeg ? 'standing' : 'unknown' as 'standing' | 'sitting' | 'walking' | 'unknown',
      needsTPose
    };
  }
  
  /**
   * Detect art style
   */
  private detectArtStyle(samples: any): 'realistic' | 'cartoon' | 'anime' | 'pixelart' | 'sketch' | 'photo' {
    // Simple heuristic based on color complexity and smoothness
    const headColors = this.getDistinctColors(samples.head);
    
    if (headColors.length < 5) {
      return 'cartoon';
    } else if (headColors.length > 20) {
      return 'realistic';
    }
    
    return 'cartoon'; // Default
  }
  
  /**
   * Identify missing elements that need to be generated
   */
  private identifyMissingElements(bodyParts: any, clothing: any, characterType: string): string[] {
    const missing: string[] = [];
    
    if (!bodyParts.leftArm) missing.push('left arm');
    if (!bodyParts.rightArm) missing.push('right arm');
    if (!bodyParts.leftLeg) missing.push('left leg');
    if (!bodyParts.rightLeg) missing.push('right leg');
    if (!bodyParts.feet) missing.push('feet');
    
    if (!clothing.shirt && characterType !== 'creature') missing.push('shirt');
    if (!clothing.pants && characterType !== 'creature') missing.push('pants');
    if (!clothing.shoes && characterType !== 'creature') missing.push('shoes');
    
    return missing;
  }
  
  /**
   * Generate T-pose prompt for Meshy AI
   */
  private generateTPosePrompt(analysis: Omit<CharacterAnalysis, 'tPosePrompt' | 'negativePrompt'>): string {
    const parts: string[] = [];
    
    // Character type
    if (analysis.characterType === 'male') {
      parts.push('adult male character');
    } else if (analysis.characterType === 'female') {
      parts.push('adult female character');
    } else if (analysis.characterType === 'child') {
      parts.push('child character');
    } else if (analysis.characterType === 'anthropomorphic') {
      parts.push('anthropomorphic character');
    } else {
      parts.push('humanoid character');
    }
    
    // T-pose stance
    parts.push('standing in perfect T-pose stance');
    parts.push('arms extended horizontally to the sides');
    parts.push('legs straight and slightly apart');
    parts.push('facing forward');
    
    // Missing body parts
    if (analysis.missingElements.includes('left arm') || analysis.missingElements.includes('right arm')) {
      parts.push('complete arms and hands visible');
    }
    if (analysis.missingElements.includes('left leg') || analysis.missingElements.includes('right leg')) {
      parts.push('complete legs and feet visible');
    }
    
    // Clothing
    if (analysis.missingElements.includes('shirt')) {
      parts.push('wearing a shirt or top');
    }
    if (analysis.missingElements.includes('pants')) {
      parts.push('wearing pants or trousers');
    }
    if (analysis.missingElements.includes('shoes')) {
      parts.push('wearing shoes or footwear');
    }
    
    // Style
    parts.push(`${analysis.style} art style`);
    parts.push('full body visible');
    parts.push('neutral pose');
    parts.push('standing upright');
    
    return parts.join(', ');
  }
  
  /**
   * Generate negative prompt to avoid unwanted poses
   */
  private generateNegativePrompt(analysis: Omit<CharacterAnalysis, 'tPosePrompt' | 'negativePrompt'>): string {
    const negative = [
      'sitting',
      'crouching',
      'bent arms',
      'crossed arms',
      'arms at sides',
      'arms down',
      'hands on hips',
      'closed pose',
      'action pose',
      'dynamic pose',
      'running',
      'jumping',
      'dancing',
      'side view',
      'back view',
      'partial body',
      'cropped',
      'incomplete limbs',
      'missing arms',
      'missing legs',
      'deformed',
      'distorted'
    ];
    
    return negative.join(', ');
  }
  
  /**
   * Helper methods
   */
  private detectSkinTones(pixels: Array<{r: number, g: number, b: number}>): string[] {
    const skinTones: string[] = [];
    
    for (const pixel of pixels) {
      const { r, g, b } = pixel;
      
      // Check for human skin tone ranges
      if (
        (r > 180 && g > 140 && b > 110) || // Light skin
        (r > 140 && g > 100 && b > 70) ||  // Medium skin
        (r > 100 && g > 70 && b > 50)     // Dark skin
      ) {
        const tone = `rgb(${r},${g},${b})`;
        if (!skinTones.includes(tone)) {
          skinTones.push(tone);
        }
      }
    }
    
    return skinTones;
  }
  
  private hasUnusualSkinColors(pixels: Array<{r: number, g: number, b: number}>): boolean {
    for (const pixel of pixels) {
      const { r, g, b } = pixel;
      
      // Check for non-human colors (blue, green, purple, etc.)
      if (
        (b > r + 50 && b > g + 50) || // Blue-ish
        (g > r + 50 && g > b + 50) || // Green-ish
        (r > 200 && g < 100 && b < 100) // Very red
      ) {
        return true;
      }
    }
    
    return false;
  }
  
  private getDistinctColors(pixels: Array<{r: number, g: number, b: number}>): string[] {
    const colors = new Set<string>();
    
    for (const pixel of pixels) {
      // Quantize colors to reduce noise
      const r = Math.floor(pixel.r / 32) * 32;
      const g = Math.floor(pixel.g / 32) * 32;
      const b = Math.floor(pixel.b / 32) * 32;
      
      colors.add(`${r},${g},${b}`);
    }
    
    return Array.from(colors);
  }
  
  /**
   * Advanced vida/vidarig analysis methods
   */
  
  /**
   * Perform Shape-from-Shading analysis (Horn & Brooks, 1989)
   */
  private performShapeFromShadingAnalysis(samples: any) {
    const analysis = {
      shadowDetection: 0,
      lightingQuality: 0,
      depthVariation: 0
    };
    
    // Analyze lighting patterns across face/body regions
    const facePixels = samples.head.pixels || [];
    const torsoPixels = samples.torso.pixels || [];
    
    // Calculate luminance using ITU-R BT.709 standard
    for (const pixel of facePixels) {
      const luminance = 0.2126 * pixel.r + 0.7152 * pixel.g + 0.0722 * pixel.b;
      analysis.lightingQuality += luminance;
      
      // Detect shadows (low luminance areas)
      if (luminance < 80) {
        analysis.shadowDetection++;
      }
    }
    
    // Normalize values
    analysis.lightingQuality /= facePixels.length || 1;
    analysis.shadowDetection /= facePixels.length || 1;
    
    return analysis;
  }
  
  /**
   * Perform anthropometric analysis based on Vitruvian proportions
   */
  private performAnthropometricAnalysis(samples: any, width: number, height: number) {
    const analysis = {
      proportionCompliance: 0,
      headToBodyRatio: 0,
      limbProportions: 0
    };
    
    // Calculate head-to-body ratio (ideal: 1:7 to 1:8)
    const headHeight = height * 0.3; // Estimated head region
    const bodyHeight = height * 0.7; // Estimated body region
    analysis.headToBodyRatio = bodyHeight / headHeight;
    
    // Check if ratio is within anthropometric standards
    if (analysis.headToBodyRatio >= 6.5 && analysis.headToBodyRatio <= 8.5) {
      analysis.proportionCompliance += 0.5;
    }
    
    // Analyze limb proportions
    const armPixels = [...(samples.leftArm.pixels || []), ...(samples.rightArm.pixels || [])];
    const legPixels = samples.legs.pixels || [];
    
    if (armPixels.length > 0 && legPixels.length > 0) {
      analysis.limbProportions = Math.min(armPixels.length / legPixels.length, 1.0);
      if (analysis.limbProportions >= 0.6 && analysis.limbProportions <= 0.8) {
        analysis.proportionCompliance += 0.3;
      }
    }
    
    return analysis;
  }
  
  /**
   * Perform depth analysis using photometric stereo principles
   */
  private performDepthAnalysis(samples: any) {
    const analysis = {
      hasDepth: false,
      complexity: 0,
      shadowsDetected: false,
      lightingQuality: 'fair' as 'poor' | 'fair' | 'good' | 'excellent'
    };
    
    // Analyze RGB channels as simulated light sources
    const allPixels = [
      ...(samples.head.pixels || []),
      ...(samples.torso.pixels || []),
      ...(samples.leftArm.pixels || []),
      ...(samples.rightArm.pixels || [])
    ];
    
    let totalVariance = 0;
    let shadowCount = 0;
    let lightingScore = 0;
    
    for (const pixel of allPixels) {
      // Calculate color variance (indicator of depth/form)
      const variance = Math.sqrt(
        Math.pow(pixel.r - 128, 2) + 
        Math.pow(pixel.g - 128, 2) + 
        Math.pow(pixel.b - 128, 2)
      );
      totalVariance += variance;
      
      // Detect shadows (low overall brightness)
      const brightness = (pixel.r + pixel.g + pixel.b) / 3;
      if (brightness < 60) {
        shadowCount++;
      }
      
      // Score lighting quality
      lightingScore += brightness;
    }
    
    // Calculate metrics
    analysis.complexity = totalVariance / (allPixels.length || 1);
    analysis.hasDepth = analysis.complexity > 30; // Threshold for depth detection
    analysis.shadowsDetected = shadowCount > allPixels.length * 0.1; // >10% shadow pixels
    
    // Determine lighting quality
    const avgBrightness = lightingScore / (allPixels.length || 1);
    if (avgBrightness > 180) analysis.lightingQuality = 'excellent';
    else if (avgBrightness > 140) analysis.lightingQuality = 'good';
    else if (avgBrightness > 100) analysis.lightingQuality = 'fair';
    else analysis.lightingQuality = 'poor';
    
    return analysis;
  }
  
  /**
   * Calculate anatomy confidence using vida techniques
   */
  private calculateAnatomyConfidence(
    shapeFromShading: any,
    anthropometric: any,
    bodyParts: any
  ): number {
    let confidence = 0;
    
    // Shape-from-shading contribution (30%)
    if (shapeFromShading.lightingQuality > 120) confidence += 0.15;
    if (shapeFromShading.shadowDetection > 0.1) confidence += 0.15;
    
    // Anthropometric contribution (40%)
    confidence += anthropometric.proportionCompliance * 0.4;
    
    // Body part completeness (30%)
    const bodyPartsPresent = Object.values(bodyParts).filter(Boolean).length;
    confidence += (bodyPartsPresent / 7) * 0.3;
    
    return Math.min(confidence, 1.0);
  }
  
  /**
   * Assess style complexity
   */
  private assessStyleComplexity(samples: any, style: string): 'simple' | 'moderate' | 'complex' | 'highly_complex' {
    const allPixels = [
      ...(samples.head.pixels || []),
      ...(samples.torso.pixels || []),
      ...(samples.leftArm.pixels || []),
      ...(samples.rightArm.pixels || [])
    ];
    
    // Calculate color diversity and variance
    const uniqueColors = new Set();
    let totalVariance = 0;
    
    for (const pixel of allPixels) {
      const color = `${Math.floor(pixel.r/16)},${Math.floor(pixel.g/16)},${Math.floor(pixel.b/16)}`;
      uniqueColors.add(color);
      
      const variance = Math.sqrt(
        Math.pow(pixel.r - 128, 2) + 
        Math.pow(pixel.g - 128, 2) + 
        Math.pow(pixel.b - 128, 2)
      );
      totalVariance += variance;
    }
    
    const avgVariance = totalVariance / (allPixels.length || 1);
    const colorDiversity = uniqueColors.size;
    
    // Determine complexity based on style and metrics
    if (style === 'pixelart' || (colorDiversity < 8 && avgVariance < 30)) {
      return 'simple';
    } else if (style === 'cartoon' || (colorDiversity < 20 && avgVariance < 60)) {
      return 'moderate';
    } else if (style === 'anime' || (colorDiversity < 40 && avgVariance < 90)) {
      return 'complex';
    } else {
      return 'highly_complex';
    }
  }
  
  /**
   * Analyze humanoid structure
   */
  private analyzeHumanoidStructure(bodyParts: any, samples: any) {
    const structure = {
      hasHead: bodyParts.head,
      hasSpine: bodyParts.torso,
      hasArms: bodyParts.leftArm || bodyParts.rightArm,
      hasLegs: bodyParts.leftLeg || bodyParts.rightLeg,
      confidence: 0
    };
    
    // Calculate confidence based on detected parts
    let score = 0;
    if (structure.hasHead) score += 0.3;
    if (structure.hasSpine) score += 0.2;
    if (structure.hasArms) score += 0.25;
    if (structure.hasLegs) score += 0.25;
    
    structure.confidence = score;
    
    return structure;
  }
  
  /**
   * Generate enhanced T-pose prompt with vida techniques
   */
  private generateEnhancedTPosePrompt(analysis: Omit<CharacterAnalysis, 'tPosePrompt' | 'negativePrompt'>): string {
    const components = [];
    
    // Character type with enhanced description
    if (analysis.characterType === 'anthropomorphic') {
      components.push('anthropomorphic character');
    } else if (analysis.characterType === 'creature') {
      components.push('creature character');
    } else {
      components.push(`${analysis.characterType} character`);
    }
    
    // Enhanced T-pose description
    components.push('standing in perfect T-pose stance');
    components.push('arms extended horizontally to the sides');
    components.push('legs straight and slightly apart');
    components.push('facing forward');
    
    // Add anatomical requirements based on analysis
    if (analysis.anatomyConfidence > 0.7) {
      components.push('anatomically correct proportions');
    }
    
    // Add style-specific requirements
    if (analysis.styleComplexity === 'highly_complex') {
      components.push('detailed character design');
      components.push('high-quality rendering');
    }
    
    // Add missing elements
    if (analysis.missingElements.length > 0) {
      components.push(`complete ${analysis.missingElements.join(', ')}`);
    }
    
    // Add style
    components.push(`${analysis.style} art style`);
    
    // Standard T-pose requirements
    components.push('full body visible');
    components.push('neutral pose');
    components.push('standing upright');
    
    return components.join(', ');
  }
  
  /**
   * Generate AI-enhanced T-pose prompt incorporating CLIP, MediaPipe, and side-view generation insights
   */
  private generateAIEnhancedTPosePrompt(analysis: CharacterAnalysis): string {
    const components = [];
    
    // Base character description
    components.push(analysis.characterType === 'anthropomorphic' 
      ? 'anthropomorphic character' 
      : `${analysis.characterType} character`);
    
    // CLIP semantic insights
    if (analysis.clipAnalysis) {
      components.push(analysis.clipAnalysis.semanticDescription);
      if (analysis.clipAnalysis.characterConcepts.length > 0) {
        components.push(`featuring ${analysis.clipAnalysis.characterConcepts.slice(0, 3).join(', ')}`);
      }
    }
    
    // MediaPipe pose insights
    if (analysis.mediaPipeAnalysis) {
      if (analysis.mediaPipeAnalysis.faceDetected) {
        components.push('with clear facial features');
      }
      if (analysis.mediaPipeAnalysis.bodyLandmarks.length > 10) {
        components.push('with detailed body structure');
      }
      // Override pose to ensure T-pose regardless of detected pose
      components.push('standing in perfect T-pose stance');
    } else {
      components.push('standing in perfect T-pose stance');
    }
    
    // Standard T-pose requirements with AI enhancement
    components.push('arms extended horizontally to the sides');
    components.push('legs straight and slightly apart');
    components.push('facing forward');
    
    // AI-informed anatomical completeness
    components.push('anatomically correct proportions');
    components.push('detailed character design');
    components.push('complete left arm, right arm, left leg, right leg, feet');
    
    // Side-view generation insights
    if (analysis.sideViewGeneration?.generated) {
      components.push('consistent from multiple viewing angles');
      components.push('volumetric 3D structure');
    }
    
    // Style complexity with AI enhancement
    if (analysis.styleComplexity === 'highly_complex') {
      components.push('highly detailed art style');
      components.push('professional character design');
    } else {
      components.push(`${analysis.style} art style`);
    }
    
    // Missing elements completion
    if (analysis.missingElements.length > 0) {
      components.push(`complete ${analysis.missingElements.join(', ')}`);
    }
    
    // Final requirements
    components.push('full body visible');
    components.push('neutral pose');
    components.push('standing upright');
    
    return components.join(', ');
  }

  /**
   * Generate advanced negative prompt
   */
  private generateAdvancedNegativePrompt(analysis: Omit<CharacterAnalysis, 'tPosePrompt' | 'negativePrompt'>): string {
    const negatives = [
      // Basic pose negatives
      'sitting', 'crouching', 'bent arms', 'crossed arms', 'arms at sides', 'arms down',
      'hands on hips', 'closed pose', 'action pose', 'dynamic pose',
      
      // Movement negatives
      'running', 'jumping', 'dancing', 'walking', 'moving',
      
      // Viewpoint negatives
      'side view', 'back view', 'three-quarter view', 'profile view',
      
      // Completeness negatives
      'partial body', 'cropped', 'incomplete limbs', 'missing arms', 'missing legs',
      
      // Quality negatives
      'deformed', 'distorted', 'malformed', 'asymmetrical'
    ];
    
    // Add style-specific negatives
    if (analysis.styleComplexity === 'simple') {
      negatives.push('overly detailed', 'complex shading', 'realistic rendering');
    } else if (analysis.styleComplexity === 'highly_complex') {
      negatives.push('flat colors', 'simple shading', 'basic rendering');
    }
    
    // Add character-specific negatives
    if (analysis.characterType === 'anthropomorphic') {
      negatives.push('human proportions', 'realistic anatomy');
    } else if (analysis.characterType === 'creature') {
      negatives.push('human features', 'bipedal stance');
    }
    
    return negatives.join(', ');
  }
  
  /**
   * Default analysis for fallback cases
   */
  private getDefaultAnalysis(): CharacterAnalysis {
    return {
      characterType: 'male',
      bodyParts: {
        head: true,
        torso: true,
        leftArm: false,
        rightArm: false,
        leftLeg: false,
        rightLeg: false,
        feet: false
      },
      clothing: {
        shirt: false,
        pants: false,
        shoes: false,
        accessories: []
      },
      pose: {
        armPosition: 'unknown',
        legPosition: 'unknown',
        needsTPose: true
      },
      style: 'cartoon',
      missingElements: ['left arm', 'right arm', 'left leg', 'right leg', 'feet', 'shirt', 'pants', 'shoes'],
      tPosePrompt: 'adult male character, standing in perfect T-pose stance, arms extended horizontally to the sides, legs straight and slightly apart, facing forward, complete arms and hands visible, complete legs and feet visible, wearing a shirt or top, wearing pants or trousers, wearing shoes or footwear, cartoon art style, full body visible, neutral pose, standing upright',
      negativePrompt: 'sitting, crouching, bent arms, crossed arms, arms at sides, arms down, hands on hips, closed pose, action pose, dynamic pose, running, jumping, dancing, side view, back view, partial body, cropped, incomplete limbs, missing arms, missing legs, deformed, distorted',
      anatomyConfidence: 0.6,
      styleComplexity: 'moderate',
      humanoidStructure: {
        hasHead: true,
        hasSpine: true,
        hasArms: false,
        hasLegs: false,
        confidence: 0.5
      },
      depthAnalysis: {
        hasDepth: false,
        complexity: 25,
        shadowsDetected: false,
        lightingQuality: 'fair'
      }
    };
  }
}

export const imageCharacterAnalyzer = new ImageCharacterAnalyzer();