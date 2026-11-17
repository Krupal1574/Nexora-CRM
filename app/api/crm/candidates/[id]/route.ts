import { NextRequest, NextResponse } from "next/server";
import { query, DEFAULT_ORG_ID } from "@/lib/crm/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await query(
      `SELECT * FROM "CrmCandidate" WHERE "id" = $1 AND "organizationId" = $2`,
      [id, DEFAULT_ORG_ID]
    );

    if (result.length === 0) {
      return NextResponse.json({ success: false, error: "Candidate not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, candidate: result[0] });
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
      "role",
      "location",
      "stage",
      "experience",
      "email",
      "phone",
      "profileUrl",
      "source",
      "skills",
      "resumeUrl",
      "notes",
    ];

    const updates: string[] = [];
    const values: any[] = [id, DEFAULT_ORG_ID];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        values.push(field === "skills" ? JSON.stringify(body[field]) : body[field]);
        updates.push(`"${field}" = $${values.length}`);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: "No fields to update" }, { status: 400 });
    }

    updates.push(`"updatedAt" = NOW()`);

    const sql = `
      UPDATE "CrmCandidate"
      SET ${updates.join(", ")}
      WHERE "id" = $1 AND "organizationId" = $2
      RETURNING *
    `;

    const result = await query(sql, values);

    if (result.length === 0) {
      return NextResponse.json({ success: false, error: "Candidate not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, candidate: result[0] });
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
    const result = await query(
      `DELETE FROM "CrmCandidate" WHERE "id" = $1 AND "organizationId" = $2 RETURNING id`,
      [id, DEFAULT_ORG_ID]
    );

    if (result.length === 0) {
      return NextResponse.json({ success: false, error: "Candidate not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
