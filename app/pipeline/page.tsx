"use client";
import { useState } from "react";
import { CrmShell } from "@/components/crm-shell";
import { SoonButton } from "@/lib/crm/toast-context";
import { SAMPLE_CANDIDATES, PIPELINE_STAGES } from "@/lib/crm/sample-data";

export default function PipelinePage() {
  const [candidates, setCandidates] = useState(SAMPLE_CANDIDATES);

  const handleDragStart = (e: React.DragEvent, name: string) => {
    e.dataTransfer.setData("text/plain", name);
  };

  const handleDrop = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    const name = e.dataTransfer.getData("text/plain");
    setCandidates((prev) =>
      prev.map((c) => (c.name === name ? { ...c, stage } : c))
    );
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <CrmShell>
      <div className="page-top">
        <div>
          <h1>Pipeline</h1>
          <p className="page-sub">Drag candidates between stages (preview only).</p>
        </div>
        <SoonButton label="Customize stages" />
      </div>

      <div className="kanban">
        {PIPELINE_STAGES.map((stage) => {
          const list = candidates.filter((c) => c.stage === stage);
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
              {list.map((c) => (
                <div
                  key={c.name}
                  className="kanban-card"
                  draggable
                  onDragStart={(e) => handleDragStart(e, c.name)}
                  style={{ cursor: "grab" }}
                >
                  <b>{c.name}</b>
                  <br />
                  <small>{c.role}</small>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </CrmShell>
  );
}

