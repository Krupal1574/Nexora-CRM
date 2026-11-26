"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { CrmShell } from "@/components/crm-shell";
import { useLeadStore, LEAD_STAGES, type CrmLead, type LeadStage } from "@/lib/crm/lead-store";
import { useToast } from "@/lib/crm/toast-context";
import { getInitials, getPillClass } from "@/lib/crm/sample-data";
import { Modal, useConfirm } from "@/components/ui";
import { useAuth } from "@/lib/crm/auth-context";

type ViewMode = "list" | "kanban";

const LEAD_TYPES = ["Cold Lead", "Warm Lead", "Hot Lead"];
const SOURCES = ["Linkedin Resume", "Referral", "Website", "Cold outreach", "Job Portal", "Staffing Event", "Other"];
const LEAD_PERSONS = ["Yatri", "Krupal P.", "Support Admin", "Priya S.", "Rahul K.", "Amit D.", "Other"];
const SALES_PERSONS = ["Krupal P.", "Support Admin", "Rahul K.", "Priya S.", "Amit D.", "Meera N.", "Yatri"];
const VISA_STATUSES = ["H1B", "OPT / CPT", "Green Card", "US Citizen", "PR", "Citizen", "Need Sponsorship", "Other"];

function getVisaBadgeClass(visa?: string) {
  if (!visa) return "visa-badge";
  const v = visa.toLowerCase();
  if (v.includes("opt") || v.includes("cpt") || v.includes("stem")) return "visa-badge opt";
  if (v.includes("h1b") || v.includes("h-1b")) return "visa-badge h1b";
  if (v.includes("gc") || v.includes("green") || v.includes("citizen") || v.includes("pr")) return "visa-badge gc";
  return "visa-badge";
}

export default function LeadsPage() {
  const store = useLeadStore();
  const { show } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const { isAdmin } = useAuth();

  const [view, setView] = useState<ViewMode>("list");
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState<string>("All");
  const [filterLeadType, setFilterLeadType] = useState<string>("All");
  const [filterLocation, setFilterLocation] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"date" | "name" | "technology">("date");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Table horizontal slide-bar controller
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [scrollPct, setScrollPct] = useState(0);

  const handleTableScroll = () => {
    if (!tableContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = tableContainerRef.current;
    const maxScroll = scrollWidth - clientWidth;
    if (maxScroll <= 0) {
      setScrollPct(0);
      return;
    }
    setScrollPct(Math.min(100, Math.max(0, Math.round((scrollLeft / maxScroll) * 100))));
  };

  const handleSlideChange = (pct: number) => {
    if (!tableContainerRef.current) return;
    const { scrollWidth, clientWidth } = tableContainerRef.current;
    const maxScroll = scrollWidth - clientWidth;
    tableContainerRef.current.scrollLeft = (pct / 100) * maxScroll;
    setScrollPct(pct);
  };

  const scrollByAmount = (amount: number) => {
    if (!tableContainerRef.current) return;
    tableContainerRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

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
    stage: "New Lead" as LeadStage,
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
      stage: form.stage || "New Lead",
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
      stage: "New Lead",
    });
    show(`Lead "${created.name}" created successfully.`);
  };

  // Bulk assignment state
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [bulkSalesPerson, setBulkSalesPerson] = useState("Krupal P.");
  const [bulkLeadPerson, setBulkLeadPerson] = useState("Yatri");

  const handleAssignSalesPerson = (leadId: string, salesPerson: string) => {
    store.updateLead(leadId, { salesPerson, owner: salesPerson });
    store.addActivity(leadId, {
      type: "assignment",
      title: "Sales Owner assigned",
      description: `Assigned sales owner to ${salesPerson}.`,
      author: "Support Admin",
    });
    show(`Lead assigned to ${salesPerson}.`);
  };

  const handleAssignLeadPerson = (leadId: string, leadPerson: string) => {
    store.updateLead(leadId, { leadPerson });
    store.addActivity(leadId, {
      type: "assignment",
      title: "Lead Sourcer assigned",
      description: `Assigned lead sourcer to ${leadPerson}.`,
      author: "Support Admin",
    });
    show(`Lead sourcer updated to ${leadPerson}.`);
  };

  const handleExecuteBulkAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (selected.size === 0) return;
    selected.forEach((id) => {
      store.updateLead(id, {
        salesPerson: bulkSalesPerson,
        owner: bulkSalesPerson,
        leadPerson: bulkLeadPerson,
      });
      store.addActivity(id, {
        type: "assignment",
        title: "Bulk lead assignment",
        description: `Assigned to Sales: ${bulkSalesPerson}, Sourcer: ${bulkLeadPerson}.`,
        author: "Support Admin",
      });
    });
    show(`Assigned ${selected.size} lead(s) to ${bulkSalesPerson} (Sourcer: ${bulkLeadPerson}).`);
    setShowBulkAssign(false);
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
    if (!isAdmin) {
      show("Export is restricted to Administrators only.");
      return;
    }
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
    const filename = `nexora-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    link.setAttribute("href", encoded);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    show(`Exported ${filtered.length} leads in exact staffing format.`);
    fetch("/api/crm/import-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        actionType: "Export",
        targetType: "Leads",
        sourceName: filename,
        addedCount: filtered.length,
        pagePath: "/leads",
        details: `Exported ${filtered.length} leads from /leads as CSV`,
      }),
    }).catch(() => {});
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
        {isAdmin && (
          <button className="btn ghost" onClick={handleExportCsv} title="Export leads as CSV (Admin Only)">
            ⬇ Export CSV
          </button>
        )}
        {selected.size > 0 && (
          <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            <button
              className="btn navy"
              onClick={() => setShowBulkAssign(true)}
              title="Assign selected leads to user"
            >
              👤 Assign {selected.size} selected
            </button>
            <button
              className="btn"
              style={{ background: "var(--bad)" }}
              onClick={handleBulkDelete}
              title="Delete selected leads"
            >
              Delete {selected.size} selected
            </button>
          </div>
        )}
      </div>

      {/* List View */}
      {view === "list" && (
        <div className="table-card">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <span className="big">◎</span>
              <h3>No leads found</h3>
              <p>Try adjusting your filters or create a new lead.</p>
            </div>
          ) : (
            <>
              <div
                ref={tableContainerRef}
                onScroll={handleTableScroll}
                className="table-scroll-wrapper"
              >
                <table className="leads-pro-table">
                  <thead>
                    <tr>
                      <th style={{ width: 48, minWidth: 48, textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={selected.size === filtered.length && filtered.length > 0}
                          onChange={toggleSelectAll}
                          style={{ width: "auto", cursor: "pointer" }}
                          aria-label="Select all leads"
                        />
                      </th>
                      <th style={{ width: 110, minWidth: 110 }}>Date</th>
                      <th style={{ width: 230, minWidth: 230 }}>Candidate Name</th>
                      <th style={{ width: 190, minWidth: 190 }}>Technology / Domain</th>
                      <th style={{ width: 140, minWidth: 140 }}>Location &amp; Visa</th>
                      <th style={{ width: 240, minWidth: 240 }}>Contact Details</th>
                      <th style={{ width: 120, minWidth: 120 }}>Lead Type</th>
                      <th style={{ width: 190, minWidth: 190 }}>Lead / Sales Person</th>
                      <th style={{ width: 180, minWidth: 180 }}>Stage</th>
                      <th style={{ width: 130, minWidth: 130, textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((lead) => {
                      const isSelected = selected.has(lead.id);
                      return (
                        <tr key={lead.id} className={isSelected ? "row-selected" : ""}>
                          <td style={{ textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(lead.id)}
                              style={{ width: "auto", cursor: "pointer" }}
                              aria-label={`Select ${lead.name}`}
                            />
                          </td>
                          <td style={{ whiteSpace: "nowrap", fontSize: 12.5, color: "var(--mu)", fontVariantNumeric: "tabular-nums" }}>
                            {lead.date || lead.createdAt.split("T")[0]}
                          </td>
                          <td>
                            <Link
                              href={`/leads/${lead.id}`}
                              style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}
                            >
                              <span className="av" style={{ background: "linear-gradient(135deg, #8FB8D8, #F26A21)", color: "#171717" }}>
                                {getInitials(lead.name)}
                              </span>
                              <div>
                                <span style={{ fontWeight: 700, color: "var(--tx)", fontSize: 13.5 }}>{lead.name}</span>
                                {lead.experience ? (
                                  <small style={{ color: "var(--mu)", display: "block", fontSize: 11.5, marginTop: 2 }}>
                                    💼 {lead.experience}
                                  </small>
                                ) : (
                                  <small style={{ color: "var(--mu)", display: "block", fontSize: 11.5, marginTop: 2 }}>
                                    Recruitment Lead
                                  </small>
                                )}
                              </div>
                            </Link>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: "var(--tx)" }}>
                              {lead.technology || lead.company || "General Tech"}
                            </div>
                            {lead.accountRef && (
                              <small style={{ color: "var(--mu)", display: "block", fontSize: 11.5, marginTop: 2 }}>
                                Ref: {lead.accountRef}
                              </small>
                            )}
                          </td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 500 }}>
                              <span>📍</span> {lead.location || "USA"}
                            </div>
                            {lead.visaStatus && (
                              <div style={{ marginTop: 4 }}>
                                <span className={getVisaBadgeClass(lead.visaStatus)}>
                                  {lead.visaStatus}
                                </span>
                              </div>
                            )}
                          </td>
                          <td>
                            {lead.phone ? (
                              <a href={`tel:${lead.phone}`} className="contact-link">
                                <span style={{ color: "var(--or)" }}>📞</span> {lead.phone}
                              </a>
                            ) : (
                              <span style={{ color: "var(--mu)", fontSize: 12 }}>📞 —</span>
                            )}
                            {lead.email ? (
                              <a
                                href={`mailto:${lead.email}`}
                                className="contact-link"
                                style={{ marginTop: 4, fontSize: 12, color: "var(--mu)" }}
                                title={lead.email}
                              >
                                <span>✉</span>
                                <span style={{ maxWidth: 190, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {lead.email}
                                </span>
                              </a>
                            ) : (
                              <span style={{ color: "var(--mu)", fontSize: 12, display: "block", marginTop: 4 }}>
                                ✉ —
                              </span>
                            )}
                          </td>
                          <td>
                            <span className={`pill ${getPillClass(lead.leadType || lead.temperature)}`} style={{ whiteSpace: "nowrap" }}>
                              {lead.leadType || lead.temperature || "Cold Lead"}
                            </span>
                          </td>
                          <td style={{ minWidth: 200 }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ color: "var(--mu)", fontSize: 11, minWidth: 46 }}>Sourcer:</span>
                                <select
                                  value={lead.leadPerson || "Yatri"}
                                  onChange={(e) => handleAssignLeadPerson(lead.id, e.target.value)}
                                  style={{
                                    fontSize: 11.5,
                                    padding: "3px 6px",
                                    width: "auto",
                                    borderRadius: 6,
                                    background: "var(--bg)",
                                    border: "1px solid var(--bd)",
                                    cursor: "pointer",
                                  }}
                                  title="Assign Lead Sourcer"
                                >
                                  {LEAD_PERSONS.map((p) => (
                                    <option key={p} value={p}>
                                      {p}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ color: "var(--mu)", fontSize: 11, minWidth: 46 }}>Sales:</span>
                                <select
                                  value={lead.salesPerson || lead.owner || "Krupal P."}
                                  onChange={(e) => handleAssignSalesPerson(lead.id, e.target.value)}
                                  style={{
                                    fontSize: 11.5,
                                    padding: "3px 6px",
                                    width: "auto",
                                    borderRadius: 6,
                                    background: "var(--bg)",
                                    border: "1px solid var(--bd)",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                  }}
                                  title="Assign Sales Person / Owner"
                                >
                                  {SALES_PERSONS.map((p) => (
                                    <option key={p} value={p}>
                                      {p}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div style={{ position: "relative", display: "inline-block" }}>
                              <select
                                value={lead.stage}
                                onChange={(e) => {
                                  const newStage = e.target.value as LeadStage;
                                  store.changeStage(lead.id, newStage, "Krupal P.");
                                  show(`Stage updated to "${newStage}" for ${lead.name}`);
                                }}
                                className={`pill ${getPillClass(lead.stage)}`}
                                style={{
                                  border: "1px solid var(--bd)",
                                  cursor: "pointer",
                                  fontWeight: 700,
                                  fontSize: 12,
                                  padding: "5px 24px 5px 10px",
                                  appearance: "none",
                                  WebkitAppearance: "none",
                                  backgroundImage: "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")",
                                  backgroundRepeat: "no-repeat",
                                  backgroundPosition: "right 6px center",
                                  backgroundSize: "12px",
                                  width: "auto",
                                  whiteSpace: "nowrap",
                                }}
                                title="Click to update lead stage"
                              >
                                {LEAD_STAGES.map((s) => (
                                  <option key={s} value={s} style={{ color: "var(--tx)", background: "var(--card)" }}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>
                          <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                            <div style={{ display: "inline-flex", gap: 5 }}>
                              <Link
                                href={`/leads/${lead.id}`}
                                className="btn ghost"
                                style={{ padding: "5px 10px", fontSize: 12, textDecoration: "none" }}
                              >
                                View
                              </Link>
                              <button
                                className="btn ghost"
                                style={{ padding: "5px 8px", fontSize: 12 }}
                                onClick={() => handleDuplicate(lead)}
                                title="Duplicate Lead"
                              >
                                ⧉
                              </button>
                              <button
                                className="btn ghost"
                                style={{ padding: "5px 8px", fontSize: 12, color: "var(--bad)" }}
                                onClick={() => handleDelete(lead)}
                                title="Delete Lead"
                              >
                                ✕
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Dedicated Slide Bar at the bottom */}
              <div className="table-footer-slide-bar">
                <div className="slide-bar-info">
                  <span className="slide-bar-counter">
                    {selected.size > 0 ? (
                      <span style={{ color: "var(--or)" }}>
                        <b>{selected.size}</b> of {filtered.length} leads selected
                      </span>
                    ) : (
                      <span>
                        Showing <b>{filtered.length}</b> leads • 10 columns
                      </span>
                    )}
                  </span>
                  <span className="slide-bar-hint">
                    ↔ Slide horizontally to view all columns
                  </span>
                </div>

                <div className="slide-bar-controls">
                  <button
                    type="button"
                    className="slide-btn"
                    onClick={() => scrollByAmount(-350)}
                    title="Slide table left"
                    disabled={scrollPct <= 0}
                  >
                    ◀ Slide Left
                  </button>

                  <div className="slide-track-wrapper">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={scrollPct}
                      onChange={(e) => handleSlideChange(Number(e.target.value))}
                      className="table-range-slider"
                      title="Drag to slide across columns"
                      aria-label="Table horizontal scroll slider"
                    />
                    <span className="slide-pct-label">{scrollPct}%</span>
                  </div>

                  <button
                    type="button"
                    className="slide-btn"
                    onClick={() => scrollByAmount(350)}
                    title="Slide table right"
                    disabled={scrollPct >= 100}
                  >
                    Slide Right ▶
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Kanban View */}
      {view === "kanban" && (
        <>
          {/* Quick Stage Jump Navigation */}
          <div style={{ marginBottom: 12, display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6 }}>
            <span style={{ fontSize: 12, color: "var(--mu)", alignSelf: "center", whiteSpace: "nowrap", marginRight: 4 }}>
              Jump to:
            </span>
            {LEAD_STAGES.map((stage) => {
              const count = filtered.filter((l) => l.stage === stage).length;
              return (
                <button
                  key={stage}
                  type="button"
                  className="btn ghost"
                  style={{ fontSize: 11, padding: "3px 8px", whiteSpace: "nowrap" }}
                  onClick={() => {
                    const el = document.getElementById(`kanban-col-${stage.replace(/\s+/g, "-")}`);
                    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
                  }}
                >
                  {stage}
                  <span className={`pill ${getPillClass(stage)}`} style={{ marginLeft: 4, fontSize: 10, padding: "1px 5px" }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="kanban">
            {LEAD_STAGES.map((stage) => {
              const list = filtered.filter((l) => l.stage === stage);
              return (
                <div
                  key={stage}
                  id={`kanban-col-${stage.replace(/\s+/g, "-")}`}
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
                    <span className={`pill ${getPillClass(stage)}`}>{list.length}</span>
                  </h4>
                  {list.length === 0 ? (
                    <div style={{ color: "var(--mu)", fontSize: 12, textAlign: "center", padding: "30px 10px", fontStyle: "italic" }}>
                      Drop leads here
                    </div>
                  ) : (
                    list.map((lead) => (
                      <div
                        key={lead.id}
                        className="kanban-card"
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("text/plain", lead.id)}
                        style={{ cursor: "grab" }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                          <Link
                            href={`/leads/${lead.id}`}
                            style={{ fontWeight: 700, fontSize: 13, textDecoration: "none", color: "inherit" }}
                          >
                            {lead.name}
                          </Link>
                          <span
                            className={`pill ${getPillClass(lead.leadType || lead.temperature)}`}
                            style={{ fontSize: 9, padding: "2px 6px" }}
                          >
                            {lead.leadType || lead.temperature}
                          </span>
                        </div>
                        <small style={{ display: "block", color: "var(--mu)", marginTop: 2 }}>
                          {lead.technology || lead.company}
                        </small>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: "var(--mu)" }}>
                          <span>📍 {lead.location}</span>
                          {lead.visaStatus && <span className="pill" style={{ fontSize: 10 }}>{lead.visaStatus}</span>}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, paddingTop: 6, borderTop: "1px solid var(--bd)" }}>
                          <span style={{ fontSize: 10, color: "var(--mu)" }}>
                            👤 {lead.salesPerson || lead.owner}
                          </span>
                          <select
                            value={lead.stage}
                            onChange={(e) => {
                              const target = e.target.value as LeadStage;
                              store.changeStage(lead.id, target, "Krupal P.");
                              show(`Moved ${lead.name} to ${target}`);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              fontSize: 10,
                              padding: "2px 4px",
                              width: "auto",
                              borderRadius: 4,
                              border: "1px solid var(--bd)",
                              background: "var(--bg)",
                            }}
                            title="Move stage"
                          >
                            {LEAD_STAGES.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </>
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
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Initial Lead Stage</label>
              <select
                value={form.stage}
                onChange={(e) => setForm({ ...form, stage: e.target.value as LeadStage })}
              >
                {LEAD_STAGES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
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

      {/* Bulk Assign Modal */}
      <Modal open={showBulkAssign} onClose={() => setShowBulkAssign(false)} title={`Assign ${selected.size} Selected Lead(s)`}>
        <form onSubmit={handleExecuteBulkAssign}>
          <p style={{ color: "var(--mu)", fontSize: 13, margin: "0 0 16px" }}>
            Reassign ownership and sourcing accountability for all <b>{selected.size}</b> selected candidate leads.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 700, display: "block", marginBottom: 6 }}>
                Assign Sales Person / Account Owner
              </label>
              <select
                value={bulkSalesPerson}
                onChange={(e) => setBulkSalesPerson(e.target.value)}
                style={{ width: "100%", padding: "10px", fontSize: 13.5 }}
              >
                {SALES_PERSONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12.5, fontWeight: 700, display: "block", marginBottom: 6 }}>
                Assign Lead Sourcer (Recruiter)
              </label>
              <select
                value={bulkLeadPerson}
                onChange={(e) => setBulkLeadPerson(e.target.value)}
                style={{ width: "100%", padding: "10px", fontSize: 13.5 }}
              >
                {LEAD_PERSONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
              <button type="button" className="btn ghost" onClick={() => setShowBulkAssign(false)}>
                Cancel
              </button>
              <button type="submit" className="btn navy">
                Confirm Assignment ({selected.size})
              </button>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog />
    </CrmShell>
  );
}
