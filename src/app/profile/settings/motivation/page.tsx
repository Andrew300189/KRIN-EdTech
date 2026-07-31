import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/core/server/session";
import { MotivationSettingsForm } from "@/modules/motivation/components/MotivationSettingsForm";

export default async function MotivationSettingsPage() { const authenticated = await requireAuth(); if (!authenticated) redirect("/login?next=/profile/settings/motivation"); return <main className="mx-auto max-w-3xl px-6 py-12"><Link href="/profile/analytics" className="text-sm font-semibold text-blue-700 hover:underline">← Analytics</Link><h1 className="mt-4 text-4xl font-bold">Motivation settings</h1><p className="mt-2 text-slate-600">Your timezone defines daily goals, streaks, and calendar days.</p><MotivationSettingsForm initial={{ dailyGoalMinutes: authenticated.user.dailyGoalMinutes, timeZone: authenticated.user.timeZone }} /></main>; }
