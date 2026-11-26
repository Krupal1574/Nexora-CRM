"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/crm/auth-context";

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
  const { user, logout } = useAuth();

  const toggleTheme = () => {
    const root = document.documentElement;
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const current = root.dataset.theme || (isDark ? "dark" : "light");
    root.dataset.theme = current === "dark" ? "light" : "dark";
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <Link href="/" className="sidebar-logo">
          <img
            src="/images/favicon.png"
            alt="Nexora logo"
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              objectFit: "cover",
              background: "#fff",
              flexShrink: 0,
            }}
          />
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

        {/* User Card at bottom of sidebar */}
        {user && (
          <div className="sidebar-user-card">
            <div className="sidebar-user-avatar">{user.avatarInitials}</div>
            <div className="sidebar-user-meta">
              <span className="sidebar-user-name">{user.name}</span>
              <span className="sidebar-user-role">{user.role}</span>
            </div>
            <button
              onClick={logout}
              className="sidebar-logout-btn"
              title="Sign out of Nexora"
              aria-label="Sign out"
            >
              ⎋
            </button>
          </div>
        )}
      </aside>

      <div className="main-area">
        <header className="crm-header">
          <button
            className="btn ghost burger-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Menu"
          >
            ☰
          </button>
          <input className="crm-header-search" placeholder="Search leads, candidates, jobs…" readOnly />
          <button className="btn ghost" onClick={toggleTheme} title="Toggle theme">
            ◐
          </button>

          {/* User Profile Badge & Quick Sign Out */}
          {user ? (
            <div className="header-user-badge">
              <span className="av" style={{ margin: 0, background: "var(--or)" }}>
                {user.avatarInitials}
              </span>
              <div className="header-user-info">
                <span className="header-user-name">{user.name}</span>
                <span className="header-user-role">{user.role}</span>
              </div>
              <button
                onClick={logout}
                className="btn ghost header-signout-btn"
                title="Sign out of Nexora"
              >
                ⎋ Sign Out
              </button>
            </div>
          ) : (
            <span className="av" style={{ margin: 0 }}>KP</span>
          )}
        </header>

        <div className="main-content">{children}</div>
      </div>
    </div>
  );
}
