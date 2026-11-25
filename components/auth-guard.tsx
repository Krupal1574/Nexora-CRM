"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/crm/auth-context";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const isLoginPage = pathname === "/login";

    if (!user && !isLoginPage) {
      const redirectUrl = pathname === "/" ? "/login" : `/login?redirect=${encodeURIComponent(pathname)}`;
      router.replace(redirectUrl);
    } else if (user && isLoginPage) {
      router.replace("/");
    }
  }, [user, isLoading, pathname, router]);

  // While checking auth on non-login pages, prevent content flash
  if (isLoading && pathname !== "/login") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "var(--bg)",
          color: "var(--tx)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "var(--or)",
              color: "var(--on-or)",
              display: "grid",
              placeItems: "center",
              fontSize: 22,
              fontWeight: 800,
              margin: "0 auto 14px",
            }}
          >
            N
          </div>
          <p style={{ color: "var(--mu)", fontSize: 13, margin: 0 }}>
            Verifying Nexora session…
          </p>
        </div>
      </div>
    );
  }

  // If unauthenticated and on a protected page, render nothing until redirect happens
  if (!user && pathname !== "/login") {
    return null;
  }

  return <>{children}</>;
}
