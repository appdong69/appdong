import express from 'express';
import { query as expressQuery, validationResult } from 'express-validator';
import { query } from '@/config/database';
import { authenticateClient, authenticateAdmin } from '@/middleware/auth';
import { rateLimiter } from '@/middleware/rateLimiter';
import { asyncHandler } from '@/middleware/errorHandler';
import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
} from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';

const router = express.Router();

// Apply rate limiting to all routes
router.use(rateLimiter);

// Validation rules
const dateRangeValidation = [
  expressQuery('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
  expressQuery('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
  expressQuery('period').optional().isIn(['7d', '30d', '90d', '1y']).withMessage('Period must be 7d, 30d, 90d, or 1y'),
];

// Helper function to validate request
const validateRequest = (req: express.Request) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(`Validation failed: ${errors.array().map(e => e.msg).join(', ')}`);
  }
};

// Helper function to get date range
const getDateRange = (req: express.Request) => {
  const { startDate, endDate, period } = req.query;
  
  if (startDate && endDate) {
    return {
      start: new Date(startDate as string),
      end: new Date(endDate as string),
    };
  }
  
  const end = new Date();
  let start = new Date();
  
  switch (period) {
    case '7d':
      start.setDate(end.getDate() - 7);
      break;
    case '30d':
      start.setDate(end.getDate() - 30);
      break;
    case '90d':
      start.setDate(end.getDate() - 90);
      break;
    case '1y':
      start.setFullYear(end.getFullYear() - 1);
      break;
    default:
      start.setDate(end.getDate() - 30); // Default to 30 days
  }
  
  return { start, end };
};

// Client Analytics Routes

// Get client overview analytics
router.get('/client/overview', authenticateClient, dateRangeValidation, asyncHandler(async (req, res) => {
  validateRequest(req);
  
  const clientId = req.user!.id;
  const { start, end } = getDateRange(req);
  
  // Get subscriber metrics
  const subscriberMetrics = await query(`
    SELECT 
      COUNT(*) as total_subscribers,
      COUNT(*) FILTER (WHERE is_active = true) as active_subscribers,
      COUNT(*) FILTER (WHERE subscribed_at >= $2 AND subscribed_at <= $3) as new_subscribers_period
    FROM push_subscribers 
    WHERE client_id = $1
  `, [clientId, start, end]);
  
  // Get notification metrics
  const notificationMetrics = await query(`
    SELECT 
      COUNT(*) as total_notifications,
      COUNT(*) FILTER (WHERE status = 'sent') as sent_notifications,
      COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled_notifications,
      COUNT(*) FILTER (WHERE status = 'failed') as failed_notifications,
      COALESCE(SUM(successful_sends), 0) as total_sends,
      COALESCE(SUM(click_count), 0) as total_clicks,
      COUNT(*) FILTER (WHERE created_at >= $2 AND created_at <= $3) as notifications_period
    FROM push_notifications 
    WHERE client_id = $1
  `, [clientId, start, end]);
  
  // Get domain metrics
  const domainMetrics = await query(`
    SELECT 
      COUNT(*) as total_domains,
      COUNT(*) FILTER (WHERE is_verified = true) as verified_domains,
      COUNT(*) FILTER (WHERE is_active = true) as active_domains
    FROM client_domains 
    WHERE client_id = $1
  `, [clientId]);
  
  // Calculate metrics
  const subscriber = subscriberMetrics.rows[0];
  const notification = notificationMetrics.rows[0];
  const domain = domainMetrics.rows[0];
  
  const clickThroughRate = notification.total_sends > 0 
    ? ((notification.total_clicks / notification.total_sends) * 100).toFixed(2)
    : '0.00';
  
  const deliveryRate = notification.total_sends > 0 && notification.sent_notifications > 0
    ? ((notification.total_sends / (notification.sent_notifications * subscriber.active_subscribers)) * 100).toFixed(2)
    : '0.00';
  
  res.json({
    success: true,
    data: {
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      subscribers: {
        total: parseInt(subscriber.total_subscribers),
        active: parseInt(subscriber.active_subscribers),
        newInPeriod: parseInt(subscriber.new_subscribers_period),
        churnRate: subscriber.total_subscribers > 0 
          ? (((subscriber.total_subscribers - subscriber.active_subscribers) / subscriber.total_subscribers) * 100).toFixed(2)
          : '0.00',
      },
      notifications: {
        total: parseInt(notification.total_notifications),
        sent: parseInt(notification.sent_notifications),
        scheduled: parseInt(notification.scheduled_notifications),
        failed: parseInt(notification.failed_notifications),
        totalSends: parseInt(notification.total_sends),
        totalClicks: parseInt(notification.total_clicks),
        clickThroughRate: parseFloat(clickThroughRate),
        deliveryRate: parseFloat(deliveryRate),
        newInPeriod: parseInt(notification.notifications_period),
      },
      domains: {
        total: parseInt(domain.total_domains),
        verified: parseInt(domain.verified_domains),
        active: parseInt(domain.active_domains),
      },
    },
  });
}));

// Get subscriber growth analytics
router.get('/client/subscriber-growth', authenticateClient, dateRangeValidation, asyncHandler(async (req, res) => {
  validateRequest(req);
  
  const clientId = req.user!.id;
  const { start, end } = getDateRange(req);
  
  // Get daily subscriber growth
  const dailyGrowth = await query(`
    SELECT 
      DATE(subscribed_at) as date,
      COUNT(*) as new_subscribers,
      COUNT(*) FILTER (WHERE is_active = true) as active_new_subscribers
    FROM push_subscribers 
    WHERE client_id = $1 AND subscribed_at >= $2 AND subscribed_at <= $3
    GROUP BY DATE(subscribed_at)
    ORDER BY date ASC
  `, [clientId, start, end]);
  
  // Get cumulative subscriber count
  const cumulativeGrowth = await query(`
    SELECT 
      DATE(subscribed_at) as date,
      COUNT(*) OVER (ORDER BY DATE(subscribed_at)) as cumulative_subscribers
    FROM push_subscribers 
    WHERE client_id = $1 AND subscribed_at <= $2
    GROUP BY DATE(subscribed_at)
    ORDER BY date ASC
  `, [clientId, end]);
  
  // Get growth by domain
  const domainGrowth = await query(`
    SELECT 
      cd.domain,
      COUNT(ps.id) as subscriber_count,
      COUNT(ps.id) FILTER (WHERE ps.subscribed_at >= $2 AND ps.subscribed_at <= $3) as new_subscribers_period
    FROM client_domains cd
    LEFT JOIN push_subscribers ps ON cd.id = ps.domain_id AND ps.is_active = true
    WHERE cd.client_id = $1 AND cd.is_active = true
    GROUP BY cd.id, cd.domain
    ORDER BY subscriber_count DESC
  `, [clientId, start, end]);
  
  res.json({
    success: true,
    data: {
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      dailyGrowth: dailyGrowth.rows,
      cumulativeGrowth: cumulativeGrowth.rows,
      domainGrowth: domainGrowth.rows,
    },
  });
}));

// Get notification performance analytics
router.get('/client/notification-performance', authenticateClient, dateRangeValidation, asyncHandler(async (req, res) => {
  validateRequest(req);
  
  const clientId = req.user!.id;
  const { start, end } = getDateRange(req);
  
  // Get notification performance metrics
  const performanceMetrics = await query(`
    SELECT 
      id,
      title,
      successful_sends,
      failed_sends,
      click_count,
      sent_at,
      CASE 
        WHEN successful_sends > 0 THEN ROUND((click_count::decimal / successful_sends) * 100, 2)
        ELSE 0
      END as click_through_rate
    FROM push_notifications 
    WHERE client_id = $1 AND status = 'sent' AND sent_at >= $2 AND sent_at <= $3
    ORDER BY sent_at DESC
    LIMIT 50
  `, [clientId, start, end]);
  
  // Get hourly send patterns
  const hourlySendPatterns = await query(`
    SELECT 
      EXTRACT(HOUR FROM sent_at) as hour,
      COUNT(*) as notification_count,
      AVG(successful_sends) as avg_successful_sends,
      AVG(click_count) as avg_clicks
    FROM push_notifications 
    WHERE client_id = $1 AND status = 'sent' AND sent_at >= $2 AND sent_at <= $3
    GROUP BY EXTRACT(HOUR FROM sent_at)
    ORDER BY hour ASC
  `, [clientId, start, end]);
  
  // Get top performing notifications
  const topPerforming = await query(`
    SELECT 
      id,
      title,
      successful_sends,
      click_count,
      sent_at,
      CASE 
        WHEN successful_sends > 0 THEN ROUND((click_count::decimal / successful_sends) * 100, 2)
        ELSE 0
      END as click_through_rate
    FROM push_notifications 
    WHERE client_id = $1 AND status = 'sent' AND sent_at >= $2 AND sent_at <= $3 AND successful_sends > 0
    ORDER BY (click_count::decimal / successful_sends) DESC, click_count DESC
    LIMIT 10
  `, [clientId, start, end]);
  
  res.json({
    success: true,
    data: {
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      performanceMetrics: performanceMetrics.rows,
      hourlySendPatterns: hourlySendPatterns.rows,
      topPerforming: topPerforming.rows,
    },
  });
}));

// Get domain analytics
router.get('/client/domain-analytics', authenticateClient, dateRangeValidation, asyncHandler(async (req, res) => {
  validateRequest(req);
  
  const clientId = req.user!.id;
  const { start, end } = getDateRange(req);
  
  // Get domain performance
  const domainPerformance = await query(`
    SELECT 
      cd.id,
      cd.domain,
      cd.is_verified,
      cd.created_at,
      COUNT(DISTINCT ps.id) as total_subscribers,
      COUNT(DISTINCT ps.id) FILTER (WHERE ps.is_active = true) as active_subscribers,
      COUNT(DISTINCT ps.id) FILTER (WHERE ps.subscribed_at >= $2 AND ps.subscribed_at <= $3) as new_subscribers_period,
      COALESCE(SUM(pn.successful_sends), 0) as total_sends,
      COALESCE(SUM(pn.click_count), 0) as total_clicks
    FROM client_domains cd
    LEFT JOIN push_subscribers ps ON cd.id = ps.domain_id
    LEFT JOIN push_notifications pn ON cd.client_id = pn.client_id
    WHERE cd.client_id = $1 AND cd.is_active = true
    GROUP BY cd.id, cd.domain, cd.is_verified, cd.created_at
    ORDER BY active_subscribers DESC, total_sends DESC
  `, [clientId, start, end]);
  
  // Get subscriber activity by domain
  const subscriberActivity = await query(`
    SELECT 
      cd.domain,
      DATE(ps.subscribed_at) as date,
      COUNT(ps.id) as new_subscribers
    FROM client_domains cd
    JOIN push_subscribers ps ON cd.id = ps.domain_id
    WHERE cd.client_id = $1 AND ps.subscribed_at >= $2 AND ps.subscribed_at <= $3
    GROUP BY cd.domain, DATE(ps.subscribed_at)
    ORDER BY date ASC, cd.domain ASC
  `, [clientId, start, end]);
  
  res.json({
    success: true,
    data: {
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      domainPerformance: domainPerformance.rows,
      subscriberActivity: subscriberActivity.rows,
    },
  });
}));

// Admin Analytics Routes

// Get platform overview analytics (admin only)
router.get('/admin/platform-overview', authenticateAdmin, dateRangeValidation, asyncHandler(async (req, res) => {
  validateRequest(req);
  
  const { start, end } = getDateRange(req);
  
  // Get client metrics
  const clientMetrics = await query(`
    SELECT 
      COUNT(*) as total_clients,
      COUNT(*) FILTER (WHERE is_active = true) as active_clients,
      COUNT(*) FILTER (WHERE created_at >= $1 AND created_at <= $2) as new_clients_period
    FROM clients
  `, [start, end]);
  
  // Get subscriber metrics across all clients
  const subscriberMetrics = await query(`
    SELECT 
      COUNT(*) as total_subscribers,
      COUNT(*) FILTER (WHERE is_active = true) as active_subscribers,
      COUNT(*) FILTER (WHERE subscribed_at >= $1 AND subscribed_at <= $2) as new_subscribers_period
    FROM push_subscribers
  `, [start, end]);
  
  // Get notification metrics across all clients
  const notificationMetrics = await query(`
    SELECT 
      COUNT(*) as total_notifications,
      COUNT(*) FILTER (WHERE status = 'sent') as sent_notifications,
      COALESCE(SUM(successful_sends), 0) as total_sends,
      COALESCE(SUM(click_count), 0) as total_clicks,
      COUNT(*) FILTER (WHERE created_at >= $1 AND created_at <= $2) as notifications_period
    FROM push_notifications
  `, [start, end]);
  
  // Get domain metrics
  const domainMetrics = await query(`
    SELECT 
      COUNT(*) as total_domains,
      COUNT(*) FILTER (WHERE is_verified = true) as verified_domains,
      COUNT(*) FILTER (WHERE is_active = true) as active_domains
    FROM client_domains
  `);
  
  const client = clientMetrics.rows[0];
  const subscriber = subscriberMetrics.rows[0];
  const notification = notificationMetrics.rows[0];
  const domain = domainMetrics.rows[0];
  
  const platformCTR = notification.total_sends > 0 
    ? ((notification.total_clicks / notification.total_sends) * 100).toFixed(2)
    : '0.00';
  
  res.json({
    success: true,
    data: {
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      clients: {
        total: parseInt(client.total_clients),
        active: parseInt(client.active_clients),
        newInPeriod: parseInt(client.new_clients_period),
      },
      subscribers: {
        total: parseInt(subscriber.total_subscribers),
        active: parseInt(subscriber.active_subscribers),
        newInPeriod: parseInt(subscriber.new_subscribers_period),
      },
      notifications: {
        total: parseInt(notification.total_notifications),
        sent: parseInt(notification.sent_notifications),
        totalSends: parseInt(notification.total_sends),
        totalClicks: parseInt(notification.total_clicks),
        clickThroughRate: parseFloat(platformCTR),
        newInPeriod: parseInt(notification.notifications_period),
      },
      domains: {
        total: parseInt(domain.total_domains),
        verified: parseInt(domain.verified_domains),
        active: parseInt(domain.active_domains),
      },
    },
  });
}));

// Get client performance rankings (admin only)
router.get('/admin/client-rankings', authenticateAdmin, dateRangeValidation, asyncHandler(async (req, res) => {
  validateRequest(req);
  
  const { start, end } = getDateRange(req);
  
  // Get top clients by subscribers
  const topClientsBySubscribers = await query(`
    SELECT 
      c.id,
      c.name,
      c.email,
      c.subscription_plan,
      COUNT(DISTINCT ps.id) as total_subscribers,
      COUNT(DISTINCT ps.id) FILTER (WHERE ps.is_active = true) as active_subscribers,
      COUNT(DISTINCT ps.id) FILTER (WHERE ps.subscribed_at >= $1 AND ps.subscribed_at <= $2) as new_subscribers_period
    FROM clients c
    LEFT JOIN push_subscribers ps ON c.id = ps.client_id
    WHERE c.is_active = true
    GROUP BY c.id, c.name, c.email, c.subscription_plan
    ORDER BY active_subscribers DESC, total_subscribers DESC
    LIMIT 20
  `, [start, end]);
  
  // Get top clients by notification volume
  const topClientsByNotifications = await query(`
    SELECT 
      c.id,
      c.name,
      c.email,
      c.subscription_plan,
      COUNT(pn.id) as total_notifications,
      COALESCE(SUM(pn.successful_sends), 0) as total_sends,
      COALESCE(SUM(pn.click_count), 0) as total_clicks,
      CASE 
        WHEN SUM(pn.successful_sends) > 0 THEN ROUND((SUM(pn.click_count)::decimal / SUM(pn.successful_sends)) * 100, 2)
        ELSE 0
      END as click_through_rate
    FROM clients c
    LEFT JOIN push_notifications pn ON c.id = pn.client_id AND pn.status = 'sent' AND pn.sent_at >= $1 AND pn.sent_at <= $2
    WHERE c.is_active = true
    GROUP BY c.id, c.name, c.email, c.subscription_plan
    HAVING COUNT(pn.id) > 0
    ORDER BY total_sends DESC, total_notifications DESC
    LIMIT 20
  `, [start, end]);
  
  // Get growth leaders
  const growthLeaders = await query(`
    SELECT 
      c.id,
      c.name,
      c.email,
      c.subscription_plan,
      COUNT(DISTINCT ps.id) FILTER (WHERE ps.subscribed_at >= $1 AND ps.subscribed_at <= $2) as new_subscribers_period,
      COUNT(DISTINCT ps.id) FILTER (WHERE ps.subscribed_at < $1) as subscribers_before_period,
      CASE 
        WHEN COUNT(DISTINCT ps.id) FILTER (WHERE ps.subscribed_at < $1) > 0 
        THEN ROUND((COUNT(DISTINCT ps.id) FILTER (WHERE ps.subscribed_at >= $1 AND ps.subscribed_at <= $2)::decimal / COUNT(DISTINCT ps.id) FILTER (WHERE ps.subscribed_at < $1)) * 100, 2)
        ELSE 0
      END as growth_rate
    FROM clients c
    LEFT JOIN push_subscribers ps ON c.id = ps.client_id
    WHERE c.is_active = true
    GROUP BY c.id, c.name, c.email, c.subscription_plan
    HAVING COUNT(DISTINCT ps.id) FILTER (WHERE ps.subscribed_at >= $1 AND ps.subscribed_at <= $2) > 0
    ORDER BY growth_rate DESC, new_subscribers_period DESC
    LIMIT 20
  `, [start, end]);
  
  res.json({
    success: true,
    data: {
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      topClientsBySubscribers: topClientsBySubscribers.rows,
      topClientsByNotifications: topClientsByNotifications.rows,
      growthLeaders: growthLeaders.rows,
    },
  });
}));

// Get platform usage trends (admin only)
router.get('/admin/usage-trends', authenticateAdmin, dateRangeValidation, asyncHandler(async (req, res) => {
  validateRequest(req);
  
  const { start, end } = getDateRange(req);
  
  // Get daily platform activity
  const dailyActivity = await query(`
    SELECT 
      date,
      COALESCE(new_clients, 0) as new_clients,
      COALESCE(new_subscribers, 0) as new_subscribers,
      COALESCE(notifications_sent, 0) as notifications_sent,
      COALESCE(total_sends, 0) as total_sends,
      COALESCE(total_clicks, 0) as total_clicks
    FROM (
      SELECT generate_series($1::date, $2::date, '1 day'::interval)::date as date
    ) dates
    LEFT JOIN (
      SELECT DATE(created_at) as date, COUNT(*) as new_clients
      FROM clients
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY DATE(created_at)
    ) c ON dates.date = c.date
    LEFT JOIN (
      SELECT DATE(subscribed_at) as date, COUNT(*) as new_subscribers
      FROM push_subscribers
      WHERE subscribed_at >= $1 AND subscribed_at <= $2
      GROUP BY DATE(subscribed_at)
    ) s ON dates.date = s.date
    LEFT JOIN (
      SELECT DATE(sent_at) as date, COUNT(*) as notifications_sent, SUM(successful_sends) as total_sends, SUM(click_count) as total_clicks
      FROM push_notifications
      WHERE status = 'sent' AND sent_at >= $1 AND sent_at <= $2
      GROUP BY DATE(sent_at)
    ) n ON dates.date = n.date
    ORDER BY date ASC
  `, [start, end]);
  
  // Get subscription plan distribution
  const subscriptionPlans = await query(`
    SELECT 
      subscription_plan,
      COUNT(*) as client_count,
      COUNT(*) FILTER (WHERE is_active = true) as active_client_count
    FROM clients
    GROUP BY subscription_plan
    ORDER BY client_count DESC
  `);
  
  res.json({
    success: true,
    data: {
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      dailyActivity: dailyActivity.rows,
      subscriptionPlans: subscriptionPlans.rows,
    },
  });
}));

// Export analytics data (admin only)
router.get('/admin/export', authenticateAdmin, dateRangeValidation, asyncHandler(async (req, res) => {
  validateRequest(req);
  
  const { start, end } = getDateRange(req);
  const format = req.query.format as string || 'csv';
  
  // Get comprehensive analytics data
  const analyticsData = await query(`
    SELECT 
      c.id as client_id,
      c.name as client_name,
      c.email as client_email,
      c.subscription_plan,
      c.created_at as client_created_at,
      COUNT(DISTINCT ps.id) as total_subscribers,
      COUNT(DISTINCT ps.id) FILTER (WHERE ps.subscribed_at >= $1 AND ps.subscribed_at <= $2) as new_subscribers,
      COUNT(DISTINCT pn.id) as total_notifications,
      COUNT(DISTINCT pn.id) FILTER (WHERE pn.sent_at >= $1 AND pn.sent_at <= $2) as notifications_in_period,
      COALESCE(SUM(pn.successful_sends) FILTER (WHERE pn.sent_at >= $1 AND pn.sent_at <= $2), 0) as total_sends,
      COALESCE(SUM(pn.click_count) FILTER (WHERE pn.sent_at >= $1 AND pn.sent_at <= $2), 0) as total_clicks,
      COUNT(DISTINCT d.id) as total_domains,
      COUNT(DISTINCT d.id) FILTER (WHERE d.verification_status = 'verified') as verified_domains
    FROM clients c
    LEFT JOIN push_subscribers ps ON c.id = ps.client_id
    LEFT JOIN push_notifications pn ON c.id = pn.client_id AND pn.status = 'sent'
    LEFT JOIN domains d ON c.id = d.client_id
    WHERE c.is_active = true
    GROUP BY c.id, c.name, c.email, c.subscription_plan, c.created_at
    ORDER BY total_subscribers DESC, total_sends DESC
  `, [start, end]);
  
  if (format === 'json') {
    res.json({
      success: true,
      data: {
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
        analytics: analyticsData.rows,
        exportedAt: new Date().toISOString(),
      },
    });
    return;
  }
  
  // Generate CSV format
  const csvHeaders = [
    'Client ID',
    'Client Name',
    'Client Email',
    'Subscription Plan',
    'Client Created At',
    'Total Subscribers',
    'New Subscribers (Period)',
    'Total Notifications',
    'Notifications (Period)',
    'Total Sends (Period)',
    'Total Clicks (Period)',
    'Total Domains',
    'Verified Domains',
  ];
  
  const csvRows = analyticsData.rows.map((row: any) => [
    row.client_id,
    `"${row.client_name}"`,
    row.client_email,
    row.subscription_plan,
    row.client_created_at,
    row.total_subscribers,
    row.new_subscribers,
    row.total_notifications,
    row.notifications_in_period,
    row.total_sends,
    row.total_clicks,
    row.total_domains,
    row.verified_domains,
  ]);
  
  const csvContent = [csvHeaders.join(','), ...csvRows.map((row: any[]) => row.join(','))].join('\n');
  
  const filename = `analytics_export_${start.toISOString().split('T')[0]}_to_${end.toISOString().split('T')[0]}.csv`;
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csvContent);
}));

export default router;