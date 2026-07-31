import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/core/server/session";

export default async function OnboardingPage() {
  const authenticated = await requireAuth();
  if (!authenticated) redirect("/login?reason=session_required");
  return <main className="mx-auto flex min-h-screen max-w-2xl items-center px-6"><section className="w-full rounded-xl border border-slate-200 bg-white p-8 shadow-sm"><p className="text-sm font-semibold text-blue-700">Welcome to KRIN EdTech</p><h1 className="mt-2 text-4xl font-bold text-slate-900">Let&apos;s personalise your learning</h1><p className="mt-4 text-slate-600">Your Google account is connected. You can continue to your dashboard and complete your learning profile there.</p><Link className="mt-7 inline-block rounded-full bg-primary px-6 py-3 font-semibold text-white hover:brightness-95" href="/dashboard">Continue to dashboard</Link></section></main>;
}
