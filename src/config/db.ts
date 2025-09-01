import oracledb from 'oracledb';
import { env } from './env';

let pool: any | null = null;

export async function initPool() {
  if (pool) return pool;
  try {
    pool = await oracledb.createPool({
      user: env.db.user,
      password: env.db.password,
      connectString: env.db.connectString,
      poolMin: 2,
      poolMax: 20,
      poolIncrement: 2,
      stmtCacheSize: 100
    });
    return pool;
  } catch (e) {
    // allow running without Oracle in dev
    // eslint-disable-next-line no-console
    console.warn('Oracle pool init failed (optional in dev):', (e as Error).message);
    return null;
  }
}

export async function withConn<T>(fn: (conn: any) => Promise<T>): Promise<T> {
  if (!pool) {
    // Try to initialize pool if not already done
    await initPool();
    if (!pool) {
      throw new Error('Database connection not available. Please check your database configuration.');
    }
  }
  
  const conn = await pool.getConnection();
  try {
    return await fn(conn);
  } finally {
    await conn.close();
  }
}

export async function withTransaction<T>(fn: (conn: any) => Promise<T>): Promise<T> {
  if (!pool) {
    // Try to initialize pool if not already done
    await initPool();
    if (!pool) {
      throw new Error('Database connection not available. Please check your database configuration.');
    }
  }
  
  const conn = await pool.getConnection();
  try {
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (e) {
    try { await conn.rollback(); } catch {}
    throw e;
  } finally {
    await conn.close();
  }
}


