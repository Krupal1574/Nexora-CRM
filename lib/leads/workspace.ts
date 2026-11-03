export interface LeadsWorkspaceStatus {
  state: "migration-required";
  title: string;
  detail: string;
}

/**
 * The UI intentionally has no demo data. Leads become available only after
 * the CRM migrations and an active organization membership are in place.
 */
export function getLeadsWorkspaceStatus(): LeadsWorkspaceStatus {
  return {
    state: "migration-required",
    title: "Leads are ready for database setup",
    detail: "Apply the approved CRM migrations and create an active organization membership before creating customer records.",
  };
}
