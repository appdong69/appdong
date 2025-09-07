import express from 'express';
import bcrypt from 'bcryptjs';
import { body, query as expressQuery, validationResult } from 'express-validator';
import { query, transaction } from '../config/database';
import { authenticateAdmin } from '../middleware/auth';
import { adminRateLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../middleware/errorHandler';
import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
} from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import * as webpush from 'web-push';

const router = express.Router();

// Apply admin authentication and rate limiting to all routes
router.use(authenticateAdmin);
router.use(adminRateLimiter);

// Validation rules
const createClientValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, number and special character'),
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('companyName').optional().trim().isLength({ min: 2 }).withMessage('Company name must be at least 2 characters'),
  body('domainLimit').optional().isInt({ min: 1, max: 100 }).withMessage('Domain limit must be between 1 and 100'),
  body('subscriptionPlan').optional().isIn(['basic', 'pro', 'enterprise']).withMessage('Invalid subscription plan'),
];

const updateClientValidation = [
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('companyName').optional().trim().isLength({ min: 2 }).withMessage('Company name must be at least 2 characters'),
  body('domainLimit').optional().isInt({ min: 1, max: 100 }).withMessage('Domain limit must be between 1 and 100'),
  body('subscriptionPlan').optional().isIn(['basic', 'pro', 'enterprise']).withMessage('Invalid subscription plan'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

// Helper function to validate request
const validateRequest = (req: express.Request) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(`Validation failed: ${errors.array().map(e => e.msg).join(', ')}`);
  }
};

// Dashboard - Get overview statistics
router.get('/dashboard', asyncHandler(async (req, res) => {
  // Get total clients
  const totalClientsResult = await query('SELECT COUNT(*) as count FROM clients');
  const totalClients = parseInt(totalClientsResult.rows[0].count);
  
  // Get active clients
  const activeClientsResult = await query('SELECT COUNT(*) as count FROM clients WHERE is_active = true');
  const activeClients = parseInt(activeClientsResult.rows[0].count);
  
  // Get total notifications sent
  const totalNotificationsResult = await query(
    'SELECT COALESCE(SUM(successful_sends), 0) as total FROM push_notifications WHERE status = \'sent\''
  );
  const totalNotificationsSent = parseInt(totalNotificationsResult.rows[0].total);
  
  // Get total subscribers across all clients
  const totalSubscribersResult = await query(
    'SELECT COUNT(*) as count FROM push_subscribers WHERE is_active = true'
  );
  const totalSubscribers = parseInt(totalSubscribersResult.rows[0].count);
  
  // Get new subscribers in the last 30 days (daily breakdown)
  const subscriberGrowthResult = await query(`
    SELECT 
      DATE(subscribed_at) as date,
      COUNT(*) as new_subscribers
    FROM push_subscribers 
    WHERE subscribed_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY DATE(subscribed_at)
    ORDER BY date DESC
  `);
  
  // Get recent notifications
  const recentNotificationsResult = await query(`
    SELECT 
      pn.id,
      pn.title,
      pn.successful_sends,
      pn.click_count,
      pn.sent_at,
      c.name as client_name,
      c.email as client_email
    FROM push_notifications pn
    JOIN clients c ON pn.client_id = c.id
    WHERE pn.status = 'sent'
    ORDER BY pn.sent_at DESC
    LIMIT 10
  `);
  
  // Get top performing clients
  const topClientsResult = await query(`
    SELECT 
      c.id,
      c.name,
      c.email,
      COUNT(DISTINCT ps.id) as subscriber_count,
      COALESCE(SUM(pn.successful_sends), 0) as total_sends,
      COALESCE(SUM(pn.click_count), 0) as total_clicks
    FROM clients c
    LEFT JOIN push_subscribers ps ON c.id = ps.client_id AND ps.is_active = true
    LEFT JOIN push_notifications pn ON c.id = pn.client_id AND pn.status = 'sent'
    WHERE c.is_active = true
    GROUP BY c.id, c.name, c.email
    ORDER BY subscriber_count DESC, total_sends DESC
    LIMIT 10
  `);
  
  res.json({
    success: true,
    data: {
      overview: {
        totalClients,
        activeClients,
        inactiveClients: totalClients - activeClients,
        totalSubscribers,
        totalNotificationsSent,
      },
      subscriberGrowth: subscriberGrowthResult.rows,
      recentNotifications: recentNotificationsResult.rows,
      topClients: topClientsResult.rows,
    },
  });
}));

// Get all clients with pagination and filtering
router.get('/clients', [
  expressQuery('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  expressQuery('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  expressQuery('search').optional().trim().isLength({ min: 1 }).withMessage('Search term must not be empty'),
  expressQuery('status').optional().isIn(['active', 'inactive', 'all']).withMessage('Status must be active, inactive, or all'),
], asyncHandler(async (req, res) => {
  validateRequest(req);
  
  const page = parseInt((req.query.page as string) || '1') || 1;
  const limit = parseInt((req.query.limit as string) || '20') || 20;
  const search = req.query.search as string || '';
  const status = (req.query.status as string) || 'all';
  const offset = (page - 1) * limit;
  
  // Build WHERE clause
  let whereClause = 'WHERE 1=1';
  const queryParams: any[] = [];
  let paramIndex = 1;
  
  if (search) {
    whereClause += ` AND (c.name ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex} OR c.company_name ILIKE $${paramIndex})`;
    queryParams.push(`%${search}%`);
    paramIndex++;
  }
  
  if (status !== 'all') {
    whereClause += ` AND c.is_active = $${paramIndex}`;
    queryParams.push(status === 'active');
    paramIndex++;
  }
  
  // Get clients with stats
  const clientsQuery = `
    SELECT 
      c.id,
      c.email,
      c.name,
      c.company_name,
      c.domain_limit,
      c.subscription_plan,
      c.subscription_expires_at,
      c.is_active,
      c.created_at,
      COUNT(DISTINCT cd.id) as domain_count,
      COUNT(DISTINCT ps.id) as subscriber_count,
      COALESCE(SUM(pn.successful_sends), 0) as total_sends
    FROM clients c
    LEFT JOIN client_domains cd ON c.id = cd.client_id
    LEFT JOIN push_subscribers ps ON c.id = ps.client_id AND ps.is_active = true
    LEFT JOIN push_notifications pn ON c.id = pn.client_id AND pn.status = 'sent'
    ${whereClause}
    GROUP BY c.id, c.email, c.name, c.company_name, c.domain_limit, c.subscription_plan, c.subscription_expires_at, c.is_active, c.created_at
    ORDER BY c.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  
  queryParams.push(limit, offset);
  
  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total
    FROM clients c
    ${whereClause}
  `;
  
  const [clientsResult, countResult] = await Promise.all([
    query(clientsQuery, queryParams),
    query(countQuery, queryParams.slice(0, -2)), // Remove limit and offset for count
  ]);
  
  const total = parseInt(countResult.rows[0].total);
  const totalPages = Math.ceil(total / limit);
  
  res.json({
    success: true,
    data: {
      clients: clientsResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    },
  });
}));

// Get single client details
router.get('/clients/:id', asyncHandler(async (req, res) => {
  const clientId = req.params.id;
  
  // Get client with detailed stats
  const clientResult = await query(`
    SELECT 
      c.*,
      COUNT(DISTINCT cd.id) as domain_count,
      COUNT(DISTINCT ps.id) as subscriber_count,
      COUNT(DISTINCT pn.id) as notification_count,
      COALESCE(SUM(pn.successful_sends), 0) as total_sends,
      COALESCE(SUM(pn.click_count), 0) as total_clicks
    FROM clients c
    LEFT JOIN client_domains cd ON c.id = cd.client_id
    LEFT JOIN push_subscribers ps ON c.id = ps.client_id AND ps.is_active = true
    LEFT JOIN push_notifications pn ON c.id = pn.client_id
    WHERE c.id = $1
    GROUP BY c.id
  `, [clientId]);
  
  if (clientResult.rows.length === 0) {
    throw new NotFoundError('Client not found');
  }
  
  // Get client domains
  const domainsResult = await query(
    'SELECT id, domain, is_verified, is_active, created_at FROM client_domains WHERE client_id = $1 ORDER BY created_at DESC',
    [clientId]
  );
  
  // Get recent notifications
  const notificationsResult = await query(
    `SELECT id, title, status, successful_sends, click_count, scheduled_at, sent_at, created_at 
     FROM push_notifications WHERE client_id = $1 ORDER BY created_at DESC LIMIT 10`,
    [clientId]
  );
  
  res.json({
    success: true,
    data: {
      client: clientResult.rows[0],
      domains: domainsResult.rows,
      recentNotifications: notificationsResult.rows,
    },
  });
}));

// Create new client
router.post('/clients', createClientValidation, asyncHandler(async (req, res) => {
  validateRequest(req);
  
  const { email, password, name, companyName, domainLimit = 1, subscriptionPlan = 'basic' } = req.body;
  
  // Check if client already exists
  const existingClient = await query('SELECT id FROM clients WHERE email = $1', [email]);
  if (existingClient.rows.length > 0) {
    throw new ConflictError('Email already exists');
  }
  
  // Hash password
  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);
  
  // Create client
  const clientId = uuidv4();
  const result = await query(
    `INSERT INTO clients (id, email, password_hash, name, company_name, domain_limit, subscription_plan, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, email, name, company_name, domain_limit, subscription_plan, is_active, created_at`,
    [clientId, email, passwordHash, name, companyName || null, domainLimit, subscriptionPlan, req.user!.id]
  );
  
  logger.info('Client created by admin', {
    clientId,
    email,
    name,
    createdBy: req.user!.id,
  });
  
  res.status(201).json({
    success: true,
    message: 'Client created successfully',
    data: {
      client: result.rows[0],
    },
  });
}));

// Update client
router.put('/clients/:id', updateClientValidation, asyncHandler(async (req, res) => {
  validateRequest(req);
  
  const clientId = req.params.id;
  const { name, companyName, domainLimit, subscriptionPlan, isActive } = req.body;
  
  // Check if client exists
  const existingClient = await query('SELECT id FROM clients WHERE id = $1', [clientId]);
  if (existingClient.rows.length === 0) {
    throw new NotFoundError('Client not found');
  }
  
  // Build update query dynamically
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;
  
  if (name !== undefined) {
    updates.push(`name = $${paramIndex}`);
    values.push(name);
    paramIndex++;
  }
  
  if (companyName !== undefined) {
    updates.push(`company_name = $${paramIndex}`);
    values.push(companyName);
    paramIndex++;
  }
  
  if (domainLimit !== undefined) {
    updates.push(`domain_limit = $${paramIndex}`);
    values.push(domainLimit);
    paramIndex++;
  }
  
  if (subscriptionPlan !== undefined) {
    updates.push(`subscription_plan = $${paramIndex}`);
    values.push(subscriptionPlan);
    paramIndex++;
  }
  
  if (isActive !== undefined) {
    updates.push(`is_active = $${paramIndex}`);
    values.push(isActive);
    paramIndex++;
  }
  
  if (updates.length === 0) {
    throw new ValidationError('No valid fields to update');
  }
  
  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(clientId);
  
  const updateQuery = `
    UPDATE clients 
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING id, email, name, company_name, domain_limit, subscription_plan, is_active, updated_at
  `;
  
  const result = await query(updateQuery, values);
  
  logger.info('Client updated by admin', {
    clientId,
    updatedBy: req.user!.id,
    updates: Object.keys(req.body),
  });
  
  res.json({
    success: true,
    message: 'Client updated successfully',
    data: {
      client: result.rows[0],
    },
  });
}));

// Toggle client status (activate/deactivate)
router.patch('/clients/:id/toggle-status', asyncHandler(async (req, res) => {
  const clientId = req.params.id;
  
  const result = await query(
    `UPDATE clients 
     SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $1 
     RETURNING id, email, name, is_active`,
    [clientId]
  );
  
  if (result.rows.length === 0) {
    throw new NotFoundError('Client not found');
  }
  
  const client = result.rows[0];
  
  logger.info('Client status toggled by admin', {
    clientId,
    newStatus: client.is_active ? 'active' : 'inactive',
    toggledBy: req.user!.id,
  });
  
  res.json({
    success: true,
    message: `Client ${client.is_active ? 'activated' : 'deactivated'} successfully`,
    data: {
      client,
    },
  });
}));

// Delete client (soft delete by deactivating)
router.delete('/clients/:id', asyncHandler(async (req, res) => {
  const clientId = req.params.id;
  
  // Instead of hard delete, we'll deactivate the client
  const result = await query(
    `UPDATE clients 
     SET is_active = false, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $1 
     RETURNING id, email, name`,
    [clientId]
  );
  
  if (result.rows.length === 0) {
    throw new NotFoundError('Client not found');
  }
  
  logger.info('Client deleted (deactivated) by admin', {
    clientId,
    deletedBy: req.user!.id,
  });
  
  res.json({
    success: true,
    message: 'Client deleted successfully',
  });
}));

// Login as client (for support purposes)
router.post('/clients/:id/login-as', asyncHandler(async (req, res) => {
  const clientId = req.params.id;
  
  // Get client details
  const result = await query(
    'SELECT id, email, name, company_name, subscription_plan, is_active FROM clients WHERE id = $1',
    [clientId]
  );
  
  if (result.rows.length === 0) {
    throw new NotFoundError('Client not found');
  }
  
  const client = result.rows[0];
  
  if (!client.is_active) {
    throw new ValidationError('Cannot login as inactive client');
  }
  
  // Generate token for client
  const { generateToken } = await import('../middleware/auth');
  const token = generateToken({
    id: client.id,
    email: client.email,
    role: 'client',
    type: 'client',
  });
  
  logger.info('Admin logged in as client', {
    adminId: req.user!.id,
    clientId: client.id,
    clientEmail: client.email,
  });
  
  res.json({
    success: true,
    message: 'Logged in as client successfully',
    data: {
      token,
      client: {
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

// VAPID Key Management Routes

// Get current VAPID keys
router.get('/settings/vapid', asyncHandler(async (req, res) => {
  const result = await query(
    'SELECT id, public_key, private_key, is_active, created_at FROM vapid_keys WHERE is_active = true LIMIT 1'
  );
  
  const vapidKeys = result.rows[0] || null;
  
  res.json({
    success: true,
    data: {
      vapidKeys,
    },
  });
}));

// Generate new VAPID keys
router.post('/settings/vapid/generate', asyncHandler(async (req, res) => {
  // Generate new VAPID keys
  const vapidKeys = webpush.generateVAPIDKeys();
  
  await transaction(async (client) => {
    // Deactivate existing keys
    await client.query(
      'UPDATE vapid_keys SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE is_active = true'
    );
    
    // Insert new keys
    await client.query(
      `INSERT INTO vapid_keys (id, public_key, private_key, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [uuidv4(), vapidKeys.publicKey, vapidKeys.privateKey]
    );
  });
  
  logger.info('New VAPID keys generated by admin', {
    adminId: req.user!.id,
    publicKey: vapidKeys.publicKey.substring(0, 20) + '...', // Log partial key for security
  });
  
  res.json({
    success: true,
    message: 'VAPID keys generated successfully',
    data: {
      vapidKeys: {
        publicKey: vapidKeys.publicKey,
        privateKey: vapidKeys.privateKey,
      },
    },
  });
}));

// Admin Notifications Management

// Get all notifications with pagination and filtering
router.get('/notifications', [
  expressQuery('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  expressQuery('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  expressQuery('search').optional().trim().isLength({ min: 1 }).withMessage('Search term must not be empty'),
  expressQuery('status').optional().isIn(['sent', 'failed', 'scheduled', 'all']).withMessage('Invalid status'),
  expressQuery('sortBy').optional().isIn(['sent_at', 'title', 'successful_sends', 'click_count']).withMessage('Invalid sort field'),
  expressQuery('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
], asyncHandler(async (req, res) => {
  validateRequest(req);
  
  const page = parseInt((req.query.page as string) || '1') || 1;
  const limit = parseInt((req.query.limit as string) || '20') || 20;
  const search = req.query.search as string || '';
  const status = (req.query.status as string) || 'all';
  const sortBy = (req.query.sortBy as string) || 'sent_at';
  const sortOrder = (req.query.sortOrder as string) || 'desc';
  const offset = (page - 1) * limit;
  
  let whereClause = 'WHERE 1=1';
  const queryParams: any[] = [];
  let paramIndex = 1;
  
  if (search) {
    whereClause += ` AND (pn.title ILIKE $${paramIndex} OR pn.body ILIKE $${paramIndex + 1} OR c.name ILIKE $${paramIndex + 2})`;
    queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    paramIndex += 3;
  }
  
  if (status !== 'all') {
    whereClause += ` AND pn.status = $${paramIndex}`;
    queryParams.push(status);
    paramIndex++;
  }
  
  const countQuery = `
    SELECT COUNT(*) as total
    FROM push_notifications pn
    JOIN clients c ON pn.client_id = c.id
    ${whereClause}
  `;
  
  const dataQuery = `
    SELECT 
      pn.id,
      pn.title,
      pn.body,
      pn.status,
      pn.successful_sends,
      pn.failed_sends,
      pn.click_count,
      pn.sent_at,
      pn.scheduled_at,
      pn.created_at,
      c.id as client_id,
      c.name as client_name,
      c.email as client_email
    FROM push_notifications pn
    JOIN clients c ON pn.client_id = c.id
    ${whereClause}
    ORDER BY pn.${sortBy} ${sortOrder.toUpperCase()}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  
  queryParams.push(limit, offset);
  
  const [countResult, dataResult] = await Promise.all([
    query(countQuery, queryParams.slice(0, -2)),
    query(dataQuery, queryParams),
  ]);
  
  const total = parseInt(countResult.rows[0].total);
  const totalPages = Math.ceil(total / limit);
  
  res.json({
    success: true,
    data: {
      notifications: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    },
  });
}));

// Get notification by ID
router.get('/notifications/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await query(`
    SELECT 
      pn.*,
      c.id as client_id,
      c.name as client_name,
      c.email as client_email
    FROM push_notifications pn
    JOIN clients c ON pn.client_id = c.id
    WHERE pn.id = $1
  `, [id]);
  
  if (result.rows.length === 0) {
    throw new NotFoundError('Notification not found');
  }
  
  res.json({
    success: true,
    data: {
      notification: result.rows[0],
    },
  });
}));

// Delete notification
router.delete('/notifications/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await query('DELETE FROM push_notifications WHERE id = $1 RETURNING id', [id]);
  
  if (result.rows.length === 0) {
    throw new NotFoundError('Notification not found');
  }
  
  logger.info('Notification deleted by admin', {
    adminId: req.user!.id,
    notificationId: id,
  });
  
  res.json({
    success: true,
    message: 'Notification deleted successfully',
  });
}));

// Admin Domains Management

// Get all domains with pagination and filtering
router.get('/domains', [
  expressQuery('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  expressQuery('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  expressQuery('search').optional().trim().isLength({ min: 1 }).withMessage('Search term must not be empty'),
  expressQuery('status').optional().isIn(['verified', 'pending', 'failed', 'all']).withMessage('Invalid status'),
  expressQuery('sortBy').optional().isIn(['created_at', 'domain_name', 'verification_status']).withMessage('Invalid sort field'),
  expressQuery('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
], asyncHandler(async (req, res) => {
  validateRequest(req);
  
  const page = parseInt((req.query.page as string) || '1') || 1;
  const limit = parseInt((req.query.limit as string) || '20') || 20;
  const search = req.query.search as string || '';
  const status = (req.query.status as string) || 'all';
  const sortBy = (req.query.sortBy as string) || 'created_at';
  const sortOrder = (req.query.sortOrder as string) || 'desc';
  const offset = (page - 1) * limit;
  
  let whereClause = 'WHERE 1=1';
  const queryParams: any[] = [];
  let paramIndex = 1;
  
  if (search) {
    whereClause += ` AND (d.domain_name ILIKE $${paramIndex} OR c.name ILIKE $${paramIndex + 1})`;
    queryParams.push(`%${search}%`, `%${search}%`);
    paramIndex += 2;
  }
  
  if (status !== 'all') {
    whereClause += ` AND d.verification_status = $${paramIndex}`;
    queryParams.push(status);
    paramIndex++;
  }
  
  const countQuery = `
    SELECT COUNT(*) as total
    FROM client_domains d
    JOIN clients c ON d.client_id = c.id
    ${whereClause}
  `;
  
  const dataQuery = `
    SELECT 
      d.*,
      c.id as client_id,
      c.name as client_name,
      c.email as client_email
    FROM client_domains d
    JOIN clients c ON d.client_id = c.id
    ${whereClause}
    ORDER BY d.${sortBy} ${sortOrder.toUpperCase()}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  
  queryParams.push(limit, offset);
  
  const [countResult, dataResult] = await Promise.all([
    query(countQuery, queryParams.slice(0, -2)),
    query(dataQuery, queryParams),
  ]);
  
  const total = parseInt(countResult.rows[0].total);
  const totalPages = Math.ceil(total / limit);
  
  res.json({
    success: true,
    data: {
      domains: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    },
  });
}));

// Get domain by ID
router.get('/domains/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await query(`
    SELECT 
      d.*,
      c.id as client_id,
      c.name as client_name,
      c.email as client_email
    FROM client_domains d
    JOIN clients c ON d.client_id = c.id
    WHERE d.id = $1
  `, [id]);
  
  if (result.rows.length === 0) {
    throw new NotFoundError('Domain not found');
  }
  
  res.json({
    success: true,
    data: {
      domain: result.rows[0],
    },
  });
}));

// Update domain status
router.put('/domains/:id', [
  body('verification_status').optional().isIn(['verified', 'pending', 'failed']).withMessage('Invalid verification status'),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
], asyncHandler(async (req, res) => {
  validateRequest(req);
  
  const { id } = req.params;
  const { verification_status, is_active } = req.body;
  
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;
  
  if (verification_status !== undefined) {
    updates.push(`verification_status = $${paramIndex}`);
    values.push(verification_status);
    paramIndex++;
  }
  
  if (is_active !== undefined) {
    updates.push(`is_active = $${paramIndex}`);
    values.push(is_active);
    paramIndex++;
  }
  
  if (updates.length === 0) {
    throw new ValidationError('No valid fields to update');
  }
  
  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);
  
  const result = await query(
    `UPDATE client_domains SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  
  if (result.rows.length === 0) {
    throw new NotFoundError('Domain not found');
  }
  
  logger.info('Domain updated by admin', {
    adminId: req.user!.id,
    domainId: id,
    updates: { verification_status, is_active },
  });
  
  res.json({
    success: true,
    message: 'Domain updated successfully',
    data: {
      domain: result.rows[0],
    },
  });
}));

// Delete domain
router.delete('/domains/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await query('DELETE FROM client_domains WHERE id = $1 RETURNING id', [id]);
  
  if (result.rows.length === 0) {
    throw new NotFoundError('Domain not found');
  }
  
  logger.info('Domain deleted by admin', {
    adminId: req.user!.id,
    domainId: id,
  });
  
  res.json({
    success: true,
    message: 'Domain deleted successfully',
  });
}));

// Admin Settings Management

// Get all settings
router.get('/settings', asyncHandler(async (req, res) => {
  // Get VAPID keys
  const vapidResult = await query(
    'SELECT id, public_key, private_key, is_active, created_at FROM vapid_keys WHERE is_active = true LIMIT 1'
  );
  
  // Get system settings (you can extend this based on your needs)
  const systemSettings = {
    maxClientsPerAdmin: 1000,
    maxDomainsPerClient: 10,
    maxNotificationsPerDay: 10000,
    enableRegistration: true,
    maintenanceMode: false,
  };
  
  res.json({
    success: true,
    data: {
      vapidKeys: vapidResult.rows[0] || null,
      systemSettings,
    },
  });
}));

// Update system settings
router.put('/settings', [
  body('maxClientsPerAdmin').optional().isInt({ min: 1 }).withMessage('Max clients per admin must be a positive integer'),
  body('maxDomainsPerClient').optional().isInt({ min: 1 }).withMessage('Max domains per client must be a positive integer'),
  body('maxNotificationsPerDay').optional().isInt({ min: 1 }).withMessage('Max notifications per day must be a positive integer'),
  body('enableRegistration').optional().isBoolean().withMessage('Enable registration must be a boolean'),
  body('maintenanceMode').optional().isBoolean().withMessage('Maintenance mode must be a boolean'),
], asyncHandler(async (req, res) => {
  validateRequest(req);
  
  const {
    maxClientsPerAdmin,
    maxDomainsPerClient,
    maxNotificationsPerDay,
    enableRegistration,
    maintenanceMode,
  } = req.body;
  
  // In a real application, you would store these settings in the database
  // For now, we'll just return the updated settings
  const updatedSettings = {
    maxClientsPerAdmin: maxClientsPerAdmin || 1000,
    maxDomainsPerClient: maxDomainsPerClient || 10,
    maxNotificationsPerDay: maxNotificationsPerDay || 10000,
    enableRegistration: enableRegistration !== undefined ? enableRegistration : true,
    maintenanceMode: maintenanceMode !== undefined ? maintenanceMode : false,
  };
  
  logger.info('System settings updated by admin', {
    adminId: req.user!.id,
    settings: updatedSettings,
  });
  
  res.json({
    success: true,
    message: 'Settings updated successfully',
    data: {
      systemSettings: updatedSettings,
    },
  });
}));

// System Health Check
router.get('/system/health', asyncHandler(async (req, res) => {
  const healthChecks = [];
  
  try {
    // Database health check
    const dbStart = Date.now();
    await query('SELECT 1');
    const dbLatency = Date.now() - dbStart;
    
    healthChecks.push({
      service: 'database',
      status: 'healthy',
      latency: `${dbLatency}ms`,
      message: 'Database connection successful',
    });
  } catch (error) {
    healthChecks.push({
      service: 'database',
      status: 'unhealthy',
      latency: 'N/A',
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
  
  try {
    // Check active clients count
    const clientsResult = await query('SELECT COUNT(*) as count FROM clients WHERE is_active = true');
    const activeClients = parseInt(clientsResult.rows[0].count);
    
    healthChecks.push({
      service: 'clients',
      status: 'healthy',
      count: activeClients,
      message: `${activeClients} active clients`,
    });
  } catch (error) {
    healthChecks.push({
      service: 'clients',
      status: 'unhealthy',
      message: 'Failed to fetch client count',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
  
  try {
    // Check push subscribers count
    const subscribersResult = await query('SELECT COUNT(*) as count FROM push_subscribers WHERE is_active = true');
    const activeSubscribers = parseInt(subscribersResult.rows[0].count);
    
    healthChecks.push({
      service: 'push_subscribers',
      status: 'healthy',
      count: activeSubscribers,
      message: `${activeSubscribers} active subscribers`,
    });
  } catch (error) {
    healthChecks.push({
      service: 'push_subscribers',
      status: 'unhealthy',
      message: 'Failed to fetch subscriber count',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
  
  try {
    // Check VAPID keys
    const vapidResult = await query('SELECT COUNT(*) as count FROM vapid_keys WHERE is_active = true');
    const activeVapidKeys = parseInt(vapidResult.rows[0].count);
    
    healthChecks.push({
      service: 'vapid_keys',
      status: activeVapidKeys > 0 ? 'healthy' : 'warning',
      count: activeVapidKeys,
      message: activeVapidKeys > 0 ? 'VAPID keys configured' : 'No active VAPID keys',
    });
  } catch (error) {
    healthChecks.push({
      service: 'vapid_keys',
      status: 'unhealthy',
      message: 'Failed to check VAPID keys',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
  
  // Overall system status
  const hasUnhealthy = healthChecks.some(check => check.status === 'unhealthy');
  const hasWarning = healthChecks.some(check => check.status === 'warning');
  
  let overallStatus = 'healthy';
  if (hasUnhealthy) {
    overallStatus = 'unhealthy';
  } else if (hasWarning) {
    overallStatus = 'warning';
  }
  
  res.json({
    success: true,
    data: {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: healthChecks,
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        },
      },
    },
  });
}));

export default router;