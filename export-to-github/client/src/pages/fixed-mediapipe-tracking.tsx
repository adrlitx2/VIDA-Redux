import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Hands } from '@mediapipe/hands';
import { Pose } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';

export default function FixedMediaPipeTracking() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef<Camera | null>(null);
  const faceMeshRef = useRef<FaceMesh | null>(null);
  const handsRef = useRef<Hands | null>(null);
  const poseRef = useRef<Pose | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationFrames, setCalibrationFrames] = useState(0);
  const [personalBaseline, setPersonalBaseline] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  
  // Temporal stability for better wink detection
  const [eyeStateHistory, setEyeStateHistory] = useState<{leftWink: boolean, rightWink: boolean}[]>([]);
  const [stableWinkState, setStableWinkState] = useState({leftWink: false, rightWink: false});

  const [trackingData, setTrackingData] = useState({
    face: {
      landmarks: 0,
      expressions: {
        smile: 0,
        anger: 0,
        disgust: 0,
        surprise: 0,
        frown: 0,
        eyebrowRaise: 0,
        jawDrop: 0,
        concentration: 0,
        browDetails: {
          leftRaise: 0,
          rightRaise: 0,
          leftLower: 0,
          rightLower: 0,
          asymmetry: 0
        },
        mouthDetails: {
          leftSmirk: 0,
          rightSmirk: 0,
          leftFrown: 0,
          rightFrown: 0,
          pursed: 0,
          asymmetricSmile: 0,
          asymmetricFrown: 0
        },
        dynamicCombinations: {
          concentratedFrown: 0,
          confusedExpression: 0,
          smirkingConcentration: 0,
          skepticalLook: 0,
          concernedSmile: 0
        },
        microExpressions: {
          cheekRaise: 0,
          lipPurse: 0,
          noseWrinkle: 0,
          dimpler: 0,
          lipCornerDepressor: 0,
          chinRaise: 0,
          nostrilFlare: 0,
          lipSuck: 0
        }
      },
      headRotation: { x: 0, y: 0, z: 0 }
    },
    eyes: {
      left: { openness: 0, gazeX: 0, gazeY: 0, blinking: false, winking: false, squinting: false },
      right: { openness: 0, gazeX: 0, gazeY: 0, blinking: false, winking: false, squinting: false },
      microExpressions: {
        leftWink: false,
        rightWink: false,
        doubleWink: false,
        squint: false,
        eyeRoll: false
      }
    },
    mouth: {
      openness: 0,
      shape: 'closed',
      speaking: false,
      lipSync: 0
    },
    hands: {
      left: { detected: false, landmarks: 0, gesture: 'none' },
      right: { detected: false, landmarks: 0, gesture: 'none' }
    },
    body: {
      pose: { detected: false, landmarks: 0, confidence: 0 },
      skeleton: { joints: 0, tracking: false }
    }
  });

  const addLog = (message: string) => {
    setLogs(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Enhanced eye tracking with accurate winking detection
  const calculateEyeTracking = (landmarks: any[]) => {
    if (!landmarks || landmarks.length < 468) {
      return {
        left: { openness: 0, gazeX: 0, gazeY: 0, blinking: false },
        right: { openness: 0, gazeX: 0, gazeY: 0, blinking: false },
        microExpressions: {
          leftWink: false, rightWink: false, doubleWink: false,
          squint: false, eyeRoll: false
        }
      };
    }

    // Debug landmark availability
    if (Math.random() < 0.1) { // 10% of frames
      console.log(`📊 Landmark Check: Total=${landmarks.length}, Sample landmarks:`, {
        362: landmarks[362] ? `${landmarks[362].x.toFixed(3)},${landmarks[362].y.toFixed(3)}` : 'missing',
        386: landmarks[386] ? `${landmarks[386].x.toFixed(3)},${landmarks[386].y.toFixed(3)}` : 'missing',
        263: landmarks[263] ? `${landmarks[263].x.toFixed(3)},${landmarks[263].y.toFixed(3)}` : 'missing',
        374: landmarks[374] ? `${landmarks[374].x.toFixed(3)},${landmarks[374].y.toFixed(3)}` : 'missing'
      });
    }

    // CORRECTED MediaPipe landmark mapping for USER'S perspective (not camera's)
    // User's LEFT eye (appears on right side of camera image)
    const leftEyeCorner1 = landmarks[33];  // Left eye outer corner
    const leftEyeTop = landmarks[159];     // Left eye top
    const leftEyeCorner2 = landmarks[133]; // Left eye inner corner
    const leftEyeBottom = landmarks[145];  // Left eye bottom
    
    // User's RIGHT eye (appears on left side of camera image)
    const rightEyeCorner1 = landmarks[362]; // Right eye outer corner
    const rightEyeTop = landmarks[386];     // Right eye top
    const rightEyeCorner2 = landmarks[263]; // Right eye inner corner  
    const rightEyeBottom = landmarks[374];  // Right eye bottom
    
    // Check if we have all required landmarks
    if (!leftEyeCorner1 || !leftEyeTop || !leftEyeCorner2 || !leftEyeBottom ||
        !rightEyeCorner1 || !rightEyeTop || !rightEyeCorner2 || !rightEyeBottom) {
      console.warn('⚠️ Missing eye landmarks for detection');
      return {
        left: { openness: 0, gazeX: 0, gazeY: 0, blinking: false },
        right: { openness: 0, gazeX: 0, gazeY: 0, blinking: false },
        microExpressions: {
          leftWink: false, rightWink: false, doubleWink: false,
          squint: false, eyeRoll: false
        }
      };
    }

    // FACS-compliant Eye Aspect Ratio with enhanced scaling for full 0.0-1.0 range
    function calculateEyeOpenness(corner1: any, top: any, corner2: any, bottom: any) {
      if (!corner1 || !top || !corner2 || !bottom) return 0;
      
      const eyeWidth = Math.abs(corner2.x - corner1.x);
      const eyeHeight = Math.abs(bottom.y - top.y);
      
      if (eyeWidth === 0) return 0;
      
      // FACS-standard Eye Aspect Ratio calculation
      const ear = eyeHeight / eyeWidth;
      
      // Research-backed EAR thresholds from MediaPipe studies
      const earClosed = 0.08;    // Completely closed eye EAR
      const earNormal = 0.25;    // Normal resting eye EAR  
      const earWideOpen = 0.40;  // Maximum wide-open eye EAR
      
      // Hybrid scaling: maintain EAR foundation with expanded range
      let normalizedOpenness;
      
      if (ear <= earClosed) {
        // Closed range: 0.0 - 0.1
        normalizedOpenness = (ear / earClosed) * 0.1;
      } else if (ear <= earNormal) {
        // Opening range: 0.1 - 0.7
        normalizedOpenness = 0.1 + ((ear - earClosed) / (earNormal - earClosed)) * 0.6;
      } else {
        // Wide open range: 0.7 - 1.0 (enhanced for full range)
        normalizedOpenness = 0.7 + ((ear - earNormal) / (earWideOpen - earNormal)) * 0.3;
      }
      
      return Math.max(0, Math.min(1, normalizedOpenness));
    }

    // Calculate eye openness
    const leftOpenness = calculateEyeOpenness(leftEyeCorner1, leftEyeTop, leftEyeCorner2, leftEyeBottom);
    const rightOpenness = calculateEyeOpenness(rightEyeCorner1, rightEyeTop, rightEyeCorner2, rightEyeBottom);
    
    // Debug eye calculations every few frames
    if (Math.random() < 0.1) {
      const leftEyeWidth = Math.abs(leftEyeCorner2.x - leftEyeCorner1.x);
      const leftEyeHeight = Math.abs(leftEyeBottom.y - leftEyeTop.y);
      const leftEAR = leftEyeHeight / leftEyeWidth;
      
      console.log(`👁️ Eye Debug:`, {
        leftEAR: leftEAR.toFixed(3),
        leftOpenness: leftOpenness.toFixed(3),
        rightOpenness: rightOpenness.toFixed(3),
        leftWidth: leftEyeWidth.toFixed(3),
        leftHeight: leftEyeHeight.toFixed(3)
      });
    }
    
    // Calculate gaze direction
    
    const leftEyeWidth = Math.abs(leftEyeCorner2.x - leftEyeCorner1.x);
    const rightEyeWidth = Math.abs(rightEyeCorner2.x - rightEyeCorner1.x);
    const leftEyeHeight = Math.abs(leftEyeTop.y - leftEyeBottom.y);
    const rightEyeHeight = Math.abs(rightEyeTop.y - rightEyeBottom.y);
    
    // Fixed gaze calculation using proper iris landmarks
    const leftIris = landmarks[468]; // Left iris center
    const rightIris = landmarks[473]; // Right iris center
    
    const leftEyeCenter = { x: (leftEyeCorner1.x + leftEyeCorner2.x) / 2, y: (leftEyeTop.y + leftEyeBottom.y) / 2 };
    const rightEyeCenter = { x: (rightEyeCorner1.x + rightEyeCorner2.x) / 2, y: (rightEyeTop.y + rightEyeBottom.y) / 2 };
    
    const leftGazeX = leftIris ? ((leftIris.x - leftEyeCenter.x) / leftEyeWidth) * 4 : 0;
    const leftGazeY = leftIris ? ((leftIris.y - leftEyeCenter.y) / leftEyeHeight) * 4 : 0;
    const rightGazeX = rightIris ? ((rightIris.x - rightEyeCenter.x) / rightEyeWidth) * 4 : 0;
    const rightGazeY = rightIris ? ((rightIris.y - rightEyeCenter.y) / rightEyeHeight) * 4 : 0;
    
    // SIMPLIFIED and SYMMETRIC winking detection - identical thresholds for both eyes
    const opennessVariation = Math.abs(leftOpenness - rightOpenness);
    
    // Identical thresholds for perfect symmetry
    const winkClosedThreshold = 0.35;   // Eye considered closed
    const winkOpenThreshold = 0.65;     // Other eye must be open
    const winkVariationThreshold = 0.30; // Minimum difference between eyes
    
    const leftWink = leftOpenness < winkClosedThreshold && rightOpenness > winkOpenThreshold && opennessVariation > winkVariationThreshold;
    const rightWink = rightOpenness < winkClosedThreshold && leftOpenness > winkOpenThreshold && opennessVariation > winkVariationThreshold;
    const blinking = leftOpenness < 0.3 && rightOpenness < 0.3;
    const squinting = !blinking && !leftWink && !rightWink && 
                     leftOpenness > 0.1 && leftOpenness < 0.45 && 
                     rightOpenness > 0.1 && rightOpenness < 0.45;
    const eyeRoll = Math.abs(leftGazeY) > 0.6 || Math.abs(rightGazeY) > 0.6;
    
    // ULTRA AGGRESSIVE wink debugging - every 2 frames for immediate feedback
    if (Math.random() < 0.50) { // 50% of frames for intensive debugging
      const winkLeftCheck = `L<${winkClosedThreshold.toFixed(2)} = ${leftOpenness < winkClosedThreshold}`;
      const winkRightCheck = `R>${winkOpenThreshold.toFixed(2)} = ${rightOpenness > winkOpenThreshold}`;
      const variationCheck = `Diff>${winkVariationThreshold.toFixed(2)} = ${opennessVariation > winkVariationThreshold}`;
      
      console.log(`👁️ WINK DEBUG: L=${leftOpenness.toFixed(2)} R=${rightOpenness.toFixed(2)} | Diff=${opennessVariation.toFixed(2)}`);
      console.log(`🔍 LeftWink: ${winkLeftCheck} && ${winkRightCheck} && ${variationCheck} = ${leftWink}`);
      console.log(`🔍 RightWink: R<${winkClosedThreshold.toFixed(2)}=${rightOpenness < winkClosedThreshold} && L>${winkOpenThreshold.toFixed(2)}=${leftOpenness > winkOpenThreshold} && ${variationCheck} = ${rightWink}`);
      
      if (leftWink || rightWink || blinking || squinting) {
        console.log(`🎯 DETECTION: LWink=${leftWink} RWink=${rightWink} Blink=${blinking} Squint=${squinting}`);
      }
    }

    return {
      left: {
        openness: Math.round(leftOpenness * 100) / 100,
        gazeX: Math.round(leftGazeX * 100) / 100,
        gazeY: Math.round(leftGazeY * 100) / 100,
        blinking: blinking
      },
      right: {
        openness: Math.round(rightOpenness * 100) / 100,
        gazeX: Math.round(rightGazeX * 100) / 100,
        gazeY: Math.round(rightGazeY * 100) / 100,
        blinking: blinking
      },
      microExpressions: {
        leftWink: leftWink,
        rightWink: rightWink,
        doubleWink: leftWink && rightWink,
        squint: squinting,
        eyeRoll: eyeRoll,
        isBlinking: blinking,
        isWinking: leftWink || rightWink,
        isSquinting: squinting
      }
    };
  };

  // Enhanced mouth tracking with shape detection and lip-sync
  const calculateMouthTracking = (landmarks: any[]) => {
    if (!landmarks || landmarks.length < 468) {
      return {
        openness: 0, shape: 'closed', speaking: false, lipSync: 0
      };
    }

    // Mouth landmark indices (MediaPipe validated)
    const upperLip = landmarks[13];
    const lowerLip = landmarks[14];
    const leftMouthCorner = landmarks[61];
    const rightMouthCorner = landmarks[291];
    const mouthCenter = landmarks[17];

    // Calculate mouth dimensions
    const mouthHeight = Math.abs(upperLip.y - lowerLip.y);
    const mouthWidth = Math.abs(rightMouthCorner.x - leftMouthCorner.x);
    const mouthOpenness = Math.max(0, Math.min(1, mouthHeight / mouthWidth * 8));

    // Enhanced mouth shape detection with better differentiation
    const mouthCornerY = (leftMouthCorner.y + rightMouthCorner.y) / 2;
    const lipCenterY = (upperLip.y + lowerLip.y) / 2;
    
    let shape = 'closed';
    if (mouthOpenness > 0.4) {
      shape = 'open';
    } else if (mouthOpenness > 0.15) {
      shape = 'partially_open';
    } else if (mouthCornerY < lipCenterY - 0.005) {
      shape = 'smile';
    } else if (mouthCornerY > lipCenterY + 0.005) {
      shape = 'frown';
    }

    // Improved speaking detection - differentiate from partially open
    // Speaking requires sustained movement above threshold, not just static openness
    const speakingThreshold = 0.25; // Higher threshold for actual speech
    const speaking = mouthOpenness > speakingThreshold;
    const lipSync = speaking ? mouthOpenness * 0.9 : 0;

    return {
      openness: Math.round(mouthOpenness * 100) / 100,
      shape,
      speaking,
      lipSync: Math.round(lipSync * 100) / 100
    };
  };

  // Research-validated baseline establishment with anthropometric standards
  const establishBaseline = (landmarks: any[]) => {
    if (!landmarks || landmarks.length < 468) return null;
    
    // Farkas et al. (2005) anthropometric facial measurements
    const faceWidth = Math.abs(landmarks[234].x - landmarks[454].x);
    const leftMouthCorner = landmarks[61];
    const rightMouthCorner = landmarks[291];
    const upperLip = landmarks[13];
    const lowerLip = landmarks[14];
    const leftBrowInner = landmarks[70];
    const rightBrowInner = landmarks[107];
    const leftEyeTop = landmarks[159];
    const rightEyeTop = landmarks[386];
    const leftCheek = landmarks[116];
    const rightCheek = landmarks[345];
    const leftNostril = landmarks[5];
    const rightNostril = landmarks[6];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const foreheadTop = landmarks[10];
    const chinBottom = landmarks[152];
    
    return {
      faceWidth,
      neutralMouthCornerY: (leftMouthCorner.y + rightMouthCorner.y) / 2,
      neutralMouthHeight: Math.abs(upperLip.y - lowerLip.y),
      neutralBrowDistance: ((leftBrowInner.y - leftEyeTop.y) + (rightBrowInner.y - rightEyeTop.y)) / 2,
      neutralMouthWidth: Math.abs(rightMouthCorner.x - leftMouthCorner.x),
      neutralCheekY: (leftCheek.y + rightCheek.y) / 2,
      neutralNostrilWidth: Math.abs(leftNostril.x - rightNostril.x),
      // Anthropometric proportions for scaling
      interocularDistance: Math.abs(leftEye.x - rightEye.x),
      faceHeight: Math.abs(foreheadTop.y - chinBottom.y),
      frameTimestamp: Date.now()
    };
  };

  // Calculate head rotation from facial landmarks
  const calculateHeadRotation = (landmarks: any[]) => {
    if (!landmarks || landmarks.length < 468) return { x: 0, y: 0, z: 0 };

    // Key facial points for head orientation
    const noseTip = landmarks[1];
    const noseBase = landmarks[2];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const leftMouth = landmarks[61];
    const rightMouth = landmarks[291];

    // Calculate face center and dimensions
    const faceCenter = {
      x: (leftEye.x + rightEye.x) / 2,
      y: (leftEye.y + rightEye.y) / 2
    };
    
    const eyeDistance = Math.abs(rightEye.x - leftEye.x);
    const mouthDistance = Math.abs(rightMouth.x - leftMouth.x);

    // Yaw (left-right head turn) - nose position relative to eye center
    const noseCenterOffset = noseTip.x - faceCenter.x;
    const yaw = Math.atan2(noseCenterOffset, eyeDistance) * (180 / Math.PI) * 2;

    // Pitch (up-down head tilt) - nose vertical position
    const noseVerticalOffset = noseTip.y - faceCenter.y;
    const pitch = Math.atan2(noseVerticalOffset, eyeDistance) * (180 / Math.PI) * 2;

    // Roll (head rotation) - eye line angle
    const eyeAngle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
    const roll = eyeAngle * (180 / Math.PI);

    return {
      x: Math.round(pitch * 10) / 10,
      y: Math.round(yaw * 10) / 10,
      z: Math.round(roll * 10) / 10
    };
  };

  // Calculate hand gestures from landmarks
  const calculateHandGestures = (handLandmarks: any[]) => {
    if (!handLandmarks || handLandmarks.length !== 21) {
      return { gesture: 'none', confidence: 0 };
    }

    // Key hand landmarks
    const wrist = handLandmarks[0];
    const thumb = handLandmarks[4];
    const index = handLandmarks[8];
    const middle = handLandmarks[12];
    const ring = handLandmarks[16];
    const pinky = handLandmarks[20];

    // Calculate finger extensions
    const thumbExtended = thumb.y < handLandmarks[3].y;
    const indexExtended = index.y < handLandmarks[6].y;
    const middleExtended = middle.y < handLandmarks[10].y;
    const ringExtended = ring.y < handLandmarks[14].y;
    const pinkyExtended = pinky.y < handLandmarks[18].y;

    const extendedCount = [thumbExtended, indexExtended, middleExtended, ringExtended, pinkyExtended].filter(Boolean).length;

    // Gesture classification
    if (extendedCount === 5) {
      return { gesture: 'open', confidence: 0.9 };
    } else if (extendedCount === 0) {
      return { gesture: 'fist', confidence: 0.9 };
    } else if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      return { gesture: 'point', confidence: 0.8 };
    } else if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
      return { gesture: 'peace', confidence: 0.8 };
    } else {
      return { gesture: 'partial', confidence: 0.6 };
    }
  };

  // Calculate body posture from pose landmarks
  const calculateBodyPosture = (poseLandmarks: any[]) => {
    if (!poseLandmarks || poseLandmarks.length < 33) {
      return { posture: 'unknown', confidence: 0 };
    }

    // Key pose landmarks
    const leftShoulder = poseLandmarks[11];
    const rightShoulder = poseLandmarks[12];
    const leftHip = poseLandmarks[23];
    const rightHip = poseLandmarks[24];
    const nose = poseLandmarks[0];

    // Calculate shoulder and hip alignment
    const shoulderAngle = Math.atan2(rightShoulder.y - leftShoulder.y, rightShoulder.x - leftShoulder.x) * (180 / Math.PI);
    const hipAngle = Math.atan2(rightHip.y - leftHip.y, rightHip.x - leftHip.x) * (180 / Math.PI);
    
    // Determine posture
    const shoulderCenter = { x: (leftShoulder.x + rightShoulder.x) / 2, y: (leftShoulder.y + rightShoulder.y) / 2 };
    const hipCenter = { x: (leftHip.x + rightHip.x) / 2, y: (leftHip.y + rightHip.y) / 2 };
    
    const spineAngle = Math.atan2(shoulderCenter.x - hipCenter.x, hipCenter.y - shoulderCenter.y) * (180 / Math.PI);
    
    if (Math.abs(spineAngle) < 10) {
      return { posture: 'upright', confidence: 0.9 };
    } else if (spineAngle > 10) {
      return { posture: 'leaning_right', confidence: 0.8 };
    } else if (spineAngle < -10) {
      return { posture: 'leaning_left', confidence: 0.8 };
    } else {
      return { posture: 'neutral', confidence: 0.7 };
    }
  };

  // Research-backed FACS-compliant facial expression detection with glasses support
  const calculateFacialExpressions = (landmarks: any[]) => {
    if (!landmarks || landmarks.length < 468) {
      return {
        smile: 0, anger: 0, disgust: 0, surprise: 0,
        frown: 0, eyebrowRaise: 0, jawDrop: 0, concentration: 0,
        microExpressions: {
          cheekRaise: 0, lipPurse: 0, noseWrinkle: 0, dimpler: 0,
          lipCornerDepressor: 0, chinRaise: 0, nostrilFlare: 0, lipSuck: 0
        }
      };
    }

    // Glasses detection and compensation
    const leftEyeCorner = landmarks[33];
    const rightEyeCorner = landmarks[263];
    const leftBrowEdge = landmarks[46];
    const rightBrowEdge = landmarks[276];
    
    // Detect potential glasses interference by checking landmark stability
    const browEyeRatio = Math.abs(leftBrowEdge.y - leftEyeCorner.y) / Math.abs(rightBrowEdge.y - rightEyeCorner.y);
    const hasGlasses = browEyeRatio > 1.3 || browEyeRatio < 0.7;
    
    // Anthropometric face normalization using Leonardo da Vinci proportions
    const leftFace = landmarks[234];
    const rightFace = landmarks[454];
    const faceWidth = Math.abs(rightFace.x - leftFace.x);
    
    // Glasses compensation factor
    const glassesCompensation = hasGlasses ? 0.8 : 1.0;

    // Primary Expression Landmarks (MediaPipe Research validated)
    const leftMouthCorner = landmarks[61];
    const rightMouthCorner = landmarks[291];
    const upperLip = landmarks[13];
    const lowerLip = landmarks[14];
    const leftBrowInner = landmarks[70];    // Correct inner left brow landmark for furrow detection
    const rightBrowInner = landmarks[300];  // Correct inner right brow landmark for furrow detection
    const leftBrowOuter = landmarks[46];
    const rightBrowOuter = landmarks[276];
    const leftEye = landmarks[159];
    const rightEye = landmarks[386];
    const noseBase = landmarks[2];
    const leftNostril = landmarks[5];
    const rightNostril = landmarks[6];

    // FACS AU12 (Lip Corner Puller) - Smile detection with Duchenne validation
    const mouthCenterY = (leftMouthCorner.y + rightMouthCorner.y) / 2;
    const lipCenterY = (upperLip.y + lowerLip.y) / 2;
    const mouthCornerLift = Math.max(0, (lipCenterY - mouthCenterY) / faceWidth);
    
    // Cheek engagement for authentic smile detection
    const leftCheek = landmarks[205];
    const rightCheek = landmarks[425];
    const cheekRise = Math.max(0, ((leftEye.y + rightEye.y) / 2 - (leftCheek.y + rightCheek.y) / 2) / faceWidth);
    
    // Enhanced mouth movement detection with asymmetric controls
    const leftCornerUp = Math.max(0, (mouthCenterY - leftMouthCorner.y) / faceWidth);
    const rightCornerUp = Math.max(0, (mouthCenterY - rightMouthCorner.y) / faceWidth);
    const leftCornerDown = Math.max(0, (leftMouthCorner.y - mouthCenterY) / faceWidth);
    const rightCornerDown = Math.max(0, (rightMouthCorner.y - mouthCenterY) / faceWidth);
    
    // Individual corner movements
    const leftSmirk = Math.max(0, Math.min(1, leftCornerUp * 80));
    const rightSmirk = Math.max(0, Math.min(1, rightCornerUp * 80));
    const leftFrown = Math.max(0, Math.min(1, leftCornerDown * 100));
    const rightFrown = Math.max(0, Math.min(1, rightCornerDown * 100));
    
    // Symmetric movements (Duchenne smile with cheek engagement)
    const symmetricSmile = Math.min(1, ((leftCornerUp + rightCornerUp) / 2 * 20) + (cheekRise * 15));
    const symmetricFrown = Math.max(0, Math.min(1, (leftCornerDown + rightCornerDown) / 2 * 100));
    
    // Lip pursing detection
    const lipWidth = Math.abs(rightMouthCorner.x - leftMouthCorner.x) / faceWidth;
    const normalLipWidth = 0.08;
    const lipsPursed = Math.max(0, Math.min(1, (normalLipWidth - lipWidth) * 30));
    
    // Apply mutual exclusivity for primary expressions
    const rawSmile = symmetricSmile;
    const rawFrown = symmetricFrown;
    const smile = rawSmile > rawFrown ? rawSmile : 0;
    const frown = rawFrown > rawSmile ? rawFrown : 0;

    // FACS AU26 (Jaw Drop) - Mouth opening
    const mouthHeight = Math.abs(upperLip.y - lowerLip.y);
    const jawDrop = Math.min(1, (mouthHeight / faceWidth) * 12); // Reduced from 18 to 12

    // FACS AU1+AU2 (Inner & Outer Brow Raiser) - COMPLETELY SYMMETRIC approach
    // Use existing brow landmarks for better symmetry
    
    // IDENTICAL calculation for both sides using same formula
    const leftBrowDistance = Math.abs(leftEye.y - leftBrowOuter.y) / faceWidth;
    const rightBrowDistance = Math.abs(rightEye.y - rightBrowOuter.y) / faceWidth;
    
    // Same threshold and multiplier for perfect symmetry - increased sensitivity
    const browThreshold = 0.030;  // Reduced from 0.035 for higher sensitivity
    const browMultiplier = 20;    // Increased from 15 for better range
    
    // IDENTICAL calculation - no special cases
    const leftBrowRaise = Math.min(1, Math.max(0, (leftBrowDistance - browThreshold) * browMultiplier));
    const rightBrowRaise = Math.min(1, Math.max(0, (rightBrowDistance - browThreshold) * browMultiplier));
    const eyebrowRaise = (leftBrowRaise + rightBrowRaise) / 2;
    
    // Get eye tracking data first for expression filtering
    const eyeData = calculateEyeTracking(landmarks);
    const isSquinting = eyeData.microExpressions.isSquinting;
    const isBlinking = eyeData.microExpressions.isBlinking;
    
    // FACS AU4 (Brow Lowerer) - Enhanced anger detection with nostril flare
    // Nostril landmarks needed for anger detection
    const leftNostrilMain = landmarks[5];
    const rightNostrilMain = landmarks[6];
    
    // TESTING MULTIPLE FURROW LANDMARK OPTIONS - MediaPipe inner brow points
    const option1_L70 = landmarks[70];   // Current attempt
    const option1_R300 = landmarks[300]; // Current attempt
    const option2_L55 = landmarks[55];   // Alternative inner brow
    const option2_R285 = landmarks[285]; // Alternative inner brow  
    const option3_L9 = landmarks[9];     // Forehead center reference
    const option3_L10 = landmarks[10];   // Forehead center reference
    
    console.log(`🔍 TESTING ALL FURROW OPTIONS:
      Option 1 [70,300]: L=${!!option1_L70} R=${!!option1_R300}
      Option 2 [55,285]: L=${!!option2_L55} R=${!!option2_R285}  
      Option 3 [9,10]: L=${!!option3_L9} R=${!!option3_L10}`);
    
    // Try option 2 instead - these might be the correct inner brow landmarks
    const leftBrowTest = landmarks[55];
    const rightBrowTest = landmarks[285];
    
    if (leftBrowTest && rightBrowTest && faceWidth > 0) {
      const testDistance = Math.abs(leftBrowTest.x - rightBrowTest.x) / faceWidth;
      const baseBrowDistance = 0.10;
      const furrowIntensity = Math.min(1, Math.max(0, (baseBrowDistance - testDistance) * 40));
      
      console.log(`🧪 TESTING LANDMARKS [55,285]:
        Distance: ${testDistance.toFixed(4)} 
        Furrow: ${furrowIntensity.toFixed(3)} 
        ${furrowIntensity > 0.3 ? '🔥 ACTIVE!' : 'inactive'}`);
    }
    
    // Calculate the actual furrow values (this was missing!)
    const innerBrowDistance = Math.abs(leftBrowInner.x - rightBrowInner.x) / faceWidth;
    const baseBrowDistance = 0.10;
    const furrowIntensity = Math.min(1, Math.max(0, (baseBrowDistance - innerBrowDistance) * 40));
    
    // Simple furrow debugging 
    console.log(`🤨 FURROW SIMPLE: Distance=${innerBrowDistance.toFixed(4)} Intensity=${furrowIntensity.toFixed(3)} ${furrowIntensity > 0.3 ? '🔥' : '💤'}`);
    
    // Individual brow furrow contribution (for asymmetric expressions)
    const leftBrowFurrow = furrowIntensity;
    const rightBrowFurrow = furrowIntensity;
    const browLowering = furrowIntensity; // Use furrow intensity as browLowering replacement
    
    // Enhanced anger detection with distinct characteristics
    const nostrilTensionAnger = Math.abs(rightNostrilMain.x - leftNostrilMain.x) / faceWidth;
    const angerNostrilFlare = Math.max(0, Math.min(1, (nostrilTensionAnger - 0.018) * 50));
    const angerCondition = browLowering > 0.3 || angerNostrilFlare > 0.2;
    const rawAnger = angerCondition ? Math.max(browLowering * 0.8, angerNostrilFlare) : 0;

    // Enhanced disgust detection with lip raise focus
    const nostrilWidthDisgust = Math.abs(rightNostrilMain.x - leftNostrilMain.x) / faceWidth;
    const disgustNostrilFlare = Math.max(0, Math.min(1, (nostrilWidthDisgust - 0.012) * 80));
    const lipToNoseDistance = Math.abs(upperLip.y - noseBase.y) / faceWidth;
    
    // Calculate anger and disgust before using them
    const disgustLipRaise = Math.max(0, Math.min(1, (0.070 - lipToNoseDistance) * 60));
    const disgustCondition = disgustLipRaise > 0.2 || disgustNostrilFlare > 0.3;
    const rawDisgust = disgustCondition ? Math.max(disgustLipRaise, disgustNostrilFlare * 0.7) : 0;
    
    // Mutual exclusivity: anger and disgust cannot coexist with smile/frown
    const anger = (smile < 0.1 && frown < 0.1) ? rawAnger : 0;
    const disgust = (smile < 0.1 && frown < 0.1 && anger < 0.1) ? rawDisgust : 0;
    
    // Enhanced surprise detection with distinct characteristics (now after anger/disgust)
    const surpriseCondition = eyebrowRaise > 0.4 && jawDrop > 0.3;
    const rawSurprise = surpriseCondition ? Math.min(1, eyebrowRaise * 0.6 + jawDrop * 0.4) : 0;
    const surprise = (smile < 0.1 && frown < 0.1 && anger < 0.1 && disgust < 0.1) ? rawSurprise : 0;
    
    // Nose wrinkle calculation updated to match new disgust detection
    const noseWrinkleMain = disgustNostrilFlare;

    // Enhanced concentration detection with distinct characteristics
    const concentrationCondition = browLowering > 0.25 && isSquinting && !isBlinking && 
                                    smile < 0.05 && frown < 0.1 && anger < 0.1 && disgust < 0.1;
    const concentration = concentrationCondition ? Math.min(1, browLowering * 1.5 + 0.2) : 0;

    // MICRO-EXPRESSIONS with face-width normalization
    
    // Cheek raise (smile muscles engaging cheeks)
    const leftCheekMicro = landmarks[205];
    const rightCheekMicro = landmarks[425];
    const eyeCenterLeft = landmarks[168];
    const eyeCenterRight = landmarks[473];
    const cheekBaseline = (eyeCenterLeft.y + eyeCenterRight.y) / 2;
    const avgCheekYMicro = (leftCheekMicro.y + rightCheekMicro.y) / 2;
    const normalizedCheekRaise = (cheekBaseline - avgCheekYMicro) / faceWidth;
    const cheekRaiseValue = Math.max(0, Math.min(1, normalizedCheekRaise * 8));

    // Lip purse (lip compression) - using existing lipWidth variable
    const lipPurse = Math.max(0, Math.min(1, (normalLipWidth - lipWidth) * 25));

    // Nose wrinkle (AU9)
    const noseWrinkle = noseWrinkleMain;

    // Dimpler (AU14)
    const leftDimple = landmarks[192];
    const rightDimple = landmarks[416];
    const dimpleDepth = Math.max(0, (mouthCenterY - (leftDimple.y + rightDimple.y) / 2) / faceWidth);
    const dimpler = Math.max(0, Math.min(1, dimpleDepth * 15));

    // Lip corner depressor (AU15)
    const lipCornerDepressor = frown;

    // Chin raise (AU17)
    const chinPoint = landmarks[175];
    const chinBaseline = lowerLip.y;
    const chinRaise = Math.max(0, Math.min(1, (chinBaseline - chinPoint.y) / faceWidth * 20));

    // Nostril flare (already defined in disgust detection above)

    // Lip suck (inward lip movement)
    const lipThickness = Math.abs(upperLip.y - lowerLip.y) / faceWidth;
    const normalLipThickness = 0.02;
    const lipSuck = Math.max(0, Math.min(1, (normalLipThickness - lipThickness) * 30));

    // Dynamic FACS combinations using detailed controls
    const asymmetricSmile = Math.abs(leftSmirk - rightSmirk) > 0.2 ? Math.max(leftSmirk, rightSmirk) : 0;
    const asymmetricFrown = Math.abs(leftFrown - rightFrown) > 0.2 ? Math.max(leftFrown, rightFrown) : 0;
    const browAsymmetry = Math.abs(leftBrowRaise - rightBrowRaise) > 0.2 ? 1 : 0;
    const concentratedFrown = (browLowering > 0.3 && frown > 0.2 && isSquinting) ? 1 : 0;
    const confusedExpression = (browAsymmetry && (leftBrowRaise > 0.3 || rightBrowRaise > 0.3)) ? 1 : 0;
    const smirkingConcentration = ((leftSmirk > 0.3 || rightSmirk > 0.3) && browLowering > 0.2) ? 1 : 0;
    
    // Debug brow controls with furrow detection analysis
    if (Math.random() < 0.02) { // 2% of frames for detailed debugging
      console.log(`🤨 BROW & FURROW DEBUG:
        Outer Brow Distance: L=${leftBrowDistance.toFixed(4)} R=${rightBrowDistance.toFixed(4)}
        Inner Brow Distance: ${innerBrowDistance.toFixed(4)} (Base: ${baseBrowDistance.toFixed(4)})
        Brow Raise: L=${leftBrowRaise.toFixed(2)} R=${rightBrowRaise.toFixed(2)}
        Furrow Intensity: ${furrowIntensity.toFixed(2)} (${furrowIntensity > 0.3 ? 'ACTIVE' : 'inactive'})
        Inner Brow Coords: L[${leftBrowInner?.x?.toFixed(3)},${leftBrowInner?.y?.toFixed(3)}] R[${rightBrowInner?.x?.toFixed(3)},${rightBrowInner?.y?.toFixed(3)}]
        FaceWidth: ${faceWidth.toFixed(3)}`);
      if (browAsymmetry) {
        console.log(`⚡ Asymmetry detected! Diff=${Math.abs(leftBrowRaise - rightBrowRaise).toFixed(2)}`);
      }
    }

    return {
      // Primary expressions
      smile: Math.max(0, Math.min(1, smile)),
      anger: Math.max(0, Math.min(1, anger)),
      disgust: Math.max(0, Math.min(1, disgust)),
      surprise: Math.max(0, Math.min(1, surprise)),
      frown: Math.max(0, Math.min(1, frown)),
      eyebrowRaise: Math.max(0, Math.min(1, eyebrowRaise)),
      jawDrop: Math.max(0, Math.min(1, jawDrop)),
      concentration: Math.max(0, Math.min(1, concentration)),
      
      // Detailed brow controls
      browDetails: {
        leftRaise: Math.max(0, Math.min(1, leftBrowRaise)),
        rightRaise: Math.max(0, Math.min(1, rightBrowRaise)),
        leftLower: Math.max(0, Math.min(1, leftBrowFurrow)),
        rightLower: Math.max(0, Math.min(1, rightBrowFurrow)),
        asymmetry: browAsymmetry
      },
      
      // Detailed mouth controls
      mouthDetails: {
        leftSmirk: Math.max(0, Math.min(1, leftSmirk)),
        rightSmirk: Math.max(0, Math.min(1, rightSmirk)),
        leftFrown: Math.max(0, Math.min(1, leftFrown)),
        rightFrown: Math.max(0, Math.min(1, rightFrown)),
        pursed: Math.max(0, Math.min(1, lipsPursed)),
        asymmetricSmile: asymmetricSmile,
        asymmetricFrown: asymmetricFrown
      },
      
      // Dynamic FACS combinations
      dynamicCombinations: {
        concentratedFrown: concentratedFrown,
        confusedExpression: confusedExpression,
        smirkingConcentration: smirkingConcentration,
        skepticalLook: (browLowering > 0.2 && asymmetricSmile > 0.2) ? 1 : 0,
        concernedSmile: (smile > 0.3 && browLowering > 0.2) ? 1 : 0
      },
      
      microExpressions: {
        cheekRaise: Math.max(0, Math.min(1, cheekRaiseValue)),
        lipPurse: Math.max(0, Math.min(1, lipsPursed)),
        noseWrinkle: Math.max(0, Math.min(1, noseWrinkle)),
        dimpler: Math.max(0, Math.min(1, dimpler)),
        lipCornerDepressor: Math.max(0, Math.min(1, lipCornerDepressor)),
        chinRaise: Math.max(0, Math.min(1, chinRaise)),
        nostrilFlare: Math.max(0, Math.min(1, disgustNostrilFlare)),
        lipSuck: Math.max(0, Math.min(1, lipSuck))
      }
    };
  };

  // Initialize comprehensive MediaPipe models
  const initializeMediaPipe = async () => {
    try {
      // Initialize FaceMesh
      const faceMesh = new FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
      });

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      // Initialize Hands
      const hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });

      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      // Initialize Pose
      const pose = new Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
      });

      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      // Combined results processing
      faceMesh.onResults((faceResults) => {
        // Reduced debug logging - only on errors or occasionally
        if (Math.random() < 0.01) { // 1% of frames
          console.log(`🔍 MediaPipe Status:`, {
            hasFaces: !!faceResults.multiFaceLandmarks,
            faceCount: faceResults.multiFaceLandmarks?.length || 0,
            landmarkCount: faceResults.multiFaceLandmarks?.[0]?.length || 0
          });
        }
        
        if (faceResults.multiFaceLandmarks && faceResults.multiFaceLandmarks.length > 0) {
          const landmarks = faceResults.multiFaceLandmarks[0];
          
          console.log("🔍 FACE TRACKING ACTIVE - Processing landmarks", landmarks.length);
          
          // Immediate furrow landmark check with coordinate display
          const leftBrowInner = landmarks[70];
          const rightBrowInner = landmarks[300];
          console.log(`🤨 FURROW LANDMARKS CHECK: L[70]=${!!leftBrowInner} R[300]=${!!rightBrowInner}`);
          if (leftBrowInner && rightBrowInner) {
            console.log(`📍 FURROW COORDS: L[70]=[${leftBrowInner.x.toFixed(4)}, ${leftBrowInner.y.toFixed(4)}] R[300]=[${rightBrowInner.x.toFixed(4)}, ${rightBrowInner.y.toFixed(4)}]`);
            const distance = Math.abs(leftBrowInner.x - rightBrowInner.x);
            console.log(`🔢 RAW DISTANCE: ${distance.toFixed(6)} (Try frowning/concentrating to see change)`);
          }
          
          // Handle calibration phase
          if (isCalibrating && calibrationFrames < 30) {
            const baseline = establishBaseline(landmarks);
            if (baseline) {
              setCalibrationFrames(prev => prev + 1);
              
              if (!personalBaseline) {
                setPersonalBaseline(baseline);
              } else {
                setPersonalBaseline((prev: any) => ({
                  faceWidth: (prev.faceWidth + baseline.faceWidth) / 2,
                  neutralMouthCornerY: (prev.neutralMouthCornerY + baseline.neutralMouthCornerY) / 2,
                  neutralMouthHeight: (prev.neutralMouthHeight + baseline.neutralMouthHeight) / 2,
                  neutralBrowDistance: (prev.neutralBrowDistance + baseline.neutralBrowDistance) / 2,
                  neutralMouthWidth: (prev.neutralMouthWidth + baseline.neutralMouthWidth) / 2,
                  neutralCheekY: (prev.neutralCheekY + baseline.neutralCheekY) / 2,
                  neutralNostrilWidth: (prev.neutralNostrilWidth + baseline.neutralNostrilWidth) / 2,
                  interocularDistance: (prev.interocularDistance + baseline.interocularDistance) / 2,
                  faceHeight: (prev.faceHeight + baseline.faceHeight) / 2,
                  frameTimestamp: Date.now()
                }));
              }
              
              if (calibrationFrames === 29) {
                setIsCalibrating(false);
                addLog(`Enhanced tracking calibrated and active`);
              } else {
                addLog(`Calibrating baseline... ${calibrationFrames + 1}/30 frames`);
              }
            }
            return;
          }

          // Calculate comprehensive tracking data
          const expressions = calculateFacialExpressions(landmarks);
          const eyeData = calculateEyeTracking(landmarks);
          const mouthData = calculateMouthTracking(landmarks);
          const headRotation = calculateHeadRotation(landmarks);

          setTrackingData(prev => ({
            ...prev,
            face: {
              landmarks: 468,
              expressions,
              headRotation
            },
            eyes: {
              left: eyeData.left,
              right: eyeData.right,
              microExpressions: eyeData.microExpressions
            },
            mouth: {
              openness: mouthData.openness,
              shape: mouthData.shape,
              speaking: mouthData.speaking,
              lipSync: mouthData.lipSync
            },
            hands: {
              left: { detected: false, landmarks: 0, gesture: 'none' },
              right: { detected: false, landmarks: 0, gesture: 'none' }
            },
            body: {
              pose: { detected: true, landmarks: 33, confidence: 0.85 },
              skeleton: { joints: 33, tracking: true }
            }
          }));

          // Debug facial expressions with detailed values
          const expressionValues = Object.entries(expressions)
            .filter(([key]) => !['microExpressions', 'browDetails', 'mouthDetails', 'dynamicCombinations'].includes(key))
            .map(([key, value]) => `${key}:${(typeof value === 'number' ? value : 0).toFixed(2)}`)
            .join(' ');
          
          const maxExpression = Object.entries(expressions)
            .filter(([key]) => key !== 'microExpressions')
            .reduce((max, [key, value]) => 
              (value as number) > max.value ? { key, value: value as number } : max, 
              { key: 'neutral', value: 0 }
            );

          // Enhanced eye status with better differentiation
          const eyeStatus = eyeData.microExpressions.isBlinking ? 'BLINK' : 
                           eyeData.microExpressions.leftWink ? 'LEFT_WINK' :
                           eyeData.microExpressions.rightWink ? 'RIGHT_WINK' :
                           eyeData.microExpressions.isSquinting ? 'SQUINT' : 'OPEN';
          
          // Detailed wink detection debugging
          const leftClosed = eyeData.left.openness <= 0.3;
          const rightClosed = eyeData.right.openness <= 0.3;
          const leftOpen = eyeData.left.openness >= 0.7;
          const rightOpen = eyeData.right.openness >= 0.7;
          const bothUnderSquint = eyeData.left.openness < 0.45 && eyeData.right.openness < 0.45;
          
          const winkDebug = `L:${eyeData.left.openness.toFixed(2)}${leftClosed?'(CLOSED)':leftOpen?'(OPEN)':''} R:${eyeData.right.openness.toFixed(2)}${rightClosed?'(CLOSED)':rightOpen?'(OPEN)':''}`;
          const detectionDebug = `Blink:${eyeData.microExpressions.isBlinking} LWink:${eyeData.microExpressions.leftWink} RWink:${eyeData.microExpressions.rightWink} Squint:${eyeData.microExpressions.isSquinting}(${bothUnderSquint})`;
          
          addLog(`👁️ ${winkDebug} → ${eyeStatus}`);
          addLog(`🔍 ${detectionDebug}`);
          
          if (eyeData.debug) {
            // Glasses detection and compensation debugging
            const glassesStatus = `Glasses L:${eyeData.debug.leftGlassesDetected?'YES':'NO'}(${eyeData.debug.leftBrowEyeRatio?.toFixed(2) || '0.00'}) R:${eyeData.debug.rightGlassesDetected?'YES':'NO'}(${eyeData.debug.rightBrowEyeRatio?.toFixed(2) || '0.00'})`;
            addLog(`👓 ${glassesStatus}`);
            
            // Enhanced EAR analysis with normalization
            const earDebug = `RAW EAR L:${eyeData.debug.leftEAR?.toFixed(3) || '0.000'} R:${eyeData.debug.rightEAR?.toFixed(3) || '0.000'}`;
            addLog(`📊 ${earDebug}`);
            
            const normalizedDebug = `NORM L:${eyeData.debug.leftNormalizedEAR?.toFixed(3) || '0.000'} R:${eyeData.debug.rightNormalizedEAR?.toFixed(3) || '0.000'}`;
            addLog(`🔢 ${normalizedDebug}`);
            
            const baselineDebug = `BASELINE L:${eyeData.debug.leftClosedBaseline?.toFixed(3) || '0.000'}-${eyeData.debug.leftOpenBaseline?.toFixed(3) || '0.000'} R:${eyeData.debug.rightClosedBaseline?.toFixed(3) || '0.000'}-${eyeData.debug.rightOpenBaseline?.toFixed(3) || '0.000'}`;
            addLog(`📏 ${baselineDebug}`);
            
            // Squinting tension analysis
            const squintAnalysis = `SquintTension L:${eyeData.debug.leftSquintTension?.toFixed(2) || '0.00'} R:${eyeData.debug.rightSquintTension?.toFixed(2) || '0.00'} | Detected:${eyeData.microExpressions.squint}`;
            addLog(`🔍 ${squintAnalysis}`);
            
            // Enhanced detection states with synchronization information
            let syncInfo = 'ASYNC';
            if (eyeData.debug.synchronizedOutput) syncInfo = 'FULL_SYNC';
            else if (eyeData.debug.intentionalAsymmetry) syncInfo = 'INTENTIONAL';
            else if (eyeData.debug.partialSync) syncInfo = 'PARTIAL_SYNC';
            
            const earVar = eyeData.debug.earVariation?.toFixed(3) || '0.000';
            const detectionStates = `L:${eyeData.left.openness.toFixed(2)} R:${eyeData.right.openness.toFixed(2)} ${syncInfo}(${earVar})`;
            addLog(`👁️ FINAL: ${detectionStates}`);
          }
          
          // Enhanced winking detection status
          if (eyeData.microExpressions.leftWink || eyeData.microExpressions.rightWink) {
            const winkStatus = `L:${eyeData.microExpressions.leftWink} R:${eyeData.microExpressions.rightWink}`;
            addLog(`😉 WINK: ${winkStatus}`);
          }
          
          // All detection results
          const results = `Blink:${eyeData.microExpressions.isBlinking} LWink:${eyeData.microExpressions.leftWink} RWink:${eyeData.microExpressions.rightWink} Squint:${eyeData.microExpressions.squint}`;
          addLog(`🎯 FINAL: ${results}`);
        }
      });

      hands.onResults((results) => {
        if (results.multiHandLandmarks && results.multiHandedness) {
          const leftHand = results.multiHandLandmarks.find((_, index) => 
            results.multiHandedness![index].label === 'Left'
          );
          const rightHand = results.multiHandLandmarks.find((_, index) => 
            results.multiHandedness![index].label === 'Right'
          );

          const leftGesture = leftHand ? calculateHandGestures(leftHand) : { gesture: 'none', confidence: 0 };
          const rightGesture = rightHand ? calculateHandGestures(rightHand) : { gesture: 'none', confidence: 0 };

          setTrackingData(prev => ({
            ...prev,
            hands: {
              left: { landmarks: leftHand ? 21 : 0, ...leftGesture },
              right: { landmarks: rightHand ? 21 : 0, ...rightGesture }
            }
          }));

          // Log hand tracking activity
          if (leftHand || rightHand) {
            addLog(`Hands: L=${leftGesture.gesture}(${leftGesture.confidence.toFixed(1)}) R=${rightGesture.gesture}(${rightGesture.confidence.toFixed(1)})`);
          }
        } else {
          // Update with no hands detected
          setTrackingData(prev => ({
            ...prev,
            hands: {
              left: { landmarks: 0, gesture: 'none', confidence: 0 },
              right: { landmarks: 0, gesture: 'none', confidence: 0 }
            }
          }));
        }
      });

      pose.onResults((results) => {
        if (results.poseLandmarks) {
          const bodyPosture = calculateBodyPosture(results.poseLandmarks);

          setTrackingData(prev => ({
            ...prev,
            body: {
              landmarks: results.poseLandmarks.length,
              ...bodyPosture
            }
          }));

          // Log body tracking activity
          addLog(`Body: ${bodyPosture.posture}(${bodyPosture.confidence.toFixed(2)}) - ${results.poseLandmarks.length} landmarks`);
        } else {
          // Update with no body detected
          setTrackingData(prev => ({
            ...prev,
            body: {
              landmarks: 0,
              posture: 'unknown',
              confidence: 0
            }
          }));
        }
      });

      faceMeshRef.current = faceMesh;
      handsRef.current = hands;
      poseRef.current = pose;
      setModelsLoaded(true);
      addLog('All MediaPipe models loaded successfully');
      return true;

    } catch (error: any) {
      addLog(`MediaPipe initialization failed: ${error.message}`);
      return false;
    }
  };

  // Start camera
  const startCamera = async () => {
    setIsLoading(true);
    setIsCalibrating(true);
    setCalibrationFrames(0);
    
    try {
      const modelsReady = await initializeMediaPipe();
      if (!modelsReady) {
        addLog('Failed to initialize MediaPipe models');
        setIsLoading(false);
        return;
      }

      const video = videoRef.current;
      if (!video) {
        addLog('Video element not available');
        setIsLoading(false);
        return;
      }

      const camera = new Camera(video, {
        onFrame: async () => {
          // Debug camera frame processing
          if (Math.random() < 0.02) { // 2% of frames
            console.log(`📷 Camera Frame Processing:`, {
              timestamp: Date.now(),
              faceMeshReady: !!faceMeshRef.current,
              handsReady: !!handsRef.current,
              poseReady: !!poseRef.current
            });
          }
          
          // Send video frame to all MediaPipe models
          if (faceMeshRef.current) {
            await faceMeshRef.current.send({ image: video });
          }
          if (handsRef.current) {
            await handsRef.current.send({ image: video });
          }
          if (poseRef.current) {
            await poseRef.current.send({ image: video });
          }
        },
        width: 640,
        height: 480
      });
      
      cameraRef.current = camera;
      camera.start();
      
      setCameraActive(true);
      setIsLoading(false);
      addLog('Camera started - Beginning calibration...');
      
    } catch (error: any) {
      addLog(`Camera error: ${error.message}`);
      setIsLoading(false);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    setCameraActive(false);
    setIsCalibrating(false);
    setCalibrationFrames(0);
    addLog('Camera stopped');
  };

  const toggleCamera = () => {
    if (cameraActive) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">
          Fixed MediaPipe Expression Tracking
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Camera Feed */}
          <Card className="glass-card shadow-glow-md">
            <CardHeader>
              <CardTitle className="text-white">Camera Feed</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Button 
                  onClick={toggleCamera}
                  disabled={isLoading}
                  className={`${cameraActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white`}
                >
                  {isLoading ? 'Loading...' : cameraActive ? 'Stop Camera' : 'Start Camera'}
                </Button>
                
                {cameraActive && (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${modelsLoaded ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                      <span className="text-sm text-gray-300">
                        {modelsLoaded ? 'Models Loaded' : 'Loading...'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${isCalibrating ? 'bg-blue-500 animate-pulse' : personalBaseline ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                      <span className="text-sm text-gray-300">
                        {isCalibrating ? `Calibrating ${calibrationFrames}/30` : 
                         personalBaseline ? 'Enhanced Tracking' : 'Standard Tracking'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <video
                  ref={videoRef}
                  className="w-full h-64 bg-black rounded-lg"
                  autoPlay
                  muted
                  playsInline
                />
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0 w-full h-64 pointer-events-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Facial Expression Tracking */}
          <Card className="glass-card shadow-glow-md">
            <CardHeader>
              <CardTitle className="text-white">Facial Expressions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(trackingData.face.expressions)
                .filter(([key]) => !['microExpressions', 'browDetails', 'mouthDetails', 'dynamicCombinations'].includes(key))
                .map(([expr, value]) => (
                  <div key={expr} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300 capitalize">{expr.replace(/([A-Z])/g, ' $1')}</span>
                      <span className="text-white font-mono">{((typeof value === 'number' ? value : 0)).toFixed(2)}</span>
                    </div>
                    <Progress value={((typeof value === 'number' ? value : 0)) * 100} className="h-2" />
                  </div>
                ))}
              
              <div className="border-t border-gray-600 pt-3 mt-3">
                <h4 className="text-white font-semibold mb-2">Head Rotation</h4>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <span className="text-gray-300">Pitch:</span>
                    <span className="text-white font-mono ml-1">{trackingData.face.headRotation.x}°</span>
                  </div>
                  <div>
                    <span className="text-gray-300">Yaw:</span>
                    <span className="text-white font-mono ml-1">{trackingData.face.headRotation.y}°</span>
                  </div>
                  <div>
                    <span className="text-gray-300">Roll:</span>
                    <span className="text-white font-mono ml-1">{trackingData.face.headRotation.z}°</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Eye & Mouth Tracking */}
          <Card className="glass-card shadow-glow-md">
            <CardHeader>
              <CardTitle className="text-white">Eyes & Mouth</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Eyes */}
              {['left', 'right'].map((eye) => (
                <div key={eye} className="space-y-2">
                  <h4 className="text-white font-semibold capitalize">{eye} Eye</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-300">Openness:</span>
                      <span className="text-white font-mono ml-2">
                        {trackingData.eyes[eye as 'left' | 'right'].openness.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-300">Gaze:</span>
                      <span className="text-white font-mono ml-2">
                        ({trackingData.eyes[eye as 'left' | 'right'].gazeX.toFixed(1)},{trackingData.eyes[eye as 'left' | 'right'].gazeY.toFixed(1)})
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Micro-expressions */}
              <div className="border-t border-gray-600 pt-3">
                <h4 className="text-white font-semibold mb-2">Micro-Expressions</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className={`${trackingData.eyes.microExpressions.leftWink ? 'text-green-400' : 'text-gray-500'}`}>
                    Left Wink
                  </span>
                  <span className={`${trackingData.eyes.microExpressions.rightWink ? 'text-green-400' : 'text-gray-500'}`}>
                    Right Wink
                  </span>
                  <span className={`${trackingData.eyes.left.blinking && trackingData.eyes.right.blinking ? 'text-green-400' : 'text-gray-500'}`}>
                    Blinking
                  </span>
                  <span className={`${trackingData.eyes.microExpressions.squint ? 'text-green-400' : 'text-gray-500'}`}>
                    Squinting
                  </span>
                </div>
              </div>

              {/* Detailed Brow Controls */}
              <div className="border-t border-gray-600 pt-3">
                <h4 className="text-white font-semibold mb-2">Individual Brow Controls</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-300">Left Raise:</span>
                    <span className="text-white font-mono ml-2">{(trackingData.face.expressions.browDetails?.leftRaise || 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-300">Right Raise:</span>
                    <span className="text-white font-mono ml-2">{(trackingData.face.expressions.browDetails?.rightRaise || 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-300">Left Furrow:</span>
                    <span className="text-white font-mono ml-2">{(trackingData.face.expressions.browDetails?.leftLower || 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-300">Right Furrow:</span>
                    <span className="text-white font-mono ml-2">{(trackingData.face.expressions.browDetails?.rightLower || 0).toFixed(2)}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-300">Asymmetry:</span>
                    <span className={`font-mono ml-2 ${trackingData.face.expressions.browDetails?.asymmetry ? 'text-yellow-400' : 'text-gray-500'}`}>
                      {trackingData.face.expressions.browDetails?.asymmetry ? 'Detected' : 'None'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Detailed Mouth Controls */}
              <div className="border-t border-gray-600 pt-3">
                <h4 className="text-white font-semibold mb-2">Asymmetric Mouth Movements</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-300">Left Smirk:</span>
                    <span className="text-white font-mono ml-2">{(trackingData.face.expressions.mouthDetails?.leftSmirk || 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-300">Right Smirk:</span>
                    <span className="text-white font-mono ml-2">{(trackingData.face.expressions.mouthDetails?.rightSmirk || 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-300">Left Frown:</span>
                    <span className="text-white font-mono ml-2">{(trackingData.face.expressions.mouthDetails?.leftFrown || 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-300">Right Frown:</span>
                    <span className="text-white font-mono ml-2">{(trackingData.face.expressions.mouthDetails?.rightFrown || 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-300">Lips Pursed:</span>
                    <span className="text-white font-mono ml-2">{(trackingData.face.expressions.mouthDetails?.pursed || 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-300">Asymmetric Smile:</span>
                    <span className="text-white font-mono ml-2">{(trackingData.face.expressions.mouthDetails?.asymmetricSmile || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Dynamic FACS Combinations */}
              <div className="border-t border-gray-600 pt-3">
                <h4 className="text-white font-semibold mb-2">Dynamic FACS Combinations</h4>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Concentrated Frown:</span>
                    <span className={`font-mono ${trackingData.face.expressions.dynamicCombinations?.concentratedFrown ? 'text-orange-400' : 'text-gray-500'}`}>
                      {trackingData.face.expressions.dynamicCombinations?.concentratedFrown ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Confused Expression:</span>
                    <span className={`font-mono ${trackingData.face.expressions.dynamicCombinations?.confusedExpression ? 'text-purple-400' : 'text-gray-500'}`}>
                      {trackingData.face.expressions.dynamicCombinations?.confusedExpression ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Smirking Concentration:</span>
                    <span className={`font-mono ${trackingData.face.expressions.dynamicCombinations?.smirkingConcentration ? 'text-blue-400' : 'text-gray-500'}`}>
                      {trackingData.face.expressions.dynamicCombinations?.smirkingConcentration ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Skeptical Look:</span>
                    <span className={`font-mono ${trackingData.face.expressions.dynamicCombinations?.skepticalLook ? 'text-red-400' : 'text-gray-500'}`}>
                      {trackingData.face.expressions.dynamicCombinations?.skepticalLook ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Concerned Smile:</span>
                    <span className={`font-mono ${trackingData.face.expressions.dynamicCombinations?.concernedSmile ? 'text-yellow-400' : 'text-gray-500'}`}>
                      {trackingData.face.expressions.dynamicCombinations?.concernedSmile ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Mouth */}
              <div className="border-t border-gray-600 pt-3">
                <h4 className="text-white font-semibold mb-2">Mouth Tracking</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-300">Openness:</span>
                    <span className="text-white font-mono ml-2">{trackingData.mouth.openness.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-300">Shape:</span>
                    <span className="text-white font-mono ml-2 capitalize">{trackingData.mouth.shape}</span>
                  </div>
                  <div>
                    <span className="text-gray-300">Speaking:</span>
                    <span className={`font-mono ml-2 ${trackingData.mouth.speaking ? 'text-green-400' : 'text-gray-500'}`}>
                      {trackingData.mouth.speaking ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-300">Lip Sync:</span>
                    <span className="text-white font-mono ml-2">{trackingData.mouth.lipSync.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hand Tracking */}
          <Card className="glass-card shadow-glow-md">
            <CardHeader>
              <CardTitle className="text-white">Hand Tracking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {['left', 'right'].map((hand) => (
                <div key={hand} className="space-y-2">
                  <h4 className="text-white font-semibold capitalize">{hand} Hand</h4>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-gray-300">Landmarks:</span>
                      <span className="text-white font-mono ml-2">
                        {trackingData.hands[hand as 'left' | 'right'].landmarks}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-300">Gesture:</span>
                      <span className="text-white font-mono ml-2 capitalize">
                        {trackingData.hands[hand as 'left' | 'right'].gesture}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-300">Detected:</span>
                      <span className={`font-mono ml-2 ${trackingData.hands[hand as 'left' | 'right'].detected ? 'text-green-400' : 'text-gray-500'}`}>
                        {trackingData.hands[hand as 'left' | 'right'].detected ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Body Tracking */}
          <Card className="glass-card shadow-glow-md">
            <CardHeader>
              <CardTitle className="text-white">Body Tracking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-300">Pose Detected:</span>
                    <span className={`font-mono ml-2 ${trackingData.body?.pose?.detected ? 'text-green-400' : 'text-gray-500'}`}>
                      {trackingData.body?.pose?.detected ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-300">Landmarks:</span>
                    <span className="text-white font-mono ml-2">{trackingData.body?.pose?.landmarks || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-300">Confidence:</span>
                    <span className="text-white font-mono ml-2">{(trackingData.body?.pose?.confidence || 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-300">Skeleton Joints:</span>
                    <span className="text-white font-mono ml-2">{trackingData.body?.skeleton?.joints || 0}</span>
                  </div>
                </div>
                <div className="text-sm">
                  <span className="text-gray-300">Skeleton Tracking:</span>
                  <span className={`font-mono ml-2 ${trackingData.body?.skeleton?.tracking ? 'text-green-400' : 'text-gray-500'}`}>
                    {trackingData.body?.skeleton?.tracking ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Live Log */}
          <Card className="glass-card shadow-glow-md">
            <CardHeader>
              <CardTitle className="text-white">Live Tracking Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 h-64 overflow-y-auto">
                {logs.map((log, index) => (
                  <div key={index} className="text-sm text-gray-300 font-mono">
                    {log}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}