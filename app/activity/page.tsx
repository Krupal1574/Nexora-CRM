"use client";
import { CrmShell } from "@/components/crm-shell";
import { SoonButton } from "@/lib/crm/toast-context";
import { SAMPLE_ACTIVITY, getInitials } from "@/lib/crm/sample-data";

export default function ActivityPage() {
  return (
    <CrmShell>
      <div className="page-top">
        <div>
          <h1>Activity &amp; Audit Log</h1>
          <p className="page-sub">Who did what, and when.</p>
        </div>
        <SoonButton label="Export log" className="btn ghost" />
      </div>

      <div className="card">
        {SAMPLE_ACTIVITY.map((a, i) => (
          <div className="row" key={i}>
            <span>
              <span className="av">{getInitials(a.actor)}</span>
              <b>{a.actor}</b> {a.action}
            </span>
            <small style={{ color: "var(--mu)" }}>{a.time}</small>
          </div>
        ))}
      </div>
    </CrmShell>
  );
}

