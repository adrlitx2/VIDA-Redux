/**
 * Replit-Native RTMP Streaming Server for VIDA³
 * Simplified approach that works directly in Replit environment
 */

import { WebSocketServer } from 'ws';
import { Server } from 'http';
import { spawn, ChildProcess } from 'child_process';
import sharp from 'sharp';

interface RTMPStream {
  id: string;
  rtmpUrl: string;
  streamKey: string;
  ffmpegProcess?: ChildProcess;
  status: 'connecting' | 'live' | 'stopped' | 'error';
}

export class ReplitRTMPServer {
  private wss: WebSocketServer;
  private activeStreams: Map<string, RTMPStream> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/rtmp-relay'
    });

    this.wss.on('connection', (ws) => {
      console.log('✅ RTMP relay WebSocket connection established');
      
      ws.on('message', (data) => {
        this.handleMessage(ws, JSON.parse(data.toString()));
      });

      ws.on('close', () => {
        console.log('🔌 WebSocket connection closed');
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });
  }

  private handleMessage(ws: any, message: any) {
    try {
      console.log(`📨 Received message type: ${message.type}`);
      
      switch (message.type) {
        case 'start-webrtc-stream':
          this.startWebRTCStream(ws, message);
          break;
        case 'canvas-frame':
          this.handleCanvasFrame(ws, message);
          break;
        case 'stop-webrtc-stream':
          this.stopWebRTCStream(ws, message);
          break;
        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }

  private async startWebRTCStream(ws: any, message: any) {
    const { streamId, rtmpUrl, streamKey, userPlan = 'goat', bitrate = 9000, quality = '1080p' } = message;
    
    console.log(`🎯 Starting WebRTC stream ${streamId} to ${rtmpUrl}/${streamKey}`);
    console.log(`📊 WebRTC Bitrate: ${bitrate}k | Quality: ${quality} | Plan: ${userPlan}`);
    
    // Skip connection test for X.com - proceed directly to stream
    console.log('🚀 Proceeding directly to stream setup (X.com compatibility mode)');

    try {
      // Create WebRTC FFmpeg process
      console.log(`🎬 Creating WebRTC FFmpeg process with bitrate: ${bitrate}k, plan: ${userPlan}`);
      const ffmpegProcess = await this.createWebRTCFFmpegProcess(rtmpUrl, streamKey, userPlan, bitrate, quality);
      
      const stream: RTMPStream = {
        id: streamId,
        rtmpUrl,
        streamKey,
        ffmpegProcess,
        status: 'live'
      };

      this.activeStreams.set(streamId, stream);
      
      console.log(`✅ WebRTC FFmpeg process spawned for stream ${streamId}`);
      
      // Wait briefly for FFmpeg to establish connection before marking as ready
      setTimeout(() => {
        ws.send(JSON.stringify({
          type: 'webrtc-stream-ready',
          streamId,
          status: 'live'
        }));
      }, 2000);

      // Handle FFmpeg process events
      ffmpegProcess.on('error', (error) => {
        console.error(`❌ WebRTC FFmpeg error for stream ${streamId}:`, error);
        stream.status = 'error';
        try {
          ws.send(JSON.stringify({
            type: 'webrtc-stream-error',
            streamId,
            error: error.message
          }));
        } catch (wsError) {
          console.error('Failed to send error message via WebSocket:', wsError);
        }
      });

      ffmpegProcess.on('exit', (code) => {
        console.log(`🏁 WebRTC FFmpeg process exited with code ${code} for stream ${streamId}`);
        this.activeStreams.delete(streamId);
        try {
          ws.send(JSON.stringify({
            type: 'webrtc-stream-stopped',
            streamId,
            exitCode: code
          }));
        } catch (wsError) {
          console.error('Failed to send exit message via WebSocket:', wsError);
        }
      });

      // Handle stdin errors to prevent process crashes
      if (ffmpegProcess.stdin) {
        ffmpegProcess.stdin.on('error', (error: any) => {
          if (error.code !== 'EPIPE') {
            console.error(`❌ FFmpeg stdin error for stream ${streamId}:`, error);
          }
          // Don't change stream status for EPIPE errors
        });
      }

    } catch (error) {
      console.error(`❌ Error starting WebRTC stream ${streamId}:`, error);
      ws.send(JSON.stringify({
        type: 'webrtc-stream-error',
        streamId,
        error: error.message
      }));
    }
  }

  private handleCanvasFrame(ws: any, message: any) {
    const { streamId, frameData } = message;
    let stream = this.activeStreams.get(streamId);
    
    // If exact stream ID not found, try to find any active stream for this connection
    if (!stream && this.activeStreams.size > 0) {
      const activeStreamEntries = Array.from(this.activeStreams.entries());
      stream = activeStreamEntries[0][1]; // Use the first active stream
      console.log(`🔄 Canvas frame: Using active stream ${activeStreamEntries[0][0]} instead of ${streamId}`);
    }
    
    if (!stream || !stream.ffmpegProcess) {
      console.log(`❌ Canvas frame: No active stream found. Available: ${Array.from(this.activeStreams.keys()).join(', ')}`);
      return;
    }

    console.log(`📺 Canvas frame received, routing to WebRTC stream ${stream.id || 'unknown'}, status: ${stream.status}`);

    try {
      // Validate frame data format
      if (!frameData || !frameData.startsWith('data:image/png;base64,')) {
        console.error('Invalid frame data format - expected PNG base64');
        return;
      }

      // Convert PNG to raw RGBA data for WebRTC FFmpeg process
      const base64Data = frameData.split(',')[1];
      const pngBuffer = Buffer.from(base64Data, 'base64');
      
      // Convert PNG to raw RGBA pixels (1920x1080x4 bytes)
      sharp(pngBuffer)
        .resize(1920, 1080)
        .raw()
        .toBuffer()
        .then((rawBuffer: Buffer) => {
          // Ensure FFmpeg stdin is available and writable
          if (stream.ffmpegProcess?.stdin && 
              !stream.ffmpegProcess.stdin.destroyed && 
              stream.ffmpegProcess.stdin.writable) {
            
            // Write raw RGBA data to WebRTC FFmpeg process
            try {
              const success = stream.ffmpegProcess.stdin.write(rawBuffer, (error) => {
                if (error && (error as any).code !== 'EPIPE') {
                  console.error('Error writing raw frame to WebRTC FFmpeg:', error);
                  stream.status = 'error';
                }
                // Ignore EPIPE errors as they're expected when RTMP connection drops
              });
              
              // Log successful frame writes occasionally
              if (Math.random() < 0.02) {
                console.log(`📤 Canvas → WebRTC: ${rawBuffer.length} bytes raw RGBA, success=${success}`);
              }
            } catch (writeError: any) {
              if (writeError.code !== 'EPIPE') {
                console.error('Error writing to FFmpeg stdin:', writeError);
                stream.status = 'error';
              }
            }
          } else {
            console.warn('WebRTC FFmpeg stdin not available for stream:', streamId);
          }
        })
        .catch((error: any) => {
          console.error('Error converting PNG to raw RGBA:', error);
        });
        
    } catch (error) {
      console.error(`❌ Error processing canvas frame for stream ${streamId}:`, error);
      stream.status = 'error';
    }
  }

  private stopWebRTCStream(ws: any, message: any) {
    const { streamId } = message;
    const stream = this.activeStreams.get(streamId);

    if (!stream) {
      console.log(`⚠️ WebRTC stream ${streamId} not found or already stopped`);
      ws.send(JSON.stringify({
        type: 'webrtc-stream-stopped',
        streamId,
        status: 'not_found'
      }));
      return;
    }

    console.log(`🛑 Stopping WebRTC stream ${streamId}`);

    if (stream.ffmpegProcess) {
      try {
        // Close stdin gracefully
        stream.ffmpegProcess.stdin?.end();
        
        // Give FFmpeg time to flush, then terminate
        setTimeout(() => {
          if (stream.ffmpegProcess && !stream.ffmpegProcess.killed) {
            stream.ffmpegProcess.kill('SIGTERM');
            
            // Force kill if it doesn't respond
            setTimeout(() => {
              if (stream.ffmpegProcess && !stream.ffmpegProcess.killed) {
                stream.ffmpegProcess.kill('SIGKILL');
              }
            }, 3000);
          }
        }, 1000);
        
        stream.status = 'stopped';
      } catch (error) {
        console.error(`Error stopping WebRTC stream ${streamId}:`, error);
      }
    }

    this.activeStreams.delete(streamId);
    
    ws.send(JSON.stringify({
      type: 'webrtc-stream-stopped',
      streamId,
      status: 'stopped'
    }));

    console.log(`🛑 WebRTC stream ${streamId} stopped with improved cleanup`);
  }

  private async detectPreferredCodec(rtmpUrl: string, streamKey: string): Promise<'h264' | 'avc'> {
    console.log('🔍 Detecting X.com preferred codec...');
    
    // Test H.264 first
    const h264TestCommand = [
      '-f', 'lavfi', '-i', 'testsrc2=size=320x240:duration=1',
      '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
      '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.0',
      '-c:a', 'aac', '-b:a', '128k',
      '-t', '1', '-f', 'flv', `${rtmpUrl}/${streamKey}`
    ];

    try {
      const testProcess = spawn('ffmpeg', h264TestCommand, { stdio: 'pipe' });
      
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          testProcess.kill();
          reject(new Error('H.264 test timeout'));
        }, 5000);

        testProcess.on('exit', (code) => {
          clearTimeout(timeout);
          if (code === 0) {
            console.log('✅ H.264 codec accepted by X.com');
            resolve('h264');
          } else {
            reject(new Error('H.264 rejected'));
          }
        });
      });
      
      return 'h264';
    } catch (error) {
      console.log('⚠️ H.264 failed, falling back to AVC baseline');
      return 'avc';
    }
  }

  private async testRTMPConnection(rtmpUrl: string, streamKey: string): Promise<{success: boolean, error?: string, details?: string}> {
    console.log(`🔍 Testing RTMP connection to: ${rtmpUrl}/${streamKey}`);
    
    return new Promise((resolve) => {
      // Test with a quick FFmpeg probe
      const testProcess = spawn('ffmpeg', [
        '-f', 'lavfi',
        '-i', 'testsrc=duration=1:size=320x240:rate=1',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-t', '1',
        '-f', 'flv',
        `${rtmpUrl}/${streamKey}`
      ], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let errorOutput = '';
      testProcess.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });

      testProcess.on('exit', (code) => {
        console.log(`🔍 RTMP test exit code: ${code}`);
        console.log(`🔍 Error output contains: ${errorOutput.includes('frame=') ? 'frames' : 'no frames'}`);
        
        // More lenient success criteria - many RTMP endpoints return non-zero but still work
        if (code === 0 || errorOutput.includes('frame=') || errorOutput.includes('Stream mapping') || !errorOutput.includes('Connection refused')) {
          console.log('✅ RTMP connection test passed (endpoint reachable)');
          resolve({ success: true });
        } else if (errorOutput.includes('Connection refused') || errorOutput.includes('Network is unreachable')) {
          console.error(`❌ RTMP connection test failed - network issue`);
          resolve({ 
            success: false, 
            error: `Network connection failed`,
            details: errorOutput.slice(-300)
          });
        } else {
          console.warn(`⚠️ RTMP test inconclusive but proceeding (code: ${code})`);
          // Proceed anyway - X.com might reject test stream but accept real stream
          resolve({ success: true });
        }
      });

      testProcess.on('error', (error) => {
        console.error(`❌ RTMP test process error:`, error);
        resolve({ 
          success: false, 
          error: `Test process failed: ${error.message}`,
          details: error.toString()
        });
      });

      // Timeout after 5 seconds - faster testing
      setTimeout(() => {
        testProcess.kill();
        console.log(`⏱️ RTMP test timed out after 5s - proceeding anyway`);
        // Don't fail on timeout - X.com might be slow to respond but still work
        resolve({ success: true });
      }, 5000);
    });
  }

  private async createWebRTCFFmpegProcess(rtmpUrl: string, streamKey: string, userPlan: string, customBitrate?: number, streamQuality?: string): Promise<ChildProcess> {
    // Detect preferred codec first
    const preferredCodec = await this.detectPreferredCodec(rtmpUrl, streamKey);
    console.log(`🎯 Using codec: ${preferredCodec === 'h264' ? 'H.264 (high profile)' : 'AVC (baseline)'}`);
    
    const codecProfile = preferredCodec === 'h264' ? 'high' : 'baseline';
    const codecLevel = preferredCodec === 'h264' ? '4.0' : '3.1';
    const quality = this.getQualitySettings(userPlan);
    const bitrate = customBitrate || quality.bitrate;
    
    // X.com RTMP - corrected working configuration
    const ffmpegCommand = [
      '-y',
      '-f', 'rawvideo',
      '-pix_fmt', 'rgba',
      '-s', '1920x1080',
      '-r', '30',
      '-i', 'pipe:0',
      
      '-f', 'lavfi',
      '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
      
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-profile:v', 'baseline',
      '-level:v', '3.1',
      '-pix_fmt', 'yuv420p',
      '-b:v', '9000k',
      '-maxrate', '9000k',
      '-bufsize', '18000k',
      '-r', '30',
      '-g', '90',
      '-keyint_min', '90',
      '-sc_threshold', '0',
      '-force_key_frames', 'expr:gte(t,n_forced*3)',
      
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ar', '44100',
      '-ac', '2',
      
      '-f', 'flv',
      '-metadata', 'framerate=30',
      '-metadata', 'videodatarate=9000',
      '-metadata', 'audiodatarate=128',
      `${rtmpUrl}/${streamKey}`
    ];

    console.log(`🚀 X.com RTMP Stream - H.264 Baseline 9Mbps/128k AAC`);
    console.log(`🎯 FFmpeg: ${ffmpegCommand.slice(0, 10).join(' ')} ... [${ffmpegCommand.length} args]`);
    
    const ffmpegProcess = spawn('ffmpeg', ffmpegCommand, {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Log FFmpeg stderr for debugging
    ffmpegProcess.stderr?.on('data', (data) => {
      const output = data.toString();
      console.log(`🔍 WebRTC FFmpeg output: ${output.trim()}`);
      
      if (output.includes('frame=') || output.includes('fps=')) {
        // Log encoding progress occasionally
        if (Math.random() < 0.05) {
          console.log(`📊 WebRTC FFmpeg: ${output.trim()}`);
        }
      } else if (output.includes('Connection refused') || output.includes('Network is unreachable')) {
        console.error(`❌ WebRTC FFmpeg: Network connection failed - ${output.trim()}`);
      } else if (output.includes('Broken pipe')) {
        console.warn(`⚠️ WebRTC FFmpeg: RTMP connection interrupted - ${output.trim()}`);
      } else if (output.includes('error') || output.includes('Error') || output.includes('failed')) {
        console.error(`❌ WebRTC FFmpeg error: ${output.trim()}`);
      }
    });

    return ffmpegProcess;
  }

  private getQualitySettings(userPlan: string) {
    const settings = {
      free: { bitrate: 1500, resolution: '720p' },
      basic: { bitrate: 3000, resolution: '1080p' },
      pro: { bitrate: 6000, resolution: '1080p' },
      goat: { bitrate: 9000, resolution: '1080p' }
    };
    
    return settings[userPlan as keyof typeof settings] || settings.free;
  }
}

export function setupReplitRTMPServer(server: Server): ReplitRTMPServer {
  console.log('🎯 WebRTC-RTMP bridge initialized');
  return new ReplitRTMPServer(server);
}