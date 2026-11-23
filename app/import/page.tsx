"use client";

import { useState } from "react";
import Link from "next/link";
import { CrmShell } from "@/components/crm-shell";
import { useToast } from "@/lib/crm/toast-context";
import { useLeadStore, type LeadStage, LEAD_STAGES } from "@/lib/crm/lead-store";
import { useCandidateStore, type PipelineStage } from "@/lib/crm/candidate-store";
import { useAuth } from "@/lib/crm/auth-context";

/* ═══════════════════════════════════════════════════════════════════════
   RFC 4180 CSV Parser — handles quoted fields, multi-line values,
   and auto-detects comma vs semicolon delimiter.
   ═══════════════════════════════════════════════════════════════════════ */

function detectDelimiter(text: string): string {
  // Check the first line (header) for semicolons vs commas
  const firstLine = text.split(/\r?\n/)[0] || "";
  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return semicolons > commas ? ";" : ",";
}

function parseCSV(text: string, delimiter?: string): string[][] {
  const delim = delimiter || detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        // Check for escaped quote ""
        if (i + 1 < text.length && text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          // End of quoted field
          inQuotes = false;
          i++;
        }
      } else {
        field += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === delim) {
        row.push(field.trim());
        field = "";
        i++;
      } else if (ch === "\r") {
        // Skip \r, handle \n next
        i++;
      } else if (ch === "\n") {
        row.push(field.trim());
        field = "";
        if (row.some((c) => c.length > 0)) {
          rows.push(row);
        }
        row = [];
        i++;
      } else {
        field += ch;
        i++;
      }
    }
  }

  // Last field/row
  row.push(field.trim());
  if (row.some((c) => c.length > 0)) {
    rows.push(row);
  }

  return rows;
}

/* ═══════════════════════════════════════════════════════════════════════
   Bitrix24 ↔ Nexora column mapping
   ═══════════════════════════════════════════════════════════════════════ */

type ImportFormat = "nexora" | "bitrix24" | "unknown";

/** Map from lowercase Bitrix24 header → Nexora internal key */
const BITRIX_TO_NEXORA: Record<string, string> = {
  "lead name": "name",
  "first name": "firstName",
  "last name": "lastName",
  stage: "stage",
  mobile: "phone",
  "work phone": "phone_alt",
  "work e-mail": "email",
  "home e-mail": "email_alt",
  linkedin: "linkedin",
  visa: "visaStatus",
  "job role": "technology",
  "total experience": "experience",
  source: "leadSource",
  responsible: "salesPerson",
  "lead generator": "leadPerson",
  "lead create by": "leadPerson_alt",
  created: "date",
  "company name": "company",
  position: "position",
  comment: "remark",
  id: "bitrixId",
  "created by": "createdBy",
  city: "city",
  country: "country",
  "source information": "sourceInfo",
};

/** Nexora staffing sheet headers (lowercase) → Nexora internal key */
const NEXORA_HEADERS: Record<string, string> = {
  date: "date",
  location: "location",
  name: "name",
  number: "phone",
  "e-mail": "email",
  "linkedin/ facebook": "linkedin",
  "visa status": "visaStatus",
  experience: "experience",
  "lead type": "leadType",
  "lead source": "leadSource",
  "lead person": "leadPerson",
  "sales person": "salesPerson",
  technology: "technology",
  "account ref": "accountRef",
  remark: "remark",
  stage: "stage",
  "lead stage": "stage",
  "full name": "name",
  candidate: "name",
  phone: "phone",
  email: "email",
  linkedin: "linkedin",
  visa: "visaStatus",
  role: "technology",
  source: "leadSource",
};

function detectFormat(headers: string[]): ImportFormat {
  const lowerHeaders = headers.map((h) => h.toLowerCase());
  // Bitrix24 signature: has "lead name", "responsible", Bitrix-specific columns
  const bitrixSignals = ["lead name", "responsible", "work e-mail", "lead generator", "work phone"].filter((s) =>
    lowerHeaders.includes(s)
  );
  if (bitrixSignals.length >= 2) return "bitrix24";

  // Nexora signature: has "name" or "full name", plus staffing fields
  const nexoraSignals = ["name", "full name", "technology", "visa status", "lead person", "sales person"].filter((s) =>
    lowerHeaders.includes(s)
  );
  if (nexoraSignals.length >= 2) return "nexora";

  return "unknown";
}

/** Convert Bitrix24 date "DD.MM.YYYY HH:MM:SS" → "YYYY-MM-DD" */
function parseBitrixDate(raw: string): string {
  if (!raw) return new Date().toISOString().split("T")[0];
  const match = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  // Try ISO format
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  return new Date().toISOString().split("T")[0];
}

/** Case-insensitive match to LeadStage, handling Bitrix24 ALL-CAPS */
function matchLeadStage(raw: string): LeadStage {
  if (!raw) return "New Lead";
  const cleaned = raw.trim();
  // Exact match first
  const exact = LEAD_STAGES.find((s) => s === cleaned);
  if (exact) return exact;
  // Case-insensitive
  const lower = cleaned.toLowerCase();
  const matched = LEAD_STAGES.find((s) => s.toLowerCase() === lower);
  if (matched) return matched;
  // Fuzzy: "chat lead" → "Chat Lead", "follow up" → "Follow Up"
  return "New Lead";
}

/* ═══════════════════════════════════════════════════════════════════════
   Normalize parsed rows into a unified internal record format
   ═══════════════════════════════════════════════════════════════════════ */

function normalizeRows(
  headers: string[],
  dataRows: string[][],
  format: ImportFormat
): Record<string, string>[] {
  const mapping = format === "bitrix24" ? BITRIX_TO_NEXORA : NEXORA_HEADERS;
  const lowerHeaders = headers.map((h) => h.toLowerCase());

  return dataRows
    .map((cells) => {
      const raw: Record<string, string> = {};
      lowerHeaders.forEach((h, idx) => {
        const key = mapping[h];
        if (key && cells[idx]) {
          // Don't overwrite if already set (prefer primary over _alt)
          if (!raw[key] || !raw[key].trim()) {
            raw[key] = cells[idx];
          }
        }
        // Also store raw header for debugging
        raw[`_raw_${h}`] = cells[idx] || "";
      });

      // Bitrix24-specific: construct name from firstName/lastName if no "Lead Name"
      if (!raw["name"] && (raw["firstName"] || raw["lastName"])) {
        raw["name"] = [raw["firstName"], raw["lastName"]].filter(Boolean).join(" ");
      }

      // Fallback phone from alt
      if (!raw["phone"] && raw["phone_alt"]) raw["phone"] = raw["phone_alt"];
      // Fallback email from alt
      if (!raw["email"] && raw["email_alt"]) raw["email"] = raw["email_alt"];
      // Fallback leadPerson from alt
      if (!raw["leadPerson"] && raw["leadPerson_alt"]) raw["leadPerson"] = raw["leadPerson_alt"];

      // Normalize date for Bitrix24 format
      if (format === "bitrix24" && raw["date"]) {
        raw["date"] = parseBitrixDate(raw["date"]);
      }

      // Normalize stage
      if (raw["stage"]) {
        raw["stage"] = matchLeadStage(raw["stage"]);
      }

      return raw;
    })
    .filter((r) => r["name"] && r["name"].trim().length > 0);
}

/* ═══════════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════════ */

interface ImportHistoryEntry {
  type: "Import" | "Export";
  target: "Leads" | "Candidates";
  file: string;
  result: string;
  by: string;
  when: string;
}

export default function ImportExportPage() {
  const [tab, setTab] = useState<"import" | "export" | "history">("import");
  const [targetType, setTargetType] = useState<"leads" | "candidates">("leads");
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [fileName, setFileName] = useState("");
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [detectedFormat, setDetectedFormat] = useState<ImportFormat>("unknown");
  const [history, setHistory] = useState<ImportHistoryEntry[]>([
    { type: "Import", target: "Leads", file: "nexora_sourced_leads.csv", result: "6 added", by: "Yatri", when: "Today" },
    { type: "Export", target: "Leads", file: "nexora-leads.csv", result: "6 rows", by: "Krupal P.", when: "Today" },
    { type: "Import", target: "Candidates", file: "bitrix24_candidates_march.csv", result: "6 added", by: "Krupal P.", when: "Yesterday" },
  ]);

  const { leads, createLead } = useLeadStore();
  const { candidates, createCandidate } = useCandidateStore();
  const { show } = useToast();
  const { isAdmin } = useAuth();

  const handleDownloadLeadTemplate = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      "Date,Location,Name,Number,E-mail,Linkedin/ Facebook,Visa Status,Experience,Lead Type,Lead Source,Lead Person,Sales Person,Technology,Account Ref,Remark\n" +
      "2026-10-05,USA,Krishna Reddy,9403681567,reddyyeddula564@gmail.com,https://www.linkedin.com/in/Krishna Reddy,H1B,5+ yrs,Cold Lead,Linkedin Resume,Yatri,Krupal P.,Computer science,Tech Mandate USA,Resume sourced via LinkedIn\n" +
      "2026-10-06,USA,Aarav Mehta,+1 408 555 0192,aarav.mehta@brightline.tech,https://www.linkedin.com/in/aarav-mehta,OPT,4 yrs,Warm Lead,Referral,Yatri,Priya S.,Full Stack React,Brightline Tech,Interested in hybrid roles";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "nexora-leads-import-template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    show("Staffing Leads template downloaded.");
  };

  const handleDownloadCandidateTemplate = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      "Full name,Role,Location,Stage,Experience,Email,Phone,Profile URL,Source\n" +
      "Jane Doe,Senior Data Engineer,Remote,New,5 yrs,jane.doe@example.com,+91 90000 00000,https://www.linkedin.com/in/jane-doe,Referral";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "nexora-candidate-template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    show("Candidates template downloaded.");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      show("File size must be under 10 MB.");
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;

        // Parse with proper RFC 4180 parser (auto-detects delimiter)
        const allRows = parseCSV(text);
        if (allRows.length < 2) {
          show("File must include at least a header row and one data row.");
          return;
        }

        const headers = allRows[0];
        const dataRows = allRows.slice(1);

        // Detect format
        const format = detectFormat(headers);
        setDetectedFormat(format);

        // Auto-select leads for Bitrix24 since it's always leads
        if (format === "bitrix24") {
          setTargetType("leads");
        }

        // Normalize all rows using the detected mapping
        const normalized = normalizeRows(headers, dataRows, format);

        setParsedRows(normalized);
        setStep(2);
        show(`Parsed ${normalized.length} records from ${file.name} (${format === "bitrix24" ? "Bitrix24" : format === "nexora" ? "Nexora" : "Generic"} format detected)`);
      } catch {
        show("Failed to parse CSV file. Check the format and try again.");
      }
    };
    reader.readAsText(file);
  };

  const executeImport = () => {
    let addedCount = 0;

    if (targetType === "leads") {
      parsedRows.forEach((r) => {
        const name = r["name"] || "Imported Lead";
        const date = r["date"] || new Date().toISOString().split("T")[0];
        const location = r["location"] || r["city"] || r["country"] || "USA";
        const phone = r["phone"] || "";
        const email = r["email"] || "";
        const linkedin = r["linkedin"] || "";
        const visaStatus = r["visaStatus"] || "";
        const experience = r["experience"] || "";
        const leadType = r["leadType"] || "Cold Lead";
        const leadSource = r["leadSource"] || "CSV Import";
        const leadPerson = r["leadPerson"] || "Yatri";
        const salesPerson = r["salesPerson"] || "Krupal P.";
        const technology = r["technology"] || r["position"] || "";
        const accountRef = r["accountRef"] || r["company"] || "";
        const remark = r["remark"] || "";
        const stage: LeadStage = matchLeadStage(r["stage"] || "");

        createLead({
          name,
          date,
          location,
          phone,
          email,
          linkedin,
          visaStatus,
          experience,
          leadType,
          leadSource,
          leadPerson,
          salesPerson,
          technology,
          accountRef,
          remark,
          company: accountRef || technology || "Independent Candidate",
          owner: salesPerson,
          stage,
        });
        addedCount++;
      });
    } else {
      parsedRows.forEach((r) => {
        const name = r["name"] || "Imported Candidate";
        const role = r["technology"] || r["position"] || "Staffing Candidate";
        const location = r["location"] || r["city"] || "Remote";
        const stage = (r["stage"] || "New") as PipelineStage;
        const experience = r["experience"] || "3 yrs";
        const email = r["email"] || "";
        const phone = r["phone"] || "";
        const source = r["leadSource"] || "CSV Import";

        createCandidate({
          name,
          role,
          location,
          stage,
          experience,
          email,
          phone,
          source,
        });
        addedCount++;
      });
    }

    setHistory((prev) => [
      {
        type: "Import",
        target: targetType === "leads" ? "Leads" : "Candidates",
        file: fileName || "manual-upload.csv",
        result: `${addedCount} added`,
        by: "Krupal P.",
        when: "Just now",
      },
      ...prev,
    ]);

    setStep(4);
    show(`Successfully imported ${addedCount} ${targetType} into CRM.`);
  };

  const handleExportLeadsCsv = () => {
    if (!isAdmin) {
      show("Export is restricted to Administrators only.");
      return;
    }
    const headers = [
      "Date",
      "Location",
      "Name",
      "Number",
      "E-mail",
      "Linkedin/ Facebook",
      "Visa Status",
      "Experience",
      "Lead Type",
      "Lead Source",
      "Lead Person",
      "Sales Person",
      "Technology",
      "Account Ref",
      "Remark",
    ].join(",");

    const rows = leads
      .map((l) =>
        [
          `"${l.date || l.createdAt.split("T")[0]}"`,
          `"${l.location || ""}"`,
          `"${l.name}"`,
          `"${l.phone || ""}"`,
          `"${l.email || ""}"`,
          `"${l.linkedin || l.profileUrls?.[0] || ""}"`,
          `"${l.visaStatus || ""}"`,
          `"${l.experience || ""}"`,
          `"${l.leadType || (l.temperature === "Hot" ? "Hot Lead" : l.temperature === "Warm" ? "Warm Lead" : "Cold Lead")}"`,
          `"${l.leadSource || l.source || ""}"`,
          `"${l.leadPerson || "Yatri"}"`,
          `"${l.salesPerson || l.owner || ""}"`,
          `"${l.technology || l.company || ""}"`,
          `"${l.accountRef || ""}"`,
          `"${l.remark || l.notes?.[0]?.text || ""}"`,
        ].join(",")
      )
      .join("\n");

    const blob = new Blob([headers + "\n" + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `nexora-leads-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setHistory((prev) => [
      {
        type: "Export",
        target: "Leads",
        file: `nexora-leads-${new Date().toISOString().slice(0, 10)}.csv`,
        result: `${leads.length} rows`,
        by: "Krupal P.",
        when: "Just now",
      },
      ...prev,
    ]);

    show(`Exported ${leads.length} leads in exact staffing format.`);
  };

  const handleExportCandidatesCsv = () => {
    if (!isAdmin) {
      show("Export is restricted to Administrators only.");
      return;
    }
    const headers = "Name,Role,Location,Stage,Experience,Email,Phone,Skills\n";
    const rows = candidates
      .map(
        (c) =>
          `"${c.name}","${c.role}","${c.location}","${c.stage}","${c.experience}","${c.email}","${c.phone}","${(c.skills || []).join("; ")}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `nexora-candidates-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setHistory((prev) => [
      {
        type: "Export",
        target: "Candidates",
        file: `nexora-candidates-${new Date().toISOString().slice(0, 10)}.csv`,
        result: `${candidates.length} rows`,
        by: "Krupal P.",
        when: "Just now",
      },
      ...prev,
    ]);

    show(`Exported ${candidates.length} candidates.`);
  };

  const formatLabel =
    detectedFormat === "bitrix24"
      ? "🔄 Bitrix24 CRM Export"
      : detectedFormat === "nexora"
        ? "📋 Nexora Staffing Sheet"
        : "📄 Generic CSV";

  /* ── Stage distribution summary for review step ── */
  const stageCounts: Record<string, number> = {};
  parsedRows.forEach((r) => {
    const s = r["stage"] || "New Lead";
    stageCounts[s] = (stageCounts[s] || 0) + 1;
  });

  return (
    <CrmShell>
      <div className="page-top">
        <div>
          <h1>Import / Export Sourced Data</h1>
          <p className="page-sub">
            Move candidate and lead records in and out with CSV sheets — supports Nexora Staffing format, Bitrix24 exports, and generic CSVs.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn ghost" onClick={handleDownloadLeadTemplate}>
            ⬇ Leads Template (Staffing)
          </button>
          <button className="btn ghost" onClick={handleDownloadCandidateTemplate}>
            ⬇ Candidates Template
          </button>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${tab === "import" ? "active" : ""}`} onClick={() => setTab("import")}>
          Import
        </button>
        {isAdmin && (
          <button className={`tab-btn ${tab === "export" ? "active" : ""}`} onClick={() => setTab("export")}>
            Export
          </button>
        )}
        <button className={`tab-btn ${tab === "history" ? "active" : ""}`} onClick={() => setTab("history")}>
          History
        </button>
      </div>

      {tab === "import" && (
        <div>
          <div className="steps" style={{ marginBottom: 16 }}>
            <span className={`step-item ${step === 1 ? "active" : step > 1 ? "done" : ""}`}>1. Upload</span>
            <span className={`step-item ${step === 2 ? "active" : step > 2 ? "done" : ""}`}>2. Target &amp; Map</span>
            <span className={`step-item ${step === 3 ? "active" : step > 3 ? "done" : ""}`}>3. Review</span>
            <span className={`step-item ${step === 4 ? "active" : ""}`}>4. Done</span>
          </div>

          {step === 1 && (
            <div>
              <label className="card drop-zone" style={{ cursor: "pointer", display: "block", textAlign: "center", padding: "40px 16px" }}>
                <input type="file" accept=".csv,.txt" hidden onChange={handleFileUpload} />
                <span style={{ fontSize: 38, display: "block" }}>📄</span>
                <h3 style={{ margin: "10px 0 4px" }}>Choose a CSV File</h3>
                <p style={{ color: "var(--mu)", margin: 0 }}>
                  Auto-detects format: Nexora Staffing Sheet, Bitrix24 CRM Export, or generic CSV.
                  <br />
                  Supports comma (,) and semicolon (;) delimiters.
                </p>
              </label>

              <div className="grid g2" style={{ marginTop: 16 }}>
                <div className="card">
                  <b>📋 Nexora Staffing Sheet</b>
                  <p style={{ color: "var(--mu)", fontSize: 13, margin: "6px 0 10px" }}>
                    15-column format: Date, Location, Name, Number, E-mail, LinkedIn, Visa Status, Experience, Lead Type, Lead Source, etc.
                  </p>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {["Date", "Name", "Number", "E-mail", "Visa Status", "Technology", "Lead Person", "Sales Person"].map((h) => (
                      <span key={h} className="tag" style={{ fontSize: 11 }}>{h}</span>
                    ))}
                  </div>
                </div>
                <div className="card">
                  <b>🔄 Bitrix24 CRM Export</b>
                  <p style={{ color: "var(--mu)", fontSize: 13, margin: "6px 0 10px" }}>
                    Semicolon-separated export with 90+ columns. Auto-maps Lead Name, Stage, Mobile, Work E-mail, LinkedIn, Visa, Job Role, etc.
                  </p>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {["Lead Name", "Stage", "Mobile", "Work E-mail", "Visa", "Job Role", "Responsible", "Lead Generator"].map((h) => (
                      <span key={h} className="tag" style={{ fontSize: 11 }}>{h}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="card">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>File loaded: {fileName}</h3>
                <span className="pill ok" style={{ fontSize: 12 }}>{formatLabel}</span>
              </div>
              <p style={{ color: "var(--mu)" }}>
                We found <b>{parsedRows.length}</b> valid records ready to import.
              </p>

              {detectedFormat === "bitrix24" && (
                <div style={{ background: "var(--b2)", borderRadius: 8, padding: "10px 14px", margin: "10px 0", fontSize: 13 }}>
                  <b>Bitrix24 Auto-Mapping:</b> Lead Name → Name, Stage → Stage (case-matched to 16 Nexora stages),
                  Mobile → Phone, Work E-mail → Email, LinkedIn → LinkedIn, Visa → Visa Status,
                  Total Experience → Experience, Source → Lead Source, Responsible → Sales Person,
                  Lead Generator → Lead Person, Created → Date (DD.MM → YYYY-MM-DD)
                </div>
              )}

              <div style={{ margin: "16px 0" }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
                  Select Import Destination:
                </label>
                <div style={{ display: "flex", gap: 12 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="targetType"
                      checked={targetType === "leads"}
                      onChange={() => setTargetType("leads")}
                    />
                    <b>Recruitment Leads Database</b> (Matches staffing sourcing sheet)
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="targetType"
                      checked={targetType === "candidates"}
                      onChange={() => setTargetType("candidates")}
                    />
                    <b>Candidate Talent Pool</b>
                  </label>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button className="btn ghost" onClick={() => setStep(1)}>
                  ← Choose another file
                </button>
                <button className="btn" onClick={() => setStep(3)}>
                  Next: Review rows →
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="grid g4" style={{ marginBottom: 14 }}>
                <div className="card kpi">
                  <span>Total Records</span>
                  <b>{parsedRows.length}</b>
                </div>
                <div className="card kpi">
                  <span>Source Format</span>
                  <b style={{ fontSize: 16 }}>{detectedFormat === "bitrix24" ? "Bitrix24" : detectedFormat === "nexora" ? "Nexora" : "CSV"}</b>
                </div>
                <div className="card kpi">
                  <span>Destination</span>
                  <b style={{ fontSize: 16 }}>{targetType === "leads" ? "Leads DB" : "Talent Pool"}</b>
                </div>
                <div className="card kpi">
                  <span>Stages Found</span>
                  <b>{Object.keys(stageCounts).length}</b>
                </div>
              </div>

              {/* Stage distribution */}
              {targetType === "leads" && Object.keys(stageCounts).length > 1 && (
                <div className="card" style={{ marginBottom: 14 }}>
                  <b>Stage Distribution</b>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                    {Object.entries(stageCounts)
                      .sort(([, a], [, b]) => b - a)
                      .map(([stage, count]) => (
                        <span key={stage} className="tag" style={{ fontSize: 12 }}>
                          {stage}: {count}
                        </span>
                      ))}
                  </div>
                </div>
              )}

              <div className="card tbl" style={{ marginBottom: 14 }}>
                <b>Preview First 5 Records</b>
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Stage</th>
                      <th>Phone</th>
                      <th>Email</th>
                      <th>Visa</th>
                      <th>LinkedIn</th>
                      <th>Sales Person</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 5).map((r, i) => (
                      <tr key={i}>
                        <td><b>{r["name"]}</b></td>
                        <td><span className="pill">{r["stage"] || "New Lead"}</span></td>
                        <td>{r["phone"] || "—"}</td>
                        <td style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }}>{r["email"] || "—"}</td>
                        <td>{r["visaStatus"] ? <span className="pill">{r["visaStatus"]}</span> : "—"}</td>
                        <td>{r["linkedin"] ? "✓" : "—"}</td>
                        <td>{r["salesPerson"] || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn ghost" onClick={() => setStep(2)}>
                  ← Back
                </button>
                <button className="btn" onClick={executeImport}>
                  Confirm &amp; Import {parsedRows.length} {targetType === "leads" ? "Leads" : "Candidates"}
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="card empty-state">
              <span className="big" style={{ color: "var(--ok)" }}>✓</span>
              <h3>Import Complete!</h3>
              <p>{parsedRows.length} records were added into your {targetType === "leads" ? "Leads" : "Candidate"} database.</p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16 }}>
                <Link
                  href={targetType === "leads" ? "/leads" : "/candidates"}
                  className="btn"
                  style={{ textDecoration: "none" }}
                >
                  View {targetType === "leads" ? "Leads Database" : "Candidates Database"} →
                </Link>
                <button
                  className="btn ghost"
                  onClick={() => {
                    setStep(1);
                    setParsedRows([]);
                    setFileName("");
                    setDetectedFormat("unknown");
                  }}
                >
                  Import Another File
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "export" && !isAdmin && (
        <div className="card empty-state">
          <span className="big">🔒</span>
          <h3>Export Restricted</h3>
          <p style={{ color: "var(--mu)", fontSize: 13, marginTop: 6 }}>
            Exporting staffing leads and candidate records is restricted to Administrators only.
          </p>
        </div>
      )}

      {tab === "export" && isAdmin && (
        <div className="grid g2">
          {/* Export Leads */}
          <div className="card">
            <b>Export Staffing Leads</b>
            <p style={{ color: "var(--mu)", fontSize: 13, margin: "6px 0 12px" }}>
              Exports all {leads.length} leads in the exact 15-column format:
              <br />
              <code style={{ fontSize: 11, display: "block", marginTop: 4 }}>
                Date, Location, Name, Number, E-mail, Linkedin/ Facebook, Visa Status, Experience, Lead Type, Lead Source, Lead Person, Sales Person, Technology, Account Ref, Remark
              </code>
            </p>
            <button className="btn" style={{ width: "100%" }} onClick={handleExportLeadsCsv}>
              ⬇ Download {leads.length} Leads (Staffing CSV)
            </button>
          </div>

          {/* Export Candidates */}
          <div className="card">
            <b>Export Talent Candidates</b>
            <p style={{ color: "var(--mu)", fontSize: 13, margin: "6px 0 12px" }}>
              Exports all {candidates.length} candidate profiles including pipeline stages, skills, and experience.
            </p>
            <button className="btn ghost" style={{ width: "100%", marginTop: 24 }} onClick={handleExportCandidatesCsv}>
              ⬇ Download {candidates.length} Candidates as CSV
            </button>
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="card tbl">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Target</th>
                <th>File Name</th>
                <th>Result</th>
                <th>Operator</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={i}>
                  <td><span className={`pill ${h.type === "Import" ? "ok" : "or"}`}>{h.type}</span></td>
                  <td><b>{h.target}</b></td>
                  <td>{h.file}</td>
                  <td>{h.result}</td>
                  <td>{h.by}</td>
                  <td>{h.when}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CrmShell>
  );
}
