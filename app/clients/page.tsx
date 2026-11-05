"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { CrmShell } from "@/components/crm-shell";
import { useClientStore, type CrmClient } from "@/lib/crm/client-store";
import { useJobStore } from "@/lib/crm/job-store";
import { useToast } from "@/lib/crm/toast-context";
import { getInitials, getPillClass } from "@/lib/crm/sample-data";
import { Modal, useConfirm } from "@/components/ui";

const INDUSTRIES = ["Technology", "Healthcare", "Finance", "Retail", "Logistics", "Manufacturing", "Other"];
const STATUSES = ["Active", "Prospect", "On hold"] as const;
const OWNERS = ["Krupal P.", "Priya S.", "Rahul K.", "Amit D.", "Meera N."];

export default function ClientsPage() {
  const store = useClientStore();
  const jobStore = useJobStore();
  const { show } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedClient, setSelectedClient] = useState<CrmClient | null>(null);

  // Form State
  const [form, setForm] = useState({
    name: "",
    industry: "Technology",
    status: "Active" as (typeof STATUSES)[number],
    owner: "Krupal P.",
    contactPerson: "",
    contactEmail: "",
    contactPhone: "",
    city: "Ahmedabad",
    website: "",
  });

  const filteredClients = useMemo(() => {
    return store.clients.filter((c) => {
      if (filterStatus !== "All" && c.status !== filterStatus) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchInd = c.industry.toLowerCase().includes(q);
        const matchPerson = c.contactPerson?.toLowerCase().includes(q);
        const matchCity = c.city?.toLowerCase().includes(q);
        if (!matchName && !matchInd && !matchPerson && !matchCity) return false;
      }
      return true;
    });
  }, [store.clients, filterStatus, search]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      show("Client company name is required.");
      return;
    }

    const created = store.createClient({
      name: form.name.trim(),
      industry: form.industry,
      status: form.status,
      owner: form.owner,
      contactPerson: form.contactPerson.trim(),
      contactEmail: form.contactEmail.trim(),
      contactPhone: form.contactPhone.trim(),
      city: form.city.trim(),
      website: form.website.trim(),
    });

    setShowCreate(false);
    setForm({
      name: "",
      industry: "Technology",
      status: "Active",
      owner: "Krupal P.",
      contactPerson: "",
      contactEmail: "",
      contactPhone: "",
      city: "Ahmedabad",
      website: "",
    });
    show(`Client company "${created.name}" created.`);
  };

  const handleDelete = async (client: CrmClient) => {
    const ok = await confirm(`Remove client "${client.name}"?`);
    if (ok) {
      store.deleteClient(client.id);
      show(`"${client.name}" removed.`);
      if (selectedClient?.id === client.id) setSelectedClient(null);
    }
  };

  const exportCsv = () => {
    if (filteredClients.length === 0) {
      show("No clients to export.");
      return;
    }
    const headers = ["Client Name", "Industry", "Status", "Open Jobs", "Owner", "Contact Person", "Email", "Phone", "City"];
    const rows = filteredClients.map((c) => [
      `"${c.name}"`,
      `"${c.industry}"`,
      `"${c.status}"`,
      c.openJobs,
      `"${c.owner}"`,
      `"${c.contactPerson || ""}"`,
      `"${c.contactEmail || ""}"`,
      `"${c.contactPhone || ""}"`,
      `"${c.city || ""}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encoded = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encoded);
    link.setAttribute("download", `nexora-clients-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    show(`Exported ${filteredClients.length} clients.`);
  };

  return (
    <CrmShell>
      <div className="page-top">
        <div>
          <h1>Client Directory</h1>
          <p className="page-sub">
            Corporate hiring partners and managed staffing accounts.
          </p>
        </div>
        <button className="btn" onClick={() => setShowCreate(true)}>
          + New client
        </button>
      </div>

      {/* Toolbar */}
      <div className="tools">
        <input
          placeholder="Search by company, industry, contact person…"
          style={{ width: "auto", minWidth: 260 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="All">All statuses ({store.clients.length})</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s} ({store.clients.filter((c) => c.status === s).length})
            </option>
          ))}
        </select>
        <button className="btn ghost" onClick={exportCsv}>
          ⬇ Export CSV
        </button>
      </div>

      {/* Table */}
      {filteredClients.length === 0 ? (
        <div className="card empty-state">
          <span className="big">▣</span>
          <h3>No client accounts found</h3>
          <p>Try clearing your search query or add a new client.</p>
        </div>
      ) : (
        <div className="card tbl">
          <table>
            <thead>
              <tr>
                <th>Client Company</th>
                <th>Industry</th>
                <th>Status</th>
                <th>Active Openings</th>
                <th>Primary Contact</th>
                <th>Account Owner</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => {
                const liveJobs = jobStore.jobs.filter((j) => j.client === client.name && j.status === "Open").length;
                return (
                  <tr key={client.id}>
                    <td>
                      <div>
                        <b>{client.name}</b>
                        {client.city && <span style={{ color: "var(--mu)", fontSize: 12, display: "block" }}>📍 {client.city}</span>}
                      </div>
                    </td>
                    <td>{client.industry}</td>
                    <td>
                      <select
                        value={client.status}
                        onChange={(e) => {
                          store.updateClient(client.id, { status: e.target.value as (typeof STATUSES)[number] });
                          show(`Status updated for ${client.name}`);
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
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <Link href="/jobs" style={{ fontWeight: 600, color: "var(--bl)", textDecoration: "none" }}>
                        {liveJobs || client.openJobs} open jobs →
                      </Link>
                    </td>
                    <td>
                      <div>{client.contactPerson || "—"}</div>
                      <small style={{ color: "var(--mu)" }}>{client.contactEmail}</small>
                    </td>
                    <td>
                      <span className="av" style={{ width: 22, height: 22, fontSize: 10 }}>
                        {getInitials(client.owner)}
                      </span>
                      {client.owner}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <button
                          className="btn ghost"
                          style={{ fontSize: 12, padding: "5px 10px" }}
                          onClick={() => setSelectedClient(client)}
                        >
                          View Details
                        </button>
                        <button
                          className="btn ghost"
                          style={{ fontSize: 12, padding: "5px 8px", color: "var(--bad)" }}
                          onClick={() => handleDelete(client)}
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* New Client Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Client Company">
        <form onSubmit={handleCreate}>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Company Name *</label>
                <input
                  required
                  placeholder="e.g. Acme Tech Solutions"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Industry</label>
                <select
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                >
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as (typeof STATUSES)[number] })}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Account Owner</label>
                <select
                  value={form.owner}
                  onChange={(e) => setForm({ ...form, owner: e.target.value })}
                >
                  {OWNERS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Contact Person</label>
                <input
                  placeholder="e.g. Rajesh Shah (HR Lead)"
                  value={form.contactPerson}
                  onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Contact Email</label>
                <input
                  type="email"
                  placeholder="hr@company.com"
                  value={form.contactEmail}
                  onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Contact Phone</label>
                <input
                  placeholder="+91 98000 00000"
                  value={form.contactPhone}
                  onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>City / Location</label>
                <input
                  placeholder="Ahmedabad"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Website</label>
              <input
                placeholder="https://company.com"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
              />
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
              <button type="button" className="btn ghost" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
              <button type="submit" className="btn">
                Create Client
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Client Detail Modal */}
      {selectedClient && (
        <Modal
          open={!!selectedClient}
          onClose={() => setSelectedClient(null)}
          title={`Client: ${selectedClient.name}`}
        >
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0 }}>{selectedClient.name}</h3>
                <span style={{ color: "var(--mu)" }}>{selectedClient.industry} · {selectedClient.city}</span>
              </div>
              <span className={`pill ${getPillClass(selectedClient.status)}`}>{selectedClient.status}</span>
            </div>

            <div className="card" style={{ padding: 12 }}>
              <b>Account &amp; Contact Info</b>
              <div className="row" style={{ marginTop: 8 }}>
                <span>Account Manager</span>
                <b>{selectedClient.owner}</b>
              </div>
              <div className="row">
                <span>Primary Contact</span>
                <span>{selectedClient.contactPerson || "—"}</span>
              </div>
              <div className="row">
                <span>Email</span>
                <span style={{ color: "var(--bl)" }}>{selectedClient.contactEmail || "—"}</span>
              </div>
              <div className="row">
                <span>Phone</span>
                <span>{selectedClient.contactPhone || "—"}</span>
              </div>
              {selectedClient.website && (
                <div className="row">
                  <span>Website</span>
                  <a
                    href={selectedClient.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--bl)" }}
                  >
                    {selectedClient.website} ↗
                  </a>
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Link
                href="/jobs"
                className="btn ghost"
                style={{ textDecoration: "none", fontSize: 13 }}
                onClick={() => setSelectedClient(null)}
              >
                ✦ View Open Requisitions ({jobStore.jobs.filter((j) => j.client === selectedClient.name).length})
              </Link>
              <button className="btn" onClick={() => setSelectedClient(null)}>
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog />
    </CrmShell>
  );
}
