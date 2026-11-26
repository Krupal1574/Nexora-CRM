"use client";
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { Lead } from "@/lib/crm/sample-data";
import { SAMPLE_LEADS } from "@/lib/crm/sample-data";
import type { BulkImportSummary, DuplicateStrategy } from "@/lib/crm/bulk-import";
import type { DuplicateMatchOptions } from "@/lib/crm/duplicates";
import type { NormalizedImportRow } from "@/lib/crm/import-utils";

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
  | "New Lead"
  | "Resume Lead"
  | "Chat Lead"
  | "Outsource"
  | "Website"
  | "Cold E-mail"
  | "DNR 1"
  | "DNR 2"
  | "DNR 3"
  | "New Stage"
  | "Hot Lead DNR"
  | "Not Interested"
  | "Connected"
  | "Follow Up"
  | "Qualified"
  | "Enrolled";

export const LEAD_STAGES: LeadStage[] = [
  "New Lead",
  "Resume Lead",
  "Chat Lead",
  "Outsource",
  "Website",
  "Cold E-mail",
  "DNR 1",
  "DNR 2",
  "DNR 3",
  "New Stage",
  "Hot Lead DNR",
  "Not Interested",
  "Connected",
  "Follow Up",
  "Qualified",
  "Enrolled",
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

function genId(prefix = "lead") {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${rand}`;
}

function seedLeads(): CrmLead[] {
  const now = new Date().toISOString();
  return SAMPLE_LEADS.map((l, i) => ({
    ...l,
    id: `lead-seed-${i + 1}`,
    company: l.company || l.accountRef || "Technology",
    phone: l.phone || `+91 98765 ${40000 + i}`,
    email: l.email || `${l.name.toLowerCase().replace(/ /g, ".")}@example.com`,
    stage: (["New Lead", "Resume Lead", "Connected", "Cold E-mail", "Follow Up", "Qualified"] as LeadStage[])[i] ?? "New Lead",
    date: l.date || new Date().toISOString().split("T")[0],
    location: l.location || "USA",
    visaStatus: l.visaStatus || "H1B",
    experience: l.experience || "5 yrs",
    leadType: l.leadType || "Cold Lead",
    leadSource: l.leadSource || l.source || "Linkedin Resume",
    leadPerson: l.leadPerson || "Yatri",
    salesPerson: l.salesPerson || l.owner || "Support Admin",
    technology: l.technology || "Computer science",
    accountRef: l.accountRef || "",
    remark: l.remark || "",
    notes: l.remark ? [{ id: `note-seed-${i}`, text: l.remark, author: l.leadPerson || "Yatri", createdAt: now }] : [],
    activities: [
      {
        id: `act-seed-${i}`,
        type: "creation" as ActivityType,
        title: "Lead sourced",
        description: `${l.name} (${l.technology || "Candidate"}) sourced from ${l.leadSource || l.source} by ${l.leadPerson || "Yatri"}.`,
        author: l.salesPerson || l.owner,
        createdAt: now,
      },
    ],
    profileUrls: l.linkedin ? [l.linkedin] : [],
    tags: [l.technology, l.visaStatus, l.location].filter(Boolean) as string[],
    createdAt: now,
    updatedAt: now,
  }));
}

function mapApiLead(l: any): CrmLead {
  const dbNotes: LeadNote[] = Array.isArray(l.dbNotes) ? l.dbNotes : [];
  const createdIso = typeof l.createdAt === "string" ? l.createdAt : new Date().toISOString();
  const updatedIso = typeof l.updatedAt === "string" ? l.updatedAt : createdIso;
  const remarkNote: LeadNote[] =
    l.remark && !dbNotes.some((n) => n.text === l.remark)
      ? [
          {
            id: `note-remark-${l.id}`,
            text: l.remark,
            author: l.leadPerson || "Team",
            createdAt: createdIso,
          },
        ]
      : [];

  return {
    id: l.id,
    name: l.name,
    company: l.company || l.accountRef || l.technology || "Independent Candidate",
    source: l.leadSource || l.source || "Website",
    temperature: l.temperature || "New",
    owner: l.salesPerson || l.owner || "Support Admin",
    value: l.value || "₹5.0L",
    date: l.date || createdIso.slice(0, 10),
    location: l.location || "USA",
    phone: l.phone || "",
    email: l.email || "",
    linkedin: l.linkedin || "",
    visaStatus: l.visaStatus || "",
    experience: l.experience || "",
    leadType: l.leadType || "Cold Lead",
    leadSource: l.leadSource || l.source || "Website",
    leadPerson: l.leadPerson || "Yatri",
    salesPerson: l.salesPerson || l.owner || "Support Admin",
    technology: l.technology || "",
    accountRef: l.accountRef || "",
    remark: l.remark || "",
    stage: (l.stage as LeadStage) || "New Lead",
    notes: dbNotes.length > 0 || remarkNote.length > 0 ? [...dbNotes, ...remarkNote] : [],
    activities: [],
    profileUrls: l.linkedin ? [l.linkedin] : [],
    tags: [l.technology, l.visaStatus, l.location].filter(Boolean) as string[],
    createdAt: createdIso,
    updatedAt: updatedIso,
  };
}

/* ── Context ── */
interface LeadStoreContextType {
  leads: CrmLead[];
  isLoaded: boolean;
  dbConnected: boolean;
  refreshLeads: () => Promise<void>;
  getLead: (id: string) => CrmLead | undefined;
  createLead: (data: Partial<CrmLead> & { name: string }) => CrmLead;
  bulkImportLeads: (params: {
    rows: NormalizedImportRow[];
    duplicateMode: DuplicateStrategy;
    matchOptions: DuplicateMatchOptions;
    sourceName: string;
    actor: string;
  }) => Promise<BulkImportSummary>;
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
  const [isLoaded, setIsLoaded] = useState(false);
  const [dbConnected, setDbConnected] = useState(false);

  const refreshLeads = useCallback(async () => {
    try {
      const res = await fetch("/api/crm/leads", { cache: "no-store" });
      const data = await res.json();
      if (data.success && Array.isArray(data.leads)) {
        setLeads(data.leads.map(mapApiLead));
        setDbConnected(true);
      }
    } catch (err) {
      console.warn("Could not load leads from API, using fallback:", err);
      setDbConnected(false);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refreshLeads();
  }, [refreshLeads]);

  const getLead = useCallback(
    (id: string) => leads.find((l) => l.id === id),
    [leads]
  );

  const createLead = useCallback((data: Partial<CrmLead> & { name: string }) => {
    const now = new Date().toISOString();
    const id = genId("lead");
    const temp =
      data.temperature ||
      (data.leadType === "Hot Lead"
        ? "Hot"
        : data.leadType === "Warm Lead"
        ? "Warm"
        : "New");
    const lead: CrmLead = {
      id,
      name: data.name,
      company: data.company || data.accountRef || data.technology || "Independent Candidate",
      source: data.leadSource || data.source || "Linkedin Resume",
      temperature: temp,
      owner: data.salesPerson || data.owner || "Support Admin",
      value: data.value || "₹5.0L",
      date: data.date || now.split("T")[0],
      location: data.location || "USA",
      phone: data.phone || "",
      email: data.email || "",
      linkedin: data.linkedin || "",
      visaStatus: data.visaStatus || "",
      experience: data.experience || "",
      leadType: data.leadType || "Cold Lead",
      leadSource: data.leadSource || data.source || "Linkedin Resume",
      leadPerson: data.leadPerson || "Yatri",
      salesPerson: data.salesPerson || data.owner || "Support Admin",
      technology: data.technology || "Computer science",
      accountRef: data.accountRef || "",
      remark: data.remark || "",
      stage: data.stage || "New Lead",
      notes: data.remark
        ? [
            {
              id: genId("note"),
              text: data.remark,
              author: data.leadPerson || "Yatri",
              createdAt: now,
            },
          ]
        : [],
      activities: [
        {
          id: genId("act"),
          type: "creation",
          title: "Lead sourced",
          description: `${data.name} was added as a lead from ${data.leadSource || data.source || "Linkedin Resume"} by ${data.leadPerson || "Yatri"}.`,
          author: data.salesPerson || data.owner || "Support Admin",
          createdAt: now,
        },
      ],
      profileUrls: data.linkedin ? [data.linkedin] : data.profileUrls || [],
      tags:
        data.tags ||
        ([data.technology, data.visaStatus, data.location].filter(Boolean) as string[]),
      createdAt: now,
      updatedAt: now,
    };
    setLeads((prev) => [lead, ...prev]);

    fetch("/api/crm/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lead),
    }).catch((err) => console.error("Error persisting new lead:", err));

    return lead;
  }, []);

  const bulkImportLeads = useCallback(
    async (params: {
      rows: NormalizedImportRow[];
      duplicateMode: DuplicateStrategy;
      matchOptions: DuplicateMatchOptions;
      sourceName: string;
      actor: string;
    }): Promise<BulkImportSummary> => {
      const res = await fetch("/api/crm/leads/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Bulk lead import failed.");
      }
      await refreshLeads();
      return data.summary as BulkImportSummary;
    },
    [refreshLeads]
  );

  const updateLead = useCallback((id: string, patch: Partial<CrmLead>) => {
    setLeads((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, ...patch, updatedAt: new Date().toISOString() } : l
      )
    );

    fetch(`/api/crm/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).catch((err) => console.error("Error updating lead in DB:", err));
  }, []);

  const deleteLead = useCallback((id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));

    fetch(`/api/crm/leads/${id}`, {
      method: "DELETE",
    }).catch((err) => console.error("Error deleting lead in DB:", err));
  }, []);

  const duplicateLead = useCallback(
    (id: string) => {
      const original = leads.find((l) => l.id === id);
      if (!original) return undefined;
      const now = new Date().toISOString();
      const dup: CrmLead = {
        ...original,
        id: genId("lead"),
        name: `${original.name} (copy)`,
        notes: [],
        activities: [
          {
            id: genId("act"),
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

      fetch("/api/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dup),
      }).catch((err) => console.error("Error persisting duplicated lead:", err));

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
              id: genId("act"),
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

    fetch(`/api/crm/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    }).catch((err) => console.error("Error updating lead stage in DB:", err));
  }, []);

  const addNote = useCallback((id: string, text: string, author: string) => {
    const noteId = genId("note");
    const now = new Date().toISOString();

    setLeads((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        return {
          ...l,
          updatedAt: now,
          notes: [{ id: noteId, text, author, createdAt: now }, ...l.notes],
          activities: [
            ...l.activities,
            {
              id: genId("act"),
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

    fetch("/api/crm/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: noteId,
        recordType: "lead",
        recordId: id,
        subject: "Lead Note",
        content: text,
        author,
      }),
    }).catch((err) => console.error("Error persisting lead note:", err));
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
              { ...activity, id: genId("act"), createdAt: now },
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
                id: genId("act"),
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

      fetch(`/api/crm/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: "Enrolled" }),
      }).catch((err) => console.error("Error updating converted lead stage in DB:", err));
    },
    []
  );

  return (
    <LeadStoreContext.Provider
      value={{
        leads,
        isLoaded,
        dbConnected,
        refreshLeads,
        getLead,
        createLead,
        bulkImportLeads,
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
