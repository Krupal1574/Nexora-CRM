import { NextRequest, NextResponse } from "next/server";
import { query, DEFAULT_ORG_ID } from "@/lib/crm/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const leads = await query(
      `SELECT * FROM "CrmLead" WHERE "id" = $1 AND "organizationId" = $2`,
      [id, DEFAULT_ORG_ID]
    );

    if (leads.length === 0) {
      return NextResponse.json({ success: false, error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, lead: leads[0] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const allowedFields = [
      "name",
      "company",
      "title",
      "email",
      "phone",
      "linkedin",
      "stage",
      "temperature",
      "source",
      "owner",
      "value",
      "visaStatus",
      "experience",
      "leadType",
      "leadSource",
      "leadPerson",
      "salesPerson",
      "accountRef",
      "technology",
      "remark",
      "location",
      "date",
    ];

    const updates: string[] = [];
    const values: any[] = [];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        values.push(body[field]);
        updates.push(`"${field}" = $${values.length}`);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: true, message: "No updates provided" });
    }

    values.push(id);
    values.push(DEFAULT_ORG_ID);
    const sql = `
      UPDATE "CrmLead"
      SET ${updates.join(", ")}, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = $${values.length - 1} AND "organizationId" = $${values.length}
      RETURNING *
    `;

    const result = await query(sql, values);
    return NextResponse.json({ success: true, lead: result[0] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await query(
      `DELETE FROM "CrmLead" WHERE "id" = $1 AND "organizationId" = $2`,
      [id, DEFAULT_ORG_ID]
    );
    return NextResponse.json({ success: true, message: "Lead deleted" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
