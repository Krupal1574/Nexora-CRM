// Types
export interface Lead {
  name: string;
  company?: string;
  source?: string;
  temperature: "Hot" | "Warm" | "New";
  owner: string;
  value?: string;
  date?: string;
  location?: string;
  phone?: string;
  email?: string;
  linkedin?: string;
  visaStatus?: string;
  experience?: string;
  leadType?: "Cold Lead" | "Warm Lead" | "Hot Lead" | string;
  leadSource?: string;
  leadPerson?: string;
  salesPerson?: string;
  technology?: string;
  accountRef?: string;
  remark?: string;
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

// Sample Data matching production Staffing CRM Schema
export const SAMPLE_LEADS: Lead[] = [
  {
    date: "2026-10-05",
    location: "USA",
    name: "Krishna Reddy",
    phone: "9403681567",
    email: "reddyyeddula564@gmail.com",
    linkedin: "https://www.linkedin.com/in/Krishna Reddy",
    visaStatus: "H1B",
    experience: "5+ yrs",
    leadType: "Cold Lead",
    leadSource: "Linkedin Resume",
    leadPerson: "Yatri",
    salesPerson: "Krupal P.",
    technology: "Computer science",
    accountRef: "Tech Mandate USA",
    remark: "Candidate profile imported via LinkedIn resume sourcing.",
    company: "Computer science Specialist",
    source: "Linkedin Resume",
    temperature: "New",
    owner: "Krupal P.",
    value: "₹6.0L",
  },
  {
    date: "2026-10-06",
    location: "USA",
    name: "Aarav Mehta",
    phone: "+1 408 555 0192",
    email: "aarav.mehta@brightline.tech",
    linkedin: "https://www.linkedin.com/in/aarav-mehta",
    visaStatus: "OPT / CPT",
    experience: "4 yrs",
    leadType: "Warm Lead",
    leadSource: "Referral",
    leadPerson: "Yatri",
    salesPerson: "Priya S.",
    technology: "Full Stack (React / Node)",
    accountRef: "Brightline Tech",
    remark: "Candidate seeking US hybrid/remote full stack opening.",
    company: "Brightline Tech",
    source: "Referral",
    temperature: "Warm",
    owner: "Priya S.",
    value: "₹4.2L",
  },
  {
    date: "2026-10-07",
    location: "USA",
    name: "Sofia Rossi",
    phone: "+1 617 555 0144",
    email: "sofia.rossi@helixhealth.io",
    linkedin: "https://www.linkedin.com/in/sofia-rossi",
    visaStatus: "US Citizen",
    experience: "8 yrs",
    leadType: "Hot Lead",
    leadSource: "Website",
    leadPerson: "Yatri",
    salesPerson: "Rahul K.",
    technology: "Healthcare Data Analytics",
    accountRef: "Helix Health",
    remark: "Direct inquiry for staffing 2 clinical analysts in Q1.",
    company: "Helix Health",
    source: "Website",
    temperature: "Hot",
    owner: "Rahul K.",
    value: "₹7.8L",
  },
  {
    date: "2026-10-08",
    location: "Canada",
    name: "Daniel Kim",
    phone: "+1 416 555 0188",
    email: "daniel.kim@orbitretail.ca",
    linkedin: "https://www.linkedin.com/in/daniel-kim",
    visaStatus: "PR",
    experience: "5 yrs",
    leadType: "Cold Lead",
    leadSource: "Cold outreach",
    leadPerson: "Yatri",
    salesPerson: "Priya S.",
    technology: "DevOps & Cloud (AWS)",
    accountRef: "Orbit Retail",
    remark: "Candidate reached out via email outreach; following up.",
    company: "Orbit Retail",
    source: "Cold outreach",
    temperature: "New",
    owner: "Priya S.",
    value: "₹2.1L",
  },
  {
    date: "2026-10-09",
    location: "India",
    name: "Neha Patel",
    phone: "+91 98765 44004",
    email: "neha.patel@zenithlog.com",
    linkedin: "https://www.linkedin.com/in/neha-patel",
    visaStatus: "Citizen",
    experience: "7 yrs",
    leadType: "Warm Lead",
    leadSource: "Staffing Event",
    leadPerson: "Priya S.",
    salesPerson: "Amit D.",
    technology: "Supply Chain Solutions",
    accountRef: "Zenith Logistics",
    remark: "Met at hiring conference; interested in corporate mandate.",
    company: "Zenith Logistics",
    source: "Event",
    temperature: "Warm",
    owner: "Amit D.",
    value: "₹5.5L",
  },
  {
    date: "2026-10-10",
    location: "USA",
    name: "Omar Haddad",
    phone: "+1 312 555 0177",
    email: "omar.haddad@crestview.bank",
    linkedin: "https://www.linkedin.com/in/omar-haddad",
    visaStatus: "Green Card",
    experience: "10 yrs",
    leadType: "Hot Lead",
    leadSource: "Referral",
    leadPerson: "Yatri",
    salesPerson: "Rahul K.",
    technology: "Banking / Fintech Core",
    accountRef: "Crestview Bank",
    remark: "Enterprise hiring mandate in final contract review.",
    company: "Crestview Bank",
    source: "Referral",
    temperature: "Hot",
    owner: "Rahul K.",
    value: "₹9.0L",
  },
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
  { subject: "Krishna Reddy", content: "Sourced via LinkedIn Resume. Computer Science background, H1B visa in USA.", author: "Yatri", time: "Just now" },
  { subject: "Isha Verma", content: "Strong system-design skills; notice period 30 days. Prefers hybrid.", author: "Priya S.", time: "2h ago" },
  { subject: "Helix Health", content: "Budget approved for 2 analysts in Q1. Decision maker: Dr. Rossi.", author: "Rahul K.", time: "Yesterday" },
  { subject: "Omar Haddad", content: "Wants a quarterly hiring plan before signing.", author: "Rahul K.", time: "2 days ago" },
];

export const SAMPLE_TEAM: TeamMember[] = [
  { name: "Krupal P.", role: "Owner / Admin", access: "Full access" },
  { name: "Priya S.", role: "Senior Recruiter", access: "Leads, candidates, jobs" },
  { name: "Rahul K.", role: "Account Manager", access: "Clients, leads, jobs" },
  { name: "Amit D.", role: "Recruiter", access: "Candidates, tasks" },
  { name: "Yatri", role: "Lead Sourcer", access: "Leads sourcing, candidates" },
  { name: "Meera N.", role: "Viewer", access: "Read-only" },
];

export const SAMPLE_ACTIVITY: ActivityEntry[] = [
  { actor: "Yatri", action: "imported lead Krishna Reddy from LinkedIn Resume", time: "Just now" },
  { actor: "Priya S.", action: "moved Isha Verma to Interview", time: "10 min ago" },
  { actor: "Rahul K.", action: "added lead Omar Haddad", time: "1 h ago" },
  { actor: "Krupal P.", action: "assigned lead Krishna Reddy to Sales", time: "2 h ago" },
  { actor: "Amit D.", action: "completed task “Update salary benchmarks”", time: "Yesterday" },
  { actor: "Priya S.", action: "saved profile link for Marco Lopez", time: "Yesterday" },
];

// Role definitions for the Team page
export const ROLE_DEFINITIONS = [
  { title: "Admin", description: "Everything incl. billing" },
  { title: "Recruiter", description: "Candidates, jobs, tasks" },
  { title: "Account Manager", description: "Clients & leads" },
  { title: "Lead Sourcer", description: "Leads sourcing & candidates" },
  { title: "Viewer", description: "Read-only" },
];

// Helper functions
export function getInitials(name: string): string {
  if (!name) return "??";
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function getPillClass(status: string): string {
  switch (status) {
    case "Hot":
    case "Hot Lead":
    case "High":
      return "bad";
    case "Warm":
    case "Warm Lead":
    case "Med":
    case "Interview":
    case "Offer":
    case "Offer stage":
    case "Prospect":
      return "or";
    case "Active":
    case "Placed":
    case "Open":
    case "Qualified":
    case "Enrolled":
      return "ok";
    default:
      return "";
  }
}
