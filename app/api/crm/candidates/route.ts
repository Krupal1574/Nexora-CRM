import { NextRequest, NextResponse } from "next/server";
import { query, DEFAULT_ORG_ID } from "@/lib/crm/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const stage = searchParams.get("stage");

    let sql = `SELECT * FROM "CrmCandidate" WHERE "organizationId" = $1`;
    const params: any[] = [DEFAULT_ORG_ID];

    if (stage && stage !== "all") {
      params.push(stage);
      sql += ` AND "stage" = $${params.length}`;
    }

    sql += ` ORDER BY "createdAt" DESC`;

    const candidates = await query(sql, params);
    return NextResponse.json({ success: true, candidates });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = body.id || `cand_${Date.now()}`;

    const sql = `
      INSERT INTO "CrmCandidate" (
        "id", "organizationId", "name", "role", "location", "stage",
        "experience", "email", "phone", "profileUrl", "source", "skills", "notes"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const skillsJson = JSON.stringify(body.skills || []);

    const params = [
      id,
      DEFAULT_ORG_ID,
      body.name,
      body.role || "Software Engineer",
      body.location || "USA",
      body.stage || "Sourced",
      body.experience || "",
      body.email || "",
      body.phone || "",
      body.profileUrl || "",
      body.source || "Direct",
      skillsJson,
      body.notes || "",
    ];

    const result = await query(sql, params);
    return NextResponse.json({ success: true, candidate: result[0] }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
