import { CrmShell } from "@/components/crm-shell";
import Link from "next/link";

export default function OverviewPage() {
  return (
    <CrmShell currentPath="/">
      <section className="page-header">
        <p className="eyebrow">NEXORA CRM</p>
        <h1>Build trusted customer relationships.</h1>
        <p className="page-intro">A tenant-safe workspace for leads, contacts, companies, deals, and follow-ups.</p>
      </section>
      <section className="foundation-card" aria-labelledby="foundation-heading">
        <div>
          <p className="eyebrow">CURRENT MILESTONE</p>
          <h2 id="foundation-heading">Phase B — Leads</h2>
          <p>The CRM foundation is in place. The next step is to apply the reviewed database migration, then enable real lead creation and assignment.</p>
        </div>
        <Link className="primary-action" href="/leads">Open leads workspace</Link>
      </section>
      <section className="security-grid" aria-label="CRM guarantees">
        <article><h2>Tenant isolation</h2><p>Every CRM operation is scoped to an active organization membership.</p></article>
        <article><h2>Permission-aware</h2><p>Visibility and permission checks are enforced on the server, not only in the interface.</p></article>
        <article><h2>Profile links, safely</h2><p>Professional links stay URL-only until a compliant provider integration is approved.</p></article>
      </section>
    </CrmShell>
  );
}
