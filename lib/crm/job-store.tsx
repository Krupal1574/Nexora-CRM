"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Job } from "@/lib/crm/sample-data";
import { SAMPLE_JOBS } from "@/lib/crm/sample-data";

export interface CrmJob extends Job {
  id: string;
  salaryRange?: string;
  experienceRequired?: string;
  skillsRequired?: string[];
  description?: string;
  createdAt: string;
  updatedAt: string;
}

let jobCounter = 100;
function genJobId(): string {
  jobCounter += 1;
  return `job-${jobCounter}`;
}

const INITIAL_JOBS: CrmJob[] = SAMPLE_JOBS.map((j, idx) => ({
  ...j,
  id: `job-${idx + 1}`,
  salaryRange: idx === 0 ? "₹18 - ₹24 LPA" : idx === 1 ? "₹12 - ₹16 LPA" : "₹10 - ₹15 LPA",
  experienceRequired: idx === 0 ? "5+ years" : "3+ years",
  skillsRequired: [j.title.split(" ")[0], "Problem Solving"],
  description: `Seeking an experienced ${j.title} for ${j.client} based in ${j.location}.`,
  createdAt: new Date(Date.now() - (idx + 3) * 86400000).toISOString(),
  updatedAt: new Date(Date.now() - idx * 86400000).toISOString(),
}));

interface JobStoreContextType {
  jobs: CrmJob[];
  getJob: (id: string) => CrmJob | undefined;
  createJob: (data: Partial<CrmJob> & { title: string; client: string }) => CrmJob;
  updateJob: (id: string, data: Partial<CrmJob>) => void;
  deleteJob: (id: string) => void;
}

const JobStoreContext = createContext<JobStoreContextType | null>(null);

export function useJobStore() {
  const ctx = useContext(JobStoreContext);
  if (!ctx) throw new Error("useJobStore must be used within JobStoreProvider");
  return ctx;
}

export function JobStoreProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<CrmJob[]>(INITIAL_JOBS);

  const getJob = useCallback(
    (id: string) => jobs.find((j) => j.id === id),
    [jobs]
  );

  const createJob = useCallback(
    (data: Partial<CrmJob> & { title: string; client: string }): CrmJob => {
      const now = new Date().toISOString();
      const newJob: CrmJob = {
        id: genJobId(),
        title: data.title,
        client: data.client,
        location: data.location || "Remote",
        status: data.status || "Open",
        applicants: data.applicants || 0,
        salaryRange: data.salaryRange || "Competitive",
        experienceRequired: data.experienceRequired || "2+ years",
        skillsRequired: data.skillsRequired || ["Staffing"],
        description: data.description || `Mandate for ${data.title} at ${data.client}`,
        createdAt: now,
        updatedAt: now,
      };

      setJobs((prev) => [newJob, ...prev]);
      return newJob;
    },
    []
  );

  const updateJob = useCallback((id: string, data: Partial<CrmJob>) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === id
          ? {
              ...j,
              ...data,
              updatedAt: new Date().toISOString(),
            }
          : j
      )
    );
  }, []);

  const deleteJob = useCallback((id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }, []);

  return (
    <JobStoreContext.Provider
      value={{
        jobs,
        getJob,
        createJob,
        updateJob,
        deleteJob,
      }}
    >
      {children}
    </JobStoreContext.Provider>
  );
}

