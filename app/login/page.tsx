"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, DEMO_USERS, type AuthUser } from "@/lib/crm/auth-context";
import { useToast } from "@/lib/crm/toast-context";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/";

  const { login, loginAs } = useAuth();
  const { show } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleCustomLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your work email.");
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    const success = login(email, password);

    if (success) {
      show("Signed in successfully. Welcome back!");
      router.replace(redirectTarget);
    } else {
      setError("Invalid credentials. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = (user: AuthUser) => {
    loginAs(user);
    show(`Signed in as ${user.name} (${user.role})`);
    router.replace(redirectTarget);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Brand Header */}
        <div className="login-brand">
          <div className="login-logo-badge">N</div>
          <h1>Nexora CRM</h1>
          <p className="login-sub">People, Talent, Growth — Staffing Sourcing Platform</p>
        </div>

        {/* Access Restriction Notice */}
        <div className="login-auth-banner">
          🔒 Secure Area • Authorized Team Access Only
        </div>

        {error && <div className="login-error-box">{error}</div>}

        {/* Credentials Form */}
        <form onSubmit={handleCustomLogin} className="login-form">
          <div className="login-field">
            <label htmlFor="email">Work Email</label>
            <input
              id="email"
              type="email"
              placeholder="e.g. krupal@nexora.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="login-options">
            <label className="login-checkbox">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember this session</span>
            </label>
            <span style={{ fontSize: 12, color: "var(--mu)" }}>Internal CRM</span>
          </div>

          <button type="submit" className="btn login-submit-btn" disabled={isSubmitting}>
            {isSubmitting ? "Signing in…" : "Sign In to Nexora CRM →"}
          </button>
        </form>

        {/* Divider */}
        <div className="login-divider">
          <span>OR SIGN IN AS TEAM MEMBER</span>
        </div>

        {/* Quick Demo Logins */}
        <div className="login-quick-list">
          {DEMO_USERS.map((u) => (
            <button
              key={u.id}
              type="button"
              className="login-quick-card"
              onClick={() => handleQuickLogin(u)}
            >
              <div className="login-quick-avatar">{u.avatarInitials}</div>
              <div className="login-quick-details">
                <b>{u.name}</b>
                <span>{u.role}</span>
              </div>
              <span className="login-quick-arrow">→</span>
            </button>
          ))}
        </div>

        <div className="login-footer">
          <span>© 2026 Nexora Talent Technologies. All rights reserved.</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg)" }}>
          <p style={{ color: "var(--mu)" }}>Loading login portal…</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
