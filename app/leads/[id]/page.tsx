"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CrmShell } from "@/components/crm-shell";
import { useLeadStore, LEAD_STAGES, type LeadStage, type ActivityType } from "@/lib/crm/lead-store";
import { useCandidateStore } from "@/lib/crm/candidate-store";
import { useClientStore } from "@/lib/crm/client-store";
import { useJobStore } from "@/lib/crm/job-store";
import { useToast } from "@/lib/crm/toast-context";
import { getInitials, getPillClass } from "@/lib/crm/sample-data";
import { Modal, StageBar, TabGroup, FieldRow, useConfirm } from "@/components/ui";
import Link from "next/link";

const ACTIVITY_TYPES: { id: ActivityType; label: string; icon: string }[] = [
  { id: "task", label: "Task", icon: "✓" },
  { id: "call", label: "Call", icon: "☎" },
  { id: "email", label: "Email", icon: "✉" },
  { id: "meeting", label: "Meeting", icon: "📅" },
  { id: "note", label: "Note", icon: "✎" },
];

const OWNERS = ["Krupal P.", "Priya S.", "Rahul K.", "Amit D.", "Meera N."];

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const store = useLeadStore();
  const candStore = useCandidateStore();
  const clientStore = useClientStore();
  const jobStore = useJobStore();
  const { show } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const leadId = params.id as string;
  const lead = store.getLead(leadId);

  const [tab, setTab] = useState("timeline");
  const [showEdit, setShowEdit] = useState(false);
  const [showConvert, setShowConvert] = useState(false);

  // Activity composer
  const [actType, setActType] = useState<ActivityType>("task");
  const [actTitle, setActTitle] = useState("");
  const [actDesc, setActDesc] = useState("");

  // Note input
  const [noteText, setNoteText] = useState("");

  // Edit form
  const [editForm, setEditForm] = useState<Record<string, string>>({});

  // Conversion options
  const [convertOpts, setConvertOpts] = useState({ candidate: true, client: false, deal: false });

  // Tag & URL inputs
  const [newTag, setNewTag] = useState("");
  const [newProfileUrl, setNewProfileUrl] = useState("");

  if (!lead) {
    return (
      <CrmShell>
        <div className="empty-state">
          <span className="big">◎</span>
          <h3>Lead not found</h3>
          <p>This lead may have been deleted.</p>
          <Link href="/leads" className="btn" style={{ marginTop: 16 }}>← Back to leads</Link>
        </div>
      </CrmShell>
    );
  }

  const openEdit = () => {
    setEditForm({
      name: lead.name,
      technology: lead.technology || lead.company || "",
      location: lead.location || "USA",
      visaStatus: lead.visaStatus || "",
      email: lead.email || "",
      phone: lead.phone || "",
      experience: lead.experience || "",
      leadType: lead.leadType || (lead.temperature === "Hot" ? "Hot Lead" : lead.temperature === "Warm" ? "Warm Lead" : "Cold Lead"),
      leadSource: lead.leadSource || lead.source || "",
      leadPerson: lead.leadPerson || "Yatri",
      salesPerson: lead.salesPerson || lead.owner || "Krupal P.",
      accountRef: lead.accountRef || "",
      remark: lead.remark || "",
    });
    setShowEdit(true);
  };

  const saveEdit = () => {
    store.updateLead(lead.id, {
      name: editForm.name,
      technology: editForm.technology,
      company: editForm.accountRef || editForm.technology || lead.company,
      location: editForm.location,
      visaStatus: editForm.visaStatus,
      email: editForm.email,
      phone: editForm.phone,
      experience: editForm.experience,
      leadType: editForm.leadType,
      temperature: editForm.leadType === "Hot Lead" ? "Hot" : editForm.leadType === "Warm Lead" ? "Warm" : "New",
      leadSource: editForm.leadSource,
      source: editForm.leadSource,
      leadPerson: editForm.leadPerson,
      salesPerson: editForm.salesPerson,
      owner: editForm.salesPerson,
      accountRef: editForm.accountRef,
      remark: editForm.remark,
    });
    store.addActivity(lead.id, {
      type: "note",
      title: "Lead details updated",
      description: `Staffing fields were updated by ${lead.salesPerson || "Krupal P."}.`,
      author: "Krupal P.",
    });
    setShowEdit(false);
    show("Lead updated successfully.");
  };

  const handleStageChange = (stage: LeadStage) => {
    store.changeStage(lead.id, stage, "Krupal P.");
    show(`Stage changed to ${stage}.`);
  };

  const handleAddActivity = () => {
    if (!actTitle.trim()) { show("Activity title is required."); return; }
    store.addActivity(lead.id, {
      type: actType,
      title: actTitle.trim(),
      description: actDesc.trim(),
      author: "Krupal P.",
    });
    setActTitle("");
    setActDesc("");
    show("Activity added.");
  };

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    store.addNote(lead.id, noteText.trim(), "Krupal P.");
    setNoteText("");
    show("Note added.");
  };

  const handleDelete = async () => {
    const ok = await confirm(`Delete "${lead.name}"? This cannot be undone.`);
    if (ok) {
      store.deleteLead(lead.id);
      show(`"${lead.name}" deleted.`);
      router.push("/leads");
    }
  };

  const handleConvert = () => {
    const targets: { type: string; id: string }[] = [];
    if (convertOpts.candidate) {
      const created = candStore.createCandidate({
        name: lead.name,
        role: "Recruitment Lead / Candidate",
        email: lead.email,
        phone: lead.phone,
        source: lead.source || "Lead Conversion",
        location: "Ahmedabad",
        stage: "New",
      });
      targets.push({ type: "Candidate", id: created.id });
    }
    if (convertOpts.client) {
      const created = clientStore.createClient({
        name: lead.company,
        industry: "Staffing & Recruitment",
        contactPerson: lead.name,
        contactEmail: lead.email,
        contactPhone: lead.phone,
        status: "Active",
        owner: lead.owner,
      });
      targets.push({ type: "Client", id: created.id });
    }
    if (convertOpts.deal) {
      const created = jobStore.createJob({
        title: `Mandate for ${lead.company}`,
        client: lead.company,
        location: "Ahmedabad",
        status: "Open",
        salaryRange: lead.value || "Competitive",
      });
      targets.push({ type: "Job Mandate", id: created.id });
    }
    if (targets.length === 0) {
      show("Select at least one conversion target.");
      return;
    }
    store.convertLead(lead.id, targets, "Krupal P.");
    setShowConvert(false);
    show(`Lead converted to: ${targets.map((t) => t.type).join(", ")}.`);
  };

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    const tag = newTag.trim();
    if (lead.tags.includes(tag)) {
      show("Tag already exists.");
      return;
    }
    store.updateLead(lead.id, { tags: [...lead.tags, tag] });
    setNewTag("");
    show(`Tag "${tag}" added.`);
  };

  const handleRemoveTag = (tag: string) => {
    store.updateLead(lead.id, { tags: lead.tags.filter((t) => t !== tag) });
    show(`Tag "${tag}" removed.`);
  };

  const handleAddProfileUrl = () => {
    const trimmed = newProfileUrl.trim();
    if (!trimmed) return;
    try {
      const u = new URL(trimmed);
      if (u.protocol !== "https:") {
        show("Only secure https:// URLs are permitted.");
        return;
      }
    } catch {
      show("Invalid URL format. Please include https://");
      return;
    }
    if (lead.profileUrls.includes(trimmed)) {
      show("URL already attached.");
      return;
    }
    store.updateLead(lead.id, { profileUrls: [...lead.profileUrls, trimmed] });
    setNewProfileUrl("");
    show("Profile URL attached safely.");
  };

  const sortedActivities = [...lead.activities].sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt)
  );

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60_000) return "Just now";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <CrmShell>
      {/* Breadcrumb & actions */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
        <Link href="/leads" style={{ color: "var(--mu)", fontSize: 13 }}>← Leads</Link>
        <span style={{ color: "var(--mu)" }}>/</span>
        <span style={{ fontWeight: 600 }}>{lead.name}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className="btn ghost" onClick={openEdit}>✎ Edit</button>
          <button className="btn ghost" onClick={() => { store.duplicateLead(lead.id); show("Duplicated."); }}>⧉ Duplicate</button>
          <button className="btn" onClick={() => setShowConvert(true)}>↗ Convert</button>
          <button className="btn ghost" style={{ color: "var(--bad)" }} onClick={handleDelete}>🗑 Delete</button>
        </div>
      </div>

      {/* Stage Bar */}
      <StageBar stages={LEAD_STAGES} current={lead.stage} onChange={handleStageChange} />

      {/* Conversion badge */}
      {lead.convertedTo && lead.convertedTo.length > 0 && (
        <div className="card" style={{ marginBottom: 14, background: "#d9f3e8", borderColor: "#1f9d6b" }}>
          <b style={{ color: "#14704b" }}>✓ Converted to:</b>{" "}
          {lead.convertedTo.map((t) => (
            <span key={t.id} className="pill ok" style={{ marginLeft: 6 }}>{t.type}</span>
          ))}
        </div>
      )}

      {/* Two-column layout */}
      <div className="lead-detail-grid">
        {/* Left: main content */}
        <div>
          {/* Profile card */}
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
              <div className="av" style={{ width: 56, height: 56, fontSize: 20 }}>{getInitials(lead.name)}</div>
              <div>
                <h2 style={{ margin: 0 }}>{lead.name}</h2>
                <span style={{ color: "var(--mu)" }}>{lead.company}</span>
                <span className={`pill ${getPillClass(lead.temperature)}`} style={{ marginLeft: 8 }}>{lead.temperature}</span>
              </div>
            </div>
            <FieldRow label="Email">{lead.email || "—"}</FieldRow>
            <FieldRow label="Phone">{lead.phone || "—"}</FieldRow>
            <FieldRow label="Technology / Domain">{lead.technology || lead.company || "—"}</FieldRow>
            <FieldRow label="Location">{lead.location ? `📍 ${lead.location}` : "—"}</FieldRow>
            <FieldRow label="Visa Status">{lead.visaStatus ? <span className="pill">{lead.visaStatus}</span> : "—"}</FieldRow>
            <FieldRow label="Experience">{lead.experience || "—"}</FieldRow>
            <FieldRow label="Lead Type"><span className={`pill ${getPillClass(lead.leadType || lead.temperature)}`}>{lead.leadType || lead.temperature}</span></FieldRow>
            <FieldRow label="Lead Source">{lead.leadSource || lead.source}</FieldRow>
            <FieldRow label="Lead Person (Sourcer)"><b>{lead.leadPerson || "Yatri"}</b></FieldRow>
            <FieldRow label="Sales Person (Owner)"><span className="av" style={{ width: 22, height: 22, fontSize: 10 }}>{getInitials(lead.salesPerson || lead.owner)}</span> {lead.salesPerson || lead.owner}</FieldRow>
            {lead.accountRef && <FieldRow label="Account Ref">{lead.accountRef}</FieldRow>}
            <FieldRow label="Stage"><span className={`pill ${getPillClass(lead.stage)}`}>{lead.stage}</span></FieldRow>
            {lead.remark && <FieldRow label="Remark">{lead.remark}</FieldRow>}
            {lead.tags.length > 0 && (
              <FieldRow label="Tags">
                {lead.tags.map((t) => <span key={t} className="tag">{t}</span>)}
              </FieldRow>
            )}
          </div>

          {/* Tabs: timeline / notes / activities */}
          <TabGroup
            tabs={[
              { id: "timeline", label: "Timeline" },
              { id: "notes", label: `Notes (${lead.notes.length})` },
              { id: "activity", label: "Add Activity" },
            ]}
            active={tab}
            onChange={setTab}
          />

          {tab === "timeline" && (
            <div className="card">
              <b>Activity timeline</b>
              {sortedActivities.length === 0 ? (
                <p style={{ color: "var(--mu)" }}>No activity yet.</p>
              ) : (
                <div className="timeline" style={{ marginTop: 16 }}>
                  {sortedActivities.map((act) => (
                    <div key={act.id} className={`timeline-item ${act.type}`}>
                      <p className="timeline-title">{act.title}</p>
                      <p className="timeline-desc">{act.description}</p>
                      <p className="timeline-meta">{act.author} · {formatTime(act.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "notes" && (
            <div>
              <div className="card" style={{ marginBottom: 14 }}>
                <b>Add a note</b>
                <textarea
                  placeholder="Write a note about this lead…"
                  rows={3}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  style={{ marginTop: 8 }}
                />
                <button className="btn" style={{ marginTop: 8 }} onClick={handleAddNote}>Save note</button>
              </div>
              {lead.notes.length === 0 ? (
                <div className="card empty-state">
                  <span className="big">✎</span>
                  <h3>No notes yet</h3>
                  <p>Add context that helps your team close this lead.</p>
                </div>
              ) : (
                lead.notes.map((n) => (
                  <div key={n.id} className="card note-card" style={{ marginBottom: 10 }}>
                    <p style={{ margin: 0 }}>{n.text}</p>
                    <small style={{ color: "var(--mu)" }}>{n.author} · {formatTime(n.createdAt)}</small>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "activity" && (
            <div className="card">
              <b>Schedule an activity</b>
              <div className="composer-grid" style={{ marginTop: 12 }}>
                {ACTIVITY_TYPES.map((a) => (
                  <button
                    key={a.id}
                    className={`composer-type ${actType === a.id ? "active" : ""}`}
                    onClick={() => setActType(a.id)}
                  >
                    <span style={{ fontSize: 18, display: "block" }}>{a.icon}</span>
                    {a.label}
                  </button>
                ))}
              </div>
              <input
                placeholder="Activity title *"
                value={actTitle}
                onChange={(e) => setActTitle(e.target.value)}
                style={{ marginBottom: 8 }}
              />
              <textarea
                placeholder="Description (optional)"
                rows={2}
                value={actDesc}
                onChange={(e) => setActDesc(e.target.value)}
                style={{ marginBottom: 10 }}
              />
              <button className="btn" onClick={handleAddActivity}>Add {ACTIVITY_TYPES.find((a) => a.id === actType)?.label}</button>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div>
          {/* Quick stats */}
          <div className="card" style={{ marginBottom: 14 }}>
            <b>Quick info</b>
            <div className="row" style={{ marginTop: 8 }}>
              <span>Created</span><small style={{ color: "var(--mu)" }}>{formatTime(lead.createdAt)}</small>
            </div>
            <div className="row">
              <span>Last updated</span><small style={{ color: "var(--mu)" }}>{formatTime(lead.updatedAt)}</small>
            </div>
            <div className="row">
              <span>Activities</span><b>{lead.activities.length}</b>
            </div>
            <div className="row">
              <span>Notes</span><b>{lead.notes.length}</b>
            </div>
          </div>

          {/* Tags */}
          <div className="card" style={{ marginBottom: 14 }}>
            <b>Tags</b>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "10px 0" }}>
              {lead.tags.length === 0 ? (
                <span style={{ color: "var(--mu)", fontSize: 13 }}>No tags yet.</span>
              ) : (
                lead.tags.map((t) => (
                  <span key={t} className="tag" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      style={{ background: "none", border: 0, padding: 0, cursor: "pointer", color: "inherit", fontWeight: "bold" }}
                      title="Remove tag"
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                placeholder="Add tag…"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddTag(); } }}
                style={{ fontSize: 13, padding: "6px 8px" }}
              />
              <button className="btn ghost" style={{ padding: "6px 10px" }} onClick={handleAddTag}>+</button>
            </div>
          </div>

          {/* Profile Links */}
          <div className="card" style={{ marginBottom: 14 }}>
            <b>External Profile links</b>
            <p style={{ color: "var(--mu)", fontSize: 12, margin: "4px 0 8px" }}>
              Zero-scraping safe URL storage (LinkedIn, GitHub, portfolio).
            </p>
            {lead.profileUrls.length === 0 ? (
              <p style={{ color: "var(--mu)", fontSize: 13, marginBottom: 8 }}>No links attached.</p>
            ) : (
              <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
                {lead.profileUrls.map((url, i) => (
                  <div className="row" key={i} style={{ padding: "4px 0" }}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      style={{ color: "var(--bl)", fontSize: 12, wordBreak: "break-all" }}
                    >
                      {url}
                    </a>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 6 }}>
              <input
                placeholder="https://linkedin.com/in/…"
                value={newProfileUrl}
                onChange={(e) => setNewProfileUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddProfileUrl(); } }}
                style={{ fontSize: 12, padding: "6px 8px" }}
              />
              <button className="btn ghost" style={{ padding: "6px 10px", whiteSpace: "nowrap" }} onClick={handleAddProfileUrl}>
                Attach
              </button>
            </div>
          </div>

          {/* Linked Records if converted */}
          {lead.convertedTo && lead.convertedTo.length > 0 && (
            <div className="card" style={{ marginBottom: 14 }}>
              <b>Linked CRM Records</b>
              <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                {lead.convertedTo.map((t) => (
                  <div key={t.id} className="row" style={{ padding: "6px 0" }}>
                    <span className="pill ok">{t.type}</span>
                    <Link
                      href={
                        t.type === "Candidate"
                          ? `/candidates`
                          : t.type === "Client"
                          ? `/clients`
                          : `/jobs`
                      }
                      style={{ color: "var(--bl)", fontSize: 13, fontWeight: 600 }}
                    >
                      View in {t.type}s →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="card">
            <b>Actions</b>
            <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
              <button className="btn" style={{ width: "100%" }} onClick={() => setShowConvert(true)}>
                ↗ Convert lead
              </button>
              <button className="btn ghost" style={{ width: "100%" }} onClick={() => { setTab("activity"); setActType("email"); }}>
                ✉ Schedule email
              </button>
              <button className="btn ghost" style={{ width: "100%" }} onClick={() => { setTab("activity"); setActType("call"); }}>
                ☎ Log a call
              </button>
              <button className="btn ghost" style={{ width: "100%" }} onClick={() => { setTab("activity"); setActType("meeting"); }}>
                📅 Schedule meeting
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Sourced Lead" width={580}>
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Candidate Name</label>
              <input value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Technology / Domain</label>
              <input value={editForm.technology || ""} onChange={(e) => setEditForm({ ...editForm, technology: e.target.value })} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Location</label>
              <input value={editForm.location || ""} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Visa Status</label>
              <input placeholder="H1B, OPT/CPT, Green Card, Citizen" value={editForm.visaStatus || ""} onChange={(e) => setEditForm({ ...editForm, visaStatus: e.target.value })} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Email Address</label>
              <input value={editForm.email || ""} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Phone Number</label>
              <input value={editForm.phone || ""} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Experience</label>
              <input value={editForm.experience || ""} onChange={(e) => setEditForm({ ...editForm, experience: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Lead Type</label>
              <select value={editForm.leadType || "Cold Lead"} onChange={(e) => setEditForm({ ...editForm, leadType: e.target.value })}>
                <option value="Cold Lead">Cold Lead</option>
                <option value="Warm Lead">Warm Lead</option>
                <option value="Hot Lead">Hot Lead</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Lead Person (Sourcer)</label>
              <input value={editForm.leadPerson || ""} onChange={(e) => setEditForm({ ...editForm, leadPerson: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Sales Person (Owner)</label>
              <input value={editForm.salesPerson || ""} onChange={(e) => setEditForm({ ...editForm, salesPerson: e.target.value })} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Account Ref</label>
            <input value={editForm.accountRef || ""} onChange={(e) => setEditForm({ ...editForm, accountRef: e.target.value })} />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Remark / Notes</label>
            <textarea rows={2} value={editForm.remark || ""} onChange={(e) => setEditForm({ ...editForm, remark: e.target.value })} />
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <button className="btn ghost" onClick={() => setShowEdit(false)}>Cancel</button>
            <button className="btn" onClick={saveEdit}>Save changes</button>
          </div>
        </div>
      </Modal>

      {/* Convert Modal */}
      <Modal open={showConvert} onClose={() => setShowConvert(false)} title="Convert lead" width={440}>
        <p style={{ color: "var(--mu)", margin: "0 0 16px" }}>
          Convert <b>{lead.name}</b> into one or more CRM records. The lead history will be preserved.
        </p>
        <label className="check-row">
          <input type="checkbox" checked={convertOpts.candidate} onChange={(e) => setConvertOpts({ ...convertOpts, candidate: e.target.checked })} />
          Candidate / Contact
        </label>
        <label className="check-row">
          <input type="checkbox" checked={convertOpts.client} onChange={(e) => setConvertOpts({ ...convertOpts, client: e.target.checked })} />
          Client company
        </label>
        <label className="check-row">
          <input type="checkbox" checked={convertOpts.deal} onChange={(e) => setConvertOpts({ ...convertOpts, deal: e.target.checked })} />
          Hiring opportunity / Deal
        </label>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
          <button className="btn ghost" onClick={() => setShowConvert(false)}>Cancel</button>
          <button className="btn" onClick={handleConvert}>Convert</button>
        </div>
      </Modal>

      <ConfirmDialog />
    </CrmShell>
  );
}

