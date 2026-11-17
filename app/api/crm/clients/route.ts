import { NextRequest, NextResponse } from "next/server";
import { query, DEFAULT_ORG_ID } from "@/lib/crm/db";

export async function GET() {
  try {
    const clients = await query(
      `SELECT * FROM "CrmClient" WHERE "organizationId" = $1 ORDER BY "createdAt" DESC`,
      [DEFAULT_ORG_ID]
    );
    return NextResponse.json({ success: true, clients });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = body.id || `cli_${Date.now()}`;

    const sql = `
      INSERT INTO "CrmClient" (
        "id", "organizationId", "name", "industry", "status", "openJobs", "owner", "website"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const params = [
      id,
      DEFAULT_ORG_ID,
      body.name,
      body.industry || "Technology",
      body.status || "Active",
      body.openJobs || 0,
      body.owner || "Krupal P.",
      body.website || "",
    ];

    const result = await query(sql, params);
    return NextResponse.json({ success: true, client: result[0] }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
