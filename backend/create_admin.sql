-- Create admin user with correct password hash
-- Password: admin123
INSERT INTO admin_users (email, password_hash, name, role, is_active) 
VALUES ('admin@pushnotify.com', '$2a$10$tVjQvd9S2srX23n6Ytb2T.W7tteX1Ke6.OGHMLs3UIpET51HDowqK', 'System Administrator', 'admin', true)
ON CONFLICT (email) DO UPDATE SET 
  password_hash = EXCLUDED.password_hash,
  is_active = true,
  updated_at = CURRENT_TIMESTAMP;