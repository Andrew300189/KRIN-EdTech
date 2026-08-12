"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { getSafeInternalPath } from "@/core/utils/safe-internal-path";
import styles from "./AuthForms.module.css";

type LoginFormProps = {
  nextPath?: string;
  onNavigate?: () => void;
  email?: string;
  onEmailChange?: (email: string) => void;
  onCreateAccount?: (email: string) => void;
  showRegistration?: boolean;
};

function getServerDestination(payload: unknown): string | null {
  const candidate =
    payload && typeof payload === "object"
      ? (payload as { user?: { workspacePath?: unknown } }).user?.workspacePath
      : null;
  return typeof candidate === "string"
    ? getSafeInternalPath(candidate, "") || null
    : null;
}

function getDevelopmentErrorId(value: unknown) {
  return process.env.NODE_ENV === "development" &&
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
    ? value
    : "";
}

/** Shared credentials and Google entry form for the page and public modal. */
export function LoginForm({
  nextPath = "",
  onNavigate,
  email,
  onEmailChange,
  onCreateAccount,
  showRegistration = true,
}: LoginFormProps) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorId, setErrorId] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const submittingRef = useRef(false);
  const safeNextPath = getSafeInternalPath(nextPath, "");
  const identifierValue = email ?? identifier;
  const registerHref = safeNextPath
    ? `/register?next=${encodeURIComponent(safeNextPath)}`
    : "/register";
  const forgotHref = safeNextPath
    ? `/forgot-password?next=${encodeURIComponent(safeNextPath)}`
    : "/forgot-password";

  const updateIdentifier = (value: string) => {
    if (email === undefined) setIdentifier(value);
    onEmailChange?.(value);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submittingRef.current) return;
    if (!identifierValue.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    submittingRef.current = true;
    setError("");
    setErrorId("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: identifierValue,
          password,
          next: safeNextPath,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(
          typeof payload?.error === "string"
            ? payload.error
            : "We could not sign you in. Please try again.",
        );
        setErrorId(getDevelopmentErrorId(payload?.errorId));
        return;
      }

      const destination = getServerDestination(payload);
      if (!destination) {
        setError(
          "We could not determine a safe place to continue. Please try again.",
        );
        return;
      }
      onNavigate?.();
      router.replace(destination);
    } catch {
      setError(
        "We could not sign you in. Check your connection and try again.",
      );
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError("");
    setErrorId("");
    setLoading(true);
    try {
      const result = await signIn("google", {
        callbackUrl: `/auth/complete?next=${encodeURIComponent(safeNextPath)}`,
      });
      if (result?.error)
        setError("We could not sign you in with Google. Please try again.");
    } catch {
      setError("We could not sign you in with Google. Please try again.");
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
      noValidate
      aria-busy={loading}
    >
      {error ? (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          <p>{error}</p>
          {errorId ? (
            <p className="mt-2 text-xs text-red-700">
              Error ID: <code>{errorId}</code>
            </p>
          ) : null}
        </div>
      ) : null}
      {showRegistration ? (
        <div className={styles.topIntro}>
          <p className={styles.newHere}>
            New here?{" "}
            {onCreateAccount ? (
              <button
                type="button"
                onClick={() => onCreateAccount(identifierValue)}
                className={styles.newHereLink}
              >
                Create an account
              </button>
            ) : (
              <Link href={registerHref} className={styles.newHereLink}>
                Create an account
              </Link>
            )}
          </p>
        </div>
      ) : null}
      <div className="space-y-2">
        <label
          htmlFor="login-identifier"
          className="text-sm font-semibold text-slate-900"
        >
          Email
        </label>
        <input
          id="login-identifier"
          data-dialog-initial-focus
          type="email"
          autoComplete="email"
          value={identifierValue}
          onChange={(event) => updateIdentifier(event.target.value)}
          className="form-control w-full rounded-md border border-slate-300 bg-slate-50 px-4 py-3 text-base"
          placeholder="you@example.com"
          required
          disabled={loading}
        />
      </div>
      <div className="space-y-2">
        <label
          htmlFor="login-password"
          className="text-sm font-semibold text-slate-900"
        >
          Password
        </label>
        <div className={styles.passwordField}>
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="form-control w-full rounded-md border border-slate-300 bg-slate-50 px-4 py-3 pr-12 text-base"
            placeholder="Enter your password"
            required
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className={styles.passwordToggle}
            aria-label={showPassword ? "Hide password" : "Show password"}
            disabled={loading}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </div>
      <button
        type="submit"
        className="btn w-full rounded-full bg-primary py-3 font-semibold text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={loading}
      >
        {loading ? "Signing in…" : "Log in"}
      </button>
      <button
        type="button"
        onClick={handleGoogleSignIn}
        className={styles.googleButton}
        disabled={loading}
      >
        <span aria-hidden className={styles.googleMark}>
          G
        </span>
        <span>
          {loading ? "Connecting to Google…" : "Continue with Google"}
        </span>
      </button>
      <div className="text-center">
        <Link href={forgotHref} className={styles.forgotLink}>
          Forgot your email or password?
        </Link>
      </div>
      <p className={styles.termsText}>
        By logging in, you agree to our{" "}
        <Link href="/terms" className="text-primary hover:underline">
          Terms of use
        </Link>
        .
      </p>
    </form>
  );
}
