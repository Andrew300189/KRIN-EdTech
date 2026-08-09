"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, passwordConfirmation }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.error || "Unable to reset your password.");
        return;
      }
      setSuccess(true);
      setPassword("");
      setPasswordConfirmation("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <h1 className="text-2xl font-bold mb-3 text-center">Choose a new password</h1>
      <p className="mb-6 text-center text-sm text-slate-600">Use at least 8 characters. This link expires after one hour.</p>
      {success ? (
        <div className="text-center">
          <p className="mb-4 text-green-700">Password updated. You can now sign in.</p>
          <Link href="/login" className="text-primary hover:underline">Go to sign in</Link>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block" htmlFor="password">New password
            <input className="form-control mt-2 w-full" id="password" minLength={8} maxLength={128} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
          </label>
          <label className="block" htmlFor="passwordConfirmation">Confirm new password
            <input className="form-control mt-2 w-full" id="passwordConfirmation" minLength={8} maxLength={128} onChange={(event) => setPasswordConfirmation(event.target.value)} required type="password" value={passwordConfirmation} />
          </label>
          {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
          <button className="btn btn-primary w-full" disabled={loading || !token} type="submit">
            {loading ? "Updating..." : "Update password"}
          </button>
          {!token ? <p className="text-sm text-red-700" role="alert">This password-reset link is invalid or incomplete.</p> : null}
        </form>
      )}
      <div className="mt-6 text-center"><Link href="/login" className="text-sm text-primary hover:underline">Back to Sign In</Link></div>
    </div>
  );
}
