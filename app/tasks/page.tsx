"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { CrmShell } from "@/components/crm-shell";
import { useTaskStore, type CrmTask, type TaskCategory, type TaskPriority } from "@/lib/crm/task-store";
import { useLeadStore } from "@/lib/crm/lead-store";
import { useCandidateStore } from "@/lib/crm/candidate-store";
import { useToast } from "@/lib/crm/toast-context";
import { Modal, useConfirm } from "@/components/ui";

const CATEGORIES: TaskCategory[] = ["Task", "Call", "Interview", "Meeting", "Reminder"];
const PRIORITIES: TaskPriority[] = ["High", "Med", "Low"];
const OWNERS = ["Krupal P.", "Priya S.", "Rahul K.", "Amit D.", "Meera N."];

export default function TasksPage() {
  const store = useTaskStore();
  const leadStore = useLeadStore();
  const candStore = useCandidateStore();
  const { show } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [filterCat, setFilterCat] = useState<string>("All");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "completed">("all");
  const [filterOwner, setFilterOwner] = useState<string>("All");
  const [showCreate, setShowCreate] = useState(false);

  // Form State
  const [form, setForm] = useState({
    text: "",
    category: "Task" as TaskCategory,
    dueDate: new Date().toISOString().split("T")[0],
    dueTime: "11:00 AM",
    priority: "High" as TaskPriority,
    assignedTo: "Krupal P.",
    relatedType: "none" as "none" | "lead" | "candidate",
    relatedId: "",
  });

  const filteredTasks = useMemo(() => {
    return store.tasks.filter((t) => {
      if (filterCat !== "All" && t.category !== filterCat) return false;
      if (filterStatus === "pending" && t.done) return false;
      if (filterStatus === "completed" && !t.done) return false;
      if (filterOwner !== "All" && t.assignedTo !== filterOwner) return false;
      return true;
    });
  }, [store.tasks, filterCat, filterStatus, filterOwner]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.text.trim()) {
      show("Task description is required.");
      return;
    }

    let relatedTo: CrmTask["relatedTo"] = undefined;
    if (form.relatedType === "lead" && form.relatedId) {
      const l = leadStore.getLead(form.relatedId);
      if (l) relatedTo = { type: "lead", id: l.id, name: `${l.name} (${l.company})` };
    } else if (form.relatedType === "candidate" && form.relatedId) {
      const c = candStore.getCandidate(form.relatedId);
      if (c) relatedTo = { type: "candidate", id: c.id, name: c.name };
    }

    const created = store.createTask({
      text: form.text.trim(),
      category: form.category,
      dueDate: form.dueDate,
      dueTime: form.dueTime,
      due: form.dueDate === new Date().toISOString().split("T")[0] ? "Today" : form.dueDate,
      priority: form.priority,
      assignedTo: form.assignedTo,
      relatedTo,
    });

    setShowCreate(false);
    setForm({
      text: "",
      category: "Task",
      dueDate: new Date().toISOString().split("T")[0],
      dueTime: "11:00 AM",
      priority: "High",
      assignedTo: "Krupal P.",
      relatedType: "none",
      relatedId: "",
    });
    show(`Activity "${created.text}" scheduled.`);
  };

  const handleDelete = async (task: CrmTask) => {
    const ok = await confirm(`Delete activity "${task.text}"?`);
    if (ok) {
      store.deleteTask(task.id);
      show("Task deleted.");
    }
  };

  // Group tasks by date for calendar view
  const calendarDays = useMemo(() => {
    const days: { dateStr: string; label: string; tasks: CrmTask[] }[] = [];
    const today = new Date();
    for (let i = -1; i <= 5; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      const label =
        i === -1
          ? "Yesterday"
          : i === 0
          ? "Today"
          : i === 1
          ? "Tomorrow"
          : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      const dayTasks = store.tasks.filter((t) => t.dueDate === dateStr);
      days.push({ dateStr, label, tasks: dayTasks });
    }
    return days;
  }, [store.tasks]);

  return (
    <CrmShell>
      <div className="page-top">
        <div>
          <h1>Activities, Follow-ups &amp; Tasks</h1>
          <p className="page-sub">
            Track daily recruiter actions, interview schedules, calls, and follow-ups.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div className="view-toggle">
            <button
              className={`view-btn ${viewMode === "list" ? "active" : ""}`}
              onClick={() => setViewMode("list")}
            >
              ☰ List
            </button>
            <button
              className={`view-btn ${viewMode === "calendar" ? "active" : ""}`}
              onClick={() => setViewMode("calendar")}
            >
              📅 Schedule
            </button>
          </div>
          <button className="btn" onClick={() => setShowCreate(true)}>
            + Schedule Activity
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="tools">
        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
          <option value="All">All activity types</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}>
          <option value="all">All statuses ({store.tasks.length})</option>
          <option value="pending">Pending ({store.tasks.filter((t) => !t.done).length})</option>
          <option value="completed">Completed ({store.tasks.filter((t) => t.done).length})</option>
        </select>
        <select value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)}>
          <option value="All">All recruiters</option>
          {OWNERS.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </div>

      {viewMode === "list" ? (
        /* List View */
        <div className="card">
          {filteredTasks.length === 0 ? (
            <div className="empty-state" style={{ padding: "30px 0" }}>
              <big>✓</big>
              <h3>No tasks found</h3>
              <p>You’re all caught up or no tasks match your filters.</p>
            </div>
          ) : (
            <div style={{ display: "grid" }}>
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="row sw-row"
                  style={{
                    padding: "12px 0",
                    borderBottom: "1px solid var(--bd)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", flex: 1 }}>
                    <input
                      type="checkbox"
                      checked={task.done}
                      onChange={() => {
                        store.toggleTask(task.id);
                        show(`Task ${task.done ? "re-opened" : "completed"}!`);
                      }}
                    />
                    <div>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          textDecoration: task.done ? "line-through" : "none",
                          opacity: task.done ? 0.6 : 1,
                        }}
                      >
                        {task.text}
                      </span>
                      <div style={{ color: "var(--mu)", fontSize: 12, marginTop: 2, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span>👤 {task.assignedTo}</span>
                        {task.dueTime && <span>⏰ {task.dueTime}</span>}
                        {task.relatedTo && (
                          <Link
                            href={task.relatedTo.type === "lead" ? `/leads/${task.relatedTo.id}` : `/candidates/${task.relatedTo.id}`}
                            style={{ color: "var(--bl)", textDecoration: "none" }}
                          >
                            🔗 {task.relatedTo.name}
                          </Link>
                        )}
                      </div>
                    </div>
                  </label>

                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span className="pill">{task.category}</span>
                    <span className={`pill ${task.priority === "High" ? "bad" : "or"}`}>{task.priority}</span>
                    <span className="pill ok">{task.due}</span>
                    <button
                      className="btn ghost"
                      style={{ fontSize: 11, padding: "3px 6px", color: "var(--bad)" }}
                      onClick={() => handleDelete(task)}
                      title="Delete activity"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Calendar / Schedule View */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          {calendarDays.map((day) => (
            <div
              key={day.dateStr}
              className="card"
              style={{
                minHeight: 280,
                background: day.label === "Today" ? "var(--card)" : "var(--bg)",
                borderTop: day.label === "Today" ? "3px solid var(--or)" : "1px solid var(--bd)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <b>{day.label}</b>
                <span className="pill" style={{ fontSize: 10 }}>{day.tasks.length}</span>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {day.tasks.length === 0 ? (
                  <small style={{ color: "var(--mu)", fontStyle: "italic" }}>No activities</small>
                ) : (
                  day.tasks.map((t) => (
                    <div
                      key={t.id}
                      style={{
                        background: "var(--card)",
                        padding: 8,
                        borderRadius: 6,
                        border: "1px solid var(--bd)",
                        borderLeft: `3px solid ${t.priority === "High" ? "var(--bad)" : "var(--or)"}`,
                        fontSize: 12,
                      }}
                    >
                      <div style={{ fontWeight: 600, textDecoration: t.done ? "line-through" : "none" }}>
                        {t.text}
                      </div>
                      <div style={{ color: "var(--mu)", fontSize: 11, marginTop: 4 }}>
                        {t.category} · {t.dueTime || t.assignedTo}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Schedule Activity Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Schedule Recruiter Activity">
        <form onSubmit={handleCreate}>
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                Activity Description *
              </label>
              <input
                required
                placeholder="e.g. Technical Round 1 with Lead Architect"
                value={form.text}
                onChange={(e) => setForm({ ...form, text: e.target.value })}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Type</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as TaskCategory })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Due Date</label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Time</label>
                <input
                  placeholder="e.g. 02:30 PM"
                  value={form.dueTime}
                  onChange={(e) => setForm({ ...form, dueTime: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Assigned To</label>
                <select
                  value={form.assignedTo}
                  onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                >
                  {OWNERS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Link to Record</label>
                <select
                  value={form.relatedType}
                  onChange={(e) => setForm({ ...form, relatedType: e.target.value as typeof form.relatedType, relatedId: "" })}
                >
                  <option value="none">— None —</option>
                  <option value="lead">Prospect Lead</option>
                  <option value="candidate">Talent Candidate</option>
                </select>
              </div>
            </div>

            {form.relatedType === "lead" && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Select Lead</label>
                <select
                  value={form.relatedId}
                  onChange={(e) => setForm({ ...form, relatedId: e.target.value })}
                >
                  <option value="">— Choose Lead —</option>
                  {leadStore.leads.map((l) => (
                    <option key={l.id} value={l.id}>{l.name} ({l.company})</option>
                  ))}
                </select>
              </div>
            )}

            {form.relatedType === "candidate" && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Select Candidate</label>
                <select
                  value={form.relatedId}
                  onChange={(e) => setForm({ ...form, relatedId: e.target.value })}
                >
                  <option value="">— Choose Candidate —</option>
                  {candStore.candidates.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.role})</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
              <button type="button" className="btn ghost" onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="submit" className="btn">Schedule Activity</button>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog />
    </CrmShell>
  );
}
