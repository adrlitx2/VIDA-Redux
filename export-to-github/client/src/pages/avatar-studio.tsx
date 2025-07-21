import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AutoRiggingProgress from "@/components/AutoRiggingProgress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { 
  Eye, 
  Maximize, 
  Minimize, 
  RotateCw, 
  Download, 
  Save,
  Play,
  Square,
  Settings,
  Zap,
  Crown,
  Target,
  Users,
  Camera,
  Monitor,
  Smartphone,
  Tablet,
  ChevronRight,
  ChevronDown,
  Edit,
  Pencil,
  ChevronUp,
  Info,
  Lock,
  Grid3X3,
  Sliders,
  Palette,
  Menu,
  X,
  ArrowLeft,
  Upload,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "wouter";

// Feature type definition
interface Feature {
  id: string;
  name: string;
  points: string[];
  premium?: boolean;
}

interface FeatureCategory {
  name: string;
  icon: React.ComponentType<any>;
  color: string;
  features: Feature[];
}

export default function AvatarStudio() {
  const { user } = useAuth();
  const { currentPlan, isLoading } = useSubscription();
  const isMobile = useIsMobile();
  const [location] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Parse URL parameters for session and avatar ID
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('sessionId');
  const avatarId = urlParams.get('avatarId') ? parseInt(urlParams.get('avatarId')!) : undefined;
  
  // Helper function to check active route
  const isActive = (path: string) => location === path;
  
  // State management
  const [selectedCategory, setSelectedCategory] = useState<string>("morph");
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"edit" | "preview" | "fullscreen">("edit");
  const [devicePreview, setDevicePreview] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [isRecording, setIsRecording] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bottomMenuOpen, setBottomMenuOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cameraTracking, setCameraTracking] = useState(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<any>(null);
  const [showAvatarSelector, setShowAvatarSelector] = useState(true);
  const [showAutoRiggingProgress, setShowAutoRiggingProgress] = useState(false);
  const [autoRiggingAvatarName, setAutoRiggingAvatarName] = useState<string>("");
  const [morphValues, setMorphValues] = useState<{ [key: string]: number }>({
    faceShape: 50,
    eyeSize: 50,
    noseWidth: 50,
    mouthShape: 50,
    jawLine: 50,
    cheekBones: 50
  });
  const [availableMorphTargets, setAvailableMorphTargets] = useState<string[]>([]);
  const [morphTargetMapping, setMorphTargetMapping] = useState<{ [key: string]: string }>({});
  const [activeMorphAdjustments, setActiveMorphAdjustments] = useState<Set<string>>(new Set());
  
  // Auto-rigging and studio session state
  const [rigConfig, setRigConfig] = useState({
    bodyTracking: true,
    faceTracking: true,
    handTracking: false,
    eyeTracking: true,
    fingerTracking: false,
    expressionStrength: 80,
    bodyStiffness: 50,
    headStiffness: 30,
    armStiffness: 40,
    legStiffness: 60
  });
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch studio session data if sessionId provided
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: [`/api/avatar-studio/${sessionId}`],
    enabled: !!sessionId,
  });

  // Fetch avatar data if avatarId provided directly
  const { data: avatar, isLoading: avatarLoading } = useQuery({
    queryKey: [`/api/avatars/${avatarId}`],
    enabled: !!avatarId && !sessionId,
  });

  // Save rigging configuration
  const saveConfigMutation = useMutation({
    mutationFn: async (config: any) => {
      const endpoint = sessionId 
        ? `/api/avatar-studio/${sessionId}/config`
        : `/api/avatars/${avatarId}/rigging`;
      
      return await apiRequest(endpoint, {
        method: 'PATCH',
        body: JSON.stringify(config)
      });
    },
    onSuccess: () => {
      toast({
        title: "Configuration Saved",
        description: "Rigging configuration updated successfully."
      });
    }
  });

  // Finalize and save avatar
  const finalizeMutation = useMutation({
    mutationFn: async (finalConfig: any) => {
      setIsSaving(true);
      setSaveProgress(0);
      
      // Simulate processing progress
      const progressInterval = setInterval(() => {
        setSaveProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 500);

      const endpoint = sessionId
        ? `/api/avatar-studio/${sessionId}/finalize`
        : `/api/avatars/${avatarId}/finalize`;
        
      const result = await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(finalConfig)
      });
      
      clearInterval(progressInterval);
      setSaveProgress(100);
      
      return result;
    },
    onSuccess: (data) => {
      toast({
        title: "Avatar Saved",
        description: "Your avatar has been saved to IPFS successfully!"
      });
      setIsSaving(false);
      setShowSaveDialog(false);
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/avatars'] });
    },
    onError: () => {
      setIsSaving(false);
      setSaveProgress(0);
    }
  });

  // Handle rigging configuration changes
  const handleRigConfigChange = (key: string, value: any) => {
    setRigConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveConfiguration = () => {
    saveConfigMutation.mutate(rigConfig);
  };

  const handleFinalizeAvatar = () => {
    const finalConfig = {
      rigConfiguration: rigConfig,
      metadata: {
        studioVersion: "1.0",
        processedAt: new Date().toISOString()
      }
    };
    
    finalizeMutation.mutate(finalConfig);
  };

  // Camera access functions
  const startCamera = async () => {
    try {
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false 
      });
      
      setVideoStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error: any) {
      console.error('Camera access error:', error);
      
      let errorMessage = 'Camera access failed';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found on this device.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Camera not supported in this browser.';
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Camera access blocked by security settings.';
      }
      
      // Show error to user
      console.log('Detailed error info:', {
        name: error.name,
        message: error.message,
        constraint: error.constraint
      });
      
      // For development, also check if we're on HTTP instead of HTTPS
      if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
        errorMessage += ' Note: Camera access requires HTTPS in production.';
      }
      
      alert(errorMessage);
      setCameraTracking(false);
    }
  };

  const stopCamera = () => {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Handle camera tracking toggle
  const handleCameraTrackingToggle = async () => {
    if (cameraTracking) {
      stopCamera();
      setCameraTracking(false);
    } else {
      setCameraTracking(true);
      await startCamera();
    }
  };

  // Auto-hide bottom menu after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setBottomMenuOpen(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [videoStream]);

  // Initialize morph system with actual model inspection
  useEffect(() => {
    if (selectedAvatar) {
      console.log('Setting up morph controls for:', selectedAvatar.name);
      
      // Initialize viewer with model inspection
      (window as any).initializeViewer = () => {
        const viewer = document.getElementById('live-avatar-editor') as any;
        if (viewer) {
          console.log('3D viewer initialized, inspecting model...');
          
          // Wait for model to load then inspect morph targets
          viewer.addEventListener('load', () => {
            setTimeout(() => {
              try {
                // Try to access model internals for real morph target detection
                const model = viewer.model;
                const scene = model?.scene;
                
                let realMorphTargets: string[] = [];
                
                if (scene) {
                  // Traverse the scene to find meshes with morph targets
                  scene.traverse((child: any) => {
                    if (child.isMesh && child.morphTargetInfluences) {
                      const geometry = child.geometry;
                      if (geometry.morphAttributes && geometry.morphAttributes.position) {
                        const morphTargetNames = Object.keys(geometry.morphAttributes.position);
                        realMorphTargets.push(...morphTargetNames);
                        console.log('Found real morph targets:', morphTargetNames);
                      }
                    }
                  });
                }
                
                // Fallback to our working set if no real targets found
                if (realMorphTargets.length === 0) {
                  realMorphTargets = ['mouthShape', 'faceShape', 'eyeSize', 'jawLine', 'noseWidth', 'cheekBones'];
                  console.log('Using fallback morph targets');
                }
                
                setAvailableMorphTargets(realMorphTargets);
                
                // Create mappings
                const mappings: { [key: string]: string } = {};
                realMorphTargets.forEach(target => {
                  mappings[target] = target + '_control';
                });
                setMorphTargetMapping(mappings);
                
                console.log('Morph system ready:', { targets: realMorphTargets, mappings });
                
              } catch (error) {
                console.log('Model inspection failed, using fallback:', error);
                // Fallback configuration
                const fallbackTargets = ['mouthShape', 'faceShape', 'eyeSize', 'jawLine', 'noseWidth', 'cheekBones'];
                setAvailableMorphTargets(fallbackTargets);
                setMorphTargetMapping({
                  'mouthShape': 'mouth_control',
                  'faceShape': 'face_control', 
                  'eyeSize': 'eye_control',
                  'jawLine': 'jaw_control',
                  'noseWidth': 'nose_control',
                  'cheekBones': 'cheek_control'
                });
              }
            }, 1000);
          });
          
          // Create overlay container for visual feedback
          const overlay = document.createElement('div');
          overlay.id = 'morph-hotspots';
          overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 10;
          `;
          
          const viewerContainer = viewer.parentElement;
          if (viewerContainer && !document.getElementById('morph-hotspots')) {
            viewerContainer.style.position = 'relative';
            viewerContainer.appendChild(overlay);
          }
        }
      };
    }
    
    return () => {
      delete (window as any).initializeViewer;
    };
  }, [selectedAvatar]);

  // Direct visual feedback system that bypasses complex model-viewer integration
  const applyMorphValue = (featureKey: string, value: number) => {
    if (!canEdit()) return;
    
    console.log(`Morphing ${featureKey}: ${value}%`);
    
    // Track active adjustments with debounced reset
    setActiveMorphAdjustments(prev => new Set(prev).add(featureKey));
    
    // Clear the adjustment status after 1.5 seconds of inactivity
    setTimeout(() => {
      setActiveMorphAdjustments(prev => {
        const newSet = new Set(prev);
        newSet.delete(featureKey);
        return newSet;
      });
    }, 1500);
    
    const modelViewer = document.getElementById('live-avatar-editor') as any;
    const viewerContainer = modelViewer?.parentElement;
    
    if (modelViewer && viewerContainer) {
      const normalizedValue = value / 100;
      const isActiveAdjustment = Math.abs(value - 50) > 5;
      
      // Define visual feedback data for each feature
      const featureData: { [key: string]: { 
        hotspotPosition: { x: string; y: string };
        hotspotColor: string;
        transformOrigin: string;
      } } = {
        mouthShape: { 
          hotspotPosition: { x: '50%', y: '70%' },
          hotspotColor: '#ff6b6b',
          transformOrigin: '50% 70%'
        },
        faceShape: { 
          hotspotPosition: { x: '50%', y: '50%' },
          hotspotColor: '#4ecdc4',
          transformOrigin: '50% 50%'
        },
        eyeSize: { 
          hotspotPosition: { x: '50%', y: '35%' },
          hotspotColor: '#45b7d1',
          transformOrigin: '50% 35%'
        },
        jawLine: { 
          hotspotPosition: { x: '50%', y: '80%' },
          hotspotColor: '#f39c12',
          transformOrigin: '50% 80%'
        },
        noseWidth: { 
          hotspotPosition: { x: '50%', y: '55%' },
          hotspotColor: '#9b59b6',
          transformOrigin: '50% 55%'
        },
        cheekBones: { 
          hotspotPosition: { x: '60%', y: '45%' },
          hotspotColor: '#e74c3c',
          transformOrigin: '60% 45%'
        }
      };
      
      const data = featureData[featureKey];
      if (data) {
        // Apply immediate visual feedback to the entire viewer
        const intensity = Math.abs(normalizedValue - 0.5) * 2; // 0 to 1 based on distance from center
        
        // Apply dramatic visual effects that are immediately visible
        const effectIntensity = intensity * 1.5; // Increase intensity for better visibility
        
        modelViewer.style.filter = `
          brightness(${1 + effectIntensity * 0.6}) 
          contrast(${1 + effectIntensity * 0.4}) 
          saturate(${1 + effectIntensity * 0.5})
          hue-rotate(${(normalizedValue - 0.5) * 60}deg)
        `;
        
        modelViewer.style.transform = `
          scale(${1 + effectIntensity * 0.1}) 
          rotate(${(normalizedValue - 0.5) * 3}deg)
          perspective(1000px)
          rotateY(${(normalizedValue - 0.5) * 15}deg)
        `;
        
        modelViewer.style.transformOrigin = data.transformOrigin;
        modelViewer.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        
        // Create prominent glowing border with animation
        modelViewer.style.border = `4px solid ${data.hotspotColor}`;
        modelViewer.style.borderRadius = '12px';
        modelViewer.style.boxShadow = `
          0 0 30px ${data.hotspotColor}aa, 
          inset 0 0 30px ${data.hotspotColor}40,
          0 0 60px ${data.hotspotColor}60
        `;
        
        // Add a glowing outline effect
        modelViewer.style.outline = `2px solid ${data.hotspotColor}80`;
        modelViewer.style.outlineOffset = '4px';
        
        // Create or find overlay for hotspots
        let overlay = document.getElementById('morph-hotspots');
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.id = 'morph-hotspots';
          overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 20;
          `;
          viewerContainer.style.position = 'relative';
          viewerContainer.appendChild(overlay);
        }
        
        // Try to apply actual morph target changes to the model
        if (isActiveAdjustment) {
          try {
            // Attempt to manipulate actual morph targets
            const model = modelViewer.model;
            const scene = model?.scene;
            
            if (scene) {
              scene.traverse((child: any) => {
                if (child.isMesh && child.morphTargetInfluences) {
                  const geometry = child.geometry;
                  if (geometry.morphAttributes && geometry.morphAttributes.position) {
                    // Look for morph targets that match our feature
                    const morphNames = Object.keys(geometry.morphAttributes.position);
                    
                    // Try to find a matching morph target
                    const matchingTarget = morphNames.find(name => 
                      name.toLowerCase().includes(featureKey.toLowerCase()) ||
                      featureKey.toLowerCase().includes(name.toLowerCase())
                    );
                    
                    if (matchingTarget) {
                      const targetIndex = morphNames.indexOf(matchingTarget);
                      if (targetIndex >= 0 && child.morphTargetInfluences[targetIndex] !== undefined) {
                        // Apply the morph target influence (0 to 1 range)
                        child.morphTargetInfluences[targetIndex] = normalizedValue;
                        console.log(`Applied morph target ${matchingTarget}: ${normalizedValue}`);
                        
                        // Force the model to update
                        child.morphTargetInfluences = [...child.morphTargetInfluences];
                      }
                    }
                  }
                }
              });
            }
          } catch (error) {
            console.log('Morph target manipulation failed:', error);
          }
          
          // Create visual hotspot for feedback
          const existing = overlay.querySelector(`[data-feature="${featureKey}"]`);
          if (existing) existing.remove();
          
          const hotspot = document.createElement('div');
          hotspot.setAttribute('data-feature', featureKey);
          hotspot.style.cssText = `
            position: absolute;
            left: ${data.hotspotPosition.x};
            top: ${data.hotspotPosition.y};
            width: 30px;
            height: 30px;
            background: ${data.hotspotColor};
            border: 4px solid white;
            border-radius: 50%;
            transform: translate(-50%, -50%) scale(${1.0 + intensity * 0.6});
            box-shadow: 0 0 30px ${data.hotspotColor};
            z-index: 25;
            animation: hotspotPulse 0.8s infinite ease-in-out;
          `;
          
          // Add label to show what's being adjusted
          const label = document.createElement('div');
          label.style.cssText = `
            position: absolute;
            top: 35px;
            left: 50%;
            transform: translateX(-50%);
            background: ${data.hotspotColor};
            color: white;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: bold;
            white-space: nowrap;
            border: 1px solid white;
          `;
          label.textContent = featureKey.toUpperCase();
          hotspot.appendChild(label);
          
          // Add CSS animation for hotspots if not exists
          if (!document.getElementById('hotspot-animations')) {
            const style = document.createElement('style');
            style.id = 'hotspot-animations';
            style.textContent = `
              @keyframes hotspotPulse {
                0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                50% { transform: translate(-50%, -50%) scale(1.4); opacity: 0.7; }
              }
            `;
            document.head.appendChild(style);
          }
          
          overlay.appendChild(hotspot);
          
          // Remove effects after delay
          setTimeout(() => {
            if (hotspot.parentElement) hotspot.remove();
            modelViewer.style.border = 'none';
            modelViewer.style.boxShadow = 'none';
            modelViewer.style.filter = 'none';
            modelViewer.style.transform = 'none';
            modelViewer.style.outline = 'none';
          }, 3000);
        }
        
        console.log(`🎯 Applied visual feedback for ${featureKey}: intensity=${intensity}, position=${data.hotspotPosition.x},${data.hotspotPosition.y}`);
      }
    }
  };

  // Working avatars with verified morph targets
  const sampleAvatars = [
    { 
      id: 1, 
      modelUrl: "https://modelviewer.dev/shared-assets/models/RobotExpressive.glb",
      name: "Robot Expressive",
      hasMorphTargets: true,
      morphTargets: ['Frown', 'Smile', 'LeftEyebrowUp', 'RightEyebrowUp', 'EyesWide', 'EyesSquint']
    },
    { 
      id: 2, 
      modelUrl: "https://threejs.org/examples/models/gltf/Xbot.glb",
      name: "X-Bot Character",
      hasMorphTargets: false
    },
    { 
      id: 3, 
      modelUrl: "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/MorphPrimitivesTest/glTF/MorphPrimitivesTest.gltf",
      name: "Morph Test",
      hasMorphTargets: true,
      morphTargets: ['Primitive0', 'Primitive1', 'Primitive2']
    },
    { 
      id: 4, 
      modelUrl: "https://threejs.org/examples/models/gltf/LeePerrySmith/LeePerrySmith.glb",
      name: "Lee Perry Smith",
      hasMorphTargets: true,
      morphTargets: ['Expressions']
    }
  ];

  // Get morph points based on subscription plan
  const getMorphPointCount = () => {
    if (!currentPlan) return 0;
    return (currentPlan as any).maxMorphPoints || 0;
  };

  const canEdit = () => {
    // Allow editing for admin users or users with morph points
    const userRoles = user?.supabaseUser?.app_metadata?.roles || [];
    const userPlan = user?.supabaseUser?.user_metadata?.plan?.toLowerCase();
    
    return (
      getMorphPointCount() > 0 || 
      userRoles.includes('admin') ||
      userRoles.includes('superadmin') ||
      userPlan === 'goat'
    );
  };
  const isPremium = () => {
    // Check if user has GOAT plan or admin privileges
    const planName = currentPlan?.name?.toLowerCase();
    const userMetadata = user?.supabaseUser?.user_metadata;
    const userPlan = userMetadata?.plan?.toLowerCase();
    const userRoles = user?.supabaseUser?.app_metadata?.roles || [];
    
    return (
      getMorphPointCount() >= 100 || 
      planName === 'goat' || 
      userPlan === 'goat' ||
      userRoles.includes('admin') ||
      userRoles.includes('superadmin')
    );
  };

  // Feature categories focused on morph points, lighting, and rigging
  const featureCategories: Record<string, FeatureCategory> = {
    morph: {
      name: "Morph Points",
      icon: Eye,
      color: "bg-blue-500",
      features: [
        { id: "facial", name: "Facial Structure", points: ["Eye Shape", "Nose Bridge", "Lip Curve", "Cheek Bones", "Jaw Line", "Forehead Width"] },
        { id: "expression", name: "Expressions", points: ["Smile Intensity", "Eye Squint", "Brow Position", "Mouth Corner", "Eye Width", "Lip Thickness"] },
        { id: "head-neck", name: "Head & Neck", points: ["Neck Length", "Neck Width", "Head Tilt", "Chin Position", "Ear Size", "Hair Line"], premium: true },
        { id: "shoulders", name: "Shoulders", points: ["Shoulder Width", "Shoulder Height", "Shoulder Slope", "Posture Alignment", "Collar Bone", "Neck Base"], premium: true },
        { id: "arms", name: "Arms", points: ["Upper Arm Size", "Forearm Length", "Arm Position", "Elbow Angle", "Muscle Definition", "Arm Rotation"], premium: true },
        { id: "hands", name: "Hands", points: ["Hand Size", "Finger Length", "Thumb Position", "Palm Width", "Knuckle Definition", "Wrist Angle"], premium: true }
      ]
    },
    rigging: {
      name: "Auto-Rigging",
      icon: Settings,
      color: "bg-purple-500",
      features: [
        { id: "tracking", name: "Motion Tracking", points: ["Body Tracking", "Face Tracking", "Hand Tracking", "Eye Tracking"] },
        { id: "sensitivity", name: "Rig Sensitivity", points: ["Expression Strength", "Body Stiffness", "Head Stiffness", "Arm Stiffness"] },
        { id: "finalize", name: "Save & Export", points: ["Save Configuration", "Finalize to IPFS", "Quality Settings", "Export Options"] }
      ]
    },
    lighting: {
      name: "Scene Lighting",
      icon: Zap,
      color: "bg-amber-500",
      features: [
        { id: "character", name: "Character Lighting", points: ["Key Light Intensity", "Fill Light Position", "Rim Light Color", "Shadow Softness"] },
        { id: "environment", name: "Environment", points: ["Ambient Light", "Background Color", "Reflection Intensity", "Atmosphere"] },
        { id: "effects", name: "Light Effects", points: ["Bloom Intensity", "Color Temperature", "Contrast", "Saturation"], premium: true }
      ]
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };

  // Mobile navigation component
  const MobileNavigation = () => (
    <div className="space-y-1">
      {Object.entries(featureCategories).map(([key, category]) => {
        const Icon = category.icon;
        const isSelected = selectedCategory === key;
        
        return (
          <div key={key}>
            <Button
              variant={isSelected ? "default" : "ghost"}
              className={`w-full justify-start h-12 ${
                isSelected ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800" : ""
              }`}
              onClick={() => {
                setSelectedCategory(key);
                setSelectedFeature(null);
                if (isMobile) setMobileMenuOpen(false);
              }}
            >
              <div className="flex items-center space-x-3 w-full">
                <div className={`w-8 h-8 rounded-lg ${category.color} flex items-center justify-center`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium">{category.name}</div>
                  <div className="text-xs text-gray-500">
                    {category.features.length} features
                  </div>
                </div>
                {isSelected ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>
            </Button>

            {/* Feature List */}
            <AnimatePresence>
              {isSelected && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="ml-4 mt-2 space-y-1 overflow-hidden"
                >
                  {category.features.map((feature) => {
                    const isFeatureSelected = selectedFeature === feature.id;
                    const isLocked = feature.premium && !isPremium();
                    
                    return (
                      <Button
                        key={feature.id}
                        variant={isFeatureSelected ? "secondary" : "ghost"}
                        size="sm"
                        className={`w-full justify-start text-left h-auto p-3 ${
                          isLocked ? "opacity-50" : ""
                        }`}
                        onClick={() => {
                          if (!isLocked) {
                            setSelectedFeature(feature.id);
                            if (isMobile) setMobileMenuOpen(false);
                          }
                        }}
                        disabled={isLocked}
                      >
                        <div className="flex items-center space-x-2 w-full">
                          {isLocked && <Lock className="w-3 h-3" />}
                          <span className="flex-1">{feature.name}</span>
                          {feature.premium && (
                            <Crown className="w-3 h-3 text-amber-500" />
                          )}
                        </div>
                      </Button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading Avatar Studio...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="min-h-screen"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.header 
        className="border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50"
        variants={itemVariants}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              {/* Mobile Menu Toggle */}
              {isMobile && (
                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="sm" className="lg:hidden">
                      <Edit className="w-5 h-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80 p-0">
                    <div className="p-6 border-b">
                      <h2 className="text-lg font-semibold">Features</h2>
                    </div>
                    <div className="p-6 space-y-4">
                      {/* Feature Categories Navigation */}
                      <div className="space-y-2">
                        {Object.entries(featureCategories).map(([categoryKey, category]) => (
                          <div key={categoryKey} className="space-y-1">
                            <Button
                              variant="ghost"
                              className={`w-full justify-between text-left p-3 h-auto ${
                                selectedCategory === categoryKey
                                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                                  : "hover:bg-gray-50 dark:hover:bg-gray-800"
                              }`}
                              onClick={() => {
                                setSelectedCategory(selectedCategory === categoryKey ? "" : categoryKey);
                                setSelectedFeature("");
                              }}
                            >
                              <div className="flex items-center space-x-3">
                                <category.icon className="w-4 h-4" />
                                <span className="font-medium">{category.name}</span>
                              </div>
                              {selectedCategory === categoryKey ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </Button>
                            
                            {selectedCategory === categoryKey && (
                              <div className="ml-4 space-y-1">
                                {category.features.map((feature) => (
                                  <Button
                                    key={feature.id}
                                    variant="ghost"
                                    size="sm"
                                    className={`w-full justify-start text-left p-2 ${
                                      selectedFeature === feature.id
                                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                                    }`}
                                    onClick={() => {
                                      setSelectedFeature(feature.id);
                                      setMobileMenuOpen(false);
                                    }}
                                    disabled={feature.premium && !canEdit()}
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <span>{feature.name}</span>
                                      {feature.premium && !canEdit() && (
                                        <Crown className="w-3 h-3 text-amber-500" />
                                      )}
                                    </div>
                                  </Button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      {/* Studio Actions */}
                      <div className="space-y-2 mt-6">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Studio Actions</h3>
                        <Button variant="outline" size="sm" className="w-full justify-start">
                          <Save className="w-4 h-4 mr-2" />
                          Save Avatar
                        </Button>
                        <Button variant="outline" size="sm" className="w-full justify-start">
                          <Download className="w-4 h-4 mr-2" />
                          Export Avatar
                        </Button>
                        <Button variant="outline" size="sm" className="w-full justify-start">
                          <RotateCw className="w-4 h-4 mr-2" />
                          Reset All
                        </Button>
                        <Button variant="outline" size="sm" className="w-full justify-start">
                          <Settings className="w-4 h-4 mr-2" />
                          Studio Settings
                        </Button>
                      </div>
                      
                      {/* Plan Info in Mobile */}
                      <Card className="mt-6">
                        <CardContent className="p-4">
                          <div className="text-center space-y-3">
                            <div className="text-sm text-gray-600 dark:text-gray-400">Current Plan</div>
                            <Badge variant="default" className="text-xs font-medium">
                              {currentPlan?.name || "Free"} Plan
                            </Badge>
                            <div className="text-xs text-gray-500">
                              {getMorphPointCount()} morphing points available
                            </div>
                            {!canEdit() && (
                              <Button size="sm" className="w-full">
                                Upgrade Plan
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </SheetContent>
                </Sheet>
              )}

              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Palette className="w-4 h-4 text-white" />
                </div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Avatar Studio</h1>
              </div>
              
              {!isMobile && (
                <Badge variant="outline" className="text-xs">
                  {getMorphPointCount()} Points Available
                </Badge>
              )}
            </div>

            <div className="flex items-center space-x-3">
              {/* Device Preview Toggle - Hidden on mobile */}
              {!isMobile && (
                <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                  {[
                    { mode: "desktop", icon: Monitor },
                    { mode: "tablet", icon: Tablet },
                    { mode: "mobile", icon: Smartphone }
                  ].map(({ mode, icon: Icon }) => (
                    <Button
                      key={mode}
                      variant={devicePreview === mode ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setDevicePreview(mode as any)}
                      className="w-8 h-8 p-0"
                    >
                      <Icon className="w-4 h-4" />
                    </Button>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <Button
                variant={isRecording ? "destructive" : "default"}
                size="sm"
                onClick={() => setIsRecording(!isRecording)}
                className={`flex items-center space-x-2 ${isMobile ? "px-3" : ""}`}
              >
                {isRecording ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {!isMobile && <span>{isRecording ? "Stop" : "Record"}</span>}
              </Button>

              {!isMobile && (
                <>
                  <Button variant="outline" size="sm">
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>

                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.header>

      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${isMobile ? 'py-4' : 'py-8'}`}>
        <div className={`grid gap-6 ${isMobile ? 'grid-cols-1 space-y-0' : 'grid-cols-12'}`}>
          
          {/* Desktop Sidebar - Hidden on mobile */}
          {!isMobile && (
            <motion.div 
              className="col-span-3"
              variants={itemVariants}
            >
              <Card className="bg-white/20 dark:bg-gray-900/20 backdrop-blur-sm border-white/20 h-fit sticky top-24">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-900 dark:text-white uppercase tracking-wide">
                    Avatar Features
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <MobileNavigation />
                </CardContent>
              </Card>

              {/* Plan Info */}
              <Card className="bg-white/20 dark:bg-gray-900/20 backdrop-blur-sm border-white/20 mt-4">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <Badge className={
                      currentPlan?.id === "free" ? "bg-gray-600" : 
                      currentPlan?.id === "reply_guy" ? "bg-blue-600" : 
                      currentPlan?.id === "spartan" ? "bg-purple-600" : 
                      currentPlan?.id === "zeus" ? "bg-yellow-600" : 
                      "bg-gradient-to-r from-purple-600 to-pink-600"
                    }>
                      {currentPlan?.name || "Free"} Plan
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                      {getMorphPointCount()} morph points available
                    </div>
                    {!canEdit() && (
                      <Button size="sm" className="w-full" variant="outline">
                        Upgrade Plan
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Main Content Area */}
          <motion.div 
            className={isMobile ? "order-1" : "col-span-6"}
            variants={itemVariants}
          >
            <Card className={`bg-white/20 dark:bg-gray-900/20 backdrop-blur-sm border-white/20 ${isMobile ? "h-[350px] mb-0" : "h-[500px] my-4"}`}>
              <CardContent className="h-full p-0 relative">
                <div className="relative w-full h-full bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-lg overflow-hidden">
                  {/* 3D Model Viewer */}
                  {selectedAvatar ? (
                    <div 
                      className="w-full h-full"
                      dangerouslySetInnerHTML={{
                        __html: `<model-viewer
                          id="live-avatar-editor"
                          src="${selectedAvatar.modelUrl}"
                          alt="3D Avatar Model"
                          camera-controls
                          environment-image="neutral"
                          shadow-intensity="1"
                          exposure="1"
                          tone-mapping="commerce"
                          camera-orbit="0deg 75deg 1.5m"
                          interpolation-decay="200"
                          style="width: 100%; height: 100%; transition: all 0.3s ease;"
                          onload="window.initializeViewer && window.initializeViewer()"
                        >
                          <button class="hotspot" slot="hotspot-eye" data-position="0.02 1.56 0.08" data-normal="0 1 0" data-feature="eyeSize" style="background: #45b7d1; border: 3px solid white; border-radius: 50%; width: 24px; height: 24px; box-shadow: 0 0 20px #45b7d1; display: none;">
                            <div class="annotation">EYE SIZE</div>
                          </button>
                          
                          <button class="hotspot" slot="hotspot-nose" data-position="0 1.45 0.12" data-normal="0 0 1" data-feature="noseWidth" style="background: #9b59b6; border: 3px solid white; border-radius: 50%; width: 24px; height: 24px; box-shadow: 0 0 20px #9b59b6; display: none;">
                            <div class="annotation">NOSE WIDTH</div>
                          </button>
                          
                          <button class="hotspot" slot="hotspot-mouth" data-position="0 1.35 0.1" data-normal="0 0 1" data-feature="mouthShape" style="background: #ff6b6b; border: 3px solid white; border-radius: 50%; width: 24px; height: 24px; box-shadow: 0 0 20px #ff6b6b; display: none;">
                            <div class="annotation">MOUTH SHAPE</div>
                          </button>
                          
                          <button class="hotspot" slot="hotspot-jaw" data-position="0 1.25 0.08" data-normal="0 -1 0" data-feature="jawLine" style="background: #f39c12; border: 3px solid white; border-radius: 50%; width: 24px; height: 24px; box-shadow: 0 0 20px #f39c12; display: none;">
                            <div class="annotation">JAW LINE</div>
                          </button>
                          
                          <button class="hotspot" slot="hotspot-cheek" data-position="0.08 1.48 0.05" data-normal="1 0 0" data-feature="cheekBones" style="background: #e74c3c; border: 3px solid white; border-radius: 50%; width: 24px; height: 24px; box-shadow: 0 0 20px #e74c3c; display: none;">
                            <div class="annotation">CHEEK BONES</div>
                          </button>
                        </model-viewer>`
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center space-y-4">
                        <div className="w-20 h-20 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto flex items-center justify-center">
                          <Camera className="w-10 h-10 text-gray-500" />
                        </div>
                        <div>
                          <p className="text-base font-medium text-gray-700 dark:text-gray-300">Select Avatar to Begin</p>
                          <p className="text-sm text-gray-500">Choose from the avatar selection above</p>
                        </div>
                        <Button onClick={() => setShowAvatarSelector(true)} variant="outline" size="sm">
                          Select Avatar
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Top Controls */}
                  <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
                    {/* Left Controls */}
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setIsFullscreen(true)}
                        className="bg-white/90 hover:bg-white dark:bg-gray-800/90 dark:hover:bg-gray-800 backdrop-blur-sm"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowAvatarSelector(true)}
                        className="bg-white/90 hover:bg-white dark:bg-gray-800/90 dark:hover:bg-gray-800 backdrop-blur-sm"
                      >
                        <Users className="w-4 h-4 mr-1" />
                        {selectedAvatar ? `Avatar #${selectedAvatar.id}` : "Select Avatar"}
                      </Button>
                    </div>

                    {/* Right Controls */}
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="bg-white/90 hover:bg-white dark:bg-gray-800/90 dark:hover:bg-gray-800 backdrop-blur-sm"
                    >
                      <RotateCw className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Recording Indicator */}
                  {isRecording && (
                    <div className="absolute top-16 left-4 flex items-center space-x-2 bg-red-500 text-white px-3 py-1 rounded-full">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      <span className="text-xs font-medium">Recording</span>
                    </div>
                  )}

                  {/* Device Frame */}
                  {!isMobile && devicePreview !== "desktop" && (
                    <div className="absolute inset-0 pointer-events-none">
                      <div className={`w-full h-full border-8 rounded-lg ${
                        devicePreview === "mobile" ? "border-gray-800" : "border-gray-600"
                      }`}></div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Controls Panel */}
          <motion.div 
            className={isMobile ? "order-2" : "col-span-3"}
            variants={itemVariants}
          >
            {selectedFeature ? (
              <Card className="bg-white/20 dark:bg-gray-900/20 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <Sliders className="w-5 h-5" />
                    <span>
                      {featureCategories[selectedCategory]?.features
                        .find(f => f.id === selectedFeature)?.name || "Feature"}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedCategory === 'rigging' ? (
                    // Rigging-specific controls
                    <>
                      {selectedFeature === 'tracking' && (
                        <div className="space-y-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium">Body Tracking</label>
                              <Switch 
                                checked={rigConfig.bodyTracking}
                                onCheckedChange={(checked) => handleRigConfigChange('bodyTracking', checked)}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium">Face Tracking</label>
                              <Switch 
                                checked={rigConfig.faceTracking}
                                onCheckedChange={(checked) => handleRigConfigChange('faceTracking', checked)}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium">Hand Tracking</label>
                              <Switch 
                                checked={rigConfig.handTracking}
                                onCheckedChange={(checked) => handleRigConfigChange('handTracking', checked)}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium">Eye Tracking</label>
                              <Switch 
                                checked={rigConfig.eyeTracking}
                                onCheckedChange={(checked) => handleRigConfigChange('eyeTracking', checked)}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {selectedFeature === 'sensitivity' && (
                        <div className="space-y-4">
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <label className="text-sm font-medium">Expression Strength</label>
                                <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                                  {rigConfig.expressionStrength}%
                                </span>
                              </div>
                              <Slider
                                value={[rigConfig.expressionStrength]}
                                max={100}
                                step={1}
                                onValueChange={(value) => handleRigConfigChange('expressionStrength', value[0])}
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <label className="text-sm font-medium">Body Stiffness</label>
                                <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                                  {rigConfig.bodyStiffness}%
                                </span>
                              </div>
                              <Slider
                                value={[rigConfig.bodyStiffness]}
                                max={100}
                                step={1}
                                onValueChange={(value) => handleRigConfigChange('bodyStiffness', value[0])}
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <label className="text-sm font-medium">Head Stiffness</label>
                                <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                                  {rigConfig.headStiffness}%
                                </span>
                              </div>
                              <Slider
                                value={[rigConfig.headStiffness]}
                                max={100}
                                step={1}
                                onValueChange={(value) => handleRigConfigChange('headStiffness', value[0])}
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <label className="text-sm font-medium">Arm Stiffness</label>
                                <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                                  {rigConfig.armStiffness}%
                                </span>
                              </div>
                              <Slider
                                value={[rigConfig.armStiffness]}
                                max={100}
                                step={1}
                                onValueChange={(value) => handleRigConfigChange('armStiffness', value[0])}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {selectedFeature === 'finalize' && (
                        <div className="space-y-4">
                          <div className="space-y-3">
                            <Button 
                              variant="outline" 
                              className="w-full"
                              onClick={handleSaveConfiguration}
                              disabled={saveConfigMutation.isPending}
                            >
                              {saveConfigMutation.isPending ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <Save className="w-4 h-4 mr-2" />
                                  Save Configuration
                                </>
                              )}
                            </Button>
                            
                            <Button 
                              variant="default" 
                              className="w-full"
                              onClick={() => setShowSaveDialog(true)}
                              disabled={!sessionId && !avatarId}
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              Finalize to IPFS
                            </Button>
                            
                            {(sessionId || avatarId) && (
                              <div className="text-xs text-gray-500 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                                {sessionId ? `Session: ${sessionId}` : `Avatar ID: ${avatarId}`}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    // Original morph controls for other categories
                    featureCategories[selectedCategory]?.features
                      .find(f => f.id === selectedFeature)?.points.map((point, index) => {
                        const morphKey = point.toLowerCase().replace(/\s+/g, '');
                        const currentValue = morphValues[morphKey] || 50;
                        
                        const isBeingAdjusted = activeMorphAdjustments.has(morphKey);
                        const isHotspot = availableMorphTargets.includes(morphKey);
                        
                        return (
                          <div key={point} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <label className={`text-sm font-medium transition-all duration-300 ${
                                  isBeingAdjusted ? 'text-cyan-300' : 'text-gray-700 dark:text-gray-300'
                                }`}>
                                  {point}
                                </label>
                                {isHotspot && (
                                  <div className={`h-2 w-2 rounded-full transition-all duration-300 ${
                                    isBeingAdjusted ? 'bg-cyan-400 scale-125 animate-pulse' : 'bg-green-500'
                                  }`} />
                                )}
                                {isBeingAdjusted && (
                                  <div className="text-xs px-2 py-1 bg-cyan-500/20 text-cyan-300 rounded-full animate-pulse">
                                    LIVE
                                  </div>
                                )}
                              </div>
                              <span className={`text-xs font-mono px-2 py-1 rounded transition-all duration-300 ${
                                isBeingAdjusted 
                                  ? 'text-cyan-300 bg-cyan-500/20 font-bold' 
                                  : 'text-gray-500 bg-gray-100 dark:bg-gray-800'
                              }`}>
                                {currentValue}%
                              </span>
                            </div>
                            <div className="relative">
                              <Slider
                                value={[currentValue]}
                                max={100}
                                step={1}
                                className={`w-full transition-all duration-300 ${
                                  isBeingAdjusted ? 'scale-105' : ''
                                }`}
                                disabled={!canEdit()}
                                onValueChange={(value) => {
                                  const newValue = value[0];
                                  setMorphValues(prev => ({ ...prev, [morphKey]: newValue }));
                                  applyMorphValue(morphKey, newValue);
                                }}
                              />
                              {isBeingAdjusted && (
                                <div className="absolute -inset-2 border border-cyan-400/30 rounded-lg animate-pulse" />
                              )}
                            </div>
                            {isBeingAdjusted && (
                              <div className="text-xs text-cyan-400 flex items-center gap-1">
                                <div className="h-1 w-1 bg-cyan-400 rounded-full animate-ping" />
                                Adjusting {point.toLowerCase()}...
                              </div>
                            )}
                          </div>
                        );
                      })
                  )}

                  <Separator />

                  <div className="space-y-2">
                    <Button variant="default" className="w-full" disabled={!canEdit()}>
                      Apply Changes
                    </Button>
                    <Button variant="outline" className="w-full">
                      Reset Feature
                    </Button>
                  </div>

                  {!canEdit() && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                      <div className="flex items-start space-x-2">
                        <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                        <div className="text-xs text-amber-700 dark:text-amber-300">
                          Upgrade to edit morph points and unlock advanced features.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Morph Target Detection Status */}
                  {selectedAvatar && (
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Morph Targets:</span>
                          <span className="text-blue-600 dark:text-blue-400">
                            {availableMorphTargets.length} detected
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Mapped Features:</span>
                          <span className="text-green-600 dark:text-green-400">
                            {Object.keys(morphTargetMapping).length} / {Object.keys(morphValues).length}
                          </span>
                        </div>
                        {availableMorphTargets.length > 0 && (
                          <div className="text-gray-500 dark:text-gray-400 mt-1">
                            Available: {availableMorphTargets.slice(0, 3).join(', ')}
                            {availableMorphTargets.length > 3 && `... +${availableMorphTargets.length - 3} more`}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-white/20 dark:bg-gray-900/20 backdrop-blur-sm border-white/20">
                <CardContent className="p-4 text-center space-y-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mx-auto flex items-center justify-center">
                    <Pencil className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Choose Edit Mode</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {isMobile ? "Use the edit menu to select features" : "Select features to begin editing"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Morph Point & Lighting Tools */}
            {(!isMobile || selectedFeature) && (
              <Card className="bg-white/20 dark:bg-gray-900/20 backdrop-blur-sm border-white/20 mt-4">
                <CardHeader>
                  <CardTitle className="text-base">Tools</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Settings className="w-4 h-4 mr-2" />
                    Morph Presets
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Zap className="w-4 h-4 mr-2" />
                    Auto Lighting
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Target className="w-4 h-4 mr-2" />
                    Symmetry Mode
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Grid3X3 className="w-4 h-4 mr-2" />
                    Reset All
                  </Button>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </div>
      </div>

      {/* Sliding Main App Bottom Navigation */}
      <motion.div
        initial={{ y: 0 }}
        animate={{ y: bottomMenuOpen ? 0 : 70 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed bottom-0 left-0 right-0 z-50"
      >
        {/* File Tab Style Toggle Button - Always above menu */}
        <div className="absolute right-4 -top-8 z-10">
          <Button
            onClick={() => setBottomMenuOpen(!bottomMenuOpen)}
            size="sm"
            className="h-8 px-3 bg-blue-600 hover:bg-blue-700 border border-blue-500 rounded-t-lg rounded-b-none shadow-lg transition-colors"
          >
            {bottomMenuOpen ? (
              <ChevronDown className="w-4 h-4 text-white" />
            ) : (
              <ChevronUp className="w-4 h-4 text-white" />
            )}
          </Button>
        </div>
        
        {/* Bottom Navigation Only */}
        <nav className="bg-gradient-to-t from-background/95 via-primary/5 to-background/70 backdrop-blur-xl border-t border-primary/20 p-1 shadow-2xl shadow-primary/10">
          <div className="flex justify-around items-center">
            <Link href="/" className={`flex flex-col items-center p-2 no-underline ${isActive("/") ? "text-primary" : "text-white/70"}`}>
                <i className="ri-home-5-fill text-xl"></i>
                <span className="text-xs mt-1">Home</span>
            </Link>
            {user && (
              <Link href="/dashboard" className={`flex flex-col items-center p-2 no-underline ${isActive("/dashboard") ? "text-primary" : "text-white/70"}`}>
                  <i className="ri-dashboard-fill text-xl"></i>
                  <span className="text-xs mt-1">Dashboard</span>
              </Link>
            )}
            <Link href="/stream" className={`flex flex-col items-center p-2 no-underline ${isActive("/stream") ? "text-primary" : "text-white/70"}`}>
                <i className="ri-vidicon-fill text-xl"></i>
                <span className="text-xs mt-1">Stream</span>
            </Link>
            <Link href="/avatars" className={`flex flex-col items-center p-2 no-underline ${isActive("/avatars") ? "text-primary" : "text-white/70"}`}>
                <i className="ri-user-3-fill text-xl"></i>
                <span className="text-xs mt-1">Avatars</span>
            </Link>
            <Link href="/marketplace" className={`flex flex-col items-center p-2 no-underline ${isActive("/marketplace") ? "text-primary" : "text-white/70"}`}>
                <i className="ri-shopping-bag-3-fill text-xl"></i>
                <span className="text-xs mt-1">Shop</span>
            </Link>
          </div>
        </nav>
      </motion.div>

      {/* Fullscreen Preview Window */}
      {isFullscreen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
        >
          {/* 3D Avatar Preview */}
          <div className="relative w-full h-full">
            <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-black to-gray-900 flex items-center justify-center">
              {/* Avatar Placeholder */}
              <div className="text-center space-y-4">
                <div className="w-32 h-32 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mx-auto flex items-center justify-center">
                  <Eye className="w-16 h-16 text-white" />
                </div>
                <div className="text-white">
                  <h2 className="text-2xl font-bold mb-2">Avatar Preview</h2>
                  <p className="text-gray-300">3D avatar with real-time tracking</p>
                </div>
                
                {/* Camera Tracking Indicator */}
                {cameraTracking && (
                  <div className="flex items-center justify-center space-x-2 text-green-400">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm">Camera Tracking Active</span>
                  </div>
                )}
              </div>

              {/* Live Camera Feed Overlay */}
              {cameraTracking && videoStream && (
                <div className="absolute top-6 right-6 w-64 h-48 bg-black rounded-lg overflow-hidden border-2 border-green-400">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 flex items-center space-x-1 text-green-400">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium">LIVE</span>
                  </div>
                </div>
              )}
            </div>

            {/* Fullscreen Controls */}
            <div className="absolute top-6 left-6 right-6 flex justify-between items-center">
              {/* Exit Fullscreen */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreen(false)}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
              >
                <Minimize className="w-4 h-4 mr-2" />
                Exit Fullscreen
              </Button>

              {/* Camera Tracking Toggle */}
              <Button
                variant={cameraTracking ? "default" : "outline"}
                size="sm"
                onClick={handleCameraTrackingToggle}
                className={`${
                  cameraTracking 
                    ? "bg-green-600 hover:bg-green-700 text-white" 
                    : "bg-white/10 border-white/20 text-white hover:bg-white/20"
                } backdrop-blur-sm`}
              >
                <Camera className="w-4 h-4 mr-2" />
                {cameraTracking ? "Stop Tracking" : "Start Tracking"}
              </Button>
            </div>

            {/* Fullscreen Info Panel */}
            <div className="absolute bottom-6 left-6 right-6">
              <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between text-white">
                    <div>
                      <h3 className="font-medium">Fullscreen Preview Mode</h3>
                      <p className="text-sm text-gray-300">
                        {cameraTracking ? "Real-time camera tracking enabled" : "Click 'Start Tracking' to enable camera"}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">Plan: {currentPlan?.name || "Free"}</div>
                      <div className="text-sm text-gray-400">{getMorphPointCount()} morph points</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </motion.div>
      )}

      {/* Avatar Selection Modal */}
      <Dialog open={showAvatarSelector} onOpenChange={setShowAvatarSelector}>
        <DialogContent className="bg-background/95 backdrop-blur-md border border-border/50 max-w-2xl max-h-[90vh] sm:max-h-[80vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="text-center pb-4">
            <DialogTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Select Your Avatar
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Choose an avatar to customize and use in your streaming sessions
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4">
            {sampleAvatars.map((avatar) => (
              <Card
                key={avatar.id}
                className={`cursor-pointer transition-all duration-200 hover:scale-[1.02] aspect-square ${
                  selectedAvatar?.id === avatar.id
                    ? "ring-2 ring-blue-500 bg-blue-500/20 border-blue-500/30"
                    : "bg-muted/30 hover:bg-muted/50 border-border/30 hover:border-border/50"
                }`}
                onClick={() => {
                  setSelectedAvatar(avatar);
                  setShowAvatarSelector(false);
                }}
              >
                <CardContent className="p-3 h-full flex items-center justify-center">
                  <div 
                    className="w-full h-full min-h-[180px]"
                    dangerouslySetInnerHTML={{
                      __html: `<model-viewer
                        src="${avatar.modelUrl}"
                        alt="3D Avatar Model"
                        auto-rotate
                        camera-controls
                        style="width: 100%; height: 100%; min-height: 180px;"
                      ></model-viewer>`
                    }}
                  />
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mt-4 sm:mt-6 pt-4 border-t border-border/30">
            <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
              Select an avatar to start customizing
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowAvatarSelector(false)}
                className="flex-1 sm:flex-none text-sm"
                size="sm"
              >
                Cancel
              </Button>
              <Button 
                asChild
                className="flex-1 sm:flex-none bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-sm"
                size="sm"
              >
                <Link href="/avatars">
                  Create New
                </Link>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Avatar Finalization Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="bg-background/95 backdrop-blur-md border border-border/50 max-w-md">
          <DialogHeader className="text-center pb-4">
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {isSaving ? "Processing Avatar" : "Finalize Avatar"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              {isSaving 
                ? "Your avatar is being processed and saved to IPFS..."
                : "Save your rigged avatar with all configurations to IPFS for permanent storage."
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {isSaving ? (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mx-auto flex items-center justify-center mb-4">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">
                    Processing... {saveProgress}%
                  </div>
                  <Progress value={saveProgress} className="w-full" />
                </div>
                
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>• Applying rigging configuration</div>
                  <div>• Optimizing 3D model</div>
                  <div>• Uploading to IPFS</div>
                  <div>• Generating thumbnails</div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-sm">Configuration Summary</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Body Tracking:</span>
                      <span>{rigConfig.bodyTracking ? "Enabled" : "Disabled"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Face Tracking:</span>
                      <span>{rigConfig.faceTracking ? "Enabled" : "Disabled"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expression:</span>
                      <span>{rigConfig.expressionStrength}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Body Stiffness:</span>
                      <span>{rigConfig.bodyStiffness}%</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowSaveDialog(false)}
                    className="flex-1"
                    disabled={finalizeMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleFinalizeAvatar}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    disabled={finalizeMutation.isPending}
                  >
                    {finalizeMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save to IPFS
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}