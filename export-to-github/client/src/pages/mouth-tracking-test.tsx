import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, CameraOff } from "lucide-react";
import ConsoleCapture from "../components/ConsoleCapture";
import FullBodyTracker from "../components/FullBodyTracker";

export default function MouthTrackingTest() {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false
      });
      
      setCameraStream(stream);
      setCameraActive(true);
      setError(null);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      console.log('📹 Camera started for mouth tracking test');
    } catch (err) {
      console.error('❌ Camera access failed:', err);
      setError('Failed to access camera. Please ensure camera permissions are granted.');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
    setError(null);
    console.log('📹 Camera stopped');
  };

  const handleTrackingData = (data: any) => {
    // This function receives tracking data but we're mainly interested in console logs
    if (data.face?.blendShapes?.jawOpen !== undefined) {
      console.log('🎯 Avatar would receive jawOpen value:', data.face.blendShapes.jawOpen);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Mouth Tracking Debug Test</h1>
          <p className="text-muted-foreground">
            Test real-time mouth detection and view debug console logs
          </p>
        </div>

        {/* Camera Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Camera Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!cameraActive ? (
              <Button 
                onClick={startCamera}
                size="lg" 
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600"
              >
                <Camera className="h-5 w-5 mr-2" />
                Start Camera for Mouth Tracking
              </Button>
            ) : (
              <Button 
                onClick={stopCamera}
                variant="destructive"
                size="lg" 
                className="w-full"
              >
                <CameraOff className="h-5 w-5 mr-2" />
                Stop Camera
              </Button>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live Camera Feed */}
        {cameraActive && cameraStream && (
          <Card>
            <CardHeader>
              <CardTitle>Live Camera Feed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-black rounded-lg overflow-hidden mb-4">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-64 object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
              </div>
              <div className="text-sm text-muted-foreground">
                <p className="mb-2">
                  <strong>Instructions:</strong> Open and close your mouth while watching the console logs below.
                </p>
                <p>
                  The system analyzes dark pixels in the mouth area (70% down from center) to detect mouth opening.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Console Debug Display */}
        <Card>
          <CardHeader>
            <CardTitle>Real-Time Debug Console</CardTitle>
          </CardHeader>
          <CardContent>
            <ConsoleCapture 
              className="w-full"
              maxLogs={15}
              filterKeywords={['👄', 'Mouth detection', 'jawOpen', 'darkPixelCount', 'darkRatio', '🎯']}
            />
          </CardContent>
        </Card>

        {/* Hidden Full Body Tracker for Processing */}
        {cameraActive && cameraStream && (
          <FullBodyTracker
            cameraStream={cameraStream}
            onTrackingData={handleTrackingData}
            className="hidden"
          />
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Expected Console Output:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• "👄 Mouth detection: {'{darkPixelCount, totalPixels, darkRatio, jawOpen}'}"</li>
                  <li>• "🎯 Avatar would receive jawOpen value: 0.XX"</li>
                  <li>• jawOpen values between 0 (closed) and 1 (open)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Testing Tips:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Open mouth wide for higher jawOpen values</li>
                  <li>• Close mouth completely for jawOpen near 0</li>
                  <li>• Ensure good lighting on your face</li>
                  <li>• Look directly at camera for best detection</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}