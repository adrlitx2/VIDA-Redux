# VIDA³ RTMP Streaming Deployment Guide

## Overview
To enable actual RTMP streaming to X Studio, you need a media server that can receive WebRTC streams from browsers and convert them to RTMP. Here's how to deploy this on Render or Cudo Compute.

## Architecture
```
Browser (VIDA³) → WebRTC → Media Server → RTMP → X Studio
```

## Option 1: Render Deployment

### 1. Create Render Service
- Sign up at render.com
- Create new "Web Service"
- Connect your GitHub repository
- Environment: Node.js

### 2. Required Dependencies
Add to package.json:
```json
{
  "dependencies": {
    "node-webrtc": "^0.4.7",
    "ws": "^8.14.2",
    "ffmpeg-static": "^5.2.0"
  }
}
```

### 3. Render Build Command
```bash
npm install && npm run build
```

### 4. Start Command
```bash
npm start
```

### 5. Environment Variables
Set in Render dashboard:
- `NODE_ENV=production`
- `PORT=10000` (Render default)
- `MEDIA_SERVER_URL=wss://your-app.onrender.com`

## Option 2: Cudo Compute Deployment

### 1. Create VM Instance
- GPU: Not required for RTMP transcoding
- CPU: 4+ cores recommended
- RAM: 8GB minimum
- OS: Ubuntu 22.04 LTS

### 2. Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install FFmpeg
sudo apt install ffmpeg -y

# Install PM2 for process management
sudo npm install -g pm2
```

### 3. Deploy Application
```bash
# Clone repository
git clone <your-repo-url>
cd your-app

# Install dependencies
npm install

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Implementation Requirements

### 1. WebRTC Integration
The media server needs to handle WebRTC peer connections:

```typescript
import { RTCPeerConnection } from 'node-webrtc';

class WebRTCHandler {
  private peerConnection: RTCPeerConnection;
  
  async handleOffer(offer: RTCSessionDescriptionInit) {
    this.peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    
    await this.peerConnection.setRemoteDescription(offer);
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    
    return answer;
  }
}
```

### 2. FFmpeg RTMP Pipeline
Stream processing configuration:

```typescript
const ffmpegArgs = [
  '-f', 'webm',                    // Input from WebRTC
  '-i', 'pipe:0',                  // Stdin input
  '-c:v', 'libx264',               // Video codec
  '-preset', 'fast',               // Encoding speed
  '-tune', 'zerolatency',          // Low latency
  '-b:v', '2500k',                 // Video bitrate
  '-maxrate', '2500k',             // Max bitrate
  '-bufsize', '5000k',             // Buffer size
  '-g', '60',                      // GOP size
  '-c:a', 'aac',                   // Audio codec
  '-b:a', '128k',                  // Audio bitrate
  '-ar', '44100',                  // Sample rate
  '-f', 'flv',                     // RTMP format
  `${rtmpUrl}/${streamKey}`        // X Studio RTMP endpoint
];
```

## Frontend Integration

### 1. WebRTC Client Setup
Update the streaming studio to connect to media server:

```typescript
class RTMPStreamer {
  private ws: WebSocket;
  private peerConnection: RTCPeerConnection;
  
  async startStream(rtmpUrl: string, streamKey: string) {
    // Connect to media server
    this.ws = new WebSocket(`${MEDIA_SERVER_URL}/media-relay`);
    
    // Create peer connection
    this.peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    
    // Add canvas stream
    const stream = canvasRef.current.captureStream(30);
    stream.getTracks().forEach(track => {
      this.peerConnection.addTrack(track, stream);
    });
    
    // Start RTMP stream
    this.ws.send(JSON.stringify({
      type: 'start-rtmp-stream',
      rtmpUrl,
      streamKey
    }));
  }
}
```

## Cost Estimates

### Render
- Starter: $7/month (512MB RAM, 0.1 CPU)
- Standard: $25/month (2GB RAM, 1 CPU) - Recommended
- Pro: $85/month (4GB RAM, 2 CPU)

### Cudo Compute
- 4 vCPU, 8GB RAM: ~$50-80/month
- GPU instances: $100-200/month (if AI processing needed)

## Testing Process

1. Deploy media server to Render/Cudo
2. Update VIDA³ frontend with media server WebSocket URL
3. Configure X Studio RTMP endpoint
4. Test WebRTC connection establishment
5. Verify RTMP stream appears in X Studio

## Security Considerations

- Use WSS (secure WebSocket) connections
- Implement authentication for media server access
- Rate limit stream creation requests
- Monitor resource usage and implement auto-scaling

## Monitoring

Set up monitoring for:
- WebRTC connection success rates
- RTMP stream health
- Server resource usage (CPU, memory, bandwidth)
- Stream quality metrics

This deployment will enable the canvas-captured preview content to reach X Studio as a proper RTMP stream.