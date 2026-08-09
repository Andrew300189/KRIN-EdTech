"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(payload?.error || "Unable to start password reset.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <h1 className="text-2xl font-bold mb-6 text-center">Reset Password</h1>

      {submitted ? (
        <div className="text-center">
          <p className="text-green-600 mb-4">
            If an active account matches that email, we sent password reset instructions.
          </p>
          <Link href="/auth/login" className="text-primary hover:underline">
            Back to Sign In
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="form-control w-full"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading}
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
          {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
        </form>
      )}

      <div className="mt-6 text-center">
        <Link
          href="/auth/login"
          className="text-sm text-primary hover:underline"
        >
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
