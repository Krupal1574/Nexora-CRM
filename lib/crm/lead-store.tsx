"use client";
import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Lead } from "@/lib/crm/sample-data";
import { SAMPLE_LEADS } from "@/lib/crm/sample-data";

/* ── Extended Lead with full fields ── */
export interface CrmLead extends Lead {
  id: string;
  phone: string;
  email: string;
  stage: LeadStage;
  notes: LeadNote[];
  activities: LeadActivity[];
  profileUrls: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  convertedTo?: { type: string; id: string }[];
}

export type LeadStage =
  | "New"
  | "Resume received"
  | "Contacted"
  | "Follow-up"
  | "Qualified"
  | "Enrolled"
  | "Closed";

export const LEAD_STAGES: LeadStage[] = [
  "New",
  "Resume received",
  "Contacted",
  "Follow-up",
  "Qualified",
  "Enrolled",
  "Closed",
];

export interface LeadNote {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

export type ActivityType =
  | "task"
  | "call"
  | "email"
  | "meeting"
  | "note"
  | "stage_change"
  | "assignment"
  | "conversion"
  | "creation";

export interface LeadActivity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  author: string;
  createdAt: string;
  dueAt?: string;
  completedAt?: string;
}

/* ── Seed data ── */
let nextId = 100;
function genId() {
  return `lead-${++nextId}`;
}

function seedLeads(): CrmLead[] {
  const now = new Date().toISOString();
  return SAMPLE_LEADS.map((l, i) => ({
    ...l,
    id: `lead-${i + 1}`,
    phone: `+91 98765 ${40000 + i}`,
    email: `${l.name.toLowerCase().replace(/ /g, ".")}@example.com`,
    stage: (["New", "Contacted", "Follow-up", "Qualified", "New"] as LeadStage[])[i] ?? "New",
    notes: [],
    activities: [
      {
        id: `act-seed-${i}`,
        type: "creation" as ActivityType,
        title: "Lead created",
        description: `${l.name} was added as a lead from ${l.source}.`,
        author: l.owner,
        createdAt: now,
      },
    ],
    profileUrls: [],
    tags: [],
    createdAt: now,
    updatedAt: now,
  }));
}

/* ── Context ── */
interface LeadStoreContextType {
  leads: CrmLead[];
  getLead: (id: string) => CrmLead | undefined;
  createLead: (data: Omit<CrmLead, "id" | "createdAt" | "updatedAt" | "notes" | "activities" | "convertedTo">) => CrmLead;
  updateLead: (id: string, patch: Partial<CrmLead>) => void;
  deleteLead: (id: string) => void;
  duplicateLead: (id: string) => CrmLead | undefined;
  changeStage: (id: string, stage: LeadStage, actor: string) => void;
  addNote: (id: string, text: string, author: string) => void;
  addActivity: (id: string, activity: Omit<LeadActivity, "id" | "createdAt">) => void;
  convertLead: (id: string, targets: { type: string; id: string }[], actor: string) => void;
}

const LeadStoreContext = createContext<LeadStoreContextType | null>(null);

export function useLeadStore() {
  const ctx = useContext(LeadStoreContext);
  if (!ctx) throw new Error("useLeadStore must be used within LeadStoreProvider");
  return ctx;
}

export function LeadStoreProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<CrmLead[]>(seedLeads);

  const getLead = useCallback(
    (id: string) => leads.find((l) => l.id === id),
    [leads]
  );

  const createLead = useCallback(
    (data: Omit<CrmLead, "id" | "createdAt" | "updatedAt" | "notes" | "activities" | "convertedTo">) => {
      const now = new Date().toISOString();
      const lead: CrmLead = {
        ...data,
        id: genId(),
        notes: [],
        activities: [
          {
            id: genId(),
            type: "creation",
            title: "Lead created",
            description: `${data.name} was added as a new lead.`,
            author: data.owner,
            createdAt: now,
          },
        ],
        createdAt: now,
        updatedAt: now,
      };
      setLeads((prev) => [lead, ...prev]);
      return lead;
    },
    []
  );

  const updateLead = useCallback((id: string, patch: Partial<CrmLead>) => {
    setLeads((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, ...patch, updatedAt: new Date().toISOString() } : l
      )
    );
  }, []);

  const deleteLead = useCallback((id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const duplicateLead = useCallback(
    (id: string) => {
      const original = leads.find((l) => l.id === id);
      if (!original) return undefined;
      const now = new Date().toISOString();
      const dup: CrmLead = {
        ...original,
        id: genId(),
        name: `${original.name} (copy)`,
        notes: [],
        activities: [
          {
            id: genId(),
            type: "creation",
            title: "Duplicated from lead",
            description: `Duplicated from ${original.name}.`,
            author: original.owner,
            createdAt: now,
          },
        ],
        convertedTo: undefined,
        createdAt: now,
        updatedAt: now,
      };
      setLeads((prev) => [dup, ...prev]);
      return dup;
    },
    [leads]
  );

  const changeStage = useCallback((id: string, stage: LeadStage, actor: string) => {
    setLeads((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const now = new Date().toISOString();
        return {
          ...l,
          stage,
          updatedAt: now,
          activities: [
            ...l.activities,
            {
              id: genId(),
              type: "stage_change" as ActivityType,
              title: `Stage changed to ${stage}`,
              description: `${actor} moved this lead from ${l.stage} to ${stage}.`,
              author: actor,
              createdAt: now,
            },
          ],
        };
      })
    );
  }, []);

  const addNote = useCallback((id: string, text: string, author: string) => {
    setLeads((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const now = new Date().toISOString();
        return {
          ...l,
          updatedAt: now,
          notes: [...l.notes, { id: genId(), text, author, createdAt: now }],
          activities: [
            ...l.activities,
            {
              id: genId(),
              type: "note" as ActivityType,
              title: "Note added",
              description: text.slice(0, 120),
              author,
              createdAt: now,
            },
          ],
        };
      })
    );
  }, []);

  const addActivity = useCallback(
    (id: string, activity: Omit<LeadActivity, "id" | "createdAt">) => {
      setLeads((prev) =>
        prev.map((l) => {
          if (l.id !== id) return l;
          const now = new Date().toISOString();
          return {
            ...l,
            updatedAt: now,
            activities: [
              ...l.activities,
              { ...activity, id: genId(), createdAt: now },
            ],
          };
        })
      );
    },
    []
  );

  const convertLead = useCallback(
    (id: string, targets: { type: string; id: string }[], actor: string) => {
      setLeads((prev) =>
        prev.map((l) => {
          if (l.id !== id) return l;
          const now = new Date().toISOString();
          return {
            ...l,
            stage: "Enrolled" as LeadStage,
            convertedTo: [...(l.convertedTo ?? []), ...targets],
            updatedAt: now,
            activities: [
              ...l.activities,
              {
                id: genId(),
                type: "conversion" as ActivityType,
                title: "Lead converted",
                description: `${actor} converted this lead to: ${targets.map((t) => t.type).join(", ")}.`,
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

  return (
    <LeadStoreContext.Provider
      value={{
        leads,
        getLead,
        createLead,
        updateLead,
        deleteLead,
        duplicateLead,
        changeStage,
        addNote,
        addActivity,
        convertLead,
      }}
    >
      {children}
    </LeadStoreContext.Provider>
  );
}

