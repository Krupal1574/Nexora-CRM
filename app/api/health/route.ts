import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ service: "nexora-crm", phase: "B", status: "starting" });
}
