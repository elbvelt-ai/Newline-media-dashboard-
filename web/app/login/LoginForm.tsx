"use client";

import { useActionState, useEffect, useState } from "react";
import { dashboardStyles, studioPhoto } from "@/components/ui/glassy-dashboard";
import { login } from "./actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem("nlm-theme"); } catch {}
    setTheme(saved === "dark" || saved === "light" ? saved : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }, []);

  return (
    <div className="gd-app" data-theme={theme}>
      <style>{dashboardStyles + `
        .nlm-login{min-block-size:100svh;display:grid;place-items:center;padding:24px 16px}
        .nlm-login form{inline-size:min(100%,380px);display:grid;gap:12px;padding:26px;border-radius:28px}
        .nlm-login h1{font-size:26px;font-weight:780;letter-spacing:-.05em;line-height:1.05}
        .nlm-login p{color:var(--gd-muted);font-size:13px}
        .nlm-login .gd-search{min-block-size:44px;padding-inline:12px}
        .nlm-login .gd-search input{inline-size:100%;font-size:14px;min-block-size:42px}
        .nlm-err{color:var(--gd-coral);font-size:12px;font-weight:750}
      `}</style>
      <img className="gd-background" src={studioPhoto} alt="" aria-hidden="true" fetchPriority="high" />
      <div className="nlm-login">
        <form action={action} className="gd-panel gd-stage">
          <div className="gd-brand">
            <span className="gd-logo" aria-hidden="true">
              <svg viewBox="0 0 28 28" fill="none"><path d="m5 22 7.4-16h3.2L23 22h-4l-5-11.4L9 22H5Z" fill="currentColor" /><path d="M10 18h8l1.4 3h-10.8l1.4-3Z" fill="currentColor" /></svg>
            </span>
            <div><strong>NEW LINE MEDIA</strong></div>
          </div>
          <div><h1>Sign in</h1><p>View your station&rsquo;s support tickets.</p></div>
          <label className="gd-search"><input name="username" placeholder="Username" aria-label="Username" autoComplete="username" autoCapitalize="none" required /></label>
          <label className="gd-search"><input name="password" type="password" placeholder="Password" aria-label="Password" autoComplete="current-password" required /></label>
          {state?.error && <div className="nlm-err" role="alert">{state.error}</div>}
          <button className="gd-primary" disabled={pending} style={{ minBlockSize: 44 }}>{pending ? "Signing in…" : "Sign in"}</button>
        </form>
      </div>
    </div>
  );
}
