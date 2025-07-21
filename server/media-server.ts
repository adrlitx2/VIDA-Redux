/**
 * WebRTC-to-RTMP Media Server for VIDA³
 * Handles receiving WebRTC streams from browser and forwarding to RTMP endpoints
 */

import { spawn, ChildProcess } from 'child_process';
import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import ffmpeg from 'fluent-ffmpeg';
import { createWriteStream, WriteStream } from 'fs';
import { join } from 'path';

interface RTMPStream {
  id: string;
  rtmpUrl: string;
  streamKey: string;
  ffmpegProcess?: ChildProcess;
  status: 'connecting' | 'live' | 'stopped' | 'error';
  ws?: any;
}

export class MediaServer {
  private wss: WebSocketServer;
  private activeStreams: Map<string, RTMPStream> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/media-relay'
    });

    this.wss.on('connection', (ws) => {
      console.log('Media server WebSocket connection established');

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          console.error('Error processing media server message:', error);
        }
      });

      ws.on('close', () => {
        console.log('Media server connection closed');
      });
    });
  }

  private handleMessage(ws: any, message: any) {
    switch (message.type) {
      case 'start-rtmp-stream':
        this.startRTMPStream(ws, message);
        break;
      case 'stop-rtmp-stream':
        this.stopRTMPStream(ws, message);
        break;
      case 'video-chunk':
        this.handleVideoChunk(ws, message);
        break;
      case 'stream-config':
        this.handleStreamConfig(ws, message);
        break;
    }
  }

  private async startRTMPStream(ws: any, message: any) {
    const { streamId, rtmpUrl, streamKey } = message;
    
    if (!rtmpUrl || !streamKey) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'RTMP URL and stream key required'
      }));
      return;
    }

    const stream: RTMPStream = {
      id: streamId,
      rtmpUrl,
      streamKey,
      status: 'connecting',
      ws: ws
    };

    this.activeStreams.set(streamId, stream);
    console.log(`Starting RTMP stream ${streamId} to ${rtmpUrl}/${streamKey}`);

    // Create FFmpeg process for RTMP output
    const ffmpegProcess = this.createFFmpegProcess(rtmpUrl, streamKey);
    stream.ffmpegProcess = ffmpegProcess;
    stream.status = 'live';

    ws.send(JSON.stringify({
      type: 'rtmp-stream-ready',
      streamId,
      message: 'RTMP stream initialized and ready for video data',
      status: 'ready'
    }));
  }

  private stopRTMPStream(ws: any, message: any) {
    const { streamId } = message;
    const stream = this.activeStreams.get(streamId);

    if (stream?.ffmpegProcess) {
      stream.ffmpegProcess.kill('SIGTERM');
    }

    this.activeStreams.delete(streamId);

    ws.send(JSON.stringify({
      type: 'rtmp-stream-stopped',
      streamId,
      message: 'RTMP stream stopped'
    }));
  }

  private handleVideoChunk(ws: any, message: any) {
    const { streamId, chunk } = message;
    const stream = this.activeStreams.get(streamId);
    
    if (!stream || !stream.ffmpegProcess) {
      console.error('No active stream found for video chunk');
      return;
    }

    try {
      // Convert base64 chunk to buffer and write to FFmpeg stdin
      const buffer = Buffer.from(chunk, 'base64');
      if (stream.ffmpegProcess.stdin && !stream.ffmpegProcess.stdin.destroyed) {
        stream.ffmpegProcess.stdin.write(buffer);
      }
    } catch (error) {
      console.error('Error writing video chunk to FFmpeg:', error);
    }
  }

  private handleStreamConfig(ws: any, message: any) {
    const { streamId, width, height, framerate } = message;
    console.log(`Stream config for ${streamId}: ${width}x${height}@${framerate}fps`);
    
    ws.send(JSON.stringify({
      type: 'config-acknowledged',
      streamId,
      message: 'Stream configuration received'
    }));
  }

  // Method to create FFmpeg process for RTMP streaming
  private createFFmpegProcess(rtmpUrl: string, streamKey: string): ChildProcess {
    const fullRtmpUrl = `${rtmpUrl}/${streamKey}`;
    
    // FFmpeg command to receive WebRTC input and output to RTMP
    const ffmpegArgs = [
      '-f', 'webm',           // Input format from WebRTC
      '-i', 'pipe:0',         // Input from stdin
      '-c:v', 'libx264',      // Video codec
      '-preset', 'fast',      // Encoding preset
      '-b:v', '2500k',        // Video bitrate
      '-maxrate', '2500k',    // Max bitrate
      '-bufsize', '5000k',    // Buffer size
      '-c:a', 'aac',          // Audio codec
      '-b:a', '128k',         // Audio bitrate
      '-ar', '44100',         // Audio sample rate
      '-f', 'flv',            // Output format
      fullRtmpUrl             // RTMP destination
    ];

    const ffmpeg = spawn('ffmpeg', ffmpegArgs, {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    ffmpeg.stderr.on('data', (data) => {
      console.log('FFmpeg:', data.toString());
    });

    ffmpeg.on('exit', (code) => {
      console.log(`FFmpeg process exited with code ${code}`);
    });

    return ffmpeg;
  }
}

export function setupMediaServer(server: Server): MediaServer {
  return new MediaServer(server);
}