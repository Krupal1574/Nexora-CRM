"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { CrmShell } from "@/components/crm-shell";
import { useJobStore, type CrmJob } from "@/lib/crm/job-store";
import { useClientStore } from "@/lib/crm/client-store";
import { useCandidateStore } from "@/lib/crm/candidate-store";
import { useToast } from "@/lib/crm/toast-context";
import { getPillClass } from "@/lib/crm/sample-data";
import { Modal, useConfirm } from "@/components/ui";

const JOB_STATUSES = ["Open", "Offer stage", "Draft"] as const;

export default function JobsPage() {
  const store = useJobStore();
  const clientStore = useClientStore();
  const candidateStore = useCandidateStore();
  const { show } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [showCreate, setShowCreate] = useState(false);
  const [matchingJob, setMatchingJob] = useState<CrmJob | null>(null);

  // Form State
  const [form, setForm] = useState({
    title: "",
    client: clientStore.clients[0]?.name || "Brightline Tech",
    location: "Ahmedabad",
    status: "Open" as (typeof JOB_STATUSES)[number],
    salaryRange: "₹15 - ₹22 LPA",
    experienceRequired: "4+ years",
    skills: "React, TypeScript",
    description: "",
  });

  const filteredJobs = useMemo(() => {
    return store.jobs.filter((j) => {
      if (filterStatus !== "All" && j.status !== filterStatus) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = j.title.toLowerCase().includes(q);
        const matchClient = j.client.toLowerCase().includes(q);
        const matchLoc = j.location.toLowerCase().includes(q);
        if (!matchTitle && !matchClient && !matchLoc) return false;
      }
      return true;
    });
  }, [store.jobs, filterStatus, search]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.client.trim()) {
      show("Job title and client company are required.");
      return;
    }

    const created = store.createJob({
      title: form.title.trim(),
      client: form.client.trim(),
      location: form.location.trim(),
      status: form.status,
      salaryRange: form.salaryRange.trim(),
      experienceRequired: form.experienceRequired.trim(),
      skillsRequired: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
      description: form.description.trim(),
      applicants: 0,
    });

    setShowCreate(false);
    setForm({
      title: "",
      client: clientStore.clients[0]?.name || "Brightline Tech",
      location: "Ahmedabad",
      status: "Open",
      salaryRange: "₹15 - ₹22 LPA",
      experienceRequired: "4+ years",
      skills: "React, TypeScript",
      description: "",
    });
    show(`Job opening "${created.title}" posted.`);
  };

  const handleDelete = async (job: CrmJob) => {
    const ok = await confirm(`Delete requisition "${job.title}"?`);
    if (ok) {
      store.deleteJob(job.id);
      show(`"${job.title}" deleted.`);
    }
  };

  // Find candidates that match role or skills for a job
  const matchingCandidates = useMemo(() => {
    if (!matchingJob) return [];
    const titleWords = matchingJob.title.toLowerCase().split(/\s+/);
    return candidateStore.candidates.filter((c) => {
      const matchRole = titleWords.some((w) => w.length > 2 && c.role.toLowerCase().includes(w));
      const matchSkills = matchingJob.skillsRequired?.some((s) =>
        c.skills?.some((cs) => cs.toLowerCase().includes(s.toLowerCase()))
      );
      return matchRole || matchSkills;
    });
  }, [matchingJob, candidateStore.candidates]);

  return (
    <CrmShell>
      <div className="page-top">
        <div>
          <h1>Open Mandates &amp; Requisitions</h1>
          <p className="page-sub">
            Client hiring positions, applicant tracking, and candidate matching.
          </p>
        </div>
        <button className="btn" onClick={() => setShowCreate(true)}>
          + Post new job
        </button>
      </div>

      {/* Toolbar */}
      <div className="tools">
        <input
          placeholder="Search by job title, client, city…"
          style={{ width: "auto", minWidth: 260 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="All">All statuses ({store.jobs.length})</option>
          {JOB_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s} ({store.jobs.filter((j) => j.status === s).length})
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {filteredJobs.length === 0 ? (
        <div className="card empty-state">
          <span className="big">✦</span>
          <h3>No job requisitions found</h3>
          <p>Create a job mandate to begin matching candidates.</p>
        </div>
      ) : (
        <div className="card tbl">
          <table>
            <thead>
              <tr>
                <th>Job Title</th>
                <th>Client Company</th>
                <th>Location</th>
                <th>Salary Band</th>
                <th>Status</th>
                <th>Submissions</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map((job) => (
                <tr key={job.id}>
                  <td>
                    <div>
                      <b>{job.title}</b>
                      {job.experienceRequired && (
                        <span style={{ color: "var(--mu)", fontSize: 12, display: "block" }}>
                          Exp: {job.experienceRequired}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <Link href="/clients" style={{ color: "inherit", fontWeight: 600, textDecoration: "none" }}>
                      {job.client}
                    </Link>
                  </td>
                  <td>{job.location}</td>
                  <td>{job.salaryRange || "—"}</td>
                  <td>
                    <select
                      value={job.status}
                      onChange={(e) => {
                        store.updateJob(job.id, { status: e.target.value as (typeof JOB_STATUSES)[number] });
                        show(`Status updated to ${e.target.value}`);
                      }}
                      style={{
                        padding: "2px 8px",
                        fontSize: 12,
                        borderRadius: 99,
                        fontWeight: 600,
                        border: "1px solid var(--bd)",
                        background: "var(--bg)",
                        cursor: "pointer",
                      }}
                    >
                      {JOB_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <span className="pill ok" style={{ fontWeight: 700 }}>
                      {job.applicants} applicants
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 6 }}>
                      <button
                        className="btn"
                        style={{ fontSize: 12, padding: "5px 12px" }}
                        onClick={() => setMatchingJob(job)}
                      >
                        ✦ Match Talent
                      </button>
                      <button
                        className="btn ghost"
                        style={{ fontSize: 12, padding: "5px 8px", color: "var(--bad)" }}
                        onClick={() => handleDelete(job)}
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Post Job Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Post New Job Opening">
        <form onSubmit={handleCreate}>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Job Title *</label>
                <input
                  required
                  placeholder="e.g. Senior Backend Engineer (Node/Go)"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Client Account *</label>
                <select
                  value={form.client}
                  onChange={(e) => setForm({ ...form, client: e.target.value })}
                >
                  {clientStore.clients.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Location</label>
                <input
                  placeholder="Ahmedabad / Remote"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Salary Band</label>
                <input
                  placeholder="₹18 - ₹25 LPA"
                  value={form.salaryRange}
                  onChange={(e) => setForm({ ...form, salaryRange: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as (typeof JOB_STATUSES)[number] })}
                >
                  {JOB_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Experience Req.</label>
                <input
                  placeholder="5+ years"
                  value={form.experienceRequired}
                  onChange={(e) => setForm({ ...form, experienceRequired: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Key Skills</label>
                <input
                  placeholder="Node.js, Postgres, Kubernetes"
                  value={form.skills}
                  onChange={(e) => setForm({ ...form, skills: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Description / Role Scope</label>
              <textarea
                rows={3}
                placeholder="Key responsibilities and qualifications required by the client…"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
              <button type="button" className="btn ghost" onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="submit" className="btn">Post Opening</button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Match Candidates Modal */}
      {matchingJob && (
        <Modal
          open={!!matchingJob}
          onClose={() => setMatchingJob(null)}
          title={`Match Candidates: ${matchingJob.title}`}
        >
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ background: "var(--bg)", padding: 10, borderRadius: 8 }}>
              <b>{matchingJob.title}</b> at <b>{matchingJob.client}</b>
              <div style={{ color: "var(--mu)", fontSize: 12, marginTop: 2 }}>
                Location: {matchingJob.location} · Budget: {matchingJob.salaryRange}
              </div>
            </div>

            <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>
              Recommended candidates from your database ({matchingCandidates.length} matches):
            </p>

            <div style={{ display: "grid", gap: 8, maxHeight: 340, overflowY: "auto" }}>
              {matchingCandidates.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", color: "var(--mu)" }}>
                  No automated matches found.{" "}
                  <Link href="/candidates" style={{ color: "var(--bl)" }}>
                    Browse all candidates →
                  </Link>
                </div>
              ) : (
                matchingCandidates.map((c) => (
                  <div
                    key={c.id}
                    className="card"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: 10,
                    }}
                  >
                    <div>
                      <b style={{ fontSize: 14 }}>{c.name}</b>
                      <div style={{ color: "var(--mu)", fontSize: 12 }}>
                        {c.role} · {c.location} · {c.experience}
                      </div>
                      <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                        <span className={`pill ${getPillClass(c.stage)}`}>{c.stage}</span>
                        {(c.skills || []).slice(0, 2).map((s) => (
                          <span key={s} className="tag" style={{ fontSize: 10, padding: "1px 5px" }}>{s}</span>
                        ))}
                      </div>
                    </div>
                    <button
                      className="btn"
                      style={{ fontSize: 12, padding: "6px 12px" }}
                      onClick={() => {
                        candidateStore.addActivity(c.id, {
                          type: "submission",
                          title: `Submitted to ${matchingJob.title}`,
                          description: `Submitted to ${matchingJob.client} by Krupal P.`,
                          author: "Krupal P.",
                        });
                        store.updateJob(matchingJob.id, { applicants: matchingJob.applicants + 1 });
                        show(`Candidate ${c.name} submitted to ${matchingJob.client}!`);
                      }}
                    >
                      Submit Candidate ↗
                    </button>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn ghost" onClick={() => setMatchingJob(null)}>Close</button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog />
    </CrmShell>
  );
}
