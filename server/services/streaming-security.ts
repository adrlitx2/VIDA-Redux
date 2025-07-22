/**
 * VIDA³ Streaming Security Service
 * Handles security validation, rate limiting, audit logging, and threat detection
 */

import { createHash, randomBytes } from 'crypto';
import { EventEmitter } from 'events';

export interface SecurityEvent {
  id: string;
  timestamp: Date;
  type: 'auth' | 'rate_limit' | 'validation' | 'threat' | 'audit';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  details: any;
  action: 'allowed' | 'blocked' | 'warned';
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface SecurityConfig {
  maxFrameSize: number; // Max frame size in bytes
  maxStreamDuration: number; // Max stream duration in minutes
  allowedDomains: string[]; // Allowed RTMP domains
  blockedIPs: string[]; // Blocked IP addresses
  rateLimits: {
    streamStart: RateLimitConfig;
    frameUpload: RateLimitConfig;
    apiCalls: RateLimitConfig;
  };
}

export class StreamingSecurityService extends EventEmitter {
  private securityEvents: SecurityEvent[] = [];
  private rateLimitStore: Map<string, { count: number; resetTime: number }> = new Map();
  private blockedIPs: Set<string> = new Set();
  private suspiciousPatterns: RegExp[] = [
    /<script/i,
    /javascript:/i,
    /data:text\/html/i,
    /eval\(/i,
    /document\./i
  ];

  private config: SecurityConfig = {
    maxFrameSize: 10 * 1024 * 1024, // 10MB
    maxStreamDuration: 240, // 4 hours
    allowedDomains: [
      'rtmp://live-api-s.facebook.com',
      'rtmp://a.rtmp.youtube.com',
      'rtmp://live.twitch.tv',
      'rtmp://live.restream.io',
      'rtmp://ingest.rtmp.live-video.net'
    ],
    blockedIPs: [],
    rateLimits: {
      streamStart: { windowMs: 60000, maxRequests: 5 }, // 5 streams per minute
      frameUpload: { windowMs: 1000, maxRequests: 30 }, // 30 frames per second
      apiCalls: { windowMs: 60000, maxRequests: 100 } // 100 API calls per minute
    }
  };

  constructor(customConfig?: Partial<SecurityConfig>) {
    super();
    
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }

    // Initialize blocked IPs
    this.config.blockedIPs.forEach(ip => this.blockedIPs.add(ip));

    // Start security monitoring
    this.startSecurityMonitoring();
  }

  /**
   * Validate streaming request
   */
  validateStreamingRequest(request: {
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    rtmpUrl?: string;
    streamKey?: string;
    quality?: string;
    bitrate?: number;
  }): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check IP blocking
    if (request.ipAddress && this.blockedIPs.has(request.ipAddress)) {
      this.logSecurityEvent({
        type: 'threat',
        severity: 'high',
        userId: request.userId,
        ipAddress: request.ipAddress,
        details: { reason: 'blocked_ip' },
        action: 'blocked'
      });
      errors.push('IP address is blocked');
    }

    // Validate RTMP URL
    if (request.rtmpUrl) {
      if (!this.isValidRTMPUrl(request.rtmpUrl)) {
        errors.push('Invalid RTMP URL format');
      } else if (!this.isAllowedDomain(request.rtmpUrl)) {
        warnings.push('RTMP domain not in allowed list');
      }
    }

    // Validate stream key
    if (request.streamKey) {
      if (!this.isValidStreamKey(request.streamKey)) {
        errors.push('Invalid stream key format');
      }
    }

    // Validate quality settings
    if (request.quality && !['720p', '1080p'].includes(request.quality)) {
      errors.push('Invalid quality setting');
    }

    // Validate bitrate
    if (request.bitrate && (request.bitrate < 1000 || request.bitrate > 15000)) {
      errors.push('Bitrate must be between 1000 and 15000 kbps');
    }

    // Check for suspicious patterns in user agent
    if (request.userAgent && this.containsSuspiciousPatterns(request.userAgent)) {
      this.logSecurityEvent({
        type: 'threat',
        severity: 'medium',
        userId: request.userId,
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
        details: { reason: 'suspicious_user_agent' },
        action: 'warned'
      });
      warnings.push('Suspicious user agent detected');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate frame data
   */
  validateFrameData(frameData: Buffer | string, userId?: string, ipAddress?: string): {
    valid: boolean;
    errors: string[];
    size: number;
  } {
    const errors: string[] = [];
    let size = 0;

    try {
      // Convert to buffer if needed
      let buffer: Buffer;
      if (typeof frameData === 'string') {
        if (frameData.startsWith('data:image')) {
          const base64Data = frameData.split(',')[1];
          buffer = Buffer.from(base64Data, 'base64');
        } else {
          buffer = Buffer.from(frameData, 'base64');
        }
      } else {
        buffer = frameData;
      }

      size = buffer.length;

      // Check frame size
      if (size > this.config.maxFrameSize) {
        errors.push(`Frame size (${size} bytes) exceeds maximum (${this.config.maxFrameSize} bytes)`);
        
        this.logSecurityEvent({
          type: 'threat',
          severity: 'medium',
          userId,
          ipAddress,
          details: { frameSize: size, maxSize: this.config.maxFrameSize },
          action: 'blocked'
        });
      }

      // Check for suspicious content
      if (this.containsSuspiciousPatterns(buffer.toString('utf8'))) {
        errors.push('Frame contains suspicious content');
        
        this.logSecurityEvent({
          type: 'threat',
          severity: 'high',
          userId,
          ipAddress,
          details: { reason: 'suspicious_frame_content' },
          action: 'blocked'
        });
      }

    } catch (error) {
      errors.push('Invalid frame data format');
    }

    return { valid: errors.length === 0, errors, size };
  }

  /**
   * Check rate limiting
   */
  checkRateLimit(
    type: keyof SecurityConfig['rateLimits'],
    identifier: string
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const config = this.config.rateLimits[type];
    const key = `${type}:${identifier}`;
    const now = Date.now();

    const current = this.rateLimitStore.get(key);
    
    if (!current || now > current.resetTime) {
      // Reset or create new rate limit entry
      this.rateLimitStore.set(key, {
        count: 1,
        resetTime: now + config.windowMs
      });
      
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs
      };
    }

    if (current.count >= config.maxRequests) {
      // Rate limit exceeded
      this.logSecurityEvent({
        type: 'rate_limit',
        severity: 'medium',
        details: { type, identifier, limit: config.maxRequests },
        action: 'blocked'
      });

      return {
        allowed: false,
        remaining: 0,
        resetTime: current.resetTime
      };
    }

    // Increment count
    current.count++;
    this.rateLimitStore.set(key, current);

    return {
      allowed: true,
      remaining: config.maxRequests - current.count,
      resetTime: current.resetTime
    };
  }

  /**
   * Block an IP address
   */
  blockIP(ipAddress: string, reason?: string): void {
    this.blockedIPs.add(ipAddress);
    
    this.logSecurityEvent({
      type: 'threat',
      severity: 'high',
      ipAddress,
      details: { reason: reason || 'manual_block' },
      action: 'blocked'
    });

    this.emit('ip-blocked', { ipAddress, reason });
  }

  /**
   * Unblock an IP address
   */
  unblockIP(ipAddress: string): void {
    this.blockedIPs.delete(ipAddress);
    
    this.logSecurityEvent({
      type: 'audit',
      severity: 'low',
      ipAddress,
      details: { reason: 'manual_unblock' },
      action: 'allowed'
    });

    this.emit('ip-unblocked', { ipAddress });
  }

  /**
   * Log security event
   */
  private logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): void {
    const securityEvent: SecurityEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      ...event
    };

    this.securityEvents.push(securityEvent);
    
    // Keep only last 1000 events
    if (this.securityEvents.length > 1000) {
      this.securityEvents = this.securityEvents.slice(-1000);
    }

    this.emit('security-event', securityEvent);
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return randomBytes(16).toString('hex');
  }

  /**
   * Validate RTMP URL format
   */
  private isValidRTMPUrl(url: string): boolean {
    const rtmpPattern = /^rtmp:\/\/[a-zA-Z0-9.-]+(\.[a-zA-Z]{2,})?(\/.*)?$/;
    return rtmpPattern.test(url);
  }

  /**
   * Check if domain is allowed
   */
  private isAllowedDomain(url: string): boolean {
    return this.config.allowedDomains.some(domain => url.startsWith(domain));
  }

  /**
   * Validate stream key format
   */
  private isValidStreamKey(key: string): boolean {
    // Stream keys should be alphanumeric and reasonable length
    return /^[a-zA-Z0-9_-]{1,100}$/.test(key);
  }

  /**
   * Check for suspicious patterns
   */
  private containsSuspiciousPatterns(content: string): boolean {
    return this.suspiciousPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Start security monitoring
   */
  private startSecurityMonitoring(): void {
    setInterval(() => {
      // Clean up expired rate limits
      const now = Date.now();
      for (const [key, value] of this.rateLimitStore.entries()) {
        if (now > value.resetTime) {
          this.rateLimitStore.delete(key);
        }
      }

      // Emit security metrics
      this.emit('security-metrics', {
        blockedIPs: this.blockedIPs.size,
        activeRateLimits: this.rateLimitStore.size,
        totalEvents: this.securityEvents.length,
        recentThreats: this.securityEvents
          .filter(e => e.type === 'threat' && e.timestamp > new Date(Date.now() - 3600000))
          .length
      });
    }, 60000); // Every minute
  }

  /**
   * Get security events
   */
  getSecurityEvents(limit: number = 100): SecurityEvent[] {
    return this.securityEvents.slice(-limit);
  }

  /**
   * Get blocked IPs
   */
  getBlockedIPs(): string[] {
    return Array.from(this.blockedIPs);
  }

  /**
   * Get security configuration
   */
  getConfig(): SecurityConfig {
    return { ...this.config };
  }

  /**
   * Update security configuration
   */
  updateConfig(updates: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...updates };
    
    // Update blocked IPs set
    this.blockedIPs.clear();
    this.config.blockedIPs.forEach(ip => this.blockedIPs.add(ip));

    this.emit('config-updated', this.config);
  }
}

export default StreamingSecurityService; 