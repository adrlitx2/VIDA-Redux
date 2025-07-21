import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Square, Settings } from 'lucide-react';

interface RTMPStreamerProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

export function RTMPStreamer({ canvasRef }: RTMPStreamerProps) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [rtmpUrl, setRtmpUrl] = useState('rtmp://ingest.x.com/live');
  const [streamKey, setStreamKey] = useState('');
  const [streamStatus, setStreamStatus] = useState<'disconnected' | 'connecting' | 'live' | 'error'>('disconnected');
  const [message, setMessage] = useState('');
  
  const wsRef = useRef<WebSocket | null>(null);
  const streamIdRef = useRef<string>('');
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const connectToRTMPServer = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/rtmp-relay`;
    
    wsRef.current = new WebSocket(wsUrl);
    
    wsRef.current.onopen = () => {
      console.log('Connected to RTMP relay server');
      setMessage('Connected to RTMP server');
    };
    
    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleServerMessage(data);
      } catch (error) {
        console.error('Error parsing server message:', error);
      }
    };
    
    wsRef.current.onclose = () => {
      console.log('Disconnected from RTMP relay server');
      setStreamStatus('disconnected');
      setMessage('Disconnected from server');
    };
    
    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setStreamStatus('error');
      setMessage('Connection error');
    };
  }, []);

  const handleServerMessage = (data: any) => {
    switch (data.type) {
      case 'rtmp-stream-ready':
        setStreamStatus('live');
        setMessage('RTMP stream live - sending frames');
        startFrameCapture();
        break;
      case 'rtmp-stream-stopped':
        setStreamStatus('disconnected');
        setMessage('RTMP stream stopped');
        stopFrameCapture();
        break;
      case 'error':
        setStreamStatus('error');
        setMessage(data.message || 'Stream error');
        break;
    }
  };

  const startFrameCapture = () => {
    if (!canvasRef.current || frameIntervalRef.current) return;
    
    console.log('Starting frame capture at 30fps');
    
    frameIntervalRef.current = setInterval(() => {
      if (canvasRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
        try {
          // Capture canvas as base64 PNG
          const frameData = canvasRef.current.toDataURL('image/png');
          
          // Send frame to RTMP server
          wsRef.current.send(JSON.stringify({
            type: 'canvas-frame',
            streamId: streamIdRef.current,
            frameData: frameData
          }));
        } catch (error) {
          console.error('Error capturing frame:', error);
        }
      }
    }, 1000 / 30); // 30 FPS
  };

  const stopFrameCapture = () => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
      console.log('Frame capture stopped');
    }
  };

  const startStreaming = async () => {
    if (!rtmpUrl || !streamKey) {
      setMessage('Please enter RTMP URL and stream key');
      return;
    }

    if (!canvasRef.current) {
      setMessage('Canvas not available');
      return;
    }

    setIsStreaming(true);
    setStreamStatus('connecting');
    setMessage('Connecting to RTMP server...');

    // Generate unique stream ID
    streamIdRef.current = `stream_${Date.now()}`;

    // Connect to WebSocket if not already connected
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      connectToRTMPServer();
      
      // Wait for connection
      setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          startRTMPStream();
        }
      }, 1000);
    } else {
      startRTMPStream();
    }
  };

  const startRTMPStream = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setMessage('Not connected to server');
      return;
    }

    // Send start stream command
    wsRef.current.send(JSON.stringify({
      type: 'start-rtmp-stream',
      streamId: streamIdRef.current,
      rtmpUrl: rtmpUrl,
      streamKey: streamKey
    }));
  };

  const stopStreaming = () => {
    setIsStreaming(false);
    setStreamStatus('disconnected');
    setMessage('Stopping stream...');

    // Stop frame capture
    stopFrameCapture();

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
  };

  const getStatusColor = () => {
    switch (streamStatus) {
      case 'live': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (streamStatus) {
      case 'live': return 'LIVE';
      case 'connecting': return 'CONNECTING';
      case 'error': return 'ERROR';
      default: return 'OFFLINE';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          RTMP Streaming
          <Badge className={`${getStatusColor()} text-white ml-auto`}>
            {getStatusText()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="rtmp-url">RTMP Server URL</Label>
          <Input
            id="rtmp-url"
            value={rtmpUrl}
            onChange={(e) => setRtmpUrl(e.target.value)}
            placeholder="rtmp://ingest.x.com/live"
            disabled={isStreaming}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="stream-key">Stream Key</Label>
          <Input
            id="stream-key"
            type="password"
            value={streamKey}
            onChange={(e) => setStreamKey(e.target.value)}
            placeholder="Enter your X Studio stream key"
            disabled={isStreaming}
          />
        </div>

        <div className="flex gap-2">
          {!isStreaming ? (
            <Button 
              onClick={startStreaming}
              className="flex-1"
              disabled={!rtmpUrl || !streamKey}
            >
              <Play className="w-4 h-4 mr-2" />
              Start Streaming
            </Button>
          ) : (
            <Button 
              onClick={stopStreaming}
              variant="destructive"
              className="flex-1"
            >
              <Square className="w-4 h-4 mr-2" />
              Stop Streaming
            </Button>
          )}
        </div>

        {message && (
          <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
            {message}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p>• Copy RTMP URL and Stream Key from X Studio</p>
          <p>• Canvas preview will be streamed at 30 FPS</p>
          <p>• Ensure your canvas contains the composed video</p>
        </div>
      </CardContent>
    </Card>
  );
}