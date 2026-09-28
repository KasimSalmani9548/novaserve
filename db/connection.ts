// MySQL Connection Pool
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'novaserve',
  password: process.env.DB_PASSWORD || 'NovaServe@2026',
  database: process.env.DB_NAME || 'novaserve',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: '+05:30',
  dateStrings: false,
});

// Helper: Run query and return rows
export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const [rows] = await pool.execute(sql, params);
  return rows as T[];
}

// Helper: Run query and return first row
export async function queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] || null;
}

// Helper: Run INSERT/UPDATE/DELETE
export async function execute(sql: string, params?: any[]) {
  const [result] = await pool.execute(sql, params);
  return result;
}

// Test connection
export async function testConnection() {
  try {
    await pool.query('SELECT 1');
    console.log('[MySQL] Connected successfully');
    return true;
  } catch (e: any) {
    console.error('[MySQL] Connection failed:', e.message);
    return false;
  }
}