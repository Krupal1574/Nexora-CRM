"use client";
import { useState } from "react";
import { CrmShell } from "@/components/crm-shell";
import { SoonButton } from "@/lib/crm/toast-context";
import { SAMPLE_TASKS, getPillClass } from "@/lib/crm/sample-data";

export default function TasksPage() {
  const [tasks, setTasks] = useState(SAMPLE_TASKS);

  const toggleTask = (index: number) => {
    setTasks((prev) =>
      prev.map((t, i) => (i === index ? { ...t, done: !t.done } : t))
    );
  };

  return (
    <CrmShell>
      <div className="page-top">
        <div>
          <h1>Tasks</h1>
          <p className="page-sub">Follow-ups and reminders.</p>
        </div>
        <SoonButton label="+ New task" />
      </div>

      <div className="card">
        {tasks.map((task, i) => (
          <label key={i} className="row sw-row">
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="checkbox"
                checked={task.done}
                onChange={() => toggleTask(i)}
              />
              <span style={{ textDecoration: task.done ? "line-through" : "none", opacity: task.done ? 0.6 : 1 }}>
                {task.text}
              </span>
            </span>
            <span>
              <span className={`pill ${getPillClass(task.due)}`}>{task.due}</span>{" "}
              <span className={`pill ${getPillClass(task.priority)}`}>{task.priority}</span>
            </span>
          </label>
        ))}
      </div>
    </CrmShell>
  );
}

