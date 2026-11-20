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

export const DEMO_USERS: AuthUser[] = [
  {
    id: "u-krupal",
    name: "Krupal P.",
    email: "krupal@nexora.com",
    role: "Owner / Admin",
    avatarInitials: "KP",
  },
  {
    id: "u-yatri",
    name: "Yatri",
    email: "yatri@nexora.com",
    role: "Lead Sourcer",
    avatarInitials: "YS",
  },
  {
    id: "u-priya",
    name: "Priya S.",
    email: "priya@nexora.com",
    role: "Senior Recruiter",
    avatarInitials: "PS",
  },
  {
    id: "u-rahul",
    name: "Rahul K.",
    email: "rahul@nexora.com",
    role: "Account Manager",
    avatarInitials: "RK",
  },
];

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password?: string) => boolean;
  loginAs: (user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: () => false,
  loginAs: () => {},
  logout: () => {},
});

const COOKIE_NAME = "nexora_auth_user";

function setAuthCookie(user: AuthUser) {
  if (typeof document === "undefined") return;
  const value = encodeURIComponent(JSON.stringify(user));
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=2592000; SameSite=Lax`;
}

function clearAuthCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(COOKIE_NAME);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Hydrate from localStorage or cookie
    const stored = getStoredUser();
    if (stored) {
      setUser(stored);
      setAuthCookie(stored);
    }
    setIsLoading(false);
  }, []);

  const loginAs = (targetUser: AuthUser) => {
    setUser(targetUser);
    localStorage.setItem(COOKIE_NAME, JSON.stringify(targetUser));
    setAuthCookie(targetUser);
  };

  const login = (email: string, password?: string): boolean => {
    if (!email || !email.includes("@")) return false;

    // Check if matching demo user
    const matched = DEMO_USERS.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase()
    );

    if (matched) {
      loginAs(matched);
      return true;
    }

    // Custom user login
    const namePart = email.split("@")[0].replace(/[._]/g, " ");
    const formattedName = namePart
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    const initials = namePart
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase())
      .join("")
      .slice(0, 2) || "NX";

    const customUser: AuthUser = {
      id: `u-${Date.now()}`,
      name: formattedName || "Nexora User",
      email: email.trim(),
      role: "Recruiter",
      avatarInitials: initials,
    };

    loginAs(customUser);
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(COOKIE_NAME);
    clearAuthCookie();
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, loginAs, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
