import { CrmShell } from "@/components/crm-shell";
import { getLeadsWorkspaceStatus } from "@/lib/leads/workspace";

export default function LeadsPage() {
  const status = getLeadsWorkspaceStatus();

  return (
    <CrmShell currentPath="/leads">
      <section className="page-header">
        <p className="eyebrow">PIPELINE START</p>
        <h1>Leads</h1>
        <p className="page-intro">Capture, qualify, assign, and convert potential customers without losing context.</p>
      </section>
      <section className="empty-state" aria-live="polite">
        <span className="status-dot" aria-hidden="true" />
        <p className="eyebrow">SETUP REQUIRED</p>
        <h2>{status.title}</h2>
        <p>{status.detail}</p>
      </section>
    </CrmShell>
  );
}
