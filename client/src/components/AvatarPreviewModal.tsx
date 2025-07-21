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
  Edit3,
  Video,
  RefreshCw,
  Shuffle
} from "lucide-react";
import { AvatarAnimationController } from "./AvatarAnimationController";
import ThreeModelViewer from "@/components/ThreeModelViewer";
import FullBodyTracker from "@/components/FullBodyTracker";
import RiggedModelAnimator from "@/components/RiggedModelAnimator";
import ConsoleCapture from "@/components/ConsoleCapture";


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
  // Debug modal render
  console.log("🚀 MODAL: AvatarPreviewModal rendering! isOpen:", isOpen, "avatarId:", avatarId);
  
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
  const [fullBodyTrackingData, setFullBodyTrackingData] = useState<any>(null);
  const [modelViewerElement, setModelViewerElement] = useState<any>(null);
  
  // Regeneration state
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerationProgress, setRegenerationProgress] = useState(0);
  const [regenerationAttempts, setRegenerationAttempts] = useState(0);

  useEffect(() => {
    if (isOpen && avatarId) {
      // Use temporary avatar data if available, otherwise fetch from database
      if (tempAvatarData) {
        console.log('🔄 Using temporary avatar data:', tempAvatarData);
        setAvatar(tempAvatarData);
        setAvatarName(tempAvatarData.name || '');
        setLoading(false);
      } else {
        fetchAvatar();
      }
    }
  }, [isOpen, avatarId, tempAvatarData]);

  const fetchAvatar = async () => {
    if (!avatarId) return;
    
    setLoading(true);
    try {
      console.log('🔍 Fetching avatar with ID:', avatarId);
      const avatarData = await apiRequest("GET", `/api/avatars/${avatarId}`);
      
      // If fileSize is missing, fetch it from the model URL
      if (!avatarData.fileSize && avatarData.modelUrl) {
        try {
          const headResponse = await fetch(avatarData.modelUrl, { method: 'HEAD' });
          const contentLength = headResponse.headers.get('content-length');
          if (contentLength) {
            avatarData.fileSize = parseInt(contentLength);
            console.log('📏 Fetched original file size:', avatarData.fileSize, 'bytes');
          }
        } catch (error) {
          console.warn('⚠️ Could not fetch file size for original model:', error);
        }
      }
      
      console.log('✅ Avatar data received:', avatarData);
      setAvatar(avatarData);
      setOriginalAvatar(avatarData);
      setIsAutoRigged(avatarData.isRigged || false);
      setCurrentDisplayModel('original');
      setRenderAttempts(0);
      
      // Initialize avatar name with existing name or generate default
      setAvatarName(avatarData.name || `Avatar ${Date.now().toString().slice(-4)}`);
    } catch (error) {
      console.error('❌ Error fetching avatar:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Error",
        description: `Failed to load avatar: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const triggerAutoRigging = async () => {
    if (!avatar || rendering || renderAttempts >= 5) return;

    try {
      // Get actual user plan from Supabase metadata
      const userPlan = user?.supabaseUser?.user_metadata?.plan || user?.plan || currentPlan?.id || 'free';
      
      // Show direct progress overlay
      setRiggingStatus('processing');
      setRiggingProgress(0);
      
      // Create and show custom progress overlay
      const progressOverlay = document.createElement('div');
      progressOverlay.id = 'auto-rigging-overlay';
      progressOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(16, 24, 39, 0.85);
        backdrop-filter: blur(20px);
        z-index: 9999;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: hsl(210, 40%, 98%);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;
      
      progressOverlay.innerHTML = `
        <div style="text-align: center; max-width: 500px; padding: 2.5rem;">
          <div style="width: 120px; height: 120px; margin: 0 auto 2.5rem; position: relative;">
            <svg width="120" height="120" style="position: absolute; transform: rotate(-90deg);">
              <circle cx="60" cy="60" r="54" fill="none" stroke="hsl(217, 33%, 17%)" stroke-width="4"/>
              <circle id="progress-circle" cx="60" cy="60" r="54" fill="none" 
                      stroke="hsl(262, 83%, 76%)" stroke-width="4" stroke-linecap="round"
                      stroke-dasharray="339" stroke-dashoffset="339"
                      style="transition: stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1);
                             filter: drop-shadow(0 0 8px hsl(262, 83%, 76%, 0.4));"/>
            </svg>
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                        width: 48px; height: 48px; background: hsl(262, 83%, 76%);
                        border-radius: 50%; display: flex; align-items: center; justify-content: center;
                        box-shadow: 0 0 20px hsl(262, 83%, 76%, 0.3);">
              <div style="width: 20px; height: 20px; background: hsl(222, 47%, 11%); border-radius: 6px; position: relative;">
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                            width: 12px; height: 12px; background: hsl(262, 83%, 76%);
                            border-radius: 3px;"></div>
              </div>
            </div>
          </div>
          
          <h2 style="font-size: 2.25rem; font-weight: 700; margin-bottom: 0.75rem; letter-spacing: -0.025em;
                     color: hsl(262, 83%, 76%);">
            VidaRig Processing
          </h2>
          
          <p style="font-size: 1rem; margin-bottom: 2.5rem; color: hsl(215, 20%, 65%); font-weight: 500;">
            Advanced AI rigging for "${avatar.name || 'your avatar'}"
          </p>
          
          <div style="width: 100%; max-width: 320px; height: 8px; background: hsl(217, 33%, 17%); 
                      border-radius: 4px; margin: 0 auto 1.5rem; overflow: hidden;
                      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);">
            <div id="progress-bar" style="height: 100%; 
                 background: hsl(262, 83%, 76%); 
                 border-radius: 4px; width: 0%; transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                 box-shadow: 0 0 12px hsl(262, 83%, 76%, 0.4);"></div>
          </div>
          
          <div id="progress-text" style="font-size: 0.875rem; color: hsl(215, 20%, 65%); font-weight: 500; min-height: 22px;">
            Initializing neural networks...
          </div>
          
          <div style="margin-top: 2.5rem; padding: 1.25rem; 
                      background: hsl(217, 33%, 17%);
                      border-radius: 12px; border: 1px solid hsl(215, 27%, 17%);
                      backdrop-filter: blur(10px);">
            <div style="font-size: 0.875rem; color: hsl(210, 40%, 98%); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">
              ${userPlan === 'goat' ? 'GOAT TIER — 65 bones maximum + advanced morphs' : 
                userPlan === 'pro' ? 'PRO TIER — 35 bones + premium morphs' :
                userPlan === 'basic' ? 'BASIC TIER — 20 bones + standard morphs' :
                'FREE TIER — 15 bones + basic morphs'}
            </div>
          </div>
        </div>
        
        <style>
          @keyframes pulse-glow {
            0%, 100% { 
              filter: drop-shadow(0 0 8px hsl(262, 83%, 76%, 0.4));
            }
            50% { 
              filter: drop-shadow(0 0 16px hsl(262, 83%, 76%, 0.6));
            }
          }
          
          #progress-circle {
            animation: pulse-glow 2.5s ease-in-out infinite;
          }
        </style>
      `;
      
      document.body.appendChild(progressOverlay);
      
      // Animate progress through stages
      const stages = [
        { name: "Processing mesh topology", progress: 18, duration: 800 },
        { name: "Neural bone detection", progress: 35, duration: 700 },
        { name: "Constructing skeletal hierarchy", progress: 52, duration: 650 },
        { name: "Computing vertex weights", progress: 70, duration: 750 },
        { name: "Generating facial morphs", progress: 88, duration: 600 },
        { name: "Optimizing rig structure", progress: 100, duration: 500 }
      ];
      
      let currentStage = 0;
      const progressBar = progressOverlay.querySelector('#progress-bar');
      const progressCircle = progressOverlay.querySelector('#progress-circle');
      const progressText = progressOverlay.querySelector('#progress-text');
      const circumference = 339; // 2 * π * 54
      
      const animateStage = () => {
        if (currentStage < stages.length) {
          const stage = stages[currentStage];
          const progressPercent = stage.progress;
          const offset = circumference - (progressPercent / 100) * circumference;
          
          if (progressBar) (progressBar as HTMLElement).style.width = `${progressPercent}%`;
          if (progressCircle) (progressCircle as HTMLElement).style.strokeDashoffset = `${offset}`;
          if (progressText) (progressText as HTMLElement).textContent = stage.name;
          setRiggingProgress(progressPercent);
          
          setTimeout(() => {
            currentStage++;
            animateStage();
          }, stage.duration);
        }
      };
      
      // Start animation
      setTimeout(animateStage, 300);
      
      setRendering(true);
      setRiggingStatus('processing');
      setRiggingProgress(0);
      setRenderAttempts(prev => prev + 1);

      console.log('🔧 Starting auto-rigging API call for avatar:', avatar.id, 'with plan:', userPlan);
      
      const result = await apiRequest("POST", "/api/avatars/auto-rig", {
        avatarId: avatar.id,
        userPlan: userPlan
      });
      
      console.log('🔧 Auto-rigging API response:', result);
      
      if (result.success) {
        setRiggingSessionId(result.sessionId);
        
        // Show realistic progress stages during GLB processing
        const stages = [
          { name: "Analyzing mesh structure", progress: 20, duration: 800 },
          { name: "Generating skeleton", progress: 45, duration: 600 },
          { name: "Creating bone weights", progress: 70, duration: 700 },
          { name: "Adding morph targets", progress: 85, duration: 500 },
          { name: "Rendering rigged model", progress: 95, duration: 1500 },
          { name: "Loading preview", progress: 100, duration: 400 }
        ];
        
        let currentStage = 0;
        
        const processStage = () => {
          if (currentStage < stages.length) {
            const stage = stages[currentStage];
            setRiggingProgress(stage.progress);
            
            setTimeout(() => {
              if (stage.progress === 100) {
                // Complete the process
                setRiggingStatus('complete');
                setIsAutoRigged(true);
                
                // Apply rigged model data from backend
                if (result.sessionId) {
                  const previewUrl = `${window.location.origin}/api/avatars/rigged-preview/${result.sessionId}`;
                  console.log('🦴 Setting rigged model URL:', previewUrl);
                  setRiggedModelUrl(previewUrl);
                  
                  // Immediately set rigged avatar data with file sizes from auto-rigging response
                  const riggedAvatarData = {
                    ...avatar,
                    modelUrl: previewUrl,
                    fileUrl: previewUrl,
                    supabaseUrl: previewUrl,
                    isRigged: true,
                    boneCount: result.boneCount || 0,
                    morphTargets: result.morphTargets || 0,
                    fileSize: result.fileSize || 0, // Use file size from auto-rigging response
                    originalFileSize: result.originalFileSize || avatar.fileSize || 0,
                    vertices: result.metadata?.vertices || avatar.vertices || 0,
                    hasFaceRig: result.metadata?.faceRig || false,
                    hasBodyRig: result.metadata?.bodyRig || false,
                    hasHandRig: result.metadata?.handRig || false,
                    plan: result.metadata?.userPlan || currentPlan?.id
                  };
                  setRiggedAvatar(riggedAvatarData);
                  setCurrentDisplayModel('rigged');
                  console.log('🦴 Immediate rigged avatar data set:', {
                    fileSize: riggedAvatarData.fileSize,
                    originalFileSize: riggedAvatarData.originalFileSize,
                    boneCount: riggedAvatarData.boneCount,
                    morphTargets: riggedAvatarData.morphTargets
                  });
                  
                  // Fetch metadata for the rigged model with credentials and timeout
                  const controller = new AbortController();
                  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
                  
                  fetch(`${window.location.origin}/api/avatars/rigged-metadata/${result.sessionId}`, {
                    credentials: 'include',
                    headers: {
                      'Accept': 'application/json'
                    },
                    signal: controller.signal
                  })
                    .then(response => {
                      clearTimeout(timeoutId);
                      console.log('📊 Metadata response status:', response.status);
                      if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                      }
                      return response.json();
                    })
                    .then(metadata => {
                      console.log('📊 Fetched rigged metadata:', metadata);
                      console.log('📊 Metadata values - bones:', metadata.bones, 'morphTargets:', metadata.morphTargets);
                      
                      const riggedAvatarData = { 
                        ...avatar, 
                        modelUrl: previewUrl, 
                        fileUrl: previewUrl,
                        supabaseUrl: previewUrl,
                        isRigged: true,
                        boneCount: metadata.bones || 0,
                        morphTargets: metadata.morphTargets || 0,
                        fileSize: metadata.fileSize || 0,
                        originalFileSize: metadata.originalFileSize || avatar.fileSize || 0,
                        vertices: metadata.vertices || 0,
                        hasFaceRig: metadata.hasFaceRig || false,
                        hasBodyRig: metadata.hasBodyRig || false,
                        hasHandRig: metadata.hasHandRig || false,
                        plan: metadata.plan || currentPlan?.id
                      };
                      setRiggedAvatar(riggedAvatarData);
                      setCurrentDisplayModel('rigged');
                      // Force update avatar to show rigged model immediately
                      setAvatar(riggedAvatarData);
                      // Reset render attempts on successful rigging
                      setRenderAttempts(0);
                      console.log('🦴 Rigged avatar data set with metadata:', {
                        boneCount: riggedAvatarData.boneCount,
                        morphTargets: riggedAvatarData.morphTargets,
                        fileSize: riggedAvatarData.fileSize
                      });
                    })
                    .catch(error => {
                      clearTimeout(timeoutId);
                      if (error.name === 'AbortError') {
                        console.error('❌ Metadata fetch timed out after 10 seconds');
                      } else {
                        console.error('❌ Failed to fetch rigged metadata:', error);
                      }
                      console.log('❌ Falling back to default rigged data without metadata');
                      // Fallback without metadata
                      const riggedAvatarData = { 
                        ...avatar, 
                        modelUrl: previewUrl, 
                        fileUrl: previewUrl,
                        supabaseUrl: previewUrl,
                        isRigged: true,
                        boneCount: 0,
                        morphTargets: 0
                      };
                      setRiggedAvatar(riggedAvatarData);
                      setCurrentDisplayModel('rigged');
                      setAvatar(riggedAvatarData);
                      console.log('🦴 Using fallback rigged data:', riggedAvatarData);
                    });

                }
                setRendering(false);
                // Remove progress overlay with success animation
                const overlay = document.getElementById('auto-rigging-overlay');
                if (overlay) {
                  // Show success state
                  const progressText = overlay.querySelector('#progress-text');
                  if (progressText) {
                    progressText.textContent = `✅ Auto-rigging complete! Generated ${result.boneCount || 19} bones and ${result.morphTargets || 40} morph targets`;
                  }
                  
                  // Fade out after showing success
                  setTimeout(() => {
                    overlay.style.opacity = '0';
                    overlay.style.transition = 'opacity 0.5s ease';
                    setTimeout(() => {
                      overlay.remove();
                    }, 500);
                  }, 1500);
                }
              } else {
                currentStage++;
                processStage();
              }
            }, stage.duration);
          }
        };
        
        processStage();

        toast({
          title: "Auto-rigging started",
          description: "Adding advanced bone structure to your avatar...",
        });
        
        console.log('🔧 Auto-rigging result received:', result);
        
        if (result.success && result.sessionId) {
          // Switch to rigged model immediately
          setCurrentDisplayModel('rigged');
          setRiggingSessionId(result.sessionId);
          setRiggingStatus('complete');
          setIsAutoRigged(true);
          
          toast({
            title: "Auto-rigging completed!",
            description: `Generated ${result.boneCount || 0} bones and ${result.morphTargets || 0} morph targets`,
          });
        }
      } else {
        throw new Error(result.message || 'Auto-rigging failed');
      }
    } catch (error) {
      console.error('Auto-rigging error:', error);
      setRiggingStatus('idle');
      setRiggingProgress(0);
      setRendering(false);
      // Remove progress overlay with error animation
      const overlay = document.getElementById('auto-rigging-overlay');
      if (overlay) {
        const progressText = overlay.querySelector('#progress-text');
        if (progressText) {
          (progressText as HTMLElement).textContent = `❌ Auto-rigging failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
        
        setTimeout(() => {
          overlay.style.opacity = '0';
          overlay.style.transition = 'opacity 0.5s ease';
          setTimeout(() => {
            overlay.remove();
          }, 500);
        }, 2000);
      }
      toast({
        title: "Auto-rigging failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const revertToOriginal = () => {
    if (originalAvatar) {
      console.log('🔄 Switching to original model:', originalAvatar.modelUrl || originalAvatar.fileUrl);
      setCurrentDisplayModel('original');
      setAvatar(originalAvatar);
      setIsAutoRigged(false);
      setRiggingStatus('idle');
      setRiggingProgress(0);
      
      // Force model-viewer to reload the original model
      const originalUrl = originalAvatar.modelUrl || originalAvatar.fileUrl || originalAvatar.supabaseUrl;
      setTimeout(() => {
        const modelViewer = document.querySelector('model-viewer') as any;
        if (modelViewer && originalUrl) {
          console.log('🔄 Force updating model-viewer src to original:', originalUrl);
          modelViewer.src = originalUrl;
          modelViewer.setAttribute('src', originalUrl);
        }
      }, 100);
      
      toast({
        title: "Reverted to original",
        description: "Avatar restored to uploaded version",
      });
    }
  };

  const switchToRigged = () => {
    if (riggedAvatar && riggedModelUrl) {
      console.log('🔄 Switching to rigged model:', riggedModelUrl);
      setCurrentDisplayModel('rigged');
      setAvatar(riggedAvatar);
      setIsAutoRigged(true);
      
      // Force model-viewer to reload the rigged model
      setTimeout(() => {
        const modelViewer = document.querySelector('model-viewer') as any;
        if (modelViewer) {
          console.log('🔄 Force updating model-viewer src to rigged:', riggedModelUrl);
          modelViewer.src = riggedModelUrl;
          modelViewer.setAttribute('src', riggedModelUrl);
        }
      }, 100);
    }
  };

  // Regeneration function for 2D-to-3D avatars
  const handleRegenerate = async () => {
    if (!avatar || !avatar.id) {
      toast({
        title: "Cannot regenerate",
        description: "Avatar data not found",
        variant: "destructive",
      });
      return;
    }

    // Check if this is a 2D-to-3D created avatar
    const is2DTo3D = avatar.id.toString().includes('meshy_') || 
                     avatar.modelUrl?.includes('meshy-processing') ||
                     avatar.source === '2d-to-3d' ||
                     avatar.createdFrom === 'image';

    if (!is2DTo3D) {
      toast({
        title: "Regeneration not available",
        description: "This feature is only available for 2D-to-3D created avatars",
        variant: "destructive",
      });
      return;
    }

    setIsRegenerating(true);
    setRegenerationProgress(0);
    setRegenerationAttempts(prev => prev + 1);

    // Create regeneration overlay
    const overlay = document.createElement('div');
    overlay.id = 'regeneration-overlay';
    overlay.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-[60]';
    overlay.innerHTML = `
      <div class="bg-glass backdrop-blur-xl border border-border/50 rounded-2xl p-8 max-w-md w-full mx-4">
        <div class="text-center space-y-6">
          <div class="w-16 h-16 mx-auto bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <svg class="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <div>
            <h3 class="text-xl font-semibold text-white mb-2">Regenerating Avatar</h3>
            <p class="text-muted-foreground mb-4" id="regen-status">Preparing regeneration...</p>
            <div class="w-full bg-secondary rounded-full h-2">
              <div id="regen-progress-bar" class="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
            </div>
            <div class="text-sm text-muted-foreground mt-2" id="regen-percentage">0%</div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    try {
      // Call regeneration API first to get response
      const response = await apiRequest("POST", `/api/avatars/${avatar.id}/regenerate`, {
        enableRegeneration: true,
        maxRegenerationAttempts: 3,
        forceTextureGeneration: true,
        userPlan: currentPlan?.id || 'free'
      });

      // Define completion function with response available
      const completeRegeneration = () => {
        if (response && response.success) {
          // Update avatar with new regenerated model
          const regeneratedAvatar = {
            ...avatar,
            modelUrl: response.glbPath || response.modelUrl,
            fileUrl: response.glbPath || response.modelUrl,
            thumbnailUrl: response.thumbnailPath || response.thumbnailUrl,
            fileSize: response.fileSize || avatar.fileSize,
            vertexCount: response.vertexCount,
            faceCount: response.faceCount,
            regenerationAttempts: regenerationAttempts + 1
          };
          
          setAvatar(regeneratedAvatar);
          setOriginalAvatar(regeneratedAvatar);
          
          // Remove overlay
          const overlay = document.getElementById('regeneration-overlay');
          if (overlay) {
            setTimeout(() => {
              overlay.style.opacity = '0';
              overlay.style.transition = 'opacity 0.5s ease';
              setTimeout(() => {
                overlay.remove();
              }, 500);
            }, 1000);
          }
          
          toast({
            title: "Regeneration Complete",
            description: `New variant created with ${response.vertexCount || 'enhanced'} vertices and improved textures`,
          });
        } else {
          throw new Error(response?.error || 'Regeneration failed');
        }
      };

      // Simulate regeneration progress
      const progressSteps = [
        { progress: 15, message: "Analyzing original image..." },
        { progress: 35, message: "Initializing Meshy AI regeneration..." },
        { progress: 55, message: "Generating new 3D variant..." },
        { progress: 75, message: "Processing enhanced textures..." },
        { progress: 90, message: "Optimizing mesh quality..." },
        { progress: 100, message: "Complete!" }
      ];

      let currentStep = 0;
      const updateProgress = () => {
        if (currentStep < progressSteps.length) {
          const step = progressSteps[currentStep];
          setRegenerationProgress(step.progress);
          
          const progressBar = document.getElementById('regen-progress-bar');
          const statusText = document.getElementById('regen-status');
          const percentageText = document.getElementById('regen-percentage');
          
          if (progressBar) progressBar.style.width = `${step.progress}%`;
          if (statusText) statusText.textContent = step.message;
          if (percentageText) percentageText.textContent = `${step.progress}%`;
          
          currentStep++;
          setTimeout(updateProgress, 1500);
        } else {
          // Complete regeneration after progress finishes
          completeRegeneration();
        }
      };

      // Start progress animation
      updateProgress();

    } catch (error) {
      console.error('Regeneration error:', error);
      
      // Remove overlay
      const overlay = document.getElementById('regeneration-overlay');
      if (overlay) {
        const statusText = overlay.querySelector('#regen-status');
        if (statusText) {
          statusText.textContent = `❌ Regeneration failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
        
        setTimeout(() => {
          overlay.style.opacity = '0';
          overlay.style.transition = 'opacity 0.5s ease';
          setTimeout(() => {
            overlay.remove();
          }, 500);
        }, 2000);
      }
      
      toast({
        title: "Regeneration Failed",
        description: error instanceof Error ? error.message : "Failed to regenerate avatar",
        variant: "destructive",
      });
    } finally {
      setIsRegenerating(false);
      setRegenerationProgress(0);
    }
  };

  const handleSaveAvatar = async () => {
    if (!avatar || !avatarName.trim()) {
      toast({
        title: "Avatar name required",
        description: "Please enter a name for your avatar",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    setSavingProgress(0);

    // Create blue gradient loading overlay
    const overlay = document.createElement('div');
    overlay.id = 'avatar-save-overlay';
    overlay.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-[60]';
    overlay.innerHTML = `
      <div class="bg-glass backdrop-blur-xl border border-border/50 rounded-2xl p-8 max-w-md w-full mx-4">
        <div class="text-center space-y-6">
          <div class="w-16 h-16 mx-auto bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
            <svg class="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <div>
            <h3 class="text-xl font-semibold text-white mb-2">Saving Avatar</h3>
            <p class="text-muted-foreground mb-4" id="save-status">Preparing ${avatarName}...</p>
            <div class="w-full bg-secondary rounded-full h-2">
              <div id="save-progress-bar" class="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
            </div>
            <div class="text-sm text-muted-foreground mt-2" id="save-percentage">0%</div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    // Animate progress with realistic steps
    const progressSteps = [
      { progress: 15, message: "Uploading to IPFS storage..." },
      { progress: 35, message: "Processing avatar metadata..." },
      { progress: 55, message: "Generating thumbnail..." },
      { progress: 75, message: "Storing in database..." },
      { progress: 90, message: "Finalizing avatar..." },
      { progress: 100, message: "Complete!" }
    ];

    let currentStep = 0;
    const progressInterval = setInterval(() => {
      if (currentStep < progressSteps.length) {
        const step = progressSteps[currentStep];
        setSavingProgress(step.progress);
        
        const progressBar = document.getElementById('save-progress-bar');
        const statusText = document.getElementById('save-status');
        const percentageText = document.getElementById('save-percentage');
        
        if (progressBar) progressBar.style.width = `${step.progress}%`;
        if (statusText) statusText.textContent = step.message;
        if (percentageText) percentageText.textContent = `${step.progress}%`;
        
        currentStep++;
      }
    }, 800);

    try {
      // Check if this is a temporary avatar (not yet in database)
      const isTemporaryAvatar = avatar.metadata?.isTemporary === true;
      
      let result;
      if (isTemporaryAvatar) {
        // For temporary GLB uploads, save to database for the first time
        console.log('💾 Saving temporary avatar to database:', avatarName.trim());
        result = await apiRequest("POST", "/api/avatars/save-temp", {
          tempAvatarData: avatar,
          name: avatarName.trim()
        });
      } else {
        // For existing avatars (auto-rigged or previously saved), update with rigging
        const saveData = {
          avatarId: avatar.id,
          sessionId: riggingSessionId || sessionId,
          updateRigging: isAutoRigged,
          name: avatarName.trim(),
          useCurrentModel: currentDisplayModel === 'rigged'
        };

        console.log('💾 Saving existing avatar with data:', saveData);
        result = await apiRequest("POST", "/api/avatars/save", saveData);
      }
      
      clearInterval(progressInterval);
      
      if (result.success) {
        // Complete the progress
        setSavingProgress(100);
        const progressBar = document.getElementById('save-progress-bar');
        const statusText = document.getElementById('save-status');
        const percentageText = document.getElementById('save-percentage');
        
        if (progressBar) progressBar.style.width = '100%';
        if (statusText) statusText.textContent = 'Avatar saved successfully!';
        if (percentageText) percentageText.textContent = '100%';

        // Show success state for 1 second
        setTimeout(() => {
          overlay.style.opacity = '0';
          overlay.style.transition = 'opacity 0.5s ease';
          setTimeout(() => overlay.remove(), 500);
          
          toast({
            title: "Avatar saved successfully",
            description: `${avatarName} has been added to your collection`,
          });

          // Close modal and refresh avatars in parent
          onClose();
          
          // Trigger avatar refresh using the avatar context
          if (window.location.pathname === '/avatars') {
            window.location.reload();
          } else {
            window.location.href = '/avatars';
          }
        }, 1000);
      } else if (result.needsUpgrade) {
        // Handle subscription tier limit reached
        clearInterval(progressInterval);
        overlay.remove();
        
        toast({
          title: "Subscription Limit Reached",
          description: `${result.message}`,
          variant: "destructive",
        });
        
        // Show upgrade modal or redirect to pricing
        const upgradeModal = document.createElement('div');
        upgradeModal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-[60]';
        upgradeModal.innerHTML = `
          <div class="bg-glass backdrop-blur-xl border border-border/50 rounded-2xl p-8 max-w-md w-full mx-4">
            <div class="text-center space-y-6">
              <div class="w-16 h-16 mx-auto bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                <svg class="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 18.5C3.312 20.333 4.276 22 5.818 22z" />
                </svg>
              </div>
              <div>
                <h3 class="text-xl font-semibold text-white mb-2">Avatar Limit Reached</h3>
                <p class="text-muted-foreground mb-4">${result.message}</p>
                <p class="text-sm text-muted-foreground mb-6">Current: ${result.currentCount}/${result.maxAvatars} avatars</p>
                <div class="flex gap-3">
                  <button id="upgrade-btn" class="flex-1 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white px-4 py-2 rounded-lg font-medium">
                    Upgrade Plan
                  </button>
                  <button id="close-upgrade-modal" class="flex-1 bg-surface hover:bg-surface/80 text-white px-4 py-2 rounded-lg font-medium">
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
        
        document.body.appendChild(upgradeModal);
        
        document.getElementById('upgrade-btn')?.addEventListener('click', () => {
          upgradeModal.remove();
          window.location.href = '/pricing';
        });
        
        document.getElementById('close-upgrade-modal')?.addEventListener('click', () => {
          upgradeModal.remove();
        });
        
      } else {
        throw new Error(result.message || 'Save failed');
      }
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Save error:', error);
      
      // Update overlay to show error
      const statusText = document.getElementById('save-status');
      const progressBar = document.getElementById('save-progress-bar');
      if (statusText) statusText.textContent = 'Save failed';
      if (progressBar) progressBar.style.backgroundColor = '#ef4444';
      
      // Remove overlay after error display
      setTimeout(() => {
        const overlay = document.getElementById('avatar-save-overlay');
        if (overlay) {
          overlay.style.opacity = '0';
          overlay.style.transition = 'opacity 0.5s ease';
          setTimeout(() => overlay.remove(), 500);
        }
      }, 2000);
      
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

  const handleSendToStudio = async () => {
    if (!avatar || !hasRiggingStudioAccess) return;

    try {
      const result = await apiRequest("POST", "/api/avatars/send-to-studio", {
        avatarId: avatar.id,
        sessionId: riggingSessionId
      });
      
      if (result.success) {
        toast({
          title: "Sent to studio",
          description: "Avatar has been sent to the rigging studio for refinement",
        });
        onClose();
      } else {
        throw new Error(result.message || 'Studio transfer failed');
      }
    } catch (error) {
      console.error('Studio transfer error:', error);
      toast({
        title: "Transfer failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-0 md:p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="bg-background/95 backdrop-blur-xl rounded-none md:rounded-2xl max-w-6xl w-full h-full md:h-auto md:max-h-[90vh] overflow-y-auto border-0 md:border border-border/50"
        >
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">
                  Vida<span className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">Rig</span>
                </h2>
                {avatar && (
                  <p className="text-muted-foreground">{avatar.name}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full"
              >
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
              <div className="space-y-6">
                {/* Auto-Rigging Status */}
                {(riggingStatus === 'processing' || riggingStatus === 'complete' || renderAttempts > 0) && (
                  <GlassCard className="p-6">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Wand2 className="h-5 w-5 text-primary" />
                        VidaRig Auto-Rigging
                        {riggingStatus === 'complete' && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                      </h3>
                      {renderAttempts > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Render attempts: {renderAttempts}/5
                        </div>
                      )}
                    </div>

                      {riggingStatus === 'processing' && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Progress</span>
                              <span>{Math.round(riggingProgress)}%</span>
                            </div>
                            <div className="w-full bg-secondary rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full transition-all duration-300"
                                style={{ width: `${riggingProgress}%` }}
                              />
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Adding advanced bone structure and morph targets...
                          </p>
                        </div>
                      )}

                      {riggingStatus === 'complete' && (
                        <div className="space-y-4">
                          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                            <div className="flex items-center gap-2 text-green-400 mb-2">
                              <Sparkles className="h-4 w-4" />
                              <span className="font-medium">Auto-rigging complete!</span>
                            </div>
                            <p className="text-sm text-green-300">
                              Your avatar now has professional-grade bone structure and morph targets.
                            </p>
                            {riggedAvatar && (riggedAvatar.boneCount || riggedAvatar.morphTargets) && (
                              <div className="mt-3 grid grid-cols-2 gap-4 text-xs">
                                <div className="text-center p-2 bg-green-500/5 rounded">
                                  <div className="font-medium text-green-400">{riggedAvatar.boneCount || 0}</div>
                                  <div className="text-green-300/80">Bones</div>
                                </div>
                                <div className="text-center p-2 bg-green-500/5 rounded">
                                  <div className="font-medium text-green-400">{riggedAvatar.morphTargets || 0}</div>
                                  <div className="text-green-300/80">Morph Targets</div>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {currentDisplayModel === 'original' && riggedAvatar && (
                            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                              <p className="text-sm text-blue-300">
                                Currently viewing original model. Use the "Rigged" button above to see the enhanced version.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {renderAttempts >= 5 && (
                        <div className="mt-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                          <p className="text-sm text-orange-300">
                            Maximum render attempts reached. Please try uploading a different model or contact support if issues persist.
                          </p>
                        </div>
                      )}
                    </GlassCard>
                  )}

                  {/* Auto-Rigging Control */}
                  {riggingStatus === 'idle' && renderAttempts < 5 && (
                    <GlassCard className="p-6">
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Wand2 className="h-5 w-5 text-primary" />
                          VidaRig Auto-Rigging
                        </h3>
                      </div>
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Add advanced bone structure and improved animation capabilities to your avatar using AI-powered rigging.
                        </p>
                        {riggedAvatar && currentDisplayModel === 'rigged' && (
                          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                            <p className="text-sm text-green-300">
                              Auto-rigging completed successfully! Enhanced with {riggedAvatar.boneCount || 0} bones and {riggedAvatar.morphTargets || 0} morph targets.
                            </p>
                          </div>
                        )}
                        {renderAttempts > 0 && !riggedAvatar && (
                          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                            <p className="text-sm text-blue-300">
                              Previous attempt failed. You have {5 - renderAttempts} attempts remaining.
                            </p>
                          </div>
                        )}
                        {!(riggedAvatar && currentDisplayModel === 'rigged') && avatar && (
                          <VidaRigInterface
                            avatarId={avatar.id}
                            onRigComplete={(result) => {
                              setRiggedAvatar(result);
                              setRiggedModelUrl(result.riggedModelUrl);
                              setCurrentDisplayModel('rigged');
                              setIsAutoRigged(true);
                              setRiggingStatus('complete');
                              setRenderAttempts(0);
                            }}
                          />
                        )}
                        {riggedAvatar && currentDisplayModel === 'rigged' && (
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground mb-3">
                              Auto-rigging completed! Switch between models using the tabs above.
                            </p>
                          </div>
                        )}
                      </div>
                    </GlassCard>
                  )}

                  {/* Tracking Settings - Hidden per user request */}
                  {false && (
                  <GlassCard className="p-6">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Settings className="h-5 w-5 text-primary" />
                        Tracking Settings
                      </h3>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="face-tracking">Face Tracking</Label>
                        <Switch
                          id="face-tracking"
                          checked={previewSettings.faceTracking}
                          onCheckedChange={(checked) =>
                            setPreviewSettings(prev => ({ ...prev, faceTracking: checked }))
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="body-tracking">Body Tracking</Label>
                        <Switch
                          id="body-tracking"
                          checked={previewSettings.bodyTracking}
                          onCheckedChange={(checked) =>
                            setPreviewSettings(prev => ({ ...prev, bodyTracking: checked }))
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="eye-tracking">Eye Tracking</Label>
                        <Switch
                          id="eye-tracking"
                          checked={previewSettings.eyeTracking}
                          onCheckedChange={(checked) =>
                            setPreviewSettings(prev => ({ ...prev, eyeTracking: checked }))
                          }
                        />
                      </div>
                    </div>
                  </GlassCard>
                  )}

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
                          <div className="relative w-full h-full">
                            <ThreeModelViewer
                              key={`${avatar.id}-${currentDisplayModel}`}
                              modelUrl={(() => {
                                // Always prioritize rigged model if available and we're in rigged mode
                                if (currentDisplayModel === 'rigged' && riggedModelUrl) {
                                  console.log('🦴 AvatarPreviewModal: Displaying rigged model:', riggedModelUrl);
                                  return riggedModelUrl;
                                }
                                // Fall back to original avatar URLs
                                const originalUrl = avatar.modelUrl || avatar.fileUrl || avatar.supabaseUrl;
                                console.log('AvatarPreviewModal: Displaying original model:', originalUrl);
                                console.log('Avatar object:', avatar);
                                return originalUrl;
                              })()}
                              className="w-full h-full"
                              enableTracking={cameraActive}
                              faceTracking={previewSettings.faceTracking && cameraActive}
                              bodyTracking={previewSettings.bodyTracking && cameraActive}
                              handTracking={previewSettings.eyeTracking && cameraActive}
                              isRigged={currentDisplayModel === 'rigged'}
                              cameraStream={cameraStream}
                              onModelLoad={setModelViewerElement}
                            />
                            
                            {/* FullBodyTracker - Generates tracking data from camera stream */}
                            {cameraActive && cameraStream && (
                              <FullBodyTracker
                                cameraStream={cameraStream}
                                onTrackingData={(data) => {
                                  console.log('🎯 Tracking data received:', data);
                                  setFullBodyTrackingData(data);
                                }}
                              />
                            )}
                            
                            {/* RiggedModelAnimator - Connects tracking data to rigged model animation */}
                            <RiggedModelAnimator
                              modelElement={modelViewerElement}
                              trackingData={fullBodyTrackingData}
                              isRigged={currentDisplayModel === 'rigged'}
                            />

                          </div>
                          
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
                            
                            {/* Regeneration Button for 2D-to-3D avatars */}
                            {(() => {
                              const is2DTo3D = avatar?.id?.toString().includes('meshy_') || 
                                              avatar?.modelUrl?.includes('meshy-processing') ||
                                              avatar?.source === '2d-to-3d' ||
                                              avatar?.createdFrom === 'image';
                              
                              if (is2DTo3D) {
                                return (
                                  <div className="bg-black/70 rounded-lg p-2 mt-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 text-xs px-2 w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0 text-white"
                                      onClick={handleRegenerate}
                                      disabled={isRegenerating}
                                    >
                                      {isRegenerating ? (
                                        <>
                                          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                          Regenerating...
                                        </>
                                      ) : (
                                        <>
                                          <Shuffle className="h-3 w-3 mr-1" />
                                          Regenerate
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                            

                          </div>

                          {isAutoRigged && (
                            <div className="absolute top-2 right-2">
                              <Badge variant="default" className="bg-green-600">
                                <Bone className="h-3 w-3 mr-1" />
                                Auto-Rigged
                              </Badge>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                              <User className="h-8 w-8 text-primary" />
                            </div>
                            <p className="text-sm text-muted-foreground">Avatar Loading...</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Vertices:</span>
                          <span>
                            {currentDisplayModel === 'rigged' && riggedAvatar?.vertices 
                              ? riggedAvatar.vertices.toLocaleString() 
                              : avatar.vertices?.toLocaleString() || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">File Size:</span>
                          <span>
                            {currentDisplayModel === 'rigged' && riggedAvatar?.fileSize 
                              ? `${(riggedAvatar.fileSize / (1024 * 1024)).toFixed(1)} MB` 
                              : avatar.fileSize ? `${(avatar.fileSize / (1024 * 1024)).toFixed(1)} MB` : 'N/A'}
                          </span>
                        </div>
                        {currentDisplayModel === 'rigged' && riggedAvatar?.originalFileSize && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Original Size:</span>
                            <span className="text-xs text-muted-foreground">
                              {`${(riggedAvatar.originalFileSize / (1024 * 1024)).toFixed(1)} MB`}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Format:</span>
                          <span>GLB</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Version:</span>
                          <span className="text-green-400">
                            {currentDisplayModel === 'rigged' ? (
                              <>
                                <Bone className="h-3 w-3 text-green-500 inline mr-1" />
                                Rigged
                              </>
                            ) : (
                              'Original'
                            )}
                          </span>
                        </div>
                        {currentDisplayModel === 'rigged' && riggedAvatar && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Bones:</span>
                              <span className="text-blue-400">{riggedAvatar.boneCount || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Morph Targets:</span>
                              <span className="text-purple-400">{riggedAvatar.morphTargets || 0}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </GlassCard>

                  {/* Live Camera Feed - Separate card under model preview */}
                  {cameraActive && (
                    <GlassCard className="p-6">
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Camera className="h-5 w-5 text-primary" />
                          Live Camera Feed
                        </h3>
                        <p className="text-sm text-muted-foreground">Real-time full-body tracking (face, hands, body, fingers)</p>
                      </div>
                      <div className="aspect-video bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg overflow-hidden relative">
                        <FullBodyTracker
                          onTrackingData={setFullBodyTrackingData}
                          className="w-full h-full"
                          cameraStream={cameraStream}
                        />
                        <div className="absolute top-2 right-2">
                          <Badge variant="default" className="bg-green-600">
                            <Camera className="h-3 w-3 mr-1" />
                            Live
                          </Badge>
                        </div>
                      </div>
                    </GlassCard>
                  )}

                  {/* Camera Controls */}
                  <GlassCard className="p-6">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Camera className="h-5 w-5 text-primary" />
                        Camera Controls
                      </h3>
                      <p className="text-sm text-muted-foreground">Control real-time face tracking</p>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium">Camera Tracking</Label>
                          <p className="text-xs text-muted-foreground">Enable camera for live avatar animation</p>
                        </div>
                        <Button
                          size="sm"
                          variant={cameraActive ? "default" : "secondary"}
                          onClick={async () => {
                            if (cameraActive) {
                              // Stop camera tracking
                              setCameraActive(false);
                              if (cameraStream) {
                                cameraStream.getTracks().forEach(track => track.stop());
                                setCameraStream(null);
                              }
                              toast({
                                title: "Camera tracking disabled",
                                description: "Face tracking has been turned off",
                              });
                            } else {
                              // Start camera tracking
                              try {
                                // Check if mediaDevices is available
                                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                                  throw new Error('Camera API not available in this browser');
                                }

                                // Request camera access with proper constraints
                                const stream = await navigator.mediaDevices.getUserMedia({ 
                                  video: { 
                                    width: { ideal: 640, max: 1280 }, 
                                    height: { ideal: 480, max: 720 }, 
                                    facingMode: 'user',
                                    frameRate: { ideal: 30, max: 60 }
                                  },
                                  audio: false
                                });
                                
                                console.log('Camera stream obtained successfully:', stream);
                                setCameraStream(stream);
                                setCameraActive(true);
                                toast({
                                  title: "Camera tracking enabled",
                                  description: "Facial motion capture is now active",
                                });
                              } catch (error) {
                                console.error('Camera access failed:', error);
                                
                                let errorMessage = "Camera access denied";
                                if (error instanceof Error) {
                                  if (error.name === 'NotAllowedError') {
                                    errorMessage = "Camera permission denied. Please allow camera access and try again.";
                                  } else if (error.name === 'NotFoundError') {
                                    errorMessage = "No camera found. Please connect a camera and try again.";
                                  } else if (error.name === 'NotSupportedError') {
                                    errorMessage = "Camera not supported in this browser.";
                                  } else if (error.name === 'NotReadableError') {
                                    errorMessage = "Camera is already in use by another application.";
                                  } else {
                                    errorMessage = error.message;
                                  }
                                }
                                
                                toast({
                                  title: "Camera access failed",
                                  description: errorMessage,
                                  variant: "destructive",
                                });
                              }
                            }
                          }}
                          className="flex items-center gap-2"
                        >
                          {cameraActive ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
                          {cameraActive ? 'Stop Tracking' : 'Start Tracking'}
                        </Button>
                      </div>
                    </div>
                  </GlassCard>

                  {/* Tracking Settings */}
                  <GlassCard className="p-6">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Settings className="h-5 w-5 text-primary" />
                        Tracking Settings
                      </h3>
                      <p className="text-sm text-muted-foreground">Configure animation tracking features</p>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="face-tracking" className="text-sm font-medium">Face Tracking</Label>
                          <p className="text-xs text-muted-foreground">Track facial expressions and head movement</p>
                        </div>
                        <Switch
                          id="face-tracking"
                          checked={previewSettings.faceTracking}
                          onCheckedChange={(checked) => 
                            setPreviewSettings(prev => ({ ...prev, faceTracking: checked }))
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="body-tracking" className="text-sm font-medium">Body Tracking</Label>
                          <p className="text-xs text-muted-foreground">Track body pose and movement</p>
                        </div>
                        <Switch
                          id="body-tracking"
                          checked={previewSettings.bodyTracking}
                          onCheckedChange={(checked) => 
                            setPreviewSettings(prev => ({ ...prev, bodyTracking: checked }))
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="eye-tracking" className="text-sm font-medium">Eye Tracking</Label>
                          <p className="text-xs text-muted-foreground">Track eye movement and blinking</p>
                        </div>
                        <Switch
                          id="eye-tracking"
                          checked={previewSettings.eyeTracking}
                          onCheckedChange={(checked) => 
                            setPreviewSettings(prev => ({ ...prev, eyeTracking: checked }))
                          }
                        />
                      </div>
                    </div>
                  </GlassCard>

                  {/* Tracking Status */}
                  <GlassCard className="p-6">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold">Real-time Status</h3>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Camera:</span>
                        <Badge variant={cameraActive ? "default" : "secondary"}>
                          {cameraActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Face (468 landmarks):</span>
                        <Badge variant={fullBodyTrackingData?.face?.detected && cameraActive ? "default" : "secondary"}>
                          {fullBodyTrackingData?.face?.detected && cameraActive ? 'Tracking' : 'Off'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Hands & Fingers:</span>
                        <Badge variant={(fullBodyTrackingData?.hands?.left?.detected || fullBodyTrackingData?.hands?.right?.detected) && cameraActive ? "default" : "secondary"}>
                          {(fullBodyTrackingData?.hands?.left?.detected || fullBodyTrackingData?.hands?.right?.detected) && cameraActive ? 'Tracking' : 'Off'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Body Pose (33 points):</span>
                        <Badge variant={fullBodyTrackingData?.pose?.detected && cameraActive ? "default" : "secondary"}>
                          {fullBodyTrackingData?.pose?.detected && cameraActive ? 'Tracking' : 'Off'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Rigged Model Animation:</span>
                        <Badge variant={fullBodyTrackingData && cameraActive && (currentDisplayModel === 'rigged') ? "default" : "secondary"}>
                          {fullBodyTrackingData && cameraActive && (currentDisplayModel === 'rigged') ? 'Active' : 'Off'}
                        </Badge>
                      </div>
                      {fullBodyTrackingData && cameraActive && (
                        <div className="mt-3 p-2 bg-green-500/10 border border-green-500/20 rounded">
                          <div className="text-xs text-green-400">Live tracking data detected</div>
                        </div>
                      )}
                    </div>
                  </GlassCard>

                  {/* Avatar Name Input */}
                  <GlassCard className="p-6">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Edit3 className="h-5 w-5 text-primary" />
                        Avatar Name
                      </h3>
                      <p className="text-sm text-muted-foreground">Give your avatar a custom name</p>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="avatar-name" className="text-sm font-medium">Avatar Name</Label>
                        <input
                          id="avatar-name"
                          type="text"
                          value={avatarName}
                          onChange={(e) => setAvatarName(e.target.value)}
                          placeholder="Enter avatar name..."
                          className="mt-1 w-full px-3 py-2 bg-secondary/50 border border-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
                          maxLength={50}
                        />
                        <div className="flex justify-between mt-1">
                          <span className="text-xs text-muted-foreground">
                            This name will be displayed in your avatar collection
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {avatarName.length}/50
                          </span>
                        </div>
                      </div>
                    </div>
                  </GlassCard>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    {/* Download button for rigged avatars */}
                    {riggingSessionId && riggingStatus === 'complete' && (
                      <Button 
                        onClick={() => {
                          const downloadUrl = `/api/avatars/download-rigged/${riggingSessionId}`;
                          const link = document.createElement('a');
                          link.href = downloadUrl;
                          link.download = `rigged-avatar-${avatar.name || 'avatar'}.glb`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          
                          toast({
                            title: "Download started",
                            description: "Your rigged avatar is being downloaded",
                          });
                        }}
                        className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-500/90 hover:to-purple-600/90" 
                        size="lg"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Rigged Model
                      </Button>
                    )}
                    
                    {/* Save Avatar Button */}
                    <Button 
                      onClick={handleSaveAvatar} 
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-500/90 hover:to-emerald-600/90" 
                      size="lg"
                      disabled={isSaving}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? 'Saving...' : isAutoRigged ? 'Save Rigged Avatar' : 'Save Avatar'}
                    </Button>

                    {/* Refine in Studio Button */}
                    <Button 
                      onClick={handleSendToStudio}
                      className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-500/90 hover:to-blue-600/90"
                      size="lg"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Refine in Studio
                    </Button>
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
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}