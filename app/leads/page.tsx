"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { CrmShell } from "@/components/crm-shell";
import { useLeadStore, LEAD_STAGES, type CrmLead, type LeadStage } from "@/lib/crm/lead-store";
import { useToast } from "@/lib/crm/toast-context";
import { getInitials, getPillClass } from "@/lib/crm/sample-data";
import { Modal, useConfirm } from "@/components/ui";

type ViewMode = "list" | "kanban";

const LEAD_TYPES = ["Cold Lead", "Warm Lead", "Hot Lead"];
const SOURCES = ["Linkedin Resume", "Referral", "Website", "Cold outreach", "Job Portal", "Staffing Event", "Other"];
const LEAD_PERSONS = ["Yatri", "Priya S.", "Rahul K.", "Amit D.", "Krupal P."];
const SALES_PERSONS = ["Krupal P.", "Rahul K.", "Priya S.", "Amit D.", "Meera N."];
const VISA_STATUSES = ["H1B", "OPT / CPT", "Green Card", "US Citizen", "PR", "Citizen", "Need Sponsorship", "Other"];

export default function LeadsPage() {
  const store = useLeadStore();
  const { show } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const [view, setView] = useState<ViewMode>("list");
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState<string>("All");
  const [filterLeadType, setFilterLeadType] = useState<string>("All");
  const [filterLocation, setFilterLocation] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"date" | "name" | "technology">("date");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Create modal state with exact staffing fields
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    location: "USA",
    name: "",
    phone: "",
    email: "",
    linkedin: "",
    visaStatus: "H1B",
    experience: "5+ yrs",
    leadType: "Cold Lead",
    leadSource: "Linkedin Resume",
    leadPerson: "Yatri",
    salesPerson: "Krupal P.",
    technology: "Computer science",
    accountRef: "",
    remark: "",
  });

  // Extract locations dynamically
  const locations = useMemo(() => {
    const locs = new Set(store.leads.map((l) => l.location).filter(Boolean));
    return Array.from(locs);
  }, [store.leads]);

  // Filtered & sorted leads
  const filtered = useMemo(() => {
    let list = store.leads;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          (l.technology && l.technology.toLowerCase().includes(q)) ||
          (l.email && l.email.toLowerCase().includes(q)) ||
          (l.phone && l.phone.toLowerCase().includes(q)) ||
          (l.location && l.location.toLowerCase().includes(q)) ||
          (l.accountRef && l.accountRef.toLowerCase().includes(q))
      );
    }
    if (filterStage !== "All") list = list.filter((l) => l.stage === filterStage);
    if (filterLeadType !== "All") list = list.filter((l) => l.leadType === filterLeadType);
    if (filterLocation !== "All") list = list.filter((l) => l.location === filterLocation);

    list = [...list].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "technology") return (a.technology || "").localeCompare(b.technology || "");
      return (b.date || b.createdAt).localeCompare(a.date || a.createdAt);
    });
    return list;
  }, [store.leads, search, filterStage, filterLeadType, filterLocation, sortBy]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((l) => l.id)));
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      show("Lead candidate name is required.");
      return;
    }

    const created = store.createLead({
      name: form.name.trim(),
      date: form.date,
      location: form.location.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      linkedin: form.linkedin.trim(),
      visaStatus: form.visaStatus,
      experience: form.experience.trim(),
      leadType: form.leadType,
      leadSource: form.leadSource,
      leadPerson: form.leadPerson,
      salesPerson: form.salesPerson,
      technology: form.technology.trim(),
      accountRef: form.accountRef.trim(),
      remark: form.remark.trim(),
      company: form.accountRef || form.technology || "Independent Candidate",
      owner: form.salesPerson,
      stage: "New",
      tags: [form.technology, form.visaStatus, form.location].filter(Boolean) as string[],
    });

    setShowCreate(false);
    setForm({
      date: new Date().toISOString().split("T")[0],
      location: "USA",
      name: "",
      phone: "",
      email: "",
      linkedin: "",
      visaStatus: "H1B",
      experience: "5+ yrs",
      leadType: "Cold Lead",
      leadSource: "Linkedin Resume",
      leadPerson: "Yatri",
      salesPerson: "Krupal P.",
      technology: "Computer science",
      accountRef: "",
      remark: "",
    });
    show(`Lead "${created.name}" created successfully.`);
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    const ok = await confirm(`Delete ${selected.size} selected lead(s)? This cannot be undone.`);
    if (!ok) return;
    selected.forEach((id) => store.deleteLead(id));
    setSelected(new Set());
    show(`${selected.size} lead(s) deleted.`);
  };

  const handleDuplicate = (lead: CrmLead) => {
    const dup = store.duplicateLead(lead.id);
    if (dup) show(`Duplicated: ${dup.name}`);
  };

  const handleDelete = async (lead: CrmLead) => {
    const ok = await confirm(`Delete "${lead.name}"?`);
    if (ok) {
      store.deleteLead(lead.id);
      show(`"${lead.name}" deleted.`);
    }
  };

  // Export exact matching columns specified by production staffing sheet
  const handleExportCsv = () => {
    if (filtered.length === 0) {
      show("No leads to export.");
      return;
    }
    const headers = [
      "Date",
      "Location",
      "Name",
      "Number",
      "E-mail",
      "Linkedin/ Facebook",
      "Visa Status",
      "Experience",
      "Lead Type",
      "Lead Source",
      "Lead Person",
      "Sales Person",
      "Technology",
      "Account Ref",
      "Remark",
    ];

    const rows = filtered.map((l) => [
      `"${l.date || l.createdAt.split("T")[0]}"`,
      `"${l.location || ""}"`,
      `"${l.name}"`,
      `"${l.phone || ""}"`,
      `"${l.email || ""}"`,
      `"${l.linkedin || l.profileUrls?.[0] || ""}"`,
      `"${l.visaStatus || ""}"`,
      `"${l.experience || ""}"`,
      `"${l.leadType || (l.temperature === "Hot" ? "Hot Lead" : l.temperature === "Warm" ? "Warm Lead" : "Cold Lead")}"`,
      `"${l.leadSource || l.source || ""}"`,
      `"${l.leadPerson || "Yatri"}"`,
      `"${l.salesPerson || l.owner || ""}"`,
      `"${l.technology || l.company || ""}"`,
      `"${l.accountRef || ""}"`,
      `"${l.remark || l.notes?.[0]?.text || ""}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encoded = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encoded);
    link.setAttribute("download", `nexora-leads-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    show(`Exported ${filtered.length} leads in exact staffing format.`);
  };

  return (
    <CrmShell>
      {/* Page Header */}
      <div className="page-top">
        <div>
          <h1>Recruitment &amp; Staffing Leads</h1>
          <p className="page-sub">
            {store.leads.length} total prospect profiles across recruitment mandates.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/import" className="btn navy" style={{ textDecoration: "none" }}>
            ⇅ Import Leads CSV
          </Link>
          <button className="btn" onClick={() => setShowCreate(true)}>
            + New Lead
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="tools">
        <input
          placeholder="Search name, technology, phone, email, location…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "auto", minWidth: 260 }}
        />
        <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)}>
          <option value="All">All stages ({store.leads.length})</option>
          {LEAD_STAGES.map((s) => (
            <option key={s} value={s}>
              {s} ({store.leads.filter((l) => l.stage === s).length})
            </option>
          ))}
        </select>
        <select value={filterLeadType} onChange={(e) => setFilterLeadType(e.target.value)}>
          <option value="All">All Lead Types</option>
          {LEAD_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)}>
          <option value="All">All Locations</option>
          {locations.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}>
          <option value="date">Date (Newest first)</option>
          <option value="name">Candidate Name A-Z</option>
          <option value="technology">Technology A-Z</option>
        </select>
        <div className="view-toggle">
          <button className={view === "list" ? "active" : ""} onClick={() => setView("list")}>
            ☰ List
          </button>
          <button className={view === "kanban" ? "active" : ""} onClick={() => setView("kanban")}>
            ▦ Kanban
          </button>
        </div>
        <button className="btn ghost" onClick={handleExportCsv}>
          ⬇ Export CSV
        </button>
        {selected.size > 0 && (
          <button className="btn" style={{ background: "var(--bad)" }} onClick={handleBulkDelete}>
            Delete {selected.size} selected
          </button>
        )}
      </div>

      {/* List View */}
      {view === "list" && (
        <div className="card tbl">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <span className="big">◎</span>
              <h3>No leads found</h3>
              <p>Try adjusting your filters or create a new lead.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input
                      type="checkbox"
                      checked={selected.size === filtered.length && filtered.length > 0}
                      onChange={toggleSelectAll}
                      style={{ width: "auto" }}
                    />
                  </th>
                  <th>Date</th>
                  <th>Candidate Name</th>
                  <th>Technology / Domain</th>
                  <th>Location &amp; Visa</th>
                  <th>Contact Details</th>
                  <th>Lead Type</th>
                  <th>Lead / Sales Person</th>
                  <th>Stage</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(lead.id)}
                        onChange={() => toggleSelect(lead.id)}
                        style={{ width: "auto" }}
                      />
                    </td>
                    <td style={{ whiteSpace: "nowrap", fontSize: 12, color: "var(--mu)" }}>
                      {lead.date || lead.createdAt.split("T")[0]}
                    </td>
                    <td>
                      <Link href={`/leads/${lead.id}`} style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "inherit" }}>
                        <span className="av">{getInitials(lead.name)}</span>
                        <div>
                          <span style={{ fontWeight: 600 }}>{lead.name}</span>
                          {lead.experience && (
                            <small style={{ color: "var(--mu)", display: "block" }}>{lead.experience}</small>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td>
                      <b>{lead.technology || lead.company || "—"}</b>
                      {lead.accountRef && (
                        <small style={{ color: "var(--mu)", display: "block" }}>Ref: {lead.accountRef}</small>
                      )}
                    </td>
                    <td>
                      <div>📍 {lead.location || "USA"}</div>
                      {lead.visaStatus && (
                        <span className="pill" style={{ fontSize: 11, padding: "2px 6px", marginTop: 2 }}>
                          {lead.visaStatus}
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: 13 }}>📞 {lead.phone || "—"}</div>
                      <small style={{ color: "var(--mu)" }}>✉ {lead.email || "—"}</small>
                    </td>
                    <td>
                      <span className={`pill ${getPillClass(lead.leadType || lead.temperature)}`}>
                        {lead.leadType || lead.temperature}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: 12 }}>
                        <b>Lead:</b> {lead.leadPerson || "Yatri"}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--mu)" }}>
                        <b>Sales:</b> {lead.salesPerson || lead.owner}
                      </div>
                    </td>
                    <td>
                      <span className={`pill ${getPillClass(lead.stage)}`}>{lead.stage}</span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 4 }}>
                        <Link href={`/leads/${lead.id}`} className="btn ghost" style={{ padding: "5px 8px", fontSize: 12, textDecoration: "none" }}>
                          View
                        </Link>
                        <button className="btn ghost" style={{ padding: "5px 8px", fontSize: 12 }} onClick={() => handleDuplicate(lead)} title="Duplicate">
                          ⧉
                        </button>
                        <button className="btn ghost" style={{ padding: "5px 8px", fontSize: 12, color: "var(--bad)" }} onClick={() => handleDelete(lead)} title="Delete">
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Kanban View */}
      {view === "kanban" && (
        <div className="kanban">
          {LEAD_STAGES.map((stage) => {
            const list = filtered.filter((l) => l.stage === stage);
            return (
              <div
                key={stage}
                className="kanban-col"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/plain");
                  if (id) {
                    store.changeStage(id, stage, "Krupal P.");
                    show(`Lead moved to ${stage}`);
                  }
                }}
              >
                <h4>
                  <span>{stage}</span>
                  <span className="pill">{list.length}</span>
                </h4>
                {list.map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/leads/${lead.id}`}
                    className="kanban-card"
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", lead.id)}
                    style={{ textDecoration: "none", color: "inherit", display: "block" }}
                  >
                    <b>{lead.name}</b>
                    <small style={{ display: "block", color: "var(--mu)" }}>
                      {lead.technology || lead.company}
                    </small>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11 }}>
                      <span>📍 {lead.location}</span>
                      {lead.visaStatus && <span className="pill">{lead.visaStatus}</span>}
                    </div>
                    <span
                      className={`pill ${getPillClass(lead.leadType || lead.temperature)}`}
                      style={{ marginTop: 6, display: "inline-block", fontSize: 10 }}
                    >
                      {lead.leadType || lead.temperature}
                    </span>
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Lead Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Sourced Lead" width={600}>
        <form onSubmit={handleCreate}>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Date *</label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Location *</label>
                <input
                  required
                  placeholder="e.g. USA, India, Remote"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Candidate Name *</label>
                <input
                  required
                  placeholder="e.g. Krishna Reddy"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Phone / Number</label>
                <input
                  type="tel"
                  placeholder="e.g. 9403681567"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. reddyyeddula564@gmail.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>LinkedIn / Profile URL</label>
                <input
                  placeholder="https://www.linkedin.com/in/..."
                  value={form.linkedin}
                  onChange={(e) => setForm({ ...form, linkedin: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Visa Status</label>
                <select
                  value={form.visaStatus}
                  onChange={(e) => setForm({ ...form, visaStatus: e.target.value })}
                >
                  {VISA_STATUSES.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Experience</label>
                <input
                  placeholder="e.g. 5+ yrs"
                  value={form.experience}
                  onChange={(e) => setForm({ ...form, experience: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Lead Type</label>
                <select
                  value={form.leadType}
                  onChange={(e) => setForm({ ...form, leadType: e.target.value })}
                >
                  {LEAD_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Technology / Domain *</label>
                <input
                  required
                  placeholder="e.g. Computer science, React, Java"
                  value={form.technology}
                  onChange={(e) => setForm({ ...form, technology: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Lead Source</label>
                <select
                  value={form.leadSource}
                  onChange={(e) => setForm({ ...form, leadSource: e.target.value })}
                >
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Lead Person (Sourcer)</label>
                <select
                  value={form.leadPerson}
                  onChange={(e) => setForm({ ...form, leadPerson: e.target.value })}
                >
                  {LEAD_PERSONS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Sales Person (Owner)</label>
                <select
                  value={form.salesPerson}
                  onChange={(e) => setForm({ ...form, salesPerson: e.target.value })}
                >
                  {SALES_PERSONS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Account Ref / Company</label>
              <input
                placeholder="Client Reference or Mandate ID"
                value={form.accountRef}
                onChange={(e) => setForm({ ...form, accountRef: e.target.value })}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Remark / Notes</label>
              <textarea
                rows={2}
                placeholder="Initial recruiter notes, call feedback, candidate constraints…"
                value={form.remark}
                onChange={(e) => setForm({ ...form, remark: e.target.value })}
              />
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <button type="button" className="btn ghost" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
              <button type="submit" className="btn">
                Create Lead
              </button>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog />
    </CrmShell>
  );
}
