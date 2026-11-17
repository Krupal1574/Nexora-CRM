import { NextRequest, NextResponse } from "next/server";
import { query, DEFAULT_ORG_ID } from "@/lib/crm/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const stage = searchParams.get("stage");
    const search = searchParams.get("search");

    let sql = `SELECT * FROM "CrmLead" WHERE "organizationId" = $1`;
    const params: any[] = [DEFAULT_ORG_ID];

    if (stage && stage !== "all") {
      params.push(stage);
      sql += ` AND "stage" = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND ("name" ILIKE $${params.length} OR "company" ILIKE $${params.length} OR "email" ILIKE $${params.length} OR "technology" ILIKE $${params.length})`;
    }

    sql += ` ORDER BY "createdAt" DESC`;

    const leads = await query(sql, params);
    return NextResponse.json({ success: true, leads });
  } catch (err: any) {
    console.error("GET /api/crm/leads error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = body.id || `lead_${Date.now()}`;

    const sql = `
      INSERT INTO "CrmLead" (
        "id", "organizationId", "name", "company", "title", "email", "phone",
        "stage", "temperature", "source", "owner", "visaStatus", "experience",
        "leadType", "leadSource", "leadPerson", "salesPerson", "technology",
        "accountRef", "remark", "location", "date"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
      ) RETURNING *
    `;

    const params = [
      id,
      DEFAULT_ORG_ID,
      body.name || "Untitled Lead",
      body.company || "",
      body.title || "",
      body.email || "",
      body.phone || "",
      body.stage || "New",
      body.temperature || "New",
      body.source || "Website",
      body.owner || "Krupal P.",
      body.visaStatus || "",
      body.experience || "",
      body.leadType || "Warm Lead",
      body.leadSource || body.source || "",
      body.leadPerson || "Krupal",
      body.salesPerson || "Krupal P.",
      body.technology || "",
      body.accountRef || "",
      body.remark || "",
      body.location || "USA",
      body.date || new Date().toISOString().split("T")[0],
    ];

    const result = await query(sql, params);
    return NextResponse.json({ success: true, lead: result[0] }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/crm/leads error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
