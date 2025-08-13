import { WebSocket } from 'ws';
import { supabase } from '../auth/supabase';

export interface CanvasParticipant {
  userId: string;
  username: string;
  position: number;
  canvas: CanvasData;
  isActive: boolean;
  quality: 'low' | 'medium' | 'high';
  lastUpdate: Date;
}

export interface CanvasData {
  imageData: string; // Base64 encoded canvas data
  width: number;
  height: number;
  timestamp: number;
}

export interface CanvasGrid {
  sessionId: number;
  layout: '2x2' | '3x3' | '4x4' | 'custom';
  participants: Map<string, CanvasParticipant>;
  hostCanvas: CanvasData | null;
  outputStream: StreamConfig;
  isActive: boolean;
  createdAt: Date;
}

export interface StreamConfig {
  platform: 'twitter' | 'youtube' | 'twitch' | 'discord';
  rtmpUrl: string;
  streamKey: string;
  resolution: string;
  bitrate: number;
  fps: number;
}

export class MultiUserCanvasService {
  private sessions: Map<number, CanvasGrid> = new Map();
  private participantConnections: Map<string, WebSocket> = new Map();
  private hostConnections: Map<number, WebSocket> = new Map();

  constructor() {
    console.log('🎨 Multi-User Canvas Service initialized');
  }

  /**
   * Create a new co-streaming session with canvas grid
   */
  async createSession(sessionId: number, layout: '2x2' | '3x3' | '4x4' = '2x2'): Promise<CanvasGrid> {
    const session: CanvasGrid = {
      sessionId,
      layout,
      participants: new Map(),
      hostCanvas: null,
      outputStream: {
        platform: 'twitter',
        rtmpUrl: '',
        streamKey: '',
        resolution: '1920x1080',
        bitrate: 6000,
        fps: 30
      },
      isActive: true,
      createdAt: new Date()
    };

    this.sessions.set(sessionId, session);
    console.log(`🎭 Created multi-user canvas session ${sessionId} with ${layout} layout`);
    return session;
  }

  /**
   * Add participant to canvas grid
   */
  async addParticipant(sessionId: number, userId: string, username: string, position?: number): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.error(`Session ${sessionId} not found`);
      return false;
    }

    // Find available position if not specified
    const availablePosition = position ?? this.findAvailablePosition(session);
    if (availablePosition === -1) {
      console.error(`No available positions in session ${sessionId}`);
      return false;
    }

    const participant: CanvasParticipant = {
      userId,
      username,
      position: availablePosition,
      canvas: {
        imageData: '',
        width: 640,
        height: 480,
        timestamp: Date.now()
      },
      isActive: true,
      quality: 'medium',
      lastUpdate: new Date()
    };

    session.participants.set(userId, participant);
    console.log(`👤 Added participant ${username} to session ${sessionId} at position ${availablePosition}`);
    
    // Notify other participants
    this.broadcastToSession(sessionId, {
      type: 'participant_joined',
      data: { userId, username, position: availablePosition }
    });

    return true;
  }

  /**
   * Remove participant from canvas grid
   */
  async removeParticipant(sessionId: number, userId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const participant = session.participants.get(userId);
    if (!participant) return false;

    session.participants.delete(userId);
    console.log(`👋 Removed participant ${participant.username} from session ${sessionId}`);

    // Notify other participants
    this.broadcastToSession(sessionId, {
      type: 'participant_left',
      data: { userId, username: participant.username }
    });

    return true;
  }

  /**
   * Update participant's canvas data
   */
  async updateParticipantCanvas(sessionId: number, userId: string, canvasData: CanvasData): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const participant = session.participants.get(userId);
    if (!participant) return false;

    // Update canvas data
    participant.canvas = canvasData;
    participant.lastUpdate = new Date();

    // Broadcast to other participants
    this.broadcastToSession(sessionId, {
      type: 'canvas_update',
      data: {
        userId,
        position: participant.position,
        canvas: canvasData
      }
    });

    // Update host canvas if this is the host
    if (participant.position === 0) {
      session.hostCanvas = canvasData;
    }

    return true;
  }

  /**
   * Generate combined canvas grid for streaming
   */
  async generateCombinedCanvas(sessionId: number): Promise<CanvasData | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const participants = Array.from(session.participants.values())
      .filter(p => p.isActive && p.canvas.imageData)
      .sort((a, b) => a.position - b.position);

    if (participants.length === 0) return null;

    // Calculate grid dimensions based on layout
    const gridConfig = this.getGridConfig(session.layout);
    const cellWidth = gridConfig.cellWidth;
    const cellHeight = gridConfig.cellHeight;
    const totalWidth = gridConfig.totalWidth;
    const totalHeight = gridConfig.totalHeight;

    // Create combined canvas (this would be implemented with actual image processing)
    const combinedCanvas: CanvasData = {
      imageData: '', // This would be the actual combined image data
      width: totalWidth,
      height: totalHeight,
      timestamp: Date.now()
    };

    // In a real implementation, you would:
    // 1. Create a canvas context
    // 2. Draw each participant's canvas to their grid position
    // 3. Convert to base64 or buffer for streaming

    console.log(`🎨 Generated combined canvas for session ${sessionId} with ${participants.length} participants`);
    return combinedCanvas;
  }

  /**
   * Set up WebSocket connection for participant
   */
  connectParticipant(sessionId: number, userId: string, ws: WebSocket): void {
    const connectionId = `${sessionId}-${userId}`;
    this.participantConnections.set(connectionId, ws);

    ws.on('message', async (data: string) => {
      try {
        const message = JSON.parse(data);
        await this.handleParticipantMessage(sessionId, userId, message);
      } catch (error) {
        console.error('Error handling participant message:', error);
      }
    });

    ws.on('close', () => {
      this.participantConnections.delete(connectionId);
      this.removeParticipant(sessionId, userId);
    });

    console.log(`🔗 Connected participant ${userId} to session ${sessionId}`);
  }

  /**
   * Set up WebSocket connection for host
   */
  connectHost(sessionId: number, ws: WebSocket): void {
    this.hostConnections.set(sessionId, ws);

    ws.on('message', async (data: string) => {
      try {
        const message = JSON.parse(data);
        await this.handleHostMessage(sessionId, message);
      } catch (error) {
        console.error('Error handling host message:', error);
      }
    });

    ws.on('close', () => {
      this.hostConnections.delete(sessionId);
      this.endSession(sessionId);
    });

    console.log(`🎯 Connected host to session ${sessionId}`);
  }

  /**
   * Handle messages from participants
   */
  private async handleParticipantMessage(sessionId: number, userId: string, message: any): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    switch (message.type) {
      case 'canvas_update':
        await this.updateParticipantCanvas(sessionId, userId, message.canvas);
        break;
      
      case 'quality_change':
        const participant = session.participants.get(userId);
        if (participant) {
          participant.quality = message.quality;
        }
        break;
      
      case 'position_request':
        await this.changeParticipantPosition(sessionId, userId, message.newPosition);
        break;
    }
  }

  /**
   * Handle messages from host
   */
  private async handleHostMessage(sessionId: number, message: any): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    switch (message.type) {
      case 'start_stream':
        session.outputStream = { ...session.outputStream, ...message.config };
        await this.startStreaming(sessionId);
        break;
      
      case 'stop_stream':
        await this.stopStreaming(sessionId);
        break;
      
      case 'layout_change':
        session.layout = message.layout;
        await this.reorganizeGrid(sessionId);
        break;
      
      case 'kick_participant':
        await this.removeParticipant(sessionId, message.userId);
        break;
    }
  }

  /**
   * Change participant position in grid
   */
  private async changeParticipantPosition(sessionId: number, userId: string, newPosition: number): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const participant = session.participants.get(userId);
    if (!participant) return false;

    // Check if new position is available
    const positionTaken = Array.from(session.participants.values())
      .some(p => p.position === newPosition && p.userId !== userId);

    if (positionTaken) return false;

    const oldPosition = participant.position;
    participant.position = newPosition;

    // Broadcast position change
    this.broadcastToSession(sessionId, {
      type: 'position_change',
      data: { userId, oldPosition, newPosition }
    });

    return true;
  }

  /**
   * Reorganize grid layout
   */
  private async reorganizeGrid(sessionId: number): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const participants = Array.from(session.participants.values());
    const maxPositions = this.getGridConfig(session.layout).maxPositions;

    // Reassign positions
    participants.forEach((participant, index) => {
      if (index < maxPositions) {
        participant.position = index;
      }
    });

    // Broadcast layout change
    this.broadcastToSession(sessionId, {
      type: 'layout_change',
      data: { layout: session.layout, participants: participants.map(p => ({ userId: p.userId, position: p.position })) }
    });
  }

  /**
   * Start streaming the combined canvas
   */
  private async startStreaming(sessionId: number): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    console.log(`🎬 Starting stream for session ${sessionId} to ${session.outputStream.platform}`);
    
    // In a real implementation, you would:
    // 1. Generate combined canvas
    // 2. Set up FFmpeg process
    // 3. Stream to RTMP endpoint
    // 4. Handle real-time updates

    // For now, just log the action
    this.broadcastToSession(sessionId, {
      type: 'stream_started',
      data: { platform: session.outputStream.platform }
    });
  }

  /**
   * Stop streaming
   */
  private async stopStreaming(sessionId: number): Promise<void> {
    console.log(`⏹️ Stopping stream for session ${sessionId}`);
    
    this.broadcastToSession(sessionId, {
      type: 'stream_stopped',
      data: {}
    });
  }

  /**
   * End session and cleanup
   */
  private async endSession(sessionId: number): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.isActive = false;
    this.sessions.delete(sessionId);

    // Clean up connections
    Array.from(this.participantConnections.keys())
      .filter(key => key.startsWith(`${sessionId}-`))
      .forEach(key => {
        const ws = this.participantConnections.get(key);
        if (ws) {
          ws.close();
          this.participantConnections.delete(key);
        }
      });

    console.log(`🔚 Ended session ${sessionId}`);
  }

  /**
   * Broadcast message to all participants in session
   */
  private broadcastToSession(sessionId: number, message: any): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const messageStr = JSON.stringify(message);

    // Broadcast to participants
    session.participants.forEach((participant) => {
      const connectionId = `${sessionId}-${participant.userId}`;
      const ws = this.participantConnections.get(connectionId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    });

    // Broadcast to host
    const hostWs = this.hostConnections.get(sessionId);
    if (hostWs && hostWs.readyState === WebSocket.OPEN) {
      hostWs.send(messageStr);
    }
  }

  /**
   * Find available position in grid
   */
  private findAvailablePosition(session: CanvasGrid): number {
    const maxPositions = this.getGridConfig(session.layout).maxPositions;
    const takenPositions = new Set(Array.from(session.participants.values()).map(p => p.position));
    
    for (let i = 0; i < maxPositions; i++) {
      if (!takenPositions.has(i)) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Get grid configuration based on layout
   */
  private getGridConfig(layout: string) {
    switch (layout) {
      case '2x2':
        return {
          totalWidth: 1920,
          totalHeight: 1080,
          cellWidth: 960,
          cellHeight: 540,
          maxPositions: 4
        };
      case '3x3':
        return {
          totalWidth: 1920,
          totalHeight: 1080,
          cellWidth: 640,
          cellHeight: 360,
          maxPositions: 9
        };
      case '4x4':
        return {
          totalWidth: 1920,
          totalHeight: 1080,
          cellWidth: 480,
          cellHeight: 270,
          maxPositions: 16
        };
      default:
        return {
          totalWidth: 1920,
          totalHeight: 1080,
          cellWidth: 960,
          cellHeight: 540,
          maxPositions: 4
        };
    }
  }

  /**
   * Get session statistics
   */
  getSessionStats(sessionId: number) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return {
      sessionId,
      layout: session.layout,
      participantCount: session.participants.size,
      isActive: session.isActive,
      createdAt: session.createdAt,
      platform: session.outputStream.platform
    };
  }

  /**
   * Get all active sessions
   */
  getAllSessions() {
    return Array.from(this.sessions.values()).map(session => this.getSessionStats(session.sessionId));
  }
}

// Export singleton instance
export const multiUserCanvasService = new MultiUserCanvasService(); 
 