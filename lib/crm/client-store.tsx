"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Client } from "@/lib/crm/sample-data";
import { SAMPLE_CLIENTS } from "@/lib/crm/sample-data";

export interface CrmClient extends Client {
  id: string;
  website?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  city?: string;
  notes?: string[];
  createdAt: string;
  updatedAt: string;
}

let clientCounter = 100;
function genClientId(): string {
  clientCounter += 1;
  return `client-${clientCounter}`;
}

const INITIAL_CLIENTS: CrmClient[] = SAMPLE_CLIENTS.map((c, idx) => ({
  ...c,
  id: `client-${idx + 1}`,
  website: `https://${c.name.toLowerCase().replace(/\s+/g, "")}.example.com`,
  contactPerson: idx === 0 ? "Aarav Mehta" : idx === 1 ? "Dr. Sofia Rossi" : "Lead Partner",
  contactEmail: `contact@${c.name.toLowerCase().replace(/\s+/g, "")}.com`,
  contactPhone: `+91 98200 ${10000 + idx * 111}`,
  city: idx === 0 ? "Ahmedabad" : idx === 1 ? "Remote" : idx === 2 ? "Surat" : "Mumbai",
  notes: [`Key staffing account managed by ${c.owner}.`],
  createdAt: new Date(Date.now() - (idx + 10) * 86400000).toISOString(),
  updatedAt: new Date(Date.now() - idx * 86400000).toISOString(),
}));

interface ClientStoreContextType {
  clients: CrmClient[];
  getClient: (id: string) => CrmClient | undefined;
  createClient: (data: Partial<CrmClient> & { name: string; industry: string }) => CrmClient;
  updateClient: (id: string, data: Partial<CrmClient>) => void;
  deleteClient: (id: string) => void;
}

const ClientStoreContext = createContext<ClientStoreContextType | null>(null);

export function useClientStore() {
  const ctx = useContext(ClientStoreContext);
  if (!ctx) throw new Error("useClientStore must be used within ClientStoreProvider");
  return ctx;
}

export function ClientStoreProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<CrmClient[]>(INITIAL_CLIENTS);

  const getClient = useCallback(
    (id: string) => clients.find((c) => c.id === id),
    [clients]
  );

  const createClient = useCallback(
    (data: Partial<CrmClient> & { name: string; industry: string }): CrmClient => {
      const now = new Date().toISOString();
      const newClient: CrmClient = {
        id: genClientId(),
        name: data.name,
        industry: data.industry,
        status: data.status || "Prospect",
        openJobs: data.openJobs || 0,
        owner: data.owner || "Krupal P.",
        website: data.website || "",
        contactPerson: data.contactPerson || "",
        contactEmail: data.contactEmail || "",
        contactPhone: data.contactPhone || "",
        city: data.city || "Ahmedabad",
        notes: data.notes || [],
        createdAt: now,
        updatedAt: now,
      };

      setClients((prev) => [newClient, ...prev]);
      return newClient;
    },
    []
  );

  const updateClient = useCallback((id: string, data: Partial<CrmClient>) => {
    setClients((prev) =>
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
  }, []);

  const deleteClient = useCallback((id: string) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return (
    <ClientStoreContext.Provider
      value={{
        clients,
        getClient,
        createClient,
        updateClient,
        deleteClient,
      }}
    >
      {children}
    </ClientStoreContext.Provider>
  );
}
