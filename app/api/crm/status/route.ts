import { NextResponse } from "next/server";
import { DEFAULT_ORG_ID, ensureCrmSchema, query } from "@/lib/crm/db";
import { getLeadsWorkspaceStatus } from "@/lib/leads/workspace";

export const dynamic = "force-dynamic";

/**
 * Non-sensitive database readiness and live record counts for the CRM workspace.
 */
export async function GET() {
  const startedAt = Date.now();
  try {
    await ensureCrmSchema();
    const rows = await query<{
      leads: number;
      candidates: number;
      clients: number;
      jobs: number;
      tasks: number;
      notes: number;
      sheet_sources: number;
    }>(
      `
      SELECT
        (SELECT COUNT(*)::int FROM "CrmLead" WHERE "organizationId" = $1) AS leads,
        (SELECT COUNT(*)::int FROM "CrmCandidate" WHERE "organizationId" = $1) AS candidates,
        (SELECT COUNT(*)::int FROM "CrmClient" WHERE "organizationId" = $1) AS clients,
        (SELECT COUNT(*)::int FROM "CrmJob" WHERE "organizationId" = $1) AS jobs,
        (SELECT COUNT(*)::int FROM "CrmTask" WHERE "organizationId" = $1) AS tasks,
        (SELECT COUNT(*)::int FROM "CrmNote" WHERE "organizationId" = $1) AS notes,
        (SELECT COUNT(*)::int FROM "CrmSheetSource" WHERE "organizationId" = $1) AS sheet_sources
      `,
      [DEFAULT_ORG_ID]
    );

    const counts = rows[0] || {
      leads: 0,
      candidates: 0,
      clients: 0,
      jobs: 0,
      tasks: 0,
      notes: 0,
      sheet_sources: 0,
    };

    return NextResponse.json({
      service: "nexora-crm",
      connected: true,
      provider: "PostgreSQL (Neon)",
      latencyMs: Date.now() - startedAt,
      counts,
      crm: getLeadsWorkspaceStatus(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        service: "nexora-crm",
        connected: false,
        provider: "PostgreSQL (Neon)",
        error: err?.message || "Database unavailable",
        crm: {
          state: "error",
          title: "Database connection failed",
          detail: err?.message || "Unable to connect to PostgreSQL.",
        },
      },
      { status: 500 }
    );
  }
}
