"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { reportFunnelEvent } from "@/modules/analytics/components/FunnelEventReporter";
import { getSafeInternalPath } from "@/core/utils/safe-internal-path";
import styles from "./AuthForms.module.css";

type RegistrationFormProps = {
  nextPath?: string;
  initialEmail?: string;
  onSignIn: (email: string) => void;
  onNavigate?: () => void;
};

/** Registration variant for the shared public account modal. */
export function RegistrationForm({ nextPath = "", initialEmail = "", onSignIn, onNavigate }: RegistrationFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [accountExists, setAccountExists] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);
  const submittingRef = useRef(false);
  const safeNextPath = getSafeInternalPath(nextPath, "");

  useEffect(() => { setEmail(initialEmail); }, [initialEmail]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError("");
    setAccountExists(false);
    setVerificationPending(false);
    setLoading(true);
    reportFunnelEvent("SIGNUP_START");
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password, next: safeNextPath || undefined }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(typeof payload?.error === "string" ? payload.error : "Registration failed. Please try again.");
        setAccountExists(payload?.code === "ACCOUNT_EXISTS");
        return;
      }
      if (payload?.requiresEmailVerification === true) {
        setVerificationPending(true);
        return;
      }
      onNavigate?.();
      router.replace(typeof payload?.user?.workspacePath === "string" ? payload.user.workspacePath : "/student");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  if (verificationPending) {
    return <div className="space-y-5" role="status">
      <div className="rounded-md border border-primary/20 bg-primary/5 p-4 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">Check your inbox</p>
        <p className="mt-1">We sent a secure confirmation link to <strong>{email}</strong>. Confirm it before signing in; the link expires in 24 hours.</p>
      </div>
      <button type="button" onClick={() => onSignIn(email)} className="btn w-full rounded-full bg-primary py-3 font-semibold text-white hover:brightness-95">
        Go to sign in
      </button>
    </div>;
  }

  return <form onSubmit={handleSubmit} className="space-y-5" noValidate aria-busy={loading}>
    {error ? <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
    <div className="space-y-2"><label htmlFor="register-username" className="text-sm font-semibold text-slate-900">Username</label><input id="register-username" data-dialog-initial-focus type="text" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} className="form-control w-full rounded-md border border-slate-300 bg-slate-50 px-4 py-3 text-base" placeholder="your_username" required disabled={loading} /></div>
    <div className="space-y-2"><label htmlFor="register-email" className="text-sm font-semibold text-slate-900">Email</label><input id="register-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="form-control w-full rounded-md border border-slate-300 bg-slate-50 px-4 py-3 text-base" placeholder="you@example.com" required disabled={loading} /></div>
    <div className="space-y-2"><label htmlFor="register-password" className="text-sm font-semibold text-slate-900">Password</label><div className={styles.passwordField}><input id="register-password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="form-control w-full rounded-md border border-slate-300 bg-slate-50 px-4 py-3 pr-12 text-base" placeholder="Choose a password" required disabled={loading} /><button type="button" onClick={() => setShowPassword((current) => !current)} className={styles.passwordToggle} aria-label={showPassword ? "Hide password" : "Show password"} disabled={loading}>{showPassword ? "Hide" : "Show"}</button></div></div>
    <button type="submit" className="btn w-full rounded-full bg-primary py-3 font-semibold text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60" disabled={loading}>{loading ? "Creating account…" : "Create account"}</button>
    {accountExists ? <p className="text-center text-sm text-slate-600"><button type="button" onClick={() => onSignIn(email)} className="font-semibold text-primary hover:underline">Log in with this email</button></p> : null}
    <p className="text-center text-sm text-slate-600">Already have an account? <button type="button" onClick={() => onSignIn(email)} className="font-semibold text-primary hover:underline">Log in</button></p>
  </form>;
}
