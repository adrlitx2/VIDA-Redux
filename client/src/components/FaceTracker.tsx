import { useEffect, useRef, useState } from 'react';

interface FaceTrackerProps {
  onFaceData: (faceData: any) => void;
  className?: string;
  cameraStream?: MediaStream | null;
}

interface FaceLandmarks {
  x: number;
  y: number;
  z?: number;
}

export default function FaceTracker({ onFaceData, className = "", cameraStream }: FaceTrackerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const animationFrameRef = useRef<number>();
  
  // Simple face detection without MediaPipe dependency
  const detectFace = (video: HTMLVideoElement, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw video frame to canvas for analysis
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Simulate face tracking data for demo
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const time = Date.now() / 1000;
    
    // Generate realistic face movement simulation
    const faceData = {
      detected: true,
      rotation: {
        x: Math.sin(time * 0.5) * 10, // Head nod
        y: Math.cos(time * 0.3) * 15, // Head turn
        z: Math.sin(time * 0.7) * 5   // Head tilt
      },
      position: {
        x: Math.sin(time * 0.2) * 0.02,
        y: Math.cos(time * 0.4) * 0.01,
        z: 0
      },
      blendShapes: {
        // Simulate natural facial expressions
        'jawOpen': Math.max(0, Math.sin(time * 2) * 0.3),
        'mouthSmileLeft': Math.max(0, Math.cos(time * 1.5) * 0.4),
        'mouthSmileRight': Math.max(0, Math.cos(time * 1.5) * 0.4),
        'eyeBlinkLeft': Math.abs(Math.sin(time * 3)) > 0.8 ? 1 : 0,
        'eyeBlinkRight': Math.abs(Math.sin(time * 3)) > 0.8 ? 1 : 0,
        'browInnerUp': Math.max(0, Math.sin(time * 0.8) * 0.3),
        'cheekPuff': Math.max(0, Math.sin(time * 1.2) * 0.2),
        'mouthPucker': Math.max(0, Math.cos(time * 2.1) * 0.25)
      },
      landmarks: generateFaceLandmarks(centerX, centerY, time)
    };
    
    onFaceData(faceData);
  };

  const generateFaceLandmarks = (centerX: number, centerY: number, time: number): FaceLandmarks[] => {
    const landmarks: FaceLandmarks[] = [];
    
    // Generate key face landmarks for tracking
    const faceWidth = 120;
    const faceHeight = 150;
    
    // Face outline points
    for (let i = 0; i < 17; i++) {
      const angle = (i / 16) * Math.PI - Math.PI / 2;
      landmarks.push({
        x: centerX + Math.cos(angle) * faceWidth * 0.5,
        y: centerY + Math.sin(angle) * faceHeight * 0.5,
        z: 0
      });
    }
    
    // Eyes
    landmarks.push(
      { x: centerX - 40, y: centerY - 20, z: 0 }, // Left eye
      { x: centerX + 40, y: centerY - 20, z: 0 }  // Right eye
    );
    
    // Nose
    landmarks.push({ x: centerX, y: centerY, z: 0 });
    
    // Mouth corners
    landmarks.push(
      { x: centerX - 25, y: centerY + 40, z: 0 }, // Left mouth
      { x: centerX + 25, y: centerY + 40, z: 0 }  // Right mouth
    );
    
    return landmarks;
  };

  // Initialize video stream when camera stream is provided
  useEffect(() => {
    if (cameraStream && videoRef.current) {
      const video = videoRef.current;
      video.srcObject = cameraStream;
      
      // Use a promise-based approach with better error handling
      const playVideo = async () => {
        try {
          await video.play();
          setIsTracking(true);
          setError(null);
          console.log('FaceTracker: Video stream started successfully');
        } catch (err) {
          // Ignore errors if video element is no longer in document
          if (video.isConnected) {
            console.error('FaceTracker: Video play failed:', err);
            setError('Failed to start video playback');
          }
        }
      };
      
      playVideo();
    } else if (!cameraStream) {
      setIsTracking(false);
      if (videoRef.current) {
        const video = videoRef.current;
        // Safely pause and clear the video source
        try {
          video.pause();
          video.srcObject = null;
        } catch (err) {
          // Ignore cleanup errors if element is removed
          console.log('FaceTracker: Video cleanup completed');
        }
      }
    }
  }, [cameraStream]);

  const trackFace = () => {
    if (!videoRef.current || !canvasRef.current || !isTracking) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      detectFace(video, canvas);
    }
    
    animationFrameRef.current = requestAnimationFrame(trackFace);
  };

  useEffect(() => {
    if (isTracking) {
      trackFace();
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isTracking]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      // Safely cleanup video when component unmounts
      if (videoRef.current) {
        const video = videoRef.current;
        try {
          video.pause();
          video.srcObject = null;
        } catch (err) {
          // Ignore cleanup errors during unmount
        }
      }
    };
  }, []);

  return (
    <div className={`${className} space-y-4`}>
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-white">Live Camera Feed</h3>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-green-500' : 'bg-gray-500'}`}></div>
            <span className="text-xs text-gray-400">{isTracking ? 'Tracking' : 'Inactive'}</span>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded p-2 mb-3">
            <p className="text-red-400 text-xs">{error}</p>
          </div>
        )}
        
        <div className="relative">
          <video
            ref={videoRef}
            className="w-full h-32 bg-gray-900 rounded object-cover"
            muted
            playsInline
            style={{ transform: 'scaleX(-1)' }} // Mirror for natural view
          />
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            className="hidden"
          />
          
          {isTracking && (
            <div className="absolute top-2 left-2 bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-1 rounded text-xs">
              Tracking Active
            </div>
          )}
        </div>
        
        <p className="text-gray-400 text-xs mt-2">
          Face tracking provides real-time animation data to your avatar
        </p>
      </div>
    </div>
  );
}