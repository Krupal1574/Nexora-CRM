"use client";
import { CrmShell } from "@/components/crm-shell";
import { SoonButton } from "@/lib/crm/toast-context";
import { SAMPLE_LEADS, getInitials, getPillClass } from "@/lib/crm/sample-data";

export default function LeadsPage() {
  return (
    <CrmShell>
      <div className="page-top">
        <div>
          <h1>Leads</h1>
          <p className="page-sub">Track prospects before they become clients.</p>
        </div>
        <SoonButton label="+ New lead" />
      </div>

      <div className="tools">
        <input placeholder="Search leads…" style={{ width: "auto", minWidth: 200 }} readOnly />
        <select><option>All statuses</option></select>
        <SoonButton label="Export CSV" className="btn ghost" />
      </div>

      <div className="card tbl">
        <table>
          <thead>
            <tr>
              <th>Contact</th>
              <th>Company</th>
              <th>Source</th>
              <th>Temp</th>
              <th>Owner</th>
              <th>Value</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_LEADS.map((lead, i) => (
              <tr key={i}>
                <td><span className="av">{getInitials(lead.name)}</span>{lead.name}</td>
                <td>{lead.company}</td>
                <td>{lead.source}</td>
                <td><span className={`pill ${getPillClass(lead.temperature)}`}>{lead.temperature}</span></td>
                <td>{lead.owner}</td>
                <td>{lead.value}</td>
                <td><SoonButton label="Convert" className="btn ghost" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CrmShell>
  );
}
