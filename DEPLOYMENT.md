# Deployment Guide

This guide covers deploying the PWA Push Notification SaaS platform to production environments.

## 🚀 Production Deployment

### Prerequisites

- **Node.js** v18+ installed on production server
- **PostgreSQL** v13+ database server
- **SSL Certificate** for HTTPS (required for push notifications)
- **Domain Name** configured with DNS
- **Reverse Proxy** (Nginx recommended)

### 1. Server Setup

#### Ubuntu/Debian Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx -y
```

### 2. Database Configuration

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE pwa_push_notifications;
CREATE USER pwa_user WITH ENCRYPTED PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE pwa_push_notifications TO pwa_user;
\q

# Import schema
psql -U pwa_user -d pwa_push_notifications -f database/schema.sql
```

### 3. Application Deployment

#### Clone and Setup

```bash
# Clone repository
git clone <your-repo-url> /var/www/pwa-push
cd /var/www/pwa-push

# Set proper permissions
sudo chown -R $USER:$USER /var/www/pwa-push
```

#### Backend Deployment

```bash
# Navigate to backend
cd backend

# Install dependencies
npm ci --only=production

# Create production environment file
cp .env.example .env

# Edit environment variables
nano .env
```

**Production .env Configuration:**

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pwa_push_notifications
DB_USER=pwa_user
DB_PASSWORD=secure_password_here
DB_SSL=true

# Server
PORT=3001
NODE_ENV=production
API_BASE_URL=https://api.yourdomain.com

# JWT (Generate strong secrets)
JWT_SECRET=your_super_secure_jwt_secret_256_bits_minimum
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your_super_secure_refresh_secret_256_bits
JWT_REFRESH_EXPIRES_IN=7d

# VAPID Keys (Generate new ones for production)
VAPID_PUBLIC_KEY=your_production_vapid_public_key
VAPID_PRIVATE_KEY=your_production_vapid_private_key
VAPID_SUBJECT=mailto:admin@yourdomain.com

# CORS
CORS_ORIGIN=https://yourdomain.com
CORS_CREDENTIALS=true

# Security
BCRYPT_ROUNDS=12
SESSION_SECRET=your_session_secret_here

# Logging
LOG_LEVEL=warn
LOG_FILE_ERROR=logs/error.log
LOG_FILE_COMBINED=logs/combined.log
```

```bash
# Build the application
npm run build

# Create logs directory
mkdir -p logs

# Start with PM2
pm2 start dist/server.js --name "pwa-push-api"
pm2 save
pm2 startup
```

#### Frontend Deployment

```bash
# Navigate to root directory
cd ..

# Install dependencies
npm ci --only=production

# Create production environment file
cp .env.example .env.local

# Edit environment variables
nano .env.local
```

**Production .env.local Configuration:**

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_FRONTEND_URL=https://yourdomain.com
NEXT_PUBLIC_APP_NAME=PWA Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_production_vapid_public_key
NEXT_PUBLIC_DEBUG=false
```

```bash
# Build the application
npm run build

# Start with PM2
pm2 start npm --name "pwa-push-frontend" -- start
pm2 save
```

### 4. Nginx Configuration

Create Nginx configuration file:

```bash
sudo nano /etc/nginx/sites-available/pwa-push
```

**Nginx Configuration:**

```nginx
# Frontend (yourdomain.com)
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# API Backend (api.yourdomain.com)
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL Configuration (same as above)
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # CORS Headers
        add_header Access-Control-Allow-Origin "https://yourdomain.com" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-API-Key" always;
        add_header Access-Control-Allow-Credentials "true" always;
        
        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }
}
```

Enable the site:

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/pwa-push /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### 5. SSL Certificate Setup

#### Using Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain certificates
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 6. Monitoring and Logging

#### PM2 Monitoring

```bash
# Monitor processes
pm2 monit

# View logs
pm2 logs

# Restart applications
pm2 restart all
```

#### Log Rotation

```bash
# Create logrotate configuration
sudo nano /etc/logrotate.d/pwa-push
```

```
/var/www/pwa-push/backend/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reload pwa-push-api
    endscript
}
```

### 7. Database Backup

```bash
# Create backup script
sudo nano /usr/local/bin/backup-pwa-push.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/pwa-push"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Database backup
pg_dump -U pwa_user -h localhost pwa_push_notifications | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
# Make executable
sudo chmod +x /usr/local/bin/backup-pwa-push.sh

# Add to crontab
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-pwa-push.sh
```

## 🐳 Docker Deployment

### Docker Compose Setup

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: pwa_push_notifications
      POSTGRES_USER: pwa_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    networks:
      - pwa-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - DB_USER=pwa_user
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_NAME=pwa_push_notifications
    depends_on:
      - postgres
    networks:
      - pwa-network
    ports:
      - "3001:3001"

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.prod
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=https://api.yourdomain.com
    ports:
      - "3000:3000"
    networks:
      - pwa-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
    networks:
      - pwa-network

volumes:
  postgres_data:

networks:
  pwa-network:
    driver: bridge
```

### Deploy with Docker

```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Scale services
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

## 🔧 Performance Optimization

### Database Optimization

```sql
-- Create indexes for better performance
CREATE INDEX CONCURRENTLY idx_push_subscribers_active ON push_subscribers(is_active) WHERE is_active = true;
CREATE INDEX CONCURRENTLY idx_push_notifications_status ON push_notifications(status);
CREATE INDEX CONCURRENTLY idx_push_notifications_created ON push_notifications(created_at);
CREATE INDEX CONCURRENTLY idx_client_domains_verified ON client_domains(is_verified) WHERE is_verified = true;

-- Analyze tables
ANALYZE push_subscribers;
ANALYZE push_notifications;
ANALYZE client_domains;
```

### Application Optimization

1. **Enable Redis for Rate Limiting**:
```bash
# Install Redis
sudo apt install redis-server -y

# Configure in .env
REDIS_URL=redis://localhost:6379
```

2. **Enable Compression**:
```javascript
// Already enabled in app.ts
app.use(compression());
```

3. **Database Connection Pooling**:
```javascript
// Configure in database.ts
const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

## 🚨 Security Checklist

- [ ] Strong JWT secrets (256+ bits)
- [ ] HTTPS enabled with valid SSL certificate
- [ ] Database credentials secured
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] Input validation implemented
- [ ] Error messages don't expose sensitive data
- [ ] Regular security updates
- [ ] Backup strategy implemented
- [ ] Monitoring and alerting configured

## 📊 Monitoring

### Health Checks

```bash
# API health check
curl https://api.yourdomain.com/health

# Frontend health check
curl https://yourdomain.com/api/health
```

### Log Monitoring

```bash
# Monitor application logs
pm2 logs --lines 100

# Monitor Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## 🔄 Updates and Maintenance

### Application Updates

```bash
# Pull latest changes
git pull origin main

# Update backend
cd backend
npm ci --only=production
npm run build
pm2 restart pwa-push-api

# Update frontend
cd ..
npm ci --only=production
npm run build
pm2 restart pwa-push-frontend
```

### Database Migrations

```bash
# Run database migrations
psql -U pwa_user -d pwa_push_notifications -f migrations/migration_v1.1.sql
```

## 🆘 Troubleshooting

### Common Issues

1. **Push Notifications Not Working**:
   - Verify VAPID keys are correct
   - Check HTTPS is enabled
   - Verify domain is verified
   - Check browser permissions

2. **Database Connection Issues**:
   - Verify PostgreSQL is running
   - Check connection credentials
   - Verify firewall settings

3. **High Memory Usage**:
   - Monitor with `pm2 monit`
   - Adjust PM2 configuration
   - Check for memory leaks

### Emergency Procedures

```bash
# Restart all services
pm2 restart all
sudo systemctl restart nginx
sudo systemctl restart postgresql

# Check system resources
htop
df -h
free -m

# View error logs
pm2 logs --err
sudo tail -f /var/log/nginx/error.log
```

This deployment guide provides a comprehensive approach to deploying the PWA Push Notification SaaS platform in production environments with proper security, monitoring, and maintenance procedures.