"use client";
import { CrmShell } from "@/components/crm-shell";
import { SoonButton } from "@/lib/crm/toast-context";
import { SAMPLE_TEAM, ROLE_DEFINITIONS, getInitials } from "@/lib/crm/sample-data";

export default function TeamPage() {
  return (
    <CrmShell>
      <div className="page-top">
        <div>
          <h1>Team &amp; Roles</h1>
          <p className="page-sub">Control who can see and change what.</p>
        </div>
        <SoonButton label="Invite member" />
      </div>

      <div className="card tbl">
        <table>
          <thead>
            <tr>
              <th>Member</th>
              <th>Role</th>
              <th>Access</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_TEAM.map((member, i) => (
              <tr key={i}>
                <td><span className="av">{getInitials(member.name)}</span>{member.name}</td>
                <td>
                  <select defaultValue={member.role} style={{ width: "auto" }}>
                    <option>{member.role}</option>
                  </select>
                </td>
                <td>{member.access}</td>
                <td><SoonButton label="Manage" className="btn ghost" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <b>Roles overview</b>
        <div className="grid g4" style={{ marginTop: 10 }}>
          {ROLE_DEFINITIONS.map((r, i) => (
            <div key={i} className="card">
              <b>{r.title}</b>
              <p style={{ color: "var(--mu)", margin: "6px 0 0" }}>{r.description}</p>
            </div>
          ))}
        </div>
      </div>
    </CrmShell>
  );
}

