import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_ORG_ID, query } from "@/lib/crm/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const recordType = searchParams.get("recordType");
    const recordId = searchParams.get("recordId");

    let sql = `SELECT * FROM "CrmNote" WHERE "organizationId" = $1`;
    const params: any[] = [DEFAULT_ORG_ID];

    if (recordType) {
      params.push(recordType);
      sql += ` AND "recordType" = $${params.length}`;
    }
    if (recordId) {
      params.push(recordId);
      sql += ` AND "recordId" = $${params.length}`;
    }
    sql += ` ORDER BY "createdAt" DESC LIMIT 500`;

    const notes = await query(sql, params);
    return NextResponse.json({ success: true, notes });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Failed to fetch notes." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = body.id || `note_${crypto.randomUUID().replace(/-/g, "").slice(0, 14)}`;
    const content = String(body.content || body.text || "").trim();
    if (!content) {
      return NextResponse.json({ success: false, error: "Note content is required." }, { status: 400 });
    }

    const res = await query(
      `
        INSERT INTO "CrmNote" (
          "id", "organizationId", "subject", "content", "author", "recordType", "recordId"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `,
      [
        id,
        DEFAULT_ORG_ID,
        body.subject || "Recruiter Note",
        content,
        body.author || "Support Admin",
        body.recordType || "lead",
        body.recordId || "",
      ]
    );

    return NextResponse.json({ success: true, note: res[0] }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Failed to save note." }, { status: 500 });
  }
}
