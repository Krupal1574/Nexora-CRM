"use client";

import { useState } from "react";
import Link from "next/link";
import { CrmShell } from "@/components/crm-shell";
import { useToast } from "@/lib/crm/toast-context";
import { useLeadStore, type LeadStage, LEAD_STAGES } from "@/lib/crm/lead-store";
import { useCandidateStore, type PipelineStage } from "@/lib/crm/candidate-store";

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
  const [history, setHistory] = useState<ImportHistoryEntry[]>([
    { type: "Import", target: "Leads", file: "nexora_sourced_leads.csv", result: "6 added", by: "Yatri", when: "Today" },
    { type: "Export", target: "Leads", file: "nexora-leads.csv", result: "6 rows", by: "Krupal P.", when: "Today" },
    { type: "Import", target: "Candidates", file: "bitrix24_candidates_march.csv", result: "6 added", by: "Krupal P.", when: "Yesterday" },
  ]);

  const { leads, createLead } = useLeadStore();
  const { candidates, createCandidate } = useCandidateStore();
  const { show } = useToast();

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

    if (file.size > 5 * 1024 * 1024) {
      show("File size must be under 5 MB.");
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
          show("CSV must include at least a header row and one data row.");
          return;
        }

        const headers = lines[0].split(",").map((h) => h.replace(/["']/g, "").trim().toLowerCase());
        const rows: Record<string, string>[] = [];

        // Auto-detect target type based on headers
        if (headers.some((h) => h.includes("lead") || h.includes("visa") || h.includes("technology"))) {
          setTargetType("leads");
        }

        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(",").map((p) => p.replace(/["']/g, "").trim());
          const obj: Record<string, string> = {};
          headers.forEach((h, idx) => {
            obj[h] = parts[idx] || "";
          });
          if (obj["name"] || obj["full name"] || obj["candidate"]) {
            rows.push(obj);
          }
        }

        setParsedRows(rows);
        setStep(2);
        show(`Read ${rows.length} records from ${file.name}`);
      } catch {
        show("Failed to parse CSV file.");
      }
    };
    reader.readAsText(file);
  };

  const executeImport = () => {
    let addedCount = 0;

    if (targetType === "leads") {
      parsedRows.forEach((r) => {
        const name = r["name"] || r["full name"] || r["candidate"] || "Imported Lead";
        const date = r["date"] || new Date().toISOString().split("T")[0];
        const location = r["location"] || "USA";
        const phone = r["number"] || r["phone"] || "";
        const email = r["e-mail"] || r["email"] || "";
        const linkedin = r["linkedin/ facebook"] || r["linkedin"] || r["profile url"] || "";
        const visaStatus = r["visa status"] || r["visa"] || "";
        const experience = r["experience"] || r["exp"] || "";
        const leadType = r["lead type"] || "Cold Lead";
        const leadSource = r["lead source"] || r["source"] || "Linkedin Resume";
        const leadPerson = r["lead person"] || "Yatri";
        const salesPerson = r["sales person"] || "Krupal P.";
        const technology = r["technology"] || r["role"] || "Computer science";
        const accountRef = r["account ref"] || "";
        const remark = r["remark"] || "";
        const stageRaw = r["stage"] || r["lead stage"] || "";
        const matchedStage = LEAD_STAGES.find((s) => s.toLowerCase() === stageRaw.toLowerCase().trim());
        const stage: LeadStage = matchedStage || "New Lead";

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
        const name = r["full name"] || r["name"] || r["candidate"] || "Imported Candidate";
        const role = r["role"] || r["technology"] || r["title"] || "Staffing Candidate";
        const location = r["location"] || "Remote";
        const stage = (r["stage"] || "New") as PipelineStage;
        const experience = r["experience"] || "3 yrs";
        const email = r["email"] || r["e-mail"] || "";
        const phone = r["phone"] || r["number"] || "";
        const source = r["source"] || r["lead source"] || "CSV Import";

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

  return (
    <CrmShell>
      <div className="page-top">
        <div>
          <h1>Import / Export Sourced Data</h1>
          <p className="page-sub">
            Move candidate and lead records in and out with CSV sheets — supports custom staffing fields (Visa, Technology, Lead/Sales Person).
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
        <button className={`tab-btn ${tab === "export" ? "active" : ""}`} onClick={() => setTab("export")}>
          Export
        </button>
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
                <input type="file" accept=".csv" hidden onChange={handleFileUpload} />
                <span style={{ fontSize: 38, display: "block" }}>📄</span>
                <h3 style={{ margin: "10px 0 4px" }}>Choose a CSV File</h3>
                <p style={{ color: "var(--mu)", margin: 0 }}>
                  Supports Staffing Leads sheet (Date, Location, Name, Number, E-mail, LinkedIn, Visa Status, Technology, etc.)
                </p>
              </label>

              <div className="card" style={{ marginTop: 16 }}>
                <b>Recognized Staffing Schema Headers</b>
                <p style={{ color: "var(--mu)", fontSize: 13, margin: "6px 0 10px" }}>
                  Your CSV can include any or all of the following columns:
                </p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[
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
                  ].map((h) => (
                    <span key={h} className="tag" style={{ fontSize: 12 }}>{h}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="card">
              <h3>File loaded: {fileName}</h3>
              <p style={{ color: "var(--mu)" }}>
                We found {parsedRows.length} rows ready to import.
              </p>

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
                  <span>Total Rows</span>
                  <b>{parsedRows.length}</b>
                </div>
                <div className="card kpi">
                  <span>Import Destination</span>
                  <b style={{ fontSize: 18 }}>{targetType === "leads" ? "Leads Database" : "Talent Pool"}</b>
                </div>
              </div>

              <div className="card tbl" style={{ marginBottom: 14 }}>
                <b>Preview First 5 Records</b>
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Location</th>
                      <th>Technology / Domain</th>
                      <th>Visa Status</th>
                      <th>Lead Person</th>
                      <th>Contact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 5).map((r, i) => (
                      <tr key={i}>
                        <td><b>{r["name"] || r["full name"] || r["candidate"]}</b></td>
                        <td>{r["location"] || "—"}</td>
                        <td>{r["technology"] || r["role"] || "—"}</td>
                        <td>{r["visa status"] ? <span className="pill">{r["visa status"]}</span> : "—"}</td>
                        <td>{r["lead person"] || "Yatri"}</td>
                        <td>{r["number"] || r["phone"] || r["e-mail"] || r["email"] || "—"}</td>
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
                  Confirm &amp; Import {targetType === "leads" ? "Leads" : "Candidates"}
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
                  }}
                >
                  Import Another File
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "export" && (
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
