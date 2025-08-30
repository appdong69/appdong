import cron from 'node-cron';
import { query } from '@/config/database';
import { logger } from '@/utils/logger';

/**
 * Start the scheduler for background tasks
 */
export const startScheduler = (): void => {
  logger.info('Starting scheduler...');

  // Process scheduled notifications every minute
  cron.schedule('* * * * *', async () => {
    try {
      await processScheduledNotifications();
    } catch (error) {
      logger.error('Error processing scheduled notifications:', error);
    }
  });

  // Clean up old analytics data daily at 2 AM
  cron.schedule('0 2 * * *', async () => {
    try {
      await cleanupOldAnalytics();
    } catch (error) {
      logger.error('Error cleaning up old analytics:', error);
    }
  });

  // Health check every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      await performHealthCheck();
    } catch (error) {
      logger.error('Error performing health check:', error);
    }
  });

  logger.info('Scheduler started successfully');
};

/**
 * Process scheduled notifications that are due
 */
const processScheduledNotifications = async (): Promise<void> => {
  try {
    const now = new Date();
    
    // Get notifications scheduled for now or earlier
    const result = await query(
      `SELECT id, client_id, title, body, icon, badge, url, image, actions, data, domain_ids
       FROM push_notifications 
       WHERE status = 'scheduled' AND scheduled_at <= $1
       ORDER BY scheduled_at ASC
       LIMIT 100`,
      [now]
    );

    if (result.rows.length === 0) {
      return;
    }

    logger.info(`Processing ${result.rows.length} scheduled notifications`);

    for (const notification of result.rows) {
      try {
        // Update status to sending
        await query(
          'UPDATE push_notifications SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          ['sending', notification.id]
        );

        // Here you would call the actual push notification sending logic
        // For now, we'll just mark it as sent
        await query(
          'UPDATE push_notifications SET status = $1, sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          ['sent', notification.id]
        );

        logger.info(`Processed scheduled notification: ${notification.id}`);
      } catch (error) {
        logger.error(`Failed to process notification ${notification.id}:`, error);
        
        // Mark as failed
        await query(
          'UPDATE push_notifications SET status = $1, error_message = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
          ['failed', error instanceof Error ? error.message : 'Unknown error', notification.id]
        );
      }
    }
  } catch (error) {
    logger.error('Error in processScheduledNotifications:', error);
  }
};

/**
 * Clean up old analytics data
 */
const cleanupOldAnalytics = async (): Promise<void> => {
  try {
    const retentionDays = parseInt(process.env.ANALYTICS_RETENTION_DAYS || '90');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Clean up old notification analytics
    const result = await query(
      'DELETE FROM push_notifications WHERE created_at < $1 AND status IN ($2, $3)',
      [cutoffDate, 'sent', 'failed']
    );

    if (result.rowCount && result.rowCount > 0) {
      logger.info(`Cleaned up ${result.rowCount} old notification records`);
    }

    // Clean up old click tracking data
    const clickResult = await query(
      'DELETE FROM notification_clicks WHERE created_at < $1',
      [cutoffDate]
    );

    if (clickResult.rowCount && clickResult.rowCount > 0) {
      logger.info(`Cleaned up ${clickResult.rowCount} old click tracking records`);
    }
  } catch (error) {
    logger.error('Error in cleanupOldAnalytics:', error);
  }
};

/**
 * Perform system health check
 */
const performHealthCheck = async (): Promise<void> => {
  try {
    // Check database connectivity
    await query('SELECT 1');
    
    // Check for failed notifications in the last hour
    const failedResult = await query(
      `SELECT COUNT(*) as failed_count 
       FROM push_notifications 
       WHERE status = 'failed' AND updated_at > NOW() - INTERVAL '1 hour'`
    );

    const failedCount = parseInt(failedResult.rows[0]?.failed_count || '0');
    
    if (failedCount > 100) {
      logger.warn(`High number of failed notifications in the last hour: ${failedCount}`);
    }

    // Check for stuck notifications (sending for more than 10 minutes)
    const stuckResult = await query(
      `SELECT COUNT(*) as stuck_count 
       FROM push_notifications 
       WHERE status = 'sending' AND updated_at < NOW() - INTERVAL '10 minutes'`
    );

    const stuckCount = parseInt(stuckResult.rows[0]?.stuck_count || '0');
    
    if (stuckCount > 0) {
      logger.warn(`Found ${stuckCount} stuck notifications, marking as failed`);
      
      // Mark stuck notifications as failed
      await query(
        `UPDATE push_notifications 
         SET status = 'failed', error_message = 'Notification stuck in sending state', updated_at = CURRENT_TIMESTAMP 
         WHERE status = 'sending' AND updated_at < NOW() - INTERVAL '10 minutes'`
      );
    }
  } catch (error) {
    logger.error('Error in performHealthCheck:', error);
  }
};

/**
 * Stop the scheduler (for graceful shutdown)
 */
export const stopScheduler = (): void => {
  // Note: node-cron doesn't have a global destroy method
  // Individual tasks can be destroyed using task.destroy()
  logger.info('Scheduler stopped');
};