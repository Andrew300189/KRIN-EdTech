"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

function getErrorMessage(errorCode: string | null) {
  if (errorCode === "cms_access_denied") {
    return "Не удалось подтвердить права владельца.";
  }

  return errorCode ? "Не удалось войти через Google. Попробуйте ещё раз." : "";
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

function getServerDestination(payload: unknown): string | null {
  const candidate = payload && typeof payload === "object"
    ? (payload as { user?: { workspacePath?: unknown } }).user?.workspacePath
    : null;

  const isWorkspacePath = typeof candidate === "string" && (
    candidate === "/cms" ||
    candidate.startsWith("/cms/") ||
    candidate === "/teacher" ||
    candidate.startsWith("/teacher/") ||
    candidate === "/student" ||
    candidate.startsWith("/student/")
  );

  return isWorkspacePath &&
    candidate.startsWith("/") &&
    !candidate.startsWith("//") &&
    !candidate.includes("\\")
    ? candidate
    : null;
}

function getRequestedPostAuthPath(searchParams: URLSearchParams) {
  return searchParams.get("next") ?? searchParams.get("callbackUrl") ?? "";
}

function getDevelopmentErrorId(value: unknown) {
  if (process.env.NODE_ENV !== "development" || typeof value !== "string") return "";
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : "";
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorId, setErrorId] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const submittingRef = useRef(false);

  const externalError = useMemo(
    () => getErrorMessage(searchParams.get("error")),
    [searchParams],
  );

  const infoMessage = useMemo(
    () => getInfoMessage(searchParams.get("reason")),
    [searchParams],
  );

  const externalErrorId = useMemo(
    () => getDevelopmentErrorId(searchParams.get("errorId")),
    [searchParams],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;

    if (!identifier.trim() || !password) {
      setError("Введите email и пароль.");
      return;
    }

    submittingRef.current = true;
    setError("");
    setErrorId("");
    setLoading(true);
    let shouldResetLoading = true;

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: identifier,
          password,
          next: getRequestedPostAuthPath(searchParams),
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(
          typeof payload?.error === "string"
            ? payload.error
            : "Не удалось выполнить вход. Попробуйте ещё раз.",
        );
        setErrorId(getDevelopmentErrorId(payload?.errorId));
        return;
      }

      const destination = getServerDestination(payload);
      if (!destination) {
        setError("Не удалось подтвердить права владельца.");
        return;
      }

      shouldResetLoading = false;
      // The authenticated destination is selected by the server. This is the
      // only credentials-login navigation in the React form.
      router.replace(destination);
    } catch {
      setError("Не удалось выполнить вход. Попробуйте ещё раз.");
    } finally {
      if (shouldResetLoading) {
        submittingRef.current = false;
        setLoading(false);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    if (submittingRef.current) return;

    submittingRef.current = true;
    const nextUrl = getRequestedPostAuthPath(searchParams);
    const callbackUrl = `/auth/complete?next=${encodeURIComponent(nextUrl)}`;
    setLoading(true);
    let shouldResetLoading = true;
    try {
      const result = await signIn("google", { callbackUrl });
      if (result?.error) {
        setError("Не удалось войти через Google. Попробуйте ещё раз.");
        return;
      }
      shouldResetLoading = false;
    } catch {
      setError("Не удалось войти через Google. Попробуйте ещё раз.");
    } finally {
      if (shouldResetLoading) {
        submittingRef.current = false;
        setLoading(false);
      }
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

        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-slate-300 bg-white py-3 text-base font-semibold text-slate-800 hover:bg-slate-50"
          disabled={loading}
        >
          <span aria-hidden>G</span>
          <span>Continue with Google</span>
        </button>

        <p className="text-sm text-slate-500">
          By logging in, you agree to our{" "}
          <Link href="/terms" className="text-primary hover:underline">
            Terms of use
          </Link>
          .
        </p>

        {error || externalError ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-base text-red-700">
            <p>{error || externalError}</p>
            {errorId || externalErrorId ? (
              <p className="mt-2 text-xs text-red-600">
                Error ID: <code>{errorId || externalErrorId}</code>
              </p>
            ) : null}
          </div>
        ) : null}
      </form>
    </div>
  );
}
