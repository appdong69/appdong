import { Pool } from 'pg';

let pool: Pool | null = null;

export const getPool = (): Pool => {
  if (!pool) {
    const config = {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

    pool = new Pool(config);
  }

  return pool;
};

export const query = async (text: string, params?: any[]) => {
  const pool = getPool();
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};