import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function MouthTrackingVisualDebug() {
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState<string>('');
  const [mouthValue, setMouthValue] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const debugCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>();

  const addLog = (message: string) => {
    setLogs(prev => {
      const newLogs = [message, ...prev].slice(0, 20);
      return newLogs;
    });
  };

  const startCamera = async () => {
    try {
      setError('');
      addLog('🎬 Starting camera...');
      
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
        addLog('✅ Camera started successfully');
        startDetection();
      }
    } catch (err: any) {
      const errorMsg = `Camera error: ${err.message}`;
      setError(errorMsg);
      addLog(`❌ ${errorMsg}`);
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
    addLog('🛑 Camera stopped');
  };

  const detectAndVisualize = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const debugCanvas = debugCanvasRef.current;
    
    if (!video || !canvas || !debugCanvas) return 0;

    const ctx = canvas.getContext('2d');
    const debugCtx = debugCanvas.getContext('2d');
    
    if (!ctx || !debugCtx || video.videoWidth === 0) return 0;

    // Set canvas dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    debugCanvas.width = video.videoWidth;
    debugCanvas.height = video.videoHeight;

    // Draw the video frame
    ctx.drawImage(video, 0, 0);
    debugCtx.drawImage(video, 0, 0);

    // Define mouth detection region
    const centerX = canvas.width / 2;
    const centerY = canvas.height * 0.7;
    const regionWidth = Math.floor(canvas.width * 0.3);
    const regionHeight = Math.floor(canvas.height * 0.15);
    const startX = Math.floor(centerX - regionWidth / 2);
    const startY = Math.floor(centerY - regionHeight / 2);

    // Draw detection region rectangle on debug canvas
    debugCtx.strokeStyle = '#ff0000';
    debugCtx.lineWidth = 3;
    debugCtx.strokeRect(startX, startY, regionWidth, regionHeight);
    
    // Add text label
    debugCtx.fillStyle = '#ff0000';
    debugCtx.font = '16px Arial';
    debugCtx.fillText('Detection Region', startX, startY - 10);

    try {
      const imageData = ctx.getImageData(startX, startY, regionWidth, regionHeight);
      const data = imageData.data;
      
      let darkPixels = 0;
      let brightPixels = 0;
      let totalPixels = 0;
      let avgBrightness = 0;
      let minBrightness = 255;
      let maxBrightness = 0;
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const brightness = (r + g + b) / 3;
        
        avgBrightness += brightness;
        totalPixels++;
        
        if (brightness < minBrightness) minBrightness = brightness;
        if (brightness > maxBrightness) maxBrightness = brightness;
        
        if (brightness < 100) {
          darkPixels++;
        } else if (brightness > 180) {
          brightPixels++;
        }
      }
      
      avgBrightness /= totalPixels;
      const darkRatio = darkPixels / totalPixels;
      const brightRatio = brightPixels / totalPixels;
      
      // Calculate mouth opening with better logic
      let mouthOpening = 0;
      
      // Look for contrast between dark and bright areas
      const contrast = maxBrightness - minBrightness;
      const hasDarkAreas = darkRatio > 0.1;
      const hasGoodContrast = contrast > 50;
      
      if (hasDarkAreas && hasGoodContrast) {
        // Scale based on dark pixel ratio, but with reasonable limits
        mouthOpening = Math.min(1, darkRatio * 2);
      }
      
      // Visual feedback on debug canvas
      debugCtx.fillStyle = mouthOpening > 0.3 ? '#00ff00' : '#ffff00';
      debugCtx.fillRect(startX + regionWidth + 10, startY, 20, regionHeight * mouthOpening);
      
      // Detailed logging
      addLog(`🔍 Region: ${regionWidth}x${regionHeight} | Dark: ${darkPixels}/${totalPixels} (${(darkRatio*100).toFixed(1)}%) | Avg brightness: ${avgBrightness.toFixed(0)} | Contrast: ${contrast.toFixed(0)} | Result: ${(mouthOpening*100).toFixed(1)}%`);
      
      return mouthOpening;
      
    } catch (error) {
      addLog(`❌ Error: ${error}`);
      return 0;
    }
  };

  const startDetection = () => {
    let frameCount = 0;
    
    const detectLoop = () => {
      if (!cameraActive) return;
      
      const video = videoRef.current;
      if (video && video.readyState >= 2) {
        const mouthVal = detectAndVisualize();
        setMouthValue(mouthVal);
        frameCount++;
      }
      
      animationRef.current = requestAnimationFrame(detectLoop);
    };
    
    detectLoop();
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <Card className="border-slate-600 bg-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Visual Mouth Tracking Debug</CardTitle>
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
              {/* Original Video */}
              <div className="space-y-4">
                <h3 className="text-white font-semibold">Original Camera Feed</h3>
                <div className="relative">
                  <video
                    ref={videoRef}
                    className="w-full max-w-md rounded-lg border border-slate-600"
                    autoPlay
                    muted
                    playsInline
                  />
                  <canvas ref={canvasRef} className="hidden" />
                </div>
              </div>

              {/* Debug Overlay */}
              <div className="space-y-4">
                <h3 className="text-white font-semibold">Detection Visualization</h3>
                <canvas
                  ref={debugCanvasRef}
                  className="w-full max-w-md rounded-lg border border-slate-600 bg-black"
                />
              </div>
            </div>

            {/* Results */}
            <div className="space-y-4">
              <div className="bg-slate-800 p-4 rounded-lg border border-slate-600">
                <h3 className="font-semibold mb-2 text-white">Mouth Detection Result</h3>
                <div className="w-full bg-slate-700 rounded-full h-8 border border-slate-500">
                  <div 
                    className="bg-gradient-to-r from-green-400 to-blue-500 h-8 rounded-full transition-all duration-100 flex items-center justify-center"
                    style={{ width: `${mouthValue * 100}%` }}
                  >
                    {mouthValue > 0.1 && (
                      <span className="text-white text-xs font-bold">
                        {(mouthValue * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm mt-2 text-slate-300">{(mouthValue * 100).toFixed(1)}% mouth opening detected</p>
              </div>
              
              <div className="bg-slate-800 p-4 rounded-lg border border-slate-600 max-h-64 overflow-y-auto">
                <h3 className="font-semibold mb-2 text-white">Detection Analysis</h3>
                <div className="space-y-1 text-sm font-mono">
                  {logs.map((log, index) => (
                    <div key={index} className="text-slate-300">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="text-sm text-slate-300 bg-slate-800 border border-slate-600 p-4 rounded-lg">
              <h4 className="font-semibold mb-2 text-white">Visual Debug Features:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Red rectangle shows exact detection region</li>
                <li>Green/yellow bar shows detection strength</li>
                <li>Detailed pixel analysis in logs</li>
                <li>Real-time brightness and contrast values</li>
                <li>Compare original video vs detection overlay</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}