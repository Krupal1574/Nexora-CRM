import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_ORG_ID, ensureCrmSchema, query } from "@/lib/crm/db";
import { executeBulkImport, type DuplicateStrategy } from "@/lib/crm/bulk-import";
import { fetchGoogleSheetCsv, parseGoogleSheetUrl } from "@/lib/crm/google-sheets";
import {
  buildAutoColumnMapping,
  detectImportFormat,
  extractSpreadsheetParts,
  normalizeMappedRows,
} from "@/lib/crm/import-utils";
import {
  analyzeImportDuplicates,
  DEFAULT_DUPLICATE_OPTIONS,
  type DedupeComparableRecord,
  type DuplicateMatchOptions,
} from "@/lib/crm/duplicates";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureCrmSchema();
    const sources = await query(
      `SELECT * FROM "CrmSheetSource" WHERE "organizationId" = $1 ORDER BY "updatedAt" DESC`,
      [DEFAULT_ORG_ID]
    );
    return NextResponse.json({
      success: true,
      hasApiKey: Boolean(process.env.GOOGLE_SHEETS_API_KEY),
      sources,
    });
  } catch (err: any) {
    console.error("GET /api/crm/google-sheets error:", err);
    return NextResponse.json({ success: false, error: err?.message || "Failed to list Google Sheets." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureCrmSchema();
    const body = await req.json();
    const action = (body.action || "preview") as "preview" | "sync" | "save";

    let sheetUrl = String(body.sheetUrl || "").trim();
    let sheetName = String(body.sheetName || "").trim();
    let targetType: "leads" | "candidates" = body.targetType === "candidates" ? "candidates" : "leads";
    let duplicateMode: DuplicateStrategy = body.duplicateMode || "skip";
    let sourceName = String(body.name || "").trim();
    const sourceId = body.sourceId ? String(body.sourceId) : "";
    const matchOptions: DuplicateMatchOptions = body.matchOptions || DEFAULT_DUPLICATE_OPTIONS;
    const actor = String(body.actor || "Support Admin");

    if (sourceId && !sheetUrl) {
      const saved = await query<any>(
        `SELECT * FROM "CrmSheetSource" WHERE "id" = $1 AND "organizationId" = $2`,
        [sourceId, DEFAULT_ORG_ID]
      );
      if (saved.length === 0) {
        return NextResponse.json({ success: false, error: "Saved Google Sheet connection not found." }, { status: 404 });
      }
      sheetUrl = saved[0].sheetUrl;
      sheetName = sheetName || saved[0].sheetName || "";
      targetType = (body.targetType || saved[0].targetType) === "candidates" ? "candidates" : "leads";
      duplicateMode = body.duplicateMode || saved[0].duplicateMode || "skip";
      sourceName = sourceName || saved[0].name;
    }

    if (action === "save") {
      const ref = parseGoogleSheetUrl(sheetUrl, sheetName);
      const id = sourceId || `gsheet_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
      const displayName = sourceName || `Google Sheet (${ref.spreadsheetId.slice(0, 8)}…)`;
      const saved = await query(
        `
          INSERT INTO "CrmSheetSource" (
            "id", "organizationId", "name", "sheetUrl", "spreadsheetId", "gid", "sheetName",
            "targetType", "duplicateMode", "createdBy"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT ("id") DO UPDATE SET
            "name" = EXCLUDED."name",
            "sheetUrl" = EXCLUDED."sheetUrl",
            "spreadsheetId" = EXCLUDED."spreadsheetId",
            "gid" = EXCLUDED."gid",
            "sheetName" = EXCLUDED."sheetName",
            "targetType" = EXCLUDED."targetType",
            "duplicateMode" = EXCLUDED."duplicateMode",
            "updatedAt" = CURRENT_TIMESTAMP
          RETURNING *
        `,
        [id, DEFAULT_ORG_ID, displayName, sheetUrl, ref.spreadsheetId, ref.gid, sheetName, targetType, duplicateMode, actor]
      );
      return NextResponse.json({ success: true, source: saved[0] });
    }

    // Fetch live CSV from Google Sheets
    const fetched = await fetchGoogleSheetCsv(sheetUrl, sheetName);
    const parsed = extractSpreadsheetParts(fetched.csvText);
    const detectedFormat = detectImportFormat(parsed.headers);
    const autoMap = buildAutoColumnMapping(parsed.headers, detectedFormat);
    const finalColumnMap = body.columnMap || autoMap;
    const normalizedRows = normalizeMappedRows(
      parsed.dataRows,
      finalColumnMap,
      sourceName || fetched.sheetTitle || "Google Sheets"
    );

    if (action === "preview") {
      const existingRows =
        targetType === "leads"
          ? await query<DedupeComparableRecord>(
              `SELECT "id", "name", "email", "phone", "linkedin" FROM "CrmLead" WHERE "organizationId" = $1`,
              [DEFAULT_ORG_ID]
            )
          : await query<DedupeComparableRecord>(
              `SELECT "id", "name", "email", "phone", "profileUrl" AS "linkedin" FROM "CrmCandidate" WHERE "organizationId" = $1`,
              [DEFAULT_ORG_ID]
            );

      const analysis = analyzeImportDuplicates(normalizedRows, existingRows, matchOptions);

      return NextResponse.json({
        success: true,
        spreadsheetId: fetched.spreadsheetId,
        gid: fetched.gid,
        sheetTitle: fetched.sheetTitle || sourceName || "Google Sheet",
        availableTabs: fetched.availableTabs || [],
        detectedFormat,
        headers: parsed.headers,
        columnMap: finalColumnMap,
        dataRowCount: parsed.dataRows.length,
        normalizedRows,
        duplicateSummary: {
          total: normalizedRows.length,
          newCount: analysis.newCount,
          dbDuplicateCount: analysis.dbDuplicateCount,
          fileDuplicateCount: analysis.fileDuplicateCount,
          previewItems: analysis.items.slice(0, 50),
        },
      });
    }

    // action === "sync": import directly into Postgres & persist/update CrmSheetSource
    const effectiveName = sourceName || fetched.sheetTitle || `Google Sheet (${fetched.spreadsheetId.slice(0, 8)}…)`;
    const summary = await executeBulkImport({
      targetType,
      rows: normalizedRows,
      duplicateMode,
      matchOptions,
      sourceName: effectiveName,
      actor,
      actionType: "Google Sheet Sync",
    });

    let savedSource = null;
    if (body.saveSource !== false) {
      const id = sourceId || `gsheet_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
      const summaryText = `+${summary.addedCount} added, ${summary.updatedCount} updated, ${summary.skippedCount} skipped`;
      const savedRes = await query(
        `
          INSERT INTO "CrmSheetSource" (
            "id", "organizationId", "name", "sheetUrl", "spreadsheetId", "gid", "sheetName",
            "targetType", "duplicateMode", "lastSyncedAt", "lastSyncCount", "lastSyncStatus",
            "lastSyncSummary", "createdBy"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, $10, 'synced', $11, $12)
          ON CONFLICT ("id") DO UPDATE SET
            "name" = EXCLUDED."name",
            "sheetUrl" = EXCLUDED."sheetUrl",
            "spreadsheetId" = EXCLUDED."spreadsheetId",
            "gid" = EXCLUDED."gid",
            "sheetName" = EXCLUDED."sheetName",
            "targetType" = EXCLUDED."targetType",
            "duplicateMode" = EXCLUDED."duplicateMode",
            "lastSyncedAt" = CURRENT_TIMESTAMP,
            "lastSyncCount" = EXCLUDED."lastSyncCount",
            "lastSyncStatus" = 'synced',
            "lastSyncSummary" = EXCLUDED."lastSyncSummary",
            "updatedAt" = CURRENT_TIMESTAMP
          RETURNING *
        `,
        [
          id,
          DEFAULT_ORG_ID,
          effectiveName,
          sheetUrl,
          fetched.spreadsheetId,
          fetched.gid,
          sheetName,
          targetType,
          duplicateMode,
          summary.addedCount + summary.updatedCount,
          summaryText,
          actor,
        ]
      );
      savedSource = savedRes[0] || null;
    }

    return NextResponse.json({
      success: true,
      summary,
      source: savedSource,
    });
  } catch (err: any) {
    console.error("POST /api/crm/google-sheets error:", err);
    const msg = err?.message || "Google Sheets fetch failed.";
    const status = msg.includes("private") || msg.includes("Anyone with the link") ? 403 : 400;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await ensureCrmSchema();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "Sheet ID is required." }, { status: 400 });
    }
    await query(
      `DELETE FROM "CrmSheetSource" WHERE "id" = $1 AND "organizationId" = $2`,
      [id, DEFAULT_ORG_ID]
    );
    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Delete failed." }, { status: 500 });
  }
}
