/**
 * VIDA³ Streaming Monitoring & Analytics Service
 * Provides real-time monitoring, metrics collection, alerting, and analytics for streaming operations
 */

import { EventEmitter } from 'events';

export interface StreamMetrics {
  streamId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // seconds
  framesProcessed: number;
  framesDropped: number;
  averageFPS: number;
  averageLatency: number;
  totalDataTransferred: number; // bytes
  quality: string;
  bitrate: number;
  rtmpUrl: string;
  status: 'active' | 'completed' | 'failed' | 'interrupted';
  errorCount: number;
  recoveryAttempts: number;
}

export interface SystemMetrics {
  timestamp: Date;
  activeStreams: number;
  totalStreams: number;
  averageFPS: number;
  averageLatency: number;
  memoryUsage: number; // MB
  cpuUsage: number; // percentage
  networkUsage: number; // Mbps
  errorRate: number; // percentage
  uptime: number; // seconds
}

export interface Alert {
  id: string;
  timestamp: Date;
  type: 'performance' | 'error' | 'security' | 'capacity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  streamId?: string;
  userId?: string;
  metrics?: any;
  resolved: boolean;
  resolvedAt?: Date;
}

export interface AlertRule {
  id: string;
  name: string;
  type: 'threshold' | 'trend' | 'anomaly';
  condition: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  cooldown: number; // seconds
}

export class StreamingMonitoringService extends EventEmitter {
  private streamMetrics: Map<string, StreamMetrics> = new Map();
  private systemMetrics: SystemMetrics[] = [];
  private alerts: Alert[] = [];
  private alertRules: AlertRule[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private startTime: Date = new Date();

  constructor() {
    super();
    
    this.initializeDefaultAlertRules();
    this.startMonitoring();
  }

  /**
   * Start monitoring system metrics
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics();
      this.checkAlertRules();
      this.cleanupOldData();
    }, 5000); // Every 5 seconds
  }

  /**
   * Collect system-wide metrics
   */
  private collectSystemMetrics(): void {
    const memUsage = process.memoryUsage();
    const activeStreams = Array.from(this.streamMetrics.values())
      .filter(stream => stream.status === 'active').length;

    const systemMetric: SystemMetrics = {
      timestamp: new Date(),
      activeStreams,
      totalStreams: this.streamMetrics.size,
      averageFPS: this.calculateAverageFPS(),
      averageLatency: this.calculateAverageLatency(),
      memoryUsage: Math.round(memUsage.heapUsed / 1024 / 1024),
      cpuUsage: this.getCPUUsage(),
      networkUsage: this.calculateNetworkUsage(),
      errorRate: this.calculateErrorRate(),
      uptime: Math.floor((Date.now() - this.startTime.getTime()) / 1000)
    };

    this.systemMetrics.push(systemMetric);
    
    // Keep only last 24 hours of metrics (1728 entries at 5-second intervals)
    if (this.systemMetrics.length > 1728) {
      this.systemMetrics = this.systemMetrics.slice(-1728);
    }

    this.emit('system-metrics', systemMetric);
  }

  /**
   * Start tracking a new stream
   */
  startStreamTracking(streamId: string, userId: string, rtmpUrl: string, quality: string, bitrate: number): void {
    const streamMetric: StreamMetrics = {
      streamId,
      userId,
      startTime: new Date(),
      duration: 0,
      framesProcessed: 0,
      framesDropped: 0,
      averageFPS: 0,
      averageLatency: 0,
      totalDataTransferred: 0,
      quality,
      bitrate,
      rtmpUrl,
      status: 'active',
      errorCount: 0,
      recoveryAttempts: 0
    };

    this.streamMetrics.set(streamId, streamMetric);
    this.emit('stream-started', streamMetric);
  }

  /**
   * Update stream metrics
   */
  updateStreamMetrics(streamId: string, updates: Partial<StreamMetrics>): void {
    const stream = this.streamMetrics.get(streamId);
    if (!stream) return;

    const updatedStream = { ...stream, ...updates };
    
    // Calculate duration if stream ended
    if (updates.endTime && stream.status === 'active') {
      updatedStream.duration = Math.floor((updates.endTime.getTime() - stream.startTime.getTime()) / 1000);
    }

    // Update average FPS
    if (updates.framesProcessed !== undefined) {
      const timeElapsed = (Date.now() - stream.startTime.getTime()) / 1000;
      updatedStream.averageFPS = timeElapsed > 0 ? Math.round(updates.framesProcessed / timeElapsed) : 0;
    }

    this.streamMetrics.set(streamId, updatedStream);
    this.emit('stream-updated', updatedStream);
  }

  /**
   * End stream tracking
   */
  endStreamTracking(streamId: string, status: 'completed' | 'failed' | 'interrupted' = 'completed'): void {
    const stream = this.streamMetrics.get(streamId);
    if (!stream) return;

    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - stream.startTime.getTime()) / 1000);

    const updatedStream: StreamMetrics = {
      ...stream,
      endTime,
      duration,
      status
    };

    this.streamMetrics.set(streamId, updatedStream);
    this.emit('stream-ended', updatedStream);
  }

  /**
   * Record frame processing
   */
  recordFrameProcessed(streamId: string, frameSize: number, processingTime: number): void {
    const stream = this.streamMetrics.get(streamId);
    if (!stream) return;

    const updates: Partial<StreamMetrics> = {
      framesProcessed: stream.framesProcessed + 1,
      totalDataTransferred: stream.totalDataTransferred + frameSize,
      averageLatency: this.calculateAverageLatency(stream.averageLatency, processingTime, stream.framesProcessed)
    };

    this.updateStreamMetrics(streamId, updates);
  }

  /**
   * Record frame dropped
   */
  recordFrameDropped(streamId: string, reason: string): void {
    const stream = this.streamMetrics.get(streamId);
    if (!stream) return;

    this.updateStreamMetrics(streamId, {
      framesDropped: stream.framesDropped + 1
    });

    this.emit('frame-dropped', { streamId, reason });
  }

  /**
   * Record error
   */
  recordError(streamId: string, error: string, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'): void {
    const stream = this.streamMetrics.get(streamId);
    if (!stream) return;

    this.updateStreamMetrics(streamId, {
      errorCount: stream.errorCount + 1
    });

    this.createAlert({
      type: 'error',
      severity,
      title: 'Stream Error',
      message: error,
      streamId,
      userId: stream.userId
    });
  }

  /**
   * Create an alert
   */
  createAlert(alertData: Omit<Alert, 'id' | 'timestamp' | 'resolved'>): void {
    const alert: Alert = {
      id: this.generateAlertId(),
      timestamp: new Date(),
      resolved: false,
      ...alertData
    };

    this.alerts.push(alert);
    
    // Keep only last 1000 alerts
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000);
    }

    this.emit('alert-created', alert);
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      this.emit('alert-resolved', alert);
    }
  }

  /**
   * Add alert rule
   */
  addAlertRule(rule: Omit<AlertRule, 'id'>): void {
    const alertRule: AlertRule = {
      id: this.generateAlertId(),
      ...rule
    };

    this.alertRules.push(alertRule);
    this.emit('alert-rule-added', alertRule);
  }

  /**
   * Check alert rules against current metrics
   */
  private checkAlertRules(): void {
    const currentMetrics = this.systemMetrics[this.systemMetrics.length - 1];
    if (!currentMetrics) return;

    this.alertRules.forEach(rule => {
      if (!rule.enabled) return;

      let shouldAlert = false;
      
      switch (rule.type) {
        case 'threshold':
          shouldAlert = this.evaluateThresholdRule(rule, currentMetrics);
          break;
        case 'trend':
          shouldAlert = this.evaluateTrendRule(rule, currentMetrics);
          break;
        case 'anomaly':
          shouldAlert = this.evaluateAnomalyRule(rule, currentMetrics);
          break;
      }

      if (shouldAlert) {
        this.createAlert({
          type: 'performance',
          severity: rule.severity,
          title: `Alert: ${rule.name}`,
          message: `Rule "${rule.name}" triggered`,
          metrics: currentMetrics
        });
      }
    });
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultAlertRules(): void {
    const defaultRules: Omit<AlertRule, 'id'>[] = [
      {
        name: 'High Memory Usage',
        type: 'threshold',
        condition: 'memoryUsage > 500',
        severity: 'high',
        enabled: true,
        cooldown: 300
      },
      {
        name: 'Low FPS',
        type: 'threshold',
        condition: 'averageFPS < 20',
        severity: 'medium',
        enabled: true,
        cooldown: 60
      },
      {
        name: 'High Error Rate',
        type: 'threshold',
        condition: 'errorRate > 5',
        severity: 'high',
        enabled: true,
        cooldown: 120
      },
      {
        name: 'Too Many Active Streams',
        type: 'threshold',
        condition: 'activeStreams > 50',
        severity: 'medium',
        enabled: true,
        cooldown: 300
      }
    ];

    defaultRules.forEach(rule => this.addAlertRule(rule));
  }

  /**
   * Get current system metrics
   */
  getCurrentSystemMetrics(): SystemMetrics | null {
    return this.systemMetrics[this.systemMetrics.length - 1] || null;
  }

  /**
   * Get stream metrics
   */
  getStreamMetrics(streamId: string): StreamMetrics | undefined {
    return this.streamMetrics.get(streamId);
  }

  /**
   * Get all active streams
   */
  getActiveStreams(): StreamMetrics[] {
    return Array.from(this.streamMetrics.values())
      .filter(stream => stream.status === 'active');
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit: number = 50): Alert[] {
    return this.alerts.slice(-limit);
  }

  /**
   * Get unresolved alerts
   */
  getUnresolvedAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate average FPS across all active streams
   */
  private calculateAverageFPS(): number {
    const activeStreams = this.getActiveStreams();
    if (activeStreams.length === 0) return 0;

    const totalFPS = activeStreams.reduce((sum, stream) => sum + stream.averageFPS, 0);
    return Math.round(totalFPS / activeStreams.length);
  }

  /**
   * Calculate average latency across all active streams
   */
  private calculateAverageLatency(currentAvg?: number, newLatency?: number, frameCount?: number): number {
    if (newLatency !== undefined && frameCount !== undefined && currentAvg !== undefined) {
      // Exponential moving average
      const alpha = 0.1;
      return currentAvg * (1 - alpha) + newLatency * alpha;
    }

    const activeStreams = this.getActiveStreams();
    if (activeStreams.length === 0) return 0;

    const totalLatency = activeStreams.reduce((sum, stream) => sum + stream.averageLatency, 0);
    return Math.round(totalLatency / activeStreams.length);
  }

  /**
   * Get CPU usage (simplified)
   */
  private getCPUUsage(): number {
    // Simplified CPU usage calculation
    // In production, you'd use a proper CPU monitoring library
    return Math.random() * 100; // Placeholder
  }

  /**
   * Calculate network usage
   */
  private calculateNetworkUsage(): number {
    const activeStreams = this.getActiveStreams();
    return activeStreams.reduce((sum, stream) => sum + stream.bitrate, 0) / 1000; // Convert to Mbps
  }

  /**
   * Calculate error rate
   */
  private calculateErrorRate(): number {
    const allStreams = Array.from(this.streamMetrics.values());
    if (allStreams.length === 0) return 0;

    const totalErrors = allStreams.reduce((sum, stream) => sum + stream.errorCount, 0);
    const totalStreams = allStreams.length;
    
    return totalStreams > 0 ? (totalErrors / totalStreams) * 100 : 0;
  }

  /**
   * Evaluate threshold rule
   */
  private evaluateThresholdRule(rule: AlertRule, metrics: SystemMetrics): boolean {
    // Simple threshold evaluation
    // In production, you'd use a proper expression evaluator
    if (rule.condition.includes('memoryUsage > 500')) {
      return metrics.memoryUsage > 500;
    }
    if (rule.condition.includes('averageFPS < 20')) {
      return metrics.averageFPS < 20;
    }
    if (rule.condition.includes('errorRate > 5')) {
      return metrics.errorRate > 5;
    }
    if (rule.condition.includes('activeStreams > 50')) {
      return metrics.activeStreams > 50;
    }
    return false;
  }

  /**
   * Evaluate trend rule
   */
  private evaluateTrendRule(rule: AlertRule, metrics: SystemMetrics): boolean {
    // Placeholder for trend analysis
    return false;
  }

  /**
   * Evaluate anomaly rule
   */
  private evaluateAnomalyRule(rule: AlertRule, metrics: SystemMetrics): boolean {
    // Placeholder for anomaly detection
    return false;
  }

  /**
   * Clean up old data
   */
  private cleanupOldData(): void {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Clean up old system metrics
    this.systemMetrics = this.systemMetrics.filter(metric => 
      metric.timestamp > oneDayAgo
    );

    // Clean up old alerts
    this.alerts = this.alerts.filter(alert => 
      alert.timestamp > oneDayAgo || !alert.resolved
    );
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
}

export default StreamingMonitoringService; 