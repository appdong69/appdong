import express from 'express';
import { body, query as expressQuery, validationResult } from 'express-validator';
import { query, transaction } from '../config/database';
import { authenticateClient } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../middleware/errorHandler';
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  AuthorizationError,
} from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const router = express.Router();

// Apply client authentication and rate limiting to all routes
router.use(authenticateClient);
router.use(rateLimiter);

// Validation rules
const domainValidation = [
  body('domain')
    .isURL({ require_protocol: false, require_host: true, require_valid_protocol: false })
    .withMessage('Valid domain is required')
    .customSanitizer((value) => {
      // Remove protocol if present and normalize
      return value.replace(/^https?:\/\//, '').toLowerCase();
    }),
];

const templateValidation = [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Template name must be 1-100 characters'),
  body('title').trim().isLength({ min: 1, max: 100 }).withMessage('Title must be 1-100 characters'),
  body('body').trim().isLength({ min: 1, max: 300 }).withMessage('Body must be 1-300 characters'),
  body('icon').optional().isURL().withMessage('Icon must be a valid URL'),
  body('targetUrl').optional().isURL().withMessage('Target URL must be a valid URL'),
  body('badge').optional().isURL().withMessage('Badge must be a valid URL'),
];

const notificationValidation = [
  body('title').trim().isLength({ min: 1, max: 100 }).withMessage('Title must be 1-100 characters'),
  body('body').trim().isLength({ min: 1, max: 300 }).withMessage('Body must be 1-300 characters'),
  body('icon').optional().isURL().withMessage('Icon must be a valid URL'),
  body('targetUrl').optional().isURL().withMessage('Target URL must be a valid URL'),
  body('badge').optional().isURL().withMessage('Badge must be a valid URL'),
  body('scheduledAt').optional().isISO8601().withMessage('Scheduled time must be a valid ISO 8601 date'),
  body('domainIds').optional().isArray().withMessage('Domain IDs must be an array'),
  body('domainIds.*').optional().isUUID().withMessage('Each domain ID must be a valid UUID'),
];

// Helper function to validate request
const validateRequest = (req: express.Request) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(`Validation failed: ${errors.array().map(e => e.msg).join(', ')}`);
  }
};

// Helper function to check domain ownership
const checkDomainOwnership = async (clientId: string, domainId: string) => {
  const result = await query(
    'SELECT id FROM client_domains WHERE id = $1 AND client_id = $2',
    [domainId, clientId]
  );
  if (result.rows.length === 0) {
    throw new AuthorizationError('Domain not found or access denied');
  }
};

// Dashboard - Get client overview statistics
router.get('/dashboard', asyncHandler(async (req, res) => {
  const clientId = req.user!.id;
  
  // Get client's domain count
  const domainsResult = await query(
    'SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_verified = true) as verified FROM client_domains WHERE client_id = $1',
    [clientId]
  );
  const { total: totalDomains, verified: verifiedDomains } = domainsResult.rows[0];
  
  // Get total subscribers
  const subscribersResult = await query(
    'SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active = true) as active FROM push_subscribers WHERE client_id = $1',
    [clientId]
  );
  const { total: totalSubscribers, active: activeSubscribers } = subscribersResult.rows[0];
  
  // Get notification stats
  const notificationsResult = await query(
    `SELECT 
       COUNT(*) as total,
       COALESCE(SUM(successful_sends), 0) as total_sends,
       COALESCE(SUM(click_count), 0) as total_clicks,
       COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
       COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled_count
     FROM push_notifications WHERE client_id = $1`,
    [clientId]
  );
  const notificationStats = notificationsResult.rows[0];
  
  // Calculate CTR
  const ctr = notificationStats.total_sends > 0 
    ? ((notificationStats.total_clicks / notificationStats.total_sends) * 100).toFixed(2)
    : '0.00';
  
  // Get subscriber growth in the last 30 days
  const subscriberGrowthResult = await query(`
    SELECT 
      DATE(subscribed_at) as date,
      COUNT(*) as new_subscribers
    FROM push_subscribers 
    WHERE client_id = $1 AND subscribed_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY DATE(subscribed_at)
    ORDER BY date DESC
  `, [clientId]);
  
  // Get recent notifications
  const recentNotificationsResult = await query(`
    SELECT 
      id,
      title,
      status,
      successful_sends,
      click_count,
      scheduled_at,
      sent_at,
      created_at
    FROM push_notifications 
    WHERE client_id = $1
    ORDER BY created_at DESC
    LIMIT 5
  `, [clientId]);
  
  // Get top performing domains
  const topDomainsResult = await query(`
    SELECT 
      cd.id,
      cd.domain,
      COUNT(ps.id) as subscriber_count,
      COALESCE(SUM(pn.successful_sends), 0) as total_sends
    FROM client_domains cd
    LEFT JOIN push_subscribers ps ON cd.id = ps.domain_id AND ps.is_active = true
    LEFT JOIN push_notifications pn ON cd.client_id = pn.client_id
    WHERE cd.client_id = $1 AND cd.is_active = true
    GROUP BY cd.id, cd.domain
    ORDER BY subscriber_count DESC, total_sends DESC
    LIMIT 5
  `, [clientId]);
  
  res.json({
    success: true,
    data: {
      overview: {
        totalDomains: parseInt(totalDomains),
        verifiedDomains: parseInt(verifiedDomains),
        totalSubscribers: parseInt(totalSubscribers),
        activeSubscribers: parseInt(activeSubscribers),
        totalNotifications: parseInt(notificationStats.total),
        totalSends: parseInt(notificationStats.total_sends),
        totalClicks: parseInt(notificationStats.total_clicks),
        clickThroughRate: parseFloat(ctr),
        sentNotifications: parseInt(notificationStats.sent_count),
        scheduledNotifications: parseInt(notificationStats.scheduled_count),
      },
      subscriberGrowth: subscriberGrowthResult.rows,
      recentNotifications: recentNotificationsResult.rows,
      topDomains: topDomainsResult.rows,
    },
  });
}));

// Get all client domains
router.get('/domains', [
  expressQuery('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  expressQuery('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
], asyncHandler(async (req, res) => {
  validateRequest(req);
  
  const clientId = req.user!.id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;
  
  // Get domains with subscriber counts
  const domainsResult = await query(`
    SELECT 
      cd.id,
      cd.domain,
      cd.is_verified,
      cd.is_active,
      cd.verification_token,
      cd.created_at,
      COUNT(ps.id) as subscriber_count
    FROM client_domains cd
    LEFT JOIN push_subscribers ps ON cd.id = ps.domain_id AND ps.is_active = true
    WHERE cd.client_id = $1
    GROUP BY cd.id, cd.domain, cd.is_verified, cd.is_active, cd.verification_token, cd.created_at
    ORDER BY cd.created_at DESC
    LIMIT $2 OFFSET $3
  `, [clientId, limit, offset]);
  
  // Get total count
  const countResult = await query(
    'SELECT COUNT(*) as total FROM client_domains WHERE client_id = $1',
    [clientId]
  );
  
  const total = parseInt(countResult.rows[0].total);
  const totalPages = Math.ceil(total / limit);
  
  res.json({
    success: true,
    data: {
      domains: domainsResult.rows,
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

// Add new domain
router.post('/domains', domainValidation, asyncHandler(async (req, res) => {
  validateRequest(req);
  
  const clientId = req.user!.id;
  const { domain } = req.body;
  
  // Check client's domain limit
  const clientResult = await query(
    'SELECT domain_limit FROM clients WHERE id = $1',
    [clientId]
  );
  
  if (clientResult.rows.length === 0) {
    throw new NotFoundError('Client not found');
  }
  
  const domainLimit = clientResult.rows[0].domain_limit;
  
  // Check current domain count
  const currentDomainsResult = await query(
    'SELECT COUNT(*) as count FROM client_domains WHERE client_id = $1',
    [clientId]
  );
  
  const currentDomainCount = parseInt(currentDomainsResult.rows[0].count);
  
  if (currentDomainCount >= domainLimit) {
    throw new AuthorizationError(`Domain limit reached. Maximum allowed: ${domainLimit}`);
  }
  
  // Check if domain already exists for this client
  const existingDomain = await query(
    'SELECT id FROM client_domains WHERE client_id = $1 AND domain = $2',
    [clientId, domain]
  );
  
  if (existingDomain.rows.length > 0) {
    throw new ConflictError('Domain already exists');
  }
  
  // Generate verification token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  
  // Create domain
  const domainId = uuidv4();
  const result = await query(
    `INSERT INTO client_domains (id, client_id, domain, verification_token)
     VALUES ($1, $2, $3, $4)
     RETURNING id, domain, is_verified, is_active, verification_token, created_at`,
    [domainId, clientId, domain, verificationToken]
  );
  
  logger.info('Domain added by client', {
    clientId,
    domainId,
    domain,
  });
  
  res.status(201).json({
    success: true,
    message: 'Domain added successfully',
    data: {
      domain: result.rows[0],
    },
  });
}));

// Verify domain
router.post('/domains/:id/verify', asyncHandler(async (req, res) => {
  const clientId = req.user!.id;
  const domainId = req.params.id;
  
  await checkDomainOwnership(clientId, domainId);
  
  // Get domain details
  const domainResult = await query(
    'SELECT domain, verification_token, is_verified FROM client_domains WHERE id = $1',
    [domainId]
  );
  
  const domain = domainResult.rows[0];
  
  if (domain.is_verified) {
    res.json({
      success: true,
      message: 'Domain is already verified',
      data: { verified: true },
    });
    return;
  }
  
  // In a real implementation, you would check if the verification file exists on the domain
  // For now, we'll simulate verification
  try {
    // Simulate domain verification check
    // In production, you would make an HTTP request to check for the verification file
    const verificationUrl = `https://${domain.domain}/.well-known/pwa-push-verification.txt`;
    
    // For demo purposes, we'll mark it as verified
    // In production, you would fetch the URL and check if it contains the verification token
    
    await query(
      'UPDATE client_domains SET is_verified = true, verified_at = CURRENT_TIMESTAMP WHERE id = $1',
      [domainId]
    );
    
    logger.info('Domain verified by client', {
      clientId,
      domainId,
      domain: domain.domain,
    });
    
    res.json({
      success: true,
      message: 'Domain verified successfully',
      data: { verified: true },
    });
  } catch (error) {
    throw new ValidationError('Domain verification failed. Please ensure the verification file is accessible.');
  }
}));

// Get domain integration code
router.get('/domains/:id/integration', asyncHandler(async (req, res) => {
  const clientId = req.user!.id;
  const domainId = req.params.id;
  
  await checkDomainOwnership(clientId, domainId);
  
  // Get domain details
  const domainResult = await query(
    'SELECT domain, is_verified FROM client_domains WHERE id = $1',
    [domainId]
  );
  
  const domain = domainResult.rows[0];
  
  // Generate integration code
  const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
  
  const javascriptSnippet = `
<!-- PWA Push Notification Integration -->
<script>
  (function() {
    const config = {
      apiUrl: '${apiBaseUrl}',
      clientId: '${clientId}',
      domainId: '${domainId}'
    };
    
    // Load service worker
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register('/sw.js')
        .then(function(registration) {
          console.log('Service Worker registered:', registration);
          
          // Request notification permission
          return Notification.requestPermission();
        })
        .then(function(permission) {
          if (permission === 'granted') {
            return navigator.serviceWorker.ready;
          }
        })
        .then(function(registration) {
          if (registration) {
            // Subscribe to push notifications
            return registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array('${process.env.VAPID_PUBLIC_KEY || 'YOUR_VAPID_PUBLIC_KEY'}')
            });
          }
        })
        .then(function(subscription) {
          if (subscription) {
            // Send subscription to server
            return fetch(config.apiUrl + '/api/push/subscribe', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                subscription: subscription,
                clientId: config.clientId,
                domainId: config.domainId,
                url: window.location.href
              })
            });
          }
        })
        .then(function(response) {
          if (response && response.ok) {
            console.log('Push subscription successful');
          }
        })
        .catch(function(error) {
          console.error('Push subscription failed:', error);
        });
    }
    
    function urlBase64ToUint8Array(base64String) {
      const padding = '='.repeat((4 - base64String.length % 4) % 4);
      const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      
      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);
      
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    }
  })();
</script>`;
  
  const serviceWorker = `
// Service Worker for PWA Push Notifications
self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: data.icon || '/icon-192x192.png',
      badge: data.badge || '/badge-72x72.png',
      data: {
        url: data.url || '/',
        notificationId: data.notificationId
      },
      actions: data.actions || [],
      requireInteraction: data.requireInteraction || false,
      tag: data.tag || 'default'
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  const url = event.notification.data.url;
  const notificationId = event.notification.data.notificationId;
  
  // Track click
  if (notificationId) {
    fetch('${apiBaseUrl}/api/push/track-click', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        notificationId: notificationId
      })
    }).catch(console.error);
  }
  
  // Open URL
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

self.addEventListener('notificationclose', function(event) {
  // Track notification close if needed
  console.log('Notification closed:', event.notification.tag);
});`;
  
  const verificationFile = domain.verification_token;
  
  res.json({
    success: true,
    data: {
      domain: domain.domain,
      verified: domain.is_verified,
      integration: {
        javascriptSnippet,
        serviceWorker,
        verificationFile: {
          filename: '.well-known/pwa-push-verification.txt',
          content: verificationFile,
          instructions: 'Place this file at the root of your domain to verify ownership'
        },
        instructions: [
          '1. Create a .well-known directory in your website root',
          '2. Place the verification file in .well-known/pwa-push-verification.txt',
          '3. Add the JavaScript snippet to your website pages',
          '4. Create sw.js file in your website root with the service worker code',
          '5. Verify your domain using the verify button'
        ]
      }
    },
  });
}));

// Delete domain
router.delete('/domains/:id', asyncHandler(async (req, res) => {
  const clientId = req.user!.id;
  const domainId = req.params.id;
  
  await checkDomainOwnership(clientId, domainId);
  
  // Soft delete by deactivating
  await query(
    'UPDATE client_domains SET is_active = false WHERE id = $1',
    [domainId]
  );
  
  logger.info('Domain deleted by client', {
    clientId,
    domainId,
  });
  
  res.json({
    success: true,
    message: 'Domain deleted successfully',
  });
}));

// Get notification templates
router.get('/templates', [
  expressQuery('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  expressQuery('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
], asyncHandler(async (req, res) => {
  validateRequest(req);
  
  const clientId = req.user!.id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;
  
  const templatesResult = await query(
    `SELECT id, name, title, body, icon, target_url, badge, is_active, created_at, updated_at
     FROM notification_templates 
     WHERE client_id = $1 AND is_active = true
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [clientId, limit, offset]
  );
  
  const countResult = await query(
    'SELECT COUNT(*) as total FROM notification_templates WHERE client_id = $1 AND is_active = true',
    [clientId]
  );
  
  const total = parseInt(countResult.rows[0].total);
  const totalPages = Math.ceil(total / limit);
  
  res.json({
    success: true,
    data: {
      templates: templatesResult.rows,
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

// Create notification template
router.post('/templates', templateValidation, asyncHandler(async (req, res) => {
  validateRequest(req);
  
  const clientId = req.user!.id;
  const { name, title, body, icon, targetUrl, badge } = req.body;
  
  const templateId = uuidv4();
  const result = await query(
    `INSERT INTO notification_templates (id, client_id, name, title, body, icon, target_url, badge)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, name, title, body, icon, target_url, badge, is_active, created_at`,
    [templateId, clientId, name, title, body, icon || null, targetUrl || null, badge || null]
  );
  
  logger.info('Template created by client', {
    clientId,
    templateId,
    name,
  });
  
  res.status(201).json({
    success: true,
    message: 'Template created successfully',
    data: {
      template: result.rows[0],
    },
  });
}));

// Update notification template
router.put('/templates/:id', templateValidation, asyncHandler(async (req, res) => {
  validateRequest(req);
  
  const clientId = req.user!.id;
  const templateId = req.params.id;
  const { name, title, body, icon, targetUrl, badge } = req.body;
  
  // Check ownership
  const ownershipResult = await query(
    'SELECT id FROM notification_templates WHERE id = $1 AND client_id = $2',
    [templateId, clientId]
  );
  
  if (ownershipResult.rows.length === 0) {
    throw new NotFoundError('Template not found');
  }
  
  const result = await query(
    `UPDATE notification_templates 
     SET name = $1, title = $2, body = $3, icon = $4, target_url = $5, badge = $6, updated_at = CURRENT_TIMESTAMP
     WHERE id = $7
     RETURNING id, name, title, body, icon, target_url, badge, is_active, updated_at`,
    [name, title, body, icon || null, targetUrl || null, badge || null, templateId]
  );
  
  logger.info('Template updated by client', {
    clientId,
    templateId,
    name,
  });
  
  res.json({
    success: true,
    message: 'Template updated successfully',
    data: {
      template: result.rows[0],
    },
  });
}));

// Delete notification template
router.delete('/templates/:id', asyncHandler(async (req, res) => {
  const clientId = req.user!.id;
  const templateId = req.params.id;
  
  // Check ownership
  const ownershipResult = await query(
    'SELECT id FROM notification_templates WHERE id = $1 AND client_id = $2',
    [templateId, clientId]
  );
  
  if (ownershipResult.rows.length === 0) {
    throw new NotFoundError('Template not found');
  }
  
  // Soft delete
  await query(
    'UPDATE notification_templates SET is_active = false WHERE id = $1',
    [templateId]
  );
  
  logger.info('Template deleted by client', {
    clientId,
    templateId,
  });
  
  res.json({
    success: true,
    message: 'Template deleted successfully',
  });
}));

export default router;