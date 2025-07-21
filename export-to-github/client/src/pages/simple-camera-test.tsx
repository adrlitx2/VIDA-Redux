import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SimpleCameraTest() {
  const [status, setStatus] = useState<string>('Not started');
  const [logs, setLogs] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev.slice(-10), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testCamera = async () => {
    setStatus('Testing...');
    setLogs([]);
    
    try {
      addLog('🔍 Checking browser support...');
      
      if (!navigator.mediaDevices) {
        throw new Error('MediaDevices not supported');
      }
      
      if (!navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia not supported');
      }
      
      addLog('✅ Browser supports camera access');
      
      // Try to get camera access
      addLog('📷 Requesting camera permission...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });
      
      addLog(`✅ Camera access granted - ${stream.getVideoTracks().length} video tracks`);
      
      // Check video element
      if (!videoRef.current) {
        throw new Error('Video element not found');
      }
      
      const video = videoRef.current;
      addLog('🎥 Connecting stream to video element...');
      
      // Set up video element
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;
      
      // Listen for video events
      video.addEventListener('loadstart', () => addLog('📺 Video load started'));
      video.addEventListener('loadedmetadata', () => {
        addLog(`📺 Video metadata loaded: ${video.videoWidth}x${video.videoHeight}`);
      });
      video.addEventListener('canplay', () => addLog('📺 Video can play'));
      video.addEventListener('play', () => addLog('▶️ Video started playing'));
      video.addEventListener('error', (e) => addLog(`❌ Video error: ${e}`));
      
      // Force play
      try {
        await video.play();
        addLog('✅ Video.play() successful');
        
        // Check status after a delay
        setTimeout(() => {
          addLog(`📊 Final status: paused=${video.paused}, readyState=${video.readyState}, currentTime=${video.currentTime}`);
          if (!video.paused && video.currentTime > 0) {
            setStatus('✅ Camera working!');
          } else {
            setStatus('⚠️ Camera connected but not playing');
          }
        }, 1000);
        
      } catch (playError) {
        addLog(`❌ Video.play() failed: ${playError}`);
        setStatus('❌ Video play failed');
      }
      
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
      setStatus('❌ Failed');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      addLog('🛑 Camera stopped');
      setStatus('Stopped');
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Simple Camera Test</h1>
          <p className="text-muted-foreground">
            Basic camera access test to identify issues
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Camera Test: {status}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button onClick={testCamera} variant="default">
                Test Camera
              </Button>
              <Button onClick={stopCamera} variant="destructive">
                Stop Camera
              </Button>
            </div>

            {/* Video Preview */}
            <div className="bg-black rounded-lg overflow-hidden">
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
            </div>

            {/* Logs */}
            <Card>
              <CardHeader>
                <CardTitle>Debug Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="font-mono text-sm space-y-1 max-h-40 overflow-y-auto">
                  {logs.length === 0 ? (
                    <div className="text-muted-foreground">No logs yet - click "Test Camera" to start</div>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}