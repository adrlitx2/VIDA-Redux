import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, CameraOff } from 'lucide-react';

export default function CameraDebug() {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [mouthValue, setMouthValue] = useState(0);
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  const startCamera = async () => {
    try {
      console.log('🎥 Checking camera availability...');
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia not supported in this browser');
      }
      
      // List available devices first
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      console.log('📱 Available video devices:', videoDevices.length);
      
      console.log('🎥 Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true,
        audio: false
      });
      
      console.log('✅ Camera stream obtained:', {
        tracks: stream.getVideoTracks().length,
        active: stream.active
      });
      
      setCameraStream(stream);
      setCameraActive(true);
      setError(null);
      
      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        
        // Set up video events with more detailed debugging
        video.addEventListener('loadstart', () => console.log('📺 Video load started'));
        video.addEventListener('loadedmetadata', () => {
          console.log(`📺 Video metadata loaded: ${video.videoWidth}x${video.videoHeight}`);
          console.log('📺 Video properties:', {
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            readyState: video.readyState,
            paused: video.paused,
            srcObject: !!video.srcObject,
            currentSrc: video.currentSrc,
            networkState: video.networkState
          });
        });
        video.addEventListener('canplay', () => {
          console.log('📺 Video can play');
          console.log('📺 Can play - video status:', {
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            readyState: video.readyState,
            paused: video.paused
          });
        });
        video.addEventListener('play', () => {
          console.log('▶️ Video started playing');
          console.log('▶️ Playing - video status:', {
            currentTime: video.currentTime,
            duration: video.duration,
            paused: video.paused,
            ended: video.ended
          });
        });
        video.addEventListener('error', (e) => {
          console.log(`❌ Video error:`, e);
          console.log('❌ Video error details:', {
            error: video.error,
            networkState: video.networkState,
            readyState: video.readyState
          });
        });
        
        // Force play
        try {
          await video.play();
          console.log('✅ Video.play() successful');
          
          // Check status after a delay
          setTimeout(() => {
            console.log(`📊 Final status: paused=${video.paused}, readyState=${video.readyState}, currentTime=${video.currentTime}`);
          }, 1000);
          
        } catch (playError) {
          console.log(`❌ Video.play() failed: ${playError}`);
        }
      }
      
    } catch (err: any) {
      console.error('❌ Camera access failed:', err);
      let errorMessage = `Camera failed: ${err.message}`;
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Camera access denied. Please allow camera permissions and try again.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera found. Please connect a camera and try again.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Camera is already in use by another application.';
      }
      
      setError(errorMessage);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  // Simple mouth detection
  const detectMouth = (video: HTMLVideoElement, canvas: HTMLCanvasElement): number => {
    const ctx = canvas.getContext('2d');
    if (!ctx || video.readyState < 2) return 0;

    try {
      // Draw current video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Focus on mouth area (center-bottom, mirrored for selfie view)
      const centerX = Math.floor(canvas.width / 2);
      const mouthY = Math.floor(canvas.height * 0.65); // Slightly higher for better detection
      const mouthWidth = Math.floor(canvas.width * 0.12); // Smaller, more focused region
      const mouthHeight = Math.floor(canvas.height * 0.06);
      
      const x = centerX - mouthWidth / 2;
      const y = mouthY - mouthHeight / 2;
      
      // Get pixel data from mouth region
      const imageData = ctx.getImageData(x, y, mouthWidth, mouthHeight);
      const data = imageData.data;
      
      let darkPixels = 0;
      let totalPixels = 0;
      let totalBrightness = 0;
      let veryDarkPixels = 0; // Count extremely dark pixels (open mouth cavity)
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const brightness = (r + g + b) / 3;
        
        totalBrightness += brightness;
        totalPixels++;
        
        if (brightness < 60) { // Very dark threshold for mouth cavity
          veryDarkPixels++;
        }
        if (brightness < 100) { // General dark threshold
          darkPixels++;
        }
      }
      
      const darkRatio = darkPixels / totalPixels;
      const veryDarkRatio = veryDarkPixels / totalPixels;
      const avgBrightness = totalBrightness / totalPixels;
      
      // Update debug info
      setDebugInfo({
        region: `${x},${y} ${mouthWidth}x${mouthHeight}`,
        darkPixels,
        veryDarkPixels,
        totalPixels,
        darkRatio: darkRatio.toFixed(3),
        veryDarkRatio: veryDarkRatio.toFixed(3),
        avgBrightness: avgBrightness.toFixed(1),
        videoReady: video.readyState,
        canvasSize: `${canvas.width}x${canvas.height}`,
        videoSize: `${video.videoWidth}x${video.videoHeight}`
      });
      
      // Convert very dark ratio to mouth opening (0-1) - more sensitive to mouth cavity
      let mouthOpen = 0;
      if (veryDarkRatio > 0.05) { // Lower threshold for very dark pixels
        mouthOpen = Math.min(1, (veryDarkRatio - 0.05) * 8); // Higher multiplier for sensitivity
      }
      
      // Also check regular dark ratio as backup
      if (darkRatio > 0.25) {
        const darkMouthOpen = Math.min(1, (darkRatio - 0.25) * 4);
        mouthOpen = Math.max(mouthOpen, darkMouthOpen);
      }
      
      return mouthOpen;
    } catch (error) {
      console.error('Mouth detection error:', error);
      return 0;
    }
  };

  // Animation loop
  useEffect(() => {
    if (!cameraActive || !videoRef.current || !canvasRef.current) {
      console.log('Animation loop conditions not met:', {
        cameraActive,
        hasVideo: !!videoRef.current,
        hasCanvas: !!canvasRef.current
      });
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    console.log('Setting up animation loop for video:', {
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      readyState: video.readyState
    });
    
    // Set canvas size to match video (with fallback)
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    let frameCount = 0;
    const animationLoop = () => {
      frameCount++;
      
      if (video.readyState >= 2 && video.videoWidth > 0) {
        const mouthVal = detectMouth(video, canvas);
        setMouthValue(mouthVal);
        
        // Log every 60 frames to avoid spam
        if (frameCount % 60 === 0) {
          console.log('Detection running - frame:', frameCount, 'mouth:', (mouthVal * 100).toFixed(0) + '%');
        }
      } else {
        // Log readiness issues
        if (frameCount % 30 === 0) {
          console.log('Video not ready for detection:', {
            readyState: video.readyState,
            videoWidth: video.videoWidth,
            frame: frameCount
          });
        }
      }
      
      if (cameraActive) {
        animationRef.current = requestAnimationFrame(animationLoop);
      }
    };

    // Start animation loop immediately and also on video events
    const handleCanPlay = () => {
      console.log('Video canplay event - starting detection');
      if (!animationRef.current) {
        animationLoop();
      }
    };

    const handleLoadedData = () => {
      console.log('Video loadeddata event');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
    };

    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('loadeddata', handleLoadedData);
    
    // Start immediately if video is already ready
    if (video.readyState >= 2) {
      console.log('Video already ready, starting detection immediately');
      animationLoop();
    } else {
      console.log('Video not ready, waiting for events. ReadyState:', video.readyState);
    }
    
    return () => {
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('loadeddata', handleLoadedData);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [cameraActive]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Camera Debug Test</h1>
          <p className="text-muted-foreground">
            Direct test of camera stream and mouth detection
          </p>
        </div>

        {/* Camera Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Camera Control</CardTitle>
          </CardHeader>
          <CardContent>
            {!cameraActive ? (
              <Button onClick={startCamera} className="w-full">
                <Camera className="h-5 w-5 mr-2" />
                Start Camera
              </Button>
            ) : (
              <Button onClick={stopCamera} variant="destructive" className="w-full">
                <CameraOff className="h-5 w-5 mr-2" />
                Stop Camera
              </Button>
            )}
            
            {error && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Camera Feed and Detection */}
        {cameraActive && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Video Feed */}
            <Card>
              <CardHeader>
                <CardTitle>Camera Feed</CardTitle>
              </CardHeader>
              <CardContent>
                <video
                  ref={videoRef}
                  className="w-full h-64 object-cover"
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
              </CardContent>
            </Card>

            {/* Detection Results */}
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
                
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div 
                    className="bg-blue-500 h-4 rounded-full transition-all duration-100"
                    style={{ width: `${mouthValue * 100}%` }}
                  />
                </div>

                <div className="text-xs space-y-1">
                  <div>Region: {debugInfo.region}</div>
                  <div>Dark Pixels: {debugInfo.darkPixels}/{debugInfo.totalPixels}</div>
                  <div>Very Dark: {debugInfo.veryDarkPixels} ({debugInfo.veryDarkRatio})</div>
                  <div>Dark Ratio: {debugInfo.darkRatio}</div>
                  <div>Avg Brightness: {debugInfo.avgBrightness}</div>
                  <div>Video Ready: {debugInfo.videoReady}</div>
                  <div>Canvas: {debugInfo.canvasSize}</div>
                  <div>Video: {debugInfo.videoSize}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}