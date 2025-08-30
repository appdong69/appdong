import webpush from 'web-push';
import { query } from '@/config/database';
import { logger } from '@/utils/logger';

/**
 * Initialize the push service with VAPID keys
 */
export const initPushService = async (): Promise<void> => {
  try {
    // Get VAPID keys from database
    const vapidResult = await query(
      'SELECT public_key, private_key, subject FROM vapid_keys WHERE is_active = true ORDER BY created_at DESC LIMIT 1'
    );

    if (vapidResult.rows.length === 0) {
      logger.warn('No active VAPID keys found in database');
      return;
    }

    const { public_key, private_key, subject } = vapidResult.rows[0];

    // Set VAPID details for web-push
    webpush.setVapidDetails(
      subject || 'mailto:admin@example.com',
      public_key,
      private_key
    );

    logger.info('Push service initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize push service:', error);
    throw error;
  }
};

/**
 * Send a push notification to a subscriber
 */
export const sendPushNotification = async (
  subscription: webpush.PushSubscription,
  payload: string,
  options?: webpush.RequestOptions
): Promise<webpush.SendResult> => {
  try {
    const result = await webpush.sendNotification(subscription, payload, options);
    return result;
  } catch (error) {
    logger.error('Failed to send push notification:', error);
    throw error;
  }
};

/**
 * Validate a push subscription
 */
export const validateSubscription = (subscription: any): boolean => {
  return (
    subscription &&
    typeof subscription.endpoint === 'string' &&
    subscription.keys &&
    typeof subscription.keys.p256dh === 'string' &&
    typeof subscription.keys.auth === 'string'
  );
};

/**
 * Get active VAPID public key
 */
export const getActiveVapidPublicKey = async (): Promise<string | null> => {
  try {
    const result = await query(
      'SELECT public_key FROM vapid_keys WHERE is_active = true ORDER BY created_at DESC LIMIT 1'
    );
    
    return result.rows.length > 0 ? result.rows[0].public_key : null;
  } catch (error) {
    logger.error('Failed to get VAPID public key:', error);
    return null;
  }
};