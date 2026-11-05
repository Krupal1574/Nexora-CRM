"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { CrmShell } from "@/components/crm-shell";
import { useLeadStore } from "@/lib/crm/lead-store";
import { useCandidateStore } from "@/lib/crm/candidate-store";
import { useToast } from "@/lib/crm/toast-context";
import { Modal } from "@/components/ui";

export default function NotesPage() {
  const leadStore = useLeadStore();
  const candStore = useCandidateStore();
  const { show } = useToast();

  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    targetType: "lead" as "lead" | "candidate",
    targetId: leadStore.leads[0]?.id || "",
    content: "",
  });

  const allNotes = useMemo(() => {
    const list: {
      id: string;
      subject: string;
      content: string;
      author: string;
      time: string;
      href: string;
      badge: string;
    }[] = [];

    leadStore.leads.forEach((l) => {
      l.notes.forEach((n) => {
        list.push({
          id: `lead-note-${n.id}`,
          subject: `${l.name} (${l.company})`,
          content: n.text,
          author: n.author,
          time: new Date(n.createdAt).toLocaleDateString(),
          href: `/leads/${l.id}`,
          badge: "Lead",
        });
      });
    });

    candStore.candidates.forEach((c) => {
      c.notes.forEach((n) => {
        list.push({
          id: `cand-note-${n.id}`,
          subject: `${c.name} – ${c.role}`,
          content: n.text,
          author: n.author,
          time: new Date(n.createdAt).toLocaleDateString(),
          href: `/candidates/${c.id}`,
          badge: "Candidate",
        });
      });
    });

    return list.filter((n) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return n.subject.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
    });
  }, [leadStore.leads, candStore.candidates, search]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.content.trim()) {
      show("Note content is required.");
      return;
    }

    if (form.targetType === "lead") {
      leadStore.addNote(form.targetId, form.content.trim(), "Krupal P.");
      show("Note attached to lead.");
    } else {
      candStore.addNote(form.targetId, form.content.trim(), "Krupal P.");
      show("Note attached to candidate.");
    }

    setShowCreate(false);
    setForm({ ...form, content: "" });
  };

  return (
    <CrmShell>
      <div className="page-top">
        <div>
          <h1>Context Notes</h1>
          <p className="page-sub">
            Internal recruiter notes attached to prospect leads and talent profiles.
          </p>
        </div>
        <button className="btn" onClick={() => setShowCreate(true)}>
          + Add note
        </button>
      </div>

      <div className="tools">
        <input
          placeholder="Search notes by keyword or subject…"
          style={{ width: "auto", minWidth: 280 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {allNotes.length === 0 ? (
        <div className="card empty-state">
          <span className="big">✎</span>
          <h3>No notes recorded</h3>
          <p>Notes you add to lead or candidate profiles will appear here.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {allNotes.map((n) => (
            <div key={n.id} className="card note" style={{ padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div>
                  <Link href={n.href} style={{ fontWeight: 700, fontSize: 15, color: "inherit", textDecoration: "none" }}>
                    {n.subject}
                  </Link>
                  <span className={`pill ${n.badge === "Lead" ? "or" : "ok"}`} style={{ marginLeft: 8, fontSize: 11 }}>
                    {n.badge}
                  </span>
                </div>
                <small style={{ color: "var(--mu)" }}>
                  {n.author} · {n.time}
                </small>
              </div>
              <p style={{ margin: 0, color: "var(--tx)", lineHeight: 1.5 }}>{n.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Add Note Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Record Recruiter Note">
        <form onSubmit={handleCreate}>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Entity Type</label>
                <select
                  value={form.targetType}
                  onChange={(e) => {
                    const t = e.target.value as "lead" | "candidate";
                    setForm({
                      ...form,
                      targetType: t,
                      targetId: t === "lead" ? leadStore.leads[0]?.id || "" : candStore.candidates[0]?.id || "",
                    });
                  }}
                >
                  <option value="lead">Prospect Lead</option>
                  <option value="candidate">Candidate Profile</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Select Record</label>
                <select
                  value={form.targetId}
                  onChange={(e) => setForm({ ...form, targetId: e.target.value })}
                >
                  {form.targetType === "lead"
                    ? leadStore.leads.map((l) => (
                        <option key={l.id} value={l.id}>{l.name} ({l.company})</option>
                      ))
                    : candStore.candidates.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} – {c.role}</option>
                      ))}
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Note Content *</label>
              <textarea
                required
                rows={4}
                placeholder="Screening feedback, conversation context, rate negotiations…"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" className="btn ghost" onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="submit" className="btn">Save Note</button>
            </div>
          </div>
        </form>
      </Modal>
    </CrmShell>
  );
}
