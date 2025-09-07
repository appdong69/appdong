require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Database configuration
const config = process.env.DATABASE_URL ? {
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
} : {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'pwa_push_saas',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};

const pool = new Pool(config);

async function createAdminUser() {
  try {
    console.log('Creating admin user...');
    
    // Hash password
    const passwordHash = bcrypt.hashSync('admin123', 10);
    
    // Insert or update admin user
    const query = `
      INSERT INTO admin_users (email, password_hash, name, role, is_active) 
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO UPDATE SET 
        password_hash = EXCLUDED.password_hash,
        is_active = true,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, email, name, role;
    `;
    
    const result = await pool.query(query, [
      'admin@pushnotify.com',
      passwordHash,
      'System Administrator',
      'admin',
      true
    ]);
    
    console.log('Admin user created/updated successfully:');
    console.log('Email: admin@pushnotify.com');
    console.log('Password: admin123');
    console.log('User data:', result.rows[0]);
    
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await pool.end();
  }
}

createAdminUser();