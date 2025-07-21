import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function MouthTrackingWorking() {
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState<string>('');
  const [mouthValue, setMouthValue] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [frameCount, setFrameCount] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>();
  const baselineRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);

  const addLog = (message: string) => {
    setLogs(prev => [message, ...prev].slice(0, 10));
  };

  const startCamera = async () => {
    try {
      setError('');
      addLog('Starting camera...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        addLog('Camera started - establishing baseline...');
        
        // Wait for video to be fully ready before starting detection
        setTimeout(() => {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            addLog('Video ready - starting detection loop...');
            startDetection();
          } else {
            addLog('Video not ready, retrying...');
            setTimeout(() => startDetection(), 500);
          }
        }, 100);
      }
    } catch (err: any) {
      const errorMsg = `Camera error: ${err.message}`;
      setError(errorMsg);
      addLog(errorMsg);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    setCameraActive(false);
    baselineRef.current = 0;
    frameCountRef.current = 0;
    setFrameCount(0);
    addLog('Camera stopped');
  };

  const detectMouthActivity = (video: HTMLVideoElement, canvas: HTMLCanvasElement): number => {
    const ctx = canvas.getContext('2d');
    if (!ctx || video.videoWidth === 0) return 0;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    // Focus on mouth area - precise positioning for lip detection
    const centerX = canvas.width / 2;
    const centerY = canvas.height * 0.75;
    const width = Math.floor(canvas.width * 0.14);
    const height = Math.floor(canvas.height * 0.08);
    const startX = Math.floor(centerX - width / 2);
    const startY = Math.floor(centerY - height / 2);

    try {
      const imageData = ctx.getImageData(startX, startY, width, height);
      const data = imageData.data;
      
      // Detect lip-colored pixels (red/pink tones) and their vertical distribution
      let lipPixelCount = 0;
      let verticalSpread = 0;
      let topLipY = height;
      let bottomLipY = 0;
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const index = (y * width + x) * 4;
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];
          
          // Detect lip colors - red/pink tones where red is dominant
          const isLipColor = r > g + 10 && r > b + 5 && r > 80;
          
          if (isLipColor) {
            lipPixelCount++;
            topLipY = Math.min(topLipY, y);
            bottomLipY = Math.max(bottomLipY, y);
          }
        }
      }
      
      // Calculate vertical spread of lip pixels (mouth opening increases this)
      verticalSpread = bottomLipY - topLipY;
      
      // Establish baseline over first 60 frames (about 2 seconds)
      frameCountRef.current++;
      setFrameCount(frameCountRef.current);
      
      if (frameCountRef.current <= 60) {
        baselineRef.current = (baselineRef.current * (frameCountRef.current - 1) + verticalSpread) / frameCountRef.current;
        if (frameCountRef.current % 15 === 0) {
          addLog(`Calibrating... ${frameCountRef.current}/60 frames (baseline: ${baselineRef.current.toFixed(1)})`);
        }
        return 0; // Don't show activity during baseline establishment
      }
      
      // Calculate mouth opening based on increased vertical spread of lips
      const deviation = Math.max(0, verticalSpread - baselineRef.current);
      const mouthActivity = Math.min(1, deviation / 8); // Normalize to 0-1, sensitive to small changes
      
      return mouthActivity;
      
    } catch (error) {
      return 0;
    }
  };

  const startDetection = () => {
    addLog('startDetection() called');
    
    const detectLoop = () => {
      // Check if detection should continue by looking at the animation ref
      if (!animationRef.current && frameCountRef.current > 0) {
        addLog('Detection stopped - animation cancelled');
        return;
      }
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (video && canvas && video.readyState >= 2) {
        const activity = detectMouthActivity(video, canvas);
        setMouthValue(activity);
        
        // Log every frame during first 10 frames for debugging
        if (frameCountRef.current <= 10) {
          addLog(`Frame ${frameCountRef.current}: activity=${(activity * 100).toFixed(1)}%`);
        }
        // Log occasionally during baseline
        else if (frameCountRef.current <= 60 && frameCountRef.current % 15 === 0) {
          addLog(`Establishing baseline... ${frameCountRef.current}/60 frames`);
        } 
        // Log activity after baseline
        else if (frameCountRef.current > 60 && activity > 0.1) {
          addLog(`Mouth activity detected: ${(activity * 100).toFixed(1)}%`);
        }
        
        // Continue the loop
        animationRef.current = requestAnimationFrame(detectLoop);
      } else {
        addLog(`Detection waiting - video ready: ${video?.readyState}, canvas: ${!!canvas}`);
        // Retry after a short delay
        animationRef.current = requestAnimationFrame(detectLoop);
      }
    };
    
    detectLoop();
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="border-slate-600 bg-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Working Mouth Tracking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button 
                onClick={startCamera} 
                disabled={cameraActive}
                className="bg-green-600 hover:bg-green-700"
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

            {error && (
              <div className="bg-red-900 border border-red-600 text-red-200 p-4 rounded-lg">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-white font-semibold">Camera Feed</h3>
                <video
                  ref={videoRef}
                  className="w-full max-w-md rounded-lg border border-slate-600"
                  autoPlay
                  muted
                  playsInline
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>

              <div className="space-y-4">
                <div className="bg-slate-800 p-4 rounded-lg border border-slate-600">
                  <h3 className="font-semibold mb-2 text-white">Mouth Activity</h3>
                  <div className="w-full bg-slate-700 rounded-full h-8 border border-slate-500">
                    <div 
                      className="bg-gradient-to-r from-green-400 to-blue-500 h-8 rounded-full transition-all duration-200 flex items-center justify-center"
                      style={{ width: `${mouthValue * 100}%` }}
                    >
                      {mouthValue > 0.1 && (
                        <span className="text-white text-xs font-bold">
                          {(mouthValue * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm mt-2 text-slate-300">
                    {frameCount <= 60 
                      ? `Calibrating... ${frameCount}/60 frames`
                      : `${(mouthValue * 100).toFixed(1)}% mouth opening`
                    }
                  </p>
                </div>
                
                <div className="bg-slate-800 p-4 rounded-lg border border-slate-600 max-h-48 overflow-y-auto">
                  <h3 className="font-semibold mb-2 text-white">Activity Log</h3>
                  <div className="space-y-1 text-sm">
                    {logs.map((log, index) => (
                      <div key={index} className="text-slate-300">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="text-sm text-slate-300 bg-slate-800 border border-slate-600 p-4 rounded-lg">
              <h4 className="font-semibold mb-2 text-white">How it works:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Establishes baseline darkness level during first 2 seconds</li>
                <li>Detects deviations from baseline (mouth opening creates darker regions)</li>
                <li>Only shows activity after calibration is complete</li>
                <li>Should respond when you open your mouth or speak</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}