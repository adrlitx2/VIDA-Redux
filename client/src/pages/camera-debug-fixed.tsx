import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CameraDebugFixed() {
  const [cameraActive, setCameraActive] = useState(false);
  const [mouthValue, setMouthValue] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev.slice(-15), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const startCamera = async () => {
    try {
      addLog('🔍 Starting camera access...');
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported by this browser');
      }
      
      // Wait for React to render the video element
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!videoRef.current) {
        addLog('❌ Video element ref is null, retrying...');
        await new Promise(resolve => setTimeout(resolve, 200));
        
        if (!videoRef.current) {
          throw new Error('Video element not found after retry');
        }
      }
      
      addLog('✅ Video element found, requesting camera permission...');
      
      // Check permissions first
      try {
        const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        addLog(`📋 Camera permission status: ${permission.state}`);
        
        if (permission.state === 'denied') {
          throw new Error('Camera permission denied. Please allow camera access in your browser settings.');
        }
      } catch (permError) {
        addLog('⚠️ Could not check permissions, proceeding with camera request...');
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });
      
      addLog(`✅ Camera stream obtained - ${stream.getVideoTracks().length} tracks`);
      
      const video = videoRef.current;
      
      // Set up video events before setting srcObject
      video.addEventListener('loadedmetadata', () => {
        addLog(`📺 Video ready: ${video.videoWidth}x${video.videoHeight}`);
      });
      
      video.addEventListener('canplay', () => {
        addLog('📺 Video can play - starting mouth detection');
        setCameraActive(true);
        startMouthDetection();
      });
      
      video.addEventListener('error', (e) => {
        addLog(`❌ Video error: ${e}`);
      });
      
      // Configure video properties
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;
      
      // Set the stream
      video.srcObject = stream;
      
      // Attempt to play
      try {
        await video.play();
        addLog('✅ Video playing successfully');
      } catch (playError: any) {
        addLog(`⚠️ Video play warning: ${playError.message}`);
        // Video might still work even if play() fails initially
      }
      
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        addLog('❌ Camera access denied by user. Please allow camera access and try again.');
      } else if (error.name === 'NotFoundError') {
        addLog('❌ No camera found. Please connect a camera and try again.');
      } else if (error.name === 'NotReadableError') {
        addLog('❌ Camera is being used by another application.');
      } else {
        addLog(`❌ Camera failed: ${error.message}`);
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    setCameraActive(false);
    setMouthValue(0);
    addLog('🛑 Camera stopped');
  };

  const detectMouth = (video: HTMLVideoElement, canvas: HTMLCanvasElement): number => {
    const ctx = canvas.getContext('2d');
    if (!ctx || video.videoWidth === 0) return 0;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // More precise mouth region targeting the actual mouth area
    const centerX = canvas.width / 2;
    const centerY = canvas.height * 0.75; // Lower on face for mouth
    const regionWidth = Math.floor(canvas.width * 0.15); // Smaller, more focused region
    const regionHeight = Math.floor(canvas.height * 0.08); // Narrower height

    const startX = Math.floor(centerX - regionWidth / 2);
    const startY = Math.floor(centerY - regionHeight / 2);

    try {
      const imageData = ctx.getImageData(startX, startY, regionWidth, regionHeight);
      const data = imageData.data;

      let totalBrightness = 0;
      let pixelCount = 0;
      let darkPixelCount = 0;
      
      // Sample fewer pixels for more stable detection
      for (let i = 0; i < data.length; i += 16) { // Sample every 4th pixel (4 * 4 = 16)
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const brightness = (r + g + b) / 3;
        
        totalBrightness += brightness;
        pixelCount++;
        
        // Count significantly dark pixels (mouth cavity)
        if (brightness < 80) {
          darkPixelCount++;
        }
      }

      if (pixelCount === 0) return 0;
      
      const averageBrightness = totalBrightness / pixelCount;
      const darkPixelRatio = darkPixelCount / pixelCount;
      
      // More conservative mouth detection with higher thresholds
      let mouthOpening = 0;
      
      // Only register mouth opening if there's a significant dark ratio
      if (darkPixelRatio > 0.3) { // At least 30% dark pixels
        // Scale the opening based on darkness and average brightness
        mouthOpening = Math.min(1, darkPixelRatio * 1.5);
        
        // Reduce sensitivity for very bright conditions
        if (averageBrightness > 150) {
          mouthOpening *= 0.7;
        }
      }
      
      return mouthOpening;
    } catch (error) {
      return 0;
    }
  };

  const startMouthDetection = () => {
    if (!videoRef.current || !canvasRef.current) {
      addLog('❌ Video or canvas ref missing for mouth detection');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    addLog('🎯 Starting mouth detection animation loop');
    
    let frameCount = 0;
    const animate = () => {
      frameCount++;
      
      if (video.readyState >= 2 && video.videoWidth > 0) {
        const mouthVal = detectMouth(video, canvas);
        setMouthValue(mouthVal);
        
        // Log every 30 frames (roughly twice per second at 60fps)
        if (frameCount % 30 === 0) {
          addLog(`👄 Mouth: ${(mouthVal * 100).toFixed(0)}% open (frame ${frameCount})`);
        }
      } else {
        // Log video readiness issues
        if (frameCount % 60 === 0) {
          addLog(`⚠️ Video not ready: readyState=${video.readyState}, size=${video.videoWidth}x${video.videoHeight}`);
        }
      }
      
      if (cameraActive) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    
    animate();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Camera Debug - Fixed</h1>
          <p className="text-muted-foreground">
            Simplified camera access with mouth tracking detection
          </p>
        </div>

        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Camera Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button 
                onClick={startCamera} 
                disabled={cameraActive}
                variant="default"
              >
                Start Camera
              </Button>
              <Button 
                onClick={stopCamera} 
                disabled={!cameraActive}
                variant="destructive"
              >
                Stop Camera
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Camera Feed - Always Rendered */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Video Feed */}
          <Card>
            <CardHeader>
              <CardTitle>Camera Feed</CardTitle>
            </CardHeader>
            <CardContent>
              <video
                ref={videoRef}
                className="w-full h-64 object-cover rounded-lg"
                style={{ 
                  transform: 'scaleX(-1)',
                  backgroundColor: '#000'
                }}
                muted
                playsInline
                autoPlay
              />
              <canvas
                ref={canvasRef}
                className="hidden"
              />
              <div className="mt-2 text-sm text-muted-foreground">
                Status: {cameraActive ? 'Camera Active' : 'Camera Inactive'}
              </div>
            </CardContent>
          </Card>

          {/* Mouth Detection Results */}
          {cameraActive && (
            <Card>
              <CardHeader>
                <CardTitle>Mouth Detection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-6xl font-bold text-blue-500">
                    {(mouthValue * 100).toFixed(0)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Mouth Opening</div>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-6">
                  <div 
                    className="bg-blue-500 h-6 rounded-full transition-all duration-100"
                    style={{ width: `${mouthValue * 100}%` }}
                  />
                </div>

                <div className="text-center text-sm">
                  {mouthValue > 0.4 ? '😮 Mouth Open' : 
                   mouthValue > 0.2 ? '😐 Mouth Slightly Open' : 
                   '😊 Mouth Closed'}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Debug Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Debug Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-sm space-y-1 max-h-40 overflow-y-auto bg-black/5 p-4 rounded-lg">
              {logs.length === 0 ? (
                <div className="text-muted-foreground">No logs yet - click "Start Camera" to begin</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="text-xs">
                    {log}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}