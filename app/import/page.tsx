"use client";
import { useState } from "react";
import { CrmShell } from "@/components/crm-shell";
import { SoonButton, useToast } from "@/lib/crm/toast-context";
import { SAMPLE_CANDIDATES } from "@/lib/crm/sample-data";

export default function ImportExportPage() {
  const [tab, setTab] = useState<"import" | "export" | "history">("import");
  const { show } = useToast();

  const handleDownloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8," +
      "Full name,Role,Location,Stage,Experience,Email,Phone,Profile URL,Source\n" +
      "Jane Doe,Data Analyst,Remote,New,4 yrs,jane.doe@example.com,+91 90000 00000,https://www.linkedin.com/in/jane-doe,Referral";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "nexora-candidate-template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    show("Template downloaded.");
  };

  const handleExportCsv = () => {
    const headers = "Name,Role,Location,Stage,Experience,Email,Phone\n";
    const rows = SAMPLE_CANDIDATES.map(
      (c) => `"${c.name}","${c.role}","${c.location}","${c.stage}","${c.experience}","${c.email}","${c.phone}"`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "nexora-candidates.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    show("Exported candidates to CSV.");
  };

  return (
    <CrmShell>
      <div className="page-top">
        <div>
          <h1>Import / Export Candidates</h1>
          <p className="page-sub">
            Move candidate details in and out with Excel or CSV sheets — upload, map fields, check duplicates, import.
          </p>
        </div>
        <button className="btn ghost" onClick={handleDownloadTemplate}>⬇ Download template</button>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${tab === "import" ? "active" : ""}`} onClick={() => setTab("import")}>Import</button>
        <button className={`tab-btn ${tab === "export" ? "active" : ""}`} onClick={() => setTab("export")}>Export</button>
        <button className={`tab-btn ${tab === "history" ? "active" : ""}`} onClick={() => setTab("history")}>History</button>
      </div>

      {tab === "import" && (
        <div>
          <div className="steps">
            <span className="step-item active">1. Upload</span>
            <span className="step-item">2. Map fields</span>
            <span className="step-item">3. Review</span>
            <span className="step-item">4. Done</span>
          </div>

          <label className="card drop-zone">
            <input type="file" accept=".xlsx,.xls,.csv" hidden onChange={() => show("File uploaded! Field mapping is coming soon.")} />
            <span style={{ fontSize: 34, display: "block" }}>📄</span>
            <h3 style={{ margin: "8px 0 4px" }}>Choose an Excel or CSV file</h3>
            <p style={{ color: "var(--mu)", margin: 0 }}>
              .xlsx, .xls or .csv · first row = column headers · up to 2,000 rows
            </p>
          </label>

          <div className="card" style={{ marginTop: 14 }}>
            <b>Sources</b>
            <div className="row"><span>Excel / CSV file (including Bitrix24 export)</span><span className="pill ok">Available</span></div>
            <div className="row"><span>Connect Bitrix24 directly</span><span className="pill soon">Coming soon</span></div>
            <div className="row"><span>Google Sheets</span><span className="pill soon">Coming soon</span></div>
            <div className="row"><span>Bulk resume upload with parsing</span><span className="pill soon">Coming soon</span></div>
          </div>
        </div>
      )}

      {tab === "export" && (
        <div className="grid g2">
          <div className="card">
            <b>Fields to include</b>
            <label className="check-row"><input type="checkbox" defaultChecked /> Full name</label>
            <label className="check-row"><input type="checkbox" defaultChecked /> Role / Title</label>
            <label className="check-row"><input type="checkbox" defaultChecked /> Location</label>
            <label className="check-row"><input type="checkbox" defaultChecked /> Stage</label>
            <label className="check-row"><input type="checkbox" defaultChecked /> Experience</label>
            <label className="check-row"><input type="checkbox" defaultChecked /> Email</label>
            <label className="check-row"><input type="checkbox" defaultChecked /> Phone</label>
          </div>

          <div className="card">
            <b>Export settings</b>
            <p style={{ margin: "10px 0 4px", color: "var(--mu)" }}>Format</p>
            <select defaultValue="csv">
              <option value="csv">CSV (.csv)</option>
              <option value="xlsx">Excel (.xlsx)</option>
            </select>
            <p style={{ margin: "10px 0 4px", color: "var(--mu)" }}>Which candidates</p>
            <select>
              <option>All candidates ({SAMPLE_CANDIDATES.length})</option>
            </select>
            <button className="btn" style={{ marginTop: 16, width: "100%" }} onClick={handleExportCsv}>
              ⬇ Export {SAMPLE_CANDIDATES.length} candidates
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
                <th>File</th>
                <th>Result</th>
                <th>By</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span className="pill">Import</span></td>
                <td>candidates_march.xlsx</td>
                <td>42 added · 3 skipped</td>
                <td>Krupal P.</td>
                <td>Today</td>
              </tr>
              <tr>
                <td><span className="pill or">Export</span></td>
                <td>nexora-candidates.csv</td>
                <td>6 rows</td>
                <td>Priya S.</td>
                <td>Yesterday</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </CrmShell>
  );
}

