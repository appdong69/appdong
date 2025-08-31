# PWA Push Notification SaaS Platform

A comprehensive Software-as-a-Service platform for managing push notifications across Progressive Web Applications (PWAs). This platform provides a complete solution for businesses to integrate, manage, and analyze push notifications for their web applications.

## 🚀 Features

### Master Admin Panel
- **Dashboard**: Real-time analytics and system overview
- **Client Management**: Create, manage, and monitor client accounts
- **System Analytics**: Comprehensive metrics and reporting
- **VAPID Key Management**: Generate and manage web push credentials
- **Domain Verification**: Secure domain validation system

### Client Panel
- **Dashboard**: Client-specific analytics and metrics
- **Push Templates**: Create and manage reusable notification templates
- **Domain Management**: Add and verify domains for push notifications
- **Direct Send**: Compose and send notifications immediately
- **Notification History**: Track sent notifications and delivery status
- **Analytics**: Detailed insights into notification performance

### Push Notification System
- **Web Push Integration**: Built with industry-standard web-push library
- **Subscription Management**: Automatic subscriber handling
- **Template System**: Reusable notification templates
- **Scheduling**: Send notifications immediately or schedule for later
- **Click Tracking**: Monitor notification engagement
- **Delivery Analytics**: Track success/failure rates
- **Rate Limiting**: Prevent spam and ensure service stability

### Integration Features
- **JavaScript SDK**: Easy-to-integrate client-side library
- **Service Worker**: Automatic generation for client websites
- **Domain Verification**: Secure verification process
- **CORS Support**: Cross-origin resource sharing enabled
- **Real-time Updates**: Live notification delivery

## 🛠️ Technology Stack

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Modern icon library
- **Recharts**: Data visualization components

### Backend
- **Node.js**: JavaScript runtime
- **Express.js**: Web application framework
- **TypeScript**: Type-safe server development
- **PostgreSQL**: Relational database
- **web-push**: Push notification library
- **JWT**: JSON Web Token authentication

### Security & Performance
- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: Request throttling
- **bcrypt**: Password hashing
- **Input Validation**: Request sanitization
- **Error Handling**: Comprehensive error management

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **PostgreSQL** (v13 or higher)
- **npm** or **yarn** package manager
- **Git** for version control

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd PW88
```

### 2. Database Setup

1. Create a PostgreSQL database:
```sql
CREATE DATABASE pwa_push_notifications;
```

2. Run the database schema:
```bash
psql -U postgres -d pwa_push_notifications -f database/schema.sql
```

### 3. Backend Configuration

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Update the `.env` file with your configuration:
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pwa_push_notifications
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Secrets (generate strong secrets)
JWT_SECRET=your_super_secret_jwt_key
JWT_REFRESH_SECRET=your_refresh_secret

# VAPID Keys (generate using: npx web-push generate-vapid-keys)
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_SUBJECT=mailto:your-email@example.com
```

5. Generate VAPID keys:
```bash
npx web-push generate-vapid-keys
```

6. Start the backend server:
```bash
npm run dev
```

### 4. Frontend Configuration

1. Navigate to the root directory:
```bash
cd ..
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env.local
```

4. Update the `.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
```

5. Start the frontend server:
```bash
npm run dev
```

### 5. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Health Check**: http://localhost:3001/health

## 🔧 Configuration

### Environment Variables

#### Backend (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | PostgreSQL host | localhost |
| `DB_PORT` | PostgreSQL port | 5432 |
| `DB_NAME` | Database name | pwa_push_notifications |
| `DB_USER` | Database user | postgres |
| `DB_PASSWORD` | Database password | - |
| `JWT_SECRET` | JWT signing secret | - |
| `VAPID_PUBLIC_KEY` | Web push public key | - |
| `VAPID_PRIVATE_KEY` | Web push private key | - |
| `PORT` | Server port | 3001 |

#### Frontend (.env.local)

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | http://localhost:3001 |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | VAPID public key | - |

## 📚 API Documentation

### Authentication Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - User logout

### Admin Endpoints

- `GET /api/admin/dashboard` - Admin dashboard data
- `GET /api/admin/clients` - List all clients
- `POST /api/admin/clients` - Create new client
- `PUT /api/admin/clients/:id` - Update client
- `DELETE /api/admin/clients/:id` - Delete client
- `GET /api/admin/settings/vapid` - Get VAPID keys
- `POST /api/admin/settings/vapid/generate` - Generate new VAPID keys

### Client Endpoints

- `GET /api/client/dashboard` - Client dashboard data
- `GET /api/client/domains` - List client domains
- `POST /api/client/domains` - Add new domain
- `GET /api/client/templates` - List notification templates
- `POST /api/client/templates` - Create new template
- `POST /api/client/notifications/send` - Send notification

### Push Notification Endpoints

- `POST /api/push/subscribe` - Subscribe to notifications
- `POST /api/push/unsubscribe` - Unsubscribe from notifications
- `POST /api/push/send` - Send push notification
- `POST /api/push/track-click` - Track notification clicks
- `GET /api/push/notifications` - Get notification history

### Integration Endpoints

- `GET /api/integration/js/:clientId/:domainId` - JavaScript integration snippet
- `GET /api/integration/sw/:clientId/:domainId` - Service worker file
- `GET /api/integration/verify/:clientId/:domainId` - Domain verification file

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with configurable rounds
- **Rate Limiting**: Request throttling to prevent abuse
- **Input Validation**: Comprehensive request validation
- **CORS Protection**: Configurable cross-origin policies
- **Security Headers**: Helmet.js security middleware
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Input sanitization

## 📊 Analytics & Monitoring

### Metrics Tracked

- **Notification Delivery**: Success/failure rates
- **Click-through Rates**: Engagement analytics
- **Subscriber Growth**: User acquisition metrics
- **Domain Performance**: Per-domain statistics
- **System Health**: Server and database monitoring

### Logging

- **Winston Logger**: Structured logging
- **Error Tracking**: Comprehensive error logging
- **Access Logs**: Request/response logging
- **Performance Metrics**: Response time tracking

## 🚀 Deployment

### Production Checklist

1. **Environment Variables**:
   - Generate strong JWT secrets
   - Create production VAPID keys
   - Configure production database
   - Set secure CORS origins

2. **Database**:
   - Set up production PostgreSQL
   - Run database migrations
   - Configure connection pooling
   - Set up backups

3. **Security**:
   - Enable HTTPS
   - Configure rate limiting
   - Set up monitoring
   - Review security headers

4. **Performance**:
   - Enable compression
   - Configure caching
   - Set up CDN (if needed)
   - Monitor resource usage

### Docker Deployment (Optional)

```dockerfile
# Example Dockerfile for backend
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

## 🧪 Testing

### Running Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd ..
npm test
```

### Test Coverage

- **Unit Tests**: Component and function testing
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Full workflow testing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

### Common Issues

1. **Database Connection Issues**:
   - Verify PostgreSQL is running
   - Check connection credentials
   - Ensure database exists

2. **VAPID Key Issues**:
   - Generate new VAPID keys
   - Verify keys are properly set
   - Check VAPID subject format

3. **Push Notification Issues**:
   - Verify domain is verified
   - Check browser permissions
   - Ensure HTTPS in production

### Getting Help

- Check the documentation
- Review error logs
- Search existing issues
- Create a new issue with details

## 🔄 Changelog

### Version 1.0.0
- Initial release
- Complete PWA push notification platform
- Admin and client panels
- Full API implementation
- Integration tools and documentation

---

**Built with ❤️ for the modern web**#   D e p l o y m e n t   S t a t u s  
 