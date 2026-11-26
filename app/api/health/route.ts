import { NextResponse } from "next/server";
import { query } from "@/lib/crm/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await query("SELECT 1 AS ok");
    return NextResponse.json({ service: "nexora-crm", database: "connected", status: "ok" });
  } catch (err: any) {
    return NextResponse.json(
      { service: "nexora-crm", database: "error", status: "degraded", error: err?.message },
      { status: 500 }
    );
  }
}
