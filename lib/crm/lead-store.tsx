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
    salesPerson: l.salesPerson || l.owner || "Krupal P.",
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

/* ── Context ── */
interface LeadStoreContextType {
  leads: CrmLead[];
  getLead: (id: string) => CrmLead | undefined;
  createLead: (data: Partial<CrmLead> & { name: string }) => CrmLead;
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

  useEffect(() => {
    let mounted = true;
    fetch("/api/crm/leads")
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return;
        if (data.success && Array.isArray(data.leads) && data.leads.length > 0) {
          const mapped: CrmLead[] = data.leads.map((l: any) => ({
            id: l.id,
            name: l.name,
            company: l.company || l.accountRef || l.technology || "Independent Candidate",
            source: l.leadSource || l.source || "Website",
            temperature: l.temperature || "New",
            owner: l.salesPerson || l.owner || "Krupal P.",
            value: l.value || "₹5.0L",
            date: l.date || (l.createdAt ? new Date(l.createdAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]),
            location: l.location || "USA",
            phone: l.phone || "",
            email: l.email || "",
            linkedin: l.linkedin || "",
            visaStatus: l.visaStatus || "",
            experience: l.experience || "",
            leadType: l.leadType || "Cold Lead",
            leadSource: l.leadSource || l.source || "Website",
            leadPerson: l.leadPerson || "Krupal",
            salesPerson: l.salesPerson || l.owner || "Krupal P.",
            technology: l.technology || "",
            accountRef: l.accountRef || "",
            remark: l.remark || "",
            stage: (l.stage as LeadStage) || "New Lead",
            notes: l.remark
              ? [{ id: `note-${l.id}`, text: l.remark, author: l.leadPerson || "Krupal", createdAt: l.createdAt || new Date().toISOString() }]
              : [],
            activities: [
              {
                id: `act-${l.id}`,
                type: "creation" as ActivityType,
                title: "Lead synchronized",
                description: `Synchronized from CRM database.`,
                author: l.owner || "System",
                createdAt: l.createdAt || new Date().toISOString(),
              },
            ],
            profileUrls: l.linkedin ? [l.linkedin] : [],
            tags: [l.technology, l.visaStatus, l.location].filter(Boolean) as string[],
            createdAt: l.createdAt || new Date().toISOString(),
            updatedAt: l.updatedAt || new Date().toISOString(),
          }));
          setLeads(mapped);
        }
      })
      .catch((err) => {
        console.warn("Could not load leads from API, using default seed:", err);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const getLead = useCallback(
    (id: string) => leads.find((l) => l.id === id),
    [leads]
  );

  const createLead = useCallback(
    (data: Partial<CrmLead> & { name: string }) => {
      const now = new Date().toISOString();
      const id = genId();
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
        owner: data.salesPerson || data.owner || "Krupal P.",
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
        salesPerson: data.salesPerson || data.owner || "Krupal P.",
        technology: data.technology || "Computer science",
        accountRef: data.accountRef || "",
        remark: data.remark || "",
        stage: data.stage || "New Lead",
        notes: data.remark
          ? [
              {
                id: genId(),
                text: data.remark,
                author: data.leadPerson || "Yatri",
                createdAt: now,
              },
            ]
          : [],
        activities: [
          {
            id: genId(),
            type: "creation",
            title: "Lead sourced",
            description: `${data.name} was added as a lead from ${data.leadSource || data.source || "Linkedin Resume"} by ${data.leadPerson || "Yatri"}.`,
            author: data.salesPerson || data.owner || "Krupal P.",
            createdAt: now,
          },
        ],
        profileUrls: data.linkedin
          ? [data.linkedin]
          : data.profileUrls || [],
        tags:
          data.tags ||
          ([data.technology, data.visaStatus, data.location].filter(Boolean) as string[]),
        createdAt: now,
        updatedAt: now,
      };
      setLeads((prev) => [lead, ...prev]);

      // Async DB persistence
      fetch("/api/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead),
      }).catch((err) => console.error("Error persisting new lead:", err));

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

    fetch(`/api/crm/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    }).catch((err) => console.error("Error updating lead stage in DB:", err));
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

