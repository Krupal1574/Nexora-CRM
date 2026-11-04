"use client";
import { useState } from "react";
import { CrmShell } from "@/components/crm-shell";
import { SoonButton } from "@/lib/crm/toast-context";
import { getInitials } from "@/lib/crm/sample-data";

export default function ProfilesPage() {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [preview, setPreview] = useState<{ url: string; name: string; role: string; host: string } | null>(null);
  const [error, setError] = useState("");

  const handlePreview = () => {
    setError("");
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Please enter a URL.");
      return;
    }
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "https:") {
        setError("Only secure https:// URLs are allowed.");
        return;
      }
      setPreview({
        url: parsed.href,
        name: name.trim() || "Unnamed profile",
        role: role.trim() || "No headline added",
        host: parsed.hostname.replace(/^www\./, ""),
      });
    } catch {
      setError("Please enter a valid https:// URL.");
    }
  };

  return (
    <CrmShell>
      <div className="page-top">
        <div>
          <h1>Profile Links</h1>
          <p className="page-sub">Save a public profile URL safely. Nexora never scrapes or fetches external pages.</p>
        </div>
      </div>

      <div className="grid g2">
        <div className="card">
          <b>Add profile link</b>
          <p className="sub" style={{ marginTop: 6, color: "var(--mu)" }}>
            Paste a URL (LinkedIn, GitHub, portfolio…). Only HTTPS links are accepted.
          </p>
          <input
            placeholder="https://www.linkedin.com/in/username"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            style={{ marginBottom: 8 }}
          />
          <input
            placeholder="Display name (typed by you)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ marginBottom: 8 }}
          />
          <input
            placeholder="Headline / role (typed by you)"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={{ marginBottom: 12 }}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn" onClick={handlePreview}>Save &amp; preview</button>
            <SoonButton label="Attach to record" className="btn ghost" />
          </div>
          {error && <p style={{ color: "var(--bad)", margin: "8px 0 0" }}>{error}</p>}
        </div>

        <div className="card">
          {preview ? (
            <div>
              <b>Preview</b>
              <div className="pv" style={{ marginTop: 12 }}>
                <div className="pv-big">{getInitials(preview.name)}</div>
                <div>
                  <b>{preview.name}</b>
                  <br />
                  <span style={{ color: "var(--mu)" }}>{preview.role}</span>
                  <br />
                  <span className="pill" style={{ marginTop: 6 }}>{preview.host}</span>
                </div>
              </div>
              <p style={{ wordBreak: "break-all", color: "var(--mu)", marginTop: 12 }}>{preview.url}</p>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <a className="btn" href={preview.url} target="_blank" rel="noopener noreferrer nofollow">
                  Open in new tab ↗
                </a>
              </div>
              <p style={{ fontSize: 12, color: "var(--mu)", marginTop: 12 }}>
                Details above were typed by you. Nexora did not fetch this page.
              </p>
            </div>
          ) : (
            <div className="empty-state">
              <span className="big">⛓</span>
              <h3>No link previewed</h3>
              <p>Enter a URL to see the safe preview card.</p>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <b>How this stays safe</b>
        <div className="row"><span>No scraping or automated fetching</span><span className="pill ok">Guaranteed</span></div>
        <div className="row"><span>Only http/https URLs; links open in a new tab with noopener</span><span className="pill ok">Guaranteed</span></div>
        <div className="row"><span>Name &amp; headline are entered manually</span><span className="pill or">Manual</span></div>
        <div className="row"><span>Auto-import of profile data</span><span className="pill bad">Not planned</span></div>
      </div>
    </CrmShell>
  );
}

