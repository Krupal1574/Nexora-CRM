"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useAuth,
  DEMO_USERS,
  REQUIRED_DOMAIN,
  ALLOWED_DOMAINS,
  isValidNexoraEmail,
  type AuthUser,
} from "@/lib/crm/auth-context";
import { useToast } from "@/lib/crm/toast-context";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/";

  const { login, loginWithGoogle, loginAs } = useAuth();
  const { show } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Google Modal State
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState("");
  const [googleError, setGoogleError] = useState("");

  const handleCustomLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your work email.");
      return;
    }

    if (!isValidNexoraEmail(email)) {
      setError(
        `Access Restricted: Only emails ending with ${REQUIRED_DOMAIN} are authorized.`
      );
      return;
    }

    setIsSubmitting(true);
    const result = login(email, password);

    if (result.success) {
      show("Signed in successfully. Welcome to Nexora CRM!");
      router.replace(redirectTarget);
    } else {
      setError(result.error || "Authentication failed.");
      setIsSubmitting(false);
    }
  };

  const handleGoogleSelect = (user: AuthUser) => {
    const res = loginWithGoogle(user.email, user.name);
    if (res.success) {
      setShowGoogleModal(false);
      show(`Google Sign-In verified: ${user.name} (${user.email})`);
      router.replace(redirectTarget);
    } else {
      setGoogleError(res.error || "Google authentication failed.");
    }
  };

  const handleCustomGoogleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGoogleError("");

    if (!customGoogleEmail.trim()) {
      setGoogleError("Please enter your Google account email.");
      return;
    }

    if (!isValidNexoraEmail(customGoogleEmail)) {
      setGoogleError(
        `Access Denied: Google email must end with ${REQUIRED_DOMAIN}`
      );
      return;
    }

    const res = loginWithGoogle(customGoogleEmail);
    if (res.success) {
      setShowGoogleModal(false);
      show(`Google Sign-In verified: ${customGoogleEmail}`);
      router.replace(redirectTarget);
    } else {
      setGoogleError(res.error || "Google sign-in error.");
    }
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

        {/* Corporate Domain Security Banner */}
        <div className="login-auth-banner">
          🔒 Organization Access: <b>{REQUIRED_DOMAIN}</b> required
        </div>

        {error && <div className="login-error-box">{error}</div>}

        {/* Primary Action: Sign in with Google */}
        <div style={{ marginBottom: 18 }}>
          <button
            type="button"
            className="login-google-btn"
            onClick={() => {
              setGoogleError("");
              setShowGoogleModal(true);
            }}
          >
            <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Sign in with Google</span>
          </button>
          <div style={{ textAlign: "center", marginTop: 6 }}>
            <small style={{ color: "var(--mu)", fontSize: 11.5 }}>
              Use your corporate Google Workspace account
            </small>
          </div>
        </div>

        {/* Divider */}
        <div className="login-divider">
          <span>OR SIGN IN WITH WORK EMAIL</span>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleCustomLogin} className="login-form">
          <div className="login-field">
            <label htmlFor="email">Corporate Work Email</label>
            <input
              id="email"
              type="email"
              placeholder={`e.g. name${REQUIRED_DOMAIN}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              <span>Remember session</span>
            </label>
            <span style={{ fontSize: 12, color: "var(--mu)" }}>Staffing LLP</span>
          </div>

          <button type="submit" className="btn login-submit-btn" disabled={isSubmitting}>
            {isSubmitting ? "Verifying…" : "Sign In to Nexora CRM →"}
          </button>
        </form>

        {/* Divider */}
        <div className="login-divider">
          <span>AUTHORIZED TEAM MEMBERS</span>
        </div>

        {/* Quick Demo Logins */}
        <div className="login-quick-list">
          {DEMO_USERS.map((u) => (
            <button
              key={u.id}
              type="button"
              className="login-quick-card"
              onClick={() => {
                loginAs(u);
                show(`Signed in as ${u.name} (${u.email})`);
                router.replace(redirectTarget);
              }}
              title={`Sign in as ${u.name}`}
            >
              <div className="login-quick-avatar">{u.avatarInitials}</div>
              <div className="login-quick-details">
                <b>{u.name}</b>
                <span>{u.email}</span>
              </div>
              <span className="login-quick-arrow">→</span>
            </button>
          ))}
        </div>

        <div className="login-footer">
          <span>Nexora Staffing LLP • Secure Internal CRM</span>
        </div>
      </div>

      {/* Google Account Selector Dialog */}
      {showGoogleModal && (
        <div className="google-modal-overlay" onClick={() => setShowGoogleModal(false)}>
          <div className="google-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="google-modal-header">
              <svg viewBox="0 0 24 24" width="28" height="28">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <h3>Sign in with Google</h3>
              <p>Choose an account to continue to <b>Nexora CRM</b></p>
            </div>

            <div className="google-modal-domain-rule">
              Domain restriction: <code>{REQUIRED_DOMAIN}</code>
            </div>

            {googleError && <div className="login-error-box">{googleError}</div>}

            {/* List of Verified Corporate Google Accounts */}
            <div className="google-account-list">
              {DEMO_USERS.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className="google-account-item"
                  onClick={() => handleGoogleSelect(u)}
                >
                  <div className="google-account-avatar">{u.avatarInitials}</div>
                  <div className="google-account-info">
                    <b>{u.name}</b>
                    <span>{u.email}</span>
                  </div>
                  <span className="google-verified-tag">Workspace</span>
                </button>
              ))}
            </div>

            {/* Enter Custom Google Email */}
            <form onSubmit={handleCustomGoogleSubmit} style={{ marginTop: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--mu)", display: "block", marginBottom: 6 }}>
                Or enter another @nexorastafingllp.com Google account:
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="email"
                  placeholder={`your.name${REQUIRED_DOMAIN}`}
                  value={customGoogleEmail}
                  onChange={(e) => setCustomGoogleEmail(e.target.value)}
                  style={{ flex: 1, padding: "9px 11px", fontSize: 13 }}
                />
                <button type="submit" className="btn" style={{ padding: "9px 14px", fontSize: 13 }}>
                  Sign In
                </button>
              </div>
            </form>

            <div style={{ marginTop: 18, textAlign: "right" }}>
              <button
                type="button"
                className="btn ghost"
                style={{ fontSize: 12, padding: "6px 12px" }}
                onClick={() => setShowGoogleModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
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
