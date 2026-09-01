"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Status = "ready" | "verifying" | "success" | "error";

/**
 * Email security scanners frequently open links automatically. Requiring a
 * deliberate confirmation here prevents those scanners from spending a user's
 * one-time token before the user has actually seen the page.
 */
export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<Status>(token ? "ready" : "error");
  const [error, setError] = useState(
    token ? "" : "This verification link is invalid or has expired.",
  );
  const [email, setEmail] = useState("");
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const verify = async () => {
    if (!token || status === "verifying") return;
    setStatus("verifying");
    setError("");
    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ token }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(
          typeof payload?.error === "string"
            ? payload.error
            : "This verification link is invalid or has expired.",
        );
        setStatus("error");
        return;
      }

      // Do not leave a bearer credential in the address bar once used.
      window.history.replaceState(null, "", "/verify-email?verified=1");
      setStatus("success");
    } catch {
      setError("We could not verify this email right now. Please try again shortly.");
      setStatus("error");
    }
  };

  const resend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (resendState === "sending") return;
    setResendState("sending");
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email }),
      });
      setResendState(response.ok ? "sent" : "error");
    } catch {
      setResendState("error");
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 text-center">
      {status === "ready" || status === "verifying" ? (
        <>
          <h1 className="text-2xl font-bold">Confirm your email</h1>
          <p className="text-gray-600 mt-3">
            Confirming activates your KRIN account. This link can be used only once.
          </p>
          <button
            type="button"
            onClick={verify}
            disabled={status === "verifying"}
            className="btn btn-primary mt-6 inline-flex disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "verifying" ? "Confirming…" : "Confirm email"}
          </button>
        </>
      ) : null}

      {status === "success" ? (
        <>
          <h1 className="text-2xl font-bold">Email verified</h1>
          <p className="text-gray-600 mt-3">
            Your account is active. Sign in to continue learning.
          </p>
          <Link href="/login" className="btn btn-primary mt-6 inline-flex">
            Sign in
          </Link>
        </>
      ) : null}

      {status === "error" ? (
        <>
          <h1 className="text-2xl font-bold">Verification link unavailable</h1>
          <p role="alert" className="text-gray-600 mt-3">{error}</p>
          <form onSubmit={resend} className="mt-6 space-y-3 text-left">
            <label htmlFor="resend-verification-email" className="block text-sm font-semibold text-slate-900">
              Send a new link
            </label>
            <input
              id="resend-verification-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              disabled={resendState === "sending"}
              className="form-control w-full rounded-md border border-slate-300 bg-slate-50 px-4 py-3 text-base"
            />
            <button
              type="submit"
              disabled={resendState === "sending"}
              className="btn btn-secondary w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resendState === "sending" ? "Sending…" : "Send new link"}
            </button>
            {resendState === "sent" ? (
              <p role="status" className="text-sm text-slate-600">
                If an unverified account matches that email, a new link has been sent.
              </p>
            ) : null}
            {resendState === "error" ? (
              <p role="alert" className="text-sm text-red-700">
                We could not send a new link right now. Please try again shortly.
              </p>
            ) : null}
          </form>
          <Link href="/login" className="btn btn-secondary mt-5 inline-flex">
            Back to sign in
          </Link>
        </>
      ) : null}
    </div>
  );
}
