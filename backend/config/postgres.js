import { Pool } from 'pg';

let _pool = null;

const createPool = () => {
  const databaseUrl = process.env.DATABASE_URL || process.env.PG_CONNECTION_STRING || null;
  if (!databaseUrl && !process.env.PGHOST) {
    console.warn('Postgres config not found — skipping Postgres connection');
    return null;
  }
  const opts = databaseUrl ? { connectionString: databaseUrl } : {
    host: process.env.PGHOST || process.env.DB_HOST,
    port: process.env.PGPORT || process.env.DB_PORT,
    database: process.env.PGDATABASE || process.env.DB_NAME,
    user: process.env.PGUSER || process.env.DB_USER,
    password: process.env.PGPASSWORD || process.env.DB_PASSWORD,
  };
  return new Pool(opts);
};

const getPool = async () => {
  if (_pool) return _pool;
  const pool = createPool();
  if (!pool) return null;
  pool.on('error', (err) => console.error('Unexpected Postgres client error', err));
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('Postgres Connected!');
    _pool = pool;
    return _pool;
  } catch (err) {
    console.error('Postgres connection error:', err.message || err);
    return null;
  }
};

export default getPool;
