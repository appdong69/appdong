import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class CustomError extends Error implements AppError {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Predefined error classes
export class ValidationError extends CustomError {
  constructor(message: string = 'Validation failed') {
    super(message, 400);
  }
}

export class AuthenticationError extends CustomError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401);
  }
}

export class AuthorizationError extends CustomError {
  constructor(message: string = 'Access denied') {
    super(message, 403);
  }
}

export class NotFoundError extends CustomError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class ConflictError extends CustomError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409);
  }
}

export class RateLimitError extends CustomError {
  constructor(message: string = 'Too many requests') {
    super(message, 429);
  }
}

export class InternalServerError extends CustomError {
  constructor(message: string = 'Internal server error') {
    super(message, 500);
  }
}

// Error handler middleware
export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let { statusCode = 500, message } = error;

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  } else if (error.message?.includes('duplicate key')) {
    statusCode = 409;
    message = 'Resource already exists';
  } else if (error.message?.includes('foreign key constraint')) {
    statusCode = 400;
    message = 'Invalid reference';
  }

  // Log error
  if (statusCode >= 500) {
    logger.error('Server Error:', {
      message: error.message,
      stack: error.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: (req as any).user?.id,
    });
  } else {
    logger.warn('Client Error:', {
      message: error.message,
      statusCode,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userId: (req as any).user?.id,
    });
  }

  // Send error response
  const response: any = {
    success: false,
    message,
    statusCode,
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
  }

  // Include validation details if available
  if ((error as any).details) {
    response.details = (error as any).details;
  }

  res.status(statusCode).json(response);
};

// Async error wrapper
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};

// Validation error formatter
export const formatValidationError = (errors: any[]) => {
  const formattedErrors = errors.map(error => ({
    field: error.path || error.param,
    message: error.message || error.msg,
    value: error.value,
  }));

  return {
    message: 'Validation failed',
    errors: formattedErrors,
  };
};

// Database error handler
export const handleDatabaseError = (error: any) => {
  if (error.code === '23505') { // Unique constraint violation
    const field = error.detail?.match(/Key \((.+?)\)=/)?.[1] || 'field';
    throw new ConflictError(`${field} already exists`);
  }
  
  if (error.code === '23503') { // Foreign key constraint violation
    throw new ValidationError('Invalid reference provided');
  }
  
  if (error.code === '23502') { // Not null constraint violation
    const field = error.column || 'field';
    throw new ValidationError(`${field} is required`);
  }
  
  if (error.code === '42P01') { // Table does not exist
    throw new InternalServerError('Database configuration error');
  }
  
  // Generic database error
  logger.error('Database error:', error);
  throw new InternalServerError('Database operation failed');
};