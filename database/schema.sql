-- PWA Push Notification SaaS Database Schema
-- PostgreSQL Database Schema

-- Create database (run this separately)
-- CREATE DATABASE pwa_push_saas;

-- Use the database
-- \c pwa_push_saas;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Master Admin Users Table
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Client Users Table
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    domain_limit INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    subscription_plan VARCHAR(50) DEFAULT 'basic',
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES admin_users(id)
);

-- Client Domains Table
CREATE TABLE client_domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    domain VARCHAR(255) NOT NULL,
    is_verified BOOLEAN DEFAULT false,
    verification_token VARCHAR(255),
    api_key VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(client_id, domain)
);

-- Push Notification Templates Table
CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    icon_url VARCHAR(500),
    target_url VARCHAR(500),
    badge_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Push Subscribers Table
CREATE TABLE push_subscribers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    domain_id UUID NOT NULL REFERENCES client_domains(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    user_agent TEXT,
    ip_address INET,
    country VARCHAR(2),
    city VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    unsubscribed_at TIMESTAMP WITH TIME ZONE,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(endpoint)
);

-- Push Notifications Table
CREATE TABLE push_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    template_id UUID REFERENCES notification_templates(id),
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    icon_url VARCHAR(500),
    target_url VARCHAR(500),
    badge_url VARCHAR(500),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'draft', -- draft, scheduled, sending, sent, failed
    total_subscribers INTEGER DEFAULT 0,
    successful_sends INTEGER DEFAULT 0,
    failed_sends INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Push Notification Deliveries Table
CREATE TABLE notification_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID NOT NULL REFERENCES push_notifications(id) ON DELETE CASCADE,
    subscriber_id UUID NOT NULL REFERENCES push_subscribers(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending', -- pending, sent, failed, clicked
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(notification_id, subscriber_id)
);

-- VAPID Keys Table (for web push)
CREATE TABLE vapid_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    public_key TEXT NOT NULL,
    private_key TEXT NOT NULL,
    subject VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(client_id)
);

-- Analytics Events Table
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    domain_id UUID REFERENCES client_domains(id) ON DELETE CASCADE,
    subscriber_id UUID REFERENCES push_subscribers(id) ON DELETE SET NULL,
    notification_id UUID REFERENCES push_notifications(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL, -- subscribe, unsubscribe, notification_sent, notification_clicked
    event_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_is_active ON clients(is_active);
CREATE INDEX idx_client_domains_client_id ON client_domains(client_id);
CREATE INDEX idx_client_domains_domain ON client_domains(domain);
CREATE INDEX idx_client_domains_api_key ON client_domains(api_key);
CREATE INDEX idx_notification_templates_client_id ON notification_templates(client_id);
CREATE INDEX idx_push_subscribers_client_id ON push_subscribers(client_id);
CREATE INDEX idx_push_subscribers_domain_id ON push_subscribers(domain_id);
CREATE INDEX idx_push_subscribers_endpoint ON push_subscribers(endpoint);
CREATE INDEX idx_push_subscribers_is_active ON push_subscribers(is_active);
CREATE INDEX idx_push_notifications_client_id ON push_notifications(client_id);
CREATE INDEX idx_push_notifications_status ON push_notifications(status);
CREATE INDEX idx_push_notifications_scheduled_at ON push_notifications(scheduled_at);
CREATE INDEX idx_notification_deliveries_notification_id ON notification_deliveries(notification_id);
CREATE INDEX idx_notification_deliveries_subscriber_id ON notification_deliveries(subscriber_id);
CREATE INDEX idx_notification_deliveries_status ON notification_deliveries(status);
CREATE INDEX idx_analytics_events_client_id ON analytics_events(client_id);
CREATE INDEX idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_client_domains_updated_at BEFORE UPDATE ON client_domains FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_templates_updated_at BEFORE UPDATE ON notification_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_push_notifications_updated_at BEFORE UPDATE ON push_notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (password: admin123 - should be changed in production)
INSERT INTO admin_users (email, password_hash, name, role) VALUES 
('admin@pushnotify.com', '$2b$10$rQZ9QmjKjKjKjKjKjKjKjOeH8H8H8H8H8H8H8H8H8H8H8H8H8H8H8', 'System Administrator', 'admin');

-- Create views for analytics
CREATE VIEW client_stats AS
SELECT 
    c.id,
    c.name,
    c.email,
    c.is_active,
    COUNT(DISTINCT cd.id) as domain_count,
    COUNT(DISTINCT ps.id) as subscriber_count,
    COUNT(DISTINCT pn.id) as notification_count,
    COALESCE(SUM(pn.successful_sends), 0) as total_sends,
    COALESCE(SUM(pn.click_count), 0) as total_clicks,
    c.created_at
FROM clients c
LEFT JOIN client_domains cd ON c.id = cd.client_id
LEFT JOIN push_subscribers ps ON c.id = ps.client_id AND ps.is_active = true
LEFT JOIN push_notifications pn ON c.id = pn.client_id
GROUP BY c.id, c.name, c.email, c.is_active, c.created_at;

CREATE VIEW daily_subscriber_growth AS
SELECT 
    client_id,
    DATE(subscribed_at) as date,
    COUNT(*) as new_subscribers
FROM push_subscribers 
WHERE subscribed_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY client_id, DATE(subscribed_at)
ORDER BY date DESC;

CREATE VIEW notification_performance AS
SELECT 
    pn.id,
    pn.client_id,
    pn.title,
    pn.total_subscribers,
    pn.successful_sends,
    pn.failed_sends,
    pn.click_count,
    CASE 
        WHEN pn.successful_sends > 0 THEN (pn.click_count::float / pn.successful_sends::float) * 100
        ELSE 0
    END as ctr_percentage,
    pn.sent_at,
    pn.created_at
FROM push_notifications pn
WHERE pn.status = 'sent'
ORDER BY pn.sent_at DESC;