import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

// Rate limiting for streaming endpoints
const streamRateLimit = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 10; // Max 10 stream attempts per minute

export interface StreamingRequest extends Request {
  user?: any;
  streamId?: string;
}

/**
 * Middleware to authenticate streaming requests
 */
export const authenticateStreaming = async (req: StreamingRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Bearer token required for streaming access'
      });
    }

    const token = authHeader.substring(7);
    
    // Initialize Supabase client
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase configuration');
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'Authentication service unavailable'
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Verify JWT token
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'Authentication failed'
      });
    }

    // Add user to request
    req.user = user;
    
    // Rate limiting check
    const clientId = user.id;
    const now = Date.now();
    const clientLimit = streamRateLimit.get(clientId);
    
    if (clientLimit && now < clientLimit.resetTime) {
      if (clientLimit.count >= RATE_LIMIT_MAX) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: `Too many streaming attempts. Limit: ${RATE_LIMIT_MAX} per minute`,
          retryAfter: Math.ceil((clientLimit.resetTime - now) / 1000)
        });
      }
      clientLimit.count++;
    } else {
      streamRateLimit.set(clientId, {
        count: 1,
        resetTime: now + RATE_LIMIT_WINDOW
      });
    }
    
    next();
  } catch (error) {
    console.error('Streaming authentication error:', error);
    res.status(500).json({ 
      error: 'Authentication error',
      message: 'Failed to authenticate streaming request'
    });
  }
};

/**
 * Middleware to validate RTMP streaming parameters
 */
export const validateStreamingParams = (req: StreamingRequest, res: Response, next: NextFunction) => {
  const { rtmpUrl, streamKey, quality, bitrate } = req.body;
  
  // Validate RTMP URL
  if (!rtmpUrl || typeof rtmpUrl !== 'string') {
    return res.status(400).json({
      error: 'Invalid RTMP URL',
      message: 'RTMP URL is required and must be a string'
    });
  }
  
  // Validate RTMP URL format
  const rtmpUrlPattern = /^rtmp:\/\/[a-zA-Z0-9.-]+(\.[a-zA-Z]{2,})?(\/.*)?$/;
  if (!rtmpUrlPattern.test(rtmpUrl)) {
    return res.status(400).json({
      error: 'Invalid RTMP URL format',
      message: 'RTMP URL must be in format: rtmp://hostname/path'
    });
  }
  
  // Validate stream key
  if (!streamKey || typeof streamKey !== 'string' || streamKey.length < 1) {
    return res.status(400).json({
      error: 'Invalid stream key',
      message: 'Stream key is required and must be a non-empty string'
    });
  }
  
  // Validate quality
  if (quality && !['720p', '1080p'].includes(quality)) {
    return res.status(400).json({
      error: 'Invalid quality setting',
      message: 'Quality must be either "720p" or "1080p"'
    });
  }
  
  // Validate bitrate
  if (bitrate && (typeof bitrate !== 'number' || bitrate < 1000 || bitrate > 15000)) {
    return res.status(400).json({
      error: 'Invalid bitrate',
      message: 'Bitrate must be a number between 1000 and 15000 kbps'
    });
  }
  
  // Sanitize inputs
  req.body.rtmpUrl = rtmpUrl.trim();
  req.body.streamKey = streamKey.trim();
  
  next();
};

/**
 * Middleware to check user subscription limits
 */
export const checkSubscriptionLimits = async (req: StreamingRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        error: 'User not authenticated',
        message: 'Authentication required for subscription check'
      });
    }
    
    // Get user's subscription plan
    const userPlan = user.user_metadata?.plan || 'free';
    
    // Define limits based on plan
    const planLimits = {
      free: { maxBitrate: 1500, maxQuality: '720p', maxStreams: 1 },
      basic: { maxBitrate: 3000, maxQuality: '1080p', maxStreams: 1 },
      pro: { maxBitrate: 6000, maxQuality: '1080p', maxStreams: 2 },
      goat: { maxBitrate: 9000, maxQuality: '1080p', maxStreams: 3 }
    };
    
    const limits = planLimits[userPlan as keyof typeof planLimits] || planLimits.free;
    
    // Check bitrate limit
    const requestedBitrate = req.body.bitrate || 9000;
    if (requestedBitrate > limits.maxBitrate) {
      return res.status(403).json({
        error: 'Bitrate limit exceeded',
        message: `${userPlan} plan limited to ${limits.maxBitrate}kbps. Requested: ${requestedBitrate}kbps`
      });
    }
    
    // Check quality limit
    const requestedQuality = req.body.quality || '1080p';
    if (requestedQuality === '1080p' && limits.maxQuality === '720p') {
      return res.status(403).json({
        error: 'Quality limit exceeded',
        message: `${userPlan} plan limited to ${limits.maxQuality}. Upgrade for 1080p streaming.`
      });
    }
    
    // Add limits to request for use in streaming logic
    req.body.userLimits = limits;
    
    next();
  } catch (error) {
    console.error('Subscription limit check error:', error);
    res.status(500).json({
      error: 'Subscription check failed',
      message: 'Failed to verify subscription limits'
    });
  }
};

/**
 * Clean up rate limiting data periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [clientId, limit] of streamRateLimit.entries()) {
    if (now > limit.resetTime) {
      streamRateLimit.delete(clientId);
    }
  }
}, RATE_LIMIT_WINDOW);

export default {
  authenticateStreaming,
  validateStreamingParams,
  checkSubscriptionLimits
}; 