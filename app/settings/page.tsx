"use client";
import { CrmShell } from "@/components/crm-shell";
import { SoonButton } from "@/lib/crm/toast-context";

export default function SettingsPage() {
  const toggleTheme = () => {
    const root = document.documentElement;
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const current = root.dataset.theme || (isDark ? "dark" : "light");
    root.dataset.theme = current === "dark" ? "light" : "dark";
  };

  return (
    <CrmShell>
      <div className="page-top">
        <div>
          <h1>Settings</h1>
          <p className="page-sub">Workspace preferences.</p>
        </div>
      </div>

      <div className="grid g2">
        <div className="card">
          <b>Workspace</b>
          <p style={{ color: "var(--mu)", fontSize: 13, margin: "6px 0 10px" }}>Organisation and region settings</p>
          <input defaultValue="Nexora Recruitment" style={{ marginBottom: 8 }} />
          <select defaultValue="Asia/Kolkata (IST)" style={{ marginBottom: 12 }}>
            <option>Asia/Kolkata (IST)</option>
            <option>UTC</option>
            <option>America/New_York (EST)</option>
          </select>
          <SoonButton label="Save" />
        </div>

        <div className="card">
          <b>Appearance</b>
          <div className="row sw-row">
            <span>Dark / Light theme</span>
            <button className="btn ghost" onClick={toggleTheme}>Toggle theme</button>
          </div>
        </div>

        <div className="card">
          <b>Integrations</b>
          <div className="row"><span>Database</span><span className="pill bad">Not connected</span></div>
          <div className="row"><span>Email sync</span><span className="pill soon">Coming soon</span></div>
          <div className="row"><span>Calendar</span><span className="pill soon">Coming soon</span></div>
          <div className="row"><span>Resume parsing</span><span className="pill soon">Coming soon</span></div>
        </div>

        <div className="card ro">
          <b>Billing</b>
          <p style={{ color: "var(--mu)" }}>Plans and invoices <span className="pill soon">Soon</span></p>
        </div>
      </div>
    </CrmShell>
  );
}

