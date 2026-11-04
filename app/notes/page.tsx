"use client";
import { CrmShell } from "@/components/crm-shell";
import { SoonButton } from "@/lib/crm/toast-context";
import { SAMPLE_NOTES } from "@/lib/crm/sample-data";

export default function NotesPage() {
  return (
    <CrmShell>
      <div className="page-top">
        <div>
          <h1>Notes</h1>
          <p className="page-sub">Context attached to people and companies.</p>
        </div>
        <SoonButton label="+ Add note" />
      </div>

      <div>
        {SAMPLE_NOTES.map((n, i) => (
          <div key={i} className="card note-card" style={{ marginBottom: 12 }}>
            <b>{n.subject}</b>
            <p style={{ margin: "8px 0" }}>{n.content}</p>
            <small style={{ color: "var(--mu)" }}>
              {n.author} · {n.time}
            </small>
          </div>
        ))}
      </div>
    </CrmShell>
  );
}

