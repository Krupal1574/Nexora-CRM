"use client";
import { CrmShell } from "@/components/crm-shell";
import { SoonButton } from "@/lib/crm/toast-context";
import { SAMPLE_JOBS, getPillClass } from "@/lib/crm/sample-data";

export default function JobsPage() {
  return (
    <CrmShell>
      <div className="page-top">
        <div>
          <h1>Jobs</h1>
          <p className="page-sub">Open requisitions and mandates.</p>
        </div>
        <SoonButton label="+ Post job" />
      </div>

      <div className="card tbl">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Client</th>
              <th>Location</th>
              <th>Status</th>
              <th>Applicants</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_JOBS.map((job, i) => (
              <tr key={i}>
                <td><b>{job.title}</b></td>
                <td>{job.client}</td>
                <td>{job.location}</td>
                <td><span className={`pill ${getPillClass(job.status)}`}>{job.status}</span></td>
                <td>{job.applicants}</td>
                <td><SoonButton label="Match" className="btn ghost" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CrmShell>
  );
}

