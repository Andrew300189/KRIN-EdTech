"use client";

import { useRouter } from "next/navigation";

export function DashboardBackButton({ fallbackHref, label = "Back" }: { fallbackHref: string; label?: string }) {
  const router = useRouter();
  return <button
    type="button"
    onClick={() => {
      if (window.history.length > 1 && document.referrer.startsWith(window.location.origin)) router.back();
      else router.push(fallbackHref);
    }}
    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
  >
    <span aria-hidden="true">←</span>{label}
  </button>;
}
