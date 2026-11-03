import Link from "next/link";
import type { ReactNode } from "react";

const navigation = [
  { href: "/", label: "Overview" },
  { href: "/leads", label: "Leads" },
];

export function CrmShell({ children, currentPath }: { children: ReactNode; currentPath: string }) {
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="CRM navigation">
        <Link className="brand" href="/" aria-label="Nexora CRM home">
          <span className="brand-mark" aria-hidden="true">↗</span>
          <span>
            <strong>NEXORA</strong>
            <small>PEOPLE · TALENT · GROWTH</small>
          </span>
        </Link>
        <nav>
          {navigation.map((item) => (
            <Link className={currentPath === item.href ? "nav-link active" : "nav-link"} href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <p className="phase-label">CRM · Phase B</p>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
