// Types
export interface Lead {
  name: string;
  company: string;
  source: string;
  temperature: "Hot" | "Warm" | "New";
  owner: string;
  value: string;
}

export interface Candidate {
  name: string;
  role: string;
  location: string;
  stage: string;
  experience: string;
  email: string;
  phone: string;
  profileUrl: string;
  source: string;
}

export interface Client {
  name: string;
  industry: string;
  status: "Active" | "Prospect" | "On hold";
  openJobs: number;
  owner: string;
}

export interface Job {
  title: string;
  client: string;
  location: string;
  status: "Open" | "Offer stage" | "Draft";
  applicants: number;
}

export interface Task {
  text: string;
  due: string;
  priority: "High" | "Med" | "Low";
  done: boolean;
}

export interface Note {
  subject: string;
  content: string;
  author: string;
  time: string;
}

export interface TeamMember {
  name: string;
  role: string;
  access: string;
}

export interface ActivityEntry {
  actor: string;
  action: string;
  time: string;
}

export const PIPELINE_STAGES = ["New", "Screening", "Interview", "Offer", "Placed"] as const;

// Sample Data
export const SAMPLE_LEADS: Lead[] = [
  { name: "Aarav Mehta", company: "Brightline Tech", source: "Referral", temperature: "Warm", owner: "Priya S.", value: "₹4.2L" },
  { name: "Sofia Rossi", company: "Helix Health", source: "Website", temperature: "Hot", owner: "Rahul K.", value: "₹7.8L" },
  { name: "Daniel Kim", company: "Orbit Retail", source: "Cold outreach", temperature: "New", owner: "Priya S.", value: "₹2.1L" },
  { name: "Neha Patel", company: "Zenith Logistics", source: "Event", temperature: "Warm", owner: "Amit D.", value: "₹5.5L" },
  { name: "Omar Haddad", company: "Crestview Bank", source: "Referral", temperature: "Hot", owner: "Rahul K.", value: "₹9.0L" },
];

export const SAMPLE_CANDIDATES: Candidate[] = [
  { name: "Isha Verma", role: "Senior React Developer", location: "Ahmedabad", stage: "Interview", experience: "6 yrs", email: "isha.verma@example.com", phone: "+91 98765 41000", profileUrl: "", source: "Sample" },
  { name: "Marco Lopez", role: "Data Analyst", location: "Remote", stage: "Screening", experience: "3 yrs", email: "marco.lopez@example.com", phone: "+91 98765 41001", profileUrl: "", source: "Sample" },
  { name: "Tanvi Shah", role: "HR Business Partner", location: "Mumbai", stage: "Offer", experience: "8 yrs", email: "tanvi.shah@example.com", phone: "+91 98765 41002", profileUrl: "", source: "Sample" },
  { name: "Liam Carter", role: "DevOps Engineer", location: "Pune", stage: "New", experience: "5 yrs", email: "liam.carter@example.com", phone: "+91 98765 41003", profileUrl: "", source: "Sample" },
  { name: "Anaya Roy", role: "Product Designer", location: "Remote", stage: "Placed", experience: "4 yrs", email: "anaya.roy@example.com", phone: "+91 98765 41004", profileUrl: "", source: "Sample" },
  { name: "Vikram Joshi", role: "Sales Manager", location: "Surat", stage: "Screening", experience: "9 yrs", email: "vikram.joshi@example.com", phone: "+91 98765 41005", profileUrl: "", source: "Sample" },
];

export const SAMPLE_CLIENTS: Client[] = [
  { name: "Brightline Tech", industry: "Technology", status: "Active", openJobs: 4, owner: "Meera N." },
  { name: "Helix Health", industry: "Healthcare", status: "Active", openJobs: 2, owner: "Rahul K." },
  { name: "Crestview Bank", industry: "Finance", status: "Prospect", openJobs: 0, owner: "Amit D." },
  { name: "Orbit Retail", industry: "Retail", status: "On hold", openJobs: 1, owner: "Priya S." },
];

export const SAMPLE_JOBS: Job[] = [
  { title: "Senior React Developer", client: "Brightline Tech", location: "Ahmedabad", status: "Open", applicants: 12 },
  { title: "Clinical Data Analyst", client: "Helix Health", location: "Remote", status: "Open", applicants: 7 },
  { title: "HR Business Partner", client: "Orbit Retail", location: "Mumbai", status: "Offer stage", applicants: 5 },
  { title: "DevOps Engineer", client: "Brightline Tech", location: "Pune", status: "Open", applicants: 9 },
  { title: "Relationship Manager", client: "Crestview Bank", location: "Surat", status: "Draft", applicants: 0 },
];

export const SAMPLE_TASKS: Task[] = [
  { text: "Call Sofia Rossi about Helix mandate", due: "Today", priority: "High", done: false },
  { text: "Send shortlist to Brightline", due: "Today", priority: "High", done: false },
  { text: "Update salary benchmarks", due: "Tomorrow", priority: "Med", done: false },
  { text: "Reference check – Tanvi Shah", due: "Fri", priority: "Med", done: false },
  { text: "Archive closed jobs", due: "Next week", priority: "Low", done: true },
];

export const SAMPLE_NOTES: Note[] = [
  { subject: "Isha Verma", content: "Strong system-design skills; notice period 30 days. Prefers hybrid.", author: "Priya S.", time: "2h ago" },
  { subject: "Helix Health", content: "Budget approved for 2 analysts in Q1. Decision maker: Dr. Rossi.", author: "Rahul K.", time: "Yesterday" },
  { subject: "Omar Haddad", content: "Wants a quarterly hiring plan before signing.", author: "Rahul K.", time: "2 days ago" },
];

export const SAMPLE_TEAM: TeamMember[] = [
  { name: "Krupal P.", role: "Owner / Admin", access: "Full access" },
  { name: "Priya S.", role: "Senior Recruiter", access: "Leads, candidates, jobs" },
  { name: "Rahul K.", role: "Account Manager", access: "Clients, leads, jobs" },
  { name: "Amit D.", role: "Recruiter", access: "Candidates, tasks" },
  { name: "Meera N.", role: "Viewer", access: "Read-only" },
];

export const SAMPLE_ACTIVITY: ActivityEntry[] = [
  { actor: "Priya S.", action: "moved Isha Verma to Interview", time: "10 min ago" },
  { actor: "Rahul K.", action: "added lead Omar Haddad", time: "1 h ago" },
  { actor: "Krupal P.", action: "changed role of Amit D. to Recruiter", time: "3 h ago" },
  { actor: "Amit D.", action: 'completed task "Update salary benchmarks"', time: "Yesterday" },
  { actor: "Priya S.", action: "saved profile link for Marco Lopez", time: "Yesterday" },
  { actor: "Rahul K.", action: 'closed job "Store Manager"', time: "2 days ago" },
];

// Role definitions for the Team page
export const ROLE_DEFINITIONS = [
  { title: "Admin", description: "Everything incl. billing" },
  { title: "Recruiter", description: "Candidates, jobs, tasks" },
  { title: "Account Manager", description: "Clients & leads" },
  { title: "Viewer", description: "Read-only" },
];

// Helper to get initials
export function getInitials(name: string): string {
  return name.split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

// Helper to get pill color class
export function getPillClass(status: string): string {
  const map: Record<string, string> = {
    Hot: "bad", Warm: "or", New: "",
    Active: "ok", Prospect: "or", "On hold": "",
    Open: "ok", "Offer stage": "or", Draft: "",
    Interview: "or", Offer: "or", Placed: "ok", Screening: "",
    High: "bad", Med: "or", Low: "",
    Today: "bad", Tomorrow: "or", Fri: "", "Next week": "",
  };
  return map[status] || "";
}
