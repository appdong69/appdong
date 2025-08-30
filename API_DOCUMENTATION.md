# API Documentation

Comprehensive API documentation for the PWA Push Notification SaaS platform.

## 📋 Table of Contents

- [Authentication](#authentication)
- [Admin API](#admin-api)
- [Client API](#client-api)
- [Push Notification API](#push-notification-api)
- [Integration API](#integration-api)
- [Analytics API](#analytics-api)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Examples](#examples)

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Login

**POST** `/api/auth/login`

Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "admin",
      "name": "John Doe"
    }
  }
}
```

### Refresh Token

**POST** `/api/auth/refresh`

Refresh expired JWT token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Logout

**POST** `/api/auth/logout`

Invalidate current session.

**Headers:** `Authorization: Bearer <token>`

## 👑 Admin API

### Dashboard Stats

**GET** `/api/admin/dashboard`

Get admin dashboard statistics.

**Headers:** `Authorization: Bearer <admin_token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalClients": 150,
    "totalSubscribers": 25000,
    "totalNotifications": 500000,
    "activeClients": 142,
    "recentActivity": [
      {
        "id": "uuid",
        "type": "client_registered",
        "description": "New client registered: Example Corp",
        "timestamp": "2024-01-15T10:30:00Z"
      }
    ],
    "systemHealth": {
      "database": "healthy",
      "pushService": "healthy",
      "apiResponse": "95ms"
    }
  }
}
```

### Client Management

#### List Clients

**GET** `/api/admin/clients`

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10, max: 100)
- `search` (string): Search by name or email
- `status` (string): Filter by status (active, inactive, suspended)

**Response:**
```json
{
  "success": true,
  "data": {
    "clients": [
      {
        "id": "uuid",
        "name": "Example Corp",
        "email": "admin@example.com",
        "status": "active",
        "plan": "premium",
        "subscriberCount": 1500,
        "notificationsSent": 25000,
        "createdAt": "2024-01-01T00:00:00Z",
        "lastActive": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 150,
      "pages": 15
    }
  }
}
```

#### Create Client

**POST** `/api/admin/clients`

**Request Body:**
```json
{
  "name": "New Client Corp",
  "email": "admin@newclient.com",
  "password": "securePassword123",
  "plan": "basic",
  "maxSubscribers": 1000,
  "maxNotificationsPerDay": 5000
}
```

#### Update Client

**PUT** `/api/admin/clients/:clientId`

**Request Body:**
```json
{
  "name": "Updated Client Name",
  "status": "active",
  "plan": "premium",
  "maxSubscribers": 5000,
  "maxNotificationsPerDay": 20000
}
```

#### Delete Client

**DELETE** `/api/admin/clients/:clientId`

### System Settings

**GET** `/api/admin/settings`

**PUT** `/api/admin/settings`

**Request Body:**
```json
{
  "systemName": "PWA Push Notifications",
  "maxClientsPerPlan": {
    "basic": 1000,
    "premium": 10000,
    "enterprise": -1
  },
  "defaultRateLimits": {
    "requestsPerMinute": 60,
    "notificationsPerHour": 1000
  }
}
```

## 👤 Client API

### Client Dashboard

**GET** `/api/client/dashboard`

**Headers:** `Authorization: Bearer <client_token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "subscriberCount": 1500,
    "notificationsSentToday": 250,
    "notificationsSentThisMonth": 7500,
    "clickThroughRate": 12.5,
    "recentNotifications": [
      {
        "id": "uuid",
        "title": "Welcome to our service!",
        "sentAt": "2024-01-15T10:30:00Z",
        "delivered": 1450,
        "clicked": 180
      }
    ],
    "topDomains": [
      {
        "domain": "example.com",
        "subscribers": 800,
        "isVerified": true
      }
    ]
  }
}
```

### Domain Management

#### List Domains

**GET** `/api/client/domains`

**Response:**
```json
{
  "success": true,
  "data": {
    "domains": [
      {
        "id": "uuid",
        "domain": "example.com",
        "isVerified": true,
        "subscriberCount": 800,
        "verificationToken": "abc123...",
        "createdAt": "2024-01-01T00:00:00Z",
        "verifiedAt": "2024-01-01T12:00:00Z"
      }
    ]
  }
}
```

#### Add Domain

**POST** `/api/client/domains`

**Request Body:**
```json
{
  "domain": "newdomain.com"
}
```

#### Verify Domain

**POST** `/api/client/domains/:domainId/verify`

#### Delete Domain

**DELETE** `/api/client/domains/:domainId`

### Push Templates

#### List Templates

**GET** `/api/client/templates`

**Response:**
```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "id": "uuid",
        "name": "Welcome Message",
        "title": "Welcome to {{appName}}!",
        "body": "Thanks for subscribing to our notifications.",
        "icon": "/icons/welcome.png",
        "badge": "/icons/badge.png",
        "url": "https://example.com/welcome",
        "actions": [
          {
            "action": "view",
            "title": "View Details",
            "url": "https://example.com/details"
          }
        ],
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

#### Create Template

**POST** `/api/client/templates`

**Request Body:**
```json
{
  "name": "New Template",
  "title": "{{title}}",
  "body": "{{message}}",
  "icon": "/icons/notification.png",
  "badge": "/icons/badge.png",
  "url": "{{url}}",
  "actions": [
    {
      "action": "view",
      "title": "View",
      "url": "{{actionUrl}}"
    }
  ]
}
```

#### Update Template

**PUT** `/api/client/templates/:templateId`

#### Delete Template

**DELETE** `/api/client/templates/:templateId`

## 🔔 Push Notification API

### Send Notification

**POST** `/api/push/send`

Send push notification to subscribers.

**Headers:** `Authorization: Bearer <client_token>`

**Request Body:**
```json
{
  "title": "Breaking News!",
  "body": "Important update about our service.",
  "icon": "/icons/news.png",
  "badge": "/icons/badge.png",
  "url": "https://example.com/news/123",
  "image": "https://example.com/images/news.jpg",
  "actions": [
    {
      "action": "read",
      "title": "Read More",
      "url": "https://example.com/news/123"
    },
    {
      "action": "dismiss",
      "title": "Dismiss"
    }
  ],
  "data": {
    "category": "news",
    "priority": "high"
  },
  "targeting": {
    "domains": ["example.com"],
    "segments": ["premium_users"],
    "excludeSegments": ["unsubscribed"]
  },
  "scheduling": {
    "sendAt": "2024-01-15T15:00:00Z",
    "timezone": "UTC"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "notificationId": "uuid",
    "status": "scheduled",
    "targetedSubscribers": 1500,
    "estimatedDelivery": "2024-01-15T15:00:00Z"
  }
}
```

### Send with Template

**POST** `/api/push/send-template`

**Request Body:**
```json
{
  "templateId": "uuid",
  "variables": {
    "title": "Custom Title",
    "message": "Custom message content",
    "url": "https://example.com/custom",
    "actionUrl": "https://example.com/action"
  },
  "targeting": {
    "domains": ["example.com"]
  }
}
```

### Bulk Send

**POST** `/api/push/bulk-send`

Send personalized notifications to multiple subscribers.

**Request Body:**
```json
{
  "notifications": [
    {
      "subscriberId": "uuid1",
      "title": "Personal message for user 1",
      "body": "Hello John, check out your personalized content!",
      "url": "https://example.com/user/john"
    },
    {
      "subscriberId": "uuid2",
      "title": "Personal message for user 2",
      "body": "Hello Jane, you have new updates!",
      "url": "https://example.com/user/jane"
    }
  ]
}
```

### Notification Status

**GET** `/api/push/notifications/:notificationId`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Breaking News!",
    "body": "Important update about our service.",
    "status": "delivered",
    "createdAt": "2024-01-15T14:30:00Z",
    "sentAt": "2024-01-15T15:00:00Z",
    "stats": {
      "targeted": 1500,
      "delivered": 1450,
      "failed": 50,
      "clicked": 180,
      "dismissed": 800
    },
    "targeting": {
      "domains": ["example.com"],
      "segments": ["premium_users"]
    }
  }
}
```

### List Notifications

**GET** `/api/push/notifications`

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `status` (string): Filter by status (pending, sending, delivered, failed)
- `dateFrom` (string): Start date (ISO format)
- `dateTo` (string): End date (ISO format)

### Subscriber Management

#### Subscribe

**POST** `/api/push/subscribe`

**Request Body:**
```json
{
  "clientId": "uuid",
  "domainId": "uuid",
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/fcm/send/...",
    "keys": {
      "p256dh": "BNcRd...",
      "auth": "tBHI..."
    }
  },
  "userAgent": "Mozilla/5.0...",
  "segments": ["general", "news"]
}
```

#### Unsubscribe

**POST** `/api/push/unsubscribe`

**Request Body:**
```json
{
  "clientId": "uuid",
  "domainId": "uuid",
  "endpoint": "https://fcm.googleapis.com/fcm/send/..."
}
```

#### List Subscribers

**GET** `/api/push/subscribers`

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `domain` (string): Filter by domain
- `segment` (string): Filter by segment
- `active` (boolean): Filter by active status

## 🔗 Integration API

### JavaScript Snippet

**GET** `/api/integration/js/:clientId/:domainId`

Get JavaScript integration snippet for client websites.

**Response:** JavaScript code (Content-Type: application/javascript)

### Service Worker

**GET** `/api/integration/sw/:clientId/:domainId`

Get service worker file for push notifications.

**Response:** JavaScript code (Content-Type: application/javascript)

### Domain Verification

**GET** `/api/integration/verify/:clientId/:domainId`

Verify domain ownership via meta tag or file.

**Response:**
```json
{
  "success": true,
  "data": {
    "verified": true,
    "method": "meta_tag",
    "verifiedAt": "2024-01-15T10:30:00Z"
  }
}
```

### Health Check

**GET** `/api/integration/health`

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0.0",
    "uptime": 86400
  }
}
```

## 📊 Analytics API

### Notification Analytics

**GET** `/api/analytics/notifications`

**Query Parameters:**
- `dateFrom` (string): Start date
- `dateTo` (string): End date
- `groupBy` (string): Group by (day, week, month)
- `domain` (string): Filter by domain

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalSent": 50000,
      "totalDelivered": 48500,
      "totalClicked": 6000,
      "deliveryRate": 97.0,
      "clickThroughRate": 12.4
    },
    "timeline": [
      {
        "date": "2024-01-15",
        "sent": 1500,
        "delivered": 1450,
        "clicked": 180,
        "deliveryRate": 96.7,
        "clickThroughRate": 12.4
      }
    ]
  }
}
```

### Subscriber Analytics

**GET** `/api/analytics/subscribers`

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalSubscribers": 25000,
      "activeSubscribers": 24500,
      "newSubscribersToday": 150,
      "unsubscribesToday": 25
    },
    "growth": [
      {
        "date": "2024-01-15",
        "newSubscribers": 150,
        "unsubscribes": 25,
        "netGrowth": 125,
        "totalSubscribers": 25000
      }
    ],
    "byDomain": [
      {
        "domain": "example.com",
        "subscribers": 15000,
        "percentage": 60.0
      }
    ]
  }
}
```

### Performance Analytics

**GET** `/api/analytics/performance`

**Response:**
```json
{
  "success": true,
  "data": {
    "apiResponseTime": {
      "average": 95,
      "p95": 150,
      "p99": 300
    },
    "pushDeliveryTime": {
      "average": 2.5,
      "p95": 5.0,
      "p99": 10.0
    },
    "errorRates": {
      "api": 0.1,
      "pushDelivery": 2.5
    }
  }
}
```

## ❌ Error Handling

### Error Response Format

All API errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_123456789"
  }
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Validation Error
- `429` - Rate Limited
- `500` - Internal Server Error
- `503` - Service Unavailable

### Common Error Codes

- `VALIDATION_ERROR` - Request validation failed
- `AUTHENTICATION_REQUIRED` - Missing or invalid authentication
- `INSUFFICIENT_PERMISSIONS` - User lacks required permissions
- `RESOURCE_NOT_FOUND` - Requested resource doesn't exist
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `QUOTA_EXCEEDED` - Usage quota exceeded
- `INVALID_SUBSCRIPTION` - Push subscription is invalid
- `DOMAIN_NOT_VERIFIED` - Domain verification required
- `TEMPLATE_NOT_FOUND` - Push template doesn't exist

## 🚦 Rate Limiting

### Default Limits

- **Authentication**: 5 requests per minute per IP
- **API Endpoints**: 60 requests per minute per user
- **Push Notifications**: 1000 notifications per hour per client
- **Integration Endpoints**: 100 requests per minute per domain

### Rate Limit Headers

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1642248000
X-RateLimit-Window: 60
```

### Rate Limit Response

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "limit": 60,
      "window": 60,
      "resetAt": "2024-01-15T10:31:00Z"
    }
  }
}
```

## 📝 Examples

### Complete Integration Example

```javascript
// 1. Include the integration script
<script src="https://api.yourdomain.com/api/integration/js/CLIENT_ID/DOMAIN_ID"></script>

// 2. Initialize push notifications
window.PWAPush.initializePushNotifications()
  .then(subscription => {
    console.log('Push notifications initialized:', subscription);
  })
  .catch(error => {
    console.error('Failed to initialize push notifications:', error);
  });

// 3. Listen for subscription events
window.addEventListener('pushSubscriptionChanged', (event) => {
  console.log('Subscription changed:', event.detail);
});

// 4. Send a test notification (from your backend)
fetch('https://api.yourdomain.com/api/push/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_CLIENT_TOKEN'
  },
  body: JSON.stringify({
    title: 'Test Notification',
    body: 'This is a test push notification!',
    url: 'https://yoursite.com/test'
  })
});
```

### Node.js SDK Example

```javascript
const PWAPushClient = require('@pwa-push/node-sdk');

const client = new PWAPushClient({
  apiUrl: 'https://api.yourdomain.com',
  clientToken: 'your_client_token'
});

// Send notification
async function sendNotification() {
  try {
    const result = await client.notifications.send({
      title: 'Hello from Node.js!',
      body: 'This notification was sent using the Node.js SDK.',
      url: 'https://yoursite.com/nodejs-example'
    });
    
    console.log('Notification sent:', result.notificationId);
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}

// Get analytics
async function getAnalytics() {
  try {
    const analytics = await client.analytics.getNotifications({
      dateFrom: '2024-01-01',
      dateTo: '2024-01-31'
    });
    
    console.log('Analytics:', analytics);
  } catch (error) {
    console.error('Failed to get analytics:', error);
  }
}
```

### cURL Examples

```bash
# Login
curl -X POST https://api.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "client@example.com",
    "password": "password123"
  }'

# Send notification
curl -X POST https://api.yourdomain.com/api/push/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Breaking News!",
    "body": "Important update about our service.",
    "url": "https://example.com/news"
  }'

# Get notification status
curl -X GET https://api.yourdomain.com/api/push/notifications/NOTIFICATION_ID \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get analytics
curl -X GET "https://api.yourdomain.com/api/analytics/notifications?dateFrom=2024-01-01&dateTo=2024-01-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

This API documentation provides comprehensive information for integrating with the PWA Push Notification SaaS platform. For additional support or questions, please refer to the main README.md file or contact support.