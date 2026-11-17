import { Pool } from "pg";

// Prevent multiple pool instances during hot-reloading in development
const globalForDb = globalThis as unknown as {
  crmDbPool: Pool | undefined;
};

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_wbDJQ8GVs1zW@ep-red-bird-aebagfty-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require";

export const pool =
  globalForDb.crmDbPool ??
  new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: {
      rejectUnauthorized: false,
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.crmDbPool = pool;
}

export const DEFAULT_ORG_ID = process.env.CRM_DEFAULT_ORG_ID || "org_nexora_default";

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res.rows as T[];
  } finally {
    client.release();
  }
}
