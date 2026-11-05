import Link from "next/link";
import { CrmShell } from "@/components/crm-shell";
import { getLeadsWorkspaceStatus } from "@/lib/leads/workspace";

export default function DashboardPage() {
  const status = getLeadsWorkspaceStatus();

  return (
    <CrmShell>
      <div className="page-top">
        <div>
          <h1>Welcome to Nexora CRM</h1>
          <p className="page-sub">Your staffing workspace is ready for tenant setup.</p>
        </div>
        <Link href="/settings" className="btn">Workspace setup</Link>
      </div>

      <div className="card empty-state" role="status">
        <span className="big">▦</span>
        <h3>Connect your organisation to get started</h3>
        <p>{status.detail}</p>
        <p style={{ fontSize: 13, maxWidth: 560, margin: "12px auto 0" }}>
          Once approved, the dashboard will show real pipeline totals, follow-ups,
          activities, and tasks. This preview intentionally contains no fake production data.
        </p>
        <Link href="/leads" className="btn ghost" style={{ marginTop: 16 }}>
          View leads setup
        </Link>
      </div>
    </CrmShell>
  );
}
