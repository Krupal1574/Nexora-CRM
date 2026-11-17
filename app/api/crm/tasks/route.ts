import { NextRequest, NextResponse } from "next/server";
import { query, DEFAULT_ORG_ID } from "@/lib/crm/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const done = searchParams.get("done");

    let sql = `SELECT * FROM "CrmTask" WHERE "organizationId" = $1`;
    const params: any[] = [DEFAULT_ORG_ID];

    if (done !== null && done !== undefined) {
      params.push(done === "true");
      sql += ` AND "done" = $${params.length}`;
    }

    sql += ` ORDER BY "createdAt" DESC`;

    const tasks = await query(sql, params);
    return NextResponse.json({ success: true, tasks });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = body.id || `task_${Date.now()}`;

    const sql = `
      INSERT INTO "CrmTask" (
        "id", "organizationId", "text", "due", "priority", "done",
        "assignedTo", "linkedType", "linkedId"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const params = [
      id,
      DEFAULT_ORG_ID,
      body.text || "Untitled Task",
      body.due || body.dueDate || "Today",
      body.priority || "Med",
      body.done ?? false,
      body.assignedTo || "Krupal P.",
      body.relatedTo?.type || body.linkedType || null,
      body.relatedTo?.id || body.linkedId || null,
    ];

    const result = await query(sql, params);
    return NextResponse.json({ success: true, task: result[0] }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
