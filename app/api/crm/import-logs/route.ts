import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_ORG_ID, ensureCrmSchema, query, withTransaction } from "@/lib/crm/db";
import { recordImportLog } from "@/lib/crm/bulk-import";

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
    await ensureCrmSchema();
    const body = await req.json();
    await withTransaction(async (client) => {
      await recordImportLog(client, {
        actionType: body.actionType || "Export",
        targetType: body.targetType || "Leads",
        sourceName: body.sourceName || "export.csv",
        addedCount: Number(body.addedCount) || 0,
        updatedCount: Number(body.updatedCount) || 0,
        skippedCount: Number(body.skippedCount) || 0,
        actor: body.actor || "Support Admin",
        details: body.details || "",
      });
    });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Failed to record log." }, { status: 500 });
  }
}
