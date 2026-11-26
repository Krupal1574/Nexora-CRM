import { NextRequest, NextResponse } from "next/server";
import {
  ensureDefaultUsers,
  isDeactivatedEmail,
  isValidCorporateEmail,
  SESSION_COOKIE_NAME,
  signSessionToken,
  verifyPassword,
  type UserRole,
} from "@/lib/crm/auth-server";
import { query } from "@/lib/crm/db";
import { sendSecurityAlert } from "@/lib/crm/mailer";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await ensureDefaultUsers();
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const rememberMe = body.rememberMe !== false;

    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";
    const userAgent = req.headers.get("user-agent") || "";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ success: false, error: "Please enter a valid work email address." }, { status: 400 });
    }

    if (!isValidCorporateEmail(email)) {
      return NextResponse.json(
        {
          success: false,
          error: "Access Restricted: Only authorized @nexorastaffingllp.com accounts may sign in.",
        },
        { status: 403 }
      );
    }

    if (isDeactivatedEmail(email)) {
      await sendSecurityAlert({
        eventType: "LOGIN_FAILED",
        severity: "high",
        actorEmail: email,
        actorName: "Deactivated Account",
        pagePath: "/login",
        ipAddress,
        userAgent,
        details: `Blocked login attempt using deactivated account ${email}`,
      });
      return NextResponse.json(
        {
          success: false,
          error: "This account has been deactivated. Please contact support@nexorastaffingllp.com.",
        },
        { status: 403 }
      );
    }

    if (!password.trim()) {
      return NextResponse.json({ success: false, error: "Password is required." }, { status: 400 });
    }

    const rows = await query<{
      id: string;
      name: string;
      email: string;
      role: UserRole;
      avatarInitials: string;
      passwordHash: string;
      isActive: boolean;
    }>(
      `SELECT "id", "name", "email", "role", "avatarInitials", "passwordHash", "isActive"
       FROM "CrmUser"
       WHERE LOWER("email") = $1
       LIMIT 1`,
      [email]
    );

    const dbUser = rows[0];
    if (!dbUser || !dbUser.isActive || !verifyPassword(password.trim(), dbUser.passwordHash)) {
      await sendSecurityAlert({
        eventType: "LOGIN_FAILED",
        severity: "warning",
        actorEmail: email,
        actorName: dbUser?.name || "Unknown",
        pagePath: "/login",
        ipAddress,
        userAgent,
        details: `Failed sign-in attempt for ${email}`,
      });
      return NextResponse.json(
        { success: false, error: "Invalid corporate email or password." },
        { status: 401 }
      );
    }

    await query(`UPDATE "CrmUser" SET "lastLoginAt" = CURRENT_TIMESTAMP WHERE "id" = $1`, [dbUser.id]);

    const ttlSeconds = rememberMe ? 60 * 60 * 24 * 7 : 60 * 60 * 12;
    const sessionUser = {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
      avatarInitials: dbUser.avatarInitials,
    };
    const token = signSessionToken(sessionUser, ttlSeconds);

    const res = NextResponse.json({
      success: true,
      user: sessionUser,
    });

    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ttlSeconds,
    });
    // Remove legacy unsigned cookie if present
    res.cookies.set("nexora_auth_user", "", { path: "/", maxAge: 0 });

    return res;
  } catch (err: any) {
    console.error("POST /api/auth/login error:", err);
    return NextResponse.json(
      { success: false, error: "Authentication service error. Please try again." },
      { status: 500 }
    );
  }
}
