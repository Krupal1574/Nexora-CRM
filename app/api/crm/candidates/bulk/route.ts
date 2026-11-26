import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/crm/auth-server";
import { executeBulkImport, type DuplicateStrategy } from "@/lib/crm/bulk-import";
import { DEFAULT_DUPLICATE_OPTIONS, type DuplicateMatchOptions } from "@/lib/crm/duplicates";
import type { NormalizedImportRow } from "@/lib/crm/import-utils";
import { sendSecurityAlert } from "@/lib/crm/mailer";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    const body = await req.json();
    const rows: NormalizedImportRow[] = Array.isArray(body.rows) ? body.rows : [];
    const duplicateMode: DuplicateStrategy = body.duplicateMode || "skip";
    const matchOptions: DuplicateMatchOptions = body.matchOptions || DEFAULT_DUPLICATE_OPTIONS;

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid candidate rows provided for import." },
        { status: 400 }
      );
    }

    const actor = session?.name || body.actor || "Support Admin";
    const summary = await executeBulkImport({
      targetType: "candidates",
      rows,
      duplicateMode,
      matchOptions,
      sourceName: body.sourceName || "Spreadsheet Import",
      actor,
      actionType: body.actionType || "Import",
    });

    await sendSecurityAlert({
      eventType: "IMPORT",
      severity: "warning",
      actorEmail: session?.email || "unknown",
      actorName: actor,
      pagePath: "/import",
      ipAddress: req.headers.get("x-forwarded-for") || "",
      userAgent: req.headers.get("user-agent") || "",
      details: `Imported Candidates from "${body.sourceName || "Spreadsheet"}": +${summary.addedCount} added, ${summary.updatedCount} updated, ${summary.skippedCount} skipped (total ${summary.totalReceived} rows).`,
    });

    return NextResponse.json({ success: true, summary }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/crm/candidates/bulk error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Bulk candidate import failed." },
      { status: 500 }
    );
  }
}
