"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, REQUIRED_DOMAIN, isValidNexoraEmail } from "@/lib/crm/auth-context";
import { useToast } from "@/lib/crm/toast-context";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/";

  const { login } = useAuth();
  const { show } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your work email.");
      return;
    }

    if (!isValidNexoraEmail(email)) {
      setError(`Access Restricted: Only emails ending with ${REQUIRED_DOMAIN} are authorized.`);
      return;
    }

    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }

    setIsSubmitting(true);
    const result = await login(email, password, rememberMe);

    if (result.success) {
      show("Signed in successfully. Welcome to Nexora CRM!");
      router.replace(redirectTarget);
      router.refresh();
    } else {
      setError(result.error || "Invalid email or password.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      {/* Brand / hero panel (hidden on small screens) */}
      <aside className="login-hero" aria-hidden="true">
        <div className="login-hero-top">
          <img
            src="/images/favicon.png"
            alt="Nexora"
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              objectFit: "cover",
              background: "#fff",
            }}
          />
          <span className="login-hero-name">Nexora</span>
        </div>

        <div
          style={{
            margin: "16px 0 8px",
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.14)",
            background: "#f7f9fc",
          }}
        >
          <img
            src="/images/nexora-banner.png"
            alt="Nexora Staffing LLP — People Talent Growth"
            style={{ width: "100%", height: "auto", display: "block" }}
          />
        </div>

        <div className="login-hero-body">
          <span className="login-hero-eyebrow">Staffing Sourcing Platform</span>
          <h2>
            People. <em>Talent.</em>
            <br />
            Growth.
          </h2>
          <p>
            One workspace for leads, candidates, client accounts and open
            requisitions — from first call to placement.
          </p>

          <ul className="login-hero-points">
            <li><i>◆</i> Visual pipeline from New to Placed</li>
            <li><i>◆</i> Client accounts and open mandates in one place</li>
            <li><i>◆</i> Signed HttpOnly sessions &amp; security audit alerts</li>
          </ul>
        </div>

        <div className="login-hero-foot">Nexora Staffing LLP</div>
      </aside>

      <main className="login-panel">
        <div className="login-card">
          {/* Brand Header */}
          <div className="login-brand">
            <img
              src="/images/favicon.png"
              alt="Nexora"
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                objectFit: "cover",
                margin: "0 auto 10px",
                display: "block",
                background: "#fff",
              }}
            />
            <h1>Welcome back</h1>
            <p className="login-sub">Sign in to Nexora CRM to continue</p>
          </div>

          {/* Corporate Domain Security Banner */}
          <div className="login-auth-banner">
            🔒 Organization Access: <b>{REQUIRED_DOMAIN}</b> required
          </div>

          {error && <div className="login-error-box">{error}</div>}

          {/* Credentials Form */}
          <form onSubmit={handleLogin} className="login-form">
            <div className="login-field">
              <label htmlFor="email">Corporate Work Email</label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                placeholder={`name${REQUIRED_DOMAIN}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="login-field">
              <div className="login-pwd-header">
                <label htmlFor="password">Password</label>
                <button
                  type="button"
                  className="login-pwd-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="login-options">
              <label className="login-checkbox">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember session (7 days)</span>
              </label>
              <span style={{ fontSize: 12, color: "var(--mu)" }}>Staffing LLP</span>
            </div>

            <button type="submit" className="btn login-submit-btn" disabled={isSubmitting}>
              {isSubmitting ? "Verifying…" : "Sign In to Nexora CRM →"}
            </button>
          </form>

          <div className="login-footer">
            <span>Nexora Staffing LLP • Protected Internal CRM</span>
            <div style={{ marginTop: 4, fontSize: 11, color: "var(--mu)" }}>
              Need access or password reset? Contact support@nexorastaffingllp.com
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--mu)",
          }}
        >
          Loading Nexora Login…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
