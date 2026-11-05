"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/lib/crm/toast-context";
import { LeadStoreProvider } from "@/lib/crm/lead-store";
import { CandidateStoreProvider } from "@/lib/crm/candidate-store";
import { ClientStoreProvider } from "@/lib/crm/client-store";
import { JobStoreProvider } from "@/lib/crm/job-store";
import { TaskStoreProvider } from "@/lib/crm/task-store";

export function CrmProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <LeadStoreProvider>
        <CandidateStoreProvider>
          <ClientStoreProvider>
            <JobStoreProvider>
              <TaskStoreProvider>
                {children}
              </TaskStoreProvider>
            </JobStoreProvider>
          </ClientStoreProvider>
        </CandidateStoreProvider>
      </LeadStoreProvider>
    </ToastProvider>
  );
}
