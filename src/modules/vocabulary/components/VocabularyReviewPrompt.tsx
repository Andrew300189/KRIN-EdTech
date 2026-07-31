"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function VocabularyReviewPrompt() {
  const [dueCount, setDueCount] = useState(0);
  useEffect(() => { void fetch("/api/profile/vocabulary/prompt").then((response) => response.ok ? response.json() : null).then((payload: { data?: { shouldShow: boolean; dueCount: number } } | null) => { if (payload?.data?.shouldShow) setDueCount(payload.data.dueCount); }); }, []);
  if (!dueCount) return null;
  return <aside className="fixed bottom-5 right-5 z-40 max-w-sm rounded-2xl border border-blue-200 bg-white p-5 shadow-xl" aria-live="polite"><p className="font-bold text-slate-900">You have {dueCount} word{dueCount === 1 ? "" : "s"} to review</p><p className="mt-1 text-sm text-slate-600">A short review now will keep them fresh.</p><div className="mt-4 flex gap-3"><Link href="/profile/vocabulary/training" className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800">Start review</Link><button type="button" onClick={() => { void fetch("/api/profile/vocabulary/prompt", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hours: 8 }) }); setDueCount(0); }} className="text-sm font-semibold text-slate-600 hover:underline">Later</button></div></aside>;
}
