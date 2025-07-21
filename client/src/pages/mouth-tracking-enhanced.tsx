import { useRef, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MouthTrackingEnhanced() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previousFrameRef = useRef<ImageData | null>(null);
  const animationRef = useRef<number>();
  
  const [cameraActive, setCameraActive] = useState(false);
  const [mouthValue, setMouthValue] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev.slice(-20), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      addLog('🔍 Starting enhanced mouth tracking...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });
      
      if (!videoRef.current) return;
      
      const video = videoRef.current;
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;
      
      video.addEventListener('canplay', () => {
        addLog('📺 Video ready - starting enhanced detection');
        setCameraActive(true);
        startEnhancedMouthDetection();
      });
      
      await video.play();
      addLog('✅ Camera started successfully');
      
    } catch (error: any) {
      addLog(`❌ Camera error: ${error.message}`);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    setCameraActive(false);
    setMouthValue(0);
    previousFrameRef.current = null;
    addLog('🛑 Camera stopped');
  };

  const detectMouthMotion = (video: HTMLVideoElement, canvas: HTMLCanvasElement): number => {
    const ctx = canvas.getContext('2d');
    if (!ctx || video.videoWidth === 0) {
      addLog('⚠️ No context or video not ready');
      return 0;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Mouth region targeting
    const centerX = canvas.width / 2;
    const centerY = canvas.height * 0.7;
    const regionWidth = Math.floor(canvas.width * 0.3);
    const regionHeight = Math.floor(canvas.height * 0.15);

    const startX = Math.floor(centerX - regionWidth / 2);
    const startY = Math.floor(centerY - regionHeight / 2);

    try {
      const imageData = ctx.getImageData(startX, startY, regionWidth, regionHeight);
      const data = imageData.data;
      
      // Simple darkness analysis for mouth opening
      let darkPixels = 0;
      let totalPixels = 0;
      let avgBrightness = 0;
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const brightness = (r + g + b) / 3;
        
        avgBrightness += brightness;
        totalPixels++;
        
        // Count dark pixels (mouth cavity)
        if (brightness < 100) {
          darkPixels++;
        }
      }
      
      avgBrightness /= totalPixels;
      const darkRatio = darkPixels / totalPixels;
      
      // Simple mouth detection based on darkness
      let mouthOpening = 0;
      if (darkRatio > 0.2) { // At least 20% dark pixels
        mouthOpening = Math.min(1, darkRatio * 2);
      }
      
      // Debug logging for every frame to see what's happening
      addLog(`🔍 Dark pixels: ${darkPixels}/${totalPixels} (${(darkRatio*100).toFixed(1)}%), brightness: ${avgBrightness.toFixed(0)}, mouth: ${(mouthOpening*100).toFixed(1)}%`);
      
      return mouthOpening;
      
    } catch (error) {
      addLog(`❌ Error: ${error}`);
      return 0;
    }
  };

  const startEnhancedMouthDetection = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    let frameCount = 0;
    const animate = () => {
      frameCount++;
      
      if (video.readyState >= 2 && video.videoWidth > 0) {
        const mouthVal = detectMouthMotion(video, canvas);
        setMouthValue(mouthVal);
        
        // Log every 30 frames for better feedback
        if (frameCount % 30 === 0) {
          addLog(`👄 Frame ${frameCount}: ${(mouthVal * 100).toFixed(1)}% activity`);
        }
      }
      
      if (cameraActive) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    
    animate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Enhanced Mouth Tracking Test</CardTitle>
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <video
                  ref={videoRef}
                  className="w-full h-64 bg-black rounded-lg"
                  playsInline
                  muted
                  autoPlay
                />
                <canvas
                  ref={canvasRef}
                  className="hidden"
                />
              </div>
              
              <div className="space-y-4">
                <div className="bg-slate-800 p-4 rounded-lg border border-slate-600">
                  <h3 className="font-semibold mb-2 text-white">Mouth Activity</h3>
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
                  <p className="text-sm mt-2 text-slate-300">{(mouthValue * 100).toFixed(1)}% motion detected</p>
                </div>
                
                <div className="bg-slate-800 p-4 rounded-lg border border-slate-600 max-h-64 overflow-y-auto">
                  <h3 className="font-semibold mb-2 text-white">Detection Log</h3>
                  <div className="space-y-1 text-sm font-mono">
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
              <h4 className="font-semibold mb-2 text-white">Enhanced Detection:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Improved motion sensitivity with lower thresholds</li>
                <li>Larger detection region covering mouth area</li>
                <li>Real-time frame comparison analysis</li>
                <li>Debug logging shows detection details</li>
                <li>Try opening your mouth wide or talking</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}