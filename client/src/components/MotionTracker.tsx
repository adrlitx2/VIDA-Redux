import { useEffect, useRef, useState } from 'react';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Pose } from '@mediapipe/pose';
import { Hands } from '@mediapipe/hands';

// ARKit-compatible blend shape mapping for podcast streaming
const FACE_LANDMARK_INDICES = {
  // Eye landmarks
  leftEyeTop: 159,
  leftEyeBottom: 145,
  rightEyeTop: 386,
  rightEyeBottom: 374,
  leftEyeInner: 133,
  leftEyeOuter: 33,
  rightEyeInner: 362,
  rightEyeOuter: 263,
  
  // Mouth landmarks
  mouthLeft: 61,
  mouthRight: 291,
  mouthTop: 13,
  mouthBottom: 14,
  lipCornerLeft: 308,
  lipCornerRight: 78,
  upperLipTop: 12,
  lowerLipBottom: 15,
  
  // Nose landmarks
  noseTip: 1,
  noseBase: 2,
  
  // Eyebrow landmarks
  leftBrowInner: 70,
  leftBrowOuter: 46,
  rightBrowInner: 63,
  rightBrowOuter: 105,
  browCenter: 9,
  
  // Jaw landmarks
  jawLeft: 172,
  jawRight: 397,
  chin: 18
};

interface MotionTrackerProps {
  videoStream: MediaStream | null;
  onFaceDetected?: (landmarks: any) => void;
  onPoseDetected?: (landmarks: any) => void;
  onHandsDetected?: (landmarks: any) => void;
  faceTracking?: boolean;
  bodyTracking?: boolean;
  handTracking?: boolean;
}

export default function MotionTracker({
  videoStream,
  onFaceDetected,
  onPoseDetected,
  onHandsDetected,
  faceTracking = true,
  bodyTracking = true,
  handTracking = false
}: MotionTrackerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const faceMeshRef = useRef<FaceMesh | null>(null);
  const poseRef = useRef<Pose | null>(null);
  const handsRef = useRef<Hands | null>(null);
  
  // Grok-optimized state management
  const [kalmanState, setKalmanState] = useState({ headPitch: 0, headYaw: 0, headRoll: 0 });
  const [frameCount, setFrameCount] = useState(0);
  const [lastPerformanceTime, setLastPerformanceTime] = useState(0);

  // Grok-optimized Kalman filter for smooth orientation tracking
  const applyKalmanFilter = (orientation: { headPitch: number; headYaw: number; headRoll: number }) => {
    const k = 0.15; // Kalman gain - optimized for responsiveness
    
    const newState = {
      headPitch: (1 - k) * kalmanState.headPitch + k * orientation.headPitch,
      headYaw: (1 - k) * kalmanState.headYaw + k * orientation.headYaw,
      headRoll: (1 - k) * kalmanState.headRoll + k * orientation.headRoll
    };
    
    setKalmanState(newState);
    return newState;
  };

  // Enhanced confidence scoring based on landmark quality
  const calculateConfidence = (landmarks: any[]) => {
    if (!landmarks || landmarks.length === 0) return 0;
    
    const keyLandmarks = [1, 33, 263, 18, 10, 234, 454]; // nose, eyes, chin, forehead, ears
    let visibleCount = 0;
    let qualityScore = 0;

    for (const index of keyLandmarks) {
      const landmark = landmarks[index];
      if (landmark) {
        visibleCount++;
        qualityScore += Math.max(0, 1 - Math.abs(landmark.z || 0));
      }
    }

    const visibility = visibleCount / keyLandmarks.length;
    const quality = qualityScore / keyLandmarks.length;

    return visibility * 0.7 + quality * 0.3;
  };

  // Enhanced forward-facing detection using multiple landmarks
  const isForwardFacing = (landmarks: any[]) => {
    const noseTip = landmarks[1];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const leftEar = landmarks[234];
    const rightEar = landmarks[454];

    if (!noseTip || !leftEye || !rightEye || !leftEar || !rightEar) return false;

    const eyeCenterX = (leftEye.x + rightEye.x) / 2;
    const eyeCenterY = (leftEye.y + rightEye.y) / 2;
    const noseToEyeX = noseTip.x - eyeCenterX;
    const noseToEyeY = noseTip.y - eyeCenterY;
    const earDistance = Math.abs(leftEar.x - rightEar.x);
    const faceWidth = Math.abs(leftEye.x - rightEye.x);
    const earRatio = earDistance / faceWidth;

    return Math.abs(noseToEyeX) < 0.08 && 
           Math.abs(noseToEyeY) < 0.08 && 
           earRatio > 0.3;
  };

  // Calculate facial blend shape weights from MediaPipe landmarks with Grok enhancements
  const calculateBlendShapeWeights = (landmarks: any[]): Record<string, number> => {
    const weights: Record<string, number> = {};
    
    // Eye landmarks for blink detection
    const leftEyeTop = landmarks[FACE_LANDMARK_INDICES.leftEyeTop];
    const leftEyeBottom = landmarks[FACE_LANDMARK_INDICES.leftEyeBottom];
    const rightEyeTop = landmarks[FACE_LANDMARK_INDICES.rightEyeTop];
    const rightEyeBottom = landmarks[FACE_LANDMARK_INDICES.rightEyeBottom];
    
    if (leftEyeTop && leftEyeBottom && rightEyeTop && rightEyeBottom) {
      // Calculate eye openness (normalized distance between top and bottom landmarks)
      const leftEyeOpenness = Math.abs(leftEyeTop.y - leftEyeBottom.y) * 15;
      const rightEyeOpenness = Math.abs(rightEyeTop.y - rightEyeBottom.y) * 15;
      
      weights['eyeBlinkLeft'] = Math.max(0, Math.min(1, 1 - leftEyeOpenness));
      weights['eyeBlinkRight'] = Math.max(0, Math.min(1, 1 - rightEyeOpenness));
    }
    
    // Mouth landmarks for expression detection
    const mouthLeft = landmarks[FACE_LANDMARK_INDICES.mouthLeft];
    const mouthRight = landmarks[FACE_LANDMARK_INDICES.mouthRight];
    const mouthTop = landmarks[FACE_LANDMARK_INDICES.mouthTop];
    const mouthBottom = landmarks[FACE_LANDMARK_INDICES.mouthBottom];
    const lipCornerLeft = landmarks[FACE_LANDMARK_INDICES.lipCornerLeft];
    const lipCornerRight = landmarks[FACE_LANDMARK_INDICES.lipCornerRight];
    
    if (mouthLeft && mouthRight && mouthTop && mouthBottom && lipCornerLeft && lipCornerRight) {
      // Calculate mouth width and height
      const mouthWidth = Math.abs(mouthRight.x - mouthLeft.x);
      const mouthHeight = Math.abs(mouthTop.y - mouthBottom.y);
      
      // Jaw open detection (mouth height normalized)
      weights['jawOpen'] = Math.max(0, Math.min(1, mouthHeight * 8));
      
      // Smile detection based on lip corner elevation
      const baseY = (mouthLeft.y + mouthRight.y) / 2;
      const leftSmile = Math.max(0, (baseY - lipCornerLeft.y) * 4);
      const rightSmile = Math.max(0, (baseY - lipCornerRight.y) * 4);
      
      weights['mouthSmileLeft'] = Math.max(0, Math.min(1, leftSmile));
      weights['mouthSmileRight'] = Math.max(0, Math.min(1, rightSmile));
      
      // Mouth pucker detection (mouth width)
      const normalMouthWidth = 0.04; // Baseline mouth width
      const puckerAmount = Math.max(0, (normalMouthWidth - mouthWidth) * 10);
      weights['mouthPucker'] = Math.max(0, Math.min(1, puckerAmount));
    }
    
    // Eyebrow landmarks for expression
    const leftBrowInner = landmarks[FACE_LANDMARK_INDICES.leftBrowInner];
    const rightBrowInner = landmarks[FACE_LANDMARK_INDICES.rightBrowInner];
    const browCenter = landmarks[FACE_LANDMARK_INDICES.browCenter];
    
    if (leftBrowInner && rightBrowInner && browCenter) {
      // Brow raise detection (elevation above baseline)
      const browBaseline = 0.35; // Normalized baseline for eyebrow position
      const browRaise = Math.max(0, (browBaseline - browCenter.y) * 3);
      weights['browInnerUp'] = Math.max(0, Math.min(1, browRaise));
    }
    
    return weights;
  };

  useEffect(() => {
    if (!videoStream) return;

    const initializeTrackers = async () => {
      try {
        // Initialize Face Mesh
        if (faceTracking) {
          faceMeshRef.current = new FaceMesh({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
          });
          
          faceMeshRef.current.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
          });

          faceMeshRef.current.onResults((results) => {
            if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
              const landmarks = results.multiFaceLandmarks[0];
              
              // Calculate blend shape weights for facial expressions
              const blendShapeWeights = calculateBlendShapeWeights(landmarks);
              
              // Calculate head rotation from key landmarks
              const noseTip = landmarks[FACE_LANDMARK_INDICES.noseTip];
              const leftEye = landmarks[FACE_LANDMARK_INDICES.leftEyeOuter];
              const rightEye = landmarks[FACE_LANDMARK_INDICES.rightEyeOuter];

              if (noseTip && leftEye && rightEye) {
                const eyeCenterX = (leftEye.x + rightEye.x) / 2;
                const eyeCenterY = (leftEye.y + rightEye.y) / 2;
                
                const yaw = (noseTip.x - eyeCenterX) * 2;
                const pitch = (noseTip.y - eyeCenterY) * 2;
                const roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);

                onFaceDetected?.({
                  rotation: { x: pitch * 30, y: yaw * 30, z: roll * 15 },
                  position: { x: (noseTip.x - 0.5) * 0.5, y: (0.5 - noseTip.y) * 0.5, z: 0 },
                  blendShapes: blendShapeWeights,
                  landmarks
                });
              }
            }
          });
        }

        // Initialize Pose
        if (bodyTracking) {
          poseRef.current = new Pose({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
          });
          
          poseRef.current.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            enableSegmentation: false,
            smoothSegmentation: false,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
          });

          poseRef.current.onResults((results) => {
            if (results.poseLandmarks) {
              onPoseDetected?.(results.poseLandmarks);
            }
          });
        }

        // Initialize Hands
        if (handTracking) {
          handsRef.current = new Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
          });
          
          handsRef.current.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
          });

          handsRef.current.onResults((results) => {
            if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
              onHandsDetected?.(results.multiHandLandmarks);
            }
          });
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize motion trackers:', error);
      }
    };

    initializeTrackers();
  }, [videoStream, faceTracking, bodyTracking, handTracking]);

  useEffect(() => {
    if (!videoStream || !videoRef.current || !isInitialized) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    video.srcObject = videoStream;
    video.play();

    const processFrame = async () => {
      if (video.readyState === 4) {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Process with MediaPipe trackers
        if (faceTracking && faceMeshRef.current) {
          await faceMeshRef.current.send({ image: canvas });
        }
        
        if (bodyTracking && poseRef.current) {
          await poseRef.current.send({ image: canvas });
        }
        
        if (handTracking && handsRef.current) {
          await handsRef.current.send({ image: canvas });
        }
      }
      
      requestAnimationFrame(processFrame);
    };

    video.addEventListener('loadeddata', () => {
      processFrame();
    });

    return () => {
      video.removeEventListener('loadeddata', processFrame);
    };
  }, [videoStream, isInitialized, faceTracking, bodyTracking, handTracking]);

  return (
    <div style={{ display: 'none' }}>
      <video ref={videoRef} style={{ display: 'none' }} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}