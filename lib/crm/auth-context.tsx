"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "Owner / Admin" | "Senior Recruiter" | "Account Manager" | "Lead Sourcer" | "Recruiter" | "Viewer";
  avatarInitials: string;
  authProvider?: "google" | "credentials";
}

/** Required corporate domains for Nexora CRM access */
export const REQUIRED_DOMAIN = "@nexorastafingllp.com";
export const ALLOWED_DOMAINS = ["@nexorastafingllp.com", "@nexorastaffingllp.com"];

export function isValidNexoraEmail(email: string): boolean {
  if (!email) return false;
  const lower = email.trim().toLowerCase();
  return ALLOWED_DOMAINS.some((domain) => lower.endsWith(domain));
}

export const DEMO_USERS: AuthUser[] = [
  {
    id: "u-krupal",
    name: "Krupal P.",
    email: "krupal@nexorastafingllp.com",
    role: "Owner / Admin",
    avatarInitials: "KP",
    authProvider: "google",
  },
  {
    id: "u-yatri",
    name: "Yatri",
    email: "yatri@nexorastafingllp.com",
    role: "Lead Sourcer",
    avatarInitials: "YS",
    authProvider: "google",
  },
  {
    id: "u-priya",
    name: "Priya S.",
    email: "priya@nexorastafingllp.com",
    role: "Senior Recruiter",
    avatarInitials: "PS",
    authProvider: "google",
  },
  {
    id: "u-rahul",
    name: "Rahul K.",
    email: "rahul@nexorastafingllp.com",
    role: "Account Manager",
    avatarInitials: "RK",
    authProvider: "google",
  },
];

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password?: string) => { success: boolean; error?: string };
  loginWithGoogle: (email: string, name?: string) => { success: boolean; error?: string };
  loginAs: (user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: () => ({ success: false }),
  loginWithGoogle: () => ({ success: false }),
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

  const loginWithGoogle = (email: string, customName?: string): { success: boolean; error?: string } => {
    if (!email || !email.includes("@")) {
      return { success: false, error: "Please provide a valid Google account email." };
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Enforce required corporate domain
    if (!isValidNexoraEmail(trimmedEmail)) {
      return {
        success: false,
        error: `Access Denied: Only corporate Google accounts ending with ${REQUIRED_DOMAIN} are authorized to access Nexora CRM.`,
      };
    }

    // Check if matching predefined user
    const matched = DEMO_USERS.find(
      (u) => u.email.toLowerCase() === trimmedEmail
    );

    if (matched) {
      loginAs({ ...matched, authProvider: "google" });
      return { success: true };
    }

    // Build user from Google account
    const username = trimmedEmail.split("@")[0].replace(/[._]/g, " ");
    const formattedName =
      customName ||
      username
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

    const initials =
      formattedName
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase())
        .join("")
        .slice(0, 2) || "NX";

    const googleUser: AuthUser = {
      id: `u-google-${Date.now()}`,
      name: formattedName || "Google Workspace Member",
      email: trimmedEmail,
      role: "Recruiter",
      avatarInitials: initials,
      authProvider: "google",
    };

    loginAs(googleUser);
    return { success: true };
  };

  const login = (email: string, password?: string): { success: boolean; error?: string } => {
    if (!email || !email.includes("@")) {
      return { success: false, error: "Please enter a valid work email address." };
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Enforce corporate domain
    if (!isValidNexoraEmail(trimmedEmail)) {
      return {
        success: false,
        error: `Access Restricted: Nexora CRM requires a corporate email ending with ${REQUIRED_DOMAIN}.`,
      };
    }

    // Check if matching predefined user
    const matched = DEMO_USERS.find(
      (u) => u.email.toLowerCase() === trimmedEmail
    );

    if (matched) {
      loginAs(matched);
      return { success: true };
    }

    // Custom user login
    const namePart = trimmedEmail.split("@")[0].replace(/[._]/g, " ");
    const formattedName = namePart
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    const initials =
      namePart
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase())
        .join("")
        .slice(0, 2) || "NX";

    const customUser: AuthUser = {
      id: `u-${Date.now()}`,
      name: formattedName || "Nexora Staffing Member",
      email: trimmedEmail,
      role: "Recruiter",
      avatarInitials: initials,
      authProvider: "credentials",
    };

    loginAs(customUser);
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(COOKIE_NAME);
    clearAuthCookie();
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, loginWithGoogle, loginAs, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
