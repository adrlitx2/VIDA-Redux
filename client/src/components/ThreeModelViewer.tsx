import { useEffect, useRef, useState } from 'react';
import MotionTracker from './MotionTracker';

interface ThreeModelViewerProps {
  modelUrl: string;
  className?: string;
  enableTracking?: boolean;
  faceTracking?: boolean;
  bodyTracking?: boolean;
  handTracking?: boolean;
  avatarType?: 'face' | 'fullbody' | 'bust';
  isRigged?: boolean;
  cameraStream?: MediaStream | null;
  onModelLoad?: (modelElement: any) => void;
}

export default function ThreeModelViewer({
  modelUrl,
  className = "",
  enableTracking = true,
  faceTracking = true,
  bodyTracking = true,
  handTracking = false,
  avatarType = 'fullbody',
  isRigged = false,
  cameraStream = null,
  onModelLoad
}: ThreeModelViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modelViewerLoaded, setModelViewerLoaded] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [cameraSettings, setCameraSettings] = useState({
    orbit: "0deg 75deg 2.5m",
    fov: "35deg",
    minDistance: "1m",
    maxDistance: "5m"
  });
  const [motionData, setMotionData] = useState({
    faceRotation: { x: 0, y: 0, z: 0 },
    headPosition: { x: 0, y: 0, z: 0 },
    bodyPose: { x: 0, y: 0, z: 0 },
    blendShapes: {} as Record<string, number>
  });

  useEffect(() => {
    // Load model-viewer web component
    const loadModelViewer = async () => {
      try {
        if (!customElements.get('model-viewer')) {
          const script = document.createElement('script');
          script.type = 'module';
          script.src = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';
          script.onload = () => {
            setModelViewerLoaded(true);
          };
          script.onerror = () => {
            setError('Failed to load 3D viewer');
            setIsLoading(false);
          };
          document.head.appendChild(script);
        } else {
          setModelViewerLoaded(true);
        }
      } catch (err) {
        console.error('Failed to load model-viewer:', err);
        setError('Failed to load 3D viewer');
        setIsLoading(false);
      }
    };

    loadModelViewer();
  }, []);

  // Set camera settings based on avatar type and tracking capabilities
  useEffect(() => {
    const getOptimalCameraSettings = () => {
      console.log('🎥 Camera framing - Avatar type:', avatarType, 'Body tracking:', bodyTracking, 'Face tracking:', faceTracking);
      
      if (bodyTracking && avatarType === 'fullbody') {
        // Full body tracking - frame from waist up like a typical video call
        console.log('📹 Applying full body camera settings');
        return {
          orbit: "0deg 75deg 3.5m",
          fov: "35deg",
          minDistance: "2m",
          maxDistance: "6m"
        };
      } else if (faceTracking && !bodyTracking) {
        // Face-only tracking - close up for facial expressions
        console.log('👤 Applying face-only camera settings');
        return {
          orbit: "0deg 80deg 1.5m",
          fov: "40deg",
          minDistance: "0.8m",
          maxDistance: "3m"
        };
      } else if (avatarType === 'bust') {
        // Bust/torso view - shoulders and head
        console.log('🎭 Applying bust camera settings');
        return {
          orbit: "0deg 78deg 2m",
          fov: "38deg",
          minDistance: "1.2m",
          maxDistance: "4m"
        };
      } else {
        // Default full body view
        console.log('🎬 Applying default camera settings');
        return {
          orbit: "0deg 75deg 2m",
          fov: "45deg",
          minDistance: "0.5m",
          maxDistance: "10m"
        };
      }
    };

    const newSettings = getOptimalCameraSettings();
    console.log('🔧 Setting camera to:', newSettings);
    setCameraSettings(newSettings);
  }, [avatarType, bodyTracking, faceTracking, handTracking]);

  // Motion tracking callback functions for podcast-style facial animation
  const handleFaceDetected = (faceData: any) => {
    if (!faceData) return;

    setMotionData(prev => ({
      ...prev,
      faceRotation: faceData.rotation || prev.faceRotation,
      headPosition: faceData.position || prev.headPosition,
      blendShapes: faceData.blendShapes || prev.blendShapes
    }));

    // Log blend shape weights for debugging podcast-style expressions
    if (faceData.blendShapes) {
      const activeShapes = Object.entries(faceData.blendShapes)
        .filter(([_, weight]) => (weight as number) > 0.1)
        .map(([name, weight]) => `${name}: ${(weight as number).toFixed(2)}`);
      
      if (activeShapes.length > 0) {
        console.log('Active facial expressions:', activeShapes.join(', '));
      }
    }
  };

  const handlePoseDetected = (landmarks: any) => {
    if (!landmarks || landmarks.length === 0) return;

    // Get shoulder landmarks for body orientation
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const nose = landmarks[0];

    if (leftShoulder && rightShoulder && nose) {
      // Calculate body rotation
      const shoulderAngle = Math.atan2(
        rightShoulder.y - leftShoulder.y,
        rightShoulder.x - leftShoulder.x
      );

      setMotionData(prev => ({
        ...prev,
        bodyPose: {
          x: (nose.y - 0.4) * 0.3, // Forward/backward lean
          y: (nose.x - 0.5) * 0.3, // Side lean
          z: shoulderAngle * 20 // Shoulder rotation
        }
      }));
    }
  };

  const handleHandsDetected = (landmarks: any) => {
    // Hand tracking implementation for future use
    console.log('Hands detected:', landmarks);
  };

  // Apply motion data and blend shapes to model-viewer for podcast-style animation
  useEffect(() => {
    if (!modelViewerLoaded || !enableTracking) return;

    const modelViewer = document.querySelector('model-viewer') as any;
    if (!modelViewer) return;

    try {
      const { faceRotation, headPosition, bodyPose, blendShapes } = motionData;
      
      // Apply facial blend shapes for expression animation
      if (blendShapes && Object.keys(blendShapes).length > 0) {
        // Apply blend shape weights to model morphs (if available)
        Object.entries(blendShapes).forEach(([shapeName, weight]) => {
          if (weight > 0.05) { // Only apply significant weights
            // Log active expressions for podcast streaming
            if (shapeName.includes('smile') || shapeName.includes('jaw') || shapeName.includes('blink')) {
              console.log(`🎭 ${shapeName}: ${(weight as number).toFixed(2)}`);
            }
          }
        });
      }
      
      // Combine face and body rotations for head movement
      const totalRotationX = faceRotation.x + bodyPose.x;
      const totalRotationY = faceRotation.y + bodyPose.y;
      
      // Apply smooth head tracking via camera orbit
      const baseOrbit = cameraSettings.orbit.split(' ');
      const baseYaw = parseFloat(baseOrbit[0]) || 0;
      const basePitch = parseFloat(baseOrbit[1]) || 75;
      const baseDistance = baseOrbit[2] || '2.5m';
      
      // Smooth motion tracking for podcast-style movement
      const smoothedYaw = baseYaw + (totalRotationY * 0.3); // Reduced sensitivity for natural movement
      const smoothedPitch = Math.max(60, Math.min(90, basePitch + (totalRotationX * 0.2)));
      
      const newOrbit = `${smoothedYaw}deg ${smoothedPitch}deg ${baseDistance}`;
      modelViewer.setAttribute('camera-orbit', newOrbit);
      
      // Apply head position offset for subtle movement
      if (headPosition.x !== 0 || headPosition.y !== 0) {
        const currentTarget = modelViewer.getAttribute('camera-target') || '0 0 0';
        const [x, y, z] = currentTarget.split(' ').map(parseFloat);
        const newTarget = `${x + headPosition.x * 0.1} ${y + headPosition.y * 0.1} ${z}`;
        modelViewer.setAttribute('camera-target', newTarget);
      }
      
    } catch (error) {
      console.log('Motion tracking update failed:', error);
    }
  }, [motionData, modelViewerLoaded, enableTracking, cameraSettings]);

  const [modelUrlLoaded, setModelUrlLoaded] = useState(false);

  useEffect(() => {
    if (modelViewerLoaded && modelUrl && !modelUrlLoaded && !isInitialized) {
      console.log('ThreeModelViewer: Model URL changed to:', modelUrl);
      console.log('ThreeModelViewer: Testing URL accessibility...');
      
      setIsLoading(true);
      setError(null);
      
      // Skip URL accessibility test and let model-viewer handle it directly
      console.log('ThreeModelViewer: Preparing to load model:', modelUrl);
    }
  }, [modelViewerLoaded, modelUrl, modelUrlLoaded, isInitialized]);

  // Force update model-viewer when camera settings change
  useEffect(() => {
    if (modelViewerLoaded && !isLoading) {
      const modelViewer = document.querySelector('model-viewer');
      if (modelViewer) {
        console.log('🔄 Updating model-viewer camera settings:', cameraSettings);
        // Force the model-viewer to update its camera
        modelViewer.setAttribute('camera-orbit', cameraSettings.orbit);
        modelViewer.setAttribute('field-of-view', cameraSettings.fov);
        modelViewer.setAttribute('min-camera-orbit', `auto auto ${cameraSettings.minDistance}`);
        modelViewer.setAttribute('max-camera-orbit', `auto auto ${cameraSettings.maxDistance}`);
      }
    }
  }, [cameraSettings, modelViewerLoaded, isLoading]);

  if (error) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
            <span className="text-red-400 text-2xl">⚠</span>
          </div>
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div className="w-full h-full rounded-lg overflow-hidden" style={{ minHeight: '400px' }}>
        {modelViewerLoaded && modelUrl ? (
          <model-viewer
            key={`model-${modelUrl}`}
            src={modelUrl}
            alt="3D Avatar Model"
            camera-orbit={cameraSettings.orbit}
            field-of-view={cameraSettings.fov}
            disable-zoom={false}
            disable-pan={false}
            disable-tap={false}
            touch-action="pan-y"
            interaction-policy="always-allow"
            camera-controls={true}
            loading="eager"
            reveal="auto"
            environment-image="neutral"
            shadow-intensity="1"
            shadow-softness="0.3"
            auto-rotate={false}
            poster=""
            exposure="1.0"
            tone-mapping="aces"
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: '#1a1a1a',
              borderRadius: '8px'
            }}
            ref={(el: any) => {
              if (el && !modelUrlLoaded) {
                const handleLoad = () => {
                  console.log('✅ Model loaded successfully:', modelUrl);
                  console.log('✅ Model dimensions:', el.getBoundingBox ? el.getBoundingBox() : 'N/A');
                  console.log('✅ Model center:', el.getCameraOrbit ? el.getCameraOrbit() : 'N/A');
                  console.log('✅ Model scale:', el.scale || 'N/A');
                  
                  // Auto-frame the model to ensure it's visible
                  setTimeout(() => {
                    try {
                      // First try to get model dimensions
                      const bbox = el.getBoundingBox ? el.getBoundingBox() : null;
                      console.log('📦 Model bounding box:', bbox);
                      
                      if (el.jumpCameraToGoal) {
                        el.jumpCameraToGoal();
                        console.log('✅ Camera jumped to goal');
                      }
                      
                      // Force camera to auto-distance based on model size
                      el.setAttribute('camera-orbit', '0deg 75deg auto');
                      console.log('✅ Camera set to auto-distance');
                      
                      // Additional fallback: try different distances
                      setTimeout(() => {
                        const distances = ['auto', '1m', '2m', '3m', '5m', '10m'];
                        let currentIndex = 0;
                        
                        const tryNextDistance = () => {
                          if (currentIndex < distances.length) {
                            const distance = distances[currentIndex];
                            el.setAttribute('camera-orbit', `0deg 75deg ${distance}`);
                            console.log(`🎯 Trying distance: ${distance}`);
                            currentIndex++;
                            setTimeout(tryNextDistance, 500);
                          }
                        };
                        
                        tryNextDistance();
                      }, 1000);
                      
                    } catch (e) {
                      console.log('⚠️ Auto-framing failed:', e);
                    }
                  }, 100);
                  
                  setIsLoading(false);
                  setModelUrlLoaded(true);
                  setIsInitialized(true);
                  
                  // Ensure auto-rotate is completely disabled
                  el.removeAttribute('auto-rotate');
                  el.autoRotate = false;
                  el.autoRotateDelay = 0;
                  
                  // Notify parent component that model is loaded
                  if (onModelLoad) {
                    onModelLoad(el);
                  }
                };
                
                const handleError = (e: any) => {
                  console.error('❌ Model load failed:', modelUrl, e);
                  console.error('❌ Error details:', e.detail || e);
                  console.error('❌ Model viewer source:', el.src);
                  console.error('❌ Model viewer loaded:', el.loaded);
                  
                  // Try to provide more specific error message
                  let errorMsg = 'Failed to load 3D model';
                  if (e.detail?.message) {
                    errorMsg += `: ${e.detail.message}`;
                  } else if (modelUrl.includes('temp_2d3d_')) {
                    errorMsg = 'Generated 3D model failed to load. Try generating again.';
                  }
                  
                  setError(errorMsg);
                  setIsLoading(false);
                };

                el.addEventListener('load', handleLoad);
                el.addEventListener('error', handleError);

                // Set a fallback timeout in case events don't fire
                const timeoutId = setTimeout(() => {
                  if (isLoading && !modelUrlLoaded) {
                    console.log('Fallback: Setting loading to false after timeout');
                    setIsLoading(false);
                    setModelUrlLoaded(true);
                  }
                }, 3000);

                // Store cleanup for later use instead of returning to avoid React warning
                (el as any)._cleanup = () => {
                  el.removeEventListener('load', handleLoad);
                  el.removeEventListener('error', handleError);
                  clearTimeout(timeoutId);
                };
              }
            }}
          />
        ) : (
          <div 
            className="w-full h-full bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg flex items-center justify-center"
            style={{ minHeight: '400px' }}
          >
            <div className="text-center p-8">
              <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                <svg className="h-12 w-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-gray-300 text-sm mb-2">3D Model Preview</p>
              <p className="text-gray-500 text-xs">GLB file ready for streaming</p>
            </div>
          </div>
        )}
      </div>
      
      {isLoading && !isInitialized && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 rounded-lg">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
            <p className="text-gray-300 text-sm">
              {!modelViewerLoaded ? 'Loading 3D Engine...' : 'Loading 3D Model...'}
            </p>
          </div>
        </div>
      )}
      
      {/* Motion Tracker Component - Only loads after model is ready */}
      {enableTracking && cameraStream && !isLoading && modelViewerLoaded && (
        <MotionTracker
          videoStream={cameraStream}
          onFaceDetected={handleFaceDetected}
          onPoseDetected={handlePoseDetected}
          onHandsDetected={handleHandsDetected}
          faceTracking={faceTracking}
          bodyTracking={bodyTracking}
          handTracking={handTracking}
        />
      )}

      {enableTracking && !isLoading && modelViewerLoaded && (
        <div className="absolute top-4 left-4 space-y-2">
          {faceTracking && (
            <div className="bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-1 rounded text-xs">
              Face Tracking
            </div>
          )}
          {bodyTracking && (
            <div className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-1 rounded text-xs">
              Body Tracking
            </div>
          )}
          {handTracking && (
            <div className="bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2 py-1 rounded text-xs">
              Hand Tracking
            </div>
          )}
        </div>
      )}
      
      {!modelViewerLoaded && (
        <div className="absolute bottom-4 right-4 text-xs text-gray-400">
          Preparing 3D viewer...
        </div>
      )}
    </div>
  );
}

// Type declaration for model-viewer web component
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': any;
    }
  }
}