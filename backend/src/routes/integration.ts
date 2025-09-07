import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { query } from '../config/database';
import { integrationRateLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../middleware/errorHandler';
import {
  ValidationError,
  NotFoundError,
} from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = express.Router();

// Apply rate limiting to all routes
router.use(integrationRateLimiter);

// Validation rules
const domainValidation = [
  param('clientId').isUUID().withMessage('Valid client ID is required'),
  param('domainId').isUUID().withMessage('Valid domain ID is required'),
];

// Helper function to validate request
const validateRequest = (req: express.Request) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(`Validation failed: ${errors.array().map(e => e.msg).join(', ')}`);
  }
};

// Get JavaScript integration snippet
router.get('/js/:clientId/:domainId', domainValidation, asyncHandler(async (req, res) => {
  validateRequest(req);
  
  const { clientId, domainId } = req.params;
  
  // Verify client and domain exist and are active
  const result = await query(`
    SELECT 
      c.id as client_id,
      c.name as client_name,
      cd.id as domain_id,
      cd.domain,
      cd.is_verified,
      cd.is_active
    FROM clients c
    JOIN client_domains cd ON c.id = cd.client_id
    WHERE c.id = $1 AND cd.id = $2 AND c.is_active = true AND cd.is_active = true
  `, [clientId, domainId]);
  
  if (result.rows.length === 0) {
    throw new NotFoundError('Client or domain not found');
  }
  
  const { domain, is_verified } = result.rows[0];
  
  // Get VAPID public key
  const vapidResult = await query('SELECT public_key FROM vapid_keys WHERE is_active = true LIMIT 1');
  const vapidPublicKey = vapidResult.rows[0]?.public_key || 'YOUR_VAPID_PUBLIC_KEY';
  
  const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
  
  // Generate JavaScript snippet
  const jsSnippet = `
(function() {
  'use strict';
  
  // Configuration
  const PWA_PUSH_CONFIG = {
    apiUrl: '${apiBaseUrl}',
    clientId: '${clientId}',
    domainId: '${domainId}',
    vapidPublicKey: '${vapidPublicKey}',
    domain: '${domain}',
    verified: ${is_verified}
  };
  
  // Utility functions
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
  
  function log(message, data) {
    if (console && console.log) {
      console.log('[PWA Push] ' + message, data || '');
    }
  }
  
  function logError(message, error) {
    if (console && console.error) {
      console.error('[PWA Push] ' + message, error || '');
    }
  }
  
  // Check if domain is verified
  if (!PWA_PUSH_CONFIG.verified) {
    logError('Domain not verified. Please verify your domain in the client panel.');
    return;
  }
  
  // Check browser support
  if (!('serviceWorker' in navigator)) {
    logError('Service Worker not supported');
    return;
  }
  
  if (!('PushManager' in window)) {
    logError('Push messaging not supported');
    return;
  }
  
  if (!('Notification' in window)) {
    logError('Notifications not supported');
    return;
  }
  
  // Initialize push notifications
  function initializePushNotifications() {
    log('Initializing push notifications...');
    
    // Register service worker
    navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    })
    .then(function(registration) {
      log('Service Worker registered successfully', registration);
      
      // Check if already subscribed
      return registration.pushManager.getSubscription();
    })
    .then(function(existingSubscription) {
      if (existingSubscription) {
        log('Already subscribed to push notifications');
        return existingSubscription;
      }
      
      // Request notification permission
      return Notification.requestPermission()
        .then(function(permission) {
          if (permission === 'granted') {
            log('Notification permission granted');
            return navigator.serviceWorker.ready;
          } else {
            throw new Error('Notification permission denied');
          }
        })
        .then(function(registration) {
          // Subscribe to push notifications
          return registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(PWA_PUSH_CONFIG.vapidPublicKey)
          });
        });
    })
    .then(function(subscription) {
      if (subscription) {
        log('Push subscription successful');
        
        // Send subscription to server
        return fetch(PWA_PUSH_CONFIG.apiUrl + '/api/push/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subscription: subscription,
            clientId: PWA_PUSH_CONFIG.clientId,
            domainId: PWA_PUSH_CONFIG.domainId,
            url: window.location.href,
            userAgent: navigator.userAgent
          })
        });
      }
    })
    .then(function(response) {
      if (response && response.ok) {
        log('Subscription sent to server successfully');
        
        // Dispatch custom event
        if (window.CustomEvent) {
          const event = new CustomEvent('pwa-push-subscribed', {
            detail: {
              clientId: PWA_PUSH_CONFIG.clientId,
              domainId: PWA_PUSH_CONFIG.domainId,
              domain: PWA_PUSH_CONFIG.domain
            }
          });
          window.dispatchEvent(event);
        }
      } else if (response) {
        throw new Error('Failed to send subscription to server: ' + response.status);
      }
    })
    .catch(function(error) {
      logError('Push subscription failed:', error);
      
      // Dispatch custom event for error
      if (window.CustomEvent) {
        const event = new CustomEvent('pwa-push-error', {
          detail: {
            error: error.message,
            clientId: PWA_PUSH_CONFIG.clientId,
            domainId: PWA_PUSH_CONFIG.domainId
          }
        });
        window.dispatchEvent(event);
      }
    });
  }
  
  // Unsubscribe function (exposed globally)
  function unsubscribeFromPush() {
    if (!('serviceWorker' in navigator)) {
      return Promise.reject(new Error('Service Worker not supported'));
    }
    
    return navigator.serviceWorker.ready
      .then(function(registration) {
        return registration.pushManager.getSubscription();
      })
      .then(function(subscription) {
        if (subscription) {
          // Unsubscribe from browser
          return subscription.unsubscribe()
            .then(function(successful) {
              if (successful) {
                // Notify server
                return fetch(PWA_PUSH_CONFIG.apiUrl + '/api/push/unsubscribe', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    endpoint: subscription.endpoint,
                    clientId: PWA_PUSH_CONFIG.clientId
                  })
                });
              }
            });
        }
      })
      .then(function() {
        log('Unsubscribed from push notifications');
        
        // Dispatch custom event
        if (window.CustomEvent) {
          const event = new CustomEvent('pwa-push-unsubscribed', {
            detail: {
              clientId: PWA_PUSH_CONFIG.clientId,
              domainId: PWA_PUSH_CONFIG.domainId
            }
          });
          window.dispatchEvent(event);
        }
      })
      .catch(function(error) {
        logError('Unsubscribe failed:', error);
        throw error;
      });
  }
  
  // Expose functions globally
  window.PWAPush = {
    subscribe: initializePushNotifications,
    unsubscribe: unsubscribeFromPush,
    config: PWA_PUSH_CONFIG
  };
  
  // Auto-initialize if not explicitly disabled
  if (!window.PWA_PUSH_MANUAL_INIT) {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializePushNotifications);
    } else {
      // DOM is already ready
      setTimeout(initializePushNotifications, 100);
    }
  }
  
})();
`;
  
  // Set appropriate headers
  res.set({
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  
  logger.info('JavaScript snippet served', {
    clientId,
    domainId,
    domain,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
  });
  
  res.send(jsSnippet);
}));

// Get Service Worker file
router.get('/sw/:clientId/:domainId', domainValidation, asyncHandler(async (req, res) => {
  validateRequest(req);
  
  const { clientId, domainId } = req.params;
  
  // Verify client and domain exist and are active
  const result = await query(`
    SELECT 
      c.id as client_id,
      c.name as client_name,
      cd.id as domain_id,
      cd.domain,
      cd.is_verified,
      cd.is_active
    FROM clients c
    JOIN client_domains cd ON c.id = cd.client_id
    WHERE c.id = $1 AND cd.id = $2 AND c.is_active = true AND cd.is_active = true
  `, [clientId, domainId]);
  
  if (result.rows.length === 0) {
    throw new NotFoundError('Client or domain not found');
  }
  
  const { domain, client_name } = result.rows[0];
  const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
  
  // Generate Service Worker
  const serviceWorker = `
// PWA Push Notification Service Worker
// Generated for: ${domain}
// Client: ${client_name}
// Generated at: ${new Date().toISOString()}

const CACHE_NAME = 'pwa-push-v1';
const API_BASE_URL = '${apiBaseUrl}';
const CLIENT_ID = '${clientId}';
const DOMAIN_ID = '${domainId}';

// Install event
self.addEventListener('install', function(event) {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('[SW] Cache opened');
        // Pre-cache any essential resources here if needed
        return cache;
      })
      .then(function() {
        console.log('[SW] Service worker installed successfully');
        return self.skipWaiting();
      })
  );
});

// Activate event
self.addEventListener('activate', function(event) {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then(function(cacheNames) {
        return Promise.all(
          cacheNames.map(function(cacheName) {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(function() {
        console.log('[SW] Service worker activated successfully');
        return self.clients.claim();
      })
  );
});

// Push event handler
self.addEventListener('push', function(event) {
  console.log('[SW] Push event received');
  
  let notificationData = {
    title: 'New Notification',
    body: 'You have a new message',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    data: {
      url: '/',
      notificationId: null
    },
    actions: [],
    requireInteraction: false,
    tag: 'default',
    renotify: false,
    silent: false
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      console.log('[SW] Push data received:', data);
      
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        data: {
          url: data.url || notificationData.data.url,
          notificationId: data.notificationId || notificationData.data.notificationId,
          clientId: CLIENT_ID,
          domainId: DOMAIN_ID
        },
        actions: data.actions || notificationData.actions,
        requireInteraction: data.requireInteraction || notificationData.requireInteraction,
        tag: data.tag || notificationData.tag,
        renotify: data.renotify || notificationData.renotify,
        silent: data.silent || notificationData.silent,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('[SW] Error parsing push data:', error);
    }
  }
  
  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    data: notificationData.data,
    actions: notificationData.actions,
    requireInteraction: notificationData.requireInteraction,
    tag: notificationData.tag,
    renotify: notificationData.renotify,
    silent: notificationData.silent,
    timestamp: notificationData.timestamp
  };
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
      .then(function() {
        console.log('[SW] Notification displayed successfully');
      })
      .catch(function(error) {
        console.error('[SW] Error displaying notification:', error);
      })
  );
});

// Notification click handler
self.addEventListener('notificationclick', function(event) {
  console.log('[SW] Notification clicked:', event.notification.tag);
  
  event.notification.close();
  
  const notificationData = event.notification.data || {};
  const url = notificationData.url || '/';
  const notificationId = notificationData.notificationId;
  
  // Track click if notification ID is available
  if (notificationId) {
    event.waitUntil(
      fetch(API_BASE_URL + '/api/push/track-click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationId: notificationId
        })
      })
      .then(function(response) {
        if (response.ok) {
          console.log('[SW] Click tracked successfully');
        } else {
          console.error('[SW] Failed to track click:', response.status);
        }
      })
      .catch(function(error) {
        console.error('[SW] Error tracking click:', error);
      })
    );
  }
  
  // Handle action clicks
  if (event.action) {
    console.log('[SW] Action clicked:', event.action);
    // Handle specific actions here if needed
  }
  
  // Open or focus window
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    })
    .then(function(clientList) {
      // Check if there's already a window open with the target URL
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === url && 'focus' in client) {
          console.log('[SW] Focusing existing window');
          return client.focus();
        }
      }
      
      // If no window is open, open a new one
      if (clients.openWindow) {
        console.log('[SW] Opening new window:', url);
        return clients.openWindow(url);
      }
    })
    .catch(function(error) {
      console.error('[SW] Error handling notification click:', error);
    })
  );
});

// Notification close handler
self.addEventListener('notificationclose', function(event) {
  console.log('[SW] Notification closed:', event.notification.tag);
  
  // Track notification close if needed
  const notificationData = event.notification.data || {};
  const notificationId = notificationData.notificationId;
  
  if (notificationId) {
    // You can track notification closes here if needed
    console.log('[SW] Notification closed, ID:', notificationId);
  }
});

// Background sync (if needed in the future)
self.addEventListener('sync', function(event) {
  console.log('[SW] Background sync event:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle background sync tasks here
      Promise.resolve()
    );
  }
});

// Message handler for communication with main thread
self.addEventListener('message', function(event) {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;
      case 'GET_VERSION':
        event.ports[0].postMessage({
          version: '1.0.0',
          clientId: CLIENT_ID,
          domainId: DOMAIN_ID
        });
        break;
      default:
        console.log('[SW] Unknown message type:', event.data.type);
    }
  }
});

// Error handler
self.addEventListener('error', function(event) {
  console.error('[SW] Service worker error:', event.error);
});

// Unhandled rejection handler
self.addEventListener('unhandledrejection', function(event) {
  console.error('[SW] Unhandled promise rejection:', event.reason);
});

console.log('[SW] Service worker loaded successfully for ${domain}');
`;
  
  // Set appropriate headers
  res.set({
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Service-Worker-Allowed': '/'
  });
  
  logger.info('Service Worker served', {
    clientId,
    domainId,
    domain,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
  });
  
  res.send(serviceWorker);
}));

// Get domain verification file
router.get('/verify/:clientId/:domainId', domainValidation, asyncHandler(async (req, res) => {
  validateRequest(req);
  
  const { clientId, domainId } = req.params;
  
  // Get domain verification token
  const result = await query(`
    SELECT 
      cd.domain,
      cd.verification_token,
      cd.is_verified,
      c.name as client_name
    FROM client_domains cd
    JOIN clients c ON cd.client_id = c.id
    WHERE c.id = $1 AND cd.id = $2 AND c.is_active = true AND cd.is_active = true
  `, [clientId, domainId]);
  
  if (result.rows.length === 0) {
    throw new NotFoundError('Client or domain not found');
  }
  
  const { domain, verification_token, is_verified, client_name } = result.rows[0];
  
  // Set appropriate headers for text file
  res.set({
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  
  logger.info('Verification file served', {
    clientId,
    domainId,
    domain,
    verified: is_verified,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
  });
  
  res.send(`${verification_token}\n\n# PWA Push Notification Service\n# Domain: ${domain}\n# Client: ${client_name}\n# Verified: ${is_verified}\n# Generated: ${new Date().toISOString()}`);
}));

// Health check endpoint
router.get('/health', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Integration service is healthy',
    timestamp: new Date().toISOString(),
  });
}));

export default router;