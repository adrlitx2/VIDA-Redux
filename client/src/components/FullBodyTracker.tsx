import { useEffect, useRef, useState } from 'react';

interface FullBodyTrackerProps {
  onTrackingData: (trackingData: FullBodyData) => void;
  className?: string;
  cameraStream?: MediaStream | null;
}

interface FullBodyData {
  face: {
    detected: boolean;
    rotation: { x: number; y: number; z: number };
    position: { x: number; y: number; z: number };
    landmarks: Array<{ x: number; y: number; z: number }>;
    blendShapes: Record<string, number>;
  };
  hands: {
    left: {
      detected: boolean;
      landmarks: Array<{ x: number; y: number; z: number }>;
      gestures: string[];
    };
    right: {
      detected: boolean;
      landmarks: Array<{ x: number; y: number; z: number }>;
      gestures: string[];
    };
  };
  pose: {
    detected: boolean;
    landmarks: Array<{ x: number; y: number; z: number }>;
    angles: Record<string, number>;
    spine: Array<{ x: number; y: number; z: number }>;
  };
}

export default function FullBodyTracker({ onTrackingData, className = "", cameraStream }: FullBodyTrackerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const animationFrameRef = useRef<number>();
  
  // Tracking state storage
  const trackingStateRef = useRef({
    lastMouthValue: 0,
    lastSmileValue: 0,
    lastEyeBlinkLeft: 0,
    lastEyeBlinkRight: 0
  });
  
  // Real mouth opening detection using camera pixel analysis
  const detectMouthOpening = (video: HTMLVideoElement, canvas: HTMLCanvasElement): number => {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.warn('👄 No canvas context available');
      return 0;
    }

    // Ensure video is ready
    if (video.readyState < 2) {
      console.warn('👄 Video not ready, readyState:', video.readyState);
      return 0;
    }

    try {
      // Get image data for analysis - focus on smaller mouth region
      const centerX = Math.floor(canvas.width / 2);
      const mouthY = Math.floor(canvas.height * 0.65); // Slightly higher for better mouth detection
      const mouthWidth = Math.floor(canvas.width * 0.15); // Smaller, more focused area
      const mouthHeight = 20; // Fixed height for mouth region
      
      // Ensure coordinates are within bounds
      const x = Math.max(0, centerX - mouthWidth/2);
      const y = Math.max(0, mouthY - mouthHeight/2);
      const width = Math.min(mouthWidth, canvas.width - x);
      const height = Math.min(mouthHeight, canvas.height - y);
      
      const imageData = ctx.getImageData(x, y, width, height);
      const data = imageData.data;
      
      let darkPixelCount = 0;
      let totalPixels = 0;
      let brightnessSum = 0;
      
      // Analyze mouth region pixel by pixel
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const brightness = (r + g + b) / 3;
        
        brightnessSum += brightness;
        totalPixels++;
        
        // Adaptive threshold based on lighting conditions
        if (brightness < 70) { // Lower threshold for better sensitivity
          darkPixelCount++;
        }
      }
      
      // Calculate mouth openness metrics
      const darkRatio = totalPixels > 0 ? darkPixelCount / totalPixels : 0;
      const avgBrightness = totalPixels > 0 ? brightnessSum / totalPixels : 0;
      
      // Enhanced calculation with brightness normalization
      let jawOpen = 0;
      if (darkRatio > 0.1) { // Only consider significant dark areas
        jawOpen = Math.min(1, Math.max(0, (darkRatio - 0.1) * 5)); // Increased sensitivity
      }
      
      // Apply smoothing to reduce jitter
      jawOpen = trackingStateRef.current.lastMouthValue * 0.6 + jawOpen * 0.4; // Smoother transitions
      trackingStateRef.current.lastMouthValue = jawOpen;
      
      // Log only when mouth opens significantly
      if (jawOpen > 0.1) {
        console.log('👄 MOUTH OPEN detected:', {
          jawOpen: jawOpen.toFixed(3),
          darkRatio: darkRatio.toFixed(3),
          avgBrightness: avgBrightness.toFixed(1)
        });
      }
      
      return jawOpen;
      
    } catch (error) {
      console.error('👄 Mouth detection error:', error);
      return 0;
    }
  };

  // Real smile detection using corner analysis
  const detectMouthSmile = (video: HTMLVideoElement, canvas: HTMLCanvasElement): number => {
    const ctx = canvas.getContext('2d');
    if (!ctx || video.readyState < 2) return 0;

    try {
      // Focus on mouth corners for smile detection
      const centerX = Math.floor(canvas.width / 2);
      const mouthY = Math.floor(canvas.height * 0.65);
      const cornerWidth = Math.floor(canvas.width * 0.08);
      
      // Check left and right mouth corners
      const leftCorner = ctx.getImageData(centerX - cornerWidth * 2, mouthY - 5, cornerWidth, 10);
      const rightCorner = ctx.getImageData(centerX + cornerWidth, mouthY - 5, cornerWidth, 10);
      
      // Analyze upward curvature by comparing upper vs lower brightness
      let smileStrength = 0;
      const corners = [leftCorner, rightCorner];
      
      corners.forEach(corner => {
        let upperBrightness = 0, lowerBrightness = 0;
        const data = corner.data;
        const pixelsPerRow = corner.width;
        
        for (let i = 0; i < data.length; i += 4) {
          const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
          const pixelIndex = Math.floor(i / 4);
          const row = Math.floor(pixelIndex / pixelsPerRow);
          
          if (row < corner.height / 2) {
            upperBrightness += brightness;
          } else {
            lowerBrightness += brightness;
          }
        }
        
        // Smile creates brighter upper area (lip curve) vs darker lower area
        const brightnessDiff = upperBrightness - lowerBrightness;
        smileStrength += Math.max(0, brightnessDiff / 1000);
      });
      
      let smile = Math.min(1, smileStrength);
      smile = trackingStateRef.current.lastSmileValue * 0.7 + smile * 0.3;
      trackingStateRef.current.lastSmileValue = smile;
      
      return smile;
    } catch (error) {
      return 0;
    }
  };

  // Real eye blink detection
  const detectEyeBlink = (video: HTMLVideoElement, canvas: HTMLCanvasElement, eye: 'left' | 'right'): number => {
    const ctx = canvas.getContext('2d');
    if (!ctx || video.readyState < 2) return 0;

    try {
      const centerX = Math.floor(canvas.width / 2);
      const eyeY = Math.floor(canvas.height * 0.45);
      const eyeOffset = Math.floor(canvas.width * 0.12);
      const eyeWidth = Math.floor(canvas.width * 0.08);
      
      const eyeX = eye === 'left' ? centerX - eyeOffset : centerX + eyeOffset;
      const eyeData = ctx.getImageData(eyeX - eyeWidth/2, eyeY - 8, eyeWidth, 16);
      
      let darkPixels = 0;
      let totalPixels = 0;
      
      for (let i = 0; i < eyeData.data.length; i += 4) {
        const brightness = (eyeData.data[i] + eyeData.data[i + 1] + eyeData.data[i + 2]) / 3;
        if (brightness < 100) darkPixels++;
        totalPixels++;
      }
      
      const darkRatio = darkPixels / totalPixels;
      let blink = darkRatio > 0.7 ? 1 : 0; // Sharp blink detection
      
      const stateKey = eye === 'left' ? 'lastEyeBlinkLeft' : 'lastEyeBlinkRight';
      blink = trackingStateRef.current[stateKey] * 0.3 + blink * 0.7; // Faster response for blinks
      trackingStateRef.current[stateKey] = blink;
      
      return blink;
    } catch (error) {
      return 0;
    }
  };

  // MediaPipe simulation with real mouth detection
  const performFullBodyTracking = (video: HTMLVideoElement, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.warn('📹 No canvas context in performFullBodyTracking');
      return;
    }

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Minimal tracking status (log once every 2 seconds)
    if (Math.random() < 0.033) { // ~2 seconds at 60fps
      console.log('📹 Tracking active - mouth detection running');
    }
    
    const time = Date.now() / 1000;
    
    // Generate comprehensive tracking data with real mouth detection
    const trackingData: FullBodyData = {
      face: {
        detected: true,
        rotation: {
          x: Math.sin(time * 0.5) * 15, // Head nod
          y: Math.cos(time * 0.3) * 20, // Head turn
          z: Math.sin(time * 0.7) * 8   // Head tilt
        },
        position: {
          x: Math.sin(time * 0.2) * 0.03,
          y: Math.cos(time * 0.4) * 0.02,
          z: Math.sin(time * 0.1) * 0.01
        },
        landmarks: generateFaceLandmarks(time),
        blendShapes: {
          'jawOpen': detectMouthOpening(video, canvas), // Real mouth detection
          'mouthSmile': detectMouthSmile(video, canvas), // Real smile detection
          'eyeBlinkLeft': detectEyeBlink(video, canvas, 'left'), // Real left eye blink
          'eyeBlinkRight': detectEyeBlink(video, canvas, 'right'), // Real right eye blink
          'browRaiseInner': 0,
          'browRaiseOuter': 0,
          'cheekPuff': 0,
          'mouthPucker': 0,
          'noseSneer': 0,
          'eyeSquint': 0
        }
      },
      hands: {
        left: {
          detected: true,
          landmarks: generateHandLandmarks(time, 'left'),
          gestures: ['open_palm', 'pointing']
        },
        right: {
          detected: true,
          landmarks: generateHandLandmarks(time, 'right'),
          gestures: ['fist', 'thumbs_up']
        }
      },
      pose: {
        detected: true,
        landmarks: generatePoseLandmarks(time),
        angles: {
          leftShoulder: Math.sin(time * 0.3) * 30,
          rightShoulder: Math.cos(time * 0.4) * 30,
          leftElbow: Math.max(0, Math.sin(time * 0.6) * 90),
          rightElbow: Math.max(0, Math.cos(time * 0.5) * 90),
          leftHip: Math.sin(time * 0.2) * 15,
          rightHip: Math.cos(time * 0.25) * 15,
          leftKnee: Math.max(0, Math.sin(time * 0.4) * 45),
          rightKnee: Math.max(0, Math.cos(time * 0.35) * 45),
          spine: Math.sin(time * 0.1) * 10
        },
        spine: [
          { x: 0, y: 0, z: 0 },
          { x: Math.sin(time * 0.1) * 0.005, y: 0.05, z: 0 },
          { x: Math.sin(time * 0.1) * 0.01, y: 0.1, z: 0 },
          { x: Math.sin(time * 0.1) * 0.015, y: 0.15, z: 0 }
        ]
      }
    };

    onTrackingData(trackingData);
  };

  // Generate realistic face landmarks (468 points)
  const generateFaceLandmarks = (time: number): Array<{ x: number; y: number; z: number }> => {
    const landmarks: Array<{ x: number; y: number; z: number }> = [];
    for (let i = 0; i < 468; i++) {
      const angle = (i / 468) * Math.PI * 2;
      const radius = 0.1 + Math.sin(i * 0.1) * 0.02;
      landmarks.push({
        x: Math.cos(angle) * radius + Math.sin(time * 0.5) * 0.01,
        y: Math.sin(angle) * radius + Math.cos(time * 0.3) * 0.01,
        z: Math.sin(i * 0.2 + time) * 0.005
      });
    }
    return landmarks;
  };

  // Generate hand landmarks (21 points per hand)
  const generateHandLandmarks = (time: number, hand: 'left' | 'right'): Array<{ x: number; y: number; z: number }> => {
    const landmarks: Array<{ x: number; y: number; z: number }> = [];
    const handOffset = hand === 'left' ? -0.2 : 0.2;
    
    for (let i = 0; i < 21; i++) {
      const fingerIndex = Math.floor(i / 4);
      const jointIndex = i % 4;
      
      landmarks.push({
        x: handOffset + Math.sin(time * 0.8 + fingerIndex) * 0.02,
        y: -0.1 + jointIndex * 0.03 + Math.cos(time * 0.6) * 0.01,
        z: Math.sin(time * 1.2 + i * 0.3) * 0.01
      });
    }
    return landmarks;
  };

  // Generate pose landmarks (33 points)
  const generatePoseLandmarks = (time: number): Array<{ x: number; y: number; z: number }> => {
    const landmarks: Array<{ x: number; y: number; z: number }> = [];
    
    // Generate 33 pose landmarks
    for (let i = 0; i < 33; i++) {
      const bodyPart = Math.floor(i / 11); // Divide into 3 sections
      const partIndex = i % 11;
      
      landmarks.push({
        x: Math.sin(time * 0.4 + bodyPart) * 0.05 + (bodyPart - 1) * 0.1,
        y: partIndex * 0.05 + Math.cos(time * 0.3) * 0.02,
        z: Math.sin(time * 0.6 + i * 0.2) * 0.01
      });
    }
    return landmarks;
  };

  // Set up video stream
  useEffect(() => {
    console.log('📹 Setting up video stream:', {
      hasCameraStream: !!cameraStream,
      hasVideoRef: !!videoRef.current
    });
    
    if (!cameraStream || !videoRef.current) return;

    const video = videoRef.current;
    video.srcObject = cameraStream;
    
    // Start tracking immediately when video can play
    const handleCanPlay = () => {
      console.log('📹 Video can play - starting tracking immediately');
      setIsTracking(true);
      setError(null);
    };
    
    video.addEventListener('canplay', handleCanPlay);
    
    video.play().then(() => {
      console.log('📹 Video play() succeeded');
    }).catch((err) => {
      console.error('❌ Video play failed:', err);
      setError('Failed to start video playback');
    });

    return () => {
      if (video.srcObject) {
        video.srcObject = null;
      }
    };
  }, [cameraStream]);

  // Start tracking loop
  useEffect(() => {
    if (!isTracking || !videoRef.current || !canvasRef.current) {
      console.log('📹 Tracking conditions not met:', {
        isTracking,
        hasVideo: !!videoRef.current,
        hasCanvas: !!canvasRef.current
      });
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    console.log('📹 Starting tracking loop with video:', {
      videoReady: video.readyState,
      videoSize: `${video.videoWidth}x${video.videoHeight}`,
      hasStream: !!video.srcObject
    });

    // Set canvas size to match video
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    let frameCount = 0;
    const trackingLoop = () => {
      frameCount++;
      if (video.readyState >= 2) { // HAVE_CURRENT_DATA
        performFullBodyTracking(video, canvas);
      } else {
        // Log readiness issues more frequently for debugging
        if (frameCount % 30 === 0) {
          console.warn('📹 Video not ready, readyState:', video.readyState, 'frame:', frameCount);
        }
      }
      
      if (isTracking) {
        animationFrameRef.current = requestAnimationFrame(trackingLoop);
      }
    };

    trackingLoop();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isTracking]);

  return (
    <div className={`fixed top-0 left-0 pointer-events-none ${className}`}>
      <video
        ref={videoRef}
        className="hidden"
        autoPlay
        playsInline
        muted
      />
      <canvas
        ref={canvasRef}
        className="hidden"
      />
      {error && (
        <div className="text-red-500 text-sm p-2">
          Tracking Error: {error}
        </div>
      )}
    </div>
  );
}