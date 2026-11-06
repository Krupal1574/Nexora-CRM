"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
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
    },
    []
  );

  const deleteCandidate = useCallback((id: string) => {
    setCandidates((prev) => prev.filter((c) => c.id !== id));
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

