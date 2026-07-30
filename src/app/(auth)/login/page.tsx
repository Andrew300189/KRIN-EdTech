"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function getErrorMessage(errorCode: string | null) {
  switch (errorCode) {
    case "google_not_configured":
      return "Google sign-in is not configured yet.";
    case "google_failed":
      return "Google sign-in failed. Please try again.";
    case "google_state":
      return "Google sign-in security check failed. Please retry.";
    default:
      return "";
  }
}

function getInfoMessage(reason: string | null) {
  switch (reason) {
    case "session_expired":
      return "Your session has expired. Please sign in again.";
    case "session_required":
      return "Please sign in to continue.";
    default:
      return "";
  }
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const externalError = useMemo(
    () => getErrorMessage(searchParams.get("error")),
    [searchParams],
  );

  const infoMessage = useMemo(
    () => getInfoMessage(searchParams.get("reason")),
    [searchParams],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || "Login failed");
        return;
      }

      const nextPath = searchParams.get("next");
      router.push(nextPath && nextPath.startsWith("/") ? nextPath : "/dashboard");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-4xl font-semibold tracking-tight text-slate-900">
        Log in
      </h1>

      <p className="mt-6 text-lg text-slate-700">
        New here?{" "}
        <Link href="/register" className="text-primary hover:underline">
          Join now
        </Link>
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {infoMessage ? (
          <p className="rounded-md border border-blue-200 bg-blue-50 p-3 text-base text-blue-700">
            {infoMessage}
          </p>
        ) : null}

        <div className="space-y-2">
          <label
            htmlFor="identifier"
            className="text-xl font-medium text-slate-900"
          >
            Email
          </label>
          <input
            id="identifier"
            type="text"
            className="form-control w-full rounded-md border border-slate-300 bg-slate-100 px-4 py-3 text-lg"
            placeholder="you@example.com"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="password"
            className="text-xl font-medium text-slate-900"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              className="form-control w-full rounded-md border border-slate-300 bg-slate-100 px-4 py-3 pr-12 text-lg"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-600 hover:text-slate-900"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "🙈" : "👁"}
            </button>
          </div>
        </div>

        <Link
          href="/forgot-password"
          className="inline-block text-base text-primary hover:underline"
        >
          Forgot your email or password?
        </Link>

        <button
          type="submit"
          className="btn w-full rounded-full bg-primary py-3 text-xl font-semibold text-white hover:brightness-95"
          disabled={loading}
        >
          {loading ? "Logging in..." : "Log in"}
        </button>

        <a
          href="/api/auth/google/start"
          className="flex w-full items-center justify-center gap-2 rounded-full border border-slate-300 bg-white py-3 text-base font-semibold text-slate-800 hover:bg-slate-50"
        >
          <span aria-hidden>G</span>
          <span>Continue with Google</span>
        </a>

        <p className="text-sm text-slate-500">
          By logging in, you agree to our{" "}
          <Link href="/terms" className="text-primary hover:underline">
            Terms of use
          </Link>
          .
        </p>

        {error || externalError ? (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-base text-red-700">
            {error || externalError}
          </p>
        ) : null}
      </form>
    </div>
  );
}
