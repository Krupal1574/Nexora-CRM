"use client";
import { useState, useMemo } from "react";
import { CrmShell } from "@/components/crm-shell";
import { useLeadStore, LEAD_STAGES, type CrmLead, type LeadStage } from "@/lib/crm/lead-store";
import { useToast } from "@/lib/crm/toast-context";
import { getInitials, getPillClass } from "@/lib/crm/sample-data";
import { Modal, useConfirm } from "@/components/ui";
import Link from "next/link";

type ViewMode = "list" | "kanban";

const SOURCES = ["Referral", "Website", "Cold outreach", "Event", "LinkedIn", "Other"];
const OWNERS = ["Krupal P.", "Priya S.", "Rahul K.", "Amit D.", "Meera N."];
const TEMPS: ("Hot" | "Warm" | "New")[] = ["Hot", "Warm", "New"];

export default function LeadsPage() {
  const store = useLeadStore();
  const { show } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const [view, setView] = useState<ViewMode>("list");
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState<string>("All");
  const [filterTemp, setFilterTemp] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"name" | "company" | "createdAt">("createdAt");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "", company: "", source: "Referral", temperature: "New" as "Hot" | "Warm" | "New",
    owner: "Krupal P.", value: "", phone: "", email: "",
  });

  // Filtered & sorted leads
  const filtered = useMemo(() => {
    let list = store.leads;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.company.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q)
      );
    }
    if (filterStage !== "All") list = list.filter((l) => l.stage === filterStage);
    if (filterTemp !== "All") list = list.filter((l) => l.temperature === filterTemp);
    list = [...list].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "company") return a.company.localeCompare(b.company);
      return b.createdAt.localeCompare(a.createdAt);
    });
    return list;
  }, [store.leads, search, filterStage, filterTemp, sortBy]);

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

  const handleCreate = () => {
    if (!form.name.trim()) { show("Name is required."); return; }
    store.createLead({
      ...form,
      stage: "New",
      profileUrls: [],
      tags: [],
    });
    setShowCreate(false);
    setForm({ name: "", company: "", source: "Referral", temperature: "New", owner: "Krupal P.", value: "", phone: "", email: "" });
    show(`Lead "${form.name}" created.`);
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    const ok = await confirm(`Delete ${selected.size} lead(s)? This cannot be undone.`);
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
    const ok = await confirm(`Delete "${lead.name}"? This cannot be undone.`);
    if (ok) {
      store.deleteLead(lead.id);
      show(`"${lead.name}" deleted.`);
    }
  };

  const handleExportCsv = () => {
    const headers = "Name,Company,Email,Phone,Source,Temperature,Stage,Owner,Value\n";
    const rows = filtered
      .map((l) => `"${l.name}","${l.company}","${l.email}","${l.phone}","${l.source}","${l.temperature}","${l.stage}","${l.owner}","${l.value}"`)
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nexora-leads.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    show("Leads exported to CSV.");
  };

  return (
    <CrmShell>
      {/* Header */}
      <div className="page-top">
        <div>
          <h1>Leads</h1>
          <p className="page-sub">Capture, qualify, assign, and convert prospects. {store.leads.length} lead(s) total.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => setShowCreate(true)}>+ New lead</button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="tools">
        <input
          placeholder="Search by name, company, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "auto", minWidth: 220 }}
        />
        <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)}>
          <option value="All">All stages</option>
          {LEAD_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterTemp} onChange={(e) => setFilterTemp(e.target.value)}>
          <option value="All">All temps</option>
          {TEMPS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}>
          <option value="createdAt">Newest first</option>
          <option value="name">Name A-Z</option>
          <option value="company">Company A-Z</option>
        </select>
        <div className="view-toggle">
          <button className={view === "list" ? "active" : ""} onClick={() => setView("list")}>☰ List</button>
          <button className={view === "kanban" ? "active" : ""} onClick={() => setView("kanban")}>▦ Kanban</button>
        </div>
        <button className="btn ghost" onClick={handleExportCsv}>⬇ Export CSV</button>
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
                  <th>Contact</th>
                  <th>Company</th>
                  <th>Source</th>
                  <th>Temp</th>
                  <th>Stage</th>
                  <th>Owner</th>
                  <th>Value</th>
                  <th>Actions</th>
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
                    <td>
                      <Link href={`/leads/${lead.id}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="av">{getInitials(lead.name)}</span>
                        <span style={{ fontWeight: 600 }}>{lead.name}</span>
                      </Link>
                    </td>
                    <td>{lead.company}</td>
                    <td>{lead.source}</td>
                    <td><span className={`pill ${getPillClass(lead.temperature)}`}>{lead.temperature}</span></td>
                    <td><span className={`pill ${getPillClass(lead.stage)}`}>{lead.stage}</span></td>
                    <td>{lead.owner}</td>
                    <td>{lead.value}</td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <Link href={`/leads/${lead.id}`} className="btn ghost" style={{ padding: "5px 8px", fontSize: 12 }}>View</Link>
                        <button className="btn ghost" style={{ padding: "5px 8px", fontSize: 12 }} onClick={() => handleDuplicate(lead)}>Dup</button>
                        <button className="btn ghost" style={{ padding: "5px 8px", fontSize: 12, color: "var(--bad)" }} onClick={() => handleDelete(lead)}>✕</button>
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
            const items = filtered.filter((l) => l.stage === stage);
            return (
              <div
                key={stage}
                className="kanban-col"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/plain");
                  store.changeStage(id, stage, "Krupal P.");
                }}
              >
                <h4>
                  <span>{stage}</span>
                  <span className="pill">{items.length}</span>
                </h4>
                {items.map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/leads/${lead.id}`}
                    className="kanban-card"
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", lead.id)}
                    style={{ cursor: "grab", display: "block", textDecoration: "none" }}
                  >
                    <b>{lead.name}</b>
                    <br />
                    <small>{lead.company}</small>
                    <br />
                    <span className={`pill ${getPillClass(lead.temperature)}`} style={{ marginTop: 4, display: "inline-block" }}>
                      {lead.temperature}
                    </span>{" "}
                    <small style={{ color: "var(--mu)" }}>{lead.value}</small>
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Lead Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create new lead" width={520}>
        <div style={{ display: "grid", gap: 10 }}>
          <input placeholder="Full name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
              {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value as "Hot" | "Warm" | "New" })}>
              {TEMPS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <select value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })}>
              {OWNERS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <input placeholder="Deal value (e.g. ₹5L)" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <button className="btn ghost" onClick={() => setShowCreate(false)}>Cancel</button>
            <button className="btn" onClick={handleCreate}>Create lead</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog />
    </CrmShell>
  );
}
