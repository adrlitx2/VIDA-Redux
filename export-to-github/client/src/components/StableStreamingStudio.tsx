import { useState, useRef, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { StreamingCanvas } from "./StreamingCanvas";
import { RTMPSourceManager } from "./RTMPSourceManager";
import { BackgroundSettingsPanel } from "./BackgroundSettingsPanel";
import { StreamAvatarSelector } from "./StreamAvatarSelector";
// Unified streaming solution - all methods consolidated
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { useAvatar } from "@/hooks/use-avatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Settings,
  Zap, 
  Play, 
  Square, 
  Users, 
  ExternalLink,
  Monitor,
  Layers,
  Camera,
  Radio,
  Copy,
  Check,
  Edit,
  Trash2,
  RefreshCw,
  Image,
  Upload
} from "lucide-react";

export default function StableStreamingStudio() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentPlan, remainingStreamTime } = useSubscription();
  
  // Avatar state management
  const [selectedAvatar, setSelectedAvatar] = useState<any>(null);
  const [selectedAvatarType, setSelectedAvatarType] = useState<'user' | 'preset'>('user');

  // Background images from IPFS cache
  const [backgroundImagesLoaded, setBackgroundImagesLoaded] = useState(false);
  const [backgroundImages, setBackgroundImages] = useState<{[key: string]: HTMLImageElement}>({});
  
  // Fetch backgrounds from API to get cached high-res URLs
  const { data: backgrounds = [] } = useQuery({
    queryKey: ['/api/backgrounds'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [viewers, setViewers] = useState(0);

  // Video/Audio controls
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // Background settings
  const [backgroundType, setBackgroundType] = useState<'virtual' | 'color' | 'blur'>('virtual');
  const [selectedVirtualBg, setSelectedVirtualBg] = useState('');
  const [solidColor, setSolidColor] = useState('#F4D03F'); // BAYC Gold default

  // Auto-optimize bitrate settings
  const [autoOptimizeBitrate, setAutoOptimizeBitrate] = useState(true);
  const [streamQuality, setStreamQuality] = useState<'720p' | '1080p'>('1080p');

  // Calculate optimal bitrate based on subscription tier and quality
  const getOptimalBitrate = useCallback((sourceName: string, quality: '720p' | '1080p' = streamQuality) => {
    const userPlan = user?.supabaseUser?.user_metadata?.plan || 'free';
    
    // Bitrate limits by subscription tier
    const tierLimits = {
      'free': { '720p': 2500, '1080p': 4000 },
      'starter': { '720p': 3500, '1080p': 5500 },
      'goat': { '720p': 6000, '1080p': 9000 }
    };

    // Return tier limit based on user plan
    const limit = tierLimits[userPlan as keyof typeof tierLimits] || tierLimits.free;
    return limit[quality];
  }, [user, streamQuality]);

  // Daily random background selection based on user's subscription tier
  const getDailyRandomBackground = useCallback(() => {
    if (!Array.isArray(backgrounds) || backgrounds.length === 0 || !user?.id) return null;

    // Create a daily seed based on user ID and current date
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const seed = `${user.id}-${today}`;
    
    // Simple hash function for consistent daily randomization
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Define plan hierarchy for background access - each tier includes all lower tiers
    const planHierarchy = ['free', 'starter', 'goat'];
    // Use user metadata plan directly since that's where the actual plan is stored
    const userPlanString = user?.supabaseUser?.user_metadata?.plan || user?.plan || 'free';
    const userPlanIndex = planHierarchy.indexOf(userPlanString);
    
    // Include current plan and all lower-tier plans
    const accessiblePlans = planHierarchy.slice(0, userPlanIndex + 1);
    
    console.log(`🔍 Plan access debug: user plan="${userPlanString}", accessible plans=[${accessiblePlans.join(', ')}]`);

    // Filter backgrounds by user's subscription tier access
    // Users can access their tier + all lower tiers (free is included in all)
    const accessibleBackgrounds = (backgrounds as any[]).filter((bg: any) => {
      const requiredPlan = bg.required_plan || 'free';
      return accessiblePlans.includes(requiredPlan);
    });
    
    console.log(`🎯 Found ${accessibleBackgrounds.length} accessible backgrounds out of ${backgrounds.length} total`);

    if (accessibleBackgrounds.length === 0) return null;

    // Use hash to select background consistently for the day
    const index = Math.abs(hash) % accessibleBackgrounds.length;
    return accessibleBackgrounds[index];
  }, [backgrounds, user?.id, currentPlan]);

  const [avatarEnabled, setAvatarEnabled] = useState(false);
  const [avatarOpacity, setAvatarOpacity] = useState([80]);

  // Set daily random background on component mount
  useEffect(() => {
    if (Array.isArray(backgrounds) && backgrounds.length > 0 && user?.id && !selectedVirtualBg) {
      const dailyBackground = getDailyRandomBackground();
      if (dailyBackground) {
        setSelectedVirtualBg(dailyBackground.id.toString());
        setBackgroundType('virtual');
        console.log(`🎲 Daily background selected: ${dailyBackground.name} (ID: ${dailyBackground.id}) from category: ${dailyBackground.category}`);
      }
    }
  }, [backgrounds, user?.id, selectedVirtualBg, getDailyRandomBackground]);

  // Scene lighting state
  const [sceneLighting, setSceneLighting] = useState({
    brightness: 75,
    contrast: 50,
    warmth: 60,
    saturation: 80,
    lightAngle: 45,
    lightIntensity: 70
  });

  // Stream quality and controls

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamIdRef = useRef<string>('');
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // RTMP Sources management
  const queryClient = useQueryClient();
  
  const { data: rtmpSources = [] } = useQuery({
    queryKey: ["/api/rtmp-sources"],
    enabled: !!user?.id,
  });

  const [currentSource, setCurrentSource] = useState<any>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [editingSource, setEditingSource] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Select first source by default
  useEffect(() => {
    if (rtmpSources.length > 0 && !currentSource) {
      setCurrentSource(rtmpSources[0]);
    }
  }, [rtmpSources, currentSource]);

  const createSourceMutation = useMutation({
    mutationFn: async (sourceData: any) => {
      return await apiRequest("POST", "/api/rtmp-sources", sourceData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rtmp-sources"] });
      toast({
        title: "RTMP Source Added",
        description: "New streaming destination has been configured.",
      });
    },
  });

  const updateSourceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await apiRequest("PUT", `/api/rtmp-sources/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rtmp-sources"] });
      toast({
        title: "RTMP Source Updated",
        description: "Streaming destination has been updated.",
      });
    },
  });

  const deleteSourceMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/rtmp-sources/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rtmp-sources"] });
      toast({
        title: "RTMP Source Deleted",
        description: "Streaming destination has been removed.",
      });
    },
  });

  // Load high-resolution cached images from IPFS system (only once)
  useEffect(() => {
    const loadCachedImages = async () => {
      if (!backgrounds.length || backgroundImagesLoaded) return;

      const imagePromises = backgrounds.map((bg: any) => {
        return new Promise<void>(async (resolve) => {
          try {
            // Skip if already loaded
            if (backgroundImages[bg.id.toString()]) {
              resolve();
              return;
            }
            
            // Get high-res cached version
            const response = await fetch(`/api/backgrounds/${bg.id}/highres`);
            const { url: highResUrl } = await response.json();
            
            const img = document.createElement('img');
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              setBackgroundImages(prev => ({
                ...prev,
                [bg.id.toString()]: img
              }));
              console.log(`✅ Loaded cached ${bg.name}: ${img.naturalWidth}x${img.naturalHeight}`);
              resolve();
            };
            img.onerror = () => {
              console.error(`❌ Failed to load cached ${bg.name}`);
              resolve();
            };
            img.src = highResUrl;
          } catch (error) {
            console.error(`❌ Failed to fetch high-res for ${bg.name}:`, error);
            resolve();
          }
        });
      });
      
      await Promise.all(imagePromises);
      setBackgroundImagesLoaded(true);
      console.log('🎨 All IPFS cached images ready for streaming');
    };
    
    loadCachedImages();
  }, [backgrounds, backgroundImagesLoaded]);

  // Initialize camera (optional for streaming)
  const initializeCamera = useCallback(async () => {
    if (!cameraEnabled) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        setCameraStream(null);
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720 }, 
        audio: false 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraStream(stream);
        await videoRef.current.play();
      }
      
      toast({
        title: "Camera Connected",
        description: "Camera successfully initialized for streaming.",
      });
    } catch (error) {
      console.log("Camera not available - streaming will work with virtual backgrounds only");
      // Don't show error toast, just silently disable camera
      setCameraEnabled(false);
      setCameraStream(null);
    }
  }, [cameraEnabled, toast]);

  // Initialize camera on mount (non-blocking)
  useEffect(() => {
    if (cameraEnabled) {
      initializeCamera();
    }
  }, [initializeCamera]);

  // Stream controls
  const handleStartStream = useCallback(async () => {
    if (!currentSource) {
      toast({
        title: "No RTMP Source Selected",
        description: "Please select an RTMP source first",
        variant: "destructive"
      });
      return;
    }

    setIsStreaming(true);
    setIsLive(true);
    setConnectionStatus('connecting');

    // Create WebSocket connection for RTMP streaming
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/rtmp-relay`;
    
    try {
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connected for RTMP streaming');
        setConnectionStatus('connecting');
        
        // Start RTMP stream
        streamIdRef.current = `stream_${Date.now()}`;
        
        // Calculate bitrate based on auto-optimize setting
        const bitrate = autoOptimizeBitrate 
          ? getOptimalBitrate(currentSource.name, streamQuality)
          : parseInt(currentSource.bitrate) || getOptimalBitrate(currentSource.name, streamQuality);
          
        wsRef.current?.send(JSON.stringify({
          type: 'start-webrtc-stream',
          streamId: streamIdRef.current,
          rtmpUrl: currentSource.url || currentSource.rtmp_url,
          streamKey: currentSource.stream_key,
          quality: streamQuality,
          bitrate: bitrate,
          userPlan: user?.supabaseUser?.user_metadata?.plan || user?.plan || 'free'
        }));
        
        console.log(`🚀 Starting stream to ${currentSource.name} with quality: ${streamQuality}, bitrate: ${bitrate}k (${autoOptimizeBitrate ? 'auto-optimized' : 'manual'})`);
      };

      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('WebSocket message:', data);
        
        switch (data.type) {
          case 'webrtc-stream-ready':
            setConnectionStatus('connected');
            setIsLive(true);
            toast({
              title: "Stream Live",
              description: `Successfully streaming to ${currentSource.name}`,
            });
            break;
            
          case 'webrtc-stream-error':
            console.error('Stream error details:', data);
            setConnectionStatus('error');
            setIsStreaming(false);
            setIsLive(false);
            toast({
              title: "Stream Failed",
              description: data.error || data.details || "Failed to connect to RTMP server",
              variant: "destructive"
            });
            break;
            
          case 'webrtc-stream-ended':
            setConnectionStatus('error');
            toast({
              title: "Stream Error",
              description: data.error || "Streaming error occurred",
              variant: "destructive"
            });
            break;
            
          case 'stream-status':
            if (data.status === 'live') {
              setIsLive(true);
              setViewers(Math.floor(Math.random() * 50) + 10);
            }
            break;
        }
      };

      wsRef.current.onerror = () => {
        setConnectionStatus('error');
        toast({
          title: "Connection Failed",
          description: "Failed to connect to streaming server",
          variant: "destructive"
        });
      };

      // Start frame capture at 30 FPS for smooth streaming
      frameIntervalRef.current = setInterval(() => {
        if (canvasRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
          // Capture high-quality frame with optimized compression
          const dataURL = canvasRef.current.toDataURL('image/png', 0.95);
          wsRef.current.send(JSON.stringify({
            type: 'canvas-frame',
            streamId: streamIdRef.current,
            frameData: dataURL
          }));
        }
      }, 33); // 30 FPS (1000ms / 30 = 33ms)

      toast({
        title: "Stream Started",
        description: `Streaming to ${currentSource.name}`,
      });
    } catch (error) {
      setConnectionStatus('error');
      toast({
        title: "Stream Failed",
        description: "Failed to start streaming",
        variant: "destructive"
      });
    }
  }, [currentSource, streamQuality, toast]);

  const handleStopStream = useCallback(() => {
    setIsStreaming(false);
    setIsLive(false);
    setConnectionStatus('disconnected');
    setViewers(0);
    
    // Stop frame capture
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    
    // Send stop stream command
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'stop-rtmp-stream',
        streamId: streamIdRef.current
      }));
    }
    
    // Close WebSocket connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    toast({
      title: "Stream Ended",
      description: "Your stream has been stopped.",
    });
  }, [toast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 max-w-7xl">
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Main Streaming Panel */}
          <div className="lg:col-span-2 space-y-4 lg:space-y-6">
            {/* Stream Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="w-5 h-5" />
                  Stream Preview
                  {isLive && (
                    <Badge variant="destructive" className="animate-pulse">
                      <Radio className="w-3 h-3 mr-1" />
                      LIVE
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                  {/* Streaming Canvas - Shows exactly what's sent to RTMP */}
                  <StreamingCanvas
                    width={1920}
                    height={1080}
                    backgroundType={backgroundType}
                    selectedVirtualBg={selectedVirtualBg}
                    solidColor={solidColor}
                    cameraEnabled={cameraEnabled}
                    cameraStream={cameraStream}
                    avatarEnabled={avatarEnabled}
                    selectedAvatar={selectedAvatar}
                    avatarOpacity={avatarOpacity}
                    sceneLighting={sceneLighting}
                    sharedBackgroundImages={backgroundImages}
                    backgroundsLoaded={backgroundImagesLoaded}
                    onFrameCapture={(canvas) => {
                      if (isStreaming && wsRef.current?.readyState === WebSocket.OPEN) {
                        // Get canvas context to verify content quality
                        const ctx = canvas.getContext('2d');
                        const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
                        const hasContent = imageData && Array.from(imageData.data).some(pixel => pixel !== 0);
                        
                        // Only send frames with actual content to prevent flickering
                        if (!hasContent) {
                          console.log('🚫 Skipping empty frame to prevent flickering');
                          return;
                        }
                        
                        // Check if background is properly rendered for virtual backgrounds
                        if (backgroundType === 'virtual' && selectedVirtualBg) {
                          if (!backgroundImagesLoaded || !backgroundImages[selectedVirtualBg]) {
                            console.log('🚫 Skipping frame - background not loaded');
                            return;
                          }
                        }
                        
                        const dataURL = canvas.toDataURL('image/png');
                        
                        // Debug streaming content every few frames
                        if (Math.random() < 0.02) {
                          const centerPixel = ctx?.getImageData(canvas.width/2, canvas.height/2, 1, 1);
                          const [r, g, b] = centerPixel?.data || [0, 0, 0];
                          console.log(`📺 RTMP Send: bg=${backgroundType}, selected=${selectedVirtualBg}, hasContent=${hasContent}, centerRGB(${r},${g},${b}), bgLoaded=${backgroundImagesLoaded}`);
                        }
                        
                        wsRef.current.send(JSON.stringify({
                          type: 'canvas-frame',
                          streamId: streamIdRef.current,
                          frameData: dataURL
                        }));
                      }
                    }}
                  />

                  {/* Hidden canvas for reference */}
                  <canvas
                    ref={canvasRef}
                    className="hidden"
                    width={1920}
                    height={1080}
                  />

                  {/* Camera Video Element */}
                  <video
                    ref={videoRef}
                    className="hidden"
                    autoPlay
                    muted
                    playsInline
                  />

                  {/* Stream status overlay */}
                  {isStreaming && (
                    <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500/90 backdrop-blur-sm text-white px-3 py-2 rounded-full text-sm font-semibold shadow-lg animate-pulse">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      LIVE
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Stream Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Stream Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Unified Streaming Status */}
                {currentSource && (
                  <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Professional Streaming Ready</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                      Unified streaming with optimized bitrate settings
                    </p>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        connectionStatus === 'connected' ? 'bg-green-500' :
                        connectionStatus === 'connecting' ? 'bg-yellow-500' :
                        connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
                      }`} />
                      <span className="text-sm font-medium">
                        {connectionStatus === 'connected' ? 'Live' :
                         connectionStatus === 'connecting' ? 'Connecting...' :
                         connectionStatus === 'error' ? 'Error' : 'Ready'}
                      </span>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2">
                  {!isStreaming ? (
                    <Button 
                      onClick={handleStartStream}
                      disabled={!currentSource}
                      className="flex-1"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Start Stream
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleStopStream}
                      variant="destructive"
                      className="flex-1"
                    >
                      <Square className="w-4 h-4 mr-2" />
                      Stop Stream
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    onClick={() => setCameraEnabled(!cameraEnabled)}
                  >
                    {cameraEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => setMicEnabled(!micEnabled)}
                  >
                    {micEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  </Button>
                </div>

                <div className="text-sm text-muted-foreground">
                  Status: <span className={`font-medium ${
                    connectionStatus === 'connected' ? 'text-green-600' :
                    connectionStatus === 'connecting' ? 'text-yellow-600' :
                    connectionStatus === 'error' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Settings Panel */}
          <div className="space-y-6">
            {/* RTMP Sources */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ExternalLink className="w-5 h-5" />
                  RTMP Destinations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {rtmpSources.map((source: any) => (
                  <div
                    key={source.id}
                    className={`p-3 border rounded-lg transition-colors ${
                      currentSource?.id === source.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => setCurrentSource(source)}
                      >
                        <div className="font-medium">{source.name}</div>
                        <div className="text-sm text-muted-foreground truncate">
                          {source.url}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(`${source.url}/${source.stream_key}`);
                            setCopied(source.id);
                            setTimeout(() => setCopied(null), 2000);
                            toast({
                              title: "Copied",
                              description: "RTMP URL copied to clipboard",
                            });
                          }}
                        >
                          {copied === source.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingSource({
                              id: source.id,
                              name: source.name,
                              rtmp_url: source.url,
                              stream_key: source.stream_key,
                              bitrate: source.bitrate || 2500
                            });
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete "${source.name}"?`)) {
                              deleteSourceMutation.mutate(source.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Add New RTMP Source */}
                <RTMPSourceManager 
                  onSourceAdded={() => {
                    queryClient.invalidateQueries({ queryKey: ["/api/rtmp-sources"] });
                  }}
                />
              </CardContent>
            </Card>



            {/* Avatar Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Avatar Selection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <StreamAvatarSelector
                  selectedAvatarId={selectedAvatar?.id}
                  selectedAvatarType={selectedAvatarType}
                  userPlan={currentPlan?.id || 'free'}
                  onAvatarSelect={(avatar, type) => {
                    setSelectedAvatar(avatar);
                    setSelectedAvatarType(type);
                    toast({
                      title: "Avatar Selected",
                      description: `Selected ${avatar.name} for streaming`,
                    });
                  }}
                  className="max-h-80"
                />
              </CardContent>
            </Card>

            {/* Background Management */}
            <BackgroundSettingsPanel 
              onBackgroundSelected={(backgroundId) => {
                // Handle different background types based on ID format
                if (backgroundId.startsWith('color-')) {
                  // Handle solid color selection
                  const solidColorBackgrounds = [
                    { id: 'color-1', name: 'Deep Navy', color: '#1a1a2e' },
                    { id: 'color-2', name: 'Forest Green', color: '#2d5016' },
                    { id: 'color-3', name: 'Royal Purple', color: '#533483' },
                    { id: 'color-4', name: 'BAYC Orange', color: '#ff6b35' },
                    { id: 'color-5', name: 'Golden Yellow', color: '#f7c52d' },
                    { id: 'color-6', name: 'Ape Brown', color: '#8b4513' },
                    { id: 'color-7', name: 'Crimson Red', color: '#c5282f' },
                    { id: 'color-8', name: 'Pure Black', color: '#000000' },
                  ];
                  
                  const selectedColor = solidColorBackgrounds.find(bg => bg.id === backgroundId);
                  if (selectedColor) {
                    setBackgroundType('color');
                    setSolidColor(selectedColor.color);
                    setSelectedVirtualBg(backgroundId);
                    toast({
                      title: "Background Changed",
                      description: `Switched to ${selectedColor.name}`,
                    });
                  }
                } else if (backgroundId.startsWith('blur-')) {
                  // Handle blur background selection
                  setBackgroundType('blur');
                  setSelectedVirtualBg(backgroundId);
                  toast({
                    title: "Background Changed",
                    description: "Switched to blur background",
                  });
                } else {
                  // Handle virtual/image background selection
                  setBackgroundType('virtual');
                  setSelectedVirtualBg(backgroundId);
                  const selectedBg = backgrounds.find((bg: any) => bg.id.toString() === backgroundId);
                  if (selectedBg) {
                    toast({
                      title: "Background Changed",
                      description: `Switched to ${selectedBg.name}`,
                    });
                  }
                }
              }}
              selectedBackgroundId={selectedVirtualBg}
              onSceneLightingChange={setSceneLighting}
              sceneLighting={sceneLighting}
            />

          </div>

          {/* Controls Sidebar */}
          <div className="space-y-4 lg:space-y-6">
            {/* Stream Quality */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Stream Quality
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Resolution</Label>
                  <Select value={streamQuality} onValueChange={(value: any) => setStreamQuality(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="720p">720p (1280x720)</SelectItem>
                      <SelectItem value="1080p">1080p (1920x1080)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Auto-Optimize Bitrate */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-optimize" className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Auto-Optimize Bitrate
                    </Label>
                    <Switch
                      id="auto-optimize"
                      checked={autoOptimizeBitrate}
                      onCheckedChange={setAutoOptimizeBitrate}
                    />
                  </div>
                  
                  {autoOptimizeBitrate && currentSource && (
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">
                        Optimized Bitrate
                      </div>
                      <div className="font-medium">
                        {getOptimalBitrate(currentSource.name, streamQuality).toLocaleString()} kbps
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Automatically adjusted for quality and plan
                      </div>
                    </div>
                  )}
                  
                  {!autoOptimizeBitrate && (
                    <div className="text-sm text-muted-foreground">
                      Manual bitrate control enabled in RTMP source settings
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit RTMP Source Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit RTMP Source</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Name
              </Label>
              <Input
                id="edit-name"
                value={editingSource?.name || ''}
                onChange={(e) => setEditingSource(prev => ({ ...prev, name: e.target.value }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-url" className="text-right">
                RTMP URL
              </Label>
              <Input
                id="edit-url"
                value={editingSource?.rtmp_url || ''}
                onChange={(e) => setEditingSource(prev => ({ ...prev, rtmp_url: e.target.value }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-key" className="text-right">
                Stream Key
              </Label>
              <Input
                id="edit-key"
                type="password"
                value={editingSource?.stream_key || ''}
                onChange={(e) => setEditingSource(prev => ({ ...prev, stream_key: e.target.value }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-bitrate" className="text-right">
                Bitrate
              </Label>
              <Input
                id="edit-bitrate"
                type="number"
                value={editingSource?.bitrate || 2500}
                onChange={(e) => setEditingSource(prev => ({ ...prev, bitrate: parseInt(e.target.value) }))}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (editingSource) {
                  updateSourceMutation.mutate({
                    id: editingSource.id,
                    data: {
                      name: editingSource.name,
                      url: editingSource.rtmp_url,
                      streamKey: editingSource.stream_key,
                      bitrate: editingSource.bitrate
                    }
                  });
                  setIsEditDialogOpen(false);
                  setEditingSource(null);
                }
              }}
              disabled={updateSourceMutation.isPending}
            >
              {updateSourceMutation.isPending ? 'Updating...' : 'Update Source'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}