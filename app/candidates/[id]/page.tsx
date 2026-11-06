"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CrmShell } from "@/components/crm-shell";
import { useCandidateStore, type PipelineStage } from "@/lib/crm/candidate-store";
import { useJobStore } from "@/lib/crm/job-store";
import { useTaskStore } from "@/lib/crm/task-store";
import { useToast } from "@/lib/crm/toast-context";
import { PIPELINE_STAGES, getInitials, getPillClass } from "@/lib/crm/sample-data";
import { Modal, StageBar, TabGroup, FieldRow, useConfirm } from "@/components/ui";

export default function CandidateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const store = useCandidateStore();
  const jobStore = useJobStore();
  const taskStore = useTaskStore();
  const { show } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const candidateId = params.id as string;
  const candidate = store.getCandidate(candidateId);

  const [tab, setTab] = useState("timeline");
  const [showEdit, setShowEdit] = useState(false);
  const [showJobMatch, setShowJobMatch] = useState(false);

  // Edit Form State
  const [editForm, setEditForm] = useState<Record<string, string>>({});

  // Activity composer
  const [actType, setActType] = useState<"interview" | "call" | "task">("interview");
  const [actTitle, setActTitle] = useState("");
  const [actDesc, setActDesc] = useState("");

  // Notes state
  const [noteText, setNoteText] = useState("");

  // Skills input
  const [newSkill, setNewSkill] = useState("");
  const [newProfileUrl, setNewProfileUrl] = useState("");

  if (!candidate) {
    return (
      <CrmShell>
        <div className="card empty-state">
          <span className="big">☺</span>
          <h3>Candidate not found</h3>
          <p>This candidate profile may have been removed or does not exist.</p>
          <Link href="/candidates" className="btn" style={{ marginTop: 14 }}>
            ← Back to Candidate Pool
          </Link>
        </div>
      </CrmShell>
    );
  }

  const handleStageChange = (newStage: string) => {
    store.changeStage(candidate.id, newStage as PipelineStage, "Krupal P.");
    show(`Candidate moved to ${newStage}.`);
  };

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    store.addNote(candidate.id, noteText.trim(), "Krupal P.");
    setNoteText("");
    show("Candidate note logged.");
  };

  const handleAddActivity = () => {
    if (!actTitle.trim()) {
      show("Please enter an activity title.");
      return;
    }
    store.addActivity(candidate.id, {
      type: actType,
      title: actTitle.trim(),
      description: actDesc.trim(),
      author: "Krupal P.",
    });

    // Also optionally create a follow-up task
    taskStore.createTask({
      text: `${actTitle.trim()} – ${candidate.name}`,
      category: actType === "interview" ? "Interview" : actType === "call" ? "Call" : "Task",
      priority: "High",
      assignedTo: "Krupal P.",
      relatedTo: { type: "candidate", id: candidate.id, name: candidate.name },
    });

    setActTitle("");
    setActDesc("");
    show(`${actType === "interview" ? "Interview" : "Activity"} scheduled and added to tasks.`);
  };

  const handleAddSkill = () => {
    if (!newSkill.trim()) return;
    const skill = newSkill.trim();
    if (candidate.skills?.includes(skill)) {
      show("Skill already listed.");
      return;
    }
    store.updateCandidate(candidate.id, {
      skills: [...(candidate.skills || []), skill],
    });
    setNewSkill("");
    show(`Skill "${skill}" added.`);
  };

  const handleRemoveSkill = (skill: string) => {
    store.updateCandidate(candidate.id, {
      skills: (candidate.skills || []).filter((s) => s !== skill),
    });
  };

  const handleAddProfileUrl = () => {
    const trimmed = newProfileUrl.trim();
    if (!trimmed) return;
    try {
      const u = new URL(trimmed);
      if (u.protocol !== "https:") {
        show("Only secure https:// URLs are allowed.");
        return;
      }
    } catch {
      show("Please enter a valid https:// URL.");
      return;
    }
    store.updateCandidate(candidate.id, { profileUrl: trimmed });
    setNewProfileUrl("");
    show("Profile URL attached safely.");
  };

  const handleDelete = async () => {
    const ok = await confirm(`Permanently delete profile of "${candidate.name}"?`);
    if (ok) {
      store.deleteCandidate(candidate.id);
      show(`"${candidate.name}" removed.`);
      router.push("/candidates");
    }
  };

  const openEdit = () => {
    setEditForm({
      name: candidate.name,
      role: candidate.role,
      location: candidate.location,
      experience: candidate.experience,
      email: candidate.email || "",
      phone: candidate.phone || "",
      expectedSalary: candidate.expectedSalary || "",
      noticePeriod: candidate.noticePeriod || "",
      currentCompany: candidate.currentCompany || "",
    });
    setShowEdit(true);
  };

  const saveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    store.updateCandidate(candidate.id, editForm);
    setShowEdit(false);
    show("Candidate details updated.");
  };

  const sortedActivities = [...candidate.activities].sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt)
  );

  return (
    <CrmShell>
      {/* Breadcrumb & Top Bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
        <Link href="/candidates" style={{ color: "var(--mu)", fontSize: 13, textDecoration: "none" }}>
          ← Candidates
        </Link>
        <span style={{ color: "var(--mu)" }}>/</span>
        <span style={{ fontWeight: 600 }}>{candidate.name}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className="btn ghost" onClick={openEdit}>✎ Edit</button>
          <button className="btn" onClick={() => setShowJobMatch(true)}>✦ Match to Job</button>
          <button className="btn ghost" style={{ color: "var(--bad)" }} onClick={handleDelete}>🗑 Delete</button>
        </div>
      </div>

      {/* Stage Progression Bar */}
      <StageBar
        stages={PIPELINE_STAGES as unknown as string[]}
        current={candidate.stage}
        onChange={handleStageChange}
      />

      {/* Main Grid */}
      <div className="lead-detail-grid">
        {/* Left Column */}
        <div>
          {/* Header Card */}
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
              <div className="av" style={{ width: 56, height: 56, fontSize: 20 }}>
                {getInitials(candidate.name)}
              </div>
              <div>
                <h2 style={{ margin: 0 }}>{candidate.name}</h2>
                <div style={{ color: "var(--mu)", fontSize: 14, marginTop: 2 }}>
                  {candidate.role} · {candidate.location}
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <span className={`pill ${getPillClass(candidate.stage)}`}>{candidate.stage}</span>
                  <span className="pill">{candidate.experience} exp</span>
                </div>
              </div>
            </div>

            <FieldRow label="Email">{candidate.email || "—"}</FieldRow>
            <FieldRow label="Phone">{candidate.phone || "—"}</FieldRow>
            <FieldRow label="Location">{candidate.location}</FieldRow>
            <FieldRow label="Current Company">{candidate.currentCompany || "Confidential"}</FieldRow>
            <FieldRow label="Expected CTC">{candidate.expectedSalary || "Negotiable"}</FieldRow>
            <FieldRow label="Notice Period">{candidate.noticePeriod || "30 days"}</FieldRow>
            <FieldRow label="Candidate ID"><code>{candidate.id}</code></FieldRow>
          </div>

          {/* Skills Card */}
          <div className="card" style={{ marginBottom: 14 }}>
            <b>Candidate Skills &amp; Competencies</b>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "10px 0" }}>
              {(candidate.skills || []).map((skill) => (
                <span key={skill} className="tag" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  {skill}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    style={{ background: "none", border: 0, padding: 0, cursor: "pointer", color: "inherit", fontWeight: "bold" }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6, maxWidth: 300 }}>
              <input
                placeholder="Add skill (e.g. Next.js, Python)…"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSkill(); } }}
                style={{ fontSize: 13, padding: "6px 8px" }}
              />
              <button className="btn ghost" style={{ padding: "6px 12px" }} onClick={handleAddSkill}>
                + Add
              </button>
            </div>
          </div>

          {/* Interactive Tabs */}
          <TabGroup
            tabs={[
              { id: "timeline", label: "Timeline" },
              { id: "notes", label: `Notes (${candidate.notes.length})` },
              { id: "activity", label: "Schedule Activity" },
            ]}
            active={tab}
            onChange={setTab}
          />

          {tab === "timeline" && (
            <div className="card">
              <b>Candidate Lifecycle Timeline</b>
              <div className="timeline" style={{ marginTop: 16 }}>
                {sortedActivities.map((act) => (
                  <div key={act.id} className={`timeline-item ${act.type}`}>
                    <p className="timeline-title">{act.title}</p>
                    <p className="timeline-desc">{act.description}</p>
                    <p className="timeline-meta">{act.author} · {new Date(act.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "notes" && (
            <div className="card">
              <b>Recruiter &amp; Screening Notes</b>
              <div style={{ margin: "12px 0" }}>
                <textarea
                  placeholder="Record interview notes, feedback, or salary expectations…"
                  rows={3}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  style={{ marginBottom: 8 }}
                />
                <button className="btn" onClick={handleAddNote}>Save Note</button>
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                {candidate.notes.map((n) => (
                  <div key={n.id} className="card note" style={{ padding: 12 }}>
                    <p style={{ margin: "0 0 4px" }}>{n.text}</p>
                    <small style={{ color: "var(--mu)" }}>
                      {n.author} · {new Date(n.createdAt).toLocaleDateString()}
                    </small>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "activity" && (
            <div className="card">
              <b>Schedule Interview or Follow-up</b>
              <div className="composer-grid" style={{ margin: "12px 0" }}>
                <button
                  className={`composer-type ${actType === "interview" ? "active" : ""}`}
                  onClick={() => setActType("interview")}
                >
                  <span style={{ fontSize: 18, display: "block" }}>👥</span>
                  Interview
                </button>
                <button
                  className={`composer-type ${actType === "call" ? "active" : ""}`}
                  onClick={() => setActType("call")}
                >
                  <span style={{ fontSize: 18, display: "block" }}>☎</span>
                  Screening Call
                </button>
                <button
                  className={`composer-type ${actType === "task" ? "active" : ""}`}
                  onClick={() => setActType("task")}
                >
                  <span style={{ fontSize: 18, display: "block" }}>✓</span>
                  Task Reminder
                </button>
              </div>

              <input
                placeholder="Title (e.g. Technical Round 1 with Brightline Lead) *"
                value={actTitle}
                onChange={(e) => setActTitle(e.target.value)}
                style={{ marginBottom: 8 }}
              />
              <textarea
                placeholder="Details, interview agenda, meeting link, or follow-up instructions…"
                rows={2}
                value={actDesc}
                onChange={(e) => setActDesc(e.target.value)}
                style={{ marginBottom: 10 }}
              />
              <button className="btn" onClick={handleAddActivity}>
                Schedule &amp; Add to Tasks
              </button>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div>
          {/* Quick info */}
          <div className="card" style={{ marginBottom: 14 }}>
            <b>Talent Profile Info</b>
            <div className="row" style={{ marginTop: 8 }}>
              <span>Created</span>
              <small style={{ color: "var(--mu)" }}>{new Date(candidate.createdAt).toLocaleDateString()}</small>
            </div>
            <div className="row">
              <span>Updated</span>
              <small style={{ color: "var(--mu)" }}>{new Date(candidate.updatedAt).toLocaleDateString()}</small>
            </div>
            <div className="row">
              <span>Source</span>
              <span className="pill">{candidate.source || "Direct"}</span>
            </div>
            <div className="row">
              <span>Interviews &amp; Actions</span>
              <b>{candidate.activities.length}</b>
            </div>
          </div>

          {/* Profile Links */}
          <div className="card" style={{ marginBottom: 14 }}>
            <b>Safe External Profile</b>
            <p style={{ color: "var(--mu)", fontSize: 12, margin: "4px 0 8px" }}>
              Only https:// links stored. Never scraped.
            </p>
            {candidate.profileUrl ? (
              <div style={{ marginBottom: 10 }}>
                <a
                  href={candidate.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  style={{ color: "var(--bl)", fontSize: 13, wordBreak: "break-all", fontWeight: 600 }}
                >
                  {candidate.profileUrl} ↗
                </a>
              </div>
            ) : (
              <p style={{ color: "var(--mu)", fontSize: 13, marginBottom: 8 }}>No profile link attached.</p>
            )}
            <div style={{ display: "flex", gap: 6 }}>
              <input
                placeholder="https://linkedin.com/in/…"
                value={newProfileUrl}
                onChange={(e) => setNewProfileUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddProfileUrl(); } }}
                style={{ fontSize: 12, padding: "6px 8px" }}
              />
              <button className="btn ghost" style={{ padding: "6px 10px" }} onClick={handleAddProfileUrl}>
                Attach
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <b>Talent Actions</b>
            <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
              <button className="btn" style={{ width: "100%" }} onClick={() => setShowJobMatch(true)}>
                ✦ Submit to Job Mandate
              </button>
              <button
                className="btn ghost"
                style={{ width: "100%" }}
                onClick={() => { setTab("activity"); setActType("interview"); }}
              >
                👥 Schedule Interview
              </button>
              <button
                className="btn ghost"
                style={{ width: "100%" }}
                onClick={() => { setTab("activity"); setActType("call"); }}
              >
                ☎ Log Phone Screen
              </button>
              <Link
                href="/pipeline"
                className="btn ghost"
                style={{ width: "100%", textAlign: "center", textDecoration: "none" }}
              >
                ≡ View on Kanban
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Candidate Modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Candidate Profile">
        <form onSubmit={saveEdit}>
          <div style={{ display: "grid", gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Full Name</label>
              <input
                value={editForm.name || ""}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Role / Title</label>
                <input
                  value={editForm.role || ""}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Location</label>
                <input
                  value={editForm.location || ""}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Email</label>
                <input
                  value={editForm.email || ""}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Phone</label>
                <input
                  value={editForm.phone || ""}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Current Company</label>
                <input
                  value={editForm.currentCompany || ""}
                  onChange={(e) => setEditForm({ ...editForm, currentCompany: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Expected Salary</label>
                <input
                  value={editForm.expectedSalary || ""}
                  onChange={(e) => setEditForm({ ...editForm, expectedSalary: e.target.value })}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
              <button type="button" className="btn ghost" onClick={() => setShowEdit(false)}>Cancel</button>
              <button type="submit" className="btn">Save Changes</button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Match to Job Modal */}
      <Modal open={showJobMatch} onClose={() => setShowJobMatch(false)} title={`Match ${candidate.name} to Open Job`}>
        <div style={{ display: "grid", gap: 10 }}>
          <p style={{ color: "var(--mu)", fontSize: 13, margin: 0 }}>
            Select an active client opening to submit this candidate:
          </p>
          <div style={{ display: "grid", gap: 8, maxHeight: 320, overflowY: "auto" }}>
            {jobStore.jobs.map((j) => (
              <div
                key={j.id}
                className="card"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: 12,
                }}
              >
                <div>
                  <b style={{ fontSize: 14 }}>{j.title}</b>
                  <div style={{ color: "var(--mu)", fontSize: 12 }}>
                    {j.client} · {j.location} · {j.salaryRange}
                  </div>
                </div>
                <button
                  className="btn"
                  style={{ fontSize: 12, padding: "6px 12px" }}
                  onClick={() => {
                    store.addActivity(candidate.id, {
                      type: "submission",
                      title: `Submitted to ${j.title}`,
                      description: `Candidate submitted for review at ${j.client}`,
                      author: "Krupal P.",
                    });
                    jobStore.updateJob(j.id, { applicants: j.applicants + 1 });
                    setShowJobMatch(false);
                    show(`Submitted ${candidate.name} to "${j.title}" at ${j.client}!`);
                  }}
                >
                  Submit ↗
                </button>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      <ConfirmDialog />
    </CrmShell>
  );
}

