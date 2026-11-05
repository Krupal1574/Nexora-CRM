"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { CrmShell } from "@/components/crm-shell";
import { useCandidateStore, type CrmCandidate, type PipelineStage } from "@/lib/crm/candidate-store";
import { useToast } from "@/lib/crm/toast-context";
import { PIPELINE_STAGES, getInitials, getPillClass } from "@/lib/crm/sample-data";
import { Modal, useConfirm } from "@/components/ui";

export default function CandidatesPage() {
  const store = useCandidateStore();
  const { show } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState<string>("All");
  const [filterLocation, setFilterLocation] = useState<string>("All");
  const [showCreate, setShowCreate] = useState(false);

  // New Candidate Form State
  const [form, setForm] = useState({
    name: "",
    role: "",
    location: "Ahmedabad",
    stage: "New" as PipelineStage,
    experience: "3 yrs",
    email: "",
    phone: "",
    skills: "",
    expectedSalary: "₹15-20 LPA",
    currentCompany: "",
    noticePeriod: "30 days",
  });

  const locations = useMemo(() => {
    const locs = new Set(store.candidates.map((c) => c.location).filter(Boolean));
    return Array.from(locs);
  }, [store.candidates]);

  const filteredCandidates = useMemo(() => {
    return store.candidates.filter((c) => {
      if (filterStage !== "All" && c.stage !== filterStage) return false;
      if (filterLocation !== "All" && c.location !== filterLocation) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchRole = c.role.toLowerCase().includes(q);
        const matchLoc = c.location.toLowerCase().includes(q);
        const matchSkills = c.skills?.some((s) => s.toLowerCase().includes(q));
        if (!matchName && !matchRole && !matchLoc && !matchSkills) return false;
      }
      return true;
    });
  }, [store.candidates, filterStage, filterLocation, search]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.role.trim()) {
      show("Candidate name and role are required.");
      return;
    }

    const created = store.createCandidate({
      name: form.name.trim(),
      role: form.role.trim(),
      location: form.location,
      stage: form.stage,
      experience: form.experience,
      email: form.email.trim(),
      phone: form.phone.trim(),
      skills: form.skills
        ? form.skills.split(",").map((s) => s.trim()).filter(Boolean)
        : [form.role.split(" ")[0]],
      expectedSalary: form.expectedSalary,
      currentCompany: form.currentCompany,
      noticePeriod: form.noticePeriod,
    });

    setShowCreate(false);
    setForm({
      name: "",
      role: "",
      location: "Ahmedabad",
      stage: "New",
      experience: "3 yrs",
      email: "",
      phone: "",
      skills: "",
      expectedSalary: "₹15-20 LPA",
      currentCompany: "",
      noticePeriod: "30 days",
    });
    show(`Candidate "${created.name}" added successfully.`);
  };

  const handleDelete = async (candidate: CrmCandidate) => {
    const ok = await confirm(`Remove candidate "${candidate.name}" from database?`);
    if (ok) {
      store.deleteCandidate(candidate.id);
      show(`"${candidate.name}" removed.`);
    }
  };

  const exportCsv = () => {
    if (filteredCandidates.length === 0) {
      show("No candidates to export.");
      return;
    }
    const headers = ["Name", "Role", "Location", "Stage", "Experience", "Email", "Phone", "Skills"];
    const rows = filteredCandidates.map((c) => [
      `"${c.name}"`,
      `"${c.role}"`,
      `"${c.location}"`,
      `"${c.stage}"`,
      `"${c.experience}"`,
      `"${c.email || ""}"`,
      `"${c.phone || ""}"`,
      `"${(c.skills || []).join(", ")}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encoded = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encoded);
    link.setAttribute("download", `nexora-candidates-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    show(`Exported ${filteredCandidates.length} candidates.`);
  };

  return (
    <CrmShell>
      <div className="page-top">
        <div>
          <h1>Candidate Database</h1>
          <p className="page-sub">
            {store.candidates.length} total talent profiles across recruitment workflows.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <Link href="/import" className="btn navy" style={{ textDecoration: "none" }}>
            ⇅ Import / Export
          </Link>
          <button className="btn" onClick={() => setShowCreate(true)}>
            + Add candidate
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="tools">
        <input
          placeholder="Search by name, skill, title, location…"
          style={{ width: "auto", minWidth: 260 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)}>
          <option value="All">All pipeline stages ({store.candidates.length})</option>
          {PIPELINE_STAGES.map((s) => (
            <option key={s} value={s}>
              {s} ({store.candidates.filter((c) => c.stage === s).length})
            </option>
          ))}
        </select>
        <select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)}>
          <option value="All">All locations</option>
          {locations.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>
        <button className="btn ghost" onClick={exportCsv} title="Export CSV">
          ⬇ Export CSV
        </button>
        <Link href="/pipeline" className="btn ghost" style={{ textDecoration: "none" }}>
          ≡ Kanban view
        </Link>
      </div>

      {/* Candidates Table */}
      {filteredCandidates.length === 0 ? (
        <div className="card empty-state">
          <span className="big">☺</span>
          <h3>No candidates match your filters</h3>
          <p>Try resetting your search query or stage filters.</p>
          <button
            className="btn ghost"
            style={{ marginTop: 12 }}
            onClick={() => {
              setSearch("");
              setFilterStage("All");
              setFilterLocation("All");
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="card tbl">
          <table>
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Role / Specialty</th>
                <th>Location</th>
                <th>Pipeline Stage</th>
                <th>Experience</th>
                <th>Skills</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCandidates.map((cand) => (
                <tr key={cand.id}>
                  <td>
                    <Link
                      href={`/candidates/${cand.id}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        fontWeight: 600,
                        color: "inherit",
                        textDecoration: "none",
                      }}
                    >
                      <span className="av">{getInitials(cand.name)}</span>
                      <div>
                        <div>{cand.name}</div>
                        <small style={{ color: "var(--mu)", fontWeight: 400 }}>{cand.email}</small>
                      </div>
                    </Link>
                  </td>
                  <td><b>{cand.role}</b></td>
                  <td>{cand.location}</td>
                  <td>
                    <select
                      value={cand.stage}
                      onChange={(e) => {
                        store.changeStage(cand.id, e.target.value as PipelineStage);
                        show(`Moved ${cand.name} to ${e.target.value}`);
                      }}
                      style={{
                        padding: "3px 8px",
                        fontSize: 12,
                        borderRadius: 99,
                        fontWeight: 600,
                        border: "1px solid var(--bd)",
                        background: "var(--bg)",
                        cursor: "pointer",
                      }}
                    >
                      {PIPELINE_STAGES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{cand.experience}</td>
                  <td>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", maxWidth: 200 }}>
                      {(cand.skills || []).slice(0, 3).map((s) => (
                        <span key={s} className="tag" style={{ fontSize: 11, padding: "2px 6px" }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 6 }}>
                      <Link href={`/candidates/${cand.id}`} className="btn ghost" style={{ fontSize: 12, padding: "5px 10px", textDecoration: "none" }}>
                        View
                      </Link>
                      <button
                        className="btn ghost"
                        style={{ fontSize: 12, padding: "5px 8px", color: "var(--bad)" }}
                        onClick={() => handleDelete(cand)}
                        title="Remove candidate"
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

      {/* Add Candidate Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Candidate to Talent Pool">
        <form onSubmit={handleCreate}>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Full Name *</label>
                <input
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Target Role / Title *</label>
                <input
                  required
                  placeholder="e.g. Lead Frontend Architect"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Location</label>
                <input
                  placeholder="City / Remote"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Experience</label>
                <input
                  placeholder="e.g. 5 yrs"
                  value={form.experience}
                  onChange={(e) => setForm({ ...form, experience: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Email</label>
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Phone</label>
                <input
                  type="tel"
                  placeholder="+91 98000 00000"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                Key Skills (comma separated)
              </label>
              <input
                placeholder="React, TypeScript, Node.js, AWS"
                value={form.skills}
                onChange={(e) => setForm({ ...form, skills: e.target.value })}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Pipeline Stage</label>
                <select
                  value={form.stage}
                  onChange={(e) => setForm({ ...form, stage: e.target.value as PipelineStage })}
                >
                  {PIPELINE_STAGES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Notice Period</label>
                <input
                  placeholder="30 days / Immediate"
                  value={form.noticePeriod}
                  onChange={(e) => setForm({ ...form, noticePeriod: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Expected CTC</label>
                <input
                  placeholder="₹18-24 LPA"
                  value={form.expectedSalary}
                  onChange={(e) => setForm({ ...form, expectedSalary: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
              <button type="button" className="btn ghost" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
              <button type="submit" className="btn">
                Add Candidate
              </button>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog />
    </CrmShell>
  );
}
