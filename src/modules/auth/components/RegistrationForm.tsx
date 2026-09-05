"use client";

import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [accountExists, setAccountExists] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);
  const submittingRef = useRef(false);
  const safeNextPath = getSafeInternalPath(nextPath, "");
  const passwordsMatch = !confirmPassword || password === confirmPassword;

  useEffect(() => { setEmail(initialEmail); }, [initialEmail]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submittingRef.current) return;
    if (!passwordsMatch) return;
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

  const handleGoogleSignIn = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError("");
    setLoading(true);
    try {
      const result = await signIn("google", {
        callbackUrl: `/auth/complete?next=${encodeURIComponent(safeNextPath)}`,
      });
      if (result?.error) {
        setError("We could not continue with Google. Please try again.");
      }
    } catch {
      setError("We could not continue with Google. Please try again.");
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

  return <form onSubmit={handleSubmit} className={styles.registrationForm} noValidate aria-busy={loading}>
    {error ? <div role="alert" className={styles.registrationNotice}><span className={styles.noticeIcon} aria-hidden="true">!</span><div><p className={styles.noticeTitle}>Registration is unavailable</p><p className={styles.noticeMessage}>{error}</p></div></div> : null}
    <div className={styles.registrationField}><label htmlFor="register-username" className="text-sm font-semibold text-slate-900">Username</label><input id="register-username" name="username" data-dialog-initial-focus type="text" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} className="form-control w-full rounded-md border border-slate-300 bg-slate-50 px-4 py-3 text-base" placeholder="your_username" required disabled={loading} /></div>
    <div className={styles.registrationField}><label htmlFor="register-email" className="text-sm font-semibold text-slate-900">Email</label><input id="register-email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="form-control w-full rounded-md border border-slate-300 bg-slate-50 px-4 py-3 text-base" placeholder="you@example.com" required disabled={loading} /></div>
    <div className={styles.registrationField}><label htmlFor="register-password" className="text-sm font-semibold text-slate-900">Password</label><div className={styles.passwordField}><input id="register-password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="form-control w-full rounded-md border border-slate-300 bg-slate-50 px-4 py-3 pr-12 text-base" placeholder="Choose a password" required disabled={loading} /><button type="button" onClick={() => setShowPassword((current) => !current)} className={styles.passwordToggle} aria-label={showPassword ? "Hide password" : "Show password"} disabled={loading}>{showPassword ? "Hide" : "Show"}</button></div></div>
    <div className={styles.registrationField}><label htmlFor="register-confirm-password" className="text-sm font-semibold text-slate-900">Confirm password</label><div className={styles.passwordField}><input id="register-confirm-password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={`form-control w-full rounded-md border border-slate-300 bg-slate-50 px-4 py-3 pr-12 text-base ${!passwordsMatch ? styles.passwordMismatch : ""}`} placeholder="Repeat your password" aria-invalid={!passwordsMatch} aria-describedby={!passwordsMatch ? "register-password-match" : undefined} required disabled={loading} /><button type="button" onClick={() => setShowPassword((current) => !current)} className={styles.passwordToggle} aria-label={showPassword ? "Hide passwords" : "Show passwords"} disabled={loading}>{showPassword ? "Hide" : "Show"}</button></div>{!passwordsMatch ? <p id="register-password-match" className={styles.passwordMatchHint}>Passwords do not match yet.</p> : null}</div>
    <button type="submit" className={`btn w-full rounded-full bg-primary py-3 font-semibold text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 ${styles.registrationSubmit}`} disabled={loading}>{loading ? "Creating account…" : "Create account"}</button>
    <button type="button" onClick={handleGoogleSignIn} className={styles.googleButton} disabled={loading}>
      <span aria-hidden className={styles.googleMark}>G</span>
      <span>{loading ? "Connecting to Google…" : "Continue with Google"}</span>
    </button>
    {accountExists ? <p className="text-center text-sm text-slate-600"><button type="button" onClick={() => onSignIn(email)} className="font-semibold text-primary hover:underline">Log in with this email</button></p> : null}
  </form>;
}
