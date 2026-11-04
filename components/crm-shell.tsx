"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ToastProvider } from "@/lib/crm/toast-context";

const NAV_ITEMS = [
  { href: "/", icon: "▦", label: "Dashboard" },
  { href: "/leads", icon: "◎", label: "Leads" },
  { href: "/candidates", icon: "☺", label: "Candidates" },
  { href: "/import", icon: "⇅", label: "Import / Export" },
  { href: "/clients", icon: "▣", label: "Clients" },
  { href: "/jobs", icon: "✦", label: "Jobs" },
  { href: "/pipeline", icon: "≡", label: "Pipeline" },
  { href: "/tasks", icon: "✓", label: "Tasks" },
  { href: "/notes", icon: "✎", label: "Notes" },
  { href: "/profiles", icon: "⛓", label: "Profile Links" },
];

const ADMIN_ITEMS = [
  { href: "/team", icon: "☷", label: "Team & Roles" },
  { href: "/activity", icon: "◷", label: "Activity Log" },
  { href: "/settings", icon: "⚙", label: "Settings" },
];

export function CrmShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleTheme = () => {
    const root = document.documentElement;
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const current = root.dataset.theme || (isDark ? "dark" : "light");
    root.dataset.theme = current === "dark" ? "light" : "dark";
  };

  return (
    <ToastProvider>
      <div className="app-shell">
        <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
          <Link href="/" className="sidebar-logo">
            <span className="sidebar-logo-icon">N</span>
            Nexora CRM
          </Link>
          <nav className="sidebar-nav">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${pathname === item.href ? "active" : ""}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="sidebar-link-icon">{item.icon}</span>
                {item.label}
              </Link>
            ))}
            <span className="sidebar-section-label">Admin</span>
            {ADMIN_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${pathname === item.href ? "active" : ""}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="sidebar-link-icon">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="main-area">
          <header className="crm-header">
            <button className="btn ghost burger-btn" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Menu">☰</button>
            <input className="crm-header-search" placeholder="Search leads, candidates, jobs…" readOnly />
            <button className="btn ghost" onClick={toggleTheme} title="Toggle theme">◐</button>
            <span className="av" style={{ margin: 0 }}>KP</span>
          </header>
          <div className="main-content">
            {children}
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}
