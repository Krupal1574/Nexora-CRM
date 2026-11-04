"use client";
import { CrmShell } from "@/components/crm-shell";
import { SoonButton } from "@/lib/crm/toast-context";
import { SAMPLE_CLIENTS, getInitials, getPillClass } from "@/lib/crm/sample-data";

export default function ClientsPage() {
  return (
    <CrmShell>
      <div className="page-top">
        <div>
          <h1>Clients</h1>
          <p className="page-sub">Companies you hire for.</p>
        </div>
        <SoonButton label="+ New client" />
      </div>

      <div className="card tbl">
        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Industry</th>
              <th>Status</th>
              <th>Open jobs</th>
              <th>Account owner</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_CLIENTS.map((client, i) => (
              <tr key={i}>
                <td><b>{client.name}</b></td>
                <td>{client.industry}</td>
                <td><span className={`pill ${getPillClass(client.status)}`}>{client.status}</span></td>
                <td>{client.openJobs}</td>
                <td><span className="av">{getInitials(client.owner)}</span>{client.owner}</td>
                <td><SoonButton label="View" className="btn ghost" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CrmShell>
  );
}

