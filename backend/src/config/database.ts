import { Pool, PoolClient } from 'pg';
import { logger } from '@/utils/logger';

let pool: Pool;
let mockMode = false;

export const initDatabase = async (): Promise<void> => {
  try {
    // Check if we're in development mode without PostgreSQL
    if (process.env.NODE_ENV === 'development' && !process.env.DB_HOST && !process.env.DATABASE_URL) {
      mockMode = true;
      logger.info('Database initialized in mock mode for development');
      return;
    }

    // Use DATABASE_URL for production (Supabase) or individual config for development
    const config = process.env.DATABASE_URL ? {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      },
      max: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
    } : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'pwa_push_saas',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      max: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    };

    pool = new Pool(config);

    // Test the connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();

    logger.info('Database connection established successfully');
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    // In development, fall back to mock mode
    if (process.env.NODE_ENV === 'development') {
      mockMode = true;
      logger.info('Falling back to mock mode for development');
      return;
    }
    throw error;
  }
};

export const getPool = (): Pool => {
  if (mockMode) {
    throw new Error('Database is in mock mode - pool not available');
  }
  if (!pool) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return pool;
};

export const query = async (text: string, params?: any[]): Promise<any> => {
  if (mockMode) {
    logger.info('Mock database query:', { text, params });
    
    // Handle admin login query
    if (text.includes('admin_users') && text.includes('email')) {
      return {
        rows: [{
          id: 1,
          email: 'admin@pushnotify.com',
          password_hash: '$2a$10$tVjQvd9S2srX23n6Ytb2T.W7tteX1Ke6.OGHMLs3UIpET51HDowqK', // admin123
          name: 'System Administrator',
          role: 'admin',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        }],
        rowCount: 1
      };
    }
    
    // Handle clients count query
    if (text.includes('COUNT(*) as count') && text.includes('clients')) {
      return {
        rows: [{ count: '5' }],
        rowCount: 1
      };
    }
    
    // Handle active clients count query
    if (text.includes('is_active = true') && text.includes('clients')) {
      return {
        rows: [{ count: '3' }],
        rowCount: 1
      };
    }
    
    // Handle notifications count query
    if (text.includes('push_notifications') && text.includes('SUM(successful_sends)')) {
      return {
        rows: [{ total: '150' }],
        rowCount: 1
      };
    }
    
    // Handle subscribers count query
    if (text.includes('push_subscribers') && text.includes('COUNT(*)')) {
      return {
        rows: [{ count: '25' }],
        rowCount: 1
      };
    }
    
    // Handle subscriber growth query
    if (text.includes('DATE(subscribed_at)') && text.includes('INTERVAL')) {
      const mockGrowthData = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        mockGrowthData.push({
          date: date.toISOString().split('T')[0],
          new_subscribers: Math.floor(Math.random() * 10) + 1
        });
      }
      return {
        rows: mockGrowthData,
        rowCount: mockGrowthData.length
      };
    }
    
    // Handle recent notifications query
    if (text.includes('push_notifications pn') && text.includes('JOIN clients c')) {
      const mockNotifications = [
        {
          id: 1,
          title: 'Welcome Notification',
          successful_sends: 45,
          click_count: 12,
          sent_at: new Date(Date.now() - 86400000), // 1 day ago
          client_name: 'Demo Client',
          client_email: 'demo@example.com'
        },
        {
          id: 2,
          title: 'Product Update',
          successful_sends: 38,
          click_count: 8,
          sent_at: new Date(Date.now() - 172800000), // 2 days ago
          client_name: 'Test Company',
          client_email: 'test@company.com'
        }
      ];
      return {
        rows: mockNotifications,
        rowCount: mockNotifications.length
      };
    }
    
    // Handle clients list query
    if (text.includes('FROM clients c') && text.includes('SELECT')) {
      return {
        rows: [],
        rowCount: 0
      };
    }
    
    // Handle client INSERT query
    if (text.includes('INSERT INTO clients') && text.includes('RETURNING')) {
      const clientId = params?.[0] || 'mock-client-id';
      const email = params?.[1] || 'test@example.com';
      const name = params?.[3] || 'Test Client';
      const companyName = params?.[4] || 'Test Company';
      const domainLimit = params?.[5] || 5;
      const subscriptionPlan = params?.[6] || 'basic';
      
      return {
        rows: [{
          id: clientId,
          email: email,
          name: name,
          company_name: companyName,
          domain_limit: domainLimit,
          subscription_plan: subscriptionPlan,
          is_active: true,
          created_at: new Date()
        }],
        rowCount: 1
      };
    }
    
    // Handle other queries with empty results
    return { rows: [], rowCount: 0 };
  }
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } catch (error) {
    logger.error('Database query error:', { text, params, error });
    throw error;
  } finally {
    client.release();
  }
};

export const getClient = async (): Promise<PoolClient> => {
  if (mockMode) {
    throw new Error('Database is in mock mode - client not available');
  }
  return await pool.connect();
};

export const transaction = async <T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> => {
  if (mockMode) {
    logger.info('Mock database transaction');
    return {} as T;
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Transaction error:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Database health check
export const healthCheck = async (): Promise<boolean> => {
  if (mockMode) {
    logger.info('Mock database health check - returning true');
    return true;
  }
  try {
    const result = await query('SELECT 1 as health');
    return result.rows[0].health === 1;
  } catch (error) {
    logger.error('Database health check failed:', error);
    return false;
  }
};

// Close database connection
export const closeDatabase = async (): Promise<void> => {
  if (mockMode) {
    logger.info('Mock database connection closed');
    return;
  }
  if (pool) {
    await pool.end();
    logger.info('Database connection closed');
  }
};