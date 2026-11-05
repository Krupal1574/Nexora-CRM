"use client";

import Link from "next/link";
import { CrmShell } from "@/components/crm-shell";
import { useLeadStore } from "@/lib/crm/lead-store";
import { useCandidateStore } from "@/lib/crm/candidate-store";
import { useJobStore } from "@/lib/crm/job-store";
import { useTaskStore } from "@/lib/crm/task-store";
import { useToast } from "@/lib/crm/toast-context";
import { PIPELINE_STAGES, getInitials, getPillClass } from "@/lib/crm/sample-data";

export default function DashboardPage() {
  const { leads } = useLeadStore();
  const { candidates } = useCandidateStore();
  const { jobs } = useJobStore();
  const { tasks, toggleTask } = useTaskStore();
  const { show } = useToast();

  const activeLeads = leads.filter((l) => l.stage !== "Closed").length;
  const talentPool = candidates.length;
  const openJobs = jobs.filter((j) => j.status === "Open").length;
  const placements = candidates.filter((c) => c.stage === "Placed").length + 3;

  const kpis = [
    { label: "Active leads", value: activeLeads, change: "+12%", up: true, href: "/leads" },
    { label: "Candidates in pool", value: talentPool, change: "+8%", up: true, href: "/candidates" },
    { label: "Open job mandates", value: openJobs, change: `+${openJobs}`, up: true, href: "/jobs" },
    { label: "Placements (MTD)", value: placements, change: "+25%", up: true, href: "/pipeline" },
  ];

  const pendingTasks = tasks.filter((t) => !t.done);

  return (
    <CrmShell>
      <div className="page-top">
        <div>
          <h1>Good morning, Krupal 👋</h1>
          <p className="page-sub">Here’s what’s happening across Nexora recruitment today.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/leads" className="btn">+ New lead</Link>
          <Link href="/candidates" className="btn ghost">+ Add talent</Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid g4" style={{ marginBottom: 18 }}>
        {kpis.map((kpi) => (
          <Link
            key={kpi.label}
            href={kpi.href}
            className="card kpi"
            style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}
          >
            <span>{kpi.label}</span>
            <b>{kpi.value}</b>
            <span className="up">▲ {kpi.change}</span>
          </Link>
        ))}
      </div>

      {/* Main Grid: Pipeline Snapshot & Tasks */}
      <div className="grid g2" style={{ marginBottom: 18 }}>
        {/* Pipeline Snapshot */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <b>Candidate Pipeline Snapshot</b>
            <Link href="/pipeline" style={{ color: "var(--bl)", fontSize: 13, textDecoration: "none" }}>
              View Kanban board →
            </Link>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {PIPELINE_STAGES.map((stage) => {
              const count = candidates.filter((c) => c.stage === stage).length;
              const maxCount = Math.max(candidates.length, 1);
              const pct = Math.round((count / maxCount) * 100);
              return (
                <div className="row" key={stage} style={{ padding: "8px 0" }}>
                  <span style={{ width: 100, fontWeight: 500 }}>{stage}</span>
                  <div className="bar" style={{ flex: 1, margin: "0 12px" }}>
                    <i style={{ width: `${Math.max(pct, 6)}%` }} />
                  </div>
                  <b style={{ minWidth: 28, textAlign: "right" }}>{count}</b>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tasks & Follow-ups */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <b>Today&apos;s Follow-ups &amp; Tasks</b>
            <Link href="/tasks" style={{ color: "var(--bl)", fontSize: 13, textDecoration: "none" }}>
              All tasks ({pendingTasks.length}) →
            </Link>
          </div>
          {pendingTasks.length === 0 ? (
            <div className="empty" style={{ padding: "24px 0" }}>
              <big>🎉</big>
              <h3>All clear!</h3>
              <p>No pending follow-ups for today.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {pendingTasks.slice(0, 5).map((t) => (
                <label key={t.id} className="row sw" style={{ padding: "8px 0", cursor: "pointer" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={t.done}
                      onChange={() => {
                        toggleTask(t.id);
                        show(`Task marked as ${t.done ? "pending" : "completed"}.`);
                      }}
                    />
                    {t.text}
                  </span>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span className={`pill ${t.priority === "High" ? "bad" : "or"}`}>{t.priority}</span>
                    <span className="pill">{t.due}</span>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Second Row: Recent Leads & Placements Trend */}
      <div className="grid g2">
        {/* Hot Leads */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <b>Active Prospect Leads</b>
            <Link href="/leads" style={{ color: "var(--bl)", fontSize: 13, textDecoration: "none" }}>
              Manage leads →
            </Link>
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {leads.slice(0, 4).map((l) => (
              <div key={l.id} className="row" style={{ padding: "8px 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="av">{getInitials(l.name)}</span>
                  <div>
                    <Link href={`/leads/${l.id}`} style={{ fontWeight: 600, color: "inherit", textDecoration: "none" }}>
                      {l.name}
                    </Link>
                    <div style={{ color: "var(--mu)", fontSize: 12 }}>
                      {l.company} · {l.owner}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span className={`pill ${getPillClass(l.temperature)}`}>{l.temperature}</span>
                  <span className={`pill ${getPillClass(l.stage)}`}>{l.stage}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Placements Trend */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <b>Monthly Placements Trend</b>
            <span className="pill ok">+25% vs last month</span>
          </div>
          <p style={{ color: "var(--mu)", fontSize: 12, margin: "0 0 12px" }}>
            Monthly staffing hires across client accounts.
          </p>
          <svg viewBox="0 0 300 110" width="100%" style={{ marginTop: 6 }}>
            <polyline
              fill="none"
              stroke="#F58220"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points="0,90 50,75 100,80 150,50 200,55 250,30 300,18"
            />
            <polyline fill="none" stroke="var(--bd)" strokeWidth="1" strokeDasharray="4" points="0,105 300,105" />
          </svg>
        </div>
      </div>
    </CrmShell>
  );
}
