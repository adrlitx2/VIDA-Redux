/**
 * VIDA³ Streaming Performance Optimization Service
 * Handles frame compression, batch processing, and memory management for optimal streaming performance
 */

import sharp from 'sharp';
import { EventEmitter } from 'events';

export interface FrameBatch {
  id: string;
  frames: Buffer[];
  timestamp: number;
  quality: number;
  compression: 'webp' | 'jpeg' | 'png';
}

export interface PerformanceMetrics {
  fps: number;
  latency: number;
  compressionRatio: number;
  memoryUsage: number;
  cpuUsage: number;
  droppedFrames: number;
}

export class StreamingPerformanceOptimizer extends EventEmitter {
  private frameQueue: Buffer[] = [];
  private batchSize: number = 5; // Process 5 frames at once
  private maxQueueSize: number = 30; // Max 30 frames in queue
  private compressionQuality: number = 85;
  private targetFPS: number = 30;
  private lastFrameTime: number = 0;
  private metrics: PerformanceMetrics = {
    fps: 0,
    latency: 0,
    compressionRatio: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    droppedFrames: 0
  };

  constructor(options?: {
    batchSize?: number;
    maxQueueSize?: number;
    compressionQuality?: number;
    targetFPS?: number;
  }) {
    super();
    
    this.batchSize = options?.batchSize || 5;
    this.maxQueueSize = options?.maxQueueSize || 30;
    this.compressionQuality = options?.compressionQuality || 85;
    this.targetFPS = options?.targetFPS || 30;
    
    // Start performance monitoring
    this.startPerformanceMonitoring();
  }

  /**
   * Optimize a single frame with compression and quality settings
   */
  async optimizeFrame(frameData: Buffer, quality?: number): Promise<Buffer> {
    try {
      const startTime = Date.now();
      
      // Convert base64 to buffer if needed
      let imageBuffer = frameData;
      if (typeof frameData === 'string' && frameData.startsWith('data:image')) {
        const base64Data = frameData.split(',')[1];
        imageBuffer = Buffer.from(base64Data, 'base64');
      }

      // Optimize with Sharp
      const optimizedBuffer = await sharp(imageBuffer)
        .webp({ 
          quality: quality || this.compressionQuality,
          effort: 4, // Higher compression effort
          nearLossless: true
        })
        .toBuffer();

      const endTime = Date.now();
      const compressionRatio = (1 - (optimizedBuffer.length / imageBuffer.length)) * 100;
      
      // Update metrics
      this.metrics.compressionRatio = compressionRatio;
      this.metrics.latency = endTime - startTime;

      this.emit('frame-optimized', {
        originalSize: imageBuffer.length,
        optimizedSize: optimizedBuffer.length,
        compressionRatio,
        processingTime: endTime - startTime
      });

      return optimizedBuffer;
    } catch (error) {
      console.error('Frame optimization failed:', error);
      this.metrics.droppedFrames++;
      throw error;
    }
  }

  /**
   * Process a batch of frames for better performance
   */
  async processFrameBatch(frames: Buffer[]): Promise<Buffer[]> {
    const startTime = Date.now();
    
    try {
      // Process frames in parallel for better performance
      const optimizationPromises = frames.map(frame => this.optimizeFrame(frame));
      const optimizedFrames = await Promise.all(optimizationPromises);
      
      const endTime = Date.now();
      const batchProcessingTime = endTime - startTime;
      const avgFrameTime = batchProcessingTime / frames.length;
      
      this.emit('batch-processed', {
        frameCount: frames.length,
        totalTime: batchProcessingTime,
        avgFrameTime,
        totalSize: optimizedFrames.reduce((sum, frame) => sum + frame.length, 0)
      });

      return optimizedFrames;
    } catch (error) {
      console.error('Batch processing failed:', error);
      throw error;
    }
  }

  /**
   * Add frame to processing queue with intelligent batching
   */
  async addFrameToQueue(frameData: Buffer): Promise<void> {
    const currentTime = Date.now();
    
    // Calculate FPS
    if (this.lastFrameTime > 0) {
      const frameInterval = currentTime - this.lastFrameTime;
      this.metrics.fps = Math.round(1000 / frameInterval);
    }
    this.lastFrameTime = currentTime;

    // Add frame to queue
    this.frameQueue.push(frameData);

    // Drop frames if queue is too full (maintain performance)
    if (this.frameQueue.length > this.maxQueueSize) {
      const droppedFrame = this.frameQueue.shift();
      this.metrics.droppedFrames++;
      this.emit('frame-dropped', { reason: 'queue-full' });
    }

    // Process batch if ready
    if (this.frameQueue.length >= this.batchSize) {
      const batch = this.frameQueue.splice(0, this.batchSize);
      try {
        const optimizedBatch = await this.processFrameBatch(batch);
        this.emit('batch-ready', optimizedBatch);
      } catch (error) {
        console.error('Batch processing error:', error);
      }
    }
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    setInterval(() => {
      // Update memory usage
      const memUsage = process.memoryUsage();
      this.metrics.memoryUsage = Math.round(memUsage.heapUsed / 1024 / 1024); // MB

      // Emit performance metrics
      this.emit('performance-metrics', this.metrics);
      
      // Log performance warnings
      if (this.metrics.fps < this.targetFPS * 0.8) {
        this.emit('performance-warning', {
          type: 'low-fps',
          current: this.metrics.fps,
          target: this.targetFPS
        });
      }

      if (this.metrics.memoryUsage > 500) { // 500MB threshold
        this.emit('performance-warning', {
          type: 'high-memory',
          usage: this.metrics.memoryUsage
        });
      }
    }, 1000); // Update every second
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Adjust performance settings dynamically
   */
  adjustSettings(settings: {
    batchSize?: number;
    compressionQuality?: number;
    targetFPS?: number;
  }): void {
    if (settings.batchSize) this.batchSize = settings.batchSize;
    if (settings.compressionQuality) this.compressionQuality = settings.compressionQuality;
    if (settings.targetFPS) this.targetFPS = settings.targetFPS;

    this.emit('settings-adjusted', settings);
  }

  /**
   * Clear frame queue and reset metrics
   */
  reset(): void {
    this.frameQueue = [];
    this.metrics = {
      fps: 0,
      latency: 0,
      compressionRatio: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      droppedFrames: 0
    };
    this.lastFrameTime = 0;
    
    this.emit('reset');
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    length: number;
    maxSize: number;
    batchSize: number;
    isFull: boolean;
  } {
    return {
      length: this.frameQueue.length,
      maxSize: this.maxQueueSize,
      batchSize: this.batchSize,
      isFull: this.frameQueue.length >= this.maxQueueSize
    };
  }
}

export default StreamingPerformanceOptimizer; 