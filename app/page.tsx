"use client";
import { CrmShell } from "@/components/crm-shell";
import { SoonButton } from "@/lib/crm/toast-context";
import {
  SAMPLE_LEADS, SAMPLE_CANDIDATES, SAMPLE_JOBS, SAMPLE_TASKS,
  SAMPLE_ACTIVITY, PIPELINE_STAGES, getInitials, getPillClass,
} from "@/lib/crm/sample-data";

export default function DashboardPage() {
  const openJobs = SAMPLE_JOBS.filter(j => j.status === "Open").length;
  const placements = SAMPLE_CANDIDATES.filter(c => c.stage === "Placed").length + 3;

  const kpis = [
    { label: "Active leads", value: SAMPLE_LEADS.length, change: "+12%" },
    { label: "Candidates", value: SAMPLE_CANDIDATES.length, change: "+8%" },
    { label: "Open jobs", value: openJobs, change: "+2" },
    { label: "Placements (MTD)", value: placements, change: "+25%" },
  ];

  return (
    <CrmShell>
      {/* Page Header */}
      <div className="page-top">
        <div>
          <h1>Good morning, Krupal 👋</h1>
          <p className="page-sub">Here&apos;s what&apos;s happening across Nexora today.</p>
        </div>
        <SoonButton label="Quick add" />
      </div>

      {/* KPI Cards */}
      <div className="grid g4">
        {kpis.map((k, i) => (
          <div className="card kpi" key={i}>
            <span>{k.label}</span>
            <b>{k.value}</b>
            <span className="kpi-up">▲ {k.change}</span>
          </div>
        ))}
      </div>

      {/* Two-column grid */}
      <div className="grid g2 mt-14">
        {/* Pipeline Snapshot */}
        <div className="card">
          <b>Pipeline snapshot</b>
          <div style={{ marginTop: 12 }}>
            {PIPELINE_STAGES.map((stage) => {
              const count = SAMPLE_CANDIDATES.filter(c => c.stage === stage).length;
              return (
                <div className="row" key={stage}>
                  <span style={{ width: 90 }}>{stage}</span>
                  <div className="bar" style={{ flex: 1 }}>
                    <span className="bar-fill" style={{ width: `${count * 30}%` }} />
                  </div>
                  <b>{count}</b>
                </div>
              );
            })}
          </div>
        </div>

        {/* Today's Tasks */}
        <div className="card">
          <b>Today&apos;s tasks</b>
          {SAMPLE_TASKS.slice(0, 4).map((t, i) => (
            <div className="row" key={i}>
              <span>{t.text}</span>
              <span className={`pill ${getPillClass(t.due)}`}>{t.due}</span>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="card">
          <b>Recent activity</b>
          {SAMPLE_ACTIVITY.slice(0, 4).map((a, i) => (
            <div className="row" key={i}>
              <span>
                <span className="av">{getInitials(a.actor)}</span>
                {a.actor} {a.action}
              </span>
              <small style={{ color: "var(--mu)" }}>{a.time}</small>
            </div>
          ))}
        </div>

        {/* Placements Trend */}
        <div className="card">
          <b>Placements trend</b>
          <svg viewBox="0 0 300 110" width="100%" style={{ marginTop: 10 }}>
            <polyline fill="none" stroke="#F58220" strokeWidth="3" points="0,90 50,75 100,80 150,50 200,55 250,30 300,18" />
            <polyline fill="none" stroke="var(--bd)" points="0,105 300,105" />
          </svg>
        </div>
      </div>
    </CrmShell>
  );
}
