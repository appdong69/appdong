const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration from .env.local
const DATABASE_URL = 'postgresql://postgres.hicfapefigfwshtvaycx:Michella%40168@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres';

async function setupDatabase() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔗 Connecting to Supabase database...');
    
    // Test connection
    const client = await pool.connect();
    console.log('✅ Connected to database successfully!');
    
    // Read schema file
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📄 Running database schema...');
    
    // Execute schema
    await client.query(schema);
    
    console.log('✅ Database schema created successfully!');
    
    // Check if admin user exists
    const adminCheck = await client.query('SELECT * FROM admin_users WHERE email = $1', ['admin@pushnotify.com']);
    
    if (adminCheck.rows.length === 0) {
      console.log('👤 Creating default admin user...');
      
      // Create default admin user
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 12);
      
      await client.query(
        'INSERT INTO admin_users (email, password_hash, name, role) VALUES ($1, $2, $3, $4)',
        ['admin@pushnotify.com', hashedPassword, 'Master Admin', 'admin']
      );
      
      console.log('✅ Default admin user created!');
      console.log('📧 Email: admin@pushnotify.com');
      console.log('🔑 Password: admin123');
    } else {
      console.log('👤 Admin user already exists');
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

setupDatabase();