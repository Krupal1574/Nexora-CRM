import { Pool, type PoolClient } from "pg";

// Prevent multiple pool instances during hot-reloading in development
const globalForDb = globalThis as unknown as {
  crmDbPool: Pool | undefined;
  crmSchemaPromise: Promise<void> | undefined;
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
    connectionTimeoutMillis: 8000,
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

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Idempotently ensures auxiliary CRM tables (Google Sheet connections, import/sync logs)
 * and lookup indexes exist in PostgreSQL. Safe to call across requests.
 */
export async function ensureCrmSchema(): Promise<void> {
  if (!globalForDb.crmSchemaPromise) {
    globalForDb.crmSchemaPromise = (async () => {
      const client = await pool.connect();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS "CrmSheetSource" (
            "id" TEXT PRIMARY KEY,
            "organizationId" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "sheetUrl" TEXT NOT NULL,
            "spreadsheetId" TEXT NOT NULL,
            "gid" TEXT DEFAULT '0',
            "sheetName" TEXT DEFAULT '',
            "targetType" TEXT NOT NULL DEFAULT 'leads',
            "duplicateMode" TEXT NOT NULL DEFAULT 'skip',
            "lastSyncedAt" TIMESTAMP(3),
            "lastSyncCount" INTEGER NOT NULL DEFAULT 0,
            "lastSyncStatus" TEXT NOT NULL DEFAULT 'ready',
            "lastSyncSummary" TEXT NOT NULL DEFAULT '',
            "createdBy" TEXT NOT NULL DEFAULT 'Support Admin',
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS "CrmImportLog" (
            "id" TEXT PRIMARY KEY,
            "organizationId" TEXT NOT NULL,
            "actionType" TEXT NOT NULL,
            "targetType" TEXT NOT NULL,
            "sourceName" TEXT NOT NULL,
            "addedCount" INTEGER NOT NULL DEFAULT 0,
            "updatedCount" INTEGER NOT NULL DEFAULT 0,
            "skippedCount" INTEGER NOT NULL DEFAULT 0,
            "actor" TEXT NOT NULL DEFAULT 'Support Admin',
            "details" TEXT NOT NULL DEFAULT '',
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS "CrmUser" (
            "id" TEXT PRIMARY KEY,
            "organizationId" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "email" TEXT NOT NULL UNIQUE,
            "role" TEXT NOT NULL DEFAULT 'Recruiter',
            "avatarInitials" TEXT NOT NULL DEFAULT 'NX',
            "passwordHash" TEXT NOT NULL,
            "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
            "lastLoginAt" TIMESTAMP(3),
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS "CrmSecurityEvent" (
            "id" TEXT PRIMARY KEY,
            "organizationId" TEXT NOT NULL,
            "eventType" TEXT NOT NULL,
            "severity" TEXT NOT NULL DEFAULT 'info',
            "actorEmail" TEXT NOT NULL DEFAULT '',
            "actorName" TEXT NOT NULL DEFAULT '',
            "pagePath" TEXT NOT NULL DEFAULT '',
            "ipAddress" TEXT NOT NULL DEFAULT '',
            "userAgent" TEXT NOT NULL DEFAULT '',
            "details" TEXT NOT NULL DEFAULT '',
            "emailSent" BOOLEAN NOT NULL DEFAULT FALSE,
            "emailStatus" TEXT NOT NULL DEFAULT 'pending',
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
          );

          CREATE INDEX IF NOT EXISTS "CrmLead_org_created_idx"
            ON "CrmLead" ("organizationId", "createdAt" DESC);
          CREATE INDEX IF NOT EXISTS "CrmNote_org_record_idx"
            ON "CrmNote" ("organizationId", "recordType", "recordId");
          CREATE INDEX IF NOT EXISTS "CrmSheetSource_org_idx"
            ON "CrmSheetSource" ("organizationId", "updatedAt" DESC);
          CREATE INDEX IF NOT EXISTS "CrmImportLog_org_idx"
            ON "CrmImportLog" ("organizationId", "createdAt" DESC);
          CREATE INDEX IF NOT EXISTS "CrmSecurityEvent_org_idx"
            ON "CrmSecurityEvent" ("organizationId", "createdAt" DESC);
        `);
      } catch (err) {
        globalForDb.crmSchemaPromise = undefined;
        throw err;
      } finally {
        client.release();
      }
    })();
  }
  return globalForDb.crmSchemaPromise;
}
