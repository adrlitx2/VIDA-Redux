import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/ui/glass-card";
import Navbar from "@/components/Navbar";
import MobileNavbar from "@/components/MobileNavbar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  Edit3, 
  CheckCircle, 
  Eye, 
  Zap,
  User,
  Hand,
  Smile,
  Camera,
  CameraOff,
  Play,
  Square,
  Bone
} from "lucide-react";
import ThreeModelViewer from "@/components/ThreeModelViewer";
import AvatarAnimationController from "@/components/AvatarAnimationController";
import MotionTracker from "@/components/MotionTracker";
import VidaRigInterface from "@/components/VidaRigInterface";

export default function AvatarPreview() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [avatar, setAvatar] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [previewSettings, setPreviewSettings] = useState({
    faceTracking: true,
    bodyTracking: true,
    handTracking: false,
    eyeTracking: true
  });
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [motionData, setMotionData] = useState({
    faceRotation: { x: 0, y: 0, z: 0 },
    headPosition: { x: 0, y: 0, z: 0 },
    bodyPose: { x: 0, y: 0, z: 0 },
    blendShapes: {} as Record<string, number>,
    handPoses: { left: null as any, right: null as any },
    shoulderRotation: { x: 0, y: 0, z: 0 },
    neckRotation: { x: 0, y: 0, z: 0 }
  });
  const [riggedModelUrl, setRiggedModelUrl] = useState<string | null>(null);
  const [isAutoRigged, setIsAutoRigged] = useState(false);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 1280, 
          height: 720,
          facingMode: 'user'
        }, 
        audio: false 
      });
      setCameraStream(stream);
      setCameraActive(true);
      toast({
        title: "Camera Connected",
        description: "Avatar tracking is now active"
      });
    } catch (error) {
      console.error('Camera access error:', error);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
    toast({
      title: "Camera Disconnected",
      description: "Avatar tracking stopped"
    });
  };

  const handleRigComplete = (result: any) => {
    console.log('🦴 Auto-rigging response received:', result);
    
    // Check if the response indicates success
    if (result.success) {
      const rigResult = result.result || result;
      console.log('🦴 Auto-rigging completed successfully:', rigResult);
      
      // Set rigged model URL if provided
      if (rigResult.riggedModelUrl) {
        setRiggedModelUrl(rigResult.riggedModelUrl);
      }
      setIsAutoRigged(true);
      
      // Update avatar state to reflect rigged status
      if (avatar) {
        setAvatar({
          ...avatar,
          isRigged: true,
          riggedModelUrl: rigResult.riggedModelUrl || null,
          animations: rigResult.animations || [],
          blendShapes: rigResult.blendShapes || rigResult.morphTargets || []
        });
      }
      
      toast({
        title: "Auto-Rigging Complete",
        description: `Model rigged with ${rigResult.boneCount || 20} bones for motion tracking`
      });
      
      // Refresh avatar data to get updated information
      const avatarId = avatar?.id;
      if (avatarId) {
        fetchAvatarData(avatarId.toString());
      }
    } else {
      console.log('❌ Auto-rigging failed:', result);
      toast({
        title: "Auto-Rigging Failed",
        description: result.error || result.message || "Unable to complete auto-rigging process",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  useEffect(() => {
    // Extract avatar ID from URL path (/avatar-preview/14)
    const path = window.location.pathname;
    const pathSegments = path.split('/');
    const avatarIdFromPath = pathSegments[pathSegments.length - 1];
    
    // Also check for query parameters as fallback
    const urlParams = new URLSearchParams(window.location.search);
    const sessionIdParam = urlParams.get('sessionId');
    const avatarIdParam = urlParams.get('avatarId');
    
    console.log('Avatar Preview - URL parsing:', {
      path,
      pathSegments,
      avatarIdFromPath,
      parsedNumber: Number(avatarIdFromPath),
      isValidNumber: !isNaN(Number(avatarIdFromPath)) && avatarIdFromPath !== '',
      sessionIdParam,
      avatarIdParam
    });
    
    if (sessionIdParam) {
      console.log('Using session ID:', sessionIdParam);
      setSessionId(sessionIdParam);
      fetchSessionData(sessionIdParam);
    } else if (avatarIdParam) {
      console.log('Using avatar ID from query param:', avatarIdParam);
      fetchAvatarData(avatarIdParam);
    } else if (avatarIdFromPath && avatarIdFromPath !== '' && !isNaN(Number(avatarIdFromPath)) && Number(avatarIdFromPath) > 0) {
      console.log('Using avatar ID from URL path:', avatarIdFromPath);
      fetchAvatarData(avatarIdFromPath);
    } else {
      console.log('No valid avatar ID found, redirecting to avatars page');
      setLocation('/avatars');
    }
  }, []);

  const fetchSessionData = async (sessionId: string) => {
    try {
      const sessionData = await apiRequest("GET", `/api/avatar-studio/${sessionId}`);
      console.log('📋 Avatar session data:', sessionData);
      console.log('🎭 Avatar object:', sessionData.avatar);
      setAvatar(sessionData.avatar);
      setSessionId(sessionId);
    } catch (error) {
      console.error("Error fetching session data:", error);
      toast({
        title: "Error",
        description: "Failed to load avatar session",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvatarData = async (avatarId: string) => {
    try {
      console.log('🔍 Fetching avatar data for ID:', avatarId, 'Type:', typeof avatarId);
      console.log('🌐 Making API request to:', `/api/avatars/${avatarId}`);
      
      const avatarData = await apiRequest("GET", `/api/avatars/${avatarId}`);
      console.log('✅ Avatar data received:', avatarData);
      
      if (avatarData) {
        console.log('🎭 Setting avatar data:', {
          id: avatarData.id,
          name: avatarData.name,
          modelUrl: avatarData.modelUrl,
          fileUrl: avatarData.fileUrl,
          supabaseUrl: avatarData.supabaseUrl,
          previewUrl: avatarData.previewUrl
        });
        setAvatar(avatarData);
      } else {
        console.log('❌ No avatar data received');
        toast({
          title: "Avatar Not Found",
          description: "The requested avatar could not be found",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("❌ Error fetching avatar data:", error);
      toast({
        title: "Error",
        description: `Failed to load avatar data: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseAvatar = async () => {
    if (!avatar) return;
    
    try {
      // Mark avatar as ready to use and update tracking settings
      await apiRequest("PATCH", `/api/avatars/${avatar.id}/finalize`, {
        trackingSettings: previewSettings,
        status: 'ready'
      });
      
      toast({
        title: "Avatar Ready",
        description: "Your avatar is now ready for streaming!",
      });
      
      setLocation('/stream');
    } catch (error) {
      console.error("Error finalizing avatar:", error);
      toast({
        title: "Error",
        description: "Failed to finalize avatar",
        variant: "destructive"
      });
    }
  };

  const handleEditMore = () => {
    if (sessionId) {
      setLocation(`/avatar-studio?sessionId=${sessionId}`);
    } else if (avatar?.id) {
      setLocation(`/avatar-studio?avatarId=${avatar.id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading avatar preview...</p>
        </div>
      </div>
    );
  }

  if (!avatar) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Avatar not found</p>
          <Button onClick={() => setLocation('/avatars')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Avatars
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <MobileNavbar />

      <div className="container mx-auto px-4 py-20 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              onClick={() => setLocation('/avatars')}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Avatars
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Avatar Preview</h1>
              <p className="text-gray-400">Review your auto-rigged avatar and tracking settings</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Avatar Preview */}
            <GlassCard className="p-6">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  3D Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                <div className="aspect-square bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg mb-4 relative overflow-hidden">
                  {(avatar?.modelUrl || avatar?.fileUrl || avatar?.supabaseUrl || avatar?.model_url || avatar?.file_url || avatar?.supabase_url) ? (
                    <>
                      <AvatarAnimationController
                        modelUrl={riggedModelUrl || avatar.modelUrl || avatar.fileUrl || avatar.supabaseUrl || avatar.model_url || avatar.file_url || avatar.supabase_url}
                        motionData={motionData}
                        className="w-full h-full"
                      />
                      {isAutoRigged && (
                        <div className="absolute top-2 right-2">
                          <Badge variant="default" className="bg-green-600">
                            <Bone className="h-3 w-3 mr-1" />
                            Auto-Rigged
                          </Badge>
                        </div>
                      )}
                      {cameraActive && cameraStream && (
                        <MotionTracker
                          videoStream={cameraStream}
                          faceTracking={previewSettings.faceTracking}
                          bodyTracking={previewSettings.bodyTracking}
                          handTracking={previewSettings.handTracking}
                          onFaceDetected={(faceData) => {
                            if (faceData) {
                              setMotionData(prev => ({
                                ...prev,
                                faceRotation: faceData.rotation || prev.faceRotation,
                                headPosition: faceData.position || prev.headPosition,
                                blendShapes: faceData.blendShapes || prev.blendShapes
                              }));
                            }
                          }}
                          onPoseDetected={(poseData) => {
                            if (poseData && poseData.length > 0) {
                              // Extract key body landmarks for comprehensive tracking
                              const nose = poseData[0];
                              const leftShoulder = poseData[11];
                              const rightShoulder = poseData[12];
                              const leftElbow = poseData[13];
                              const rightElbow = poseData[14];
                              const leftWrist = poseData[15];
                              const rightWrist = poseData[16];
                              const leftHip = poseData[23];
                              const rightHip = poseData[24];

                              if (leftShoulder && rightShoulder && nose) {
                                // Calculate shoulder rotation and body pose
                                const shoulderAngle = Math.atan2(
                                  rightShoulder.y - leftShoulder.y,
                                  rightShoulder.x - leftShoulder.x
                                );

                                // Calculate neck/head position relative to shoulders
                                const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2;
                                const shoulderCenterY = (leftShoulder.y + rightShoulder.y) / 2;
                                const neckRotationX = (nose.y - shoulderCenterY) * 100;
                                const neckRotationY = (nose.x - shoulderCenterX) * 100;

                                // Calculate torso lean from hip-shoulder alignment
                                let torsoLean = { x: 0, y: 0, z: 0 };
                                if (leftHip && rightHip) {
                                  const hipCenterX = (leftHip.x + rightHip.x) / 2;
                                  const hipCenterY = (leftHip.y + rightHip.y) / 2;
                                  torsoLean = {
                                    x: (shoulderCenterY - hipCenterY - 0.3) * 50,
                                    y: (shoulderCenterX - hipCenterX) * 50,
                                    z: shoulderAngle * 20
                                  };
                                }

                                setMotionData(prev => ({
                                  ...prev,
                                  bodyPose: torsoLean,
                                  shoulderRotation: {
                                    x: 0,
                                    y: 0,
                                    z: shoulderAngle * 15
                                  },
                                  neckRotation: {
                                    x: Math.max(-30, Math.min(30, neckRotationX)),
                                    y: Math.max(-45, Math.min(45, neckRotationY)),
                                    z: 0
                                  }
                                }));
                              }
                            }
                          }}
                          onHandsDetected={(handData) => {
                            if (handData && handData.length > 0) {
                              const leftHand = handData.find((hand: any, index: number) => index === 0);
                              const rightHand = handData.find((hand: any, index: number) => index === 1);
                              
                              setMotionData(prev => ({
                                ...prev,
                                handPoses: {
                                  left: leftHand ? {
                                    x: leftHand[8]?.x || 0,
                                    y: leftHand[8]?.y || 0,
                                    z: leftHand[8]?.z || 0
                                  } : null,
                                  right: rightHand ? {
                                    x: rightHand[8]?.x || 0,
                                    y: rightHand[8]?.y || 0,
                                    z: rightHand[8]?.z || 0
                                  } : null
                                }
                              }));
                            }
                          }}
                        />
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full text-center">
                      <div>
                        <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                          <User className="h-12 w-12 text-primary" />
                        </div>
                        <p className="text-sm text-gray-400">No 3D Model Available</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Avatar Info */}
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold">{avatar.name}</h3>
                    <p className="text-sm text-gray-400">
                      {avatar.vertices?.toLocaleString()} vertices • {avatar.fileSize ? Math.round(avatar.fileSize / 1024 / 1024) : 0}MB
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                      <Zap className="h-3 w-3 mr-1" />
                      Auto-Rigged
                    </Badge>
                    <Badge variant="secondary">
                      Ready for Streaming
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </GlassCard>

            {/* Settings & Actions */}
            <div className="space-y-6">
              {/* Tracking Settings */}
              <GlassCard className="p-6">
                <CardHeader className="px-0 pt-0">
                  <CardTitle>Tracking Settings</CardTitle>
                  <p className="text-sm text-gray-400">
                    Configure motion tracking for your avatar
                  </p>
                </CardHeader>
                <CardContent className="px-0">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="face-tracking" className="text-sm font-medium">
                        Face Tracking
                      </Label>
                      <Switch
                        id="face-tracking"
                        checked={previewSettings.faceTracking}
                        onCheckedChange={(checked) => 
                          setPreviewSettings(prev => ({ ...prev, faceTracking: checked }))
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="body-tracking" className="text-sm font-medium">
                        Body Tracking
                      </Label>
                      <Switch
                        id="body-tracking"
                        checked={previewSettings.bodyTracking}
                        onCheckedChange={(checked) => 
                          setPreviewSettings(prev => ({ ...prev, bodyTracking: checked }))
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="hand-tracking" className="text-sm font-medium">
                        Hand Tracking
                      </Label>
                      <Switch
                        id="hand-tracking"
                        checked={previewSettings.handTracking}
                        onCheckedChange={(checked) => 
                          setPreviewSettings(prev => ({ ...prev, handTracking: checked }))
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="eye-tracking" className="text-sm font-medium">
                        Eye Tracking
                      </Label>
                      <Switch
                        id="eye-tracking"
                        checked={previewSettings.eyeTracking}
                        onCheckedChange={(checked) => 
                          setPreviewSettings(prev => ({ ...prev, eyeTracking: checked }))
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </GlassCard>

              {/* Camera Controls */}
              <GlassCard className="p-6">
                <CardHeader className="px-0 pt-0">
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Camera Tracking
                  </CardTitle>
                  <p className="text-sm text-gray-400">
                    Connect your camera to test real-time avatar tracking
                  </p>
                </CardHeader>
                <CardContent className="px-0">
                  <div className="space-y-4">
                    {/* Camera Control Button */}
                    <div className="space-y-3">
                      {!cameraActive ? (
                        <Button 
                          onClick={startCamera}
                          size="lg" 
                          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-500/90 hover:to-purple-600/90"
                        >
                          <Play className="h-5 w-5 mr-2" />
                          Start Camera Tracking
                        </Button>
                      ) : (
                        <Button 
                          onClick={stopCamera}
                          variant="destructive"
                          size="lg" 
                          className="w-full"
                        >
                          <Square className="h-5 w-5 mr-2" />
                          Stop Camera Tracking
                        </Button>
                      )}
                    </div>

                    {/* Camera Preview */}
                    {cameraActive && cameraStream && (
                      <div className="bg-black rounded-lg overflow-hidden">
                        <video
                          ref={(video) => {
                            if (video && cameraStream) {
                              video.srcObject = cameraStream;
                            }
                          }}
                          autoPlay
                          muted
                          playsInline
                          className="w-full h-32 object-cover"
                        />
                        <div className="p-2 bg-green-500/20 border-t border-green-500/30">
                          <p className="text-xs text-green-400 flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            Camera tracking active - Move your face to test
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Tracking Status */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className={`p-2 rounded text-center ${previewSettings.faceTracking && cameraActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                        Face: {previewSettings.faceTracking && cameraActive ? 'Active' : 'Off'}
                      </div>
                      <div className={`p-2 rounded text-center ${previewSettings.bodyTracking && cameraActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                        Body: {previewSettings.bodyTracking && cameraActive ? 'Active' : 'Off'}
                      </div>
                      <div className={`p-2 rounded text-center ${previewSettings.handTracking && cameraActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                        Hands: {previewSettings.handTracking && cameraActive ? 'Active' : 'Off'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </GlassCard>

              {/* VidaRig Auto-Rigging */}
              {avatar?.id && (
                <VidaRigInterface
                  avatarId={avatar.id}
                  onRigComplete={handleRigComplete}
                  disabled={isAutoRigged}
                />
              )}

              {/* Action Buttons */}
              <div className="space-y-4">
                <Button 
                  onClick={handleUseAvatar}
                  size="lg" 
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-500/90 hover:to-emerald-600/90"
                >
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Use This Avatar
                </Button>
                
                <Button 
                  onClick={handleEditMore}
                  variant="outline" 
                  size="lg" 
                  className="w-full"
                >
                  <Edit3 className="h-5 w-5 mr-2" />
                  Edit Further in Studio
                </Button>
              </div>

              {/* Tips */}
              <Card className="bg-blue-500/10 border-blue-500/20">
                <CardContent className="p-4">
                  <h4 className="font-medium text-blue-400 mb-2">Auto-Rigging Complete!</h4>
                  <p className="text-sm text-blue-300">
                    Your avatar has been automatically rigged with motion tracking. 
                    You can use it now or continue editing in the Avatar Studio for fine-tuning.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}