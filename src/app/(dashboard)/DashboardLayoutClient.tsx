"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { VocabularyReviewPrompt } from "@/modules/vocabulary/components/VocabularyReviewPrompt";
import { NotificationBell } from "@/modules/communications/components/NotificationBell";
import { GlobalSearch } from "@/modules/search/components/GlobalSearch";

const navigation = [
  { href: "/dashboard", label: "Dashboard", exact: true },
  { href: "/dashboard/courses", label: "My Courses" },
  { href: "/dashboard/academies", label: "Academies" },
  { href: "/dashboard/lessons", label: "Lessons" },
  { href: "/dashboard/vocabulary", label: "Vocabulary" },
  { href: "/dashboard/progress", label: "Progress" },
  { href: "/dashboard/mistakes", label: "Mistakes" },
  { href: "/dashboard/achievements", label: "Achievements" },
  { href: "/dashboard/analytics", label: "Analytics" },
  { href: "/dashboard/ai-tutor", label: "AI Tutor" },
  { href: "/dashboard/billing", label: "Billing" },
  { href: "/dashboard/settings", label: "Settings" },
];

export function DashboardLayoutClient({ children, showCmsLink }: { children: React.ReactNode; showCmsLink: boolean }) {
  const router = useRouter();
  const pathname = usePathname();

  const navIdByHref: Record<string, string> = {
    "/dashboard/lessons": "tour-nav-lessons",
    "/dashboard/vocabulary": "tour-nav-vocabulary",
    "/dashboard/profile": "tour-nav-profile",
  };

  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-100">
      <aside className="sticky top-0 h-screen w-64 shrink-0 overflow-y-auto border-r border-slate-200/80 bg-white/90 px-4 py-5 shadow-[0_8px_30px_rgba(15,23,42,0.06)] backdrop-blur">
        <div className="px-2 pb-4">
          <Link href="/" className="text-xl font-bold text-primary hover:opacity-90">
            KRIN EdTech
          </Link>
        </div>

        <nav aria-label="Dashboard navigation" className="space-y-1 px-1 py-2">
          {navigation.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                id={navIdByHref[item.href]}
                key={item.href}
                aria-current={active ? "page" : undefined}
                className={`block rounded-xl px-4 py-2.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${active ? "bg-gradient-to-r from-primary/15 to-primary/5 text-primary shadow-sm" : "text-slate-700 hover:bg-slate-100/90"}`}
                href={item.href}
              >
                {item.label}
              </Link>
            );
          })}
          <div className="my-3 h-px w-full bg-slate-200" />
          <Link className="block rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100/90" href="/profile/notifications">Notifications</Link>
          <Link className="block rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100/90" href="/profile/support">Support</Link>
        </nav>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6 md:py-4">
            <h1 className="text-base font-semibold text-slate-900 md:text-lg">Dashboard</h1>
            <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:gap-3 md:w-auto md:flex-nowrap">
              {showCmsLink ? (
                <Link
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                  href="/cms"
                >
                  CMS
                </Link>
              ) : null}
              <div className="w-full min-w-[220px] sm:w-[320px] sm:max-w-[42vw]">
                <GlobalSearch
                  context="STUDENT"
                  compact
                  placeholder="Search courses, lessons, words"
                />
              </div>
              <NotificationBell />
              <button className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900" onClick={handleSignOut} type="button">Sign Out</button>
            </div>
          </div>
        </header>
        <div className="mx-auto w-full max-w-7xl p-4 md:p-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white/75 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)] md:p-6">
            {children}
          </div>
        </div>
      </main>
      <VocabularyReviewPrompt />
    </div>
  );
}
