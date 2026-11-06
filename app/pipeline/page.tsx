"use client";

import { useState } from "react";
import Link from "next/link";
import { CrmShell } from "@/components/crm-shell";
import { useLeadStore, LEAD_STAGES, type LeadStage } from "@/lib/crm/lead-store";
import { useCandidateStore, type PipelineStage } from "@/lib/crm/candidate-store";
import { useToast } from "@/lib/crm/toast-context";
import { PIPELINE_STAGES, getInitials, getPillClass } from "@/lib/crm/sample-data";

export default function PipelinePage() {
  const leadStore = useLeadStore();
  const candStore = useCandidateStore();
  const { show } = useToast();

  const [activeBoard, setActiveBoard] = useState<"leads" | "candidates">("leads");
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Drag handlers for Leads
  const handleLeadDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleLeadDrop = (e: React.DragEvent, targetStage: LeadStage) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || draggedId;
    if (!id) return;
    const lead = leadStore.getLead(id);
    if (lead && lead.stage !== targetStage) {
      leadStore.changeStage(id, targetStage, "Krupal P.");
      show(`Moved ${lead.name} to ${targetStage}`);
    }
    setDraggedId(null);
  };

  // Drag handlers for Candidates
  const handleCandDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleCandDrop = (e: React.DragEvent, targetStage: PipelineStage) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || draggedId;
    if (!id) return;
    const cand = candStore.getCandidate(id);
    if (cand && cand.stage !== targetStage) {
      candStore.changeStage(id, targetStage, "Krupal P.");
      show(`Moved ${cand.name} to ${targetStage}`);
    }
    setDraggedId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  return (
    <CrmShell>
      {/* Top Bar */}
      <div className="page-top">
        <div>
          <h1>{activeBoard === "leads" ? "Leads Pipeline Board" : "Talent Pipeline Board"}</h1>
          <p className="page-sub">
            {activeBoard === "leads"
              ? `Manage ${leadStore.leads.length} leads across 16 sourcing stages.`
              : `Manage ${candStore.candidates.length} candidates across recruitment stages.`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div className="view-toggle">
            <button
              className={activeBoard === "leads" ? "active" : ""}
              onClick={() => setActiveBoard("leads")}
            >
              Leads Pipeline ({leadStore.leads.length})
            </button>
            <button
              className={activeBoard === "candidates" ? "active" : ""}
              onClick={() => setActiveBoard("candidates")}
            >
              Talent Pipeline ({candStore.candidates.length})
            </button>
          </div>
          {activeBoard === "leads" ? (
            <Link href="/leads" className="btn ghost" style={{ textDecoration: "none" }}>
              ☷ Leads Table
            </Link>
          ) : (
            <Link href="/candidates" className="btn ghost" style={{ textDecoration: "none" }}>
              ☷ Talent Table
            </Link>
          )}
        </div>
      </div>

      {/* LEADS PIPELINE (16 Stages in order) */}
      {activeBoard === "leads" && (
        <>
          {/* Quick Jump Bar */}
          <div style={{ marginBottom: 12, display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6 }}>
            <span style={{ fontSize: 12, color: "var(--mu)", alignSelf: "center", whiteSpace: "nowrap", marginRight: 4 }}>
              Jump to:
            </span>
            {LEAD_STAGES.map((stage) => {
              const count = leadStore.leads.filter((l) => l.stage === stage).length;
              return (
                <button
                  key={stage}
                  type="button"
                  className="btn ghost"
                  style={{ fontSize: 11, padding: "3px 8px", whiteSpace: "nowrap" }}
                  onClick={() => {
                    const el = document.getElementById(`board-col-${stage.replace(/\s+/g, "-")}`);
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
              const list = leadStore.leads.filter((l) => l.stage === stage);
              return (
                <div
                  key={stage}
                  id={`board-col-${stage.replace(/\s+/g, "-")}`}
                  className="kanban-col"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleLeadDrop(e, stage)}
                >
                  <h4>
                    <span>{stage}</span>
                    <span className={`pill ${getPillClass(stage)}`}>{list.length}</span>
                  </h4>
                  <div style={{ display: "grid", gap: 8 }}>
                    {list.length === 0 ? (
                      <div
                        style={{
                          padding: "24px 8px",
                          textAlign: "center",
                          color: "var(--mu)",
                          fontSize: 12,
                          border: "1px dashed var(--bd)",
                          borderRadius: 8,
                          fontStyle: "italic",
                        }}
                      >
                        Drop leads here
                      </div>
                    ) : (
                      list.map((l) => (
                        <div
                          key={l.id}
                          className="kanban-card"
                          draggable
                          onDragStart={(e) => handleLeadDragStart(e, l.id)}
                          style={{ cursor: "grab" }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                            <Link
                              href={`/leads/${l.id}`}
                              style={{
                                fontWeight: 700,
                                color: "inherit",
                                textDecoration: "none",
                                fontSize: 13,
                              }}
                            >
                              {l.name}
                            </Link>
                            <span
                              className={`pill ${getPillClass(l.leadType || l.temperature)}`}
                              style={{ fontSize: 9, padding: "2px 6px" }}
                            >
                              {l.leadType || l.temperature}
                            </span>
                          </div>
                          <small style={{ color: "var(--mu)", display: "block", marginTop: 2 }}>
                            {l.technology || l.company}
                          </small>
                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: "var(--mu)" }}>
                            <span>📍 {l.location}</span>
                            {l.visaStatus && <span className="pill" style={{ fontSize: 10 }}>{l.visaStatus}</span>}
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, paddingTop: 6, borderTop: "1px solid var(--bd)" }}>
                            <span style={{ fontSize: 10, color: "var(--mu)" }}>
                              👤 {l.salesPerson || l.owner}
                            </span>
                            <select
                              value={l.stage}
                              onChange={(e) => {
                                const newStage = e.target.value as LeadStage;
                                leadStore.changeStage(l.id, newStage, "Krupal P.");
                                show(`Moved ${l.name} to ${newStage}`);
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
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* CANDIDATES TALENT PIPELINE */}
      {activeBoard === "candidates" && (
        <div className="kanban">
          {PIPELINE_STAGES.map((stage) => {
            const list = candStore.candidates.filter((c) => c.stage === stage);
            return (
              <div
                key={stage}
                className="kanban-col"
                onDragOver={handleDragOver}
                onDrop={(e) => handleCandDrop(e, stage)}
              >
                <h4>
                  <span>{stage}</span>
                  <span className="pill">{list.length}</span>
                </h4>
                <div style={{ display: "grid", gap: 8 }}>
                  {list.length === 0 ? (
                    <div
                      style={{
                        padding: "20px 8px",
                        textAlign: "center",
                        color: "var(--mu)",
                        fontSize: 12,
                        border: "1px dashed var(--bd)",
                        borderRadius: 8,
                      }}
                    >
                      Drop candidates here
                    </div>
                  ) : (
                    list.map((c) => (
                      <div
                        key={c.id}
                        className="kanban-card"
                        draggable
                        onDragStart={(e) => handleCandDragStart(e, c.id)}
                        style={{ cursor: "grab" }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <Link
                            href={`/candidates/${c.id}`}
                            style={{
                              fontWeight: 700,
                              color: "inherit",
                              textDecoration: "none",
                              fontSize: 14,
                            }}
                          >
                            {c.name}
                          </Link>
                          <span className="av" style={{ width: 22, height: 22, fontSize: 10, margin: 0 }}>
                            {getInitials(c.name)}
                          </span>
                        </div>
                        <small style={{ color: "var(--mu)", display: "block", marginTop: 2 }}>{c.role}</small>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: "var(--mu)" }}>
                          <span>📍 {c.location}</span>
                          <span>⏱ {c.experience}</span>
                        </div>
                        {c.skills && c.skills.length > 0 && (
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                            {c.skills.slice(0, 2).map((s) => (
                              <span key={s} className="tag" style={{ fontSize: 10, padding: "1px 5px" }}>
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </CrmShell>
  );
}
