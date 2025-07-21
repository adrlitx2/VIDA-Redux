import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/use-subscription";
import { useAuth } from "@/hooks/use-auth";
import VidaRigInterface from "./VidaRigInterface";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { 
  X, 
  Eye, 
  Settings, 
  Bone, 
  Wand2, 
  User, 
  CheckCircle, 
  Sparkles,
  Save,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Camera,
  CameraOff,
  Edit3
} from "lucide-react";
import { AvatarAnimationController } from "./AvatarAnimationController";
import ThreeModelViewer from "@/components/ThreeModelViewer";

interface AvatarPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  avatarId: number | null;
  sessionId?: string | null;
  tempAvatarData?: any;
  onUseAvatar?: () => void;
  onEditMore?: () => void;
}

interface PreviewSettings {
  faceTracking: boolean;
  bodyTracking: boolean;
  eyeTracking: boolean;
}

export function AvatarPreviewModal({ isOpen, onClose, avatarId, sessionId, tempAvatarData, onUseAvatar, onEditMore }: AvatarPreviewModalProps) {
  const { toast } = useToast();
  const { currentPlan } = useSubscription();
  const { user } = useAuth();
  const hasRiggingStudioAccess = currentPlan?.riggingStudioAccess || false;
  
  const [avatar, setAvatar] = useState<any>(null);
  const [originalAvatar, setOriginalAvatar] = useState<any>(null);
  const [riggedAvatar, setRiggedAvatar] = useState<any>(null);
  const [currentDisplayModel, setCurrentDisplayModel] = useState<string>('original');
  const [renderAttempts, setRenderAttempts] = useState(0);
  const [loading, setLoading] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [previewSettings, setPreviewSettings] = useState<PreviewSettings>({
    faceTracking: true,
    bodyTracking: true,
    eyeTracking: true,
  });
  
  // Auto-rigging state
  const [riggingStatus, setRiggingStatus] = useState<'idle' | 'processing' | 'complete'>('idle');
  const [riggingProgress, setRiggingProgress] = useState(0);
  const [riggingSessionId, setRiggingSessionId] = useState<string | null>(null);
  const [riggedModelUrl, setRiggedModelUrl] = useState<string | null>(null);
  const [isAutoRigged, setIsAutoRigged] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarName, setAvatarName] = useState('');
  const [savingProgress, setSavingProgress] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [autoFramed, setAutoFramed] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);

  useEffect(() => {
    if (isOpen && avatarId) {
      if (tempAvatarData) {
        console.log('Using temporary avatar data:', tempAvatarData);
        setAvatar(tempAvatarData);
        setAvatarName(tempAvatarData.name || '');
        setOriginalAvatar(tempAvatarData);
        setLoading(false);
        setRiggingStatus('idle');
      } else {
        fetchAvatar();
      }
    }
  }, [isOpen, avatarId, tempAvatarData]);

  const fetchAvatar = async () => {
    if (!avatarId) return;
    
    setLoading(true);
    try {
      const response = await apiRequest("GET", `/api/avatars/${avatarId}`);
      if (response) {
        console.log('Fetched avatar data:', response);
        setAvatar(response);
        setOriginalAvatar(response);
        setAvatarName(response.name || '');
      }
    } catch (error) {
      console.error('Error fetching avatar:', error);
      toast({
        title: "Error",
        description: "Failed to load avatar",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const revertToOriginal = () => {
    if (originalAvatar) {
      console.log('Switching to original model:', originalAvatar.modelUrl || originalAvatar.fileUrl);
      setCurrentDisplayModel('original');
      setAvatar(originalAvatar);
      setIsAutoRigged(false);
      setRiggingStatus('idle');
      setRiggingProgress(0);
    }
  };

  const switchToRigged = () => {
    if (riggedAvatar) {
      console.log('Switching to rigged model:', riggedModelUrl);
      setCurrentDisplayModel('rigged');
      setAvatar(riggedAvatar);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: false 
      });
      setCameraStream(stream);
      setCameraActive(true);
      toast({
        title: "Camera activated",
        description: "Real-time tracking enabled",
      });
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera error",
        description: "Failed to access camera",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
  };

  const handleSaveAvatar = async () => {
    if (!avatar || !avatarName.trim()) return;

    setIsSaving(true);
    setSavingProgress(0);

    try {
      const isTemporaryAvatar = avatar.metadata?.isTemporary === true;
      
      let result;
      if (isTemporaryAvatar) {
        console.log('Saving temporary avatar to database:', avatarName.trim());
        result = await apiRequest("POST", "/api/avatars/save-temp", {
          tempAvatarData: avatar,
          name: avatarName.trim()
        });
      } else {
        const saveData = {
          avatarId: avatar.id,
          sessionId: riggingSessionId || sessionId,
          updateRigging: isAutoRigged,
          name: avatarName.trim(),
          useCurrentModel: currentDisplayModel === 'rigged'
        };

        console.log('Saving existing avatar with data:', saveData);
        result = await apiRequest("POST", "/api/avatars/save", saveData);
      }
      
      if (result.success) {
        setSavingProgress(100);
        
        toast({
          title: "Avatar saved successfully",
          description: `${avatarName} has been added to your collection`,
        });

        onClose();
        
        if (window.location.pathname === '/avatars') {
          window.location.reload();
        } else {
          window.location.href = '/avatars';
        }
      } else if (result.needsUpgrade) {
        toast({
          title: "Subscription Limit Reached",
          description: `${result.message}`,
          variant: "destructive",
        });
      } else {
        throw new Error(result.message || 'Save failed');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
      setSavingProgress(0);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-glass backdrop-blur-xl border border-border/50 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden"
        >
          <div className="p-6 border-b border-border/50 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Avatar Preview</h2>
              <p className="text-muted-foreground">Preview and customize your avatar</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading avatar...</p>
              </div>
            </div>
          ) : avatar ? (
            <div className="p-6 space-y-6 max-h-[calc(90vh-120px)] overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Avatar Preview Column */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Avatar Preview */}
                  <GlassCard className="p-6">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Eye className="h-5 w-5 text-primary" />
                        Avatar Preview
                      </h3>
                    </div>
                    <div className="aspect-square bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg mb-4 relative overflow-hidden">
                      {(avatar?.modelUrl || avatar?.fileUrl || avatar?.supabaseUrl) ? (
                        <>
                          <ThreeModelViewer
                            key={`${avatar.id}-${currentDisplayModel}-${Date.now()}`}
                            modelUrl={(() => {
                              if (currentDisplayModel === 'rigged' && riggedModelUrl) {
                                console.log('Displaying rigged model:', riggedModelUrl);
                                return riggedModelUrl;
                              }
                              const originalUrl = avatar.modelUrl || avatar.fileUrl || avatar.supabaseUrl;
                              console.log('AvatarPreviewModal: Displaying original model:', originalUrl);
                              console.log('Avatar object:', avatar);
                              return originalUrl;
                            })()}
                            className="w-full h-full"
                            enableTracking={cameraActive}
                            isRigged={currentDisplayModel === 'rigged'}
                            cameraStream={cameraStream}
                          />
                          
                          {/* Model Version Controls */}
                          <div className="absolute top-2 left-2 flex flex-col gap-2">
                            {riggedAvatar && (
                              <div className="flex flex-col gap-1 bg-black/70 rounded-lg p-2">
                                <Button
                                  size="sm"
                                  variant={currentDisplayModel === 'original' ? 'default' : 'secondary'}
                                  className="h-8 text-xs px-2"
                                  onClick={revertToOriginal}
                                  disabled={!originalAvatar}
                                >
                                  Original
                                </Button>
                                <Button
                                  size="sm"
                                  variant={currentDisplayModel === 'rigged' ? 'default' : 'secondary'}
                                  className="h-8 text-xs px-2"
                                  onClick={switchToRigged}
                                  disabled={!riggedAvatar}
                                >
                                  Rigged
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Camera Controls */}
                          <div className="absolute top-2 right-2">
                            <Button
                              size="sm"
                              variant={cameraActive ? 'default' : 'secondary'}
                              onClick={cameraActive ? stopCamera : startCamera}
                            >
                              {cameraActive ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-muted-foreground">No model available</p>
                        </div>
                      )}
                    </div>
                  </GlassCard>

                  {/* VidaRig Auto-Rigging Interface */}
                  {avatar && (
                    <VidaRigInterface
                      avatarId={avatar.id}
                      onRigComplete={(result) => {
                        console.log('Auto-rigging completed:', result);
                        setRiggedAvatar(result);
                        setRiggedModelUrl(result.riggedModelUrl);
                        setCurrentDisplayModel('rigged');
                        setIsAutoRigged(true);
                        setRiggingStatus('complete');
                      }}
                    />
                  )}
                </div>

                {/* Controls Column */}
                <div className="space-y-6">
                  {/* Avatar Information */}
                  <GlassCard className="p-6">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <User className="h-5 w-5 text-primary" />
                        Avatar Information
                      </h3>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="avatar-name">Avatar Name</Label>
                        <input
                          id="avatar-name"
                          type="text"
                          value={avatarName}
                          onChange={(e) => setAvatarName(e.target.value)}
                          className="w-full mt-1 px-3 py-2 bg-background/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Enter avatar name..."
                          maxLength={50}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {avatarName.length}/50 characters
                        </p>
                      </div>
                      
                      {avatar && (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">File Size:</span>
                            <span>{((avatar.fileSize || 0) / 1024 / 1024).toFixed(2)} MB</span>
                          </div>
                          {avatar.vertices && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Vertices:</span>
                              <span>{avatar.vertices?.toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Type:</span>
                            <span className="capitalize">{avatar.type?.replace('-', ' ')}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </GlassCard>

                  {/* Action Buttons */}
                  <GlassCard className="p-6">
                    <div className="space-y-3">
                      <Button 
                        onClick={handleSaveAvatar}
                        className="w-full"
                        disabled={isSaving || !avatarName.trim()}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {isSaving ? 'Saving...' : 'Save Avatar'}
                      </Button>
                      
                      {hasRiggingStudioAccess && (
                        <Button 
                          onClick={() => {}}
                          variant="outline" 
                          className="w-full"
                        >
                          <Edit3 className="h-4 w-4 mr-2" />
                          Refine in Studio
                        </Button>
                      )}
                    </div>
                  </GlassCard>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">Avatar not found</p>
                <Button onClick={onClose}>Close</Button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}