import express from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { query, transaction } from '@/config/database';
import { generateToken, authenticate } from '@/middleware/auth';
import { authRateLimiter } from '@/middleware/rateLimiter';
import { asyncHandler } from '@/middleware/errorHandler';
import {
  ValidationError,
  AuthenticationError,
  ConflictError,
  NotFoundError,
} from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Validation rules
const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, number and special character'),
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('companyName').optional().trim().isLength({ min: 2 }).withMessage('Company name must be at least 2 characters'),
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must be at least 8 characters with uppercase, lowercase, number and special character'),
];

// Helper function to validate request
const validateRequest = (req: express.Request) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(`Validation failed: ${errors.array().map(e => e.msg).join(', ')}`);
  }
};

// Admin Login
router.post('/admin/login', authRateLimiter, loginValidation, asyncHandler(async (req, res) => {
  validateRequest(req);
  
  const { email, password } = req.body;
  
  // Find admin user
  const result = await query(
    'SELECT id, email, password_hash, name, role, is_active FROM admin_users WHERE email = $1',
    [email]
  );
  
  if (result.rows.length === 0) {
    throw new AuthenticationError('Invalid credentials');
  }
  
  const admin = result.rows[0];
  
  if (!admin.is_active) {
    throw new AuthenticationError('Account is deactivated');
  }
  
  // Verify password
  const isValidPassword = await bcrypt.compare(password, admin.password_hash);
  if (!isValidPassword) {
    throw new AuthenticationError('Invalid credentials');
  }
  
  // Generate token
  const token = generateToken({
    id: admin.id,
    email: admin.email,
    role: admin.role,
    type: 'admin',
  });
  
  logger.info('Admin login successful', { adminId: admin.id, email: admin.email });
  
  res.json({
    success: true,
    message: 'Login successful',
    data: {
      token,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        type: 'admin',
      },
    },
  });
}));

// Client Login
router.post('/client/login', authRateLimiter, loginValidation, asyncHandler(async (req, res) => {
  validateRequest(req);
  
  const { email, password } = req.body;
  
  // Find client user
  const result = await query(
    'SELECT id, email, password_hash, name, company_name, is_active, subscription_plan FROM clients WHERE email = $1',
    [email]
  );
  
  if (result.rows.length === 0) {
    throw new AuthenticationError('Invalid credentials');
  }
  
  const client = result.rows[0];
  
  if (!client.is_active) {
    throw new AuthenticationError('Account is deactivated');
  }
  
  // Verify password
  const isValidPassword = await bcrypt.compare(password, client.password_hash);
  if (!isValidPassword) {
    throw new AuthenticationError('Invalid credentials');
  }
  
  // Generate token
  const token = generateToken({
    id: client.id,
    email: client.email,
    role: 'client',
    type: 'client',
  });
  
  logger.info('Client login successful', { clientId: client.id, email: client.email });
  
  res.json({
    success: true,
    message: 'Login successful',
    data: {
      token,
      user: {
        id: client.id,
        email: client.email,
        name: client.name,
        companyName: client.company_name,
        subscriptionPlan: client.subscription_plan,
        type: 'client',
      },
    },
  });
}));

// Client Registration (Self-registration - can be disabled in production)
router.post('/client/register', authRateLimiter, registerValidation, asyncHandler(async (req, res) => {
  validateRequest(req);
  
  const { email, password, name, companyName } = req.body;
  
  // Check if client already exists
  const existingClient = await query('SELECT id FROM clients WHERE email = $1', [email]);
  if (existingClient.rows.length > 0) {
    throw new ConflictError('Email already registered');
  }
  
  // Hash password
  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);
  
  // Create client
  const clientId = uuidv4();
  await query(
    `INSERT INTO clients (id, email, password_hash, name, company_name, domain_limit, subscription_plan)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [clientId, email, passwordHash, name, companyName || null, 1, 'basic']
  );
  
  // Generate token
  const token = generateToken({
    id: clientId,
    email,
    role: 'client',
    type: 'client',
  });
  
  logger.info('Client registration successful', { clientId, email, name });
  
  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: {
      token,
      user: {
        id: clientId,
        email,
        name,
        companyName,
        subscriptionPlan: 'basic',
        type: 'client',
      },
    },
  });
}));

// Get current user profile
router.get('/profile', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const userType = req.user!.type;
  
  let userQuery: string;
  let userFields: string[];
  
  if (userType === 'admin') {
    userQuery = 'SELECT id, email, name, role, is_active, created_at FROM admin_users WHERE id = $1';
    userFields = ['id', 'email', 'name', 'role', 'isActive', 'createdAt'];
  } else {
    userQuery = `SELECT id, email, name, company_name, domain_limit, subscription_plan, 
                        subscription_expires_at, is_active, created_at 
                 FROM clients WHERE id = $1`;
    userFields = ['id', 'email', 'name', 'companyName', 'domainLimit', 'subscriptionPlan', 
                  'subscriptionExpiresAt', 'isActive', 'createdAt'];
  }
  
  const result = await query(userQuery, [userId]);
  
  if (result.rows.length === 0) {
    throw new NotFoundError('User not found');
  }
  
  const user = result.rows[0];
  
  res.json({
    success: true,
    data: {
      user: {
        ...user,
        type: userType,
      },
    },
  });
}));

// Update profile
router.put('/profile', authenticate, [
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('companyName').optional().trim().isLength({ min: 2 }).withMessage('Company name must be at least 2 characters'),
], asyncHandler(async (req, res) => {
  validateRequest(req);
  
  const userId = req.user!.id;
  const userType = req.user!.type;
  const { name, companyName } = req.body;
  
  let updateQuery: string;
  let updateParams: any[];
  
  if (userType === 'admin') {
    updateQuery = 'UPDATE admin_users SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email, name, role';
    updateParams = [name, userId];
  } else {
    updateQuery = `UPDATE clients SET name = $1, company_name = $2, updated_at = CURRENT_TIMESTAMP 
                   WHERE id = $3 RETURNING id, email, name, company_name, subscription_plan`;
    updateParams = [name, companyName || null, userId];
  }
  
  const result = await query(updateQuery, updateParams);
  
  logger.info('Profile updated', { userId, userType, name });
  
  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: {
        ...result.rows[0],
        type: userType,
      },
    },
  });
}));

// Change password
router.put('/change-password', authenticate, changePasswordValidation, asyncHandler(async (req, res) => {
  validateRequest(req);
  
  const userId = req.user!.id;
  const userType = req.user!.type;
  const { currentPassword, newPassword } = req.body;
  
  // Get current password hash
  const table = userType === 'admin' ? 'admin_users' : 'clients';
  const result = await query(`SELECT password_hash FROM ${table} WHERE id = $1`, [userId]);
  
  if (result.rows.length === 0) {
    throw new NotFoundError('User not found');
  }
  
  // Verify current password
  const isValidPassword = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
  if (!isValidPassword) {
    throw new AuthenticationError('Current password is incorrect');
  }
  
  // Hash new password
  const saltRounds = 12;
  const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
  
  // Update password
  await query(
    `UPDATE ${table} SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
    [newPasswordHash, userId]
  );
  
  logger.info('Password changed', { userId, userType });
  
  res.json({
    success: true,
    message: 'Password changed successfully',
  });
}));

// Logout (client-side token invalidation)
router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  // In a more sophisticated setup, you might maintain a blacklist of tokens
  // For now, we'll just return success and let the client handle token removal
  
  logger.info('User logout', { userId: req.user!.id, userType: req.user!.type });
  
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
}));

// Verify token (for client-side token validation)
router.get('/verify', authenticate, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Token is valid',
    data: {
      user: {
        id: req.user!.id,
        email: req.user!.email,
        role: req.user!.role,
        type: req.user!.type,
      },
    },
  });
}));

export default router;