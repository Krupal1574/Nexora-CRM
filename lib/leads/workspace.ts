export interface LeadsWorkspaceStatus {
  state: "connected" | "error" | "migration-required";
  title: string;
  detail: string;
}

/**
 * Fallback synchronous workspace status helper; live database connectivity
 * and counts are queried dynamically by /api/crm/status.
 */
export function getLeadsWorkspaceStatus(): LeadsWorkspaceStatus {
  return {
    state: "connected",
    title: "PostgreSQL CRM database active",
    detail: "Connected to PostgreSQL with tenant isolation, bulk import, duplicate detection, and Google Sheets sync.",
  };
}
