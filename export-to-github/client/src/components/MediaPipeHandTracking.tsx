import { useEffect, useRef, useState } from 'react';
import { Hands, Results } from '@mediapipe/hands';

interface HandLandmarks {
  left: any[] | null;
  right: any[] | null;
  confidence: number;
}

interface MediaPipeHandTrackingProps {
  videoElement?: HTMLVideoElement;
  onHandDetection: (hands: HandLandmarks) => void;
  enabled: boolean;
}

export default function MediaPipeHandTracking({
  videoElement,
  onHandDetection,
  enabled
}: MediaPipeHandTrackingProps) {
  const handsRef = useRef<Hands | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const initializeHands = async () => {
      try {
        const hands = new Hands({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        hands.onResults((results: Results) => {
          const handData: HandLandmarks = {
            left: null,
            right: null,
            confidence: 0
          };

          if (results.multiHandLandmarks && results.multiHandedness) {
            results.multiHandLandmarks.forEach((landmarks, index) => {
              const handedness = results.multiHandedness![index];
              const isLeft = handedness.label === 'Left';
              const confidence = handedness.score || 0;

              if (isLeft) {
                handData.left = landmarks;
              } else {
                handData.right = landmarks;
              }
              
              handData.confidence = Math.max(handData.confidence, confidence);
            });
          }

          onHandDetection(handData);
        });

        handsRef.current = hands;
        setIsInitialized(true);
        console.log('🖐️ MediaPipe Hands initialized for detailed finger tracking');
      } catch (error) {
        console.error('Failed to initialize MediaPipe Hands:', error);
      }
    };

    initializeHands();
  }, [enabled, onHandDetection]);

  useEffect(() => {
    if (!handsRef.current || !videoElement || !isInitialized || !enabled) return;

    const processFrame = async () => {
      if (videoElement.readyState >= 2) {
        await handsRef.current!.send({ image: videoElement });
      }
    };

    const intervalId = setInterval(processFrame, 33); // ~30fps

    return () => {
      clearInterval(intervalId);
    };
  }, [videoElement, isInitialized, enabled]);

  return null; // This is a processing component with no UI
}

// Helper function to convert MediaPipe landmarks to Three.js rotations
export function landmarksToRotation(landmarks: any[]): { x: number, y: number, z: number } {
  if (!landmarks || landmarks.length < 21) {
    return { x: 0, y: 0, z: 0 };
  }

  // Use wrist (0) and middle finger MCP (9) to calculate hand orientation
  const wrist = landmarks[0];
  const middleMCP = landmarks[9];
  
  // Calculate basic hand rotation based on landmark positions
  const deltaX = middleMCP.x - wrist.x;
  const deltaY = middleMCP.y - wrist.y;
  const deltaZ = middleMCP.z - wrist.z;
  
  // Convert to rotation angles (simplified)
  const rotX = Math.atan2(deltaY, deltaZ) * (180 / Math.PI);
  const rotY = Math.atan2(deltaX, deltaZ) * (180 / Math.PI);
  const rotZ = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
  
  return {
    x: rotX,
    y: rotY,
    z: rotZ
  };
}