import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Play, Square, Wifi, WifiOff } from 'lucide-react';

interface SimpleStreamingStudioProps {
  user: any;
}

export const SimpleStreamingStudio: React.FC<SimpleStreamingStudioProps> = ({ user }) => {
  const { toast } = useToast();
  
  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [rtmpUrl, setRtmpUrl] = useState('rtmp://live-api.twitter.com/live');
  const [streamKey, setStreamKey] = useState('');
  
  // Background settings
  const [selectedVirtualBg, setSelectedVirtualBg] = useState('pop-art-bedroom');
  
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamIdRef = useRef<string>('');
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const backgroundImages = useRef<{ [key: string]: HTMLImageElement }>({});

  // Load bedroom images
  useEffect(() => {
    const loadBedroomImages = () => {
      const imageSources = {
        'pop-art-bedroom': '/@fs/home/runner/workspace/attached_assets/3b052c71-59cf-48e3-a3ec-9e238cac1c77.png',
        'neon-graffiti-bedroom': '/@fs/home/runner/workspace/attached_assets/873fe266-5fea-4bfc-b3b1-e10872b96c93.png',
        'warhol-modern-bedroom': '/@fs/home/runner/workspace/attached_assets/73091702-53fb-42a9-9bf7-569be5e06904.png'
      };

      Object.entries(imageSources).forEach(([key, src]) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          backgroundImages.current[key] = img;
          console.log(`✅ Loaded ${key}: ${img.naturalWidth}x${img.naturalHeight}`);
        };
        img.onerror = () => {
          console.error(`❌ Failed to load ${key}`);
        };
        img.src = src;
      });
    };

    loadBedroomImages();
  }, []);

  // Render frame to canvas
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions for streaming
    canvas.width = 1920;
    canvas.height = 1080;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw bedroom background
    const bgImage = backgroundImages.current[selectedVirtualBg];
    if (bgImage && bgImage.complete && bgImage.naturalHeight > 0) {
      ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
    } else {
      // Default black background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Add VIDA³ branding
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('VIDA³ LIVE', canvas.width / 2, 100);
    
    ctx.font = '24px Arial';
    ctx.fillText('Streaming with AI-Powered Virtual Backgrounds', canvas.width / 2, 140);
  }, [selectedVirtualBg]);

  // Start frame capture for streaming
  const startFrameCapture = useCallback(() => {
    if (frameIntervalRef.current) return;

    console.log('🎬 Starting 30fps frame capture for X.com');
    
    frameIntervalRef.current = setInterval(() => {
      if (canvasRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
        try {
          // Render latest frame
          renderFrame();
          
          // Capture as PNG for quality
          const frameData = canvasRef.current.toDataURL('image/png');
          
          // Send to RTMP server
          wsRef.current.send(JSON.stringify({
            type: 'canvas-frame',
            streamId: streamIdRef.current,
            frameData: frameData
          }));

          // Log occasionally
          if (Math.random() < 0.02) {
            console.log(`📡 Sending ${selectedVirtualBg} frame to X.com`);
          }
        } catch (error) {
          console.error('Frame capture error:', error);
        }
      }
    }, 33); // 30 FPS
  }, [renderFrame, selectedVirtualBg]);

  // Stop frame capture
  const stopFrameCapture = useCallback(() => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
      console.log('🛑 Frame capture stopped');
    }
  }, []);

  // Start streaming
  const handleStartStream = useCallback(async () => {
    if (!streamKey.trim()) {
      toast({
        title: "Stream Key Required",
        description: "Please enter your X Studio stream key",
        variant: "destructive",
      });
      return;
    }

    setConnectionStatus('connecting');
    streamIdRef.current = `stream_${Date.now()}`;
    
    // Connect to RTMP server
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/rtmp-relay`;
    
    try {
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('📡 Connected to RTMP relay');
        
        // Send start stream command
        wsRef.current?.send(JSON.stringify({
          type: 'start-rtmp-stream',
          streamId: streamIdRef.current,
          rtmpUrl,
          streamKey: streamKey.trim(),
          userPlan: user?.plan || 'free'
        }));
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'rtmp-stream-ready') {
            setIsStreaming(true);
            setConnectionStatus('connected');
            
            // Start streaming bedroom backgrounds
            setTimeout(() => startFrameCapture(), 500);
            
            toast({
              title: "Stream Started",
              description: `Now streaming ${selectedVirtualBg} to X.com!`,
            });
          } else if (data.type === 'error' || data.type === 'rtmp-stream-failed') {
            setConnectionStatus('error');
            toast({
              title: "Stream Error",
              description: data.error || "Failed to start stream",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      };
      
      wsRef.current.onclose = () => {
        setConnectionStatus('disconnected');
        setIsStreaming(false);
      };
      
      wsRef.current.onerror = () => {
        setConnectionStatus('error');
        toast({
          title: "Connection Error",
          description: "Failed to connect to streaming server",
          variant: "destructive",
        });
      };
      
    } catch (error) {
      setConnectionStatus('error');
      toast({
        title: "Stream Error",
        description: "Failed to initialize stream",
        variant: "destructive",
      });
    }
  }, [streamKey, rtmpUrl, selectedVirtualBg, startFrameCapture, toast, user]);

  // Stop streaming
  const handleStopStream = useCallback(() => {
    setIsStreaming(false);
    setConnectionStatus('disconnected');
    
    // Stop frame capture
    stopFrameCapture();
    
    // Send stop command
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'stop-rtmp-stream',
        streamId: streamIdRef.current
      }));
    }
    
    // Close connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    toast({
      title: "Stream Ended",
      description: "Your stream has been stopped",
    });
  }, [stopFrameCapture, toast]);

  // Render preview continuously
  useEffect(() => {
    const animate = () => {
      renderFrame();
      requestAnimationFrame(animate);
    };
    animate();
  }, [renderFrame]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">VIDA³ Streaming Studio</h1>
        <p className="text-muted-foreground">Stream with AI-powered virtual backgrounds to X.com</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stream Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Stream Preview
              <Badge variant={connectionStatus === 'connected' ? 'default' : 'secondary'}>
                {connectionStatus === 'connected' ? (
                  <><Wifi className="w-4 h-4 mr-1" /> Live</>
                ) : (
                  <><WifiOff className="w-4 h-4 mr-1" /> Offline</>
                )}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain"
                style={{ backgroundColor: '#000' }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Stream Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Stream Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Background Selection */}
            <div className="space-y-2">
              <Label>Virtual Background</Label>
              <Select value={selectedVirtualBg} onValueChange={setSelectedVirtualBg}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pop-art-bedroom">Pop Art Bedroom</SelectItem>
                  <SelectItem value="neon-graffiti-bedroom">Neon Graffiti Bedroom</SelectItem>
                  <SelectItem value="warhol-modern-bedroom">Warhol Modern Bedroom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* RTMP Settings */}
            <div className="space-y-2">
              <Label>RTMP URL</Label>
              <Input
                value={rtmpUrl}
                onChange={(e) => setRtmpUrl(e.target.value)}
                disabled={isStreaming}
              />
            </div>

            <div className="space-y-2">
              <Label>Stream Key</Label>
              <Input
                type="password"
                value={streamKey}
                onChange={(e) => setStreamKey(e.target.value)}
                placeholder="Enter your X Studio stream key"
                disabled={isStreaming}
              />
            </div>

            {/* Stream Controls */}
            <div className="pt-4">
              {!isStreaming ? (
                <Button 
                  onClick={handleStartStream}
                  className="w-full"
                  disabled={!streamKey.trim() || connectionStatus === 'connecting'}
                >
                  <Play className="w-4 h-4 mr-2" />
                  {connectionStatus === 'connecting' ? 'Connecting...' : 'Start Stream'}
                </Button>
              ) : (
                <Button 
                  onClick={handleStopStream}
                  variant="destructive"
                  className="w-full"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Stop Stream
                </Button>
              )}
            </div>

            {/* Stream Info */}
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• Resolution: 1920x1080 at 30fps</p>
              <p>• Quality: {user?.plan === 'goat' ? '1080p' : user?.plan === 'starter' ? '720p' : '480p'}</p>
              <p>• Get your stream key from X Studio</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};