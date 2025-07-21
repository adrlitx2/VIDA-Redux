import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';

/**
 * Avatar Orientation Service - Intelligent face detection and forward-facing avatar alignment
 * Uses MediaPipe face mesh for precise face tracking and orientation calculation
 */
export class AvatarOrientationService {
  private faceMesh: FaceMesh | null = null;
  private camera: Camera | null = null;
  private isInitialized = false;
  private lastFaceData: any = null;
  private orientationCallback: ((orientation: AvatarOrientation) => void) | null = null;
  private kalmanState: { headPitch: number; headYaw: number; headRoll: number } = { headPitch: 0, headYaw: 0, headRoll: 0 };
  private frameCount = 0;
  private lastUpdateTime = 0;

  constructor() {
    this.initializeFaceTracking();
  }

  private async initializeFaceTracking() {
    try {
      // Initialize MediaPipe FaceMesh
      this.faceMesh = new FaceMesh({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
        }
      });

      // Configure face mesh settings for optimal tracking
      this.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      // Set up results callback
      this.faceMesh.onResults(this.onFaceResults.bind(this));

      this.isInitialized = true;
      console.log('🎯 Avatar orientation service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize face tracking:', error);
    }
  }

  private onFaceResults(results: any) {
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const landmarks = results.multiFaceLandmarks[0];
      const orientation = this.calculateAvatarOrientation(landmarks);
      
      this.lastFaceData = {
        landmarks,
        orientation,
        timestamp: Date.now()
      };

      // Notify parent component of orientation updates
      if (this.orientationCallback) {
        this.orientationCallback(orientation);
      }
    }
  }

  private calculateAvatarOrientation(landmarks: any[]): AvatarOrientation {
    // Key facial landmarks for orientation calculation (Grok-optimized)
    const noseTip = landmarks[1];        // Nose tip
    const leftEye = landmarks[33];       // Left eye corner
    const rightEye = landmarks[263];     // Right eye corner
    const chin = landmarks[18];          // Chin point
    const forehead = landmarks[10];      // Forehead center

    // Calculate head rotation angles with Grok enhancements
    const headPitch = this.calculateHeadPitch(noseTip, chin, forehead);
    const headYaw = this.calculateHeadYaw(leftEye, rightEye, noseTip);
    const headRoll = this.calculateHeadRoll(leftEye, rightEye);

    // Apply Kalman filter for smoother orientation (Grok optimization)
    const smoothedOrientation = this.applyKalmanFilter({ headPitch, headYaw, headRoll });

    // Calculate optimal avatar position for forward-facing alignment
    const avatarPosition = this.calculateOptimalAvatarPosition(landmarks);

    // Calculate face center for avatar alignment
    const faceCenter = this.calculateFaceCenter(landmarks);

    // Enhanced forward-facing detection using existing MediaPipe tracking
    const isForwardFacing = this.enhancedForwardFacingDetection(landmarks);

    // Calculate blend shapes for facial expressions (from existing MediaPipe)
    const blendShapes = this.calculateBlendShapeWeights(landmarks);

    return {
      headPitch: smoothedOrientation.headPitch,
      headYaw: smoothedOrientation.headYaw,
      headRoll: smoothedOrientation.headRoll,
      avatarPosition,
      faceCenter,
      isForwardFacing,
      confidence: this.calculateConfidence(landmarks),
      blendShapes
    };
  }

  private calculateHeadPitch(noseTip: any, chin: any, forehead: any): number {
    // Calculate vertical head rotation (nodding)
    const verticalRatio = (noseTip.y - forehead.y) / (chin.y - forehead.y);
    return (verticalRatio - 0.5) * 60; // Convert to degrees
  }

  private calculateHeadYaw(leftEye: any, rightEye: any, noseTip: any): number {
    // Calculate horizontal head rotation (turning left/right)
    const eyeDistance = Math.abs(rightEye.x - leftEye.x);
    const eyeCenter = (leftEye.x + rightEye.x) / 2;
    const noseOffset = noseTip.x - eyeCenter;
    
    return (noseOffset / eyeDistance) * 45; // Convert to degrees
  }

  private calculateHeadRoll(leftEye: any, rightEye: any): number {
    // Calculate head tilt (rolling)
    const eyeAngle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
    return (eyeAngle * 180) / Math.PI; // Convert to degrees
  }

  private calculateOptimalAvatarPosition(landmarks: any[]): AvatarPosition {
    // Calculate face bounds for optimal avatar positioning
    const xs = landmarks.map(l => l.x);
    const ys = landmarks.map(l => l.y);
    
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    
    // Calculate center and scaling for upper torso positioning
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const faceWidth = maxX - minX;
    const faceHeight = maxY - minY;
    
    // Intelligent sizing for upper torso view
    const avatarScale = Math.max(faceWidth * 3.5, faceHeight * 2.8); // Scale for upper torso
    const avatarX = centerX - (avatarScale / 2);
    const avatarY = centerY - (avatarScale * 0.3); // Position higher for upper torso
    
    return {
      x: avatarX,
      y: avatarY,
      width: avatarScale,
      height: avatarScale * 1.2, // Slightly taller for upper torso
      scale: avatarScale
    };
  }

  private calculateFaceCenter(landmarks: any[]): { x: number; y: number } {
    // Calculate precise face center for avatar alignment
    const xs = landmarks.map(l => l.x);
    const ys = landmarks.map(l => l.y);
    
    return {
      x: xs.reduce((sum, x) => sum + x, 0) / xs.length,
      y: ys.reduce((sum, y) => sum + y, 0) / ys.length
    };
  }

  private isForwardFacing(headYaw: number, headPitch: number): boolean {
    // Determine if face is looking forward enough for optimal avatar display
    const yawThreshold = 15; // degrees
    const pitchThreshold = 20; // degrees
    
    return Math.abs(headYaw) < yawThreshold && Math.abs(headPitch) < pitchThreshold;
  }

  private applyKalmanFilter(orientation: { headPitch: number; headYaw: number; headRoll: number }): { headPitch: number; headYaw: number; headRoll: number } {
    // Grok-optimized Kalman filter for smooth orientation
    const k = 0.15; // Kalman gain - tuned for responsiveness
    
    this.kalmanState = {
      headPitch: (1 - k) * this.kalmanState.headPitch + k * orientation.headPitch,
      headYaw: (1 - k) * this.kalmanState.headYaw + k * orientation.headYaw,
      headRoll: (1 - k) * this.kalmanState.headRoll + k * orientation.headRoll
    };
    
    return { ...this.kalmanState };
  }

  private enhancedForwardFacingDetection(landmarks: any[]): boolean {
    // Enhanced forward-facing detection using multiple landmarks
    const noseTip = landmarks[1];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const leftEar = landmarks[234];
    const rightEar = landmarks[454];

    if (!noseTip || !leftEye || !rightEye || !leftEar || !rightEar) return false;

    // Calculate eye center
    const eyeCenterX = (leftEye.x + rightEye.x) / 2;
    const eyeCenterY = (leftEye.y + rightEye.y) / 2;

    // Calculate nose-eye vector
    const noseToEyeX = noseTip.x - eyeCenterX;
    const noseToEyeY = noseTip.y - eyeCenterY;

    // Calculate ear visibility (ears should be roughly equidistant for forward-facing)
    const earDistance = Math.abs(leftEar.x - rightEar.x);
    const faceWidth = Math.abs(leftEye.x - rightEye.x);
    const earRatio = earDistance / faceWidth;

    // Forward-facing criteria (Grok-optimized thresholds)
    const yawThreshold = 0.08;
    const pitchThreshold = 0.08;
    const earThreshold = 0.3;

    return Math.abs(noseToEyeX) < yawThreshold && 
           Math.abs(noseToEyeY) < pitchThreshold && 
           earRatio > earThreshold;
  }

  private calculateBlendShapeWeights(landmarks: any[]): Record<string, number> {
    // Calculate blend shapes for facial expressions (from existing MediaPipe tracking)
    const weights: Record<string, number> = {};
    
    // Eye blink detection
    const leftEyeUpper = landmarks[159];
    const leftEyeLower = landmarks[145];
    const rightEyeUpper = landmarks[386];
    const rightEyeLower = landmarks[374];
    
    if (leftEyeUpper && leftEyeLower && rightEyeUpper && rightEyeLower) {
      const leftEyeHeight = Math.abs(leftEyeUpper.y - leftEyeLower.y);
      const rightEyeHeight = Math.abs(rightEyeUpper.y - rightEyeLower.y);
      
      const leftEyeOpenness = Math.max(0, Math.min(1, leftEyeHeight * 25));
      const rightEyeOpenness = Math.max(0, Math.min(1, rightEyeHeight * 25));
      
      weights['eyeBlinkLeft'] = 1 - leftEyeOpenness;
      weights['eyeBlinkRight'] = 1 - rightEyeOpenness;
    }
    
    // Mouth expressions
    const mouthLeft = landmarks[61];
    const mouthRight = landmarks[291];
    const mouthTop = landmarks[13];
    const mouthBottom = landmarks[14];
    const lipCornerLeft = landmarks[78];
    const lipCornerRight = landmarks[308];
    
    if (mouthLeft && mouthRight && mouthTop && mouthBottom && lipCornerLeft && lipCornerRight) {
      const mouthWidth = Math.abs(mouthRight.x - mouthLeft.x);
      const mouthHeight = Math.abs(mouthTop.y - mouthBottom.y);
      
      weights['jawOpen'] = Math.max(0, Math.min(1, mouthHeight * 8));
      
      const baseY = (mouthLeft.y + mouthRight.y) / 2;
      const leftSmile = Math.max(0, (baseY - lipCornerLeft.y) * 4);
      const rightSmile = Math.max(0, (baseY - lipCornerRight.y) * 4);
      
      weights['mouthSmileLeft'] = Math.max(0, Math.min(1, leftSmile));
      weights['mouthSmileRight'] = Math.max(0, Math.min(1, rightSmile));
    }
    
    // Eyebrow expressions
    const leftBrowInner = landmarks[70];
    const rightBrowInner = landmarks[300];
    const browCenter = landmarks[9];
    
    if (leftBrowInner && rightBrowInner && browCenter) {
      const browBaseline = 0.35;
      const browRaise = Math.max(0, (browBaseline - browCenter.y) * 3);
      weights['browInnerUp'] = Math.max(0, Math.min(1, browRaise));
    }
    
    return weights;
  }

  private calculateConfidence(landmarks: any[]): number {
    // Enhanced confidence calculation with landmark quality assessment
    if (!landmarks || landmarks.length === 0) return 0;
    
    // Key landmarks for confidence assessment
    const keyLandmarks = [1, 33, 263, 18, 10, 234, 454]; // nose, eyes, chin, forehead, ears
    let visibleCount = 0;
    let qualityScore = 0;

    for (const index of keyLandmarks) {
      const landmark = landmarks[index];
      if (landmark) {
        visibleCount++;
        // Quality based on z-depth (closer to camera = higher quality)
        qualityScore += Math.max(0, 1 - Math.abs(landmark.z || 0));
      }
    }

    const visibility = visibleCount / keyLandmarks.length;
    const quality = qualityScore / keyLandmarks.length;

    // Performance monitoring
    this.frameCount++;
    const currentTime = performance.now();
    if (this.frameCount % 30 === 0) {
      const fps = 30000 / (currentTime - this.lastUpdateTime);
      console.log(`🎯 Grok-optimized tracking: ${fps.toFixed(1)} FPS, confidence: ${(visibility * 0.7 + quality * 0.3).toFixed(2)}`);
      this.lastUpdateTime = currentTime;
    }

    return visibility * 0.7 + quality * 0.3;
  }

  public setOrientationCallback(callback: (orientation: AvatarOrientation) => void) {
    this.orientationCallback = callback;
  }

  public async processVideoFrame(videoElement: HTMLVideoElement) {
    if (!this.isInitialized || !this.faceMesh || !videoElement) return;

    try {
      await this.faceMesh.send({ image: videoElement });
    } catch (error) {
      console.error('❌ Face processing error:', error);
    }
  }

  public getLastOrientation(): AvatarOrientation | null {
    return this.lastFaceData?.orientation || null;
  }

  public cleanup() {
    if (this.faceMesh) {
      this.faceMesh.close();
    }
    this.isInitialized = false;
    this.lastFaceData = null;
    this.orientationCallback = null;
    this.kalmanState = { headPitch: 0, headYaw: 0, headRoll: 0 };
    this.frameCount = 0;
  }
}

// Type definitions for avatar orientation
export interface AvatarOrientation {
  headPitch: number;      // Vertical rotation (nodding)
  headYaw: number;        // Horizontal rotation (turning left/right)
  headRoll: number;       // Tilt rotation (rolling)
  avatarPosition: AvatarPosition;
  faceCenter: { x: number; y: number };
  isForwardFacing: boolean;
  confidence: number;
  blendShapes: Record<string, number>; // Facial expression blend shapes
}

export interface AvatarPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

// Create singleton instance
export const avatarOrientationService = new AvatarOrientationService();