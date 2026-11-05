import Link from "next/link";
import { CrmShell } from "@/components/crm-shell";
import { getLeadsWorkspaceStatus } from "@/lib/leads/workspace";

export default function LeadsPage() {
  const status = getLeadsWorkspaceStatus();

  return (
    <CrmShell>
      <div className="page-top">
        <div>
          <h1>Leads</h1>
          <p className="page-sub">Track prospects before they become clients.</p>
        </div>
        <button className="btn" disabled title="Lead creation requires an active CRM membership">
          + New lead
        </button>
      </div>

      <div className="card empty-state" role="status">
        <span className="big">◎</span>
        <h3>{status.title}</h3>
        <p>{status.detail}</p>
        <p style={{ fontSize: 13, maxWidth: 560, margin: "12px auto 0" }}>
          Leads will support list, kanban, activity, and calendar views once the
          tenant-scoped data service is connected. No sample customer records are shown here.
        </p>
        <Link href="/settings" className="btn ghost" style={{ marginTop: 16 }}>
          Open settings
        </Link>
      </div>
    </CrmShell>
  );
}
