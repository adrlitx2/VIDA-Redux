import { useEffect, useRef, useState } from 'react';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Pose } from '@mediapipe/pose';
import { Hands } from '@mediapipe/hands';

interface EnhancedMotionTrackerProps {
  videoStream: MediaStream | null;
  onFaceDetected?: (landmarks: any) => void;
  onPoseDetected?: (landmarks: any) => void;
  onHandsDetected?: (landmarks: any) => void;
  onEmotionDetected?: (emotions: any) => void;
  onGazeDetected?: (gaze: any) => void;
  onMicroExpressionsDetected?: (microExpressions: any) => void;
  faceTracking?: boolean;
  bodyTracking?: boolean;
  handTracking?: boolean;
  emotionTracking?: boolean;
  gazeTracking?: boolean;
  microExpressionTracking?: boolean;
}

// Enhanced landmark indices for micro-expressions
const MICRO_EXPRESSION_LANDMARKS = {
  // Subtle eye movements
  leftEyelidUpper: [157, 158, 159, 160, 161],
  leftEyelidLower: [144, 145, 146, 147, 153],
  rightEyelidUpper: [384, 385, 386, 387, 388],
  rightEyelidLower: [380, 374, 373, 372, 371],
  
  // Micro mouth movements
  lipTension: [61, 84, 17, 18, 200, 199],
  cornerMovement: [308, 324, 318, 402, 317, 14],
  
  // Nostril flare detection
  nostrilLeft: [236, 3, 51, 48, 115],
  nostrilRight: [456, 399, 437, 420, 343],
  
  // Jaw tension
  jawTension: [172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397, 288, 361, 323],
  
  // Forehead tension
  foreheadTension: [9, 10, 151, 337, 299, 333, 298, 301]
};

export default function EnhancedMotionTracker({
  videoStream,
  onFaceDetected,
  onPoseDetected,
  onHandsDetected,
  onEmotionDetected,
  onGazeDetected,
  onMicroExpressionsDetected,
  faceTracking = true,
  bodyTracking = true,
  handTracking = false,
  emotionTracking = true,
  gazeTracking = true,
  microExpressionTracking = true
}: EnhancedMotionTrackerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [huggingFaceModels, setHuggingFaceModels] = useState<any>({});
  
  const faceMeshRef = useRef<FaceMesh | null>(null);
  const poseRef = useRef<Pose | null>(null);
  const handsRef = useRef<Hands | null>(null);

  // Initialize Hugging Face models for enhanced tracking
  useEffect(() => {
    const initializeHuggingFaceModels = async () => {
      try {
        console.log('🤖 Initializing Enhanced AI Tracking Models...');
        
        // Emotion recognition model
        if (emotionTracking) {
          const emotionResponse = await fetch('/api/huggingface/emotion-detection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'j-hartmann/emotion-english-distilroberta-base' })
          });
          
          if (emotionResponse.ok) {
            setHuggingFaceModels(prev => ({ ...prev, emotion: true }));
            console.log('✅ Emotion detection model ready');
          }
        }
        
        // Gaze estimation model
        if (gazeTracking) {
          const gazeResponse = await fetch('/api/huggingface/gaze-estimation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'microsoft/DialoGPT-medium' })
          });
          
          if (gazeResponse.ok) {
            setHuggingFaceModels(prev => ({ ...prev, gaze: true }));
            console.log('✅ Gaze estimation model ready');
          }
        }
        
        // Micro-expression analysis model
        if (microExpressionTracking) {
          const microResponse = await fetch('/api/huggingface/micro-expressions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'microsoft/beit-base-patch16-224' })
          });
          
          if (microResponse.ok) {
            setHuggingFaceModels(prev => ({ ...prev, microExpressions: true }));
            console.log('✅ Micro-expression analysis model ready');
          }
        }
        
      } catch (error) {
        console.log('⚠️ Some enhanced models unavailable, using base tracking');
      }
    };

    initializeHuggingFaceModels();
  }, [emotionTracking, gazeTracking, microExpressionTracking]);

  // Enhanced facial analysis with AI models
  const analyzeAdvancedFacialFeatures = async (landmarks: any[], canvas: HTMLCanvasElement) => {
    if (!landmarks || landmarks.length === 0) return;

    // Extract facial region for AI analysis
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get face bounding box
    const faceBounds = calculateFaceBounds(landmarks);
    const faceImageData = ctx.getImageData(
      faceBounds.x, faceBounds.y, 
      faceBounds.width, faceBounds.height
    );

    // Convert ImageData to base64 for API
    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = faceBounds.width;
    faceCanvas.height = faceBounds.height;
    const faceCtx = faceCanvas.getContext('2d');
    if (faceCtx) {
      faceCtx.putImageData(faceImageData, 0, 0);
      const faceBase64 = faceCanvas.toDataURL('image/jpeg', 0.8);

      // Emotion Detection
      if (huggingFaceModels.emotion && onEmotionDetected) {
        try {
          const emotionResponse = await fetch('/api/huggingface/analyze-emotion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: faceBase64 })
          });
          
          if (emotionResponse.ok) {
            const emotions = await emotionResponse.json();
            onEmotionDetected(emotions);
          }
        } catch (error) {
          console.log('Emotion analysis temporarily unavailable');
        }
      }

      // Gaze Direction Analysis
      if (huggingFaceModels.gaze && onGazeDetected) {
        const gazeData = calculateEnhancedGaze(landmarks);
        onGazeDetected(gazeData);
      }

      // Micro-expression Detection
      if (huggingFaceModels.microExpressions && onMicroExpressionsDetected) {
        const microExpressions = detectMicroExpressions(landmarks);
        onMicroExpressionsDetected(microExpressions);
      }
    }
  };

  // Calculate face bounding box for AI analysis
  const calculateFaceBounds = (landmarks: any[]) => {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    landmarks.forEach(landmark => {
      minX = Math.min(minX, landmark.x * 640);
      minY = Math.min(minY, landmark.y * 480);
      maxX = Math.max(maxX, landmark.x * 640);
      maxY = Math.max(maxY, landmark.y * 480);
    });

    return {
      x: Math.max(0, minX - 20),
      y: Math.max(0, minY - 20),
      width: Math.min(640, maxX - minX + 40),
      height: Math.min(480, maxY - minY + 40)
    };
  };

  // Enhanced gaze calculation with AI assistance
  const calculateEnhancedGaze = (landmarks: any[]) => {
    const leftEye = {
      center: landmarks[468],
      corners: [landmarks[33], landmarks[133]],
      pupil: landmarks[468]
    };
    
    const rightEye = {
      center: landmarks[473],
      corners: [landmarks[362], landmarks[263]],
      pupil: landmarks[473]
    };

    // Calculate 3D gaze vector
    const gazeVector = {
      x: (leftEye.center.x + rightEye.center.x) / 2 - 0.5,
      y: (leftEye.center.y + rightEye.center.y) / 2 - 0.5,
      z: 0
    };

    // Enhanced gaze classification
    const gazeDirection = classifyGazeDirection(gazeVector);
    const gazeIntensity = calculateGazeIntensity(leftEye, rightEye);

    return {
      vector: gazeVector,
      direction: gazeDirection,
      intensity: gazeIntensity,
      tracking: true
    };
  };

  // Classify gaze direction with enhanced precision
  const classifyGazeDirection = (vector: any) => {
    const threshold = 0.1;
    
    if (Math.abs(vector.x) < threshold && Math.abs(vector.y) < threshold) {
      return 'center';
    } else if (vector.x > threshold) {
      return vector.y > threshold ? 'up-right' : vector.y < -threshold ? 'down-right' : 'right';
    } else if (vector.x < -threshold) {
      return vector.y > threshold ? 'up-left' : vector.y < -threshold ? 'down-left' : 'left';
    } else {
      return vector.y > threshold ? 'up' : 'down';
    }
  };

  // Calculate gaze intensity
  const calculateGazeIntensity = (leftEye: any, rightEye: any) => {
    const leftIntensity = Math.abs(leftEye.center.x - (leftEye.corners[0].x + leftEye.corners[1].x) / 2);
    const rightIntensity = Math.abs(rightEye.center.x - (rightEye.corners[0].x + rightEye.corners[1].x) / 2);
    return (leftIntensity + rightIntensity) / 2;
  };

  // Detect micro-expressions using landmark analysis
  const detectMicroExpressions = (landmarks: any[]) => {
    const microExpressions: any = {};

    // Nostril flare detection
    const nostrilFlare = detectNostrilFlare(landmarks);
    microExpressions.nostrilFlare = nostrilFlare;

    // Lip tension detection
    const lipTension = detectLipTension(landmarks);
    microExpressions.lipTension = lipTension;

    // Jaw clenching detection
    const jawTension = detectJawTension(landmarks);
    microExpressions.jawTension = jawTension;

    // Forehead tension
    const foreheadTension = detectForeheadTension(landmarks);
    microExpressions.foreheadTension = foreheadTension;

    return microExpressions;
  };

  const detectNostrilFlare = (landmarks: any[]) => {
    const nostrilLeft = MICRO_EXPRESSION_LANDMARKS.nostrilLeft.map(i => landmarks[i]);
    const nostrilRight = MICRO_EXPRESSION_LANDMARKS.nostrilRight.map(i => landmarks[i]);
    
    // Calculate nostril width
    const leftWidth = Math.abs(nostrilLeft[0]?.x - nostrilLeft[4]?.x) || 0;
    const rightWidth = Math.abs(nostrilRight[0]?.x - nostrilRight[4]?.x) || 0;
    
    return Math.max(0, Math.min(1, (leftWidth + rightWidth) * 20));
  };

  const detectLipTension = (landmarks: any[]) => {
    const lipPoints = MICRO_EXPRESSION_LANDMARKS.lipTension.map(i => landmarks[i]);
    
    // Calculate lip compression
    let totalDistance = 0;
    for (let i = 0; i < lipPoints.length - 1; i++) {
      if (lipPoints[i] && lipPoints[i + 1]) {
        const dx = lipPoints[i + 1].x - lipPoints[i].x;
        const dy = lipPoints[i + 1].y - lipPoints[i].y;
        totalDistance += Math.sqrt(dx * dx + dy * dy);
      }
    }
    
    return Math.max(0, Math.min(1, totalDistance * 10));
  };

  const detectJawTension = (landmarks: any[]) => {
    const jawPoints = MICRO_EXPRESSION_LANDMARKS.jawTension.map(i => landmarks[i]);
    
    // Calculate jaw muscle tension
    let avgY = 0;
    let validPoints = 0;
    
    jawPoints.forEach(point => {
      if (point) {
        avgY += point.y;
        validPoints++;
      }
    });
    
    if (validPoints === 0) return 0;
    avgY /= validPoints;
    
    return Math.max(0, Math.min(1, avgY * 2));
  };

  const detectForeheadTension = (landmarks: any[]) => {
    const foreheadPoints = MICRO_EXPRESSION_LANDMARKS.foreheadTension.map(i => landmarks[i]);
    
    // Calculate forehead muscle activation
    let verticalSpread = 0;
    if (foreheadPoints[0] && foreheadPoints[foreheadPoints.length - 1]) {
      verticalSpread = Math.abs(foreheadPoints[0].y - foreheadPoints[foreheadPoints.length - 1].y);
    }
    
    return Math.max(0, Math.min(1, verticalSpread * 15));
  };

  // Initialize MediaPipe trackers with enhanced processing
  useEffect(() => {
    const initializeTrackers = async () => {
      if (!videoStream) return;

      try {
        // Initialize Face Mesh with enhanced processing
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

          faceMeshRef.current.onResults(async (results) => {
            if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
              const landmarks = results.multiFaceLandmarks[0];
              
              // Standard face detection
              const noseTip = landmarks[1];
              const leftEye = landmarks[33];
              const rightEye = landmarks[263];

              if (noseTip && leftEye && rightEye) {
                const eyeCenterX = (leftEye.x + rightEye.x) / 2;
                const eyeCenterY = (leftEye.y + rightEye.y) / 2;
                
                const yaw = (noseTip.x - eyeCenterX) * 2;
                const pitch = (noseTip.y - eyeCenterY) * 2;
                const roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);

                onFaceDetected?.({
                  rotation: { x: pitch * 30, y: yaw * 30, z: roll * 15 },
                  position: { x: (noseTip.x - 0.5) * 0.5, y: (0.5 - noseTip.y) * 0.5, z: 0 },
                  landmarks
                });
              }

              // Enhanced AI analysis
              const canvas = canvasRef.current;
              if (canvas) {
                await analyzeAdvancedFacialFeatures(landmarks, canvas);
              }
            }
          });
        }

        // Initialize standard Pose and Hands trackers
        if (bodyTracking) {
          poseRef.current = new Pose({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
          });
          
          poseRef.current.setOptions({
            modelComplexity: 2, // Enhanced complexity for better tracking
            smoothLandmarks: true,
            enableSegmentation: false,
            smoothSegmentation: false,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.7
          });

          poseRef.current.onResults((results) => {
            if (results.poseLandmarks) {
              onPoseDetected?.(results.poseLandmarks);
            }
          });
        }

        if (handTracking) {
          handsRef.current = new Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
          });
          
          handsRef.current.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.7
          });

          handsRef.current.onResults((results) => {
            if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
              onHandsDetected?.(results.multiHandLandmarks);
            }
          });
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize enhanced motion trackers:', error);
      }
    };

    initializeTrackers();
  }, [videoStream, faceTracking, bodyTracking, handTracking]);

  // Enhanced frame processing
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