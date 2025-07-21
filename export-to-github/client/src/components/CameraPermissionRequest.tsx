import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera, AlertTriangle, Shield, RefreshCw } from "lucide-react";

interface CameraPermissionRequestProps {
  onPermissionGranted: () => void;
  onPermissionDenied: () => void;
}

export default function CameraPermissionRequest({ 
  onPermissionGranted, 
  onPermissionDenied 
}: CameraPermissionRequestProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [permissionState, setPermissionState] = useState<'initial' | 'denied' | 'error'>('initial');

  const requestCameraPermission = async () => {
    setIsRequesting(true);
    
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera not supported in this browser");
      }

      // Set a timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Camera request timeout')), 10000);
      });

      const streamPromise = navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }, 
        audio: false // Request only video to avoid audio permission complications
      });

      const stream = await Promise.race([streamPromise, timeoutPromise]) as MediaStream;
      
      // Permission granted - clean up the test stream
      stream.getTracks().forEach(track => track.stop());
      
      setPermissionState('initial');
      onPermissionGranted();
    } catch (error: any) {
      console.error('Camera permission error:', error);
      
      if (error.name === 'NotAllowedError') {
        setPermissionState('denied');
      } else if (error.message === 'Camera request timeout') {
        setPermissionState('error');
      } else {
        setPermissionState('error');
      }
      
      onPermissionDenied();
    } finally {
      setIsRequesting(false);
    }
  };

  const openBrowserSettings = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    let instructions = "Please check your browser's camera permissions for this site.";
    
    if (userAgent.includes('chrome')) {
      instructions = "Click the camera icon in the address bar, then select 'Allow' for camera access.";
    } else if (userAgent.includes('firefox')) {
      instructions = "Click the shield icon in the address bar, then allow camera permissions.";
    } else if (userAgent.includes('safari')) {
      instructions = "Go to Safari > Settings > Websites > Camera and allow access for this site.";
    }
    
    alert(instructions);
  };

  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Camera className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Camera Access Required</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            VIDA³ Studio needs access to your camera to enable avatar tracking and live streaming features.
          </p>

          {permissionState === 'denied' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Camera permission was denied. Please allow camera access to continue.
              </AlertDescription>
            </Alert>
          )}

          {permissionState === 'error' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Unable to access camera. Please check if your camera is connected and not being used by another application.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <Button 
              onClick={requestCameraPermission} 
              disabled={isRequesting}
              className="w-full"
            >
              {isRequesting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Requesting Access...
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-4 w-4" />
                  Allow Camera Access
                </>
              )}
            </Button>

            {permissionState === 'denied' && (
              <Button 
                variant="outline" 
                onClick={openBrowserSettings}
                className="w-full"
              >
                <Shield className="mr-2 h-4 w-4" />
                Browser Settings
              </Button>
            )}
          </div>

          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">Why do we need camera access?</h4>
            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Real-time avatar tracking and animation</li>
              <li>• Live video streaming to X.com</li>
              <li>• Face mesh detection for avatar overlay</li>
              <li>• Professional streaming studio features</li>
            </ul>
          </div>

          <div className="pt-2">
            <p className="text-xs text-gray-500 text-center">
              Your camera data is processed locally and only streamed when you choose to go live.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}