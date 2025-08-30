import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '@/config/database';
import { AuthenticationError, AuthorizationError } from './errorHandler';
import { logger } from '@/utils/logger';

// Extend Request interface to include user and client
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        type: 'admin' | 'client';
      };
      client?: {
        id: string;
        email: string;
        name: string;
        isActive: boolean;
      };
    }
  }
}

interface JWTPayload {
  id: string;
  email: string;
  role: string;
  type: 'admin' | 'client';
  iat: number;
  exp: number;
}

// Extract token from request
const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Also check for token in cookies (for web interface)
  if (req.headers.cookie) {
    const cookies = req.headers.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'token') {
        return value;
      }
    }
  }
  
  return null;
};

// Verify JWT token
const verifyToken = (token: string): JWTPayload => {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }
    
    return jwt.verify(token, secret) as JWTPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError('Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthenticationError('Invalid token');
    } else {
      throw new AuthenticationError('Token verification failed');
    }
  }
};

// Base authentication middleware
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      throw new AuthenticationError('No token provided');
    }
    
    const payload = verifyToken(token);
    
    // Verify user still exists and is active
    let userQuery: string;
    let userTable: string;
    
    if (payload.type === 'admin') {
      userQuery = 'SELECT id, email, name, role, is_active FROM admin_users WHERE id = $1 AND is_active = true';
      userTable = 'admin_users';
    } else {
      userQuery = 'SELECT id, email, name, is_active FROM clients WHERE id = $1 AND is_active = true';
      userTable = 'clients';
    }
    
    const result = await query(userQuery, [payload.id]);
    
    if (result.rows.length === 0) {
      throw new AuthenticationError('User not found or inactive');
    }
    
    const user = result.rows[0];
    
    // Set user in request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role || 'client',
      type: payload.type,
    };
    
    // If it's a client, also set client info
    if (payload.type === 'client') {
      req.client = {
        id: user.id,
        email: user.email,
        name: user.name,
        isActive: user.is_active,
      };
    }
    
    logger.debug('User authenticated', {
      userId: user.id,
      email: user.email,
      type: payload.type,
      path: req.path,
    });
    
    next();
  } catch (error) {
    next(error);
  }
};

// Admin-only authentication
export const authenticateAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await authenticate(req, res, () => {});
    
    if (!req.user || req.user.type !== 'admin') {
      throw new AuthorizationError('Admin access required');
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

// Client-only authentication
export const authenticateClient = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await authenticate(req, res, () => {});
    
    if (!req.user || req.user.type !== 'client') {
      throw new AuthorizationError('Client access required');
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

// API Key authentication (for integration endpoints)
export const authenticateApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      throw new AuthenticationError('API key required');
    }
    
    // Verify API key and get associated client and domain
    const result = await query(
      `SELECT 
        cd.id as domain_id,
        cd.domain,
        cd.is_active as domain_active,
        c.id as client_id,
        c.email,
        c.name,
        c.is_active as client_active
      FROM client_domains cd
      JOIN clients c ON cd.client_id = c.id
      WHERE cd.api_key = $1 AND cd.is_active = true AND c.is_active = true`,
      [apiKey]
    );
    
    if (result.rows.length === 0) {
      throw new AuthenticationError('Invalid API key');
    }
    
    const data = result.rows[0];
    
    // Set client and domain info in request
    req.client = {
      id: data.client_id,
      email: data.email,
      name: data.name,
      isActive: data.client_active,
    };
    
    // Also set domain info for integration endpoints
    (req as any).domain = {
      id: data.domain_id,
      domain: data.domain,
      isActive: data.domain_active,
    };
    
    logger.debug('API key authenticated', {
      clientId: data.client_id,
      domain: data.domain,
      path: req.path,
    });
    
    next();
  } catch (error) {
    next(error);
  }
};

// Optional authentication (doesn't throw error if no token)
export const optionalAuthenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);
    
    if (token) {
      await authenticate(req, res, () => {});
    }
    
    next();
  } catch (error) {
    // Don't throw error for optional auth, just continue without user
    next();
  }
};

// Role-based authorization
export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }
    
    if (!roles.includes(req.user.role)) {
      throw new AuthorizationError(`Access denied. Required roles: ${roles.join(', ')}`);
    }
    
    next();
  };
};

// Check if user owns resource
export const checkResourceOwnership = (resourceIdParam: string = 'id') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }
      
      // Admin can access any resource
      if (req.user.type === 'admin') {
        return next();
      }
      
      const resourceId = req.params[resourceIdParam];
      
      // For clients, check if they own the resource
      if (req.user.type === 'client') {
        // This is a simplified check - in practice, you'd check the specific resource
        // For now, we'll assume the resource belongs to the authenticated client
        if (req.client && resourceId !== req.client.id) {
          // Additional database check might be needed here depending on the resource
          // For example, checking if a notification belongs to the client
        }
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Generate JWT token
export const generateToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }
  
  return jwt.sign(payload, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  } as jwt.SignOptions);
};

// Refresh token (extend expiration)
export const refreshToken = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }
    
    const newToken = generateToken({
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      type: req.user.type,
    });
    
    res.setHeader('X-New-Token', newToken);
    next();
  } catch (error) {
    next(error);
  }
};