import { NextRequest, NextResponse } from "next/server";
import { query, DEFAULT_ORG_ID } from "@/lib/crm/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    let sql = `SELECT * FROM "CrmJob" WHERE "organizationId" = $1`;
    const params: any[] = [DEFAULT_ORG_ID];

    if (status && status !== "all") {
      params.push(status);
      sql += ` AND "status" = $${params.length}`;
    }

    sql += ` ORDER BY "createdAt" DESC`;

    const jobs = await query(sql, params);
    return NextResponse.json({ success: true, jobs });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = body.id || `job_${Date.now()}`;

    const sql = `
      INSERT INTO "CrmJob" (
        "id", "organizationId", "title", "client", "location", "status",
        "applicants", "salaryMin", "salaryMax", "type", "description", "owner"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const params = [
      id,
      DEFAULT_ORG_ID,
      body.title,
      body.client || "Confidential",
      body.location || "Remote / USA",
      body.status || "Active",
      body.applicants || 0,
      body.salaryMin || null,
      body.salaryMax || null,
      body.type || "Full-time",
      body.description || "",
      body.owner || "Krupal P.",
    ];

    const result = await query(sql, params);
    return NextResponse.json({ success: true, job: result[0] }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
