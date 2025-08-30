import express from 'express';
import { body, query as expressQuery, validationResult } from 'express-validator';
import { query, transaction } from '@/config/database';
import { authenticateClient, authenticateApiKey } from '@/middleware/auth';
import { pushRateLimiter, rateLimiter } from '@/middleware/rateLimiter';
import { asyncHandler } from '@/middleware/errorHandler';
import {
  ValidationError,
  NotFoundError,
  AuthorizationError,
} from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';
import webpush from 'web-push';

const router = express.Router();

// Validation rules
const subscribeValidation = [
  body('subscription').isObject().withMessage('Subscription object is required'),
  body('subscription.endpoint').isURL().withMessage('Valid endpoint URL is required'),
  body('subscription.keys').isObject().withMessage('Subscription keys are required'),
  body('subscription.keys.p256dh').isString().withMessage('p256dh key is required'),
  body('subscription.keys.auth').isString().withMessage('auth key is required'),
  body('clientId').isUUID().withMessage('Valid client ID is required'),
  body('domainId').isUUID().withMessage('Valid domain ID is required'),
  body('url').optional().isURL().withMessage('URL must be valid'),
  body('userAgent').optional().isString().withMessage('User agent must be a string'),
];

const sendNotificationValidation = [
  body('title').trim().isLength({ min: 1, max: 100 }).withMessage('Title must be 1-100 characters'),
  body('body').trim().isLength({ min: 1, max: 300 }).withMessage('Body must be 1-300 characters'),
  body('icon').optional().isURL().withMessage('Icon must be a valid URL'),
  body('targetUrl').optional().isURL().withMessage('Target URL must be a valid URL'),
  body('badge').optional().isURL().withMessage('Badge must be a valid URL'),
  body('scheduledAt').optional().isISO8601().withMessage('Scheduled time must be a valid ISO 8601 date'),
  body('domainIds').optional().isArray().withMessage('Domain IDs must be an array'),
  body('domainIds.*').optional().isUUID().withMessage('Each domain ID must be a valid UUID'),
  body('templateId').optional().isUUID().withMessage('Template ID must be a valid UUID'),
];

const trackClickValidation = [
  body('notificationId').isUUID().withMessage('Valid notification ID is required'),
];

// Helper function to validate request
const validateRequest = (req: express.Request) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(`Validation failed: ${errors.array().map(e => e.msg).join(', ')}`);
  }
};

// Initialize web-push with VAPID keys
const initializeWebPush = async () => {
  try {
    const vapidResult = await query('SELECT public_key, private_key FROM vapid_keys WHERE is_active = true LIMIT 1');
    
    if (vapidResult.rows.length === 0) {
      logger.error('No active VAPID keys found');
      return false;
    }
    
    const { public_key, private_key } = vapidResult.rows[0];
    
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
      public_key,
      private_key
    );
    
    return true;
  } catch (error) {
    logger.error('Failed to initialize web-push', { error });
    return false;
  }
};

// Subscribe to push notifications (public endpoint)
router.post('/subscribe', rateLimiter, subscribeValidation, asyncHandler(async (req, res) => {
  validateRequest(req);
  
  const { subscription, clientId, domainId, url, userAgent } = req.body;
  
  // Verify client and domain exist and are active
  const clientDomainResult = await query(`
    SELECT c.id as client_id, cd.id as domain_id, cd.domain
    FROM clients c
    JOIN client_domains cd ON c.id = cd.client_id
    WHERE c.id = $1 AND cd.id = $2 AND c.is_active = true AND cd.is_active = true AND cd.is_verified = true
  `, [clientId, domainId]);
  
  if (clientDomainResult.rows.length === 0) {
    throw new AuthorizationError('Invalid client or domain');
  }
  
  // Check if subscription already exists
  const existingSubscription = await query(
    'SELECT id FROM push_subscribers WHERE endpoint = $1 AND client_id = $2',
    [subscription.endpoint, clientId]
  );
  
  if (existingSubscription.rows.length > 0) {
    // Update existing subscription
    await query(
      `UPDATE push_subscribers 
       SET p256dh_key = $1, auth_key = $2, domain_id = $3, subscription_url = $4, user_agent = $5, 
           is_active = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6`,
      [
        subscription.keys.p256dh,
        subscription.keys.auth,
        domainId,
        url || null,
        userAgent || null,
        existingSubscription.rows[0].id
      ]
    );
    
    logger.info('Push subscription updated', {
      clientId,
      domainId,
      endpoint: subscription.endpoint,
    });
  } else {
    // Create new subscription
    const subscriberId = uuidv4();
    await query(
      `INSERT INTO push_subscribers (id, client_id, domain_id, endpoint, p256dh_key, auth_key, subscription_url, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        subscriberId,
        clientId,
        domainId,
        subscription.endpoint,
        subscription.keys.p256dh,
        subscription.keys.auth,
        url || null,
        userAgent || null
      ]
    );
    
    logger.info('New push subscription created', {
      clientId,
      domainId,
      subscriberId,
      endpoint: subscription.endpoint,
    });
  }
  
  res.json({
    success: true,
    message: 'Subscription successful',
  });
}));

// Unsubscribe from push notifications (public endpoint)
router.post('/unsubscribe', rateLimiter, [
  body('endpoint').isURL().withMessage('Valid endpoint URL is required'),
  body('clientId').isUUID().withMessage('Valid client ID is required'),
], asyncHandler(async (req, res) => {
  validateRequest(req);
  
  const { endpoint, clientId } = req.body;
  
  // Deactivate subscription
  const result = await query(
    'UPDATE push_subscribers SET is_active = false WHERE endpoint = $1 AND client_id = $2',
    [endpoint, clientId]
  );
  
  if (result.rowCount === 0) {
    throw new NotFoundError('Subscription not found');
  }
  
  logger.info('Push subscription deactivated', {
    clientId,
    endpoint,
  });
  
  res.json({
    success: true,
    message: 'Unsubscribed successfully',
  });
}));

// Send push notification (authenticated client endpoint)
router.post('/send', authenticateClient, pushRateLimiter, sendNotificationValidation, asyncHandler(async (req, res) => {
  validateRequest(req);
  
  const clientId = req.user!.id;
  const { title, body, icon, targetUrl, badge, scheduledAt, domainIds, templateId } = req.body;
  
  // Initialize web-push
  const webPushInitialized = await initializeWebPush();
  if (!webPushInitialized) {
    throw new ValidationError('Push notification service is not configured');
  }
  
  let notificationData = { title, body, icon, targetUrl, badge };
  
  // If template ID is provided, load template data
  if (templateId) {
    const templateResult = await query(
      'SELECT title, body, icon, target_url, badge FROM notification_templates WHERE id = $1 AND client_id = $2 AND is_active = true',
      [templateId, clientId]
    );
    
    if (templateResult.rows.length === 0) {
      throw new NotFoundError('Template not found');
    }
    
    const template = templateResult.rows[0];
    notificationData = {
      title: title || template.title,
      body: body || template.body,
      icon: icon || template.icon,
      targetUrl: targetUrl || template.target_url,
      badge: badge || template.badge,
    };
  }
  
  // Create notification record
  const notificationId = uuidv4();
  const isScheduled = scheduledAt && new Date(scheduledAt) > new Date();
  const status = isScheduled ? 'scheduled' : 'pending';
  
  await query(
    `INSERT INTO push_notifications (id, client_id, title, body, icon, target_url, badge, status, scheduled_at, template_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      notificationId,
      clientId,
      notificationData.title,
      notificationData.body,
      notificationData.icon || null,
      notificationData.targetUrl || null,
      notificationData.badge || null,
      status,
      scheduledAt ? new Date(scheduledAt) : null,
      templateId || null
    ]
  );
  
  if (!isScheduled) {
    // Send immediately
    await sendPushNotification(notificationId, clientId, domainIds, notificationData);
  }
  
  logger.info('Push notification created', {
    clientId,
    notificationId,
    title: notificationData.title,
    scheduled: isScheduled,
  });
  
  res.json({
    success: true,
    message: isScheduled ? 'Notification scheduled successfully' : 'Notification sent successfully',
    data: {
      notificationId,
      status,
      scheduledAt: scheduledAt || null,
    },
  });
}));

// Helper function to send push notification
const sendPushNotification = async (notificationId: string, clientId: string, domainIds: string[] | undefined, notificationData: any) => {
  try {
    // Get subscribers
    let subscribersQuery = `
      SELECT ps.id, ps.endpoint, ps.p256dh_key, ps.auth_key, cd.domain
      FROM push_subscribers ps
      JOIN client_domains cd ON ps.domain_id = cd.id
      WHERE ps.client_id = $1 AND ps.is_active = true AND cd.is_active = true
    `;
    
    const queryParams: (string | string[])[] = [clientId];
    
    if (domainIds && domainIds.length > 0) {
      subscribersQuery += ` AND ps.domain_id = ANY($2)`;
      queryParams.push(domainIds);
    }
    
    const subscribersResult = await query(subscribersQuery, queryParams);
    const subscribers = subscribersResult.rows;
    
    if (subscribers.length === 0) {
      await query(
        'UPDATE push_notifications SET status = $1, error_message = $2 WHERE id = $3',
        ['failed', 'No active subscribers found', notificationId]
      );
      return;
    }
    
    // Prepare notification payload
    const payload = JSON.stringify({
      title: notificationData.title,
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      url: notificationData.targetUrl,
      notificationId,
      tag: `notification-${notificationId}`,
    });
    
    // Send to all subscribers
    const sendPromises = subscribers.map(async (subscriber: any) => {
      try {
        const subscription = {
          endpoint: subscriber.endpoint,
          keys: {
            p256dh: subscriber.p256dh_key,
            auth: subscriber.auth_key,
          },
        };
        
        await webpush.sendNotification(subscription, payload);
        
        // Record successful delivery
        await query(
          `INSERT INTO notification_deliveries (id, notification_id, subscriber_id, status)
           VALUES ($1, $2, $3, $4)`,
          [uuidv4(), notificationId, subscriber.id, 'delivered']
        );
        
        return { success: true, subscriberId: subscriber.id };
      } catch (error: any) {
        logger.error('Failed to send push notification to subscriber', {
          notificationId,
          subscriberId: subscriber.id,
          error: error.message,
        });
        
        // Record failed delivery
        await query(
          `INSERT INTO notification_deliveries (id, notification_id, subscriber_id, status, error_message)
           VALUES ($1, $2, $3, $4, $5)`,
          [uuidv4(), notificationId, subscriber.id, 'failed', error.message]
        );
        
        // If subscription is invalid, deactivate it
        if (error.statusCode === 410 || error.statusCode === 404) {
          await query(
            'UPDATE push_subscribers SET is_active = false WHERE id = $1',
            [subscriber.id]
          );
        }
        
        return { success: false, subscriberId: subscriber.id, error: error.message };
      }
    });
    
    const results = await Promise.all(sendPromises);
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    // Update notification status
    await query(
      `UPDATE push_notifications 
       SET status = $1, successful_sends = $2, failed_sends = $3, sent_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      ['sent', successCount, failureCount, notificationId]
    );
    
    logger.info('Push notification sent', {
      notificationId,
      clientId,
      totalSubscribers: subscribers.length,
      successCount,
      failureCount,
    });
  } catch (error: any) {
    logger.error('Failed to send push notification', {
      notificationId,
      clientId,
      error: error.message,
    });
    
    await query(
      'UPDATE push_notifications SET status = $1, error_message = $2 WHERE id = $3',
      ['failed', error.message, notificationId]
    );
  }
};

// Track notification click (public endpoint)
router.post('/track-click', rateLimiter, trackClickValidation, asyncHandler(async (req, res) => {
  validateRequest(req);
  
  const { notificationId } = req.body;
  
  // Update click count
  const result = await query(
    'UPDATE push_notifications SET click_count = click_count + 1 WHERE id = $1',
    [notificationId]
  );
  
  if (result.rowCount === 0) {
    throw new NotFoundError('Notification not found');
  }
  
  // Record analytics event
  await query(
    `INSERT INTO analytics_events (id, notification_id, event_type, event_data)
     VALUES ($1, $2, $3, $4)`,
    [
      uuidv4(),
      notificationId,
      'click',
      JSON.stringify({
        timestamp: new Date().toISOString(),
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      })
    ]
  );
  
  logger.info('Notification click tracked', {
    notificationId,
  });
  
  res.json({
    success: true,
    message: 'Click tracked successfully',
  });
}));

// Get client notifications
router.get('/notifications', authenticateClient, [
  expressQuery('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  expressQuery('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  expressQuery('status').optional().isIn(['pending', 'scheduled', 'sent', 'failed']).withMessage('Invalid status'),
], asyncHandler(async (req, res) => {
  validateRequest(req);
  
  const clientId = req.user!.id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const status = req.query.status as string;
  const offset = (page - 1) * limit;
  
  // Build WHERE clause
  let whereClause = 'WHERE client_id = $1';
  const queryParams: any[] = [clientId];
  let paramIndex = 2;
  
  if (status) {
    whereClause += ` AND status = $${paramIndex}`;
    queryParams.push(status);
    paramIndex++;
  }
  
  // Get notifications
  const notificationsQuery = `
    SELECT 
      id,
      title,
      body,
      icon,
      target_url,
      badge,
      status,
      successful_sends,
      failed_sends,
      click_count,
      scheduled_at,
      sent_at,
      created_at,
      template_id
    FROM push_notifications
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  
  queryParams.push(limit, offset);
  
  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total
    FROM push_notifications
    ${whereClause}
  `;
  
  const [notificationsResult, countResult] = await Promise.all([
    query(notificationsQuery, queryParams),
    query(countQuery, queryParams.slice(0, -2)), // Remove limit and offset for count
  ]);
  
  const total = parseInt(countResult.rows[0].total);
  const totalPages = Math.ceil(total / limit);
  
  res.json({
    success: true,
    data: {
      notifications: notificationsResult.rows,
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

// Get notification details
router.get('/notifications/:id', authenticateClient, asyncHandler(async (req, res) => {
  const clientId = req.user!.id;
  const notificationId = req.params.id;
  
  // Get notification with delivery stats
  const notificationResult = await query(`
    SELECT 
      pn.*,
      COUNT(nd.id) as total_deliveries,
      COUNT(nd.id) FILTER (WHERE nd.status = 'delivered') as successful_deliveries,
      COUNT(nd.id) FILTER (WHERE nd.status = 'failed') as failed_deliveries
    FROM push_notifications pn
    LEFT JOIN notification_deliveries nd ON pn.id = nd.notification_id
    WHERE pn.id = $1 AND pn.client_id = $2
    GROUP BY pn.id
  `, [notificationId, clientId]);
  
  if (notificationResult.rows.length === 0) {
    throw new NotFoundError('Notification not found');
  }
  
  // Get delivery details
  const deliveriesResult = await query(`
    SELECT 
      nd.status,
      nd.delivered_at,
      nd.error_message,
      ps.endpoint,
      cd.domain
    FROM notification_deliveries nd
    JOIN push_subscribers ps ON nd.subscriber_id = ps.id
    JOIN client_domains cd ON ps.domain_id = cd.id
    WHERE nd.notification_id = $1
    ORDER BY nd.delivered_at DESC
    LIMIT 100
  `, [notificationId]);
  
  res.json({
    success: true,
    data: {
      notification: notificationResult.rows[0],
      deliveries: deliveriesResult.rows,
    },
  });
}));

// Process scheduled notifications (internal cron job endpoint)
router.post('/process-scheduled', authenticateApiKey, asyncHandler(async (req, res) => {
  // Get scheduled notifications that are due
  const scheduledNotifications = await query(`
    SELECT id, client_id, title, body, icon, target_url, badge
    FROM push_notifications
    WHERE status = 'scheduled' AND scheduled_at <= CURRENT_TIMESTAMP
    ORDER BY scheduled_at ASC
    LIMIT 100
  `);
  
  const processedCount = scheduledNotifications.rows.length;
  
  // Process each notification
  for (const notification of scheduledNotifications.rows) {
    await sendPushNotification(
      notification.id,
      notification.client_id,
      undefined, // Send to all domains
      {
        title: notification.title,
        body: notification.body,
        icon: notification.icon,
        targetUrl: notification.target_url,
        badge: notification.badge,
      }
    );
  }
  
  logger.info('Processed scheduled notifications', {
    count: processedCount,
  });
  
  res.json({
    success: true,
    message: `Processed ${processedCount} scheduled notifications`,
    data: {
      processedCount,
    },
  });
}));

export default router;