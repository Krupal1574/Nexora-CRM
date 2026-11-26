import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/crm/auth-server";
import { DEFAULT_ORG_ID, ensureCrmSchema, query } from "@/lib/crm/db";
import { sendSecurityAlert, type SecurityEventType } from "@/lib/crm/mailer";

export const dynamic = "force-dynamic";

const ALLOWED_CLIENT_EVENTS = new Set<SecurityEventType>([
  "CLIPBOARD_COPY",
  "CLIPBOARD_CUT",
  "SCREENSHOT_ATTEMPT",
  "PRINT_ATTEMPT",
]);

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await ensureCrmSchema();
    const events = await query(
      `SELECT "id", "eventType", "severity", "actorEmail", "actorName", "pagePath",
              "details", "emailSent", "emailStatus", "createdAt"
       FROM "CrmSecurityEvent"
       WHERE "organizationId" = $1
       ORDER BY "createdAt" DESC
       LIMIT 100`,
      [DEFAULT_ORG_ID]
    );
    return NextResponse.json({ success: true, events });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to load security events." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const rawType = String(body.eventType || "") as SecurityEventType;
    if (!ALLOWED_CLIENT_EVENTS.has(rawType)) {
      return NextResponse.json({ success: false, error: "Unsupported security event type." }, { status: 400 });
    }

    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";
    const userAgent = req.headers.get("user-agent") || "";
    const pagePath = String(body.pagePath || "/");
    const details = String(body.details || rawType);

    const result = await sendSecurityAlert({
      eventType: rawType,
      severity: rawType === "SCREENSHOT_ATTEMPT" || rawType === "PRINT_ATTEMPT" ? "high" : "warning",
      actorEmail: session.email,
      actorName: session.name,
      pagePath,
      ipAddress,
      userAgent,
      details,
    });

    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to record security event." },
      { status: 500 }
    );
  }
}
