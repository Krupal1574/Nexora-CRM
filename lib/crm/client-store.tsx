"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
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

function genClientId(): string {
  return `client_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
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

  useEffect(() => {
    let mounted = true;
    fetch("/api/crm/clients")
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return;
        if (data.success && Array.isArray(data.clients) && data.clients.length > 0) {
          const mapped: CrmClient[] = data.clients.map((c: any) => ({
            id: c.id,
            name: c.name,
            industry: c.industry || "Technology",
            status: c.status || "Active",
            openJobs: Number(c.openJobs) || 0,
            owner: c.owner || "Krupal P.",
            website: c.website || "",
            contactPerson: c.contactName || "Contact Person",
            contactEmail: c.contactEmail || "",
            contactPhone: c.contactPhone || "",
            city: "USA / Remote",
            notes: c.notes ? [c.notes] : [],
            createdAt: c.createdAt || new Date().toISOString(),
            updatedAt: c.updatedAt || new Date().toISOString(),
          }));
          setClients(mapped);
        }
      })
      .catch((err) => {
        console.warn("Could not load clients from API:", err);
      });

    return () => {
      mounted = false;
    };
  }, []);

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

      fetch("/api/crm/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newClient),
      }).catch((err) => console.error("Error creating client in DB:", err));

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

    fetch(`/api/crm/clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).catch((err) => console.error("Error updating client in DB:", err));
  }, []);

  const deleteClient = useCallback((id: string) => {
    setClients((prev) => prev.filter((c) => c.id !== id));

    fetch(`/api/crm/clients/${id}`, {
      method: "DELETE",
    }).catch((err) => console.error("Error deleting client in DB:", err));
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

