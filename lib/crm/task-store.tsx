"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { Task } from "@/lib/crm/sample-data";
import { SAMPLE_TASKS } from "@/lib/crm/sample-data";

export type TaskPriority = "High" | "Med" | "Low";
export type TaskCategory = "Task" | "Call" | "Interview" | "Meeting" | "Reminder";
export type TaskStatus = "pending" | "completed" | "overdue";

export interface CrmTask extends Task {
  id: string;
  category: TaskCategory;
  dueDate: string; // YYYY-MM-DD or descriptive
  dueTime?: string;
  assignedTo: string;
  relatedTo?: { type: "lead" | "candidate" | "client" | "job"; id: string; name: string };
  createdAt: string;
}

function genTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

const todayStr = new Date().toISOString().split("T")[0];
const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split("T")[0];

const INITIAL_TASKS: CrmTask[] = [
  {
    id: "task-1",
    text: "Call Sofia Rossi about Helix mandate",
    due: "Today",
    dueDate: todayStr,
    dueTime: "11:00 AM",
    priority: "High",
    done: false,
    category: "Call",
    assignedTo: "Rahul K.",
    relatedTo: { type: "lead", id: "lead-2", name: "Sofia Rossi (Helix Health)" },
    createdAt: new Date().toISOString(),
  },
  {
    id: "task-2",
    text: "Send shortlist to Brightline Tech",
    due: "Today",
    dueDate: todayStr,
    dueTime: "03:30 PM",
    priority: "High",
    done: false,
    category: "Task",
    assignedTo: "Priya S.",
    relatedTo: { type: "client", id: "client-1", name: "Brightline Tech" },
    createdAt: new Date().toISOString(),
  },
  {
    id: "task-3",
    text: "Interview – Isha Verma with Engineering Lead",
    due: "Tomorrow",
    dueDate: tomorrowStr,
    dueTime: "02:00 PM",
    priority: "High",
    done: false,
    category: "Interview",
    assignedTo: "Priya S.",
    relatedTo: { type: "candidate", id: "cand-1", name: "Isha Verma" },
    createdAt: new Date().toISOString(),
  },
  {
    id: "task-4",
    text: "Update salary benchmarks for Q1",
    due: "Tomorrow",
    dueDate: tomorrowStr,
    priority: "Med",
    done: false,
    category: "Task",
    assignedTo: "Krupal P.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "task-5",
    text: "Reference check – Tanvi Shah",
    due: "Friday",
    dueDate: new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0],
    priority: "Med",
    done: false,
    category: "Reminder",
    assignedTo: "Amit D.",
    relatedTo: { type: "candidate", id: "cand-3", name: "Tanvi Shah" },
    createdAt: new Date().toISOString(),
  },
  {
    id: "task-6",
    text: "Archive closed jobs from previous month",
    due: "Completed",
    dueDate: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0],
    priority: "Low",
    done: true,
    category: "Task",
    assignedTo: "Krupal P.",
    createdAt: new Date().toISOString(),
  },
];

interface TaskStoreContextType {
  tasks: CrmTask[];
  getTask: (id: string) => CrmTask | undefined;
  createTask: (data: Partial<CrmTask> & { text: string }) => CrmTask;
  updateTask: (id: string, data: Partial<CrmTask>) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
}

const TaskStoreContext = createContext<TaskStoreContextType | null>(null);

export function useTaskStore() {
  const ctx = useContext(TaskStoreContext);
  if (!ctx) throw new Error("useTaskStore must be used within TaskStoreProvider");
  return ctx;
}

export function TaskStoreProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<CrmTask[]>(INITIAL_TASKS);

  useEffect(() => {
    let mounted = true;
    fetch("/api/crm/tasks")
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return;
        if (data.success && Array.isArray(data.tasks) && data.tasks.length > 0) {
          const mapped: CrmTask[] = data.tasks.map((t: any) => ({
            id: t.id,
            text: t.text || "Untitled Task",
            due: t.due || "Today",
            dueDate: t.due || todayStr,
            dueTime: "",
            priority: (t.priority as TaskPriority) || "Med",
            done: Boolean(t.done),
            category: "Task" as TaskCategory,
            assignedTo: t.assignedTo || "Krupal P.",
            relatedTo: t.linkedType && t.linkedId ? { type: t.linkedType as any, id: t.linkedId, name: t.linkedId } : undefined,
            createdAt: t.createdAt || new Date().toISOString(),
          }));
          setTasks(mapped);
        }
      })
      .catch((err) => {
        console.warn("Could not load tasks from API:", err);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const getTask = useCallback((id: string) => tasks.find((t) => t.id === id), [tasks]);

  const createTask = useCallback((data: Partial<CrmTask> & { text: string }): CrmTask => {
    const now = new Date().toISOString();
    const newTask: CrmTask = {
      id: genTaskId(),
      text: data.text,
      due: data.due || "Upcoming",
      dueDate: data.dueDate || todayStr,
      dueTime: data.dueTime || "",
      priority: data.priority || "Med",
      done: false,
      category: data.category || "Task",
      assignedTo: data.assignedTo || "Krupal P.",
      relatedTo: data.relatedTo,
      createdAt: now,
    };

    setTasks((prev) => [newTask, ...prev]);

    fetch("/api/crm/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTask),
    }).catch((err) => console.error("Error creating task in DB:", err));

    return newTask;
  }, []);

  const updateTask = useCallback((id: string, data: Partial<CrmTask>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)));

    fetch(`/api/crm/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).catch((err) => console.error("Error updating task in DB:", err));
  }, []);

  const toggleTask = useCallback((id: string) => {
    let newDone = false;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          newDone = !t.done;
          return { ...t, done: newDone };
        }
        return t;
      })
    );

    fetch(`/api/crm/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: newDone }),
    }).catch((err) => console.error("Error toggling task done in DB:", err));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));

    fetch(`/api/crm/tasks/${id}`, {
      method: "DELETE",
    }).catch((err) => console.error("Error deleting task in DB:", err));
  }, []);

  return (
    <TaskStoreContext.Provider
      value={{
        tasks,
        getTask,
        createTask,
        updateTask,
        toggleTask,
        deleteTask,
      }}
    >
      {children}
    </TaskStoreContext.Provider>
  );
}

