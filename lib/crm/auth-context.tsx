"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "Owner / Admin" | "Senior Recruiter" | "Account Manager" | "Lead Sourcer" | "Recruiter" | "Viewer";
  avatarInitials: string;
}

export const REQUIRED_DOMAIN = "@nexorastaffingllp.com";
export const ALLOWED_DOMAINS = ["@nexorastaffingllp.com", "@nexorastafingllp.com"];

export function isValidNexoraEmail(email: string): boolean {
  if (!email) return false;
  const lower = email.trim().toLowerCase();
  return ALLOWED_DOMAINS.some((domain) => lower.endsWith(domain));
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAdmin: false,
  login: async () => ({ success: false }),
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) return null;
        const data = await res.json();
        return data?.authenticated ? (data.user as AuthUser) : null;
      })
      .then((sessionUser) => {
        if (active) {
          setUser(sessionUser);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setUser(null);
          setIsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const login = async (
    email: string,
    password: string,
    rememberMe = true
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, rememberMe }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Authentication failed." };
      }
      setUser(data.user as AuthUser);
      return { success: true };
    } catch {
      return { success: false, error: "Network error while signing in." };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {}
    setUser(null);
    router.push("/login");
    router.refresh();
  };

  const isAdmin = user?.role === "Owner / Admin";

  return (
    <AuthContext.Provider value={{ user, isLoading, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
