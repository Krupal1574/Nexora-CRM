import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_ORG_ID, query } from "@/lib/crm/db";

export const dynamic = "force-dynamic";

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
      sql += ` AND ("name" ILIKE $${params.length} OR "company" ILIKE $${params.length} OR "email" ILIKE $${params.length} OR "phone" ILIKE $${params.length} OR "technology" ILIKE $${params.length})`;
    }

    sql += ` ORDER BY "createdAt" DESC`;

    const [leads, noteRows] = await Promise.all([
      query(sql, params),
      query<{ id: string; recordId: string; content: string; author: string; createdAt: string }>(
        `SELECT "id", "recordId", "content", "author", "createdAt"
         FROM "CrmNote"
         WHERE "organizationId" = $1 AND "recordType" = 'lead'
         ORDER BY "createdAt" DESC`,
        [DEFAULT_ORG_ID]
      ).catch(() => []),
    ]);

    const notesByLead = new Map<string, { id: string; text: string; author: string; createdAt: string }[]>();
    for (const n of noteRows) {
      if (!notesByLead.has(n.recordId)) notesByLead.set(n.recordId, []);
      notesByLead.get(n.recordId)!.push({
        id: n.id,
        text: n.content,
        author: n.author,
        createdAt: n.createdAt,
      });
    }

    const enriched = leads.map((l: any) => ({
      ...l,
      dbNotes: notesByLead.get(l.id) || [],
    }));

    return NextResponse.json({ success: true, leads: enriched });
  } catch (err: any) {
    console.error("GET /api/crm/leads error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = body.id || `lead_${crypto.randomUUID().replace(/-/g, "").slice(0, 14)}`;

    const sql = `
      INSERT INTO "CrmLead" (
        "id", "organizationId", "name", "company", "title", "email", "phone", "linkedin",
        "stage", "temperature", "source", "owner", "value", "visaStatus", "experience",
        "leadType", "leadSource", "leadPerson", "salesPerson", "technology",
        "accountRef", "remark", "location", "date"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
      )
      ON CONFLICT ("id") DO UPDATE SET
        "name" = EXCLUDED."name",
        "company" = EXCLUDED."company",
        "email" = EXCLUDED."email",
        "phone" = EXCLUDED."phone",
        "linkedin" = EXCLUDED."linkedin",
        "stage" = EXCLUDED."stage",
        "updatedAt" = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const params = [
      id,
      DEFAULT_ORG_ID,
      body.name || "Untitled Lead",
      body.company || "",
      body.title || body.technology || "",
      body.email || "",
      body.phone || "",
      body.linkedin || "",
      body.stage || "New Lead",
      body.temperature || "New",
      body.source || body.leadSource || "Website",
      body.owner || body.salesPerson || "Support Admin",
      body.value || "₹5.0L",
      body.visaStatus || "",
      body.experience || "",
      body.leadType || "Warm Lead",
      body.leadSource || body.source || "",
      body.leadPerson || "Yatri",
      body.salesPerson || body.owner || "Support Admin",
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
