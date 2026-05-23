import { Pool } from 'pg';

let pool: Pool;

export function getDb(): Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL ?? '';
    // Cloud SQL Unix socket (host=/cloudsql/...) is a local FS path and does not speak SSL.
    // Only enable SSL for real TCP connections in production.
    const isUnixSocket = url.includes('host=/cloudsql/');
    pool = new Pool({
      connectionString: url,
      ssl: !isUnixSocket && process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 10,
    });
  }
  return pool;
}
