"use client";

import { useState } from "react";
import Link from "next/link";
import { CrmShell } from "@/components/crm-shell";
import { useToast } from "@/lib/crm/toast-context";
import { useCandidateStore, type PipelineStage } from "@/lib/crm/candidate-store";

interface ImportHistoryEntry {
  type: "Import" | "Export";
  file: string;
  result: string;
  by: string;
  when: string;
}

export default function ImportExportPage() {
  const [tab, setTab] = useState<"import" | "export" | "history">("import");
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [fileName, setFileName] = useState("");
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [history, setHistory] = useState<ImportHistoryEntry[]>([
    { type: "Import", file: "bitrix24_candidates_march.csv", result: "6 added", by: "Krupal P.", when: "Today" },
    { type: "Export", file: "nexora-candidates.csv", result: "6 rows", by: "Priya S.", when: "Yesterday" },
  ]);

  const { candidates, createCandidate } = useCandidateStore();
  const { show } = useToast();

  const handleDownloadTemplate = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      "Full name,Role,Location,Stage,Experience,Email,Phone,Profile URL,Source\n" +
      "Jane Doe,Senior Data Engineer,Remote,New,5 yrs,jane.doe@example.com,+91 90000 00000,https://www.linkedin.com/in/jane-doe,Referral\n" +
      "Arjun Patel,DevOps Specialist,Ahmedabad,Screening,4 yrs,arjun.patel@example.com,+91 98765 00001,https://github.com/arjun,Website";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "nexora-candidate-template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    show("Candidate import template downloaded.");
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

        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(",").map((p) => p.replace(/["']/g, "").trim());
          const obj: Record<string, string> = {};
          headers.forEach((h, idx) => {
            obj[h] = parts[idx] || "";
          });
          if (obj["full name"] || obj["name"] || obj["candidate"]) {
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
    parsedRows.forEach((r) => {
      const name = r["full name"] || r["name"] || r["candidate"] || "Imported Candidate";
      const role = r["role"] || r["title"] || r["position"] || "Staffing Candidate";
      const location = r["location"] || r["city"] || "Remote";
      const stage = (r["stage"] || "New") as PipelineStage;
      const experience = r["experience"] || r["exp"] || "3 yrs";
      const email = r["email"] || "";
      const phone = r["phone"] || "";
      const source = r["source"] || "CSV Import";

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

    setHistory((prev) => [
      {
        type: "Import",
        file: fileName || "manual-upload.csv",
        result: `${addedCount} added`,
        by: "Krupal P.",
        when: "Just now",
      },
      ...prev,
    ]);

    setStep(4);
    show(`Successfully imported ${addedCount} candidates into talent database.`);
  };

  const handleExportCsv = () => {
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
          <h1>Import / Export Candidates</h1>
          <p className="page-sub">
            Move candidate details in and out with Excel or CSV sheets — Bitrix-compatible column mappings, duplicate checks, and import.
          </p>
        </div>
        <button className="btn ghost" onClick={handleDownloadTemplate}>
          ⬇ Download template
        </button>
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
            <span className={`step-item ${step === 2 ? "active" : step > 2 ? "done" : ""}`}>2. Map fields</span>
            <span className={`step-item ${step === 3 ? "active" : step > 3 ? "done" : ""}`}>3. Review</span>
            <span className={`step-item ${step === 4 ? "active" : ""}`}>4. Done</span>
          </div>

          {step === 1 && (
            <div>
              <label className="card drop-zone" style={{ cursor: "pointer", display: "block", textAlign: "center", padding: "40px 16px" }}>
                <input type="file" accept=".csv,.xlsx,.xls" hidden onChange={handleFileUpload} />
                <span style={{ fontSize: 38, display: "block" }}>📄</span>
                <h3 style={{ margin: "10px 0 4px" }}>Choose a CSV file</h3>
                <p style={{ color: "var(--mu)", margin: 0 }}>
                  .csv format with header row · up to 2,000 rows · processed locally in browser
                </p>
              </label>

              <div className="card" style={{ marginTop: 16 }}>
                <b>Supported Sources &amp; Connectors</b>
                <div className="row">
                  <span>Excel / CSV file (including Bitrix24 exported sheets)</span>
                  <span className="pill ok">Available</span>
                </div>
                <div className="row">
                  <span>Direct Bitrix24 migration helper</span>
                  <span className="pill or">Phase B</span>
                </div>
                <div className="row">
                  <span>Google Sheets API sync</span>
                  <span className="pill or">Phase B</span>
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
                  <span>Target Destination</span>
                  <b style={{ fontSize: 18 }}>Talent Pool</b>
                </div>
              </div>

              <div className="card tbl" style={{ marginBottom: 14 }}>
                <b>Preview First 5 Candidates</b>
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Location</th>
                      <th>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 5).map((r, i) => (
                      <tr key={i}>
                        <td><b>{r["full name"] || r["name"] || r["candidate"]}</b></td>
                        <td>{r["role"] || r["title"] || "—"}</td>
                        <td>{r["location"] || r["city"] || "—"}</td>
                        <td>{r["email"] || "—"}</td>
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
                  Confirm &amp; Import Candidates
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="card empty-state">
              <span className="big" style={{ color: "var(--ok)" }}>✓</span>
              <h3>Import Complete!</h3>
              <p>{parsedRows.length} candidate records were added to your talent database.</p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16 }}>
                <Link href="/candidates" className="btn" style={{ textDecoration: "none" }}>
                  View Candidates Database →
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
          <div className="card">
            <b>Fields to include in export</b>
            <label className="check-row"><input type="checkbox" defaultChecked /> Full name</label>
            <label className="check-row"><input type="checkbox" defaultChecked /> Role / Specialty</label>
            <label className="check-row"><input type="checkbox" defaultChecked /> Location</label>
            <label className="check-row"><input type="checkbox" defaultChecked /> Pipeline Stage</label>
            <label className="check-row"><input type="checkbox" defaultChecked /> Experience</label>
            <label className="check-row"><input type="checkbox" defaultChecked /> Email &amp; Phone</label>
            <label className="check-row"><input type="checkbox" defaultChecked /> Skills list</label>
          </div>

          <div className="card">
            <b>Export settings</b>
            <p style={{ margin: "10px 0 4px", color: "var(--mu)" }}>Format</p>
            <select defaultValue="csv">
              <option value="csv">CSV (.csv)</option>
            </select>
            <p style={{ margin: "10px 0 4px", color: "var(--mu)" }}>Records</p>
            <select>
              <option>All live candidates ({candidates.length})</option>
            </select>
            <button className="btn" style={{ marginTop: 20, width: "100%" }} onClick={handleExportCsv}>
              ⬇ Download {candidates.length} candidates as CSV
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
                  <td><b>{h.file}</b></td>
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
