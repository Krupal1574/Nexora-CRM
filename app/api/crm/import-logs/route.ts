import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/crm/auth-server";
import { DEFAULT_ORG_ID, ensureCrmSchema, query, withTransaction } from "@/lib/crm/db";
import { recordImportLog } from "@/lib/crm/bulk-import";
import { sendSecurityAlert } from "@/lib/crm/mailer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureCrmSchema();
    const logs = await query(
      `SELECT * FROM "CrmImportLog" WHERE "organizationId" = $1 ORDER BY "createdAt" DESC LIMIT 100`,
      [DEFAULT_ORG_ID]
    );
    return NextResponse.json({ success: true, logs });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Failed to load logs." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    await ensureCrmSchema();
    const body = await req.json();
    const actionType = body.actionType || "Export";
    const targetType = body.targetType || "Leads";
    const sourceName = body.sourceName || "export.csv";
    const addedCount = Number(body.addedCount) || 0;
    const actor = session?.name || body.actor || "Support Admin";

    await withTransaction(async (client) => {
      await recordImportLog(client, {
        actionType,
        targetType,
        sourceName,
        addedCount,
        updatedCount: Number(body.updatedCount) || 0,
        skippedCount: Number(body.skippedCount) || 0,
        actor,
        details: body.details || "",
      });
    });

    if (actionType === "Export" || actionType === "Export Attempt") {
      await sendSecurityAlert({
        eventType: "EXPORT",
        severity: "high",
        actorEmail: session?.email || "unknown",
        actorName: actor,
        pagePath: String(body.pagePath || "/import"),
        ipAddress: req.headers.get("x-forwarded-for") || "",
        userAgent: req.headers.get("user-agent") || "",
        details: `Exported ${addedCount} ${targetType} record(s) to "${sourceName}". ${body.details || ""}`.trim(),
      });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Failed to record log." }, { status: 500 });
  }
}
