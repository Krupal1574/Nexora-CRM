import crypto from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { DEFAULT_ORG_ID, ensureCrmSchema, query } from "@/lib/crm/db";

export const SESSION_COOKIE_NAME = "nexora_session";
export const ALLOWED_DOMAINS = ["@nexorastaffingllp.com", "@nexorastafingllp.com"];

export type UserRole =
  | "Owner / Admin"
  | "Senior Recruiter"
  | "Account Manager"
  | "Lead Sourcer"
  | "Recruiter"
  | "Viewer";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarInitials: string;
  exp: number;
}

function getAuthSecret(): string {
  return process.env.NEXTAUTH_SECRET || process.env.CRM_AUTH_SECRET || "nexora-crm-dev-secret-change-in-prod";
}

export function isValidCorporateEmail(email: string): boolean {
  const lower = email.trim().toLowerCase();
  return ALLOWED_DOMAINS.some((domain) => lower.endsWith(domain));
}

export function isDeactivatedEmail(email: string): boolean {
  const lower = email.trim().toLowerCase();
  return lower === "krupal@nexorastaffingllp.com" || lower === "krupal@nexorastafingllp.com";
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(":");
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;
  try {
    const actual = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(expectedHex, "hex");
    if (actual.length !== expected.length) return false;
    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function toBase64Url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

export function signSessionToken(
  user: Omit<SessionUser, "exp">,
  ttlSeconds = 60 * 60 * 24 * 7
): string {
  const payload: SessionUser = {
    ...user,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const sig = crypto
    .createHmac("sha256", getAuthSecret())
    .update(encodedPayload)
    .digest("base64url");
  return `${encodedPayload}.${sig}`;
}

export function verifySessionToken(token?: string | null): SessionUser | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encodedPayload, providedSig] = parts;
  if (!encodedPayload || !providedSig) return null;

  try {
    const expectedSig = crypto
      .createHmac("sha256", getAuthSecret())
      .update(encodedPayload)
      .digest("base64url");

    const a = Buffer.from(providedSig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null;
    }

    const parsed = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as SessionUser;
    if (!parsed || !parsed.email || !parsed.exp) return null;
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    if (isDeactivatedEmail(parsed.email)) return null;
    return parsed;
  } catch {
    return null;
  }
}

let seededPromise: Promise<void> | null = null;

export async function ensureDefaultUsers(): Promise<void> {
  await ensureCrmSchema();
  if (!seededPromise) {
    seededPromise = (async () => {
      const existing = await query<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM "CrmUser" WHERE "organizationId" = $1`,
        [DEFAULT_ORG_ID]
      );
      const userCount = existing[0]?.count ?? 0;

      // If users already exist, update their passwords from env vars
      if (userCount > 0) {
        const adminPassword = process.env.CRM_ADMIN_PASSWORD;
        const teamPassword = process.env.CRM_TEAM_PASSWORD;
        if (adminPassword) {
          await query(
            `UPDATE "CrmUser" SET "passwordHash" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE "email" = $2`,
            [hashPassword(adminPassword), "support@nexorastaffingllp.com"]
          );
        }
        if (teamPassword) {
          await query(
            `UPDATE "CrmUser" SET "passwordHash" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE "email" = ANY($2::text[])`,
            [hashPassword(teamPassword), ["yatri@nexorastaffingllp.com", "priya@nexorastaffingllp.com", "rahul@nexorastaffingllp.com"]]
          );
        }
        return;
      }

      const adminPassword = process.env.CRM_ADMIN_PASSWORD || "Krupal@2921#6965";
      const teamPassword = process.env.CRM_TEAM_PASSWORD || "Nexora@2026";

      const seedAccounts = [
        {
          id: "u-support-admin",
          name: "Support Admin",
          email: "support@nexorastaffingllp.com",
          role: "Owner / Admin",
          avatarInitials: "SA",
          passwordHash: hashPassword(adminPassword),
        },
        {
          id: "u-yatri",
          name: "Yatri",
          email: "yatri@nexorastaffingllp.com",
          role: "Lead Sourcer",
          avatarInitials: "YS",
          passwordHash: hashPassword(teamPassword),
        },
        {
          id: "u-priya",
          name: "Priya S.",
          email: "priya@nexorastaffingllp.com",
          role: "Senior Recruiter",
          avatarInitials: "PS",
          passwordHash: hashPassword(teamPassword),
        },
        {
          id: "u-rahul",
          name: "Rahul K.",
          email: "rahul@nexorastaffingllp.com",
          role: "Account Manager",
          avatarInitials: "RK",
          passwordHash: hashPassword(teamPassword),
        },
      ];

      for (const acc of seedAccounts) {
        await query(
          `
            INSERT INTO "CrmUser" ("id", "organizationId", "name", "email", "role", "avatarInitials", "passwordHash", "isActive")
            VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
            ON CONFLICT ("email") DO NOTHING
          `,
          [acc.id, DEFAULT_ORG_ID, acc.name, acc.email, acc.role, acc.avatarInitials, acc.passwordHash]
        );
      }
    })().catch((err) => {
      seededPromise = null;
      throw err;
    });
  }
  return seededPromise;
}

export function getSessionFromRequest(req: NextRequest): SessionUser | null {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

export async function getCurrentSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}
