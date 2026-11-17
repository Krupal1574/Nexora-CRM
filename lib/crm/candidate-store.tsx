"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { Candidate } from "@/lib/crm/sample-data";
import { SAMPLE_CANDIDATES, PIPELINE_STAGES } from "@/lib/crm/sample-data";

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export interface CandidateNote {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

export interface CandidateActivity {
  id: string;
  type: "stage_change" | "note" | "interview" | "submission" | "offer" | "task" | "call";
  title: string;
  description: string;
  author: string;
  createdAt: string;
}

export interface CrmCandidate extends Candidate {
  id: string;
  stage: PipelineStage;
  skills: string[];
  notes: CandidateNote[];
  activities: CandidateActivity[];
  expectedSalary?: string;
  currentCompany?: string;
  noticePeriod?: string;
  createdAt: string;
  updatedAt: string;
}

let candCounter = 100;
function genCandId(): string {
  candCounter += 1;
  return `cand-${candCounter}`;
}

const INITIAL_CANDIDATES: CrmCandidate[] = SAMPLE_CANDIDATES.map((c, idx) => ({
  ...c,
  id: `cand-${idx + 1}`,
  stage: c.stage as PipelineStage,
  skills: [c.role.split(" ")[0], "Communication", "Problem Solving"],
  notes: [
    {
      id: `cn-${idx + 1}`,
      text: `Initial profile screening completed for ${c.name}.`,
      author: "Priya S.",
      createdAt: new Date(Date.now() - (idx + 1) * 86400000).toISOString(),
    },
  ],
  activities: [
    {
      id: `ca-${idx + 1}`,
      type: "stage_change",
      title: `Moved to ${c.stage}`,
      description: `Stage updated to ${c.stage}`,
      author: "Priya S.",
      createdAt: new Date(Date.now() - (idx + 1) * 43200000).toISOString(),
    },
  ],
  noticePeriod: "30 days",
  expectedSalary: "₹18-24 LPA",
  currentCompany: "Confidential",
  createdAt: new Date(Date.now() - (idx + 5) * 86400000).toISOString(),
  updatedAt: new Date(Date.now() - idx * 3600000).toISOString(),
}));

interface CandidateStoreContextType {
  candidates: CrmCandidate[];
  getCandidate: (id: string) => CrmCandidate | undefined;
  createCandidate: (data: Partial<CrmCandidate> & { name: string; role: string }) => CrmCandidate;
  updateCandidate: (id: string, data: Partial<CrmCandidate>) => void;
  deleteCandidate: (id: string) => void;
  changeStage: (id: string, newStage: PipelineStage, actor?: string) => void;
  addNote: (candidateId: string, text: string, author?: string) => void;
  addActivity: (
    candidateId: string,
    activity: Omit<CandidateActivity, "id" | "createdAt">
  ) => void;
}

const CandidateStoreContext = createContext<CandidateStoreContextType | null>(null);

export function useCandidateStore() {
  const ctx = useContext(CandidateStoreContext);
  if (!ctx) throw new Error("useCandidateStore must be used within CandidateStoreProvider");
  return ctx;
}

export function CandidateStoreProvider({ children }: { children: ReactNode }) {
  const [candidates, setCandidates] = useState<CrmCandidate[]>(INITIAL_CANDIDATES);

  useEffect(() => {
    let mounted = true;
    fetch("/api/crm/candidates")
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return;
        if (data.success && Array.isArray(data.candidates) && data.candidates.length > 0) {
          const mapped: CrmCandidate[] = data.candidates.map((c: any) => ({
            id: c.id,
            name: c.name,
            role: c.role || "Software Engineer",
            location: c.location || "Remote",
            stage: (c.stage as PipelineStage) || "Sourced",
            experience: c.experience || "Entry level",
            email: c.email || "",
            phone: c.phone || "",
            profileUrl: c.profileUrl || "",
            source: c.source || "Direct",
            skills: Array.isArray(c.skills) ? c.skills : typeof c.skills === "string" ? JSON.parse(c.skills || "[]") : [c.role ? c.role.split(" ")[0] : "Engineering"],
            notes: c.notes ? [{ id: `cn-${c.id}`, text: c.notes, author: "Staffing Team", createdAt: c.createdAt || new Date().toISOString() }] : [],
            activities: [
              {
                id: `ca-${c.id}`,
                type: "stage_change",
                title: `Moved to ${c.stage}`,
                description: `Candidate loaded from live CRM database`,
                author: "System",
                createdAt: c.createdAt || new Date().toISOString(),
              },
            ],
            noticePeriod: "30 days",
            expectedSalary: "Competitive",
            currentCompany: "Confidential",
            createdAt: c.createdAt || new Date().toISOString(),
            updatedAt: c.updatedAt || new Date().toISOString(),
          }));
          setCandidates(mapped);
        }
      })
      .catch((err) => {
        console.warn("Could not load candidates from API:", err);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const getCandidate = useCallback(
    (id: string) => candidates.find((c) => c.id === id),
    [candidates]
  );

  const createCandidate = useCallback(
    (data: Partial<CrmCandidate> & { name: string; role: string }): CrmCandidate => {
      const now = new Date().toISOString();
      const newCand: CrmCandidate = {
        id: genCandId(),
        name: data.name,
        role: data.role,
        location: data.location || "Remote",
        stage: (data.stage as PipelineStage) || "New",
        experience: data.experience || "Entry level",
        email: data.email || `${data.name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
        phone: data.phone || "",
        profileUrl: data.profileUrl || "",
        source: data.source || "Manual Entry",
        skills: data.skills || ["General"],
        notes: data.notes || [],
        activities: [
          {
            id: genCandId(),
            type: "stage_change",
            title: "Candidate added",
            description: `Candidate profile created in stage ${(data.stage as PipelineStage) || "New"}`,
            author: "Krupal P.",
            createdAt: now,
          },
        ],
        noticePeriod: data.noticePeriod || "Immediate",
        expectedSalary: data.expectedSalary || "Negotiable",
        currentCompany: data.currentCompany || "",
        createdAt: now,
        updatedAt: now,
      };

      setCandidates((prev) => [newCand, ...prev]);

      fetch("/api/crm/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCand),
      }).catch((err) => console.error("Error creating candidate in DB:", err));

      return newCand;
    },
    []
  );

  const updateCandidate = useCallback(
    (id: string, data: Partial<CrmCandidate>) => {
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                ...data,
                updatedAt: new Date().toISOString(),
              }
            : c
        )
      );

      fetch(`/api/crm/candidates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).catch((err) => console.error("Error updating candidate in DB:", err));
    },
    []
  );

  const deleteCandidate = useCallback((id: string) => {
    setCandidates((prev) => prev.filter((c) => c.id !== id));

    fetch(`/api/crm/candidates/${id}`, {
      method: "DELETE",
    }).catch((err) => console.error("Error deleting candidate in DB:", err));
  }, []);

  const changeStage = useCallback(
    (id: string, newStage: PipelineStage, actor: string = "Krupal P.") => {
      setCandidates((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c;
          const now = new Date().toISOString();
          return {
            ...c,
            stage: newStage,
            updatedAt: now,
            activities: [
              ...c.activities,
              {
                id: genCandId(),
                type: "stage_change",
                title: `Moved to ${newStage}`,
                description: `${actor} moved candidate from ${c.stage} to ${newStage}`,
                author: actor,
                createdAt: now,
              },
            ],
          };
        })
      );

      fetch(`/api/crm/candidates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      }).catch((err) => console.error("Error updating candidate stage in DB:", err));
    },
    []
  );

  const addNote = useCallback(
    (candidateId: string, text: string, author: string = "Krupal P.") => {
      setCandidates((prev) =>
        prev.map((c) => {
          if (c.id !== candidateId) return c;
          const now = new Date().toISOString();
          const note: CandidateNote = {
            id: genCandId(),
            text,
            author,
            createdAt: now,
          };
          return {
            ...c,
            notes: [note, ...c.notes],
            updatedAt: now,
            activities: [
              ...c.activities,
              {
                id: genCandId(),
                type: "note",
                title: "Note added",
                description: text.length > 60 ? `${text.slice(0, 60)}…` : text,
                author,
                createdAt: now,
              },
            ],
          };
        })
      );
    },
    []
  );

  const addActivity = useCallback(
    (
      candidateId: string,
      activity: Omit<CandidateActivity, "id" | "createdAt">
    ) => {
      setCandidates((prev) =>
        prev.map((c) => {
          if (c.id !== candidateId) return c;
          const now = new Date().toISOString();
          return {
            ...c,
            updatedAt: now,
            activities: [
              ...c.activities,
              {
                ...activity,
                id: genCandId(),
                createdAt: now,
              },
            ],
          };
        })
      );
    },
    []
  );

  return (
    <CandidateStoreContext.Provider
      value={{
        candidates,
        getCandidate,
        createCandidate,
        updateCandidate,
        deleteCandidate,
        changeStage,
        addNote,
        addActivity,
      }}
    >
      {children}
    </CandidateStoreContext.Provider>
  );
}

