import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible';
import { logger } from '../utils/logger';
import { RateLimitError } from './errorHandler';

// Rate limiter configurations
const rateLimiterConfigs = {
  // General API rate limiting
  general: {
    keyPrefix: 'general_rl',
    points: 100, // Number of requests
    duration: 60, // Per 60 seconds
    blockDuration: 60, // Block for 60 seconds if limit exceeded
  },
  // Authentication endpoints (more restrictive)
  auth: {
    keyPrefix: 'auth_rl',
    points: 5, // Number of requests
    duration: 60, // Per 60 seconds
    blockDuration: 300, // Block for 5 minutes if limit exceeded
  },
  // Push notification sending (per client)
  push: {
    keyPrefix: 'push_rl',
    points: 50, // Number of requests
    duration: 60, // Per 60 seconds
    blockDuration: 60, // Block for 60 seconds if limit exceeded
  },
  // Integration endpoints (for client websites)
  integration: {
    keyPrefix: 'integration_rl',
    points: 1000, // Number of requests
    duration: 60, // Per 60 seconds
    blockDuration: 60, // Block for 60 seconds if limit exceeded
  },
  // Admin endpoints
  admin: {
    keyPrefix: 'admin_rl',
    points: 200, // Number of requests
    duration: 60, // Per 60 seconds
    blockDuration: 60, // Block for 60 seconds if limit exceeded
  },
};

// Create rate limiters
const createRateLimiter = (config: any) => {
  // Use Redis in production, Memory in development
  if (process.env.REDIS_URL && process.env.NODE_ENV === 'production') {
    return new RateLimiterRedis({
      storeClient: require('redis').createClient({ url: process.env.REDIS_URL }),
      ...config,
    });
  } else {
    return new RateLimiterMemory(config);
  }
};

const rateLimiters = {
  general: createRateLimiter(rateLimiterConfigs.general),
  auth: createRateLimiter(rateLimiterConfigs.auth),
  push: createRateLimiter(rateLimiterConfigs.push),
  integration: createRateLimiter(rateLimiterConfigs.integration),
  admin: createRateLimiter(rateLimiterConfigs.admin),
};

// Helper function to get client IP
const getClientIP = (req: Request): string => {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.ip ||
    'unknown'
  );
};

// Helper function to get rate limit key
const getRateLimitKey = (req: Request, keyType: string = 'ip'): string => {
  const ip = getClientIP(req);
  
  switch (keyType) {
    case 'user':
      return (req as any).user?.id || ip;
    case 'client':
      return (req as any).client?.id || (req as any).user?.id || ip;
    case 'api_key':
      return req.headers['x-api-key'] as string || ip;
    default:
      return ip;
  }
};

// Generic rate limiter middleware factory
const createRateLimiterMiddleware = (
  limiterType: keyof typeof rateLimiters,
  keyType: string = 'ip'
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = getRateLimitKey(req, keyType);
      const limiter = rateLimiters[limiterType];
      
      const result = await limiter.consume(key);
      
      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': rateLimiterConfigs[limiterType].points.toString(),
        'X-RateLimit-Remaining': result.remainingPoints?.toString() || '0',
        'X-RateLimit-Reset': new Date(Date.now() + result.msBeforeNext).toISOString(),
      });
      
      next();
    } catch (rateLimiterRes) {
      const secs = Math.round((rateLimiterRes as any).msBeforeNext / 1000) || 1;
      
      // Log rate limit exceeded
      logger.warn('Rate limit exceeded', {
        ip: getClientIP(req),
        path: req.path,
        method: req.method,
        userAgent: req.get('User-Agent'),
        limiterType,
        retryAfter: secs,
      });
      
      res.set({
        'Retry-After': secs.toString(),
        'X-RateLimit-Limit': rateLimiterConfigs[limiterType].points.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(Date.now() + (rateLimiterRes as any).msBeforeNext).toISOString(),
      });
      
      throw new RateLimitError(`Too many requests. Try again in ${secs} seconds.`);
    }
  };
};

// Exported middleware functions
export const rateLimiter = createRateLimiterMiddleware('general');
export const authRateLimiter = createRateLimiterMiddleware('auth');
export const pushRateLimiter = createRateLimiterMiddleware('push', 'client');
export const integrationRateLimiter = createRateLimiterMiddleware('integration', 'api_key');
export const adminRateLimiter = createRateLimiterMiddleware('admin', 'user');

// Custom rate limiter for specific use cases
export const customRateLimiter = (
  points: number,
  duration: number,
  keyType: string = 'ip'
) => {
  const limiter = createRateLimiter({
    keyPrefix: 'custom_rl',
    points,
    duration,
    blockDuration: duration,
  });
  
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = getRateLimitKey(req, keyType);
      const result = await limiter.consume(key);
      
      res.set({
        'X-RateLimit-Limit': points.toString(),
        'X-RateLimit-Remaining': result.remainingPoints?.toString() || '0',
        'X-RateLimit-Reset': new Date(Date.now() + result.msBeforeNext).toISOString(),
      });
      
      next();
    } catch (rateLimiterRes) {
      const secs = Math.round((rateLimiterRes as any).msBeforeNext / 1000) || 1;
      
      res.set({
        'Retry-After': secs.toString(),
        'X-RateLimit-Limit': points.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(Date.now() + (rateLimiterRes as any).msBeforeNext).toISOString(),
      });
      
      throw new RateLimitError(`Too many requests. Try again in ${secs} seconds.`);
    }
  };
};

// Rate limiter for file uploads
export const uploadRateLimiter = customRateLimiter(10, 60); // 10 uploads per minute

// Rate limiter for password reset
export const passwordResetRateLimiter = customRateLimiter(3, 300); // 3 attempts per 5 minutes

// Rate limiter for email verification
export const emailVerificationRateLimiter = customRateLimiter(5, 300); // 5 attempts per 5 minutes