import { getLeadsWorkspaceStatus } from "@/lib/leads/workspace";

/**
 * Public readiness information only. This endpoint does not expose tenant data
 * or imply that CRM authentication and database access are enabled.
 */
export function GET() {
  return Response.json({
    service: "nexora-crm",
    phase: "A",
    crm: getLeadsWorkspaceStatus(),
  });
}
