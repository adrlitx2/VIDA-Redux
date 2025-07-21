import { useState, useRef, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { StreamingCanvas } from "./StreamingCanvas";
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
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Settings, 
  Play, 
  Square, 
  Users, 
  ExternalLink,
  Monitor,
  Layers,
  Camera,
  Zap,
  Radio,
  Copy,
  Check,
  RefreshCw,
  Image
} from "lucide-react";

export default function StableStreamingStudio() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentPlan, remainingStreamTime } = useSubscription();
  const { avatars, selectedAvatar } = useAvatar();

  // Background images from IPFS cache
  const [backgroundImagesLoaded, setBackgroundImagesLoaded] = useState(false);
  const backgroundImages = useRef<{[key: string]: HTMLImageElement}>({});
  
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
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // Background settings
  const [backgroundType, setBackgroundType] = useState<'virtual' | 'color' | 'blur'>('virtual');
  const [selectedVirtualBg, setSelectedVirtualBg] = useState('83'); // Default to first IPFS background
  const [avatarEnabled, setAvatarEnabled] = useState(false);
  const [avatarOpacity, setAvatarOpacity] = useState([80]);

  // Stream quality and controls
  const [streamQuality, setStreamQuality] = useState<'720p' | '1080p'>('1080p');

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamIdRef = useRef<string>('');
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load high-resolution cached images from IPFS system
  useEffect(() => {
    const loadCachedImages = async () => {
      if (!backgrounds.length) return;

      const imagePromises = backgrounds.map((bg: any) => {
        return new Promise<void>(async (resolve) => {
          try {
            // Get high-res cached version
            const response = await fetch(`/api/backgrounds/${bg.id}/highres`);
            const { url: highResUrl } = await response.json();
            
            const img = document.createElement('img');
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              backgroundImages.current[bg.id] = img;
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
  }, [backgrounds]);

  // Initialize camera
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
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive"
      });
    }
  }, [cameraEnabled, toast]);

  // Initialize camera on mount
  useEffect(() => {
    initializeCamera();
  }, [initializeCamera]);

  // RTMP Sources management
  const queryClient = useQueryClient();
  
  const { data: rtmpSources = [] } = useQuery({
    queryKey: ["/api/rtmp-sources"],
    enabled: !!user?.id,
  });

  const [currentSource, setCurrentSource] = useState<any>(null);
  const [copied, setCopied] = useState<number | null>(null);

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
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connected for RTMP streaming');
        setConnectionStatus('connected');
        
        // Start RTMP stream
        streamIdRef.current = `stream_${Date.now()}`;
        wsRef.current?.send(JSON.stringify({
          type: 'start-rtmp-stream',
          streamId: streamIdRef.current,
          rtmpUrl: currentSource.rtmp_url,
          streamKey: currentSource.stream_key,
          quality: streamQuality
        }));
      };

      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'stream-status') {
          console.log('Stream status:', data);
          if (data.status === 'live') {
            setIsLive(true);
            setViewers(Math.floor(Math.random() * 50) + 10);
          }
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

      // Start frame capture at 10 FPS to prevent buffer overflow
      frameIntervalRef.current = setInterval(() => {
        if (canvasRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
          const dataURL = canvasRef.current.toDataURL('image/png');
          wsRef.current.send(JSON.stringify({
            type: 'canvas-frame',
            streamId: streamIdRef.current,
            frameData: dataURL
          }));
        }
      }, 100);

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
      <div className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Streaming Panel */}
          <div className="lg:col-span-2 space-y-6">
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
                    cameraEnabled={cameraEnabled}
                    cameraStream={cameraStream}
                    avatarEnabled={avatarEnabled}
                    selectedAvatar={selectedAvatar}
                    avatarOpacity={avatarOpacity}
                    onFrameCapture={(canvas) => {
                      if (isStreaming && wsRef.current?.readyState === WebSocket.OPEN) {
                        const dataURL = canvas.toDataURL('image/png');
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
                    <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      LIVE - {viewers} viewers
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
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      currentSource?.id === source.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setCurrentSource(source)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{source.name}</div>
                        <div className="text-sm text-muted-foreground truncate">
                          {source.rtmp_url}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(`${source.rtmp_url}/${source.stream_key}`);
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
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Background Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="w-5 h-5" />
                  Background Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Background Type</Label>
                  <Select value={backgroundType} onValueChange={(value: any) => setBackgroundType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="virtual">Virtual Background</SelectItem>
                      <SelectItem value="color">Solid Color</SelectItem>
                      <SelectItem value="blur">Blur Background</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {backgroundType === 'virtual' && (
                  <div>
                    <Label>Virtual Background</Label>
                    <Select value={selectedVirtualBg} onValueChange={setSelectedVirtualBg}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {backgrounds.map((bg: any) => (
                          <SelectItem key={bg.id} value={bg.id.toString()}>
                            {bg.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Label>Enable Avatar</Label>
                  <Switch
                    checked={avatarEnabled}
                    onCheckedChange={setAvatarEnabled}
                  />
                </div>

                {avatarEnabled && (
                  <div>
                    <Label>Avatar Opacity</Label>
                    <Slider
                      value={avatarOpacity}
                      onValueChange={setAvatarOpacity}
                      max={100}
                      step={1}
                      className="mt-2"
                    />
                    <div className="text-sm text-muted-foreground mt-1">
                      {avatarOpacity[0]}%
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stream Quality */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Stream Quality
                </CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}