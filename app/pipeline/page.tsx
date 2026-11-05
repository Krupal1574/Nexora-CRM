"use client";

import { useState } from "react";
import Link from "next/link";
import { CrmShell } from "@/components/crm-shell";
import { useCandidateStore, type PipelineStage } from "@/lib/crm/candidate-store";
import { useToast } from "@/lib/crm/toast-context";
import { PIPELINE_STAGES, getInitials } from "@/lib/crm/sample-data";

export default function PipelinePage() {
  const store = useCandidateStore();
  const { show } = useToast();
  const [draggedCandId, setDraggedCandId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedCandId(id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e: React.DragEvent, targetStage: PipelineStage) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || draggedCandId;
    if (!id) return;
    const cand = store.getCandidate(id);
    if (cand && cand.stage !== targetStage) {
      store.changeStage(id, targetStage, "Krupal P.");
      show(`Moved ${cand.name} to ${targetStage}`);
    }
    setDraggedCandId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  return (
    <CrmShell>
      <div className="page-top">
        <div>
          <h1>Talent Pipeline Board</h1>
          <p className="page-sub">Drag candidates between recruitment stages. Changes sync across all views.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/candidates" className="btn ghost" style={{ textDecoration: "none" }}>
            ☷ Table View
          </Link>
          <Link href="/candidates" className="btn" style={{ textDecoration: "none" }}>
            + Add Candidate
          </Link>
        </div>
      </div>

      <div className="kanban">
        {PIPELINE_STAGES.map((stage) => {
          const list = store.candidates.filter((c) => c.stage === stage);
          return (
            <div
              key={stage}
              className="kanban-col"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage)}
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
                      onDragStart={(e) => handleDragStart(e, c.id)}
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
    </CrmShell>
  );
}
