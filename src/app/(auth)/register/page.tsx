"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const submittingRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;

    submittingRef.current = true;
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || "Registration failed");
        return;
      }

      router.replace(
        payload.autoLogin === false
          ? "/login?registered=1"
          : (payload?.user?.workspacePath ?? "/student"),
      );
    } catch {
      setError("Network error. Please try again.");
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-4xl font-semibold tracking-tight text-slate-900">
        Регистрация
      </h1>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div className="space-y-2">
          <label
            htmlFor="username"
            className="text-xl font-medium text-slate-900"
          >
            Username
          </label>
          <input
            id="username"
            type="text"
            className="form-control w-full rounded-md border border-slate-300 bg-slate-100 px-4 py-3 text-lg"
            placeholder="your_username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-xl font-medium text-slate-900">
            Емаил
          </label>
          <input
            id="email"
            type="email"
            className="form-control w-full rounded-md border border-slate-300 bg-slate-100 px-4 py-3 text-lg"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="password"
            className="text-xl font-medium text-slate-900"
          >
            Пароль
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              className="form-control w-full rounded-md border border-slate-300 bg-slate-100 px-4 py-3 pr-12 text-lg"
              placeholder="Введите пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-600 hover:text-slate-900"
              aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
            >
              {showPassword ? "🙈" : "👁"}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="btn w-full rounded-full bg-primary py-3 text-xl font-semibold text-white hover:brightness-95"
          disabled={loading}
        >
          {loading ? "Регистрация..." : "Присоединиться"}
        </button>

        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-base text-red-700">
            {error}
          </p>
        ) : null}
      </form>

      <div className="mt-6 text-center text-base text-slate-600">
        Еще не с нами?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Войти
        </Link>
      </div>
    </div>
  );
}
