"use client";
import { CrmShell } from "@/components/crm-shell";
import { SoonButton } from "@/lib/crm/toast-context";
import { SAMPLE_CANDIDATES, getInitials, getPillClass } from "@/lib/crm/sample-data";
import Link from "next/link";

export default function CandidatesPage() {
  return (
    <CrmShell>
      <div className="page-top">
        <div>
          <h1>Candidates</h1>
          <p className="page-sub">Your talent database.</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <Link href="/import" className="btn navy">⇅ Import / Export</Link>
          <SoonButton label="+ Add candidate" />
        </div>
      </div>

      <div className="tools">
        <input placeholder="Search by name, skill, city…" style={{ width: "auto", minWidth: 220 }} readOnly />
        <select><option>All stages</option></select>
        <SoonButton label="Export CSV" className="btn ghost" />
      </div>

      <div className="card tbl">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Location</th>
              <th>Stage</th>
              <th>Exp.</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_CANDIDATES.map((cand, i) => (
              <tr key={i}>
                <td><span className="av">{getInitials(cand.name)}</span>{cand.name}</td>
                <td>{cand.role}</td>
                <td>{cand.location}</td>
                <td><span className={`pill ${getPillClass(cand.stage)}`}>{cand.stage}</span></td>
                <td>{cand.experience}</td>
                <td><SoonButton label="Open" className="btn ghost" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CrmShell>
  );
}

